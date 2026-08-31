import React, { useState, useEffect, useRef } from 'react';
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
  Send,
  Mic,
  Square,
  Play,
  Pause,
  Volume2,
  Video,
  Check,
  X,
  User,
  Reply,
  Copy,
  Trash2,
  CornerDownRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MentorshipConnection, Goal, ChatMessage, MentorshipMeeting, UserProfile } from '../types/index';
import { MeetingCard } from '../components/MeetingCard';

export const ConnectionsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh, refreshTrigger, setActiveTab, openMentorModal, openAuthModal } = useApp();

  const [connections, setConnections] = useState<MentorshipConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<MentorshipConnection | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Workspace Sub-Tab: 'chat' | 'meetings' | 'notes' | 'roadmap'
  const [workspaceTab, setWorkspaceTab] = useState<'chat' | 'meetings' | 'notes' | 'roadmap'>('chat');

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Chat History Management
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);

  const handleClearChatHistory = async () => {
    if (!selectedConnection) return;
    try {
      setIsClearingChat(true);
      await api.deleteMessagesForConnection(selectedConnection.id);
      setMessages([]);
      showToast('info', 'Chat History Deleted', 'All messages in this workspace have been removed.');
      setShowDeleteChatModal(false);
    } catch (err: any) {
      showToast('error', 'Failed to clear chat', err.message);
    } finally {
      setIsClearingChat(false);
    }
  };

  // New Note state
  const [newNote, setNewNote] = useState('');
  const [nextMeetingDate, setNextMeetingDate] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Meeting Schedule state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00 AM PST');
  const [meetingUrl, setMeetingUrl] = useState('https://meet.google.com/new');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [userProfilesMap, setUserProfilesMap] = useState<Map<string, UserProfile>>(new Map());

  const getPeerDetails = (conn: MentorshipConnection) => {
    const isCurrentUserMentor = conn.mentorId === currentUser?.id;
    const peerId = isCurrentUserMentor ? conn.studentId : conn.mentorId;
    const peerProfile = userProfilesMap.get(peerId);

    const explicitPeerName = isCurrentUserMentor ? conn.studentName : conn.mentorName;
    const peerName = (peerProfile?.name || explicitPeerName || 'Connection Partner').trim();

    const explicitPeerAvatar = isCurrentUserMentor ? conn.studentAvatar : conn.mentorAvatar;
    const peerAvatar = peerProfile?.avatar || explicitPeerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

    const isPeerMentor = peerProfile?.role === 'mentor' || (peerProfile as any)?.is_mentor === true || (!isCurrentUserMentor && peerProfile?.role !== 'student');
    const peerRoleLabel = isPeerMentor ? 'Mentor' : (peerProfile?.role === 'early_career' ? 'Early Career' : 'Learner');

    const explicitPeerTitle = isCurrentUserMentor ? conn.studentTitle : conn.mentorTitle;
    const peerTitle = peerProfile?.title || (peerProfile as any)?.profession || explicitPeerTitle || (isPeerMentor ? 'Industry Mentor' : 'Aspiring Professional');

    return {
      peerId,
      peerProfile,
      peerName,
      peerAvatar,
      isPeerMentor,
      peerRoleLabel,
      peerTitle,
    };
  };

  const handleViewPeerProfile = async () => {
    if (!selectedConnection) return;
    const { peerId, peerProfile } = getPeerDetails(selectedConnection);
    if (peerProfile) {
      openMentorModal(peerProfile);
      return;
    }
    if (!peerId) return;
    try {
      const profile = await api.getUserById(peerId);
      if (profile) {
        openMentorModal(profile);
      } else {
        showToast('error', 'Profile Not Found', 'Could not retrieve profile information.');
      }
    } catch (err: any) {
      showToast('error', 'Error Loading Profile', err.message);
    }
  };

  const loadConnections = async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const [conns, blockedUsers, allUsers] = await Promise.all([
        api.getConnections(currentUser.id),
        api.getBlockedUsers(currentUser.id).catch(() => [] as any[]),
        api.getAllUsers().catch(() => [] as UserProfile[]),
      ]);
      if (allUsers && allUsers.length > 0) {
        const pMap = new Map<string, UserProfile>();
        allUsers.forEach((u: UserProfile) => pMap.set(u.id, u));
        setUserProfilesMap(pMap);
      }
      const blockedSet = new Set(blockedUsers.map((b: any) => b.id));
      const validConns = conns.filter(c => {
        const peerId = c.mentorId === currentUser.id ? c.studentId : c.mentorId;
        return peerId && !blockedSet.has(peerId);
      });
      
      setConnections(prevConns => {
        if (prevConns.length === 0) return validConns;
        return validConns.map(fresh => {
          const prev = prevConns.find(p => 
            p.id === fresh.id || 
            (p.requestId && fresh.requestId && p.requestId === fresh.requestId)
          );
          if (!prev) return fresh;
          const meetingMap = new Map<string, MentorshipMeeting>();
          (fresh.meetings || []).forEach(m => meetingMap.set(m.id, m));
          (prev.meetings || []).forEach(m => {
            if (!meetingMap.has(m.id)) meetingMap.set(m.id, m);
          });
          return {
            ...fresh,
            meetings: Array.from(meetingMap.values()),
            nextMeetingDate: fresh.nextMeetingDate || prev.nextMeetingDate,
          };
        });
      });

      setSelectedConnection(prev => {
        if (!prev) return validConns[0] || null;
        const fresh = validConns.find(c => 
          c.id === prev.id || 
          (c.requestId && prev.requestId && c.requestId === prev.requestId)
        );
        if (fresh) {
          const meetingMap = new Map<string, MentorshipMeeting>();
          (fresh.meetings || []).forEach(m => meetingMap.set(m.id, m));
          (prev.meetings || []).forEach(m => {
            if (!meetingMap.has(m.id)) meetingMap.set(m.id, m);
          });
          return {
            ...fresh,
            meetings: Array.from(meetingMap.values()),
            nextMeetingDate: fresh.nextMeetingDate || prev.nextMeetingDate,
          };
        }
        return validConns[0] || null;
      });

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

    // Periodic real-time background sync with bulletproof merge
    const interval = setInterval(() => {
      if (!currentUser) return;
      Promise.all([
        api.getConnections(currentUser.id),
        api.getBlockedUsers(currentUser.id).catch(() => [] as any[]),
        api.getAllUsers().catch(() => [] as UserProfile[]),
      ]).then(([freshConns, blockedUsers, allUsers]) => {
        if (allUsers && allUsers.length > 0) {
          const pMap = new Map<string, UserProfile>();
          allUsers.forEach((u: UserProfile) => pMap.set(u.id, u));
          setUserProfilesMap(pMap);
        }
        const blockedSet = new Set(blockedUsers.map((b: any) => b.id));
        const validConns = freshConns.filter(c => {
          const peerId = c.mentorId === currentUser.id ? c.studentId : c.mentorId;
          return peerId && !blockedSet.has(peerId);
        });

        setConnections((prevConns) => {
          return validConns.map((fresh) => {
            const prev = prevConns.find(
              (p) => p.id === fresh.id || (p.requestId && fresh.requestId && p.requestId === fresh.requestId)
            );
            if (!prev) return fresh;
            const meetingMap = new Map<string, MentorshipMeeting>();
            (fresh.meetings || []).forEach((m) => meetingMap.set(m.id, m));
            (prev.meetings || []).forEach((m) => {
              if (!meetingMap.has(m.id)) {
                meetingMap.set(m.id, m);
              }
            });
            return {
              ...fresh,
              meetings: Array.from(meetingMap.values()),
              nextMeetingDate: fresh.nextMeetingDate || prev.nextMeetingDate,
            };
          });
        });

        setSelectedConnection((prev) => {
          if (!prev) return validConns[0] || null;
          const fresh = validConns.find(
            (c) => c.id === prev.id || (c.requestId && prev.requestId && c.requestId === prev.requestId)
          );
          if (fresh) {
            const meetingMap = new Map<string, MentorshipMeeting>();
            (fresh.meetings || []).forEach((m) => meetingMap.set(m.id, m));
            (prev.meetings || []).forEach((m) => {
              if (!meetingMap.has(m.id)) {
                meetingMap.set(m.id, m);
              }
            });
            return {
              ...fresh,
              meetings: Array.from(meetingMap.values()),
              nextMeetingDate: fresh.nextMeetingDate || prev.nextMeetingDate,
            };
          }
          return validConns[0] || null;
        });
      }).catch(() => {});
    }, 3500);

    return () => clearInterval(interval);
  }, [currentUser, refreshTrigger]);

  // Load and subscribe to messages when selectedConnection changes
  useEffect(() => {
    if (!selectedConnection) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    api.getMessages(selectedConnection.id).then((msgs) => {
      if (isMounted) {
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });

    const unsubscribe = api.subscribeToMessages(
      selectedConnection.id, 
      (incoming) => {
        if (isMounted) {
          setMessages((prev) => {
            if (prev.some(m => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      },
      (deletedId) => {
        if (isMounted && deletedId) {
          setMessages((prev) => prev.filter(m => m.id !== deletedId));
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedConnection?.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConnection || !newMessage.trim() || isSendingMessage) return;

    const content = newMessage.trim();
    const replyMeta = replyingTo ? {
      replyToId: replyingTo.id,
      replyToContent: replyingTo.content,
      replyToSenderName: replyingTo.senderName || 'Member',
    } : {};

    setNewMessage('');
    setReplyingTo(null);
    setIsSendingMessage(true);

    try {
      const sent = await api.sendMessage({
        connectionId: selectedConnection.id,
        content,
        messageType: 'text',
        ...replyMeta,
      });
      setMessages((prev) => {
        if (prev.some(m => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      showToast('error', 'Message Failed', err.message || 'Could not send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      await api.deleteMessage(msgId);
      showToast('info', 'Message Deleted', 'The message was deleted for everyone.');
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message || 'Could not delete message');
    }
  };

  const handleCopyMessage = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.content || '');
    setCopiedMessageId(msg.id);
    showToast('success', 'Copied', 'Message text copied to clipboard.');
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  const recordingSecondsRef = useRef<number>(0);

  const getSupportedAudioMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav'
    ];
    for (const type of candidateTypes) {
      try {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      } catch {
        // continue checking
      }
    }
    return '';
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia && !(navigator as any).getUserMedia) {
      showToast('error', 'Microphone Not Supported', 'Voice recording is not supported in this browser.');
      return;
    }

    try {
      const getMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) ||
        (navigator as any).getUserMedia?.bind(navigator) ||
        (navigator as any).webkitGetUserMedia?.bind(navigator) ||
        (navigator as any).mozGetUserMedia?.bind(navigator);

      const stream: MediaStream = await getMedia({ audio: true });
      audioChunksRef.current = [];

      const supportedMime = getSupportedAudioMimeType();
      const options = supportedMime ? { mimeType: supportedMime } : undefined;

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedMime = mediaRecorder.mimeType || supportedMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMime });
        stream.getTracks().forEach(track => track.stop());

        const duration = recordingSecondsRef.current > 0 ? recordingSecondsRef.current : 1;

        // Convert Blob to base64 Data URL for persistent playback
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (selectedConnection && base64Audio) {
            try {
              const sent = await api.sendMessage({
                connectionId: selectedConnection.id,
                content: `🎤 Voice note (${duration}s)`,
                messageType: 'voice',
                voiceUrl: base64Audio,
              });
              setMessages((prev) => {
                if (prev.some(m => m.id === sent.id)) return prev;
                return [...prev, sent];
              });
              showToast('success', 'Voice Note Sent', 'Your voice message was delivered.');
            } catch (err: any) {
              showToast('error', 'Send Failed', err.message);
            }
          }
        };
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone recording error:', err);
      const name = err?.name || '';
      const msg = err?.message || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        showToast('error', 'Microphone Permission Needed', 'Microphone access was denied. Please allow microphone access in your browser to record voice notes.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        showToast('error', 'No Microphone Detected', 'No audio input hardware was detected on your device.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        showToast('error', 'Microphone Busy', 'Your microphone is currently in use by another application or tab.');
      } else if (name === 'SecurityError') {
        showToast('error', 'Microphone Restricted', 'Microphone access is restricted by browser security policies.');
      } else {
        showToast('error', 'Recording Error', msg || 'Could not access microphone.');
      }
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const togglePlayAudio = (msgId: string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (playingAudioId === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      try {
        const player = new Audio(audioUrl);
        audioPlayerRef.current = player;
        setPlayingAudioId(msgId);
        player.play().catch((playErr) => {
          console.warn('Audio playback error:', playErr);
          setPlayingAudioId(null);
          showToast('error', 'Playback Error', 'Could not play voice recording.');
        });
        player.onended = () => {
          setPlayingAudioId(null);
        };
        player.onerror = () => {
          setPlayingAudioId(null);
          showToast('error', 'Playback Error', 'Could not play voice recording.');
        };
      } catch (err: any) {
        setPlayingAudioId(null);
        showToast('error', 'Playback Error', err.message || 'Could not play audio.');
      }
    }
  };

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

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection || !meetingTitle.trim() || !meetingDate) {
      showToast('error', 'Incomplete Details', 'Please provide a title and date for the session.');
      return;
    }

    try {
      setIsSchedulingMeeting(true);
      const newMeeting = await api.scheduleMeeting(selectedConnection.id, {
        title: meetingTitle.trim(),
        date: meetingDate,
        time: meetingTime.trim() || '10:00 AM PST',
        meetingUrl: meetingUrl.trim() || 'https://meet.google.com/new',
        notes: meetingAgenda.trim() || undefined,
        status: 'scheduled',
        createdBy: currentUser?.id,
      });

      // Update local state
      setSelectedConnection(prev => {
        if (!prev) return null;
        const current = prev.meetings || [];
        const updated = [newMeeting, ...current.filter(m => m.id !== newMeeting.id)];
        return { ...prev, meetings: updated, nextMeetingDate: meetingDate };
      });

      setConnections(prev => prev.map(c => {
        if (c.id === selectedConnection.id) {
          const current = c.meetings || [];
          const updated = [newMeeting, ...current.filter(m => m.id !== newMeeting.id)];
          return { ...c, meetings: updated, nextMeetingDate: meetingDate };
        }
        return c;
      }));

      // Send notification to counterpart
      const peerId = selectedConnection.mentorId === currentUser?.id ? selectedConnection.studentId : selectedConnection.mentorId;
      if (peerId) {
        await api.createNotification({
          userId: peerId,
          title: '1:1 Session Scheduled! 📅',
          message: `${currentUser?.name || 'Your partner'} scheduled "${newMeeting.title}" for ${newMeeting.date} at ${newMeeting.time}.`,
          type: 'system',
          linkTab: 'connections',
        }).catch(() => {});
      }

      setMeetingTitle('');
      setMeetingDate('');
      setMeetingAgenda('');
      showToast('success', '1:1 Session Scheduled! 📅', `Session "${newMeeting.title}" set for ${newMeeting.date} at ${newMeeting.time}.`);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to schedule meeting', err.message);
    } finally {
      setIsSchedulingMeeting(false);
    }
  };

  const handleToggleMeetingStatus = async (meetingId: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    if (!selectedConnection || !selectedConnection.meetings) return;

    try {
      const updatedMtg = await api.updateMeeting(selectedConnection.id, meetingId, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      setSelectedConnection(prev => {
        if (!prev) return null;
        return {
          ...prev,
          meetings: (prev.meetings || []).map(m => m.id === meetingId ? (updatedMtg || { ...m, status: newStatus }) : m)
        };
      });

      showToast('success', 'Session Updated', `Meeting status set to ${newStatus}.`);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
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
            {isMentor ? 'Active Mentees & 1:1 Workspace' : 'Mentorship Workspace'}
          </h1>
          <p className="text-xs text-[#9E9A90] max-w-xl">
            Collaborate through live messaging and voice notes, track session takeaways, and maintain consistent goal velocity.
          </p>
        </div>
      </div>

      {!currentUser ? (
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#181B28] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#F5F2EB]">Sign In to View Workspaces</h3>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            Please sign in or create an account to access active mentorship relationships, 1:1 messaging, and session tools.
          </p>
          <button
            onClick={() => openAuthModal('signin')}
            className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center space-x-2 shadow-lg shadow-[#D4AF37]/15"
          >
            <span>Sign In / Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : isLoading ? (
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
              const {
                peerName,
                peerAvatar,
                isPeerMentor,
                peerRoleLabel,
                peerTitle,
              } = getPeerDetails(conn);
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
                      src={peerAvatar} 
                      alt={peerName} 
                      className="w-10 h-10 rounded-xl object-cover border border-[#343A52]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#F5F2EB] truncate">{peerName}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold shrink-0 ${
                          isPeerMentor 
                            ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30' 
                            : 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                        }`}>
                          {peerRoleLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9E9A90] truncate">{peerTitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#7A766E] font-mono pt-2 border-t border-[#232738]">
                    <span>Connected since {new Date(conn.startDate || conn.connectedAt || new Date()).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                    <span className="text-[#10B981] font-semibold">Active</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Workspace */}
          {selectedConnection && (
            <div className="md:col-span-2 bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl flex flex-col justify-between">
              
              {/* Partner Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232738] pb-5">
                {(() => {
                  const {
                    peerName,
                    peerAvatar,
                    isPeerMentor,
                    peerRoleLabel,
                    peerTitle,
                  } = getPeerDetails(selectedConnection);

                  return (
                    <div 
                      onClick={handleViewPeerProfile}
                      className="flex items-center space-x-3.5 cursor-pointer group"
                    >
                      <img 
                        src={peerAvatar} 
                        alt={peerName} 
                        className="w-12 h-12 rounded-xl object-cover border border-[#343A52] group-hover:border-[#D4AF37] transition-colors"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold">
                            {isPeerMentor ? 'Mentor Workspace' : 'Mentee Workspace'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-semibold shrink-0 ${
                            isPeerMentor
                              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30' 
                              : 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                          }`}>
                            {peerRoleLabel}
                          </span>
                        </div>
                        <h3 className="text-lg font-serif font-bold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors flex items-center space-x-2">
                          <span>{peerName}</span>
                          <User className="w-3.5 h-3.5 text-[#7A766E] group-hover:text-[#D4AF37]" />
                        </h3>
                        <p className="text-xs text-[#9E9A90]">
                          {peerTitle}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-Tab Switcher */}
                <div className="flex items-center space-x-1 bg-[#181B28] p-1 rounded-xl border border-[#262A3C] flex-wrap gap-y-1">
                  <button
                    onClick={() => setWorkspaceTab('chat')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      workspaceTab === 'chat'
                        ? 'bg-[#D4AF37] text-[#090A0F]'
                        : 'text-[#9E9A90] hover:text-[#F5F2EB]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat & Voice</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('meetings')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      workspaceTab === 'meetings'
                        ? 'bg-[#D4AF37] text-[#090A0F]'
                        : 'text-[#9E9A90] hover:text-[#F5F2EB]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Meetings & Syncs</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('notes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      workspaceTab === 'notes'
                        ? 'bg-[#D4AF37] text-[#090A0F]'
                        : 'text-[#9E9A90] hover:text-[#F5F2EB]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Session Notes</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('roadmap')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      workspaceTab === 'roadmap'
                        ? 'bg-[#D4AF37] text-[#090A0F]'
                        : 'text-[#9E9A90] hover:text-[#F5F2EB]'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Roadmap</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: 1:1 MESSAGING & VOICE NOTES */}
              {workspaceTab === 'chat' && (
                <div className="space-y-3 flex flex-col h-[480px]">
                  {/* Channel Header Bar with Delete Chat Action */}
                  <div className="flex items-center justify-between px-3.5 py-2 bg-[#161925] border border-[#262A3C] rounded-xl text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="font-semibold text-[#F5F2EB]">Direct Messaging & Voice Channel</span>
                    </div>
                    {messages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteChatModal(true)}
                        className="text-[11px] text-[#9E9A90] hover:text-[#EF4444] flex items-center space-x-1.5 transition-colors cursor-pointer"
                        title="Delete entire chat history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Chat</span>
                      </button>
                    )}
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 p-3.5 bg-[#0D0F18] border border-[#262A3C] rounded-xl">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <MessageSquare className="w-8 h-8 text-[#5A564E]" />
                        <p className="text-xs text-[#7A766E]">No messages yet. Send a greeting or voice note to begin.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === currentUser?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-end space-x-2 max-w-[85%]">
                              {!isMe && (
                                <img
                                  src={msg.senderAvatar || getPeerDetails(selectedConnection).peerAvatar}
                                  alt={msg.senderName || getPeerDetails(selectedConnection).peerName}
                                  className="w-6 h-6 rounded-full object-cover border border-[#2D3349] mb-1 flex-shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div
                                className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                  isMe
                                    ? 'bg-[#D4AF37] text-[#090A0F] rounded-br-none'
                                    : 'bg-[#181B28] text-[#F5F2EB] border border-[#262A3C] rounded-bl-none'
                                }`}
                              >
                                {/* Quoted Reply Preview */}
                                {msg.replyToContent && (
                                  <div className={`mb-2 px-2.5 py-1.5 rounded-lg text-[10px] border-l-2 ${
                                    isMe 
                                      ? 'border-[#090A0F]/70 bg-[#090A0F]/10 text-[#090A0F]' 
                                      : 'border-[#D4AF37] bg-[#0D0F18] text-[#C4C0B5]'
                                  }`}>
                                    <span className="font-semibold block truncate">Replying to {msg.replyToSenderName || 'Member'}:</span>
                                    <p className="truncate italic">"{msg.replyToContent}"</p>
                                  </div>
                                )}

                                {msg.messageType === 'voice' && msg.voiceUrl ? (
                                  <div className="flex items-center space-x-3">
                                    <button
                                      type="button"
                                      onClick={() => togglePlayAudio(msg.id, msg.voiceUrl)}
                                      className={`p-2 rounded-full cursor-pointer transition-all ${
                                        isMe ? 'bg-[#090A0F] text-[#D4AF37]' : 'bg-[#D4AF37] text-[#090A0F]'
                                      }`}
                                    >
                                      {playingAudioId === msg.id ? (
                                        <Pause className="w-4 h-4" />
                                      ) : (
                                        <Play className="w-4 h-4" />
                                      )}
                                    </button>
                                    <div>
                                      <p className="font-semibold text-[11px]">{msg.content || 'Voice Note'}</p>
                                      <span className="text-[9px] opacity-75 font-mono">Audio recording</span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                )}
                              </div>
                            </div>

                            {/* Message metadata & quick actions */}
                            <div className={`flex items-center space-x-2 mt-1 px-1 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[9px] text-[#6A665D] font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>

                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(msg)}
                                  title="Reply to message"
                                  className="p-1 rounded hover:bg-[#1C2030] text-[#7A766E] hover:text-[#D4AF37] transition-colors cursor-pointer flex items-center space-x-0.5"
                                >
                                  <Reply className="w-3 h-3" />
                                  <span className="text-[9px]">Reply</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg)}
                                  title="Copy text"
                                  className="p-1 rounded hover:bg-[#1C2030] text-[#7A766E] hover:text-[#F5F2EB] transition-colors cursor-pointer flex items-center space-x-0.5"
                                >
                                  {copiedMessageId === msg.id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                                  <span className="text-[9px]">Copy</span>
                                </button>
                                {isMe && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    title="Unsend / Delete for everyone"
                                    className="p-1 rounded hover:bg-[#1C2030] text-[#7A766E] hover:text-red-400 transition-colors cursor-pointer flex items-center space-x-0.5"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span className="text-[9px]">Unsend</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input controls (Text + Voice Recording) */}
                  <div className="space-y-2">
                    {/* Quoted Replying Banner */}
                    {replyingTo && (
                      <div className="flex items-center justify-between px-3.5 py-2 bg-[#181B28] border border-[#2D3349] rounded-xl text-xs">
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <CornerDownRight className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                          <span className="text-[#9E9A90] shrink-0">Replying to <strong className="text-[#F5F2EB]">{replyingTo.senderName || 'Member'}</strong>:</span>
                          <span className="text-[#C4C0B5] truncate italic">"{replyingTo.content}"</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="text-[#7A766E] hover:text-[#F5F2EB] p-1 cursor-pointer shrink-0"
                          title="Cancel reply"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="space-y-2">
                      {isRecording ? (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#2C1818] border border-[#E11D48]/40 animate-pulse">
                          <div className="flex items-center space-x-2 text-xs text-[#FB7185] font-mono">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-ping" />
                            <span>Recording audio... {recordingSeconds}s</span>
                          </div>
                          <button
                            type="button"
                            onClick={stopVoiceRecording}
                            className="px-3 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop & Send</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={startVoiceRecording}
                            title="Record voice note"
                            className="p-2.5 bg-[#181B28] hover:bg-[#262A3C] text-[#D4AF37] border border-[#2D3349] rounded-xl transition-all cursor-pointer"
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            placeholder={replyingTo ? `Reply to ${replyingTo.senderName || 'Member'}...` : "Type a message or discuss milestone progress..."}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                          />
                          <button
                            type="submit"
                            disabled={!newMessage.trim() || isSendingMessage}
                            className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: MEETINGS & 1:1 SYNCS */}
              {workspaceTab === 'meetings' && (
                <div className="space-y-6">
                  {/* Schedule New Meeting Form */}
                  <form onSubmit={handleScheduleMeeting} className="p-4 rounded-xl bg-[#141622] border border-[#262A3C] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#262A3C] pb-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Schedule 1:1 Mentorship Session</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#7A766E] mb-1">Session Topic / Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. System Design Mock Interview"
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                          className="w-full bg-[#0D0F18] border border-[#2D3349] rounded-lg px-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#7A766E] mb-1">Date *</label>
                          <input
                            type="date"
                            required
                            value={meetingDate}
                            onChange={(e) => setMeetingDate(e.target.value)}
                            className="w-full bg-[#0D0F18] border border-[#2D3349] rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#7A766E] mb-1">Time</label>
                          <input
                            type="text"
                            placeholder="10:00 AM PST"
                            value={meetingTime}
                            onChange={(e) => setMeetingTime(e.target.value)}
                            className="w-full bg-[#0D0F18] border border-[#2D3349] rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#7A766E] mb-1">Video Meeting Link (Google Meet / Zoom)</label>
                        <input
                          type="url"
                          placeholder="https://meet.google.com/xyz-abcd-efg"
                          value={meetingUrl}
                          onChange={(e) => setMeetingUrl(e.target.value)}
                          className="w-full bg-[#0D0F18] border border-[#2D3349] rounded-lg px-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#7A766E] mb-1">Agenda & Prep Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Review milestone 2 pull request & discuss API caching"
                          value={meetingAgenda}
                          onChange={(e) => setMeetingAgenda(e.target.value)}
                          className="w-full bg-[#0D0F18] border border-[#2D3349] rounded-lg px-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSchedulingMeeting || !meetingTitle.trim() || !meetingDate}
                        className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isSchedulingMeeting ? 'Scheduling...' : 'Schedule Session'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Scheduled Meetings List */}
                  <div className="space-y-4">
                    {(() => {
                      const allMeetings = selectedConnection.meetings || [];
                      const upcoming = allMeetings.filter(m => m.status === 'scheduled');
                      const past = allMeetings.filter(m => m.status !== 'scheduled');

                      const meetingsToRender = 
                        sessionFilter === 'upcoming' 
                          ? upcoming 
                          : sessionFilter === 'past' 
                          ? past 
                          : allMeetings;

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#232738] pb-3">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A766E] font-bold">
                              Session Management & History ({allMeetings.length})
                            </span>
                            <div className="flex items-center space-x-1 text-xs">
                              <button
                                type="button"
                                onClick={() => setSessionFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                  sessionFilter === 'all'
                                    ? 'bg-[#D4AF37] text-[#090A0F]'
                                    : 'bg-[#181B28] text-[#9E9A90] hover:text-[#F5F2EB] border border-[#2D3349]'
                                }`}
                              >
                                All ({allMeetings.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setSessionFilter('upcoming')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1 ${
                                  sessionFilter === 'upcoming'
                                    ? 'bg-[#10B981] text-white'
                                    : 'bg-[#181B28] text-[#34D399] hover:bg-[#1C2230] border border-[#10B981]/30'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                <span>Upcoming ({upcoming.length})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSessionFilter('past')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                  sessionFilter === 'past'
                                    ? 'bg-[#38BDF8] text-[#090A0F]'
                                    : 'bg-[#181B28] text-[#9E9A90] hover:text-[#F5F2EB] border border-[#2D3349]'
                                }`}
                              >
                                Past Archive ({past.length})
                              </button>
                            </div>
                          </div>

                          {allMeetings.length > 0 ? (
                            <div className="space-y-6">
                              {/* If viewing All: Render Upcoming and Past partitioned cleanly */}
                              {sessionFilter === 'all' && (
                                <>
                                  {upcoming.length > 0 && (
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-2 text-xs font-serif font-bold text-[#F5F2EB]">
                                        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                                        <span>Upcoming Scheduled Sessions ({upcoming.length})</span>
                                      </div>
                                      <div className="space-y-3">
                                        {upcoming.map((mtg) => (
                                          <MeetingCard
                                            key={mtg.id}
                                            meeting={mtg}
                                            connection={selectedConnection}
                                            onUpdateMeeting={(updatedMtg) => {
                                              setSelectedConnection(prev => {
                                                if (!prev) return null;
                                                const updated = (prev.meetings || []).map(m => m.id === updatedMtg.id ? updatedMtg : m);
                                                return { ...prev, meetings: updated };
                                              });
                                              setConnections(prev => prev.map(c => {
                                                if (c.id === selectedConnection.id) {
                                                  const updated = (c.meetings || []).map(m => m.id === updatedMtg.id ? updatedMtg : m);
                                                  return { ...c, meetings: updated };
                                                }
                                                return c;
                                              }));
                                            }}
                                            onDeleteMeeting={(deletedId) => {
                                              setSelectedConnection(prev => {
                                                if (!prev) return null;
                                                const updated = (prev.meetings || []).filter(m => m.id !== deletedId);
                                                return { ...prev, meetings: updated };
                                              });
                                              setConnections(prev => prev.map(c => {
                                                if (c.id === selectedConnection.id) {
                                                  const updated = (c.meetings || []).filter(m => m.id !== deletedId);
                                                  return { ...c, meetings: updated };
                                                }
                                                return c;
                                              }));
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {past.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                      <div className="flex items-center space-x-2 text-xs font-serif font-bold text-[#9E9A90] border-t border-[#232738] pt-4">
                                        <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                                        <span>Past Sessions & History Archive ({past.length})</span>
                                      </div>
                                      <div className="space-y-3">
                                        {past.map((mtg) => (
                                          <MeetingCard
                                            key={mtg.id}
                                            meeting={mtg}
                                            connection={selectedConnection}
                                            onUpdateMeeting={(updatedMtg) => {
                                              setSelectedConnection(prev => {
                                                if (!prev) return null;
                                                const updated = (prev.meetings || []).map(m => m.id === updatedMtg.id ? updatedMtg : m);
                                                return { ...prev, meetings: updated };
                                              });
                                              setConnections(prev => prev.map(c => {
                                                if (c.id === selectedConnection.id) {
                                                  const updated = (c.meetings || []).map(m => m.id === updatedMtg.id ? updatedMtg : m);
                                                  return { ...c, meetings: updated };
                                                }
                                                return c;
                                              }));
                                            }}
                                            onDeleteMeeting={(deletedId) => {
                                              setSelectedConnection(prev => {
                                                if (!prev) return null;
                                                const updated = (prev.meetings || []).filter(m => m.id !== deletedId);
                                                return { ...prev, meetings: updated };
                                              });
                                              setConnections(prev => prev.map(c => {
                                                if (c.id === selectedConnection.id) {
                                                  const updated = (c.meetings || []).filter(m => m.id !== deletedId);
                                                  return { ...c, meetings: updated };
                                                }
                                                return c;
                                              }));
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* If viewing a single filtered subset */}
                              {sessionFilter !== 'all' && (
                                <div className="space-y-3">
                                  {meetingsToRender.length > 0 ? (
                                    meetingsToRender.map((mtg) => (
                                      <MeetingCard
                                        key={mtg.id}
                                        meeting={mtg}
                                        connection={selectedConnection}
                                        onUpdateMeeting={(updatedMtg) => {
                                          setSelectedConnection(prev => {
                                            if (!prev) return null;
                                            const updated = (prev.meetings || []).map(m => m.id === updatedMtg.id ? updatedMtg : m);
                                            return { ...prev, meetings: updated };
                                          });
                                          setConnections(prev => prev.map(c => {
                                            if (c.id === selectedConnection.id) {
                                              const updated = (c.meetings || []).map(m => m.id === updatedMtg.id ? updatedMtg : m);
                                              return { ...c, meetings: updated };
                                            }
                                            return c;
                                          }));
                                        }}
                                        onDeleteMeeting={(deletedId) => {
                                          setSelectedConnection(prev => {
                                            if (!prev) return null;
                                            const updated = (prev.meetings || []).filter(m => m.id !== deletedId);
                                            return { ...prev, meetings: updated };
                                          });
                                          setConnections(prev => prev.map(c => {
                                            if (c.id === selectedConnection.id) {
                                              const updated = (c.meetings || []).filter(m => m.id !== deletedId);
                                              return { ...c, meetings: updated };
                                            }
                                            return c;
                                          }));
                                        }}
                                      />
                                    ))
                                  ) : (
                                    <div className="p-6 text-center bg-[#141622] border border-[#262A3C] rounded-xl">
                                      <Calendar className="w-8 h-8 text-[#5A564E] mx-auto mb-2" />
                                      <p className="text-xs text-[#7A766E] italic">
                                        {sessionFilter === 'upcoming'
                                          ? 'No upcoming sessions scheduled right now. Use the schedule form above to set one up.'
                                          : 'No completed or past sessions in archive yet.'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-6 text-center bg-[#141622] border border-[#262A3C] rounded-xl">
                              <Calendar className="w-8 h-8 text-[#5A564E] mx-auto mb-2" />
                              <p className="text-xs text-[#7A766E] italic">No sync sessions scheduled yet. Use the form above to plan your next 1:1 meeting.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 2: SESSION NOTES & NEXT ACTIONS */}
              {workspaceTab === 'notes' && (
                <div className="space-y-5">
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
              )}

              {/* TAB 3: LINKED ROADMAPS & MILESTONES */}
              {workspaceTab === 'roadmap' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                      Active Development Goals
                    </span>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className="text-xs text-[#9E9A90] hover:text-[#F5F2EB] flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Manage All Goals</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {goals.filter(g => g.userId === selectedConnection.studentId).map((g) => (
                      <div key={g.id} className="p-4 rounded-xl bg-[#141622] border border-[#262A3C] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#F5F2EB]">{g.title}</span>
                          <span className="font-mono text-[#D4AF37]">{g.progress}%</span>
                        </div>
                        {g.description && (
                          <p className="text-xs text-[#9E9A90] line-clamp-2">{g.description}</p>
                        )}
                        <div className="w-full bg-[#181B28] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#D4AF37] h-full rounded-full" style={{ width: `${g.progress}%` }} />
                        </div>
                      </div>
                    ))}
                    {goals.filter(g => g.userId === selectedConnection.studentId).length === 0 && (
                      <div className="p-6 text-center bg-[#141622] border border-[#262A3C] rounded-xl">
                        <p className="text-xs text-[#7A766E] italic">No roadmaps created for this member yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

      {/* CONFIRMATION MODAL: DELETE CHAT HISTORY */}
      {showDeleteChatModal && selectedConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/80 backdrop-blur-sm p-4">
          <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[#F5F2EB]">
            <div className="flex items-center space-x-3 text-[#EF4444]">
              <div className="p-2.5 rounded-xl bg-[#181B28] border border-[#EF4444]/40">
                <Trash2 className="w-6 h-6 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Delete Entire Chat?</h3>
                <p className="text-xs text-[#EF4444]">Clear all conversation history</p>
              </div>
            </div>

            <p className="text-xs text-[#9E9A90] leading-relaxed">
              Are you sure you want to permanently clear all messages and voice notes in this 1:1 workspace? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteChatModal(false)}
                disabled={isClearingChat}
                className="px-4 py-2 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider border border-[#343A52] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChatHistory}
                disabled={isClearingChat}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingChat ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

