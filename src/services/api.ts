import { 
  UserProfile, 
  MentorshipRequest, 
  MentorshipConnection, 
  Goal, 
  ExperienceResource, 
  AppNotification, 
  AdminStats, 
  AIMatchResult,
  ChatMessage,
  UserRole,
  MentorshipMeeting 
} from '../types/index';
import { supabaseDb, getCachedMeetings, setCachedMeetings } from './supabaseDb';
import { isSupabaseConfigured, getSupabaseClient } from './supabase';
import { 
  generateMentorMatchesClient, 
  generateGoalBreakdownClient, 
  polishMentorshipRequestClient, 
  getCareerAdvisorResponseClient 
} from './clientGemini';

const API_BASE = '/api';

export const api = {
  // Authentication token resolution from Supabase session
  async getAuthToken(): Promise<string | null> {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data: { session } } = await client.auth.getSession();
          return session?.access_token || null;
        } catch (e) {
          console.warn('Could not retrieve Supabase session access token:', e);
          return null;
        }
      }
    }
    return null;
  },

  // Auth & Users
  async getCurrentUser(): Promise<UserProfile | null> {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          let profile = await supabaseDb.getProfileById(session.user.id, session.user.email);
          if (profile) return profile;

          if (session.user.email) {
            const fallbackProfile: UserProfile = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email.split('@')[0] || 'MentorNexus Member',
              role: (session.user.user_metadata?.role as UserRole) || 'student',
              title: (session.user.user_metadata?.role === 'mentor') ? 'Industry Mentor' : 'Aspiring Professional',
              organization: 'Independent',
              industry: 'Technology & AI',
              skills: ['Career Growth', 'Strategy'],
              interests: ['Professional Development'],
              mentoringAreas: session.user.user_metadata?.role === 'mentor' ? ['Career Navigation', 'Technical Depth'] : ['Career Guidance'],
              bio: '',
              location: 'Remote',
              avatar: session.user.user_metadata?.role === 'mentor' 
                ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
              yearsOfExperience: session.user.user_metadata?.role === 'mentor' ? 5 : 1,
              verificationStatus: session.user.user_metadata?.role === 'mentor' ? 'pending' : 'verified',
              rating: 4.9,
              reviewCount: 12,
              createdAt: session.user.created_at || new Date().toISOString(),
            };
            return fallbackProfile;
          }
        }
      }
      return null;
    }
    const res = await fetch(`${API_BASE}/auth/current-user`).catch(() => null);
    if (!res || !res.ok) return null;
    const data = await res.json();
    return data?.id ? data : null;
  },

  async switchUser(userId: string): Promise<{ success: boolean; user: UserProfile }> {
    if (isSupabaseConfigured && userId !== 'anonymous') {
      const profile = await supabaseDb.getProfileById(userId);
      if (profile) {
        await fetch(`${API_BASE}/auth/switch-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }).catch(() => {});
        return { success: true, user: profile };
      }
    }

    const res = await fetch(`${API_BASE}/auth/switch-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to switch user');
    return res.json();
  },

  async getAllUsers(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      return await supabaseDb.getProfiles();
    }
    const res = await fetch(`${API_BASE}/auth/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async registerUser(userData: Partial<UserProfile>): Promise<UserProfile> {
    // 1. Try persisting directly to Supabase profiles
    if (isSupabaseConfigured) {
      const supaUser = await supabaseDb.upsertProfile(userData);
      if (supaUser) {
        // Also notify server backend for consistency
        await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(supaUser),
        }).catch(() => {});
        return supaUser;
      }
    }

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register');
    }
    const createdUser = await res.json();

    if (isSupabaseConfigured) {
      await supabaseDb.upsertProfile(createdUser).catch(console.warn);
    }
    return createdUser;
  },

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    let resultUser: UserProfile | null = null;

    if (isSupabaseConfigured) {
      resultUser = await supabaseDb.upsertProfile({ ...updates, id });
    }

    const res = await fetch(`${API_BASE}/profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => null);

    if (res && res.ok) {
      const serverUser = await res.json();
      return resultUser || serverUser;
    }

    if (resultUser) return resultUser;
    throw new Error('Failed to update profile');
  },

  // Mentors (from Supabase public.profiles where role = 'mentor' or is_mentor = true)
  async getMentors(params?: { search?: string; industry?: string; skill?: string; minExp?: number; verifiedOnly?: boolean }): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      let filtered = await supabaseDb.getMentors();

      if (params?.verifiedOnly) {
        filtered = filtered.filter(m => m.verificationStatus === 'verified');
      }
      if (params?.industry && params.industry !== 'All') {
        filtered = filtered.filter(m => m.industry.toLowerCase().includes(params.industry!.toLowerCase()));
      }
      if (params?.skill) {
        filtered = filtered.filter(m => m.skills.some(s => s.toLowerCase().includes(params.skill!.toLowerCase())));
      }
      if (params?.minExp) {
        filtered = filtered.filter(m => m.yearsOfExperience >= params.minExp!);
      }
      if (params?.search && params.search.trim()) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(m => 
          m.name.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q) ||
          m.organization.toLowerCase().includes(q) ||
          m.bio.toLowerCase().includes(q) ||
          m.skills.some(s => s.toLowerCase().includes(q)) ||
          m.mentoringAreas.some(a => a.toLowerCase().includes(q)) ||
          m.location.toLowerCase().includes(q)
        );
      }
      return filtered;
    }

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

  async getUserById(id: string): Promise<UserProfile | null> {
    if (!id) return null;
    if (isSupabaseConfigured) {
      const profile = await supabaseDb.getProfileById(id);
      if (profile) return profile;
    }
    const res = await fetch(`${API_BASE}/profiles/${id}`).catch(() => null);
    if (!res || !res.ok) return null;
    return res.json();
  },

  // Role-filtered discovery (Mentors, Learners, Early-Career, or All)
  async getProfilesByRole(role?: string, params?: { search?: string; industry?: string; skill?: string; minExp?: number }): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      let list = await supabaseDb.getProfilesByRole(role);

      if (params?.industry && params.industry !== 'All') {
        list = list.filter(m => m.industry.toLowerCase().includes(params.industry!.toLowerCase()));
      }
      if (params?.skill) {
        list = list.filter(m => m.skills.some(s => s.toLowerCase().includes(params.skill!.toLowerCase())));
      }
      if (params?.minExp) {
        list = list.filter(m => m.yearsOfExperience >= params.minExp!);
      }
      if (params?.search && params.search.trim()) {
        const q = params.search.toLowerCase();
        list = list.filter(m => 
          m.name.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q) ||
          m.organization.toLowerCase().includes(q) ||
          m.bio.toLowerCase().includes(q) ||
          m.skills.some(s => s.toLowerCase().includes(q)) ||
          m.mentoringAreas.some(a => a.toLowerCase().includes(q)) ||
          m.location.toLowerCase().includes(q)
        );
      }
      return list;
    }

    if (role === 'mentor' || role === 'mentors') {
      return this.getMentors(params);
    }
    const allUsers = await this.getAllUsers();
    if (!role || role === 'all') return allUsers;
    if (role === 'learner' || role === 'learners' || role === 'student' || role === 'students') {
      return allUsers.filter(u => u.role === 'student' || u.role === 'learner');
    }
    if (role === 'early_career' || role === 'early-career') {
      return allUsers.filter(u => u.role === 'early_career');
    }
    return allUsers.filter(u => u.role === role);
  },

  // Requests (from Supabase public.mentorship_requests)
  async getRequests(userId?: string): Promise<MentorshipRequest[]> {
    if (isSupabaseConfigured) {
      if (!userId) return [];
      return await supabaseDb.getRequests(userId);
    }

    const url = userId ? `${API_BASE}/requests?userId=${encodeURIComponent(userId)}` : `${API_BASE}/requests`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  async createRequest(payload: { 
    mentorId: string; 
    message: string; 
    goalsSummary?: string; 
    requesterId?: string;
    requesterName?: string;
    requesterTitle?: string;
    requesterAvatar?: string;
    requesterRole?: UserRole;
    mentorName?: string;
    mentorTitle?: string;
    mentorAvatar?: string;
  }): Promise<MentorshipRequest> {
    // 1. If Supabase is configured on client, try direct PostgREST insert
    if (isSupabaseConfigured) {
      try {
        const supaReq = await supabaseDb.createRequest(payload);
        if (supaReq) {
          // Sync notification on server
          const token = await api.getAuthToken();
          await fetch(`${API_BASE}/requests`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              ...(payload.requesterId ? { 'x-user-id': payload.requesterId } : {}),
            },
            body: JSON.stringify(payload),
          }).catch(() => {});
          return supaReq;
        }
      } catch (clientErr: any) {
        console.warn('Client Supabase createRequest notice (falling back to authoritative backend):', clientErr.message);
      }
    }

    // 2. Authoritative backend endpoint
    const token = await api.getAuthToken();
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(payload.requesterId ? { 'x-user-id': payload.requesterId } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send mentorship request');
    }
    return res.json();
  },

  async respondToRequest(id: string, status: 'accepted' | 'declined', responseNote?: string): Promise<MentorshipRequest> {
    if (isSupabaseConfigured) {
      try {
        const supaReq = await supabaseDb.respondToRequest(id, status, responseNote);
        if (supaReq) {
          await fetch(`${API_BASE}/requests/${id}/respond`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, responseNote }),
          }).catch(() => {});
          return supaReq;
        }
      } catch (clientErr: any) {
        console.warn('Client Supabase respondToRequest notice (falling back to authoritative backend):', clientErr.message);
      }
    }

    const token = await api.getAuthToken();
    const res = await fetch(`${API_BASE}/requests/${id}/respond`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status, responseNote }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to respond to request');
    }
    return res.json();
  },

  async cancelRequest(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseDb.cancelRequest(id);
      } catch {
        // Fallback to server endpoint
      }
    }
    const token = await api.getAuthToken();
    const res = await fetch(`${API_BASE}/requests/${id}/cancel`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      }
    });
    if (!res.ok) throw new Error('Failed to cancel request');
    return res.json();
  },

  async deleteRequest(id: string): Promise<{ success: boolean }> {
    return api.cancelRequest(id);
  },

  async requestVerification(userId: string, notes?: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      await supabaseDb.upsertProfile({ id: userId, verificationStatus: 'pending' });
    }
    const res = await fetch(`${API_BASE}/profiles/${userId}/request-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    }).catch(() => null);

    return { success: true };
  },

  // Networking & Professional Connections
  async getNetwork(userId: string): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      return await supabaseDb.getNetwork(userId);
    }
    const res = await fetch(`${API_BASE}/network/${encodeURIComponent(userId)}`).catch(() => null);
    if (!res || !res.ok) return [];
    return res.json();
  },

  async getNetworkingStatus(userId: string, targetUserId: string): Promise<'none' | 'pending' | 'connected'> {
    if (isSupabaseConfigured) {
      return await supabaseDb.getNetworkingStatus(userId, targetUserId);
    }
    const res = await fetch(`${API_BASE}/networking/status?userId=${encodeURIComponent(userId)}&targetUserId=${encodeURIComponent(targetUserId)}`).catch(() => null);
    if (!res || !res.ok) return 'none';
    const data = await res.json();
    return data.status || 'none';
  },

  async sendNetworkingRequest(data: { requesterId: string; recipientId: string; note?: string }): Promise<any> {
    if (isSupabaseConfigured) {
      const supaReq = await supabaseDb.sendNetworkingRequest(data);
      if (supaReq) {
        await fetch(`${API_BASE}/networking/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).catch(() => {});
        return supaReq;
      }
    }
    const res = await fetch(`${API_BASE}/networking/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to send networking request');
    return res.json();
  },

  async respondToNetworkingRequest(requestId: string, status: 'accepted' | 'declined'): Promise<any> {
    if (isSupabaseConfigured) {
      return await supabaseDb.respondToRequest(requestId, status);
    }
    const res = await fetch(`${API_BASE}/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to respond to networking request');
    return res.json();
  },

  // Connections (from Supabase public.connections)
  async getConnections(userId?: string): Promise<MentorshipConnection[]> {
    if (isSupabaseConfigured) {
      if (!userId) return [];
      return await supabaseDb.getConnections(userId);
    }

    const url = userId ? `${API_BASE}/connections?userId=${encodeURIComponent(userId)}` : `${API_BASE}/connections`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch connections');
    return res.json();
  },

  async updateConnection(id: string, updates: Partial<MentorshipConnection>): Promise<MentorshipConnection> {
    let resultConn: MentorshipConnection | null = null;
    if (isSupabaseConfigured) {
      const supaConn = await supabaseDb.updateConnection(id, updates);
      if (supaConn) {
        resultConn = supaConn;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/connections/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const serverConn = await res.json();
        if (!resultConn) {
          resultConn = serverConn;
        } else if (serverConn.meetings && serverConn.meetings.length > 0) {
          resultConn.meetings = serverConn.meetings;
        }
      }
    } catch {}

    if (resultConn) {
      if (updates.meetings !== undefined) {
        resultConn.meetings = updates.meetings;
      }
      return resultConn;
    }

    throw new Error('Failed to update connection');
  },

  async deleteConnection(id: string, peerUserId?: string, currentUserId?: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseDb.deleteConnection(id, peerUserId, currentUserId);
      } catch {}
    }
    const token = await api.getAuthToken();
    const queryParams = new URLSearchParams();
    if (peerUserId) queryParams.set('peerUserId', peerUserId);
    if (currentUserId) queryParams.set('currentUserId', currentUserId);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const res = await fetch(`${API_BASE}/connections/${encodeURIComponent(id)}${qs}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }).catch(() => null);
    if (res && !res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to remove connection');
    }
    return { success: true };
  },

  async blockUser(targetUserId: string, userId?: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured && userId) {
      try {
        await supabaseDb.blockUser(userId, targetUserId);
      } catch {}
    }
    const token = await api.getAuthToken();
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(targetUserId)}/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ userId }),
    }).catch(() => null);
    if (res && !res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to block user');
    }
    return { success: true };
  },

  async unblockUser(targetUserId: string, userId?: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured && userId) {
      try {
        await supabaseDb.unblockUser(userId, targetUserId);
      } catch {}
    }
    const token = await api.getAuthToken();
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(targetUserId)}/unblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ userId }),
    }).catch(() => null);
    if (res && !res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to unblock user');
    }
    return { success: true };
  },

  async getBlockedUsers(userId: string): Promise<UserProfile[]> {
    if (!userId) return [];
    if (isSupabaseConfigured) {
      try {
        return await supabaseDb.getBlockedUsers(userId);
      } catch {}
    }
    const token = await api.getAuthToken();
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/blocked`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }).catch(() => null);
    if (!res || !res.ok) return [];
    return res.json();
  },

  async deleteMessagesForConnection(connectionId: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseDb.deleteMessagesForConnection(connectionId);
      } catch {}
    }
    const token = await api.getAuthToken();
    const res = await fetch(`${API_BASE}/connections/${encodeURIComponent(connectionId)}/chat`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }).catch(() => null);
    if (res && !res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to clear chat history');
    }
    return { success: true };
  },

  // Dedicated Meetings API (Persistent Sessions & Past History)
  async getMeetings(connectionId: string): Promise<MentorshipMeeting[]> {
    try {
      const res = await fetch(`${API_BASE}/connections/${encodeURIComponent(connectionId)}/meetings`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return getCachedMeetings(connectionId);
  },

  async scheduleMeeting(connectionId: string, meeting: Partial<MentorshipMeeting>): Promise<MentorshipMeeting> {
    const newMeeting: MentorshipMeeting = {
      id: meeting.id || `mtg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      connectionId,
      title: meeting.title || '1:1 Mentorship Session',
      date: meeting.date || new Date().toISOString().split('T')[0],
      time: meeting.time || '10:00 AM PST',
      meetingUrl: meeting.meetingUrl || 'https://meet.google.com/new',
      notes: meeting.notes,
      sessionNotes: meeting.sessionNotes || [],
      status: meeting.status || 'scheduled',
      createdBy: meeting.createdBy,
      createdAt: meeting.createdAt || new Date().toISOString(),
    };

    // Save to local cache
    const existing = getCachedMeetings(connectionId);
    const updatedList = [newMeeting, ...existing.filter(m => m.id !== newMeeting.id)];
    setCachedMeetings(connectionId, updatedList);

    // Call server endpoint
    try {
      await fetch(`${API_BASE}/connections/${encodeURIComponent(connectionId)}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeeting),
      });
    } catch {}

    // Update connection's meetings array
    await this.updateConnection(connectionId, {
      meetings: updatedList,
      nextMeetingDate: newMeeting.date,
    }).catch(() => {});

    return newMeeting;
  },

  async updateMeeting(connectionId: string, meetingId: string, updates: Partial<MentorshipMeeting>): Promise<MentorshipMeeting | null> {
    const existing = getCachedMeetings(connectionId);
    const idx = existing.findIndex(m => m.id === meetingId);
    let updatedMtg: MentorshipMeeting | null = null;

    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates, updatedAt: new Date().toISOString() };
      updatedMtg = existing[idx];
      setCachedMeetings(connectionId, existing);
    }

    try {
      const res = await fetch(`${API_BASE}/connections/${encodeURIComponent(connectionId)}/meetings/${encodeURIComponent(meetingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        updatedMtg = data;
      }
    } catch {}

    // Sync updated list to connection
    if (existing.length > 0) {
      await this.updateConnection(connectionId, {
        meetings: existing,
      }).catch(() => {});
    }

    return updatedMtg;
  },

  async deleteMeeting(connectionId: string, meetingId: string): Promise<boolean> {
    const existing = getCachedMeetings(connectionId);
    const filtered = existing.filter(m => m.id !== meetingId);
    setCachedMeetings(connectionId, filtered);

    try {
      await fetch(`${API_BASE}/connections/${encodeURIComponent(connectionId)}/meetings/${encodeURIComponent(meetingId)}`, {
        method: 'DELETE',
      });
    } catch {}

    await this.updateConnection(connectionId, {
      meetings: filtered,
    }).catch(() => {});

    return true;
  },

  // 1:1 Messages (from Supabase public.messages)
  async getMessages(connectionId: string): Promise<ChatMessage[]> {
    if (isSupabaseConfigured) {
      return await supabaseDb.getMessages(connectionId);
    }
    const res = await fetch(`${API_BASE}/messages?connectionId=${encodeURIComponent(connectionId)}`);
    if (!res.ok) return [];
    return res.json();
  },

  async sendMessage(msg: { 
    connectionId: string; 
    content: string; 
    messageType?: 'text' | 'voice' | 'file'; 
    voiceUrl?: string;
    replyToId?: string;
    replyToContent?: string;
    replyToSenderName?: string;
  }): Promise<ChatMessage> {
    if (isSupabaseConfigured) {
      const supaMsg = await supabaseDb.sendMessage(msg);
      if (supaMsg) return supaMsg;
    }
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  async deleteMessage(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      return supabaseDb.deleteMessage(id);
    }
    const res = await fetch(`${API_BASE}/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  subscribeToMessages(
    connectionId: string, 
    onMessage: (msg: ChatMessage) => void,
    onDelete?: (deletedId: string) => void
  ): () => void {
    if (isSupabaseConfigured) {
      return supabaseDb.subscribeToMessages(connectionId, onMessage, onDelete);
    }
    return () => {};
  },

  // Goals (from Supabase public.goals)
  async getGoals(userId?: string): Promise<Goal[]> {
    if (isSupabaseConfigured) {
      if (!userId) return [];
      return await supabaseDb.getGoals(userId);
    }

    const url = userId ? `${API_BASE}/goals?userId=${encodeURIComponent(userId)}` : `${API_BASE}/goals`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
  },

  async createGoal(goal: Partial<Goal>): Promise<Goal> {
    if (isSupabaseConfigured) {
      const supaGoal = await supabaseDb.createGoal(goal);
      if (supaGoal) {
        await fetch(`${API_BASE}/goals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goal),
        }).catch(() => {});
        return supaGoal;
      }
    }

    const res = await fetch(`${API_BASE}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Failed to create goal');
    return res.json();
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    if (isSupabaseConfigured) {
      const supaGoal = await supabaseDb.updateGoal(id, updates);
      if (supaGoal) {
        await fetch(`${API_BASE}/goals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }).catch(() => {});
        return supaGoal;
      }
    }

    const res = await fetch(`${API_BASE}/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update goal');
    return res.json();
  },

  async deleteGoal(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteGoal(id).catch(() => {});
    }
    const res = await fetch(`${API_BASE}/goals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => null);

    return { success: true };
  },

  // Experience Library (from Supabase public.experience_library)
  async getResources(params?: { category?: string; search?: string; featured?: boolean }): Promise<ExperienceResource[]> {
    if (isSupabaseConfigured) {
      return await supabaseDb.getExperienceResources(params);
    }

    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.featured) query.set('featured', 'true');

    const res = await fetch(`${API_BASE}/resources?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  async createResource(resource: Partial<ExperienceResource>): Promise<ExperienceResource> {
    if (isSupabaseConfigured) {
      const supaResource = await supabaseDb.createExperienceResource(resource);
      if (supaResource) {
        await fetch(`${API_BASE}/resources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resource),
        }).catch(() => {});
        return supaResource;
      }
    }

    const res = await fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource),
    });
    if (!res.ok) throw new Error('Failed to create resource');
    return res.json();
  },

  async updateResource(id: string, updates: Partial<ExperienceResource>): Promise<ExperienceResource> {
    if (isSupabaseConfigured) {
      const supaResource = await supabaseDb.updateExperienceResource(id, updates);
      if (supaResource) {
        await fetch(`${API_BASE}/resources/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }).catch(() => {});
        return supaResource;
      }
    }

    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update resource');
    return res.json();
  },

  async deleteResource(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteResource(id);
    }
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'DELETE',
    }).catch(() => null);

    return { success: true };
  },

  // Notifications (direct client-side Supabase JS)
  async createNotification(notif: Partial<AppNotification>): Promise<AppNotification | null> {
    return await supabaseDb.createNotification(notif);
  },

  async getNotifications(userId?: string): Promise<AppNotification[]> {
    let targetUserId = userId;
    if (!targetUserId) {
      const user = await api.getCurrentUser();
      targetUserId = user?.id;
    }
    if (!targetUserId) return [];
    return await supabaseDb.getNotifications(targetUserId);
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    await supabaseDb.markNotificationRead(id);
    return { success: true };
  },

  async markAllNotificationsRead(userId?: string): Promise<{ success: boolean }> {
    let targetUserId = userId;
    if (!targetUserId) {
      const user = await api.getCurrentUser();
      targetUserId = user?.id;
    }
    if (targetUserId) {
      await supabaseDb.markAllNotificationsRead(targetUserId);
    }
    return { success: true };
  },

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    await supabaseDb.deleteNotification(id);
    return { success: true };
  },

  async clearAllNotifications(userId?: string): Promise<{ success: boolean }> {
    let targetUserId = userId;
    if (!targetUserId) {
      const user = await api.getCurrentUser();
      targetUserId = user?.id;
    }
    if (targetUserId) {
      await supabaseDb.clearAllNotifications(targetUserId);
    }
    return { success: true };
  },

  subscribeToNotifications(
    userId: string,
    onNotification: (notif: AppNotification) => void
  ): () => void {
    return supabaseDb.subscribeToNotifications(userId, onNotification);
  },

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    return res.json();
  },

  async verifyUser(userId: string, status: 'verified' | 'rejected', notes?: string): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      await supabaseDb.upsertProfile({ id: userId, verificationStatus: status });
    }
    const res = await fetch(`${API_BASE}/admin/verify/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error('Failed to update user verification');
    return res.json();
  },

  async toggleUserBan(userId: string, banned: boolean): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      await supabaseDb.upsertProfile({ id: userId, isBanned: banned });
    }
    const res = await fetch(`${API_BASE}/admin/toggle-ban/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banned }),
    });
    if (!res.ok) throw new Error('Failed to toggle ban');
    return res.json();
  },

  // AI Mentorship & Advisory (Client-side @google/generative-ai & Supabase JS)
  async getAIMatches(): Promise<AIMatchResult[]> {
    try {
      const currentUser = await api.getCurrentUser();
      if (!currentUser) return [];

      const [goals, mentors] = await Promise.all([
        api.getGoals(currentUser.id),
        api.getMentors(),
      ]);

      const availableMentors = mentors.filter(m => m.id !== currentUser.id && !m.isBanned);
      return await generateMentorMatchesClient(currentUser, goals, availableMentors);
    } catch (err) {
      console.warn('Error calculating AI mentor matches client-side:', err);
      return [];
    }
  },

  async breakdownGoalAI(payload: { title: string; description?: string; category?: string; targetDate?: string }): Promise<{
    milestones: { title: string; dueDate?: string }[];
    recommendations: string[];
  }> {
    return await generateGoalBreakdownClient(
      payload.title,
      payload.description,
      payload.category,
      payload.targetDate
    );
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
    try {
      const currentUser = await api.getCurrentUser();
      const mentors = await api.getMentors();
      const mentor = mentors.find(m => m.id === payload.mentorId) || (await api.getUserById(payload.mentorId));

      if (!currentUser || !mentor) {
        return {
          polishedMessage: payload.draftMessage || 'I would like to request mentorship to help guide my professional development.',
          highlights: ['Clear and direct request', 'Focus on professional growth']
        };
      }

      return await polishMentorshipRequestClient(
        currentUser,
        mentor,
        payload.draftMessage,
        payload.goalsSummary
      );
    } catch (err) {
      console.warn('Error polishing mentorship request client-side:', err);
      return {
        polishedMessage: payload.draftMessage || 'I would like to request mentorship to help guide my professional development.',
        highlights: ['Clear and direct request', 'Focus on professional growth']
      };
    }
  },

  async getCareerAdviceAI(question: string): Promise<{ answer: string }> {
    try {
      const currentUser = await api.getCurrentUser();
      const goals = currentUser ? await api.getGoals(currentUser.id) : [];
      return await getCareerAdvisorResponseClient(question, currentUser, goals);
    } catch (err) {
      console.warn('Error fetching career advice client-side:', err);
      return {
        answer: 'I am here to help you navigate your mentorship and professional milestones. Please ask any specific question regarding career paths, 1:1 prep, or technical goals.'
      };
    }
  },
};


