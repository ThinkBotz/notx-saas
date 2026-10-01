import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  ExternalLink, 
  ShieldCheck, 
  Users, 
  Calendar, 
  Award, 
  Layers, 
  ArrowRight, 
  Check, 
  Copy, 
  X, 
  Sparkles,
  LogOut,
  Settings,
  Mail,
  School,
  Globe,
  Edit3,
  Power,
  PowerOff,
  FileText,
  BarChart3,
  Palette,
  FlaskConical,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Tenant, UserProfile } from '../types';
import { getAllTenants, createTenant, updateTenant, updateAppBranding, subscribeToTenants, fetchUsers, fetchEvents, fetchRegistrations } from '../firebase';
import { runSecurityAndTenantValidation, TestResult } from '../utils/testTenantSecurity';
import BrandLogo from './BrandLogo';
import { THEME_PRESETS, ThemePresetKey, TenantThemeConfig, resolveTenantTheme } from '../utils/themePresets';

interface SuperAdminDashboardProps {
  currentUser: UserProfile;
  onEnterTenant: (tenantId: string) => void;
  onLogout: () => void;
}

interface TenantStats {
  users: number;
  events: number;
  registrations: number;
}

const ACCENT_OPTIONS = [
  { value: 'indigo', label: 'Indigo', color: '#6366f1' },
  { value: 'violet', label: 'Violet', color: '#8b5cf6' },
  { value: 'emerald', label: 'Emerald', color: '#10b981' },
  { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
  { value: 'rose', label: 'Rose', color: '#f43f5e' },
];

export default function SuperAdminDashboard({
  currentUser,
  onEnterTenant,
  onLogout
}: SuperAdminDashboardProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null);

  // Tenant-level stats
  const [tenantStats, setTenantStats] = useState<Record<string, TenantStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  // Edit Tenant modal state
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState('');
  const [editShortCode, setEditShortCode] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [editAccentColor, setEditAccentColor] = useState('indigo');
  const [editThemePreset, setEditThemePreset] = useState<ThemePresetKey>('cyber-gold');
  const [editLoginHeroText, setEditLoginHeroText] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFeedback, setEditFeedback] = useState('');

  // New Tenant Form state
  const [newTenantId, setNewTenantId] = useState('');
  const [newName, setNewName] = useState('');
  const [newShortCode, setNewShortCode] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newInstitution, setNewInstitution] = useState('Annamacharya Institute of Tech & Sciences');
  const [newAccentColor, setNewAccentColor] = useState('indigo');
  const [newThemePreset, setNewThemePreset] = useState<ThemePresetKey>('cobalt-tech');
  const [newLoginHeroText, setNewLoginHeroText] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Global feedback
  const [globalFeedback, setGlobalFeedback] = useState('');

  // Automated Validation Suite states
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleRunValidation = async () => {
    setIsValidating(true);
    try {
      const res = await runSecurityAndTenantValidation();
      setValidationResults(res);
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    const unsub = subscribeToTenants((list) => {
      setTenants(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch per-tenant stats when tenants load
  useEffect(() => {
    if (tenants.length === 0) return;
    loadTenantStats();
  }, [tenants.length]);

  const loadTenantStats = async () => {
    setStatsLoading(true);
    const statsMap: Record<string, TenantStats> = {};
    try {
      for (const tenant of tenants) {
        const [users, events, regs] = await Promise.all([
          fetchUsers(tenant.tenantId),
          fetchEvents(tenant.tenantId),
          fetchRegistrations(tenant.tenantId)
        ]);
        statsMap[tenant.tenantId] = {
          users: users.filter(u => !u.isSuperAdmin).length,
          events: events.length,
          registrations: regs.length
        };
      }
      setTenantStats(statsMap);
    } catch (err) {
      console.error('Error loading tenant stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCopyLink = (tenantId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?tenant=${tenantId}`;
    navigator.clipboard.writeText(url);
    setCopiedTenantId(tenantId);
    setTimeout(() => setCopiedTenantId(null), 2500);
  };

  // Toggle tenant active/inactive
  const handleToggleTenantStatus = async (tenant: Tenant) => {
    const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'inactive' ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} "${tenant.name}"? ${newStatus === 'inactive' ? 'Users of this tenant will not be able to log in.' : 'Users will regain access.'}`)) {
      return;
    }
    try {
      await updateTenant(tenant.tenantId, { status: newStatus });
      setGlobalFeedback(`Tenant "${tenant.name}" ${newStatus === 'active' ? 'reactivated' : 'deactivated'} successfully.`);
      setTimeout(() => setGlobalFeedback(''), 4000);
    } catch (err) {
      console.error(err);
      setGlobalFeedback('Failed to update tenant status.');
      setTimeout(() => setGlobalFeedback(''), 3000);
    }
  };

  // Open Edit modal
  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditShortCode(tenant.shortCode);
    setEditAdminEmail(tenant.adminEmail);
    setEditInstitution(tenant.institution || tenant.branding?.institution || '');
    setEditAccentColor(tenant.branding?.accentColor || 'indigo');
    const resolvedTheme = resolveTenantTheme(tenant.branding);
    setEditThemePreset(tenant.branding?.theme?.presetKey || resolvedTheme.presetKey || 'cyber-gold');
    setEditLoginHeroText(tenant.branding?.loginHeroText || '');
    setEditFormError('');
    setEditFeedback('');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditFormError('');

    if (!editName.trim() || !editAdminEmail.trim()) {
      setEditFormError('Association Name and Admin Gmail are required.');
      return;
    }

    setEditSubmitting(true);
    try {
      const chosenTheme = THEME_PRESETS[editThemePreset as Exclude<ThemePresetKey, 'custom'>] || THEME_PRESETS['cyber-gold'];
      const updates: Partial<Tenant> = {
        name: editName.trim(),
        shortCode: (editShortCode.trim() || editingTenant.shortCode).substring(0, 10),
        adminEmail: editAdminEmail.trim().toLowerCase(),
        institution: editInstitution.trim(),
        branding: {
          ...(editingTenant.branding || { appName: 'NOTX', tagline: 'Connect', logoType: 'preset' as const, logoIcon: 'Cpu' }),
          appName: editingTenant.branding?.appName || editName.trim().split(' ')[0].toUpperCase(),
          subtitle: editShortCode.trim() || editName.trim(),
          institution: editInstitution.trim(),
          loginHeroText: editLoginHeroText.trim(),
          accentColor: editAccentColor,
          theme: chosenTheme
        }
      };
      await updateTenant(editingTenant.tenantId, updates);
      try {
        if (updates.branding) {
          await updateAppBranding(updates.branding, editingTenant.tenantId);
        }
      } catch (brandErr) {
        console.warn('Config branding update note:', brandErr);
      }
      await loadTenantStats();
      setEditFeedback('Theme & branding updated! Admin ownership transferred cleanly.');
      setTimeout(() => {
        setEditingTenant(null);
        setEditFeedback('');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setEditFormError('Failed to save changes. Please verify database permissions.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanSlug = newTenantId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!cleanSlug || !newName.trim() || !newAdminEmail.trim()) {
      setFormError('Please fill in Tenant Slug, Association Name, and Admin Gmail.');
      return;
    }

    if (tenants.some(t => t.tenantId === cleanSlug)) {
      setFormError(`A tenant with ID "${cleanSlug}" already exists.`);
      return;
    }

    setSubmitting(true);
    try {
      const chosenTheme = THEME_PRESETS[newThemePreset as Exclude<ThemePresetKey, 'custom'>] || THEME_PRESETS['cobalt-tech'];
      const newTenant: Tenant = {
        tenantId: cleanSlug,
        name: newName.trim(),
        shortCode: (newShortCode.trim() || cleanSlug.toUpperCase()).substring(0, 10),
        adminEmail: newAdminEmail.trim().toLowerCase(),
        institution: newInstitution.trim(),
        status: 'active',
        branding: {
          appName: newName.trim().split(' ')[0].toUpperCase(),
          tagline: 'Connect',
          subtitle: newShortCode.trim() || cleanSlug.toUpperCase(),
          institution: newInstitution.trim(),
          loginHeroText: newLoginHeroText.trim() || 'Universal department pass verification, live notifications, and digital credentials.',
          logoType: 'preset',
          logoIcon: 'Cpu',
          accentColor: newAccentColor,
          theme: chosenTheme
        },
        createdAt: new Date().toISOString(),
        createdBy: currentUser.email
      };

      await createTenant(newTenant);
      try {
        await updateAppBranding(newTenant.branding, newTenant.tenantId);
      } catch (e) {
        console.warn('Initial branding sync note:', e);
      }
      setIsAddModalOpen(false);
      setNewTenantId('');
      setNewName('');
      setNewShortCode('');
      setNewAdminEmail('');
      setNewLoginHeroText('');
      setGlobalFeedback(`Tenant "${newTenant.name}" provisioned with ${chosenTheme.name} theme!`);
      setTimeout(() => setGlobalFeedback(''), 4000);
      loadTenantStats();
    } catch (err: any) {
      console.error(err);
      setFormError('Failed to create tenant. Please verify database permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderThemeAllotmentPicker = (
    selectedPreset: ThemePresetKey,
    onSelect: (preset: ThemePresetKey) => void,
    name: string,
    shortCode: string,
    institution: string,
    heroText: string
  ) => {
    const currentConfig = THEME_PRESETS[selectedPreset as Exclude<ThemePresetKey, 'custom'>] || THEME_PRESETS['cyber-gold'];

    return (
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <label className="block nb-label text-[10px] text-[var(--nb-secondary)] font-bold">
            ALLOT TENANT THEME (BRAND IDENTITY) *
          </label>
          <span className="text-[9px] font-mono font-bold text-[var(--nb-accent)] uppercase">
            7 Curated Presets
          </span>
        </div>

        {/* 7 Preset Swatches */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(THEME_PRESETS).map(([key, preset]) => {
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key as ThemePresetKey)}
                className={`p-2 rounded-md text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] scale-[1.02]'
                    : 'border border-[var(--nb-divider)] bg-[var(--nb-surface-accent)] hover:border-[var(--nb-ink)] opacity-75 hover:opacity-100'
                }`}
                style={isSelected ? { background: 'var(--nb-surface)' } : {}}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-4 h-4 rounded-full border border-[var(--nb-ink)] flex-shrink-0"
                    style={{ background: preset.heroBg }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-[var(--nb-ink)] flex-shrink-0"
                    style={{ background: preset.accent }}
                  />
                </div>
                <p className="font-mono text-[10px] font-bold truncate text-[var(--nb-content)]">
                  {preset.name}
                </p>
                <p className="text-[8.5px] text-[var(--nb-secondary)] truncate">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Live WYSIWYG Miniature Preview Card */}
        <div
          className="p-3.5 rounded-lg select-none space-y-2.5 transition-all"
          style={{
            background: currentConfig.heroBg,
            color: currentConfig.heroFg,
            border: '2px solid var(--nb-ink)',
            boxShadow: 'var(--shadow-hard)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded bg-[var(--nb-surface)] text-[var(--nb-content)] border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] uppercase">
              ⚡ {shortCode || 'ORG'} · LIVE PREVIEW
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider opacity-85">
              {currentConfig.name}
            </span>
          </div>

          <div>
            <h4 className="nb-headline text-lg leading-tight truncate">
              {name || 'Department Association'}
            </h4>
            <p className="text-[10px] opacity-90 line-clamp-1 mt-0.5 font-sans">
              {heroText || institution || 'Universal department pass verification, live notifications, and digital credentials.'}
            </p>
          </div>

          <div className="pt-1.5 flex items-center justify-between border-t border-[var(--nb-divider)] gap-2 min-w-0">
            <span className="text-[9px] font-mono opacity-80 uppercase truncate flex-1 min-w-0">
              🏛 {institution || 'Academic SaaS Ecosystem'}
            </span>
            <span
              className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] shrink-0"
              style={{ background: currentConfig.accent, color: currentConfig.accentFg }}
            >
              Access Portal →
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[var(--nb-bg)] text-[var(--nb-content)] flex flex-col font-sans">
      
      {/* ── TOP MASTER BAR ── */}
      <header className="border-b-[2.5px] border-[var(--nb-ink)] bg-[var(--nb-surface)] sticky top-0 z-30 shadow-[0_2px_0_var(--nb-ink)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center shadow-[2px_2px_0_var(--nb-ink)] shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-900" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-black text-base sm:text-lg tracking-wider text-[var(--nb-content)]">
                  NOTX
                </span>
                <span className="nb-pill-coral text-[8px] sm:text-[9px] font-mono font-bold uppercase py-0.5 px-1.5 shrink-0">
                  SAAS ROOT
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-mono text-[var(--nb-secondary)] truncate hidden xs:block">Multi-Tenant Platform Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[var(--nb-surface-accent)] rounded border border-[var(--nb-ink)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-mono font-bold truncate max-w-[200px]">
                {currentUser.email}
              </span>
            </div>
            <button
              onClick={() => {
                setIsValidationModalOpen(true);
                handleRunValidation();
              }}
              className="nb-btn-ghost text-xs font-bold uppercase py-2 px-2.5 sm:px-3 flex items-center gap-1.5 cursor-pointer bg-[var(--nb-surface)]"
              style={{ border: '2px solid var(--nb-ink)' }}
              title="Run Automated Multi-Tenant & Security Verification"
            >
              <FlaskConical className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Run Audit Suite</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="nb-btn text-xs font-bold uppercase py-2 px-2.5 sm:px-3.5 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Tenant</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={onLogout}
              className="nb-btn-ghost text-xs font-bold uppercase py-2 px-2.5 sm:px-3 flex items-center gap-1.5 cursor-pointer text-rose-500 hover:text-rose-600"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        
        {/* Global Feedback */}
        {globalFeedback && (
          <div 
            className="p-3 rounded-md bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            {globalFeedback}
          </div>
        )}

        {/* Banner */}
        <div 
          className="p-4 sm:p-6 rounded-lg bg-[var(--nb-yellow)] text-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ border: '2.5px solid var(--nb-ink)', boxShadow: '4px 4px 0 var(--nb-ink)' }}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="nb-pill-pink text-[9px] sm:text-[10px] font-mono font-bold uppercase px-2 py-0.5">
                SUPER ADMIN SESSION
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-bold">Google Auth Verified</span>
            </div>
            <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl tracking-tight">
              Manage Tenants & Associations
            </h1>
            <p className="text-xs sm:text-sm font-medium text-neutral-800 max-w-xl">
              Provision independent department associations, assign Gmail tenant administrators, and enter any workspace with master oversight.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto shrink-0">
            <div className="bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] rounded-md p-2.5 sm:p-3 text-center min-w-0 sm:min-w-[100px] shadow-[2px_2px_0_var(--nb-ink)]">
              <div className="font-display text-xl sm:text-2xl font-black">{tenants.length}</div>
              <div className="text-[8px] sm:text-[9px] font-mono font-bold uppercase truncate">Total Tenants</div>
            </div>
            <div className="bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] rounded-md p-2.5 sm:p-3 text-center min-w-0 sm:min-w-[100px] shadow-[2px_2px_0_var(--nb-ink)]">
              <div className="font-display text-xl sm:text-2xl font-black text-emerald-600">
                {tenants.filter(t => t.status === 'active').length}
              </div>
              <div className="text-[8px] sm:text-[9px] font-mono font-bold uppercase truncate">Active</div>
            </div>
            <div className="bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] rounded-md p-2.5 sm:p-3 text-center min-w-0 sm:min-w-[100px] shadow-[2px_2px_0_var(--nb-ink)]">
              <div className="font-display text-xl sm:text-2xl font-black text-rose-500">
                {tenants.filter(t => t.status === 'inactive').length}
              </div>
              <div className="text-[8px] sm:text-[9px] font-mono font-bold uppercase truncate">Inactive</div>
            </div>
          </div>
        </div>

        {/* Tenant Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="nb-headline text-lg text-[var(--nb-content)] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--nb-accent)]" />
              Onboarded Tenants ({tenants.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadTenantStats}
                disabled={statsLoading}
                className="nb-btn-ghost text-[10px] font-mono font-bold uppercase py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                style={{ border: '1px solid var(--nb-ink)' }}
              >
                <BarChart3 className={`w-3 h-3 ${statsLoading ? 'animate-pulse' : ''}`} />
                {statsLoading ? 'Loading...' : 'Refresh Stats'}
              </button>
              <span className="text-xs font-mono text-[var(--nb-secondary)] hidden sm:inline">Click Enter to supervise</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tenants.map((tenant) => {
              const stats = tenantStats[tenant.tenantId];
              const isInactive = tenant.status === 'inactive';
              return (
                <div
                  key={tenant.tenantId}
                  className={`bg-[var(--nb-surface)] rounded-lg p-5 flex flex-col justify-between transition-all ${isInactive ? 'opacity-60' : 'hover:translate-x-0.5 hover:translate-y-0.5'}`}
                  style={{ 
                    border: `2px solid ${isInactive ? 'var(--nb-divider)' : 'var(--nb-ink)'}`, 
                    boxShadow: isInactive ? 'none' : '3px 3px 0 var(--nb-ink)' 
                  }}
                >
                  <div className="space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="nb-pill-cyan text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 inline-block mb-1">
                          ID: {tenant.tenantId}
                        </span>
                        <h3 className="font-display font-bold text-base sm:text-lg text-[var(--nb-content)] leading-tight truncate">
                          {tenant.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Status toggle button */}
                        <button
                          onClick={() => handleToggleTenantStatus(tenant)}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            isInactive 
                              ? 'text-neutral-400 hover:text-emerald-500 hover:bg-emerald-500/10' 
                              : 'text-emerald-500 hover:text-rose-500 hover:bg-rose-500/10'
                          }`}
                          title={isInactive ? 'Reactivate Tenant' : 'Deactivate Tenant'}
                        >
                          {isInactive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-[var(--nb-ink)] ${
                          tenant.status === 'active' ? 'bg-emerald-400 text-neutral-900' : 'bg-neutral-300 text-neutral-800'
                        }`}>
                          {tenant.status}
                        </span>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-1.5 text-xs text-[var(--nb-secondary)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <School className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{tenant.institution || 'Main Campus'}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono min-w-0">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                        <span className="truncate text-[var(--nb-content)] font-bold">{tenant.adminEmail}</span>
                      </div>
                      {(() => {
                        const themeConfig = tenant.branding?.theme || resolveTenantTheme(tenant.branding);
                        return (
                          <div className="flex items-center gap-2 min-w-0">
                            <Palette className="w-3.5 h-3.5 flex-shrink-0 text-[var(--nb-accent)]" />
                            <span className="font-bold text-[var(--nb-content)] truncate">{themeConfig.name}</span>
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-[var(--nb-ink)] inline-block flex-shrink-0" 
                              style={{ backgroundColor: themeConfig.heroBg }}
                              title={`Hero: ${themeConfig.heroBg}`}
                            />
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-[var(--nb-ink)] inline-block flex-shrink-0" 
                              style={{ backgroundColor: themeConfig.accent }}
                              title={`Accent: ${themeConfig.accent}`}
                            />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Live Stats */}
                    {stats && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-[var(--nb-surface-accent)]" style={{ border: '1px solid var(--nb-ink)' }}>
                          <Users className="w-3 h-3 text-blue-500" />
                          <span>{stats.users}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-[var(--nb-surface-accent)]" style={{ border: '1px solid var(--nb-ink)' }}>
                          <Calendar className="w-3 h-3 text-violet-500" />
                          <span>{stats.events}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-[var(--nb-surface-accent)]" style={{ border: '1px solid var(--nb-ink)' }}>
                          <FileText className="w-3 h-3 text-emerald-500" />
                          <span>{stats.registrations}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-6 pt-4 border-t border-[var(--nb-ink)]/15 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEnterTenant(tenant.tenantId)}
                        className="flex-1 nb-btn py-2 px-3 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Enter</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(tenant)}
                        className="nb-btn-ghost py-2 px-3 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyLink(tenant.tenantId)}
                      className="w-full nb-btn-ghost py-1.5 px-3 text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedTenantId === tenant.tenantId ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Tenant URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── EDIT TENANT MODAL ── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-4">
          <div 
            className="bg-[var(--nb-surface)] rounded-xl max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
            style={{ border: '2.5px solid var(--nb-ink)', boxShadow: '6px 6px 0 var(--nb-ink)' }}
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--nb-ink)] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[var(--nb-accent)]" />
                <h3 className="nb-headline text-lg text-[var(--nb-content)]">EDIT TENANT</h3>
                <span className="nb-pill-cyan text-[8px] font-mono font-bold uppercase px-1.5 py-0.5">
                  {editingTenant.tenantId}
                </span>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="nb-btn-icon !w-8 !h-8 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editFormError && (
              <div className="p-3 rounded bg-rose-500/10 border-2 border-rose-500 text-rose-500 text-xs font-bold">
                {editFormError}
              </div>
            )}
            {editFeedback && (
              <div className="p-3 rounded bg-emerald-500/10 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                {editFeedback}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Tenant ID (read-only) */}
              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                  TENANT ID (IMMUTABLE)
                </label>
                <div 
                  className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-secondary)] rounded p-2.5 font-mono font-bold opacity-60"
                  style={{ border: '1.5px solid var(--nb-divider)' }}
                >
                  {editingTenant.tenantId}
                </div>
              </div>

              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                  ASSOCIATION / DEPARTMENT NAME *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                    SHORT CODE
                  </label>
                  <input
                    type="text"
                    value={editShortCode}
                    onChange={(e) => setEditShortCode(e.target.value.toUpperCase())}
                    className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-mono font-bold"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>
                <div>
                  <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                    COLLEGE / INSTITUTION NAME
                  </label>
                  <input
                    type="text"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-bold"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                  LOGIN HERO ANNOUNCEMENT / TAGLINE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive portal for AI & ML students and faculty"
                  value={editLoginHeroText}
                  onChange={(e) => setEditLoginHeroText(e.target.value)}
                  className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                />
              </div>

              {/* Theme Preset Allotment Console & Live WYSIWYG Preview */}
              {renderThemeAllotmentPicker(
                editThemePreset,
                setEditThemePreset,
                editName,
                editShortCode,
                editInstitution,
                editLoginHeroText
              )}

              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                  TENANT ADMIN GMAIL (REASSIGN ADMIN) *
                </label>
                <input
                  type="email"
                  required
                  value={editAdminEmail}
                  onChange={(e) => setEditAdminEmail(e.target.value)}
                  className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-mono font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                />
                <p className="text-[10px] text-[var(--nb-secondary)] mt-1">
                  Changing this will assign admin rights to the new Gmail on their next Google sign-in.
                </p>
              </div>

              {/* Status toggle in modal */}
              <div 
                className="flex items-center justify-between p-3 rounded-md bg-[var(--nb-surface-accent)]"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <div>
                  <p className="text-xs font-bold text-[var(--nb-content)]">Tenant Status</p>
                  <p className="text-[10px] text-[var(--nb-secondary)]">
                    {editingTenant.status === 'active' ? 'Users can log in and access the association.' : 'Tenant is deactivated. Users cannot log in.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleTenantStatus(editingTenant)}
                  className={`text-[10px] font-mono font-bold uppercase px-3 py-1.5 rounded cursor-pointer border border-[var(--nb-ink)] transition-colors ${
                    editingTenant.status === 'active'
                      ? 'bg-emerald-400 text-neutral-900 hover:bg-rose-400'
                      : 'bg-neutral-300 text-neutral-800 hover:bg-emerald-400'
                  }`}
                >
                  {editingTenant.status === 'active' ? '● Active' : '○ Inactive'}
                </button>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="flex-1 nb-btn-ghost py-2.5 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 nb-btn py-2.5 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD NEW TENANT MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-4">
          <div 
            className="bg-[var(--nb-surface)] rounded-xl max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
            style={{ border: '2.5px solid var(--nb-ink)', boxShadow: '6px 6px 0 var(--nb-ink)' }}
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--nb-ink)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--nb-accent)]" />
                <h3 className="nb-headline text-lg text-[var(--nb-content)]">PROVISION NEW TENANT</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="nb-btn-icon !w-8 !h-8 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded bg-rose-500/10 border-2 border-rose-500 text-rose-500 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="space-y-3.5">
              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                  TENANT ID / SLUG (URL & EMAIL IDENTIFIER) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ece-dept or mech-dept"
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-mono font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                />
                <p className="text-[10px] text-[var(--nb-secondary)] mt-1 font-mono">
                  Students will login with: rollnumber.{newTenantId || 'tenantid'}@notx.com
                </p>
              </div>

              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                  ASSOCIATION / DEPARTMENT NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ECE Department Association"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                    SHORT CODE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ECE"
                    value={newShortCode}
                    onChange={(e) => setNewShortCode(e.target.value.toUpperCase())}
                    className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-mono font-bold"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>
                <div>
                  <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                    COLLEGE / INSTITUTION NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Annamacharya Institute of Tech & Sciences"
                    value={newInstitution}
                    onChange={(e) => setNewInstitution(e.target.value)}
                    className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-bold"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                  LOGIN HERO ANNOUNCEMENT / TAGLINE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official department pass verification, live notifications, and digital credentials."
                  value={newLoginHeroText}
                  onChange={(e) => setNewLoginHeroText(e.target.value)}
                  className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                />
              </div>

              {/* Theme Preset Allotment Console & Live WYSIWYG Preview */}
              {renderThemeAllotmentPicker(
                newThemePreset,
                setNewThemePreset,
                newName,
                newShortCode,
                newInstitution,
                newLoginHeroText
              )}

              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                  TENANT ADMIN GMAIL (AUTHORIZED GOOGLE SIGN-IN) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ece.hod@gmail.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-2.5 outline-none font-mono font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                />
                <p className="text-[10px] text-[var(--nb-secondary)] mt-1">
                  This Gmail will automatically receive Admin rights when signing in with Google.
                </p>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 nb-btn-ghost py-2.5 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 nb-btn py-2.5 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Provision Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AUTOMATED VALIDATION & AUDIT MODAL ── */}
      {isValidationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4">
          <div 
            className="bg-[var(--nb-surface)] w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] rounded-xl overflow-hidden flex flex-col shadow-[6px_6px_0_var(--nb-ink)]"
            style={{ border: '3px solid var(--nb-ink)' }}
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-[var(--nb-yellow)] text-neutral-900 border-b-2 border-[var(--nb-ink)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded bg-[var(--nb-surface)] border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] shrink-0">
                  <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-sm sm:text-base uppercase tracking-wider leading-tight truncate">
                    Security & Isolation Audit Suite
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-mono font-bold opacity-80 truncate">
                    Phase 6 Automated Multi-Tenant Verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsValidationModalOpen(false)}
                className="nb-btn-icon !w-8 !h-8 rounded cursor-pointer"
              >
                <X className="w-4 h-4 text-neutral-900" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {isValidating ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--nb-secondary)]">
                    Running Cryptographic & Isolation Validations...
                  </p>
                </div>
              ) : validationResults ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div 
                    className={`p-3.5 rounded-lg flex items-center justify-between border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] ${
                      validationResults.failed === 0 
                        ? 'bg-emerald-400 text-neutral-900' 
                        : 'bg-rose-400 text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {validationResults.failed === 0 ? (
                        <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-display font-black text-sm uppercase">
                          {validationResults.failed === 0 
                            ? 'All Security & Tenant Checks Passed' 
                            : `${validationResults.failed} Check(s) Failed`}
                        </div>
                        <div className="text-[10px] font-mono">
                          {validationResults.passed} of {validationResults.total} assertions validated successfully.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                      <span className="bg-[var(--nb-surface)]/90 px-2 py-0.5 rounded border border-[var(--nb-ink)]">
                        {validationResults.passed}/{validationResults.total} PASS
                      </span>
                    </div>
                  </div>

                  {/* Test Results Breakdown */}
                  <div className="space-y-2">
                    <h4 className="nb-label text-[10px] text-[var(--nb-secondary)]">
                      VERIFICATION ASSERTIONS BREAKDOWN
                    </h4>
                    <div className="space-y-2">
                      {validationResults.results.map((res, idx) => (
                        <div 
                          key={idx}
                          className="p-3 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="nb-pill-purple text-[8.5px] font-mono font-bold uppercase">
                                {res.suite}
                              </span>
                              <span className="text-xs font-bold text-[var(--nb-content)]">
                                {res.testName}
                              </span>
                            </div>
                            {res.details && (
                              <p className="text-[10px] font-mono text-[var(--nb-secondary)] break-words">
                                {res.details}
                              </p>
                            )}
                            {res.error && (
                              <p className="text-[10px] font-mono text-rose-500 font-bold">
                                Error: {res.error}
                              </p>
                            )}
                          </div>

                          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)] flex-shrink-0 ${
                            res.passed ? 'bg-emerald-400 text-neutral-900' : 'bg-rose-400 text-neutral-900'
                          }`}>
                            {res.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-[var(--nb-secondary)]">
                  Click below to execute the verification suite.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[var(--nb-surface-accent)] border-t border-[var(--nb-ink)]/20 flex items-center justify-between">
              <button
                onClick={handleRunValidation}
                disabled={isValidating}
                className="nb-btn-ghost py-2 px-3 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <FlaskConical className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                <span>Re-run Audit</span>
              </button>
              <button
                onClick={() => setIsValidationModalOpen(false)}
                className="nb-btn py-2 px-4 text-xs font-bold uppercase cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
