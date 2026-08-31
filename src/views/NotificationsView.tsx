import React, { useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  Send, 
  Users, 
  Target, 
  Shield, 
  ChevronRight, 
  Sparkles,
  ArrowRight,
  MessageSquare,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp, NavTab } from '../context/AppContext';
import { AppNotification } from '../types/index';

export const NotificationsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    setActiveTab, 
    showToast 
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
    if (notif.linkTab) {
      setActiveTab(notif.linkTab as NavTab);
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    showToast('success', 'All Read', 'All notifications marked as read.');
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    await clearAllNotifications();
    showToast('info', 'Notifications Cleared', 'All alerts have been cleared.');
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
    showToast('info', 'Notification Dismissed', 'Notification removed from your feed.');
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'request_received':
        return <Send className="w-4 h-4 text-[#D4AF37]" />;
      case 'request_accepted':
      case 'request_declined':
        return <Users className="w-4 h-4 text-[#10B981]" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-[#D4AF37]" />;
      case 'goal_milestone':
        return <Target className="w-4 h-4 text-[#D4AF37]" />;
      case 'verification':
        return <Shield className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#9E9A90]" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">Platform Alerts</span>
          <h1 className="text-3xl font-serif font-bold text-[#F5F2EB]">Notifications.</h1>
          <p className="text-xs text-[#9E9A90]">
            Activity feed on requests, roadmap milestones, and direct mentorship engagements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="flex bg-[#12141F] p-1 rounded-xl border border-[#262A3C]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer ${
                filter === 'all' ? 'bg-[#181B28] text-[#D4AF37] border border-[#343A52] font-bold' : 'text-[#9E9A90]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer ${
                filter === 'unread' ? 'bg-[#181B28] text-[#D4AF37] border border-[#343A52] font-bold' : 'text-[#9E9A90]'
              }`}
            >
              Unread ({notifications.filter(n => !n.read).length})
            </button>
          </div>

          <button
            onClick={handleMarkAll}
            className="px-3.5 py-2 bg-[#161925] border border-[#262A3C] hover:border-[#3D4460] text-[#9E9A90] hover:text-[#F5F2EB] rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
            title="Mark all notifications as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-[#161925] border border-[#262A3C] hover:border-red-500/40 text-[#9E9A90] hover:text-red-400 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
              title="Dismiss and clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications Feed */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between space-x-4 ${
                !notif.read 
                  ? 'bg-[#161925] border-[#D4AF37]/50 shadow-md' 
                  : 'bg-[#12141F] border-[#262A3C] hover:border-[#3D4460]'
              }`}
            >
              <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#141622] border border-[#262A3C] flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-xs font-bold ${!notif.read ? 'text-[#F5F2EB]' : 'text-[#9E9A90]'}`}>
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#9E9A90] leading-relaxed max-w-xl break-words">{notif.message}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0 pt-0.5">
                <span className="text-[10px] text-[#7A766E] font-mono">
                  {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
                
                <button
                  type="button"
                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                  title="Dismiss notification"
                  className="p-1.5 rounded-lg text-[#7A766E] hover:text-red-400 hover:bg-[#1E2234] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {notif.linkTab && (
                  <ChevronRight className="w-4 h-4 text-[#7A766E] group-hover:text-[#D4AF37] transition-colors" />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">All caught up.</h3>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            You don't have any unread notifications right now.
          </p>
        </div>
      )}

    </div>
  );
};
