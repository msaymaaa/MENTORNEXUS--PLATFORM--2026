import { UserProfile, MentorshipConnection, MentorshipRequest, Goal, ExperienceResource, AppNotification, ChatMessage, MentorshipMeeting } from '../types';
import { SEED_PROFILES, SEED_RESOURCES, SEED_GOALS } from './seedData';

const STORAGE_KEYS = {
  ACTIVE_USER_ID: 'mentornexus_active_user_id',
  USERS: 'mentornexus_local_users',
  REQUESTS: 'mentornexus_local_requests',
  CONNECTIONS: 'mentornexus_local_connections',
  GOALS: 'mentornexus_local_goals',
  RESOURCES: 'mentornexus_local_resources',
  NOTIFICATIONS: 'mentornexus_local_notifications',
  MESSAGES_PREFIX: 'mentornexus_local_msgs_',
  MEETINGS_PREFIX: 'mentornexus_local_meetings_',
  BLOCKED_PREFIX: 'mentornexus_blocked_users_',
};

function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function safeSetItem(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[LocalStore] Could not persist key:', key, err);
  }
}

export const localStore = {
  getActiveUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
  },

  setActiveUserId(id: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
  },

  clearActiveUserId(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
  },

  getActiveUser(): UserProfile | null {
    const id = this.getActiveUserId();
    if (id) {
      const u = this.getUserById(id);
      if (u) return u;
    }
    const users = this.getUsers();
    return users.find(u => u.id === 'user_sarah_mentee') || users[0] || null;
  },

  getUsers(): UserProfile[] {
    const users = safeGetItem<UserProfile[]>(STORAGE_KEYS.USERS, []);
    if (!users || users.length === 0) {
      // Seed default profiles
      safeSetItem(STORAGE_KEYS.USERS, SEED_PROFILES);
      return SEED_PROFILES;
    }
    // Make sure seed profiles exist in case users list only has one user
    const existingIds = new Set(users.map(u => u.id));
    let hasAdditions = false;
    for (const seed of SEED_PROFILES) {
      if (!existingIds.has(seed.id)) {
        users.push(seed);
        hasAdditions = true;
      }
    }
    if (hasAdditions) {
      safeSetItem(STORAGE_KEYS.USERS, users);
    }
    return users;
  },

  getUserById(id: string): UserProfile | null {
    const all = this.getUsers();
    return all.find(u => u.id === id) || null;
  },

  upsertUser(user: Partial<UserProfile> & { id: string }): UserProfile {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    let updated: UserProfile;
    if (idx >= 0) {
      updated = { ...users[idx], ...user };
      users[idx] = updated;
    } else {
      const defaultRole = user.role || 'student';
      updated = {
        id: user.id,
        name: user.name || 'Member',
        email: user.email || '',
        role: defaultRole,
        avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        title: user.title || (defaultRole === 'mentor' ? 'Mentor' : 'Member'),
        organization: user.organization || '',
        bio: user.bio || '',
        industry: user.industry || 'Technology',
        location: user.location || 'Remote',
        yearsOfExperience: user.yearsOfExperience || 0,
        skills: user.skills || [],
        interests: user.interests || [],
        mentoringAreas: user.mentoringAreas || [],
        education: user.education || '',
        availability: user.availability || '2 hrs/week',
        verificationStatus: user.verificationStatus || 'verified',
        createdAt: user.createdAt || new Date().toISOString(),
        isBanned: user.isBanned || false,
        ...user,
      } as UserProfile;
      users.unshift(updated);
    }
    safeSetItem(STORAGE_KEYS.USERS, users);
    return updated;
  },

  getRequests(userId?: string): MentorshipRequest[] {
    const all = safeGetItem<MentorshipRequest[]>(STORAGE_KEYS.REQUESTS, []);
    if (!userId) return all;
    return all.filter(r => r.requesterId === userId || r.mentorId === userId);
  },

  saveRequest(req: MentorshipRequest): void {
    const all = safeGetItem<MentorshipRequest[]>(STORAGE_KEYS.REQUESTS, []);
    const idx = all.findIndex(r => r.id === req.id);
    if (idx >= 0) {
      all[idx] = req;
    } else {
      all.unshift(req);
    }
    safeSetItem(STORAGE_KEYS.REQUESTS, all);
  },

  deleteRequest(id: string): void {
    const all = safeGetItem<MentorshipRequest[]>(STORAGE_KEYS.REQUESTS, []);
    const filtered = all.filter(r => r.id !== id);
    safeSetItem(STORAGE_KEYS.REQUESTS, filtered);
  },

  getConnections(userId?: string): MentorshipConnection[] {
    const all = safeGetItem<MentorshipConnection[]>(STORAGE_KEYS.CONNECTIONS, []);
    if (!userId) return all;
    return all.filter(c => c.studentId === userId || c.mentorId === userId);
  },

  saveConnection(conn: MentorshipConnection): void {
    const all = safeGetItem<MentorshipConnection[]>(STORAGE_KEYS.CONNECTIONS, []);
    const idx = all.findIndex(c => c.id === conn.id);
    if (idx >= 0) {
      all[idx] = conn;
    } else {
      all.unshift(conn);
    }
    safeSetItem(STORAGE_KEYS.CONNECTIONS, all);
  },

  deleteConnection(id: string): void {
    const all = safeGetItem<MentorshipConnection[]>(STORAGE_KEYS.CONNECTIONS, []);
    safeSetItem(STORAGE_KEYS.CONNECTIONS, all.filter(c => c.id !== id));
  },

  getMeetings(connectionId: string): MentorshipMeeting[] {
    return safeGetItem<MentorshipMeeting[]>(`${STORAGE_KEYS.MEETINGS_PREFIX}${connectionId}`, []);
  },

  saveMeetings(connectionId: string, meetings: MentorshipMeeting[]): void {
    safeSetItem(`${STORAGE_KEYS.MEETINGS_PREFIX}${connectionId}`, meetings);
  },

  getMessages(connectionId: string): ChatMessage[] {
    return safeGetItem<ChatMessage[]>(`${STORAGE_KEYS.MESSAGES_PREFIX}${connectionId}`, []);
  },

  saveMessage(connectionId: string, msg: ChatMessage): void {
    const msgs = this.getMessages(connectionId);
    if (!msgs.some(m => m.id === msg.id)) {
      msgs.push(msg);
      safeSetItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${connectionId}`, msgs);
    }
  },

  deleteMessage(connectionId: string, messageId: string): void {
    const msgs = this.getMessages(connectionId);
    safeSetItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${connectionId}`, msgs.filter(m => m.id !== messageId));
  },

  clearMessages(connectionId: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${connectionId}`);
  },

  getBlockedUsers(userId: string): string[] {
    return safeGetItem<string[]>(`${STORAGE_KEYS.BLOCKED_PREFIX}${userId}`, []);
  },

  blockUser(userId: string, targetUserId: string): void {
    const blocked = this.getBlockedUsers(userId);
    if (!blocked.includes(targetUserId)) {
      blocked.push(targetUserId);
      safeSetItem(`${STORAGE_KEYS.BLOCKED_PREFIX}${userId}`, blocked);
    }
  },

  unblockUser(userId: string, targetUserId: string): void {
    const blocked = this.getBlockedUsers(userId);
    safeSetItem(`${STORAGE_KEYS.BLOCKED_PREFIX}${userId}`, blocked.filter(id => id !== targetUserId));
  },

  getGoals(userId: string): Goal[] {
    const all = safeGetItem<Goal[]>(STORAGE_KEYS.GOALS, []);
    const userGoals = all.filter(g => g.userId === userId);
    if (userGoals.length === 0 && (userId === 'user_sarah_mentee' || userId.includes('sarah'))) {
      const seeded = SEED_GOALS.map(g => ({ ...g, userId }));
      all.push(...seeded);
      safeSetItem(STORAGE_KEYS.GOALS, all);
      return seeded;
    }
    return userGoals;
  },

  saveGoal(goal: Goal): void {
    const all = safeGetItem<Goal[]>(STORAGE_KEYS.GOALS, []);
    const idx = all.findIndex(g => g.id === goal.id);
    if (idx >= 0) {
      all[idx] = goal;
    } else {
      all.unshift(goal);
    }
    safeSetItem(STORAGE_KEYS.GOALS, all);
  },

  deleteGoal(id: string): void {
    const all = safeGetItem<Goal[]>(STORAGE_KEYS.GOALS, []);
    safeSetItem(STORAGE_KEYS.GOALS, all.filter(g => g.id !== id));
  },

  getResources(): ExperienceResource[] {
    const resources = safeGetItem<ExperienceResource[]>(STORAGE_KEYS.RESOURCES, []);
    if (!resources || resources.length === 0) {
      safeSetItem(STORAGE_KEYS.RESOURCES, SEED_RESOURCES);
      return SEED_RESOURCES;
    }
    return resources;
  },

  saveResource(resource: ExperienceResource): void {
    const all = this.getResources();
    const idx = all.findIndex(r => r.id === resource.id);
    if (idx >= 0) {
      all[idx] = resource;
    } else {
      all.unshift(resource);
    }
    safeSetItem(STORAGE_KEYS.RESOURCES, all);
  },

  deleteResource(id: string): void {
    const all = this.getResources();
    safeSetItem(STORAGE_KEYS.RESOURCES, all.filter(r => r.id !== id));
  },

  getNotifications(userId: string): AppNotification[] {
    const all = safeGetItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return all.filter(n => n.userId === userId);
  },

  saveNotification(notification: AppNotification): void {
    const all = safeGetItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const idx = all.findIndex(n => n.id === notification.id);
    if (idx >= 0) {
      all[idx] = notification;
    } else {
      all.unshift(notification);
    }
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS, all);
  },

  markNotificationRead(id: string): void {
    const all = safeGetItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const notif = all.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      safeSetItem(STORAGE_KEYS.NOTIFICATIONS, all);
    }
  },

  markAllNotificationsRead(userId: string): void {
    const all = safeGetItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    all.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS, all);
  },

  deleteNotification(id: string): void {
    const all = safeGetItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS, all.filter(n => n.id !== id));
  },

  clearAllNotifications(userId: string): void {
    const all = safeGetItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS, all.filter(n => n.userId !== userId));
  },
};
