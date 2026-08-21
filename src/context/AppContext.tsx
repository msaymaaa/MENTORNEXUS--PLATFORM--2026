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

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
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
  isPersonaSwitcherOpen: boolean;
  openPersonaSwitcher: () => void;
  closePersonaSwitcher: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('landing');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedMentorForModal, setSelectedMentorForModal] = useState<UserProfile | null>(null);
  const [isMentorModalOpen, setIsMentorModalOpen] = useState<boolean>(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState<boolean>(false);
  const [isPersonaSwitcherOpen, setIsPersonaSwitcherOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

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

  const openPersonaSwitcher = () => setIsPersonaSwitcherOpen(true);
  const closePersonaSwitcher = () => setIsPersonaSwitcherOpen(false);

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
        isPersonaSwitcherOpen,
        openPersonaSwitcher,
        closePersonaSwitcher,
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
