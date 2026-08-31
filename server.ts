import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/storage';
import { 
  generateMentorMatches, 
  generateGoalBreakdown, 
  polishMentorshipRequest, 
  getCareerAdvisorResponse 
} from './server/gemini';
import { UserRole, VerificationStatus, UserProfile } from './src/types/index';
import { isServerSupabaseConfigured, getServerSupabaseClient } from './server/supabase';

dotenv.config();

let currentActiveUserId: string | null = null; // Dynamically determined by session or active context

// Helpers to map between DB rows and client formats on server
function mapServerProfile(row: any) {
  const isMentor = row.is_mentor === true || row.role === 'mentor';
  const role: UserRole = row.role || (isMentor ? 'mentor' : 'student');
  return {
    id: String(row.id),
    email: row.email || '',
    name: row.name || row.full_name || row.display_name || 'MentorNexus Member',
    role,
    avatar: row.avatar || row.avatar_url || (role === 'mentor' ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'),
    title: row.title || row.headline || (role === 'mentor' ? 'Industry Mentor' : 'Aspiring Professional'),
    organization: row.organization || row.company || 'Independent',
    bio: row.bio || row.about || '',
    industry: row.industry || 'Technology & AI',
    location: row.location || 'Remote',
    yearsOfExperience: Number(row.years_of_experience ?? row.yearsOfExperience ?? (role === 'mentor' ? 5 : 1)),
    skills: Array.isArray(row.skills) ? row.skills : (typeof row.skills === 'string' ? row.skills.split(',') : []),
    interests: Array.isArray(row.interests) ? row.interests : [],
    mentoringAreas: Array.isArray(row.mentoring_areas ?? row.mentoringAreas) ? (row.mentoring_areas ?? row.mentoringAreas) : [],
    education: row.education || '',
    achievements: Array.isArray(row.achievements) ? row.achievements : [],
    availability: row.availability || (role === 'mentor' ? '2 hrs/week' : undefined),
    verificationStatus: row.verification_status || row.verificationStatus || 'verified',
    rating: Number(row.rating ?? 4.9),
    reviewCount: Number(row.review_count ?? row.reviewCount ?? 12),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    isBanned: Boolean(row.is_banned ?? row.banned ?? false),
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', platform: 'MentorNexus', timestamp: new Date().toISOString() });
  });

  // Supabase status check
  app.get('/api/supabase/status', async (req, res) => {
    const isConfigured = isServerSupabaseConfigured;
    let clientInitialized = false;
    let tablesChecked = {
      profiles: false,
      mentorship_requests: false,
      connections: false,
      goals: false,
      experience_library: false,
      notifications: false
    };

    if (isConfigured) {
      const client = getServerSupabaseClient();
      clientInitialized = !!client;
      if (client) {
        try {
          const { error: pErr } = await client.from('profiles').select('id').limit(1);
          tablesChecked.profiles = !pErr;
          const { error: rErr } = await client.from('mentorship_requests').select('id').limit(1);
          tablesChecked.mentorship_requests = !rErr;
          const { error: cErr } = await client.from('connections').select('id').limit(1);
          tablesChecked.connections = !cErr;
          const { error: gErr } = await client.from('goals').select('id').limit(1);
          tablesChecked.goals = !gErr;
          const { error: eErr } = await client.from('experience_library').select('id').limit(1);
          tablesChecked.experience_library = !eErr;
          const { error: nErr } = await client.from('notifications').select('id').limit(1);
          tablesChecked.notifications = !nErr;
        } catch (e) {
          console.warn('Supabase status check notice:', e);
        }
      }
    }

    res.json({
      configured: isConfigured,
      initialized: clientInitialized,
      tables: tablesChecked,
      timestamp: new Date().toISOString(),
    });
  });

  // Helper to resolve user by ID from Supabase profiles or in-memory DB
  const resolveUserById = async (id: string | null | undefined): Promise<UserProfile | null> => {
    if (!id || id === 'anonymous') return null;
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          return mapServerProfile(data);
        }
      } catch (e) {
        // fallback to memory
      }
    }
    return db.getUserById(id) || null;
  };

  // Helper to resolve authenticated user from Bearer token or headers
  const resolveAuthenticatedUser = async (req: express.Request): Promise<{ userId: string | null; userProfile: UserProfile | null }> => {
    const authHeader = req.headers.authorization;
    let userId: string | null = null;
    let userProfile: UserProfile | null = null;

    const client = getServerSupabaseClient();
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (client) {
        try {
          const { data: { user }, error } = await client.auth.getUser(token);
          if (!error && user) {
            userId = user.id;
            const { data: profileData } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (profileData) {
              userProfile = mapServerProfile(profileData);
            } else {
              userProfile = {
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'MentorNexus Member',
                role: (user.user_metadata?.role as UserRole) || 'student',
                title: user.user_metadata?.role === 'mentor' ? 'Industry Mentor' : 'Aspiring Professional',
                organization: 'Independent',
                industry: 'Technology & AI',
                skills: ['Career Growth', 'Strategy'],
                interests: ['Professional Development'],
                mentoringAreas: user.user_metadata?.role === 'mentor' ? ['Career Navigation', 'Technical Depth'] : ['Career Guidance'],
                bio: '',
                location: 'Remote',
                avatar: user.user_metadata?.role === 'mentor' 
                  ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
                yearsOfExperience: user.user_metadata?.role === 'mentor' ? 5 : 1,
                verificationStatus: user.user_metadata?.role === 'mentor' ? 'pending' : 'verified',
                rating: 4.9,
                reviewCount: 12,
                createdAt: user.created_at || new Date().toISOString(),
                isBanned: false,
              };
            }
          }
        } catch (e) {
          console.warn('Error resolving user from bearer token:', e);
        }
      }
    }

    if (!userId) {
      const headerUserId = req.headers['x-user-id'] as string;
      if (headerUserId && headerUserId !== 'anonymous') {
        userId = headerUserId;
      } else if (currentActiveUserId) {
        userId = currentActiveUserId;
      }

      if (userId) {
        userProfile = await resolveUserById(userId);
      }
    }

    return { userId, userProfile };
  };

  // Helper to resolve caller's user id from headers or session
  const resolveUserId = async (req: express.Request): Promise<string | null> => {
    const { userId } = await resolveAuthenticatedUser(req);
    return userId;
  };

  // --- Auth & Users API ---
  app.get('/api/auth/current-user', async (req, res) => {
    const targetUserId = await resolveUserId(req);
    if (!targetUserId) {
      return res.json(null);
    }

    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('profiles').select('*').eq('id', targetUserId).maybeSingle();
        if (!error && data) {
          return res.json(mapServerProfile(data));
        }
      } catch (e) {
        console.warn('Could not query current user from Supabase:', e);
      }
    }
    const user = db.getUserById(targetUserId);
    res.json(user || null);
  });

  app.post('/api/auth/switch-user', async (req, res) => {
    const { userId } = req.body;
    currentActiveUserId = userId === 'anonymous' ? null : userId;

    if (!userId || userId === 'anonymous') {
      return res.json({ success: true, user: null });
    }

    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (!error && data) {
          return res.json({ success: true, user: mapServerProfile(data) });
        }
      } catch (e) {
        console.warn('Supabase switch-user query:', e);
      }
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  });

  app.get('/api/auth/users', async (req, res) => {
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('profiles').select('*');
        if (!error && data && data.length > 0) {
          return res.json(data.map(mapServerProfile));
        }
      } catch (e) {
        console.warn('Supabase get users query:', e);
      }
    }
    res.json(db.getUsers());
  });

  app.post('/api/auth/register', async (req, res) => {
    const { 
      id,
      name, 
      email, 
      role: requestedRole, 
      title, 
      organization, 
      bio, 
      industry, 
      location, 
      skills, 
      interests, 
      mentoringAreas,
      yearsOfExperience,
      education,
      availability 
    } = req.body;

    if (!name || !email || !requestedRole) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    // Role sanitization: Prevent unauthorized admin creation via public signup
    let role: UserRole = 'student';
    if (requestedRole === 'mentor') role = 'mentor';
    else if (requestedRole === 'early_career') role = 'early_career';
    else if (requestedRole === 'student') role = 'student';
    else {
      role = 'student';
    }

    const defaultAvatars: Record<UserRole, string> = {
      student: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      early_career: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      mentor: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      admin: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    };

    const userId = id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userProfile: UserProfile = {
      id: userId,
      email,
      name,
      role: role as UserRole,
      avatar: defaultAvatars[role as UserRole] || defaultAvatars.student,
      title: title || (role === 'student' ? 'Student' : role === 'mentor' ? 'Industry Mentor' : 'Professional'),
      organization: organization || 'Independent',
      bio: bio || `Passionate about ${role === 'mentor' ? 'mentoring talent' : 'growing skills'} in tech & leadership.`,
      industry: industry || 'Technology & Software',
      location: location || 'Remote',
      yearsOfExperience: Number(yearsOfExperience) || 0,
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map((s: string) => s.trim()) : []),
      interests: Array.isArray(interests) ? interests : (interests ? interests.split(',').map((s: string) => s.trim()) : []),
      mentoringAreas: Array.isArray(mentoringAreas) ? mentoringAreas : (mentoringAreas ? mentoringAreas.split(',').map((s: string) => s.trim()) : []),
      education: education || '',
      availability: availability || (role === 'mentor' ? '2 hrs/week' : undefined),
      verificationStatus: (role === 'mentor' ? 'pending' : 'verified') as VerificationStatus,
      createdAt: new Date().toISOString(),
    };

    const client = getServerSupabaseClient();
    if (client) {
      try {
        await client.from('profiles').upsert({
          id: userId,
          email,
          name,
          full_name: name,
          role,
          is_mentor: role === 'mentor',
          avatar: userProfile.avatar,
          avatar_url: userProfile.avatar,
          title: userProfile.title,
          headline: userProfile.title,
          organization: userProfile.organization,
          company: userProfile.organization,
          bio: userProfile.bio,
          industry: userProfile.industry,
          location: userProfile.location,
          years_of_experience: userProfile.yearsOfExperience,
          yearsOfExperience: userProfile.yearsOfExperience,
          skills: userProfile.skills,
          interests: userProfile.interests,
          mentoring_areas: userProfile.mentoringAreas,
          mentoringAreas: userProfile.mentoringAreas,
          education: userProfile.education,
          availability: userProfile.availability,
          verification_status: userProfile.verificationStatus,
          verificationStatus: userProfile.verificationStatus,
        });
      } catch (e) {
        console.warn('Supabase profile insertion notice:', e);
      }
    }

    const newUser = db.createUser(userProfile);
    currentActiveUserId = newUser.id;
    res.status(201).json(newUser);
  });

  app.get('/api/profiles/:id', async (req, res) => {
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('profiles').select('*').eq('id', req.params.id).maybeSingle();
        if (!error && data) {
          return res.json(mapServerProfile(data));
        }
      } catch (e) {
        console.warn('Supabase profile get notice:', e);
      }
    }
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Profile not found' });
    res.json(user);
  });

  app.patch('/api/profiles/:id', async (req, res) => {
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const updates = req.body;
        const payload: Record<string, any> = { ...updates };
        if (updates.name) payload.full_name = updates.name;
        if (updates.title) payload.headline = updates.title;
        if (updates.organization) payload.company = updates.organization;
        if (updates.yearsOfExperience !== undefined) payload.years_of_experience = updates.yearsOfExperience;
        if (updates.mentoringAreas) payload.mentoring_areas = updates.mentoringAreas;
        if (updates.verificationStatus) payload.verification_status = updates.verificationStatus;

        await client.from('profiles').update(payload).eq('id', req.params.id);
      } catch (e) {
        console.warn('Supabase profile patch notice:', e);
      }
    }
    const updated = db.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Profile not found' });
    res.json(updated);
  });

  // --- Mentor Discovery API ---
  app.get('/api/mentors', async (req, res) => {
    const { search, industry, skill, minExp, verifiedOnly } = req.query;

    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('profiles').select('*').or('role.eq.mentor,is_mentor.eq.true');
        if (!error && data && data.length > 0) {
          let mentors = data.map(mapServerProfile);
          if (verifiedOnly === 'true') {
            mentors = mentors.filter(m => m.verificationStatus === 'verified');
          }
          if (industry && typeof industry === 'string' && industry !== 'All') {
            mentors = mentors.filter(m => m.industry.toLowerCase().includes(industry.toLowerCase()));
          }
          if (skill && typeof skill === 'string') {
            mentors = mentors.filter(m => m.skills.some(s => s.toLowerCase().includes(skill.toLowerCase())));
          }
          if (minExp) {
            const exp = Number(minExp);
            if (!isNaN(exp)) mentors = mentors.filter(m => m.yearsOfExperience >= exp);
          }
          if (search && typeof search === 'string' && search.trim() !== '') {
            const q = search.toLowerCase();
            mentors = mentors.filter(m =>
              m.name.toLowerCase().includes(q) ||
              m.title.toLowerCase().includes(q) ||
              m.organization.toLowerCase().includes(q) ||
              m.bio.toLowerCase().includes(q) ||
              m.skills.some(s => s.toLowerCase().includes(q)) ||
              m.mentoringAreas.some(a => a.toLowerCase().includes(q)) ||
              m.location.toLowerCase().includes(q)
            );
          }
          return res.json(mentors);
        }
      } catch (e) {
        console.warn('Supabase mentors query notice:', e);
      }
    }

    let mentors = db.getMentors();

    if (verifiedOnly === 'true') {
      mentors = mentors.filter(m => m.verificationStatus === 'verified');
    }

    if (industry && typeof industry === 'string' && industry !== 'All') {
      mentors = mentors.filter(m => m.industry.toLowerCase().includes(industry.toLowerCase()));
    }

    if (skill && typeof skill === 'string') {
      mentors = mentors.filter(m => m.skills.some(s => s.toLowerCase().includes(skill.toLowerCase())));
    }

    if (minExp) {
      const exp = Number(minExp);
      if (!isNaN(exp)) {
        mentors = mentors.filter(m => m.yearsOfExperience >= exp);
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase();
      mentors = mentors.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.organization.toLowerCase().includes(q) ||
        m.bio.toLowerCase().includes(q) ||
        m.skills.some(s => s.toLowerCase().includes(q)) ||
        m.mentoringAreas.some(a => a.toLowerCase().includes(q)) ||
        m.location.toLowerCase().includes(q)
      );
    }

    res.json(mentors);
  });

  // --- Mentorship Requests API ---
  app.get('/api/requests', async (req, res) => {
    const userId = (req.query.userId as string) || (await resolveUserId(req));
    if (!userId) return res.json([]);

    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('mentorship_requests')
          .select('*')
          .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`);

        if (!error && data) {
          // Enrich with profile names/avatars
          const { data: profiles } = await client.from('profiles').select('id, full_name, avatar, avatar_url, title, profession, role');
          const pMap = new Map(profiles ? profiles.map((p: any) => [p.id, p]) : []);

          const supaRequests = data.map((r: any) => {
            const requesterId = r.mentee_id || r.requester_id;
            const requester = pMap.get(requesterId);
            const mentor = pMap.get(r.mentor_id);
            return {
              id: String(r.id),
              requesterId,
              requesterName: requester?.full_name || r.requester_name || 'Member',
              requesterTitle: requester?.profession || requester?.title || r.requester_title || 'Learner',
              requesterAvatar: requester?.avatar_url || requester?.avatar || r.requester_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              requesterRole: requester?.role || 'student',
              mentorId: r.mentor_id,
              mentorName: mentor?.full_name || r.mentor_name || 'Industry Mentor',
              mentorTitle: mentor?.profession || mentor?.title || r.mentor_title || 'Mentor',
              mentorAvatar: mentor?.avatar_url || mentor?.avatar || r.mentor_avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
              status: r.status || 'pending',
              message: r.message || '',
              goalsSummary: r.focus_area || r.goals_summary || '',
              preferredCadence: r.preferred_cadence || 'Bi-weekly 1:1',
              responseNote: r.response_note || r.response_notes || undefined,
              createdAt: r.created_at || new Date().toISOString(),
              updatedAt: r.updated_at || new Date().toISOString(),
            };
          });

          return res.json(supaRequests);
        }
      } catch (e) {
        console.warn('Supabase get requests error, using db fallback:', e);
      }
    }

    const requests = db.getRequests(userId);
    res.json(requests);
  });

  app.post('/api/requests', async (req, res) => {
    const { 
      mentorId, 
      message, 
      goalsSummary, 
      requesterId,
      requesterName,
      requesterTitle,
      requesterAvatar,
      requesterRole
    } = req.body;

    // Authoritative verification of caller identity from Bearer JWT / session
    const { userId: authUserId, userProfile: authProfile } = await resolveAuthenticatedUser(req);
    const resolvedId = authUserId || requesterId;

    if (!resolvedId) {
      return res.status(401).json({ error: 'Unauthorized: invalid requester' });
    }

    // Security check: if an authenticated session exists, ensure requesterId cannot impersonate another user
    if (authUserId && requesterId && authUserId !== requesterId) {
      return res.status(403).json({ error: 'Forbidden: requester ID mismatch' });
    }

    if (!mentorId) {
      return res.status(400).json({ error: 'Mentor ID is required' });
    }

    if (resolvedId === mentorId) {
      return res.status(400).json({ error: 'You cannot request mentorship from yourself' });
    }

    // Resolve requester and mentor profiles
    let requester = authProfile;
    if (!requester) {
      requester = await resolveUserById(resolvedId);
    }
    if (!requester) {
      requester = {
        id: resolvedId,
        email: '',
        name: requesterName || 'MentorNexus Member',
        title: requesterTitle || 'Learner / Aspiring Professional',
        avatar: requesterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: requesterRole || 'student',
        organization: 'Independent',
        industry: 'Technology & AI',
        skills: ['Career Growth'],
        interests: ['Professional Development'],
        mentoringAreas: [],
        bio: '',
        location: 'Remote',
        yearsOfExperience: 1,
        verificationStatus: 'verified',
        rating: 4.9,
        reviewCount: 12,
        createdAt: new Date().toISOString(),
        isBanned: false,
      };
    }

    let mentor = await resolveUserById(mentorId);
    if (!mentor) {
      mentor = db.getUserById(mentorId) || null;
    }

    const client = getServerSupabaseClient();
    if (client) {
      try {
        // Query mentor from Supabase profiles if not yet loaded
        if (!mentor) {
          const { data: mData } = await client.from('profiles').select('*').eq('id', mentorId).maybeSingle();
          if (mData) {
            mentor = mapServerProfile(mData);
          }
        }

        // Check if duplicate pending or accepted request exists
        const { data: existingList } = await client
          .from('mentorship_requests')
          .select('id, status')
          .eq('mentee_id', resolvedId)
          .eq('mentor_id', mentorId)
          .in('status', ['pending', 'accepted']);

        if (existingList && existingList.length > 0) {
          const isAccepted = existingList.some((r: any) => r.status === 'accepted');
          return res.status(400).json({
            error: isAccepted
              ? 'You are already connected with this mentor.'
              : 'You already have a pending mentorship request to this mentor.'
          });
        }

        // Insert into Supabase mentorship_requests
        const insertPayload: Record<string, any> = {
          mentee_id: resolvedId,
          mentor_id: mentorId,
          message: message || `Hello ${mentor?.name || 'Mentor'}, I would love to connect for mentorship.`,
          focus_area: goalsSummary || '',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let { data: supaData, error: supaErr } = await client
          .from('mentorship_requests')
          .insert(insertPayload)
          .select('*')
          .maybeSingle();

        if (supaErr && (supaErr.message.includes('mentee_id') || (supaErr as any).details?.includes('mentee_id'))) {
          delete insertPayload.mentee_id;
          insertPayload.requester_id = resolvedId;
          const retry = await client
            .from('mentorship_requests')
            .insert(insertPayload)
            .select('*')
            .maybeSingle();
          supaData = retry.data;
          supaErr = retry.error;
        }

        if (!supaErr && supaData) {
          // Dispatch notification to mentor
          try {
            await client.from('notifications').insert({
              user_id: mentorId,
              title: 'New Mentorship Request',
              message: `${requester.name} sent you a mentorship request.`,
              type: 'request_received',
              is_read: false,
              created_at: new Date().toISOString(),
            });
          } catch {}

          const createdResponse = {
            id: String(supaData.id),
            requesterId: supaData.mentee_id || supaData.requester_id || resolvedId,
            requesterName: requester.name,
            requesterTitle: requester.title,
            requesterAvatar: requester.avatar,
            requesterRole: requester.role,
            mentorId: supaData.mentor_id,
            mentorName: mentor?.name || 'Industry Mentor',
            mentorTitle: mentor?.title || 'Mentor',
            mentorAvatar: mentor?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            status: supaData.status || 'pending',
            message: supaData.message || message,
            goalsSummary: supaData.focus_area || supaData.goals_summary || goalsSummary || '',
            preferredCadence: 'Bi-weekly 1:1',
            createdAt: supaData.created_at,
            updatedAt: supaData.updated_at,
          };

          // Synchronize in-memory db
          db.createRequest(createdResponse);
          return res.status(201).json(createdResponse);
        }
      } catch (err: any) {
        console.warn('Server Supabase createRequest error, using memory fallback:', err.message);
      }
    }

    if (!requester) return res.status(401).json({ error: 'Unauthorized: invalid requester' });
    if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

    // Check if duplicate in memory
    const existing = db.getRequests(requester.id).find(
      r => r.mentorId === mentor.id && (r.status === 'pending' || r.status === 'accepted')
    );
    if (existing) {
      return res.status(400).json({ 
        error: existing.status === 'accepted' 
          ? 'You are already connected with this mentor.' 
          : 'You already have a pending mentorship request to this mentor.' 
      });
    }

    const created = db.createRequest({
      requesterId: requester.id,
      requesterName: requester.name,
      requesterTitle: requester.title,
      requesterAvatar: requester.avatar,
      requesterRole: requester.role,
      mentorId: mentor.id,
      mentorName: mentor.name,
      mentorTitle: mentor.title,
      mentorAvatar: mentor.avatar,
      status: 'pending',
      message: message || `Hello ${mentor.name}, I would love to connect for mentorship on ${mentor.mentoringAreas?.[0] || 'career development'}.`,
      goalsSummary: goalsSummary || '',
    });

    res.status(201).json(created);
  });

  app.patch('/api/requests/:id/respond', async (req, res) => {
    const { status, responseNote } = req.body;
    if (status !== 'accepted' && status !== 'declined') {
      return res.status(400).json({ error: 'Status must be accepted or declined' });
    }

    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data: supaReq, error: reqErr } = await client
          .from('mentorship_requests')
          .update({
            status,
            response_note: responseNote || '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', req.params.id)
          .select('*')
          .maybeSingle();

        if (!reqErr && supaReq) {
          if (status === 'accepted') {
            // Create connection in Supabase
            try {
              await client.from('connections').insert({
                student_id: supaReq.requester_id,
                requester_id: supaReq.requester_id,
                user_id: supaReq.requester_id,
                mentor_id: supaReq.mentor_id,
                connected_user_id: supaReq.mentor_id,
                request_id: supaReq.id,
                status: 'active',
                cadence: 'Bi-weekly 1:1',
                focus_areas: supaReq.focus_area ? [supaReq.focus_area] : ['Career Growth'],
                notes: supaReq.message || '',
                connected_at: new Date().toISOString(),
                start_date: new Date().toISOString(),
                last_activity: new Date().toISOString(),
              });
            } catch {}

            // Notify requester
            try {
              const menteeId = supaReq.mentee_id || supaReq.requester_id;
              await client.from('notifications').insert({
                user_id: menteeId,
                title: 'Mentorship Request Accepted! 🎓',
                message: 'Your mentorship request has been accepted. You can now start collaborating in the 1:1 workspace!',
                type: 'request_accepted',
                is_read: false,
                created_at: new Date().toISOString(),
              });
            } catch {}
          } else {
            // Notify requester of decline
            try {
              const menteeId = supaReq.mentee_id || supaReq.requester_id;
              await client.from('notifications').insert({
                user_id: menteeId,
                title: 'Mentorship Request Update',
                message: 'Your mentor has responded to your mentorship request.',
                type: 'request_declined',
                is_read: false,
                created_at: new Date().toISOString(),
              });
            } catch {}
          }

          const updatedMemory = db.respondToRequest(req.params.id, status, responseNote);
          return res.json(updatedMemory || {
            id: String(supaReq.id),
            requesterId: supaReq.requester_id,
            mentorId: supaReq.mentor_id,
            status: supaReq.status,
            responseNote: supaReq.response_note,
            updatedAt: supaReq.updated_at,
          });
        }
      } catch (err: any) {
        console.warn('Server Supabase respondToRequest notice:', err.message);
      }
    }

    const updated = db.respondToRequest(req.params.id, status, responseNote);
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json(updated);
  });

  app.delete('/api/requests/:id/cancel', async (req, res) => {
    const callerId = await resolveUserId(req);
    const client = getServerSupabaseClient();
    if (client) {
      try {
        await client.from('mentorship_requests').delete().eq('id', req.params.id);
      } catch {}
    }
    const success = db.cancelRequest(req.params.id, callerId || undefined);
    if (!success) return res.status(400).json({ error: 'Could not cancel request' });
    res.json({ success: true });
  });

  // --- Connections API ---
  app.get('/api/connections', async (req, res) => {
    const userId = (req.query.userId as string) || (await resolveUserId(req));
    if (!userId) return res.json([]);

    // Get stored local/memory connections first
    const memoryConnections = db.getConnections(userId);
    const findMemConn = (rowId: string, reqId?: string, studentId?: string, mentorId?: string) => {
      const cleanRowId = String(rowId || '').trim();
      const cleanReqId = String(reqId || '').trim();
      const direct = db.getConnectionById(cleanRowId) || (cleanReqId ? db.getConnectionById(cleanReqId) : undefined);
      if (direct) return direct;
      if (studentId && mentorId) {
        return memoryConnections.find(
          c => (c.studentId === studentId && c.mentorId === mentorId) ||
               (c.studentId === mentorId && c.mentorId === studentId)
        );
      }
      return undefined;
    };

    const client = getServerSupabaseClient();
    if (client) {
      try {
        const connectionList: any[] = [];
        const seenPairs = new Set<string>();

        const { data, error } = await client
          .from('connections')
          .select('*')
          .or(`user_id.eq.${userId},connected_user_id.eq.${userId},student_id.eq.${userId},mentor_id.eq.${userId}`);

        if (!error && data) {
          for (const c of data) {
            const studentId = c.student_id || c.requester_id || c.user_id;
            const mentorId = c.mentor_id || c.connected_user_id;
            const pairKey = [studentId, mentorId].sort().join(':');
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              const memConn = findMemConn(String(c.id), c.request_id, studentId, mentorId);
              const meetings = memConn?.meetings && memConn.meetings.length > 0 
                ? memConn.meetings 
                : (db.getMeetings(String(c.id)) || (c.request_id ? db.getMeetings(String(c.request_id)) : []));

              connectionList.push({
                id: String(c.id),
                requestId: c.request_id || undefined,
                studentId,
                mentorId,
                status: c.status || 'active',
                startDate: c.start_date || c.connected_at || c.created_at || new Date().toISOString(),
                lastActivity: c.last_activity || c.last_meeting_date || new Date().toISOString(),
                nextMeetingDate: c.next_session_date || c.next_meeting_date || memConn?.nextMeetingDate,
                nextSessionDate: c.next_session_date || c.next_meeting_date || memConn?.nextMeetingDate,
                focusAreas: Array.isArray(c.focus_areas) ? c.focus_areas : (c.focus_areas ? [c.focus_areas] : ['Career Growth']),
                notes: Array.isArray(c.notes) ? c.notes : (c.notes ? [c.notes] : (memConn?.notes || [])),
                meetings: meetings || [],
                meetingCadence: c.cadence || 'Bi-weekly 1:1',
                actionItems: [],
              });
            }
          }
        }

        // Also check accepted mentorship requests
        const { data: reqData } = await client
          .from('mentorship_requests')
          .select('*')
          .eq('status', 'accepted')
          .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`);

        if (reqData) {
          for (const r of reqData) {
            const studentId = r.mentee_id || r.requester_id;
            const mentorId = r.mentor_id;
            if (studentId && mentorId) {
              const pairKey = [studentId, mentorId].sort().join(':');
              if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                const connId = `conn_${r.id}`;
                const memConn = findMemConn(connId, String(r.id), studentId, mentorId);
                const meetings = memConn?.meetings && memConn.meetings.length > 0 
                  ? memConn.meetings 
                  : (db.getMeetings(connId) || db.getMeetings(String(r.id)));

                connectionList.push({
                  id: connId,
                  requestId: String(r.id),
                  studentId,
                  mentorId,
                  status: 'active',
                  startDate: r.updated_at || r.created_at || new Date().toISOString(),
                  lastActivity: r.updated_at || r.created_at || new Date().toISOString(),
                  nextMeetingDate: memConn?.nextMeetingDate,
                  focusAreas: r.focus_area ? [r.focus_area] : ['Career Growth'],
                  notes: r.response_note ? [r.response_note] : (memConn?.notes || []),
                  meetings: meetings || [],
                  meetingCadence: 'Bi-weekly 1:1',
                  actionItems: [],
                });
              }
            }
          }
        }

        if (connectionList.length > 0) {
          const { data: profiles } = await client.from('profiles').select('id, full_name, avatar, avatar_url, title, profession');
          const pMap = new Map(profiles ? profiles.map((p: any) => [p.id, p]) : []);

          const supaConnections = connectionList.map((c: any) => {
            const student = pMap.get(c.studentId);
            const mentor = pMap.get(c.mentorId);
            return {
              ...c,
              studentName: student?.full_name || 'Learner',
              studentTitle: student?.profession || student?.title || 'Aspiring Professional',
              studentAvatar: student?.avatar_url || student?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              mentorName: mentor?.full_name || 'Industry Mentor',
              mentorTitle: mentor?.profession || mentor?.title || 'Senior Practitioner',
              mentorAvatar: mentor?.avatar_url || mentor?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            };
          });

          return res.json(supaConnections);
        }
      } catch (e) {
        console.warn('Supabase get connections notice:', e);
      }
    }

    res.json(db.getConnections(userId));
  });

  app.patch('/api/connections/:id', async (req, res) => {
    const client = getServerSupabaseClient();
    if (client) {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.nextSessionDate || req.body.nextMeetingDate) {
        const d = req.body.nextMeetingDate || req.body.nextSessionDate;
        updateData.next_session_date = d;
        updateData.next_meeting_date = d;
      }
      if (req.body.lastMeetingDate) updateData.last_meeting_date = req.body.lastMeetingDate;
      if (req.body.meetingCadence) updateData.cadence = req.body.meetingCadence;
      if (req.body.focusAreas) updateData.focus_areas = req.body.focusAreas;
      if (req.body.notes) {
        updateData.notes = Array.isArray(req.body.notes) ? req.body.notes.join('\n') : req.body.notes;
      }

      try {
        await client.from('connections').update(updateData).eq('id', req.params.id);
      } catch {}
    }

    const updated = db.updateConnection(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Connection not found' });
    res.json(updated);
  });

  app.delete('/api/connections/:id', async (req, res) => {
    const callerId = (req.query.currentUserId as string) || (await resolveUserId(req));
    const peerUserId = req.query.peerUserId as string;
    const connId = req.params.id;
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const rawId = connId.replace('conn_', '').replace('net_', '');
        await client.from('connections').delete().or(`id.eq.${connId},id.eq.${rawId},request_id.eq.${rawId}`);
        await client.from('network_relationships').delete().or(`id.eq.${connId},id.eq.${rawId}`);
        await client.from('mentorship_requests').update({ status: 'cancelled' }).or(`id.eq.${rawId},id.eq.${connId}`);
        await client.from('mentorship_requests').delete().or(`id.eq.${rawId},id.eq.${connId}`);
        if (callerId && peerUserId) {
          await client.from('connections').delete().or(
            `and(user_id.eq.${callerId},connected_user_id.eq.${peerUserId}),and(user_id.eq.${peerUserId},connected_user_id.eq.${callerId}),and(student_id.eq.${callerId},mentor_id.eq.${peerUserId}),and(student_id.eq.${peerUserId},mentor_id.eq.${callerId}),and(requester_id.eq.${callerId},mentor_id.eq.${peerUserId}),and(requester_id.eq.${peerUserId},mentor_id.eq.${callerId})`
          );
          await client.from('network_relationships').delete().or(
            `and(requester_id.eq.${callerId},recipient_id.eq.${peerUserId}),and(requester_id.eq.${peerUserId},recipient_id.eq.${callerId})`
          );
          await client.from('mentorship_requests').update({ status: 'cancelled' }).or(
            `and(mentee_id.eq.${callerId},mentor_id.eq.${peerUserId}),and(mentee_id.eq.${peerUserId},mentor_id.eq.${callerId}),and(requester_id.eq.${callerId},mentor_id.eq.${peerUserId}),and(requester_id.eq.${peerUserId},mentor_id.eq.${callerId})`
          );
          await client.from('mentorship_requests').delete().or(
            `and(mentee_id.eq.${callerId},mentor_id.eq.${peerUserId}),and(mentee_id.eq.${peerUserId},mentor_id.eq.${callerId}),and(requester_id.eq.${callerId},mentor_id.eq.${peerUserId}),and(requester_id.eq.${peerUserId},mentor_id.eq.${callerId})`
          );
        }
      } catch (e) {
        console.warn('Supabase delete connection notice:', e);
      }
    }
    const success = db.deleteConnection(connId, callerId || undefined, peerUserId || undefined);
    res.json({ success });
  });

  app.post('/api/users/:id/block', async (req, res) => {
    const callerId = req.body.userId || (await resolveUserId(req));
    const targetUserId = req.params.id;
    if (!callerId) return res.status(401).json({ error: 'Unauthorized' });

    const client = getServerSupabaseClient();
    if (client) {
      try {
        await client.from('connections').delete().or(
          `and(user_id.eq.${callerId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${callerId}),and(student_id.eq.${callerId},mentor_id.eq.${targetUserId}),and(student_id.eq.${targetUserId},mentor_id.eq.${callerId})`
        );
        await client.from('network_relationships').delete().or(
          `and(requester_id.eq.${callerId},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${callerId})`
        );
        await client.from('mentorship_requests').update({ status: 'cancelled' }).or(
          `and(mentee_id.eq.${callerId},mentor_id.eq.${targetUserId}),and(mentee_id.eq.${targetUserId},mentor_id.eq.${callerId}),and(requester_id.eq.${callerId},mentor_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},mentor_id.eq.${callerId})`
        );
        await client.from('mentorship_requests').delete().or(
          `and(mentee_id.eq.${callerId},mentor_id.eq.${targetUserId}),and(mentee_id.eq.${targetUserId},mentor_id.eq.${callerId})`
        );
      } catch (e) {
        console.warn('Supabase block user notice:', e);
      }
    }

    const success = db.blockUser(callerId, targetUserId);
    res.json({ success });
  });

  app.post('/api/users/:id/unblock', async (req, res) => {
    const callerId = req.body.userId || (await resolveUserId(req));
    const targetUserId = req.params.id;
    if (!callerId) return res.status(401).json({ error: 'Unauthorized' });

    const success = db.unblockUser(callerId, targetUserId);
    res.json({ success });
  });

  app.get('/api/users/:id/blocked', async (req, res) => {
    const userId = req.params.id;
    const blocked = db.getBlockedUsers(userId);
    res.json(blocked);
  });

  app.delete('/api/connections/:id/chat', async (req, res) => {
    const connId = req.params.id;
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const rawId = connId.replace('conn_', '');
        await client.from('messages').delete().or(`connection_id.eq.${connId},connection_id.eq.${rawId}`);
      } catch (e) {
        console.warn('Supabase delete messages notice:', e);
      }
    }
    const success = db.deleteMessagesForConnection(connId);
    res.json({ success });
  });

  app.delete('/api/messages/connection/:connectionId', async (req, res) => {
    const connId = req.params.connectionId;
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const rawId = connId.replace('conn_', '');
        await client.from('messages').delete().or(`connection_id.eq.${connId},connection_id.eq.${rawId}`);
      } catch (e) {
        console.warn('Supabase delete messages notice:', e);
      }
    }
    const success = db.deleteMessagesForConnection(connId);
    res.json({ success });
  });

  // Dedicated Meetings routes for persistent scheduled and past sessions
  app.get('/api/connections/:id/meetings', async (req, res) => {
    const rawId = req.params.id.replace('conn_', '');
    const meetings = db.getMeetings(req.params.id) || db.getMeetings(rawId) || db.getMeetings(`conn_${rawId}`);
    res.json(meetings);
  });

  app.post('/api/connections/:id/meetings', async (req, res) => {
    const callerId = await resolveUserId(req);
    const rawId = req.params.id.replace('conn_', '');
    const meetingData = {
      ...req.body,
      id: req.body.id || `mtg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      connectionId: req.params.id,
      createdBy: req.body.createdBy || callerId || 'user',
      createdAt: req.body.createdAt || new Date().toISOString(),
      status: req.body.status || 'scheduled',
    };

    const saved = db.addMeeting(req.params.id, meetingData);

    // Sync to Supabase connection if available
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const updatePayload: Record<string, any> = {
          next_session_date: saved.date,
          next_meeting_date: saved.date,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
          await client.from('connections').update(updatePayload).or(`id.eq.${rawId},request_id.eq.${rawId}`);
        }
      } catch {}
    }

    // Notify counterpart
    try {
      const conn = db.getConnectionById(req.params.id);
      if (conn) {
        const recipientId = conn.studentId === callerId ? conn.mentorId : conn.studentId;
        if (recipientId && recipientId !== callerId) {
          db.createNotification({
            userId: recipientId,
            title: '1:1 Session Scheduled! 📅',
            message: `${req.body.creatorName || 'Your partner'} scheduled "${saved.title}" for ${saved.date} at ${saved.time}.`,
            type: 'system',
            linkTab: 'connections',
            linkId: req.params.id,
          });
          if (client) {
            client.from('notifications').insert({
              user_id: recipientId,
              title: '1:1 Session Scheduled! 📅',
              message: `${req.body.creatorName || 'Your partner'} scheduled "${saved.title}" for ${saved.date} at ${saved.time}.`,
              type: 'system',
              link_tab: 'connections',
              is_read: false,
              created_at: new Date().toISOString(),
            }).then(() => {}, () => {});
          }
        }
      }
    } catch {}

    res.status(201).json(saved);
  });

  app.patch('/api/connections/:id/meetings/:meetingId', async (req, res) => {
    const updated = db.updateMeeting(req.params.id, req.params.meetingId, req.body);
    if (!updated) return res.status(404).json({ error: 'Meeting not found' });
    res.json(updated);
  });

  app.delete('/api/connections/:id/meetings/:meetingId', async (req, res) => {
    const success = db.deleteMeeting(req.params.id, req.params.meetingId);
    res.json({ success });
  });

  // --- Messages API (Connected 1:1 Workspace Chat & Voice Notes) ---
  app.get('/api/messages', async (req, res) => {
    const connectionId = req.query.connectionId as string;
    if (!connectionId) return res.status(400).json({ error: 'connectionId is required' });

    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('messages')
          .select('*')
          .eq('connection_id', connectionId)
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          return res.json(data.map((m: any) => ({
            id: String(m.id),
            connectionId: m.connection_id,
            senderId: m.sender_id,
            content: m.content,
            messageType: m.message_type || 'text',
            voiceUrl: m.voice_url,
            createdAt: m.created_at,
          })));
        }
      } catch (e) {
        // Fallback to durable storage
      }
    }
    res.json(db.getMessages(connectionId));
  });

  app.post('/api/messages', async (req, res) => {
    const { connectionId, content, messageType, voiceUrl, senderId, senderName, senderAvatar, replyToId, replyToContent, replyToSenderName } = req.body;
    if (!connectionId) {
      return res.status(400).json({ error: 'connectionId is required' });
    }

    const callerId = senderId || (await resolveUserId(req)) || 'user_anonymous';
    let resolvedName = senderName || '';
    let resolvedAvatar = senderAvatar || '';

    const client = getServerSupabaseClient();
    let supaMsg: any = null;

    if (client) {
      try {
        if (!resolvedName && callerId && callerId !== 'user_anonymous') {
          const { data: prof } = await client.from('profiles').select('full_name, avatar_url, avatar').eq('id', callerId).maybeSingle();
          if (prof) {
            resolvedName = prof.full_name || '';
            resolvedAvatar = prof.avatar_url || prof.avatar || '';
          }
        }

        const msgPayload: Record<string, any> = {
          connection_id: connectionId,
          sender_id: callerId,
          content: content || (messageType === 'voice' ? '🎤 Voice note' : ''),
          message_type: messageType || 'text',
          voice_url: voiceUrl || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await client
          .from('messages')
          .insert(msgPayload)
          .select('*')
          .maybeSingle();

        if (!error && data) {
          supaMsg = {
            id: String(data.id),
            connectionId: data.connection_id,
            senderId: data.sender_id,
            senderName: resolvedName,
            senderAvatar: resolvedAvatar,
            content: data.content,
            messageType: data.message_type || 'text',
            voiceUrl: data.voice_url,
            replyToId: data.reply_to_id || replyToId,
            replyToContent: data.reply_to_content || replyToContent,
            replyToSenderName: data.reply_to_sender_name || replyToSenderName,
            createdAt: data.created_at,
          };
          db.createMessage(supaMsg);
        }
      } catch (e) {
        // Fallback to storage
      }
    }

    const created = supaMsg || db.createMessage({
      connectionId,
      senderId: callerId,
      senderName: resolvedName,
      senderAvatar: resolvedAvatar,
      content: content || (messageType === 'voice' ? '🎤 Voice note' : ''),
      messageType: messageType || 'text',
      voiceUrl,
      replyToId,
      replyToContent,
      replyToSenderName,
      createdAt: new Date().toISOString(),
    });

    // Dispatch real-time in-app notification to the other connection member
    try {
      let recipientId: string | null = null;
      let targetConnectionName = resolvedName || 'Connection';

      const conn = db.getConnectionById(connectionId);
      if (conn) {
        recipientId = conn.studentId === callerId ? conn.mentorId : conn.studentId;
      }

      if (!recipientId && client) {
        // Look up in Supabase connections table
        const isConnPrefix = connectionId.startsWith('conn_');
        const rawReqId = isConnPrefix ? connectionId.replace('conn_', '') : connectionId;

        const { data: sConn } = await client.from('connections').select('*').eq(isConnPrefix ? 'request_id' : 'id', rawReqId).maybeSingle();
        if (sConn) {
          const sStudent = sConn.student_id || sConn.requester_id || sConn.user_id;
          const sMentor = sConn.mentor_id || sConn.connected_user_id;
          recipientId = sStudent === callerId ? sMentor : sStudent;
        } else {
          // Check mentorship_requests table
          const { data: sReq } = await client.from('mentorship_requests').select('*').eq('id', rawReqId).maybeSingle();
          if (sReq) {
            const sStudent = sReq.mentee_id || sReq.requester_id;
            const sMentor = sReq.mentor_id;
            recipientId = sStudent === callerId ? sMentor : sStudent;
          }
        }
      }

      if (recipientId && recipientId !== callerId) {
        const previewText = messageType === 'voice' 
          ? '🎤 Sent a voice note' 
          : (content && content.length > 60 ? `${content.slice(0, 60)}...` : content || 'New message');
        
        const notifTitle = `💬 New message from ${targetConnectionName}`;

        db.createNotification({
          userId: recipientId,
          title: notifTitle,
          message: previewText,
          type: 'message',
          linkTab: 'connections',
          linkId: connectionId,
        });

        if (client) {
          try {
            await client.from('notifications').insert({
              user_id: recipientId,
              title: notifTitle,
              message: previewText,
              type: 'message',
              link_tab: 'connections',
              link_id: connectionId,
              is_read: false,
              created_at: new Date().toISOString(),
            });
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn('Notification dispatch notice:', err?.message);
    }

    res.status(201).json(created);
  });

  app.delete('/api/messages/:id', async (req, res) => {
    const { id } = req.params;
    const client = getServerSupabaseClient();
    if (client) {
      try {
        await client.from('messages').delete().eq('id', id);
      } catch (e) {
        // Continue to memory delete
      }
    }
    db.deleteMessage(id);
    res.json({ success: true, id });
  });

  // --- Goals API ---
  app.get('/api/goals', async (req, res) => {
    const userId = (req.query.userId as string) || (await resolveUserId(req));
    if (!userId) return res.json([]);
    res.json(db.getGoals(userId));
  });

  app.post('/api/goals', async (req, res) => {
    const { title, description, category, targetDate, milestones, mentorId, userId } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const targetUserId = userId || (await resolveUserId(req)) || 'user_anonymous';

    const newGoal = db.createGoal({
      userId: targetUserId,
      title,
      description: description || '',
      category,
      targetDate: targetDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      status: 'not_started',
      milestones: Array.isArray(milestones) ? milestones : [],
      mentorId,
    });

    res.status(201).json(newGoal);
  });

  app.patch('/api/goals/:id', (req, res) => {
    const updated = db.updateGoal(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Goal not found' });
    res.json(updated);
  });

  app.delete('/api/goals/:id', async (req, res) => {
    const { id } = req.params;
    const callerId = await resolveUserId(req);

    // 1. Delete from Supabase if configured
    const client = getServerSupabaseClient();
    if (client) {
      try {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          await client.from('goals').delete().eq('id', id);
        }
      } catch (err) {
        console.warn('Supabase delete goal notice in server.ts:', err);
      }
    }

    // 2. Delete from persistent local DB
    db.deleteGoal(id, callerId || undefined);

    res.json({ success: true, id });
  });

  // --- Experience Library API ---
  app.get('/api/resources', (req, res) => {
    const { category, search, featured } = req.query;
    let items = db.getResources();

    if (category && typeof category === 'string' && category !== 'All') {
      items = items.filter(r => r.category === category);
    }
    if (featured === 'true') {
      items = items.filter(r => r.featured);
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase();
      items = items.filter(r => 
        r.title.toLowerCase().includes(q) || 
        r.summary.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q)) ||
        r.authorName.toLowerCase().includes(q)
      );
    }

    res.json(items);
  });

  app.get('/api/resources/:id', (req, res) => {
    const item = db.getResourceById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Resource not found' });
    res.json(item);
  });

  app.post('/api/resources', async (req, res) => {
    const { userId: authUserId, userProfile: authProfile } = await resolveAuthenticatedUser(req);
    const callerId = authUserId || 'user_admin_marcus';
    const user = authProfile || (await resolveUserById(callerId));
    const { title, summary, content, category, tags, featured, readTimeMinutes } = req.body;

    if (!title || !summary || !content) {
      return res.status(400).json({ error: 'Title, summary, and content are required' });
    }

    const created = db.createResource({
      title,
      summary,
      content,
      category: category || 'Career Advice',
      authorId: user?.id || 'admin',
      authorName: user?.name || 'MentorNexus Editor',
      authorTitle: user?.title || 'Lead Contributor',
      authorAvatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
      readTimeMinutes: Number(readTimeMinutes) || 5,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t: string) => t.trim()) : ['Career']),
      featured: Boolean(featured),
    });

    res.status(201).json(created);
  });

  app.patch('/api/resources/:id', (req, res) => {
    const updated = db.updateResource(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Resource not found' });
    res.json(updated);
  });

  app.delete('/api/resources/:id', (req, res) => {
    const success = db.deleteResource(req.params.id);
    if (!success) return res.status(404).json({ error: 'Resource not found' });
    res.json({ success: true });
  });

  // --- Notifications API ---
  app.get('/api/notifications', async (req, res) => {
    const userId = (req.query.userId as string) || (await resolveUserId(req));
    if (!userId) return res.json([]);

    const memNotifs = db.getNotifications(userId);
    const client = getServerSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const supaNotifs = data.map((n: any) => ({
            id: String(n.id),
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type || 'system',
            read: Boolean(n.is_read || n.read),
            linkTab: n.link_tab || n.linkTab,
            linkId: n.link_id || n.linkId,
            createdAt: n.created_at || new Date().toISOString(),
          }));

          // Merge without duplicates
          const seen = new Set(supaNotifs.map(n => `${n.title}_${n.message}`));
          const merged: any[] = [...supaNotifs];
          for (const mn of memNotifs) {
            const key = `${mn.title}_${mn.message}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(mn);
            }
          }
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return res.json(merged);
        }
      } catch {}
    }

    res.json(memNotifs);
  });

  app.post('/api/notifications', async (req, res) => {
    const { userId, title, message, type, linkTab, linkId } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title, and message are required' });
    }

    const client = getServerSupabaseClient();
    if (client) {
      try {
        await client.from('notifications').insert({
          user_id: userId,
          title,
          message,
          type: type || 'system',
          link_tab: linkTab || null,
          link_id: linkId || null,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch {}
    }

    const created = db.createNotification({
      userId,
      title,
      message,
      type: type || 'system',
      linkTab,
      linkId,
    });

    res.status(201).json(created);
  });

  app.patch('/api/notifications/:id/read', async (req, res) => {
    const callerId = await resolveUserId(req);
    const success = db.markNotificationRead(req.params.id, callerId || undefined);
    res.json({ success });
  });

  app.post('/api/notifications/read-all', async (req, res) => {
    const userId = req.body.userId || (await resolveUserId(req));
    if (!userId) return res.json({ success: true });
    const success = db.markAllNotificationsRead(userId);
    res.json({ success });
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    const callerId = await resolveUserId(req);
    const notifId = req.params.id;
    const client = getServerSupabaseClient();
    if (client) {
      try {
        await client.from('notifications').delete().eq('id', notifId);
      } catch (e) {
        console.warn('Supabase delete notification notice:', e);
      }
    }
    const success = db.deleteNotification(notifId, callerId || undefined);
    res.json({ success });
  });

  app.delete('/api/notifications', async (req, res) => {
    const userId = (req.query.userId as string) || (await resolveUserId(req));
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const client = getServerSupabaseClient();
    if (client) {
      try {
        await client.from('notifications').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Supabase clear notifications notice:', e);
      }
    }
    const success = db.clearAllNotifications(userId);
    res.json({ success });
  });

  app.post('/api/notifications/clear-all', async (req, res) => {
    const userId = req.body.userId || (await resolveUserId(req));
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const client = getServerSupabaseClient();
    if (client) {
      try {
        await client.from('notifications').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Supabase clear notifications notice:', e);
      }
    }
    const success = db.clearAllNotifications(userId);
    res.json({ success });
  });

  // --- Admin API ---
  app.get('/api/admin/stats', (req, res) => {
    res.json(db.getAdminStats());
  });

  app.post('/api/admin/verify/:id', (req, res) => {
    const { status, notes } = req.body;
    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ error: 'Invalid verification status' });
    }
    const updated = db.verifyUser(req.params.id, status, notes);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  });

  app.post('/api/admin/toggle-ban/:id', (req, res) => {
    const { banned } = req.body;
    const updated = db.toggleUserBan(req.params.id, Boolean(banned));
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  });

  // --- AI Smart Features (Gemini 3.7 Flash) ---
  app.post('/api/ai/match-mentors', async (req, res) => {
    try {
      const { userId: authUserId, userProfile: authProfile } = await resolveAuthenticatedUser(req);
      const targetId = req.body.userId || authUserId;
      const user = authProfile || (await resolveUserById(targetId));
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      let goals = db.getGoals(user.id);
      const client = getServerSupabaseClient();
      if (client && goals.length === 0) {
        try {
          const { data: supaGoals } = await client.from('goals').select('*').eq('user_id', user.id);
          if (supaGoals && supaGoals.length > 0) {
            goals = supaGoals.map((g: any) => ({
              id: String(g.id),
              userId: g.user_id,
              title: g.title,
              description: g.description || '',
              category: g.category || 'Career Growth',
              targetDate: g.target_date || '2026-06-01',
              status: g.status || 'in_progress',
              progress: Number(g.progress ?? 0),
              milestones: Array.isArray(g.milestones) ? g.milestones : [],
              createdAt: g.created_at || new Date().toISOString(),
              updatedAt: g.updated_at || new Date().toISOString(),
            }));
          }
        } catch {}
      }

      let mentors = db.getMentors();
      if (client) {
        try {
          const { data: supaMentors } = await client.from('profiles').select('*').or('is_mentor.eq.true,role.eq.mentor');
          if (supaMentors && supaMentors.length > 0) {
            mentors = supaMentors.map(mapServerProfile);
          }
        } catch {}
      }

      const matches = await generateMentorMatches(user, goals, mentors);
      res.json(matches);
    } catch (err: any) {
      console.error('Error in /api/ai/match-mentors:', err);
      res.status(500).json({ error: err.message || 'Failed to generate mentor matches' });
    }
  });

  app.post('/api/ai/breakdown-goal', async (req, res) => {
    try {
      const { title, description, category, targetDate } = req.body;
      if (!title) return res.status(400).json({ error: 'Goal title is required' });
      const result = await generateGoalBreakdown(title, description || '', category || 'Career Growth', targetDate || '2026-06-01');
      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/ai/breakdown-goal:', err);
      res.status(500).json({ error: err.message || 'Failed to breakdown goal' });
    }
  });

  app.post('/api/ai/polish-request', async (req, res) => {
    try {
      const { mentorId, draftMessage, goalsSummary, requesterId } = req.body;
      const { userId: authUserId, userProfile: authProfile } = await resolveAuthenticatedUser(req);
      const targetRequesterId = authUserId || requesterId || currentActiveUserId;
      
      const requester = authProfile || (await resolveUserById(targetRequesterId));
      const mentor = await resolveUserById(mentorId);

      if (!requester || !mentor) return res.status(404).json({ error: 'Requester or mentor not found' });

      const result = await polishMentorshipRequest(requester, mentor, draftMessage || '', goalsSummary);
      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/ai/polish-request:', err);
      res.status(500).json({ error: err.message || 'Failed to polish request' });
    }
  });

  app.post('/api/ai/career-advice', async (req, res) => {
    try {
      const { question } = req.body;
      const { userId: authUserId, userProfile: authProfile } = await resolveAuthenticatedUser(req);
      const targetUserId = authUserId || req.body.userId || currentActiveUserId;
      const user = authProfile || (await resolveUserById(targetUserId));
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      const goals = db.getGoals(user.id);
      const answer = await getCareerAdvisorResponse(question || 'How should I structure my 1:1 mentorship sessions for highest impact?', user, goals);
      res.json({ answer });
    } catch (err: any) {
      console.error('Error in /api/ai/career-advice:', err);
      res.status(500).json({ error: err.message || 'Failed to get advice' });
    }
  });

  // --- Vite / Static Middleware Setup ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MentorNexus server running at http://localhost:${PORT}`);
  });
}

startServer();
