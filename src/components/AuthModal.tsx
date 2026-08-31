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
  ChevronLeft,
  Loader2,
  Clock,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/index';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase';
import { MentorNexusBrand } from './MentorNexusBrand';

export type AuthViewMode = 'choice' | 'signin' | 'signup' | 'forgot_password' | 'update_password' | 'reset_password' | 'email_confirmation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthViewMode;
  initialRole?: 'student' | 'early_career' | 'mentor';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'choice',
  initialRole = 'student'
}) => {
  const { 
    registerUser, 
    signInWithEmail, 
    resetPasswordForEmail,
    updatePassword,
    resendConfirmationEmail, 
    checkConfirmationStatus, 
    currentUser 
  } = useAuth();
  const { showToast, setActiveTab } = useApp();

  const [mode, setMode] = useState<AuthViewMode>(initialMode);
  const [role, setRole] = useState<'student' | 'early_career' | 'mentor'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [organization, setOrganization] = useState('');
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState('Technology & AI');
  const [skillsText, setSkillsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Sync mode if changed from props
  useEffect(() => {
    setMode(initialMode);
    if (initialRole) setRole(initialRole);
    setError(null);
    setInfoMessage(null);
    setShowSignInPassword(false);
    setShowSignUpPassword(false);
    setShowSignUpConfirmPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setNewPassword('');
    setConfirmNewPassword('');
  }, [initialMode, initialRole, isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-detect confirmed session when modal is open
  useEffect(() => {
    if (isOpen && currentUser && mode === 'email_confirmation') {
      showToast('success', 'Email confirmed!', `Welcome to MentorNexus, ${currentUser.name}!`);
      onClose();
      setActiveTab('dashboard');
    }
  }, [currentUser, isOpen, mode, onClose, setActiveTab, showToast]);

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
      const cleanEmail = email.trim().toLowerCase();
      
      const defaultTitle = role === 'student' 
        ? 'Student / Learner' 
        : role === 'early_career' 
          ? 'Early-Career Professional' 
          : 'Professional Mentor';

      const regResult = await registerUser({
        name: fullName.trim(),
        email: cleanEmail,
        password: password,
        role: role as UserRole,
        title: title.trim() || defaultTitle,
        organization: organization.trim() || 'Independent',
        industry: industry,
        skills: skillsArray.length > 0 ? skillsArray : ['Career Growth', 'Strategy'],
        bio: `${role === 'student' ? 'Student / Learner' : role === 'early_career' ? 'Early-career practitioner' : 'Experienced mentor'} focused on ${industry}.`,
        yearsOfExperience: role === 'mentor' ? 5 : (role === 'early_career' ? 2 : 1),
        mentoringAreas: role === 'mentor' ? ['Career Navigation', 'Technical Depth', 'Leadership'] : ['Career Guidance', 'Skill Development'],
        interests: ['Professional Development', industry],
        verificationStatus: role === 'mentor' ? 'pending' : 'verified',
      });

      setRegisteredEmail(cleanEmail);

      if (regResult.requiresEmailConfirmation) {
        setMode('email_confirmation');
        setInfoMessage(`We've sent a verification link to ${cleanEmail}. Please check your inbox to confirm your account.`);
        setResendCooldown(60);
        return;
      }

      showToast('success', 'Account created successfully', `Welcome to MentorNexus, ${regResult.user.name}!`);
      onClose();
      setActiveTab('dashboard');
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('already registered') || err?.message?.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err?.isRateLimit || err?.message?.toLowerCase().includes('rate limit') || err?.message?.toLowerCase().includes('over_email_send_rate_limit')) {
        setError('Supabase email rate limit exceeded. If you already created this account previously, your account exists — please click "Sign In" with your password. If you need a new confirmation email, please wait a few minutes or disable email confirmation in your Supabase Auth settings.');
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
      if (
        err?.isEmailNotConfirmed || 
        err?.message?.toLowerCase().includes('email not confirmed') || 
        err?.message?.toLowerCase().includes('not verified') ||
        err?.message?.toLowerCase().includes('unconfirmed')
      ) {
        setRegisteredEmail(email.trim().toLowerCase());
        setMode('email_confirmation');
        setError(null);
        setInfoMessage('Your email address has not been confirmed yet. Please verify your email or request a new confirmation link.');
      } else {
        setError(err?.message || "Invalid email or password. Please check your credentials.");
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
      const res = await resetPasswordForEmail(email.trim());
      setInfoMessage(res.message || `Password reset link sent to ${email.trim()}. Please check your email inbox.`);
      showToast('success', 'Reset Link Sent', `Password reset instructions sent to ${email.trim()}.`);
    } catch (err: any) {
      setError(err?.message || 'Could not send password reset email. Please verify the address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(newPassword);

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setNewPassword('');
      setConfirmNewPassword('');
      setPassword('');
      setConfirmPassword('');
      showToast('success', 'Password Updated', 'Your password has been successfully updated. Please sign in with your new credentials.');
      setMode('signin');
      setInfoMessage('Password updated successfully! Please sign in with your new password.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Your reset link may be invalid or expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = registeredEmail || email;
    if (!targetEmail) {
      setError('Please provide your email address to resend the confirmation link.');
      return;
    }

    if (resendCooldown > 0) {
      setInfoMessage(`Please wait ${resendCooldown}s before requesting another confirmation email.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await resendConfirmationEmail(targetEmail);
      setInfoMessage(res.message || `A new verification email has been sent to ${targetEmail}.`);
      showToast('success', 'Verification Resent', `Check ${targetEmail} for the confirmation link.`);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification email.');
      if (err?.message?.toLowerCase().includes('rate limit') || err?.message?.toLowerCase().includes('wait')) {
        setResendCooldown(60);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckConfirmation = async () => {
    const targetEmail = registeredEmail || email;
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await checkConfirmationStatus(targetEmail);
      if (res.confirmed && res.user) {
        showToast('success', 'Email confirmed!', `Welcome to MentorNexus, ${res.user.name}!`);
        onClose();
        setActiveTab('dashboard');
      } else {
        setInfoMessage('Confirmation not detected yet. Please ensure you clicked the link in your email, or wait a few seconds and check again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not verify status. Please try again.');
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
          <div className="mb-5 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex flex-col space-y-2.5">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
            {mode === 'signup' && (error.toLowerCase().includes('sign in') || error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('already exists') || error.toLowerCase().includes('already registered')) && (
              <div className="pl-7">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0B10] font-bold text-xs transition-colors cursor-pointer"
                >
                  <span>Switch to Sign In →</span>
                </button>
              </div>
            )}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setRole('student')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      role === 'student'
                        ? 'bg-[#181C2C] border-[#D4AF37] text-[#F5F2EB]'
                        : 'bg-[#141622] border-[#262A3C] text-[#9E9A90] hover:border-[#3D4460]'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <GraduationCap className={`w-4 h-4 ${role === 'student' ? 'text-[#D4AF37]' : 'text-[#7A766E]'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">Learner</span>
                    </div>
                    <p className="text-[10px] text-[#9E9A90] leading-relaxed">
                      Define goals, find mentors, and track milestones.
                    </p>
                  </div>

                  <div
                    onClick={() => setRole('early_career')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      role === 'early_career'
                        ? 'bg-[#181C2C] border-[#D4AF37] text-[#F5F2EB]'
                        : 'bg-[#141622] border-[#262A3C] text-[#9E9A90] hover:border-[#3D4460]'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Briefcase className={`w-4 h-4 ${role === 'early_career' ? 'text-[#D4AF37]' : 'text-[#7A766E]'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">Early-Career</span>
                    </div>
                    <p className="text-[10px] text-[#9E9A90] leading-relaxed">
                      Accelerate progression and prepare for milestones.
                    </p>
                  </div>

                  <div
                    onClick={() => setRole('mentor')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      role === 'mentor'
                        ? 'bg-[#181C2C] border-[#D4AF37] text-[#F5F2EB]'
                        : 'bg-[#141622] border-[#262A3C] text-[#9E9A90] hover:border-[#3D4460]'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Shield className={`w-4 h-4 ${role === 'mentor' ? 'text-[#D4AF37]' : 'text-[#7A766E]'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">Mentor</span>
                    </div>
                    <p className="text-[10px] text-[#9E9A90] leading-relaxed">
                      Share experience and guide ambitious talent.
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
                    <Lock className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      id="signup-password-input"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      id="signup-password-toggle-button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 top-2.5 p-1 text-[#7A766E] hover:text-[#D4AF37] transition-colors focus:outline-none cursor-pointer flex items-center justify-center rounded-lg"
                      aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                      title={showSignUpPassword ? "Hide password" : "Show password"}
                    >
                      {showSignUpPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showSignUpConfirmPassword ? 'text' : 'password'}
                      required
                      id="signup-confirmpassword-input"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      id="signup-confirmpassword-toggle-button"
                      onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                      className="absolute right-3 top-2.5 p-1 text-[#7A766E] hover:text-[#D4AF37] transition-colors focus:outline-none cursor-pointer flex items-center justify-center rounded-lg"
                      aria-label={showSignUpConfirmPassword ? "Hide password" : "Show password"}
                      title={showSignUpConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showSignUpConfirmPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
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
                  <Lock className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    id="signin-password-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    id="signin-password-toggle-button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-2.5 p-1 text-[#7A766E] hover:text-[#D4AF37] transition-colors focus:outline-none cursor-pointer flex items-center justify-center rounded-lg"
                    aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    title={showSignInPassword ? "Hide password" : "Show password"}
                  >
                    {showSignInPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
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
        {/* MODE: SET NEW PASSWORD / RESET PASSWORD */}
        {/* ======================================================== */}
        {(mode === 'update_password' || mode === 'reset_password') && (
          <div className="space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F2EB]">
                Set new password.
              </h2>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Please enter a secure new password for your MentorNexus account.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                  New Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    id="update-new-password-input"
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    id="update-new-password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 p-1 text-[#7A766E] hover:text-[#D4AF37] transition-colors focus:outline-none cursor-pointer flex items-center justify-center rounded-lg"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">
                  Confirm New Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    required
                    id="update-confirm-new-password-input"
                    placeholder="Re-enter your new password"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    id="update-confirm-new-password-toggle-btn"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-2.5 p-1 text-[#7A766E] hover:text-[#D4AF37] transition-colors focus:outline-none cursor-pointer flex items-center justify-center rounded-lg"
                    aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                    title={showConfirmNewPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmNewPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="submit-update-password-btn"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#D4AF37]/15 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#090A0F]" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password →</span>
                  )}
                </button>
              </div>

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
          <div className="space-y-6 py-2">
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto text-[#D4AF37] shadow-xl shadow-[#D4AF37]/5">
                <Mail className="w-8 h-8 text-[#D4AF37]" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] border-2 border-[#10121D] flex items-center justify-center">
                  <CheckCircle2 className="w-2.5 h-2.5 text-[#090A0F]" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F2EB]">Check your email</h3>
                <p className="text-xs text-[#9E9A90] max-w-md mx-auto leading-relaxed">
                  We have sent a verification link to{' '}
                  <span className="text-[#F5F2EB] font-mono font-semibold bg-[#181B28] px-2 py-0.5 rounded border border-[#2D3349]">
                    {registeredEmail || email || 'your email'}
                  </span>
                </p>
                <p className="text-xs text-[#D4AF37] font-medium max-w-sm mx-auto">
                  Please click the link in the email to activate your account and access MentorNexus.
                </p>
              </div>
            </div>

            {/* Instruction Steps Card */}
            <div className="bg-[#141624] border border-[#262A3C] rounded-2xl p-4 sm:p-5 text-left space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-[#1E2234] border border-[#343A52] text-[#D4AF37] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-[#9E9A90] leading-relaxed">
                  <span className="text-[#F5F2EB] font-medium block">Open your inbox</span>
                  Look for an email from MentorNexus or Supabase Auth.
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-[#1E2234] border border-[#343A52] text-[#D4AF37] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-[#9E9A90] leading-relaxed">
                  <span className="text-[#F5F2EB] font-medium block">Click the confirmation link</span>
                  Confirming your email authorizes your account securely.
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-[#1E2234] border border-[#343A52] text-[#D4AF37] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-[#9E9A90] leading-relaxed">
                  <span className="text-[#F5F2EB] font-medium block">Return to MentorNexus</span>
                  Once confirmed, you will immediately gain full platform access.
                </div>
              </div>
            </div>

            {/* Spam notice */}
            <p className="text-[11px] text-[#7A766E] text-center italic">
              Didn't see the email? Please check your Spam or Promotions folder.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                id="check-confirmation-status-btn"
                disabled={isSubmitting}
                onClick={handleCheckConfirmation}
                className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#D4AF37]/15 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#090A0F]" />
                    <span>Checking confirmation status...</span>
                  </>
                ) : (
                  <>
                    <span>I've Confirmed My Email →</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="resend-verification-email-btn"
                disabled={isSubmitting || resendCooldown > 0}
                onClick={handleResendVerification}
                className="w-full py-3 rounded-xl bg-[#181B28] hover:bg-[#232738] text-[#D4AF37] border border-[#343A52] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#9E9A90]" />
                    <span className="text-[#9E9A90]">Resend Available in {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                    <span>Resend Confirmation Email</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 px-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setInfoMessage(null); }}
                  className="text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer"
                >
                  ← Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); setInfoMessage(null); }}
                  className="text-[#D4AF37] hover:underline cursor-pointer"
                >
                  Change Email / Re-register
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
