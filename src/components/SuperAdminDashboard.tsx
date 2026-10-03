import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Code2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Terminal,
  Linkedin,
  Github,
  Search,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Activity,
  Ticket,
  ShieldAlert,
  FileDown,
  RotateCcw,
  Eye,
  Archive,
  History,
  Clock,
  Database,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  MessageCircle,
  CornerDownRight,
  UserCheck,
  Send,
  Flame,
  Bug,
  CheckCheck,
  AlertOctagon,
  Palette,
  Sliders,
  Check
} from 'lucide-react';
import { 
  Tenant, 
  UserProfile, 
  PlatformBuilder, 
  PlatformDevConfig, 
  DEFAULT_PLATFORM_BUILDERS, 
  DEFAULT_PLATFORM_DEV_CONFIG,
  DEV_COLOR_PRESETS,
  AuditLogEntry,
  DeletedBackup,
  SupportTicket,
  TicketCategory,
  TicketStatus,
  SystemLogEntry,
  SystemLogLevel,
  SystemLogCategory,
  AppBranding,
  DEFAULT_BRANDING
} from '../types';
import { 
  logger,
  subscribeToSystemLogs,
  updateLogResolvedStatus,
  purgeSystemLogs
} from '../services/logger';
import { 
  getAllTenants, 
  createTenant, 
  updateTenant, 
  deleteTenant,
  updateAppBranding, 
  subscribeToTenants, 
  fetchUsers, 
  fetchEvents, 
  fetchRegistrations,
  getPlatformDevConfig,
  updatePlatformDevConfig,
  subscribeToPlatformDevConfig,
  subscribeToAuditLogs,
  subscribeToDeletedBackups,
  restoreDeletedBackup,
  purgeDeletedBackup,
  subscribeToAllTickets,
  addTicketReply,
  updateTicketStatus,
  markTicketRead,
  deleteSupportTicket,
  DEFAULT_TENANT_ID,
  updatePlatformBranding,
  subscribeToPlatformBranding,
  DEFAULT_PLATFORM_BRANDING
} from '../firebase';

import { runSecurityAndTenantValidation, TestResult } from '../utils/testTenantSecurity';
import BrandLogo, { BRAND_ICONS } from './BrandLogo';
import ImageUploader from './ImageUploader';
import { THEME_PRESETS, ThemePresetKey, TenantThemeConfig, resolveTenantTheme } from '../utils/themePresets';
import ManagePlatformDevelopersModal from './ManagePlatformDevelopersModal';
import DeleteTenantModal from './DeleteTenantModal';

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
  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null);

  // Per-tenant live telemetry
  const [tenantStats, setTenantStats] = useState<Record<string, TenantStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  // Navigation, Search & Filter controls
  const [activeMainTab, setActiveMainTab] = useState<'tenants' | 'developers' | 'branding' | 'audit' | 'vault' | 'tickets' | 'crashes'>('tenants');

  // Platform Master Branding (NOTX Global Identity)
  const [platformBranding, setPlatformBranding] = useState<AppBranding>(DEFAULT_PLATFORM_BRANDING);
  const [platformBrandingForm, setPlatformBrandingForm] = useState<AppBranding>(DEFAULT_PLATFORM_BRANDING);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSaveSuccess, setBrandingSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Support Tickets Fleet state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketTenantFilter, setTicketTenantFilter] = useState('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [isSendingTicketReply, setIsSendingTicketReply] = useState(false);
  const [isUpdatingTicketStatus, setIsUpdatingTicketStatus] = useState(false);

  // System Crash & Telemetry Engine state
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logSearch, setLogSearch] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<'all' | SystemLogLevel>('all');
  const [logCategoryFilter, setLogCategoryFilter] = useState<'all' | string>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [logTenantFilter, setLogTenantFilter] = useState('all');
  const [inspectingLog, setInspectingLog] = useState<SystemLogEntry | null>(null);
  const [isPurgingLogs, setIsPurgingLogs] = useState(false);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Audit Trail state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTenantFilter, setAuditTenantFilter] = useState('all');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Deleted Vault state
  const [deletedBackups, setDeletedBackups] = useState<DeletedBackup[]>([]);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultTenantFilter, setVaultTenantFilter] = useState('all');
  const [vaultTypeFilter, setVaultTypeFilter] = useState('all');
  const [inspectingBackup, setInspectingBackup] = useState<DeletedBackup | null>(null);
  const [isRestoringBackupId, setIsRestoringBackupId] = useState<string | null>(null);
  const [isPurgingBackupId, setIsPurgingBackupId] = useState<string | null>(null);


  // Modal Segmentation: 'credentials' | 'theme'
  const [modalTab, setModalTab] = useState<'credentials' | 'theme'>('credentials');

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

  // Add Tenant Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  // Global notification banner
  const [globalFeedback, setGlobalFeedback] = useState('');

  // Delete Tenant Stepped Modal state
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  // Platform Dev Config state (Managed Exclusively by Super Admin)
  const [platformDevConfig, setPlatformDevConfig] = useState<PlatformDevConfig>(() => {
    const cached = localStorage.getItem('notx_platform_devs');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return DEFAULT_PLATFORM_DEV_CONFIG;
  });
  const [isManageDevsModalOpen, setIsManageDevsModalOpen] = useState(false);

  // Automated Validation Suite states
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // 1. Subscribe to Tenant fleet
  useEffect(() => {
    const unsub = subscribeToTenants((list) => {
      setTenants(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Global Platform Developers configuration
  useEffect(() => {
    const unsub = subscribeToPlatformDevConfig((config) => {
      setPlatformDevConfig(config);
    });
    return () => unsub();
  }, []);

  // 2b. Subscribe to Global Master Platform Branding
  useEffect(() => {
    const unsub = subscribeToPlatformBranding((brand) => {
      setPlatformBranding(brand);
      setPlatformBrandingForm(brand);
    });
    return () => unsub();
  }, []);

  const handleSavePlatformBranding = async () => {
    setIsSavingBranding(true);
    setBrandingSaveSuccess(false);
    try {
      await updatePlatformBranding(platformBrandingForm);
      setPlatformBranding(platformBrandingForm);
      setBrandingSaveSuccess(true);
      setTimeout(() => setBrandingSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving platform branding:', err);
      alert('Failed to save platform branding: ' + (err.message || err));
    } finally {
      setIsSavingBranding(false);
    }
  };

  // 3. Subscribe to real-time Audit Trail
  useEffect(() => {
    const unsub = subscribeToAuditLogs((logs) => {
      setAuditLogs(logs);
      setAuditLoading(false);
    }, 250);
    return () => unsub();
  }, []);

  // 4. Subscribe to real-time Deleted Items Vault
  useEffect(() => {
    const unsub = subscribeToDeletedBackups((backups) => {
      setDeletedBackups(backups);
      setVaultLoading(false);
    });
    return () => unsub();
  }, []);

  // 5. Subscribe to real-time Support Tickets
  useEffect(() => {
    const unsub = subscribeToAllTickets((list) => {
      setTickets(list);
      setTicketsLoading(false);
    });
    return () => unsub();
  }, []);

  // 6. Subscribe to real-time System Crash Logs
  useEffect(() => {
    const unsub = subscribeToSystemLogs((logs) => {
      setSystemLogs(logs);
      setLogsLoading(false);
    }, 200);
    return () => unsub();
  }, []);

  // 7. Body Scroll Locking when any modal is open (Prevents double scroll)
  useEffect(() => {
    const hasModal = isAddModalOpen || !!editingTenant || !!deletingTenant || isValidationModalOpen || isManageDevsModalOpen || !!inspectingBackup || !!inspectingLog;
    if (hasModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAddModalOpen, editingTenant, deletingTenant, isValidationModalOpen, isManageDevsModalOpen, inspectingBackup, inspectingLog]);


  // 4. Parallelized Batch Telemetry Loading (High Performance)
  const loadTenantStats = async () => {
    if (tenants.length === 0) return;
    setStatsLoading(true);
    try {
      const entries = await Promise.all(
        tenants.map(async (tenant) => {
          try {
            const [users, events, regs] = await Promise.all([
              fetchUsers(tenant.tenantId),
              fetchEvents(tenant.tenantId),
              fetchRegistrations(tenant.tenantId)
            ]);
            const tenantAdminEmail = tenant.adminEmail?.trim().toLowerCase();
            const nonSuperUsers = users.filter(u => !u.isSuperAdmin && u.uid !== 'admin_master');
            const hasRealAdmin = nonSuperUsers.some(
              u => u.role === 'admin' && !u.uid.startsWith(`admin_${tenant.tenantId}`) && u.email?.trim().toLowerCase() === tenantAdminEmail
            );
            const dedupedUsers = hasRealAdmin 
              ? nonSuperUsers.filter(u => !u.uid.startsWith(`admin_${tenant.tenantId}`))
              : nonSuperUsers;

            return [tenant.tenantId, {
              users: dedupedUsers.length,
              events: events.length,
              registrations: regs.length
            }] as const;
          } catch (e) {
            return [tenant.tenantId, { users: 0, events: 0, registrations: 0 }] as const;
          }
        })
      );
      setTenantStats(Object.fromEntries(entries));
    } catch (err) {
      console.error('Error loading tenant stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (tenants.length > 0) {
      loadTenantStats();
    }
  }, [tenants.length]);

  // 5. Global KPI Aggregation
  const kpiMetrics = useMemo(() => {
    let totalUsers = 0;
    let totalEvents = 0;
    let totalRegistrations = 0;
    Object.values(tenantStats).forEach(s => {
      totalUsers += s.users;
      totalEvents += s.events;
      totalRegistrations += s.registrations;
    });
    const activeCount = tenants.filter(t => t.status === 'active').length;
    const inactiveCount = tenants.filter(t => t.status === 'inactive').length;
    return {
      totalTenants: tenants.length,
      activeTenants: activeCount,
      inactiveTenants: inactiveCount,
      totalUsers,
      totalEvents,
      totalRegistrations
    };
  }, [tenants, tenantStats]);

  // 6. Real-time Search and Filtered Fleet
  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tenants.filter(t => {
      if (statusFilter === 'active' && t.status !== 'active') return false;
      if (statusFilter === 'inactive' && t.status === 'active') return false;
      if (!q) return true;
      const matchName = t.name.toLowerCase().includes(q);
      const matchId = t.tenantId.toLowerCase().includes(q);
      const matchEmail = (t.adminEmail || '').toLowerCase().includes(q);
      const matchInst = (t.institution || '').toLowerCase().includes(q);
      const matchShort = (t.shortCode || '').toLowerCase().includes(q);
      return matchName || matchId || matchEmail || matchInst || matchShort;
    });
  }, [tenants, searchQuery, statusFilter]);

  // 7. Audit Log Filtering & Search
  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter(log => {
      if (auditTenantFilter !== 'all' && log.tenantId !== auditTenantFilter) return false;
      if (auditSeverityFilter !== 'all' && log.severity !== auditSeverityFilter) return false;
      if (auditCategoryFilter !== 'all') {
        if (!log.action.toLowerCase().startsWith(auditCategoryFilter.toLowerCase())) return false;
      }
      if (!q) return true;
      const matchAction = log.action.toLowerCase().includes(q);
      const matchActor = (log.actor?.email || '').toLowerCase().includes(q) || (log.actor?.name || '').toLowerCase().includes(q);
      const matchEntity = (log.entityName || '').toLowerCase().includes(q) || (log.entityType || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      const matchId = (log.logId || '').toLowerCase().includes(q);
      return matchAction || matchActor || matchEntity || matchDetails || matchId;
    });
  }, [auditLogs, auditSearch, auditTenantFilter, auditSeverityFilter, auditCategoryFilter]);

  const auditMetrics = useMemo(() => {
    const critical = auditLogs.filter(l => l.severity === 'critical').length;
    const warning = auditLogs.filter(l => l.severity === 'warning').length;
    const info = auditLogs.filter(l => l.severity === 'info').length;
    return {
      total: auditLogs.length,
      critical,
      warning,
      info
    };
  }, [auditLogs]);

  // 8. Deleted Vault Filtering & Search
  const filteredDeletedBackups = useMemo(() => {
    const q = vaultSearch.trim().toLowerCase();
    return deletedBackups.filter(item => {
      if (vaultTenantFilter !== 'all' && item.tenantId !== vaultTenantFilter) return false;
      if (vaultTypeFilter !== 'all' && item.entityType !== vaultTypeFilter) return false;
      if (!q) return true;
      const matchName = (item.entityName || '').toLowerCase().includes(q);
      const matchId = item.entityId.toLowerCase().includes(q) || item.backupId.toLowerCase().includes(q);
      const matchUser = (item.deletedBy?.email || '').toLowerCase().includes(q) || (item.deletedBy?.name || '').toLowerCase().includes(q);
      return matchName || matchId || matchUser;
    });
  }, [deletedBackups, vaultSearch, vaultTenantFilter, vaultTypeFilter]);

  const vaultMetrics = useMemo(() => {
    const cascades = deletedBackups.filter(b => b.entityType === 'event_cascade').length;
    const restored = deletedBackups.filter(b => !!b.restoredAt).length;
    const resets = deletedBackups.filter(b => b.entityType === 'association_reset').length;
    return {
      total: deletedBackups.length,
      cascades,
      restored,
      resets
    };
  }, [deletedBackups]);

  // Export audit logs as CSV
  const exportAuditLogsToCSV = () => {
    if (filteredAuditLogs.length === 0) {
      alert('No audit logs available for current filter.');
      return;
    }
    const headers = ['Timestamp', 'Log ID', 'Action', 'Severity', 'Tenant ID', 'Actor Email', 'Actor Name', 'Actor Role', 'Entity Type', 'Entity ID', 'Entity Name', 'Details'];
    const rows = filteredAuditLogs.map(log => [
      `"${log.timestamp}"`,
      `"${log.logId}"`,
      `"${log.action}"`,
      `"${log.severity}"`,
      `"${log.tenantId}"`,
      `"${log.actor?.email || ''}"`,
      `"${log.actor?.name || ''}"`,
      `"${log.actor?.role || ''}"`,
      `"${log.entityType}"`,
      `"${log.entityId || ''}"`,
      `"${(log.entityName || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NOTX_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreBackup = async (backup: DeletedBackup) => {
    const isTenant = backup.entityType === 'tenant' || backup.entityType === 'tenant_cascade';
    const confirmMessage = isTenant
      ? `Are you sure you want to REVIVE organization "${backup.entityName}" (${backup.entityId})? This will immediately restore the tenant portal and re-activate all cascaded users, events, and student records back to the fleet.`
      : `Are you sure you want to restore "${backup.entityName}" back to the active database? This will revive all child records if it was a cascading event.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }
    setIsRestoringBackupId(backup.backupId);
    try {
      await restoreDeletedBackup(backup.backupId, {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        isSuperAdmin: true
      });
      const successMsg = isTenant
        ? `Successfully revived organization "${backup.entityName}"! Restored to active fleet.`
        : `Successfully restored "${backup.entityName}" to active database.`;
      setGlobalFeedback(successMsg);
      setTimeout(() => setGlobalFeedback(''), 5000);
      if (inspectingBackup?.backupId === backup.backupId) {
        setInspectingBackup(null);
      }
    } catch (err: any) {
      console.error('Failed to restore backup:', err);
      alert(`Restore failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRestoringBackupId(null);
    }
  };

  const handlePurgeBackup = async (backup: DeletedBackup) => {
    if (!window.confirm(`⚠️ PERMANENT DESTRUCTION WARNING: Are you absolutely sure you want to permanently purge "${backup.entityName}"? This record will be permanently wiped from the Deleted Vault and cannot be recovered.`)) {
      return;
    }
    setIsPurgingBackupId(backup.backupId);
    try {
      await purgeDeletedBackup(backup.backupId, {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        isSuperAdmin: true
      });
      setGlobalFeedback(`Permanently purged "${backup.entityName}" from vault.`);
      setTimeout(() => setGlobalFeedback(''), 5000);
      if (inspectingBackup?.backupId === backup.backupId) {
        setInspectingBackup(null);
      }
    } catch (err: any) {
      console.error('Failed to purge backup:', err);
      alert(`Purge failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPurgingBackupId(null);
    }
  };

  // Developer Quick Controls
  const handleQuickReorderBuilder = async (index: number, direction: 'up' | 'down') => {

    const members = platformDevConfig.members && platformDevConfig.members.length > 0 
      ? [...platformDevConfig.members] 
      : [...DEFAULT_PLATFORM_BUILDERS];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= members.length) return;
    const [moved] = members.splice(index, 1);
    members.splice(targetIdx, 0, moved);
    const updated: PlatformDevConfig = {
      ...platformDevConfig,
      members: members.map((m, idx) => ({ ...m, order: idx }))
    };
    setPlatformDevConfig(updated);
    try {
      await updatePlatformDevConfig(updated);
      setGlobalFeedback("Developer order updated and synchronized!");
      setTimeout(() => setGlobalFeedback(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickDeleteBuilder = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the platform developers list?`)) return;
    const currentMembers = platformDevConfig.members && platformDevConfig.members.length > 0 
      ? platformDevConfig.members 
      : DEFAULT_PLATFORM_BUILDERS;
    const updatedMembers = currentMembers.filter(m => m.id !== id);
    const updated: PlatformDevConfig = {
      ...platformDevConfig,
      members: updatedMembers
    };
    setPlatformDevConfig(updated);
    try {
      await updatePlatformDevConfig(updated);
      setGlobalFeedback(`Removed ${name} from platform developers list.`);
      setTimeout(() => setGlobalFeedback(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

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

  const handleCopyLink = (tenantId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?tenant=${tenantId}`;
    navigator.clipboard.writeText(url);
    setCopiedTenantId(tenantId);
    setTimeout(() => setCopiedTenantId(null), 2500);
  };

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
    setModalTab('credentials');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditFormError('');

    if (!editName.trim() || !editAdminEmail.trim()) {
      setEditFormError('Association Name and Admin Gmail are required.');
      setModalTab('credentials');
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
      }, 1000);
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
      setModalTab('credentials');
      return;
    }

    if (tenants.some(t => t.tenantId === cleanSlug)) {
      setFormError(`A tenant with ID "${cleanSlug}" already exists.`);
      setModalTab('credentials');
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

  // Filtered tickets for Super Admin
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const q = ticketSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        t.subject.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        (t.userRoll && t.userRoll.toLowerCase().includes(q)) ||
        t.userEmail.toLowerCase().includes(q) ||
        (t.readableId && t.readableId.toLowerCase().includes(q));

      const matchesTenant = ticketTenantFilter === 'all' || 
        t.tenantId.toLowerCase() === ticketTenantFilter.toLowerCase();

      const matchesStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
      const matchesCategory = ticketCategoryFilter === 'all' || t.category === ticketCategoryFilter;

      return matchesSearch && matchesTenant && matchesStatus && matchesCategory;
    });
  }, [tickets, ticketSearch, ticketTenantFilter, ticketStatusFilter, ticketCategoryFilter]);

  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const unreadTicketsCount = tickets.filter(t => t.unreadByAdmin).length;

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  // Auto-mark read by admin when selected
  useEffect(() => {
    if (selectedTicket && selectedTicket.unreadByAdmin) {
      markTicketRead(selectedTicket.id, 'admin').catch(err => {
        console.warn('Failed to mark ticket read for admin:', err);
      });
    }
  }, [selectedTicket?.id, selectedTicket?.unreadByAdmin]);

  const handleSendSuperAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReplyText.trim() || isSendingTicketReply) return;

    setIsSendingTicketReply(true);
    try {
      await addTicketReply(
        selectedTicket.id,
        {
          senderId: currentUser.uid,
          senderName: currentUser.name || 'Super Admin',
          senderEmail: currentUser.email,
          senderRole: 'super_admin',
          message: ticketReplyText.trim()
        },
        true
      );
      setTicketReplyText('');
      setGlobalFeedback(`Official Super Admin reply transmitted to ${selectedTicket.userName}!`);
      setTimeout(() => setGlobalFeedback(''), 4000);
    } catch (err: any) {
      console.error('Failed to send super admin reply:', err);
      setGlobalFeedback('Failed to transmit reply.');
      setTimeout(() => setGlobalFeedback(''), 3000);
    } finally {
      setIsSendingTicketReply(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: TicketStatus) => {
    setIsUpdatingTicketStatus(true);
    try {
      await updateTicketStatus(ticketId, newStatus);
      setGlobalFeedback(`Ticket status updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setGlobalFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    } finally {
      setIsUpdatingTicketStatus(false);
    }
  };

  const handleDeleteTicket = async (ticket: SupportTicket) => {
    if (!window.confirm(`Delete support ticket #${ticket.readableId || ticket.id.slice(0, 8)} permanently?`)) return;
    try {
      await deleteSupportTicket(ticket.id);
      if (selectedTicketId === ticket.id) setSelectedTicketId(null);
      setGlobalFeedback('Support ticket deleted from registry.');
      setTimeout(() => setGlobalFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
  };

  const unresolvedCrashesCount = useMemo(() => {
    return systemLogs.filter(l => !l.resolved && (l.level === 'error' || l.category === 'react_crash')).length;
  }, [systemLogs]);

  const filteredSystemLogs = useMemo(() => {
    return systemLogs.filter(l => {
      const q = logSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        l.message.toLowerCase().includes(q) ||
        (l.errorName && l.errorName.toLowerCase().includes(q)) ||
        l.logId.toLowerCase().includes(q) ||
        (l.context?.userEmail && l.context.userEmail.toLowerCase().includes(q)) ||
        (l.context?.url && l.context.url.toLowerCase().includes(q));

      const matchesLevel = logLevelFilter === 'all' || l.level === logLevelFilter;
      const matchesCategory = logCategoryFilter === 'all' || l.category === logCategoryFilter;
      const matchesStatus = logStatusFilter === 'all' || (logStatusFilter === 'resolved' ? l.resolved : !l.resolved);
      const matchesTenant = logTenantFilter === 'all' || l.context?.tenantId === logTenantFilter;

      return matchesSearch && matchesLevel && matchesCategory && matchesStatus && matchesTenant;
    });
  }, [systemLogs, logSearch, logLevelFilter, logCategoryFilter, logStatusFilter, logTenantFilter]);

  const handleToggleResolveLog = async (log: SystemLogEntry) => {
    try {
      await updateLogResolvedStatus(log.logId, !log.resolved);
      if (inspectingLog?.logId === log.logId) {
        setInspectingLog({ ...inspectingLog, resolved: !log.resolved });
      }
      setGlobalFeedback(`Log marked as ${!log.resolved ? 'RESOLVED' : 'UNRESOLVED'}`);
      setTimeout(() => setGlobalFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to update log status:', err);
    }
  };

  const handlePurgeLogs = async (olderThanDays: number) => {
    if (!window.confirm(`Purge system telemetry logs older than ${olderThanDays} days?`)) return;
    setIsPurgingLogs(true);
    try {
      const count = await purgeSystemLogs(olderThanDays);
      setGlobalFeedback(`Purged ${count} legacy system logs successfully.`);
      setTimeout(() => setGlobalFeedback(''), 3500);
    } catch (err) {
      console.error('Failed to purge logs:', err);
    } finally {
      setIsPurgingLogs(false);
    }
  };

  const handleTriggerTestTelemetry = async () => {
    try {
      await logger.captureMessage('Diagnostic ping from Super Admin Console', 'info', {
        category: 'general',
        context: {
          userEmail: currentUser.email,
          userRole: 'super_admin'
        }
      });
      setGlobalFeedback('Diagnostic telemetry signal sent successfully!');
      setTimeout(() => setGlobalFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to trigger diagnostic telemetry:', err);
    }
  };

  const handleCopyLogReport = (log: SystemLogEntry) => {
    const report = [
      `### 💥 System Incident Report: ${log.logId}`,
      `- **Timestamp**: ${log.timestamp}`,
      `- **Level**: ${log.level.toUpperCase()}`,
      `- **Category**: ${log.category}`,
      `- **Status**: ${log.resolved ? 'RESOLVED' : 'UNRESOLVED'}`,
      `- **Hits / Occurrences**: ${log.hitCount}`,
      `- **Tenant**: ${log.context?.tenantId || 'global'}`,
      `- **User**: ${log.context?.userEmail || log.context?.userId || 'Anonymous'}`,
      `- **URL**: ${log.context?.url || 'N/A'}`,
      `- **User Agent**: ${log.context?.userAgent || 'N/A'}`,
      `- **Error Name**: ${log.errorName || 'Error'}`,
      `- **Message**: ${log.message}`,
      '\n**Call Stack**:',
      '```',
      log.stackTrace || 'No call stack available',
      '```',
      '\n**React Component Stack**:',
      '```',
      log.componentStack || 'No component stack captured',
      '```'
    ].join('\n');

    navigator.clipboard.writeText(report).then(() => {
      setCopiedLogId(log.logId);
      setTimeout(() => setCopiedLogId(null), 2500);
    });
  };

  return (
    <div 
      className={`fixed inset-0 h-full w-full ${isAddModalOpen || !!editingTenant || !!deletingTenant || isValidationModalOpen || isManageDevsModalOpen ? 'overflow-hidden' : 'overflow-y-auto'} bg-[var(--nb-bg)] text-[var(--nb-content)] flex flex-col font-sans selection:bg-amber-400 selection:text-neutral-900`}
    >
      
      {/* ── 1. MASTER COMMAND HEADER ── */}
      <header className="border-b-[2.5px] border-[var(--nb-ink)] bg-[var(--nb-surface)] sticky top-0 z-30 shadow-[0_2px_0_var(--nb-ink)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Operational Status */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-md bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center shadow-[2px_2px_0_var(--nb-ink)] shrink-0">
              <Layers className="w-5 h-5 text-neutral-900" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg tracking-wider text-[var(--nb-content)]">
                  NOTX
                </span>
                <span className="nb-pill-coral text-[8.5px] font-mono font-bold uppercase py-0.5 px-1.5 shrink-0">
                  SAAS ROOT
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  All Systems Operational
                </span>
              </div>
              <p className="text-[10px] font-mono text-[var(--nb-secondary)] truncate hidden xs:block">
                Universal Multi-Tenant Academic Command Center
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-[var(--nb-surface-accent)] rounded border border-[var(--nb-ink)] text-xs font-mono font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="truncate max-w-[180px]">{currentUser.email}</span>
            </div>

            <button
              onClick={() => {
                setModalTab('credentials');
                setIsAddModalOpen(true);
              }}
              className="nb-btn text-xs font-bold uppercase py-2 px-3 sm:px-3.5 flex items-center gap-1.5 cursor-pointer bg-[var(--nb-accent)] text-[var(--nb-bg)]"
              title="Provision a new association workspace"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Provision Tenant</span>
              <span className="sm:hidden">Add</span>
            </button>

            <button
              onClick={onLogout}
              className="nb-btn-ghost text-xs font-bold uppercase py-2 px-2.5 sm:px-3 flex items-center gap-1.5 cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              title="Sign Out of Super Admin Console"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. GLOBAL TELEMETRY RIBBON ── */}
      <section className="bg-[var(--nb-surface)] border-b-2 border-[var(--nb-ink)] shadow-[0_2px_0_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Metric 1: Tenants */}
            <div className="bg-[var(--nb-surface-accent)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-400 text-neutral-950 flex items-center justify-center font-bold shrink-0 border border-neutral-900 shadow-[1px_1px_0_#000]">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-black text-xl sm:text-2xl text-[var(--nb-content)] leading-none">
                  {kpiMetrics.totalTenants}
                </div>
                <div className="text-[10px] font-mono font-bold uppercase text-[var(--nb-secondary)] truncate mt-1">
                  Onboarded Tenants
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono mt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{kpiMetrics.activeTenants} Active</span>
                  <span>•</span>
                  <span className="text-neutral-500">{kpiMetrics.inactiveTenants} Inactive</span>
                </div>
              </div>
            </div>

            {/* Metric 2: Registered Students */}
            <div className="bg-[var(--nb-surface-accent)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-emerald-400 text-neutral-950 flex items-center justify-center font-bold shrink-0 border border-neutral-900 shadow-[1px_1px_0_#000]">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-black text-xl sm:text-2xl text-[var(--nb-content)] leading-none">
                  {statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    kpiMetrics.totalUsers.toLocaleString()
                  )}
                </div>
                <div className="text-[10px] font-mono font-bold uppercase text-[var(--nb-secondary)] truncate mt-1">
                  Student Community
                </div>
                <div className="text-[9px] font-mono text-[var(--nb-secondary)] truncate mt-0.5">
                  Across all associations
                </div>
              </div>
            </div>

            {/* Metric 3: Total Events */}
            <div className="bg-[var(--nb-surface-accent)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-violet-400 text-neutral-950 flex items-center justify-center font-bold shrink-0 border border-neutral-900 shadow-[1px_1px_0_#000]">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-black text-xl sm:text-2xl text-[var(--nb-content)] leading-none">
                  {statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    kpiMetrics.totalEvents.toLocaleString()
                  )}
                </div>
                <div className="text-[10px] font-mono font-bold uppercase text-[var(--nb-secondary)] truncate mt-1">
                  University Events
                </div>
                <div className="text-[9px] font-mono text-[var(--nb-secondary)] truncate mt-0.5">
                  Scheduled & hosted
                </div>
              </div>
            </div>

            {/* Metric 4: Event Passes & Registrations */}
            <div className="bg-[var(--nb-surface-accent)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-amber-400 text-neutral-950 flex items-center justify-center font-bold shrink-0 border border-neutral-900 shadow-[1px_1px_0_#000]">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-black text-xl sm:text-2xl text-[var(--nb-content)] leading-none">
                  {statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    kpiMetrics.totalRegistrations.toLocaleString()
                  )}
                </div>
                <div className="text-[10px] font-mono font-bold uppercase text-[var(--nb-secondary)] truncate mt-1">
                  Passes Issued
                </div>
                <div className="text-[9px] font-mono text-[var(--nb-secondary)] truncate mt-0.5">
                  Verified check-ins
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. MAIN DASHBOARD CONTENT AREA ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24 flex-1 w-full space-y-6">
        
        {/* Global Instant Feedback Toast */}
        {globalFeedback && (
          <div 
            className="p-3.5 rounded-lg bg-emerald-400 text-neutral-950 text-xs font-black flex items-center justify-between border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{globalFeedback}</span>
            </div>
            <button 
              onClick={() => setGlobalFeedback('')}
              className="text-neutral-900 hover:text-black font-mono cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── 4A. MASTER NAVIGATION TABS COMMAND DECK ── */}
        <div className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-1.5 sm:p-2">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveMainTab('tenants')}
              className={`px-3 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeMainTab === 'tenants'
                  ? 'bg-[var(--nb-accent)] text-[var(--nb-bg)] shadow-[2px_2px_0_var(--nb-ink)] font-black'
                  : 'text-[var(--nb-secondary)] hover:text-[var(--nb-content)] hover:bg-[var(--nb-surface)]/60'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Tenants Fleet</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeMainTab === 'tenants' ? 'bg-black/20 text-white' : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)] border border-[var(--nb-ink)]/20'}`}>
                {tenants.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('developers')}
              className={`px-3 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeMainTab === 'developers'
                  ? 'bg-amber-400 text-neutral-950 shadow-[2px_2px_0_var(--nb-ink)] font-black'
                  : 'text-[var(--nb-secondary)] hover:text-amber-500 hover:bg-[var(--nb-surface)]/60'
              }`}
            >
              <Code2 className="w-4 h-4 shrink-0" />
              <span>Platform Builders</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeMainTab === 'developers' ? 'bg-black/20 text-neutral-950' : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)] border border-[var(--nb-ink)]/20'}`}>
                {platformDevConfig.members?.length || 5}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('branding')}
              className={`px-3 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeMainTab === 'branding'
                  ? 'bg-amber-400 text-neutral-950 shadow-[2px_2px_0_var(--nb-ink)] font-black'
                  : 'text-[var(--nb-secondary)] hover:text-amber-500 hover:bg-[var(--nb-surface)]/60'
              }`}
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>Platform Brand</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('audit')}
              className={`px-3 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeMainTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-[2px_2px_0_var(--nb-ink)] font-black'
                  : 'text-[var(--nb-secondary)] hover:text-indigo-500 hover:bg-[var(--nb-surface)]/60'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Audit Trail</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeMainTab === 'audit' ? 'bg-black/25 text-white' : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)] border border-[var(--nb-ink)]/20'}`}>
                {auditLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('vault')}
              className={`px-3 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeMainTab === 'vault'
                  ? 'bg-rose-500 text-white shadow-[2px_2px_0_var(--nb-ink)] font-black'
                  : 'text-[var(--nb-secondary)] hover:text-rose-500 hover:bg-[var(--nb-surface)]/60'
              }`}
            >
              <Archive className="w-4 h-4 shrink-0" />
              <span>Deleted Vault</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeMainTab === 'vault' ? 'bg-black/25 text-white' : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)] border border-[var(--nb-ink)]/20'}`}>
                {deletedBackups.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('tickets')}
              className={`px-3 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 relative ${
                activeMainTab === 'tickets'
                  ? 'bg-emerald-500 text-neutral-950 shadow-[2px_2px_0_var(--nb-ink)] font-black'
                  : 'text-[var(--nb-secondary)] hover:text-emerald-500 hover:bg-[var(--nb-surface)]/60'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Support Tickets</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeMainTab === 'tickets' ? 'bg-black/20 text-neutral-950' : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)] border border-[var(--nb-ink)]/20'}`}>
                {tickets.length}
              </span>
              {openTicketsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                  activeMainTab === 'tickets' ? 'bg-neutral-900 text-white' : 'bg-rose-500 text-white animate-pulse'
                }`}>
                  {openTicketsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('crashes')}
              className={`px-3 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 relative ${
                activeMainTab === 'crashes'
                  ? 'bg-rose-600 text-white shadow-[2px_2px_0_var(--nb-ink)] font-black'
                  : 'text-[var(--nb-secondary)] hover:text-rose-500 hover:bg-[var(--nb-surface)]/60'
              }`}
            >
              <Flame className="w-4 h-4 shrink-0" />
              <span>Crash Telemetry</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeMainTab === 'crashes' ? 'bg-black/25 text-white' : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)] border border-[var(--nb-ink)]/20'}`}>
                {systemLogs.length}
              </span>
              {unresolvedCrashesCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                  activeMainTab === 'crashes' ? 'bg-neutral-900 text-rose-400' : 'bg-rose-500 text-white animate-pulse'
                }`}>
                  {unresolvedCrashesCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── 4B. CONTEXTUAL FILTER & ACTION TOOLBAR (PER TAB) ── */}
        {['tenants', 'audit', 'vault', 'crashes'].includes(activeMainTab) && (
          <div className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-2.5 sm:p-3">
            {/* Tenants Filter Deck */}
            {activeMainTab === 'tenants' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search department, slug code, admin email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none focus:border-[var(--nb-accent)] font-medium h-9.5"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="h-9.5 py-1 px-3 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer flex-1 sm:flex-none"
                  >
                    <option value="all">All Statuses ({tenants.length})</option>
                    <option value="active">Active Only ({kpiMetrics.activeTenants})</option>
                    <option value="inactive">Inactive Only ({kpiMetrics.inactiveTenants})</option>
                  </select>

                  <div className="flex items-center border border-[var(--nb-ink)] rounded-lg overflow-hidden h-9.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`h-full px-3 cursor-pointer transition-colors flex items-center justify-center ${
                        viewMode === 'grid' 
                          ? 'bg-[var(--nb-accent)] text-[var(--nb-bg)] font-bold' 
                          : 'bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)]'
                      }`}
                      title="Grid Layout"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`h-full px-3 cursor-pointer transition-colors border-l border-[var(--nb-ink)] flex items-center justify-center ${
                        viewMode === 'table' 
                          ? 'bg-[var(--nb-accent)] text-[var(--nb-bg)] font-bold' 
                          : 'bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)]'
                      }`}
                      title="Compact Table Layout"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={loadTenantStats}
                    disabled={statsLoading}
                    className="h-9.5 px-3 rounded-lg border border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-surface)] text-[var(--nb-content)] cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
                    title="Refresh Per-Tenant Metrics"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-mono font-bold hidden sm:inline">Sync</span>
                  </button>
                </div>
              </div>
            )}

            {/* Audit Trail Filter Deck */}
            {activeMainTab === 'audit' && (
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter actor, action, tenant, details..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none focus:border-indigo-500 font-medium h-9.5"
                  />
                  {auditSearch && (
                    <button 
                      onClick={() => setAuditSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-2">
                  <select
                    value={auditTenantFilter}
                    onChange={(e) => setAuditTenantFilter(e.target.value)}
                    className="h-9.5 py-1 px-2.5 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full lg:w-auto"
                  >
                    <option value="all">All Tenants</option>
                    {tenants.map(t => (
                      <option key={t.tenantId} value={t.tenantId}>{t.shortCode || t.name}</option>
                    ))}
                  </select>

                  <select
                    value={auditSeverityFilter}
                    onChange={(e) => setAuditSeverityFilter(e.target.value as any)}
                    className="h-9.5 py-1 px-2.5 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full lg:w-auto"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">🔴 Critical ({auditMetrics.critical})</option>
                    <option value="warning">🟡 Warning ({auditMetrics.warning})</option>
                    <option value="info">🟢 Info ({auditMetrics.info})</option>
                  </select>

                  <select
                    value={auditCategoryFilter}
                    onChange={(e) => setAuditCategoryFilter(e.target.value)}
                    className="h-9.5 py-1 px-2.5 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full lg:w-auto"
                  >
                    <option value="all">All Categories</option>
                    <option value="event">Events</option>
                    <option value="registration">Registrations</option>
                    <option value="certificate">Certificates</option>
                    <option value="winner">Winners</option>
                    <option value="announcement">Announcements</option>
                    <option value="album">Gallery</option>
                    <option value="tenant">Tenants</option>
                    <option value="backup">Vault</option>
                    <option value="system">System</option>
                  </select>

                  <button
                    type="button"
                    onClick={exportAuditLogsToCSV}
                    className="h-9.5 px-3 rounded-lg border border-[var(--nb-ink)] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_var(--nb-ink)] col-span-2 sm:col-span-1 lg:w-auto"
                    title="Export Filtered Audit Trail to CSV"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            )}

            {/* Deleted Vault Filter Deck */}
            {activeMainTab === 'vault' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search deleted record title, user, backup ID..."
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none focus:border-rose-500 font-medium h-9.5"
                  />
                  {vaultSearch && (
                    <button 
                      onClick={() => setVaultSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                  <select
                    value={vaultTenantFilter}
                    onChange={(e) => setVaultTenantFilter(e.target.value)}
                    className="h-9.5 py-1 px-3 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full sm:w-auto"
                  >
                    <option value="all">All Tenants</option>
                    {tenants.map(t => (
                      <option key={t.tenantId} value={t.tenantId}>{t.shortCode || t.name}</option>
                    ))}
                  </select>

                  <select
                    value={vaultTypeFilter}
                    onChange={(e) => setVaultTypeFilter(e.target.value)}
                    className="h-9.5 py-1 px-3 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full sm:w-auto"
                  >
                    <option value="all">All Types ({deletedBackups.length})</option>
                    <option value="event_cascade">Event (Cascading with Passes & Certs)</option>
                    <option value="event">Single Event</option>
                    <option value="registration">Registration / Pass</option>
                    <option value="certificate">Certificate</option>
                    <option value="event_winner">Winner</option>
                    <option value="announcement">Announcement</option>
                    <option value="album">Gallery Album</option>
                    <option value="association_reset">Association Term Reset</option>
                    <option value="tenant">Tenant Instance</option>
                  </select>
                </div>
              </div>
            )}

            {/* Crash Telemetry Filter Deck */}
            {activeMainTab === 'crashes' && (
              <div className="space-y-2.5">
                {/* Search Bar on Top */}
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search crash error, message, URL, affected user email..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none focus:border-rose-500 font-medium h-9.5"
                  />
                  {logSearch && (
                    <button 
                      onClick={() => setLogSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Selects & Action Buttons Row */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
                  {/* Selects: 2-column on mobile, inline-flex on desktop */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:flex items-center gap-2 flex-1">
                    <select
                      value={logTenantFilter}
                      onChange={(e) => setLogTenantFilter(e.target.value)}
                      className="h-9 py-1 px-2.5 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">All Scopes</option>
                      <option value="global">Global / Pre-Auth</option>
                      {tenants.map(t => (
                        <option key={t.tenantId} value={t.tenantId}>{t.shortCode || t.name}</option>
                      ))}
                    </select>

                    <select
                      value={logLevelFilter}
                      onChange={(e) => setLogLevelFilter(e.target.value as any)}
                      className="h-9 py-1 px-2.5 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">All Levels</option>
                      <option value="error">🔴 Error / Crash</option>
                      <option value="warn">🟡 Warning</option>
                      <option value="info">🔵 Informational</option>
                    </select>

                    <select
                      value={logCategoryFilter}
                      onChange={(e) => setLogCategoryFilter(e.target.value)}
                      className="h-9 py-1 px-2.5 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">All Categories</option>
                      <option value="react_crash">React Crashes</option>
                      <option value="unhandled_window_error">Window Errors</option>
                      <option value="unhandled_promise_rejection">Rejections</option>
                      <option value="database">Database</option>
                      <option value="auth">Auth</option>
                      <option value="general">General</option>
                    </select>

                    <select
                      value={logStatusFilter}
                      onChange={(e) => setLogStatusFilter(e.target.value as any)}
                      className="h-9 py-1 px-2.5 text-xs font-mono font-bold uppercase bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] outline-none cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">All Statuses</option>
                      <option value="unresolved">⚠️ Unresolved</option>
                      <option value="resolved">✅ Resolved</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleTriggerTestTelemetry}
                      className="h-9 px-3 rounded-lg border border-[var(--nb-ink)] bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_var(--nb-ink)] flex-1 md:flex-none"
                      title="Send a real-time diagnostic test telemetry log"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Test Ping</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePurgeLogs(14)}
                      disabled={isPurgingLogs}
                      className="h-9 px-3 rounded-lg border border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] hover:bg-rose-500 hover:text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 flex-1 md:flex-none"
                      title="Purge logs older than 14 days"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${isPurgingLogs ? 'animate-spin' : ''}`} />
                      <span>Purge &gt;14d</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}



        {/* ── 5. TAB VIEW: TENANTS & ASSOCIATIONS FLEET ── */}
        {activeMainTab === 'tenants' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header row with counter & active filter chips */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="nb-headline text-lg text-[var(--nb-content)] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[var(--nb-accent)]" />
                  <span>Onboarded Associations ({filteredTenants.length} of {tenants.length})</span>
                </h2>
                {searchQuery && (
                  <span className="nb-pill-purple text-[9px] font-mono font-bold uppercase px-2 py-0.5">
                    Query: "{searchQuery}"
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-[var(--nb-secondary)] hidden sm:inline">
                Click <strong>Enter</strong> to assume Super Admin oversight
              </span>
            </div>

            {/* Empty State */}
            {filteredTenants.length === 0 && (
              <div 
                className="p-12 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-dashed border-[var(--nb-divider)] space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--nb-surface-accent)] flex items-center justify-center mx-auto text-[var(--nb-secondary)]">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-base text-[var(--nb-content)]">
                  No associations matching your criteria
                </h4>
                <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto">
                  Try adjusting your search terms or status filter, or provision a new tenant association.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="nb-btn-ghost text-xs font-mono font-bold uppercase py-1.5 px-3"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && filteredTenants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTenants.map((tenant) => {
                  const stats = tenantStats[tenant.tenantId];
                  const isInactive = tenant.status === 'inactive';
                  const themeConfig = tenant.branding?.theme || resolveTenantTheme(tenant.branding);

                  return (
                    <div
                      key={tenant.tenantId}
                      className={`bg-[var(--nb-surface)] rounded-xl p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                        isInactive ? 'opacity-65 grayscale-[30%]' : 'hover:translate-x-0.5 hover:translate-y-0.5'
                      }`}
                      style={{ 
                        border: `2.5px solid ${isInactive ? 'var(--nb-divider)' : 'var(--nb-ink)'}`, 
                        boxShadow: isInactive ? 'none' : '4px 4px 0 var(--nb-ink)' 
                      }}
                    >
                      {/* Top colored theme strip */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ background: themeConfig.accent || 'var(--nb-accent)' }}
                      />

                      <div className="space-y-3 pt-1">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <span className="nb-pill-cyan text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 inline-block mb-1">
                              ID: {tenant.tenantId}
                            </span>
                            <h3 className="font-display font-black text-base sm:text-lg text-[var(--nb-content)] leading-tight truncate">
                              {tenant.name}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
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
                            <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)] ${
                              tenant.status === 'active' ? 'bg-emerald-400 text-neutral-900' : 'bg-neutral-300 text-neutral-800'
                            }`}>
                              {tenant.status}
                            </span>
                          </div>
                        </div>

                        {/* Metadata rows */}
                        <div className="space-y-1.5 text-xs text-[var(--nb-secondary)]">
                          <div className="flex items-center gap-2 min-w-0">
                            <School className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" />
                            <span className="truncate">{tenant.institution || 'Main Campus'}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono min-w-0">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                            <span className="truncate text-[var(--nb-content)] font-bold">{tenant.adminEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Palette className="w-3.5 h-3.5 flex-shrink-0 text-[var(--nb-accent)]" />
                            <span className="font-bold text-[var(--nb-content)] truncate">{themeConfig.name}</span>
                            <span 
                              className="w-3 h-3 rounded-full border border-[var(--nb-ink)] inline-block flex-shrink-0" 
                              style={{ backgroundColor: themeConfig.heroBg }}
                              title={`Hero: ${themeConfig.heroBg}`}
                            />
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-[var(--nb-ink)] inline-block flex-shrink-0" 
                              style={{ backgroundColor: themeConfig.accent }}
                              title={`Accent: ${themeConfig.accent}`}
                            />
                          </div>
                        </div>

                        {/* Per-Tenant Live Stats Counter */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span>{stats ? stats.users : (statsLoading ? '...' : 0)} Users</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]">
                            <Calendar className="w-3 h-3 text-violet-500" />
                            <span>{stats ? stats.events : (statsLoading ? '...' : 0)} Events</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]">
                            <Ticket className="w-3 h-3 text-emerald-500" />
                            <span>{stats ? stats.registrations : (statsLoading ? '...' : 0)} Passes</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-5 pt-3.5 border-t border-[var(--nb-ink)]/15 space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEnterTenant(tenant.tenantId)}
                            className="flex-1 nb-btn py-2 px-3 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer bg-[var(--nb-accent)] text-[var(--nb-bg)]"
                            title="Open Tenant in Super Admin Oversight Mode"
                          >
                            <span>Enter Oversight</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(tenant)}
                            className="nb-btn-ghost py-2 px-3 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Edit Tenant Branding & Allotted Theme"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          {tenant.tenantId !== DEFAULT_TENANT_ID ? (
                            <button
                              onClick={() => setDeletingTenant(tenant)}
                              className="nb-btn-ghost py-2 px-2.5 text-xs font-bold uppercase flex items-center justify-center cursor-pointer text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
                              title="Delete Organization"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          ) : (
                            <div
                              className="py-2 px-2.5 text-xs flex items-center justify-center opacity-30 cursor-not-allowed"
                              title="Default root tenant cannot be deleted"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopyLink(tenant.tenantId)}
                          className="w-full nb-btn-ghost py-1.5 px-3 text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Copy Direct Tenant Portal URL"
                        >
                          {copiedTenantId === tenant.tenantId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Portal URL Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Portal Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === 'table' && filteredTenants.length > 0 && (
              <div className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--nb-surface-accent)] border-b-2 border-[var(--nb-ink)] text-[var(--nb-secondary)] font-mono uppercase text-[10px]">
                        <th className="p-3.5 font-bold">Tenant / Department</th>
                        <th className="p-3.5 font-bold">Institution</th>
                        <th className="p-3.5 font-bold">Admin Gmail</th>
                        <th className="p-3.5 font-bold">Theme Preset</th>
                        <th className="p-3.5 font-bold text-center">Community Stats</th>
                        <th className="p-3.5 font-bold text-center">Status</th>
                        <th className="p-3.5 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--nb-divider)]">
                      {filteredTenants.map((tenant) => {
                        const stats = tenantStats[tenant.tenantId];
                        const isInactive = tenant.status === 'inactive';
                        const themeConfig = tenant.branding?.theme || resolveTenantTheme(tenant.branding);

                        return (
                          <tr 
                            key={tenant.tenantId} 
                            className={`hover:bg-[var(--nb-surface-accent)]/50 transition-colors ${
                              isInactive ? 'opacity-60' : ''
                            }`}
                          >
                            <td className="p-3.5 min-w-[200px]">
                              <div className="font-bold text-[var(--nb-content)] text-sm">{tenant.name}</div>
                              <span className="font-mono text-[9px] text-[var(--nb-secondary)]">ID: {tenant.tenantId}</span>
                            </td>
                            <td className="p-3.5 text-[var(--nb-secondary)]">{tenant.institution || 'Main Campus'}</td>
                            <td className="p-3.5 font-mono text-[var(--nb-content)] font-medium">{tenant.adminEmail}</td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1.5 font-bold">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full border border-[var(--nb-ink)]"
                                  style={{ background: themeConfig.accent }}
                                />
                                {themeConfig.name}
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-mono">
                              {stats ? (
                                <span className="text-[11px] font-bold">
                                  {stats.users}u · {stats.events}e · {stats.registrations}p
                                </span>
                              ) : '...'}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border border-[var(--nb-ink)] ${
                                tenant.status === 'active' ? 'bg-emerald-400 text-neutral-900' : 'bg-neutral-300 text-neutral-800'
                              }`}>
                                {tenant.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onEnterTenant(tenant.tenantId)}
                                  className="nb-btn py-1 px-2.5 text-[11px] font-bold uppercase cursor-pointer"
                                  title="Enter Oversight"
                                >
                                  Enter
                                </button>
                                <button
                                  onClick={() => openEditModal(tenant)}
                                  className="nb-btn-ghost py-1 px-2 text-[11px] font-bold uppercase cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleCopyLink(tenant.tenantId)}
                                  className="nb-btn-ghost py-1 px-2 text-[11px] font-bold uppercase cursor-pointer"
                                  title="Copy URL"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {tenant.tenantId !== DEFAULT_TENANT_ID && (
                                  <button
                                    onClick={() => setDeletingTenant(tenant)}
                                    className="nb-btn-ghost py-1 px-2 text-[11px] font-bold uppercase cursor-pointer text-rose-600 hover:bg-rose-500/10"
                                    title="Delete Organization"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-500" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 6. TAB VIEW: PLATFORM BUILDERS & DEVELOPERS ── */}
        {activeMainTab === 'developers' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Developer Banner */}
            <div 
              className="p-5 sm:p-6 rounded-xl bg-amber-400 text-neutral-950 flex flex-col md:flex-row md:items-center justify-between gap-4 border-[2.5px] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)]"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="nb-pill-coral text-[9px] sm:text-[10px] font-mono font-bold uppercase px-2 py-0.5 shadow-[1.5px_1.5px_0_#000]">
                    SUPER ADMIN EXCLUSIVE
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold">Universal Global Configuration</span>
                </div>
                <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl tracking-tight text-neutral-950">
                  Platform Builders &amp; Engineering Team
                </h1>
                <p className="text-xs sm:text-sm font-medium text-neutral-900 max-w-xl leading-relaxed">
                  Manage the core student creators of the platform. Any details updated here are saved globally to platform settings and dynamically displayed in the directory of <strong>every onboarded department and association portal</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsManageDevsModalOpen(true)}
                  className="nb-btn px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer bg-neutral-900 text-amber-400 hover:bg-neutral-800 shadow-[2px_2px_0_#000]"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Developer Team ({platformDevConfig.members?.length || 5})</span>
                </button>
              </div>
            </div>

            {/* Live Header Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="nb-headline text-sm text-[var(--nb-content)] flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[var(--nb-accent)]" />
                  Live Header Preview (As Seen on Department Portals)
                </h3>
                <span className="text-[10px] font-mono text-[var(--nb-secondary)]">Auto-interpolates active association branding</span>
              </div>

              <div 
                className="p-4 rounded-xl bg-neutral-900 text-white flex items-center justify-between gap-3 border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)]"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded bg-amber-400 text-neutral-900 flex items-center justify-center font-bold shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]"
                  >
                    <Code2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="nb-headline text-base tracking-normal text-white">
                        {platformDevConfig.sectionTitle || "Platform Builders & Developers"}
                      </h4>
                      <span className="bg-amber-400 text-neutral-900 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded shadow-[1.5px_1.5px_0_#000] uppercase tracking-wider">
                        {platformDevConfig.badgeText || "DEV TEAM"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 font-sans mt-0.5">
                      {(platformDevConfig.subtitle || "The student team responsible for designing and developing the {appName} portal").replace(/\{appName\}/g, 'NOTX')}
                    </p>
                  </div>
                </div>
                <span className="bg-neutral-800 text-amber-400 text-xs font-mono font-bold px-3 py-1.5 rounded border border-neutral-700 shrink-0">
                  {platformDevConfig.members?.length || 5} MEMBERS
                </span>
              </div>
            </div>

            {/* Active Developer Profiles Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="nb-headline text-base text-[var(--nb-content)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  Active Developer Profiles ({platformDevConfig.members?.length || 5})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsManageDevsModalOpen(true)}
                  className="nb-btn-ghost text-xs font-bold uppercase py-1.5 px-3 flex items-center gap-1.5 cursor-pointer bg-[var(--nb-surface)]"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                  <span>Add Developer</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(platformDevConfig.members && platformDevConfig.members.length > 0 ? platformDevConfig.members : DEFAULT_PLATFORM_BUILDERS).map((builder, index) => {
                  const preset = builder.badgeColor && DEV_COLOR_PRESETS[builder.badgeColor] ? DEV_COLOR_PRESETS[builder.badgeColor] : DEV_COLOR_PRESETS.amber;
                  const avatar = builder.profilePic || `https://api.dicebear.com/9.x/notionists/svg?seed=${builder.rollNumber || builder.name || index}`;

                  return (
                    <div 
                      key={builder.id || builder.rollNumber || index}
                      className="bg-[var(--nb-surface)] p-4 rounded-xl flex flex-col justify-between gap-3 relative overflow-hidden transition-all hover:border-[var(--nb-accent)] hover:shadow-[4px_4px_0_var(--nb-ink)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]"
                    >
                      {/* Top colored accent indicator strip */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${preset.accentBg}`} />

                      <div className="flex items-start gap-3.5 pt-1">
                        {/* Avatar */}
                        <div 
                          className="w-14 h-14 rounded-md overflow-hidden shrink-0 bg-[var(--nb-surface-accent)] mt-0.5 border-2 border-[var(--nb-ink)]"
                        >
                          <img 
                            src={avatar} 
                            alt={builder.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="nb-headline text-sm tracking-normal truncate text-[var(--nb-content)]">
                              {builder.name}
                            </h5>
                            <span 
                              className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${preset.badge}`}
                              style={{ border: '1px solid #000' }}
                            >
                              {builder.badge || 'BUILDER'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {builder.rollNumber && (
                              <span className="font-mono text-xs font-bold text-[var(--nb-content)] bg-[var(--nb-surface-accent)] px-1.5 py-0.5 rounded border border-[var(--nb-divider)]">
                                {builder.rollNumber}
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-[var(--nb-secondary)] truncate">
                              • {builder.department || builder.role || 'CSE (AI & ML)'}
                            </span>
                          </div>

                          {(builder.bio || builder.specialty) && (
                            <p className="text-xs text-[var(--nb-secondary)] mt-1.5 leading-snug line-clamp-2">
                              {builder.bio || builder.specialty}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Social Links + Reordering & Edit Controls */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--nb-divider)] gap-2">
                        {/* Social Links */}
                        <div className="flex items-center gap-1.5">
                          {builder.github && (
                            <a 
                              href={builder.github.startsWith('http') ? builder.github : `https://${builder.github}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-neutral-800 text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)]"
                              title="GitHub"
                            >
                              <Terminal className="w-3 h-3" />
                            </a>
                          )}
                          {builder.email && (
                            <a 
                              href={`mailto:${builder.email}`} 
                              className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-ink)] text-[var(--nb-content)] hover:text-[var(--nb-bg)] transition-colors cursor-pointer border border-[var(--nb-ink)]"
                              title="Send Email"
                            >
                              <Mail className="w-3 h-3" />
                            </a>
                          )}
                          {builder.linkedin && (
                            <a 
                              href={builder.linkedin.startsWith('http') ? builder.linkedin : `https://${builder.linkedin}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[#0A66C2] text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)]"
                              title="LinkedIn"
                            >
                              <Linkedin className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Order & Edit Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleQuickReorderBuilder(index, 'up')}
                            className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--nb-surface)] hover:bg-[var(--nb-surface-accent)] text-[var(--nb-content)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            disabled={index === (platformDevConfig.members?.length || DEFAULT_PLATFORM_BUILDERS.length) - 1}
                            onClick={() => handleQuickReorderBuilder(index, 'down')}
                            className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--nb-surface)] hover:bg-[var(--nb-surface-accent)] text-[var(--nb-content)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsManageDevsModalOpen(true)}
                            className="px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md flex items-center gap-1 bg-amber-400 text-neutral-950 hover:bg-amber-300 transition-all cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                            title="Edit Details"
                          >
                            <Edit3 className="w-3 h-3 stroke-[2.5]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDeleteBuilder(builder.id, builder.name)}
                            className="w-7 h-7 rounded-md flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                            title="Remove Developer"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Architecture Guarantees Info */}
            <div 
              className="bg-[var(--nb-surface)] rounded-xl p-5 space-y-2.5 text-xs border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)]"
            >
              <h5 className="font-bold text-[var(--nb-content)] flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Super Admin Platform Guarantees</span>
              </h5>
              <ul className="list-disc pl-5 space-y-1.5 text-[var(--nb-secondary)] text-xs leading-relaxed">
                <li><strong>Inherited by All Portals:</strong> Updates made on this page immediately synchronize and display in the directory of every university association portal.</li>
                <li><strong>Database Reset Protection:</strong> When department administrators execute an academic year database wipe, developer credentials are 100% immune from deletion.</li>
                <li><strong>Strict Role Isolation:</strong> Department presidents and faculty coordinators cannot access, edit, or override these global developer credits.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── 7. TAB VIEW: PLATFORM MASTER BRANDING (NOTX GLOBAL IDENTITY) ── */}
        {activeMainTab === 'branding' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header Banner */}
            <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 flex flex-col md:flex-row md:items-center justify-between gap-4 border-[2.5px] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="nb-pill-coral text-[9px] sm:text-[10px] font-mono font-bold uppercase px-2 py-0.5 shadow-[1.5px_1.5px_0_#000]">
                    SUPER ADMIN MASTER CONTROL
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold">Universal Global Identity</span>
                </div>
                <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl tracking-tight text-neutral-950 flex items-center gap-2.5">
                  <Palette className="w-7 h-7" />
                  Platform Master Branding
                </h1>
                <p className="text-xs sm:text-sm font-medium text-neutral-900 max-w-2xl leading-relaxed">
                  Configure the master NOTX identity displayed on the <strong>global Login page header, navigation bars, and platform footers</strong>. Individual onboarded department tenants configure their own departmental crests and themes inside their workspace.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSavePlatformBranding}
                  disabled={isSavingBranding}
                  className="nb-btn px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer bg-neutral-950 text-amber-400 hover:bg-neutral-800 shadow-[2.5px_2.5px_0_#000] disabled:opacity-60"
                >
                  {isSavingBranding ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : brandingSaveSuccess ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingBranding ? 'Saving...' : brandingSaveSuccess ? 'Saved Globally!' : 'Save Platform Brand'}</span>
                </button>
              </div>
            </div>

            {/* Main Form + Live Preview 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-5 bg-[var(--nb-surface)] p-5 sm:p-6 rounded-xl border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)]">
                <h2 className="nb-headline text-base text-[var(--nb-content)] flex items-center gap-2 border-b border-[var(--nb-divider)] pb-3">
                  <Sliders className="w-4 h-4 text-[var(--nb-accent)]" />
                  Platform Configuration Fields
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Master App Name */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--nb-content)] mb-1.5">
                      Platform App Name
                    </label>
                    <input
                      type="text"
                      value={platformBrandingForm.appName}
                      onChange={(e) => setPlatformBrandingForm(prev => ({ ...prev, appName: e.target.value }))}
                      placeholder="e.g. NOTX"
                      className="w-full px-3 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] font-bold focus:border-[var(--nb-accent)] outline-none"
                    />
                    <p className="text-[10px] font-mono text-[var(--nb-secondary)] mt-1">
                      Appears in top navbar, browser title, and login brand marks.
                    </p>
                  </div>

                  {/* Platform Tagline */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--nb-content)] mb-1.5">
                      Platform Tagline
                    </label>
                    <input
                      type="text"
                      value={platformBrandingForm.tagline || ''}
                      onChange={(e) => setPlatformBrandingForm(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder="e.g. Connect"
                      className="w-full px-3 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] font-medium focus:border-[var(--nb-accent)] outline-none"
                    />
                    <p className="text-[10px] font-mono text-[var(--nb-secondary)] mt-1">
                      Short secondary brand descriptor.
                    </p>
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--nb-content)] mb-1.5">
                      Platform Subtitle
                    </label>
                    <input
                      type="text"
                      value={platformBrandingForm.subtitle || ''}
                      onChange={(e) => setPlatformBrandingForm(prev => ({ ...prev, subtitle: e.target.value }))}
                      placeholder="e.g. Unified Multi-Tenant Academic OS"
                      className="w-full px-3 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] font-medium focus:border-[var(--nb-accent)] outline-none"
                    />
                  </div>

                  {/* Institution / Ecosystem */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--nb-content)] mb-1.5">
                      Institution / Ecosystem
                    </label>
                    <input
                      type="text"
                      value={platformBrandingForm.institution || ''}
                      onChange={(e) => setPlatformBrandingForm(prev => ({ ...prev, institution: e.target.value }))}
                      placeholder="e.g. Academic SaaS Ecosystem"
                      className="w-full px-3 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] font-medium focus:border-[var(--nb-accent)] outline-none"
                    />
                  </div>
                </div>

                {/* Logo Type Selector: Preset Icon vs Custom Image */}
                <div className="space-y-3 pt-3 border-t border-[var(--nb-divider)]">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--nb-content)]">
                    Master Logo Style
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPlatformBrandingForm(prev => ({ ...prev, logoType: 'preset' }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase cursor-pointer transition-all ${
                        platformBrandingForm.logoType === 'preset'
                          ? 'border-[var(--nb-ink)] bg-indigo-600 text-white shadow-[2px_2px_0_var(--nb-ink)]'
                          : 'border-[var(--nb-divider)] bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)]'
                      }`}
                    >
                      Preset Icon
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformBrandingForm(prev => ({ ...prev, logoType: 'image' }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase cursor-pointer transition-all ${
                        platformBrandingForm.logoType === 'image'
                          ? 'border-[var(--nb-ink)] bg-indigo-600 text-white shadow-[2px_2px_0_var(--nb-ink)]'
                          : 'border-[var(--nb-divider)] bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)]'
                      }`}
                    >
                      Custom Logo Image / Cloudinary
                    </button>
                  </div>

                  {platformBrandingForm.logoType === 'preset' ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-mono text-[var(--nb-secondary)]">Choose Icon:</p>
                      <div className="flex flex-wrap gap-2">
                        {['Cpu', 'Zap', 'Sparkles', 'Terminal', 'Rocket', 'Layers', 'Bot', 'Atom', 'ShieldCheck', 'Radio', 'Trophy', 'Globe'].map(iconKey => {
                          const IconComp = (BRAND_ICONS as any)[iconKey] || Cpu;
                          const isSelected = platformBrandingForm.logoIcon === iconKey;
                          return (
                            <button
                              key={iconKey}
                              type="button"
                              onClick={() => setPlatformBrandingForm(prev => ({ ...prev, logoIcon: iconKey }))}
                              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'border-[var(--nb-ink)] bg-[var(--nb-accent)] text-white shadow-[2px_2px_0_var(--nb-ink)] scale-105'
                                  : 'border-[var(--nb-divider)] bg-[var(--nb-surface-accent)] text-[var(--nb-content)] hover:bg-[var(--nb-surface)]'
                              }`}
                              title={iconKey}
                            >
                              <IconComp className="w-4 h-4" />
                              <span className="text-[10px] font-mono font-bold">{iconKey}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-mono text-[var(--nb-secondary)]">Upload to Cloudinary or enter URL:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={platformBrandingForm.logoImageUrl || ''}
                          onChange={(e) => setPlatformBrandingForm(prev => ({ ...prev, logoImageUrl: e.target.value }))}
                          placeholder="https://res.cloudinary.com/..."
                          className="flex-1 px-3 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] font-mono focus:border-[var(--nb-accent)] outline-none"
                        />
                        {platformBrandingForm.logoImageUrl && (
                          <button
                            type="button"
                            onClick={() => setPlatformBrandingForm(prev => ({ ...prev, logoImageUrl: '' }))}
                            className="px-2 py-2 text-xs font-mono text-rose-500 hover:bg-rose-500/10 rounded border border-rose-500/30"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <ImageUploader
                        onUploadSuccess={(urls) => {
                          if (urls[0]) setPlatformBrandingForm(prev => ({ ...prev, logoImageUrl: urls[0], logoType: 'image' }));
                        }}
                        maxFiles={1}
                        buttonLabel="Upload Logo to Cloudinary"
                      />
                    </div>
                  )}
                </div>

                {/* Accent Color Theme Selector */}
                <div className="space-y-2.5 pt-3 border-t border-[var(--nb-divider)]">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--nb-content)]">
                    Master Accent Color Theme
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'indigo', label: 'Classic Indigo', hex: '#2563EB' },
                      { key: 'purple', label: 'Electric Purple', hex: '#9333EA' },
                      { key: 'emerald', label: 'Neo Emerald', hex: '#059669' },
                      { key: 'amber', label: 'Cyber Amber', hex: '#D97706' },
                      { key: 'rose', label: 'Vibrant Rose', hex: '#E11D48' },
                      { key: 'cyan', label: 'Tech Cyan', hex: '#0891B2' },
                    ].map(theme => (
                      <button
                        key={theme.key}
                        type="button"
                        onClick={() => setPlatformBrandingForm(prev => ({ ...prev, accentColor: theme.key }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase cursor-pointer transition-all flex items-center gap-2 ${
                          platformBrandingForm.accentColor === theme.key
                            ? 'border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] shadow-[2px_2px_0_var(--nb-ink)]'
                            : 'border-[var(--nb-divider)] bg-[var(--nb-surface)] text-[var(--nb-secondary)]'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full border border-black" style={{ background: theme.hex }} />
                        <span>{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Column (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[var(--nb-surface)] p-5 rounded-xl border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--nb-divider)] pb-2.5">
                    <h3 className="nb-headline text-sm text-[var(--nb-content)] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Live Master Brand Preview
                    </h3>
                    <span className="text-[10px] font-mono text-[var(--nb-secondary)] uppercase">Login Header Representation</span>
                  </div>

                  {/* Desktop Preview Strip */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono font-bold text-[var(--nb-secondary)] uppercase">PC / Desktop Top Navbar Preview:</p>
                    <div className="p-3.5 rounded-xl bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1 rounded-lg bg-[var(--nb-surface)] border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                          <BrandLogo branding={platformBrandingForm} size="sm" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-display font-black text-sm tracking-wider text-[var(--nb-content)]">
                              {platformBrandingForm.appName || 'NOTX'}
                            </span>
                            <span className="font-mono font-bold text-[9px] uppercase px-1.5 py-0.5 rounded border border-[var(--nb-ink)] bg-emerald-400 text-neutral-950">
                              MASTER OS
                            </span>
                          </div>
                          <p className="font-mono text-[9px] text-[var(--nb-secondary)] font-bold uppercase truncate max-w-[160px]">
                            {platformBrandingForm.institution || 'Academic SaaS Ecosystem'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)]">
                        Dept: [AIML] ▼
                      </span>
                    </div>
                  </div>

                  {/* Mobile Preview Strip */}
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] font-mono font-bold text-[var(--nb-secondary)] uppercase">Mobile Hero Header Preview:</p>
                    <div className="p-4 rounded-xl bg-neutral-900 text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1 rounded bg-black/40 border border-white/20">
                          <BrandLogo branding={platformBrandingForm} size="md" />
                        </div>
                        <div>
                          <span className="bg-rose-500 text-white text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded">
                            PLATFORM
                          </span>
                          <p className="font-display font-black text-base tracking-wider text-white mt-0.5">
                            {platformBrandingForm.appName || 'NOTX'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        LIVE
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-divider)] text-[11px] font-mono text-[var(--nb-secondary)] space-y-1">
                    <p className="font-bold text-[var(--nb-content)] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Instant Real-Time Propagation
                    </p>
                    <p>
                      When you click "Save Platform Brand", all connected clients and the login screen update automatically without requiring server restarts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB VIEW: ENTERPRISE AUDIT TRAIL ── */}
        {activeMainTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Banner / Metrics */}
            <div className="p-5 sm:p-6 rounded-xl bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="nb-pill-accent text-[10px] font-mono font-bold uppercase px-2 py-0.5 shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                    IMMUTABLE AUDIT LOGS
                  </span>
                  <span className="text-[11px] font-mono text-[var(--nb-secondary)]">Multi-Tenant Global Telemetry</span>
                </div>
                <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight text-[var(--nb-content)] flex items-center gap-2.5">
                  <History className="w-6 h-6 text-[var(--nb-accent)]" />
                  Enterprise Activity &amp; Audit Trail
                </h1>
                <p className="text-xs sm:text-sm text-[var(--nb-secondary)] max-w-2xl leading-relaxed">
                  Every privileged operation, tenant creation, cascading deletion, pass issuance, and system reset across all departments is cryptographically logged in real-time.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={exportAuditLogsToCSV}
                  className="nb-btn px-3.5 py-2 text-xs font-black uppercase flex items-center gap-2 cursor-pointer bg-[var(--nb-accent)] text-[var(--nb-bg)]"
                  title="Export filtered audit logs as CSV report"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[var(--nb-surface)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--nb-secondary)] font-bold">Total Operations</div>
                  <div className="text-xl font-black font-display text-[var(--nb-content)]">{auditMetrics.total}</div>
                </div>
                <Activity className="w-6 h-6 text-indigo-500 opacity-80" />
              </div>
              <div className="bg-[var(--nb-surface)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--nb-secondary)] font-bold">Critical Actions</div>
                  <div className="text-xl font-black font-display text-rose-600 dark:text-rose-400">{auditMetrics.critical}</div>
                </div>
                <ShieldAlert className="w-6 h-6 text-rose-500 opacity-80" />
              </div>
              <div className="bg-[var(--nb-surface)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--nb-secondary)] font-bold">Warnings</div>
                  <div className="text-xl font-black font-display text-amber-500">{auditMetrics.warning}</div>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-500 opacity-80" />
              </div>
              <div className="bg-[var(--nb-surface)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--nb-secondary)] font-bold">Standard Events</div>
                  <div className="text-xl font-black font-display text-emerald-600 dark:text-emerald-400">{auditMetrics.info}</div>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-80" />
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[var(--nb-surface)] p-4 rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[var(--nb-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by action, email, entity name or log ID..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--nb-accent)]"
                />
                {auditSearch && (
                  <button
                    onClick={() => setAuditSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Tenant Filter */}
                <select
                  value={auditTenantFilter}
                  onChange={(e) => setAuditTenantFilter(e.target.value)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Departments / Tenants</option>
                  {tenants.map(t => (
                    <option key={t.tenantId} value={t.tenantId}>{t.name} ({t.shortCode || t.tenantId})</option>
                  ))}
                </select>

                {/* Severity Filter */}
                <select
                  value={auditSeverityFilter}
                  onChange={(e) => setAuditSeverityFilter(e.target.value as any)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">🔴 Critical Only</option>
                  <option value="warning">🟡 Warning Only</option>
                  <option value="info">🟢 Info Only</option>
                </select>

                {/* Category Filter */}
                <select
                  value={auditCategoryFilter}
                  onChange={(e) => setAuditCategoryFilter(e.target.value)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="event">Events &amp; Cascades</option>
                  <option value="registration">Registrations &amp; Passes</option>
                  <option value="tenant">Tenants &amp; Portals</option>
                  <option value="certificate">Certificates</option>
                  <option value="album">Gallery Albums</option>
                  <option value="announcement">Announcements</option>
                  <option value="system">System &amp; Database Wipes</option>
                  <option value="platform">Platform Engineering</option>
                </select>

                {(auditSearch || auditTenantFilter !== 'all' || auditSeverityFilter !== 'all' || auditCategoryFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setAuditSearch('');
                      setAuditTenantFilter('all');
                      setAuditSeverityFilter('all');
                      setAuditCategoryFilter('all');
                    }}
                    className="nb-btn-ghost py-2 px-2.5 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Audit Logs Table / Feed */}
            {auditLoading ? (
              <div className="p-12 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)]">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[var(--nb-accent)] mb-3" />
                <div className="text-xs font-mono font-bold uppercase text-[var(--nb-secondary)]">Streaming real-time audit logs...</div>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-12 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)]">
                <History className="w-10 h-10 text-[var(--nb-secondary)] mx-auto mb-3 opacity-50" />
                <h4 className="font-display font-bold text-sm text-[var(--nb-content)]">No Audit Logs Found</h4>
                <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto mt-1">
                  {auditLogs.length === 0
                    ? "Activity across all association portals will automatically stream into this feed as actions occur."
                    : "No log entries match your active filter criteria."}
                </p>
              </div>
            ) : (
              <div className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--nb-surface-accent)] border-b-2 border-[var(--nb-ink)] text-[var(--nb-secondary)] font-mono uppercase text-[10px]">
                        <th className="p-3 font-bold w-12 text-center">Sev</th>
                        <th className="p-3 font-bold">Action / Operation</th>
                        <th className="p-3 font-bold">Target Entity</th>
                        <th className="p-3 font-bold">Actor</th>
                        <th className="p-3 font-bold">Department</th>
                        <th className="p-3 font-bold">Timestamp</th>
                        <th className="p-3 font-bold text-right">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--nb-ink)]/15">
                      {filteredAuditLogs.map((log) => {
                        const isExpanded = expandedLogId === log.logId;
                        const sevBadge = log.severity === 'critical'
                          ? 'bg-rose-500 text-white'
                          : log.severity === 'warning'
                          ? 'bg-amber-400 text-neutral-900'
                          : 'bg-emerald-500 text-white';

                        return (
                          <React.Fragment key={log.logId}>
                            <tr className="hover:bg-[var(--nb-surface-accent)]/50 transition-colors">
                              <td className="p-3 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase ${sevBadge}`}>
                                  {log.severity[0].toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-mono font-bold text-[11px] text-[var(--nb-content)] flex items-center gap-1.5">
                                  <span>{log.action}</span>
                                </div>
                                {log.details && (
                                  <div className="text-[10px] text-[var(--nb-secondary)] line-clamp-1 mt-0.5 font-sans">
                                    {log.details}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-[var(--nb-content)] truncate max-w-[200px]">
                                  {log.entityName || log.entityId || '—'}
                                </div>
                                <div className="text-[10px] font-mono text-[var(--nb-secondary)] uppercase">
                                  {log.entityType}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-mono text-[11px] text-[var(--nb-content)] font-bold truncate max-w-[180px]">
                                  {log.actor?.email || 'System'}
                                </div>
                                <div className="flex items-center gap-1 text-[9.5px] font-mono text-[var(--nb-secondary)]">
                                  <span>{log.actor?.name || 'Automated'}</span>
                                  {log.actor?.role && (
                                    <span className="px-1 py-0.2 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/20 uppercase font-bold text-[8.5px]">
                                      {log.actor.role}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-bold">
                                  {log.tenantId}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <div className="text-[11px] font-mono text-[var(--nb-content)]">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                                <div className="text-[9.5px] font-mono text-[var(--nb-secondary)]">
                                  {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setExpandedLogId(isExpanded ? null : log.logId)}
                                  className="nb-btn-ghost py-1 px-2 text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-[var(--nb-surface-accent)]/80">
                                <td colSpan={7} className="p-4 border-t border-b border-[var(--nb-ink)]/20">
                                  <div className="space-y-3 text-xs">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-[10px] uppercase text-[var(--nb-secondary)]">Log UUID:</span>
                                        <span className="font-mono text-[10px] bg-[var(--nb-surface)] px-2 py-0.5 rounded border border-[var(--nb-ink)]/20 select-all">
                                          {log.logId}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-[var(--nb-secondary)]">
                                        ISO: {log.timestamp}
                                      </span>
                                    </div>
                                    <div className="bg-neutral-950 text-neutral-100 p-3.5 rounded-lg border border-[var(--nb-ink)] font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed shadow-inner">
                                      <pre>{JSON.stringify({
                                        action: log.action,
                                        severity: log.severity,
                                        tenantId: log.tenantId,
                                        actor: log.actor,
                                        entityType: log.entityType,
                                        entityId: log.entityId,
                                        entityName: log.entityName,
                                        details: log.details,
                                        metadata: log.metadata
                                      }, null, 2)}</pre>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB VIEW: DELETED ITEMS VAULT (ZERO LOSS ARCHIVE) ── */}
        {activeMainTab === 'vault' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Banner / Metrics */}
            <div className="p-5 sm:p-6 rounded-xl bg-violet-500 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-[2.5px] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-neutral-950 text-white text-[9px] sm:text-[10px] font-mono font-bold uppercase px-2 py-0.5 shadow-[1.5px_1.5px_0_#000]">
                    ZERO-LOSS ARCHITECTURE
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-violet-100">Immutable Firestore Safety Vault</span>
                </div>
                <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl tracking-tight text-white flex items-center gap-2.5">
                  <Archive className="w-7 h-7" />
                  Deleted Records &amp; Cascade Vault
                </h1>
                <p className="text-xs sm:text-sm font-medium text-violet-100 max-w-2xl leading-relaxed">
                  Deleted events and records are stripped from tenant portals so students and admins see a clean workspace, but full payload backups—including all issued passes, certificates, and winners—are safely preserved here for instant recovery or permanent compliance purging.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-neutral-950 text-violet-300 text-xs font-mono font-bold px-3 py-1.5 rounded border border-violet-400/40">
                  {vaultMetrics.total} BACKED UP ITEMS
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[var(--nb-surface)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--nb-secondary)] font-bold">Total Vault Records</div>
                  <div className="text-xl font-black font-display text-[var(--nb-content)]">{vaultMetrics.total}</div>
                </div>
                <Database className="w-6 h-6 text-violet-500 opacity-80" />
              </div>
              <div className="bg-[var(--nb-surface)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--nb-secondary)] font-bold">Cascaded Events</div>
                  <div className="text-xl font-black font-display text-indigo-600 dark:text-indigo-400">{vaultMetrics.cascades}</div>
                </div>
                <Layers className="w-6 h-6 text-indigo-500 opacity-80" />
              </div>
              <div className="bg-[var(--nb-surface)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--nb-secondary)] font-bold">Restored Back</div>
                  <div className="text-xl font-black font-display text-emerald-600 dark:text-emerald-400">{vaultMetrics.restored}</div>
                </div>
                <RotateCcw className="w-6 h-6 text-emerald-500 opacity-80" />
              </div>
              <div className="bg-[var(--nb-surface)] p-3 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--nb-secondary)] font-bold">Reset Snapshots</div>
                  <div className="text-xl font-black font-display text-amber-500">{vaultMetrics.resets}</div>
                </div>
                <Archive className="w-6 h-6 text-amber-500 opacity-80" />
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[var(--nb-surface)] p-4 rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[var(--nb-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search deleted items by name, ID, or deleting admin..."
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--nb-accent)]"
                />
                {vaultSearch && (
                  <button
                    onClick={() => setVaultSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Tenant Filter */}
                <select
                  value={vaultTenantFilter}
                  onChange={(e) => setVaultTenantFilter(e.target.value)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Departments / Tenants</option>
                  {tenants.map(t => (
                    <option key={t.tenantId} value={t.tenantId}>{t.name} ({t.shortCode || t.tenantId})</option>
                  ))}
                </select>

                {/* Entity Type Filter */}
                <select
                  value={vaultTypeFilter}
                  onChange={(e) => setVaultTypeFilter(e.target.value)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Entity Types</option>
                  <option value="event_cascade">Events (With Passes &amp; Cascade)</option>
                  <option value="event">Single Events</option>
                  <option value="registration">Registrations &amp; Passes</option>
                  <option value="certificate">Certificates</option>
                  <option value="winner">Event Winners</option>
                  <option value="announcement">Announcements</option>
                  <option value="album">Gallery Albums</option>
                  <option value="tenant">Tenants</option>
                  <option value="association_reset">Association Full Resets</option>
                </select>

                {(vaultSearch || vaultTenantFilter !== 'all' || vaultTypeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setVaultSearch('');
                      setVaultTenantFilter('all');
                      setVaultTypeFilter('all');
                    }}
                    className="nb-btn-ghost py-2 px-2.5 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Backups Card Grid */}
            {vaultLoading ? (
              <div className="p-12 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)]">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[var(--nb-accent)] mb-3" />
                <div className="text-xs font-mono font-bold uppercase text-[var(--nb-secondary)]">Loading Vault Backups...</div>
              </div>
            ) : filteredDeletedBackups.length === 0 ? (
              <div className="p-12 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)]">
                <Archive className="w-10 h-10 text-[var(--nb-secondary)] mx-auto mb-3 opacity-50" />
                <h4 className="font-display font-bold text-sm text-[var(--nb-content)]">Deleted Vault Is Clear</h4>
                <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto mt-1">
                  {deletedBackups.length === 0
                    ? "Whenever an event, pass, or record is deleted anywhere on the platform, a recoverable copy will be instantly backed up here."
                    : "No deleted backups match your active filter criteria."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeletedBackups.map((backup) => {
                  const isRestored = !!backup.restoredAt;
                  const isTenant = backup.entityType === 'tenant' || backup.entityType === 'tenant_cascade';
                  const isCascade = backup.entityType === 'event_cascade';
                  const isReset = backup.entityType === 'association_reset';
                  const cascadeChildCount = backup.cascadeChildren 
                    ? Object.values(backup.cascadeChildren).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
                    : 0;

                  return (
                    <div
                      key={backup.backupId}
                      className={`bg-[var(--nb-surface)] p-4 rounded-xl flex flex-col justify-between gap-4 border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] transition-all ${
                        isRestored ? 'opacity-70 bg-[var(--nb-surface-accent)]/50' : 'hover:shadow-[5px_5px_0_var(--nb-ink)]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Header Pills */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9.5px] font-mono font-black uppercase px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)] ${
                            isTenant
                              ? 'bg-rose-500 text-white'
                              : isCascade 
                              ? 'bg-violet-400 text-neutral-900' 
                              : isReset 
                              ? 'bg-rose-400 text-neutral-900'
                              : 'bg-amber-300 text-neutral-900'
                          }`}>
                            {isTenant ? 'Tenant Organization' : backup.entityType}
                          </span>

                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]">
                            {backup.tenantId}
                          </span>
                        </div>

                        {/* Title & Collection */}
                        <div>
                          <h4 className="nb-headline text-base text-[var(--nb-content)] line-clamp-1" title={backup.entityName}>
                            {backup.entityName}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[var(--nb-secondary)]">
                            <span>Collection: <strong>{backup.originalCollection || (isTenant ? 'tenants' : 'records')}</strong></span>
                            <span>•</span>
                            <span>ID: {backup.entityId.slice(0, 10)}...</span>
                          </div>
                        </div>

                        {/* Tenant Cascade Information */}
                        {isTenant && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border-2 border-rose-500/30 text-[11px] font-mono space-y-1.5">
                            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 font-bold">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" />
                                <span>De-provisioned Organization</span>
                              </div>
                              <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-black uppercase">
                                {cascadeChildCount} Cascade Items
                              </span>
                            </div>
                            {backup.metadata?.reason && (
                              <div className="text-[10px] text-[var(--nb-secondary)] line-clamp-2">
                                Reason: <span className="font-semibold text-[var(--nb-content)]">{backup.metadata.reason}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-3 gap-1 pt-1 text-center font-bold">
                              <div className="p-1 rounded bg-[var(--nb-surface)] border border-[var(--nb-ink)]/20">
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  {backup.cascadeChildren?.users?.length || backup.metadata?.stats?.users || 0}
                                </div>
                                <div className="text-[8px] uppercase text-[var(--nb-secondary)]">Users</div>
                              </div>
                              <div className="p-1 rounded bg-[var(--nb-surface)] border border-[var(--nb-ink)]/20">
                                <div className="text-xs text-violet-600 dark:text-violet-400">
                                  {backup.cascadeChildren?.events?.length || backup.metadata?.stats?.events || 0}
                                </div>
                                <div className="text-[8px] uppercase text-[var(--nb-secondary)]">Events</div>
                              </div>
                              <div className="p-1 rounded bg-[var(--nb-surface)] border border-[var(--nb-ink)]/20">
                                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                  {backup.cascadeChildren?.registrations?.length || backup.metadata?.stats?.registrations || 0}
                                </div>
                                <div className="text-[8px] uppercase text-[var(--nb-secondary)]">Passes</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cascade Information */}
                        {isCascade && backup.cascadeChildren && (
                          <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-[11px] font-mono space-y-1">
                            <div className="flex items-center justify-between text-violet-700 dark:text-violet-300 font-bold">
                              <span>Cascade Child Protection:</span>
                              <span className="px-1.5 py-0.2 rounded bg-violet-500 text-white text-[9px] font-black">
                                {cascadeChildCount} SAVED
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--nb-secondary)] flex items-center gap-2 flex-wrap">
                              {backup.cascadeChildren.registrations && (
                                <span>{backup.cascadeChildren.registrations.length} Passes</span>
                              )}
                              {backup.cascadeChildren.certificates && (
                                <span>• {backup.cascadeChildren.certificates.length} Certs</span>
                              )}
                              {backup.cascadeChildren.event_winners && (
                                <span>• {backup.cascadeChildren.event_winners.length} Winners</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Reset Archive Information */}
                        {isReset && backup.metadata?.backupCounts && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] font-mono space-y-1">
                            <div className="font-bold text-rose-600 dark:text-rose-400">
                              Academic Year Database Reset Snapshot
                            </div>
                            <div className="text-[var(--nb-secondary)]">
                              Protected {backup.metadata.backupCounts.events || 0} events, {backup.metadata.backupCounts.registrations || 0} passes, {backup.metadata.backupCounts.users || 0} users.
                            </div>
                          </div>
                        )}

                        {/* Metadata Footer: Deleted At & Deleted By */}
                        <div className="pt-2 border-t border-[var(--nb-ink)]/15 text-[10.5px] font-mono text-[var(--nb-secondary)] space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Deleted on:</span>
                            <span className="font-bold text-[var(--nb-content)]">
                              {new Date(backup.deletedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Deleted by:</span>
                            <span className="font-bold text-[var(--nb-content)] truncate max-w-[150px]" title={backup.deletedBy?.email}>
                              {backup.deletedBy?.email || 'Admin'}
                            </span>
                          </div>
                          {isRestored && (
                            <div className="mt-2 p-1.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isTenant ? 'Revived & restored to active fleet on ' : 'Restored to active DB on '}{new Date(backup.restoredAt!).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-[var(--nb-ink)]/15 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectingBackup(backup)}
                          className="flex-1 nb-btn-ghost py-1.5 px-2 text-xs font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                          title="View raw JSON backup payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestoreBackup(backup)}
                          disabled={isRestoringBackupId === backup.backupId}
                          className={`flex-1 nb-btn py-1.5 px-2 text-xs font-black uppercase flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                            isTenant 
                              ? 'bg-amber-400 hover:bg-amber-500 text-neutral-900 border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600'
                          }`}
                          title={isTenant ? "Revive organization and all cascaded users, events & records" : "Restore record and its cascade back to active database"}
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isRestoringBackupId === backup.backupId ? 'animate-spin' : ''}`} />
                          <span>
                            {isRestoringBackupId === backup.backupId 
                              ? (isTenant ? 'Reviving...' : 'Restoring...') 
                              : (isTenant ? 'Revive Tenant' : 'Restore')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePurgeBackup(backup)}
                          disabled={isPurgingBackupId === backup.backupId}
                          className="w-8 h-8 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-rose-500 text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)] disabled:opacity-50"
                          title="Purge record permanently from Vault"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 5. SUPPORT TICKETS & FLEET HELPDESK ── */}
        {activeMainTab === 'tickets' && (
          <div className="space-y-4">
            {/* Header & Quick Telemetry */}
            <div 
              className="p-5 rounded-xl bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30 mb-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>CENTRAL HELPDESK DISPATCH</span>
                </div>
                <h3 className="nb-headline text-xl sm:text-2xl leading-none">Support Queries &amp; Fleet Helpdesk</h3>
                <p className="text-xs text-[var(--nb-secondary)] mt-1.5 max-w-2xl font-sans leading-relaxed">
                  Unified student inquiry queue spanning all tenant departments. Filter queries by association, inspect student details, review threads, and transmit official responses.
                </p>
              </div>

              {/* KPI metrics cluster */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-2 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] text-center min-w-[75px]">
                  <div className="text-base font-black font-mono leading-none">{tickets.length}</div>
                  <div className="text-[9px] font-mono text-[var(--nb-secondary)] uppercase mt-1">Total</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-center min-w-[75px]">
                  <div className="text-base font-black font-mono text-amber-700 dark:text-amber-400 leading-none">{openTicketsCount}</div>
                  <div className="text-[9px] font-mono text-amber-700 dark:text-amber-400 uppercase mt-1">Pending</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-center min-w-[75px]">
                  <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400 leading-none">
                    {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
                  </div>
                  <div className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 uppercase mt-1">Resolved</div>
                </div>
                {unreadTicketsCount > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-rose-500 text-white border border-[var(--nb-ink)] text-center min-w-[75px] shadow-[2px_2px_0_var(--nb-ink)] animate-pulse">
                    <div className="text-base font-black font-mono leading-none">{unreadTicketsCount}</div>
                    <div className="text-[9px] font-mono uppercase mt-1">Unread</div>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-3 bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search subject, student name, roll number, email, or ticket ID..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 text-xs bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)] text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none focus:border-[var(--nb-accent)] font-medium"
                />
                {ticketSearch && (
                  <button 
                    onClick={() => setTicketSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Department / Tenant Filter */}
                <select
                  value={ticketTenantFilter}
                  onChange={(e) => setTicketTenantFilter(e.target.value)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Departments / Tenants</option>
                  {tenants.map(t => (
                    <option key={t.tenantId} value={t.tenantId}>{t.name} ({t.shortCode || t.tenantId})</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value as any)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                {/* Category Filter */}
                <select
                  value={ticketCategoryFilter}
                  onChange={(e) => setTicketCategoryFilter(e.target.value)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="General">General</option>
                  <option value="Academics">Academics</option>
                  <option value="Events">Events</option>
                  <option value="Grievance">Grievance</option>
                </select>

                {(ticketSearch || ticketTenantFilter !== 'all' || ticketStatusFilter !== 'all' || ticketCategoryFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setTicketSearch('');
                      setTicketTenantFilter('all');
                      setTicketStatusFilter('all');
                      setTicketCategoryFilter('all');
                    }}
                    className="nb-btn-ghost py-2 px-2.5 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Split Screen Master-Detail Layout */}
            {ticketsLoading ? (
              <div className="p-12 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)]">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[var(--nb-accent)] mb-3" />
                <div className="text-xs font-mono font-bold uppercase text-[var(--nb-secondary)]">Streaming real-time support registry...</div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)]">
                <Ticket className="w-10 h-10 text-[var(--nb-secondary)] mx-auto mb-3 opacity-50" />
                <h4 className="font-display font-bold text-sm text-[var(--nb-content)]">No Support Queries Found</h4>
                <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto mt-1">
                  {tickets.length === 0
                    ? "Queries submitted by students across department support boxes will automatically populate here."
                    : "No ticket matches your active search and filter parameters."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                
                {/* ── Left Column: Tickets Queue List (5 cols) ── */}
                <div className="lg:col-span-5 space-y-2.5 max-h-[780px] overflow-y-auto pr-1">
                  {filteredTickets.map((t) => {
                    const isSelected = selectedTicketId === t.id;
                    const tenant = tenants.find(ten => ten.tenantId.toLowerCase() === t.tenantId.toLowerCase());
                    const replyCount = t.replies?.length || 0;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left space-y-2 ${
                          isSelected
                            ? 'bg-[var(--nb-surface)] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] scale-[1.01]'
                            : 'bg-[var(--nb-surface)] border-[var(--nb-ink)]/40 hover:border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-black text-[var(--nb-accent)]">
                              #{t.readableId || t.id.slice(0, 8)}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/30 text-[var(--nb-content)] uppercase">
                              {tenant?.shortCode || t.tenantId}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)]">
                              {t.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {t.unreadByAdmin && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Unread query" />
                            )}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                              t.status === 'open'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-600/30'
                                : t.status === 'in_progress'
                                ? 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-600/30'
                                : t.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30'
                                : 'bg-neutral-500/20 text-neutral-600 dark:text-neutral-400 border border-neutral-600/30'
                            }`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <h5 className="font-display font-bold text-xs line-clamp-1 text-[var(--nb-content)]">
                          {t.subject}
                        </h5>

                        <p className="text-[11px] text-[var(--nb-secondary)] line-clamp-2 font-sans">
                          {t.message}
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--nb-secondary)] pt-1 border-t border-[var(--nb-ink)]/10">
                          <span className="truncate max-w-[180px] font-bold text-[var(--nb-content)]">
                            {t.userName} ({t.userRoll || t.userEmail})
                          </span>
                          <span>
                            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Right Column: Selected Ticket Conversation Thread (7 cols) ── */}
                <div className="lg:col-span-7">
                  {selectedTicket ? (
                    <div 
                      className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] overflow-hidden flex flex-col"
                    >
                      {/* Ticket Top Action Bar */}
                      <div className="p-4 bg-[var(--nb-surface-accent)] border-b-2 border-[var(--nb-ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-sm font-black text-[var(--nb-accent)]">
                              #{selectedTicket.readableId || selectedTicket.id.slice(0, 8)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--nb-surface)] border border-[var(--nb-ink)]">
                              {tenants.find(ten => ten.tenantId.toLowerCase() === selectedTicket.tenantId.toLowerCase())?.name || selectedTicket.tenantId}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--nb-surface)] border border-[var(--nb-ink)] text-[var(--nb-secondary)]">
                              {selectedTicket.category}
                            </span>
                          </div>
                          <h4 className="nb-headline text-base truncate">{selectedTicket.subject}</h4>
                        </div>

                        {/* Status Quick Actions */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'in_progress')}
                              disabled={isUpdatingTicketStatus}
                              className="nb-btn-ghost text-[10px] font-mono font-bold uppercase py-1 px-2.5 cursor-pointer"
                              title="Mark query as In Progress"
                            >
                              Set In Progress
                            </button>
                          )}
                          {selectedTicket.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'resolved')}
                              disabled={isUpdatingTicketStatus}
                              className="nb-btn text-[10px] font-mono font-bold uppercase py-1 px-2.5 cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600"
                              title="Resolve this student ticket"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Resolve</span>
                            </button>
                          )}
                          {selectedTicket.status === 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'open')}
                              disabled={isUpdatingTicketStatus}
                              className="nb-btn-ghost text-[10px] font-mono font-bold uppercase py-1 px-2.5 cursor-pointer text-amber-600"
                              title="Reopen ticket"
                            >
                              Reopen
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(selectedTicket)}
                            className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-surface)] hover:bg-rose-500 text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)]"
                            title="Delete ticket permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Student Details Strip */}
                      <div className="p-3 bg-[var(--nb-surface)] border-b border-[var(--nb-ink)]/15 flex items-center justify-between text-xs font-mono text-[var(--nb-secondary)] flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                          <span className="font-bold text-[var(--nb-content)]">{selectedTicket.userName}</span>
                          {selectedTicket.userRoll && (
                            <span className="px-1.5 py-0.2 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/20 text-[10px]">
                              {selectedTicket.userRoll}
                            </span>
                          )}
                          <span className="text-[10px]">{selectedTicket.userEmail}</span>
                        </div>
                        <span className="text-[10px]">
                          Logged {new Date(selectedTicket.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Original Student Query Body */}
                      <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                        <div className="p-3.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/30 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--nb-secondary)]">
                            <span className="font-bold uppercase text-[var(--nb-content)]">Student Query:</span>
                            <span>{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-[var(--nb-content)] leading-relaxed whitespace-pre-wrap font-sans">
                            {selectedTicket.message}
                          </p>
                        </div>

                        {/* Thread Replies */}
                        <div className="space-y-2.5 pt-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[var(--nb-secondary)]">
                            <MessageCircle className="w-3 h-3" />
                            <span>Conversation History ({selectedTicket.replies?.length || 0})</span>
                          </div>

                          {(selectedTicket.replies || []).map((rep) => {
                            const isStaff = rep.senderRole === 'super_admin' || rep.senderRole === 'admin' || rep.senderRole === 'president' || rep.senderRole === 'associate';
                            return (
                              <div
                                key={rep.replyId}
                                className={`p-3 rounded-lg border leading-relaxed space-y-1 ${
                                  isStaff
                                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[1.5px_1.5px_0_var(--nb-ink)]'
                                    : 'bg-[var(--nb-surface-accent)] border-[var(--nb-ink)]/40 ml-4'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 text-[10px] font-mono flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-black uppercase ${
                                      rep.senderRole === 'super_admin'
                                        ? 'bg-rose-500 text-white'
                                        : isStaff
                                        ? 'bg-[var(--nb-accent)] text-white'
                                        : 'bg-neutral-300 dark:bg-neutral-700 text-[var(--nb-content)]'
                                    }`}>
                                      {rep.senderRole === 'super_admin' ? 'Super Admin' : isStaff ? 'Dept Official' : 'Student'}
                                    </span>
                                    <span className="font-bold text-[var(--nb-content)]">{rep.senderName}</span>
                                  </div>
                                  <span className="text-[var(--nb-secondary)]">
                                    {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(rep.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--nb-content)] whitespace-pre-wrap font-sans">
                                  {rep.message}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Super Admin Reply Box */}
                      <form onSubmit={handleSendSuperAdminReply} className="p-3.5 bg-[var(--nb-surface-accent)] border-t-2 border-[var(--nb-ink)] space-y-2">
                        <label className="nb-label text-[10px] block">
                          Transmit Super Admin Response (Visible to Student &amp; Department Admins):
                        </label>
                        <div className="flex gap-2 items-start">
                          <textarea
                            rows={3}
                            value={ticketReplyText}
                            onChange={(e) => setTicketReplyText(e.target.value)}
                            placeholder="Type official guidance, approval status, or resolution message..."
                            className="nb-input text-xs resize-none flex-1 leading-relaxed"
                          />
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="submit"
                              disabled={!ticketReplyText.trim() || isSendingTicketReply}
                              className="nb-btn text-xs py-2 px-3.5 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isSendingTicketReply ? 'Transmitting...' : 'Send Reply'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!ticketReplyText.trim()) return;
                                await handleSendSuperAdminReply({ preventDefault: () => {} } as any);
                                await handleUpdateTicketStatus(selectedTicket.id, 'resolved');
                              }}
                              disabled={!ticketReplyText.trim() || isSendingTicketReply}
                              className="nb-btn-ghost text-[10px] font-mono font-bold uppercase py-1.5 px-2 cursor-pointer bg-emerald-500/15 border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white disabled:opacity-50 shrink-0"
                            >
                              Reply &amp; Resolve
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="p-16 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)]">
                      <MessageSquare className="w-12 h-12 text-[var(--nb-secondary)] mx-auto mb-3 opacity-40" />
                      <h4 className="font-display font-bold text-base text-[var(--nb-content)]">Select a Ticket</h4>
                      <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto mt-1">
                        Choose any student query from the list to review the thread, inspect contact details, and dispatch official replies.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── 6. SYSTEM TELEMETRY & CRASH LOGS TAB ── */}
        {activeMainTab === 'crashes' && (
          <div className="space-y-4">
            {/* Header & Quick Telemetry */}
            <div 
              className="p-5 rounded-xl bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-600/30 mb-2">
                  <Flame className="w-3.5 h-3.5" />
                  <span>CONTINUOUS TELEMETRY SHIELD</span>
                </div>
                <h3 className="nb-headline text-xl sm:text-2xl leading-none">System Diagnostics &amp; Crash Reports</h3>
                <p className="text-xs text-[var(--nb-secondary)] mt-1.5 max-w-2xl font-sans leading-relaxed">
                  Real-time telemetry capturing React component boundary crashes, unhandled window errors, promise rejections, and mobile crash logs across all tenant associations.
                </p>
              </div>

              {/* KPI metrics cluster */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-2 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] text-center min-w-[75px]">
                  <div className="text-base font-black font-mono leading-none">{systemLogs.length}</div>
                  <div className="text-[9px] font-mono text-[var(--nb-secondary)] uppercase mt-1">Total Logs</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-center min-w-[75px]">
                  <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400 leading-none">{unresolvedCrashesCount}</div>
                  <div className="text-[9px] font-mono text-rose-600 dark:text-rose-400 uppercase mt-1">Unresolved</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-center min-w-[75px]">
                  <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400 leading-none">
                    {systemLogs.filter(l => l.resolved).length}
                  </div>
                  <div className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 uppercase mt-1">Resolved</div>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredSystemLogs.length === 0 && (
              <div className="p-16 text-center bg-[var(--nb-surface)] rounded-xl border-2 border-dashed border-[var(--nb-divider)] space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-base text-[var(--nb-content)]">
                  {systemLogs.length === 0 ? 'Zero Crashes Detected' : 'No Logs Match Filter Criteria'}
                </h4>
                <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto">
                  {systemLogs.length === 0 
                    ? 'The application runtime is completely stable. Any future errors or unhandled exceptions will appear here in real-time.'
                    : 'Try clearing your search query or adjusting your level, category, and status filters.'}
                </p>
                {systemLogs.length > 0 && (
                  <button
                    onClick={() => {
                      setLogSearch('');
                      setLogLevelFilter('all');
                      setLogCategoryFilter('all');
                      setLogStatusFilter('all');
                      setLogTenantFilter('all');
                    }}
                    className="nb-btn-ghost text-xs font-mono font-bold uppercase py-1.5 px-3"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}

            {/* Log Stream Cards */}
            {filteredSystemLogs.length > 0 && (
              <div className="space-y-3">
                {filteredSystemLogs.map((log) => {
                  const isError = log.level === 'error' || log.category === 'react_crash';
                  const isWarn = log.level === 'warn';
                  const levelBg = isError ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40' : isWarn ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40' : 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40';

                  return (
                    <div
                      key={log.logId}
                      className={`p-4 rounded-xl bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all relative overflow-hidden ${
                        log.resolved ? 'opacity-70 bg-opacity-50' : ''
                      }`}
                    >
                      {/* Left Severity Indicator Strip */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${isError ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-blue-500'}`} />

                      {/* Main Log Info */}
                      <div className="space-y-1.5 flex-1 min-w-0 pl-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black uppercase border ${levelBg}`}>
                            {log.level}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/20 text-[var(--nb-secondary)]">
                            {log.category.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/20 text-[var(--nb-content)]">
                            Scope: {log.context?.tenantId || 'global'}
                          </span>
                          {log.resolved ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Resolved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 flex items-center gap-1">
                              <AlertOctagon className="w-3 h-3" /> Active
                            </span>
                          )}
                          {log.hitCount > 1 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-amber-400 text-neutral-900 border border-neutral-900">
                              ×{log.hitCount} occurrences
                            </span>
                          )}
                        </div>

                        <div className="font-mono text-xs sm:text-sm font-bold text-[var(--nb-content)] break-words">
                          <span className="text-rose-500 dark:text-rose-400">{log.errorName ? `${log.errorName}: ` : ''}</span>
                          {log.message}
                        </div>

                        <div className="flex items-center gap-3 text-[10.5px] font-mono text-[var(--nb-secondary)] flex-wrap pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.context?.userEmail && (
                            <span className="flex items-center gap-1 truncate max-w-xs">
                              <Users className="w-3 h-3" />
                              {log.context.userEmail}
                            </span>
                          )}
                          {log.context?.url && (
                            <span className="flex items-center gap-1 truncate max-w-sm text-[10px] text-neutral-500">
                              <Globe className="w-3 h-3" />
                              {log.context.url}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => setInspectingLog(log)}
                          className="nb-btn text-xs font-mono font-bold uppercase py-1.5 px-3 flex items-center gap-1.5 cursor-pointer bg-slate-900 text-white dark:bg-slate-100 dark:text-neutral-950"
                          title="Inspect complete stack trace & system context"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleResolveLog(log)}
                          className={`nb-btn-ghost text-xs font-mono font-bold uppercase py-1.5 px-2.5 flex items-center gap-1 cursor-pointer ${
                            log.resolved 
                              ? 'text-neutral-500 hover:text-neutral-700' 
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                          }`}
                          title={log.resolved ? "Mark as unresolved" : "Mark as resolved"}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{log.resolved ? 'Reopen' : 'Resolve'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyLogReport(log)}
                          className="w-8 h-8 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-surface)] text-[var(--nb-content)] transition-colors cursor-pointer border border-[var(--nb-ink)]"
                          title="Copy markdown diagnostic report"
                        >
                          {copiedLogId === log.logId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── 8. INSPECT SYSTEM CRASH MODAL ── */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--nb-surface)] rounded-xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-slate-950 text-white border-b-2 border-[var(--nb-ink)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <Terminal className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-base sm:text-lg leading-tight truncate">
                    INCIDENT INSPECTION: {inspectingLog.logId}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                    <span>{inspectingLog.timestamp}</span>
                    <span>&bull;</span>
                    <span className="uppercase text-rose-400 font-bold">{inspectingLog.level}</span>
                    <span>&bull;</span>
                    <span className="uppercase">{inspectingLog.category}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="w-8 h-8 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center border border-slate-600 cursor-pointer transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 font-sans">
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]">
                  <div className="text-[9px] font-mono font-bold uppercase text-[var(--nb-secondary)]">Scope Tenant</div>
                  <div className="text-xs font-mono font-bold text-[var(--nb-content)] mt-0.5 truncate">
                    {inspectingLog.context?.tenantId || 'global'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]">
                  <div className="text-[9px] font-mono font-bold uppercase text-[var(--nb-secondary)]">User / UID</div>
                  <div className="text-xs font-mono font-bold text-[var(--nb-content)] mt-0.5 truncate" title={inspectingLog.context?.userEmail || inspectingLog.context?.userId}>
                    {inspectingLog.context?.userEmail || inspectingLog.context?.userId || 'Anonymous'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]">
                  <div className="text-[9px] font-mono font-bold uppercase text-[var(--nb-secondary)]">Hit Count</div>
                  <div className="text-xs font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {inspectingLog.hitCount} occurrences
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]">
                  <div className="text-[9px] font-mono font-bold uppercase text-[var(--nb-secondary)]">Resolution</div>
                  <div className="text-xs font-mono font-bold mt-0.5">
                    {inspectingLog.resolved ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">RESOLVED</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-black">UNRESOLVED</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Box */}
              <div className="p-3.5 rounded-lg bg-rose-500/10 border-2 border-rose-500/30">
                <div className="text-[10px] font-mono font-bold text-rose-500 uppercase mb-1">
                  {inspectingLog.errorName || 'Exception Message'}
                </div>
                <div className="text-xs sm:text-sm font-mono font-bold text-[var(--nb-content)] break-words">
                  {inspectingLog.message}
                </div>
              </div>

              {/* Client Environment Strip */}
              <div className="p-3 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--nb-secondary)] border-b border-[var(--nb-ink)]/15 pb-1">
                  <span>RUNTIME ENVIRONMENT TELEMETRY</span>
                  <span>v{inspectingLog.context?.appVersion || '1.3.0'}</span>
                </div>
                <div className="text-[11px] truncate text-[var(--nb-content)] pt-0.5">
                  <strong>URL:</strong> {inspectingLog.context?.url || 'N/A'}
                </div>
                <div className="text-[11px] break-words text-[var(--nb-secondary)]">
                  <strong>User Agent:</strong> {inspectingLog.context?.userAgent || 'N/A'}
                </div>
              </div>

              {/* Stack Trace */}
              {inspectingLog.stackTrace && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-[var(--nb-secondary)] uppercase flex items-center justify-between">
                    <span>Call Stack Trace</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inspectingLog.stackTrace || '');
                        setCopiedLogId(inspectingLog.logId);
                        setTimeout(() => setCopiedLogId(null), 2000);
                      }}
                      className="text-[10px] font-mono text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLogId === inspectingLog.logId ? 'Copied' : 'Copy Trace'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-lg border border-slate-800 overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed">
                    {inspectingLog.stackTrace}
                  </pre>
                </div>
              )}

              {/* Component Stack */}
              {inspectingLog.componentStack && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-[var(--nb-secondary)] uppercase">
                    React Component Hierarchy
                  </div>
                  <pre className="p-3 bg-slate-950 text-slate-400 font-mono text-[11px] rounded-lg border border-slate-800 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                    {inspectingLog.componentStack}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-[var(--nb-surface-accent)] border-t-2 border-[var(--nb-ink)] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyLogReport(inspectingLog)}
                className="nb-btn-ghost text-xs font-mono font-bold uppercase py-2 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLogId === inspectingLog.logId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLogId === inspectingLog.logId ? 'Copied Report' : 'Copy Full Diagnostics'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleResolveLog(inspectingLog)}
                  className={`nb-btn text-xs font-mono font-bold uppercase py-2 px-3.5 flex items-center gap-1.5 cursor-pointer ${
                    inspectingLog.resolved
                      ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{inspectingLog.resolved ? 'Mark Unresolved' : 'Mark Resolved'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingLog(null)}
                  className="nb-btn-ghost text-xs font-mono font-bold uppercase py-2 px-3 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. EDIT TENANT MODAL (Fixed Shell + Sticky Footer) ── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div 
            className="bg-[var(--nb-surface)] rounded-xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)] animate-in zoom-in-95 duration-150"
          >
            {/* Tier 1: Fixed Header */}
            <div className="p-4 bg-[var(--nb-yellow)] text-neutral-900 border-b-2 border-[var(--nb-ink)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Edit3 className="w-5 h-5 text-neutral-900 shrink-0" />
                <div className="min-w-0">
                  <h3 className="nb-headline text-base sm:text-lg leading-tight truncate">
                    EDIT ASSOCIATION TENANT
                  </h3>
                  <p className="text-[10px] font-mono font-bold uppercase opacity-85 truncate">
                    ID: {editingTenant.tenantId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Segmented Modal Tabs */}
            <div className="flex border-b border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('credentials')}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border-r border-[var(--nb-ink)] ${
                  modalTab === 'credentials'
                    ? 'bg-[var(--nb-surface)] text-[var(--nb-content)] font-black border-b-2 border-b-[var(--nb-accent)]'
                    : 'text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                }`}
              >
                1. Credentials & Identity
              </button>
              <button
                type="button"
                onClick={() => setModalTab('theme')}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  modalTab === 'theme'
                    ? 'bg-[var(--nb-surface)] text-[var(--nb-content)] font-black border-b-2 border-b-[var(--nb-accent)]'
                    : 'text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                }`}
              >
                2. Brand Theme & Allotment
              </button>
            </div>

            {/* Tier 2: Scrollable Body */}
            <form id="edit-tenant-form" onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {editFormError && (
                <div className="p-3 rounded-md bg-rose-500/10 border-2 border-rose-500 text-rose-500 text-xs font-bold">
                  {editFormError}
                </div>
              )}
              {editFeedback && (
                <div className="p-3 rounded-md bg-emerald-500/10 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{editFeedback}</span>
                </div>
              )}

              {modalTab === 'credentials' && (
                <div className="space-y-3.5">
                  {/* Immutable Tenant ID */}
                  <div>
                    <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                      TENANT ID (IMMUTABLE DATABASE SLUG)
                    </label>
                    <div 
                      className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-secondary)] rounded-md p-2.5 font-mono font-bold opacity-60 border border-[var(--nb-divider)]"
                    >
                      {editingTenant.tenantId}
                    </div>
                  </div>

                  {/* Association Name */}
                  <div>
                    <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                      ASSOCIATION / DEPARTMENT NAME *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-bold border border-[var(--nb-ink)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                        SHORT CODE (MAX 10 CHARS)
                      </label>
                      <input
                        type="text"
                        value={editShortCode}
                        onChange={(e) => setEditShortCode(e.target.value.toUpperCase())}
                        className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-mono font-bold border border-[var(--nb-ink)]"
                      />
                    </div>
                    <div>
                      <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                        COLLEGE / INSTITUTION
                      </label>
                      <input
                        type="text"
                        value={editInstitution}
                        onChange={(e) => setEditInstitution(e.target.value)}
                        className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-bold border border-[var(--nb-ink)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                      TENANT ADMIN GMAIL (TRANSFERS RIGHTS ON LOGIN) *
                    </label>
                    <input
                      type="email"
                      required
                      value={editAdminEmail}
                      onChange={(e) => setEditAdminEmail(e.target.value)}
                      className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-mono font-bold border border-[var(--nb-ink)]"
                    />
                    <p className="text-[10px] text-[var(--nb-secondary)] mt-1">
                      Changing this email assigns Admin rights to the new Gmail on their next Google sign-in.
                    </p>
                  </div>

                  {/* Status toggle in modal */}
                  <div 
                    className="flex items-center justify-between p-3 rounded-md bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]"
                  >
                    <div>
                      <p className="text-xs font-bold text-[var(--nb-content)]">Workspace Active Status</p>
                      <p className="text-[10px] text-[var(--nb-secondary)]">
                        {editingTenant.status === 'active' ? 'Students and admins can log in and view events.' : 'Tenant is disabled. Access is locked.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleTenantStatus(editingTenant)}
                      className={`text-[10px] font-mono font-black uppercase px-3 py-1.5 rounded cursor-pointer border border-[var(--nb-ink)] transition-colors shadow-[1px_1px_0_var(--nb-ink)] ${
                        editingTenant.status === 'active'
                          ? 'bg-emerald-400 text-neutral-900 hover:bg-rose-400'
                          : 'bg-neutral-300 text-neutral-800 hover:bg-emerald-400'
                      }`}
                    >
                      {editingTenant.status === 'active' ? '● Active' : '○ Inactive'}
                    </button>
                  </div>
                </div>
              )}

              {modalTab === 'theme' && (
                <div className="space-y-4">
                  <div>
                    <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                      LOGIN HERO ANNOUNCEMENT / TAGLINE
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Exclusive portal for department members and faculty"
                      value={editLoginHeroText}
                      onChange={(e) => setEditLoginHeroText(e.target.value)}
                      className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-bold border border-[var(--nb-ink)]"
                    />
                  </div>

                  {/* Theme Preset Picker & Live WYSIWYG Miniature Preview */}
                  {renderThemeAllotmentPicker(
                    editThemePreset,
                    setEditThemePreset,
                    editName,
                    editShortCode,
                    editInstitution,
                    editLoginHeroText
                  )}
                </div>
              )}
            </form>

            {/* Tier 3: Sticky Footer (Always Visible on Screen) */}
            <div className="p-4 bg-[var(--nb-surface-accent)] border-t-2 border-[var(--nb-ink)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[var(--nb-secondary)] hidden sm:inline">
                  {modalTab === 'credentials' ? 'Step 1 of 2: Identity' : 'Step 2 of 2: Brand Identity'}
                </span>
                {editingTenant && editingTenant.tenantId !== DEFAULT_TENANT_ID && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingTenant;
                      setEditingTenant(null);
                      setDeletingTenant(target);
                    }}
                    className="nb-btn-ghost py-1.5 px-2.5 text-[11px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
                    title="De-provision Organization"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="flex-1 sm:flex-none nb-btn-ghost py-2 px-4 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-tenant-form"
                  disabled={editSubmitting}
                  className="flex-1 sm:flex-none nb-btn py-2 px-5 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer bg-[var(--nb-accent)] text-[var(--nb-bg)]"
                >
                  {editSubmitting ? 'Saving...' : 'Save & Sync Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. ADD NEW TENANT MODAL (Fixed Shell + Sticky Footer) ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div 
            className="bg-[var(--nb-surface)] rounded-xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)] animate-in zoom-in-95 duration-150"
          >
            {/* Tier 1: Fixed Header */}
            <div className="p-4 bg-[var(--nb-yellow)] text-neutral-900 border-b-2 border-[var(--nb-ink)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 text-neutral-900 shrink-0" />
                <div>
                  <h3 className="nb-headline text-base sm:text-lg leading-tight">
                    PROVISION NEW ASSOCIATION
                  </h3>
                  <p className="text-[10px] font-mono font-bold uppercase opacity-85">
                    Multi-Tenant Workspace Provisioning
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Segmented Modal Tabs */}
            <div className="flex border-b border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('credentials')}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border-r border-[var(--nb-ink)] ${
                  modalTab === 'credentials'
                    ? 'bg-[var(--nb-surface)] text-[var(--nb-content)] font-black border-b-2 border-b-[var(--nb-accent)]'
                    : 'text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                }`}
              >
                1. Credentials & Identity
              </button>
              <button
                type="button"
                onClick={() => setModalTab('theme')}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  modalTab === 'theme'
                    ? 'bg-[var(--nb-surface)] text-[var(--nb-content)] font-black border-b-2 border-b-[var(--nb-accent)]'
                    : 'text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                }`}
              >
                2. Brand Theme & Allotment
              </button>
            </div>

            {/* Tier 2: Scrollable Body */}
            <form id="add-tenant-form" onSubmit={handleCreateTenant} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-rose-500/10 border-2 border-rose-500 text-rose-500 text-xs font-bold">
                  {formError}
                </div>
              )}

              {modalTab === 'credentials' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                      TENANT SLUG (URL & USER DOMAIN IDENTIFIER) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ece-dept or it-association"
                      value={newTenantId}
                      onChange={(e) => setNewTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-mono font-bold border border-[var(--nb-ink)]"
                    />
                    <p className="text-[10px] text-[var(--nb-secondary)] mt-1 font-mono">
                      Students will authenticate via: rollnumber.{newTenantId || 'tenantid'}@notx.com
                    </p>
                  </div>

                  <div>
                    <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                      ASSOCIATION / DEPARTMENT FULL NAME *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Electronics & Communication Association"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-bold border border-[var(--nb-ink)]"
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
                        className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-mono font-bold border border-[var(--nb-ink)]"
                      />
                    </div>
                    <div>
                      <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                        COLLEGE / INSTITUTION
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Annamacharya Institute of Tech & Sciences"
                        value={newInstitution}
                        onChange={(e) => setNewInstitution(e.target.value)}
                        className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-bold border border-[var(--nb-ink)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                      TENANT ADMIN GMAIL (GOOGLE AUTH VERIFIED) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ece.hod@gmail.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-mono font-bold border border-[var(--nb-ink)]"
                    />
                    <p className="text-[10px] text-[var(--nb-secondary)] mt-1">
                      This Gmail will automatically receive Admin rights when signing in with Google.
                    </p>
                  </div>
                </div>
              )}

              {modalTab === 'theme' && (
                <div className="space-y-4">
                  <div>
                    <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1 font-bold">
                      LOGIN HERO ANNOUNCEMENT / TAGLINE
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Official department pass verification, live notifications, and digital credentials."
                      value={newLoginHeroText}
                      onChange={(e) => setNewLoginHeroText(e.target.value)}
                      className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded-md p-2.5 outline-none font-bold border border-[var(--nb-ink)]"
                    />
                  </div>

                  {/* Theme Preset Picker & Live WYSIWYG Miniature Preview */}
                  {renderThemeAllotmentPicker(
                    newThemePreset,
                    setNewThemePreset,
                    newName,
                    newShortCode,
                    newInstitution,
                    newLoginHeroText
                  )}
                </div>
              )}
            </form>

            {/* Tier 3: Sticky Footer (Always Visible on Screen) */}
            <div className="p-4 bg-[var(--nb-surface-accent)] border-t-2 border-[var(--nb-ink)] flex items-center justify-between gap-3 shrink-0">
              <span className="text-[10px] font-mono text-[var(--nb-secondary)] hidden sm:inline">
                {modalTab === 'credentials' ? 'Step 1 of 2: Identity' : 'Step 2 of 2: Brand Identity'}
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 sm:flex-none nb-btn-ghost py-2 px-4 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="add-tenant-form"
                  disabled={submitting}
                  className="flex-1 sm:flex-none nb-btn py-2 px-5 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer bg-[var(--nb-accent)] text-[var(--nb-bg)]"
                >
                  {submitting ? 'Provisioning...' : 'Provision Tenant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. SECURITY & AUDIT SUITE MODAL (Fixed Shell + Sticky Footer) ── */}
      {isValidationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div 
            className="bg-[var(--nb-surface)] w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 bg-[var(--nb-yellow)] text-neutral-900 border-b-2 border-[var(--nb-ink)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded bg-[var(--nb-surface)] border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] shrink-0">
                  <FlaskConical className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-base sm:text-lg uppercase tracking-wider leading-tight truncate">
                    Security & Isolation Audit Suite
                  </h3>
                  <p className="text-[10px] font-mono font-bold opacity-80 truncate">
                    Phase 6 Automated Multi-Tenant Cryptographic Verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsValidationModalOpen(false)}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {isValidating ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--nb-secondary)]">
                    Running Isolation & Authentication Validations...
                  </p>
                </div>
              ) : validationResults ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div 
                    className={`p-4 rounded-xl flex items-center justify-between border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] ${
                      validationResults.failed === 0 
                        ? 'bg-emerald-400 text-neutral-900' 
                        : 'bg-rose-400 text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {validationResults.failed === 0 ? (
                        <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-display font-black text-sm uppercase">
                          {validationResults.failed === 0 
                            ? 'All Security & Tenant Boundary Checks Passed' 
                            : `${validationResults.failed} Security Check(s) Failed`}
                        </div>
                        <div className="text-[10px] font-mono">
                          {validationResults.passed} of {validationResults.total} assertions validated successfully.
                        </div>
                      </div>
                    </div>

                    <span className="bg-[var(--nb-surface)]/90 px-2.5 py-1 rounded border border-[var(--nb-ink)] font-mono text-xs font-black">
                      {validationResults.passed}/{validationResults.total} PASS
                    </span>
                  </div>

                  {/* Test Results Breakdown */}
                  <div className="space-y-2">
                    <h4 className="nb-label text-[10px] text-[var(--nb-secondary)] font-bold">
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
                <div className="text-center py-12 text-xs text-[var(--nb-secondary)]">
                  Click below to execute the verification suite.
                </div>
              )}
            </div>

            {/* Modal Footer (Sticky) */}
            <div className="p-4 bg-[var(--nb-surface-accent)] border-t border-[var(--nb-ink)]/20 flex items-center justify-between shrink-0">
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

      {/* ── 10. SUPER ADMIN EXCLUSIVE: DEVELOPERS MANAGEMENT MODAL ── */}
      <ManagePlatformDevelopersModal
        isOpen={isManageDevsModalOpen}
        onClose={() => setIsManageDevsModalOpen(false)}
        currentConfig={platformDevConfig}
        branding={{
          appName: 'NOTX',
          tagline: 'Connect',
          subtitle: 'ENGINEERING',
          institution: 'Super Admin Oversight',
          logoType: 'preset',
          logoIcon: 'Cpu',
          accentColor: 'amber'
        }}
        onSaved={(updated) => {
          setPlatformDevConfig(updated);
          setGlobalFeedback("Platform developer details updated and synchronized across all associations!");
          setTimeout(() => setGlobalFeedback(''), 4000);
        }}
      />

      {/* ── 11. DELETED VAULT INSPECTION MODAL ── */}
      {inspectingBackup && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--nb-surface)] rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-violet-500 text-white border-b-2 border-[var(--nb-ink)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Database className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <h3 className="nb-headline text-base sm:text-lg leading-tight truncate">
                    DELETED VAULT RECORD INSPECTOR
                  </h3>
                  <p className="text-[10px] font-mono font-bold uppercase opacity-90 truncate">
                    BACKUP ID: {inspectingBackup.backupId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingBackup(null)}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/20 text-[11px] font-mono">
                <div>
                  <div className="text-[9.5px] uppercase text-[var(--nb-secondary)]">Entity Type</div>
                  <div className="font-bold text-[var(--nb-content)]">{inspectingBackup.entityType}</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase text-[var(--nb-secondary)]">Department</div>
                  <div className="font-bold text-[var(--nb-content)]">{inspectingBackup.tenantId}</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase text-[var(--nb-secondary)]">Deleted At</div>
                  <div className="font-bold text-[var(--nb-content)]">
                    {new Date(inspectingBackup.deletedAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase text-[var(--nb-secondary)]">Deleted By</div>
                  <div className="font-bold text-[var(--nb-content)] truncate" title={inspectingBackup.deletedBy?.email}>
                    {inspectingBackup.deletedBy?.email || 'Admin'}
                  </div>
                </div>
              </div>

              {inspectingBackup.cascadeChildren && (
                <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30 text-xs font-mono space-y-1.5">
                  <div className="font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Cascade Preserved Child Collections:</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[var(--nb-secondary)]">
                    <span>Passes: <strong>{inspectingBackup.cascadeChildren.registrations?.length || 0}</strong></span>
                    <span>Certificates: <strong>{inspectingBackup.cascadeChildren.certificates?.length || 0}</strong></span>
                    <span>Winners: <strong>{inspectingBackup.cascadeChildren.event_winners?.length || 0}</strong></span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5 font-mono text-[11px] font-bold text-[var(--nb-secondary)]">
                  <span>RAW PAYLOAD (ORIGINAL RECORD + CASCADE):</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(inspectingBackup, null, 2));
                      alert('Raw JSON copied to clipboard!');
                    }}
                    className="flex items-center gap-1 hover:text-[var(--nb-content)] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </button>
                </div>
                <div className="bg-neutral-950 text-neutral-100 p-3.5 rounded-lg border border-[var(--nb-ink)] font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed shadow-inner">
                  <pre>{JSON.stringify(inspectingBackup, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 bg-[var(--nb-surface-accent)] border-t border-[var(--nb-ink)]/20 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handlePurgeBackup(inspectingBackup)}
                disabled={isPurgingBackupId === inspectingBackup.backupId}
                className="nb-btn-ghost py-2 px-3 text-xs font-bold uppercase text-rose-600 hover:bg-rose-500 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Permanently</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingBackup(null)}
                  className="nb-btn-ghost py-2 px-3 text-xs font-bold uppercase cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleRestoreBackup(inspectingBackup)}
                  disabled={isRestoringBackupId === inspectingBackup.backupId}
                  className="nb-btn py-2 px-4 text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRestoringBackupId === inspectingBackup.backupId ? 'animate-spin' : ''}`} />
                  <span>
                    {inspectingBackup.entityType === 'tenant' || inspectingBackup.entityType === 'tenant_cascade'
                      ? 'Revive Organization to Active Fleet'
                      : 'Restore Record to Active DB'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stepped Delete Tenant Modal */}
      <DeleteTenantModal
        isOpen={!!deletingTenant}
        tenant={deletingTenant}
        onClose={() => setDeletingTenant(null)}
        onSuccess={(deletedTenantId) => {
          setTenants(prev => prev.filter(t => t.tenantId !== deletedTenantId));
          setGlobalFeedback(`Organization "${deletedTenantId}" decommissioned and safely archived in Deleted Vault.`);
        }}
        onViewVault={() => {
          setActiveMainTab('vault');
        }}
        stats={deletingTenant ? tenantStats[deletingTenant.tenantId] : undefined}
        currentUser={currentUser}
      />
    </div>
  );
}
