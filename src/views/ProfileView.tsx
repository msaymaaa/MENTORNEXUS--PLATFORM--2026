import React, { useState, useEffect } from 'react';
import { 
  User, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Save, 
  Plus, 
  X, 
  Sparkles, 
  Briefcase, 
  MapPin, 
  GraduationCap, 
  Award,
  AlertCircle,
  Shield,
  LogOut,
  Users,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { UserProfile } from '../types/index';

export const ProfileView: React.FC = () => {
  const { currentUser, updateCurrentUserProfile, logoutUser } = useAuth();
  const { showToast, triggerRefresh, setActiveTab, openMentorModal, refreshTrigger } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('Technology & AI');
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [availability, setAvailability] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [mentoringAreas, setMentoringAreas] = useState<string[]>([]);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [achievements, setAchievements] = useState<string[]>([]);
  const [newAchievementInput, setNewAchievementInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Network state
  const [networkMembers, setNetworkMembers] = useState<UserProfile[]>([]);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);

  // Verification request modal state
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name);
    setEmail(currentUser.email);
    setTitle(currentUser.title);
    setOrganization(currentUser.organization || '');
    setLocation(currentUser.location || '');
    setIndustry(currentUser.industry);
    setYearsOfExperience(currentUser.yearsOfExperience || 0);
    setBio(currentUser.bio || '');
    setEducation(currentUser.education || '');
    setAvailability(currentUser.availability || '');
    setSkills(currentUser.skills || []);
    setMentoringAreas(currentUser.mentoringAreas || []);
    setAchievements(currentUser.achievements || []);

    // Load real professional network
    setIsLoadingNetwork(true);
    api.getNetwork(currentUser.id)
      .then(res => setNetworkMembers(res))
      .catch(() => setNetworkMembers([]))
      .finally(() => setIsLoadingNetwork(false));
  }, [currentUser, refreshTrigger]);

  if (!currentUser) return null;

  const handleAddSkill = () => {
    if (!newSkillInput.trim() || skills.includes(newSkillInput.trim())) return;
    setSkills([...skills, newSkillInput.trim()]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleAddArea = () => {
    if (!newAreaInput.trim() || mentoringAreas.includes(newAreaInput.trim())) return;
    setMentoringAreas([...mentoringAreas, newAreaInput.trim()]);
    setNewAreaInput('');
  };

  const handleRemoveArea = (area: string) => {
    setMentoringAreas(mentoringAreas.filter(a => a !== area));
  };

  const handleAddAchievement = () => {
    if (!newAchievementInput.trim()) return;
    setAchievements([...achievements, newAchievementInput.trim()]);
    setNewAchievementInput('');
  };

  const handleRemoveAchievement = (idx: number) => {
    setAchievements(achievements.filter((_, i) => i !== idx));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateCurrentUserProfile({
        name,
        title,
        organization,
        location,
        industry,
        yearsOfExperience: Number(yearsOfExperience),
        bio,
        education,
        availability,
        skills,
        mentoringAreas,
        achievements,
      });

      showToast('success', 'Profile Updated', 'Your profile details have been saved.');
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to save profile', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestVerification = async () => {
    try {
      await api.requestVerification(currentUser.id, verificationNotes);
      await updateCurrentUserProfile({ verificationStatus: 'pending' });
      showToast('success', 'Verification Requested', 'An administrator will review your credentials.');
      setIsRequestingVerification(false);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Could not request verification', err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">Profile & Credentials</span>
          <h1 className="text-3xl font-serif font-bold text-[#F5F2EB]">Your Practitioner Profile.</h1>
          <p className="text-xs text-[#9E9A90]">
            Manage your public identity, core competencies, and mentorship credentials.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {currentUser.verificationStatus === 'verified' ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Verified Practitioner
            </span>
          ) : currentUser.verificationStatus === 'pending' ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Verification Pending
            </span>
          ) : (
            <button
              onClick={() => setIsRequestingVerification(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#D4AF37] border border-[#343A52] text-xs font-mono uppercase font-semibold transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Request Verification</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Basic Information Card */}
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-5 shadow-xl">
          <h3 className="text-base font-serif font-bold text-[#F5F2EB] border-b border-[#232738] pb-3">
            Core Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-[#141622]/60 border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#7A766E] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Current Title / Role</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Organization / University</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Industry Discipline</label>
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
              <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Years of Experience</label>
              <input
                type="number"
                min={0}
                max={50}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Bio & Background</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#141622] border border-[#2D3349] rounded-xl p-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
              placeholder="Share your career path, milestone challenges solved, and mentorship approach..."
            />
          </div>
        </div>

        {/* Skills & Focus Areas Card */}
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-5 shadow-xl">
          <h3 className="text-base font-serif font-bold text-[#F5F2EB] border-b border-[#232738] pb-3">
            Expertise & Mentoring Areas
          </h3>

          {/* Skills */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase text-[#9E9A90]">Core Skills & Competencies</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#161925] border border-[#2D3349] text-xs text-[#D4AF37] font-mono">
                  <span>{s}</span>
                  <X className="w-3 h-3 hover:text-red-400 cursor-pointer" onClick={() => handleRemoveSkill(s)} />
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add skill (e.g. Distributed Systems)..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                className="flex-1 bg-[#141622] border border-[#2D3349] rounded-xl px-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 bg-[#181B28] hover:bg-[#232738] border border-[#343A52] text-[#F5F2EB] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Mentoring Areas (if mentor) */}
          <div className="space-y-2 pt-3 border-t border-[#232738]">
            <label className="block text-xs font-mono uppercase text-[#9E9A90]">Mentoring Focus Areas</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {mentoringAreas.map((a) => (
                <span key={a} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#181B28] border border-[#343A52] text-xs text-[#F5F2EB] font-mono">
                  <span>{a}</span>
                  <X className="w-3 h-3 hover:text-red-400 cursor-pointer" onClick={() => handleRemoveArea(a)} />
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add focus area (e.g. Staff Promotion Prep)..."
                value={newAreaInput}
                onChange={(e) => setNewAreaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddArea(); } }}
                className="flex-1 bg-[#141622] border border-[#2D3349] rounded-xl px-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="button"
                onClick={handleAddArea}
                className="px-4 py-2 bg-[#181B28] hover:bg-[#232738] border border-[#343A52] text-[#F5F2EB] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/15 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>

      </form>

      {/* Professional Network Section */}
      <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232738] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="text-base font-serif font-bold text-[#F5F2EB]">
                Your Professional Network
              </h3>
            </div>
            <p className="text-xs text-[#9E9A90] mt-1">
              Active connections, mentors, mentees, and professional contacts linked with your account.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#181B28] text-[#D4AF37] border border-[#262A3C] self-start sm:self-auto">
            {networkMembers.length} {networkMembers.length === 1 ? 'Connection' : 'Connections'}
          </span>
        </div>

        {isLoadingNetwork ? (
          <div className="py-8 text-center text-xs text-[#7A766E] font-mono">
            Loading your professional network...
          </div>
        ) : networkMembers.length === 0 ? (
          <div className="py-8 text-center space-y-3 bg-[#0D0F18] border border-[#262A3C] rounded-xl p-6">
            <Users className="w-8 h-8 text-[#5A564E] mx-auto" />
            <p className="text-xs text-[#9E9A90]">
              You have not connected with anyone yet. Explore the community directory to connect with industry practitioners.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('discover')}
              className="px-4 py-2 bg-[#D4AF37] text-[#090A0F] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#C5A028] transition-colors cursor-pointer"
            >
              Explore Directory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {networkMembers.map((member) => (
              <div
                key={member.id}
                className="bg-[#161925] border border-[#262A3C] hover:border-[#D4AF37]/50 rounded-xl p-4 flex flex-col justify-between transition-all space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={member.name}
                    className="w-11 h-11 rounded-xl object-cover border border-[#2D3349] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-serif font-bold text-[#F5F2EB] truncate">
                      {member.name}
                    </h4>
                    <p className="text-[11px] text-[#9E9A90] truncate">
                      {member.title}
                    </p>
                    <p className="text-[10px] text-[#7A766E] font-mono truncate">
                      {member.organization || member.industry}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-[#232738]/60">
                  <button
                    type="button"
                    onClick={() => openMentorModal(member)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#1D2132] hover:bg-[#282E44] text-[#F5F2EB] text-[11px] font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
                    <span>View Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('connections');
                    }}
                    className="py-1.5 px-2.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 text-[11px] font-semibold flex items-center justify-center cursor-pointer transition-colors"
                    title="Open chat workspace"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Session Management */}
      <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
        <h3 className="text-base font-serif font-bold text-[#F5F2EB] border-b border-[#232738] pb-3">
          Session & Account Actions
        </h3>
        <p className="text-xs text-[#9E9A90] leading-relaxed">
          Manage your active login session or sign out securely.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            id="profile-signout-btn"
            onClick={async () => {
              await logoutUser();
              setActiveTab('landing');
              showToast('info', 'Signed Out', 'You have been logged out.');
            }}
            className="px-5 py-2.5 rounded-xl bg-[#1E1217] hover:bg-[#2A171F] text-red-400 border border-red-900/40 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Sign Out of MentorNexus</span>
          </button>
        </div>
      </div>

      {/* Verification Request Modal */}
      {isRequestingVerification && (
        <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#11131E] border border-[#262A3C] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl text-[#F5F2EB] space-y-5">
            <div className="flex items-center justify-between border-b border-[#232738] pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Trust & Safety</span>
                <h3 className="text-xl font-serif font-bold text-[#F5F2EB]">Request Mentor Verification</h3>
              </div>
              <button onClick={() => setIsRequestingVerification(false)} className="p-1.5 rounded-lg text-[#9E9A90] hover:text-[#F5F2EB]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Verification grants you the verified practitioner badge in the discover directory and priority request placement.
              </p>
              <textarea
                rows={4}
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Include links to LinkedIn, GitHub, published articles, or company credentials for admin review..."
                className="w-full bg-[#141622] border border-[#2D3349] rounded-xl p-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="pt-3 border-t border-[#232738] flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsRequestingVerification(false)}
                className="px-4 py-2.5 rounded-xl bg-[#161925] border border-[#262A3C] text-xs font-semibold text-[#9E9A90] hover:text-[#F5F2EB]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestVerification}
                className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/15 cursor-pointer"
              >
                Submit for Verification
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
