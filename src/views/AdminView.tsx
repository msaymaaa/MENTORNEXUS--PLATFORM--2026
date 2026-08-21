import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Trash2, 
  BookOpen, 
  Target, 
  Star, 
  AlertTriangle, 
  Plus, 
  ExternalLink,
  Ban,
  TrendingUp,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { AdminStats, UserProfile, ExperienceResource } from '../types/index';

export const AdminView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh, refreshTrigger } = useApp();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [resources, setResources] = useState<ExperienceResource[]>([]);
  const [activeTabMode, setActiveTabMode] = useState<'users' | 'verification' | 'content'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const [statsData, usersList, resList] = await Promise.all([
        api.getAdminStats(),
        api.getAllUsers(),
        api.getResources()
      ]);
      setStats(statsData);
      setUsers(usersList);
      setResources(resList);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [refreshTrigger]);

  const handleVerify = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      await api.verifyUser(userId, status, status === 'verified' ? 'Approved by Admin' : 'Review criteria not met');
      showToast('success', `Mentor ${status === 'verified' ? 'Approved' : 'Rejected'}`, `Verification status has been updated.`);
      loadAdminData();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Verification Failed', err.message);
    }
  };

  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    try {
      await api.toggleUserBan(userId, !currentBanned);
      showToast('info', currentBanned ? 'User Reactivated' : 'User Suspended', 'Account access updated.');
      loadAdminData();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Action Failed', err.message);
    }
  };

  const handleToggleFeaturedResource = async (resource: ExperienceResource) => {
    try {
      await api.updateResource(resource.id, { featured: !resource.featured });
      showToast('success', resource.featured ? 'Removed from Featured' : 'Marked as Featured', 'Experience Library updated.');
      loadAdminData();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to update resource', err.message);
    }
  };

  const handleDeleteResource = async (id: string, title: string) => {
    if (!confirm(`Delete resource "${title}"?`)) return;
    try {
      await api.deleteResource(id);
      showToast('info', 'Resource Removed', `"${title}" has been deleted.`);
      loadAdminData();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to delete resource', err.message);
    }
  };

  const pendingVerificationUsers = users.filter(u => u.verificationStatus === 'pending' || (u.role === 'mentor' && u.verificationStatus === 'unverified'));

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">Governance & Operations</span>
          <h1 className="text-3xl font-serif font-bold text-[#F5F2EB]">Platform Administration.</h1>
          <p className="text-xs text-[#9E9A90] max-w-xl">
            Monitor mentorship health, review practitioner verification queues, and manage platform resources.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-[#12141F] border border-[#262A3C] p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTabMode('users')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTabMode === 'users' ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-sm' : 'text-[#9E9A90]'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTabMode('verification')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTabMode === 'verification' ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-sm' : 'text-[#9E9A90]'
            }`}
          >
            <span>Verification</span>
            {pendingVerificationUsers.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingVerificationUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTabMode('content')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTabMode === 'content' ? 'bg-[#D4AF37] text-[#090A0F] font-bold shadow-sm' : 'text-[#9E9A90]'
            }`}
          >
            Library Content ({resources.length})
          </button>
        </div>
      </div>

      {/* KPI Cards (Strict Maximum of 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12141F] border border-[#262A3C] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#9E9A90]">
            <span className="text-[11px] uppercase font-mono tracking-wider">Total Members</span>
            <Users className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{stats?.totalUsers || users.length}</div>
          <p className="text-[11px] text-[#7A766E]">Active ecosystem accounts</p>
        </div>

        <div className="bg-[#12141F] border border-[#262A3C] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#9E9A90]">
            <span className="text-[11px] uppercase font-mono tracking-wider">Verified Mentors</span>
            <Shield className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{stats?.totalMentors || users.filter(u => u.role === 'mentor').length}</div>
          <p className="text-[11px] text-[#7A766E]">Vetted senior practitioners</p>
        </div>

        <div className="bg-[#12141F] border border-[#262A3C] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#9E9A90]">
            <span className="text-[11px] uppercase font-mono tracking-wider">Active Mentorships</span>
            <Target className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{stats?.activeConnections || 6}</div>
          <p className="text-[11px] text-[#7A766E]">1:1 active relationships</p>
        </div>

        <div className="bg-[#12141F] border border-[#262A3C] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#9E9A90]">
            <span className="text-[11px] uppercase font-mono tracking-wider">Verification Queue</span>
            <UserCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#F5F2EB]">{stats?.pendingVerifications || pendingVerificationUsers.length}</div>
          <p className="text-[11px] text-[#7A766E]">Pending admin approval</p>
        </div>
      </div>

      {/* Tab 1: Users Directory */}
      {activeTabMode === 'users' && (
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141622] border border-[#2D3349] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="sm:w-48">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="all">All Roles</option>
                <option value="student">Learner / Student</option>
                <option value="early_career">Early Career</option>
                <option value="mentor">Mentor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#232738] text-[10px] font-mono uppercase text-[#7A766E]">
                <tr>
                  <th className="py-3 px-3">Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Industry</th>
                  <th className="py-3 px-3">Verification</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2030]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#161925]/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-3">
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover border border-[#2D3349]" />
                        <div>
                          <p className="font-bold text-[#F5F2EB]">{u.name}</p>
                          <p className="text-[11px] text-[#7A766E] font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-[#181B28] border border-[#2D3349] text-[10px] font-mono uppercase text-[#D4AF37]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#9E9A90]">{u.industry}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                        u.verificationStatus === 'verified' ? 'bg-[#10B981]/15 text-[#10B981]' :
                        u.verificationStatus === 'pending' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {u.verificationStatus || 'unverified'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                          className={`text-xs font-semibold ${u.isBanned ? 'text-[#10B981]' : 'text-red-400'} hover:underline cursor-pointer`}
                        >
                          {u.isBanned ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Verification Queue */}
      {activeTabMode === 'verification' && (
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="border-b border-[#232738] pb-3">
            <h3 className="text-base font-serif font-bold text-[#F5F2EB]">Pending Mentor Verifications</h3>
            <p className="text-xs text-[#9E9A90]">Review credentials and grant verified practitioner status.</p>
          </div>

          {pendingVerificationUsers.length > 0 ? (
            <div className="space-y-4">
              {pendingVerificationUsers.map((u) => (
                <div key={u.id} className="p-5 rounded-xl bg-[#161925] border border-[#2D3349] space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-xl object-cover border border-[#343A52]" />
                      <div>
                        <h4 className="text-sm font-serif font-bold text-[#F5F2EB]">{u.name}</h4>
                        <p className="text-xs text-[#9E9A90]">{u.title} • {u.organization}</p>
                        <p className="text-[11px] text-[#7A766E] font-mono">{u.yearsOfExperience} yrs exp • {u.industry}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleVerify(u.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg bg-[#141622] border border-[#262A3C] text-xs text-[#9E9A90] hover:text-red-400 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerify(u.id, 'verified')}
                        className="px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm"
                      >
                        Approve & Verify
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#9E9A90] leading-relaxed bg-[#141622] p-3 rounded-lg border border-[#262A3C]">
                    "{u.bio}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#7A766E]">
              Verification queue is completely clear.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Content Moderation */}
      {activeTabMode === 'content' && (
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="border-b border-[#232738] pb-3">
            <h3 className="text-base font-serif font-bold text-[#F5F2EB]">Published Playbooks & Experience Guides</h3>
          </div>

          <div className="space-y-3">
            {resources.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-[#161925] border border-[#2D3349] flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-[#181B28] text-[10px] font-mono text-[#D4AF37]">{r.category}</span>
                    <h4 className="text-xs font-bold text-[#F5F2EB]">{r.title}</h4>
                  </div>
                  <p className="text-[11px] text-[#7A766E] mt-0.5">By {r.authorName} • {r.readTimeMinutes} min read</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleFeaturedResource(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono uppercase cursor-pointer ${
                      r.featured ? 'bg-[#D4AF37] text-[#090A0F] font-bold' : 'bg-[#141622] text-[#9E9A90]'
                    }`}
                  >
                    {r.featured ? 'Featured' : 'Feature'}
                  </button>
                  <button
                    onClick={() => handleDeleteResource(r.id, r.title)}
                    className="p-1.5 rounded-lg text-[#7A766E] hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
