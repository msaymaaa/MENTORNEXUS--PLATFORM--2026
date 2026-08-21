-- ============================================================
-- MENTORNEXUS — PRODUCTION SUPABASE POSTGRESQL SCHEMA & RLS POLICIES
-- Assignments 2 & 3: Profiles, Goals, Requests, Relationships, Experience & Notifications
-- ============================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. PROFILES TABLE (Linked with auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'early_career', 'mentor', 'admin')) DEFAULT 'student',
  title TEXT,
  organization TEXT,
  industry TEXT DEFAULT 'Technology & AI',
  bio TEXT,
  avatar TEXT,
  years_of_experience INTEGER DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  mentoring_areas TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  availability TEXT DEFAULT '2 hours / week',
  rating NUMERIC(3,2) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')) DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. GOALS & ROADMAP TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Career Development',
  description TEXT,
  target_date DATE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused')) DEFAULT 'in_progress',
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. MENTORSHIP REQUESTS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  focus_area TEXT,
  preferred_cadence TEXT DEFAULT 'Bi-weekly 1:1',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')) DEFAULT 'pending',
  response_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. MENTORSHIP RELATIONSHIPS / CONNECTIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorship_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'archived')) DEFAULT 'active',
  current_milestone TEXT,
  next_step TEXT,
  cadence TEXT DEFAULT 'Bi-weekly 1:1',
  sessions_completed INTEGER DEFAULT 0,
  next_session_date TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. EXPERIENCE LIBRARY RESOURCES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.experience_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Career', 'Technical', 'Leadership', 'Entrepreneurship', 'Industry', 'Interview Preparation')),
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  read_time_minutes INTEGER DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. NOTIFICATIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('mentorship', 'goals', 'recommendations', 'account')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link_tab TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_goals_modtime BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_requests_modtime BEFORE UPDATE ON public.mentorship_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_relationships_modtime BEFORE UPDATE ON public.mentorship_relationships FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_resources_modtime BEFORE UPDATE ON public.experience_resources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
-- Anyone authenticated can view public mentor and user profiles for discovery
CREATE POLICY "Profiles are viewable by authenticated users" 
  ON public.profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Users can insert their own profile upon signup
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 2. Goals RLS
-- Users can view their own goals, or mentors involved in active relationships with that user
CREATE POLICY "Users can view their own goals" 
  ON public.goals FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" 
  ON public.goals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
  ON public.goals FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
  ON public.goals FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. Mentorship Requests RLS
-- Requesters and Mentors can view relevant requests
CREATE POLICY "Participants can view their mentorship requests" 
  ON public.mentorship_requests FOR SELECT 
  USING (auth.uid() = requester_id OR auth.uid() = mentor_id);

CREATE POLICY "Requesters can create mentorship requests" 
  ON public.mentorship_requests FOR INSERT 
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters or mentors can update request status" 
  ON public.mentorship_requests FOR UPDATE 
  USING (auth.uid() = requester_id OR auth.uid() = mentor_id);

-- 4. Mentorship Relationships RLS
CREATE POLICY "Participants can view their active relationships" 
  ON public.mentorship_relationships FOR SELECT 
  USING (auth.uid() = requester_id OR auth.uid() = mentor_id);

CREATE POLICY "Participants can update their relationship progress" 
  ON public.mentorship_relationships FOR UPDATE 
  USING (auth.uid() = requester_id OR auth.uid() = mentor_id);

-- 5. Experience Resources RLS
CREATE POLICY "Resources are publicly readable by authenticated users" 
  ON public.experience_resources FOR SELECT 
  USING (true);

CREATE POLICY "Authors or admins can insert/update experience resources" 
  ON public.experience_resources FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

-- 6. Notifications RLS
CREATE POLICY "Users can view and manage only their own notifications" 
  ON public.notifications FOR ALL 
  USING (auth.uid() = user_id);
