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
  MentorshipMeeting,
  AIAdvisorAction,
  AIAdvisorResponse,
  AIAdvisorMessage
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

const localNotificationSubscribers: Array<{ userId: string; callback: (n: AppNotification) => void }> = [];

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

  // Role-filtered discovery (Mentors, Learners, Rest/Others, or All Community Directory)
  async getProfilesByRole(role?: string, params?: { search?: string; industry?: string; skill?: string; minExp?: number }): Promise<UserProfile[]> {
    let list: UserProfile[] = [];

    if (isSupabaseConfigured) {
      list = await supabaseDb.getProfilesByRole(role);
    } else {
      const allUsers = await this.getAllUsers();
      if (!role || role === 'all') {
        list = allUsers;
      } else if (role === 'mentor' || role === 'mentors') {
        list = allUsers.filter(u => u.role?.toLowerCase() === 'mentor');
      } else if (role === 'learner' || role === 'learners' || role === 'student' || role === 'students') {
        list = allUsers.filter(u => u.role?.toLowerCase() === 'student' || u.role?.toLowerCase() === 'learner');
      } else if (role === 'others' || role === 'rest' || role === 'other') {
        list = allUsers.filter(u => {
          const r = u.role?.toLowerCase();
          return r !== 'mentor' && r !== 'student' && r !== 'learner';
        });
      } else {
        list = allUsers.filter(u => u.role === role);
      }
    }

    // Apply strict filtering guarantee
    if (role === 'mentor' || role === 'mentors') {
      list = list.filter(u => u.role?.toLowerCase() === 'mentor');
    } else if (role === 'learner' || role === 'learners' || role === 'student' || role === 'students') {
      list = list.filter(u => u.role?.toLowerCase() === 'student' || u.role?.toLowerCase() === 'learner');
    } else if (role === 'others' || role === 'rest' || role === 'other') {
      list = list.filter(u => {
        const r = u.role?.toLowerCase();
        return r !== 'mentor' && r !== 'student' && r !== 'learner';
      });
    }

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
    const user = await api.getCurrentUser().catch(() => null);
    const enrichedPayload = {
      ...payload,
      requesterId: payload.requesterId || user?.id,
      requesterName: payload.requesterName || user?.name || 'MentorNexus Member',
      requesterTitle: payload.requesterTitle || user?.title || 'Professional',
      requesterAvatar: payload.requesterAvatar || user?.avatar || '',
      requesterRole: payload.requesterRole || user?.role || 'student',
    };

    let resultReq: MentorshipRequest | null = null;

    // 1. If Supabase is configured on client, try direct PostgREST insert
    if (isSupabaseConfigured) {
      try {
        const supaReq = await supabaseDb.createRequest(enrichedPayload);
        if (supaReq) {
          resultReq = supaReq;
          // Sync notification on server
          const token = await api.getAuthToken();
          await fetch(`${API_BASE}/requests`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              ...(enrichedPayload.requesterId ? { 'x-user-id': enrichedPayload.requesterId } : {}),
            },
            body: JSON.stringify(enrichedPayload),
          }).catch(() => {});
        }
      } catch (clientErr: any) {
        console.warn('Client Supabase createRequest notice (falling back to authoritative backend):', clientErr.message);
      }
    }

    if (!resultReq) {
      // 2. Authoritative backend endpoint
      const token = await api.getAuthToken();
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(enrichedPayload.requesterId ? { 'x-user-id': enrichedPayload.requesterId } : {}),
        },
        body: JSON.stringify(enrichedPayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send mentorship request');
      }
      resultReq = await res.json();
    }

    // Instantly trigger notifications for both recipient and sender confirmation
    if (enrichedPayload.mentorId) {
      api.createNotification({
        userId: enrichedPayload.mentorId,
        title: 'New Mentorship Request',
        message: `${enrichedPayload.requesterName} sent you a mentorship request.`,
        type: 'request_received',
        linkTab: 'requests',
        linkId: resultReq?.id,
      }).catch(() => {});
    }

    if (enrichedPayload.requesterId) {
      api.createNotification({
        userId: enrichedPayload.requesterId,
        title: 'Mentorship Request Submitted',
        message: `Your mentorship request to ${enrichedPayload.mentorName || 'the recipient'} was delivered successfully.`,
        type: 'request_sent',
        linkTab: 'requests',
        linkId: resultReq?.id,
      }).catch(() => {});
    }

    return resultReq!;
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
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    recipientId?: string;
    replyToId?: string;
    replyToContent?: string;
    replyToSenderName?: string;
  }): Promise<ChatMessage> {
    const user = await api.getCurrentUser().catch(() => null);
    const enrichedMsg = {
      ...msg,
      senderId: msg.senderId || user?.id,
      senderName: msg.senderName || user?.name || 'Member',
      senderAvatar: msg.senderAvatar || user?.avatar || '',
    };

    let resultMsg: ChatMessage | null = null;
    if (isSupabaseConfigured) {
      try {
        const supaMsg = await supabaseDb.sendMessage(enrichedMsg);
        if (supaMsg) resultMsg = supaMsg;
      } catch (e) {
        console.warn('Supabase sendMessage notice:', e);
      }
    }

    // Always mirror to authoritative backend for storage sync and multi-client notification dispatch
    try {
      const token = await api.getAuthToken();
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(enrichedMsg.senderId ? { 'x-user-id': enrichedMsg.senderId } : {}),
        },
        body: JSON.stringify(enrichedMsg),
      });
      if (res.ok) {
        const serverMsg = await res.json();
        if (!resultMsg) resultMsg = serverMsg;
      }
    } catch (e) {}

    if (!resultMsg) {
      throw new Error('Failed to send message');
    }

    // Instantly notify recipient if in-app
    if (enrichedMsg.recipientId) {
      const previewText = enrichedMsg.messageType === 'voice'
        ? '🎤 Sent a voice note'
        : (enrichedMsg.content.length > 60 ? `${enrichedMsg.content.slice(0, 60)}...` : enrichedMsg.content || 'New message');
      
      api.createNotification({
        userId: enrichedMsg.recipientId,
        title: `💬 New message from ${enrichedMsg.senderName}`,
        message: previewText,
        type: 'message',
        linkTab: 'connections',
        linkId: enrichedMsg.connectionId,
      }).catch(() => {});
    }

    return resultMsg;
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

  // Notifications (authoritative backend + Supabase realtime)
  async createNotification(notif: Partial<AppNotification>): Promise<AppNotification | null> {
    let result: AppNotification | null = null;
    if (isSupabaseConfigured) {
      try {
        result = await supabaseDb.createNotification(notif);
      } catch {}
    }

    try {
      const token = await api.getAuthToken();
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(notif),
      });
      if (res.ok) {
        const serverResult = await res.json();
        if (!result) result = serverResult;
      }
    } catch {}

    const finalNotif: AppNotification = result || {
      id: notif.id || `notif_${Date.now()}`,
      userId: notif.userId || '',
      title: notif.title || 'Notification',
      message: notif.message || '',
      type: notif.type || 'system',
      read: false,
      linkTab: notif.linkTab,
      linkId: notif.linkId,
      createdAt: new Date().toISOString(),
    };

    // Instantly notify in-app subscribers in the current tab/session
    if (finalNotif.userId) {
      localNotificationSubscribers.forEach(sub => {
        if (sub.userId === finalNotif.userId) {
          try {
            sub.callback(finalNotif);
          } catch {}
        }
      });
    }

    return finalNotif;
  },

  async getNotifications(userId?: string): Promise<AppNotification[]> {
    let targetUserId = userId;
    if (!targetUserId) {
      const user = await api.getCurrentUser();
      targetUserId = user?.id;
    }
    if (!targetUserId) return [];

    let combined: AppNotification[] = [];
    const seenIds = new Set<string>();

    // 1. Fetch from authoritative server endpoint (handles storage + server Supabase)
    try {
      const token = await api.getAuthToken();
      const res = await fetch(`${API_BASE}/notifications?userId=${encodeURIComponent(targetUserId)}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-user-id': targetUserId,
        }
      });
      if (res.ok) {
        const serverList = await res.json();
        if (Array.isArray(serverList)) {
          for (const item of serverList) {
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              combined.push(item);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Server getNotifications notice:', e);
    }

    // 2. Fetch from Supabase direct client if configured
    if (isSupabaseConfigured) {
      try {
        const supaList = await supabaseDb.getNotifications(targetUserId);
        if (Array.isArray(supaList)) {
          for (const item of supaList) {
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              combined.push(item);
            }
          }
        }
      } catch (e) {
        console.warn('Supabase getNotifications notice:', e);
      }
    }

    // Sort descending by date
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return combined;
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseDb.markNotificationRead(id);
      } catch {}
    }
    try {
      const token = await api.getAuthToken();
      await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
    } catch {}
    return { success: true };
  },

  async markAllNotificationsRead(userId?: string): Promise<{ success: boolean }> {
    let targetUserId = userId;
    if (!targetUserId) {
      const user = await api.getCurrentUser();
      targetUserId = user?.id;
    }
    if (targetUserId) {
      if (isSupabaseConfigured) {
        try {
          await supabaseDb.markAllNotificationsRead(targetUserId);
        } catch {}
      }
      try {
        const token = await api.getAuthToken();
        await fetch(`${API_BASE}/notifications/read-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-user-id': targetUserId,
          },
          body: JSON.stringify({ userId: targetUserId }),
        });
      } catch {}
    }
    return { success: true };
  },

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseDb.deleteNotification(id);
      } catch {}
    }
    try {
      const token = await api.getAuthToken();
      await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
    } catch {}
    return { success: true };
  },

  async clearAllNotifications(userId?: string): Promise<{ success: boolean }> {
    let targetUserId = userId;
    if (!targetUserId) {
      const user = await api.getCurrentUser();
      targetUserId = user?.id;
    }
    if (targetUserId) {
      if (isSupabaseConfigured) {
        try {
          await supabaseDb.clearAllNotifications(targetUserId);
        } catch {}
      }
      try {
        const token = await api.getAuthToken();
        await fetch(`${API_BASE}/notifications/clear-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-user-id': targetUserId,
          },
          body: JSON.stringify({ userId: targetUserId }),
        });
      } catch {}
    }
    return { success: true };
  },

  subscribeToNotifications(
    userId: string,
    onNotification: (notif: AppNotification) => void
  ): () => void {
    if (!userId) return () => {};

    // 1. Register with local synchronous subscriber list for instant in-tab delivery
    const subRecord = { userId, callback: onNotification };
    localNotificationSubscribers.push(subRecord);

    // 2. Realtime WebSocket subscription from Supabase if configured
    let supaUnsub: (() => void) | null = null;
    if (isSupabaseConfigured) {
      try {
        supaUnsub = supabaseDb.subscribeToNotifications(userId, (notif) => {
          onNotification(notif);
        });
      } catch (err) {
        console.warn('Realtime Supabase notifications subscription notice:', err);
      }
    }

    // 3. High-frequency polling (1.5s) to guarantee instantaneous delivery across tabs and users
    const knownIds = new Set<string>();
    let hasPolledOnce = false;

    // Seed known IDs
    api.getNotifications(userId).then(notifs => {
      notifs.forEach(n => knownIds.add(n.id));
      hasPolledOnce = true;
    }).catch(() => {});

    const pollInterval = setInterval(async () => {
      try {
        const notifs = await api.getNotifications(userId);
        if (Array.isArray(notifs)) {
          for (const n of notifs) {
            if (!knownIds.has(n.id)) {
              knownIds.add(n.id);
              if (hasPolledOnce) {
                onNotification(n);
              }
            }
          }
          hasPolledOnce = true;
        }
      } catch {}
    }, 1500);

    return () => {
      const idx = localNotificationSubscribers.indexOf(subRecord);
      if (idx !== -1) localNotificationSubscribers.splice(idx, 1);
      clearInterval(pollInterval);
      if (supaUnsub) supaUnsub();
    };
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

  // AI Mentorship & Career Advisor (Server-backed with resilient fallback)
  async getAIMatches(): Promise<AIMatchResult[]> {
    try {
      const currentUser = await api.getCurrentUser();
      if (!currentUser) return [];

      const token = await api.getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (currentUser.id) headers['x-user-id'] = currentUser.id;

      const res = await fetch(`${API_BASE}/ai/match-mentors`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: currentUser.id }),
      }).catch(() => null);

      if (res && res.ok) {
        const matches = await res.json();
        if (Array.isArray(matches) && matches.length > 0) {
          return matches;
        }
      }

      const [goals, mentors] = await Promise.all([
        api.getGoals(currentUser.id),
        api.getMentors(),
      ]);

      const availableMentors = mentors.filter(m => m.id !== currentUser.id && !m.isBanned);
      return await generateMentorMatchesClient(currentUser, goals, availableMentors);
    } catch (err) {
      console.warn('Error calculating AI mentor matches:', err);
      return [];
    }
  },

  async breakdownGoalAI(payload: { title: string; description?: string; category?: string; targetDate?: string }): Promise<{
    milestones: { title: string; dueDate?: string }[];
    recommendations: string[];
  }> {
    try {
      const token = await api.getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/ai/breakdown-goal`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.milestones) && data.milestones.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Server goal breakdown fallback:', err);
    }

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
      const token = await api.getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;

      const res = await fetch(`${API_BASE}/ai/polish-request`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data && data.polishedMessage) {
          return data;
        }
      }

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
      console.warn('Error polishing mentorship request:', err);
      return {
        polishedMessage: payload.draftMessage || 'I would like to request mentorship to help guide my professional development.',
        highlights: ['Clear and direct request', 'Focus on professional growth']
      };
    }
  },

  async sendAdvisorChatMessage(
    message: string,
    history: { sender: 'user' | 'assistant' | 'model'; text: string; action?: AIAdvisorAction | null }[] = [],
    signal?: AbortSignal
  ): Promise<AIAdvisorResponse> {
    const currentUser = await api.getCurrentUser();
    const token = await api.getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (currentUser?.id) headers['x-user-id'] = currentUser.id;

    try {
      const res = await fetch(`${API_BASE}/ai/advisor-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          message, 
          history, 
          userId: currentUser?.id,
          userProfile: currentUser || undefined
        }),
        signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Server returned error status ${res.status}`);
      }

      const data: AIAdvisorResponse = await res.json();
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }
      console.warn('[API Advisor] Server advisor call error:', err);
      return {
        success: false,
        message: err.message || 'MentorNexus AI Advisor is temporarily experiencing high traffic. Please retry in a few moments.',
        action: null,
      };
    }
  },

  async getCareerAdviceAI(
    question: string,
    history?: { sender: 'user' | 'assistant' | 'model'; text: string }[],
    signal?: AbortSignal
  ): Promise<{ answer: string; action?: AIAdvisorAction | null }> {
    const res = await this.sendAdvisorChatMessage(question, history as any, signal);
    return {
      answer: res.message,
      action: res.action,
    };
  },
};


