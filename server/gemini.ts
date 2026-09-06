import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { UserProfile, Goal, AIMatchResult, AIAdvisorAction, AIAdvisorResponse, ValidNavTab } from '../src/types/index';

dotenv.config();

// Canonical model configuration from environment variable with reliable fallback cascade
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const FALLBACK_MODELS = [
  PRIMARY_MODEL,
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];
const MODELS_PRIORITY = Array.from(new Set(FALLBACK_MODELS.filter(Boolean)));

// Lazy / resilient client initialization
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Resilient helper that attempts calls across priority models and applies retries
 * when encountering transient 503 (High Demand/Unavailable) or 429 errors.
 */
async function callGeminiWithResilience(
  callFn: (modelName: string, ai: GoogleGenAI) => Promise<any>,
  actionName: string
): Promise<any | null> {
  const ai = getAiClient();
  if (!ai) {
    console.warn(`[Gemini Resiliency] No GEMINI_API_KEY available for "${actionName}".`);
    return null;
  }

  for (const model of MODELS_PRIORITY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await callFn(model, ai);
        if (result) return result;
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        const isTransient = 
          errorMsg.includes('503') || 
          errorMsg.includes('high demand') || 
          errorMsg.includes('UNAVAILABLE') || 
          errorMsg.includes('429') ||
          errorMsg.includes('RESOURCE_EXHAUSTED') ||
          errorMsg.includes('Quota exceeded') ||
          errorMsg.includes('rate limit');

        if (isTransient && attempt === 1) {
          // Jittered backoff before second attempt on same model
          await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
          continue;
        }

        // On non-transient or second-attempt failure, continue to next candidate model
        console.warn(`[Gemini Resiliency] Model "${model}" failed for "${actionName}":`, errorMsg.slice(0, 200));
        break;
      }
    }
  }

  console.warn(`[Gemini Resiliency] Could not complete "${actionName}" across models.`);
  return null;
}

export async function generateMentorMatches(
  user: UserProfile,
  goals: Goal[],
  mentors: UserProfile[]
): Promise<AIMatchResult[]> {
  try {
    const mentorBriefs = mentors.map(m => ({
      id: m.id,
      name: m.name,
      title: m.title,
      organization: m.organization,
      industry: m.industry,
      skills: m.skills || [],
      mentoringAreas: m.mentoringAreas || [],
      yearsOfExperience: m.yearsOfExperience,
      bio: (m.bio || '').substring(0, 200),
    }));

    const userBrief = {
      role: user.role,
      title: user.title,
      industry: user.industry,
      skills: user.skills || [],
      interests: user.interests || [],
      mentoringAreas: user.mentoringAreas || [],
      activeGoals: goals.map(g => ({ title: g.title, category: g.category, description: g.description })),
    };

    const prompt = `Analyze this mentee profile and their goals against the available mentors. Return ranked matches for the top 4 most compatible mentors with realistic match scores (60-98), specific match reasons, suggested focus areas for their 1:1 sessions, and a concise fit summary.

Mentee Context:
${JSON.stringify(userBrief, null, 2)}

Available Mentors:
${JSON.stringify(mentorBriefs, null, 2)}
`;

    const response = await callGeminiWithResilience(async (modelName, ai) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                mentorId: { type: Type.STRING },
                matchScore: { type: Type.NUMBER, description: 'Score between 60 and 99' },
                matchReasons: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2-3 specific reasons why this mentor is an ideal fit'
                },
                suggestedFocusAreas: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2-3 practical topics to discuss with this mentor'
                },
                fitSummary: {
                  type: Type.STRING,
                  description: 'A 1-2 sentence compelling summary of their mentorship synergy'
                }
              },
              required: ['mentorId', 'matchScore', 'matchReasons', 'suggestedFocusAreas', 'fitSummary'],
            },
          },
        },
      });
    }, 'generateMentorMatches');

    if (response) {
      const parsed = JSON.parse(response.text?.trim() || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error generating AI mentor matches with Gemini:', error);
  }

  return fallbackMentorMatching(user, mentors);
}

function fallbackMentorMatching(user: UserProfile, mentors: UserProfile[]): AIMatchResult[] {
  return mentors.map((m, index) => {
    // Basic heuristic match calculation
    const userSkills = user.skills || [];
    const mentorSkills = m.skills || [];
    const sharedSkills = mentorSkills.filter(s => userSkills.some(us => us.toLowerCase() === s.toLowerCase()));
    const sharedInterests = (m.mentoringAreas || []).filter(area => 
      (user.interests || []).some(ui => area.toLowerCase().includes(ui.toLowerCase())) ||
      (user.mentoringAreas || []).some(uma => area.toLowerCase().includes(uma.toLowerCase()))
    );

    const baseScore = 75 + Math.min(20, (sharedSkills.length * 6) + (sharedInterests.length * 5));
    const finalScore = Math.max(65, Math.min(98, baseScore - (index * 3)));

    return {
      mentorId: m.id,
      matchScore: finalScore,
      matchReasons: [
        `Strong alignment in ${m.industry} and ${(m.skills || []).slice(0, 2).join(', ') || 'Core Competencies'}`,
        `Offers direct guidance in ${(m.mentoringAreas || [])[0] || 'Career Roadmapping'}`,
        `${m.yearsOfExperience}+ years of proven industry experience at ${m.organization}`
      ],
      suggestedFocusAreas: [
        'Strategic 12-month career progression planning',
        'Technical architecture and skill depth reviews',
        'Navigating performance reviews and leadership visibility'
      ],
      fitSummary: `${m.name}'s deep domain background at ${m.organization} provides high-leverage mentorship for your ${user.role === 'student' ? 'entry into industry' : 'next promotion trajectory'}.`
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

export async function generateGoalBreakdown(
  title: string,
  description: string = '',
  category: string = 'Career Growth',
  targetDate: string = ''
): Promise<{ milestones: { title: string; dueDate?: string }[]; recommendations: string[] }> {
  try {
    const effectiveTargetDate = targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    const prompt = `Break down this professional mentorship goal into 4-5 concrete, actionable, sequential milestones with realistic target due dates before ${effectiveTargetDate}. Also provide 3 tactical recommendations to ensure the mentee succeeds.

Goal Title: ${title}
Category: ${category}
Description: ${description}
Target Completion Date: ${effectiveTargetDate}
Current Date: ${new Date().toISOString().split('T')[0]}
`;

    const response = await callGeminiWithResilience(async (modelName, ai) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              milestones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Actionable milestone title starting with an active verb' },
                    dueDate: { type: Type.STRING, description: 'Target ISO date string YYYY-MM-DD' }
                  },
                  required: ['title', 'dueDate']
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 practical tips for mentee execution'
              }
            },
            required: ['milestones', 'recommendations']
          }
        }
      });
    }, 'generateGoalBreakdown');

    if (response) {
      const parsed = JSON.parse(response.text?.trim() || '{}');
      if (parsed.milestones && Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error generating AI goal breakdown:', error);
  }

  return fallbackGoalBreakdown(title, targetDate);
}

function fallbackGoalBreakdown(title: string, targetDate: string) {
  const now = new Date();
  const d1 = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];
  const d2 = new Date(now.getTime() + 35 * 86400000).toISOString().split('T')[0];
  const d3 = new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0];
  const d4 = targetDate || new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0];

  return {
    milestones: [
      { title: `Conduct baseline skills audit and establish benchmarks for ${title}`, dueDate: d1 },
      { title: 'Draft technical outline / curriculum with mentor input', dueDate: d2 },
      { title: 'Complete practical hands-on implementation and peer code review', dueDate: d3 },
      { title: 'Synthesize outcomes, write retrospective case study, and present findings', dueDate: d4 }
    ],
    recommendations: [
      'Dedicate 3-5 focused hours weekly with time-blocking.',
      'Review milestone progress with your mentor every bi-weekly sync.',
      'Document blockers immediately so you can discuss trade-offs with your mentor.'
    ]
  };
}

export async function polishMentorshipRequest(
  requester: UserProfile,
  mentor: UserProfile,
  draftMessage: string = '',
  goalsSummary?: string
): Promise<{ polishedMessage: string; highlights: string[] }> {
  try {
    const prompt = `You are an expert career coach helping a mentee write a compelling, polite, concise, and high-conversion mentorship request to a senior professional.

Mentee:
Name: ${requester.name}
Role: ${requester.role} (${requester.title} at ${requester.organization})
Background & Skills: ${(requester.skills || []).join(', ')}
Interests: ${(requester.interests || []).join(', ')}

Target Mentor:
Name: ${mentor.name}
Title: ${mentor.title} at ${mentor.organization}
Mentoring Areas: ${(mentor.mentoringAreas || []).join(', ')}
Key Expertise: ${(mentor.skills || []).join(', ')}

Mentee's Initial Draft:
"${draftMessage || 'I want mentorship to grow my career.'}"

Mentee's Goal Summary:
"${goalsSummary || 'Advance skills and learn best practices'}"

Generate a refined, professional 3-4 sentence message that is warm, respectful of the mentor's time, references the mentor's specific domain, clearly explains what the mentee hopes to learn, and proposes a low-friction cadence (e.g. bi-weekly 30-min chat). Also provide 2-3 key highlights of why this request will resonate.`;

    const response = await callGeminiWithResilience(async (modelName, ai) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              polishedMessage: { type: Type.STRING },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['polishedMessage', 'highlights']
          }
        }
      });
    }, 'polishMentorshipRequest');

    if (response) {
      const parsed = JSON.parse(response.text?.trim() || '{}');
      if (parsed.polishedMessage) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error polishing mentorship request with Gemini:', error);
  }

  return {
    polishedMessage: `Hello ${mentor.name}, I have been following your impactful work in ${mentor.industry} at ${mentor.organization}. As a ${requester.title} with a deep focus on ${(requester.skills || []).slice(0, 2).join(' and ') || 'strategic skills'}, I am seeking mentorship around ${(mentor.mentoringAreas || [])[0] || 'strategic skill development'}. I would deeply value the opportunity for a bi-weekly 30-minute conversation to learn from your career journey.`,
    highlights: ['Specific acknowledgment of mentor background', 'Clearly stated focus area', 'Respectful, low-burden time commitment']
  };
}

export async function getCareerAdvisorResponse(
  question: string,
  user: UserProfile,
  goals: Goal[]
): Promise<string> {
  const chatRes = await getAdvisorChatResponse(question, [], user, goals);
  return chatRes.message;
}

/**
 * Modern Multi-Turn Context-Aware AI Advisor Chat with Navigation Actions
 */
export async function getAdvisorChatResponse(
  message: string,
  history: { sender: 'user' | 'assistant' | 'model'; text: string }[] = [],
  user?: UserProfile | null,
  goals: Goal[] = []
): Promise<AIAdvisorResponse> {
  const userContext = user
    ? `
AUTHENTICATED USER CONTEXT (REAL DATA FROM MENTORNEXUS):
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role} (${user.title} at ${user.organization || 'Independent'})
- Industry: ${user.industry || 'Technology / Professional'}
- Location: ${user.location || 'Remote'}
- Years of Experience: ${user.yearsOfExperience}
- Skills: ${(user.skills || []).join(', ') || 'General Technical / Professional'}
- Interests: ${(user.interests || []).join(', ') || 'Career Acceleration, Engineering'}
- Mentoring Areas: ${(user.mentoringAreas || []).join(', ') || 'Leadership, Career Strategy'}
- Bio: ${user.bio || 'Not provided'}
- Verification Status: ${user.verificationStatus || 'verified'}
`
    : `AUTHENTICATED USER CONTEXT: Guest user exploring MentorNexus platform.`;

  const activeGoals = goals || [];
  const goalsContext = activeGoals.length > 0
    ? `
AUTHENTICATED USER ACTIVE GOALS (REAL DATA):
${activeGoals.map((g, idx) => `Goal ${idx + 1}:
  - Title: "${g.title}"
  - Category: ${g.category}
  - Status: ${g.status} (Progress: ${g.progress}%)
  - Target Date: ${g.targetDate || 'Flexible'}
  - Description: ${g.description || 'No description provided'}
  - Milestones: ${g.milestones?.map(m => `"${m.title}" (${m.completed ? 'Completed' : 'Pending'})`).join(', ') || 'None'}
`).join('\n')}`
    : `AUTHENTICATED USER ACTIVE GOALS: Currently no active goals logged in MentorNexus.`;

  const systemInstruction = `You are the MentorNexus AI Career & Mentorship Advisor, an expert conversational career strategist, executive mentor, and platform guide built natively into MentorNexus.

PRIMARY DIRECTIVE:
- Prioritize answering the user's immediate question and maintaining multi-turn conversational context over reciting profile facts.
- Never output identical generic career boilerplate. Every answer must directly address the user's latest query while remembering previous turns in this conversation.
- Use the authenticated user's profile and active goals ONLY as supportive background context to personalize advice where relevant. Never invent fake goals, fake mentors, or fake achievements.

${userContext}
${goalsContext}

MENTORNEXUS PLATFORM NAVIGATION & MODULES:
MentorNexus has the following primary navigation sections:
- "dashboard": Overview of metrics, upcoming 1:1 sessions, recent requests, active goals, and quick actions.
- "discover": Browse and search verified mentors, industry leaders, and peers with filtering by skills, industry, and experience.
- "requests": View and manage incoming and outgoing mentorship/networking requests (Pending, Accepted, Declined).
- "connections": 1:1 mentorship workspaces for active connections with session scheduling, meeting notes, action items, and real-time chat.
- "network": Peer-to-peer professional networking relationships and contacts.
- "goals": Manage career goals, AI milestone breakdowns, and track progress.
- "library": Experience Library featuring practical articles, case studies, guides, and career wisdom written by mentors.
- "notifications": Real-time notifications for requests, session updates, and milestone achievements.
- "profile": Personal profile settings, bio, skills, mentoring areas, and verification status.
- "admin": Administrative review and member management (available for admin users).

OPERATIONAL GUIDELINES:
1. Multi-Turn Conversational Memory: Maintain strict continuity with previous messages in the conversation history. If the user asks "What should I do first?" or "Can you make that plan shorter?", refer directly back to what you just suggested.
2. Direct, Engaging Answers: Keep responses crisp, practical, and conversational. Avoid unprompted long-winded essays unless specifically requested.
3. Navigation Assistance: If the user asks where something is located, how to perform an action on MentorNexus (e.g., "where are my mentors?", "how to set goals", "show my requests"), explain clearly AND include a structured "action" object with type "navigate" and target set to one of the exact valid tab IDs:
   ["dashboard", "discover", "requests", "connections", "network", "goals", "library", "notifications", "profile", "admin"].
4. Non-Navigation Chats: If the user is having a general technical, strategic, or career conversation, set "action" to null.
5. Formatting: Use clean Markdown formatting with headers (###), bullet points, and **bold text** for key takeaways.`;

  // Format multi-turn history into valid alternating user/model contents
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (const item of history) {
    if (!item.text || !item.text.trim()) continue;
    const role: 'user' | 'model' = item.sender === 'user' ? 'user' : 'model';

    if (contents.length === 0) {
      if (role !== 'user') continue; // First turn in contents must be from user
      contents.push({ role: 'user', parts: [{ text: item.text.trim() }] });
    } else {
      const prev = contents[contents.length - 1];
      if (prev.role === role) {
        prev.parts[0].text += `\n\n${item.text.trim()}`;
      } else {
        contents.push({ role, parts: [{ text: item.text.trim() }] });
      }
    }
  }

  // Append current user message
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n\n${message.trim()}`;
  } else {
    contents.push({ role: 'user', parts: [{ text: message.trim() }] });
  }

  try {
    const response = await callGeminiWithResilience(async (modelName, ai) => {
      return await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: 'The direct conversational markdown advice or response to the user',
              },
              action: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  type: { type: Type.STRING, enum: ['navigate'] },
                  target: {
                    type: Type.STRING,
                    enum: [
                      'dashboard',
                      'discover',
                      'requests',
                      'connections',
                      'network',
                      'goals',
                      'library',
                      'notifications',
                      'profile',
                      'admin',
                    ],
                  },
                  label: {
                    type: Type.STRING,
                    description: 'Short button label like "Open Discover" or "Go to Goals"',
                  },
                },
                required: ['type', 'target', 'label'],
              },
            },
            required: ['message'],
          },
        },
      });
    }, 'getAdvisorChatResponse');

    if (response) {
      const rawText = response.text?.trim();
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          if (parsed && typeof parsed.message === 'string' && parsed.message.trim()) {
            return {
              success: true,
              message: parsed.message.trim(),
              action: parsed.action || null,
            };
          }
        } catch {
          // If JSON parse fails, use raw text directly
          return {
            success: true,
            message: rawText,
            action: null,
          };
        }
      }
    }
  } catch (error) {
    console.error('[Gemini Advisor] Error during chat completion:', error);
  }

  // If Gemini calls failed across all models, return a genuine controlled error response
  return {
    success: false,
    message: 'MentorNexus AI Advisor is currently experiencing high demand or connectivity limits. Please try asking your question again.',
    action: null,
  };
}
