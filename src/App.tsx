import React, { useState, useEffect, useMemo } from 'react';
import { 
  Routes, 
  Route, 
  Navigate, 
  useLocation, 
  useNavigate, 
  useParams,
  useSearchParams 
} from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { onSnapshot, collection, doc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { db, auth, fetchUserById } from './firebase';
import { 
  UserProfile, 
  DepartmentEvent, 
  EventRegistration, 
  Album, 
  Announcement, 
  AppConfig, 
  DEFAULT_SUPPORT_INFO, 
  AppBranding, 
  DEFAULT_BRANDING, 
  Tenant, 
  SUPER_ADMIN_EMAILS 
} from './types';
import BrandLogo, { ACCENT_THEMES } from './components/BrandLogo';
import { resolveTenantTheme, applyTenantTheme } from './utils/themePresets';
import { 
  fetchUsers, 
  fetchStaffUsers,
  fetchEvents, 
  fetchRegistrations, 
  fetchRegistrationsByStudent,
  subscribeToRegistrations,
  subscribeToStudentRegistrations,
  fetchAlbums, 
  fetchAnnouncements, 
  getAppConfig,
  seedDatabaseIfEmpty,
  getTenant
} from './firebase';
import { isSessionExpired, recordUserActivity, clearUserSession } from './utils/auth';

import { PWAUpdateToast } from './components/PWAUpdateToast';
import { TenantContext, TenantContextType } from './context/TenantContext';
import { TenantLayout, ViewLoadingFallback } from './layouts/TenantLayout';

// Lazy-Loaded Route Pages for Optimal Code-Splitting
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const EventsPage = React.lazy(() => import('./pages/EventsPage'));
const GalleryPage = React.lazy(() => import('./pages/GalleryPage'));
const AnnouncementsPage = React.lazy(() => import('./pages/AnnouncementsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const MembersPage = React.lazy(() => import('./pages/MembersPage'));
const AssociatesPage = React.lazy(() => import('./pages/AssociatesPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));

// Lazy Loaded Specialized Views
const LoginView = React.lazy(() => import('./components/LoginView'));
const FirstTimeSetupView = React.lazy(() => import('./components/FirstTimeSetupView'));
const SuperAdminDashboard = React.lazy(() => import('./components/SuperAdminDashboard'));
const CertificateVerificationModal = React.lazy(() => import('./components/CertificateVerificationModal'));

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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Route URL Segments
  const segments = useMemo(() => {
    return location.pathname.split('/').filter(Boolean);
  }, [location.pathname]);

  const isVerifyRoute = segments[0] === 'verify';
  const verifyCertId = isVerifyRoute ? (segments[1] || searchParams.get('id') || '') : '';

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

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('notx_user', JSON.stringify(currentUser));
    } else {
      clearUserSession();
    }
  }, [currentUser]);

  // Synchronize Firebase Auth state with React user profile session
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (!currentUser) {
          try {
            const profile = await fetchUserById(fbUser.uid);
            if (profile) {
              if (profile.password) delete profile.password;
              recordUserActivity();
              setCurrentUser(profile);
            }
          } catch (e) {
            console.warn('Silent auth rehydration note:', e);
          }
        }
      } else {
        if (currentUser) {
          setCurrentUser(null);
          clearUserSession();
        }
      }
    });

    return () => unsubAuth();
  }, [currentUser]);

  // 24-Hour Session Inactivity Monitor & Auto-Logout
  useEffect(() => {
    if (!currentUser) return;

    let lastRecorded = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 60000) {
        lastRecorded = now;
        recordUserActivity();
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

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

  // Detect tenant prefix from route if present e.g. /:tenantId/*
  useEffect(() => {
    const reservedRoutes = ['login', 'superadmin', 'verify', 'setup', 'events', 'gallery', 'announcements', 'profile', 'members', 'associates', 'associate', 'contact', 'admin', 'home'];
    if (segments.length > 0 && !reservedRoutes.includes(segments[0])) {
      const urlTenant = segments[0];
      if (urlTenant !== activeTenantId) {
        setActiveTenantId(urlTenant);
        refreshAllData(urlTenant);
      }
    }
  }, [segments, activeTenantId]);

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
  
  // App states
  const [isBooting, setIsBooting] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DepartmentEvent | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({ 
    supportInfo: DEFAULT_SUPPORT_INFO,
    branding: DEFAULT_BRANDING
  });

  // Unified reactive branding
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

  // Resolve dynamic tenant theme config
  const tenantTheme = useMemo(() => {
    return resolveTenantTheme(currentBranding);
  }, [currentBranding]);

  useEffect(() => {
    applyTenantTheme(tenantTheme);
  }, [tenantTheme, theme]);

  // Real-time tenant-scoped appConfig sync
  useEffect(() => {
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

  // Dynamically update document title and favicon
  useEffect(() => {
    const brandName = currentBranding.appName || 'NOTX';
    const tag = currentBranding.tagline ? ` ${currentBranding.tagline}` : ' Connect';
    const tenantPrefix = activeTenant?.name ? `${activeTenant.name} • ` : '';
    const subtitle = currentBranding.subtitle ? ` • ${currentBranding.subtitle}` : '';
    document.title = `${tenantPrefix}${brandName}${tag}${subtitle}`;

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

  // Real-time user synchronization (tenant-scoped)
  useEffect(() => {
    if (!currentUser) {
      setAllUsers([]);
      return;
    }

    const cleanActiveTid = activeTenantId ? activeTenantId.trim().toLowerCase() : '';
    const canViewAllTenantUsers = currentUser.isSuperAdmin || 
      currentUser.role === 'admin' || 
      currentUser.role === 'associate' || 
      currentUser.role === 'coordinator' || 
      currentUser.role === 'president';

    if (!canViewAllTenantUsers) {
      // For students, synchronize only their own user profile document - eliminates downloading full user directory
      const unsubSelf = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const updatedSelf = docSnap.data() as UserProfile;
          const hasChanged = JSON.stringify(updatedSelf) !== JSON.stringify(currentUser);
          if (hasChanged) {
            setCurrentUser(updatedSelf);
            localStorage.setItem('notx_user', JSON.stringify(updatedSelf));
          }
        }
      }, (error) => {
        console.warn("Student user listener note:", error);
      });
      return () => unsubSelf();
    }

    const usersQuery = cleanActiveTid && !currentUser.isSuperAdmin
      ? query(collection(db, 'users'), where('tenantId', '==', cleanActiveTid))
      : collection(db, 'users');

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const allRawUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        allRawUsers.push(docSnap.data() as UserProfile);
      });
      const tenantUsers = allRawUsers.filter(u => {
        if (cleanActiveTid && u.tenantId && u.tenantId.trim().toLowerCase() !== cleanActiveTid) return false;
        if (u.isSuperAdmin || u.uid === 'admin_master') return false;
        if (u.email && SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.trim().toLowerCase())) return false;
        return true;
      });

      setAllUsers(tenantUsers);
      
      const updatedSelf = tenantUsers.find(u => u.uid === currentUser.uid);
      if (updatedSelf) {
        const hasChanged = JSON.stringify(updatedSelf) !== JSON.stringify(currentUser);
        if (hasChanged) {
          setCurrentUser(updatedSelf);
          localStorage.setItem('notx_user', JSON.stringify(updatedSelf));
        }
      }
    }, (error) => {
      console.warn("Realtime user listener note:", error);
    });

    return () => unsubscribeUsers();
  }, [currentUser?.uid, activeTenantId, currentUser?.role, currentUser?.isSuperAdmin]);

  // Realtime registrations sync (tenant-wide for admins, personal-only for students)
  useEffect(() => {
    if (!currentUser) {
      setRegistrations([]);
      return;
    }

    const canViewAllTenantUsers = currentUser.isSuperAdmin || 
      currentUser.role === 'admin' || 
      currentUser.role === 'associate' || 
      currentUser.role === 'coordinator' || 
      currentUser.role === 'president';

    if (canViewAllTenantUsers) {
      const unsubscribeRegs = subscribeToRegistrations((freshRegistrations) => {
        setRegistrations(freshRegistrations);
      }, activeTenantId);
      return () => unsubscribeRegs();
    } else {
      const unsubscribeRegs = subscribeToStudentRegistrations(
        currentUser.uid,
        currentUser.rollNumber,
        (freshRegistrations) => {
          setRegistrations(freshRegistrations);
        }
      );
      return () => unsubscribeRegs();
    }
  }, [currentUser?.uid, currentUser?.rollNumber, currentUser?.role, currentUser?.isSuperAdmin, activeTenantId]);

  const refreshAllData = async (tenantIdToFetch?: string) => {
    setIsDataLoading(true);
    try {
      const tId = tenantIdToFetch !== undefined ? tenantIdToFetch : activeTenantId;
      const canViewAllTenantUsers = Boolean(
        currentUser?.isSuperAdmin || 
        currentUser?.role === 'admin' || 
        currentUser?.role === 'associate' || 
        currentUser?.role === 'coordinator' || 
        currentUser?.role === 'president'
      );

      const [u, e, r, g, a, config, tenantData] = await Promise.all([
        canViewAllTenantUsers ? fetchUsers(tId) : fetchStaffUsers(tId),
        fetchEvents(tId),
        canViewAllTenantUsers 
          ? fetchRegistrations(tId) 
          : (currentUser ? fetchRegistrationsByStudent(currentUser.uid) : Promise.resolve([])),
        fetchAlbums(tId),
        fetchAnnouncements(tId),
        getAppConfig(tId),
        getTenant(tId)
      ]);
      setAllUsers(u);
      setEvents(e);
      setRegistrations(r);
      setAlbums(g);
      setAnnouncements(a);
      
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

      if (currentUser) {
        const freshUser = u.find(user => user.uid === currentUser.uid);
        if (freshUser) {
          setCurrentUser(freshUser);
          localStorage.setItem('notx_user', JSON.stringify(freshUser));
        } else if (!canViewAllTenantUsers) {
          const selfProfile = await fetchUserById(currentUser.uid);
          if (selfProfile) {
            setCurrentUser(selfProfile);
            localStorage.setItem('notx_user', JSON.stringify(selfProfile));
          }
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
    const targetTenant = user.tenantId || activeTenantId;
    if (user.tenantId) {
      setActiveTenantId(user.tenantId);
      localStorage.setItem('notx_active_tenant', user.tenantId);
    }
    const isSuper = user.isSuperAdmin || SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (isSuper) {
      setIsOverseeingTenant(false);
      navigate('/superadmin');
    } else {
      const target = targetTenant ? `/${targetTenant}` : '/';
      navigate(target);
    }
    refreshAllData(targetTenant);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out note:', e);
    }
    setCurrentUser(null);
    setIsOverseeingTenant(false);
    clearUserSession();
    localStorage.removeItem('notx_is_overseeing');
    navigate('/');
  };

  // Provide unified tenant context
  const contextValue: TenantContextType = {
    currentUser: currentUser!,
    setCurrentUser,
    activeTenantId,
    activeTenant,
    currentBranding,
    appConfig,
    setAppConfig,
    events,
    registrations,
    albums,
    announcements,
    allUsers,
    refreshAllData,
    isDataLoading,
    onLogout: handleLogout,
    selectedEvent,
    setSelectedEvent
  };

  if (isBooting && !currentUser) {
    const brandName = currentBranding.appName || 'NOTX';
    const brandTag = currentBranding.tagline || 'Connect';
    return (
      <div className="h-full w-full bg-[var(--nb-bg)] flex flex-col items-center justify-center p-6 text-center select-none">
        <BrandLogo branding={currentBranding} size="xl" className="mb-6" />
        <h2 className="nb-headline text-3xl text-[var(--nb-content)]">
          {brandName} <span style={{ fontWeight: 500 }}>{brandTag}</span>
        </h2>
        <p className="nb-label mt-1" style={{ color: 'var(--nb-tertiary)' }}>
          {currentBranding.subtitle || 'Multi-Tenant Academic Association Platform'}
        </p>
        <div className="mt-8 flex items-center gap-2 px-4 py-2 border border-[var(--nb-divider)] rounded-md bg-[var(--nb-surface)] shadow-[2px_2px_0_var(--nb-ink)]">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--nb-accent)' }} />
          <span className="nb-label font-mono font-bold text-xs" style={{ color: 'var(--nb-secondary)' }}>
            {brandName.toUpperCase()} • LOADING...
          </span>
        </div>
      </div>
    );
  }

  // Public Certificate Verification Route (Available authenticated or unauthenticated)
  if (isVerifyRoute) {
    return (
      <React.Suspense fallback={<ViewLoadingFallback />}>
        <CertificateVerificationModal
          isOpen={true}
          onClose={() => navigate(currentUser ? (activeTenantId ? `/${activeTenantId}` : '/') : '/')}
          initialId={verifyCertId}
          template={appConfig?.certificateTemplate}
          activeTenant={activeTenant}
        />
      </React.Suspense>
    );
  }

  // Public routes accessible without auth — check before auth gate
  if (!currentUser) {
    const publicPath = location.pathname.toLowerCase();
    // /associates or /associate or /:tenantId/associates — all public
    if (
      publicPath === '/associates' ||
      publicPath === '/associate' ||
      publicPath.endsWith('/associates') ||
      publicPath.endsWith('/associate')
    ) {
      return (
        <React.Suspense fallback={<ViewLoadingFallback />}>
          <AssociatesPage />
        </React.Suspense>
      );
    }

    // Unauthenticated -> Show Login
    return (
      <>
        <PWAUpdateToast />
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
      </>
    );
  }

  // First time login setup requirement
  if (currentUser.isFirstLogin) {
    return (
      <>
        <PWAUpdateToast />
        <React.Suspense fallback={<ViewLoadingFallback />}>
          <FirstTimeSetupView 
            user={currentUser} 
            onComplete={(updatedUser) => setCurrentUser(updatedUser)} 
          />
        </React.Suspense>
      </>
    );
  }

  // Super Admin Control Center
  const isSuperAdmin = currentUser.isSuperAdmin || SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
  if (isSuperAdmin && !isOverseeingTenant && location.pathname === '/superadmin') {
    return (
      <>
        <PWAUpdateToast />
        <React.Suspense fallback={<ViewLoadingFallback />}>
          <SuperAdminDashboard
            currentUser={currentUser}
            onEnterTenant={(tId) => {
              setActiveTenantId(tId);
              setIsOverseeingTenant(true);
              refreshAllData(tId);
              navigate(`/${tId}`);
            }}
            onLogout={handleLogout}
          />
        </React.Suspense>
      </>
    );
  }

  return (
    <>
      <PWAUpdateToast />
      <TenantContext.Provider value={contextValue}>
        <Routes>
          {/* Superadmin route */}
          <Route path="/superadmin" element={
            isSuperAdmin ? (
              <React.Suspense fallback={<ViewLoadingFallback />}>
                <SuperAdminDashboard
                  currentUser={currentUser}
                  onEnterTenant={(tId) => {
                    setActiveTenantId(tId);
                    setIsOverseeingTenant(true);
                    refreshAllData(tId);
                    navigate(`/${tId}`);
                  }}
                  onLogout={handleLogout}
                />
              </React.Suspense>
            ) : (
              <Navigate to={activeTenantId ? `/${activeTenantId}` : '/'} replace />
            )
          } />

          {/* Public ID Badges / Associates Showcase (Zero Auth Required) */}
          <Route 
            path="/associates" 
            element={
              <React.Suspense fallback={<ViewLoadingFallback />}>
                <AssociatesPage />
              </React.Suspense>
            } 
          />
          <Route path="/associate" element={<Navigate to="/associates" replace />} />

          {/* Tenant-scoped routes */}
          <Route 
            path="/:tenantId" 
            element={
              <TenantLayout 
                isOnline={isOnline} 
                isOverseeingTenant={isOverseeingTenant} 
                setIsOverseeingTenant={setIsOverseeingTenant} 
              />
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="home" element={<DashboardPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:eventId" element={<EventsPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="associates" element={<AssociatesPage />} />
            <Route path="associate" element={<Navigate to="associates" replace />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          {/* Root fallback routes (inherits activeTenantId) */}
          <Route 
            path="/" 
            element={
              <TenantLayout 
                isOnline={isOnline} 
                isOverseeingTenant={isOverseeingTenant} 
                setIsOverseeingTenant={setIsOverseeingTenant} 
              />
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="home" element={<DashboardPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:eventId" element={<EventsPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="associates" element={<AssociatesPage />} />
            <Route path="associate" element={<Navigate to="associates" replace />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={activeTenantId ? `/${activeTenantId}` : '/'} replace />} />
        </Routes>
      </TenantContext.Provider>
    </>
  );
}
