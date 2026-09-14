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
} from '../types/index';
import { supabaseDb, getCachedMeetings, setCachedMeetings } from './supabaseDb';
import { isSupabaseConfigured, getSupabaseClient } from './supabase';
import { localStore } from './localStore';
import { 
  generateMentorMatchesClient, 
  generateGoalBreakdownClient, 
  polishMentorshipRequestClient, 
  getCareerAdvisorResponseClient 
} from './clientGemini';

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
          const profile = await supabaseDb.getProfileById(session.user.id, session.user.email);
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
    }
    return localStore.getActiveUser();
  },

  async switchUser(userId: string): Promise<{ success: boolean; user: UserProfile }> {
    localStore.setActiveUserId(userId);
    if (isSupabaseConfigured && userId !== 'anonymous') {
      const profile = await supabaseDb.getProfileById(userId);
      if (profile) {
        return { success: true, user: profile };
      }
    }
    const localUser = localStore.getUserById(userId);
    if (localUser) {
      return { success: true, user: localUser };
    }
    const active = localStore.getActiveUser();
    if (active) {
      return { success: true, user: active };
    }
    throw new Error('Failed to switch user');
  },

  async getAllUsers(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const profiles = await supabaseDb.getProfiles();
      if (profiles && profiles.length > 0) return profiles;
    }
    return localStore.getUsers();
  },

  async registerUser(userData: Partial<UserProfile>): Promise<UserProfile> {
    const id = userData.id || `user_${Date.now()}`;
    const userToSave = { ...userData, id };
    const localUser = localStore.upsertUser(userToSave as any);
    if (isSupabaseConfigured) {
      const supaUser = await supabaseDb.upsertProfile(userToSave);
      if (supaUser) return supaUser;
    }
    return localUser;
  },

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    localStore.upsertUser({ ...updates, id } as any);
    if (isSupabaseConfigured) {
      const supaUser = await supabaseDb.upsertProfile({ ...updates, id });
      if (supaUser) return supaUser;
    }
    const updated = localStore.getUserById(id);
    if (updated) return updated;
    throw new Error('Failed to update profile');
  },

  // Mentors (from Supabase public.profiles where role = 'mentor' or is_mentor = true)
  async getMentors(params?: { search?: string; industry?: string; skill?: string; minExp?: number; verifiedOnly?: boolean }): Promise<UserProfile[]> {
    let filtered: UserProfile[] = [];
    if (isSupabaseConfigured) {
      filtered = await supabaseDb.getMentors();
    }
    if (!filtered || filtered.length === 0) {
      filtered = localStore.getUsers().filter(u => u.role?.toLowerCase() === 'mentor');
    }

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
  },

  async getUserById(id: string): Promise<UserProfile | null> {
    if (!id) return null;
    if (isSupabaseConfigured) {
      const profile = await supabaseDb.getProfileById(id);
      if (profile) return profile;
    }
    return localStore.getUserById(id);
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
    if (isSupabaseConfigured && userId) {
      const supaReqs = await supabaseDb.getRequests(userId);
      if (supaReqs && supaReqs.length > 0) return supaReqs;
    }
    return localStore.getRequests(userId);
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

    if (isSupabaseConfigured) {
      try {
        const supaReq = await supabaseDb.createRequest(enrichedPayload);
        if (supaReq) {
          resultReq = supaReq;
        }
      } catch (clientErr: any) {
        console.warn('Client Supabase createRequest notice:', clientErr.message);
      }
    }

    if (!resultReq) {
      const localReq: MentorshipRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        requesterId: enrichedPayload.requesterId || 'anonymous',
        requesterName: enrichedPayload.requesterName,
        requesterTitle: enrichedPayload.requesterTitle,
        requesterAvatar: enrichedPayload.requesterAvatar,
        requesterRole: enrichedPayload.requesterRole,
        mentorId: enrichedPayload.mentorId,
        mentorName: enrichedPayload.mentorName || 'Mentor',
        mentorTitle: enrichedPayload.mentorTitle || 'Mentor',
        mentorAvatar: enrichedPayload.mentorAvatar || '',
        message: enrichedPayload.message,
        goalsSummary: enrichedPayload.goalsSummary,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStore.saveRequest(localReq);
      resultReq = localReq;
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
    let resultReq: MentorshipRequest | null = null;
    if (isSupabaseConfigured) {
      try {
        const supaReq = await supabaseDb.respondToRequest(id, status, responseNote);
        if (supaReq) {
          resultReq = supaReq;
        }
      } catch (clientErr: any) {
        console.warn('Client Supabase respondToRequest notice:', clientErr.message);
      }
    }

    const localReqs = localStore.getRequests();
    const target = localReqs.find(r => r.id === id);
    if (target) {
      target.status = status;
      if (responseNote) target.responseNote = responseNote;
      target.updatedAt = new Date().toISOString();
      localStore.saveRequest(target);
      if (!resultReq) resultReq = target;

      // If accepted, also create local connection
      if (status === 'accepted') {
        const connId = `conn_${Date.now()}`;
        const newConn: MentorshipConnection = {
          id: connId,
          requestId: target.id,
          studentId: target.requesterId,
          studentName: target.requesterName || 'Mentee',
          studentAvatar: target.requesterAvatar || '',
          studentTitle: target.requesterTitle || 'Student',
          mentorId: target.mentorId,
          mentorName: target.mentorName || 'Mentor',
          mentorAvatar: target.mentorAvatar || '',
          mentorTitle: target.mentorTitle || 'Mentor',
          focusAreas: ['Career Growth'],
          status: 'active',
          connectedAt: new Date().toISOString(),
          startDate: new Date().toISOString(),
          meetings: [],
        };
        localStore.saveConnection(newConn);
      }
    }

    if (resultReq) return resultReq;
    throw new Error('Failed to respond to request');
  },

  async cancelRequest(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseDb.cancelRequest(id);
      } catch {}
    }
    localStore.deleteRequest(id);
    return { success: true };
  },

  async deleteRequest(id: string): Promise<{ success: boolean }> {
    return api.cancelRequest(id);
  },

  async requestVerification(userId: string, notes?: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      await supabaseDb.upsertProfile({ id: userId, verificationStatus: 'pending' });
    }
    localStore.upsertUser({ id: userId, verificationStatus: 'pending' } as any);
    return { success: true };
  },

  // Networking & Professional Connections
  async getNetwork(userId: string): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      return await supabaseDb.getNetwork(userId);
    }
    const connections = localStore.getConnections(userId);
    const peerIds = connections.map(c => c.studentId === userId ? c.mentorId : c.studentId);
    const allUsers = localStore.getUsers();
    return allUsers.filter(u => peerIds.includes(u.id));
  },

  async getNetworkingStatus(userId: string, targetUserId: string): Promise<'none' | 'pending' | 'connected'> {
    if (isSupabaseConfigured) {
      return await supabaseDb.getNetworkingStatus(userId, targetUserId);
    }
    const connections = localStore.getConnections(userId);
    const isConn = connections.some(c => 
      (c.studentId === userId && c.mentorId === targetUserId) ||
      (c.mentorId === userId && c.studentId === targetUserId)
    );
    if (isConn) return 'connected';
    const requests = localStore.getRequests(userId);
    const isPending = requests.some(r => 
      r.status === 'pending' && 
      ((r.requesterId === userId && r.mentorId === targetUserId) ||
       (r.mentorId === userId && r.requesterId === targetUserId))
    );
    if (isPending) return 'pending';
    return 'none';
  },

  async sendNetworkingRequest(data: { requesterId: string; recipientId: string; note?: string }): Promise<any> {
    if (isSupabaseConfigured) {
      const supaReq = await supabaseDb.sendNetworkingRequest(data);
      if (supaReq) return supaReq;
    }
    const req = await this.createRequest({
      mentorId: data.recipientId,
      requesterId: data.requesterId,
      message: data.note || 'Hi, I would like to connect with you on MentorNexus.',
    });
    return req;
  },

  async respondToNetworkingRequest(requestId: string, status: 'accepted' | 'declined'): Promise<any> {
    if (isSupabaseConfigured) {
      return await supabaseDb.respondToRequest(requestId, status);
    }
    return await this.respondToRequest(requestId, status);
  },

  // Connections (from Supabase public.connections)
  async getConnections(userId?: string): Promise<MentorshipConnection[]> {
    if (isSupabaseConfigured && userId) {
      const supaConns = await supabaseDb.getConnections(userId);
      if (supaConns && supaConns.length > 0) return supaConns;
    }
    return localStore.getConnections(userId);
  },

  async updateConnection(id: string, updates: Partial<MentorshipConnection>): Promise<MentorshipConnection> {
    let resultConn: MentorshipConnection | null = null;
    if (isSupabaseConfigured) {
      resultConn = await supabaseDb.updateConnection(id, updates);
    }

    const localConns = localStore.getConnections();
    const conn = localConns.find(c => c.id === id);
    if (conn) {
      Object.assign(conn, updates);
      localStore.saveConnection(conn);
      if (!resultConn) resultConn = conn;
    }

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
    localStore.deleteConnection(id);
    return { success: true };
  },

  async blockUser(targetUserId: string, userId?: string): Promise<{ success: boolean }> {
    if (userId) {
      if (isSupabaseConfigured) {
        try {
          await supabaseDb.blockUser(userId, targetUserId);
        } catch {}
      }
      localStore.blockUser(userId, targetUserId);
    }
    return { success: true };
  },

  async unblockUser(targetUserId: string, userId?: string): Promise<{ success: boolean }> {
    if (userId) {
      if (isSupabaseConfigured) {
        try {
          await supabaseDb.unblockUser(userId, targetUserId);
        } catch {}
      }
      localStore.unblockUser(userId, targetUserId);
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
    const blockedIds = localStore.getBlockedUsers(userId);
    if (!blockedIds || blockedIds.length === 0) return [];
    const profiles = await this.getAllUsers();
    return profiles.filter(p => blockedIds.includes(p.id));
  },

  async deleteMessagesForConnection(connectionId: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseDb.deleteMessagesForConnection(connectionId);
      } catch {}
    }
    localStore.clearMessages(connectionId);
    return { success: true };
  },

  // Dedicated Meetings API (Persistent Sessions & Past History)
  async getMeetings(connectionId: string): Promise<MentorshipMeeting[]> {
    const cached = getCachedMeetings(connectionId);
    if (cached && cached.length > 0) return cached;
    return localStore.getMeetings(connectionId);
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

    const existing = await this.getMeetings(connectionId);
    const updatedList = [newMeeting, ...existing.filter(m => m.id !== newMeeting.id)];
    setCachedMeetings(connectionId, updatedList);
    localStore.saveMeetings(connectionId, updatedList);

    await this.updateConnection(connectionId, {
      meetings: updatedList,
      nextMeetingDate: newMeeting.date,
    }).catch(() => {});

    return newMeeting;
  },

  async updateMeeting(connectionId: string, meetingId: string, updates: Partial<MentorshipMeeting>): Promise<MentorshipMeeting | null> {
    const existing = await this.getMeetings(connectionId);
    const idx = existing.findIndex(m => m.id === meetingId);
    let updatedMtg: MentorshipMeeting | null = null;

    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates, updatedAt: new Date().toISOString() };
      updatedMtg = existing[idx];
      setCachedMeetings(connectionId, existing);
      localStore.saveMeetings(connectionId, existing);
    }

    if (existing.length > 0) {
      await this.updateConnection(connectionId, {
        meetings: existing,
      }).catch(() => {});
    }

    return updatedMtg;
  },

  async deleteMeeting(connectionId: string, meetingId: string): Promise<boolean> {
    const existing = await this.getMeetings(connectionId);
    const filtered = existing.filter(m => m.id !== meetingId);
    setCachedMeetings(connectionId, filtered);
    localStore.saveMeetings(connectionId, filtered);

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
    return localStore.getMessages(connectionId);
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
        resultMsg = await supabaseDb.sendMessage(enrichedMsg);
      } catch (e) {
        console.warn('Supabase sendMessage notice:', e);
      }
    }

    if (!resultMsg) {
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        connectionId: enrichedMsg.connectionId,
        senderId: enrichedMsg.senderId || 'anonymous',
        senderName: enrichedMsg.senderName,
        senderAvatar: enrichedMsg.senderAvatar,
        content: enrichedMsg.content,
        messageType: enrichedMsg.messageType || 'text',
        voiceUrl: enrichedMsg.voiceUrl,
        replyToId: enrichedMsg.replyToId,
        replyToContent: enrichedMsg.replyToContent,
        replyToSenderName: enrichedMsg.replyToSenderName,
        createdAt: new Date().toISOString(),
      };
      localStore.saveMessage(enrichedMsg.connectionId, newMsg);
      resultMsg = newMsg;
    }

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
    const conns = localStore.getConnections();
    for (const c of conns) {
      localStore.deleteMessage(c.id, id);
    }
    return true;
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
    if (isSupabaseConfigured && userId) {
      const supaGoals = await supabaseDb.getGoals(userId);
      if (supaGoals && supaGoals.length > 0) return supaGoals;
    }
    if (!userId) return [];
    return localStore.getGoals(userId);
  },

  async createGoal(goal: Partial<Goal>): Promise<Goal> {
    let resultGoal: Goal | null = null;
    if (isSupabaseConfigured) {
      resultGoal = await supabaseDb.createGoal(goal);
    }
    if (!resultGoal) {
      const newGoal: Goal = {
        id: goal.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: goal.userId || 'user_sarah_mentee',
        title: goal.title || 'Professional Goal',
        description: goal.description || '',
        category: goal.category || 'Skill Development',
        targetDate: goal.targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        progress: goal.progress || 0,
        status: goal.status || 'in_progress',
        milestones: goal.milestones || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStore.saveGoal(newGoal);
      resultGoal = newGoal;
    }
    return resultGoal;
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    let resultGoal: Goal | null = null;
    if (isSupabaseConfigured) {
      resultGoal = await supabaseDb.updateGoal(id, updates);
    }
    const user = await api.getCurrentUser();
    const goals = user ? localStore.getGoals(user.id) : [];
    const target = goals.find(g => g.id === id);
    if (target) {
      Object.assign(target, updates);
      localStore.saveGoal(target);
      if (!resultGoal) resultGoal = target;
    }
    if (resultGoal) return resultGoal;
    throw new Error('Failed to update goal');
  },

  async deleteGoal(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteGoal(id).catch(() => {});
    }
    localStore.deleteGoal(id);
    return { success: true };
  },

  // Experience Library (from Supabase public.experience_library)
  async getResources(params?: { category?: string; search?: string; featured?: boolean }): Promise<ExperienceResource[]> {
    let list: ExperienceResource[] = [];
    if (isSupabaseConfigured) {
      list = await supabaseDb.getExperienceResources(params);
    }
    if (!list || list.length === 0) {
      list = localStore.getResources();
    }
    if (params?.category && params.category !== 'All') {
      list = list.filter(r => r.category === params.category);
    }
    if (params?.featured) {
      list = list.filter(r => r.featured);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase();
      list = list.filter(r => 
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  },

  async createResource(resource: Partial<ExperienceResource>): Promise<ExperienceResource> {
    let result: ExperienceResource | null = null;
    if (isSupabaseConfigured) {
      result = await supabaseDb.createExperienceResource(resource);
    }
    if (!result) {
      const newRes: ExperienceResource = {
        id: resource.id || `res_${Date.now()}`,
        title: resource.title || 'Resource',
        summary: resource.summary || '',
        content: resource.content || '',
        category: resource.category || 'Career Advice',
        authorId: resource.authorId || '',
        authorName: resource.authorName || 'Member',
        authorTitle: resource.authorTitle || '',
        authorAvatar: resource.authorAvatar || '',
        readTimeMinutes: resource.readTimeMinutes || 5,
        tags: resource.tags || [],
        featured: resource.featured || false,
        publishedAt: resource.publishedAt || new Date().toISOString(),
      };
      localStore.saveResource(newRes);
      result = newRes;
    }
    return result;
  },

  async updateResource(id: string, updates: Partial<ExperienceResource>): Promise<ExperienceResource> {
    let result: ExperienceResource | null = null;
    if (isSupabaseConfigured) {
      result = await supabaseDb.updateExperienceResource(id, updates);
    }
    const all = localStore.getResources();
    const target = all.find(r => r.id === id);
    if (target) {
      Object.assign(target, updates);
      localStore.saveResource(target);
      if (!result) result = target;
    }
    if (result) return result;
    throw new Error('Failed to update resource');
  },

  async deleteResource(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteResource(id);
    }
    localStore.deleteResource(id);
    return { success: true };
  },

  // Notifications (localStore + Supabase realtime)
  async createNotification(notif: Partial<AppNotification>): Promise<AppNotification | null> {
    let result: AppNotification | null = null;
    if (isSupabaseConfigured) {
      try {
        result = await supabaseDb.createNotification(notif);
      } catch {}
    }

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

    localStore.saveNotification(finalNotif);

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

    const combined: AppNotification[] = [];
    const seenIds = new Set<string>();

    // 1. Fetch from Supabase direct client if configured
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

    // 2. Fetch from local store
    const localList = localStore.getNotifications(targetUserId);
    for (const item of localList) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
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
    localStore.markNotificationRead(id);
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
      localStore.markAllNotificationsRead(targetUserId);
    }
    return { success: true };
  },

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseDb.deleteNotification(id);
      } catch {}
    }
    localStore.deleteNotification(id);
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
      localStore.clearAllNotifications(targetUserId);
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

    // 3. High-frequency polling (2s) to guarantee delivery across tabs
    const knownIds = new Set<string>();
    let hasPolledOnce = false;

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
    }, 2000);

    return () => {
      const idx = localNotificationSubscribers.indexOf(subRecord);
      if (idx !== -1) localNotificationSubscribers.splice(idx, 1);
      clearInterval(pollInterval);
      if (supaUnsub) supaUnsub();
    };
  },

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    const [users, requests, connections, resources] = await Promise.all([
      this.getAllUsers(),
      this.getRequests(),
      this.getConnections(),
      this.getResources(),
    ]);

    const activeUser = await this.getCurrentUser();
    const goals = activeUser ? await this.getGoals(activeUser.id) : [];

    return {
      totalUsers: users.length,
      totalMentors: users.filter(u => u.role?.toLowerCase() === 'mentor').length,
      totalLearners: users.filter(u => u.role?.toLowerCase() === 'student' || u.role?.toLowerCase() === 'learner').length,
      totalEarlyCareer: users.filter(u => (u.yearsOfExperience || 0) <= 2).length,
      activeConnections: connections.filter(c => c.status === 'active').length,
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.progress === 100).length,
      pendingVerifications: users.filter(u => u.verificationStatus === 'pending').length,
      totalResources: resources.length,
    };
  },

  async verifyUser(userId: string, status: 'verified' | 'rejected', notes?: string): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      await supabaseDb.upsertProfile({ id: userId, verificationStatus: status });
    }
    return localStore.upsertUser({ id: userId, verificationStatus: status } as any);
  },

  async toggleUserBan(userId: string, banned: boolean): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      await supabaseDb.upsertProfile({ id: userId, isBanned: banned });
    }
    return localStore.upsertUser({ id: userId, isBanned: banned } as any);
  },

  // AI Mentorship & Career Advisor
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
      console.warn('Error calculating AI mentor matches:', err);
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
    try {
      const currentUser = await api.getCurrentUser();
      const goals = currentUser ? await api.getGoals(currentUser.id) : [];
      const res = await getCareerAdvisorResponseClient(message, currentUser || undefined, goals, history as any);
      return {
        success: true,
        message: res.answer,
        action: null,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }
      console.warn('[API Advisor] Advisor call error:', err);
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
