import { 
  UserProfile, 
  MentorshipRequest, 
  MentorshipConnection, 
  Goal, 
  ExperienceResource, 
  AppNotification, 
  AdminStats, 
  AIMatchResult,
  UserRole 
} from '../types/index';

const API_BASE = '/api';

export const api = {
  // Auth & Users
  async getCurrentUser(): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/current-user`);
    if (!res.ok) throw new Error('Failed to fetch current user');
    return res.json();
  },

  async switchUser(userId: string): Promise<{ success: boolean; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/switch-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to switch user');
    return res.json();
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async registerUser(userData: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register');
    }
    return res.json();
  },

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // Mentors
  async getMentors(params?: { search?: string; industry?: string; skill?: string; minExp?: number; verifiedOnly?: boolean }): Promise<UserProfile[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.industry && params.industry !== 'All') query.set('industry', params.industry);
    if (params?.skill) query.set('skill', params.skill);
    if (params?.minExp) query.set('minExp', params.minExp.toString());
    if (params?.verifiedOnly) query.set('verifiedOnly', 'true');

    const res = await fetch(`${API_BASE}/mentors?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch mentors');
    return res.json();
  },

  // Requests
  async getRequests(userId?: string): Promise<MentorshipRequest[]> {
    const url = userId ? `${API_BASE}/requests?userId=${encodeURIComponent(userId)}` : `${API_BASE}/requests`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  async createRequest(payload: { mentorId: string; message: string; goalsSummary?: string }): Promise<MentorshipRequest> {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send mentorship request');
    }
    return res.json();
  },

  async respondToRequest(id: string, status: 'accepted' | 'declined', responseNote?: string): Promise<MentorshipRequest> {
    const res = await fetch(`${API_BASE}/requests/${id}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, responseNote }),
    });
    if (!res.ok) throw new Error('Failed to respond to request');
    return res.json();
  },

  async cancelRequest(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/requests/${id}/cancel`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to cancel request');
    return res.json();
  },

  async deleteRequest(id: string): Promise<{ success: boolean }> {
    return this.cancelRequest(id);
  },

  async requestVerification(userId: string, notes?: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/profiles/${userId}/request-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) {
      // Fallback
      await this.updateProfile(userId, { verificationStatus: 'pending' });
      return { success: true };
    }
    return res.json();
  },

  // Connections
  async getConnections(userId?: string): Promise<MentorshipConnection[]> {
    const url = userId ? `${API_BASE}/connections?userId=${encodeURIComponent(userId)}` : `${API_BASE}/connections`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch connections');
    return res.json();
  },

  async updateConnection(id: string, updates: Partial<MentorshipConnection>): Promise<MentorshipConnection> {
    const res = await fetch(`${API_BASE}/connections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update connection');
    return res.json();
  },

  // Goals
  async getGoals(userId?: string): Promise<Goal[]> {
    const url = userId ? `${API_BASE}/goals?userId=${encodeURIComponent(userId)}` : `${API_BASE}/goals`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
  },

  async createGoal(goal: Partial<Goal>): Promise<Goal> {
    const res = await fetch(`${API_BASE}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Failed to create goal');
    return res.json();
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    const res = await fetch(`${API_BASE}/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update goal');
    return res.json();
  },

  async deleteGoal(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/goals/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete goal');
    return res.json();
  },

  // Experience Library
  async getResources(params?: { category?: string; search?: string; featured?: boolean }): Promise<ExperienceResource[]> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.featured) query.set('featured', 'true');

    const res = await fetch(`${API_BASE}/resources?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  async createResource(resource: Partial<ExperienceResource>): Promise<ExperienceResource> {
    const res = await fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource),
    });
    if (!res.ok) throw new Error('Failed to create resource');
    return res.json();
  },

  async updateResource(id: string, updates: Partial<ExperienceResource>): Promise<ExperienceResource> {
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update resource');
    return res.json();
  },

  async deleteResource(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete resource');
    return res.json();
  },

  // Notifications
  async getNotifications(userId?: string): Promise<AppNotification[]> {
    const url = userId ? `${API_BASE}/notifications?userId=${encodeURIComponent(userId)}` : `${API_BASE}/notifications`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to mark notification read');
    return res.json();
  },

  async markAllNotificationsRead(userId?: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to mark all notifications read');
    return res.json();
  },

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    return res.json();
  },

  async verifyUser(userId: string, status: 'verified' | 'rejected', notes?: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/admin/verify/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error('Failed to update user verification');
    return res.json();
  },

  async toggleUserBan(userId: string, banned: boolean): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/admin/toggle-ban/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banned }),
    });
    if (!res.ok) throw new Error('Failed to toggle ban');
    return res.json();
  },

  // AI
  async getAIMatches(): Promise<AIMatchResult[]> {
    const res = await fetch(`${API_BASE}/ai/match-mentors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to get AI mentor matches');
    return res.json();
  },

  async breakdownGoalAI(payload: { title: string; description?: string; category?: string; targetDate?: string }): Promise<{
    milestones: { title: string; dueDate?: string }[];
    recommendations: string[];
  }> {
    const res = await fetch(`${API_BASE}/ai/breakdown-goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate goal breakdown');
    return res.json();
  },

  async generateGoalMilestonesAI(params: string | { title: string; category?: string; description?: string }, category?: string): Promise<{
    milestones: { title: string; dueDate?: string }[];
    recommendations: string[];
  }> {
    if (typeof params === 'string') {
      return this.breakdownGoalAI({ title: params, category });
    }
    return this.breakdownGoalAI(params);
  },

  async polishRequestAI(payload: { mentorId: string; draftMessage?: string; goalsSummary?: string }): Promise<{
    polishedMessage: string;
    highlights: string[];
  }> {
    const res = await fetch(`${API_BASE}/ai/polish-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to polish request message');
    return res.json();
  },

  async getCareerAdviceAI(question: string): Promise<{ answer: string }> {
    const res = await fetch(`${API_BASE}/ai/career-advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error('Failed to get career advice');
    return res.json();
  },
};
