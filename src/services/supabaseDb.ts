import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { 
  UserProfile, 
  MentorshipRequest, 
  MentorshipConnection, 
  MentorshipMeeting,
  Goal, 
  ExperienceResource, 
  AppNotification, 
  ChatMessage,
  UserRole 
} from '../types/index';

// --- Mappers to handle both snake_case and camelCase database schemas ---

export function mapProfileFromSupabase(row: any, fallbackEmail?: string): UserProfile {
  const isMentor = row.is_mentor === true || row.role === 'mentor';
  const role: UserRole = row.role || (isMentor ? 'mentor' : 'student');
  
  return {
    id: String(row.id),
    email: row.email || fallbackEmail || '',
    name: row.full_name || row.name || row.display_name || 'MentorNexus Member',
    role,
    avatar: row.avatar_url || row.avatar || row.photo_url || (
      role === 'mentor' 
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
    ),
    title: row.profession || row.title || (role === 'mentor' ? 'Industry Mentor' : 'Aspiring Professional'),
    organization: row.organization || row.company || 'Independent',
    bio: row.bio || '',
    industry: row.industry || 'Technology & AI',
    location: row.location || 'Remote',
    yearsOfExperience: Number(row.years_of_experience ?? (role === 'mentor' ? 5 : 1)),
    skills: Array.isArray(row.skills) 
      ? row.skills 
      : (typeof row.skills === 'string' && row.skills.trim() ? row.skills.split(',').map((s: string) => s.trim()) : ['Career Growth', 'Strategy']),
    interests: Array.isArray(row.interests) 
      ? row.interests 
      : (typeof row.interests === 'string' && row.interests.trim() ? row.interests.split(',').map((s: string) => s.trim()) : ['Professional Development']),
    mentoringAreas: Array.isArray(row.mentoring_areas) 
      ? row.mentoring_areas 
      : (role === 'mentor' ? ['Career Navigation', 'Technical Depth', 'Leadership'] : ['Career Guidance', 'Skill Development']),
    education: row.education || '',
    achievements: Array.isArray(row.achievements) ? row.achievements : [],
    availability: row.availability || (role === 'mentor' ? '2 hrs/week' : undefined),
    verificationStatus: row.verification_status || (role === 'mentor' ? 'verified' : 'verified'),
    verificationNotes: row.verification_notes,
    rating: Number(row.rating ?? 4.9),
    reviewCount: Number(row.review_count ?? 12),
    createdAt: row.created_at || new Date().toISOString(),
    isBanned: Boolean(row.is_banned ?? false),
  };
}

export function mapProfileToSupabase(profile: Partial<UserProfile>): Record<string, any> {
  const isMentor = profile.role === 'mentor';
  const data: Record<string, any> = {};

  if (profile.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id)) {
    data.id = profile.id;
  }
  if (profile.name !== undefined && profile.name.trim()) {
    data.full_name = profile.name.trim();
  }
  if (profile.role !== undefined) {
    data.role = profile.role;
    data.is_mentor = isMentor;
  }
  if (profile.avatar !== undefined) {
    data.avatar_url = profile.avatar;
  }
  if (profile.title !== undefined) {
    data.profession = profile.title;
  }
  if (profile.organization !== undefined) data.organization = profile.organization;
  if (profile.bio !== undefined) data.bio = profile.bio;
  if (profile.location !== undefined) data.location = profile.location;
  if (profile.skills !== undefined) {
    data.skills = Array.isArray(profile.skills) ? profile.skills : [];
  }
  if (profile.interests !== undefined) {
    data.interests = Array.isArray(profile.interests) ? profile.interests : [];
  }
  data.updated_at = new Date().toISOString();

  return data;
}

export function mapRequestFromSupabase(row: any): MentorshipRequest {
  return {
    id: String(row.id),
    requesterId: row.mentee_id || row.requester_id || row.requesterId || row.sender_id || '',
    requesterName: row.requester_name || row.requesterName || 'Mentee',
    requesterTitle: row.requester_title || row.requesterTitle || 'Learner',
    requesterAvatar: row.requester_avatar || row.requesterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    requesterRole: row.requester_role || row.requesterRole || 'student',
    mentorId: row.mentor_id || row.mentorId || row.receiver_id || '',
    mentorName: row.mentor_name || row.mentorName || 'Mentor',
    mentorTitle: row.mentor_title || row.mentorTitle || 'Industry Mentor',
    mentorAvatar: row.mentor_avatar || row.mentorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    status: row.status || 'pending',
    message: row.message || '',
    goalsSummary: row.focus_area || row.goals_summary || row.goalsSummary || '',
    responseNote: row.response_note || row.response_notes || row.responseNote || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapRequestToSupabase(req: Partial<MentorshipRequest>): Record<string, any> {
  const data: Record<string, any> = {};
  if (req.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.id)) {
    data.id = req.id;
  }
  if (req.requesterId) {
    data.mentee_id = req.requesterId;
  }
  if (req.mentorId) {
    data.mentor_id = req.mentorId;
  }
  if (req.message !== undefined) {
    data.message = req.message;
  }
  if (req.goalsSummary !== undefined) {
    data.focus_area = req.goalsSummary;
  }
  if (req.status) {
    data.status = req.status;
  }
  if (req.responseNote !== undefined) {
    data.response_note = req.responseNote;
  }
  data.updated_at = new Date().toISOString();
  return data;
}

export function getCachedMeetings(connectionId: string): MentorshipMeeting[] {
  if (!connectionId) return [];
  const cleanId = String(connectionId).trim();
  const rawId = cleanId.replace('conn_', '');
  const prefixedId = cleanId.startsWith('conn_') ? cleanId : `conn_${cleanId}`;

  const keys = [
    `mn_conn_meetings_${cleanId}`,
    `mn_conn_meetings_${rawId}`,
    `mn_conn_meetings_${prefixedId}`,
  ];

  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [];
}

export function setCachedMeetings(connectionId: string, meetings: MentorshipMeeting[]) {
  if (!connectionId) return;
  const cleanId = String(connectionId).trim();
  const rawId = cleanId.replace('conn_', '');
  const prefixedId = cleanId.startsWith('conn_') ? cleanId : `conn_${cleanId}`;
  const serialized = JSON.stringify(meetings);

  try {
    localStorage.setItem(`mn_conn_meetings_${cleanId}`, serialized);
    if (rawId) localStorage.setItem(`mn_conn_meetings_${rawId}`, serialized);
    if (prefixedId) localStorage.setItem(`mn_conn_meetings_${prefixedId}`, serialized);
  } catch {}
}

export function mapConnectionFromSupabase(row: any): MentorshipConnection {
  let meetings: MentorshipMeeting[] = [];
  if (Array.isArray(row.meetings)) {
    meetings = row.meetings;
  } else if (typeof row.meetings === 'string' && row.meetings.trim() !== '') {
    try {
      meetings = JSON.parse(row.meetings);
    } catch {}
  }

  const rowId = String(row.id || '');
  const reqId = String(row.request_id || row.requestId || '');
  if (meetings.length === 0) {
    const cached = getCachedMeetings(rowId) || (reqId ? getCachedMeetings(reqId) : []) || (reqId ? getCachedMeetings(`conn_${reqId}`) : []);
    if (cached && cached.length > 0) {
      meetings = cached;
    }
  } else {
    if (rowId) setCachedMeetings(rowId, meetings);
    if (reqId) setCachedMeetings(`conn_${reqId}`, meetings);
  }

  return {
    id: rowId,
    requestId: reqId,
    studentId: row.student_id || row.mentee_id || row.user_id || row.requester_id || row.studentId || '',
    studentName: row.student_name || row.studentName || 'Mentee',
    studentAvatar: row.student_avatar || row.studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    studentTitle: row.student_title || row.studentTitle || 'Learner',
    mentorId: row.mentor_id || row.connected_user_id || row.mentorId || '',
    mentorName: row.mentor_name || row.mentorName || 'Mentor',
    mentorAvatar: row.mentor_avatar || row.mentorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    mentorTitle: row.mentor_title || row.mentorTitle || 'Industry Mentor',
    focusAreas: Array.isArray(row.focus_areas ?? row.focusAreas) ? (row.focus_areas ?? row.focusAreas) : (row.focus_area ? [row.focus_area] : ['Career Growth']),
    status: row.status || 'active',
    notes: Array.isArray(row.notes) ? row.notes : (typeof row.notes === 'string' && row.notes ? [row.notes] : []),
    meetings,
    connectedAt: row.connected_at || row.created_at || row.startDate || new Date().toISOString(),
    startDate: row.start_date || row.startDate || row.created_at || new Date().toISOString(),
    lastMeetingDate: row.last_meeting_date || row.lastMeetingDate,
    nextMeetingDate: row.next_meeting_date || row.nextMeetingDate || row.next_session_date,
  };
}

export function mapMessageFromSupabase(row: any): ChatMessage {
  let content = row.content || '';
  let replyToId = row.reply_to_id || row.replyToId;
  let replyToContent = row.reply_to_content || row.replyToContent;
  let replyToSenderName = row.reply_to_sender_name || row.replyToSenderName;

  if (typeof content === 'string' && content.startsWith('__REPLY__:') && content.includes('\n')) {
    try {
      const firstLine = content.split('\n')[0];
      const jsonMeta = JSON.parse(firstLine.replace('__REPLY__:', ''));
      replyToId = jsonMeta.id || replyToId;
      replyToContent = jsonMeta.content || replyToContent;
      replyToSenderName = jsonMeta.senderName || replyToSenderName;
      content = content.substring(firstLine.length + 1);
    } catch {}
  }

  return {
    id: String(row.id),
    connectionId: row.connection_id || row.connectionId || '',
    senderId: row.sender_id || row.senderId || '',
    senderName: row.sender_name || row.senderName || 'Member',
    senderAvatar: row.sender_avatar || row.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    content,
    messageType: row.message_type || row.messageType || 'text',
    voiceUrl: row.voice_url || row.voiceUrl || undefined,
    replyToId,
    replyToContent,
    replyToSenderName,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

export function mapGoalFromSupabase(row: any): Goal {
  let category = row.category || 'Career Growth';
  let descriptionText = row.description || '';
  let milestones: any[] = Array.isArray(row.milestones) ? row.milestones : [];

  // Parse structured metadata embedded in description if present
  if (descriptionText && (descriptionText.startsWith('{') || descriptionText.startsWith('{"'))) {
    try {
      const parsed = JSON.parse(descriptionText);
      if (parsed && typeof parsed === 'object') {
        if (parsed.category) category = parsed.category;
        if (parsed.text !== undefined) descriptionText = parsed.text;
        if (Array.isArray(parsed.milestones) && milestones.length === 0) {
          milestones = parsed.milestones;
        }
      }
    } catch {
      // Keep raw descriptionText
    }
  }

  const rawStatus = row.status || 'in_progress';
  const mappedStatus = rawStatus === 'active' ? 'in_progress' : rawStatus;

  return {
    id: String(row.id),
    userId: row.user_id || row.userId || '',
    title: row.title || '',
    description: descriptionText,
    category: category,
    targetDate: row.target_date || row.targetDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: Number(row.progress || 0),
    status: mappedStatus,
    milestones: milestones.map((m: any, idx: number) => ({
      id: m.id || `m_${idx}`,
      title: m.title || '',
      completed: Boolean(m.completed),
      dueDate: m.dueDate || m.due_date,
    })),
    mentorId: row.mentor_id || row.mentorId,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapGoalToSupabase(goal: Partial<Goal>): Record<string, any> {
  const data: Record<string, any> = {};
  // Only supply id if it is a valid UUID format (PostgreSQL public.goals.id is type UUID)
  if (goal.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goal.id)) {
    data.id = goal.id;
  }
  if (goal.userId) {
    data.user_id = goal.userId;
  }
  if (goal.title !== undefined) {
    data.title = goal.title.trim();
  }

  // Embed category and milestones inside description for durable PostgreSQL persistence without extra columns
  const metaDescription = {
    category: goal.category || 'Career Growth',
    text: goal.description || '',
    milestones: Array.isArray(goal.milestones) ? goal.milestones : [],
  };
  data.description = JSON.stringify(metaDescription);

  if (goal.targetDate !== undefined) {
    data.target_date = goal.targetDate.split('T')[0];
  }
  if (goal.progress !== undefined) {
    data.progress = Math.max(0, Math.min(100, Math.round(Number(goal.progress) || 0)));
  }
  if (goal.status !== undefined) {
    // PostgreSQL goals_status_check allows: 'active', 'completed', 'paused'
    if (goal.status === 'completed') {
      data.status = 'completed';
    } else if ((goal.status as string) === 'paused') {
      data.status = 'paused';
    } else {
      data.status = 'active';
    }
  } else {
    data.status = 'active';
  }

  data.updated_at = new Date().toISOString();
  return data;
}

export function mapResourceFromSupabase(row: any): ExperienceResource {
  return {
    id: String(row.id),
    title: row.title || '',
    summary: row.summary || '',
    content: row.content || '',
    category: row.category || 'Career Advice',
    authorId: row.author_id || row.authorId || '',
    authorName: row.author_name || row.authorName || 'MentorNexus Contributor',
    authorTitle: row.author_title || row.authorTitle || 'Mentor',
    authorAvatar: row.author_avatar || row.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    readTimeMinutes: Number(row.read_time_minutes ?? row.readTimeMinutes ?? 5),
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? row.tags.split(',') : []),
    featured: Boolean(row.featured ?? row.is_featured ?? false),
    publishedAt: row.published_at || row.publishedAt || row.created_at || new Date().toISOString(),
  };
}

export function mapNotificationFromSupabase(row: any): AppNotification {
  return {
    id: String(row.id),
    userId: row.user_id || row.userId || '',
    title: row.title || 'Notification',
    message: row.message || '',
    type: row.type || row.category || 'system',
    read: Boolean(row.read ?? row.is_read ?? false),
    linkTab: row.link_tab || row.linkTab,
    linkId: row.link_id || row.linkId,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

// --- Supabase Direct Data Access Layer with Safe Error Handling ---

export const supabaseDb = {
  // PROFILES
  async getProfiles(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client.from('profiles').select('*');
    if (error) {
      console.warn('Supabase getProfiles notice:', error.message);
      return [];
    }
    return (data || []).map(row => mapProfileFromSupabase(row));
  },

  async getProfileById(id: string, fallbackEmail?: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured || !id) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) {
        console.warn('Supabase getProfileById notice:', error.message);
        return null;
      }
      return data ? mapProfileFromSupabase(data, fallbackEmail) : null;
    } catch (err) {
      console.warn('Supabase getProfileById error:', err);
      return null;
    }
  },

  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured || !email) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.from('profiles').select('*').limit(100);
      if (error || !data) return null;
      const match = data.find((r: any) => r.email && r.email.toLowerCase() === email.trim().toLowerCase());
      return match ? mapProfileFromSupabase(match, email) : null;
    } catch {
      return null;
    }
  },

  async upsertProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const payload = mapProfileToSupabase(profile);
    if (!payload.id) return null;

    let { data, error } = await client
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .maybeSingle();

    // Dynamically handle any schema cache missing column error from Supabase/PostgREST
    let attempts = 0;
    while (error && attempts < 5) {
      attempts++;
      const errStr = `${error.message || ''} ${(error as any).details || ''} ${(error as any).hint || ''}`;
      const match = errStr.match(/Could not find the '([^']+)' column/i) || errStr.match(/column "?([^"'\s]+)"? of relation/i);
      if (match && match[1] && match[1] in payload) {
        console.warn(`Supabase profiles table missing '${match[1]}' column in schema cache, retrying upsert without it...`);
        delete payload[match[1]];
        const retry = await client
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select('*')
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      } else {
        break;
      }
    }

    if (error) {
      console.warn('Supabase upsertProfile notice (attempting direct update/insert fallback):', error.message);
      // Try direct update if conflict constraint differs
      if (profile.id) {
        const { data: updateData, error: updateError } = await client
          .from('profiles')
          .update(payload)
          .eq('id', profile.id)
          .select('*')
          .maybeSingle();
        if (!updateError && updateData) return mapProfileFromSupabase(updateData, profile.email);

        // If row does not exist yet, try direct insert
        const { data: insertData, error: insertError } = await client
          .from('profiles')
          .insert(payload)
          .select('*')
          .maybeSingle();
        if (!insertError && insertData) return mapProfileFromSupabase(insertData, profile.email);
      }
      return null;
    }
    return data ? mapProfileFromSupabase(data, profile.email) : null;
  },

  async getMentors(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    // Query for mentors (checking both role and is_mentor)
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .or('role.eq.mentor,is_mentor.eq.true');

    if (error) {
      console.warn('Supabase getMentors query fallback:', error.message);
      const { data: allData } = await client.from('profiles').select('*');
      return (allData || [])
        .map(row => mapProfileFromSupabase(row))
        .filter(u => u.role === 'mentor' && !u.isBanned);
    }
    return (data || [])
      .map(row => mapProfileFromSupabase(row))
      .filter(u => !u.isBanned);
  },

  async getProfilesByRole(role?: string): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    let query = client.from('profiles').select('*');
    if (role && role !== 'all') {
      if (role === 'mentor' || role === 'mentors') {
        query = query.or('role.eq.mentor,is_mentor.eq.true');
      } else if (role === 'learner' || role === 'learners' || role === 'student' || role === 'students') {
        query = query.or('role.eq.student,role.eq.learner');
      } else if (role === 'early_career' || role === 'early-career') {
        query = query.eq('role', 'early_career');
      } else {
        query = query.eq('role', role);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase getProfilesByRole fallback:', error.message);
      const all = await this.getProfiles();
      if (!role || role === 'all') return all;
      if (role === 'mentor' || role === 'mentors') return all.filter(u => u.role === 'mentor');
      if (role === 'learner' || role === 'learners' || role === 'student' || role === 'students') return all.filter(u => u.role === 'student' || u.role === 'learner');
      if (role === 'early_career' || role === 'early-career') return all.filter(u => u.role === 'early_career');
      return all.filter(u => u.role === role);
    }
    return (data || []).map(row => mapProfileFromSupabase(row)).filter(u => !u.isBanned);
  },

  // MENTORSHIP REQUESTS
  async getRequests(userId: string): Promise<MentorshipRequest[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    // Filter for requests where user is requester (mentee) or mentor
    const { data, error } = await client
      .from('mentorship_requests')
      .select('*')
      .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`);

    if (error) {
      console.warn('Supabase getRequests notice:', error.message);
      return [];
    }

    const requests = (data || []).map(mapRequestFromSupabase);
    
    // Enrich with profile names and avatars
    try {
      const { data: profiles } = await client.from('profiles').select('id, full_name, avatar, avatar_url, title, role, profession');
      if (profiles && profiles.length > 0) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        for (const req of requests) {
          const reqProfile = profileMap.get(req.requesterId);
          if (reqProfile) {
            req.requesterName = reqProfile.full_name || req.requesterName;
            req.requesterAvatar = reqProfile.avatar_url || reqProfile.avatar || req.requesterAvatar;
            req.requesterTitle = reqProfile.profession || reqProfile.title || req.requesterTitle;
            req.requesterRole = reqProfile.role || req.requesterRole;
          }
          const mentorProfile = profileMap.get(req.mentorId);
          if (mentorProfile) {
            req.mentorName = mentorProfile.full_name || req.mentorName;
            req.mentorAvatar = mentorProfile.avatar_url || mentorProfile.avatar || req.mentorAvatar;
            req.mentorTitle = mentorProfile.profession || mentorProfile.title || req.mentorTitle;
          }
        }
      }
    } catch {
      // Enrichment is non-blocking
    }

    return requests;
  },

  async createRequest(req: Partial<MentorshipRequest>): Promise<MentorshipRequest | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    // Authoritative verification of authenticated caller from Supabase session
    let authenticatedId: string | null = null;
    let authUserEmail = '';
    let authUserFullName = '';
    let authUserRole = '';

    try {
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData?.session?.user) {
        authenticatedId = sessionData.session.user.id;
        authUserEmail = sessionData.session.user.email || '';
        authUserFullName = sessionData.session.user.user_metadata?.full_name || sessionData.session.user.user_metadata?.name || '';
        authUserRole = sessionData.session.user.user_metadata?.role || '';
      }
    } catch {}

    if (!authenticatedId) {
      const { data: authData } = await client.auth.getUser();
      if (authData?.user) {
        authenticatedId = authData.user.id;
        authUserEmail = authData.user.email || '';
        authUserFullName = authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || '';
        authUserRole = authData.user.user_metadata?.role || '';
      }
    }

    if (!authenticatedId) {
      authenticatedId = req.requesterId || null;
    }

    if (!authenticatedId) {
      throw new Error("You must be logged in to send a mentorship request.");
    }

    if (authenticatedId === req.mentorId) {
      throw new Error("You cannot request mentorship with your own profile.");
    }

    // Ensure requester profile exists in public.profiles before foreign key insertion
    try {
      const existingRequester = await this.getProfileById(authenticatedId);
      if (!existingRequester) {
        await this.upsertProfile({
          id: authenticatedId,
          email: authUserEmail || '',
          name: authUserFullName || req.requesterName || 'MentorNexus Member',
          role: (authUserRole as any) || req.requesterRole || 'student',
          title: req.requesterTitle || 'Learner / Aspiring Professional',
          avatar: req.requesterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        }).catch(() => {});
      }
    } catch {
      // Non-blocking
    }

    // Verify mentor profile exists in public.profiles
    if (req.mentorId) {
      const existingMentor = await this.getProfileById(req.mentorId);
      if (!existingMentor) {
        throw new Error("Selected mentor profile not found in active directory.");
      }
    }

    const payload = mapRequestToSupabase({
      ...req,
      requesterId: authenticatedId,
      status: 'pending',
    });

    let { data, error } = await client
      .from('mentorship_requests')
      .insert(payload)
      .select('*')
      .maybeSingle();

    // Dynamically handle any schema cache missing column error from Supabase/PostgREST
    let attempts = 0;
    while (error && attempts < 5) {
      attempts++;
      const errStr = `${error.message || ''} ${(error as any).details || ''} ${(error as any).hint || ''}`;
      const match = errStr.match(/Could not find the '([^']+)' column/i) || errStr.match(/column "?([^"'\s]+)"? of relation/i);
      if (match && match[1] && match[1] in payload) {
        console.warn(`Supabase mentorship_requests table missing '${match[1]}' column in schema cache, retrying insert without it...`);
        delete payload[match[1]];
        const retry = await client
          .from('mentorship_requests')
          .insert(payload)
          .select('*')
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      } else {
        break;
      }
    }

    if (error) {
      console.warn('Supabase client createRequest notice:', error.message);
      throw new Error(`Supabase request creation failed: ${error.message}`);
    }

    const createdReq = data ? mapRequestFromSupabase(data) : null;

    // Dispatch real in-app notification to the mentor
    if (createdReq && req.mentorId) {
      await this.createNotification({
        userId: req.mentorId,
        title: 'New Mentorship Request',
        message: `${req.requesterName || 'A member'} sent you a mentorship request.`,
        type: 'request_received',
        linkTab: 'requests',
      }).catch(() => {});
    }

    return createdReq;
  },

  async respondToRequest(id: string, status: 'accepted' | 'declined', responseNote?: string): Promise<MentorshipRequest | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const payload: Record<string, any> = {
      status,
      response_note: responseNote || '',
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await client
      .from('mentorship_requests')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error && (error.message.includes('response_note') || error.message.includes('column'))) {
      const fallbackPayload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };
      const retry = await client
        .from('mentorship_requests')
        .update(fallbackPayload)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase respondToRequest error:', error.message);
      throw new Error(`Supabase respond to request failed: ${error.message}`);
    }

    const updatedReq = data ? mapRequestFromSupabase(data) : null;

    // If accepted, also record in canonical connections table
    if (status === 'accepted' && updatedReq) {
      await this.createConnection({
        requestId: updatedReq.id,
        studentId: updatedReq.requesterId,
        mentorId: updatedReq.mentorId,
        focusAreas: updatedReq.goalsSummary ? [updatedReq.goalsSummary] : ['Career Growth'],
        status: 'active',
        notes: [`Connection established on ${new Date().toLocaleDateString()}`],
        connectedAt: new Date().toISOString(),
        startDate: new Date().toISOString(),
      }).catch(err => {
        console.warn('Connection creation notice on request accept:', err?.message);
      });

      // Dispatch notification to requester
      await this.createNotification({
        userId: updatedReq.requesterId,
        title: updatedReq.requestType === 'networking' ? 'Networking Request Accepted! 🤝' : 'Mentorship Request Accepted! 🎓',
        message: `${updatedReq.mentorName || 'Your connection'} accepted your request. You are now connected!`,
        type: 'request_accepted',
        linkTab: updatedReq.requestType === 'networking' ? 'discover' : 'connections',
      }).catch(() => {});
    } else if (status === 'declined' && updatedReq) {
      // Dispatch notification to requester
      await this.createNotification({
        userId: updatedReq.requesterId,
        title: updatedReq.requestType === 'networking' ? 'Networking Request Update' : 'Mentorship Request Update',
        message: `${updatedReq.mentorName || 'Member'} declined your request at this time.`,
        type: 'request_declined',
        linkTab: 'requests',
      }).catch(() => {});
    }

    return updatedReq;
  },

  async cancelRequest(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    const { error } = await client.from('mentorship_requests').delete().eq('id', id);
    if (error) {
      console.error('Supabase cancelRequest error:', error.message);
      throw new Error(`Supabase request cancellation failed: ${error.message}`);
    }
    return true;
  },

  // PROFESSIONAL NETWORKING & RELATIONSHIPS
  async getNetwork(userId: string): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    const connectedUserIds = new Set<string>();

    // 1. From network_relationships table
    try {
      const { data: netData, error: netErr } = await client
        .from('network_relationships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

      if (!netErr && netData) {
        for (const row of netData) {
          const p1 = row.requester_id;
          const p2 = row.recipient_id;
          if (p1 && p1 !== userId) connectedUserIds.add(p1);
          if (p2 && p2 !== userId) connectedUserIds.add(p2);
        }
      }
    } catch {}

    // 2. From connections table
    try {
      const { data, error } = await client
        .from('connections')
        .select('*')
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId},student_id.eq.${userId},mentor_id.eq.${userId},requester_id.eq.${userId}`);

      if (!error && data) {
        for (const row of data) {
          const p1 = row.user_id || row.student_id || row.requester_id;
          const p2 = row.connected_user_id || row.mentor_id;
          if (p1 && p1 !== userId) connectedUserIds.add(p1);
          if (p2 && p2 !== userId) connectedUserIds.add(p2);
        }
      }
    } catch {}

    // 3. From accepted mentorship requests
    try {
      const { data: reqData } = await client
        .from('mentorship_requests')
        .select('*')
        .eq('status', 'accepted')
        .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`);

      if (reqData) {
        for (const r of reqData) {
          const requesterId = r.mentee_id || r.requester_id;
          const targetId = r.mentor_id;
          if (requesterId && requesterId !== userId) connectedUserIds.add(requesterId);
          if (targetId && targetId !== userId) connectedUserIds.add(targetId);
        }
      }
    } catch {}

    if (connectedUserIds.size === 0) return [];

    try {
      const { data: profiles, error } = await client
        .from('profiles')
        .select('*')
        .in('id', Array.from(connectedUserIds));

      if (!error && profiles) {
        return profiles.map(row => mapProfileFromSupabase(row)).filter(u => !u.isBanned);
      }
    } catch {}

    return [];
  },

  async getNetworkingStatus(userId: string, targetUserId: string): Promise<'none' | 'pending' | 'connected'> {
    if (!isSupabaseConfigured || !userId || !targetUserId) return 'none';
    const client = getSupabaseClient();
    if (!client) return 'none';

    try {
      // Check network_relationships table
      const { data: netRel } = await client
        .from('network_relationships')
        .select('id, status, requester_id, recipient_id')
        .or(`and(requester_id.eq.${userId},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${userId})`)
        .limit(1)
        .maybeSingle();

      if (netRel) {
        if (netRel.status === 'accepted') return 'connected';
        if (netRel.status === 'pending') return 'pending';
      }

      // Check active connections
      const { data: conn } = await client
        .from('connections')
        .select('id, status')
        .or(`and(user_id.eq.${userId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${userId}),and(student_id.eq.${userId},mentor_id.eq.${targetUserId}),and(student_id.eq.${targetUserId},mentor_id.eq.${userId})`)
        .limit(1)
        .maybeSingle();

      if (conn && (conn.status === 'active' || conn.status === 'accepted')) return 'connected';

      // Check requests
      const { data: reqs } = await client
        .from('mentorship_requests')
        .select('id, status, mentee_id, mentor_id')
        .or(`and(mentee_id.eq.${userId},mentor_id.eq.${targetUserId}),and(mentee_id.eq.${targetUserId},mentor_id.eq.${userId})`)
        .limit(1)
        .maybeSingle();

      if (reqs) {
        if (reqs.status === 'accepted') return 'connected';
        if (reqs.status === 'pending') return 'pending';
      }
    } catch {}

    return 'none';
  },

  async sendNetworkingRequest(data: { requesterId: string; recipientId: string; note?: string }): Promise<any> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    // Get requester info
    let requesterName = 'Member';
    let requesterTitle = 'Professional';
    let requesterAvatar = '';
    let requesterRole = 'student';

    try {
      const { data: prof } = await client.from('profiles').select('*').eq('id', data.requesterId).maybeSingle();
      if (prof) {
        requesterName = prof.full_name || requesterName;
        requesterTitle = prof.profession || prof.title || requesterTitle;
        requesterAvatar = prof.avatar_url || prof.avatar || requesterAvatar;
        requesterRole = prof.role || requesterRole;
      }
    } catch {}

    // Get recipient info
    let recipientName = 'Member';
    try {
      const { data: rProf } = await client.from('profiles').select('full_name').eq('id', data.recipientId).maybeSingle();
      if (rProf) recipientName = rProf.full_name || recipientName;
    } catch {}

    // Try inserting into network_relationships table
    let createdRel: any = null;
    try {
      const { data: insertedNet, error: netErr } = await client
        .from('network_relationships')
        .insert({
          requester_id: data.requesterId,
          recipient_id: data.recipientId,
          status: 'pending',
          note: data.note || `Hi ${recipientName}, I would love to connect and add you to my professional network.`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .maybeSingle();

      if (!netErr && insertedNet) {
        createdRel = insertedNet;
      }
    } catch {}

    // Also mirror to mentorship_requests table for full platform request notifications & cross-version compatibility
    const payload: Record<string, any> = {
      mentee_id: data.requesterId,
      mentor_id: data.recipientId,
      status: 'pending',
      message: data.note || `Hi ${recipientName}, I would love to connect and add you to my professional network on MentorNexus.`,
      focus_area: 'Networking & Connection',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let createdReq: any = null;
    const { data: inserted } = await client
      .from('mentorship_requests')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (inserted) {
      createdReq = inserted;
    }

    // Dispatch real-time notification to recipient
    await this.createNotification({
      userId: data.recipientId,
      title: 'New Networking Connection Request! 🤝',
      message: `${requesterName} wants to add you to their professional network.`,
      type: 'request_received',
      linkTab: 'requests',
    }).catch(() => {});

    return createdRel || createdReq || {
      id: `req_net_${Date.now()}`,
      requesterId: data.requesterId,
      recipientId: data.recipientId,
      mentorId: data.recipientId,
      status: 'pending',
    };
  },

  // CONNECTIONS (Supports canonical 'connections' table and accepted requests)
  async getConnections(userId: string): Promise<MentorshipConnection[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    const connectionList: MentorshipConnection[] = [];
    const seenPairs = new Set<string>();

    // 1. Try 'connections' table
    try {
      const { data, error } = await client
        .from('connections')
        .select('*')
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId},student_id.eq.${userId},mentor_id.eq.${userId},requester_id.eq.${userId}`);

      if (!error && data) {
        for (const row of data) {
          const conn = mapConnectionFromSupabase(row);
          const pairKey = [conn.studentId, conn.mentorId].sort().join(':');
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            connectionList.push(conn);
          }
        }
      }
    } catch {}

    // 2. Include accepted mentorship requests as active connections
    try {
      const { data: reqData, error: reqError } = await client
        .from('mentorship_requests')
        .select('*')
        .eq('status', 'accepted')
        .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`);

      if (!reqError && reqData) {
        for (const r of reqData) {
          const studentId = r.mentee_id || r.requester_id || '';
          const mentorId = r.mentor_id || '';
          if (studentId && mentorId) {
            const pairKey = [studentId, mentorId].sort().join(':');
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              const connId = `conn_${r.id}`;
              const cachedM = getCachedMeetings(connId) || getCachedMeetings(String(r.id));
              connectionList.push({
                id: connId,
                requestId: String(r.id),
                studentId,
                studentName: r.requester_name || '',
                studentTitle: r.requester_title || '',
                studentAvatar: r.requester_avatar || '',
                mentorId,
                mentorName: r.mentor_name || '',
                mentorTitle: r.mentor_title || '',
                mentorAvatar: r.mentor_avatar || '',
                focusAreas: r.focus_area ? [r.focus_area] : ['Career Growth'],
                status: 'active',
                notes: r.response_note ? [r.response_note] : [],
                meetings: cachedM || [],
                connectedAt: r.updated_at || r.created_at || new Date().toISOString(),
                startDate: r.updated_at || r.created_at || new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch {}

    // 3. Enrich connections with real profile details and merge with server store
    try {
      const { data: profiles } = await client.from('profiles').select('id, full_name, avatar, avatar_url, title, profession, role, organization');
      if (profiles && profiles.length > 0) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        for (const conn of connectionList) {
          const studentProfile = profileMap.get(conn.studentId);
          if (studentProfile) {
            conn.studentName = studentProfile.full_name || conn.studentName || 'Learner';
            conn.studentAvatar = studentProfile.avatar_url || studentProfile.avatar || conn.studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';
            conn.studentTitle = studentProfile.profession || studentProfile.title || conn.studentTitle || 'Aspiring Professional';
          }
          const mentorProfile = profileMap.get(conn.mentorId);
          if (mentorProfile) {
            conn.mentorName = mentorProfile.full_name || conn.mentorName || 'Industry Mentor';
            conn.mentorAvatar = mentorProfile.avatar_url || mentorProfile.avatar || conn.mentorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300';
            conn.mentorTitle = mentorProfile.profession || mentorProfile.title || conn.mentorTitle || 'Senior Practitioner';
          }
        }
      }
    } catch {
      // Non-blocking enrichment
    }

    // 4. Merge server connections for meetings and local notes
    try {
      const serverRes = await fetch(`/api/connections?userId=${encodeURIComponent(userId)}`).then(r => r.ok ? r.json() : []).catch(() => []);
      if (Array.isArray(serverRes) && serverRes.length > 0) {
        const serverMap = new Map(serverRes.map(sc => [sc.id, sc]));
        for (const conn of connectionList) {
          const sc = serverMap.get(conn.id) || 
                     serverMap.get(`conn_${conn.requestId}`) || 
                     serverMap.get(conn.requestId || '') ||
                     serverRes.find(s => 
                       (s.studentId === conn.studentId && s.mentorId === conn.mentorId) ||
                       (s.studentId === conn.mentorId && s.mentorId === conn.studentId)
                     );

          if (sc) {
            // Merge meetings safely using meeting ID map
            const meetingMap = new Map<string, MentorshipMeeting>();
            (conn.meetings || []).forEach(m => meetingMap.set(m.id, m));
            (sc.meetings || []).forEach(m => meetingMap.set(m.id, m));
            const cachedM = getCachedMeetings(conn.id) || (conn.requestId ? getCachedMeetings(conn.requestId) : []);
            cachedM.forEach(m => meetingMap.set(m.id, m));

            conn.meetings = Array.from(meetingMap.values());
            if (conn.meetings.length > 0) {
              setCachedMeetings(conn.id, conn.meetings);
              if (conn.requestId) setCachedMeetings(conn.requestId, conn.meetings);
            }

            if (sc.nextMeetingDate && !conn.nextMeetingDate) {
              conn.nextMeetingDate = sc.nextMeetingDate;
            }
          } else {
            const cachedM = getCachedMeetings(conn.id) || (conn.requestId ? getCachedMeetings(conn.requestId) : []);
            if (cachedM.length > 0) {
              conn.meetings = cachedM;
            }
          }
        }
        for (const sc of serverRes) {
          const pairKey = [sc.studentId, sc.mentorId].sort().join(':');
          if (!seenPairs.has(pairKey) && (sc.studentId === userId || sc.mentorId === userId)) {
            seenPairs.add(pairKey);
            connectionList.push(sc);
          }
        }
      }
    } catch {}

    return connectionList;
  },

  async createConnection(conn: Partial<MentorshipConnection>): Promise<MentorshipConnection | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    // Check if an active connection already exists between these users
    const existing = await this.getConnections(conn.studentId || '');
    const alreadyConnected = existing.find(
      c => (c.studentId === conn.studentId && c.mentorId === conn.mentorId) ||
           (c.studentId === conn.mentorId && c.mentorId === conn.studentId)
    );
    if (alreadyConnected) {
      return alreadyConnected;
    }

    const payload: Record<string, any> = {
      student_id: conn.studentId,
      requester_id: conn.studentId,
      user_id: conn.studentId,
      mentor_id: conn.mentorId,
      connected_user_id: conn.mentorId,
      request_id: conn.requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conn.requestId) ? conn.requestId : undefined,
      status: conn.status || 'active',
      cadence: 'Bi-weekly 1:1',
      notes: conn.notes && conn.notes.length > 0 ? (Array.isArray(conn.notes) ? conn.notes.join('\n') : conn.notes) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (conn.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conn.id)) {
      payload.id = conn.id;
    }

    let insertResult = await client.from('connections').insert(payload).select('*').maybeSingle();

    if (insertResult.error) {
      console.warn('Supabase createConnection notice:', insertResult.error.message);
    }

    return insertResult.data ? mapConnectionFromSupabase(insertResult.data) : {
      id: conn.id || `conn_${Date.now()}`,
      requestId: conn.requestId || '',
      studentId: conn.studentId || '',
      studentName: conn.studentName || 'Learner',
      studentAvatar: conn.studentAvatar || '',
      studentTitle: conn.studentTitle || '',
      mentorId: conn.mentorId || '',
      mentorName: conn.mentorName || 'Mentor',
      mentorAvatar: conn.mentorAvatar || '',
      mentorTitle: conn.mentorTitle || '',
      focusAreas: conn.focusAreas || ['Career Growth'],
      status: 'active',
      notes: conn.notes || [],
      connectedAt: new Date().toISOString(),
      startDate: new Date().toISOString(),
    };
  },

  async updateConnection(id: string, updates: Partial<MentorshipConnection>): Promise<MentorshipConnection | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.notes !== undefined) {
      payload.notes = Array.isArray(updates.notes) ? updates.notes.join('\n') : updates.notes;
    }
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.lastMeetingDate !== undefined) payload.last_activity = updates.lastMeetingDate;
    if (updates.nextMeetingDate !== undefined) payload.next_session_date = updates.nextMeetingDate;

    // Cache meetings locally for persistent instant access
    if (updates.meetings !== undefined) {
      setCachedMeetings(id, updates.meetings);
      const isConnPrefix = id.startsWith('conn_');
      const rawReqId = isConnPrefix ? id.replace('conn_', '') : null;
      if (rawReqId) {
        setCachedMeetings(rawReqId, updates.meetings);
        setCachedMeetings(`conn_${rawReqId}`, updates.meetings);
      }
    }

    let updatedData: any = null;
    const isConnPrefix = id.startsWith('conn_');
    const rawReqId = isConnPrefix ? id.replace('conn_', '') : null;

    try {
      if (!isConnPrefix) {
        const res = await client.from('connections').update(payload).eq('id', id).select('*').maybeSingle();
        if (!res.error && res.data) updatedData = res.data;
      }

      if (!updatedData && rawReqId) {
        const res = await client.from('connections').update(payload).eq('request_id', rawReqId).select('*').maybeSingle();
        if (!res.error && res.data) updatedData = res.data;
      }

      // Also persist to mentorship_requests response note if present
      if (rawReqId || id) {
        const targetReqId = rawReqId || id;
        try {
          await client.from('mentorship_requests').update({
            response_note: payload.notes || undefined,
            updated_at: new Date().toISOString(),
          }).eq('id', targetReqId);
        } catch {}
      }
    } catch (err: any) {
      console.warn('Supabase updateConnection notice:', err?.message);
    }

    // Also sync to server store
    try {
      await fetch(`/api/connections/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {}

    if (updatedData) {
      const mapped = mapConnectionFromSupabase(updatedData);
      if (updates.meetings !== undefined) {
        mapped.meetings = updates.meetings;
      } else if (!mapped.meetings || mapped.meetings.length === 0) {
        mapped.meetings = getCachedMeetings(id) || [];
      }
      return mapped;
    }

    return {
      id,
      requestId: rawReqId || id,
      studentId: updates.studentId || '',
      studentName: updates.studentName || 'Learner',
      studentAvatar: updates.studentAvatar || '',
      studentTitle: updates.studentTitle || '',
      mentorId: updates.mentorId || '',
      mentorName: updates.mentorName || 'Mentor',
      mentorAvatar: updates.mentorAvatar || '',
      mentorTitle: updates.mentorTitle || '',
      focusAreas: updates.focusAreas || ['Career Growth'],
      status: (updates.status as any) || 'active',
      notes: Array.isArray(updates.notes) ? updates.notes : (updates.notes ? [updates.notes] : []),
      meetings: updates.meetings !== undefined ? updates.meetings : (getCachedMeetings(id) || []),
      lastMeetingDate: updates.lastMeetingDate,
      nextMeetingDate: updates.nextMeetingDate,
    };
  },

  async getConnectionById(id: string): Promise<MentorshipConnection | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const isConnPrefix = id.startsWith('conn_');
    const rawReqId = isConnPrefix ? id.replace('conn_', '') : null;

    // 1. Try Supabase connections
    try {
      if (!isConnPrefix) {
        const { data, error } = await client.from('connections').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const conn = mapConnectionFromSupabase(data);
          const cachedM = getCachedMeetings(conn.id) || (conn.requestId ? getCachedMeetings(conn.requestId) : []);
          if ((!conn.meetings || conn.meetings.length === 0) && cachedM.length > 0) {
            conn.meetings = cachedM;
          }
          return conn;
        }
      }

      if (rawReqId) {
        const { data, error } = await client.from('connections').select('*').eq('request_id', rawReqId).maybeSingle();
        if (!error && data) {
          const conn = mapConnectionFromSupabase(data);
          const cachedM = getCachedMeetings(conn.id) || (conn.requestId ? getCachedMeetings(conn.requestId) : []);
          if ((!conn.meetings || conn.meetings.length === 0) && cachedM.length > 0) {
            conn.meetings = cachedM;
          }
          return conn;
        }
      }
    } catch {}

    // 2. Try mentorship_requests if id corresponds to accepted request
    try {
      const targetReqId = rawReqId || id;
      const { data: req, error: reqErr } = await client.from('mentorship_requests').select('*').eq('id', targetReqId).maybeSingle();
      if (!reqErr && req) {
        const studentId = req.mentee_id || req.requester_id || '';
        const mentorId = req.mentor_id || '';
        const cachedM = getCachedMeetings(id) || (rawReqId ? getCachedMeetings(rawReqId) : []);
        return {
          id: `conn_${req.id}`,
          requestId: String(req.id),
          studentId,
          studentName: req.requester_name || '',
          studentTitle: req.requester_title || '',
          studentAvatar: req.requester_avatar || '',
          mentorId,
          mentorName: req.mentor_name || '',
          mentorTitle: req.mentor_title || '',
          mentorAvatar: req.mentor_avatar || '',
          focusAreas: req.focus_area ? [req.focus_area] : ['Career Growth'],
          status: 'active',
          notes: req.response_note ? [req.response_note] : [],
          meetings: cachedM,
          connectedAt: req.updated_at || req.created_at || new Date().toISOString(),
        };
      }
    } catch {}

    return null;
  },

  // 1:1 MESSAGES & VOICE NOTES (Persisted in canonical store & Supabase)
  async getMessages(connectionId: string): Promise<ChatMessage[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    let messages: ChatMessage[] = [];

    // 1. Try Supabase 'messages' table
    try {
      const { data, error } = await client
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        messages = data.map(mapMessageFromSupabase);
      }
    } catch {
      // Non-blocking
    }

    // 2. Fetch/merge from persistent server store
    try {
      const res = await fetch(`/api/messages?connectionId=${encodeURIComponent(connectionId)}`);
      if (res.ok) {
        const serverMsgs = await res.json();
        if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
          const existingIds = new Set(messages.map(m => m.id));
          for (const sm of serverMsgs) {
            const mappedId = String(sm.id);
            if (!existingIds.has(mappedId)) {
              existingIds.add(mappedId);
              messages.push({
                id: mappedId,
                connectionId: sm.connectionId || sm.connection_id || connectionId,
                senderId: sm.senderId || sm.sender_id || '',
                senderName: sm.senderName || sm.sender_name || 'Member',
                senderAvatar: sm.senderAvatar || sm.sender_avatar,
                content: sm.content || '',
                messageType: sm.messageType || sm.message_type || 'text',
                voiceUrl: sm.voiceUrl || sm.voice_url,
                createdAt: sm.createdAt || sm.created_at || new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch {
      // Fallback
    }

    // Sort chronologically
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Enrich with sender details from public.profiles
    try {
      const senderIds = Array.from(new Set(messages.map(m => m.senderId).filter(Boolean)));
      if (senderIds.length > 0) {
        const { data: profiles } = await client.from('profiles').select('id, full_name, avatar, avatar_url').in('id', senderIds);
        if (profiles && profiles.length > 0) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          for (const m of messages) {
            const prof = profileMap.get(m.senderId);
            if (prof) {
              m.senderName = prof.full_name || m.senderName;
              m.senderAvatar = prof.avatar_url || prof.avatar || m.senderAvatar;
            }
          }
        }
      }
    } catch {
      // Non-blocking enrichment
    }

    return messages;
  },

  async sendMessage(msg: { 
    connectionId: string; 
    content: string; 
    messageType?: 'text' | 'voice' | 'file'; 
    voiceUrl?: string;
    replyToId?: string;
    replyToContent?: string;
    replyToSenderName?: string;
  }): Promise<ChatMessage | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    let currentUserId: string | null = null;
    let currentUserName = '';
    let currentUserAvatar = '';

    try {
      const { data: authData } = await client.auth.getUser();
      currentUserId = authData?.user?.id || null;
      if (authData?.user) {
        currentUserName = authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || '';
        currentUserAvatar = authData.user.user_metadata?.avatar_url || '';
      }
    } catch {}

    if (!currentUserId) {
      const { data: sessionData } = await client.auth.getSession();
      currentUserId = sessionData?.session?.user?.id || null;
    }

    if (!currentUserId) {
      throw new Error('You must be logged in to send a message.');
    }

    // Lookup real profile details
    try {
      const { data: prof } = await client.from('profiles').select('full_name, avatar_url, avatar').eq('id', currentUserId).maybeSingle();
      if (prof) {
        if (prof.full_name) currentUserName = prof.full_name;
        if (prof.avatar_url || prof.avatar) currentUserAvatar = prof.avatar_url || prof.avatar;
      }
    } catch {}

    // Prepare content with reply prefix if replying to another message
    let serializedContent = msg.content || (msg.messageType === 'voice' ? '🎤 Voice note' : '');
    if (msg.replyToId && msg.replyToContent) {
      const replyHeader = `__REPLY__:${JSON.stringify({ id: msg.replyToId, content: msg.replyToContent, senderName: msg.replyToSenderName || 'Member' })}\n`;
      serializedContent = `${replyHeader}${serializedContent}`;
    }

    const payload: Record<string, any> = {
      connection_id: msg.connectionId,
      sender_id: currentUserId,
      content: serializedContent,
      message_type: msg.messageType || 'text',
      voice_url: msg.voiceUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let createdMessage: ChatMessage | null = null;

    // 1. Try Supabase 'messages' table
    try {
      const { data, error } = await client
        .from('messages')
        .insert(payload)
        .select('*')
        .maybeSingle();

      if (!error && data) {
        createdMessage = mapMessageFromSupabase(data);
        createdMessage.senderName = currentUserName || createdMessage.senderName;
        createdMessage.senderAvatar = currentUserAvatar || createdMessage.senderAvatar;
        if (msg.replyToId) {
          createdMessage.replyToId = msg.replyToId;
          createdMessage.replyToContent = msg.replyToContent;
          createdMessage.replyToSenderName = msg.replyToSenderName;
        }
      }
    } catch {
      // Proceed to server persistence
    }

    // 2. Persist to server /api/messages for guaranteed durable cross-device storage
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: msg.connectionId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderAvatar: currentUserAvatar,
          content: serializedContent,
          messageType: msg.messageType || 'text',
          voiceUrl: msg.voiceUrl,
          replyToId: msg.replyToId,
          replyToContent: msg.replyToContent,
          replyToSenderName: msg.replyToSenderName,
        }),
      });

      if (res.ok) {
        const serverMsg = await res.json();
        if (!createdMessage && serverMsg) {
          createdMessage = {
            id: String(serverMsg.id),
            connectionId: serverMsg.connectionId || msg.connectionId,
            senderId: serverMsg.senderId || currentUserId,
            senderName: serverMsg.senderName || currentUserName || 'Member',
            senderAvatar: serverMsg.senderAvatar || currentUserAvatar,
            content: msg.content || serverMsg.content,
            messageType: serverMsg.messageType || 'text',
            voiceUrl: serverMsg.voiceUrl,
            replyToId: msg.replyToId || serverMsg.replyToId,
            replyToContent: msg.replyToContent || serverMsg.replyToContent,
            replyToSenderName: msg.replyToSenderName || serverMsg.replyToSenderName,
            createdAt: serverMsg.createdAt || new Date().toISOString(),
          };
        }
      }
    } catch (err: any) {
      if (!createdMessage) {
        throw new Error(err.message || 'Failed to persist message');
      }
    }

    if (!createdMessage) {
      throw new Error('Message could not be persisted');
    }

    // Update connection last_activity in Supabase if supported
    try {
      await client
        .from('connections')
        .update({ last_activity: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', msg.connectionId);
    } catch {}

    // Dispatch real in-app notification to the other connection participant
    try {
      const connection = await this.getConnectionById(msg.connectionId);
      if (connection) {
        const recipientId = connection.studentId === currentUserId ? connection.mentorId : connection.studentId;
        if (recipientId && recipientId !== currentUserId) {
          const previewText = msg.messageType === 'voice' 
            ? '🎤 Sent a voice note' 
            : (msg.content.length > 50 ? `${msg.content.slice(0, 50)}...` : msg.content);

          await this.createNotification({
            userId: recipientId,
            title: `New message from ${currentUserName || 'Connection'}`,
            message: previewText,
            type: 'message',
            linkTab: 'connections',
          }).catch(() => {});
        }
      }
    } catch {}

    return createdMessage;
  },

  async deleteMessage(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('messages').delete().eq('id', id);
        } catch (err) {
          console.warn('Supabase delete message notice:', err);
        }
      }
    }
    try {
      await fetch(`/api/messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {}
    return true;
  },

  subscribeToMessages(
    connectionId: string, 
    onMessage: (msg: ChatMessage) => void,
    onDelete?: (deletedId: string) => void
  ): () => void {
    if (!isSupabaseConfigured) return () => {};
    const client = getSupabaseClient();
    let channel: any = null;

    if (client) {
      try {
        channel = client
          .channel(`messages:${connectionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `connection_id=eq.${connectionId}`,
            },
            (payload) => {
              if (payload.new) {
                onMessage(mapMessageFromSupabase(payload.new));
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'messages',
            },
            (payload) => {
              const deletedId = (payload.old as any)?.id || (payload.new as any)?.id;
              if (deletedId && onDelete) {
                onDelete(String(deletedId));
              }
            }
          )
          .subscribe();
      } catch {}
    }

    // Safe background revalidation polling for instant real-time sync between users
    let knownMessageIds = new Set<string>();
    let hasPolledOnce = false;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?connectionId=${encodeURIComponent(connectionId)}`);
        if (res.ok) {
          const msgs = await res.json();
          if (Array.isArray(msgs)) {
            const currentIds = new Set(msgs.map(m => String(m.id)));

            if (hasPolledOnce && onDelete) {
              for (const prevId of Array.from(knownMessageIds)) {
                if (!currentIds.has(prevId)) {
                  onDelete(prevId);
                  knownMessageIds.delete(prevId);
                }
              }
            }

            for (const sm of msgs) {
              const smId = String(sm.id);
              if (!knownMessageIds.has(smId)) {
                knownMessageIds.add(smId);
                if (hasPolledOnce) {
                  onMessage({
                    id: smId,
                    connectionId: sm.connectionId || connectionId,
                    senderId: sm.senderId || '',
                    senderName: sm.senderName || '',
                    senderAvatar: sm.senderAvatar,
                    content: sm.content || '',
                    messageType: sm.messageType || 'text',
                    voiceUrl: sm.voiceUrl,
                    replyToId: sm.replyToId,
                    replyToContent: sm.replyToContent,
                    replyToSenderName: sm.replyToSenderName,
                    createdAt: sm.createdAt || new Date().toISOString(),
                  });
                }
              }
            }
            hasPolledOnce = true;
          }
        }
      } catch {}
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  },

  // GOALS
  async getGoals(userId: string): Promise<Goal[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase getGoals notice:', error.message);
      return [];
    }
    return (data || []).map(mapGoalFromSupabase);
  },

  async createGoal(goal: Partial<Goal>): Promise<Goal | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const payload = mapGoalToSupabase(goal);

    let { data, error } = await client
      .from('goals')
      .insert(payload)
      .select('*')
      .maybeSingle();

    // Dynamically handle any schema cache missing column error from Supabase/PostgREST
    let attempts = 0;
    while (error && attempts < 5) {
      attempts++;
      const errStr = `${error.message || ''} ${(error as any).details || ''} ${(error as any).hint || ''}`;
      const match = errStr.match(/Could not find the '([^']+)' column/i) || errStr.match(/column "?([^"'\s]+)"? of relation/i);
      if (match && match[1] && match[1] in payload) {
        console.warn(`Supabase goals table missing '${match[1]}' column in schema cache, retrying insert without it...`);
        delete payload[match[1]];
        const retry = await client
          .from('goals')
          .insert(payload)
          .select('*')
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      } else if (errStr.toLowerCase().includes('category') && 'category' in payload) {
        console.warn('Supabase goals table missing category column, retrying insert without category...');
        delete payload.category;
        const retry = await client
          .from('goals')
          .insert(payload)
          .select('*')
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      } else {
        break;
      }
    }

    if (error) {
      console.error('Supabase createGoal error:', error.message, error.details || '', error.hint || '');
      throw new Error(`Supabase goal creation failed: ${error.message}`);
    }

    if (data) {
      const result = mapGoalFromSupabase(data);
      if (!result.category && goal.category) {
        result.category = goal.category;
      }
      return result;
    }
    return null;
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const payload: Record<string, any> = {
      ...mapGoalToSupabase(updates),
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await client
      .from('goals')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    // Dynamically handle any schema cache missing column error from Supabase/PostgREST
    let attempts = 0;
    while (error && attempts < 5) {
      attempts++;
      const errStr = `${error.message || ''} ${(error as any).details || ''} ${(error as any).hint || ''}`;
      const match = errStr.match(/Could not find the '([^']+)' column/i) || errStr.match(/column "?([^"'\s]+)"? of relation/i);
      if (match && match[1] && match[1] in payload) {
        console.warn(`Supabase goals table missing '${match[1]}' column in schema cache, retrying update without it...`);
        delete payload[match[1]];
        const retry = await client
          .from('goals')
          .update(payload)
          .eq('id', id)
          .select('*')
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      } else if (errStr.toLowerCase().includes('category') && 'category' in payload) {
        console.warn('Supabase goals table missing category column, retrying update without category...');
        delete payload.category;
        const retry = await client
          .from('goals')
          .update(payload)
          .eq('id', id)
          .select('*')
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      } else {
        break;
      }
    }

    if (error) {
      console.error('Supabase updateGoal error:', error.message);
      throw new Error(`Supabase goal update failed: ${error.message}`);
    }
    return data ? mapGoalFromSupabase(data) : null;
  },

  async deleteGoal(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !id) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    // Only invoke Supabase if id is a valid UUID format (PostgreSQL goals.id is UUID)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      try {
        const { error } = await client.from('goals').delete().eq('id', id);
        if (error) {
          console.warn('Supabase deleteGoal notice:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase deleteGoal error:', err?.message || err);
      }
    }
    return true;
  },

  // EXPERIENCE LIBRARY (Supports both 'experience_library' and 'experience_resources')
  async getExperienceResources(params?: { category?: string; search?: string; featured?: boolean }): Promise<ExperienceResource[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    let data: any[] = [];
    let query = client.from('experience_library').select('*');
    if (params?.category && params.category !== 'All') query = query.eq('category', params.category);
    if (params?.featured) query = query.eq('featured', true);

    const result = await query;
    if (!result.error && result.data) {
      data = result.data;
    } else {
      let resQuery = client.from('experience_resources').select('*');
      if (params?.category && params.category !== 'All') resQuery = resQuery.eq('category', params.category);
      if (params?.featured) resQuery = resQuery.eq('is_featured', true);
      const resResult = await resQuery;
      if (!resResult.error && resResult.data) {
        data = resResult.data;
      }
    }

    let items = (data || []).map(mapResourceFromSupabase);
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase();
      items = items.filter(r => 
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q)) ||
        r.authorName.toLowerCase().includes(q)
      );
    }
    return items;
  },

  async createExperienceResource(resource: Partial<ExperienceResource>): Promise<ExperienceResource | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const payload: Record<string, any> = {
      title: resource.title,
      summary: resource.summary,
      content: resource.content,
      category: resource.category || 'Career',
      author_id: resource.authorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.authorId) ? resource.authorId : null,
      read_time_minutes: resource.readTimeMinutes || 5,
      tags: resource.tags || [],
      is_featured: Boolean(resource.featured),
      featured: Boolean(resource.featured),
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (resource.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id)) {
      payload.id = resource.id;
    }

    let { data, error } = await client.from('experience_library').insert(payload).select('*').maybeSingle();
    if (error) {
      const resPayload = {
        title: resource.title,
        summary: resource.summary,
        content: resource.content,
        category: resource.category || 'Career',
        author_id: payload.author_id,
        read_time_minutes: payload.read_time_minutes,
        tags: payload.tags,
        is_featured: payload.is_featured,
        created_at: payload.created_at,
      };
      const resResult = await client.from('experience_resources').insert(resPayload).select('*').maybeSingle();
      data = resResult.data;
      error = resResult.error;
    }

    if (error) {
      console.error('Supabase createExperienceResource error:', error.message);
      throw new Error(`Supabase experience resource creation failed: ${error.message}`);
    }
    return data ? mapResourceFromSupabase(data) : null;
  },

  async updateExperienceResource(id: string, updates: Partial<ExperienceResource>): Promise<ExperienceResource | null> {
    if (!isSupabaseConfigured) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const payload: Record<string, any> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.summary !== undefined) payload.summary = updates.summary;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.featured !== undefined) {
      payload.featured = updates.featured;
      payload.is_featured = updates.featured;
    }
    payload.updated_at = new Date().toISOString();

    let { data, error } = await client.from('experience_library').update(payload).eq('id', id).select('*').maybeSingle();
    if (error) {
      const resResult = await client.from('experience_resources').update(payload).eq('id', id).select('*').maybeSingle();
      data = resResult.data;
      error = resResult.error;
    }

    if (error) {
      console.error('Supabase updateExperienceResource error:', error.message);
      throw new Error(`Supabase experience resource update failed: ${error.message}`);
    }
    return data ? mapResourceFromSupabase(data) : null;
  },

  async deleteExperienceResource(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    let { error } = await client.from('experience_library').delete().eq('id', id);
    if (error) {
      const resResult = await client.from('experience_resources').delete().eq('id', id);
      error = resResult.error;
    }

    if (error) {
      console.error('Supabase deleteExperienceResource error:', error.message);
      throw new Error(`Supabase experience resource deletion failed: ${error.message}`);
    }
    return true;
  },

  async deleteResource(id: string): Promise<boolean> {
    return this.deleteExperienceResource(id);
  },

  // NOTIFICATIONS
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const list: AppNotification[] = [];
    const seen = new Set<string>();

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            for (const row of data) {
              const notif = mapNotificationFromSupabase(row);
              const key = `${notif.title}_${notif.message}`;
              if (!seen.has(key)) {
                seen.add(key);
                list.push(notif);
              }
            }
          }
        } catch (err: any) {
          console.warn('Supabase getNotifications notice:', err?.message);
        }
      }
    }

    // Also fetch from server endpoint and merge
    try {
      const serverNotifs = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`).then(r => r.ok ? r.json() : []).catch(() => []);
      if (Array.isArray(serverNotifs)) {
        for (const n of serverNotifs) {
          const key = `${n.title}_${n.message}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              id: String(n.id),
              userId: n.userId,
              title: n.title,
              message: n.message,
              type: n.type || 'system',
              read: Boolean(n.read),
              linkTab: n.linkTab,
              linkId: n.linkId,
              createdAt: n.createdAt || new Date().toISOString(),
            });
          }
        }
      }
    } catch {}

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  },

  async markNotificationRead(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    const { error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Supabase markNotificationRead error:', error.message);
      throw new Error(`Supabase notification update failed: ${error.message}`);
    }
    return true;
  },

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    const { error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase markAllNotificationsRead error:', error.message);
      throw new Error(`Supabase mark all notifications read failed: ${error.message}`);
    }
    return true;
  },

  async createNotification(notification: Partial<AppNotification>): Promise<AppNotification | null> {
    if (!isSupabaseConfigured || !notification.userId) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const payload: Record<string, any> = {
      user_id: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'system',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (notification.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notification.id)) {
      payload.id = notification.id;
    }

    if (notification.linkTab) {
      payload.link_tab = notification.linkTab;
    }

    let { data, error } = await client
      .from('notifications')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error && error.message.includes('link_tab')) {
      delete payload.link_tab;
      const retry = await client
        .from('notifications')
        .insert(payload)
        .select('*')
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn('Supabase createNotification notice:', error.message);
    }

    // Sync to server storage
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'system',
          linkTab: notification.linkTab,
          linkId: notification.linkId,
        }),
      });
    } catch {}

    return data ? mapNotificationFromSupabase(data) : {
      id: notification.id || `notif_${Date.now()}`,
      userId: notification.userId,
      title: notification.title || 'Notification',
      message: notification.message || '',
      type: notification.type || 'system',
      read: false,
      linkTab: notification.linkTab,
      linkId: notification.linkId,
      createdAt: new Date().toISOString(),
    };
  },

  subscribeToNotifications(
    userId: string,
    onNotification: (notif: AppNotification) => void
  ): () => void {
    if (!userId) return () => {};

    const client = getSupabaseClient();
    let channel: any = null;

    if (client) {
      try {
        channel = client
          .channel(`notifications:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (payload.new) {
                onNotification(mapNotificationFromSupabase(payload.new));
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime notifications channel notice:', err);
      }
    }

    let knownIds = new Set<string>();
    let hasPolledOnce = false;

    const pollInterval = setInterval(async () => {
      try {
        const notifs = await this.getNotifications(userId);
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
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  },

  async deleteConnection(id: string, peerUserId?: string, currentUserId?: string): Promise<boolean> {
    const isConnPrefix = id.startsWith('conn_');
    const isNetPrefix = id.startsWith('net_');
    const rawReqId = isConnPrefix ? id.replace('conn_', '') : (isNetPrefix ? id.replace('net_', '') : id);

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('connections').delete().or(`id.eq.${id},id.eq.${rawReqId},request_id.eq.${rawReqId}`);
          await client.from('network_relationships').delete().or(`id.eq.${id},id.eq.${rawReqId}`);
          await client.from('mentorship_requests').update({ status: 'cancelled' }).or(`id.eq.${rawReqId},id.eq.${id}`);
          await client.from('mentorship_requests').delete().or(`id.eq.${rawReqId},id.eq.${id}`);

          if (peerUserId && currentUserId) {
            await client.from('connections').delete().or(
              `and(user_id.eq.${currentUserId},connected_user_id.eq.${peerUserId}),and(user_id.eq.${peerUserId},connected_user_id.eq.${currentUserId}),and(student_id.eq.${currentUserId},mentor_id.eq.${peerUserId}),and(student_id.eq.${peerUserId},mentor_id.eq.${currentUserId})`
            );
            await client.from('network_relationships').delete().or(
              `and(requester_id.eq.${currentUserId},recipient_id.eq.${peerUserId}),and(requester_id.eq.${peerUserId},recipient_id.eq.${currentUserId})`
            );
            await client.from('mentorship_requests').update({ status: 'cancelled' }).or(
              `and(mentee_id.eq.${currentUserId},mentor_id.eq.${peerUserId}),and(mentee_id.eq.${peerUserId},mentor_id.eq.${currentUserId})`
            );
            await client.from('mentorship_requests').delete().or(
              `and(mentee_id.eq.${currentUserId},mentor_id.eq.${peerUserId}),and(mentee_id.eq.${peerUserId},mentor_id.eq.${currentUserId})`
            );
          }
        } catch (e) {
          console.warn('Supabase deleteConnection client notice:', e);
        }
      }
    }

    try {
      const queryParams = new URLSearchParams();
      if (peerUserId) queryParams.set('peerUserId', peerUserId);
      if (currentUserId) queryParams.set('currentUserId', currentUserId);
      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      await fetch(`/api/connections/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' });
    } catch {}

    return true;
  },

  async blockUser(userId: string, targetUserId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('connections').delete().or(
            `and(user_id.eq.${userId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${userId}),and(student_id.eq.${userId},mentor_id.eq.${targetUserId}),and(student_id.eq.${targetUserId},mentor_id.eq.${userId})`
          );
          await client.from('network_relationships').delete().or(
            `and(requester_id.eq.${userId},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${userId})`
          );
          await client.from('mentorship_requests').update({ status: 'cancelled' }).or(
            `and(mentee_id.eq.${userId},mentor_id.eq.${targetUserId}),and(mentee_id.eq.${targetUserId},mentor_id.eq.${userId})`
          );
          await client.from('mentorship_requests').delete().or(
            `and(mentee_id.eq.${userId},mentor_id.eq.${targetUserId}),and(mentee_id.eq.${targetUserId},mentor_id.eq.${userId})`
          );
        } catch (e) {
          console.warn('Supabase blockUser client notice:', e);
        }
      }
    }

    try {
      await fetch(`/api/users/${encodeURIComponent(targetUserId)}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch {}

    return true;
  },

  async unblockUser(userId: string, targetUserId: string): Promise<boolean> {
    try {
      await fetch(`/api/users/${encodeURIComponent(targetUserId)}/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch {}

    return true;
  },

  async getBlockedUsers(userId: string): Promise<UserProfile[]> {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/blocked`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return [];
  },

  async deleteMessagesForConnection(connectionId: string): Promise<boolean> {
    const rawId = connectionId.replace('conn_', '');

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('messages').delete().or(`connection_id.eq.${connectionId},connection_id.eq.${rawId}`);
        } catch (e) {
          console.warn('Supabase deleteMessages client notice:', e);
        }
      }
    }

    try {
      await fetch(`/api/connections/${encodeURIComponent(connectionId)}/chat`, { method: 'DELETE' });
    } catch {}

    return true;
  },

  async deleteNotification(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('notifications').delete().eq('id', id);
        } catch (e) {
          console.warn('Supabase deleteNotification client notice:', e);
        }
      }
    }

    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {}

    return true;
  },

  async clearAllNotifications(userId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('notifications').delete().eq('user_id', userId);
        } catch (e) {
          console.warn('Supabase clearAllNotifications client notice:', e);
        }
      }
    }

    try {
      await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    } catch {}

    return true;
  }
};
