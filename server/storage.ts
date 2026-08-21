import fs from 'fs';
import path from 'path';
import { 
  UserProfile, 
  MentorshipRequest, 
  MentorshipConnection, 
  Goal, 
  ExperienceResource, 
  AppNotification, 
  AdminStats,
  UserRole 
} from '../src/types/index';

interface DatabaseSchema {
  users: UserProfile[];
  requests: MentorshipRequest[];
  connections: MentorshipConnection[];
  goals: Goal[];
  resources: ExperienceResource[];
  notifications: AppNotification[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_sarah_learner',
    email: 'sarah.chen@university.edu',
    name: 'Sarah Chen',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    title: 'CS Undergraduate Student',
    organization: 'Stanford University',
    bio: 'Junior Computer Science major passionate about AI, distributed systems, and modern web architectures. Seeking mentorship on transitioning to industry roles and preparing for technical interviews.',
    industry: 'Technology & AI',
    location: 'Palo Alto, CA',
    yearsOfExperience: 1,
    skills: ['Python', 'TypeScript', 'React', 'Data Structures', 'Machine Learning', 'Git'],
    interests: ['Artificial Intelligence', 'Cloud Infrastructure', 'Tech Careers', 'Open Source'],
    mentoringAreas: ['Software Engineering Careers', 'Resume & Interview Prep', 'Internship Strategies'],
    education: 'B.S. Computer Science (Expected 2027)',
    verificationStatus: 'verified',
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'user_alex_early',
    email: 'alex.rivera@fintechstartup.io',
    name: 'Alex Rivera',
    role: 'early_career',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    title: 'Junior Software Engineer',
    organization: 'FinFlow Technologies',
    bio: 'Full-stack developer with 2 years of professional experience building React and Node.js microservices. Looking for guidance on system architecture, promotion to Senior Engineer, and technical leadership.',
    industry: 'Financial Technology',
    location: 'Austin, TX',
    yearsOfExperience: 2,
    skills: ['JavaScript', 'TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker', 'REST APIs'],
    interests: ['System Design', 'Fintech Architecture', 'Engineering Leadership', 'Clean Code'],
    mentoringAreas: ['Mid-level Career Promotion', 'System Design', 'Backend Scalability'],
    education: 'B.S. Software Engineering, UT Austin',
    verificationStatus: 'verified',
    createdAt: '2026-02-10T14:30:00.000Z',
  },
  {
    id: 'user_marcus_mentor',
    email: 'marcus.vance@techgiant.com',
    name: 'Dr. Marcus Vance',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    title: 'Staff AI & Systems Architect',
    organization: 'Apex AI Research / Former Google',
    bio: '14+ years designing high-scale distributed systems and LLM inference pipelines. Passionate about empowering aspiring software engineers, research scientists, and diverse talent in technology.',
    industry: 'Artificial Intelligence & Cloud',
    location: 'San Francisco, CA',
    yearsOfExperience: 14,
    skills: ['Distributed Systems', 'Python', 'Go', 'PyTorch', 'System Architecture', 'Cloud Infrastructure', 'Tech Leadership'],
    interests: ['Generative AI', 'High Performance Computing', 'Mentorship Ethics', 'Open Source'],
    mentoringAreas: ['AI & ML Career Roadmaps', 'Senior / Staff Engineering Transition', 'System Design at Scale', 'Engineering Leadership'],
    education: 'Ph.D. in Computer Science, Carnegie Mellon University',
    achievements: ['Published 12 IEEE/ACM papers on distributed systems', 'Mentored 35+ engineers into Senior/Staff roles', 'Top Mentor Award 2025'],
    availability: '2 hrs / week (Bi-weekly 1:1 sessions)',
    verificationStatus: 'verified',
    rating: 4.96,
    reviewCount: 42,
    createdAt: '2025-08-01T10:00:00.000Z',
  },
  {
    id: 'user_elena_mentor',
    email: 'elena.rostova@productforge.com',
    name: 'Elena Rostova',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    title: 'VP of Product Management',
    organization: 'CloudScale SaaS',
    bio: 'Product executive with 11+ years leading multi-disciplinary product, design, and growth teams across Series A through IPO stages. Helping product managers hone strategic vision and executive communication.',
    industry: 'Product Management & SaaS',
    location: 'New York, NY',
    yearsOfExperience: 11,
    skills: ['Product Strategy', 'Roadmapping', 'User Research', 'Product-Led Growth', 'Cross-functional Leadership', 'Data Analytics'],
    interests: ['Product Ops', 'SaaS Metrics', 'Executive Mentoring', 'Inclusive Leadership'],
    mentoringAreas: ['Breaking into Product Management', 'Executive Presence & Stakeholder Management', 'Scaling SaaS Products', 'Product Strategy Frameworks'],
    education: 'MBA, Harvard Business School',
    achievements: ['Led 3 products from $0 to $40M+ ARR', 'Keynote Speaker at ProductCon 2025', 'Author of "The Pragmatic PM"'],
    availability: '3 slots open (Monthly strategic reviews)',
    verificationStatus: 'verified',
    rating: 4.92,
    reviewCount: 29,
    createdAt: '2025-09-12T11:20:00.000Z',
  },
  {
    id: 'user_david_mentor',
    email: 'david.kim@devopsglobal.net',
    name: 'David Kim',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    title: 'Director of Cloud Engineering & DevOps',
    organization: 'NextGen Infrastructure',
    bio: 'Helping engineers navigate modern DevOps, Kubernetes ecosystem, Site Reliability Engineering (SRE), and multi-cloud security.',
    industry: 'Cloud Engineering & DevOps',
    location: 'Seattle, WA',
    yearsOfExperience: 12,
    skills: ['Kubernetes', 'AWS', 'GCP', 'Terraform', 'CI/CD', 'Observability', 'Linux Kernel'],
    interests: ['Zero Trust Security', 'GitOps', 'Platform Engineering'],
    mentoringAreas: ['DevOps & Cloud Specialization', 'SRE Best Practices', 'Infrastructure as Code Mastery'],
    education: 'B.S. Electrical & Computer Engineering, University of Washington',
    achievements: ['Built multi-region Kubernetes clusters handling 50M daily requests', 'Certified Kubernetes Administrator (CKA) trainer'],
    availability: '1.5 hrs / week',
    verificationStatus: 'verified',
    rating: 4.88,
    reviewCount: 18,
    createdAt: '2025-10-05T08:15:00.000Z',
  },
  {
    id: 'user_aisha_mentor',
    email: 'aisha.patel@designstudio.co',
    name: 'Aisha Patel',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
    title: 'Principal Product Designer & UX Lead',
    organization: 'Starlight Design Labs',
    bio: 'Dedicated to helping aspiring and mid-level designers build rock-solid UX research portfolios, master design systems, and articulate design decisions to engineers and stakeholders.',
    industry: 'UI/UX & Product Design',
    location: 'Chicago, IL',
    yearsOfExperience: 9,
    skills: ['Design Systems', 'Figma', 'User Research', 'Information Architecture', 'Prototyping', 'Accessibility (WCAG)'],
    interests: ['Ethical Design', 'Design Thinking Workshops', 'Accessibility'],
    mentoringAreas: ['Design Portfolio Reviews', 'Transitioning to Senior Designer', 'Mastering Design Systems', 'UX Interview Prep'],
    education: 'B.F.A. Interactive Design, Rhode Island School of Design (RISD)',
    achievements: ['Redesigned flagship healthcare mobile app used by 4M users', 'Design System Lead of the Year 2024'],
    availability: '2 slots open (Flexible weekday evenings)',
    verificationStatus: 'verified',
    rating: 4.95,
    reviewCount: 31,
    createdAt: '2025-11-20T16:40:00.000Z',
  },
  {
    id: 'user_carlos_mentor_pending',
    email: 'carlos.mendoza@cyberguard.org',
    name: 'Carlos Mendoza',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    title: 'Lead Cybersecurity Architect',
    organization: 'Sentinel Security Group',
    bio: 'Specialist in threat modeling, application security, and penetration testing. Applying to join MentorNexus mentor council to guide students in cybersecurity careers.',
    industry: 'Cybersecurity & Infosec',
    location: 'Denver, CO',
    yearsOfExperience: 8,
    skills: ['Cybersecurity', 'AppSec', 'Threat Modeling', 'Network Security', 'Cryptography', 'Python'],
    interests: ['Zero Trust', 'Cloud Security', 'InfoSec Mentorship'],
    mentoringAreas: ['Cybersecurity Certifications (CISSP/OSCP)', 'Offensive & Defensive Security', 'SOC Career Paths'],
    education: 'M.S. Information Security, Johns Hopkins',
    achievements: ['Discovered 4 critical CVEs in enterprise protocols'],
    availability: '1 hr / week',
    verificationStatus: 'pending',
    verificationNotes: 'Submitted credentials: CISSP certification #489211 and employer endorsement letter.',
    createdAt: '2026-03-01T12:00:00.000Z',
  },
  {
    id: 'user_admin_jordan',
    email: 'admin.jordan@mentornexus.internal',
    name: 'Jordan Hayes',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    title: 'Platform Director & Community Lead',
    organization: 'MentorNexus Global',
    bio: 'MentorNexus system administrator ensuring community safety, mentor verification standards, quality content moderation, and high-impact mentorship pairings.',
    industry: 'Platform Administration & Education',
    location: 'San Francisco, CA',
    yearsOfExperience: 10,
    skills: ['Community Safety', 'Program Management', 'Mentorship Research', 'Policy Moderation', 'Data Analytics'],
    interests: ['Educational Equity', 'Mentorship Science', 'Community Building'],
    mentoringAreas: ['Community Programs'],
    verificationStatus: 'verified',
    createdAt: '2025-06-01T00:00:00.000Z',
  }
];

const INITIAL_REQUESTS: MentorshipRequest[] = [
  {
    id: 'req_001',
    requesterId: 'user_sarah_learner',
    requesterName: 'Sarah Chen',
    requesterTitle: 'CS Undergraduate Student',
    requesterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    requesterRole: 'student',
    mentorId: 'user_marcus_mentor',
    mentorName: 'Dr. Marcus Vance',
    mentorTitle: 'Staff AI & Systems Architect',
    mentorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    status: 'accepted',
    message: 'Hello Dr. Vance! I have been following your open source work on distributed execution engines. I am preparing for AI infrastructure internship interviews and would be incredibly grateful for your mentorship on systems design and career roadmapping.',
    goalsSummary: 'Master distributed systems fundamentals and land a high-impact AI engineering internship.',
    responseNote: 'Welcome Sarah! Impressed by your GitHub projects. Looking forward to our mentorship journey.',
    createdAt: '2026-02-18T10:15:00.000Z',
    updatedAt: '2026-02-19T14:20:00.000Z',
  },
  {
    id: 'req_002',
    requesterId: 'user_alex_early',
    requesterName: 'Alex Rivera',
    requesterTitle: 'Junior Software Engineer',
    requesterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    requesterRole: 'early_career',
    mentorId: 'user_marcus_mentor',
    mentorName: 'Dr. Marcus Vance',
    mentorTitle: 'Staff AI & Systems Architect',
    mentorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    status: 'pending',
    message: 'Hi Marcus, I am currently a junior engineer at FinFlow building fintech microservices. I am aiming for promotion to Mid/Senior engineer this cycle and would value your guidance on designing fault-tolerant architectures and communicating system proposals to leadership.',
    goalsSummary: 'Level up system design skills and earn senior promotion.',
    createdAt: '2026-03-01T15:40:00.000Z',
    updatedAt: '2026-03-01T15:40:00.000Z',
  },
  {
    id: 'req_003',
    requesterId: 'user_sarah_learner',
    requesterName: 'Sarah Chen',
    requesterTitle: 'CS Undergraduate Student',
    requesterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    requesterRole: 'student',
    mentorId: 'user_elena_mentor',
    mentorName: 'Elena Rostova',
    mentorTitle: 'VP of Product Management',
    mentorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    status: 'pending',
    message: 'Dear Elena, I am exploring Associate Product Manager (APM) programs alongside software engineering. Your experience building $0 to $40M products is inspiring! Could we connect for guidance on evaluating tech vs. product paths?',
    goalsSummary: 'Evaluate APM vs SWE career paths and prepare APM case interviews.',
    createdAt: '2026-03-02T09:10:00.000Z',
    updatedAt: '2026-03-02T09:10:00.000Z',
  },
  {
    id: 'req_004',
    requesterId: 'user_alex_early',
    requesterName: 'Alex Rivera',
    requesterTitle: 'Junior Software Engineer',
    requesterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    requesterRole: 'early_career',
    mentorId: 'user_david_mentor',
    mentorName: 'David Kim',
    mentorTitle: 'Director of Cloud Engineering & DevOps',
    mentorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    status: 'accepted',
    message: 'Hi David! I want to master Docker and Kubernetes infrastructure for our backend services. Would love your mentorship on building production-ready CI/CD pipelines.',
    goalsSummary: 'Achieve CKA certification and migrate legacy services to Kubernetes.',
    responseNote: 'Great goal Alex! Let us set up our first bi-weekly sync to review your architecture diagrams.',
    createdAt: '2026-02-10T11:00:00.000Z',
    updatedAt: '2026-02-11T13:30:00.000Z',
  }
];

const INITIAL_CONNECTIONS: MentorshipConnection[] = [
  {
    id: 'conn_001',
    requestId: 'req_001',
    studentId: 'user_sarah_learner',
    studentName: 'Sarah Chen',
    studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    studentTitle: 'CS Undergraduate Student',
    mentorId: 'user_marcus_mentor',
    mentorName: 'Dr. Marcus Vance',
    mentorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    mentorTitle: 'Staff AI & Systems Architect',
    focusAreas: ['Distributed Systems Architecture', 'Technical Interview Mastery', 'AI Model Deployment'],
    connectedAt: '2026-02-19T14:20:00.000Z',
    lastInteractionAt: '2026-03-01T18:00:00.000Z',
    status: 'active',
    notes: ['Bi-weekly sync on Thursdays at 4:30 PM PST. Reviewing distributed consensus protocols (Raft/Paxos) and mock interview questions.']
  },
  {
    id: 'conn_002',
    requestId: 'req_004',
    studentId: 'user_alex_early',
    studentName: 'Alex Rivera',
    studentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    studentTitle: 'Junior Software Engineer',
    mentorId: 'user_david_mentor',
    mentorName: 'David Kim',
    mentorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    mentorTitle: 'Director of Cloud Engineering & DevOps',
    focusAreas: ['Kubernetes Deployment', 'CI/CD Automation', 'Cloud Security'],
    connectedAt: '2026-02-11T13:30:00.000Z',
    lastInteractionAt: '2026-02-28T16:00:00.000Z',
    status: 'active',
    notes: ['Monthly deep-dives on Terraform state management and production Kubernetes cluster monitoring with Prometheus/Grafana.']
  }
];

const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal_001',
    userId: 'user_sarah_learner',
    title: 'Crack Tier-1 Tech Summer Internship Interviews',
    description: 'Prepare systematically for coding challenges, systems design basics, and behavioral interviews for summer software engineering roles.',
    category: 'Interview Prep',
    targetDate: '2026-05-15',
    progress: 70,
    status: 'in_progress',
    mentorId: 'user_marcus_mentor',
    milestones: [
      { id: 'm1', title: 'Complete 75 LeetCode medium problems on Trees, Graphs, and DP', completed: true, dueDate: '2026-02-28' },
      { id: 'm2', title: 'Conduct 3 mock technical interviews with Dr. Marcus Vance', completed: true, dueDate: '2026-03-15' },
      { id: 'm3', title: 'Build a distributed key-value store portfolio project in Go/Rust', completed: true, dueDate: '2026-04-01' },
      { id: 'm4', title: 'Polish resume and receive mentor sign-off', completed: false, dueDate: '2026-04-20' },
      { id: 'm5', title: 'Submit 15 targeted internship applications with tailored cover letters', completed: false, dueDate: '2026-05-10' }
    ],
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-03-01T18:30:00.000Z',
  },
  {
    id: 'goal_002',
    userId: 'user_sarah_learner',
    title: 'Publish an Open Source LLM Evaluation Benchmark',
    description: 'Design and open-source a lightweight Python library for benchmarking LLM latency and streaming throughput.',
    category: 'Technical Skills',
    targetDate: '2026-06-30',
    progress: 35,
    status: 'in_progress',
    mentorId: 'user_marcus_mentor',
    milestones: [
      { id: 'm201', title: 'Draft technical spec & architecture diagram', completed: true, dueDate: '2026-02-15' },
      { id: 'm202', title: 'Implement async batching engine with pytest test suite (90%+ coverage)', completed: false, dueDate: '2026-04-15' },
      { id: 'm203', title: 'Write comprehensive documentation and interactive Colab demo', completed: false, dueDate: '2026-05-30' },
      { id: 'm204', title: 'Publish on PyPI and launch on Hacker News / GitHub Trending', completed: false, dueDate: '2026-06-25' }
    ],
    createdAt: '2026-02-01T12:00:00.000Z',
    updatedAt: '2026-02-25T15:00:00.000Z',
  },
  {
    id: 'goal_003',
    userId: 'user_alex_early',
    title: 'Promotion to Mid-Level / Senior Software Engineer',
    description: 'Demonstrate system ownership, mentor junior developers, and lead the architecture migration for FinFlow payment ingestion engine.',
    category: 'Career Growth',
    targetDate: '2026-08-30',
    progress: 50,
    status: 'in_progress',
    mentorId: 'user_david_mentor',
    milestones: [
      { id: 'm301', title: 'Author RFC for high-throughput payment webhook processing', completed: true, dueDate: '2026-02-20' },
      { id: 'm302', title: 'Present RFC to Engineering Architecture Review Committee', completed: true, dueDate: '2026-03-05' },
      { id: 'm303', title: 'Successfully rollout service with zero downtime (<50ms p99 latency)', completed: false, dueDate: '2026-06-01' },
      { id: 'm304', title: 'Complete self-evaluation and compile mentor feedback portfolio', completed: false, dueDate: '2026-08-01' }
    ],
    createdAt: '2026-02-12T14:00:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
  }
];

const INITIAL_RESOURCES: ExperienceResource[] = [
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
    featured: false,
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

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_001',
    userId: 'user_sarah_learner',
    title: 'Mentorship Request Accepted!',
    message: 'Dr. Marcus Vance accepted your mentorship request. You are now officially connected in MentorNexus!',
    type: 'request_accepted',
    read: false,
    linkTab: 'connections',
    linkId: 'conn_001',
    createdAt: '2026-02-19T14:20:00.000Z',
  },
  {
    id: 'notif_002',
    userId: 'user_marcus_mentor',
    title: 'New Mentorship Request',
    message: 'Alex Rivera sent you a mentorship request for guidance on system design and senior promotion.',
    type: 'request_received',
    read: false,
    linkTab: 'requests',
    linkId: 'req_002',
    createdAt: '2026-03-01T15:40:00.000Z',
  },
  {
    id: 'notif_003',
    userId: 'user_sarah_learner',
    title: 'Milestone Completed!',
    message: 'Awesome progress! You completed milestone "Complete 75 LeetCode medium problems" on your Interview Prep goal.',
    type: 'goal_milestone',
    read: true,
    linkTab: 'goals',
    linkId: 'goal_001',
    createdAt: '2026-02-28T19:00:00.000Z',
  },
  {
    id: 'notif_004',
    userId: 'user_admin_jordan',
    title: 'Pending Mentor Verification',
    message: 'Carlos Mendoza submitted credentials for verification as a Cybersecurity Mentor.',
    type: 'verification',
    read: false,
    linkTab: 'admin',
    linkId: 'user_carlos_mentor_pending',
    createdAt: '2026-03-01T12:05:00.000Z',
  }
];

class StorageEngine {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.requests && parsed.connections && parsed.goals) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read existing database file, initializing with seeds:', err);
    }

    const initialData: DatabaseSchema = {
      users: INITIAL_USERS,
      requests: INITIAL_REQUESTS,
      connections: INITIAL_CONNECTIONS,
      goals: INITIAL_GOALS,
      resources: INITIAL_RESOURCES,
      notifications: INITIAL_NOTIFICATIONS,
    };

    this.persist(initialData);
    return initialData;
  }

  private persist(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database to disk:', err);
    }
  }

  // User & Profile operations
  getUsers(): UserProfile[] {
    return this.data.users;
  }

  getUserById(id: string): UserProfile | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): UserProfile | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getMentors(): UserProfile[] {
    return this.data.users.filter(u => u.role === 'mentor' && !u.isBanned);
  }

  createUser(user: UserProfile): UserProfile {
    this.data.users.unshift(user);
    this.persist();
    return user;
  }

  updateUser(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.persist();
    return this.data.users[idx];
  }

  // Mentorship Requests
  getRequests(userId?: string): MentorshipRequest[] {
    if (!userId) return this.data.requests;
    return this.data.requests.filter(r => r.requesterId === userId || r.mentorId === userId);
  }

  getRequestById(id: string): MentorshipRequest | undefined {
    return this.data.requests.find(r => r.id === id);
  }

  createRequest(request: Omit<MentorshipRequest, 'id' | 'createdAt' | 'updatedAt'>): MentorshipRequest {
    const newReq: MentorshipRequest = {
      ...request,
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.requests.unshift(newReq);

    // Automatically trigger notification for mentor
    this.createNotification({
      userId: newReq.mentorId,
      title: 'New Mentorship Request',
      message: `${newReq.requesterName} sent you a mentorship request.`,
      type: 'request_received',
      linkTab: 'requests',
      linkId: newReq.id,
    });

    this.persist();
    return newReq;
  }

  respondToRequest(id: string, status: 'accepted' | 'declined', responseNote?: string): MentorshipRequest | null {
    const req = this.data.requests.find(r => r.id === id);
    if (!req) return null;

    req.status = status;
    req.responseNote = responseNote || req.responseNote;
    req.updatedAt = new Date().toISOString();

    if (status === 'accepted') {
      // Create connection if not existing
      const existingConn = this.data.connections.find(c => c.requestId === req.id);
      if (!existingConn) {
        const newConn: MentorshipConnection = {
          id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          requestId: req.id,
          studentId: req.requesterId,
          studentName: req.requesterName,
          studentAvatar: req.requesterAvatar,
          studentTitle: req.requesterTitle,
          mentorId: req.mentorId,
          mentorName: req.mentorName,
          mentorAvatar: req.mentorAvatar,
          mentorTitle: req.mentorTitle,
          focusAreas: ['Career Guidance', 'Skill Development'],
          connectedAt: new Date().toISOString(),
          lastInteractionAt: new Date().toISOString(),
          status: 'active',
          notes: responseNote ? [responseNote] : ['Mentorship connection established on MentorNexus.']
        };
        this.data.connections.unshift(newConn);
      }

      // Notify requester
      this.createNotification({
        userId: req.requesterId,
        title: 'Mentorship Request Accepted! 🎉',
        message: `${req.mentorName} accepted your mentorship request. You can now collaborate on goals and schedules.`,
        type: 'request_accepted',
        linkTab: 'connections',
        linkId: req.id,
      });
    } else if (status === 'declined') {
      this.createNotification({
        userId: req.requesterId,
        title: 'Mentorship Request Update',
        message: `${req.mentorName} was unable to accept your request at this time.${responseNote ? ` Note: "${responseNote}"` : ''}`,
        type: 'request_declined',
        linkTab: 'requests',
        linkId: req.id,
      });
    }

    this.persist();
    return req;
  }

  cancelRequest(id: string, requesterId: string): boolean {
    const req = this.data.requests.find(r => r.id === id && r.requesterId === requesterId);
    if (!req) return false;
    req.status = 'cancelled';
    req.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  // Connections
  getConnections(userId?: string): MentorshipConnection[] {
    if (!userId) return this.data.connections;
    return this.data.connections.filter(c => c.studentId === userId || c.mentorId === userId);
  }

  updateConnection(id: string, updates: Partial<MentorshipConnection>): MentorshipConnection | null {
    const idx = this.data.connections.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.connections[idx] = { ...this.data.connections[idx], ...updates };
    this.persist();
    return this.data.connections[idx];
  }

  // Goals
  getGoals(userId?: string): Goal[] {
    if (!userId) return this.data.goals;
    return this.data.goals.filter(g => g.userId === userId);
  }

  getGoalById(id: string): Goal | undefined {
    return this.data.goals.find(g => g.id === id);
  }

  createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.goals.unshift(newGoal);
    this.persist();
    return newGoal;
  }

  updateGoal(id: string, updates: Partial<Goal>): Goal | null {
    const idx = this.data.goals.findIndex(g => g.id === id);
    if (idx === -1) return null;

    const oldGoal = this.data.goals[idx];
    const updated = { 
      ...oldGoal, 
      ...updates,
      updatedAt: new Date().toISOString() 
    };

    // Calculate progress if milestones are updated
    if (updates.milestones && updates.milestones.length > 0) {
      const completedCount = updates.milestones.filter(m => m.completed).length;
      updated.progress = Math.round((completedCount / updates.milestones.length) * 100);
      if (updated.progress === 100) {
        updated.status = 'completed';
      } else if (updated.progress > 0) {
        updated.status = 'in_progress';
      }
    }

    // Check if newly completed to notify user
    if (oldGoal.status !== 'completed' && updated.status === 'completed') {
      this.createNotification({
        userId: updated.userId,
        title: 'Goal Accomplished! 🏆',
        message: `Congratulations! You have completed all milestones for "${updated.title}".`,
        type: 'goal_milestone',
        linkTab: 'goals',
        linkId: updated.id,
      });
    }

    this.data.goals[idx] = updated;
    this.persist();
    return updated;
  }

  deleteGoal(id: string, userId: string): boolean {
    const idx = this.data.goals.findIndex(g => g.id === id && g.userId === userId);
    if (idx === -1) return false;
    this.data.goals.splice(idx, 1);
    this.persist();
    return true;
  }

  // Experience Library
  getResources(): ExperienceResource[] {
    return this.data.resources;
  }

  getResourceById(id: string): ExperienceResource | undefined {
    return this.data.resources.find(r => r.id === id);
  }

  createResource(resource: Omit<ExperienceResource, 'id' | 'publishedAt'>): ExperienceResource {
    const newRes: ExperienceResource = {
      ...resource,
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      publishedAt: new Date().toISOString(),
    };
    this.data.resources.unshift(newRes);
    this.persist();
    return newRes;
  }

  updateResource(id: string, updates: Partial<ExperienceResource>): ExperienceResource | null {
    const idx = this.data.resources.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data.resources[idx] = { ...this.data.resources[idx], ...updates };
    this.persist();
    return this.data.resources[idx];
  }

  deleteResource(id: string): boolean {
    const idx = this.data.resources.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.data.resources.splice(idx, 1);
    this.persist();
    return true;
  }

  // Notifications
  getNotifications(userId: string): AppNotification[] {
    return this.data.notifications.filter(n => n.userId === userId);
  }

  createNotification(notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>): AppNotification {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(newNotif);
    this.persist();
    return newNotif;
  }

  markNotificationRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id && n.userId === userId);
    if (!notif) return false;
    notif.read = true;
    this.persist();
    return true;
  }

  markAllNotificationsRead(userId: string): boolean {
    this.data.notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    this.persist();
    return true;
  }

  // Admin stats & moderation
  getAdminStats(): AdminStats {
    return {
      totalUsers: this.data.users.length,
      totalMentors: this.data.users.filter(u => u.role === 'mentor').length,
      totalLearners: this.data.users.filter(u => u.role === 'student').length,
      totalEarlyCareer: this.data.users.filter(u => u.role === 'early_career').length,
      activeConnections: this.data.connections.filter(c => c.status === 'active').length,
      pendingRequests: this.data.requests.filter(r => r.status === 'pending').length,
      totalGoals: this.data.goals.length,
      completedGoals: this.data.goals.filter(g => g.status === 'completed').length,
      pendingVerifications: this.data.users.filter(u => u.verificationStatus === 'pending').length,
      totalResources: this.data.resources.length,
    };
  }

  verifyUser(userId: string, status: 'verified' | 'rejected', notes?: string): UserProfile | null {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.verificationStatus = status;
    if (notes) user.verificationNotes = notes;

    this.createNotification({
      userId: user.id,
      title: status === 'verified' ? 'Account Verified ✅' : 'Verification Update',
      message: status === 'verified' 
        ? 'Congratulations! Your MentorNexus professional profile has been verified by the community team.'
        : `Your verification request was reviewed: ${notes || 'Please update your credentials and re-submit.'}`,
      type: 'verification',
      linkTab: 'profile',
    });

    this.persist();
    return user;
  }

  toggleUserBan(userId: string, banned: boolean): UserProfile | null {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.isBanned = banned;
    this.persist();
    return user;
  }
}

export const db = new StorageEngine();
