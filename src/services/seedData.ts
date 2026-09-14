import { UserProfile, ExperienceResource, Goal } from '../types';

export const SEED_PROFILES: UserProfile[] = [
  {
    id: 'user_marcus_mentor',
    name: 'Dr. Marcus Vance',
    email: 'marcus.vance@techcorp.io',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    title: 'Staff AI & Systems Architect',
    organization: 'Google DeepMind Alumni / Nexus Labs',
    bio: '15+ years architecting distributed systems and large-scale AI pipelines. Passionate about empowering engineers transitioning into tech lead & principal architect roles.',
    industry: 'Technology & AI',
    location: 'San Francisco, CA (Remote)',
    yearsOfExperience: 15,
    skills: ['System Design', 'AI Pipelines', 'Distributed Systems', 'Engineering Leadership', 'Go', 'Python'],
    interests: ['Generative AI', 'High-Performance Computing', 'Engineering Mentorship'],
    mentoringAreas: ['Architecture Reviews', 'Tech Lead Transition', 'Executive Presence'],
    education: 'Ph.D. in Computer Science, Stanford University',
    availability: '3 hrs/week',
    verificationStatus: 'verified',
    rating: 4.95,
    reviewCount: 38,
    createdAt: '2025-01-10T08:00:00.000Z',
    isBanned: false
  },
  {
    id: 'user_elena_mentor',
    name: 'Elena Rostova',
    email: 'elena.rostova@venturepm.org',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    title: 'VP of Product Management',
    organization: 'FinTech Horizons',
    bio: 'Former Stripe and Spotify product leader. Specializing in product strategy, monetization funnels, PM interview prep, and cross-functional executive alignment.',
    industry: 'Product Management',
    location: 'New York, NY',
    yearsOfExperience: 12,
    skills: ['Product Strategy', 'Growth Metrics', 'APM Coaching', 'User Research', 'Roadmapping'],
    interests: ['FinTech', 'SaaS Models', 'Mentorship for Women in Tech'],
    mentoringAreas: ['APM/PM Coaching', 'Portfolio Reviews', 'Executive Communication'],
    education: 'MBA, Harvard Business School',
    availability: '2 hrs/week',
    verificationStatus: 'verified',
    rating: 4.98,
    reviewCount: 42,
    createdAt: '2025-01-15T09:30:00.000Z',
    isBanned: false
  },
  {
    id: 'user_david_mentor',
    name: 'David Kim',
    email: 'david.kim@cloudinfra.net',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    title: 'Director of Cloud Engineering & DevOps',
    organization: 'Apex Infrastructure',
    bio: 'Building enterprise Kubernetes and multi-cloud resilience. Helping junior and mid-level DevOps engineers level up their infrastructure-as-code and reliability practices.',
    industry: 'Cloud & Infrastructure',
    location: 'Seattle, WA',
    yearsOfExperience: 10,
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Site Reliability Engineering', 'CI/CD Pipelines'],
    interests: ['Cloud Native', 'Cost Optimization', 'Career Transition'],
    mentoringAreas: ['DevOps Roadmap', 'SRE Best Practices', 'Salary Negotiation'],
    education: 'B.S. in Computer Engineering, University of Washington',
    availability: '2 hrs/week',
    verificationStatus: 'verified',
    rating: 4.9,
    reviewCount: 29,
    createdAt: '2025-02-01T11:00:00.000Z',
    isBanned: false
  },
  {
    id: 'user_aisha_mentor',
    name: 'Aisha Patel',
    email: 'aisha.patel@uxcollective.design',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
    title: 'Principal Product Designer & UX Lead',
    organization: 'DesignCraft Studio',
    bio: 'Design systems fanatic and design mentor. Focused on human-centered interaction, design systems architecture, and storytelling portfolios that land senior roles.',
    industry: 'UI/UX & Product Design',
    location: 'Austin, TX',
    yearsOfExperience: 9,
    skills: ['Design Systems', 'Figma', 'User Research', 'Prototyping', 'Design Leadership'],
    interests: ['Accessibility', 'Inclusive Design', 'Design Mentorship'],
    mentoringAreas: ['UX Portfolio Reviews', 'Design Critique', 'Cross-Functional Collaboration'],
    education: 'M.Des., Rhode Island School of Design',
    availability: '3 hrs/week',
    verificationStatus: 'verified',
    rating: 4.96,
    reviewCount: 31,
    createdAt: '2025-02-10T14:00:00.000Z',
    isBanned: false
  },
  {
    id: 'user_sarah_mentee',
    name: 'Sarah Chen',
    email: 'sarah.chen@student.edu',
    role: 'learner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    title: 'Full-Stack Developer & Aspiring ML Engineer',
    organization: 'UC Berkeley CS Senior',
    bio: 'Computer Science senior focused on full-stack web applications and machine learning. Seeking guidance on breaking into high-growth AI startups and software engineering careers.',
    industry: 'Technology & AI',
    location: 'Berkeley, CA',
    yearsOfExperience: 1,
    skills: ['TypeScript', 'React', 'Python', 'PyTorch', 'Next.js'],
    interests: ['Generative AI', 'Full-Stack Engineering', 'Open Source'],
    mentoringAreas: ['Career Navigation', 'Technical Depth', 'Resume & Interview Prep'],
    education: 'B.S. in Computer Science (Graduating 2026)',
    verificationStatus: 'verified',
    rating: 5.0,
    reviewCount: 3,
    createdAt: '2026-01-01T10:00:00.000Z',
    isBanned: false
  },
  {
    id: 'user_alex_mentee',
    name: 'Alex Rivera',
    email: 'alex.rivera@earlycareer.dev',
    role: 'early_career',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    title: 'Junior Software Engineer',
    organization: 'FinTech Startup',
    bio: 'Self-taught developer transitioned from finance. Working on backend payment rails and eager to learn cloud architecture and system design patterns.',
    industry: 'Software Engineering',
    location: 'Chicago, IL',
    yearsOfExperience: 2,
    skills: ['Node.js', 'PostgreSQL', 'Docker', 'REST APIs', 'TypeScript'],
    interests: ['Cloud Architecture', 'FinTech Rails', 'Career Growth'],
    mentoringAreas: ['System Design Basics', 'Promotion Strategy', 'Code Quality'],
    education: 'B.A. Economics, University of Illinois',
    verificationStatus: 'verified',
    rating: 4.85,
    reviewCount: 5,
    createdAt: '2026-01-05T12:00:00.000Z',
    isBanned: false
  },
  {
    id: 'user_admin_demo',
    name: 'MentorNexus Community Admin',
    email: 'admin@mentornexus.io',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    title: 'Platform Administrator & Trust Lead',
    organization: 'MentorNexus Foundation',
    bio: 'Overseeing community standards, mentor verification, and platform integrity.',
    industry: 'Community Management',
    location: 'Global / Remote',
    yearsOfExperience: 8,
    skills: ['Community Safety', 'Verification', 'Moderation', 'Operations'],
    interests: ['EdTech', 'Social Impact', 'Safe Learning Environments'],
    mentoringAreas: ['Platform Operations'],
    verificationStatus: 'verified',
    rating: 5.0,
    reviewCount: 15,
    createdAt: '2025-01-01T00:00:00.000Z',
    isBanned: false
  }
];

export const SEED_RESOURCES: ExperienceResource[] = [
  {
    id: 'res_001',
    title: 'How to Get Maximum ROI from Your Mentorship Relationships',
    summary: 'A definitive guide on setting agendas, asking powerful questions, and transforming periodic 1:1 sessions into lifelong professional catalysts.',
    content: `## The Art of Active Mentorship

Mentorship is not passive listening; it is an active, intentional collaboration. The most successful mentees treat every mentorship session like an executive briefing.

### 1. The 24-Hour Pre-Flight Memo
Always send your mentor a concise 3-bullet agenda at least 24 hours prior:
- **Current Progress:** What concrete action you took since the last session.
- **Specific Obstacle:** The exact decision or blocker you need their perspective on (with options you are already considering).
- **Desired Outcome:** What clarity you hope to walk away with today.

### 2. Focus on Decisions, Not Just Information
Do not ask questions that can be Googled. Instead of "What is Docker?", ask "We are choosing between ECS Fargate and EKS for a 5-person startup team with $10k monthly cloud budget; what operational pitfalls did you encounter at this stage?"

### 3. Close the Feedback Loop
Within 48 hours of every call, send a brief thank-you note summarizing the action items you committed to and when you will execute them. Mentors love seeing their advice translated into tangible impact!`,
    category: 'Mentorship Stories',
    authorId: 'user_marcus_mentor',
    authorName: 'Dr. Marcus Vance',
    authorTitle: 'Staff AI & Systems Architect',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    readTimeMinutes: 5,
    tags: ['Mentorship', 'Career Strategy', '1:1 Meetings', 'Professional Growth'],
    featured: true,
    publishedAt: '2026-01-20T10:00:00.000Z'
  },
  {
    id: 'res_002',
    title: 'Transitioning from Individual Contributor to Technical Lead',
    summary: 'Navigating the mental shift from writing code to multiplying engineering leverage, building consensus, and protecting team focus.',
    content: `## The Multiplier Mindset

When you become a Senior Engineer or Tech Lead, your value changes from how many pull requests you author to how effectively you elevate the entire engineering unit.

### Core Shifts:
1. **From Solving to Framing:** Your job is no longer to write the cleverest code; it is to define problems so clearly that any engineer on your team can solve them cleanly.
2. **Architecture as Trade-Offs:** Every architectural choice is a compromise between velocity, maintainability, and cognitive load. Learn to articulate why you rejected alternative paths in your RFCs.
3. **Sponsorship and Visibility:** Deliberately assign stretch projects to junior teammates and praise their contributions in cross-functional forums.`,
    category: 'Leadership',
    authorId: 'user_david_mentor',
    authorName: 'David Kim',
    authorTitle: 'Director of Cloud Engineering & DevOps',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    readTimeMinutes: 6,
    tags: ['Tech Lead', 'Leadership', 'Career Progression', 'Engineering Culture'],
    featured: true,
    publishedAt: '2026-02-05T14:30:00.000Z'
  },
  {
    id: 'res_003',
    title: 'De-Mystifying Product Management: What Senior PMs Actually Look For in APMs',
    summary: 'Practical advice on product sense, metric intuition, and customer empathy for candidates breaking into product management.',
    content: `## What Truly Sets Great Product Candidates Apart

The best product managers do not just manage backlogs—they deeply understand user pain points, business economics, and organizational dynamics.

### Key Pillars:
1. **Product Sense:** Can you identify why a beloved product succeeds and articulate a structured critique of what you would improve?
2. **First-Principles Thinking:** When given an ambiguous problem like "Improve onboarding conversion by 20%", do you immediately suggest features or do you dissect user drop-off funnels first?
3. **Influence Without Authority:** How you build genuine rapport with engineers and designers determines your product's momentum.`,
    category: 'Career Advice',
    authorId: 'user_elena_mentor',
    authorName: 'Elena Rostova',
    authorTitle: 'VP of Product Management',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    readTimeMinutes: 7,
    tags: ['Product Management', 'APM', 'Interviews', 'Career Transition'],
    featured: true,
    publishedAt: '2026-02-18T09:15:00.000Z'
  },
  {
    id: 'res_004',
    title: 'Building a Standout UX Design Portfolio That Gets You Hired',
    summary: 'Why hiring managers skip pretty UI screens and how to structure case studies around messy problem-solving, user research insights, and measurable outcomes.',
    content: `## Case Studies Over Visual Dribbble Shots

Hiring managers want to see how you think under real-world constraints, not hypothetical redesigns of popular apps without data.

### Portfolio Structure Formula:
1. **The Context & Problem:** Who were the users, what was the business goal, and what were the technical constraints?
2. **The Research & Discovery:** What surprising insight did user interviews reveal that changed your original hypothesis?
3. **The Iteration & Validation:** Show rough sketches, discarded prototypes, and explain why you pivoted.
4. **The Impact:** Quantifiable metrics (e.g., 34% reduction in checkout drop-off) and lessons learned for future iterations.`,
    category: 'Technical Growth',
    authorId: 'user_aisha_mentor',
    authorName: 'Aisha Patel',
    authorTitle: 'Principal Product Designer & UX Lead',
    authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
    readTimeMinutes: 5,
    tags: ['UI/UX', 'Portfolios', 'Design Strategy', 'Case Studies'],
    featured: false,
    publishedAt: '2026-02-26T11:45:00.000Z'
  }
];

export const SEED_GOALS: Goal[] = [
  {
    id: 'goal_seed_1',
    userId: 'user_sarah_mentee',
    title: 'Master Distributed Systems Architecture',
    description: 'Learn consensus algorithms (Raft, Paxos), distributed caching, and event-driven architectures to prepare for Senior/Staff interview loops.',
    category: 'System Design',
    targetDate: '2026-10-15',
    progress: 40,
    status: 'in_progress',
    milestones: [
      { id: 'm1', title: 'Complete Martin Kleppmann Designing Data-Intensive Applications Part 2', completed: true },
      { id: 'm2', title: 'Implement a replicated log in Go or TypeScript', completed: true },
      { id: 'm3', title: 'Mock architecture review with Dr. Vance on high-throughput queue design', completed: false }
    ],
    mentorId: 'user_marcus_mentor',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
  }
];
