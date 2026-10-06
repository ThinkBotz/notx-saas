import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  CheckCircle2, 
  Award, 
  Calendar, 
  Sparkles, 
  Camera, 
  Megaphone, 
  Info, 
  ArrowRight,
  ShieldAlert,
  Volume2,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppNotification } from '../types';
import { 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  requestNotificationPermission,
  deleteAppNotification,
  deleteMultipleNotifications
} from '../firebase';

interface NotificationInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentUserId: string;
  activeTenantId?: string;
  onClearedIdsChange?: (ids: Set<string>) => void;
}

export const NotificationInboxDrawer: React.FC<NotificationInboxDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUserId,
  activeTenantId,
  onClearedIdsChange
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [isRequestingPerm, setIsRequestingPerm] = useState(false);

  // Cleared/Dismissed notification IDs per user (persisted in localStorage)
  const storageKey = `notx_cleared_notifs_${currentUserId || 'guest'}`;
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Keep storage in sync when current user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const nextSet = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
      setClearedIds(nextSet);
      onClearedIdsChange?.(nextSet);
    } catch {
      setClearedIds(new Set());
    }
  }, [currentUserId]);

  const saveClearedIds = (updatedSet: Set<string>) => {
    setClearedIds(updatedSet);
    onClearedIdsChange?.(updatedSet);
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(updatedSet)));
    } catch (e) {
      console.warn('Failed to save cleared notifications:', e);
    }
  };

  if (!isOpen) return null;

  // Active notifications excluding any cleared by the user
  const activeNotifications = notifications.filter(n => !clearedIds.has(n.id));
  const unreadCount = activeNotifications.filter(n => !n.read).length;

  const filteredNotifications = activeNotifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'important') {
      return n.type === 'attendance' || n.type === 'promotion' || n.type === 'assignment';
    }
    return true;
  });

  const handleMarkAllRead = async () => {
    const unreadIds = activeNotifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(unreadIds);
    }
  };

  // Delete a single notification (clear one)
  const handleDeleteOne = async (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    
    // 1. Immediately remove from current user's feed
    const nextSet = new Set(clearedIds);
    nextSet.add(notif.id);
    saveClearedIds(nextSet);

    // 2. If it's a direct notification for this user, delete from Firestore
    if (notif.userId === currentUserId) {
      await deleteAppNotification(notif.id);
    }
  };

  // Delete all visible notifications (clear all)
  const handleClearAll = async () => {
    if (activeNotifications.length === 0) return;

    // 1. Mark all active as cleared locally
    const nextSet = new Set(clearedIds);
    const directIdsToDelete: string[] = [];
    activeNotifications.forEach(n => {
      nextSet.add(n.id);
      if (n.userId === currentUserId) {
        directIdsToDelete.push(n.id);
      }
    });
    saveClearedIds(nextSet);

    // 2. If any direct notifications exist, batch delete them from Firestore
    if (directIdsToDelete.length > 0) {
      await deleteMultipleNotifications(directIdsToDelete);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
    if (notif.link) {
      onClose();
      // Handle relative vs absolute links
      if (notif.link.startsWith('/')) {
        navigate(notif.link);
      } else {
        window.open(notif.link, '_blank');
      }
    }
  };

  const handleEnableBrowserPush = async () => {
    setIsRequestingPerm(true);
    try {
      await requestNotificationPermission();
    } finally {
      setIsRequestingPerm(false);
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'attendance':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'promotion':
        return <Award className="w-4 h-4 text-amber-600" />;
      case 'assignment':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'event':
        return <Sparkles className="w-4 h-4 text-orange-600" />;
      case 'gallery':
        return <Camera className="w-4 h-4 text-purple-600" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: AppNotification['type']) => {
    switch (type) {
      case 'attendance': return 'ATTENDANCE';
      case 'promotion': return 'PROMOTION';
      case 'assignment': return 'DUTY ASSIGNED';
      case 'event': return 'EVENT';
      case 'gallery': return 'GALLERY';
      case 'announcement': return 'BROADCAST';
      default: return 'NOTX SYSTEM';
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const hasPushDeniedOrDefault = typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted';

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div 
        className="relative w-full max-w-md bg-[var(--nb-surface)] text-[var(--nb-content)] h-full flex flex-col z-10 shadow-2xl border-l-3 border-[var(--nb-ink)] animate-slideInRight"
        style={{ borderColor: 'var(--nb-ink)' }}
      >
        {/* Header */}
        <div 
          className="p-4 sm:p-5 border-b-2 border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] flex items-center justify-between gap-3 shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded bg-amber-400 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]"
            >
              <Bell className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="nb-headline text-lg sm:text-xl tracking-tight leading-none">
                  NOTIFICATIONS
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0_#000]">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-[var(--nb-secondary)] mt-0.5">
                Realtime Activity & Live Alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="nb-btn text-[11px] font-mono font-bold uppercase px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer bg-white text-black hover:bg-neutral-100 shadow-[1.5px_1.5px_0_#000]"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Mark Read</span>
              </button>
            )}
            {activeNotifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="nb-btn text-[11px] font-mono font-bold uppercase px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer bg-rose-50 text-rose-700 hover:bg-rose-100 border border-black shadow-[1.5px_1.5px_0_#000]"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded border-2 border-black bg-white flex items-center justify-center hover:bg-neutral-100 transition-colors shadow-[2px_2px_0_#000] cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Web Push Permission Banner if not enabled */}
        {hasPushDeniedOrDefault && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border-b-2 border-black flex items-start gap-3 text-xs shrink-0">
            <Volume2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-black dark:text-amber-200 leading-snug">
                Enable Instant Browser Push
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-0.5">
                Receive instant sound & screen alerts for attendance check-ins, event announcements, and role promotions.
              </p>
              <button
                type="button"
                onClick={handleEnableBrowserPush}
                disabled={isRequestingPerm}
                className="mt-2 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-black border border-black shadow-[1.5px_1.5px_0_#000] cursor-pointer"
              >
                {isRequestingPerm ? 'Requesting...' : 'Turn On Live Alerts'}
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="px-4 py-2.5 border-b-2 border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0 bg-[var(--nb-surface)]">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-xs font-mono font-bold px-3 py-1 rounded border-1.5 transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-black text-white border-black shadow-[2px_2px_0_#666]'
                : 'bg-transparent text-neutral-600 border-neutral-300 dark:border-neutral-700 hover:border-black'
            }`}
          >
            All ({activeNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`text-xs font-mono font-bold px-3 py-1 rounded border-1.5 transition-all cursor-pointer ${
              filter === 'unread'
                ? 'bg-rose-600 text-white border-black shadow-[2px_2px_0_#000]'
                : 'bg-transparent text-neutral-600 border-neutral-300 dark:border-neutral-700 hover:border-black'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('important')}
            className={`text-xs font-mono font-bold px-3 py-1 rounded border-1.5 transition-all cursor-pointer ${
              filter === 'important'
                ? 'bg-amber-400 text-black border-black shadow-[2px_2px_0_#000]'
                : 'bg-transparent text-neutral-600 border-neutral-300 dark:border-neutral-700 hover:border-black'
            }`}
          >
            Milestones
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-black flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-neutral-400" />
              </div>
              <h4 className="nb-headline text-base text-[var(--nb-content)]">
                All Caught Up!
              </h4>
              <p className="text-xs text-[var(--nb-secondary)] max-w-xs mt-1">
                {filter === 'unread'
                  ? 'No unread notifications at the moment.'
                  : 'You have no notifications in your feed. When events are published or attendance is scanned, you will see them here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.read;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative p-3.5 rounded-lg border-2 border-black transition-all cursor-pointer ${
                    isUnread
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 shadow-[3px_3px_0_#000]'
                      : 'bg-[var(--nb-surface)] hover:bg-neutral-50 dark:hover:bg-neutral-900 shadow-[2px_2px_0_rgba(0,0,0,0.1)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon Badge */}
                    <div 
                      className={`w-8 h-8 rounded border-1.5 border-black shrink-0 flex items-center justify-center ${
                        isUnread ? 'bg-white shadow-[1.5px_1.5px_0_#000]' : 'bg-neutral-100 dark:bg-neutral-800'
                      }`}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-neutral-800 dark:text-neutral-200">
                          {getTypeLabel(notif.type)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-neutral-500 shrink-0">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteOne(e, notif)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Delete notification"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className={`text-sm leading-snug ${isUnread ? 'font-black text-black dark:text-white' : 'font-bold text-neutral-800 dark:text-neutral-200'}`}>
                        {notif.title}
                      </h4>

                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed break-words">
                        {notif.message}
                      </p>

                      {notif.link && (
                        <div className="mt-2.5 flex items-center gap-1 text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 group">
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      )}
                    </div>

                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-black shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] text-center text-[10px] font-mono text-[var(--nb-secondary)] shrink-0">
          NOTX Live Dispatch • Multi-Tenant Feed
        </div>
      </div>
    </div>
  );
};
export default NotificationInboxDrawer;
