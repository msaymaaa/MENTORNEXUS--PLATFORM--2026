import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Target, 
  Users, 
  Compass, 
  CheckCircle2, 
  BookOpen, 
  TrendingUp, 
  Shield, 
  Briefcase, 
  Award,
  ChevronRight,
  Search,
  MessageSquareCode,
  GraduationCap,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { UserProfile, ExperienceResource } from '../types/index';
import { MentorNexusBrand } from '../components/MentorNexusBrand';
import { AuthViewMode } from '../components/AuthModal';

interface LandingViewProps {
  onOpenAuth: (mode: AuthViewMode, initialRole?: 'student' | 'mentor') => void;
  onExploreCategory: (category: string) => void;
}

const CATEGORIES = [
  { name: 'Software Engineering', count: 'Distributed Systems, Full-Stack, AI Architecture', icon: Briefcase },
  { name: 'Entrepreneurship', count: 'Venture Building, Seed Funding, Scaling', icon: TrendingUp },
  { name: 'Product & Design', count: 'Product Strategy, UX Research, Design Systems', icon: Sparkles },
  { name: 'Cybersecurity', count: 'AppSec, Threat Modeling, Cloud Defense', icon: Shield },
  { name: 'Business', count: 'Corporate Strategy, Analytics, Operations', icon: Award },
  { name: 'Leadership', count: 'Engineering Management, Executive Presence', icon: Users },
  { name: 'Marketing', count: 'Growth Engineering, Product-Led Acquisition', icon: Compass },
  { name: 'Finance', count: 'Fintech Systems, Quantitative Modeling', icon: Target },
  { name: 'Research', count: 'LLM Foundations, Applied Machine Learning', icon: GraduationCap },
  { name: 'Career Development', count: 'Interview Prep, Promotion Roadmaps', icon: BookOpen },
];

export const LandingView: React.FC<LandingViewProps> = ({ onOpenAuth, onExploreCategory }) => {
  const { currentUser } = useAuth();
  const { setActiveTab, openMentorModal } = useApp();
  const [featuredMentors, setFeaturedMentors] = useState<UserProfile[]>([]);
  const [featuredResources, setFeaturedResources] = useState<ExperienceResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadLandingData = async () => {
      try {
        setIsLoading(true);
        const [mentors, resources] = await Promise.all([
          api.getMentors({ verifiedOnly: true }),
          api.getResources()
        ]);
        setFeaturedMentors(mentors.slice(0, 3));
        setFeaturedResources(resources.slice(0, 3));
      } catch (err) {
        console.error('Error loading landing data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLandingData();
  }, []);

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F5F2EB] flex flex-col font-sans selection:bg-[#D4AF37]/30 selection:text-[#F5F2EB]">
      
      {/* ========================================================================= */}
      {/* 1. PUBLIC LANDING PAGE HEADER WITH BRAND LOGO [M MentorNexus] & NAVIGATION */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#090A0F]/95 backdrop-blur-md border-b border-[#232738]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* LEFT: M MentorNexus Brand */}
          <div className="flex items-center space-x-8">
            <MentorNexusBrand 
              size="md" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            />
            
            {/* CENTER / MAIN NAVIGATION */}
            <nav className="hidden md:flex items-center space-x-6 text-xs uppercase tracking-widest text-[#9E9A90] font-semibold">
              <button 
                onClick={() => scrollToSection('categories')} 
                className="hover:text-[#F5F2EB] transition-colors cursor-pointer"
              >
                Discover
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="hover:text-[#F5F2EB] transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection('why-mentornexus')} 
                className="hover:text-[#F5F2EB] transition-colors cursor-pointer"
              >
                Mentorship
              </button>
              <button 
                onClick={() => scrollToSection('experience')} 
                className="hover:text-[#F5F2EB] transition-colors cursor-pointer"
              >
                Experience Library
              </button>
            </nav>
          </div>

          {/* RIGHT: Sign In & Get Started → */}
          <div className="hidden sm:flex items-center space-x-4">
            {currentUser ? (
              <button
                id="landing-goto-workspace-btn"
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 rounded-xl bg-[#181B26] hover:bg-[#232738] text-[#F5F2EB] text-xs uppercase tracking-wider font-semibold border border-[#343A52] transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
              </button>
            ) : (
              <>
                <button
                  id="landing-signin-btn"
                  onClick={() => onOpenAuth('signin')}
                  className="text-xs uppercase tracking-wider font-semibold text-[#9E9A90] hover:text-[#F5F2EB] px-3.5 py-2 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  id="landing-getstarted-btn"
                  onClick={() => onOpenAuth('choice')}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all shadow-md shadow-[#D4AF37]/15 flex items-center space-x-2 cursor-pointer group"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex sm:hidden items-center space-x-2">
            <button
              onClick={() => onOpenAuth('choice')}
              className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] text-[#090A0F] text-[11px] uppercase font-bold tracking-wider"
            >
              Get Started
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181B28]"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-[#232738] bg-[#0E101A] p-4 space-y-3">
            <button
              onClick={() => scrollToSection('categories')}
              className="w-full text-left py-2 text-xs font-semibold uppercase tracking-wider text-[#9E9A90] hover:text-[#F5F2EB]"
            >
              Discover
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="w-full text-left py-2 text-xs font-semibold uppercase tracking-wider text-[#9E9A90] hover:text-[#F5F2EB]"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('why-mentornexus')}
              className="w-full text-left py-2 text-xs font-semibold uppercase tracking-wider text-[#9E9A90] hover:text-[#F5F2EB]"
            >
              Mentorship
            </button>
            <button
              onClick={() => scrollToSection('experience')}
              className="w-full text-left py-2 text-xs font-semibold uppercase tracking-wider text-[#9E9A90] hover:text-[#F5F2EB]"
            >
              Experience Library
            </button>
            <div className="pt-2 border-t border-[#232738] flex flex-col gap-2">
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('signin'); }}
                className="w-full py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[#F5F2EB] bg-[#161925] border border-[#2D3349] rounded-xl"
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('choice'); }}
                className="w-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-[#090A0F] bg-[#D4AF37] rounded-xl"
              >
                Get Started →
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-20 pb-24 lg:pt-28 lg:pb-32 overflow-hidden border-b border-[#232738]/60">
        {/* Subtle architectural ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#D4AF37]/10 via-[#10B981]/5 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#161925] border border-[#2D3349] text-xs tracking-widest uppercase font-mono text-[#D4AF37]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>YOUR GOAL. THEIR EXPERIENCE. YOUR NEXT STEP.</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#F5F2EB] tracking-tight leading-[1.12]">
              Find someone who has already been where you want to go.
            </h1>

            <p className="text-base sm:text-lg text-[#9E9A90] max-w-2xl mx-auto font-normal leading-relaxed">
              MentorNexus connects you with experienced people who can help you move forward through practical advice, meaningful conversations, and real-world experience.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                id="hero-find-mentor-btn"
                onClick={() => currentUser ? setActiveTab('discover') : onOpenAuth('choice')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-sm uppercase tracking-wider font-bold transition-all shadow-xl shadow-[#D4AF37]/15 flex items-center justify-center space-x-2.5 cursor-pointer group"
              >
                <span>Find a Mentor</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="hero-explore-mentorship-btn"
                onClick={() => scrollToSection('how-it-works')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#141622] hover:bg-[#1C2030] text-[#F5F2EB] text-sm uppercase tracking-wider font-semibold border border-[#2D3349] transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Explore Mentorship</span>
              </button>
            </div>
          </div>

          {/* Mentorship Engine Flow: GOAL → EXPERIENCE → CONVERSATION → PROGRESS */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="bg-[#10121C] border border-[#262A3C] rounded-3xl p-6 sm:p-10 shadow-2xl relative">
              <div className="text-center mb-8">
                <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">The Mentorship Engine</span>
                <h3 className="text-xl font-serif font-semibold text-[#F5F2EB] mt-1">A deliberate path from ambition to outcome</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
                {/* Step 1: Goal */}
                <div className="bg-[#161925] border border-[#2D3349] rounded-2xl p-5 relative group hover:border-[#D4AF37]/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-[#D4AF37]">01</span>
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-[#F5F2EB] mb-2">Goal</h4>
                  <p className="text-xs text-[#9E9A90] leading-relaxed">
                    Define the exact professional milestone you want to reach.
                  </p>
                </div>

                {/* Step 2: Experience */}
                <div className="bg-[#161925] border border-[#2D3349] rounded-2xl p-5 relative group hover:border-[#D4AF37]/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-[#D4AF37]">02</span>
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                      <Compass className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-[#F5F2EB] mb-2">Experience</h4>
                  <p className="text-xs text-[#9E9A90] leading-relaxed">
                    Identify verified professionals who have navigated that exact challenge.
                  </p>
                </div>

                {/* Step 3: Conversation */}
                <div className="bg-[#161925] border border-[#2D3349] rounded-2xl p-5 relative group hover:border-[#D4AF37]/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-[#D4AF37]">03</span>
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                      <MessageSquareCode className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-[#F5F2EB] mb-2">Conversation</h4>
                  <p className="text-xs text-[#9E9A90] leading-relaxed">
                    Conduct high-signal 1:1 sessions focused purely on tactical advice and strategy.
                  </p>
                </div>

                {/* Step 4: Progress */}
                <div className="bg-[#161925] border border-[#2D3349] rounded-2xl p-5 relative group hover:border-[#10B981]/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-[#10B981]">04</span>
                    <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-[#F5F2EB] mb-2">Progress</h4>
                  <p className="text-xs text-[#9E9A90] leading-relaxed">
                    Complete milestone deliverables and record measurable career advancement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS SECTION (01 DEFINE, 02 DISCOVER, 03 CONNECT) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 border-b border-[#232738]/60 bg-[#0B0D14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Process</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#F5F2EB]">
              Mentorship starts with a goal.
            </h2>
            <p className="text-sm text-[#9E9A90]">
              We built MentorNexus to eliminate generic networking and replace it with structured, high-accountability growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-8 space-y-4 hover:border-[#D4AF37]/40 transition-all">
              <div className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider">01 — DEFINE</div>
              <h3 className="text-xl font-serif font-semibold text-[#F5F2EB]">Start with what you actually want to achieve.</h3>
              <p className="text-sm text-[#9E9A90] leading-relaxed">
                Break your ambitions into clear target dates and sequential milestones—from landing a staff engineering role to mastering system design.
              </p>
            </div>

            <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-8 space-y-4 hover:border-[#D4AF37]/40 transition-all">
              <div className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider">02 — DISCOVER</div>
              <h3 className="text-xl font-serif font-semibold text-[#F5F2EB]">Find people whose experience matches your path.</h3>
              <p className="text-sm text-[#9E9A90] leading-relaxed">
                Filter by verified expertise, industry tenure, and availability. Review transparent goal-relevance metrics based on genuine skill synergy.
              </p>
            </div>

            <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-8 space-y-4 hover:border-[#D4AF37]/40 transition-all">
              <div className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider">03 — CONNECT</div>
              <h3 className="text-xl font-serif font-semibold text-[#F5F2EB]">Turn experience into practical guidance.</h3>
              <p className="text-sm text-[#9E9A90] leading-relaxed">
                Initiate tailored mentorship requests, schedule recurring reviews, and apply proven industry insights directly to your active roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. WHY MENTORNEXUS (More than networking) */}
      {/* ========================================================================= */}
      <section id="why-mentornexus" className="py-24 border-b border-[#232738]/60 bg-[#090A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-16 space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Philosophy</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#F5F2EB]">
              More than networking.
            </h2>
            <p className="text-sm text-[#9E9A90]">
              Social media celebrates vanity metrics. MentorNexus exists to create verified, high-impact developmental mentorship.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#12141F] border border-[#262A3C] space-y-3.5 hover:border-[#D4AF37]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-serif font-bold text-[#F5F2EB]">Connection</h4>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Find people strictly relevant to your current goals—not algorithms optimized for engagement feeds.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#12141F] border border-[#262A3C] space-y-3.5 hover:border-[#D4AF37]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-serif font-bold text-[#F5F2EB]">Experience</h4>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Learn directly from verified professionals who have built, scaled, and led in your target domain.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#12141F] border border-[#262A3C] space-y-3.5 hover:border-[#10B981]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-serif font-bold text-[#F5F2EB]">Progress</h4>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Turn advisory conversations into concrete roadmap deliverables with measurable completion tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. MENTORSHIP CATEGORIES */}
      {/* ========================================================================= */}
      <section id="categories" className="py-24 border-b border-[#232738]/60 bg-[#0B0D14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Expertise Domains</span>
              <h2 className="text-3xl font-serif font-bold text-[#F5F2EB]">Explore Mentorship by Discipline</h2>
              <p className="text-sm text-[#9E9A90]">Select an industry vertical to discover mentors and specialized roadmaps.</p>
            </div>
            <button 
              onClick={() => currentUser ? setActiveTab('discover') : onOpenAuth('choice')}
              className="text-xs uppercase tracking-wider font-semibold text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1.5 cursor-pointer"
            >
              <span>View All Disciplines</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  onClick={() => onExploreCategory(cat.name)}
                  className="bg-[#12141F] hover:bg-[#191D2C] border border-[#262A3C] hover:border-[#D4AF37]/40 rounded-2xl p-5 transition-all cursor-pointer group space-y-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#1E2232] group-hover:bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors">{cat.name}</h4>
                    <p className="text-[11px] text-[#9E9A90] mt-1 line-clamp-2 leading-relaxed">{cat.count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FEATURED MENTORS PREVIEW */}
      {/* ========================================================================= */}
      <section id="mentors" className="py-24 border-b border-[#232738]/60 bg-[#090A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Verified Mentors</span>
              <h2 className="text-3xl font-serif font-bold text-[#F5F2EB]">Learn from Experienced Practitioners</h2>
              <p className="text-sm text-[#9E9A90]">Industry practitioners actively dedicating time to guide the next generation.</p>
            </div>
            <button
              onClick={() => currentUser ? setActiveTab('discover') : onOpenAuth('choice')}
              className="text-xs uppercase tracking-wider font-semibold text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Explore All Mentors</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 h-64 animate-pulse" />
              ))}
            </div>
          ) : featuredMentors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredMentors.map((mentor) => (
                <div 
                  key={mentor.id}
                  className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/40 rounded-2xl p-6 transition-all space-y-5 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3.5">
                      <img 
                        src={mentor.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                        alt={mentor.name} 
                        className="w-12 h-12 rounded-xl object-cover border border-[#343A52]"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-base font-serif font-bold text-[#F5F2EB]">{mentor.name}</h4>
                          <Shield className="w-3.5 h-3.5 text-[#D4AF37]" title="Verified Practitioner" />
                        </div>
                        <p className="text-xs text-[#9E9A90] font-medium">{mentor.title}</p>
                      </div>
                    </div>

                    <p className="text-xs text-[#9E9A90] line-clamp-3 leading-relaxed">
                      {mentor.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mentor.skills?.slice(0, 3).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-[#1B1E2D] border border-[#2D3349] text-[10px] text-[#C5A880] font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#232738] flex items-center justify-between text-xs">
                    <span className="text-[#9E9A90]">{mentor.yearsOfExperience} yrs exp</span>
                    <button
                      onClick={() => {
                        if (currentUser) {
                          openMentorModal(mentor);
                        } else {
                          onOpenAuth('choice');
                        }
                      }}
                      className="text-[#D4AF37] hover:text-[#F5F2EB] font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#1E2232] text-[#D4AF37] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Mentors will appear here as professionals join MentorNexus.</h3>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Be among the founding leaders who shape the next generation of engineers, designers, and founders.
              </p>
              <button
                onClick={() => onOpenAuth('signup', 'mentor')}
                className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Become a Mentor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. EXPERIENCE LIBRARY PREVIEW */}
      {/* ========================================================================= */}
      <section id="experience" className="py-24 border-b border-[#232738]/60 bg-[#0B0D14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Knowledge Base</span>
              <h2 className="text-3xl font-serif font-bold text-[#F5F2EB]">The Experience Library</h2>
              <p className="text-sm text-[#9E9A90]">Tactical playbooks, case studies, and career guides written by vetted practitioners.</p>
            </div>
            <button
              onClick={() => currentUser ? setActiveTab('library') : onOpenAuth('choice')}
              className="text-xs uppercase tracking-wider font-semibold text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Explore Library</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredResources.map((res) => (
              <div 
                key={res.id}
                onClick={() => currentUser ? setActiveTab('library') : onOpenAuth('choice')}
                className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/40 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#9E9A90]">
                    <span className="px-2.5 py-1 rounded bg-[#1B1E2D] border border-[#2D3349] text-[10px] font-mono uppercase text-[#D4AF37]">
                      {res.category}
                    </span>
                    <span>{res.readTimeMinutes} min read</span>
                  </div>

                  <h3 className="text-base font-serif font-bold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors leading-snug">
                    {res.title}
                  </h3>

                  <p className="text-xs text-[#9E9A90] line-clamp-3 leading-relaxed">
                    {res.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#232738] flex items-center space-x-2 text-xs text-[#9E9A90]">
                  <span className="font-medium text-[#F5F2EB]">{res.authorName}</span>
                  <span>•</span>
                  <span className="truncate">{res.authorTitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINAL CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="py-24 bg-gradient-to-b from-[#090A0F] to-[#12141F] border-b border-[#232738]/60 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8 relative z-10">
          <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Take the Step</span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#F5F2EB] leading-tight">
            Your next step could start with one conversation.
          </h2>
          <p className="text-base text-[#9E9A90] max-w-xl mx-auto leading-relaxed">
            Find the experience you need. Meet the person who has it. Turn ambition into measurable career momentum.
          </p>
          <div className="pt-2">
            <button
              id="final-cta-getstarted-btn"
              onClick={() => currentUser ? setActiveTab('dashboard') : onOpenAuth('choice')}
              className="px-9 py-4 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-sm uppercase tracking-wider font-bold transition-all shadow-xl shadow-[#D4AF37]/20 inline-flex items-center space-x-2.5 cursor-pointer group"
            >
              <span>Get Started →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. EDITORIAL FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-[#07080C] py-16 text-[#9E9A90] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#232738]/60">
            
            {/* Brand in Footer */}
            <div className="space-y-4 md:col-span-1">
              <MentorNexusBrand size="sm" />
              <p className="text-xs leading-relaxed text-[#78746B]">
                Real experience. Meaningful conversations. Real progress.
              </p>
            </div>

            <div className="space-y-3">
              <h5 className="text-[11px] font-mono uppercase tracking-widest text-[#F5F2EB] font-bold">Platform</h5>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => currentUser ? setActiveTab('discover') : onOpenAuth('choice')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    Discover Mentors
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('how-it-works')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    How It Works
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('categories')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    Mentorship Categories
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => currentUser ? setActiveTab('library') : onOpenAuth('choice')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    Experience Library
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="text-[11px] font-mono uppercase tracking-widest text-[#F5F2EB] font-bold">Community</h5>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => onOpenAuth('signup', 'mentor')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    Apply to Mentor
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onOpenAuth('signup', 'student')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    Learner Registration
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('how-it-works')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    Mentorship Standards
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="text-[11px] font-mono uppercase tracking-widest text-[#F5F2EB] font-bold">Account</h5>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => onOpenAuth('signin')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    Sign In
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onOpenAuth('choice')} 
                    className="hover:text-[#F5F2EB] cursor-pointer"
                  >
                    Create Account
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#5A574E] gap-4">
            <p>© {new Date().getFullYear()} MentorNexus. Where ambition meets experience.</p>
            <div className="flex items-center space-x-6">
              <span>Security & Verification Standards</span>
              <span>•</span>
              <span>Ethics & Conduct</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
