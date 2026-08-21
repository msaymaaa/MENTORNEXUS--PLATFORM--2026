import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  Target, 
  FileText, 
  Mail, 
  ExternalLink,
  ArrowRight,
  Shield,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MentorshipConnection, Goal } from '../types/index';

export const ConnectionsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh, refreshTrigger, setActiveTab } = useApp();

  const [connections, setConnections] = useState<MentorshipConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<MentorshipConnection | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Note state
  const [newNote, setNewNote] = useState('');
  const [nextMeetingDate, setNextMeetingDate] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const loadConnections = async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const conns = await api.getConnections(currentUser.id);
      setConnections(conns);
      if (conns.length > 0 && !selectedConnection) {
        setSelectedConnection(conns[0]);
      } else if (selectedConnection) {
        const fresh = conns.find(c => c.id === selectedConnection.id);
        if (fresh) setSelectedConnection(fresh);
      }

      // Load all goals for linked tracking
      const allGoals = await api.getGoals();
      setGoals(allGoals);
    } catch (err) {
      console.error('Error fetching connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, [currentUser, refreshTrigger]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection || !newNote.trim()) return;

    try {
      setIsSavingNote(true);
      const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const updatedNotes = [
        `${dateStr}: ${newNote.trim()}`,
        ...(selectedConnection.notes || [])
      ];

      const updated = await api.updateConnection(selectedConnection.id, {
        notes: updatedNotes,
        lastMeetingDate: new Date().toISOString(),
        ...(nextMeetingDate ? { nextMeetingDate: new Date(nextMeetingDate).toISOString() } : {})
      });

      setSelectedConnection(updated);
      setNewNote('');
      setNextMeetingDate('');
      showToast('success', 'Discussion Note Logged', 'Mentorship log updated successfully.');
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to save note', err.message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const isMentor = currentUser?.role === 'mentor';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">Active Relationships</span>
          <h1 className="text-3xl font-serif font-bold text-[#F5F2EB]">
            {isMentor ? 'Active Mentees & 1:1 Cadence' : 'Mentorship Workspaces'}
          </h1>
          <p className="text-xs text-[#9E9A90] max-w-xl">
            Collaborate on goal progress, track meeting takeaways, and maintain consistent growth velocity.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-96 bg-[#12141F] rounded-2xl border border-[#262A3C] animate-pulse" />
          <div className="md:col-span-2 h-96 bg-[#12141F] rounded-2xl border border-[#262A3C] animate-pulse" />
        </div>
      ) : connections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Connections List */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A766E] font-bold block">
              Active Connections ({connections.length})
            </span>

            {connections.map((conn) => {
              const otherPartyName = conn.mentorId === currentUser?.id ? conn.studentName : conn.mentorName;
              const otherPartyAvatar = conn.mentorId === currentUser?.id ? conn.studentAvatar : conn.mentorAvatar;
              const otherPartyTitle = conn.mentorId === currentUser?.id ? conn.studentTitle : conn.mentorTitle;
              const isSelected = selectedConnection?.id === conn.id;

              return (
                <div
                  key={conn.id}
                  onClick={() => setSelectedConnection(conn)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-[#181B28] border-[#D4AF37] shadow-md'
                      : 'bg-[#12141F] border-[#262A3C] hover:border-[#3D4460]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={otherPartyAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                      alt={otherPartyName} 
                      className="w-10 h-10 rounded-xl object-cover border border-[#343A52]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#F5F2EB] truncate">{otherPartyName}</h4>
                      <p className="text-[11px] text-[#9E9A90] truncate">{otherPartyTitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#7A766E] font-mono pt-2 border-t border-[#232738]">
                    <span>Connected since {new Date(conn.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                    <span className="text-[#10B981] font-semibold">Active</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Workspace */}
          {selectedConnection && (
            <div className="md:col-span-2 bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
              
              {/* Partner Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232738] pb-5">
                <div className="flex items-center space-x-3.5">
                  <img 
                    src={(selectedConnection.mentorId === currentUser?.id ? selectedConnection.studentAvatar : selectedConnection.mentorAvatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                    alt={selectedConnection.mentorId === currentUser?.id ? selectedConnection.studentName : selectedConnection.mentorName} 
                    className="w-12 h-12 rounded-xl object-cover border border-[#343A52]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold">
                      {selectedConnection.mentorId === currentUser?.id ? 'Mentee Workspace' : 'Mentor Workspace'}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">
                      {selectedConnection.mentorId === currentUser?.id ? selectedConnection.studentName : selectedConnection.mentorName}
                    </h3>
                    <p className="text-xs text-[#9E9A90]">
                      {selectedConnection.mentorId === currentUser?.id ? selectedConnection.studentTitle : selectedConnection.mentorTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-lg bg-[#181B28] border border-[#2D3349] text-[11px] font-mono text-[#D4AF37]">
                    Bi-Weekly Cadence
                  </span>
                </div>
              </div>

              {/* Linked Goals & Milestones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                    Active Development Roadmaps
                  </span>
                  <button
                    onClick={() => setActiveTab('goals')}
                    className="text-xs text-[#9E9A90] hover:text-[#F5F2EB] flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View Roadmap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#141622] border border-[#262A3C] space-y-2">
                  {goals.filter(g => g.userId === selectedConnection.studentId).slice(0, 2).map((g) => (
                    <div key={g.id} className="space-y-1.5 border-b border-[#232738] last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#F5F2EB]">{g.title}</span>
                        <span className="font-mono text-[#D4AF37]">{g.progress}%</span>
                      </div>
                      <div className="w-full bg-[#181B28] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#D4AF37] h-full rounded-full" style={{ width: `${g.progress}%` }} />
                      </div>
                    </div>
                  ))}
                  {goals.filter(g => g.userId === selectedConnection.studentId).length === 0 && (
                    <p className="text-xs text-[#7A766E] italic">No active roadmaps linked to this profile yet.</p>
                  )}
                </div>
              </div>

              {/* Discussion & Meeting Log */}
              <div className="space-y-4 pt-2 border-t border-[#232738]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold block">
                  Session Notes & Next Actions
                </span>

                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Log discussion notes, key insights, architectural feedback, or action items from your last conversation..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl p-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-[#7A766E]" />
                      <input
                        type="date"
                        value={nextMeetingDate}
                        onChange={(e) => setNextMeetingDate(e.target.value)}
                        className="bg-[#141622] border border-[#2D3349] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                        placeholder="Next Sync"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingNote || !newNote.trim()}
                      className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 self-end sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isSavingNote ? 'Logging...' : 'Log Session Note'}</span>
                    </button>
                  </div>
                </form>

                {/* History of notes */}
                <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
                  {selectedConnection.notes && selectedConnection.notes.length > 0 ? (
                    selectedConnection.notes.map((n, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#141622] border border-[#262A3C] text-xs text-[#9E9A90] leading-relaxed">
                        {n}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#7A766E] italic">No session notes recorded yet. Add your first note above.</p>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">No active mentorships yet.</h3>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            {isMentor
              ? 'Review pending mentorship requests to connect with ambitious learners.'
              : 'Discover verified mentors in your field to request structured 1:1 guidance.'}
          </p>
          <button
            onClick={() => setActiveTab(isMentor ? 'requests' : 'discover')}
            className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center space-x-2"
          >
            <span>{isMentor ? 'Review Requests' : 'Find a Mentor'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
