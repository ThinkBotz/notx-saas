/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  User,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown,
  Layers,
  Sparkles,
  School,
  Zap,
  Award,
  Bell,
  Calendar,
  MapPin,
  Trophy,
  Users,
  X,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { UserProfile, AppBranding, DEFAULT_BRANDING, Tenant, SUPER_ADMIN_EMAILS, DepartmentEvent, EventWinner } from '../types';
import BrandLogo from './BrandLogo';
import { CrowdCanvas } from './ui/skiper-ui/skiper39';
import {
  auth,
  subscribeToTenants,
  findTenantByAdminEmail,
  findUserForLogin,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
  fetchEvents,
  subscribeToEventWinners,
  fetchUsers
} from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { hashPassword, verifyPassword, recordUserActivity } from '../utils/auth';
import { resolveTenantTheme, applyTenantTheme } from '../utils/themePresets';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  allUsers: UserProfile[];
  refreshUsers: () => void;
  branding?: AppBranding;
  activeTenantId?: string;
  onSelectTenant?: (tenantId: string) => void;
}

export default function LoginView({
  onLoginSuccess,
  allUsers,
  refreshUsers,
  branding = DEFAULT_BRANDING,
  activeTenantId = '',
  onSelectTenant
}: LoginViewProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const fromUrl = urlParams?.get('tenant') || urlParams?.get('t');
    return fromUrl || localStorage.getItem('notx_active_tenant') || activeTenantId || '';
  });

  const [rollNumberInput, setRollNumberInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Desktop showcase states
  const [events, setEvents] = useState<DepartmentEvent[]>([]);
  const [winners, setWinners] = useState<EventWinner[]>([]);
  const [showcaseUsers, setShowcaseUsers] = useState<UserProfile[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Subscribe to real-time events, users, and winners for selected tenant showcase
  useEffect(() => {
    let isMounted = true;
    if (selectedTenantId) {
      fetchEvents(selectedTenantId)
        .then((evList) => {
          if (isMounted) setEvents(evList || []);
        })
        .catch((err) => console.warn('Error fetching showcase events:', err));

      fetchUsers(selectedTenantId)
        .then((uList) => {
          if (isMounted && uList) setShowcaseUsers(uList);
        })
        .catch((err) => console.warn('Error fetching showcase users:', err));
    }

    const unsubWinners = subscribeToEventWinners((winList) => {
      if (isMounted) setWinners(winList || []);
    }, selectedTenantId);

    return () => {
      isMounted = false;
      unsubWinners();
    };
  }, [selectedTenantId]);

  // Subscribe to real-time tenants
  useEffect(() => {
    const unsub = subscribeToTenants((list) => {
      setTenants(list);
      const activeTenants = list.filter(t => t.status === 'active');
      if (activeTenants.length > 0) {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const fromUrl = urlParams?.get('tenant') || urlParams?.get('t');

        let targetTenant: Tenant | undefined;
        if (fromUrl) {
          targetTenant = activeTenants.find(
            t => t.tenantId.toLowerCase() === fromUrl.toLowerCase() ||
              t.shortCode?.toLowerCase() === fromUrl.toLowerCase()
          );
        }

        if (!targetTenant && selectedTenantId) {
          targetTenant = activeTenants.find(t => t.tenantId === selectedTenantId);
        }

        const chosen = targetTenant || activeTenants[0];
        setSelectedTenantId(chosen.tenantId);
        if (onSelectTenant) onSelectTenant(chosen.tenantId);
      } else {
        setSelectedTenantId('');
      }
    });
    return () => unsub();
  }, [selectedTenantId, onSelectTenant]);

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    localStorage.setItem('notx_active_tenant', tenantId);
    if (onSelectTenant) {
      onSelectTenant(tenantId);
    }
  };

  const selectedTenant = tenants.find(t => t.tenantId === selectedTenantId) || tenants[0];
  const currentTheme = resolveTenantTheme(selectedTenant?.branding || branding);

  // Apply tenant theme to root CSS variables for dynamic live adaptation
  useEffect(() => {
    if (currentTheme) {
      applyTenantTheme(currentTheme);
    }
  }, [currentTheme]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumberInput || !password) {
      setError('Please enter both your Roll Number and Password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if selected tenant is deactivated
      if (selectedTenant && selectedTenant.status === 'inactive') {
        setError(`The association "${selectedTenant.name}" has been deactivated. Please contact your administrator.`);
        setLoading(false);
        return;
      }

      const cleanRoll = rollNumberInput.trim();
      const syntheticEmail = `${cleanRoll.toLowerCase()}.${selectedTenantId.toLowerCase()}@notx.com`;

      // 1. Check environment variables for super admin override
      const envAdminUser = import.meta.env.VITE_ADMIN_USERNAME;
      const envAdminPass = import.meta.env.VITE_ADMIN_PASSWORD;

      if (envAdminUser && cleanRoll.toLowerCase() === envAdminUser.toLowerCase() && password === envAdminPass) {
        let masterAdmin = allUsers.find(u => u.email.toLowerCase() === envAdminUser.toLowerCase());
        if (!masterAdmin) {
          masterAdmin = {
            uid: "admin_master",
            name: "System Admin",
            email: envAdminUser,
            role: "admin",
            isSuperAdmin: true,
            phone: "",
            profile_pic: "",
            rollNumber: envAdminUser,
            position: "System Administrator",
            department: "Administration",
            responsibilities: "Full system access",
            password: envAdminPass,
            created_at: new Date().toISOString()
          };
          await createUserProfile(masterAdmin);
          refreshUsers();
        }
        onLoginSuccess(masterAdmin);
        setLoading(false);
        return;
      }

      // 2. Try Firebase Auth with synthetic email
      let authUserSuccess = false;
      try {
        await signInWithEmailAndPassword(auth, syntheticEmail, password);
        authUserSuccess = true;
      } catch (authErr: any) {
        // Fall back to direct profile lookup
      }

      // 3. Find user in memory or live Firestore
      const effectiveUsers = showcaseUsers.length > 0 ? showcaseUsers : allUsers;
      let foundUser = effectiveUsers.find(u =>
        (u.rollNumber?.toLowerCase() === cleanRoll.toLowerCase() ||
          u.email.toLowerCase() === cleanRoll.toLowerCase() ||
          u.email.toLowerCase() === syntheticEmail) &&
        (!u.tenantId || u.tenantId.toLowerCase() === selectedTenantId.toLowerCase() || u.isSuperAdmin)
      );

      if (!foundUser) {
        foundUser = await findUserForLogin(cleanRoll, selectedTenantId);
      }

      if (foundUser) {
        // If user already has a password, verify using secure hash comparison
        if (foundUser.password && !authUserSuccess) {
          const { isValid, needsRehash } = await verifyPassword(password, foundUser.password);
          if (!isValid) {
            setError('Invalid password. Please check your credentials.');
            setLoading(false);
            return;
          }
          // Automatically upgrade legacy plain text password to cryptographic SHA-256 hash
          if (needsRehash) {
            try {
              const hashedPassword = await hashPassword(password);
              await updateUserProfile(foundUser.uid, { password: hashedPassword });
              foundUser.password = hashedPassword;
            } catch (hashErr) {
              console.warn('Silent rehash error:', hashErr);
            }
          }
        }

        // If password was empty (first time login for seeded profiles)
        if (!foundUser.password) {
          const hashedPassword = await hashPassword(password);
          await updateUserProfile(foundUser.uid, { password: hashedPassword });
          foundUser.password = hashedPassword;
          refreshUsers();
        }

        recordUserActivity();
        onLoginSuccess(foundUser);
      } else {
        setError(`No user found with Roll Number "${cleanRoll}" in ${selectedTenant?.name || 'this department'}.`);
      }
    } catch (err: any) {
      console.error(err);
      setError('Login error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleEmail = result.user.email?.toLowerCase();

      if (!googleEmail) {
        setError('No email found in Google account.');
        setLoading(false);
        return;
      }

      // 1. Check Super Admin
      const isSuper = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === googleEmail);
      if (isSuper) {
        let superAdmin = allUsers.find(u => u.email.toLowerCase() === googleEmail && u.isSuperAdmin);
        if (!superAdmin) {
          superAdmin = {
            uid: result.user.uid,
            name: result.user.displayName || "Super Admin",
            email: googleEmail,
            googleEmail: googleEmail,
            role: 'admin',
            isSuperAdmin: true,
            tenantId: '', // Global super admin belongs to platform oversight, not a single department
            profile_pic: result.user.photoURL || "",
            position: "SaaS Super Administrator",
            department: "NOTX Global Administration",
            responsibilities: "Platform control and tenant oversight",
            created_at: new Date().toISOString()
          };
          await createUserProfile(superAdmin);
          refreshUsers();
        } else if (superAdmin.tenantId) {
          // Clear any legacy department tenantId attached to super admin profile
          superAdmin.tenantId = '';
          updateUserProfile(superAdmin.uid, { tenantId: '' }).catch(console.warn);
        }
        recordUserActivity();
        onLoginSuccess(superAdmin);
        return;
      }

      // 2. Check if this is an authorized Tenant Admin for any department
      const tenant = await findTenantByAdminEmail(googleEmail);
      if (tenant) {
        if (tenant.status === 'inactive') {
          setError(`The association "${tenant.name}" has been deactivated by Super Admin.`);
          return;
        }

        const cleanTid = tenant.tenantId.trim().toLowerCase();

        // Check if placeholder admin profile exists for this tenant
        const placeholderAdmin = allUsers.find(u =>
          u.tenantId && u.tenantId.trim().toLowerCase() === cleanTid &&
          u.uid.startsWith(`admin_${cleanTid}`) &&
          (u.email?.trim().toLowerCase() === googleEmail.toLowerCase())
        );

        let tenantAdmin = allUsers.find(u => u.uid === result.user.uid && u.tenantId && u.tenantId.trim().toLowerCase() === cleanTid);
        if (!tenantAdmin) {
          // If a placeholder existed with a synthetic UID, safely remove it before writing the authentic Google profile
          if (placeholderAdmin && placeholderAdmin.uid !== result.user.uid) {
            try {
              await deleteUserProfile(placeholderAdmin.uid);
            } catch (e) {
              console.warn('Placeholder admin cleanup:', e);
            }
          }

          tenantAdmin = {
            uid: result.user.uid,
            name: result.user.displayName || placeholderAdmin?.name || `${tenant.shortCode} Admin`,
            email: googleEmail,
            googleEmail: googleEmail,
            role: 'admin',
            tenantId: tenant.tenantId,
            profile_pic: result.user.photoURL || placeholderAdmin?.profile_pic || "",
            position: "Department Administrator",
            department: tenant.name,
            responsibilities: `Administrative access for ${tenant.name}`,
            created_at: placeholderAdmin?.created_at || new Date().toISOString()
          };
          await createUserProfile(tenantAdmin);
          refreshUsers();
        } else {
          // Profile exists with this Google UID, ensure admin role and email are verified
          if (tenantAdmin.role !== 'admin' || tenantAdmin.email.toLowerCase() !== googleEmail) {
            await updateUserProfile(tenantAdmin.uid, {
              role: 'admin',
              email: googleEmail,
              googleEmail: googleEmail
            });
            refreshUsers();
          }
        }
        recordUserActivity();
        onLoginSuccess(tenantAdmin);
        return;
      }

      // 3. Check if user already manually linked their Google email in their profile (tenant-scoped)
      if (selectedTenant && selectedTenant.status === 'inactive') {
        setError(`The association "${selectedTenant.name}" has been deactivated.`);
        return;
      }
      const linkedStudent = allUsers.find(u =>
        u.googleEmail?.toLowerCase() === googleEmail &&
        u.tenantId === selectedTenantId
      );
      if (linkedStudent) {
        recordUserActivity();
        onLoginSuccess(linkedStudent);
        return;
      }

      // 4. If no linked account exists for this student in the selected tenant
      setError(`No account is linked to this Google email (${googleEmail}) in "${selectedTenant?.name || 'this department'}". Students must sign in using their Roll Number first and connect Google in Profile Settings.`);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cleanSelectedTid = selectedTenantId ? selectedTenantId.trim().toLowerCase() : '';

  const effectiveTenantUsers = showcaseUsers.length > 0 ? showcaseUsers : allUsers;

  const tenantMembersCount = effectiveTenantUsers.filter(
    u => !u.isSuperAdmin && u.uid !== 'admin_master' &&
      (!cleanSelectedTid || (u.tenantId && u.tenantId.trim().toLowerCase() === cleanSelectedTid))
  ).length;

  const tenantEvents = events.filter(
    e => cleanSelectedTid ? (e.tenantId && e.tenantId.trim().toLowerCase() === cleanSelectedTid) : true
  );

  const tenantWinners = winners.filter(
    w => cleanSelectedTid ? (w.tenantId && w.tenantId.trim().toLowerCase() === cleanSelectedTid) : true
  );

  // Reusable Neo-Brutalist Login Form renderer (used inline on mobile, and in modal on desktop)
  const renderLoginForm = (inModal: boolean = false) => (
    <div className={`w-full ${inModal ? '' : 'max-w-md'} bg-[var(--nb-surface)] border-[2.5px] border-[var(--nb-ink)] shadow-[5px_5px_0_var(--nb-ink)] sm:shadow-[8px_8px_0_var(--nb-ink)] rounded-xl sm:rounded-2xl p-5 sm:p-7 relative transition-all`}>
      {/* Form Header */}
      <div className="pb-3 border-b-[2.5px] border-[var(--nb-ink)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="nb-headline text-2xl sm:text-3xl tracking-tight text-[var(--nb-content)]">
            SIGN IN
          </h2>
          <span
            className="font-mono font-bold text-[11px] sm:text-xs uppercase px-2.5 py-1 rounded-md border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center gap-1.5 flex-shrink-0"
            style={{
              background: currentTheme.accent,
              color: currentTheme.accentFg
            }}
          >
            <span className="w-2 h-2 rounded-full border border-[var(--nb-ink)] bg-[var(--nb-surface)]" />
            {selectedTenant?.shortCode || 'NOTX'}
          </span>
        </div>
        <p className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider text-[var(--nb-secondary)] uppercase mt-1">
          Select your department tenant and enter your credentials
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 border-2 border-[var(--nb-ink)] rounded-lg bg-[var(--nb-coral)] text-white font-bold shadow-[3.5px_3.5px_0_var(--nb-ink)] w-full">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="text-xs sm:text-sm leading-snug">{error}</span>
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleLogin} className="space-y-4 mt-4">
        {/* 1. Tenant Selector */}
        <div>
          <label className="block mb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--nb-content)]">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              SELECT ASSOCIATION / TENANT
            </span>
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]"
              style={{ background: currentTheme.subtleBg, color: '#111111' }}
            >
              THEME: {currentTheme.name}
            </span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nb-content)] pointer-events-none" />
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="w-full min-h-[46px] pl-10 pr-10 font-bold font-sans text-xs sm:text-sm rounded-lg border-[2px] border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[2.5px_2.5px_0_var(--nb-ink)] focus:shadow-[4px_4px_0_var(--nb-ink)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:outline-none transition-all cursor-pointer appearance-none"
            >
              {tenants.filter(t => t.status === 'active').length === 0 ? (
                <option value="">No associations registered yet</option>
              ) : (
                tenants.filter(t => t.status === 'active').map(t => (
                  <option key={t.tenantId} value={t.tenantId}>
                    {t.name} ({t.shortCode || t.tenantId})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--nb-content)]" />
          </div>
        </div>

        {/* 2. Roll Number */}
        <div>
          <label className="block mb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--nb-content)]">
            <span>ROLL NUMBER</span>
            <span className="text-[9px] font-mono font-bold text-[var(--nb-secondary)] tracking-wider">
              E.G. 23HM1A3354
            </span>
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nb-content)] pointer-events-none" />
            <input
              type="text"
              value={rollNumberInput}
              onChange={(e) => setRollNumberInput(e.target.value.toUpperCase())}
              placeholder="e.g. 23HM1A3354"
              className="w-full min-h-[46px] pl-10 pr-4 font-mono font-bold text-base sm:text-xs md:text-sm rounded-lg border-[2px] border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[2.5px_2.5px_0_var(--nb-ink)] focus:shadow-[4px_4px_0_var(--nb-ink)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:outline-none transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:text-neutral-400"
              autoComplete="username"
            />
          </div>
        </div>

        {/* 3. Password */}
        <div>
          <label className="block mb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--nb-content)]">
            <span>PASSWORD</span>
            <span className="text-[9px] font-mono font-bold text-[var(--nb-secondary)] tracking-wider">
              DEFAULT = ROLL OR TEMP PASS
            </span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nb-content)] pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-[46px] pl-10 pr-12 text-base sm:text-xs md:text-sm rounded-lg border-[2px] border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[2.5px_2.5px_0_var(--nb-ink)] focus:shadow-[4px_4px_0_var(--nb-ink)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:outline-none transition-all placeholder:text-neutral-400"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 cursor-pointer text-[var(--nb-content)] hover:text-[var(--nb-ink)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedTenantId}
          className="w-full mt-3 py-3.5 px-4 rounded-lg font-mono font-extrabold text-xs sm:text-sm uppercase tracking-wider border-[2.5px] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] hover:shadow-[5.5px_5.5px_0_var(--nb-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          style={{
            background: currentTheme.accent,
            color: currentTheme.accentFg
          }}
        >
          {loading ? (
            <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              SIGN IN TO {selectedTenant?.shortCode || 'PORTAL'}
            </>
          )}
        </button>

        {/* Info Sticker Note */}
        <div
          className="p-3 sm:p-3.5 rounded-lg border-[2px] border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] text-xs font-semibold leading-relaxed flex items-center gap-2.5"
          style={{
            background: currentTheme.subtleBg,
            color: 'var(--nb-content)'
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full border border-[var(--nb-ink)] bg-amber-400 flex-shrink-0" />
          <p className="flex-1">
            Default password is your <strong>Roll Number</strong> or temporary password <strong>notx@123</strong>.
          </p>
        </div>

        {/* Neo-Brutalist Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-[2px] bg-[var(--nb-ink)] opacity-25" />
          <span className="font-mono font-bold text-[10px] uppercase px-2.5 py-1 bg-[var(--nb-surface-accent)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)]">
            ADMIN & LINKED GOOGLE SIGN-IN
          </span>
          <div className="flex-1 h-[2px] bg-[var(--nb-ink)] opacity-25" />
        </div>

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-mono font-bold text-xs uppercase tracking-wider bg-[var(--nb-surface)] text-[var(--nb-content)] border-[2.5px] border-[var(--nb-ink)] shadow-[3.5px_3.5px_0_var(--nb-ink)] hover:shadow-[5px_5px_0_var(--nb-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>CONTINUE WITH GOOGLE</span>
        </button>

        <p className="text-[10px] text-center font-mono font-medium text-[var(--nb-secondary)] leading-relaxed pt-1">
          Auto-detects Super Admin / Tenant Admin. Students must link Google in Profile first.
        </p>
      </form>
    </div>
  );

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE VIEW (< 1024px)
          Preserved 100% identically with unified continuous scroll
         ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden h-full min-h-[100dvh] w-full flex flex-col overflow-y-auto overscroll-y-contain bg-[var(--nb-bg)] text-[var(--nb-content)] select-none [-webkit-overflow-scrolling:touch]">

        {/* ── MOBILE TOP HERO STRIP ── */}
        <div
          className="flex-shrink-0 flex flex-col items-start justify-between p-5 transition-colors duration-300 relative border-b-[2.5px] border-[var(--nb-ink)]"
          style={{
            background: currentTheme.heroBg,
            color: currentTheme.heroFg
          }}
        >
          {/* Subtle Neo-Brutalist Grid Pattern in background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)',
              backgroundSize: '20px 20px'
            }}
          />

          {/* Logo + Brand Title + Status */}
          <div className="relative z-10 flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] flex-shrink-0">
                <BrandLogo branding={selectedTenant?.branding || branding} size="md" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="nb-pill-coral text-[9px] font-mono font-bold uppercase inline-block">
                    DEPARTMENT PORTAL
                  </span>
                  {selectedTenant?.status === 'active' ? (
                    <span className="nb-pill-green text-[9px] font-mono font-bold text-black shadow-[1.5px_1.5px_0_var(--nb-ink)] inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="nb-pill-coral text-[9px] font-mono font-bold text-white shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                      OFFLINE
                    </span>
                  )}
                </div>
                <p
                  className="font-display text-xl tracking-wider font-black mt-0.5"
                  style={{ color: currentTheme.heroFg }}
                >
                  {branding.appName || 'NOTX CONNECT'}
                </p>
              </div>
            </div>
          </div>

          {/* Center Info on Mobile */}
          <div className="relative z-10 my-4 space-y-3 w-full">
            <span className="nb-pill-purple text-[10px] font-mono font-bold text-white shadow-[2px_2px_0_var(--nb-ink)] inline-flex items-center gap-1 px-2.5 py-1">
              🏛 {selectedTenant?.shortCode || 'DEPARTMENT'} ASSOCIATION
            </span>

            <h1
              className="nb-headline leading-none tracking-tight drop-shadow-sm break-words text-3xl"
              style={{ color: currentTheme.heroFg }}
            >
              {selectedTenant?.name || 'Department Connect'}
            </h1>
            <p className="text-xs font-semibold opacity-90 max-w-md leading-relaxed">
              {selectedTenant?.branding?.subtitle ? `${selectedTenant.branding.subtitle} Official Portal` : 'Official Student & Faculty Portal'}
            </p>

            {/* Feature Highlight Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="nb-pill-pink text-[9px] font-mono font-bold shadow-[1.5px_1.5px_0_var(--nb-ink)] inline-flex items-center gap-1 px-2 py-0.5">
                <Zap className="w-3 h-3" /> DIGITAL PASSES
              </span>
              <span className="nb-pill-cyan text-[9px] font-mono font-bold shadow-[1.5px_1.5px_0_var(--nb-ink)] inline-flex items-center gap-1 px-2 py-0.5">
                <Bell className="w-3 h-3" /> LIVE NOTICES
              </span>
              <span className="nb-pill-yellow text-[9px] font-mono font-bold shadow-[1.5px_1.5px_0_var(--nb-ink)] inline-flex items-center gap-1 px-2 py-0.5 text-black">
                <Award className="w-3 h-3" /> WALL OF FAME
              </span>
            </div>

            {/* Notice Card on Mobile */}
            <div className="p-3 rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] w-full bg-[var(--nb-surface)] text-[var(--nb-content)]">
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-[var(--nb-divider)]">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-[var(--nb-secondary)]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Association Notice</span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  LATEST
                </span>
              </div>
              <p className="text-xs font-semibold leading-relaxed break-words">
                {selectedTenant?.branding?.loginHeroText || 'Universal department pass verification, live notifications, and digital credentials.'}
              </p>
            </div>

            {/* 3 Department Stat Badges on Mobile */}
            <div className="grid grid-cols-3 gap-2 w-full pt-1">
              <div className="p-2.5 rounded-lg border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[2px_2px_0_var(--nb-ink)] flex flex-col items-center justify-center text-center">
                <span className="font-display text-lg font-black">{tenantMembersCount}</span>
                <span className="font-mono text-[8px] font-bold text-[var(--nb-secondary)] uppercase tracking-wider">MEMBERS</span>
              </div>
              <div className="p-2.5 rounded-lg border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[2px_2px_0_var(--nb-ink)] flex flex-col items-center justify-center text-center">
                <span className="font-display text-lg font-black">{tenantEvents.length}</span>
                <span className="font-mono text-[8px] font-bold text-[var(--nb-secondary)] uppercase tracking-wider">EVENTS</span>
              </div>
              <div className="p-2.5 rounded-lg border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[2px_2px_0_var(--nb-ink)] flex flex-col items-center justify-center text-center">
                <span className="font-display text-lg font-black">{tenantWinners.length}</span>
                <span className="font-mono text-[8px] font-bold text-[var(--nb-secondary)] uppercase tracking-wider">HONOREES</span>
              </div>
            </div>
          </div>

          {/* Full College Name on Mobile */}
          <div className="relative z-10 pt-2 w-full">
            <div className="flex flex-col items-stretch gap-2.5 w-full">
              <div
                className="p-3 rounded-xl border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] flex items-start gap-2.5 bg-[var(--nb-surface)] text-[var(--nb-content)]"
              >
                <div
                  className="p-2 rounded-lg border-2 border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] flex-shrink-0 mt-0.5"
                  style={{ background: currentTheme.accent, color: currentTheme.accentFg }}
                >
                  <School className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--nb-secondary)]">
                    AFFILIATED INSTITUTION
                  </span>
                  <p className="font-sans font-extrabold text-xs leading-tight text-[var(--nb-content)] mt-0.5 break-words">
                    {selectedTenant?.institution || selectedTenant?.branding?.institution || 'Academic SaaS Ecosystem'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Dedicated Animated Crowd Runway */}
          <div className="relative w-[calc(100%+2.5rem)] -mx-5 -mb-5 mt-5 h-[115px] pointer-events-none overflow-hidden border-t-2 border-[var(--nb-ink)]/20 bg-black/10">
            <div className="absolute inset-0">
              <CrowdCanvas
                src="/images/peeps/all-peeps.png"
                rows={15}
                cols={7}
                className="w-full h-full opacity-60"
              />
            </div>
            {/* Subtle floor guideline */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--nb-ink)]/30" />
            <div className="absolute bottom-1 right-3 pointer-events-none opacity-45 font-mono text-[8px] font-bold tracking-widest uppercase">
              CAMPUS LIFE
            </div>
          </div>
        </div>

        {/* ── MOBILE FORM CONTAINER ── */}
        <div
          id="login-form-card"
          className="flex-1 flex flex-col justify-start items-center p-4 py-6 overflow-visible pb-24 [-webkit-overflow-scrolling:touch]"
        >
          {renderLoginForm(false)}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DESKTOP VIEW (≥ 1024px)
          High-Octane Department Showcase: Events, Wall of Fame, Live Stats
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col h-full min-h-0 flex-1 w-full bg-[var(--nb-bg)] text-[var(--nb-content)] select-none overflow-y-auto overflow-x-hidden">

        {/* ── DESKTOP STICKY TOP NAVBAR ── */}
        <header className="sticky top-0 z-40 bg-[var(--nb-surface)] border-b-[2.5px] border-[var(--nb-ink)] shadow-[0_3px_0_var(--nb-divider)] px-8 py-3.5 flex items-center justify-between gap-4 flex-shrink-0">

          {/* Left: Brand + Tenant Identity */}
          <div className="flex items-center gap-3.5">
            <div className="p-1.5 rounded-lg bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex-shrink-0">
              <BrandLogo branding={selectedTenant?.branding || branding} size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg tracking-wider font-black text-[var(--nb-content)]">
                  {branding.appName || 'NOTX CONNECT'}
                </span>
                {selectedTenant?.shortCode &&
                  (branding.appName || '').replace(/[\s\-_]+/g, '').toLowerCase() !== selectedTenant.shortCode.replace(/[\s\-_]+/g, '').toLowerCase() && (
                    <span
                      className="font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]"
                      style={{ background: currentTheme.subtleBg, color: '#111111' }}
                    >
                      {selectedTenant.shortCode}
                    </span>
                  )}
              </div>
              <p className="font-mono text-[10px] text-[var(--nb-secondary)] font-bold uppercase truncate max-w-xs">
                {selectedTenant?.institution || selectedTenant?.branding?.institution || 'Academic SaaS Ecosystem'}
              </p>
            </div>
          </div>

          {/* Center: Department Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] shadow-[2px_2px_0_var(--nb-ink)]">
              <Building2 className="w-3.5 h-3.5 text-[var(--nb-secondary)]" />
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--nb-secondary)]">DEPT:</span>
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="bg-transparent font-sans font-bold text-xs text-[var(--nb-content)] cursor-pointer focus:outline-none pr-1"
              >
                {tenants.filter(t => t.status === 'active').map(t => (
                  <option key={t.tenantId} value={t.tenantId}>
                    {t.name}{t.shortCode && t.shortCode !== t.name ? ` (${t.shortCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: The ONLY Access / Sign In Button on Desktop */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-5 py-2.5 rounded-lg font-mono font-extrabold text-xs uppercase tracking-wider border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] hover:shadow-[4.5px_4.5px_0_var(--nb-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
              style={{
                background: currentTheme.accent,
                color: currentTheme.accentFg
              }}
            >
              <KeyRound className="w-4 h-4" />
              <span>Access / Sign In</span>
            </button>
          </div>
        </header>

        {/* ── DESKTOP HERO BANNER & LIVE STATS STRIP ── */}
        <section
          className="relative px-8 lg:px-14 pt-16 lg:pt-24 pb-36 lg:pb-44 min-h-[580px] lg:min-h-[640px] xl:min-h-[680px] border-b-[2.5px] border-[var(--nb-ink)] flex-shrink-0 overflow-hidden flex items-start"
          style={{ background: currentTheme.heroBg, color: currentTheme.heroFg }}
        >
          {/* Animated Skiper-UI Crowd Canvas (bottom strip overlay) */}
          <div className="absolute bottom-0 left-0 right-0 h-[170px] lg:h-[210px] pointer-events-none z-0 overflow-hidden translate-y-2 opacity-50">
            <CrowdCanvas
              src="/images/peeps/all-peeps.png"
              rows={15}
              cols={7}
              className="w-full h-full"
            />
          </div>

          {/* Dot Matrix Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)',
              backgroundSize: '22px 22px'
            }}
          />

          {/* Subtle Ground Baseline */}
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--nb-ink)]/25 pointer-events-none" />

          <div className="relative z-10 max-w-7xl w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-8 pt-4 pb-12 lg:pb-16">

            {/* Left: Department Titles & Highlights */}
            <div className="flex-1 space-y-3">


              <h1
                className="nb-headline leading-tight tracking-tight drop-shadow-sm text-4xl lg:text-5xl"
                style={{ color: currentTheme.heroFg }}
              >
                {selectedTenant?.name || 'Department Connect'}
              </h1>

              <p className="text-sm font-semibold opacity-90 max-w-xl leading-relaxed">
                {selectedTenant?.branding?.subtitle ? `${selectedTenant.branding.subtitle} Official Student & Faculty Ecosystem` : 'Official Student & Faculty Portal'}
              </p>

              {/* Full Affiliated College Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[2px_2px_0_var(--nb-ink)] mt-2">
                <School className="w-4 h-4 flex-shrink-0" />
                <span className="font-sans font-extrabold text-xs tracking-tight">
                  {selectedTenant?.institution || selectedTenant?.branding?.institution || 'Academic SaaS Ecosystem'}
                </span>
              </div>
            </div>

            {/* Right: 3 Neo-Brutalist Department Stat Cards */}
            <div className="grid grid-cols-3 gap-3.5 w-full md:w-auto flex-shrink-0">

              {/* Stat 1: Members */}
              <div className="p-4 rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[3.5px_3.5px_0_var(--nb-ink)] flex flex-col items-center justify-center text-center min-w-[125px]">
                <div className="w-8 h-8 rounded-lg border border-[var(--nb-ink)] bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-1.5 shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                  <Users className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                </div>
                <span className="font-display text-2xl font-black">{tenantMembersCount}</span>
                <span className="font-mono text-[9px] font-bold text-[var(--nb-secondary)] uppercase tracking-wider mt-0.5">MEMBERS</span>
              </div>

              {/* Stat 2: Events */}
              <div className="p-4 rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[3.5px_3.5px_0_var(--nb-ink)] flex flex-col items-center justify-center text-center min-w-[125px]">
                <div className="w-8 h-8 rounded-lg border border-[var(--nb-ink)] bg-purple-100 dark:bg-purple-950 flex items-center justify-center mb-1.5 shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                  <Calendar className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                </div>
                <span className="font-display text-2xl font-black">{tenantEvents.length}</span>
                <span className="font-mono text-[9px] font-bold text-[var(--nb-secondary)] uppercase tracking-wider mt-0.5">EVENTS</span>
              </div>

              {/* Stat 3: Wall of Fame */}
              <div className="p-4 rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)] shadow-[3.5px_3.5px_0_var(--nb-ink)] flex flex-col items-center justify-center text-center min-w-[125px]">
                <div className="w-8 h-8 rounded-lg border border-[var(--nb-ink)] bg-amber-100 dark:bg-amber-950 flex items-center justify-center mb-1.5 shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="font-display text-2xl font-black">{tenantWinners.length}</span>
                <span className="font-mono text-[9px] font-bold text-[var(--nb-secondary)] uppercase tracking-wider mt-0.5">HONOREES</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── DESKTOP MAIN CONTENT CONTAINER ── */}
        <main className="max-w-7xl mx-auto w-full px-8 lg:px-12 py-10 space-y-12 flex-shrink-0">

          {/* 1. UPCOMING & ACTIVE EVENTS SHOWCASE (READ-ONLY) */}
          <section className="space-y-5">
            <div className="border-b-[2.5px] border-[var(--nb-ink)] pb-3">
              <div className="flex items-center gap-2">
                <h2 className="nb-headline text-2xl text-[var(--nb-content)]">
                  DEPARTMENT EVENTS SHOWCASE
                </h2>

              </div>
              <p className="font-mono text-xs font-semibold text-[var(--nb-secondary)] mt-0.5">
                Explore active hackathons, workshops, and symposiums for {selectedTenant?.shortCode || 'this department'}
              </p>
            </div>

            {/* Event Cards Grid */}
            {tenantEvents.length === 0 ? (
              <div className="p-8 rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] shadow-[4px_4px_0_var(--nb-ink)] text-center space-y-2">
                <Calendar className="w-8 h-8 text-[var(--nb-secondary)] mx-auto" />
                <h4 className="nb-headline text-lg">No Active Events Announced</h4>
                <p className="text-xs text-[var(--nb-secondary)] max-w-md mx-auto">
                  New workshops and hackathons will be published here. Use the Access / Sign In button above to sign in.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tenantEvents.slice(0, 6).map((ev) => (
                  <div
                    key={ev.eventId}
                    className="flex flex-col bg-[var(--nb-surface)] border-[2.5px] border-[var(--nb-ink)] shadow-[4.5px_4.5px_0_var(--nb-ink)] rounded-xl overflow-hidden group hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--nb-ink)] transition-all"
                  >
                    {/* Poster thumbnail */}
                    <div className="w-full h-44 bg-neutral-200 relative overflow-hidden border-b-2 border-[var(--nb-ink)]">
                      {ev.posterImage ? (
                        <img
                          src={ev.posterImage}
                          alt={ev.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--nb-surface-accent)]">
                          <Calendar className="w-8 h-8 text-[var(--nb-secondary)]" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="nb-pill-pink text-[9px] font-mono font-bold shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                          {ev.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-sans font-extrabold text-base leading-snug line-clamp-2 text-[var(--nb-content)]">
                          {ev.title}
                        </h3>
                        <div className="mt-2.5 space-y-1 text-xs font-semibold text-[var(--nb-secondary)] font-mono">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{ev.date} {ev.startTime ? `· ${ev.startTime}` : ''}</span>
                          </div>
                          {ev.venue && (
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                              <span className="truncate">{ev.venue}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Clean Read-Only Status Bar (No redundant button) */}
                      <div className="pt-2.5 border-t border-[var(--nb-divider)] flex items-center justify-between text-[10px] font-mono font-bold">
                        <span className="text-[var(--nb-secondary)] uppercase">
                          Department Event
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          ● Official Pass
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. WALL OF FAME & HONOREES SHOWCASE (READ-ONLY) */}
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b-[2.5px] border-[var(--nb-ink)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="nb-headline text-2xl text-[var(--nb-content)]">
                    WALL OF FAME & MERIT HONOREES
                  </h2>

                </div>
                <p className="font-mono text-xs font-semibold text-[var(--nb-secondary)] mt-0.5">
                  Celebrating students who excelled in hackathons, academic competitions, and departmental tech-fests
                </p>
              </div>
            </div>

            {/* Winner Cards Grid */}
            {tenantWinners.length === 0 ? (
              <div className="p-8 rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] shadow-[4px_4px_0_var(--nb-ink)] text-center space-y-2">
                <Trophy className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="nb-headline text-lg">Achievers Being Verified</h4>
                <p className="text-xs text-[var(--nb-secondary)] max-w-md mx-auto">
                  Winners and recognized students from recent departmental hackathons will be showcased on this Wall of Fame.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {tenantWinners.slice(0, 8).map((w) => (
                  <div
                    key={w.winnerId}
                    className="p-4 rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] shadow-[3.5px_3.5px_0_var(--nb-ink)] flex flex-col items-center text-center space-y-2.5 relative group hover:-translate-y-1 transition-transform"
                  >
                    {/* Position Ribbon */}
                    <div className="absolute -top-2.5">
                      <span className="nb-pill-yellow text-[9px] font-mono font-black text-black shadow-[1.5px_1.5px_0_var(--nb-ink)] px-2 py-0.5 uppercase">
                        {w.position || 'Honoree'}
                      </span>
                    </div>

                    {/* Student Photo */}
                    <div className="w-16 h-16 rounded-full border-2 border-[var(--nb-ink)] overflow-hidden bg-[var(--nb-surface-accent)] shadow-[2px_2px_0_var(--nb-ink)] flex-shrink-0 mt-1">
                      {w.studentPhoto ? (
                        <img src={w.studentPhoto} alt={w.studentName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-xl font-bold bg-amber-200 text-black">
                          {w.studentName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="font-sans font-black text-sm text-[var(--nb-content)] leading-tight">
                        {w.studentName}
                      </h4>
                      <p className="font-mono text-[10px] font-bold text-[var(--nb-secondary)] mt-0.5">
                        {w.rollNumber}
                      </p>
                    </div>

                    {/* Prize & Event */}
                    <div className="w-full pt-2 border-t border-[var(--nb-divider)] text-left">
                      <p className="font-sans font-bold text-xs text-amber-700 dark:text-amber-400 line-clamp-1">
                        {w.prizeTitle || 'Certificate of Merit'}
                      </p>
                      <p className="font-mono text-[9px] text-[var(--nb-secondary)] line-clamp-1 mt-0.5">
                        {w.eventTitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* ── DESKTOP FOOTER (Clean copyright and institution info without redundant sign-in button) ── */}
        <footer className="border-t-[2.5px] border-[var(--nb-ink)] bg-[var(--nb-surface)] px-8 py-6 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <School className="w-5 h-5 text-[var(--nb-secondary)]" />
              <div>
                <p className="font-sans font-bold text-xs text-[var(--nb-content)]">
                  {selectedTenant?.institution || selectedTenant?.branding?.institution || 'Academic SaaS Ecosystem'}
                </p>
                <p className="font-mono text-[10px] text-[var(--nb-secondary)]">
                  NOTX Multi-Tenant Association Platform
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. DESKTOP SIGN-IN MODAL (Triggered when user clicks Sign In)
         ───────────────────────────────────────────────────────────── */}
      {isLoginModalOpen && (
        <div
          className="hidden lg:flex fixed inset-0 z-50 items-center justify-center p-6 bg-black/65 backdrop-blur-xs"
          onClick={() => setIsLoginModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-[var(--nb-surface)] border-[2.5px] border-[var(--nb-ink)] shadow-[10px_10px_0_var(--nb-ink)] rounded-2xl p-7 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all absolute top-4 right-4 z-20 shrink-0"
              title="Close"
              aria-label="Close login dialog"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {renderLoginForm(true)}
          </div>
        </div>
      )}
    </>
  );
}
