import React, { useState, useRef, useEffect } from 'react';
import { 
  Compass, 
  Send, 
  Users, 
  Target, 
  BookOpen, 
  Bell, 
  User, 
  Shield, 
  Sparkles, 
  ChevronDown, 
  LogOut, 
  LayoutDashboard,
  CheckCircle2,
  Clock,
  Briefcase,
  GraduationCap,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp, NavTab } from '../context/AppContext';
import { UserRole } from '../types/index';
import { MentorNexusBrand } from './MentorNexusBrand';

interface NavbarProps {
  onGoToLanding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onGoToLanding }) => {
  const { currentUser, logoutUser } = useAuth();
  const { 
    activeTab, 
    setActiveTab, 
    unreadCount, 
    notifications, 
    markNotificationRead,
    markAllNotificationsRead,
    openAdvisorModal, 
    showToast,
    openAuthModal
  } = useApp();

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setIsProfileDropdownOpen(false);
      setIsMobileMenuOpen(false);
      setActiveTab('landing');
      showToast('info', 'Signed Out', 'You have been signed out successfully.');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'student':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <GraduationCap className="w-3 h-3 mr-1" />
            Learner
          </span>
        );
      case 'early_career':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <Briefcase className="w-3 h-3 mr-1" />
            Early Career
          </span>
        );
      case 'mentor':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
            <Shield className="w-3 h-3 mr-1" />
            Mentor
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; roles?: UserRole[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'discover', label: 'Discover Mentors', icon: Compass, roles: ['student', 'early_career', 'mentor', 'admin'] },
    { id: 'requests', label: 'Requests', icon: Send },
    { id: 'connections', label: currentUser?.role === 'mentor' ? 'Active Mentees' : 'Mentorships', icon: Users },
    { id: 'network', label: 'My Network', icon: Users },
    { id: 'goals', label: 'Goals & Roadmap', icon: Target, roles: ['student', 'early_career', 'mentor'] },
    { id: 'library', label: 'Experience Library', icon: BookOpen },
    ...(currentUser?.role === 'admin' ? [{ id: 'admin' as NavTab, label: 'Admin Portal', icon: Shield }] : [])
  ];

  const visibleNavItems = navItems.filter(item => !item.roles || (currentUser && item.roles.includes(currentUser.role)));

  return (
    <header className="sticky top-0 z-40 bg-[#090A0F]/95 backdrop-blur-md border-b border-[#232738] text-[#F5F2EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Brand Logo & Wordmark */}
          <div className="flex items-center space-x-8">
            <MentorNexusBrand 
              size="sm" 
              onClick={() => setActiveTab('landing')} 
            />

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              <button
                id="nav-link-landing"
                onClick={() => setActiveTab('landing')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'landing'
                    ? 'bg-[#181B28] text-[#D4AF37] border border-[#343A52] shadow-sm'
                    : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#12141F]'
                }`}
              >
                <span>Landing Page</span>
              </button>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#181B28] text-[#D4AF37] border border-[#343A52] shadow-sm' 
                        : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#12141F]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D4AF37]' : 'text-[#7A766E]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            
            {/* AI Advisor Button */}
            <button
              id="ai-advisor-nav-btn"
              onClick={openAdvisorModal}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider bg-[#161925] border border-[#2D3349] text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-[#1E2232] cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>AI Advisor</span>
            </button>

            {/* Current Authenticated Role Badge */}
            {currentUser && (
              <div id="nav-user-role-badge" className="hidden sm:flex items-center">
                {getRoleBadge(currentUser.role)}
              </div>
            )}

            {/* Notifications Dropdown (Authenticated) */}
            {currentUser && (
              <div ref={notifRef} className="relative">
                <button
                  id="notifications-bell-btn"
                  onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                  className="relative p-2 rounded-lg text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#161925] transition-colors cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#D4AF37] text-[#090A0F] rounded-full text-[9px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotifDropdownOpen && (
                  <div 
                    id="notifications-dropdown-menu"
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#11131E] rounded-xl shadow-2xl border border-[#262A3C] py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-[#F5F2EB]"
                  >
                    <div className="px-4 py-2.5 border-b border-[#232738] flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold">Notifications</span>
                      <div className="flex items-center space-x-3">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllNotificationsRead()}
                            className="text-[11px] text-[#D4AF37] hover:text-[#E6C258] cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setIsNotifDropdownOpen(false);
                            setActiveTab('notifications');
                          }}
                          className="text-[11px] text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer"
                        >
                          View all ({notifications.length})
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-[#1C2030]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#7A766E]">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.slice(0, 6).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationRead(n.id);
                              if (n.linkTab) setActiveTab(n.linkTab as NavTab);
                              setIsNotifDropdownOpen(false);
                            }}
                            className={`p-3.5 hover:bg-[#161925] cursor-pointer transition-colors relative ${
                              !n.read ? 'bg-[#181C2C]' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                {!n.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                                )}
                                <h4 className={`text-xs font-semibold truncate ${!n.read ? 'text-[#F5F2EB]' : 'text-[#9E9A90]'}`}>
                                  {n.title}
                                </h4>
                              </div>
                              <span className="text-[10px] text-[#7A766E] font-mono shrink-0">
                                {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-xs text-[#9E9A90] mt-1 line-clamp-2 leading-relaxed pl-3.5">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile Avatar & Dropdown OR Sign-in / Register for Public Visitors */}
            {currentUser ? (
              <div ref={profileRef} className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 p-1 rounded-full hover:ring-2 hover:ring-[#D4AF37]/50 transition-all cursor-pointer"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#2D3349]"
                    referrerPolicy="no-referrer"
                  />
                </button>

                {isProfileDropdownOpen && (
                  <div 
                    id="profile-dropdown-menu"
                    className="absolute right-0 mt-2 w-64 bg-[#11131E] rounded-xl shadow-2xl border border-[#262A3C] py-2 z-50 text-[#F5F2EB]"
                  >
                    <div className="px-4 py-3 border-b border-[#232738]">
                      <p className="text-xs font-bold text-[#F5F2EB]">{currentUser.name}</p>
                      <p className="text-[11px] text-[#7A766E] truncate font-mono">{currentUser.email}</p>
                      <div className="mt-2 flex items-center space-x-1.5">
                        {getRoleBadge(currentUser.role)}
                      </div>
                    </div>

                    <div className="py-1 text-xs">
                      <button
                        id="profile-menu-item-profile"
                        onClick={() => {
                          setActiveTab('profile');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#161925] flex items-center space-x-2 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-[#7A766E]" />
                        <span>My Profile & Settings</span>
                      </button>

                      <button
                        id="profile-menu-item-network"
                        onClick={() => {
                          setActiveTab('network');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#161925] flex items-center space-x-2 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>My Network Hub</span>
                      </button>

                      {onGoToLanding && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onGoToLanding();
                          }}
                          className="w-full px-4 py-2 text-left text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#161925] flex items-center space-x-2 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#7A766E]" />
                          <span>Public Landing Page</span>
                        </button>
                      )}

                      {currentUser.role === 'admin' && (
                        <button
                          id="profile-menu-item-admin"
                          onClick={() => {
                            setActiveTab('admin');
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-purple-300 hover:bg-[#161925] flex items-center space-x-2 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-purple-400" />
                          <span>Admin Console</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-[#232738]" />

                      <button
                        id="profile-menu-item-signout"
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-left text-red-400 hover:text-red-300 hover:bg-[#1C1318] flex items-center space-x-2 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openAuthModal('signin')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#F5F2EB] hover:bg-[#161925] border border-[#262A3C] transition-all cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup', 'student')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-[#D4AF37]/15"
                >
                  Join
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#161925] transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#0D0F17] border-t border-[#232738] px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => {
              setActiveTab('landing');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'landing'
                ? 'bg-[#181B28] text-[#D4AF37] border border-[#343A52]'
                : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#141622]'
            }`}
          >
            <span>Landing Page</span>
          </button>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#181B28] text-[#D4AF37] border border-[#343A52]' 
                    : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#141622]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-[#7A766E]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-[#232738]">
            {currentUser ? (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-red-400 hover:bg-[#1C1318] transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('signin');
                  }}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold text-[#F5F2EB] bg-[#161925] border border-[#262A3C] transition-all cursor-pointer text-center"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('signup', 'student');
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center shadow-sm"
                >
                  Join MentorNexus
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
