export type UserRole = 'student' | 'early_career' | 'mentor' | 'admin';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export type GoalCategory = 
  | 'Technical Skills' 
  | 'Career Growth' 
  | 'Career & Promotion'
  | 'System Design'
  | 'Open Source & Projects'
  | 'Leadership & Management' 
  | 'Leadership & Soft Skills'
  | 'Interview Prep' 
  | 'Interview Preparation'
  | 'Portfolio & Resume' 
  | 'Networking & Communication'
  | string;

export type GoalStatus = 'not_started' | 'in_progress' | 'completed';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export type GoalMilestone = Milestone;

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetDate: string;
  progress: number; // 0 to 100
  status: GoalStatus;
  milestones: Milestone[];
  mentorId?: string; // Optional linked mentor for collaborative guidance
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
  title: string;
  organization: string;
  bio: string;
  industry: string;
  location: string;
  yearsOfExperience: number;
  skills: string[];
  interests: string[];
  mentoringAreas: string[];
  education?: string;
  achievements?: string[];
  availability?: string; // e.g. "2 hrs/week", "Bi-weekly 45 min", "Weekends"
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  isBanned?: boolean;
  banned?: boolean;
}

export interface MentorshipRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterTitle: string;
  requesterAvatar: string;
  requesterRole: UserRole;
  mentorId: string;
  mentorName: string;
  mentorTitle: string;
  mentorAvatar: string;
  status: RequestStatus;
  message: string;
  goalsSummary?: string;
  responseNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MentorshipConnection {
  id: string;
  requestId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  studentTitle: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar: string;
  mentorTitle: string;
  focusAreas: string[];
  connectedAt?: string;
  startDate?: string;
  lastInteractionAt?: string;
  lastMeetingDate?: string;
  nextMeetingDate?: string;
  status: 'active' | 'completed' | 'paused';
  notes?: string[];
}

export interface ExperienceResource {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'Career Advice' | 'Technical Growth' | 'Mentorship Stories' | 'Leadership' | 'Industry Insights';
  authorId: string;
  authorName: string;
  authorTitle: string;
  authorAvatar: string;
  readTimeMinutes: number;
  tags: string[];
  featured?: boolean;
  publishedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'request_received' | 'request_accepted' | 'request_declined' | 'goal_milestone' | 'verification' | 'resource_published' | 'system';
  read: boolean;
  linkTab?: string; // e.g. 'requests', 'connections', 'goals', 'library', 'admin'
  linkId?: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalMentors: number;
  totalLearners: number;
  totalEarlyCareer: number;
  activeConnections: number;
  pendingRequests: number;
  totalGoals: number;
  completedGoals: number;
  pendingVerifications: number;
  totalResources: number;
}

export interface AIMatchResult {
  mentorId: string;
  matchScore: number; // 0 - 100
  matchReasons: string[];
  suggestedFocusAreas: string[];
  fitSummary: string;
}
