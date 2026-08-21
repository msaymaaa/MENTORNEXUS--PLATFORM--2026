import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  GraduationCap, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Mail,
  User,
  RotateCcw,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/index';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase';
import { MentorNexusBrand } from './MentorNexusBrand';

export type AuthViewMode = 'choice' | 'signin' | 'signup' | 'forgot_password' | 'email_confirmation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthViewMode;
  initialRole?: 'student' | 'mentor';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'choice',
  initialRole = 'student'
}) => {
  const { registerUser, switchUser, signInWithEmail, allUsers } = useAuth();
  const { showToast, setActiveTab } = useApp();

  const [mode, setMode] = useState<AuthViewMode>(initialMode);
  const [role, setRole] = useState<'student' | 'mentor'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState('Technology & AI');
  const [skillsText, setSkillsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Sync mode if changed from props
  useEffect(() => {
    setMode(initialMode);
    if (initialRole) setRole(initialRole);
    setError(null);
    setInfoMessage(null);
  }, [initialMode, initialRole, isOpen]);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      const skillsArray = skillsText.split(',').map(s => s.trim()).filter(Boolean);
      
      const newUser = await registerUser({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role as UserRole,
        title: title.trim() || (role === 'student' ? 'Learner / Aspiring Professional' : 'Professional Practitioner'),
        organization: organization.trim() || 'Independent',
        industry: industry,
        skills: skillsArray.length > 0 ? skillsArray : ['Career Growth', 'Strategy'],
        bio: `${role === 'student' ? 'Aspiring professional' : 'Experienced mentor'} focused on ${industry}.`,
        yearsOfExperience: role === 'mentor' ? 5 : 1,
        mentoringAreas: role === 'mentor' ? ['Career Navigation', 'Technical Depth'] : ['Career Guidance'],
        interests: ['Professional Development', industry],
        verificationStatus: role === 'mentor' ? 'pending' : 'verified',
      });

      setRegisteredEmail(email.trim().toLowerCase());

      // If Supabase requires email verification
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        const { data: sessionData } = await client?.auth.getSession() || { data: { session: null } };
        
        if (!sessionData.session) {
          // Email confirmation is required by Supabase project
          setMode('email_confirmation');
          return;
        }
      }

      showToast('success', 'Account created successfully', `Welcome to MentorNexus, ${newUser.name}!`);
      onClose();
      setActiveTab('dashboard');
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('already registered') || err?.message?.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(err?.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setIsSubmitting(true);
      const loggedInUser = await signInWithEmail(email.trim(), password);
      showToast('success', 'Signed in successfully', `Welcome back, ${loggedInUser.name}!`);
      onClose();
      setActiveTab('dashboard');
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('email not confirmed') || err?.message?.toLowerCase().includes('not verified')) {
        setRegisteredEmail(email.trim());
        setMode('email_confirmation');
      } else {
        // Check if matching in local user list for easy evaluation fallback
        const matched = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (matched) {
          await switchUser(matched.id);
          showToast('success', 'Signed in successfully', `Welcome back, ${matched.name}!`);
          onClose();
          setActiveTab('dashboard');
        } else {
          setError("We couldn't sign you in. Please check your email and password.");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        if (client) {
          const { error: resetErr } = await client.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin
          });
          if (resetErr) throw resetErr;
        }
      }
      setInfoMessage(`Password reset link sent to ${email.trim()}. Please check your email inbox.`);
    } catch (err: any) {
      setError(err?.message || 'Could not send password reset email. Please verify the address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) return;
    try {
      setIsSubmitting(true);
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        if (client) {
          await client.auth.resend({
            type: 'signup',
            email: registeredEmail
          });
        }
      }
      showToast('success', 'Verification Resent', `A new verification email has been sent to ${registeredEmail}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (userId: string) => {
    try {
      setIsSubmitting(true);
      await switchUser(userId);
      const user = allUsers.find(u => u.id === userId);
      showToast('success', 'Authenticated', `Welcome, ${user?.name}!`);
      onClose();
      setActiveTab('dashboard');
    } catch (err: any) {
      setError('Failed to authenticate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#050608]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#10121D] border border-[#262A3C] rounded-3xl p-6 sm:p-9 shadow-2xl text-[#F5F2EB] max-h-[92vh] overflow-y-auto">
        
        {/* Top Header: Logo + Close Button */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#1E2234]">
          <MentorNexusBrand size="sm" />
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181B28] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Info / Success Notification */}
        {infoMessage && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-start space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE: CHOICE (Get Started Entry Choice) */}
        {/* ======================================================== */}
        {mode === 'choice' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F2EB]">
                Welcome to MentorNexus
              </h2>
              <p className="text-xs sm:text-sm text-[#9E9A90] leading-relaxed">
                Find the experience you need. Start with a goal and discover people who can help you move forward.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Option 1: Create an Account */}
              <div 
                id="auth-choice-create-account-card"
                onClick={() => { setMode('signup'); setError(null); }}
                className="group relative p-6 rounded-2xl bg-[#141724] border border-[#2A3045] hover:border-[#D4AF37] hover:bg-[#181C2C] transition-all cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-[#D4AF37]/10"
              >
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37] font-semibold">
                    New to MentorNexus?
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors">
                    Create an Account
                  </h3>
                  <p className="text-xs text-[#9E9A90] leading-relaxed">
                    Create your MentorNexus account and begin your mentorship journey.
                  </p>
                </div>
                <div className="pt-5 flex items-center text-xs font-bold uppercase tracking-wider text-[#D4AF37] group-hover:translate-x-1 transition-transform">
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </div>
              </div>

              {/* Option 2: Sign In */}
              <div 
                id="auth-choice-sign-in-card"
                onClick={() => { setMode('signin'); setError(null); }}
                className="group relative p-6 rounded-2xl bg-[#141724] border border-[#2A3045] hover:border-[#D4AF37] hover:bg-[#181C2C] transition-all cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-[#D4AF37]/10"
              >
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#9E9A90] font-semibold">
                    Already have an account?
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors">
                    Sign In
                  </h3>
                  <p className="text-xs text-[#9E9A90] leading-relaxed">
                    Already part of MentorNexus? Continue your journey.
                  </p>
                </div>
                <div className="pt-5 flex items-center text-xs font-bold uppercase tracking-wider text-[#F5F2EB] group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE: SIGN UP (Registration) */}
        {/* ======================================================== */}
        {mode === 'signup' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setMode('choice'); setError(null); }}
                className="inline-flex items-center space-x-1 text-xs text-[#9E9A90] hover:text-[#F5F2EB] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs text-[#9E9A90]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-[#D4AF37] hover:underline font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F2EB]">
                Start your mentorship journey.
              </h2>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Create your account and take the first step toward finding the right experience.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="block text-xs uppercase font-mono tracking-wider text-[#9E9A90]">Select Your Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setRole('student')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      role === 'student'
                        ? 'bg-[#181C2C] border-[#D4AF37] text-[#F5F2EB]'
                        : 'bg-[#141622] border-[#262A3C] text-[#9E9A90] hover:border-[#3D4460]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <GraduationCap className={`w-4 h-4 ${role === 'student' ? 'text-[#D4AF37]' : 'text-[#7A766E]'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">Learner / Mentee</span>
                    </div>
                    <p className="text-[10px] text-[#9E9A90] leading-relaxed">
                      Define goals, find experienced mentors, and track milestone roadmaps.
                    </p>
                  </div>

                  <div
                    onClick={() => setRole('mentor')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      role === 'mentor'
                        ? 'bg-[#181C2C] border-[#D4AF37] text-[#F5F2EB]'
                        : 'bg-[#141622] border-[#262A3C] text-[#9E9A90] hover:border-[#3D4460]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Briefcase className={`w-4 h-4 ${role === 'mentor' ? 'text-[#D4AF37]' : 'text-[#7A766E]'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">Professional Mentor</span>
                    </div>
                    <p className="text-[10px] text-[#9E9A90] leading-relaxed">
                      Share your experience, review requests, and guide ambitious learners.
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    id="signup-fullname-input"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    id="signup-email-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      id="signup-password-input"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      id="signup-confirmpassword-input"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Profile Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Current Title / Degree</label>
                  <input
                    type="text"
                    placeholder={role === 'student' ? 'e.g. CS Student' : 'e.g. Staff Architect'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Organization / University</label>
                  <input
                    type="text"
                    placeholder="e.g. Stanford University"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Primary Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="Technology & AI">Technology & AI</option>
                  <option value="Product Management & SaaS">Product Management & SaaS</option>
                  <option value="UI/UX & Product Design">UI/UX & Product Design</option>
                  <option value="Cloud Engineering & DevOps">Cloud Engineering & DevOps</option>
                  <option value="Cybersecurity & Infosec">Cybersecurity & Infosec</option>
                  <option value="Financial Technology">Financial Technology</option>
                  <option value="Entrepreneurship & Startups">Entrepreneurship & Startups</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                  Key Skills / Focus Areas <span className="text-[10px] text-[#7A766E] lowercase">(comma separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Python, System Design, Career Planning"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                id="signup-submit-button"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#D4AF37]/15 disabled:opacity-50 mt-4"
              >
                <span>{isSubmitting ? 'Creating Profile...' : 'Create Account →'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE: SIGN IN */}
        {/* ======================================================== */}
        {mode === 'signin' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setMode('choice'); setError(null); }}
                className="inline-flex items-center space-x-1 text-xs text-[#9E9A90] hover:text-[#F5F2EB] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs text-[#9E9A90]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-[#D4AF37] hover:underline font-semibold cursor-pointer"
                >
                  Create Account
                </button>
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F2EB]">
                Welcome back.
              </h2>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Continue your journey with MentorNexus.
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    id="signin-email-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90]">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setError(null); setInfoMessage(null); }}
                    className="text-[11px] text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    id="signin-password-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="signin-submit-button"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#D4AF37]/15 disabled:opacity-50 mt-4"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In →'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE: FORGOT PASSWORD */}
        {/* ======================================================== */}
        {mode === 'forgot_password' && (
          <div className="space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F2EB]">
                Reset your password.
              </h2>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Enter your email address and we will send you instructions to reset your password.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                  Your Account Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    id="forgot-password-email-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#D4AF37]/15 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Sending Link...' : 'Send Password Reset Link →'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setInfoMessage(null); }}
                  className="text-xs text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE: EMAIL CONFIRMATION */}
        {/* ======================================================== */}
        {mode === 'email_confirmation' && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto text-[#D4AF37]">
              <Mail className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-bold text-[#F5F2EB]">Check your email</h3>
              <p className="text-xs text-[#9E9A90] max-w-sm mx-auto leading-relaxed">
                We've sent a verification link to <span className="text-[#F5F2EB] font-mono font-semibold">{registeredEmail || email}</span>.
              </p>
              <p className="text-xs text-[#9E9A90] max-w-sm mx-auto leading-relaxed font-medium text-[#D4AF37]">
                Please verify your email before continuing to MentorNexus.
              </p>
            </div>

            <div className="space-y-3 pt-2 max-w-sm mx-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleResendVerification}
                className="w-full py-3 rounded-xl bg-[#181B28] hover:bg-[#232738] text-[#D4AF37] border border-[#343A52] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resend Verification Email</span>
              </button>

              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* 1-Click Evaluation Personas for Seamless Testing */}
        {mode !== 'email_confirmation' && (
          <div className="mt-8 pt-6 border-t border-[#1E2234] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#7A766E]">Evaluation Profiles</span>
              <span className="text-[10px] text-[#D4AF37] font-mono">1-Click Instant Access</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u.id)}
                  className="p-2.5 rounded-xl bg-[#141622] hover:bg-[#1C2030] border border-[#262A3C] hover:border-[#D4AF37]/40 text-left transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      u.role === 'admin' ? 'bg-purple-400' : u.role === 'mentor' ? 'bg-[#D4AF37]' : 'bg-[#10B981]'
                    }`} />
                    <span className="text-xs font-semibold text-[#F5F2EB] truncate">{u.name}</span>
                  </div>
                  <span className="text-[10px] text-[#7A766E] uppercase font-mono mt-1 capitalize">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
