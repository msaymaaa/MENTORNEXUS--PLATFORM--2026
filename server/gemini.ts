import { GoogleGenAI, Type } from '@google/genai';
import { UserProfile, Goal, AIMatchResult } from '../src/types/index';

// Initialize Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODELS_PRIORITY = [
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite'
];

/**
 * Resilient helper that attempts calls across priority models and applies retries
 * when encountering transient 503 (High Demand/Unavailable) or 429 errors.
 */
async function callGeminiWithResilience(
  callFn: (modelName: string) => Promise<any>,
  actionName: string
): Promise<any | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  for (const model of MODELS_PRIORITY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await callFn(model);
        if (result) return result;
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        const isTransient = 
          errorMsg.includes('503') || 
          errorMsg.includes('high demand') || 
          errorMsg.includes('UNAVAILABLE') || 
          errorMsg.includes('429') ||
          errorMsg.includes('RESOURCE_EXHAUSTED');

        if (isTransient && attempt === 1) {
          // Quick jittered backoff before second attempt or next model
          await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
          continue;
        }

        // On 2nd attempt failure, try the next fallback model in the list
        break;
      }
    }
  }

  console.warn(`[Gemini Resiliency] Could not complete "${actionName}" via cloud model. Serving intelligent heuristic fallback.`);
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
      skills: m.skills,
      mentoringAreas: m.mentoringAreas,
      yearsOfExperience: m.yearsOfExperience,
      bio: m.bio.substring(0, 200),
    }));

    const userBrief = {
      role: user.role,
      title: user.title,
      industry: user.industry,
      skills: user.skills,
      interests: user.interests,
      mentoringAreas: user.mentoringAreas,
      activeGoals: goals.map(g => ({ title: g.title, category: g.category, description: g.description })),
    };

    const prompt = `Analyze this mentee profile and their goals against the available mentors. Return ranked matches for the top 4 most compatible mentors with realistic match scores (60-98), specific match reasons, suggested focus areas for their 1:1 sessions, and a concise fit summary.

Mentee Context:
${JSON.stringify(userBrief, null, 2)}

Available Mentors:
${JSON.stringify(mentorBriefs, null, 2)}
`;

    const response = await callGeminiWithResilience(async (modelName) => {
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
    const sharedSkills = m.skills.filter(s => user.skills.some(us => us.toLowerCase() === s.toLowerCase()));
    const sharedInterests = m.mentoringAreas.filter(area => 
      user.interests.some(ui => area.toLowerCase().includes(ui.toLowerCase())) ||
      user.mentoringAreas.some(uma => area.toLowerCase().includes(uma.toLowerCase()))
    );

    const baseScore = 75 + Math.min(20, (sharedSkills.length * 6) + (sharedInterests.length * 5));
    const finalScore = Math.max(65, Math.min(98, baseScore - (index * 3)));

    return {
      mentorId: m.id,
      matchScore: finalScore,
      matchReasons: [
        `Strong alignment in ${m.industry} and ${m.skills.slice(0, 2).join(', ')}`,
        `Offers direct guidance in ${m.mentoringAreas[0] || 'Career Roadmapping'}`,
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
  description: string,
  category: string,
  targetDate: string
): Promise<{ milestones: { title: string; dueDate?: string }[]; recommendations: string[] }> {
  try {
    const prompt = `Break down this professional mentorship goal into 4-5 concrete, actionable, sequential milestones with realistic target due dates before ${targetDate}. Also provide 3 tactical recommendations to ensure the mentee succeeds.

Goal Title: ${title}
Category: ${category}
Description: ${description}
Target Completion Date: ${targetDate}
Current Date: 2026-03-01
`;

    const response = await callGeminiWithResilience(async (modelName) => {
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
  return {
    milestones: [
      { title: `Conduct baseline skills audit and establish benchmarks for ${title}`, dueDate: '2026-03-20' },
      { title: 'Draft technical outline / curriculum with mentor input', dueDate: '2026-04-10' },
      { title: 'Complete practical hands-on implementation and peer code review', dueDate: '2026-05-01' },
      { title: 'Synthesize outcomes, write retrospective case study, and present findings', dueDate: targetDate || '2026-05-30' }
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
  draftMessage: string,
  goalsSummary?: string
): Promise<{ polishedMessage: string; highlights: string[] }> {
  try {
    const prompt = `You are an expert career coach helping a mentee write a compelling, polite, concise, and high-conversion mentorship request to a senior professional.

Mentee:
Name: ${requester.name}
Role: ${requester.role} (${requester.title} at ${requester.organization})
Background & Skills: ${requester.skills.join(', ')}
Interests: ${requester.interests.join(', ')}

Target Mentor:
Name: ${mentor.name}
Title: ${mentor.title} at ${mentor.organization}
Mentoring Areas: ${mentor.mentoringAreas.join(', ')}
Key Expertise: ${mentor.skills.join(', ')}

Mentee's Initial Draft:
"${draftMessage || 'I want mentorship to grow my career.'}"

Mentee's Goal Summary:
"${goalsSummary || 'Advance skills and learn best practices'}"

Generate a refined, professional 3-4 sentence message that is warm, respectful of the mentor's time, references the mentor's specific domain, clearly explains what the mentee hopes to learn, and proposes a low-friction cadence (e.g. bi-weekly 30-min chat). Also provide 2-3 key highlights of why this request will resonate.`;

    const response = await callGeminiWithResilience(async (modelName) => {
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
    polishedMessage: `Hello ${mentor.name}, I have been following your impactful work in ${mentor.industry} at ${mentor.organization}. As a ${requester.title} with a deep focus on ${requester.skills.slice(0, 2).join(' and ')}, I am seeking mentorship around ${mentor.mentoringAreas[0] || 'strategic skill development'}. I would deeply value the opportunity for a bi-weekly 30-minute conversation to learn from your career journey.`,
    highlights: ['Specific acknowledgment of mentor background', 'Clearly stated focus area', 'Respectful, low-burden time commitment']
  };
}

export async function getCareerAdvisorResponse(
  question: string,
  user: UserProfile,
  goals: Goal[]
): Promise<string> {
  try {
    const prompt = `You are MentorNexus AI, an experienced, pragmatic career and mentorship advisor.
User Profile:
- Name: ${user.name}
- Role: ${user.role} (${user.title} at ${user.organization})
- Skills: ${user.skills.join(', ')}
- Current Goals: ${goals.map(g => `${g.title} (${g.progress}% done)`).join('; ')}

User's Question:
"${question}"

Provide actionable, structured, empathetic, and direct professional advice in markdown format (under 250 words). Include 1 specific action they can take today and 1 topic to discuss with their mentor in their next 1:1.`;

    const response = await callGeminiWithResilience(async (modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
    }, 'getCareerAdvisorResponse');

    if (response && response.text) {
      return response.text.trim();
    }
  } catch (error) {
    console.error('Error generating career advice with Gemini:', error);
  }

  return `As you navigate your path as a ${user.title}, focus on bridging theory with measurable production outcomes. Engage with your mentor by bringing specific architectural choices or code reviews rather than open-ended questions. Your active goal "${goals[0]?.title || 'Skill Mastery'}" is a fantastic anchor—break it into 2-week deliverables!`;
}
