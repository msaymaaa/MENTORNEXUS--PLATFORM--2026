import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/Toast';
import { PersonaSwitcherModal } from './components/PersonaSwitcherModal';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { AuthModal, AuthViewMode } from './components/AuthModal';
import { MentorProfileModal } from './views/MentorProfileModal';
import { LandingView } from './views/LandingView';
import { DashboardView } from './views/DashboardView';
import { DiscoverView } from './views/DiscoverView';
import { RequestsView } from './views/RequestsView';
import { ConnectionsView } from './views/ConnectionsView';
import { GoalsView } from './views/GoalsView';
import { ExperienceLibraryView } from './views/ExperienceLibraryView';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { AdminView } from './views/AdminView';
import { Sparkles, Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const { activeTab, setActiveTab, openAdvisorModal } = useApp();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>('choice');
  const [authInitialRole, setAuthInitialRole] = useState<'student' | 'mentor'>('student');

  const handleOpenAuth = (mode: AuthViewMode = 'choice', role: 'student' | 'mentor' = 'student') => {
    setAuthMode(mode);
    setAuthInitialRole(role);
    setIsAuthOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-[#F5F2EB] flex flex-col items-center justify-center space-y-4 font-sans selection:bg-[#D4AF37]/30 selection:text-[#F5F2EB]">
        <div className="w-14 h-14 rounded-2xl bg-[#161925] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-2xl shadow-[#D4AF37]/10">
          <Sparkles className="w-7 h-7 animate-pulse text-[#D4AF37]" />
        </div>
        <div className="flex items-center space-x-2.5 text-[#9E9A90] font-mono text-xs uppercase tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
          <span>Initializing MentorNexus platform...</span>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'landing':
        return (
          <LandingView 
            onOpenAuth={handleOpenAuth} 
            onExploreCategory={(cat) => {
              setActiveTab('discover');
            }} 
          />
        );
      case 'dashboard':
        return <DashboardView />;
      case 'discover':
        return <DiscoverView />;
      case 'requests':
        return <RequestsView />;
      case 'connections':
        return <ConnectionsView />;
      case 'goals':
        return <GoalsView />;
      case 'library':
        return <ExperienceLibraryView />;
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
        return <ProfileView />;
      case 'admin':
        return currentUser?.role === 'admin' ? <AdminView /> : <DashboardView />;
      default:
        return <DashboardView />;
    }
  };

  const showNavbar = activeTab !== 'landing';

  return (
    <div className="min-h-screen bg-[#090A0F] flex flex-col selection:bg-[#D4AF37]/30 selection:text-[#F5F2EB] font-sans text-[#F5F2EB]">
      {/* Top Navigation Bar */}
      {showNavbar && (
        <Navbar onGoToLanding={() => setActiveTab('landing')} />
      )}

      {/* Main Viewport */}
      <main className="flex-1 pb-16">
        {renderActiveView()}
      </main>

      {/* Global Modals & Notifications */}
      <MentorProfileModal />
      <AIAdvisorModal />
      <PersonaSwitcherModal />
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        initialMode={authMode} 
        initialRole={authInitialRole} 
      />
      <ToastContainer />

      {/* Floating AI Advisor Action Pill */}
      <button
        id="floating-ai-advisor-btn"
        onClick={openAdvisorModal}
        className="fixed bottom-6 right-6 z-30 flex items-center space-x-2 px-4 py-3 bg-[#161925]/95 hover:bg-[#1E2232] text-[#D4AF37] rounded-full shadow-2xl hover:scale-105 transition-all cursor-pointer border border-[#D4AF37]/40 backdrop-blur-md"
        title="Open MentorNexus AI Career Advisor"
      >
        <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
        <span className="text-xs font-mono font-bold tracking-wider uppercase">AI Advisor</span>
      </button>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </AuthProvider>
  );
}
