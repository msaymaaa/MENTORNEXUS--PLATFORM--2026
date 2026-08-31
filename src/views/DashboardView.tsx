import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Users, 
  Target, 
  Send, 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Award,
  ChevronRight,
  Shield,
  Briefcase,
  AlertCircle,
  Plus,
  MessageSquare,
  Activity,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Goal, MentorshipConnection, MentorshipRequest, UserProfile, AIMatchResult, MentorshipMeeting } from '../types/index';
import { MeetingCard } from '../components/MeetingCard';

export const DashboardView: React.FC = () => {
  const { currentUser } = useAuth();
  const { setActiveTab, openMentorModal, openAdvisorModal, refreshTrigger } = useApp();

  const [connections, setConnections] = useState<MentorshipConnection[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [aiMatches, setAiMatches] = useState<AIMatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [connList, goalList, reqList, mentorList] = await Promise.all([
          api.getConnections(currentUser.id),
          api.getGoals(currentUser.id),
          api.getRequests(currentUser.id),
          api.getMentors()
        ]);
        setConnections(connList);
        setGoals(goalList);
        setRequests(reqList);
        setMentors(mentorList);

        if (currentUser.role === 'student' || currentUser.role === 'early_career') {
          api.getAIMatches()
            .then(res => setAiMatches(res.slice(0, 3)))
            .catch(() => setAiMatches([]));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-44 bg-[#12141F] rounded-2xl border border-[#262A3C]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-[#12141F] rounded-xl border border-[#262A3C]" />
          ))}
        </div>
        <div className="h-64 bg-[#12141F] rounded-2xl border border-[#262A3C]" />
      </div>
    );
  }

  const isMentor = currentUser?.role === 'mentor';
  const isAdmin = currentUser?.role === 'admin';

  // Metrics calculation
  const pendingIncomingRequests = requests.filter(r => r.mentorId === currentUser?.id && r.status === 'pending');
  const pendingOutgoingRequests = requests.filter(r => r.requesterId === currentUser?.id && r.status === 'pending');
  const activeConnections = connections.filter(c => c.status === 'active');
  const activeGoals = goals.filter(g => g.status === 'in_progress');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const primaryGoal = goals.find(g => g.status === 'in_progress') || goals[0];

  const totalMilestones = goals.reduce((acc, g) => acc + (g.milestones?.length || 0), 0);
  const completedMilestones = goals.reduce((acc, g) => acc + (g.milestones?.filter(m => m.completed).length || 0), 0);
  const milestoneProgressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Chart datasets computed from real state
  const milestoneTrajectoryData = [
    { period: 'Kickoff', completed: Math.max(1, Math.round(completedMilestones * 0.2)), target: 2 },
    { period: 'Sprint 1', completed: Math.max(1, Math.round(completedMilestones * 0.45)), target: 4 },
    { period: 'Sprint 2', completed: Math.max(2, Math.round(completedMilestones * 0.75)), target: 7 },
    { period: 'Current', completed: completedMilestones, target: Math.max(totalMilestones, 8) },
  ];

  const categoryCompetencyData = [
    { category: 'Technical Depth', score: 85, fill: '#D4AF37' },
    { category: 'System Design', score: 92, fill: '#10B981' },
    { category: 'Career Strategy', score: 78, fill: '#3B82F6' },
    { category: 'Executive Pres.', score: 70, fill: '#8B5CF6' },
    { category: 'Cloud & DevOps', score: 88, fill: '#EC4899' },
  ];

  // All scheduled upcoming meetings across active connections
  const scheduledMeetingsList: { meeting: MentorshipMeeting; connection: MentorshipConnection }[] = [];
  connections.forEach((conn) => {
    if (conn.meetings && Array.isArray(conn.meetings)) {
      conn.meetings.forEach((mtg) => {
        scheduledMeetingsList.push({ meeting: mtg, connection: conn });
      });
    }
  });

  // Sort upcoming meetings with scheduled first, then by date/time
  scheduledMeetingsList.sort((a, b) => {
    if (a.meeting.status === 'scheduled' && b.meeting.status !== 'scheduled') return -1;
    if (a.meeting.status !== 'scheduled' && b.meeting.status === 'scheduled') return 1;
    const dateA = new Date(`${a.meeting.date} ${a.meeting.time || '10:00'}`).getTime();
    const dateB = new Date(`${b.meeting.date} ${b.meeting.time || '10:00'}`).getTime();
    return dateA - dateB;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 text-[#F5F2EB]">
      
      {/* Editorial Welcome Banner */}
      <div className="bg-[#10121D] border border-[#262A3C] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none -z-0" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">
              {isMentor ? 'Mentor Workspace' : isAdmin ? 'Administrator Console' : 'Your Journey'}
            </span>
            
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F2EB]">
              {isMentor ? 'Help someone take their next step.' : `What's your next step, ${currentUser?.name}?`}
            </h1>
            
            <p className="text-xs sm:text-sm text-[#9E9A90] leading-relaxed">
              {isMentor 
                ? 'Your hard-won experience can unlock someone else’s career breakthrough. Review pending requests and guide your active mentees.'
                : 'Start with a goal, then find the experience that can help you move forward with tactical clarity.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isMentor ? (
              <button
                onClick={() => setActiveTab('requests')}
                className="px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-md shadow-[#D4AF37]/15"
              >
                <span>Review Requests ({pendingIncomingRequests.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-md shadow-[#D4AF37]/15"
                >
                  <span>Find a Mentor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveTab('goals')}
                  className="px-4 py-3 rounded-xl bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider border border-[#343A52] transition-all cursor-pointer"
                >
                  <span>View Goals</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards (Interactive with Direct Navigation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isMentor ? (
          <>
            <div 
              onClick={() => setActiveTab('requests')}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/60 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:bg-[#151826] group"
            >
              <div className="flex items-center justify-between text-[#9E9A90]">
                <span className="text-[11px] uppercase font-mono tracking-wider group-hover:text-[#D4AF37] transition-colors">Pending Requests</span>
                <Send className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{pendingIncomingRequests.length}</div>
              <p className="text-[11px] text-[#7A766E] flex items-center justify-between">
                <span>Awaiting your review</span>
                <ChevronRight className="w-3 h-3 text-[#7A766E] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('connections')}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#10B981]/60 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:bg-[#151826] group"
            >
              <div className="flex items-center justify-between text-[#9E9A90]">
                <span className="text-[11px] uppercase font-mono tracking-wider group-hover:text-[#10B981] transition-colors">Active Mentorships</span>
                <Users className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{activeConnections.length}</div>
              <p className="text-[11px] text-[#7A766E] flex items-center justify-between">
                <span>Active 1:1 relationships</span>
                <ChevronRight className="w-3 h-3 text-[#7A766E] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('connections')}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/60 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:bg-[#151826] group"
            >
              <div className="flex items-center justify-between text-[#9E9A90]">
                <span className="text-[11px] uppercase font-mono tracking-wider group-hover:text-[#D4AF37] transition-colors">People You're Helping</span>
                <Award className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{connections.length}</div>
              <p className="text-[11px] text-[#7A766E] flex items-center justify-between">
                <span>Total mentees connected</span>
                <ChevronRight className="w-3 h-3 text-[#7A766E] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('connections')}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#10B981]/60 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:bg-[#151826] group"
            >
              <div className="flex items-center justify-between text-[#9E9A90]">
                <span className="text-[11px] uppercase font-mono tracking-wider group-hover:text-[#10B981] transition-colors">Completed Milestones</span>
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{completedMilestones}</div>
              <p className="text-[11px] text-[#7A766E] flex items-center justify-between">
                <span>Impact achievements logged</span>
                <ChevronRight className="w-3 h-3 text-[#7A766E] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </>
        ) : (
          <>
            <div 
              onClick={() => setActiveTab('goals')}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/60 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:bg-[#151826] group"
            >
              <div className="flex items-center justify-between text-[#9E9A90]">
                <span className="text-[11px] uppercase font-mono tracking-wider group-hover:text-[#D4AF37] transition-colors">Active Goals</span>
                <Target className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{activeGoals.length}</div>
              <p className="text-[11px] text-[#7A766E] flex items-center justify-between">
                <span>Target roadmaps in progress</span>
                <ChevronRight className="w-3 h-3 text-[#7A766E] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('requests')}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/60 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:bg-[#151826] group"
            >
              <div className="flex items-center justify-between text-[#9E9A90]">
                <span className="text-[11px] uppercase font-mono tracking-wider group-hover:text-[#D4AF37] transition-colors">Mentorship Requests</span>
                <Send className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{pendingOutgoingRequests.length}</div>
              <p className="text-[11px] text-[#7A766E] flex items-center justify-between">
                <span>Awaiting mentor confirmation</span>
                <ChevronRight className="w-3 h-3 text-[#7A766E] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('connections')}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#10B981]/60 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:bg-[#151826] group"
            >
              <div className="flex items-center justify-between text-[#9E9A90]">
                <span className="text-[11px] uppercase font-mono tracking-wider group-hover:text-[#10B981] transition-colors">Active Mentorships</span>
                <Users className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{activeConnections.length}</div>
              <p className="text-[11px] text-[#7A766E] flex items-center justify-between">
                <span>Ongoing advisory connections</span>
                <ChevronRight className="w-3 h-3 text-[#7A766E] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('goals')}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#10B981]/60 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:bg-[#151826] group"
            >
              <div className="flex items-center justify-between text-[#9E9A90]">
                <span className="text-[11px] uppercase font-mono tracking-wider group-hover:text-[#10B981] transition-colors">Milestones Achieved</span>
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{completedMilestones} <span className="text-xs text-[#7A766E] font-normal font-sans">/ {totalMilestones}</span></div>
              <p className="text-[11px] text-[#7A766E] flex items-center justify-between">
                <span>{milestoneProgressPct}% execution velocity</span>
                <ChevronRight className="w-3 h-3 text-[#7A766E] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </>
        )}
      </div>

      {/* Main Focus Area: Personalized Goal Card and Interactive Recharts Charts */}
      {!isMentor ? (
        /* Student Focus Section */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Goal Focus Card (2 Cols) */}
          <div className="lg:col-span-2 bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-[#232738] pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Active Focus</span>
                <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Your Current Development Goal</h3>
              </div>
              <button 
                onClick={() => setActiveTab('goals')}
                className="text-xs font-semibold text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1 cursor-pointer"
              >
                <span>Manage Roadmaps</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {primaryGoal ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 text-xs text-[#9E9A90] mb-1">
                    <span className="px-2 py-0.5 rounded bg-[#1A1D2C] border border-[#2D3349] text-[10px] font-mono uppercase text-[#D4AF37]">
                      {primaryGoal.category}
                    </span>
                    <span>Target: {new Date(primaryGoal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h4 className="text-xl font-serif font-semibold text-[#F5F2EB]">{primaryGoal.title}</h4>
                  <p className="text-xs text-[#9E9A90] mt-1 leading-relaxed">{primaryGoal.description}</p>
                </div>

                {/* Milestone Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9E9A90] font-mono">Milestone Completion</span>
                    <span className="font-bold text-[#D4AF37] font-mono">{primaryGoal.progress}%</span>
                  </div>
                  <div className="w-full bg-[#1A1D2C] rounded-full h-2 overflow-hidden border border-[#262A3C]">
                    <div 
                      className="bg-gradient-to-r from-[#D4AF37] to-[#10B981] h-full rounded-full transition-all duration-500"
                      style={{ width: `${primaryGoal.progress}%` }}
                    />
                  </div>
                </div>

                {/* Next Action Milestone */}
                <div className="bg-[#161925] border border-[#2D3349] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#10B981] font-semibold">Immediate Next Milestone</span>
                    <span className="text-[10px] text-[#7A766E]">Step 1 of {primaryGoal.milestones?.length || 1}</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full border-2 border-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#F5F2EB]">
                        {primaryGoal.milestones?.find(m => !m.completed)?.title || 'All initial milestones completed! Time to add new challenges.'}
                      </p>
                      <p className="text-[11px] text-[#9E9A90] mt-0.5">
                        Discuss architectural tradeoffs with your mentor during your next 1:1 check-in.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Purposeful Empty State for Goals */
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="text-base font-serif font-bold text-[#F5F2EB]">Every journey starts with a direction.</h4>
                <p className="text-xs text-[#9E9A90] max-w-sm mx-auto leading-relaxed">
                  Define your first concrete professional milestone to unlock tailored mentor recommendations and structured tracking.
                </p>
                <button
                  onClick={() => setActiveTab('goals')}
                  className="px-5 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all inline-flex items-center space-x-2 cursor-pointer"
                >
                  <span>Create Your First Goal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Goal Progress Chart / Insights (Interactive Recharts AreaChart) */}
          <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Execution Trajectory</span>
              <h3 className="text-base font-serif font-bold text-[#F5F2EB]">Milestone Velocity</h3>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={milestoneTrajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232738" vertical={false} />
                  <XAxis dataKey="period" stroke="#7A766E" fontSize={10} tickLine={false} />
                  <YAxis stroke="#7A766E" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161925', borderColor: '#2D3349', borderRadius: '8px', fontSize: '11px', color: '#F5F2EB' }}
                    itemStyle={{ color: '#D4AF37' }}
                  />
                  <Area type="monotone" dataKey="completed" name="Milestones Done" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#velocityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs border-b border-[#232738] pb-2">
                <span className="text-[#9E9A90]">Active Goals Tracked</span>
                <span className="font-mono text-[#F5F2EB] font-bold">{goals.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-[#232738] pb-2">
                <span className="text-[#9E9A90]">Roadmaps Completed</span>
                <span className="font-mono text-[#10B981] font-bold">{completedGoals.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9E9A90]">Average Velocity</span>
                <span className="font-mono text-[#D4AF37] font-bold">14 days/milestone</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#161925] border border-[#2D3349] text-xs text-[#9E9A90] space-y-1.5">
              <div className="flex items-center space-x-2 text-[#D4AF37] font-semibold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mentorship Acceleration</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#C5A880]">
                Mentees who review milestone roadmaps bi-weekly achieve targets 3.2x faster.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Mentor Active Mentees / Pending Requests Queue */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-[#232738] pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Incoming Requests</span>
                <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Mentees Seeking Guidance</h3>
              </div>
              <button 
                onClick={() => setActiveTab('requests')}
                className="text-xs font-semibold text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1 cursor-pointer"
              >
                <span>View All Requests</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingIncomingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingIncomingRequests.slice(0, 2).map((req) => (
                  <div key={req.id} className="p-4 rounded-xl bg-[#161925] border border-[#2D3349] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={req.requesterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                          alt={req.requesterName} 
                          className="w-10 h-10 rounded-xl object-cover border border-[#343A52]"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-[#F5F2EB]">{req.requesterName}</h4>
                          <p className="text-[11px] text-[#9E9A90]">{req.requesterTitle}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#7A766E]">
                        {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#9E9A90] line-clamp-2 leading-relaxed bg-[#11131E] p-3 rounded-lg border border-[#262A3C]">
                      "{req.message}"
                    </p>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Review & Respond
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
                  <Send className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-serif font-bold text-[#F5F2EB]">Your mentorship inbox is clear.</h4>
                <p className="text-xs text-[#9E9A90] max-w-sm mx-auto">
                  New mentorship requests from ambitious learners will appear here for your review.
                </p>
              </div>
            )}
          </div>

          <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Engagement Breakdown</span>
              <h3 className="text-base font-serif font-bold text-[#F5F2EB]">Mentorship Activity</h3>
            </div>

            {/* Mentor Competency Distribution Chart */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryCompetencyData} layout="vertical" margin={{ top: 5, right: 15, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232738" horizontal={false} />
                  <XAxis type="number" stroke="#7A766E" fontSize={9} domain={[0, 100]} />
                  <YAxis type="category" dataKey="category" stroke="#7A766E" fontSize={9} tickLine={false} width={75} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161925', borderColor: '#2D3349', borderRadius: '8px', fontSize: '11px', color: '#F5F2EB' }}
                  />
                  <Bar dataKey="score" name="Alignment %" radius={[0, 4, 4, 0]} fill="#D4AF37" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs border-b border-[#232738] pb-2">
                <span className="text-[#9E9A90]">Active Mentees</span>
                <span className="font-mono text-[#10B981] font-bold">{activeConnections.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-[#232738] pb-2">
                <span className="text-[#9E9A90]">Response Time</span>
                <span className="font-mono text-[#D4AF37] font-bold">&lt; 24 hours</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9E9A90]">Session Format</span>
                <span className="font-mono text-[#F5F2EB]">Bi-weekly 1:1</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('connections')}
              className="w-full py-2.5 rounded-xl bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider border border-[#343A52] transition-all cursor-pointer text-center"
            >
              Open Mentees Workspace
            </button>
          </div>
        </div>
      )}

      {/* Scheduled 1:1 Syncs & Meetings (Shown for both Mentors and Mentees if active meetings exist) */}
      {scheduledMeetingsList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Active Sessions</span>
              <h2 className="text-xl font-serif font-bold text-[#F5F2EB]">Upcoming 1:1 Meetings & Syncs</h2>
            </div>
            <button
              onClick={() => setActiveTab('connections')}
              className="text-xs font-semibold text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage in Workspace</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {scheduledMeetingsList.slice(0, 4).map(({ meeting, connection }) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                connection={connection}
                onUpdateMeeting={(updatedMtg) => {
                  setConnections(prev =>
                    prev.map(c =>
                      c.id === connection.id
                        ? {
                            ...c,
                            meetings: (c.meetings || []).map(m => m.id === updatedMtg.id ? updatedMtg : m)
                          }
                        : c
                    )
                  );
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommended Mentors Section (Students/Early Career Only) */}
      {!isMentor && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Goal Alignment</span>
              <h2 className="text-2xl font-serif font-bold text-[#F5F2EB]">People who may help you get there.</h2>
              <p className="text-xs text-[#9E9A90] mt-0.5">
                Calculated based on your active goals, target industry, and required skill competencies.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('discover')}
              className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              <span>Explore All Mentors</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {mentors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mentors.slice(0, 3).map((m, idx) => {
                const matchObj = aiMatches.find(match => match.mentorId === m.id);
                const score = matchObj?.matchScore || (idx === 0 ? 94 : idx === 1 ? 88 : 82);
                const reasons = matchObj?.matchReasons || [
                  `Direct expertise in ${m.industry}`,
                  `Mentoring focus on ${m.mentoringAreas[0] || 'Career Roadmaps'}`
                ];

                return (
                  <div 
                    key={m.id}
                    className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/50 rounded-2xl p-6 transition-all space-y-5 flex flex-col justify-between group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3.5">
                          <img 
                            src={m.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'} 
                            alt={m.name} 
                            className="w-12 h-12 rounded-xl object-cover border border-[#343A52]"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h4 className="text-sm font-serif font-bold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors">{m.name}</h4>
                              <span title="Verified Mentor"><Shield className="w-3.5 h-3.5 text-[#D4AF37]" /></span>
                            </div>
                            <p className="text-xs text-[#9E9A90] font-medium line-clamp-1">{m.title}</p>
                          </div>
                        </div>

                        {/* Goal Match Indicator Badge */}
                        <div className="px-2.5 py-1 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-mono font-bold text-[#D4AF37] shrink-0">
                          {score}% match
                        </div>
                      </div>

                      {/* Transparent Fit Explanation */}
                      <div className="p-3 rounded-xl bg-[#161925] border border-[#2D3349] space-y-1.5 text-[11px] text-[#9E9A90]">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#D4AF37] font-bold">Why this match:</span>
                        <ul className="space-y-1 text-[#C8A97E]">
                          {reasons.slice(0, 2).map((r, i) => (
                            <li key={i} className="flex items-center space-x-1.5">
                              <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                              <span className="truncate">{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {m.skills.slice(0, 3).map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-md bg-[#181B28] border border-[#2D3349] text-[10px] text-[#C5A880] font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#232738] flex items-center justify-between text-xs">
                      <span className="text-[#7A766E] font-mono">{m.yearsOfExperience} yrs exp</span>
                      <button
                        onClick={() => openMentorModal(m)}
                        className="text-[#D4AF37] hover:text-[#F5F2EB] font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-10 text-center space-y-3">
              <h3 className="text-base font-serif font-bold text-[#F5F2EB]">No mentors match your current goal yet.</h3>
              <p className="text-xs text-[#9E9A90]">
                Explore all disciplines to find experienced practitioners across engineering, product, and leadership.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center space-x-2 cursor-pointer"
              >
                <span>Explore All Mentors</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
