import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppNotification, UserProfile } from '../types/index';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export type NavTab = 
  | 'landing'
  | 'dashboard' 
  | 'discover' 
  | 'requests' 
  | 'connections' 
  | 'network'
  | 'goals' 
  | 'library' 
  | 'notifications' 
  | 'profile' 
  | 'admin';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

export type AuthMode = 'signin' | 'signup' | 'choice' | 'forgot_password' | 'update_password' | 'email_confirmation';

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  selectedMentorForModal: UserProfile | null;
  isMentorModalOpen: boolean;
  openMentorModal: (mentor: UserProfile) => void;
  closeMentorModal: () => void;
  isAdvisorModalOpen: boolean;
  openAdvisorModal: () => void;
  closeAdvisorModal: () => void;
  isAuthModalOpen: boolean;
  authModalMode: AuthMode;
  authModalRole: 'student' | 'early_career' | 'mentor';
  openAuthModal: (mode?: AuthMode, role?: 'student' | 'early_career' | 'mentor') => void;
  closeAuthModal: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading, isPasswordRecovery } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    return currentUser ? 'dashboard' : 'landing';
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedMentorForModal, setSelectedMentorForModal] = useState<UserProfile | null>(null);
  const [isMentorModalOpen, setIsMentorModalOpen] = useState<boolean>(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('choice');
  const [authModalRole, setAuthModalRole] = useState<'student' | 'early_career' | 'mentor'>('student');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Synchronize tab state with user authentication
  useEffect(() => {
    if (isLoading) return;

    if (currentUser && activeTab === 'landing') {
      setActiveTab('dashboard');
    } else if (!currentUser && activeTab !== 'landing' && activeTab !== 'discover' && activeTab !== 'library') {
      setActiveTab('landing');
    }
  }, [currentUser, isLoading]);

  // Handle password recovery state
  useEffect(() => {
    if (isPasswordRecovery) {
      setAuthModalMode('update_password');
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery]);

  // Check URL parameters for password recovery or link expiration errors
  useEffect(() => {
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
      const search = typeof window !== 'undefined' ? window.location.search || '' : '';
      const params = new URLSearchParams(hash.replace(/^#/, '') || search);

      const errorCode = params.get('error_code') || params.get('error');
      const errorDesc = params.get('error_description');

      if (errorCode || errorDesc) {
        const readableDesc = errorDesc 
          ? decodeURIComponent(errorDesc.replace(/\+/g, ' '))
          : 'Your password reset link is invalid or has expired.';
        
        setToasts(prev => [
          ...prev, 
          { 
            id: `toast-${Date.now()}`, 
            type: 'error', 
            title: 'Reset Link Expired', 
            message: readableDesc 
          }
        ]);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get('type') === 'recovery' || hash.includes('type=recovery') || search.includes('type=recovery')) {
        setAuthModalMode('update_password');
        setIsAuthModalOpen(true);
      }
    } catch (e) {
      console.warn('URL auth verification error:', e);
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const list = await api.getNotifications(currentUser.id);
      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshNotifications();

      const unsubscribe = api.subscribeToNotifications(currentUser.id, (newNotif) => {
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        showToast('info', newNotif.title, newNotif.message);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [currentUser, refreshNotifications, refreshTrigger]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      await api.markAllNotificationsRead(currentUser.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!currentUser) return;
    try {
      await api.clearAllNotifications(currentUser.id);
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, type, title, message };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const openMentorModal = (mentor: UserProfile) => {
    setSelectedMentorForModal(mentor);
    setIsMentorModalOpen(true);
  };

  const closeMentorModal = () => {
    setIsMentorModalOpen(false);
    setSelectedMentorForModal(null);
  };

  const openAdvisorModal = () => setIsAdvisorModalOpen(true);
  const closeAdvisorModal = () => setIsAdvisorModalOpen(false);

  const openAuthModal = (mode: AuthMode = 'choice', role: 'student' | 'early_career' | 'mentor' = 'student') => {
    setAuthModalMode(mode);
    setAuthModalRole(role);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        toasts,
        showToast,
        removeToast,
        selectedMentorForModal,
        isMentorModalOpen,
        openMentorModal,
        closeMentorModal,
        isAdvisorModalOpen,
        openAdvisorModal,
        closeAdvisorModal,
        isAuthModalOpen,
        authModalMode,
        authModalRole,
        openAuthModal,
        closeAuthModal,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
