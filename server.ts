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
import { UserRole } from './src/types/index';

dotenv.config();

let currentActiveUserId = 'user_sarah_learner'; // Default active persona

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', platform: 'MentorNexus', timestamp: new Date().toISOString() });
  });

  // --- Auth & Users API ---
  app.get('/api/auth/current-user', (req, res) => {
    const user = db.getUserById(currentActiveUserId) || db.getUsers()[0];
    res.json(user);
  });

  app.post('/api/auth/switch-user', (req, res) => {
    const { userId } = req.body;
    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    currentActiveUserId = user.id;
    res.json({ success: true, user });
  });

  app.get('/api/auth/users', (req, res) => {
    res.json(db.getUsers());
  });

  app.post('/api/auth/register', (req, res) => {
    const { 
      name, 
      email, 
      role, 
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

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const defaultAvatars: Record<UserRole, string> = {
      student: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      early_career: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      mentor: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      admin: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    };

    const newUser = db.createUser({
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
      verificationStatus: role === 'mentor' ? 'pending' : 'verified',
      createdAt: new Date().toISOString(),
    });

    currentActiveUserId = newUser.id;
    res.status(201).json(newUser);
  });

  app.get('/api/profiles/:id', (req, res) => {
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Profile not found' });
    res.json(user);
  });

  app.patch('/api/profiles/:id', (req, res) => {
    const updated = db.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Profile not found' });
    res.json(updated);
  });

  // --- Mentor Discovery API ---
  app.get('/api/mentors', (req, res) => {
    const { search, industry, skill, minExp, availability, verifiedOnly } = req.query;
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
  app.get('/api/requests', (req, res) => {
    const userId = (req.query.userId as string) || currentActiveUserId;
    const requests = db.getRequests(userId);
    res.json(requests);
  });

  app.post('/api/requests', (req, res) => {
    const { mentorId, message, goalsSummary } = req.body;
    const requester = db.getUserById(currentActiveUserId);
    const mentor = db.getUserById(mentorId);

    if (!requester) return res.status(401).json({ error: 'Unauthorized: invalid requester' });
    if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
    if (requester.id === mentor.id) {
      return res.status(400).json({ error: 'You cannot request mentorship from yourself' });
    }

    // Check if duplicate pending or accepted request exists
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
      message: message || `Hello ${mentor.name}, I would love to connect for mentorship on ${mentor.mentoringAreas[0] || 'career development'}.`,
      goalsSummary: goalsSummary || '',
    });

    res.status(201).json(created);
  });

  app.patch('/api/requests/:id/respond', (req, res) => {
    const { status, responseNote } = req.body;
    if (status !== 'accepted' && status !== 'declined') {
      return res.status(400).json({ error: 'Status must be accepted or declined' });
    }

    const updated = db.respondToRequest(req.params.id, status, responseNote);
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json(updated);
  });

  app.delete('/api/requests/:id/cancel', (req, res) => {
    const success = db.cancelRequest(req.params.id, currentActiveUserId);
    if (!success) return res.status(400).json({ error: 'Could not cancel request' });
    res.json({ success: true });
  });

  // --- Connections API ---
  app.get('/api/connections', (req, res) => {
    const userId = (req.query.userId as string) || currentActiveUserId;
    res.json(db.getConnections(userId));
  });

  app.patch('/api/connections/:id', (req, res) => {
    const updated = db.updateConnection(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Connection not found' });
    res.json(updated);
  });

  // --- Goals API ---
  app.get('/api/goals', (req, res) => {
    const userId = (req.query.userId as string) || currentActiveUserId;
    res.json(db.getGoals(userId));
  });

  app.post('/api/goals', (req, res) => {
    const { title, description, category, targetDate, milestones, mentorId } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const newGoal = db.createGoal({
      userId: currentActiveUserId,
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

  app.delete('/api/goals/:id', (req, res) => {
    const success = db.deleteGoal(req.params.id, currentActiveUserId);
    if (!success) return res.status(404).json({ error: 'Goal not found or unauthorized' });
    res.json({ success: true });
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

  app.post('/api/resources', (req, res) => {
    const user = db.getUserById(currentActiveUserId);
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
  app.get('/api/notifications', (req, res) => {
    const userId = (req.query.userId as string) || currentActiveUserId;
    res.json(db.getNotifications(userId));
  });

  app.patch('/api/notifications/:id/read', (req, res) => {
    const success = db.markNotificationRead(req.params.id, currentActiveUserId);
    res.json({ success });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const userId = req.body.userId || currentActiveUserId;
    const success = db.markAllNotificationsRead(userId);
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
      const user = db.getUserById(currentActiveUserId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const goals = db.getGoals(user.id);
      const mentors = db.getMentors();
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
      const { mentorId, draftMessage, goalsSummary } = req.body;
      const requester = db.getUserById(currentActiveUserId);
      const mentor = db.getUserById(mentorId);
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
      const user = db.getUserById(currentActiveUserId);
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
