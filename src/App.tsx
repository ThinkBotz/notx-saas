import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home as HomeIcon, 
  Calendar, 
  Image as GalleryIcon, 
  Volume2, 
  User as UserIcon, 
  Bell, 
  Sparkles, 
  Users, 
  PhoneCall, 
  HelpCircle,
  Loader2,
  Cpu,
  MessageSquare, RefreshCw, AlertTriangle
} from 'lucide-react';

import { onSnapshot, collection, doc, query, where } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, rtdb } from './firebase';
import { UserProfile, DepartmentEvent, EventRegistration, Album, Announcement, UserInvitation, ChatRoom, AppConfig, SupportInfo, DEFAULT_SUPPORT_INFO, AppBranding, DEFAULT_BRANDING, Tenant, SUPER_ADMIN_EMAILS } from './types';
import BrandLogo, { ACCENT_THEMES, getCssAccent, getCssAccentFg } from './components/BrandLogo';
import { resolveTenantTheme, applyTenantTheme } from './utils/themePresets';
import { 
  fetchUsers, 
  fetchEvents, 
  fetchRegistrations, 
  subscribeToRegistrations,
  fetchAlbums, 
  fetchAnnouncements, 
  fetchReceivedInvitations,
  getAppConfig,
  seedDatabaseIfEmpty,
  getTenant,
  deleteUserProfile
} from './firebase';
import { isSessionExpired, recordUserActivity, clearUserSession } from './utils/auth';

// Views
import DashboardView from './components/DashboardView';
import SuperAdminDashboard from './components/SuperAdminDashboard';

// Optimized Lazy-Loaded Views for Code-Splitting
const LoginView = React.lazy(() => import('./components/LoginView'));
const FirstTimeSetupView = React.lazy(() => import('./components/FirstTimeSetupView'));
const EventsView = React.lazy(() => import('./components/EventsView'));
const GalleryView = React.lazy(() => import('./components/GalleryView'));
const AnnouncementsView = React.lazy(() => import('./components/AnnouncementsView'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const AdminPanelView = React.lazy(() => import('./components/AdminPanelView'));
const MembersView = React.lazy(() => import('./components/MembersView'));
const ContactView = React.lazy(() => import('./components/ContactView'));
const MessagesView = React.lazy(() => import('./components/MessagesView'));

const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[280px] gap-3">
    <Loader2 className="w-6 h-6 text-[var(--nb-accent)] animate-spin" />
    <span className="nb-label">Loading…</span>
  </div>
);

import { PWAInstallButton } from './components/PWAInstallButton';
import { PWAUpdateToast } from './components/PWAUpdateToast';
import FloatingDockNav from './components/FloatingDockNav';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="nb-offline-bar flex items-center justify-center gap-1.5">
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>Offline Mode Active</span>
    </div>
  );
};

export default function App() {
  const isOnline = useOnlineStatus();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('notx_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('notx_theme', theme);
    const themeColor = theme === 'dark' ? '#111111' : '#F5F0EB';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (isSessionExpired()) {
      clearUserSession();
      return null;
    }
    const storedUser = localStorage.getItem('notx_user');
    if (storedUser) {
      try {
        recordUserActivity();
        return JSON.parse(storedUser) as UserProfile;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('notx_active_tab') || 'home';
  });

  useEffect(() => {
    localStorage.setItem('notx_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('notx_user', JSON.stringify(currentUser));
    } else {
      clearUserSession();
    }
  }, [currentUser]);

  // 24-Hour Session Inactivity Monitor & Auto-Logout
  useEffect(() => {
    if (!currentUser) return;

    let lastRecorded = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Throttle recording to once every 60 seconds
      if (now - lastRecorded > 60000) {
        lastRecorded = now;
        recordUserActivity();
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    // Check expiration every minute
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        handleLogout();
        alert('Your session has expired due to 24 hours of inactivity. Please log in again.');
      }
    }, 60000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      clearInterval(interval);
    };
  }, [currentUser]);

  // Automatic database seeding on fresh project
  useEffect(() => {
    seedDatabaseIfEmpty().catch(err => console.error("Database seeding check:", err));
  }, []);

  // Multi-Tenant States
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('tenant') || urlParams.get('t');
    if (fromUrl) {
      localStorage.setItem('notx_active_tenant', fromUrl);
      return fromUrl;
    }
    return localStorage.getItem('notx_active_tenant') || '';
  });

  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);

  const [isOverseeingTenant, setIsOverseeingTenant] = useState<boolean>(() => {
    return localStorage.getItem('notx_is_overseeing') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('notx_active_tenant', activeTenantId);
  }, [activeTenantId]);

  useEffect(() => {
    localStorage.setItem('notx_is_overseeing', String(isOverseeingTenant));
  }, [isOverseeingTenant]);

  // Keep active tenant data and branding synchronized in real-time across all devices
  useEffect(() => {
    if (!activeTenantId) return;
    const cleanId = activeTenantId.trim().toLowerCase();
    const unsubscribeTenant = onSnapshot(doc(db, 'tenants', cleanId), (docSnap) => {
      if (docSnap.exists()) {
        const t = docSnap.data() as Tenant;
        setActiveTenant(t);
        if (t.branding) {
          setAppConfig(prev => ({
            ...prev,
            branding: t.branding,
            supportInfo: t.supportInfo || prev.supportInfo
          }));
        }
      }
    }, (error) => {
      console.warn("Realtime tenant sync note:", error);
    });

    return () => unsubscribeTenant();
  }, [activeTenantId]);

  // Firestore States
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<DepartmentEvent[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<UserInvitation[]>([]);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  
  // App states
  const [isBooting, setIsBooting] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DepartmentEvent | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [messageTargetRoll, setMessageTargetRoll] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({ 
    isChatEnabled: false,
    supportInfo: DEFAULT_SUPPORT_INFO,
    branding: DEFAULT_BRANDING
  });

  // Unified reactive branding: merge activeTenant and appConfig branding, prioritizing the newest update
  const currentBranding = useMemo<AppBranding>(() => {
    const tenantBrand = activeTenant?.branding;
    const configBrand = appConfig.branding;
    if (!tenantBrand && !configBrand) return DEFAULT_BRANDING;
    if (!tenantBrand) return configBrand!;
    if (!configBrand) return tenantBrand;

    const tenantTime = tenantBrand.updatedAt ? new Date(tenantBrand.updatedAt).getTime() : 0;
    const configTime = configBrand.updatedAt ? new Date(configBrand.updatedAt).getTime() : 0;
    const preferred = configTime >= tenantTime ? configBrand : tenantBrand;

    return {
      ...DEFAULT_BRANDING,
      ...tenantBrand,
      ...configBrand,
      ...preferred,
      logoType: (configBrand.logoType === 'custom' || tenantBrand.logoType === 'custom') ? 'custom' : preferred.logoType,
      logoImageUrl: configBrand.logoImageUrl || tenantBrand.logoImageUrl || ''
    };
  }, [activeTenant?.branding, appConfig.branding]);
  const currentTheme = ACCENT_THEMES[currentBranding.accentColor || 'indigo'] || ACCENT_THEMES.indigo;

  // Resolve dynamic tenant theme config (heroBg, heroFg, accent, subtleBg, etc.)
  const tenantTheme = useMemo(() => {
    return resolveTenantTheme(currentBranding);
  }, [currentBranding]);

  // Inject dynamic tenant theme and accent CSS variables into document.documentElement
  // Ensures all --tenant-* and --nb-accent properties persist and adapt across light/dark modes
  useEffect(() => {
    applyTenantTheme(tenantTheme);
  }, [tenantTheme, theme]);

  // Keep app config, branding, and support info synchronized in real-time across all devices (per-tenant)
  useEffect(() => {
    // Use the tenant-scoped config subscription from firebase.ts
    const unsubscribeConfig = onSnapshot(doc(db, 'appSettings', `config_${activeTenantId}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        if (!data.supportInfo) {
          data.supportInfo = DEFAULT_SUPPORT_INFO;
        }
        if (!data.branding) {
          data.branding = DEFAULT_BRANDING;
        }
        setAppConfig(data);
      }
    }, (error) => {
      console.error("Realtime config sync error:", error);
    });

    return () => unsubscribeConfig();
  }, [activeTenantId]);

  // Dynamically update document title and favicon based on admin branding and active tenant
  useEffect(() => {
    const brandName = currentBranding.appName || 'NOTX';
    const tag = currentBranding.tagline ? ` ${currentBranding.tagline}` : ' Connect';
    const tenantPrefix = activeTenant?.name ? `${activeTenant.name} • ` : '';
    const subtitle = currentBranding.subtitle ? ` • ${currentBranding.subtitle}` : '';
    document.title = `${tenantPrefix}${brandName}${tag}${subtitle}`;

    // Update favicon if custom logo image exists
    if (currentBranding.logoType === 'custom' && currentBranding.logoImageUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = currentBranding.logoImageUrl;
    }
  }, [currentBranding, activeTenant?.name]);

  // Initialize and Seed Database
  useEffect(() => {
    async function initializeApp() {
      try {
        setIsDataLoading(true);
        await refreshAllData();
      } catch (err) {
        console.error("Initialization failed: ", err);
      } finally {
        setIsDataLoading(false);
        setIsBooting(false);
      }
    }
    initializeApp();
  }, []);

  const lastRefreshTimeRef = React.useRef<number>(Date.now());

  // Throttled refresh on tab navigation to prevent redundant Firestore queries
  useEffect(() => {
    if (currentUser && !isBooting) {
      const now = Date.now();
      if (now - lastRefreshTimeRef.current > 45000) {
        lastRefreshTimeRef.current = now;
        refreshAllData();
      }
    }
  }, [activeTab]);

  // Keep users synchronized in real-time across all devices (tenant-scoped)
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allRawUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        allRawUsers.push(docSnap.data() as UserProfile);
      });
      // Filter to users belonging to the active tenant (strictly excluding global super admins & admin_master)
      const cleanActiveTid = activeTenantId ? activeTenantId.trim().toLowerCase() : '';
      const tenantUsers = allRawUsers.filter(u => {
        if (cleanActiveTid && u.tenantId && u.tenantId.trim().toLowerCase() !== cleanActiveTid) return false;
        if (u.isSuperAdmin || u.uid === 'admin_master') return false;
        if (u.email && SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.trim().toLowerCase())) return false;
        return true;
      });

      // Deduplicate placeholder admin from memory if authentic admin exists (non-destructive)
      const adminUsers = tenantUsers.filter(u => u.role === 'admin');
      const realAdmin = adminUsers.find(u => !u.uid.startsWith('admin_'));
      const placeholderAdmin = adminUsers.find(u => u.uid.startsWith('admin_'));

      let finalUsers = tenantUsers;
      if (realAdmin && placeholderAdmin) {
        finalUsers = tenantUsers.filter(u => u.uid !== placeholderAdmin.uid);
      }

      setAllUsers(finalUsers);

      if (currentUser) {
        const freshUser = allRawUsers.find(u => u.uid === currentUser.uid);
        if (freshUser) {
          setCurrentUser(freshUser);
          localStorage.setItem('notx_user', JSON.stringify(freshUser));
        }
      }
    }, (error) => {
      console.error("Realtime users sync error:", error);
    });

    return () => unsubscribeUsers();
  }, [currentUser?.uid, activeTenantId]);

  // Keep registrations and attendance synchronized in real-time across all devices (tenant-scoped)
  useEffect(() => {
    if (!activeTenantId) {
      setRegistrations([]);
      return;
    }
    const unsubscribeRegistrations = subscribeToRegistrations((freshRegistrations) => {
      setRegistrations(freshRegistrations);
    }, activeTenantId);

    return () => unsubscribeRegistrations();
  }, [activeTenantId]);

  useEffect(() => {
    if (!currentUser?.rollNumber) return;
    const userRoll = currentUser.rollNumber.trim().toUpperCase();
    const chatsPath = activeTenantId ? `chats/${activeTenantId.trim().toLowerCase()}` : 'chats';
    const chatsRef = ref(rtdb, chatsPath);

    const unsubscribe = onValue(chatsRef, (snapshot) => {
      let unread = 0;
      const val = snapshot.val() || {};
      Object.values(val).forEach((roomAny: any) => {
        const room = roomAny as {
          participants?: string[];
          messages?: Record<string, UserInvitation> | UserInvitation[];
        };
        const participants = Array.isArray(room.participants) ? room.participants : [];
        if (!participants.some(p => p.toUpperCase() === userRoll)) return;

        let rawMsgs: UserInvitation[] = [];
        if (Array.isArray(room.messages)) {
          rawMsgs = room.messages;
        } else if (room.messages && typeof room.messages === 'object') {
          rawMsgs = Object.values(room.messages);
        }
        unread += rawMsgs.filter(m => m.recipientRoll?.toUpperCase() === userRoll && m.type === 'chat' && !m.isRead).length;
      });
      setUnreadChatsCount(unread);
    });
    return () => unsubscribe();
  }, [currentUser?.rollNumber, activeTenantId]);

  const refreshAllData = async (targetTenantId?: string) => {
    const tId = targetTenantId || activeTenantId;
    try {
      setIsDataLoading(true);
      
      const invitesPromise = (currentUser && currentUser.rollNumber) 
        ? fetchReceivedInvitations(currentUser.rollNumber, tId) 
        : Promise.resolve([]);

      const [u, e, r, g, a, invites, config, tenantData] = await Promise.all([
        fetchUsers(tId),
        fetchEvents(tId),
        fetchRegistrations(tId),
        fetchAlbums(tId),
        fetchAnnouncements(tId),
        invitesPromise,
        getAppConfig(tId),
        getTenant(tId)
      ]);
      setAllUsers(u);
      setEvents(e);
      setRegistrations(r);
      setAlbums(g);
      setAnnouncements(a);
      setReceivedInvitations(invites || []);
      
      if (tenantData) {
        setActiveTenant(tenantData);
        if (tenantData.branding) {
          setAppConfig({
            ...config,
            branding: tenantData.branding,
            supportInfo: tenantData.supportInfo || config.supportInfo
          });
        } else {
          setAppConfig(config);
        }
      } else {
        setAppConfig(config);
      }

      // If currentUser is logged in, refresh their profile state as well
      if (currentUser) {
        const freshUser = u.find(user => user.uid === currentUser.uid);
        if (freshUser) {
          setCurrentUser(freshUser);
          localStorage.setItem('notx_user', JSON.stringify(freshUser));
        }
      }
    } catch (err) {
      console.error("Data refresh failed: ", err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('notx_user', JSON.stringify(user));
    if (user.tenantId) {
      setActiveTenantId(user.tenantId);
      localStorage.setItem('notx_active_tenant', user.tenantId);
    }
    const isSuper = user.isSuperAdmin || SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (isSuper) {
      setIsOverseeingTenant(false);
    }
    setActiveTab('home');
    refreshAllData(user.tenantId || activeTenantId);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsOverseeingTenant(false);
    clearUserSession();
    localStorage.removeItem('notx_is_overseeing');
    setActiveTab('home');
  };

  const selectEventFromDashboard = (event: DepartmentEvent) => {
    setSelectedEvent(event);
    setActiveTab('events');
  };

  if (isBooting && !currentUser) {
    return (
      <div className="h-full w-full bg-[var(--nb-bg)] flex flex-col items-center justify-center p-6 text-center select-none">
        {/* Brand badge */}
        <BrandLogo branding={currentBranding} size="xl" className="mb-6" />

        <h2 className="nb-headline text-3xl text-[var(--nb-content)]">
          {currentBranding.appName || 'NOTX'}
        </h2>
        <p className="nb-label mt-1" style={{ color: 'var(--nb-tertiary)' }}>
          {currentBranding.tagline || 'Connect'}
          {currentBranding.subtitle ? ` · ${currentBranding.subtitle}` : ''}
        </p>

        {/* Loading row */}
        <div className="mt-8 flex items-center gap-2 px-4 py-2 border border-[var(--nb-divider)] rounded-md bg-[var(--nb-surface)]">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--nb-accent)' }} />
          <span className="nb-label" style={{ color: 'var(--nb-secondary)' }}>Syncing Cloud Services</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <PWAUpdateToast />
      {!currentUser ? (
        <React.Suspense fallback={<ViewLoadingFallback />}>
          <LoginView 
            branding={currentBranding}
            activeTenantId={activeTenantId}
            onSelectTenant={(tId) => {
              setActiveTenantId(tId);
              refreshAllData(tId);
            }}
            onLoginSuccess={handleLoginSuccess} 
            allUsers={allUsers}
            refreshUsers={() => refreshAllData(activeTenantId)}
          />
        </React.Suspense>
      ) : (currentUser.isSuperAdmin || SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) && !isOverseeingTenant ? (
        <SuperAdminDashboard
          currentUser={currentUser}
          onEnterTenant={(tId) => {
            setActiveTenantId(tId);
            setIsOverseeingTenant(true);
            refreshAllData(tId);
          }}
          onLogout={handleLogout}
        />
      ) : currentUser.isFirstLogin ? (
        <React.Suspense fallback={<ViewLoadingFallback />}>
          <FirstTimeSetupView 
            user={currentUser} 
            onComplete={(updatedUser) => setCurrentUser(updatedUser)} 
          />
        </React.Suspense>
      ) : (
        /* Authenticated Application shell */
        <div className="h-full w-full flex flex-col bg-[var(--nb-bg)] text-[var(--nb-content)] overflow-hidden">

          {/* Super Admin Floating Oversight Bar */}
          {(currentUser.isSuperAdmin || SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) && isOverseeingTenant && (
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

          {/* ── Top Header ── flat, no blur, 2px ink border-bottom */}
          <header
            className="bg-[var(--nb-surface)] border-b-2 border-[var(--nb-ink)] px-4 sm:px-6 flex justify-center items-center flex-shrink-0 z-40 select-none"
            style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))', paddingBottom: '8px' }}
          >
            <div className="w-full max-w-6xl flex justify-between items-center gap-3 min-w-0">

              {/* Brand wordmark */}
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                title={`${currentBranding.appName || 'NOTX'} ${currentBranding.tagline || 'Connect'}`}
              >
                <BrandLogo branding={currentBranding} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-nowrap">
                    <h1 className="nb-headline text-base sm:text-lg text-[var(--nb-content)] truncate">
                      {currentBranding.appName || 'NOTX'}
                    </h1>
                    {activeTenant ? (
                      <span className={`${tenantTheme.previewBadgeClass || 'nb-pill-cyan'} text-[9.5px] font-mono font-bold inline-flex items-center gap-1 shadow-[1.5px_1.5px_0_var(--nb-ink)] max-w-[120px] sm:max-w-[200px] truncate`} title={`Department: ${activeTenant.name}`}>
                        <span className="truncate">{activeTenant.shortCode || activeTenant.name}</span>
                      </span>
                    ) : currentBranding.subtitle ? (
                      <span className={`${tenantTheme.previewBadgeClass || 'nb-pill-yellow'} text-[9.5px] font-mono font-bold hidden sm:inline-flex shadow-[1.5px_1.5px_0_var(--nb-ink)] max-w-[160px] truncate`}>
                        <span className="truncate">{currentBranding.subtitle}</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="nb-label text-[10px] mt-0.5 truncate" style={{ color: 'var(--nb-tertiary)' }}>
                    {currentBranding.tagline ? `${currentBranding.tagline} Portal` : 'Association Ecosystem'}
                  </p>
                </div>
              </button>

              {/* Right controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <PWAInstallButton />

                {/* Refresh */}
                <button
                  onClick={() => refreshAllData()}
                  disabled={isDataLoading}
                  className="nb-btn-icon disabled:opacity-40"
                  aria-label="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} style={{ color: isDataLoading ? 'var(--nb-accent)' : undefined }} />
                </button>


                {/* Profile */}
                <button
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2 h-11 pl-2 pr-3 border-[1.5px] border-[var(--nb-ink)] rounded-md bg-[var(--nb-surface)] shadow-[2px_2px_0_var(--nb-ink)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded overflow-hidden border-[1.5px] border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] flex-shrink-0">
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
          <div className="flex-1 flex flex-col min-h-0 relative w-full overflow-hidden" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex-1 flex flex-col min-h-0 w-full max-w-6xl mx-auto">
            <React.Suspense fallback={<ViewLoadingFallback />}>
            {activeTab === 'home' && (
              <DashboardView 
                user={currentUser}
                allUsers={allUsers}
                events={events}
                announcements={announcements}
                registrations={registrations}
                onNavigate={setActiveTab}
                onSelectEvent={selectEventFromDashboard}
                isLoading={isDataLoading}
                activeTenantId={activeTenantId}
                activeTenant={activeTenant}
                branding={currentBranding}
              />
            )}

            {activeTab === 'events' && (
              <EventsView 
                user={currentUser}
                allUsers={allUsers}
                events={events}
                registrations={registrations}
                refreshEvents={refreshAllData}
                refreshRegistrations={refreshAllData}
                selectedEvent={selectedEvent}
                setSelectedEvent={setSelectedEvent}
                isLoading={isDataLoading}
                activeTenantId={activeTenantId}
                activeTenant={activeTenant}
                branding={currentBranding}
              />
            )}

            {activeTab === 'gallery' && (
              <GalleryView 
                user={currentUser}
                albums={albums}
                refreshData={refreshAllData}
                activeTenantId={activeTenantId}
              />
            )}

            {activeTab === 'announcements' && (
              <AnnouncementsView 
                user={currentUser}
                announcements={announcements}
                refreshAnnouncements={refreshAllData}
                activeTenantId={activeTenantId}
              />
            )}

            {activeTab === 'messages' && (
              appConfig.isChatEnabled ? (
                <MessagesView
                  user={currentUser}
                  allUsers={allUsers}
                  initialTargetRoll={messageTargetRoll}
                  onTargetHandled={() => setMessageTargetRoll(null)}
                  activeTenantId={activeTenantId}
                  activeTenant={activeTenant}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                  <div className="nb-card-tinted w-16 h-16 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8" style={{ color: 'var(--nb-tertiary)' }} />
                  </div>
                  <h3 className="nb-headline text-2xl" style={{ color: 'var(--nb-content)' }}>Chat Disabled</h3>
                  <p className="nb-body max-w-xs" style={{ color: 'var(--nb-secondary)' }}>
                    The peer-to-peer messaging system has been temporarily disabled by the administration.
                  </p>
                  <button onClick={() => setActiveTab('home')} className="nb-btn">
                    Return Home
                  </button>
                </div>
              )
            )}

            {activeTab === 'profile' && (
              <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
                {/* Embedded Profile screen */}
                <ProfileView 
                  user={currentUser}
                  setUser={setCurrentUser}
                  registrations={registrations}
                  events={events}
                  allUsers={allUsers}
                  onLogout={handleLogout}
                  refreshUsers={refreshAllData}
                  onOpenAdminPanel={() => setShowAdminModal(true)}
                  setActiveTab={setActiveTab}
                  supportInfo={appConfig?.supportInfo}
                  branding={currentBranding}
                  isCertificatesEnabled={appConfig?.isCertificatesEnabled ?? true}
                  certificateTemplate={appConfig?.certificateTemplate}
                  onOpenSupportBox={() => setShowContactModal(true)}
                  onOpenMembers={() => setShowMembersModal(true)}
                  onSupportInfoUpdated={(info) => setAppConfig(prev => prev ? ({ ...prev, supportInfo: info }) : null)}
                  activeTenantId={activeTenantId}
                  activeTenant={activeTenant}
                />
              </div>
            )}
            </React.Suspense>
            </div>
          </div>

          {/* Floating Dock Navigation Bar (React Bits Pro Mobile 3 Style) */}
          <FloatingDockNav
            activeTab={activeTab}
            onTabChange={(tabId) => {
              setActiveTab(tabId);
              setSelectedEvent(null);
            }}
            isChatEnabled={false}
            unreadCount={unreadChatsCount}
            pendingInvitesCount={receivedInvitations.filter(i => i.status === 'Pending').length}
            isOffline={!isOnline}
          />

          {/* OVERLAY SLIDING SHEETS / DRAWER MODALS */}
          <React.Suspense fallback={<ViewLoadingFallback />}>
          {showMembersModal && (
            <div className="fixed inset-0 bg-black/55 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6">
              <div className="nb-sheet md:nb-modal max-h-[92dvh] md:max-h-[85vh] h-[92dvh] md:h-auto w-full md:max-w-3xl flex flex-col overflow-hidden">
                {/* Sheet handle */}
                <div className="pt-2.5 pb-0 flex justify-center md:hidden flex-shrink-0">
                  <div className="w-10 h-1 rounded-full bg-[var(--nb-divider)]" />
                </div>
                <div className="p-4 border-b-[1.5px] border-[var(--nb-divider)] flex justify-between items-center flex-shrink-0">
                  <span className="nb-tag">Directory</span>
                  <button
                    onClick={() => setShowMembersModal(false)}
                    className="nb-btn-icon"
                    aria-label="Close"
                  >
                    <span className="text-base font-bold leading-none">✕</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <MembersView allUsers={allUsers} events={events} branding={currentBranding} activeTenant={activeTenant} />
                </div>
              </div>
            </div>
          )}

          {showContactModal && (
            <div className="fixed inset-0 bg-black/55 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6">
              <div className="nb-sheet md:nb-modal max-h-[85dvh] md:max-h-[80vh] h-[85dvh] md:h-auto w-full md:max-w-2xl flex flex-col overflow-hidden">
                <div className="pt-2.5 pb-0 flex justify-center md:hidden flex-shrink-0">
                  <div className="w-10 h-1 rounded-full bg-[var(--nb-divider)]" />
                </div>
                <div className="p-4 border-b-[1.5px] border-[var(--nb-divider)] flex justify-between items-center flex-shrink-0">
                  <span className="nb-tag">Query Desk</span>
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="nb-btn-icon"
                    aria-label="Close"
                  >
                    <span className="text-base font-bold leading-none">✕</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <ContactView
                    user={currentUser}
                    supportInfo={appConfig.supportInfo}
                    onSupportInfoUpdated={(info) => setAppConfig(prev => ({ ...prev, supportInfo: info }))}
                  />
                </div>
              </div>
            </div>
          )}

          {showAdminModal && (
            <AdminPanelView 
              currentUser={currentUser}
              allUsers={allUsers}
              events={events}
              registrations={registrations}
              onClose={() => setShowAdminModal(false)}
              refreshData={refreshAllData}
              activeTenantId={activeTenantId}
              activeTenant={activeTenant}
            />
          )}
          </React.Suspense>

        </div>
      )}
    </>
  );
}
