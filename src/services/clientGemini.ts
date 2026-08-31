import { GoogleGenerativeAI } from '@google/generative-ai';
import { UserProfile, Goal, AIMatchResult } from '../types/index';

// WARNING: Client-side Gemini API key usage is enabled per explicit project configuration.
// Key is retrieved via import.meta.env.VITE_GEMINI_API_KEY.
function getGeminiClient(): GoogleGenerativeAI | null {
  const key = 
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    ((typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ? process.env.GEMINI_API_KEY : '');

  if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenerativeAI(key.trim());
}

const PRIMARY_MODEL = 'gemini-1.5-flash';

/**
 * Resilient helper that attempts calls with retries using gemini-1.5-flash.
 */
async function callClientGeminiWithResilience(
  prompt: string,
  actionName: string,
  systemInstruction?: string
): Promise<string | null> {
  const genAI = getGeminiClient();
  if (!genAI) {
    return null;
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: PRIMARY_MODEL,
        ...(systemInstruction ? { systemInstruction } : {})
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const isTransient = 
        errorMsg.includes('503') || 
        errorMsg.includes('high demand') || 
        errorMsg.includes('UNAVAILABLE') || 
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt === 1) {
        await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 250));
        continue;
      }
      console.warn(`[Client Gemini] Error calling ${PRIMARY_MODEL} for "${actionName}":`, errorMsg);
      break;
    }
  }

  console.warn(`[Client Gemini] Could not complete "${actionName}" via API.`);
  return null;
}

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown code fences if present (e.g. ```json ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  return cleaned;
}

/**
 * 1. AI Match Mentors (Client-Side)
 */
export async function generateMentorMatchesClient(
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
      bio: (m.bio || '').substring(0, 200),
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

    const prompt = `You are a mentorship matching algorithm. Analyze this mentee profile and their goals against the available mentors.
Return a STRICT JSON array (no markdown code blocks, just pure JSON array) containing the top 4 most compatible mentors with realistic match scores (65-98), specific match reasons, suggested focus areas, and a concise fit summary.

Mentee Context:
${JSON.stringify(userBrief, null, 2)}

Available Mentors:
${JSON.stringify(mentorBriefs, null, 2)}

Output format:
[
  {
    "mentorId": "string",
    "matchScore": 88,
    "matchReasons": ["reason 1", "reason 2", "reason 3"],
    "suggestedFocusAreas": ["focus 1", "focus 2"],
    "fitSummary": "1-2 sentences explaining the synergy"
  }
]`;

    const raw = await callClientGeminiWithResilience(prompt, 'generateMentorMatchesClient');
    if (raw) {
      const parsed = JSON.parse(cleanJsonString(raw));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[Client Gemini] generateMentorMatches fallback used:', error);
  }

  return fallbackMentorMatchingClient(user, mentors);
}

function fallbackMentorMatchingClient(user: UserProfile, mentors: UserProfile[]): AIMatchResult[] {
  return mentors.map((m, index) => {
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
        `Strong alignment in ${m.industry} and ${(m.skills || []).slice(0, 2).join(', ') || 'Domain Expertise'}`,
        `Offers direct guidance in ${(m.mentoringAreas || [])[0] || 'Career Roadmapping'}`,
        `${m.yearsOfExperience}+ years of proven industry experience at ${m.organization}`
      ],
      suggestedFocusAreas: [
        'Strategic 12-month career progression planning',
        'Technical architecture and skill depth reviews',
        'Navigating performance reviews and leadership visibility'
      ],
      fitSummary: `${m.name}'s deep domain background at ${m.organization} provides high-leverage mentorship for your ${user.role === 'student' ? 'entry into industry' : 'next career milestone'}.`
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 2. AI Goal Breakdown & Milestones (Client-Side)
 */
export async function generateGoalBreakdownClient(
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
Target Date: ${effectiveTargetDate}

Return ONLY valid JSON (no markdown wrapping) in this structure:
{
  "milestones": [
    { "title": "Milestone title starting with active verb", "dueDate": "YYYY-MM-DD" }
  ],
  "recommendations": [
    "Actionable tip 1",
    "Actionable tip 2",
    "Actionable tip 3"
  ]
}`;

    const raw = await callClientGeminiWithResilience(prompt, 'generateGoalBreakdownClient');
    if (raw) {
      const parsed = JSON.parse(cleanJsonString(raw));
      if (parsed && Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
        return {
          milestones: parsed.milestones,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        };
      }
    }
  } catch (error) {
    console.warn('[Client Gemini] generateGoalBreakdown fallback used:', error);
  }

  const now = new Date();
  const d1 = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];
  const d2 = new Date(now.getTime() + 35 * 86400000).toISOString().split('T')[0];
  const d3 = new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0];
  const d4 = targetDate || new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0];

  return {
    milestones: [
      { title: `Conduct baseline skills audit and establish benchmarks for ${title}`, dueDate: d1 },
      { title: 'Draft technical outline and curriculum with mentor feedback', dueDate: d2 },
      { title: 'Complete practical hands-on deliverables and peer review', dueDate: d3 },
      { title: 'Synthesize outcomes, write retrospective case study, and present findings', dueDate: d4 }
    ],
    recommendations: [
      'Dedicate 3-5 focused hours weekly with time-blocking.',
      'Review milestone progress with your mentor during each sync.',
      'Document blockers immediately so you can discuss trade-offs with your mentor.'
    ]
  };
}

/**
 * 3. AI Polish Mentorship Request (Client-Side)
 */
export async function polishMentorshipRequestClient(
  requester: UserProfile,
  mentor: UserProfile,
  draftMessage: string = '',
  goalsSummary: string = ''
): Promise<{ polishedMessage: string; highlights: string[] }> {
  try {
    const prompt = `You are an expert career coach helping a mentee write a compelling, polite, concise, and high-conversion mentorship request to a senior professional.

Mentee:
Name: ${requester.name}
Role: ${requester.role} (${requester.title} at ${requester.organization})
Background & Skills: ${(requester.skills || []).join(', ')}

Target Mentor:
Name: ${mentor.name}
Title: ${mentor.title} at ${mentor.organization}
Mentoring Areas: ${(mentor.mentoringAreas || []).join(', ')}
Key Expertise: ${(mentor.skills || []).join(', ')}

Mentee's Initial Draft:
"${draftMessage || 'I want mentorship to grow my career.'}"

Mentee's Goal Summary:
"${goalsSummary || 'Advance skills and learn best practices'}"

Return ONLY valid JSON (no markdown wrapping) in this structure:
{
  "polishedMessage": "Refined 3-4 sentence professional message that is warm, respectful, domain-specific, and low-friction",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"]
}`;

    const raw = await callClientGeminiWithResilience(prompt, 'polishMentorshipRequestClient');
    if (raw) {
      const parsed = JSON.parse(cleanJsonString(raw));
      if (parsed && parsed.polishedMessage) {
        return {
          polishedMessage: parsed.polishedMessage,
          highlights: Array.isArray(parsed.highlights) ? parsed.highlights : []
        };
      }
    }
  } catch (error) {
    console.warn('[Client Gemini] polishMentorshipRequest fallback used:', error);
  }

  return {
    polishedMessage: `Hello ${mentor.name}, I have been following your impactful work in ${mentor.industry} at ${mentor.organization}. As a ${requester.title} with a deep focus on ${(requester.skills || []).slice(0, 2).join(' and ') || 'professional growth'}, I am seeking mentorship around ${(mentor.mentoringAreas || [])[0] || 'strategic skill development'}. I would deeply value the opportunity for a bi-weekly 30-minute conversation to learn from your career journey.`,
    highlights: ['Specific acknowledgment of mentor background', 'Clearly stated focus area', 'Respectful, low-burden time commitment']
  };
}

export interface ChatHistoryMessage {
  sender: 'user' | 'assistant' | 'model';
  text: string;
}

/**
 * Formats conversation history into Gemini Content array for model.startChat()
 */
function formatHistoryForGemini(messages: ChatHistoryMessage[]): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  const formatted: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  let foundFirstUser = false;

  for (const msg of messages) {
    if (!msg.text || !msg.text.trim()) continue;

    const role: 'user' | 'model' = msg.sender === 'user' ? 'user' : 'model';

    // In Gemini API, history must begin with a user turn
    if (!foundFirstUser) {
      if (role === 'user') {
        foundFirstUser = true;
        formatted.push({ role: 'user', parts: [{ text: msg.text.trim() }] });
      }
      continue;
    }

    // Ensure strict alternation of user and model turns
    const lastItem = formatted[formatted.length - 1];
    if (lastItem && lastItem.role === role) {
      lastItem.parts[0].text += `\n\n${msg.text.trim()}`;
    } else {
      formatted.push({ role, parts: [{ text: msg.text.trim() }] });
    }
  }

  // The historical context in startChat must end with a model turn
  // since the new user message is passed into chat.sendMessage()
  while (formatted.length > 0 && formatted[formatted.length - 1].role === 'user') {
    formatted.pop();
  }

  return formatted;
}

/**
 * 4. AI Career Advisor Multi-Turn Chat (Client-Side)
 * Uses model.startChat() with full conversation memory history.
 */
export async function getCareerAdvisorResponseClient(
  question: string,
  user?: UserProfile | null,
  goals: Goal[] = [],
  history: ChatHistoryMessage[] = []
): Promise<{ answer: string }> {
  const genAI = getGeminiClient();
  if (!genAI) {
    throw new Error(
      'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your environment or Settings.'
    );
  }

  const userContext = user
    ? `
User Profile:
- Name: ${user.name}
- Role: ${user.role} (${user.title || 'Professional'} at ${user.organization || 'Organization'})
- Industry: ${user.industry || 'Technology / Professional'}
- Skills: ${(user.skills || []).join(', ') || 'Professional skills'}
- Areas of Interest: ${(user.interests || []).join(', ') || 'Mentorship, Leadership'}
- Current Active Goals: ${goals.length > 0 ? goals.map(g => `${g.title} (${g.progress}% completed)`).join('; ') : 'General career acceleration'}
`
    : 'User is an ambitious professional seeking mentorship and career growth advice on MentorNexus.';

  const systemInstruction = `You are MentorNexus AI Advisor, an expert career mentor, leadership strategist, and professional development coach.
You provide high-impact, contextual, actionable, and pragmatic guidance to mentees and mentors.

Context about the user you are advising:
${userContext}

Guidelines for your responses:
- Maintain full awareness of previous conversation turns and follow up coherently.
- Provide structured, practical advice (use clean markdown formatting with headers, bullet points, and bold terms).
- Give concrete, real-world examples, actionable scripts, or tactical frameworks when relevant.
- Be concise, direct, empathetic, and professional.
- Do not output static boilerplate text; dynamically tailor every answer to the user's ongoing conversation context.`;

  const formattedHistory = formatHistoryForGemini(history);
  let lastError: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: PRIMARY_MODEL,
        systemInstruction: systemInstruction,
      });

      const chat = model.startChat({
        history: formattedHistory,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        },
      });

      const result = await chat.sendMessage(question.trim());
      const response = await result.response;
      const text = response.text();
      if (text && text.trim().length > 0) {
        return { answer: text.trim() };
      }
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      const isTransient =
        errorMsg.includes('503') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 250));
        continue;
      }
      break;
    }
  }

  console.error('[Client Gemini] Multi-turn chat failed for model:', PRIMARY_MODEL, lastError);
  throw new Error(
    lastError?.message || 'Failed to receive response from Gemini AI. Please verify your connection or try again.'
  );
}
