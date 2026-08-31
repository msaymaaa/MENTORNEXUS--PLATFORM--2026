import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserMinus, 
  ShieldAlert, 
  MessageSquare, 
  ExternalLink, 
  Calendar, 
  Sparkles, 
  Briefcase, 
  GraduationCap, 
  Shield, 
  Clock, 
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Compass,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MentorshipConnection, UserProfile, UserRole } from '../types/index';

interface NetworkMember {
  id: string; // Peer user ID
  connectionId: string; // Connection record ID
  name: string;
  avatar: string;
  role: UserRole;
  title: string;
  organization: string;
  location: string;
  yearsOfExperience: number;
  skills: string[];
  connectedAt: string;
  lastActivity?: string;
  profile: UserProfile;
}

export const NetworkView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh, refreshTrigger, setActiveTab, openMentorModal, openAuthModal } = useApp();

  const [networkMembers, setNetworkMembers] = useState<NetworkMember[]>([]);
  const [blockedList, setBlockedList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'mentor' | 'student' | 'early_career' | 'blocked'>('all');

  // Confirmation Modals
  const [memberToRemove, setMemberToRemove] = useState<NetworkMember | null>(null);
  const [memberToBlock, setMemberToBlock] = useState<NetworkMember | null>(null);
  const [memberToUnblock, setMemberToUnblock] = useState<UserProfile | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const loadNetwork = async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const [connections, allProfiles, directNetwork, blockedUsers] = await Promise.all([
        api.getConnections(currentUser.id),
        api.getAllUsers(),
        api.getNetwork(currentUser.id).catch(() => [] as UserProfile[]),
        api.getBlockedUsers(currentUser.id).catch(() => [] as UserProfile[]),
      ]);

      setBlockedList(blockedUsers || []);
      const blockedSet = new Set((blockedUsers || []).map(b => b.id));

      const profileMap = new Map<string, UserProfile>();
      allProfiles.forEach(p => profileMap.set(p.id, p));

      const members: NetworkMember[] = [];
      const seenPeerIds = new Set<string>();

      // 1. Process active mentorship connections
      for (const conn of connections) {
        if (conn.status !== 'active') continue;
        const isCurrentUserMentor = conn.mentorId === currentUser.id;
        const peerId = isCurrentUserMentor ? conn.studentId : conn.mentorId;
        if (!peerId || peerId === currentUser.id || seenPeerIds.has(peerId) || blockedSet.has(peerId)) continue;
        seenPeerIds.add(peerId);

        let peerProfile = profileMap.get(peerId);

        // Accurately determine role
        const isPeerMentor = conn.mentorId === peerId || 
          peerProfile?.role === 'mentor' || 
          (peerProfile as any)?.is_mentor === true || 
          (peerProfile?.mentoringAreas && peerProfile.mentoringAreas.length > 0) ||
          (peerProfile?.title && /mentor|lead|principal|architect|director|staff|manager/i.test(peerProfile.title));

        const peerRole: UserRole = isPeerMentor
          ? 'mentor'
          : (peerProfile?.role === 'early_career' ? 'early_career' : 'student');

        if (!peerProfile) {
          peerProfile = {
            id: peerId,
            email: '',
            name: isCurrentUserMentor ? (conn.studentName || 'Learner') : (conn.mentorName || 'Mentor'),
            avatar: (isCurrentUserMentor ? conn.studentAvatar : conn.mentorAvatar) || (
              isPeerMentor
                ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
            ),
            role: peerRole,
            title: isCurrentUserMentor ? (conn.studentTitle || 'Aspiring Professional') : (conn.mentorTitle || 'Industry Mentor'),
            organization: 'Independent',
            bio: '',
            industry: 'Technology',
            location: 'Remote',
            yearsOfExperience: isPeerMentor ? 5 : 1,
            skills: conn.focusAreas || ['Career Growth'],
            interests: [],
            mentoringAreas: conn.focusAreas || [],
            verificationStatus: 'verified',
            createdAt: conn.connectedAt || conn.startDate || new Date().toISOString(),
          };
        } else {
          peerProfile = {
            ...peerProfile,
            role: peerRole,
          };
        }

        members.push({
          id: peerId,
          connectionId: conn.id,
          name: peerProfile.name,
          avatar: peerProfile.avatar,
          role: peerRole,
          title: peerProfile.title,
          organization: peerProfile.organization,
          location: peerProfile.location || 'Remote',
          yearsOfExperience: peerProfile.yearsOfExperience || (isPeerMentor ? 5 : 1),
          skills: peerProfile.skills || [],
          connectedAt: conn.connectedAt || conn.startDate || new Date().toISOString(),
          lastActivity: conn.lastInteractionAt || conn.lastMeetingDate,
          profile: peerProfile,
        });
      }

      // 2. Process direct networking connections
      for (const rawProfile of directNetwork) {
        if (!rawProfile.id || rawProfile.id === currentUser.id || seenPeerIds.has(rawProfile.id) || blockedSet.has(rawProfile.id)) continue;
        seenPeerIds.add(rawProfile.id);

        const isPeerMentor = rawProfile.role === 'mentor' || 
          (rawProfile as any)?.is_mentor === true || 
          (rawProfile.mentoringAreas && rawProfile.mentoringAreas.length > 0) ||
          (rawProfile.title && /mentor|lead|principal|architect|director|staff|manager/i.test(rawProfile.title));

        const peerRole: UserRole = isPeerMentor
          ? 'mentor'
          : (rawProfile.role === 'early_career' ? 'early_career' : 'student');

        const peerProfile: UserProfile = {
          ...rawProfile,
          role: peerRole,
        };

        members.push({
          id: peerProfile.id,
          connectionId: `net_${peerProfile.id}`,
          name: peerProfile.name,
          avatar: peerProfile.avatar,
          role: peerRole,
          title: peerProfile.title,
          organization: peerProfile.organization,
          location: peerProfile.location || 'Remote',
          yearsOfExperience: peerProfile.yearsOfExperience || (isPeerMentor ? 5 : 1),
          skills: peerProfile.skills || [],
          connectedAt: peerProfile.createdAt || new Date().toISOString(),
          profile: peerProfile,
        });
      }

      setNetworkMembers(members);
    } catch (err) {
      console.error('Error fetching network:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork();
  }, [currentUser, refreshTrigger]);

  const handleRemoveConnection = async () => {
    if (!memberToRemove || !currentUser) return;
    try {
      setIsProcessingAction(true);
      
      // Delete connection via API (both directions & request records)
      await api.deleteConnection(memberToRemove.connectionId, memberToRemove.id, currentUser.id);
      
      // Update UI state immediately
      setNetworkMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
      showToast('info', 'Connection Removed', `Removed ${memberToRemove.name} from your professional network.`);
      setMemberToRemove(null);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Removal Failed', err.message || 'Could not remove connection');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleBlockUser = async () => {
    if (!memberToBlock || !currentUser) return;
    try {
      setIsProcessingAction(true);
      
      // Block user & wipe relationships/messages bidirectionally
      await api.blockUser(memberToBlock.id, currentUser.id);
      
      // Update UI state immediately
      setNetworkMembers(prev => prev.filter(m => m.id !== memberToBlock.id));
      setBlockedList(prev => [...prev.filter(b => b.id !== memberToBlock.id), memberToBlock.profile]);
      if (currentUser.blockedUserIds && !currentUser.blockedUserIds.includes(memberToBlock.id)) {
        currentUser.blockedUserIds.push(memberToBlock.id);
      }
      showToast('info', 'User Blocked', `${memberToBlock.name} has been blocked and removed from your network.`);
      setMemberToBlock(null);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Block Action Failed', err.message || 'Could not block user');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!memberToUnblock || !currentUser) return;
    try {
      setIsProcessingAction(true);
      await api.unblockUser(memberToUnblock.id, currentUser.id);
      setBlockedList(prev => prev.filter(b => b.id !== memberToUnblock.id));
      if (currentUser.blockedUserIds) {
        currentUser.blockedUserIds = currentUser.blockedUserIds.filter(id => id !== memberToUnblock.id);
      }
      showToast('success', 'User Unblocked', `${memberToUnblock.name} has been unblocked.`);
      setMemberToUnblock(null);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Unblock Failed', err.message || 'Could not unblock user');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenProfile = (profile: UserProfile) => {
    openMentorModal(profile);
  };

  const handleOpenWorkspace = () => {
    setActiveTab('connections');
  };

  const filteredMembers = networkMembers.filter((m) => {
    if (roleFilter !== 'all') {
      if (roleFilter === 'mentor' && m.role !== 'mentor') return false;
      if (roleFilter === 'student' && m.role !== 'student' && m.role !== ('learner' as any)) return false;
      if (roleFilter === 'early_career' && m.role !== 'early_career') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchOrg = m.organization.toLowerCase().includes(q);
      const matchSkill = m.skills.some(s => s.toLowerCase().includes(q));
      return matchName || matchTitle || matchOrg || matchSkill;
    }
    return true;
  });

  const filteredBlocked = blockedList.filter((b) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (b.name || '').toLowerCase().includes(q);
      const matchTitle = (b.title || '').toLowerCase().includes(q);
      const matchOrg = (b.organization || '').toLowerCase().includes(q);
      const matchSkill = (b.skills || []).some(s => s.toLowerCase().includes(q));
      return matchName || matchTitle || matchOrg || matchSkill;
    }
    return true;
  });

  const mentorCount = networkMembers.filter(m => m.role === 'mentor').length;
  const learnerCount = networkMembers.filter(m => m.role === 'student' || (m.role as any) === 'learner').length;
  const earlyCareerCount = networkMembers.filter(m => m.role === 'early_career').length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'mentor':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
            <Shield className="w-3 h-3 mr-1" />
            Mentor
          </span>
        );
      case 'early_career':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <Briefcase className="w-3 h-3 mr-1" />
            Early Career
          </span>
        );
      case 'student':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <GraduationCap className="w-3 h-3 mr-1" />
            Learner
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Header & Stats Overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[#181B28] border border-[#343A52] text-[11px] font-mono uppercase tracking-widest text-[#D4AF37]">
            <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Professional Network Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#F5F2EB]">
            My Network & Connections.
          </h1>
          <p className="text-sm text-[#9E9A90] max-w-2xl">
            Manage your verified 1:1 mentorship relationships and professional network. View full profiles, launch collaborative workspaces, or adjust connection statuses.
          </p>
        </div>

        {/* Quick Explore Action */}
        <button
          onClick={() => setActiveTab('discover')}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E6C258] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:scale-102 cursor-pointer shrink-0"
        >
          <Compass className="w-4 h-4" />
          <span>Discover Members</span>
        </button>
      </div>

      {/* Network Stats Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#12141F] border border-[#262A3C] space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#7A766E] font-bold">Total Connections</span>
          <p className="text-2xl font-serif font-bold text-[#D4AF37]">{networkMembers.length}</p>
          <span className="text-[11px] text-[#9E9A90]">Active Relationships</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12141F] border border-[#262A3C] space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#7A766E] font-bold">Mentors & Guides</span>
          <p className="text-2xl font-serif font-bold text-[#F5F2EB]">{mentorCount}</p>
          <span className="text-[11px] text-[#9E9A90]">Industry Practitioners</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12141F] border border-[#262A3C] space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#7A766E] font-bold">Learners & Mentees</span>
          <p className="text-2xl font-serif font-bold text-[#F5F2EB]">{learnerCount}</p>
          <span className="text-[11px] text-[#9E9A90]">Active Collaborators</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12141F] border border-[#262A3C] space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#7A766E] font-bold">Early Career</span>
          <p className="text-2xl font-serif font-bold text-[#F5F2EB]">{earlyCareerCount}</p>
          <span className="text-[11px] text-[#9E9A90]">Emerging Professionals</span>
        </div>
      </div>

      {/* Search & Role Filtering Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#12141F] border border-[#262A3C] p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections by name, company, skill..."
            className="w-full bg-[#0D0F18] border border-[#262A3C] focus:border-[#D4AF37] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#F5F2EB] placeholder-[#7A766E] outline-none transition-colors"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex items-center space-x-1.5 bg-[#0D0F18] p-1 rounded-lg border border-[#262A3C] w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-[#D4AF37] text-[#090A0F]'
                : 'text-[#9E9A90] hover:text-[#F5F2EB]'
            }`}
          >
            All ({networkMembers.length})
          </button>
          <button
            onClick={() => setRoleFilter('mentor')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              roleFilter === 'mentor'
                ? 'bg-[#D4AF37] text-[#090A0F]'
                : 'text-[#9E9A90] hover:text-[#F5F2EB]'
            }`}
          >
            Mentors ({mentorCount})
          </button>
          <button
            onClick={() => setRoleFilter('student')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              roleFilter === 'student'
                ? 'bg-[#D4AF37] text-[#090A0F]'
                : 'text-[#9E9A90] hover:text-[#F5F2EB]'
            }`}
          >
            Learners ({learnerCount})
          </button>
          <button
            onClick={() => setRoleFilter('early_career')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              roleFilter === 'early_career'
                ? 'bg-[#D4AF37] text-[#090A0F]'
                : 'text-[#9E9A90] hover:text-[#F5F2EB]'
            }`}
          >
            Early Career ({earlyCareerCount})
          </button>
          <button
            onClick={() => setRoleFilter('blocked')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              roleFilter === 'blocked'
                ? 'bg-red-600/90 text-white shadow-md shadow-red-900/30'
                : 'text-[#9E9A90] hover:text-red-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Blocked ({blockedList.length})</span>
          </button>
        </div>
      </div>

      {/* Network Members Grid or Blocked Grid */}
      {!currentUser ? (
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#181B28] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#F5F2EB]">Sign In to View Your Network</h3>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            Sign in or register an account to manage your professional relationships, direct connections, and collaborative mentorship circles.
          </p>
          <button
            onClick={() => openAuthModal('signin')}
            className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center space-x-2 shadow-lg shadow-[#D4AF37]/15"
          >
            <span>Sign In / Register</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-[#12141F] rounded-2xl border border-[#262A3C] animate-pulse" />
          ))}
        </div>
      ) : roleFilter === 'blocked' ? (
        filteredBlocked.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#12141F] border border-[#262A3C] rounded-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#181B28] border border-[#343A52] flex items-center justify-center mx-auto text-[#7A766E]">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-serif font-bold text-[#F5F2EB]">No blocked users</h3>
              <p className="text-xs text-[#9E9A90] max-w-sm mx-auto">
                {searchQuery.trim()
                  ? `No blocked users matched "${searchQuery}".`
                  : 'You have not blocked any members. Blocked users will appear here and can be unblocked at any time.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlocked.map((user) => (
              <div
                key={user.id}
                className="bg-[#12141F] border border-red-950/40 hover:border-red-900/60 rounded-2xl p-5 sm:p-6 space-y-5 transition-all flex flex-col justify-between shadow-lg relative group"
              >
                <div className="space-y-4">
                  {/* Profile Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3.5">
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={user.name}
                        className="w-13 h-13 rounded-xl object-cover border border-red-900/40 grayscale opacity-80 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <h3 className="text-base font-serif font-bold text-[#F5F2EB] truncate">
                          {user.name}
                        </h3>
                        <p className="text-xs text-[#9E9A90] truncate">{user.title || 'Platform Member'}</p>
                        <p className="text-[11px] text-[#7A766E] truncate">{user.organization || 'Independent'}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-red-950/60 text-red-400 border border-red-800/40 shrink-0">
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      Blocked
                    </span>
                  </div>

                  {/* Meta details */}
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#9E9A90]">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-[#7A766E]" />
                      <span>{user.location || 'Remote'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-[#7A766E]" />
                      <span>{user.yearsOfExperience || 1} yrs exp</span>
                    </div>
                  </div>
                </div>

                {/* Action Button: Unblock */}
                <div className="pt-4 border-t border-[#232738]">
                  <button
                    onClick={() => setMemberToUnblock(user)}
                    className="w-full py-2 px-3 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#10B981] hover:text-[#34D399] text-xs font-semibold tracking-wider uppercase border border-[#2D3349] hover:border-[#10B981]/50 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Unblock User</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#12141F] border border-[#262A3C] rounded-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#181B28] border border-[#343A52] flex items-center justify-center mx-auto text-[#7A766E]">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif font-bold text-[#F5F2EB]">No connections found</h3>
            <p className="text-xs text-[#9E9A90] max-w-sm mx-auto">
              {searchQuery.trim()
                ? `No connections matched "${searchQuery}". Try a different keyword or filter.`
                : 'You have not connected with any community members yet. Explore the community directory to find mentors and peers.'}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('discover')}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E6C258] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Community Members</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#3D4460] rounded-2xl p-5 sm:p-6 space-y-5 transition-all flex flex-col justify-between shadow-lg relative group"
            >
              <div className="space-y-4">
                {/* Profile Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-13 h-13 rounded-xl object-cover border border-[#343A52] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-serif font-bold text-[#F5F2EB] truncate hover:text-[#D4AF37] cursor-pointer transition-colors" onClick={() => handleOpenProfile(member.profile)}>
                          {member.name}
                        </h3>
                      </div>
                      <p className="text-xs text-[#9E9A90] truncate">{member.title}</p>
                      <p className="text-[11px] text-[#7A766E] truncate">{member.organization}</p>
                    </div>
                  </div>

                  {getRoleBadge(member.role)}
                </div>

                {/* Meta details */}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#9E9A90]">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-[#7A766E]" />
                    <span>{member.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#7A766E]" />
                    <span>{member.yearsOfExperience} yrs exp</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-[#7A766E]" />
                    <span>Connected {new Date(member.connectedAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Skills Badges */}
                {member.skills && member.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {member.skills.slice(0, 3).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded-md bg-[#181B28] text-[10px] font-mono text-[#D4AF37] border border-[#2D3349]"
                      >
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono text-[#7A766E]">
                        +{member.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-[#232738]">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenProfile(member.profile)}
                    className="w-full py-2 px-3 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold tracking-wider uppercase border border-[#343A52] hover:border-[#D4AF37]/50 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={handleOpenWorkspace}
                    className="w-full py-2 px-3 rounded-lg bg-[#D4AF37] hover:bg-[#E6C258] text-[#090A0F] text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Workspace</span>
                  </button>
                </div>

                {/* Management Controls: Remove & Block */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    onClick={() => setMemberToRemove(member)}
                    className="text-[#9E9A90] hover:text-[#EF4444] transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <UserMinus className="w-3 h-3" />
                    <span>Remove Connection</span>
                  </button>
                  <button
                    onClick={() => setMemberToBlock(member)}
                    className="text-[#7A766E] hover:text-[#EF4444] transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>Block User</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRMATION MODAL: REMOVE CONNECTION */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/80 backdrop-blur-sm p-4">
          <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[#F5F2EB]">
            <div className="flex items-center space-x-3 text-[#D4AF37]">
              <div className="p-2.5 rounded-xl bg-[#181B28] border border-[#343A52]">
                <UserMinus className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold">Remove Connection?</h3>
                <p className="text-xs text-[#9E9A90]">Disconnect from {memberToRemove.name}</p>
              </div>
            </div>

            <p className="text-xs text-[#9E9A90] leading-relaxed">
              Are you sure you want to remove <strong className="text-[#F5F2EB]">{memberToRemove.name}</strong> from your network? This will end active 1:1 mentorship tracking and update both accounts immediately.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setMemberToRemove(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider border border-[#343A52] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveConnection}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isProcessingAction ? 'Removing...' : 'Confirm Removal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: BLOCK USER */}
      {memberToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/80 backdrop-blur-sm p-4">
          <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[#F5F2EB]">
            <div className="flex items-center space-x-3 text-[#EF4444]">
              <div className="p-2.5 rounded-xl bg-[#181B28] border border-[#EF4444]/40">
                <ShieldAlert className="w-6 h-6 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Block User?</h3>
                <p className="text-xs text-[#EF4444]">Permanent connection block</p>
              </div>
            </div>

            <p className="text-xs text-[#9E9A90] leading-relaxed">
              Blocking <strong className="text-[#F5F2EB]">{memberToBlock.name}</strong> will instantly remove them from your network, terminate any mentorship requests or active 1:1 workspaces, and prevent future messages or requests.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setMemberToBlock(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider border border-[#343A52] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center space-x-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isProcessingAction ? 'Blocking...' : 'Confirm Block'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: UNBLOCK USER */}
      {memberToUnblock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/80 backdrop-blur-sm p-4">
          <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[#F5F2EB]">
            <div className="flex items-center space-x-3 text-[#10B981]">
              <div className="p-2.5 rounded-xl bg-[#181B28] border border-[#10B981]/40">
                <UserCheck className="w-6 h-6 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Unblock {memberToUnblock.name}?</h3>
                <p className="text-xs text-[#10B981]">Restore access & visibility</p>
              </div>
            </div>

            <p className="text-xs text-[#9E9A90] leading-relaxed">
              Unblocking <strong className="text-[#F5F2EB]">{memberToUnblock.name}</strong> will allow you to view their profile, send mentorship requests, and interact across the platform again.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setMemberToUnblock(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider border border-[#343A52] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUnblockUser}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#090A0F] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center space-x-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{isProcessingAction ? 'Unblocking...' : 'Confirm Unblock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
