import React, { useState } from 'react';
import { 
  Users, 
  X, 
  Check, 
  PlusCircle, 
  Sparkles, 
  GraduationCap, 
  Briefcase, 
  Award, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Shield,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/index';

export const PersonaSwitcherModal: React.FC = () => {
  const { allUsers, currentUser, switchUser, registerUser } = useAuth();
  const { isPersonaSwitcherOpen, closePersonaSwitcher, showToast, setActiveTab } = useApp();

  const [activeTab, setActiveTabMode] = useState<'personas' | 'register'>('personas');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Registration form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [bio, setBio] = useState('');
  const [industry, setIndustry] = useState('Technology & AI');
  const [skills, setSkills] = useState('');
  const [mentoringAreas, setMentoringAreas] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (!isPersonaSwitcherOpen) return null;

  const handleSwitch = async (userId: string) => {
    try {
      await switchUser(userId);
      const user = allUsers.find(u => u.id === userId);
      showToast('success', 'Switched Persona', `Now exploring MentorNexus as ${user?.name} (${user?.role})`);
      closePersonaSwitcher();
    } catch (err: any) {
      showToast('error', 'Switch Failed', err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      const newUser = await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        title: title.trim() || (role === 'student' ? 'Undergraduate Student' : role === 'mentor' ? 'Industry Mentor' : 'Software Professional'),
        organization: organization.trim() || 'Independent',
        bio: bio.trim() || `Passionate about ${role === 'mentor' ? 'mentoring rising practitioners' : 'advancing career roadmaps'} in ${industry}.`,
        industry,
        skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : ['Software Engineering', 'System Design'],
        mentoringAreas: mentoringAreas ? mentoringAreas.split(',').map(s => s.trim()).filter(Boolean) : ['Career Guidance'],
        yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
      });

      showToast('success', 'New User Created & Authenticated', `Welcome to MentorNexus, ${newUser.name}!`);
      closePersonaSwitcher();
      setActiveTab('profile');
    } catch (err: any) {
      setFormError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'student':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <GraduationCap className="w-3 h-3 mr-1" />
            Learner
          </span>
        );
      case 'early_career':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <Briefcase className="w-3 h-3 mr-1" />
            Early Career
          </span>
        );
      case 'mentor':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
            <Shield className="w-3 h-3 mr-1" />
            Mentor
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Admin
          </span>
        );
    }
  };

  const filteredUsers = roleFilter === 'all' 
    ? allUsers 
    : allUsers.filter(u => u.role === roleFilter);

  return (
    <div className="fixed inset-0 z-50 bg-[#050608]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="persona-switcher-dialog"
        className="bg-[#11131E] rounded-2xl max-w-3xl w-full shadow-2xl border border-[#262A3C] overflow-hidden my-8 text-[#F5F2EB]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-[#161925] border-b border-[#232738] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#F5F2EB]">Persona & Multi-Role Hub</h3>
              <p className="text-xs text-[#9E9A90] font-sans">Switch test personas instantly or provision a new custom user</p>
            </div>
          </div>
          <button
            id="close-persona-switcher-btn"
            onClick={closePersonaSwitcher}
            className="p-1.5 rounded-lg text-[#7A766E] hover:text-[#F5F2EB] hover:bg-[#1C2030] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 border-b border-[#232738] flex items-center justify-between bg-[#11131E]">
          <div className="flex space-x-4">
            <button
              id="tab-btn-switch-personas"
              onClick={() => setActiveTabMode('personas')}
              className={`pb-3 text-xs uppercase tracking-wider font-mono font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'personas'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-[#7A766E] hover:text-[#F5F2EB]'
              }`}
            >
              Pre-Configured Personas ({allUsers.length})
            </button>
            <button
              id="tab-btn-register-persona"
              onClick={() => setActiveTabMode('register')}
              className={`pb-3 text-xs uppercase tracking-wider font-mono font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'register'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-[#7A766E] hover:text-[#F5F2EB]'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New User</span>
            </button>
          </div>

          {activeTab === 'personas' && (
            <div className="hidden sm:flex items-center space-x-1 pb-3 text-[11px] font-mono">
              <span className="text-[#7A766E] mr-1">Filter:</span>
              {(['all', 'student', 'early_career', 'mentor', 'admin'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setRoleFilter(f)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono cursor-pointer transition-colors ${
                    roleFilter === f 
                      ? 'bg-[#D4AF37] text-[#090A0F] font-bold' 
                      : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#161925]'
                  }`}
                >
                  {f === 'student' ? 'Learners' : f === 'early_career' ? 'Early' : f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[68vh] overflow-y-auto">
          {activeTab === 'personas' ? (
            <div className="space-y-4">
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Click on any persona below to immediately log in as that user and test role-specific workflows (approving requests, roadmaps, goals, experience library, and admin governance):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  return (
                    <div
                      key={user.id}
                      id={`persona-card-${user.id}`}
                      onClick={() => handleSwitch(user.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start space-x-3.5 text-left relative ${
                        isCurrent
                          ? 'border-[#D4AF37] bg-[#1A1D2D] ring-1 ring-[#D4AF37]/40 shadow-lg'
                          : 'border-[#262A3C] bg-[#141622] hover:border-[#3A405A] hover:bg-[#181B2A]'
                      }`}
                    >
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#2D3349] shrink-0 bg-[#090A0F]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-serif font-bold text-[#F5F2EB] truncate">{user.name}</h4>
                          {isCurrent ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37] text-[#090A0F] shrink-0">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#7A766E] font-mono shrink-0">
                              Switch →
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-[#D4AF37]/90 truncate mt-0.5">{user.title}</p>
                        <p className="text-[11px] text-[#7A766E] font-mono truncate">{user.organization}</p>
                        
                        <div className="mt-2.5 flex items-center space-x-2 flex-wrap gap-y-1">
                          {getRoleBadge(user.role)}

                          {user.verificationStatus === 'verified' && (
                            <span className="text-[10px] font-mono text-[#D4AF37] flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-0.5 text-[#D4AF37]" /> Verified
                            </span>
                          )}

                          {user.role === 'mentor' && user.yearsOfExperience && (
                            <span className="text-[10px] text-[#7A766E] font-mono">
                              {user.yearsOfExperience}+ yrs exp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Johnson"
                    className="w-full px-3.5 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-sm text-[#F5F2EB] placeholder-[#5A574E] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. maya@example.com"
                    className="w-full px-3.5 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-sm text-[#F5F2EB] placeholder-[#5A574E] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Select Role *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'student', label: 'Learner', desc: 'Seeking guidance' },
                    { id: 'early_career', label: 'Early Career', desc: 'Accelerating growth' },
                    { id: 'mentor', label: 'Mentor', desc: 'Offering expertise' },
                    { id: 'admin', label: 'Admin', desc: 'Platform director' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as UserRole)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        role === r.id
                          ? 'border-[#D4AF37] bg-[#1C2030] text-[#F5F2EB] ring-1 ring-[#D4AF37]'
                          : 'border-[#262A3C] bg-[#141622] text-[#9E9A90] hover:border-[#3A405A] hover:bg-[#181B28]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#F5F2EB]">{r.label}</div>
                      <div className="text-[10px] text-[#7A766E] mt-0.5 font-mono">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Professional Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={role === 'student' ? 'CS Undergraduate' : role === 'mentor' ? 'Senior Principal Engineer' : 'Junior Developer'}
                    className="w-full px-3.5 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-sm text-[#F5F2EB] placeholder-[#5A574E] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Organization / University</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Stanford University, Stripe, or Independent"
                    className="w-full px-3.5 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-sm text-[#F5F2EB] placeholder-[#5A574E] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Primary Discipline</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
                  >
                    <option value="Technology & AI">Technology & AI</option>
                    <option value="Product Management & SaaS">Product Management & SaaS</option>
                    <option value="Cloud Engineering & DevOps">Cloud Engineering & DevOps</option>
                    <option value="UI/UX & Product Design">UI/UX & Product Design</option>
                    <option value="Cybersecurity & Infosec">Cybersecurity & Infosec</option>
                    <option value="Financial Technology">Financial Technology</option>
                    <option value="Data Science & Analytics">Data Science & Analytics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="45"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Bio & Goals Summary</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a concise background or what topics you want to explore..."
                  className="w-full px-3.5 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-sm text-[#F5F2EB] placeholder-[#5A574E] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9E9A90] mb-1.5">Skills / Topics (comma-separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Python, Distributed Systems, System Design, GraphQL"
                  className="w-full px-3.5 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-sm text-[#F5F2EB] placeholder-[#5A574E] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-[#232738]">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('personas')}
                  className="px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer transition-colors"
                >
                  Back to Personas
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] rounded-xl text-xs font-mono uppercase tracking-wider font-bold shadow-lg shadow-[#D4AF37]/15 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>{isSubmitting ? 'Creating Profile...' : 'Provision & Log In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
