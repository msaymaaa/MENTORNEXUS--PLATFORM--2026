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
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP (Task 2 & Task 5)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_role TEXT;
  user_full_name TEXT;
  default_title TEXT;
  default_bio TEXT;
  default_avatar TEXT;
  user_exp INTEGER;
  user_verification TEXT;
BEGIN
  -- Extract role from metadata safely, defaulting to 'student'
  raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF raw_role NOT IN ('student', 'early_career', 'mentor', 'admin') THEN
    raw_role := 'student';
  END IF;

  -- Extract or derive full_name
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1),
    'MentorNexus Member'
  );

  -- Set contextual defaults based on role
  IF raw_role = 'mentor' THEN
    default_title := COALESCE(NEW.raw_user_meta_data->>'title', 'Industry Mentor');
    default_bio := 'Experienced mentor passionate about guiding early-career talent and sharing domain insights.';
    default_avatar := 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80';
    user_exp := 5;
    user_verification := 'verified';
  ELSIF raw_role = 'early_career' THEN
    default_title := COALESCE(NEW.raw_user_meta_data->>'title', 'Early-Career Professional');
    default_bio := 'Early-career practitioner focused on developing technical depth and strategic career momentum.';
    default_avatar := 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80';
    user_exp := 2;
    user_verification := 'verified';
  ELSE
    default_title := COALESCE(NEW.raw_user_meta_data->>'title', 'Student / Learner');
    default_bio := 'Motivated learner focused on professional growth, strategic career navigation, and tech depth.';
    default_avatar := 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
    user_exp := 1;
    user_verification := 'verified';
  END IF;

  -- Insert profile idempotently with SECURITY DEFINER
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    title,
    organization,
    industry,
    bio,
    avatar,
    avatar_url,
    years_of_experience,
    skills,
    mentoring_areas,
    interests,
    availability,
    rating,
    review_count,
    verification_status,
    is_mentor,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    raw_role,
    default_title,
    'Independent',
    'Technology & AI',
    default_bio,
    default_avatar,
    default_avatar,
    user_exp,
    ARRAY['Career Growth', 'Strategy', 'Technical Depth'],
    CASE WHEN raw_role = 'mentor' THEN ARRAY['Career Navigation', 'Technical Depth', 'Leadership'] ELSE ARRAY['Career Guidance', 'Skill Development'] END,
    ARRAY['Professional Development', 'Technology & AI'],
    CASE WHEN raw_role = 'mentor' THEN '2 hours / week' ELSE 'Open' END,
    4.9,
    12,
    user_verification,
    (raw_role = 'mentor'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    role = CASE WHEN public.profiles.role IS NULL THEN EXCLUDED.role ELSE public.profiles.role END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists to avoid duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users so every future signup automatically creates a profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- IDEMPOTENT PROFILE REPAIR FOR EXISTING USERS (Task 3: Buraq & Ayma)
-- ------------------------------------------------------------
-- Backfill any existing auth.users who do not yet have a corresponding public.profiles row
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  title,
  organization,
  industry,
  bio,
  avatar,
  avatar_url,
  years_of_experience,
  skills,
  mentoring_areas,
  interests,
  availability,
  rating,
  review_count,
  verification_status,
  is_mentor,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1), 'MentorNexus Member') AS full_name,
  COALESCE(u.raw_user_meta_data->>'role', 'mentor') AS role,
  CASE WHEN COALESCE(u.raw_user_meta_data->>'role', 'mentor') = 'mentor' THEN 'Industry Mentor' ELSE 'Learner / Member' END AS title,
  'Independent' AS organization,
  'Technology & AI' AS industry,
  'Experienced mentor passionate about guiding early-career talent and sharing domain insights.' AS bio,
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' AS avatar,
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' AS avatar_url,
  5 AS years_of_experience,
  ARRAY['Career Growth', 'Strategy', 'Technical Depth', 'System Architecture'] AS skills,
  ARRAY['Career Navigation', 'Technical Depth', 'Leadership'] AS mentoring_areas,
  ARRAY['Professional Development', 'Technology & AI'] AS interests,
  '2 hours / week' AS availability,
  4.9 AS rating,
  12 AS review_count,
  'verified' AS verification_status,
  (COALESCE(u.raw_user_meta_data->>'role', 'mentor') = 'mentor') AS is_mentor,
  COALESCE(u.created_at, NOW()) AS created_at,
  NOW() AS updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

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

-- ------------------------------------------------------------
-- IDEMPOTENT SCHEMA MIGRATIONS & COMPATIBILITY HELPERS
-- ------------------------------------------------------------
-- 1. Ensure category and mentor_id columns exist on public.goals
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Career Development';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS milestones JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Ensure mentorship_requests columns exist (focus_area, goals_summary, response_note, preferred_cadence)
ALTER TABLE public.mentorship_requests ADD COLUMN IF NOT EXISTS focus_area TEXT;
ALTER TABLE public.mentorship_requests ADD COLUMN IF NOT EXISTS goals_summary TEXT;
ALTER TABLE public.mentorship_requests ADD COLUMN IF NOT EXISTS preferred_cadence TEXT DEFAULT 'Bi-weekly 1:1';
ALTER TABLE public.mentorship_requests ADD COLUMN IF NOT EXISTS response_note TEXT;
ALTER TABLE public.mentorship_requests ADD COLUMN IF NOT EXISTS response_notes TEXT;

-- 3. Ensure profiles columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_mentor BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Remote';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 4. Compatibility views and tables for synonym tables if not present
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.mentorship_requests(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'archived')) DEFAULT 'active',
  cadence TEXT DEFAULT 'Bi-weekly 1:1',
  focus_areas TEXT[] DEFAULT '{"Career Growth"}',
  notes TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  next_session_date TIMESTAMPTZ,
  last_meeting_date TIMESTAMPTZ,
  next_meeting_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS focus_areas TEXT[] DEFAULT '{"Career Growth"}';
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS last_meeting_date TIMESTAMPTZ;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS next_meeting_date TIMESTAMPTZ;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can view connections" ON public.connections;
CREATE POLICY "Participants can view connections" ON public.connections FOR SELECT USING (auth.uid() = student_id OR auth.uid() = mentor_id OR auth.uid() = requester_id);
DROP POLICY IF EXISTS "Participants can manage connections" ON public.connections;
CREATE POLICY "Participants can manage connections" ON public.connections FOR ALL USING (auth.uid() = student_id OR auth.uid() = mentor_id OR auth.uid() = requester_id);

CREATE TABLE IF NOT EXISTS public.experience_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Career',
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  read_time_minutes INTEGER DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  views_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.experience_library ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.experience_library ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.experience_library ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.experience_resources ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.experience_resources ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

ALTER TABLE public.experience_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Experience library readable by authenticated" ON public.experience_library;
CREATE POLICY "Experience library readable by authenticated" ON public.experience_library FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authors can insert into experience library" ON public.experience_library;
CREATE POLICY "Authors can insert into experience library" ON public.experience_library FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authors can update their experience library" ON public.experience_library;
CREATE POLICY "Authors can update their experience library" ON public.experience_library FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authors can delete their experience library" ON public.experience_library;
CREATE POLICY "Authors can delete their experience library" ON public.experience_library FOR DELETE USING (auth.uid() = author_id);

-- 5. Ensure notifications columns
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_id TEXT;

-- 6. Canonical Messages Table (for 1:1 Connected Mentorship Messaging & Voice Notes)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'voice', 'file')) DEFAULT 'text',
  voice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connection participants can view messages" ON public.messages;
CREATE POLICY "Connection participants can view messages" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = messages.connection_id
      AND (auth.uid() = c.student_id OR auth.uid() = c.mentor_id OR auth.uid() = c.requester_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.mentorship_relationships r
      WHERE r.id = messages.connection_id
      AND (auth.uid() = r.requester_id OR auth.uid() = r.mentor_id)
    )
  );

DROP POLICY IF EXISTS "Connection participants can insert messages" ON public.messages;
CREATE POLICY "Connection participants can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM public.connections c
        WHERE c.id = messages.connection_id
        AND (auth.uid() = c.student_id OR auth.uid() = c.mentor_id OR auth.uid() = c.requester_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.mentorship_relationships r
        WHERE r.id = messages.connection_id
        AND (auth.uid() = r.requester_id OR auth.uid() = r.mentor_id)
      )
    )
  );

DROP POLICY IF EXISTS "Message senders can delete their own messages" ON public.messages;
CREATE POLICY "Message senders can delete their own messages" ON public.messages
  FOR DELETE USING (
    auth.uid() = sender_id
  );

-- 7. Canonical Network Relationships Table (Independent Professional Networking)
CREATE TABLE IF NOT EXISTS public.network_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

ALTER TABLE public.network_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own network relationships" ON public.network_relationships;
CREATE POLICY "Users can view their own network relationships" ON public.network_relationships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can create network requests" ON public.network_relationships;
CREATE POLICY "Users can create network requests" ON public.network_relationships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update their network relationships" ON public.network_relationships;
CREATE POLICY "Users can update their network relationships" ON public.network_relationships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- ------------------------------------------------------------
-- PERFORMANCE INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_requester ON public.mentorship_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_mentor ON public.mentorship_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_connections_student ON public.connections(student_id);
CREATE INDEX IF NOT EXISTS idx_connections_mentor ON public.connections(mentor_id);
CREATE INDEX IF NOT EXISTS idx_network_relationships_requester ON public.network_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_network_relationships_recipient ON public.network_relationships(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON public.messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- PostgREST Schema Reload
NOTIFY pgrst, 'reload schema';


