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

const MODELS_PRIORITY = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-flash'
];

/**
 * Resilient helper that attempts calls across priority models and applies retries.
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

  for (const modelName of MODELS_PRIORITY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
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
        break; // try next model
      }
    }
  }

  console.warn(`[Client Gemini] Could not complete "${actionName}" via API. Falling back to local intelligence.`);
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

/**
 * 4. AI Career Advisor Chat (Client-Side)
 */
export async function getCareerAdvisorResponseClient(
  question: string,
  user?: UserProfile | null,
  goals: Goal[] = []
): Promise<{ answer: string }> {
  try {
    const userContext = user ? `
User Profile:
- Name: ${user.name}
- Role: ${user.role} (${user.title} at ${user.organization})
- Skills: ${(user.skills || []).join(', ')}
- Current Goals: ${goals.length > 0 ? goals.map(g => `${g.title} (${g.progress}% done)`).join('; ') : 'General career growth'}
` : 'User is an ambitious professional seeking career and mentorship advice.';

    const systemInstruction = 'You are MentorNexus AI, an experienced, pragmatic career and mentorship advisor. Provide actionable, structured, empathetic, and direct professional advice in clean markdown format (under 250 words). Include 1 specific action they can take today and 1 topic to discuss with their mentor in their next 1:1.';

    const prompt = `${userContext}

User's Question:
"${question}"

Provide actionable career and mentorship guidance:`;

    const raw = await callClientGeminiWithResilience(prompt, 'getCareerAdvisorResponseClient', systemInstruction);
    if (raw) {
      return { answer: raw };
    }
  } catch (error) {
    console.warn('[Client Gemini] getCareerAdvisorResponse fallback used:', error);
  }

  const roleTitle = user?.title || 'professional';
  const goalAnchor = goals[0]?.title ? `"${goals[0].title}"` : 'your active career milestones';

  return {
    answer: `### Strategic Guidance for Your Next Step

As you navigate your path as a **${roleTitle}**, focus on bridging theoretical understanding with measurable real-world outcomes:

1. **Take Action Today**: Document 2-3 specific scenarios where you encountered ambiguity this week, and outline the decision frameworks you applied.
2. **Discuss with Your Mentor**: Bring specific work artifacts or code reviews to your next 1:1 rather than open-ended questions.
3. **Anchor on Deliverables**: Anchor around ${goalAnchor} and break it down into 2-week actionable deliverables.`
  };
}
