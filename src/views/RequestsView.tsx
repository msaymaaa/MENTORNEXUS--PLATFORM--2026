import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Trash2, 
  ChevronRight, 
  User, 
  Calendar, 
  Sparkles, 
  AlertCircle,
  X,
  ArrowRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MentorshipRequest } from '../types/index';

export const RequestsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh, refreshTrigger, setActiveTab } = useApp();

  const [activeTabMode, setActiveTabMode] = useState<'incoming' | 'sent'>('incoming');
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Response dialog state
  const [selectedRequestForResponse, setSelectedRequestForResponse] = useState<MentorshipRequest | null>(null);
  const [responseAction, setResponseAction] = useState<'accepted' | 'declined'>('accepted');
  const [responseNote, setResponseNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const data = await api.getRequests(currentUser.id);
      setRequests(data);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentUser, refreshTrigger]);

  // Set default tab according to role
  useEffect(() => {
    if (currentUser?.role === 'mentor') {
      setActiveTabMode('incoming');
    } else {
      setActiveTabMode('sent');
    }
  }, [currentUser?.role]);

  const incomingRequests = requests.filter(r => r.mentorId === currentUser?.id);
  const sentRequests = requests.filter(r => r.requesterId === currentUser?.id);

  const handleOpenResponseDialog = (req: MentorshipRequest, action: 'accepted' | 'declined') => {
    setSelectedRequestForResponse(req);
    setResponseAction(action);
    setResponseNote(
      action === 'accepted' 
        ? `Hi ${req.requesterName}, I would be delighted to mentor you! Let's connect on goals and schedule our kickoff chat.`
        : `Hi ${req.requesterName}, thank you for reaching out. My mentorship bandwidth is currently full, but I wish you the best in your journey!`
    );
  };

  const handleConfirmResponse = async () => {
    if (!selectedRequestForResponse) return;
    try {
      setIsSubmitting(true);
      await api.respondToRequest(selectedRequestForResponse.id, responseAction, responseNote);
      showToast(
        'success',
        responseAction === 'accepted' ? 'Mentorship Accepted!' : 'Request Declined',
        responseAction === 'accepted' 
          ? `You and ${selectedRequestForResponse.requesterName} are now connected!` 
          : `Response note sent to ${selectedRequestForResponse.requesterName}.`
      );
      setSelectedRequestForResponse(null);
      triggerRefresh();
      if (responseAction === 'accepted') {
        setActiveTab('connections');
      }
    } catch (err: any) {
      showToast('error', 'Error responding to request', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (id: string, name: string) => {
    if (!confirm(`Cancel mentorship request to ${name}?`)) return;
    try {
      await api.deleteRequest(id);
      showToast('info', 'Request Cancelled', 'Your mentorship request has been withdrawn.');
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Could not cancel request', err.message);
    }
  };

  const isMentor = currentUser?.role === 'mentor';
  const displayedRequests = activeTabMode === 'incoming' ? incomingRequests : sentRequests;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">Communication Center</span>
          <h1 className="text-3xl font-serif font-bold text-[#F5F2EB]">Mentorship Requests.</h1>
          <p className="text-xs text-[#9E9A90] max-w-xl">
            {isMentor
              ? 'Review inquiries from ambitious learners. Accept mentorship to begin 1:1 structured guidance.'
              : 'Track the status of your mentorship requests and review mentor responses.'}
          </p>
        </div>

        {/* Tab switch for users who have both incoming & sent */}
        <div className="flex rounded-xl bg-[#12141F] border border-[#262A3C] p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTabMode('incoming')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTabMode === 'incoming'
                ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-sm'
                : 'text-[#9E9A90] hover:text-[#F5F2EB]'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Received ({incomingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTabMode('sent')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTabMode === 'sent'
                ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-sm'
                : 'text-[#9E9A90] hover:text-[#F5F2EB]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Sent ({sentRequests.length})</span>
          </button>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 h-40 animate-pulse" />
          ))}
        </div>
      ) : displayedRequests.length > 0 ? (
        <div className="space-y-4">
          {displayedRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isAccepted = req.status === 'accepted';
            const isDeclined = req.status === 'declined';
            const otherPartyName = activeTabMode === 'incoming' ? req.requesterName : req.mentorName;
            const otherPartyAvatar = activeTabMode === 'incoming' ? req.requesterAvatar : req.mentorAvatar;
            const otherPartyTitle = activeTabMode === 'incoming' ? req.requesterTitle : req.mentorTitle;

            return (
              <div
                key={req.id}
                className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232738] pb-4">
                    <div className="flex items-center space-x-3.5">
                      <img 
                        src={otherPartyAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                        alt={otherPartyName} 
                        className="w-12 h-12 rounded-xl object-cover border border-[#343A52]"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-serif font-bold text-[#F5F2EB]">{otherPartyName}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            isAccepted ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' :
                            isPending ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30' :
                            'bg-red-950/40 text-red-300 border border-red-800/40'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#9E9A90] font-medium">{otherPartyTitle}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-[#7A766E]">
                      Sent {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Message Content Box */}
                  <div className="bg-[#141622] p-4 rounded-xl border border-[#262A3C] space-y-2">
                    <span className="text-[10px] font-mono uppercase text-[#7A766E] font-bold block">Mentorship Request Details:</span>
                    <p className="text-xs text-[#9E9A90] leading-relaxed whitespace-pre-line">
                      "{req.message}"
                    </p>
                    {req.goalsSummary && (
                      <div className="pt-2 border-t border-[#232738] text-[11px] text-[#D4AF37] font-mono">
                        Target Focus: {req.goalsSummary}
                      </div>
                    )}
                  </div>

                  {/* Mentor Response Note (if answered) */}
                  {req.responseNote && (
                    <div className="bg-[#181B28] p-4 rounded-xl border border-[#343A52] space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-[#10B981] font-bold block">
                        Response from {req.mentorName}:
                      </span>
                      <p className="text-xs text-[#F5F2EB] leading-relaxed italic">
                        "{req.responseNote}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="pt-3 border-t border-[#232738] flex items-center justify-between">
                  {activeTabMode === 'incoming' && isPending ? (
                    <div className="flex items-center space-x-2 ml-auto">
                      <button
                        onClick={() => handleOpenResponseDialog(req, 'declined')}
                        className="px-4 py-2 rounded-xl bg-[#161925] border border-[#262A3C] text-xs text-[#9E9A90] hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleOpenResponseDialog(req, 'accepted')}
                        className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-[#D4AF37]/15"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Mentorship</span>
                      </button>
                    </div>
                  ) : activeTabMode === 'sent' && isPending ? (
                    <button
                      onClick={() => handleCancelRequest(req.id, req.mentorName)}
                      className="text-xs text-[#7A766E] hover:text-red-400 transition-colors cursor-pointer ml-auto"
                    >
                      Withdraw Request
                    </button>
                  ) : isAccepted ? (
                    <button
                      onClick={() => setActiveTab('connections')}
                      className="text-xs font-semibold text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1 cursor-pointer ml-auto"
                    >
                      <span>Open 1:1 Workspace</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">
            {activeTabMode === 'incoming' ? 'No incoming requests.' : 'No sent requests.'}
          </h3>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            {activeTabMode === 'incoming' 
              ? 'When learners reach out for your guidance, their requests will appear here for review.'
              : 'Browse verified mentors in the directory to request direct 1:1 career guidance.'}
          </p>
          {activeTabMode === 'sent' && (
            <button
              onClick={() => setActiveTab('discover')}
              className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center space-x-2"
            >
              <span>Discover Mentors</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Response Modal */}
      {selectedRequestForResponse && (
        <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#11131E] border border-[#262A3C] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl text-[#F5F2EB] space-y-5">
            
            <div className="flex items-center justify-between border-b border-[#232738] pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Mentorship Decision</span>
                <h3 className="text-xl font-serif font-bold text-[#F5F2EB]">
                  {responseAction === 'accepted' ? 'Accept Mentorship Request' : 'Decline Request'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequestForResponse(null)}
                className="p-1.5 rounded-lg text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181B28] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono uppercase text-[#9E9A90]">
                Response Note to {selectedRequestForResponse.requesterName}
              </label>
              <textarea
                rows={4}
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="w-full bg-[#141622] border border-[#2D3349] rounded-xl p-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
                placeholder="Share next steps or notes..."
              />
            </div>

            <div className="pt-3 border-t border-[#232738] flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setSelectedRequestForResponse(null)}
                className="px-4 py-2.5 rounded-xl bg-[#161925] border border-[#262A3C] text-xs font-semibold text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResponse}
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 ${
                  responseAction === 'accepted'
                    ? 'bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] shadow-lg shadow-[#D4AF37]/15'
                    : 'bg-red-800 hover:bg-red-700 text-white'
                }`}
              >
                <span>{isSubmitting ? 'Confirming...' : responseAction === 'accepted' ? 'Confirm & Connect' : 'Send Decline Note'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
