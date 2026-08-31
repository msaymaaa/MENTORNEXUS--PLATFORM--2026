import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Star, 
  MapPin, 
  Briefcase, 
  Clock, 
  Award, 
  GraduationCap, 
  Send, 
  Sparkles, 
  Check, 
  AlertCircle,
  MessageSquare,
  UserCheck,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  ArrowRight,
  Unlock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { UserProfile, MentorshipRequest, MentorshipConnection } from '../types/index';

export const MentorProfileModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    selectedMentorForModal: mentor, 
    isMentorModalOpen, 
    closeMentorModal, 
    showToast,
    triggerRefresh,
    setActiveTab,
    openAuthModal
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'request'>('profile');
  const [requestMessage, setRequestMessage] = useState('');
  const [goalsSummary, setGoalsSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishHighlights, setPolishHighlights] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Status check
  const [existingRequest, setExistingRequest] = useState<MentorshipRequest | null>(null);
  const [existingConnection, setExistingConnection] = useState<MentorshipConnection | null>(null);
  const [networkingStatus, setNetworkingStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [isSendingNetwork, setIsSendingNetwork] = useState(false);

  // Block/Unblock state
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isProcessingBlock, setIsProcessingBlock] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    if (!mentor) return;

    if (!currentUser) {
      setIsUserBlocked(false);
      setExistingRequest(null);
      setExistingConnection(null);
      setNetworkingStatus('none');
      setActiveSubTab('profile');
      return;
    }

    // Reset fields
    setRequestMessage(`Hello ${mentor.name}, I am a ${currentUser.title} at ${currentUser.organization || 'independent'}. I would value your guidance on ${mentor.mentoringAreas[0] || 'career development and milestone planning'}.`);
    setGoalsSummary('');
    setPolishHighlights([]);
    setErrorMessage('');
    setActiveSubTab('profile');

    const checkExisting = async () => {
      try {
        const [reqs, conns, netStatus, blockedUsers] = await Promise.all([
          api.getRequests(currentUser.id),
          api.getConnections(currentUser.id),
          api.getNetworkingStatus(currentUser.id, mentor.id),
          api.getBlockedUsers(currentUser.id),
        ]);

        const req = reqs.find(r => r.mentorId === mentor.id && r.requesterId === currentUser.id && (r.status === 'pending' || r.status === 'accepted'));
        const conn = conns.find(c => (c.mentorId === mentor.id || c.studentId === mentor.id) && c.status === 'active');
        const isBlocked = blockedUsers.some(b => b.id === mentor.id) || (currentUser.blockedUserIds?.includes(mentor.id) ?? false);

        setExistingRequest(req || null);
        setExistingConnection(conn || null);
        setNetworkingStatus(netStatus);
        setIsUserBlocked(isBlocked);
      } catch (err) {
        console.error('Error checking mentor relationship:', err);
      }
    };

    checkExisting();
  }, [mentor, currentUser]);

  if (!isMentorModalOpen || !mentor) return null;

  const isSelf = currentUser?.id === mentor.id;
  const isConnected = !!existingConnection;
  const isPending = existingRequest?.status === 'pending';

  const handleSendNetworking = async () => {
    if (!currentUser) {
      openAuthModal('choice');
      showToast('info', 'Sign In Required', 'Please sign in or create an account to connect with members.');
      return;
    }
    if (isSelf || isUserBlocked) return;
    try {
      setIsSendingNetwork(true);
      await api.sendNetworkingRequest({
        requesterId: currentUser.id,
        recipientId: mentor.id,
      });
      setNetworkingStatus('pending');
      showToast('success', 'Connection Request Sent', `Sent a professional network request to ${mentor.name}.`);
    } catch (err: any) {
      showToast('error', 'Network Request Failed', err.message || 'Could not send request');
    } finally {
      setIsSendingNetwork(false);
    }
  };

  const handleUnblock = async () => {
    if (!currentUser) return;
    try {
      setIsProcessingBlock(true);
      await api.unblockUser(mentor.id, currentUser.id);
      setIsUserBlocked(false);
      if (currentUser.blockedUserIds) {
        currentUser.blockedUserIds = currentUser.blockedUserIds.filter(id => id !== mentor.id);
      }
      showToast('success', 'User Unblocked', `${mentor.name} has been unblocked. You can now connect.`);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to Unblock', err.message);
    } finally {
      setIsProcessingBlock(false);
    }
  };

  const handleBlock = async () => {
    if (!currentUser) return;
    try {
      setIsProcessingBlock(true);
      await api.blockUser(mentor.id, currentUser.id);
      setIsUserBlocked(true);
      if (!currentUser.blockedUserIds) {
        currentUser.blockedUserIds = [];
      }
      if (!currentUser.blockedUserIds.includes(mentor.id)) {
        currentUser.blockedUserIds.push(mentor.id);
      }
      setExistingConnection(null);
      setExistingRequest(null);
      setNetworkingStatus('none');
      setShowBlockModal(false);
      showToast('info', 'User Blocked', `${mentor.name} has been blocked and removed from your network.`);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to Block', err.message);
    } finally {
      setIsProcessingBlock(false);
    }
  };

  const handlePolishMessage = async () => {
    try {
      setIsPolishing(true);
      const res = await api.polishRequestAI({
        mentorId: mentor.id,
        draftMessage: requestMessage,
        goalsSummary: goalsSummary,
      });

      setRequestMessage(res.polishedMessage);
      setPolishHighlights(res.highlights || []);
      showToast('success', 'Message Polished', 'Your mentorship request has been optimized for professional clarity.');
    } catch (err: any) {
      showToast('error', 'Could not polish message', err.message);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      openAuthModal('choice');
      showToast('info', 'Sign In Required', 'Please sign in or create an account to request mentorship.');
      return;
    }

    if (currentUser.id === mentor.id) {
      setErrorMessage('You cannot request mentorship with your own profile.');
      return;
    }

    if (!requestMessage.trim()) {
      setErrorMessage('Please include a message for the mentor.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createRequest({
        requesterId: currentUser.id,
        requesterName: currentUser.name,
        requesterTitle: currentUser.title,
        requesterAvatar: currentUser.avatar,
        requesterRole: currentUser.role,
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorTitle: mentor.title,
        mentorAvatar: mentor.avatar,
        message: requestMessage,
        goalsSummary: goalsSummary,
      });

      showToast('success', 'Mentorship Request Sent', `${mentor.name} has been notified and will review your goals.`);
      triggerRefresh();
      closeMentorModal();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="mentor-profile-dialog"
        className="bg-[#11131E] rounded-2xl max-w-3xl w-full shadow-2xl border border-[#262A3C] overflow-hidden my-8 text-[#F5F2EB]"
      >
        {/* Modal Top Banner */}
        <div className="h-28 bg-gradient-to-r from-[#181B28] via-[#141622] to-[#1E2232] relative px-6 flex items-end justify-between pb-4 border-b border-[#232738]">
          <div className="absolute top-4 left-6 flex items-center space-x-2">
            {isUserBlocked && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono uppercase font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                <Ban className="w-3 h-3 mr-1" /> Blocked User
              </span>
            )}
          </div>
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            {currentUser && !isSelf && !isUserBlocked && (
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                className="px-2.5 py-1 rounded-lg bg-[#090A0F]/60 hover:bg-red-950/40 text-[#7A766E] hover:text-red-400 border border-transparent hover:border-red-800/40 text-[11px] font-mono transition-colors cursor-pointer flex items-center space-x-1"
                title="Block this user"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block</span>
              </button>
            )}
            <button
              onClick={closeMentorModal}
              className="p-2 rounded-lg bg-[#090A0F]/60 text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#1C2030] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Card Header Info */}
        <div className="px-6 pb-4 pt-0 relative border-b border-[#232738] flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
          <div className="flex items-end space-x-4">
            <img
              src={mentor.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
              alt={mentor.name}
              className="w-22 h-22 rounded-2xl object-cover border-4 border-[#11131E] shadow-xl shrink-0 bg-[#11131E]"
              referrerPolicy="no-referrer"
            />
            <div className="mb-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-serif font-bold text-[#F5F2EB]">{mentor.name}</h2>
                {mentor.role === 'mentor' ? (
                  mentor.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                      <Shield className="w-3 h-3 mr-1" /> Verified Mentor
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                      <Award className="w-3 h-3 mr-1" /> Industry Mentor
                    </span>
                  )
                ) : mentor.role === 'early_career' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Briefcase className="w-3 h-3 mr-1" /> Early-Career
                  </span>
                ) : mentor.role === 'admin' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    <Shield className="w-3 h-3 mr-1" /> Administrator
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    <GraduationCap className="w-3 h-3 mr-1" /> Learner
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-[#9E9A90] mt-0.5">{mentor.title}</p>
              <p className="text-[11px] text-[#7A766E] font-mono">{mentor.organization} • {mentor.location}</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {!currentUser ? (
              /* Public / Unregistered Visitor Action Controls */
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="px-3.5 py-2 bg-[#181B28] hover:bg-[#222738] text-[#F5F2EB] border border-[#343A52] hover:border-[#D4AF37] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Connect</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup', mentor.role === 'mentor' ? 'student' : 'mentor')}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/15 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{mentor.role === 'mentor' ? 'Request Mentorship' : 'Start Guidance'}</span>
                </button>
              </div>
            ) : isSelf ? (
              <span className="text-xs text-[#7A766E] italic">Your Profile</span>
            ) : isUserBlocked ? (
              /* Dynamic Unblock Button */
              <button
                type="button"
                onClick={handleUnblock}
                disabled={isProcessingBlock}
                className="px-4 py-2 bg-[#181B28] hover:bg-emerald-950/40 text-emerald-400 border border-emerald-700/50 hover:border-emerald-500 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{isProcessingBlock ? 'Unblocking...' : 'Unblock User'}</span>
              </button>
            ) : (
              <>
                {/* 1. Independent Professional Network Action */}
                {networkingStatus === 'connected' ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                    <span>In Network</span>
                  </span>
                ) : networkingStatus === 'pending' ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#262A3C] text-[#C4C0B5] border border-[#343A52]">
                    <Clock className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />
                    <span>Network Pending</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendNetworking}
                    disabled={isSendingNetwork}
                    className="px-3.5 py-2 bg-[#181B28] hover:bg-[#222738] text-[#F5F2EB] border border-[#343A52] hover:border-[#D4AF37] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{isSendingNetwork ? 'Connecting...' : 'Add to Network'}</span>
                  </button>
                )}

                {/* 2. Independent Mentorship Action */}
                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMentorModal();
                      setActiveTab('connections');
                    }}
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/25 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    <span>Open Workspace</span>
                  </button>
                ) : isPending ? (
                  <span className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>Mentorship Pending</span>
                  </span>
                ) : (
                  <button
                    id="modal-request-mentorship-tab-btn"
                    onClick={() => setActiveSubTab(activeSubTab === 'request' ? 'profile' : 'request')}
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/15 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {activeSubTab === 'request' 
                        ? 'View Bio' 
                        : mentor.role === 'mentor' 
                          ? 'Request Mentorship' 
                          : currentUser?.role === 'mentor'
                            ? 'Guide / Mentor'
                            : 'Request Mentorship'}
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeSubTab === 'profile' ? (
            <div className="space-y-6">
              
              {/* Highlight Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 bg-[#161925] p-4 rounded-xl border border-[#262A3C] text-center">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#7A766E] block">Experience</span>
                  <span className="text-sm font-serif font-bold text-[#F5F2EB]">{mentor.yearsOfExperience}+ Years</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#7A766E] block">Feedback Rating</span>
                  <span className="text-sm font-serif font-bold text-[#D4AF37] flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37] mr-1" />
                    {mentor.rating || 4.9}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#7A766E] block">Availability</span>
                  <span className="text-xs font-semibold text-[#F5F2EB] truncate block mt-0.5">
                    {mentor.availability || '2 hrs / week'}
                  </span>
                </div>
              </div>

              {/* Bio / Background */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-[#D4AF37] font-bold">About & Experience</h4>
                <p className="text-xs text-[#9E9A90] leading-relaxed whitespace-pre-line bg-[#141622] p-4 rounded-xl border border-[#262A3C]">
                  {mentor.bio}
                </p>
              </div>

              {/* Mentoring Focus Areas */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-[#D4AF37] font-bold">Mentoring Focus Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {mentor.mentoringAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-[#181B28] text-[#D4AF37] text-xs font-mono rounded-lg border border-[#343A52]"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Core Skills & Tools */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-[#D4AF37] font-bold">Core Skills & Competencies</h4>
                <div className="flex flex-wrap gap-1.5">
                  {mentor.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-[#141622] border border-[#262A3C] text-[#9E9A90] text-[11px] font-mono rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Send Mentorship Request Form */
            <form onSubmit={handleSendRequest} className="space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#9E9A90]">
                    Your Message to {mentor.name}
                  </label>
                  <button
                    type="button"
                    onClick={handlePolishMessage}
                    disabled={isPolishing}
                    className="text-xs text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1 cursor-pointer disabled:opacity-50 font-mono"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isPolishing ? 'Enhancing...' : 'Polish Message'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl p-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
                  placeholder="Introduce yourself, your current role, and specifically what guidance you are seeking..."
                />
              </div>

              {polishHighlights.length > 0 && (
                <div className="p-3 rounded-xl bg-[#181C2C] border border-[#D4AF37]/40 space-y-1 text-xs text-[#D4AF37]">
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold">Enhancement Highlights:</span>
                  <ul className="space-y-0.5 text-[11px] text-[#F5F2EB]/80">
                    {polishHighlights.map((h, i) => (
                      <li key={i} className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-[#9E9A90]">
                  Target Goals & Milestones <span className="text-[#7A766E] text-[10px] lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={goalsSummary}
                  onChange={(e) => setGoalsSummary(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3 py-2.5 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                  placeholder="e.g. Preparing for Staff Engineer promotion in Q3"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('profile')}
                  className="px-4 py-2.5 rounded-xl bg-[#161925] border border-[#262A3C] text-xs font-semibold text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/15 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting Request...' : 'Send Request'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Block Confirmation Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141622] border border-red-900/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-[#F5F2EB]">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 text-red-400 flex items-center justify-center border border-red-800/40">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Block {mentor.name}?</h3>
              <p className="text-xs text-[#9E9A90] mt-1 leading-relaxed">
                Blocking this user will remove all active connections, requests, and network relationships. You can unblock them at any time from their profile.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 rounded-xl bg-[#181B28] text-[#9E9A90] hover:text-[#F5F2EB] border border-[#2D3349] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlock}
                disabled={isProcessingBlock}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessingBlock ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
