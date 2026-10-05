import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, Loader2, Bell } from 'lucide-react';
import { useTenantContext } from '../context/TenantContext';
import BrandLogo from '../components/BrandLogo';
import { PWAInstallButton } from '../components/PWAInstallButton';
import FloatingDockNav from '../components/FloatingDockNav';
import { NotificationInboxDrawer } from '../components/NotificationInboxDrawer';
import { subscribeToUserNotifications } from '../firebase';
import { SUPER_ADMIN_EMAILS, AppNotification } from '../types';

export const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[320px] gap-3 select-none">
    <div className="w-12 h-12 bg-amber-400 border-[2.5px] border-neutral-950 flex items-center justify-center font-display font-black text-sm text-neutral-950 shadow-[3px_3px_0_#000]">
      NOTX
    </div>
    <Loader2 className="w-5 h-5 text-[var(--nb-accent)] animate-spin" />
    <span className="nb-label font-mono font-bold tracking-widest text-xs">NOTX • LOADING...</span>
  </div>
);

interface TenantLayoutProps {
  isOnline: boolean;
  isOverseeingTenant: boolean;
  setIsOverseeingTenant: (val: boolean) => void;
}

export const TenantLayout: React.FC<TenantLayoutProps> = ({
  isOnline,
  isOverseeingTenant,
  setIsOverseeingTenant
}) => {
  const {
    currentUser,
    activeTenantId,
    activeTenant,
    currentBranding,
    refreshAllData,
    isDataLoading,
    setSelectedEvent
  } = useTenantContext();

  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/events')) return 'events';
    if (path.includes('/gallery')) return 'gallery';
    if (path.includes('/announcements')) return 'announcements';
    if (path.includes('/profile')) return 'profile';
    return 'home';
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setSelectedEvent(null);
    const prefix = activeTenantId ? `/${activeTenantId}` : '';
    if (tabId === 'home') {
      navigate(prefix || '/');
    } else {
      navigate(`${prefix}/${tabId}`);
    }
  };

  const isSuperAdmin = currentUser && (
    currentUser.isSuperAdmin || 
    SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())
  );

  // Real-time In-App Notifications Feed
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToUserNotifications(
      currentUser.uid,
      activeTenantId || '',
      (notifs) => {
        setNotifications(notifs);
      }
    );
    return () => unsub();
  }, [currentUser?.uid, activeTenantId]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return (
    <div className="h-full w-full flex flex-col bg-[var(--nb-bg)] text-[var(--nb-content)] overflow-hidden">
      {/* Super Admin Floating Oversight Bar */}
      {isSuperAdmin && isOverseeingTenant && (
        <div 
          className="bg-[var(--nb-yellow)] text-neutral-900 border-b-2 border-[var(--nb-ink)] px-4 py-2 flex items-center justify-between text-xs font-bold z-50 sticky top-0 shadow-[0_2px_0_var(--nb-ink)] flex-shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="nb-pill-coral text-[9px] font-mono font-bold uppercase px-2 py-0.5 shadow-[1.5px_1.5px_0_#000] flex-shrink-0">
              SUPER ADMIN OVERSIGHT
            </span>
            <span className="text-xs font-bold truncate">
              Supervising: <strong>{activeTenant?.name || activeTenantId}</strong> ({activeTenantId})
            </span>
          </div>
          <button
            onClick={() => setIsOverseeingTenant(false)}
            className="nb-btn-ghost text-[10px] font-mono font-bold uppercase py-1 px-3 bg-white text-neutral-900 border border-black cursor-pointer shadow-[1.5px_1.5px_0_#000] hover:bg-neutral-100 flex-shrink-0"
          >
            ← Control Center
          </button>
        </div>
      )}

      {/* Top Header */}
      <header
        className="bg-[var(--nb-surface)] border-b-2 border-[var(--nb-ink)] px-4 sm:px-6 flex justify-center items-center flex-shrink-0 z-40 select-none"
        style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))', paddingBottom: '8px' }}
      >
        <div className="w-full max-w-6xl flex justify-between items-center gap-3 min-w-0">
          {/* Brand wordmark */}
          <button
            onClick={() => handleTabChange('home')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            title="NotX Connect"
          >
            <BrandLogo branding={currentBranding} size="md" />
            <div className="min-w-0">
              <h1 className="nb-headline text-base sm:text-lg text-[var(--nb-content)] truncate">
                {currentBranding.appName || 'NotX'} <span className="font-medium">{currentBranding.tagline || 'Connect'}</span>
              </h1>
            </div>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <PWAInstallButton />

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="nb-btn-icon relative cursor-pointer"
              aria-label="Notification Inbox"
              title="Live Notifications & Activity Feed"
            >
              <Bell className="w-4 h-4 text-[var(--nb-content)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-mono font-bold text-[10px] rounded-full border border-black flex items-center justify-center shadow-sm animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => refreshAllData()}
              disabled={isDataLoading}
              className="nb-btn-icon disabled:opacity-40"
              aria-label="Refresh Data"
            >
              <RefreshCw 
                className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} 
                style={{ color: isDataLoading ? 'var(--nb-accent)' : undefined }} 
              />
            </button>

            {/* Profile */}
            <button
              onClick={() => handleTabChange('profile')}
              className="flex items-center gap-2 h-11 pl-2 pr-3 border-[1.5px] border-[var(--nb-ink)] rounded-md bg-[var(--nb-surface)] shadow-[2px_2px_0_var(--nb-ink)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded overflow-hidden bg-[var(--nb-surface-accent)] flex-shrink-0">
                <img
                  src={currentUser.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${currentUser.rollNumber || currentUser.uid}`}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-[var(--nb-content)] leading-tight truncate max-w-[72px]">{currentUser.name.split(' ')[0]}</p>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded leading-none uppercase inline-block mt-0.5 ${
                  currentUser.role === 'admin' ? 'nb-pill-coral' :
                  currentUser.role === 'president' || currentUser.role === 'associate' ? 'nb-pill-purple' :
                  currentUser.role === 'coordinator' ? 'nb-pill-blue' : 'nb-pill-green'
                }`}>
                  {currentUser.role}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Core View Display */}
      <div 
        className="flex-1 flex flex-col min-h-0 relative w-full overflow-hidden" 
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex-1 flex flex-col min-h-0 w-full max-w-6xl mx-auto">
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <Outlet />
          </React.Suspense>
        </div>
      </div>

      {/* Floating Dock Navigation Bar */}
      <FloatingDockNav
        activeTab={currentTab}
        onTabChange={handleTabChange}
        isOffline={!isOnline}
      />

      {/* Notification Inbox Slide-over Drawer */}
      <NotificationInboxDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        currentUserId={currentUser?.uid || ''}
        activeTenantId={activeTenantId || ''}
      />
    </div>
  );
};
