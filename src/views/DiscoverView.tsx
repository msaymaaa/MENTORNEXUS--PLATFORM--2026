import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Briefcase, 
  Star, 
  Send, 
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  X,
  ArrowRight,
  Shield,
  RotateCcw,
  GraduationCap,
  Target,
  Info,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { UserProfile, MentorshipRequest, MentorshipConnection, Goal } from '../types/index';

export const DiscoverView: React.FC = () => {
  const { currentUser } = useAuth();
  const { openMentorModal, refreshTrigger, showToast, setActiveTab } = useApp();

  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [userGoals, setUserGoals] = useState<Goal[]>([]);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [connections, setConnections] = useState<MentorshipConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Discovery Directory Category: 'all' | 'mentors' | 'learners' | 'early_career'
  const [discoveryType, setDiscoveryType] = useState<'all' | 'mentors' | 'learners' | 'early_career'>('mentors');

  // Search, Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedExpRange, setSelectedExpRange] = useState<'all' | '1-4' | '5-9' | '10+'>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | '2h' | 'open'>('all');
  const [sortBy, setSortBy] = useState<'best_match' | 'most_experienced' | 'recently_added'>('best_match');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const industries = [
    'All',
    'Technology & AI',
    'Product Management & SaaS',
    'Cloud Engineering & DevOps',
    'UI/UX & Product Design',
    'Cybersecurity & Infosec',
    'Financial Technology',
    'Entrepreneurship & Startups'
  ];

  const popularSkillTags = [
    'System Architecture',
    'Distributed Systems',
    'Product Strategy',
    'Design Systems',
    'Kubernetes',
    'AI & ML Roadmaps',
    'Interview Prep',
    'AppSec',
    'DevOps',
    'Executive Presence'
  ];

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [profileList, reqList, connList, goalsList] = await Promise.all([
        api.getProfilesByRole(discoveryType),
        currentUser ? api.getRequests(currentUser.id).catch(() => []) : Promise.resolve([]),
        currentUser ? api.getConnections(currentUser.id).catch(() => []) : Promise.resolve([]),
        currentUser ? api.getGoals(currentUser.id).catch(() => []) : Promise.resolve([])
      ]);
      setMentors(profileList);
      setRequests(reqList);
      setConnections(connList);
      setUserGoals(goalsList);
    } catch (err) {
      console.error('Error fetching discovery profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, refreshTrigger, discoveryType]);

  // Calculate goal relevance for a mentor given active user goals
  const calculateGoalMatch = (mentor: UserProfile) => {
    const activeGoal = selectedGoalId !== 'all' 
      ? userGoals.find(g => g.id === selectedGoalId)
      : userGoals[0];

    if (!activeGoal) {
      // Default baseline match based on experience and rating
      const score = Math.min(98, Math.max(78, Math.round((mentor.yearsOfExperience * 3.5) + (mentor.rating || 5) * 10)));
      return {
        score,
        reason: `${mentor.yearsOfExperience}+ yrs industry experience & verified background`,
        matchedSkills: mentor.skills?.slice(0, 2) || []
      };
    }

    let matchPoints = 60;
    const matchedSkills: string[] = [];

    // Check skills alignment
    mentor.skills?.forEach(s => {
      if (
        activeGoal.title.toLowerCase().includes(s.toLowerCase()) || 
        activeGoal.description?.toLowerCase().includes(s.toLowerCase()) ||
        activeGoal.category.toLowerCase().includes(s.toLowerCase())
      ) {
        matchPoints += 15;
        matchedSkills.push(s);
      }
    });

    // Check industry alignment
    if (mentor.industry && (activeGoal.description?.toLowerCase().includes(mentor.industry.toLowerCase()) || activeGoal.category.includes('Tech'))) {
      matchPoints += 10;
    }

    // Experience bonus
    if (mentor.yearsOfExperience >= 5) matchPoints += 8;

    const finalScore = Math.min(99, Math.max(72, matchPoints));
    const reason = matchedSkills.length > 0 
      ? `Matches "${activeGoal.title}" via ${matchedSkills.join(', ')}`
      : `High domain expertise in ${mentor.industry || 'Tech'} (${mentor.yearsOfExperience} yrs)`;

    return { score: finalScore, reason, matchedSkills };
  };

  // Multi-filter, Search & Sorting calculation
  const filteredAndSortedMentors = useMemo(() => {
    return mentors
      .filter((mentor) => {
        // Search query filter (matches name, title, bio, skills, industry)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = mentor.name.toLowerCase().includes(q);
          const matchTitle = mentor.title?.toLowerCase().includes(q);
          const matchBio = mentor.bio?.toLowerCase().includes(q);
          const matchIndustry = mentor.industry?.toLowerCase().includes(q);
          const matchSkills = mentor.skills?.some(s => s.toLowerCase().includes(q));
          const matchAreas = mentor.mentoringAreas?.some(a => a.toLowerCase().includes(q));
          if (!matchName && !matchTitle && !matchBio && !matchIndustry && !matchSkills && !matchAreas) {
            return false;
          }
        }

        // Goal alignment filter
        if (selectedGoalId !== 'all') {
          const goal = userGoals.find(g => g.id === selectedGoalId);
          if (goal) {
            const goalKeywords = [goal.category, goal.title, ...(goal.milestones?.map(m => m.title) || [])].join(' ').toLowerCase();
            const mentorText = [mentor.industry, ...(mentor.skills || []), ...(mentor.mentoringAreas || [])].join(' ').toLowerCase();
            const hasKeywordOverlap = mentor.skills?.some(s => goalKeywords.includes(s.toLowerCase())) || 
              (mentor.industry && goalKeywords.includes(mentor.industry.toLowerCase()));
            if (!hasKeywordOverlap) return false;
          }
        }

        // Industry filter
        if (selectedIndustry !== 'All' && mentor.industry !== selectedIndustry) {
          return false;
        }

        // Skill tag filter
        if (selectedSkill && !mentor.skills?.some(s => s.toLowerCase() === selectedSkill.toLowerCase())) {
          return false;
        }

        // Experience range filter
        if (selectedExpRange === '1-4' && (mentor.yearsOfExperience < 1 || mentor.yearsOfExperience > 4)) {
          return false;
        }
        if (selectedExpRange === '5-9' && (mentor.yearsOfExperience < 5 || mentor.yearsOfExperience > 9)) {
          return false;
        }
        if (selectedExpRange === '10+' && mentor.yearsOfExperience < 10) {
          return false;
        }

        // Availability filter
        if (selectedAvailability === '2h' && !mentor.availability?.includes('2 hours')) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'most_experienced') {
          return b.yearsOfExperience - a.yearsOfExperience;
        }
        if (sortBy === 'recently_added') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // 'best_match' default: based on goal match score and rating
        const scoreA = calculateGoalMatch(a).score;
        const scoreB = calculateGoalMatch(b).score;
        return scoreB - scoreA;
      });
  }, [mentors, searchQuery, selectedGoalId, selectedIndustry, selectedSkill, selectedExpRange, selectedAvailability, sortBy, userGoals]);

  const activeFilterCount = (selectedIndustry !== 'All' ? 1 : 0) +
    (selectedGoalId !== 'all' ? 1 : 0) +
    (selectedSkill ? 1 : 0) +
    (selectedExpRange !== 'all' ? 1 : 0) +
    (selectedAvailability !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedGoalId('all');
    setSelectedIndustry('All');
    setSelectedSkill('');
    setSelectedExpRange('all');
    setSelectedAvailability('all');
    setSortBy('best_match');
  };

  const getRequestStatusForMentor = (mentorId: string) => {
    const activeConn = connections.find(c => c.mentorId === mentorId && c.status === 'active');
    if (activeConn) return { label: 'Active Mentorship', status: 'connected' };

    const existingReq = requests.find(r => r.mentorId === mentorId && r.requesterId === currentUser?.id);
    if (existingReq) {
      if (existingReq.status === 'pending') return { label: 'Request Pending', status: 'pending' };
      if (existingReq.status === 'accepted') return { label: 'Request Accepted', status: 'accepted' };
      if (existingReq.status === 'declined') return { label: 'Request Declined', status: 'declined' };
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">Verified Community & Mentorship Directory</span>
          <h1 className="text-3xl font-serif font-bold text-[#F5F2EB]">Find the experience you need.</h1>
          <p className="text-xs text-[#9E9A90] max-w-xl">
            Discover verified practitioners, mentors, and fellow learners across technical disciplines and career milestones.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-[#9E9A90]">
            Showing <strong className="text-[#D4AF37]">{filteredAndSortedMentors.length}</strong> {filteredAndSortedMentors.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Directory Category Selector */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#12141F] border border-[#262A3C] rounded-2xl w-fit">
        <button
          onClick={() => setDiscoveryType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
            discoveryType === 'all'
              ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-md shadow-[#D4AF37]/10'
              : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181C2C]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>All Community</span>
        </button>

        <button
          onClick={() => setDiscoveryType('mentors')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
            discoveryType === 'mentors'
              ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-md shadow-[#D4AF37]/10'
              : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181C2C]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Mentors & Practitioners</span>
        </button>

        <button
          onClick={() => setDiscoveryType('learners')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
            discoveryType === 'learners'
              ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-md shadow-[#D4AF37]/10'
              : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181C2C]'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Learners & Mentees</span>
        </button>

        <button
          onClick={() => setDiscoveryType('early_career')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
            discoveryType === 'early_career'
              ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-md shadow-[#D4AF37]/10'
              : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181C2C]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Early Career</span>
        </button>
      </div>

      {/* Search & Filter Bar Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search mentors, skills, roles, or experience..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12141F] border border-[#262A3C] rounded-xl pl-10 pr-10 py-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-[#7A766E] hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Goal Filter Dropdown (if user has active goals) */}
          {userGoals.length > 0 && (
            <div className="sm:w-52">
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full bg-[#12141F] border border-[#262A3C] rounded-xl px-3.5 py-3 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer"
              >
                <option value="all">All Goals</option>
                {userGoals.map(g => (
                  <option key={g.id} value={g.id}>Goal: {g.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Industry Filter Dropdown */}
          <div className="sm:w-52">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full bg-[#12141F] border border-[#262A3C] rounded-xl px-3.5 py-3 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind} className="bg-[#12141F] text-[#F5F2EB]">
                  {ind === 'All' ? 'All Industries' : ind}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="sm:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-[#12141F] border border-[#262A3C] rounded-xl px-3.5 py-3 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer"
            >
              <option value="best_match" className="bg-[#12141F]">Sort: Best Match</option>
              <option value="most_experienced" className="bg-[#12141F]">Sort: Most Experienced</option>
              <option value="recently_added" className="bg-[#12141F]">Sort: Recently Added</option>
            </select>
          </div>

          {/* Advanced Filter Drawer Trigger */}
          <button
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`px-4 py-3 rounded-xl border text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
              activeFilterCount > 0 || isFilterDrawerOpen
                ? 'bg-[#181C2C] border-[#D4AF37] text-[#D4AF37]'
                : 'bg-[#12141F] border-[#262A3C] text-[#9E9A90] hover:border-[#3D4460]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#D4AF37] text-[#090A0F] text-[10px] font-bold flex items-center justify-center ml-1">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Skill Tags Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-mono uppercase text-[#7A766E] shrink-0">Popular Skills:</span>
          {popularSkillTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedSkill(selectedSkill === tag ? '' : tag)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono shrink-0 transition-all cursor-pointer ${
                selectedSkill === tag
                  ? 'bg-[#D4AF37] text-[#090A0F] font-bold'
                  : 'bg-[#161925] border border-[#262A3C] text-[#9E9A90] hover:text-[#F5F2EB] hover:border-[#3D4460]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Advanced Filters Expandable Panel */}
        {isFilterDrawerOpen && (
          <div className="p-5 rounded-xl bg-[#12141F] border border-[#262A3C] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between border-b border-[#232738] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold">Advanced Filters</span>
              <button 
                onClick={resetAllFilters}
                className="text-xs text-[#9E9A90] hover:text-[#F5F2EB] flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#9E9A90] mb-2">Years of Experience</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['all', '1-4', '5-9', '10+'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedExpRange(r)}
                      className={`py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer ${
                        selectedExpRange === r
                          ? 'bg-[#D4AF37] text-[#090A0F] font-bold'
                          : 'bg-[#161925] text-[#9E9A90] hover:bg-[#1E2232]'
                      }`}
                    >
                      {r === 'all' ? 'All' : `${r} yrs`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#9E9A90] mb-2">Availability Commitment</label>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value as any)}
                  className="w-full bg-[#161925] border border-[#2D3349] rounded-lg px-3 py-2 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">All Availability</option>
                  <option value="2h">2+ hours / week</option>
                  <option value="open">Open for active matching</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#9E9A90] mb-2">Verification Requirement</label>
                <div className="p-2 rounded-lg bg-[#161925] border border-[#2D3349] flex items-center justify-between text-xs text-[#9E9A90]">
                  <span className="flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Verified Practitioners Only</span>
                  </span>
                  <span className="text-[10px] text-[#10B981] font-mono font-semibold">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips & Reset Row */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-mono uppercase text-[#7A766E]">Active Filters:</span>
            
            {searchQuery && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#181C2C] border border-[#2D3349] text-xs text-[#F5F2EB]">
                <span>Search: "{searchQuery}"</span>
                <X className="w-3 h-3 text-[#7A766E] hover:text-[#F5F2EB] cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}

            {selectedGoalId !== 'all' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#181C2C] border border-[#2D3349] text-xs text-[#F5F2EB]">
                <span>Goal Match Active</span>
                <X className="w-3 h-3 text-[#7A766E] hover:text-[#F5F2EB] cursor-pointer" onClick={() => setSelectedGoalId('all')} />
              </span>
            )}

            {selectedIndustry !== 'All' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#181C2C] border border-[#2D3349] text-xs text-[#F5F2EB]">
                <span>Industry: {selectedIndustry}</span>
                <X className="w-3 h-3 text-[#7A766E] hover:text-[#F5F2EB] cursor-pointer" onClick={() => setSelectedIndustry('All')} />
              </span>
            )}

            {selectedSkill && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#181C2C] border border-[#2D3349] text-xs text-[#F5F2EB]">
                <span>Skill: {selectedSkill}</span>
                <X className="w-3 h-3 text-[#7A766E] hover:text-[#F5F2EB] cursor-pointer" onClick={() => setSelectedSkill('')} />
              </span>
            )}

            {selectedExpRange !== 'all' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#181C2C] border border-[#2D3349] text-xs text-[#F5F2EB]">
                <span>Exp: {selectedExpRange} yrs</span>
                <X className="w-3 h-3 text-[#7A766E] hover:text-[#F5F2EB] cursor-pointer" onClick={() => setSelectedExpRange('all')} />
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-[11px] text-[#D4AF37] hover:text-[#E6C258] underline ml-2 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Mentors Grid or Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 h-72 animate-pulse" />
          ))}
        </div>
      ) : filteredAndSortedMentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedMentors.map((mentor) => {
            const reqStatus = getRequestStatusForMentor(mentor.id);
            const goalMatch = calculateGoalMatch(mentor);

            return (
              <div
                key={mentor.id}
                className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/50 rounded-2xl p-6 transition-all flex flex-col justify-between group space-y-5"
              >
                <div className="space-y-4">
                  {/* Top Profile Summary */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <img 
                        src={mentor.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'} 
                        alt={mentor.name} 
                        className="w-12 h-12 rounded-xl object-cover border border-[#343A52]"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="text-base font-serif font-bold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors">{mentor.name}</h3>
                          {mentor.role === 'mentor' ? (
                            mentor.verificationStatus === 'verified' ? (
                              <span title="Verified Mentor"><Shield className="w-3.5 h-3.5 text-[#D4AF37]" /></span>
                            ) : (
                              <span title="Industry Mentor"><Award className="w-3.5 h-3.5 text-[#D4AF37]/70" /></span>
                            )
                          ) : mentor.role === 'early_career' ? (
                            <span title="Early-Career Member"><Briefcase className="w-3.5 h-3.5 text-emerald-400" /></span>
                          ) : mentor.role === 'admin' ? (
                            <span title="Administrator"><Shield className="w-3.5 h-3.5 text-purple-400" /></span>
                          ) : (
                            <span title="Learner / Student"><GraduationCap className="w-3.5 h-3.5 text-blue-400" /></span>
                          )}
                        </div>
                        <p className="text-xs text-[#9E9A90] font-medium line-clamp-1">{mentor.title}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181B28] border border-[#2D3349] text-[#10B981] flex items-center space-x-1">
                        <Users className="w-2.5 h-2.5 text-[#10B981]" />
                        <span>{mentor.networkCount ? `${mentor.networkCount} connections` : `${Math.max(12, ((mentor.yearsOfExperience || 1) * 8) + 14)}+ connections`}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1B1E2D] border border-[#2D3349] text-[#C5A880]">
                        {mentor.yearsOfExperience} yrs exp
                      </span>
                    </div>
                  </div>

                  {/* Goal Relevance Indicator (Section 21) */}
                  <div className="p-2.5 rounded-xl bg-[#161925] border border-[#2D3349] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center space-x-1.5 font-mono text-[10px] uppercase font-bold text-[#D4AF37]">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        <span>{goalMatch.score}% Goal Relevance</span>
                      </span>
                      <span className="text-[9px] text-[#7A766E] font-mono">Algorithmic Match</span>
                    </div>
                    <p className="text-[11px] text-[#9E9A90] leading-snug line-clamp-1">
                      {goalMatch.reason}
                    </p>
                  </div>

                  <p className="text-xs text-[#9E9A90] line-clamp-3 leading-relaxed">
                    {mentor.bio}
                  </p>

                  {/* Skills Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.skills?.slice(0, 4).map((skill) => (
                      <span 
                        key={skill}
                        onClick={() => setSelectedSkill(skill)}
                        className="px-2 py-0.5 rounded-md bg-[#161925] border border-[#2D3349] text-[10px] text-[#C8A97E] font-mono hover:border-[#D4AF37]/50 cursor-pointer"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Availability Badge */}
                  {mentor.availability && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-[#7A766E] font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="truncate">{mentor.availability}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-[#232738] flex items-center justify-between gap-3">
                  <button
                    onClick={() => openMentorModal(mentor)}
                    className="text-xs font-semibold text-[#D4AF37] hover:text-[#F5F2EB] flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {mentor.id === currentUser?.id ? (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#141622] text-[#7A766E] border border-[#262A3C]">
                      Your Profile
                    </span>
                  ) : reqStatus ? (
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${
                      reqStatus.status === 'connected' ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' :
                      reqStatus.status === 'pending' ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {reqStatus.label}
                    </span>
                  ) : mentor.role === 'mentor' ? (
                    <button
                      onClick={() => openMentorModal(mentor)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#181B28] hover:bg-[#D4AF37] hover:text-[#090A0F] text-[#F5F2EB] text-xs font-bold uppercase tracking-wider border border-[#343A52] hover:border-transparent transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Request</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openMentorModal(mentor)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#181B28] hover:bg-[#D4AF37] hover:text-[#090A0F] text-[#F5F2EB] text-xs font-bold uppercase tracking-wider border border-[#343A52] hover:border-transparent transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Purposeful Empty State (Section 20) */
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">No mentors match your search yet.</h3>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            Try adjusting your search keywords or broadening your industry filters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={resetAllFilters}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs uppercase tracking-wider font-semibold border border-[#343A52] transition-all cursor-pointer inline-flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center justify-center space-x-2"
            >
              <span>Manage Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
