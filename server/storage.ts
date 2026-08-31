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
  UserRole,
  ChatMessage,
  MentorshipMeeting 
} from '../src/types/index';

interface DatabaseSchema {
  users: UserProfile[];
  requests: MentorshipRequest[];
  connections: MentorshipConnection[];
  goals: Goal[];
  resources: ExperienceResource[];
  notifications: AppNotification[];
  messages?: ChatMessage[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_USERS: UserProfile[] = [];
const INITIAL_REQUESTS: MentorshipRequest[] = [];
const INITIAL_CONNECTIONS: MentorshipConnection[] = [];
const INITIAL_GOALS: Goal[] = [];

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

const INITIAL_NOTIFICATIONS: AppNotification[] = [];

class StorageEngine {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    const MOCK_ID_PREFIXES = [
      'user_sarah', 'user_alex', 'user_marcus', 'user_elena', 
      'user_david', 'user_aisha', 'user_carlos', 'user_admin'
    ];
    const isMockUser = (id?: string) => !id || MOCK_ID_PREFIXES.some(prefix => id.startsWith(prefix));

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.requests && parsed.connections && parsed.goals) {
          // Sanitize out any legacy mock data
          parsed.users = (parsed.users as UserProfile[]).filter(u => !isMockUser(u.id));
          parsed.requests = (parsed.requests as MentorshipRequest[]).filter(r => !isMockUser(r.requesterId) && !isMockUser(r.mentorId));
          parsed.connections = (parsed.connections as MentorshipConnection[]).filter(c => !isMockUser(c.studentId) && !isMockUser(c.mentorId));
          parsed.goals = (parsed.goals as Goal[]).filter(g => !isMockUser(g.userId));
          parsed.notifications = (parsed.notifications || []).filter((n: AppNotification) => !isMockUser(n.userId));
          parsed.messages = parsed.messages || [];
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
      messages: [],
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
    if (!this.data.connections) this.data.connections = [];
    if (!userId) return this.data.connections;
    return this.data.connections.filter(c => c.studentId === userId || c.mentorId === userId);
  }

  getConnectionById(id: string): MentorshipConnection | undefined {
    if (!this.data.connections) this.data.connections = [];
    if (!id) return undefined;
    const cleanId = String(id).trim();
    const rawId = cleanId.startsWith('conn_') ? cleanId.replace('conn_', '') : cleanId;
    const prefixedId = cleanId.startsWith('conn_') ? cleanId : `conn_${cleanId}`;

    return this.data.connections.find(c => {
      const cId = String(c.id || '');
      const cReqId = String(c.requestId || '');
      return (
        cId === cleanId ||
        cId === rawId ||
        cId === prefixedId ||
        cReqId === cleanId ||
        cReqId === rawId ||
        cReqId === prefixedId ||
        `conn_${cReqId}` === cleanId ||
        `conn_${cReqId}` === prefixedId ||
        cId.replace('conn_', '') === rawId
      );
    });
  }

  createConnection(conn: MentorshipConnection): MentorshipConnection {
    if (!this.data.connections) this.data.connections = [];
    const existingIdx = this.data.connections.findIndex(c => 
      c.id === conn.id || 
      (c.requestId && conn.requestId && c.requestId === conn.requestId) ||
      (c.studentId === conn.studentId && c.mentorId === conn.mentorId) ||
      (c.studentId === conn.mentorId && c.mentorId === conn.studentId)
    );
    if (existingIdx !== -1) {
      const existing = this.data.connections[existingIdx];
      const mergedMeetings = [...(conn.meetings || [])];
      // Merge in existing meetings by id if not in incoming
      (existing.meetings || []).forEach(em => {
        if (!mergedMeetings.some(m => m.id === em.id)) {
          mergedMeetings.push(em);
        }
      });

      this.data.connections[existingIdx] = { 
        ...existing, 
        ...conn,
        meetings: mergedMeetings,
        nextMeetingDate: conn.nextMeetingDate || existing.nextMeetingDate,
      };
      this.persist();
      return this.data.connections[existingIdx];
    }
    this.data.connections.unshift(conn);
    this.persist();
    return conn;
  }

  updateConnection(id: string, updates: Partial<MentorshipConnection>): MentorshipConnection | null {
    if (!this.data.connections) this.data.connections = [];
    const cleanId = String(id).trim();
    const rawId = cleanId.startsWith('conn_') ? cleanId.replace('conn_', '') : cleanId;
    const prefixedId = cleanId.startsWith('conn_') ? cleanId : `conn_${cleanId}`;

    let idx = this.data.connections.findIndex(c => {
      const cId = String(c.id || '');
      const cReqId = String(c.requestId || '');
      return (
        cId === cleanId ||
        cId === rawId ||
        cId === prefixedId ||
        cReqId === cleanId ||
        cReqId === rawId ||
        cReqId === prefixedId ||
        `conn_${cReqId}` === cleanId ||
        `conn_${cReqId}` === prefixedId ||
        cId.replace('conn_', '') === rawId
      );
    });

    if (idx === -1) {
      // Create new entry if not yet in storage
      const newConn: MentorshipConnection = {
        id: cleanId,
        requestId: updates.requestId || rawId,
        studentId: updates.studentId || '',
        studentName: updates.studentName || 'Learner',
        studentAvatar: updates.studentAvatar || '',
        studentTitle: updates.studentTitle || '',
        mentorId: updates.mentorId || '',
        mentorName: updates.mentorName || 'Mentor',
        mentorAvatar: updates.mentorAvatar || '',
        mentorTitle: updates.mentorTitle || '',
        focusAreas: updates.focusAreas || ['Career Growth'],
        status: updates.status || 'active',
        notes: updates.notes || [],
        meetings: updates.meetings || [],
        lastMeetingDate: updates.lastMeetingDate,
        nextMeetingDate: updates.nextMeetingDate,
        connectedAt: updates.connectedAt || new Date().toISOString(),
      };
      this.data.connections.unshift(newConn);
      this.persist();
      return newConn;
    }
    
    // Merge meetings safely preserving all scheduled & past meetings
    const existingMeetings = this.data.connections[idx].meetings || [];
    let mergedMeetings = existingMeetings;
    if (updates.meetings !== undefined) {
      const meetingMap = new Map<string, MentorshipMeeting>();
      existingMeetings.forEach(m => meetingMap.set(m.id, m));
      updates.meetings.forEach(m => meetingMap.set(m.id, m));
      mergedMeetings = Array.from(meetingMap.values());
    }

    this.data.connections[idx] = { 
      ...this.data.connections[idx], 
      ...updates,
      meetings: mergedMeetings,
      nextMeetingDate: updates.nextMeetingDate || this.data.connections[idx].nextMeetingDate,
    };
    this.persist();
    return this.data.connections[idx];
  }

  deleteConnection(id: string, callerId?: string, peerUserId?: string): boolean {
    if (!this.data.connections) this.data.connections = [];
    const cleanId = String(id || '').trim();
    const rawId = cleanId.replace('conn_', '').replace('net_', '');

    // 1. Locate connection to discover user IDs if not explicitly passed
    const matched = this.data.connections.find(c => {
      const cId = String(c.id || '');
      const cReqId = String(c.requestId || '');
      return (
        cId === cleanId || cId === rawId || cId === `conn_${cleanId}` || cId === `conn_${rawId}` ||
        cReqId === cleanId || cReqId === rawId || cReqId === `conn_${rawId}`
      );
    });

    const userA = callerId || matched?.studentId;
    const userB = peerUserId || matched?.mentorId;

    // 2. Filter out connection records
    this.data.connections = this.data.connections.filter(c => {
      const cId = String(c.id || '');
      const cReqId = String(c.requestId || '');
      const matchId = cId === cleanId || cId === rawId || cId === `conn_${cleanId}` || cId === `conn_${rawId}` ||
                      cReqId === cleanId || cReqId === rawId || cReqId === `conn_${rawId}`;
      const matchUsers = Boolean(userA && userB && (
        (c.studentId === userA && c.mentorId === userB) ||
        (c.studentId === userB && c.mentorId === userA)
      ));
      return !(matchId || matchUsers);
    });

    // 3. Filter out / update any associated mentorship requests
    if (this.data.requests) {
      this.data.requests = this.data.requests.filter(r => {
        const matchId = r.id === rawId || r.id === cleanId || r.id === `req_${rawId}`;
        const matchUsers = Boolean(userA && userB && (
          (r.requesterId === userA && r.mentorId === userB) ||
          (r.requesterId === userB && r.mentorId === userA)
        ));
        return !(matchId || matchUsers);
      });
    }

    // 4. Remove from network lists
    if (userA && userB) {
      const userAObj = this.data.users.find(u => u.id === userA);
      if (userAObj && userAObj.networkIds) {
        userAObj.networkIds = userAObj.networkIds.filter(nid => nid !== userB);
      }
      const userBObj = this.data.users.find(u => u.id === userB);
      if (userBObj && userBObj.networkIds) {
        userBObj.networkIds = userBObj.networkIds.filter(nid => nid !== userA);
      }
    }

    this.persist();
    return true;
  }

  blockUser(userId: string, targetUserId: string): boolean {
    if (!userId || !targetUserId) return false;

    // 1. Remove all connection records
    if (this.data.connections) {
      this.data.connections = this.data.connections.filter(c => 
        !((c.studentId === userId && c.mentorId === targetUserId) ||
          (c.studentId === targetUserId && c.mentorId === userId))
      );
    }

    // 2. Remove all request records
    if (this.data.requests) {
      this.data.requests = this.data.requests.filter(r => 
        !((r.requesterId === userId && r.mentorId === targetUserId) ||
          (r.requesterId === targetUserId && r.mentorId === userId))
      );
    }

    // 3. Update caller's blockedUserIds list and prune networkIds
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      if (user.networkIds) {
        user.networkIds = user.networkIds.filter(id => id !== targetUserId);
      }
      if (!user.blockedUserIds) {
        user.blockedUserIds = [];
      }
      if (!user.blockedUserIds.includes(targetUserId)) {
        user.blockedUserIds.push(targetUserId);
      }
    }

    // 4. Prune networkIds from target user
    const target = this.data.users.find(u => u.id === targetUserId);
    if (target && target.networkIds) {
      target.networkIds = target.networkIds.filter(id => id !== userId);
    }

    this.persist();
    return true;
  }

  unblockUser(userId: string, targetUserId: string): boolean {
    if (!userId || !targetUserId) return false;
    const user = this.data.users.find(u => u.id === userId);
    if (user && user.blockedUserIds) {
      user.blockedUserIds = user.blockedUserIds.filter(id => id !== targetUserId);
    }
    this.persist();
    return true;
  }

  getBlockedUsers(userId: string): UserProfile[] {
    const user = this.data.users.find(u => u.id === userId);
    if (!user || !user.blockedUserIds || user.blockedUserIds.length === 0) return [];
    return this.data.users.filter(u => user.blockedUserIds?.includes(u.id));
  }

  getMeetings(connectionId: string): MentorshipMeeting[] {
    const conn = this.getConnectionById(connectionId);
    return conn?.meetings || [];
  }

  addMeeting(connectionId: string, meeting: MentorshipMeeting): MentorshipMeeting {
    let conn = this.getConnectionById(connectionId);
    if (!conn) {
      const rawId = connectionId.replace('conn_', '');
      conn = this.updateConnection(connectionId, {
        id: connectionId,
        requestId: rawId,
        meetings: [meeting],
        nextMeetingDate: meeting.date,
      });
      return meeting;
    }

    if (!conn.meetings) conn.meetings = [];
    const existingIdx = conn.meetings.findIndex(m => m.id === meeting.id);
    if (existingIdx !== -1) {
      conn.meetings[existingIdx] = { ...conn.meetings[existingIdx], ...meeting, updatedAt: new Date().toISOString() };
    } else {
      conn.meetings.unshift(meeting);
    }
    if (meeting.status === 'scheduled') {
      conn.nextMeetingDate = meeting.date;
    }
    this.persist();
    return meeting;
  }

  updateMeeting(connectionId: string, meetingId: string, updates: Partial<MentorshipMeeting>): MentorshipMeeting | null {
    const conn = this.getConnectionById(connectionId);
    if (!conn) return null;
    if (!conn.meetings) conn.meetings = [];
    const idx = conn.meetings.findIndex(m => m.id === meetingId);
    if (idx === -1) {
      // If not found, add it as a new meeting record with updates
      const newM: MentorshipMeeting = {
        id: meetingId,
        connectionId,
        title: updates.title || '1:1 Sync Session',
        date: updates.date || new Date().toISOString().split('T')[0],
        time: updates.time || '10:00 AM PST',
        meetingUrl: updates.meetingUrl || 'https://meet.google.com/new',
        status: updates.status || 'scheduled',
        notes: updates.notes,
        sessionNotes: updates.sessionNotes || [],
        createdAt: updates.createdAt || new Date().toISOString(),
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      conn.meetings.unshift(newM);
      this.persist();
      return newM;
    }
    conn.meetings[idx] = { 
      ...conn.meetings[idx], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };

    // Recompute next meeting date from scheduled meetings
    const scheduled = conn.meetings.filter(m => m.status === 'scheduled');
    if (scheduled.length > 0) {
      scheduled.sort((a, b) => new Date(`${a.date} ${a.time || '10:00'}`).getTime() - new Date(`${b.date} ${b.time || '10:00'}`).getTime());
      conn.nextMeetingDate = scheduled[0].date;
    }

    this.persist();
    return conn.meetings[idx];
  }

  deleteMeeting(connectionId: string, meetingId: string): boolean {
    const conn = this.getConnectionById(connectionId);
    if (!conn || !conn.meetings) return false;
    conn.meetings = conn.meetings.filter(m => m.id !== meetingId);
    
    // Recompute next meeting date
    const scheduled = conn.meetings.filter(m => m.status === 'scheduled');
    if (scheduled.length > 0) {
      scheduled.sort((a, b) => new Date(`${a.date} ${a.time || '10:00'}`).getTime() - new Date(`${b.date} ${b.time || '10:00'}`).getTime());
      conn.nextMeetingDate = scheduled[0].date;
    } else {
      conn.nextMeetingDate = undefined;
    }

    this.persist();
    return true;
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

  deleteGoal(id: string, userId?: string): boolean {
    const idx = this.data.goals.findIndex(g => g.id === id || String(g.id) === String(id));
    if (idx === -1) {
      // Also try fuzzy search if id might be encoded
      const altIdx = this.data.goals.findIndex(g => g.id.includes(id) || id.includes(g.id));
      if (altIdx !== -1) {
        this.data.goals.splice(altIdx, 1);
        this.persist();
        return true;
      }
      return false;
    }
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

  markNotificationRead(id: string, userId?: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id && (!userId || n.userId === userId));
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

  deleteNotification(id: string, userId?: string): boolean {
    if (!this.data.notifications) return false;
    const initialLen = this.data.notifications.length;
    this.data.notifications = this.data.notifications.filter(n => !(n.id === id && (!userId || n.userId === userId)));
    if (this.data.notifications.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  clearAllNotifications(userId: string): boolean {
    if (!this.data.notifications) return false;
    this.data.notifications = this.data.notifications.filter(n => n.userId !== userId);
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

  // Messages
  getMessages(connectionId: string): ChatMessage[] {
    if (!this.data.messages) this.data.messages = [];
    return this.data.messages
      .filter(m => m.connectionId === connectionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  createMessage(msg: Partial<ChatMessage>): ChatMessage {
    if (!this.data.messages) this.data.messages = [];
    const newMsg: ChatMessage = {
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      connectionId: msg.connectionId || '',
      senderId: msg.senderId || '',
      senderName: msg.senderName || '',
      senderAvatar: msg.senderAvatar,
      content: msg.content || '',
      messageType: msg.messageType || 'text',
      voiceUrl: msg.voiceUrl,
      replyToId: msg.replyToId,
      replyToContent: msg.replyToContent,
      replyToSenderName: msg.replyToSenderName,
      createdAt: msg.createdAt || new Date().toISOString(),
    };
    this.data.messages.push(newMsg);
    this.persist();
    return newMsg;
  }

  deleteMessage(id: string): boolean {
    if (!this.data.messages) return false;
    const initialLen = this.data.messages.length;
    this.data.messages = this.data.messages.filter(m => m.id !== id);
    if (this.data.messages.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  deleteMessagesForConnection(connectionId: string): boolean {
    if (!this.data.messages) return false;
    const cleanId = String(connectionId).trim();
    const rawId = cleanId.startsWith('conn_') ? cleanId.replace('conn_', '') : cleanId;
    const initialLen = this.data.messages.length;
    this.data.messages = this.data.messages.filter(m => 
      m.connectionId !== cleanId && 
      m.connectionId !== rawId && 
      m.connectionId !== `conn_${cleanId}` &&
      m.connectionId !== `conn_${rawId}`
    );
    if (this.data.messages.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }
}

export const db = new StorageEngine();
