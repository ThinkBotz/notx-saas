import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  Key,
  Calendar,
  CheckCircle,
  XCircle,
  UserPlus,
  PlusCircle,
  Check,
  Settings,
  Search,
  Mail,
  Phone,
  UserCheck,
  Sparkles,
  Award,
  ArrowRight,
  QrCode,
  Download,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  Camera,
  Edit3,
  LifeBuoy,
  PhoneCall,
  Database,
  Loader2,
  Trash2,
  Filter,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  Lock,
  Unlock,
  Zap,
  CheckSquare,
  Square,
  SlidersHorizontal,
  FolderArchive,
  AlertTriangle,
  Clock,
  MessageSquare,
  MessageCircle,
  Inbox,
  Send
} from 'lucide-react';
import {
  UserProfile,
  DepartmentEvent,
  EventRegistration,
  AssociatePowers,
  SupportInfo,
  DEFAULT_SUPPORT_INFO,
  CertificateTemplate,
  DEFAULT_CERTIFICATE_TEMPLATE,
  IssuedCertificate,
  Tenant,
  SupportTicket,
  TicketCategory,
  TicketStatus
} from '../types';
import {
  updateUserProfile,
  createUserProfile,
  createMultipleUserProfiles,
  deleteUserProfile,
  updateRegistrationStatus,
  createRegistration,
  clearAllDatabaseData,
  getAppConfig,
  updateSupportInfo,
  findUserForLogin,
  toggleCertificatesEnabled,
  updateCertificateTemplate,
  subscribeToCertificates,
  issueCertificate,
  deleteCertificate,
  syncCertificatesForAttendees,
  generateCertificateId,
  generateBatchCertificatesForEvent,
  revokeBatchCertificatesForEvent,
  exportAllDatabaseData,
  subscribeToAppConfig,
  createStudentAuthAccount,
  subscribeToTenantTickets,
  addTicketReply,
  updateTicketStatus,
  markTicketRead,
  sendAppNotification
} from '../firebase';
import QRCameraScanner from "./QRCameraScanner";
import EditSupportBoxModal from './EditSupportBoxModal';
import CertificateTemplateModal from './CertificateTemplateModal';
import CertificateCard from './CertificateCard';
import CertificateRecipientsModal from './CertificateRecipientsModal';
import CertificateVerificationModal from './CertificateVerificationModal';
import ResetAssociationModal from './ResetAssociationModal';
import EditBrandingModal from './EditBrandingModal';
import BrandLogo from './BrandLogo';
import HoldButton from './HoldButton';
import { AppBranding, DEFAULT_BRANDING } from '../types';
import { hashPassword, verifyTicketSignature } from '../utils/auth';

// Helper: Check if today is strictly before the event date (local date comparison)
function isBeforeEventDate(eventDateStr?: string): boolean {
  if (!eventDateStr) return false;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const clean = eventDateStr.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return todayStr < clean;
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const evStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return todayStr < evStr;
    }
  } catch (e) {
    return false;
  }
  return false;
}

interface AdminPanelViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  events: DepartmentEvent[];
  registrations: EventRegistration[];
  onClose: () => void;
  refreshData: () => void;
  activeTenantId?: string;
  activeTenant?: Tenant | null;
}

type PanelTab = 'associates' | 'coordinators' | 'attendance' | 'students' | 'certificates' | 'settings' | 'tickets';

export default function AdminPanelView({
  currentUser,
  allUsers,
  events,
  registrations,
  onClose,
  refreshData,
  activeTenantId,
  activeTenant
}: AdminPanelViewProps) {
  const activeTenantIdResolved = activeTenantId || currentUser.tenantId || '';
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  // Department Support Tickets State
  const [tenantTickets, setTenantTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [isSendingTicketReply, setIsSendingTicketReply] = useState(false);
  const [isUpdatingTicketStatus, setIsUpdatingTicketStatus] = useState(false);

  // Real-time subscribe to department tickets
  useEffect(() => {
    if (!activeTenantIdResolved) return;
    const unsub = subscribeToTenantTickets(activeTenantIdResolved, (list) => {
      setTenantTickets(list);
    });
    return () => unsub();
  }, [activeTenantIdResolved]);

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?tenant=${activeTenantIdResolved}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2500);
  };
  const [activeTab, setActiveTab] = useState<PanelTab>(() => {
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'president';
    const isAssociate = currentUser.role === 'associate';
    const isCoordinator = currentUser.role === 'coordinator';
    const canManageRoles = isAdmin;
    if (canManageRoles) return 'associates';
    return 'attendance';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Registration and attendance tracker states
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.eventId || '');

  // Bulk Students states
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkMode, setBulkMode] = useState<'series' | 'column'>('series');
  const [isGeneratingStudents, setIsGeneratingStudents] = useState(false);
  const isGeneratingStudentsRef = useRef(false);

  // Series fields
  const [seriesPrefix, setSeriesPrefix] = useState('');
  const [seriesStart, setSeriesStart] = useState('');
  const [seriesEnd, setSeriesEnd] = useState('');

  // Column fields
  const [bulkText, setBulkText] = useState('');

  // Password options
  const [passwordOption, setPasswordOption] = useState<'roll' | 'preset' | 'random'>('roll');
  const [presetPassword, setPresetPassword] = useState('Welcome@123');

  // Success/error feedback
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackErr, setFeedbackErr] = useState('');

  // Student search
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // QR Check-in scanner states
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedRollInput, setScannedRollInput] = useState('');
  const [scanResultMsg, setScanResultMsg] = useState('');
  const [scanResultType, setScanResultType] = useState<'success' | 'info' | 'error'>('success');
  const [spotRegisterStudent, setSpotRegisterStudent] = useState<UserProfile | null>(null);

  // Forms states
  const [showCreateAssociate, setShowCreateAssociate] = useState(false);
  const [assocSearchRoll, setAssocSearchRoll] = useState('');
  const [assocRollFocused, setAssocRollFocused] = useState(false);
  const [assocPosition, setAssocPosition] = useState('President');
  const [assocTitleSelect, setAssocTitleSelect] = useState('President');
  const [assocCustomTitle, setAssocCustomTitle] = useState('');
  const [studentYearFilter, setStudentYearFilter] = useState('All');
  const [studentSectionFilter, setStudentSectionFilter] = useState('All');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);
  const [assocPowers, setAssocPowers] = useState<AssociatePowers>({
    canManageEvents: false,
    canManageAnnouncements: false,
    canViewRegistrations: true,
    canManageGallery: false
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDemoteId, setConfirmDemoteId] = useState<string | null>(null);

  const [showCreateCoordinator, setShowCreateCoordinator] = useState(false);
  const [coordSearchRoll, setCoordSearchRoll] = useState('');
  const [coordRollFocused, setCoordRollFocused] = useState(false);
  const [coordAssignedEvents, setCoordAssignedEvents] = useState<string[]>([]);

  // Editing state for event assignments
  const [activeEditingCoordId, setActiveEditingCoordId] = useState<string | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Reset Association & Data Export modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetModalInitialTab, setResetModalInitialTab] = useState<'export' | 'reset'>('export');

  const isTopAdmin = currentUser.role === 'admin';
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'president';
  const isAssociate = currentUser.role === 'associate';
  const isCoordinator = currentUser.role === 'coordinator';

  // Determine allowed tabs based on role and powers
  const canManageRoles = isAdmin;
  const canViewAttendanceTab = isAdmin ||
    (isAssociate && currentUser.powers?.canViewRegistrations) ||
    isCoordinator;

  const [supportInfo, setSupportInfo] = useState<SupportInfo>(DEFAULT_SUPPORT_INFO);
  const [isEditSupportModalOpen, setIsEditSupportModalOpen] = useState(false);

  const [isCertificatesEnabled, setIsCertificatesEnabled] = useState(true);
  const [certificateTemplate, setCertificateTemplate] = useState<CertificateTemplate>(DEFAULT_CERTIFICATE_TEMPLATE);
  const [isEditCertModalOpen, setIsEditCertModalOpen] = useState(false);

  const [branding, setBranding] = useState<AppBranding>(() => {
    if (activeTenant?.branding) {
      return activeTenant.branding;
    }
    const cleanTid = activeTenantIdResolved.trim().toLowerCase();
    const cacheKey = cleanTid ? `notx_branding_${cleanTid}` : 'notx_branding';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { return JSON.parse(cached) as AppBranding; } catch (e) { }
    }
    return DEFAULT_BRANDING;
  });
  const [isEditBrandingModalOpen, setIsEditBrandingModalOpen] = useState(false);

  // Sync branding whenever activeTenant changes
  useEffect(() => {
    if (activeTenant?.branding) {
      setBranding(activeTenant.branding);
    }
  }, [activeTenant?.branding]);

  useEffect(() => {
    const unsub = subscribeToAppConfig(config => {
      if (config.supportInfo) {
        setSupportInfo(config.supportInfo);
      }
      if (config.isCertificatesEnabled !== undefined) {
        setIsCertificatesEnabled(config.isCertificatesEnabled);
      }
      if (config.certificateTemplate) {
        setCertificateTemplate(config.certificateTemplate);
      }
      if (config.branding) {
        setBranding(config.branding);
        const cleanTid = activeTenantIdResolved.trim().toLowerCase();
        const cacheKey = cleanTid ? `notx_branding_${cleanTid}` : 'notx_branding';
        try { localStorage.setItem(cacheKey, JSON.stringify(config.branding)); } catch (e) { }
      }
    }, activeTenantIdResolved);
    return () => unsub();
  }, [activeTenantIdResolved]);

  useEffect(() => {
    const syncOfflineAttendanceQueue = async () => {
      const queueKey = 'notx_offline_attendance_queue';
      try {
        const rawQueue = localStorage.getItem(queueKey);
        if (!rawQueue) return;
        const queue: Array<{ registrationId: string; status: 'Attended'; verifiedBy?: string }> = JSON.parse(rawQueue);
        if (!queue || queue.length === 0) return;

        const remainingQueue: typeof queue = [];
        let syncedCount = 0;

        for (const item of queue) {
          try {
            await updateRegistrationStatus(item.registrationId, item.status, item.verifiedBy);
            syncedCount++;
          } catch (e) {
            remainingQueue.push(item);
          }
        }

        if (remainingQueue.length > 0) {
          localStorage.setItem(queueKey, JSON.stringify(remainingQueue));
        } else {
          localStorage.removeItem(queueKey);
        }

        if (syncedCount > 0) {
          setFeedbackMsg(`Synced ${syncedCount} offline attendance check-ins to database!`);
          setTimeout(() => setFeedbackMsg(''), 4000);
          refreshData();
        }
      } catch (e) {
        console.warn('Error processing offline attendance queue:', e);
      }
    };

    window.addEventListener('online', syncOfflineAttendanceQueue);
    if (navigator.onLine) {
      syncOfflineAttendanceQueue();
    }

    return () => {
      window.removeEventListener('online', syncOfflineAttendanceQueue);
    };
  }, []);


  const handleToggleCertificates = async (newVal?: boolean) => {
    const nextVal = newVal !== undefined ? newVal : !isCertificatesEnabled;
    setIsCertificatesEnabled(nextVal);
    try {
      await toggleCertificatesEnabled(nextVal, activeTenantIdResolved);
      setFeedbackMsg(`Certificate feature is now ${nextVal ? 'ENABLED' : 'PAUSED'}.`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      refreshData();
    } catch (err) {
      console.error(err);
      setIsCertificatesEnabled(!nextVal);
      setFeedbackErr('Failed to update certificate feature toggle.');
      setTimeout(() => setFeedbackErr(''), 3000);
    }
  };

  const handleSaveCertificateTemplate = async (newTemplate: CertificateTemplate) => {
    await updateCertificateTemplate(newTemplate, activeTenantIdResolved);
    setCertificateTemplate(newTemplate);
    setFeedbackMsg("Certificate template updated successfully!");
    setTimeout(() => setFeedbackMsg(''), 3000);
    refreshData();
  };

  // Certificate DB & Issuance states
  const [dbCertificates, setDbCertificates] = useState<IssuedCertificate[]>([]);
  const [certSubTab, setCertSubTab] = useState<'batch' | 'db' | 'template'>('batch');
  const [certEventFilter, setCertEventFilter] = useState<string>('all');
  const [certSearch, setCertSearch] = useState('');
  const [isSyncingCerts, setIsSyncingCerts] = useState(false);
  const [showManualIssueModal, setShowManualIssueModal] = useState(false);
  const [manualStudentUid, setManualStudentUid] = useState(allUsers[0]?.uid || '');
  const [manualEventId, setManualEventId] = useState(events[0]?.eventId || '');
  const [activePreviewCert, setActivePreviewCert] = useState<IssuedCertificate | null>(null);
  const [activePeersEvent, setActivePeersEvent] = useState<DepartmentEvent | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInitialId, setVerifyInitialId] = useState('');
  const [copiedCertId, setCopiedCertId] = useState<string | null>(null);

  // Batch Generator specific states
  const [batchEventStatusFilter, setBatchEventStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [batchEventSearch, setBatchEventSearch] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedParticipantsMap, setSelectedParticipantsMap] = useState<Record<string, string[]>>({});
  const [isGeneratingBatchEventId, setIsGeneratingBatchEventId] = useState<string | null>(null);
  const [participantSearchMap, setParticipantSearchMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = subscribeToCertificates((certs) => {
      setDbCertificates(certs);
    }, activeTenantIdResolved);
    return () => unsub();
  }, [activeTenantIdResolved]);

  const handleCopyCertId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedCertId(id);
    setTimeout(() => setCopiedCertId(null), 2000);
  };

  const handleSyncCertificates = async () => {
    setIsSyncingCerts(true);
    try {
      const res = await syncCertificatesForAttendees(events, registrations, allUsers, activeTenantIdResolved);
      setFeedbackMsg(`Synced batch certificates! ${res.newlyIssued} new credentials generated (${res.totalEligible} attended students).`);
      setTimeout(() => setFeedbackMsg(''), 4000);
      refreshData();
    } catch (err) {
      console.error(err);
      setFeedbackErr('Failed to sync certificates.');
      setTimeout(() => setFeedbackErr(''), 3000);
    } finally {
      setIsSyncingCerts(false);
    }
  };

  const handleGenerateBatchForEvent = async (eventId: string, specificStudentIds?: string[]) => {
    setIsGeneratingBatchEventId(eventId);
    try {
      const res = await generateBatchCertificatesForEvent(eventId, {
        specificStudentIds,
        events,
        registrations,
        allUsers,
        issuedBy: currentUser.name || 'Department Administration'
      }, activeTenantIdResolved);
      setFeedbackMsg(`Batch generated! ${res.newlyIssued} new certificates generated (${res.alreadyIssued} already existed). Students can now view them!`);
      setTimeout(() => setFeedbackMsg(''), 4000);
      setSelectedParticipantsMap(prev => ({ ...prev, [eventId]: [] }));
      refreshData();
    } catch (err) {
      console.error(err);
      setFeedbackErr('Failed to generate batch certificates.');
      setTimeout(() => setFeedbackErr(''), 3000);
    } finally {
      setIsGeneratingBatchEventId(null);
    }
  };

  const handleRevokeBatchForEvent = async (eventId: string, specificStudentIds?: string[]) => {
    const ev = events.find(e => e.eventId === eventId);
    const countNote = specificStudentIds && specificStudentIds.length > 0
      ? `selected ${specificStudentIds.length} certificate(s)`
      : `ALL certificates for "${ev?.title || eventId}"`;

    if (!window.confirm(`Are you sure you want to LOCK & REVOKE ${countNote}? Students will no longer be able to view them until re-generated.`)) {
      return;
    }

    try {
      const res = await revokeBatchCertificatesForEvent(eventId, specificStudentIds, activeTenantIdResolved);
      setFeedbackMsg(`Locked & revoked ${res.revokedCount} certificates for this event.`);
      setTimeout(() => setFeedbackMsg(''), 4000);
      setSelectedParticipantsMap(prev => ({ ...prev, [eventId]: [] }));
      refreshData();
    } catch (err) {
      console.error(err);
      setFeedbackErr('Failed to revoke certificates.');
      setTimeout(() => setFeedbackErr(''), 3000);
    }
  };

  const handleToggleParticipantSelect = (eventId: string, studentId: string) => {
    setSelectedParticipantsMap(prev => {
      const currentList = prev[eventId] || [];
      if (currentList.includes(studentId)) {
        return { ...prev, [eventId]: currentList.filter(id => id !== studentId) };
      } else {
        return { ...prev, [eventId]: [...currentList, studentId] };
      }
    });
  };

  const handleSelectAllParticipants = (eventId: string, studentIds: string[]) => {
    setSelectedParticipantsMap(prev => {
      const currentList = prev[eventId] || [];
      const allSelected = studentIds.length > 0 && studentIds.every(id => currentList.includes(id));
      if (allSelected) {
        return { ...prev, [eventId]: [] };
      } else {
        return { ...prev, [eventId]: studentIds };
      }
    });
  };

  const handleIssueSingleCert = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudent = allUsers.find(u => u.uid === manualStudentUid);
    const targetEvent = events.find(e => e.eventId === manualEventId);
    if (!targetStudent || !targetEvent) {
      setFeedbackErr('Please select both a student and an event.');
      setTimeout(() => setFeedbackErr(''), 3000);
      return;
    }

    const certId = generateCertificateId(targetStudent.rollNumber, targetEvent.eventId, activeTenant?.shortCode);
    try {
      await issueCertificate({
        certificateId: certId,
        eventId: targetEvent.eventId,
        eventTitle: targetEvent.title,
        eventDate: targetEvent.date,
        eventVenue: targetEvent.venue,
        studentId: targetStudent.uid,
        studentName: targetStudent.name,
        rollNumber: targetStudent.rollNumber || 'N/A',
        department: targetStudent.department || activeTenant?.shortCode || activeTenant?.name || 'Department',
        year: targetStudent.year || 'III Year',
        section: targetStudent.section || 'A',
        issueDate: targetEvent.date || new Date().toISOString().split('T')[0],
        status: 'Issued',
        issuedBy: currentUser.name || 'Admin',
        qrVerificationData: `https://notx-connect.edu/verify?id=${certId}`
      });
      setShowManualIssueModal(false);
      setFeedbackMsg(`Certificate issued successfully! ID: ${certId}`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setFeedbackErr('Failed to issue certificate.');
      setTimeout(() => setFeedbackErr(''), 3000);
    }
  };

  const handleDeleteCert = async (certId: string) => {
    if (!window.confirm(`Are you sure you want to revoke and delete certificate ${certId}?`)) return;
    try {
      await deleteCertificate(certId);
      setFeedbackMsg(`Certificate ${certId} removed successfully.`);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setFeedbackErr('Failed to delete certificate.');
      setTimeout(() => setFeedbackErr(''), 3000);
    }
  };

  // Set default tab if attendance is allowed

  // Filters
  const associates = allUsers.filter(u => 
    (u.role === 'associate' || (u.role === 'president' && u.uid !== 'admin_master')) &&
    (!activeTenantIdResolved || (u.tenantId && u.tenantId.toLowerCase() === activeTenantIdResolved.toLowerCase()))
  );
  const coordinators = allUsers.filter(u => 
    u.role === 'coordinator' &&
    (!activeTenantIdResolved || (u.tenantId && u.tenantId.toLowerCase() === activeTenantIdResolved.toLowerCase()))
  );

  // Filter events that coordinator can manage
  const manageableEvents = events.filter(ev => {
    if (isAdmin) return true;
    if (isAssociate) return true;
    if (isCoordinator) {
      return currentUser.assignedEvents?.includes(ev.eventId);
    }
    return false;
  });

  // Ensure selected event is always one of the manageable ones
  useEffect(() => {
    if (manageableEvents.length > 0 && !manageableEvents.some(e => e.eventId === selectedEventId)) {
      setSelectedEventId(manageableEvents[0].eventId);
    }
  }, [selectedEventId, manageableEvents]);

  // Selected event object and its registrations
  const activeEvent = events.find(e => e.eventId === selectedEventId);
  const activeRegistrations = registrations.filter(r => r.eventId === selectedEventId);

  // Search filtered registries
  const filteredRegistrations = activeRegistrations.filter(r =>
    r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Memoized filtered and grouped students for the student directory
  const filteredStudents = useMemo(() => {
    return allUsers
      .filter(u => u.role !== 'admin' && !u.isSuperAdmin && u.uid !== 'admin_master' && (!activeTenantIdResolved || (u.tenantId && u.tenantId.toLowerCase() === activeTenantIdResolved.toLowerCase())))
      .filter(u => {
        const matchesSearch = !studentSearch.trim() ||
          u.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase()) ||
          u.name.toLowerCase().includes(studentSearch.toLowerCase());

        const matchesYear = studentYearFilter === 'All' || 
          (u.year && u.year.trim().toLowerCase() === studentYearFilter.trim().toLowerCase());

        const matchesSection = studentSectionFilter === 'All' || 
          ((u.section || 'A').trim().toUpperCase() === studentSectionFilter.trim().toUpperCase());

        return matchesSearch && matchesYear && matchesSection;
      });
  }, [allUsers, studentSearch, studentYearFilter, studentSectionFilter, activeTenantIdResolved]);

  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce((acc, student) => {
      const key = `${student.year || 'Unknown Year'} - ${student.branch || 'Unknown Branch'} (Sec ${student.section || 'A'})`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {} as Record<string, typeof filteredStudents>);
  }, [filteredStudents]);

  // Sync indeterminate state for master student selection checkbox
  useEffect(() => {
    if (masterCheckboxRef.current) {
      const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.uid));
      const someSelected = filteredStudents.some(s => selectedStudentIds.includes(s.uid));
      masterCheckboxRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [filteredStudents, selectedStudentIds]);

  const allGroupKeys = useMemo(() => Object.keys(groupedStudents), [groupedStudents]);
  const isAllGroupsExpanded = allGroupKeys.length > 0 && allGroupKeys.every(k => expandedGroupKeys.includes(k));

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroupKeys(prev => 
      prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]
    );
  };

  // Auto-expand all matching sections when a search query is active
  useEffect(() => {
    if (studentSearch.trim()) {
      setExpandedGroupKeys(allGroupKeys);
    }
  }, [studentSearch, allGroupKeys]);

  // Memoized filtered department tickets
  const filteredTenantTickets = useMemo(() => {
    return tenantTickets.filter(t => {
      const q = ticketSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        t.subject.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        (t.userRoll && t.userRoll.toLowerCase().includes(q)) ||
        t.userEmail.toLowerCase().includes(q) ||
        (t.readableId && t.readableId.toLowerCase().includes(q));

      const matchesStatus = ticketStatusFilter === 'all' ||
        (ticketStatusFilter === 'open' && (t.status === 'open' || t.status === 'in_progress')) ||
        (ticketStatusFilter === 'resolved' && (t.status === 'resolved' || t.status === 'closed'));

      return matchesSearch && matchesStatus;
    });
  }, [tenantTickets, ticketSearch, ticketStatusFilter]);

  const openTenantTicketsCount = tenantTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const selectedTicket = tenantTickets.find(t => t.id === selectedTicketId) || null;

  // Mark ticket as read by admin when selected
  useEffect(() => {
    if (selectedTicket && selectedTicket.unreadByAdmin) {
      markTicketRead(selectedTicket.id, 'admin').catch(err => {
        console.warn('Failed to mark ticket read for admin:', err);
      });
    }
  }, [selectedTicket?.id, selectedTicket?.unreadByAdmin]);

  const handleSendDeptReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReplyText.trim() || isSendingTicketReply) return;

    setIsSendingTicketReply(true);
    try {
      await addTicketReply(
        selectedTicket.id,
        {
          senderId: currentUser.uid,
          senderName: currentUser.name || 'Department Admin',
          senderEmail: currentUser.email,
          senderRole: currentUser.role || 'admin',
          message: ticketReplyText.trim()
        },
        true
      );
      setTicketReplyText('');
      setFeedbackMsg(`Official department reply transmitted to ${selectedTicket.userName}!`);
      setTimeout(() => setFeedbackMsg(''), 3500);
    } catch (err: any) {
      console.error('Failed to send dept reply:', err);
      setFeedbackErr('Failed to transmit reply.');
      setTimeout(() => setFeedbackErr(''), 3000);
    } finally {
      setIsSendingTicketReply(false);
    }
  };

  const handleUpdateDeptTicketStatus = async (ticketId: string, newStatus: TicketStatus) => {
    setIsUpdatingTicketStatus(true);
    try {
      await updateTicketStatus(ticketId, newStatus);
      setFeedbackMsg(`Ticket status updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    } finally {
      setIsUpdatingTicketStatus(false);
    }
  };

  // Toggle Associate power (Admin only)
  const handleTogglePower = async (uid: string, powerKey: keyof AssociatePowers) => {
    if (!isAdmin) return;
    const userProfile = allUsers.find(u => u.uid === uid);
    if (!userProfile) return;

    const currentPowers = userProfile.powers || {};
    const updatedPowers = {
      ...currentPowers,
      [powerKey]: !currentPowers[powerKey]
    };

    try {
      await updateUserProfile(uid, { powers: updatedPowers });
      refreshData();
    } catch (err) {
      console.error("Failed to update power: ", err);
    }
  };

  // Toggle Event assignment for Coordinators
  const handleToggleEventAssignment = async (coordId: string, eventId: string) => {
    if (!isAdmin) return;
    const coord = coordinators.find(u => u.uid === coordId);
    if (!coord) return;

    const currentAssignments = coord.assignedEvents || [];
    const updatedAssignments = currentAssignments.includes(eventId)
      ? currentAssignments.filter(id => id !== eventId)
      : [...currentAssignments, eventId];

    try {
      await updateUserProfile(coordId, { assignedEvents: updatedAssignments });
      const assignedNames = events
        .filter(ev => updatedAssignments.includes(ev.eventId))
        .map(ev => ev.title);
      const eventSummary = assignedNames.length > 0 ? assignedNames.join(', ') : 'None';
      sendAppNotification({
        tenantId: coord.tenantId || activeTenantIdResolved || '',
        userId: coord.uid,
        type: 'assignment',
        title: '📅 Event Assignments Updated',
        message: `Your coordinator responsibilities have been updated. Active events: ${eventSummary}.`,
        link: '/admin',
        metadata: { assignedEvents: updatedAssignments }
      }).catch(console.warn);
      refreshData();
    } catch (err) {
      console.error("Failed to update coordinator assignments: ", err);
    }
  };

  // Create Associate Profile (Admin only)


  const handleBulkDeleteStudents = async () => {
    if (!isAdmin || selectedStudentIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedStudentIds.length} selected students?`)) return;

    setFeedbackMsg('');
    setFeedbackErr('');
    try {
      // Deleting users one by one (could be optimized, but works)
      for (const uid of selectedStudentIds) {
        await deleteUserProfile(uid);
      }
      setSelectedStudentIds([]);
      setFeedbackMsg(`Successfully deleted ${selectedStudentIds.length} students.`);
      refreshData();
    } catch (err) {
      console.error(err);
      setFeedbackErr("Failed to delete some students.");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    const targetUser = allUsers.find(u => u.uid === uid);
    if (!targetUser) return;
    if (targetUser.role === 'admin' || targetUser.isSuperAdmin) {
      setFeedbackErr("Permission denied. Department administrators cannot be deleted from this panel.");
      return;
    }
    if (activeTenantIdResolved && targetUser.tenantId && targetUser.tenantId.toLowerCase() !== activeTenantIdResolved.toLowerCase()) {
      setFeedbackErr("Permission denied. Cannot delete members of another association.");
      return;
    }
    try {
      await deleteUserProfile(uid);
      setConfirmDeleteId(null);
      setFeedbackMsg("User deleted successfully.");
      refreshData();
    } catch (err) {
      console.error(err);
      setFeedbackErr("Failed to delete user.");
    }
  };



  const exportAttendanceCSV = (activeEvent: DepartmentEvent) => {
    if (!activeEvent || !allUsers) return;
    const eventRegs = registrations.filter(r => r.eventId === activeEvent.eventId);
    if (eventRegs.length === 0) {
      alert("No registrations found for this event.");
      return;
    }

    let csv = "Roll Number,Name,Phone,Section,Team Name,Applied At,Attendance Status\n";

    eventRegs.forEach(reg => {
      const profile = allUsers.find(u => u.uid === reg.studentId);
      if (!profile) return;
      const roll = profile.rollNumber || "Unknown";
      const name = profile.name || "Unknown";
      const phone = profile.phone || "N/A";
      const section = profile.section || "N/A";
      const team = reg.teamName ? `"${reg.teamName}"` : "N/A";
      const appliedAt = reg.appliedAt ? new Date(reg.appliedAt).toLocaleString() : "Unknown";
      const status = reg.status === 'Attended' ? "Present" : "Absent";

      csv += `${roll},${name},${phone},${section},${team},${appliedAt},${status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${activeEvent.title.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };



  const handleToggleAttendance = async (regId: string, present: boolean) => {
    const activeEv = events.find(e => e.eventId === selectedEventId);
    if (present && activeEv && isBeforeEventDate(activeEv.date)) {
      setFeedbackErr(`Attendance Locked: Event is scheduled for ${activeEv.date}. Check-in opens on event day.`);
      setTimeout(() => setFeedbackErr(''), 3500);
      return;
    }
    try {
      await updateRegistrationStatus(regId, present ? 'Attended' : 'Registered', currentUser.email);
      refreshData();
    } catch (err) {
      console.error(err);
      setFeedbackErr("Failed to update attendance.");
    }
  };

  const handleDemoteUser = async (uid: string) => {
    const targetUser = allUsers.find(u => u.uid === uid);
    if (targetUser?.role === 'admin' && !isTopAdmin) {
      setFeedbackErr("Permission denied. Only top admin can demote admins.");
      return;
    }
    try {
      await updateUserProfile(uid, { role: "student", powers: {}, assignedEvents: [], position: "", responsibilities: "" });
      if (targetUser) {
        sendAppNotification({
          tenantId: targetUser.tenantId || activeTenantIdResolved || '',
          userId: uid,
          type: 'system',
          title: 'ℹ️ Role Updated',
          message: 'Your leadership privileges have been revoked and restored to Student profile.',
          link: '/profile'
        }).catch(console.warn);
      }
      setConfirmDemoteId(null);
      setFeedbackMsg("User demoted successfully.");
      refreshData();
    } catch (err) {
      console.error(err);
      setFeedbackErr("Failed to demote user.");
    }
  };

  const handleCreateAssociate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const student = allUsers.find(u => u.rollNumber?.toUpperCase() === assocSearchRoll.trim().toUpperCase());
    if (!student) {
      setFeedbackErr("Student with this roll number not found in the database.");
      return;
    }

    const effectivePosition = assocTitleSelect === 'other'
      ? assocCustomTitle.trim()
      : assocTitleSelect;

    if (!effectivePosition) {
      setFeedbackErr("Please specify a position title.");
      return;
    }

    try {
      await updateUserProfile(student.uid, {
        role: 'associate',
        position: effectivePosition,
        powers: assocPowers,
        responsibilities: `Coordinating activities as ${effectivePosition}.`
      });
      sendAppNotification({
        tenantId: student.tenantId || activeTenantIdResolved || '',
        userId: student.uid,
        type: 'promotion',
        title: '🎖️ Role Promoted: Associate!',
        message: `Congratulations ${student.name}! You have been appointed as ${effectivePosition}.`,
        link: '/associates',
        metadata: { position: effectivePosition, newRole: 'associate' }
      }).catch(console.warn);
      setShowCreateAssociate(false);
      setAssocSearchRoll('');
      setAssocTitleSelect('President');
      setAssocCustomTitle('');
      refreshData();
    } catch (err) {
      console.error("Failed to assign associate role: ", err);
    }
  };

  // Create Coordinator Profile (Admin only)
  const handleCreateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const student = allUsers.find(u => u.rollNumber?.toUpperCase() === coordSearchRoll.trim().toUpperCase());
    if (!student) {
      setFeedbackErr("Student with this roll number not found in the database.");
      return;
    }

    try {
      await updateUserProfile(student.uid, {
        role: 'coordinator',
        position: 'Student Event Coordinator',
        assignedEvents: coordAssignedEvents,
        responsibilities: `Managing assigned technical and cultural events.`
      });
      const assignedNames = events
        .filter(ev => coordAssignedEvents.includes(ev.eventId))
        .map(ev => ev.title);
      const eventSummary = assignedNames.length > 0 ? ` for: ${assignedNames.join(', ')}` : '';
      sendAppNotification({
        tenantId: student.tenantId || activeTenantIdResolved || '',
        userId: student.uid,
        type: 'promotion',
        title: '🎯 Appointed Event Coordinator!',
        message: `Congratulations ${student.name}! You have been appointed as Student Event Coordinator${eventSummary}. Check your coordinator dashboard.`,
        link: '/admin',
        metadata: { assignedEvents: coordAssignedEvents, newRole: 'coordinator' }
      }).catch(console.warn);
      setShowCreateCoordinator(false);
      setCoordSearchRoll('');
      setCoordAssignedEvents([]);
      refreshData();
    } catch (err) {
      console.error("Failed to assign coordinator role: ", err);
    }
  };

  // Update attendance of registered student
  const handleUpdateStatus = async (regId: string, status: 'Registered' | 'Attended' | 'Absent') => {
    const activeEv = events.find(e => e.eventId === selectedEventId);
    if (status === 'Attended' && activeEv && isBeforeEventDate(activeEv.date)) {
      setFeedbackErr(`Attendance Locked: Event is scheduled for ${activeEv.date}. Check-in opens on event day.`);
      setTimeout(() => setFeedbackErr(''), 3500);
      return;
    }
    try {
      await updateRegistrationStatus(regId, status, currentUser.email);
      refreshData();
    } catch (err) {
      console.error("Failed to update registration: ", err);
    }
  };

  const handleBulkAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (isGeneratingStudentsRef.current) return;
    isGeneratingStudentsRef.current = true;
    setIsGeneratingStudents(true);

    setFeedbackMsg('');
    setFeedbackErr('');

    let rollsToCreate: string[] = [];

    if (bulkMode === 'series') {
      if (!seriesPrefix || !seriesStart || !seriesEnd) {
        setFeedbackErr('Please fill in prefix, start index, and end index.');
        isGeneratingStudentsRef.current = false;
        setIsGeneratingStudents(false);
        return;
      }
      const startNum = parseInt(seriesStart, 36);
      const endNum = parseInt(seriesEnd, 36);
      if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
        setFeedbackErr('Invalid start/end indices.');
        isGeneratingStudentsRef.current = false;
        setIsGeneratingStudents(false);
        return;
      }
      const padLen = Math.max(seriesStart.length, seriesEnd.length);
      for (let i = startNum; i <= endNum; i++) {
        rollsToCreate.push(`${seriesPrefix}${i.toString(36).padStart(padLen, '0')}`.toUpperCase());
      }
    } else {
      if (!bulkText.trim()) {
        setFeedbackErr('Please paste roll numbers in the text area.');
        isGeneratingStudentsRef.current = false;
        setIsGeneratingStudents(false);
        return;
      }
      rollsToCreate = bulkText
        .split(/[\n,]+/)
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);
    }

    // Deduplicate any repeated roll numbers in the input set itself
    rollsToCreate = Array.from(new Set(rollsToCreate));

    if (rollsToCreate.length === 0) {
      setFeedbackErr('No roll numbers generated.');
      isGeneratingStudentsRef.current = false;
      setIsGeneratingStudents(false);
      return;
    }

    try {
      let skippedCount = 0;
      const profilesToCreate: UserProfile[] = [];
      const activeTenant = activeTenantIdResolved;

      for (const roll of rollsToCreate) {
        const exists = allUsers.some(u => u.rollNumber?.toLowerCase() === roll.toLowerCase() && (u.tenantId === activeTenant || !u.tenantId));
        if (exists) {
          skippedCount++;
          continue;
        }

        let pwd = '';
        if (passwordOption === 'roll') {
          pwd = roll;
        } else if (passwordOption === 'preset') {
          pwd = presetPassword || 'notx@123';
        } else {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          for (let c = 0; c < 6; c++) {
            pwd += chars.charAt(Math.floor(Math.random() * chars.length));
          }
        }

        // Provision synthetic account in Firebase Auth
        const authRes = await createStudentAuthAccount(roll, activeTenant, pwd);
        const syntheticEmail = authRes.email || `${roll.toLowerCase()}.${activeTenant.toLowerCase()}@notx.com`;

        const newProfile: UserProfile = {
          uid: authRes.uid || `user_student_${roll.toLowerCase()}_${activeTenant}`,
          name: `Student (${roll})`,
          email: syntheticEmail,
          role: 'student',
          tenantId: activeTenant,
          phone: '',
          rollNumber: roll,
          branch: branding.appName || 'Engineering',
          year: '3rd Year',
          section: 'A',
          skills: '',
          profile_pic: "",
          isFirstLogin: true,
          created_at: new Date().toISOString()
        };

        profilesToCreate.push(newProfile);
      }

      if (profilesToCreate.length > 0) {
        await createMultipleUserProfiles(profilesToCreate);
      }

      const successCount = profilesToCreate.length;
      setFeedbackMsg(`Successfully created ${successCount} new students. ${skippedCount > 0 ? `Skipped ${skippedCount} existing students.` : ''}`);
      setSeriesPrefix('');
      setSeriesStart('');
      setSeriesEnd('');
      setBulkText('');
      setShowBulkAdd(false);
      refreshData();
    } catch (err) {
      console.error("Bulk add failed: ", err);
      setFeedbackErr('Failed to complete bulk import.');
    } finally {
      isGeneratingStudentsRef.current = false;
      setIsGeneratingStudents(false);
    }
  };

  const handleResetPassword = async (uid: string, roll: string) => {
    if (!isAdmin) return;
    setFeedbackMsg('');
    setFeedbackErr('');
    const newTempPwd = `${roll.toUpperCase()}_RESET`;
    try {
      const hashedTempPwd = await hashPassword(newTempPwd);
      await updateUserProfile(uid, { password: hashedTempPwd, isFirstLogin: true });
      setFeedbackMsg(`Successfully reset password for student ${roll} to: ${newTempPwd}`);
      refreshData();
    } catch (err) {
      console.error(err);
      setFeedbackErr(`Failed to reset password for student ${roll}.`);
    }
  };

  // Audio & haptic chime for QR check-ins
  const playFeedbackChime = (type: 'success' | 'already' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        navigator.vibrate?.([60, 40, 60]);
      } else if (type === 'already') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
        navigator.vibrate?.([60]);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(146.83, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        navigator.vibrate?.([150]);
      }
    } catch (e) {
      // AudioContext policy
    }
  };

  // QR Check-in scanner processor
  const handleQRCheckIn = async (rollToScan: string) => {
    if (!rollToScan || !rollToScan.trim()) return;

    // Smart decode: handles raw roll numbers, ticket numbers, JSON payloads, or URL query parameters
    let parsed = rollToScan.trim();
    if (parsed.startsWith('{') && parsed.endsWith('}')) {
      try {
        const obj = JSON.parse(parsed);

        // 1. Cross-event check: prevent using a pass from another event
        if (obj.eventId && selectedEventId && obj.eventId !== selectedEventId) {
          setScanResultMsg("Invalid Pass: This QR pass was issued for a different event.");
          setScanResultType('error');
          playFeedbackChime('error');
          return;
        }

        // 2. Cross-tenant check: prevent using a pass from another department
        const currentTid = (activeTenantId || currentUser.tenantId || '').trim().toLowerCase();
        if (obj.tenantId && currentTid && obj.tenantId.trim().toLowerCase() !== currentTid) {
          setScanResultMsg("Invalid Pass: This QR pass belongs to a different department.");
          setScanResultType('error');
          playFeedbackChime('error');
          return;
        }

        // 3. Cryptographic signature verification for signed passes
        if (obj.sig && obj.regId && obj.eventId && obj.roll && obj.tenantId) {
          const isValidSig = await verifyTicketSignature(obj.regId, obj.eventId, obj.roll, obj.tenantId, obj.sig);
          if (!isValidSig) {
            setScanResultMsg("Fraud Warning: Cryptographic pass signature is invalid. Pass may be tampered.");
            setScanResultType('error');
            playFeedbackChime('error');
            return;
          }
        }

        parsed = obj.regId || obj.registrationId || obj.rollNumber || obj.roll || obj.uid || parsed;
      } catch (e) { }
    } else if (parsed.startsWith('http://') || parsed.startsWith('https://')) {
      try {
        const url = new URL(parsed);
        parsed = url.searchParams.get('data') || url.searchParams.get('roll') || url.searchParams.get('reg') || parsed;
      } catch (e) { }
    }

    const cleanInput = parsed.trim().toUpperCase();
    setScannedRollInput('');
    setScanResultMsg('');
    setSpotRegisterStudent(null);

    if (!selectedEventId) {
      setScanResultMsg("Please select an active event first.");
      setScanResultType('error');
      playFeedbackChime('error');
      return;
    }

    const activeEv = events.find(e => e.eventId === selectedEventId);
    if (activeEv && isBeforeEventDate(activeEv.date)) {
      setScanResultMsg(`Check-in Locked: Event "${activeEv.title}" is scheduled for ${activeEv.date}. Attendance check-in opens on the event day.`);
      setScanResultType('error');
      playFeedbackChime('error');
      return;
    }

    // 1. Check if already in active registrations
    const reg = activeRegistrations.find(r =>
      r.rollNumber?.trim().toUpperCase() === cleanInput ||
      r.registrationId?.trim().toUpperCase() === cleanInput ||
      r.studentId?.toUpperCase() === cleanInput
    );

    if (reg) {
      if (reg.status === 'Attended') {
        setScanResultMsg(`Already Checked-in: ${reg.studentName} (${reg.rollNumber || cleanInput}) is already marked as Present.`);
        setScanResultType('info');
        playFeedbackChime('already');
        return;
      }

      try {
        await updateRegistrationStatus(reg.registrationId, 'Attended', currentUser.email);
        setScanResultMsg(`Check-in Successful! ${reg.studentName} (${reg.rollNumber || cleanInput}) marked as Present.`);
        setScanResultType('success');
        playFeedbackChime('success');
        refreshData();
      } catch (err) {
        console.warn('Network write failed, queuing attendance scan offline:', err);
        try {
          // Store offline queued check-in to localStorage for automatic sync
          const queueKey = 'notx_offline_attendance_queue';
          const existingQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');
          existingQueue.push({
            registrationId: reg.registrationId,
            status: 'Attended',
            verifiedBy: currentUser.email,
            studentName: reg.studentName,
            rollNumber: reg.rollNumber || cleanInput,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem(queueKey, JSON.stringify(existingQueue));
          setScanResultMsg(`Saved Offline: ${reg.studentName} (${reg.rollNumber || cleanInput}) queued. Will sync automatically when online.`);
          setScanResultType('info');
          playFeedbackChime('success');
        } catch {
          setScanResultMsg("Database error during check-in.");
          setScanResultType('error');
          playFeedbackChime('error');
        }
      }
    } else {
      // Check if registration exists for another event
      const otherEventReg = registrations.find(r => r.registrationId?.trim().toUpperCase() === cleanInput);
      if (otherEventReg) {
        const otherEv = events.find(e => e.eventId === otherEventReg.eventId);
        setScanResultMsg(`Pass Mismatch: This pass was issued for "${otherEv?.title || otherEventReg.eventId}". Please select that event in the dropdown above.`);
        setScanResultType('error');
        playFeedbackChime('error');
        return;
      }

      // 2. Check if student profile exists in memory or Firestore
      let studentProfile = allUsers.find(u =>
        u.rollNumber?.trim().toUpperCase() === cleanInput ||
        u.uid === parsed ||
        u.email?.trim().toUpperCase() === cleanInput
      );

      if (!studentProfile) {
        try {
          studentProfile = (await findUserForLogin(cleanInput)) || undefined;
        } catch (e) {
          console.warn("Live user lookup error:", e);
        }
      }

      if (studentProfile) {
        // Auto spot-register
        try {
          const newRegId = `reg_${Date.now()}`;
          const newReg = {
            registrationId: newRegId,
            eventId: selectedEventId,
            studentId: studentProfile.uid,
            studentName: studentProfile.name,
            rollNumber: studentProfile.rollNumber || '',
            phone: studentProfile.phone || '',
            year: studentProfile.year || '3rd Year',
            status: 'Attended' as const,
            appliedAt: new Date().toISOString()
          };
          await createRegistration(newReg);
          setScanResultMsg(`Spot Auto-Registration: ${studentProfile.name} (${studentProfile.rollNumber}) registered & marked Present!`);
          setScanResultType('success');
          playFeedbackChime('success');
          refreshData();
        } catch (err) {
          console.error(err);
          setScanResultMsg("Database error during spot-registration.");
          setScanResultType('error');
          playFeedbackChime('error');
        }
      } else {
        setScanResultMsg(`No student or registration found matching "${cleanInput}".`);
        setScanResultType('error');
        playFeedbackChime('error');
      }
    }
  };

  // Spot registration function
  const handleSpotRegister = async () => {
    if (!spotRegisterStudent || !selectedEventId || !activeEvent) return;
    try {
      const newRegId = `reg_${Date.now()}`;
      const newReg: EventRegistration = {
        registrationId: newRegId,
        eventId: selectedEventId,
        studentId: spotRegisterStudent.uid,
        studentName: spotRegisterStudent.name,
        rollNumber: spotRegisterStudent.rollNumber || '',
        phone: spotRegisterStudent.phone || '',
        year: spotRegisterStudent.year || '3rd Year',
        status: 'Attended' as const,
        appliedAt: new Date().toISOString()
      };

      await createRegistration(newReg);
      setScanResultMsg(`Spot Registration & Check-in Successful! ${spotRegisterStudent.name} (${spotRegisterStudent.rollNumber}) has been added and checked in.`);
      setScanResultType('success');
      setSpotRegisterStudent(null);
      refreshData();
    } catch (err) {
      console.error("Spot register failed: ", err);
      setScanResultMsg("Failed to complete spot registration.");
      setScanResultType('error');
    }
  };

  // CSV Export feature
  const exportToCSV = () => {
    if (!activeEvent) return;

    const headers = [
      "Student Name",
      "Roll Number",
      "Year",
      "Section",
      "Email Address",
      "Phone Number",
      "Registration Type",
      "Team Name",
      "Team Members Details",
      "Attendance Status",
      "Applied At"
    ];

    const rows = activeRegistrations.map(reg => {
      const profile = allUsers.find(
        u => u.uid === reg.studentId ||
          (u.rollNumber && u.rollNumber.toLowerCase() === reg.rollNumber.toLowerCase())
      );

      const email = profile?.email || `${reg.rollNumber.toLowerCase()}@aits.edu`;
      const section = profile?.section || 'A';
      const phone = profile?.phone || reg.phone || 'N/A';
      const year = profile?.year || reg.year || '3rd Year';
      const teamMembersInfo = reg.teamMembers?.map(m => `${m.name} (${m.rollNumber}) [${m.status || 'Pending'}]`).join(" | ") || "";

      return [
        `"${(profile?.name || reg.studentName).replace(/"/g, '""')}"`,
        `"${reg.rollNumber.toUpperCase()}"`,
        `"${year}"`,
        `"${section}"`,
        `"${email}"`,
        `"${phone}"`,
        `"${reg.isTeam ? 'Team' : 'Individual'}"`,
        `"${(reg.teamName || '').replace(/"/g, '""')}"`,
        `"${teamMembersInfo.replace(/"/g, '""')}"`,
        `"${reg.status}"`,
        `"${reg.appliedAt || ''}"`
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Registrations_${activeEvent.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/80">
      <div
        className="bg-[var(--nb-surface)] text-[var(--nb-content)] w-full max-w-5xl h-full sm:h-[90dvh] sm:rounded-lg flex flex-col overflow-hidden relative border-0 sm:border-[2.5px] sm:border-[var(--nb-ink)] shadow-none sm:shadow-[var(--shadow-hard-lg)]"
      >
        {/* Header */}
        <div
          className="flex justify-between items-center p-3 sm:p-4 bg-[var(--nb-surface-accent)] gap-2 sm:gap-3"
          style={{ borderBottom: '2px solid var(--nb-ink)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BrandLogo branding={branding} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
                <h2 className="nb-headline text-xs sm:text-base tracking-wide truncate">
                  {branding.appName || 'NOTX'} Admin Console
                </h2>
                {branding.subtitle && (
                  <span className="nb-tag text-[8px] sm:text-[9px] hidden xs:inline-block">
                    {branding.subtitle}
                  </span>
                )}
              </div>
              <p className="nb-label text-[8px] sm:text-[10px] text-[var(--nb-secondary)] truncate">Elevated Privileges Active</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Copy Tenant Student Invite Link */}
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="nb-btn-ghost px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400"
              title="Copy student invite link for this department"
            >
              {copiedInviteLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Invite Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Invite Link</span>
                </>
              )}
            </button>

            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setIsEditBrandingModalOpen(true)}
                className="nb-btn-ghost px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Change brand name (NOTX) and logo dynamically"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                <span className="hidden sm:inline">Change Name & Logo</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="relative bg-[var(--nb-surface)]" style={{ borderBottom: '2px solid var(--nb-ink)' }}>
          <div
            className="flex px-3 pt-2.5 pb-2 gap-2 overflow-x-auto scrollbar-none scroll-smooth touch-pan-x"
          >
            {canManageRoles && (
              <>
                <button
                  onClick={() => setActiveTab('associates')}
                  className={`py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer shrink-0 whitespace-nowrap ${activeTab === 'associates'
                      ? 'nb-pill-blue text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]'
                      : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)]'
                    }`}
                >
                  Associates
                </button>
                <button
                  onClick={() => setActiveTab('coordinators')}
                  className={`py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer shrink-0 whitespace-nowrap ${activeTab === 'coordinators'
                      ? 'nb-pill-cyan text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]'
                      : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)]'
                    }`}
                >
                  Coordinators
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer shrink-0 whitespace-nowrap ${activeTab === 'students'
                      ? 'nb-pill-yellow text-neutral-900 border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]'
                      : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)]'
                    }`}
                >
                  Students DB
                </button>
                <button
                  onClick={() => setActiveTab('certificates')}
                  className={`py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'certificates'
                      ? 'nb-pill-purple text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]'
                      : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)]'
                    }`}
                >
                  <Award className={`w-3.5 h-3.5 ${activeTab === 'certificates' ? 'text-white' : 'text-[var(--nb-accent)]'}`} />
                  <span>Certificates</span>
                  <span className={`w-2 h-2 rounded-full ${isCertificatesEnabled ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'settings'
                      ? 'nb-pill-coral text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]'
                      : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)]'
                    }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap relative ${activeTab === 'tickets'
                      ? 'nb-pill-green text-neutral-900 border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] font-black'
                      : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)]'
                    }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Tickets</span>
                  {openTenantTicketsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black bg-rose-500 text-white animate-pulse">
                      {openTenantTicketsCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {canViewAttendanceTab && (
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer shrink-0 whitespace-nowrap ${activeTab === 'attendance'
                    ? 'nb-pill-green text-neutral-900 border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]'
                    : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)]'
                  }`}
              >
                Attendance &amp; Registry
              </button>
            )}
          </div>
          {/* Subtle Right Scroll Fade Cue on Mobile */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--nb-surface)] to-transparent sm:hidden" />
        </div>

        {/* Core Tabs Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* GLOBAL FEEDBACK NOTIFICATION ALERTS */}
          {feedbackMsg && (
            <div
              className="text-xs font-bold text-[var(--nb-content)] bg-[var(--nb-surface-accent)] rounded p-3 flex justify-between items-center"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <span>{feedbackMsg}</span>
              <button onClick={() => setFeedbackMsg('')} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--nb-surface)] font-bold text-base cursor-pointer" aria-label="Dismiss">&times;</button>
            </div>
          )}
          {feedbackErr && (
            <div
              className="text-xs font-bold text-rose-500 bg-rose-500/10 rounded p-3 flex justify-between items-center"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <span>{feedbackErr}</span>
              <button onClick={() => setFeedbackErr('')} className="w-6 h-6 flex items-center justify-center rounded hover:bg-rose-500/20 font-bold text-base cursor-pointer" aria-label="Dismiss">&times;</button>
            </div>
          )}


          {/* ==================== 1. ASSOCIATES MANAGEMENT TAB ==================== */}
          {activeTab === 'associates' && canManageRoles && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="nb-headline text-base text-[var(--nb-content)]">Department Associates</h3>
                  <p className="nb-label text-[10px] text-[var(--nb-secondary)]">President, Vice President, Secretary, Media Leads, etc.</p>
                </div>
                <button
                  onClick={() => setShowCreateAssociate(!showCreateAssociate)}
                  className="nb-btn text-xs font-bold uppercase py-2 px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  New Associate
                </button>
              </div>

              {/* CREATE ASSOCIATE INLINE FORM */}
              {showCreateAssociate && (
                <form
                  onSubmit={handleCreateAssociate}
                  className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex justify-between items-center border-b border-[var(--nb-ink)]/20 pb-2 mb-1">
                    <span className="nb-label text-xs text-[var(--nb-accent)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> ASSIGN EXECUTIVE ROLE
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreateAssociate(false)}
                      className="nb-btn-ghost px-2 py-0.5 text-xs cursor-pointer"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="relative">
                    <label className="nb-label text-[9px] text-[var(--nb-secondary)] block mb-1">STUDENT ROLL NUMBER</label>
                    <input
                      type="text"
                      required
                      value={assocSearchRoll}
                      onChange={e => setAssocSearchRoll(e.target.value)}
                      onFocus={() => setAssocRollFocused(true)}
                      onBlur={() => setTimeout(() => setAssocRollFocused(false), 200)}
                      placeholder="e.g. 23HM1A3301"
                      className="nb-input py-1.5 text-xs w-full font-mono"
                    />
                    {assocRollFocused && assocSearchRoll.length > 0 && (
                      <div
                        className="absolute top-[100%] mt-1 left-0 right-0 bg-[var(--nb-surface)] rounded z-50 max-h-40 overflow-y-auto overflow-x-hidden"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        {allUsers
                          .filter(u => u.uid !== 'admin_master' && (u.rollNumber?.toLowerCase().includes(assocSearchRoll.toLowerCase()) || u.name.toLowerCase().includes(assocSearchRoll.toLowerCase())))
                          .map(u => (
                            <div
                              key={u.uid}
                              className="px-3 py-2 hover:bg-[var(--nb-surface-accent)] cursor-pointer border-b border-[var(--nb-ink)]/20 last:border-0"
                              onClick={() => {
                                setAssocSearchRoll(u.rollNumber || '');
                                setAssocRollFocused(false);
                              }}
                            >
                              <div className="text-xs font-bold text-[var(--nb-content)] truncate">{u.name}</div>
                              <div className="nb-label text-[10px] text-[var(--nb-secondary)] truncate">{u.rollNumber}</div>
                            </div>
                          ))}
                        {allUsers.filter(u => u.uid !== 'admin_master' && (u.rollNumber?.toLowerCase().includes(assocSearchRoll.toLowerCase()) || u.name.toLowerCase().includes(assocSearchRoll.toLowerCase()))).length === 0 && (
                          <div className="px-3 py-2 text-xs text-[var(--nb-secondary)] italic">No matching students found</div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* POSITION / TITLE DROPDOWN WITH CUSTOM OPTION */}
                  <div className="space-y-2">
                    <label className="nb-label text-[11px] text-[var(--nb-secondary)] block mb-1">EXECUTIVE POSITION / TITLE</label>
                    <select
                      value={assocTitleSelect}
                      onChange={e => setAssocTitleSelect(e.target.value)}
                      className="nb-input py-1.5 text-xs w-full font-bold bg-[var(--nb-surface)] text-[var(--nb-content)] cursor-pointer"
                    >
                      <option value="President">President</option>
                      <option value="Vice President">Vice President</option>
                      <option value="General Secretary">General Secretary</option>
                      <option value="Joint Secretary">Joint Secretary</option>
                      <option value="Treasurer">Treasurer</option>
                      <option value="Technical Head / Lead">Technical Head / Lead</option>
                      <option value="Event Operations Lead">Event Operations Lead</option>
                      <option value="PR & Social Media Lead">PR &amp; Social Media Lead</option>
                      <option value="Design & Creative Lead">Design &amp; Creative Lead</option>
                      <option value="other">Custom / Other (Enter custom title...)</option>
                    </select>

                    {assocTitleSelect === 'other' && (
                      <div className="pt-1">
                        <label className="nb-label text-[10px] text-[var(--nb-secondary)] block mb-1">ENTER CUSTOM POSITION TITLE *</label>
                        <input 
                          type="text" 
                          required={assocTitleSelect === 'other'}
                          value={assocCustomTitle} 
                          onChange={e => setAssocCustomTitle(e.target.value)}
                          placeholder="e.g. Innovation Head, Media Curator, Webmaster"
                          className="nb-input py-1.5 text-xs w-full font-bold"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="nb-label text-[9px] text-[var(--nb-secondary)] block mb-2">INITIAL CAPABILITIES</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className="flex items-center gap-2 bg-[var(--nb-surface-accent)] p-2 rounded cursor-pointer"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <input
                          type="checkbox"
                          checked={assocPowers.canManageEvents}
                          onChange={e => setAssocPowers({ ...assocPowers, canManageEvents: e.target.checked })}
                          className="accent-[var(--nb-accent)]"
                        />
                        <span className="text-xs text-[var(--nb-content)]">Manage Events</span>
                      </label>
                      <label
                        className="flex items-center gap-2 bg-[var(--nb-surface-accent)] p-2 rounded cursor-pointer"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <input
                          type="checkbox"
                          checked={assocPowers.canManageAnnouncements}
                          onChange={e => setAssocPowers({ ...assocPowers, canManageAnnouncements: e.target.checked })}
                          className="accent-[var(--nb-accent)]"
                        />
                        <span className="text-xs text-[var(--nb-content)]">Announcements</span>
                      </label>
                      <label
                        className="flex items-center gap-2 bg-[var(--nb-surface-accent)] p-2 rounded cursor-pointer"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <input
                          type="checkbox"
                          checked={assocPowers.canViewRegistrations}
                          onChange={e => setAssocPowers({ ...assocPowers, canViewRegistrations: e.target.checked })}
                          className="accent-[var(--nb-accent)]"
                        />
                        <span className="text-xs text-[var(--nb-content)]">View Applicants</span>
                      </label>
                      <label
                        className="flex items-center gap-2 bg-[var(--nb-surface-accent)] p-2 rounded cursor-pointer"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <input
                          type="checkbox"
                          checked={assocPowers.canManageGallery}
                          onChange={e => setAssocPowers({ ...assocPowers, canManageGallery: e.target.checked })}
                          className="accent-[var(--nb-accent)]"
                        />
                        <span className="text-xs text-[var(--nb-content)]">Manage Gallery</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full nb-btn py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Grant Associate Privileges
                  </button>
                </form>
              )}

              {/* ASSOCIATES LIST WITH REALTIME POWER TOGGLES */}
              <div className="space-y-3">
                {associates.map((assoc) => (
                  <div
                    key={assoc.uid}
                    className="bg-[var(--nb-surface)] rounded-lg p-4 space-y-3.5"
                    style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex gap-3 min-w-0 flex-1">
                        <img
                          src={assoc.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${assoc.rollNumber || assoc.uid}`}
                          alt={assoc.name}
                          className="w-11 h-11 rounded object-cover bg-[var(--nb-surface-accent)] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="nb-headline text-sm text-[var(--nb-content)] truncate">{assoc.name}</h4>
                          <span className="nb-tag-accent text-[9px] font-mono uppercase mt-1 inline-block">
                            {assoc.position}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--nb-secondary)] mt-1 font-mono">
                            <span className="flex items-center gap-1 truncate max-w-full"><Mail className="w-3 h-3 text-[var(--nb-tertiary)] shrink-0" /> <span className="truncate">{assoc.email}</span></span>
                            {assoc.googleEmail && <span className="flex items-center gap-1 text-[var(--nb-accent)] truncate max-w-full"><Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{assoc.googleEmail}</span></span>}
                            {assoc.phone && <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3 text-[var(--nb-tertiary)] shrink-0" /> {assoc.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* CRUD Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 flex-wrap">
                        {isTopAdmin && assoc.role === 'president' && (
                          <button
                            onClick={async () => {
                              try {
                                await updateUserProfile(assoc.uid, { role: 'associate', position: 'Associate', responsibilities: '' });
                                refreshData();
                              } catch (e) { console.error(e); }
                            }}
                            className="nb-btn-ghost text-[10px] font-bold uppercase px-2.5 py-1 cursor-pointer"
                          >
                            Revoke Pres
                          </button>
                        )}

                        {confirmDemoteId === assoc.uid ? (
                          <button
                            onClick={() => handleDemoteUser(assoc.uid)}
                            className="nb-btn nb-btn-danger text-[10px] px-2.5 py-1 font-bold uppercase cursor-pointer"
                            title="Confirm revoking leadership powers"
                          >
                            Confirm Revoke?
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDemoteId(assoc.uid)}
                            className="nb-btn-ghost text-[10px] px-2.5 py-1 font-bold uppercase cursor-pointer text-rose-600 hover:text-rose-700"
                            title="Revokes leadership privileges and restores profile as a standard student. To permanently delete the student account, manage them from the Student Database."
                          >
                            Revoke Role
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Real-time Permission Matrix */}
                    <div
                      className="bg-[var(--nb-surface-accent)] p-3 rounded"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      <div className="nb-label text-[9px] text-[var(--nb-secondary)] mb-2">LIVE PRIVILEGE MATRIX (CLICK TO TOGGLE)</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePower(assoc.uid, 'canManageEvents')}
                          className={`flex items-center justify-between p-2 rounded text-left transition-all cursor-pointer ${assoc.powers?.canManageEvents
                              ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)]'
                              : 'bg-[var(--nb-surface)] text-[var(--nb-content)]'
                            }`}
                          style={{ border: '1px solid var(--nb-ink)' }}
                        >
                          <span className="text-xs font-semibold">Events Manager</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center ${assoc.powers?.canManageEvents ? 'bg-[var(--nb-accent)] text-black' : 'bg-[var(--nb-surface-accent)] text-transparent'}`}>
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePower(assoc.uid, 'canManageAnnouncements')}
                          className={`flex items-center justify-between p-2 rounded text-left transition-all cursor-pointer ${assoc.powers?.canManageAnnouncements
                              ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)]'
                              : 'bg-[var(--nb-surface)] text-[var(--nb-content)]'
                            }`}
                          style={{ border: '1px solid var(--nb-ink)' }}
                        >
                          <span className="text-xs font-semibold">Announcements</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center ${assoc.powers?.canManageAnnouncements ? 'bg-[var(--nb-accent)] text-black' : 'bg-[var(--nb-surface-accent)] text-transparent'}`}>
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePower(assoc.uid, 'canViewRegistrations')}
                          className={`flex items-center justify-between p-2 rounded text-left transition-all cursor-pointer ${assoc.powers?.canViewRegistrations
                              ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)]'
                              : 'bg-[var(--nb-surface)] text-[var(--nb-content)]'
                            }`}
                          style={{ border: '1px solid var(--nb-ink)' }}
                        >
                          <span className="text-xs font-semibold">View Applicants</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center ${assoc.powers?.canViewRegistrations ? 'bg-[var(--nb-accent)] text-black' : 'bg-[var(--nb-surface-accent)] text-transparent'}`}>
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePower(assoc.uid, 'canManageGallery')}
                          className={`flex items-center justify-between p-2 rounded text-left transition-all cursor-pointer ${assoc.powers?.canManageGallery
                              ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)]'
                              : 'bg-[var(--nb-surface)] text-[var(--nb-content)]'
                            }`}
                          style={{ border: '1px solid var(--nb-ink)' }}
                        >
                          <span className="text-xs font-semibold">Manage Gallery</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center ${assoc.powers?.canManageGallery ? 'bg-[var(--nb-accent)] text-black' : 'bg-[var(--nb-surface-accent)] text-transparent'}`}>
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {associates.length === 0 && (
                  <div className="text-center py-6 text-xs text-tertiary">
                    No associates have been assigned yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 2. EVENT COORDINATORS TAB ==================== */}
          {activeTab === 'coordinators' && canManageRoles && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="nb-headline text-base text-[var(--nb-content)]">Student Coordinators</h3>
                  <p className="nb-label text-[10px] text-[var(--nb-secondary)]">Assigned specific technical and cultural events to manage.</p>
                </div>
                <button
                  onClick={() => setShowCreateCoordinator(!showCreateCoordinator)}
                  className="nb-btn text-xs font-bold uppercase py-2 px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  New Coordinator
                </button>
              </div>

              {/* CREATE COORDINATOR INLINE FORM */}
              {showCreateCoordinator && (
                <form
                  onSubmit={handleCreateCoordinator}
                  className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex justify-between items-center border-b border-[var(--nb-ink)]/20 pb-2 mb-1">
                    <span className="nb-label text-xs text-[var(--nb-accent)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> ASSIGN EVENT COORDINATOR
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreateCoordinator(false)}
                      className="nb-btn-ghost px-2 py-0.5 text-xs cursor-pointer"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="relative">
                    <label className="nb-label text-[9px] text-[var(--nb-secondary)] block mb-1">STUDENT ROLL NUMBER</label>
                    <input
                      type="text"
                      required
                      value={coordSearchRoll}
                      onChange={e => setCoordSearchRoll(e.target.value)}
                      onFocus={() => setCoordRollFocused(true)}
                      onBlur={() => setTimeout(() => setCoordRollFocused(false), 200)}
                      placeholder="e.g. 23HM1A3315"
                      className="nb-input py-1.5 text-xs w-full font-mono"
                    />
                    {coordRollFocused && coordSearchRoll.length > 0 && (
                      <div
                        className="absolute top-[100%] mt-1 left-0 right-0 bg-[var(--nb-surface)] rounded z-50 max-h-40 overflow-y-auto overflow-x-hidden"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        {allUsers
                          .filter(u => u.uid !== 'admin_master' && (u.rollNumber?.toLowerCase().includes(coordSearchRoll.toLowerCase()) || u.name.toLowerCase().includes(coordSearchRoll.toLowerCase())))
                          .map(u => (
                            <div
                              key={u.uid}
                              className="px-3 py-2 hover:bg-[var(--nb-surface-accent)] cursor-pointer border-b border-[var(--nb-ink)]/20 last:border-0"
                              onClick={() => {
                                setCoordSearchRoll(u.rollNumber || '');
                                setCoordRollFocused(false);
                              }}
                            >
                              <div className="text-xs font-bold text-[var(--nb-content)] truncate">{u.name}</div>
                              <div className="nb-label text-[10px] text-[var(--nb-secondary)] truncate">{u.rollNumber}</div>
                            </div>
                          ))}
                        {allUsers.filter(u => u.uid !== 'admin_master' && (u.rollNumber?.toLowerCase().includes(coordSearchRoll.toLowerCase()) || u.name.toLowerCase().includes(coordSearchRoll.toLowerCase()))).length === 0 && (
                          <div className="px-3 py-2 text-xs text-[var(--nb-secondary)] italic">No matching students found</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="nb-label text-[9px] text-[var(--nb-secondary)] block mb-2">ASSIGN EVENTS (OPTIONAL)</label>
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                      {events.length === 0 ? (
                        <p className="text-xs text-[var(--nb-secondary)] italic">No events exist. You can assign events later.</p>
                      ) : (
                        events.map(ev => (
                          <label
                            key={ev.eventId}
                            className="flex items-center gap-2 bg-[var(--nb-surface-accent)] p-2 rounded cursor-pointer"
                            style={{ border: '1px solid var(--nb-ink)' }}
                          >
                            <input
                              type="checkbox"
                              checked={coordAssignedEvents.includes(ev.eventId)}
                              onChange={(e) => {
                                if (e.target.checked) setCoordAssignedEvents([...coordAssignedEvents, ev.eventId]);
                                else setCoordAssignedEvents(coordAssignedEvents.filter(id => id !== ev.eventId));
                              }}
                              className="accent-[var(--nb-accent)]"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs text-[var(--nb-content)] font-bold block truncate">{ev.title}</span>
                              <span className="nb-label text-[9px] text-[var(--nb-secondary)] block truncate">{ev.category} • {ev.date}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full nb-btn py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Assign Coordinator Role
                  </button>
                </form>
              )}

              {/* COORDINATORS LIST */}
              <div className="space-y-3">
                {coordinators.map((coord) => (
                  <div
                    key={coord.uid}
                    className="bg-[var(--nb-surface)] rounded-lg p-4 space-y-3.5"
                    style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded bg-[var(--nb-surface-accent)] flex items-center justify-center text-[var(--nb-accent)] shrink-0"
                          style={{ border: '1.5px solid var(--nb-ink)' }}
                        >
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="nb-headline text-sm text-[var(--nb-content)] truncate">{coord.name}</h4>
                          <div className="flex flex-wrap gap-2 mt-0.5 items-center">
                            <span className="nb-tag text-[9px] font-mono font-bold">
                              Roll: {coord.rollNumber}
                            </span>
                            <span className="nb-label text-[10px] text-[var(--nb-secondary)]">{coord.year} • Sec {coord.section}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto shrink-0">
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                          <button
                            onClick={() => setActiveEditingCoordId(activeEditingCoordId === coord.uid ? null : coord.uid)}
                            className="nb-btn text-xs py-1.5 px-3 font-bold cursor-pointer flex-1 sm:flex-none text-center"
                          >
                            {activeEditingCoordId === coord.uid ? 'Close' : 'Manage Events'}
                          </button>
                          {confirmDemoteId === coord.uid ? (
                            <button
                              onClick={() => handleDemoteUser(coord.uid)}
                              className="nb-btn nb-btn-danger text-[9px] px-2.5 py-1.5 font-bold uppercase cursor-pointer"
                              title="Confirm revoking coordinator role"
                            >
                              Confirm Revoke?
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDemoteId(coord.uid)}
                              className="nb-btn-ghost text-[9px] px-2.5 py-1.5 font-bold uppercase cursor-pointer text-rose-600 hover:text-rose-700"
                              title="Revokes coordinator privileges and restores profile as a standard student. To permanently delete the student account, manage them from the Student Database."
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Event Assignment Editor */}
                    {activeEditingCoordId === coord.uid && (
                      <div
                        className="bg-[var(--nb-surface-accent)] p-3 rounded space-y-2"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <div className="nb-label text-[9px] text-[var(--nb-secondary)] mb-2">ASSIGNED EVENTS</div>
                        {events.length === 0 ? (
                          <p className="text-xs text-[var(--nb-secondary)] italic">No events exist in the database.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                            {events.map(ev => {
                              const isAssigned = coord.assignedEvents?.includes(ev.eventId);
                              return (
                                <label
                                  key={ev.eventId}
                                  className={`flex justify-between items-center p-2 rounded cursor-pointer transition-all ${isAssigned ? 'bg-[var(--nb-surface)] font-bold' : 'bg-[var(--nb-surface)]/60'
                                    }`}
                                  style={{ border: isAssigned ? '1.5px solid var(--nb-ink)' : '1px solid var(--nb-ink)/40' }}
                                >
                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isAssigned || false}
                                      onChange={() => handleToggleEventAssignment(coord.uid, ev.eventId)}
                                      className="accent-[var(--nb-accent)]"
                                    />
                                    <div className="truncate">
                                      <span className={`text-xs block truncate ${isAssigned ? 'text-[var(--nb-content)]' : 'text-[var(--nb-secondary)]'}`}>{ev.title}</span>
                                      <span className="nb-label text-[9px] text-[var(--nb-secondary)] block truncate">{ev.category} • {ev.date}</span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {coordinators.length === 0 && (
                  <div className="text-center py-6 text-xs text-[var(--nb-secondary)]">
                    No coordinators have been assigned yet.
                  </div>
                )}
              </div>
            </div>
          )}


          {activeTab === 'attendance' && canViewAttendanceTab && (() => {
            const activeEvent = events.find(e => e.eventId === selectedEventId);

            // Check if today is the event date (using local date comparison)
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let isEventToday = false;
            if (activeEvent && activeEvent.date) {
              try {
                const d = new Date(activeEvent.date);
                if (!isNaN(d.getTime())) {
                  const evStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  isEventToday = (evStr === todayStr);
                }
              } catch (e) {
                isEventToday = false;
              }
            }

            const isBeforeEvent = activeEvent ? isBeforeEventDate(activeEvent.date) : false;

            return (
              <div className="space-y-4">

                {/* Event Selector */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="nb-label text-[10px] text-[var(--nb-secondary)]">SELECT EVENT TO MANAGE</label>
                    {selectedEventId && activeEvent && (
                      <button
                        onClick={() => exportAttendanceCSV(activeEvent)}
                        className="nb-btn-ghost text-[10px] flex items-center gap-1.5 px-2.5 py-1 font-bold uppercase cursor-pointer"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <Download className="w-3 h-3" />
                        Export CSV
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedEventId}
                    onChange={(e) => {
                      setSelectedEventId(e.target.value);
                      setScanResultMsg('');
                    }}
                    className="bg-[var(--nb-surface)] text-xs text-[var(--nb-content)] rounded py-2 px-3 outline-none font-bold"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    {events.length === 0 && <option value="">No events available</option>}
                    {events.map(ev => (
                      <option key={ev.eventId} value={ev.eventId}>{ev.title} ({ev.date})</option>
                    ))}
                  </select>
                </div>

                {selectedEventId && activeEvent && (
                  <>
                    {/* Event Date Status Banner */}
                    {isBeforeEvent ? (
                      <div
                        className="bg-amber-500/10 text-xs p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-2 border-amber-500/40"
                        style={{ boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-amber-400 text-black flex items-center justify-center shrink-0 border border-[var(--nb-ink)] font-bold">
                            <Lock className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-xs text-[var(--nb-content)]">
                              ATTENDANCE CHECK-IN LOCKED
                            </div>
                            <div className="text-[11px] text-[var(--nb-secondary)] mt-0.5">
                              Event scheduled for <strong className="font-mono text-[var(--nb-content)]">{activeEvent.date}</strong>. Attendance opens on the event date.
                            </div>
                          </div>
                        </div>
                        <span
                          className="nb-tag text-[9px] font-mono font-bold self-start sm:self-auto bg-amber-400 text-black border border-[var(--nb-ink)] uppercase"
                        >
                          Opens on {activeEvent.date}
                        </span>
                      </div>
                    ) : isEventToday ? (
                      <div
                        className="bg-emerald-500/10 text-xs p-3.5 rounded-lg flex items-center justify-between gap-2 border-2 border-emerald-500/40"
                        style={{ boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-emerald-400 text-black flex items-center justify-center shrink-0 border border-[var(--nb-ink)] font-bold">
                            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-xs text-[var(--nb-content)]">
                              EVENT DAY ACTIVE ({activeEvent.date})
                            </div>
                            <div className="text-[11px] text-[var(--nb-secondary)] mt-0.5">
                              Live scanner and attendance verification are unlocked.
                            </div>
                          </div>
                        </div>
                        <span className="nb-tag-green text-[9px] font-mono font-bold uppercase">
                          Live Today
                        </span>
                      </div>
                    ) : (
                      <div
                        className="bg-[var(--nb-surface-accent)] text-xs p-3 rounded-lg flex items-center justify-between gap-2 border border-[var(--nb-ink)]/20"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--nb-secondary)] shrink-0" />
                          <span className="text-[var(--nb-secondary)]">Concluded Event ({activeEvent.date}) — Post-Event Record Updates Active</span>
                        </div>
                      </div>
                    )}

                    {/* QR SCANNER CARD */}
                    <div
                      className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3.5"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <div className="flex justify-between items-center border-b border-[var(--nb-ink)]/15 pb-2">
                        <span className="nb-label text-xs font-bold text-[var(--nb-content)] flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-[var(--nb-accent)]" />
                          Quick Check-in Scanner
                        </span>
                        {isBeforeEvent ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] border border-[var(--nb-ink)]/30 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-500" /> Locked until {activeEvent.date}
                          </span>
                        ) : (
                          <button
                            onClick={() => setShowQRScanner(!showQRScanner)}
                            className={`text-xs px-3 py-1.5 font-bold transition-all cursor-pointer flex items-center gap-1.5 uppercase ${showQRScanner
                                ? 'nb-btn-ghost'
                                : 'nb-btn'
                              }`}
                            style={{ border: '1.5px solid var(--nb-ink)' }}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {showQRScanner ? 'Close Scanner' : 'Open Camera'}
                          </button>
                        )}
                      </div>

                      {isBeforeEvent ? (
                        <div className="py-6 px-4 text-center rounded-lg bg-[var(--nb-surface-accent)] border border-dashed border-[var(--nb-ink)]/30 space-y-2">
                          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30">
                            <Lock className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <h5 className="nb-headline text-sm text-[var(--nb-content)]">Check-in Camera Inactive</h5>
                          <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto leading-relaxed">
                            Attendance check-in opens on the scheduled date (<strong className="font-mono text-[var(--nb-content)]">{activeEvent.date}</strong>). Neither QR scanning nor manual roll marking is permitted prior to event day.
                          </p>
                        </div>
                      ) : showQRScanner && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <p className="text-[10px] text-[var(--nb-secondary)]">
                            Point camera at student QR pass or upload a photo to verify attendance instantly.
                          </p>

                          <QRCameraScanner
                            onScan={(text) => {
                              handleQRCheckIn(text);
                            }}
                            onError={(err) => {
                              if (err && err.message) {
                                setScanResultMsg(err.message);
                                setScanResultType('error');
                              }
                            }}
                          />

                          <form onSubmit={(e) => { e.preventDefault(); handleQRCheckIn(scannedRollInput); }} className="flex gap-2 pt-1">
                            <input
                              type="text"
                              placeholder="Or type Roll Number manually..."
                              value={scannedRollInput}
                              onChange={(e) => setScannedRollInput(e.target.value)}
                              className="flex-1 bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded py-2 px-3 outline-none font-mono"
                              style={{ border: '1.5px solid var(--nb-ink)' }}
                            />
                            <button
                              type="submit"
                              className="nb-btn text-[10px] font-bold uppercase px-4 py-2 cursor-pointer"
                            >
                              Mark
                            </button>
                          </form>
                        </div>
                      )}

                      {/* Scan Result Feedback Banner */}
                      {scanResultMsg && (
                        <div
                          className={`p-3 rounded flex items-center justify-between gap-2.5 transition-all animate-in fade-in zoom-in-95 ${scanResultType === 'success'
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                              : scanResultType === 'info'
                                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                : 'bg-rose-500/15 text-rose-800 dark:text-rose-300'
                            }`}
                          style={{ border: '1.5px solid var(--nb-ink)' }}
                        >
                          <div className="flex items-center gap-2 text-xs font-bold">
                            {scanResultType === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                            {scanResultType === 'info' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                            {scanResultType === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                            <span>{scanResultMsg}</span>
                          </div>
                          <button
                            onClick={() => setScanResultMsg('')}
                            className="text-[var(--nb-secondary)] hover:text-[var(--nb-content)] p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* REGISTRATIONS LIST */}
                    <div
                      className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--nb-ink)]/15 pb-2.5 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="nb-label text-xs font-bold text-[var(--nb-content)]">
                            Registered Students ({activeRegistrations?.length || 0})
                          </span>
                          <span
                            className="nb-tag text-[10px] font-mono font-bold bg-emerald-400 text-black"
                            style={{ border: '1px solid var(--nb-ink)' }}
                          >
                            {activeRegistrations?.filter(r => r.status === 'Attended').length || 0} Present
                          </span>
                        </div>

                        {activeEvent && (
                          <button
                            type="button"
                            onClick={() => handleGenerateBatchForEvent(activeEvent.eventId)}
                            disabled={!activeRegistrations?.some(r => r.status === 'Attended')}
                            className="nb-btn text-[10px] py-1.5 px-3 font-bold uppercase cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            title="Generate batch certificates for all attended students of this event"
                          >
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Generate Batch Certificates</span>
                          </button>
                        )}
                      </div>

                      <div className="overflow-x-auto scrollbar-none touch-pan-x">
                        <table className="w-full min-w-[540px] text-left border-collapse">
                          <thead>
                            <tr className="bg-[var(--nb-surface-accent)] border-b-2 border-[var(--nb-ink)]">
                              <th className="py-2.5 px-2 nb-label text-[10px] text-[var(--nb-content)]">ROLL NO.</th>
                              <th className="py-2.5 px-2 nb-label text-[10px] text-[var(--nb-content)]">NAME</th>
                              <th className="py-2.5 px-2 nb-label text-[10px] text-[var(--nb-content)]">TYPE</th>
                              <th className="py-2.5 px-2 nb-label text-[10px] text-[var(--nb-content)] text-center">ATTENDANCE</th>
                              <th className="py-2.5 px-2 nb-label text-[10px] text-[var(--nb-content)] text-center">CERTIFICATE</th>
                              <th className="py-2.5 px-2 nb-label text-[10px] text-[var(--nb-content)] text-right">ACTION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--nb-ink)]/15">
                            {(() => {
                              const currentRegs = activeRegistrations;
                              if (currentRegs.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="py-6 text-center text-xs text-[var(--nb-secondary)] italic">
                                      No registrations yet.
                                    </td>
                                  </tr>
                                );
                              }

                              return currentRegs.map(reg => {
                                const profile = allUsers.find(u => u.uid === reg.studentId);
                                if (!profile) return null;
                                const existingCert = dbCertificates.find(c =>
                                  c.eventId === activeEvent?.eventId &&
                                  (c.studentId === reg.studentId || (profile.rollNumber && c.rollNumber.toUpperCase() === profile.rollNumber.toUpperCase()))
                                );
                                const isCertIssued = Boolean(existingCert && existingCert.status !== 'Revoked');

                                return (
                                  <tr key={reg.registrationId} className="hover:bg-[var(--nb-surface-accent)]/50 transition-colors">
                                    <td className="py-2.5 px-2 text-[11px] font-mono font-bold text-[var(--nb-content)]">
                                      {profile.rollNumber || 'N/A'}
                                    </td>
                                    <td className="py-2.5 px-2 text-xs font-bold text-[var(--nb-content)]">
                                      {profile.name || 'Unknown User'}
                                      {reg.teamName && (
                                        <span className="block text-[9px] text-[var(--nb-secondary)] mt-0.5">Team: {reg.teamName}</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      <span
                                        className="nb-tag text-[9px] font-bold uppercase"
                                        style={{ border: '1px solid var(--nb-ink)' }}
                                      >
                                        {(reg.isTeam ? 'Team' : 'Solo')}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      {reg.status === 'Attended' ? (
                                        <span
                                          className="inline-flex items-center gap-1 bg-emerald-400 text-black px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                                          style={{ border: '1px solid var(--nb-ink)' }}
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          Present
                                        </span>
                                      ) : (
                                        <span
                                          className="inline-flex items-center gap-1 bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                                          style={{ border: '1px solid var(--nb-ink)/30' }}
                                        >
                                          Absent
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      {isCertIssued && existingCert ? (
                                        <span
                                          className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[9px] font-mono font-bold"
                                          style={{ border: '1px solid var(--nb-ink)' }}
                                        >
                                          <ShieldCheck className="w-3 h-3" />
                                          <span>Issued</span>
                                        </span>
                                      ) : (
                                        <span
                                          className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded text-[9px] font-mono font-bold"
                                          style={{ border: '1px solid var(--nb-ink)' }}
                                        >
                                          <Lock className="w-3 h-3" />
                                          <span>Locked</span>
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2 text-right">
                                      {reg.status === 'Attended' ? (
                                        <button
                                          onClick={() => handleToggleAttendance(reg.registrationId, false)}
                                          className="nb-btn nb-btn-danger text-[9px] px-2.5 py-1 font-bold uppercase cursor-pointer"
                                        >
                                          Revoke
                                        </button>
                                      ) : isBeforeEvent ? (
                                        <button
                                          disabled
                                          title={`Attendance check-in opens on ${activeEvent.date}`}
                                          className="text-[9px] px-2 py-1 font-bold uppercase rounded opacity-40 bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] cursor-not-allowed border border-[var(--nb-ink)]/30"
                                        >
                                          Locked
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleToggleAttendance(reg.registrationId, true)}
                                          className="nb-btn nb-btn-success text-[9px] px-2.5 py-1 font-bold uppercase cursor-pointer"
                                        >
                                          Mark Present
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
          {/* ==================== 4. STUDENTS DB & BULK IMPORT ==================== */}
          {activeTab === 'students' && canManageRoles && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="nb-headline text-sm text-[var(--nb-content)]">Students Database</h3>
                  <p className="nb-label text-[10px] text-[var(--nb-secondary)]">BULK IMPORT ROLL NUMBERS, MANAGE STUDENT ACCOUNTS</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkAdd(!showBulkAdd)}
                  className="nb-btn flex items-center gap-1.5 text-xs font-bold uppercase py-1.5 px-3 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {showBulkAdd ? "Close Importer" : "Bulk Add"}
                </button>
              </div>

              {/* BULK CREATOR INTERFACE */}
              {showBulkAdd && (
                <div
                  className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3.5"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-center justify-between border-b border-[var(--nb-ink)]/15 pb-2">
                    <span className="nb-label text-xs font-bold text-[var(--nb-content)]">BULK IMPORTER TOOL</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkMode('series')}
                        className={`text-xs font-bold px-3 py-1 rounded cursor-pointer uppercase ${bulkMode === 'series' ? 'nb-btn' : 'nb-btn-ghost'
                          }`}
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        Roll Series
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkMode('column')}
                        className={`text-xs font-bold px-3 py-1 rounded cursor-pointer uppercase ${bulkMode === 'column' ? 'nb-btn' : 'nb-btn-ghost'
                          }`}
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        Paste Column
                      </button>
                    </div>
                  </div>

                  {bulkMode === 'series' ? (
                    <div className="space-y-3">
                      <p className="text-[10px] text-[var(--nb-secondary)] leading-relaxed">
                        Generate roll numbers in a continuous series (e.g. 23HM1A3301 to 23HM1A3361).
                      </p>
                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">PREFIX</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 23HM1A33"
                            value={seriesPrefix}
                            onChange={(e) => setSeriesPrefix(e.target.value)}
                            className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded py-2 px-2.5 outline-none font-bold"
                            style={{ border: '1.5px solid var(--nb-ink)' }}
                          />
                        </div>
                        <div>
                          <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">START INDEX</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 01"
                            value={seriesStart}
                            onChange={(e) => setSeriesStart(e.target.value)}
                            className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded py-2 px-2.5 outline-none font-mono font-bold"
                            style={{ border: '1.5px solid var(--nb-ink)' }}
                          />
                        </div>
                        <div>
                          <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">END INDEX</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 61"
                            value={seriesEnd}
                            onChange={(e) => setSeriesEnd(e.target.value)}
                            className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded py-2 px-2.5 outline-none font-mono font-bold"
                            style={{ border: '1.5px solid var(--nb-ink)' }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block nb-label text-[10px] text-[var(--nb-secondary)]">PASTED ROLL NUMBERS</label>
                      <textarea
                        placeholder="Paste roll numbers from Excel/Sheet here (separated by newlines or commas)&#10;e.g.&#10;23HM1A3301&#10;23HM1A3305&#10;23HM1A3312"
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded p-3 h-28 outline-none resize-none font-mono leading-relaxed"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      />
                    </div>
                  )}

                  <div className="border-t border-[var(--nb-ink)]/15 pt-3 space-y-2.5">
                    <span className="block nb-label text-[10px] text-[var(--nb-secondary)]">TEMPORARY PASSWORD STRATEGY</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPasswordOption('roll')}
                        className={`text-xs font-bold p-2 rounded-md transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${passwordOption === 'roll'
                            ? 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:shadow-none'
                            : 'bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] border-2 border-[var(--nb-ink)]/30 hover:border-[var(--nb-ink)]'
                          }`}
                      >
                        <span className="font-bold">Same as Roll</span>
                        <span className="text-[9px] font-mono text-[var(--nb-secondary)]">Pass = Roll</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPasswordOption('preset')}
                        className={`text-xs font-bold p-2 rounded-md transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${passwordOption === 'preset'
                            ? 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:shadow-none'
                            : 'bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] border-2 border-[var(--nb-ink)]/30 hover:border-[var(--nb-ink)]'
                          }`}
                      >
                        <span className="font-bold">Preset Code</span>
                        <span className="text-[9px] font-mono text-[var(--nb-secondary)]">Welcome@123</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPasswordOption('random')}
                        className={`text-xs font-bold p-2 rounded-md transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${passwordOption === 'random'
                            ? 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:shadow-none'
                            : 'bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] border-2 border-[var(--nb-ink)]/30 hover:border-[var(--nb-ink)]'
                          }`}
                      >
                        <span className="font-bold">Random Alpha</span>
                        <span className="text-[9px] font-mono text-[var(--nb-secondary)]">e.g. K7L9Z4</span>
                      </button>
                    </div>

                    {passwordOption === 'preset' && (
                      <div className="mt-2 text-xs">
                        <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">CUSTOM PRESET CODE</label>
                        <input
                          type="text"
                          value={presetPassword}
                          onChange={(e) => setPresetPassword(e.target.value)}
                          className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] rounded py-2 px-2.5 outline-none font-mono"
                          style={{ border: '1.5px solid var(--nb-ink)' }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleBulkAddStudents}
                    disabled={isGeneratingStudents}
                    className="w-full nb-btn py-2.5 text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingStudents ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Profiles... Please wait
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate &amp; Save Student Profiles
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STUDENT LIST WITH GROUPING AND SEARCH */}
              <div className="flex flex-col gap-2">
                {/* Search and Filters Bar with Neo-Brutalism */}
                <div 
                  className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 p-2.5 bg-white"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: '3px 3px 0px 0px var(--nb-ink)' }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] border-2 border-[var(--nb-ink)] px-2.5 py-1.5 bg-[var(--nb-surface)] shadow-[2px_2px_0px_0px_var(--nb-ink)]">
                    <Search className="w-3.5 h-3.5 text-[var(--nb-secondary)] flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search roll number or name..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="bg-transparent border-none text-xs text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none w-full font-bold"
                    />
                    {studentSearch && (
                      <button 
                        type="button" 
                        onClick={() => setStudentSearch('')}
                        className="text-xs font-black text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Filter Selects */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-black uppercase text-[var(--nb-secondary)]">Year:</label>
                      <select
                        value={studentYearFilter}
                        onChange={(e) => setStudentYearFilter(e.target.value)}
                        className="text-xs font-black bg-white border-2 border-[var(--nb-ink)] px-2 py-1 shadow-[2px_2px_0px_0px_var(--nb-ink)] outline-none cursor-pointer"
                      >
                        <option value="All">All Years</option>
                        <option value="I Year">I Year</option>
                        <option value="II Year">II Year</option>
                        <option value="III Year">III Year</option>
                        <option value="IV Year">IV Year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-black uppercase text-[var(--nb-secondary)]">Sec:</label>
                      <select
                        value={studentSectionFilter}
                        onChange={(e) => setStudentSectionFilter(e.target.value)}
                        className="text-xs font-black bg-white border-2 border-[var(--nb-ink)] px-2 py-1 shadow-[2px_2px_0px_0px_var(--nb-ink)] outline-none cursor-pointer"
                      >
                        <option value="All">All Sec</option>
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
                    </div>

                    {(studentYearFilter !== 'All' || studentSectionFilter !== 'All' || studentSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentYearFilter('All');
                          setStudentSectionFilter('All');
                          setStudentSearch('');
                        }}
                        className="px-2 py-1 text-[10px] font-black uppercase bg-rose-100 text-rose-700 border-2 border-[var(--nb-ink)] hover:bg-rose-200 transition-colors cursor-pointer"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: '3px 3px 0px 0px var(--nb-ink)' }}
                        title="Reset all filters"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Selection & Bulk Actions Row with Neo-Brutalism */}
                <div 
                  className="flex flex-wrap justify-between items-center gap-2 p-2.5 bg-white"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: '2px 2px 0px 0px var(--nb-ink)' }}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <input 
                      type="checkbox" 
                      id="selectAll"
                      ref={masterCheckboxRef}
                      className="w-4 h-4 cursor-pointer accent-amber-400 rounded-none border-2 border-[var(--nb-ink)]"
                      checked={
                        filteredStudents.length > 0 && 
                        filteredStudents.every(s => selectedStudentIds.includes(s.uid))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const visibleIds = filteredStudents.map(s => s.uid);
                          setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                        } else {
                          const visibleIds = new Set(filteredStudents.map(s => s.uid));
                          setSelectedStudentIds(prev => prev.filter(id => !visibleIds.has(id)));
                        }
                      }}
                    />
                    <label htmlFor="selectAll" className="text-xs font-black uppercase tracking-wider text-[var(--nb-ink)] cursor-pointer select-none">
                      SELECT ALL VISIBLE ({filteredStudents.length})
                    </label>

                    {selectedStudentIds.length > 0 && (
                      <div className="flex items-center gap-2 ml-1">
                        <span className="px-2 py-0.5 text-[10px] font-black font-mono uppercase bg-amber-300 text-black border-2 border-[var(--nb-ink)] shadow-[2px_2px_0px_0px_var(--nb-ink)]">
                          {selectedStudentIds.length} SELECTED
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="px-2 py-0.5 rounded bg-[var(--nb-surface)] text-[var(--nb-content)] text-[10px] font-mono font-bold uppercase border-2 border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)] cursor-pointer transition-all"
                        >
                          Deselect All
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {allGroupKeys.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isAllGroupsExpanded) {
                            setExpandedGroupKeys([]);
                          } else {
                            setExpandedGroupKeys(allGroupKeys);
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-black uppercase bg-white text-black border-2 border-[var(--nb-ink)] shadow-[2px_2px_0px_0px_var(--nb-ink)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                        title={isAllGroupsExpanded ? "Collapse all sections" : "Expand all sections"}
                      >
                        {isAllGroupsExpanded ? "Collapse All" : "Expand All"}
                      </button>
                    )}

                    {selectedStudentIds.length > 0 && (
                      <HoldButton 
                        size="sm"
                        holdTime={2000}
                        radius={0}
                        backgroundColor="#ffe4e6"
                        fillColor="#e11d48"
                        textColor="#9f1239"
                        fillTextColor="#ffffff"
                        doneLabel="Deleted Selected"
                        onHold={handleBulkDeleteStudents}
                        icon={<Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                        className="!h-8 !px-3 font-black uppercase text-xs cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: '3px 3px 0px 0px var(--nb-ink)' }}
                      >
                        Hold to Delete ({selectedStudentIds.length})
                      </HoldButton>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {(() => {
                  if (filteredStudents.length === 0) {
                    return (
                      <div className="text-center py-8 text-xs text-[var(--nb-secondary)] space-y-2">
                        <p className="font-bold">No students found matching your criteria.</p>
                        {(studentSearch || studentYearFilter !== 'All' || studentSectionFilter !== 'All') ? (
                          <p className="text-[11px]">
                            Try adjusting or{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setStudentSearch('');
                                setStudentYearFilter('All');
                                setStudentSectionFilter('All');
                                setSelectedStudentIds([]);
                              }}
                              className="underline font-bold text-[var(--nb-accent)] cursor-pointer"
                            >
                              clearing your filters
                            </button>
                            .
                          </p>
                        ) : (
                          <p className="text-[11px]">Use the bulk importer above to populate the database!</p>
                        )}
                      </div>
                    );
                  }

                  return Object.entries(groupedStudents).map(([groupKey, studentsInGroup]) => {
                    const groupUids = studentsInGroup.map(s => s.uid);
                    const isAllGroupSelected = groupUids.length > 0 && groupUids.every(id => selectedStudentIds.includes(id));
                    const isSomeGroupSelected = groupUids.some(id => selectedStudentIds.includes(id));
                    const isGroupExpanded = expandedGroupKeys.includes(groupKey);

                    return (
                      <div 
                        key={groupKey} 
                        className="bg-[var(--nb-surface)] p-3.5 space-y-3 transition-all"
                        style={{ border: '2.5px solid var(--nb-ink)', boxShadow: '4px 4px 0px 0px var(--nb-ink)' }}
                      >
                        {/* Section Header: Click to Expand / Collapse */}
                        <div 
                          onClick={() => toggleGroupExpansion(groupKey)}
                          className={`flex justify-between items-center cursor-pointer select-none flex-wrap gap-2 ${
                            isGroupExpanded ? 'border-b-2 border-[var(--nb-ink)] pb-3' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={isAllGroupSelected}
                                ref={el => { if (el) el.indeterminate = isSomeGroupSelected && !isAllGroupSelected; }}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...groupUids])));
                                  } else {
                                    const groupSet = new Set(groupUids);
                                    setSelectedStudentIds(prev => prev.filter(id => !groupSet.has(id)));
                                  }
                                }}
                                className="w-4 h-4 cursor-pointer accent-amber-400 rounded-none border-2 border-[var(--nb-ink)]"
                                title={`Select all in ${groupKey}`}
                              />
                            </div>
                            <span className="font-black text-xs sm:text-sm uppercase tracking-tight text-[var(--nb-content)]">
                              {groupKey}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="nb-tag text-[11px] font-mono font-black border-2 border-[var(--nb-ink)] bg-white shadow-[2px_2px_0px_0px_var(--nb-ink)]">
                              {studentsInGroup.length} Students
                            </span>
                            <span 
                              className="px-2 py-0.5 text-xs font-mono font-black border-2 border-[var(--nb-ink)] bg-[var(--nb-yellow)] text-black shadow-[1.5px_1.5px_0px_0px_var(--nb-ink)]"
                            >
                              {isGroupExpanded ? '▲ HIDE' : '▼ SHOW'}
                            </span>
                          </div>
                        </div>

                        {/* Collapsible Student Content Body */}
                        {isGroupExpanded && (
                      <div className="space-y-2">
                        {studentsInGroup.map((student) => {
                          const isExpanded = expandedStudentId === student.uid;
                          return (
                            <div
                              key={student.uid}
                              onClick={() => setExpandedStudentId(isExpanded ? null : student.uid)}
                              className="bg-[var(--nb-surface-accent)] rounded p-3 flex flex-col gap-2.5 cursor-pointer transition-all"
                              style={{ border: '1.5px solid var(--nb-ink)' }}
                            >
                              <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <div className="flex items-center justify-center mr-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      className="accent-[var(--nb-accent)] w-3.5 h-3.5 cursor-pointer"
                                      checked={selectedStudentIds.includes(student.uid)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedStudentIds(prev => [...prev, student.uid]);
                                        } else {
                                          setSelectedStudentIds(prev => prev.filter(id => id !== student.uid));
                                        }
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="nb-tag font-mono text-[10px] font-bold"
                                    style={{ border: '1px solid var(--nb-ink)' }}
                                  >
                                    {student.rollNumber || 'NO ROLL'}
                                  </span>
                                  <h5 className="nb-headline text-xs text-[var(--nb-content)] truncate">{student.name}</h5>
                                  {student.role === 'associate' && (
                                    <span className="nb-pill-purple text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shadow-[1px_1px_0_var(--nb-ink)]">
                                      {student.position || 'Associate'}
                                    </span>
                                  )}
                                  {student.role === 'coordinator' && (
                                    <span className="nb-pill-cyan text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shadow-[1px_1px_0_var(--nb-ink)]">
                                      Coordinator
                                    </span>
                                  )}
                                  {student.role === 'president' && (
                                    <span className="nb-pill-yellow text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded text-neutral-900 shadow-[1px_1px_0_var(--nb-ink)]">
                                      President
                                    </span>
                                  )}
                                </div>
                                <span className="nb-tag text-[10px] font-mono font-bold shrink-0">{isExpanded ? '[-]' : '[+]'}</span>
                              </div>

                              {isExpanded && (
                                <div className="pt-2 border-t border-[var(--nb-ink)]/15 flex flex-col sm:flex-row justify-between gap-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 mt-1 text-[10px] text-[var(--nb-secondary)] flex-1 min-w-0">
                                    <span className="truncate">Email: <strong className="text-[var(--nb-content)] font-mono">{student.email}</strong></span>
                                    {student.googleEmail && (<span className="truncate">Google: <strong className="text-[var(--nb-content)] font-mono">{student.googleEmail}</strong></span>)}
                                    <span>Phone: <strong className="text-[var(--nb-content)]">{student.phone || 'N/A'}</strong></span>
                                    <span>Password: <strong className="font-mono bg-[var(--nb-surface)] px-1 py-0.5 rounded border border-[var(--nb-ink)]/20">••••••••</strong></span>
                                    <span>Role: <strong className="uppercase text-[var(--nb-content)]">{student.role}</strong></span>
                                  </div>

                                  <div className="flex sm:flex-col gap-1.5 shrink-0 w-full sm:w-28 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--nb-ink)]/10">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); student.rollNumber && handleResetPassword(student.uid, student.rollNumber); }}
                                      className="nb-btn-ghost text-[9px] font-bold uppercase py-1.5 px-2 rounded cursor-pointer flex-1 sm:flex-none text-center"
                                      style={{ border: '1px solid var(--nb-ink)' }}
                                    >
                                      Reset Pass
                                    </button>
                                    <div className="flex-1 sm:flex-none" onClick={(e) => e.stopPropagation()}>
                                      <HoldButton
                                        size="sm"
                                        holdTime={1600}
                                        radius={4}
                                        backgroundColor="rgba(244, 63, 94, 0.1)"
                                        fillColor="#e11d48"
                                        textColor="#fda4af"
                                        fillTextColor="#ffffff"
                                        doneLabel="Deleted"
                                        onHold={() => handleDeleteUser(student.uid)}
                                        className="border border-rose-500/20 text-[10px] font-bold uppercase !h-8 w-full !px-1"
                                        style={{ border: '1px solid var(--nb-ink)', fontSize: '10px' }}
                                      >
                                        Hold to Delete
                                      </HoldButton>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
                  });
                })()}
              </div>
            </div>
          )}

          {activeTab === 'certificates' && canManageRoles && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header with Sub-tabs and actions */}
              <div
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-[var(--nb-surface)]"
                style={{ borderBottom: '2px solid var(--nb-ink)' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="nb-headline text-sm text-[var(--nb-content)] flex items-center gap-2">
                      <Award className="w-4 h-4 text-[var(--nb-accent)]" />
                      <span>E-Certificate Management & Database</span>
                    </h3>
                    <span
                      className={`nb-tag text-[9px] font-mono font-bold ${isCertificatesEnabled
                          ? 'bg-emerald-400 text-black'
                          : 'bg-amber-400 text-black'
                        }`}
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      {isCertificatesEnabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <p className="nb-label text-[10px] text-[var(--nb-secondary)] mt-0.5">
                    SEARCH INSTITUTIONAL CERTIFICATES, VERIFY CREDENTIALS, AND CUSTOMIZE DIGITAL TEMPLATES
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setVerifyInitialId('');
                      setIsVerifyModalOpen(true);
                    }}
                    className="nb-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase cursor-pointer"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                    title="Quickly verify any Certificate ID"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verify ID</span>
                  </button>

                  <button
                    onClick={() => setShowManualIssueModal(true)}
                    className="nb-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase cursor-pointer"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                    title="Issue certificate directly to a student"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                    <span>Issue Custom</span>
                  </button>

                  <button
                    onClick={handleSyncCertificates}
                    disabled={isSyncingCerts}
                    className="nb-btn flex items-center gap-1.5 px-3.5 py-1.5 font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                    title="Generate and sync unique Certificate IDs for all attended students"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCerts ? 'animate-spin' : ''}`} />
                    <span>{isSyncingCerts ? 'Syncing...' : 'Sync All Attended'}</span>
                  </button>
                </div>
              </div>

              {/* Sub-Navigation Switcher */}
              <div
                className="px-5 py-2.5 bg-[var(--nb-surface-accent)] flex items-center justify-between shrink-0"
                style={{ borderBottom: '2px solid var(--nb-ink)' }}
              >
                <div className="flex gap-2">
                  <button
                    onClick={() => setCertSubTab('batch')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 rounded ${certSubTab === 'batch'
                        ? 'nb-btn'
                        : 'nb-btn-ghost'
                      }`}
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Batch Generator & Rosters</span>
                    <span className="nb-tag text-[9px] font-mono font-bold bg-white text-black ml-1">
                      {events.length} Events
                    </span>
                  </button>

                  <button
                    onClick={() => setCertSubTab('db')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 rounded ${certSubTab === 'db'
                        ? 'nb-btn'
                        : 'nb-btn-ghost'
                      }`}
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Certificates Database</span>
                    <span className="nb-tag text-[9px] font-mono font-bold bg-white text-black ml-1">
                      {dbCertificates.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setCertSubTab('template')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 rounded ${certSubTab === 'template'
                        ? 'nb-btn'
                        : 'nb-btn-ghost'
                      }`}
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Template & Styling</span>
                  </button>
                </div>

                {/* Quick toggle feature on/off */}
                <div className="flex items-center gap-2">
                  <span className="nb-label text-[10px] text-[var(--nb-secondary)] hidden sm:inline">FEATURE:</span>
                  <button
                    onClick={() => handleToggleCertificates()}
                    className={`px-2.5 py-1 text-[10px] font-bold tracking-tight cursor-pointer uppercase rounded flex items-center gap-1.5 ${isCertificatesEnabled
                        ? 'bg-emerald-400 text-black'
                        : 'nb-btn-ghost'
                      }`}
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isCertificatesEnabled ? 'bg-black' : 'bg-[var(--nb-secondary)]'}`} />
                    <span>{isCertificatesEnabled ? 'Feature On' : 'Feature Off'}</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tab 0: BATCH CERTIFICATE GENERATOR & PARTICIPANT ROSTERS */}
              {certSubTab === 'batch' && (
                <div className="p-5 overflow-y-auto space-y-5 flex-grow">
                  {/* Summary Metric Cards */}
                  {(() => {
                    const allAttendedRegs = registrations.filter(r => r.status === 'Attended');
                    const pendingTotal = allAttendedRegs.filter(r => {
                      return !dbCertificates.some(c =>
                        c.eventId === r.eventId &&
                        (c.studentId === r.studentId || (r.rollNumber && c.rollNumber.toUpperCase() === r.rollNumber.toUpperCase()))
                      );
                    }).length;
                    const releasedTotal = allAttendedRegs.length - pendingTotal;

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div
                          className="bg-[var(--nb-surface)] rounded-lg p-3.5 space-y-1"
                          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                        >
                          <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">TOTAL EVENTS</span>
                          <div className="text-2xl font-black text-[var(--nb-content)] nb-headline">
                            {events.length}
                          </div>
                          <span className="text-[10px] text-[var(--nb-secondary)]">Department event catalogue</span>
                        </div>

                        <div
                          className="bg-[var(--nb-surface)] rounded-lg p-3.5 space-y-1"
                          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                        >
                          <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">ATTENDED STUDENTS</span>
                          <div className="text-2xl font-black text-[var(--nb-accent)] nb-headline">
                            {allAttendedRegs.length}
                          </div>
                          <span className="text-[10px] text-[var(--nb-secondary)]">Eligible for certificates</span>
                        </div>

                        <div
                          className="bg-[var(--nb-surface)] rounded-lg p-3.5 space-y-1"
                          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                        >
                          <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">GENERATED & RELEASED</span>
                          <div className="text-2xl font-black text-emerald-600 nb-headline">
                            {releasedTotal}
                          </div>
                          <span className="text-[10px] text-[var(--nb-secondary)]">Unlocked in student profiles</span>
                        </div>

                        <div
                          className="bg-[var(--nb-surface)] rounded-lg p-3.5 space-y-1"
                          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                        >
                          <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">LOCKED / PENDING</span>
                          <div className="text-2xl font-black text-amber-500 nb-headline">
                            {pendingTotal}
                          </div>
                          <span className="text-[10px] text-[var(--nb-secondary)]">Awaiting batch generation</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Batch Authority Banner */}
                  <div
                    className="bg-[var(--nb-surface-accent)] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    style={{ border: '2px solid var(--nb-ink)' }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[var(--nb-accent)]" />
                        <h4 className="nb-headline text-xs text-[var(--nb-content)] uppercase">
                          Administrative Batch Authority
                        </h4>
                      </div>
                      <p className="text-[11px] text-[var(--nb-secondary)] max-w-xl leading-relaxed">
                        Student certificates stay strictly <strong>locked</strong> until you verify attendance and click Generate Batch. You can generate batch certificates for all events at once or inspect individual event participant rosters below.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleSyncCertificates}
                        disabled={isSyncingCerts}
                        className="nb-btn flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        <Zap className={`w-3.5 h-3.5 ${isSyncingCerts ? 'animate-spin' : ''}`} />
                        <span>{isSyncingCerts ? 'Generating All...' : 'Generate Batch for All Events'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search Bar for Events */}
                  <div
                    className="bg-[var(--nb-surface)] rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
                      <button
                        onClick={() => setBatchEventStatusFilter('all')}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer shrink-0 whitespace-nowrap ${batchEventStatusFilter === 'all'
                            ? 'nb-btn'
                            : 'nb-btn-ghost'
                          }`}
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        All Events ({events.length})
                      </button>

                      <button
                        onClick={() => setBatchEventStatusFilter('pending')}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${batchEventStatusFilter === 'pending'
                            ? 'bg-amber-400 text-black border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                            : 'nb-btn-ghost'
                          }`}
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <Lock className="w-3 h-3" />
                        <span>Has Pending / Locked</span>
                      </button>

                      <button
                        onClick={() => setBatchEventStatusFilter('completed')}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${batchEventStatusFilter === 'completed'
                            ? 'bg-emerald-400 text-black border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                            : 'nb-btn-ghost'
                          }`}
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Completed Batch</span>
                      </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search event title or venue..."
                        value={batchEventSearch}
                        onChange={(e) => setBatchEventSearch(e.target.value)}
                        className="w-full bg-[var(--nb-surface-accent)] rounded pl-9 pr-3 py-1.5 text-xs text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none font-bold"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      />
                    </div>
                  </div>

                  {/* Event List with Batch Controls and Expandable Participant Rosters */}
                  <div className="space-y-3.5">
                    {(() => {
                      const filteredEvents = events.filter(ev => {
                        const eventRegs = registrations.filter(r => r.eventId === ev.eventId);
                        const eventAttended = eventRegs.filter(r => r.status === 'Attended');
                        const eventCerts = dbCertificates.filter(c => c.eventId === ev.eventId);
                        const pendingCount = eventAttended.filter(r => {
                          return !eventCerts.some(c =>
                            c.studentId === r.studentId ||
                            (r.rollNumber && c.rollNumber.toUpperCase() === r.rollNumber.toUpperCase())
                          );
                        }).length;

                        if (batchEventStatusFilter === 'pending' && pendingCount === 0) return false;
                        if (batchEventStatusFilter === 'completed' && (eventAttended.length === 0 || pendingCount > 0)) return false;

                        if (batchEventSearch) {
                          const q = batchEventSearch.toLowerCase();
                          return ev.title.toLowerCase().includes(q) || (ev.venue || '').toLowerCase().includes(q) || (ev.category || '').toLowerCase().includes(q);
                        }
                        return true;
                      });

                      if (filteredEvents.length === 0) {
                        return (
                          <div
                            className="bg-[var(--nb-surface)] rounded-lg p-8 text-center text-[var(--nb-secondary)] text-xs"
                            style={{ border: '2px solid var(--nb-ink)' }}
                          >
                            No events matched your filter criteria.
                          </div>
                        );
                      }

                      return filteredEvents.map(ev => {
                        const eventRegs = registrations.filter(r => r.eventId === ev.eventId);
                        const eventAttended = eventRegs.filter(r => r.status === 'Attended');
                        const eventCerts = dbCertificates.filter(c => c.eventId === ev.eventId);
                        const pendingCount = eventAttended.filter(r => {
                          return !eventCerts.some(c =>
                            c.studentId === r.studentId ||
                            (r.rollNumber && c.rollNumber.toUpperCase() === r.rollNumber.toUpperCase())
                          );
                        }).length;
                        const generatedCount = eventAttended.length - pendingCount;
                        const isExpanded = expandedEventId === ev.eventId;
                        const isGeneratingThis = isGeneratingBatchEventId === ev.eventId;

                        const selectedInThis = selectedParticipantsMap[ev.eventId] || [];
                        const participantQuery = (participantSearchMap[ev.eventId] || '').toLowerCase();

                        const displayedRegs = eventRegs.filter(r => {
                          if (!participantQuery) return true;
                          const student = allUsers.find(u => u.uid === r.studentId);
                          return (r.studentName || student?.name || '').toLowerCase().includes(participantQuery) ||
                            (r.rollNumber || student?.rollNumber || '').toLowerCase().includes(participantQuery);
                        });

                        return (
                          <div
                            key={ev.eventId}
                            className="bg-[var(--nb-surface)] rounded-lg overflow-hidden transition-all"
                            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                          >
                            {/* Event Header Card */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--nb-surface)]">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="nb-headline text-sm text-[var(--nb-content)] truncate">
                                    {ev.title}
                                  </h4>
                                  <span
                                    className="nb-tag text-[9px] font-mono"
                                    style={{ border: '1px solid var(--nb-ink)' }}
                                  >
                                    {ev.category || 'Event'}
                                  </span>

                                  {/* Status Badge */}
                                  {eventAttended.length === 0 ? (
                                    <span
                                      className="nb-tag text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)]"
                                      style={{ border: '1px solid var(--nb-ink)/30' }}
                                    >
                                      ⚪ 0 Attendees Marked
                                    </span>
                                  ) : pendingCount === 0 ? (
                                    <span
                                      className="nb-tag text-[9px] font-mono font-bold bg-emerald-400 text-black flex items-center gap-1"
                                      style={{ border: '1px solid var(--nb-ink)' }}
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      <span>All Batch Generated ({generatedCount}/{eventAttended.length})</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="nb-tag text-[9px] font-mono font-bold bg-amber-400 text-black flex items-center gap-1"
                                      style={{ border: '1px solid var(--nb-ink)' }}
                                    >
                                      <Lock className="w-3 h-3" />
                                      <span>🔒 {pendingCount} Locked (Pending Generation)</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--nb-secondary)]">
                                  <span>Date: <strong className="text-[var(--nb-content)] font-mono">{ev.date}</strong></span>
                                  <span>Venue: {ev.venue || 'Campus Auditorium'}</span>
                                  <span>Registered: <strong className="text-[var(--nb-content)]">{eventRegs.length}</strong></span>
                                  <span>Attended: <strong className="text-emerald-600">{eventAttended.length}</strong></span>
                                  <span>Certificates: <strong className="text-[var(--nb-accent)]">{eventCerts.length}</strong></span>
                                </div>
                              </div>

                              {/* Action Buttons for this Event */}
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleGenerateBatchForEvent(ev.eventId)}
                                  disabled={isGeneratingThis || eventAttended.length === 0 || pendingCount === 0}
                                  className="nb-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={pendingCount === 0 ? "All attended students already have certificates generated" : `Generate certificates for all ${pendingCount} attended students`}
                                >
                                  <Zap className={`w-3.5 h-3.5 ${isGeneratingThis ? 'animate-spin' : ''}`} />
                                  <span>{isGeneratingThis ? 'Generating...' : `Generate Batch (${pendingCount})`}</span>
                                </button>

                                {eventCerts.length > 0 && (
                                  <button
                                    onClick={() => handleRevokeBatchForEvent(ev.eventId)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-rose-500 text-white text-xs font-bold uppercase transition-all cursor-pointer"
                                    style={{ border: '1.5px solid var(--nb-ink)' }}
                                    title="Lock and revoke all certificates for this event"
                                  >
                                    <Lock className="w-3 h-3" />
                                    <span>Lock / Revoke Batch</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setExpandedEventId(isExpanded ? null : ev.eventId)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer ${isExpanded
                                      ? 'nb-btn'
                                      : 'nb-btn-ghost'
                                    }`}
                                  style={{ border: '1.5px solid var(--nb-ink)' }}
                                >
                                  <Users className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                                  <span>{isExpanded ? 'Hide Roster' : 'View Participants Roster'}</span>
                                  <span className="font-mono text-[10px]">({eventRegs.length})</span>
                                </button>
                              </div>
                            </div>

                            {/* Expandable Participant Roster Drawer */}
                            {isExpanded && (
                              <div
                                className="bg-[var(--nb-surface-accent)] p-4 space-y-3"
                                style={{ borderTop: '2px solid var(--nb-ink)' }}
                              >
                                {/* Participant Controls Bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => {
                                        const allStudentIds = displayedRegs.map(r => r.studentId);
                                        handleSelectAllParticipants(ev.eventId, allStudentIds);
                                      }}
                                      className="nb-btn-ghost flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer"
                                      style={{ border: '1px solid var(--nb-ink)' }}
                                    >
                                      {selectedInThis.length === displayedRegs.length && displayedRegs.length > 0 ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-[var(--nb-secondary)]" />
                                      )}
                                      <span>Select All ({displayedRegs.length})</span>
                                    </button>

                                    {selectedInThis.length > 0 && (
                                      <>
                                        <button
                                          onClick={() => handleGenerateBatchForEvent(ev.eventId, selectedInThis)}
                                          disabled={isGeneratingThis}
                                          className="nb-btn flex items-center gap-1 px-3 py-1 text-[11px] font-bold uppercase cursor-pointer"
                                        >
                                          <Zap className="w-3 h-3" />
                                          <span>Generate Selected ({selectedInThis.length})</span>
                                        </button>

                                        <button
                                          onClick={() => handleRevokeBatchForEvent(ev.eventId, selectedInThis)}
                                          className="flex items-center gap-1 px-3 py-1 rounded bg-rose-500 text-white text-[11px] font-bold uppercase cursor-pointer"
                                          style={{ border: '1px solid var(--nb-ink)' }}
                                        >
                                          <Lock className="w-3 h-3" />
                                          <span>Lock Selected ({selectedInThis.length})</span>
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  <div className="relative w-full sm:w-60">
                                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)]" />
                                    <input
                                      type="text"
                                      placeholder="Filter participant name / roll..."
                                      value={participantSearchMap[ev.eventId] || ''}
                                      onChange={(e) => setParticipantSearchMap(prev => ({ ...prev, [ev.eventId]: e.target.value }))}
                                      className="w-full bg-[var(--nb-surface)] rounded pl-8 pr-2.5 py-1 text-[11px] text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none font-bold"
                                      style={{ border: '1.5px solid var(--nb-ink)' }}
                                    />
                                  </div>
                                </div>

                                {/* Participants Table */}
                                <div
                                  className="bg-[var(--nb-surface)] rounded-lg overflow-x-auto scrollbar-none touch-pan-x"
                                  style={{ border: '1.5px solid var(--nb-ink)' }}
                                >
                                  <table className="w-full min-w-[560px] text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-[var(--nb-surface-accent)] border-b-2 border-[var(--nb-ink)] text-[10px] font-bold text-[var(--nb-content)] uppercase">
                                        <th className="py-2 px-3 w-8"></th>
                                        <th className="py-2 px-3 nb-label">STUDENT</th>
                                        <th className="py-2 px-3 nb-label">ROLL NUMBER</th>
                                        <th className="py-2 px-3 nb-label">ATTENDANCE</th>
                                        <th className="py-2 px-3 nb-label">CERTIFICATE STATUS</th>
                                        <th className="py-2 px-3 nb-label text-right">ACTIONS</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--nb-ink)]/15">
                                      {displayedRegs.length === 0 ? (
                                        <tr>
                                          <td colSpan={6} className="py-6 text-center text-[11px] text-[var(--nb-secondary)] italic">
                                            No participants found.
                                          </td>
                                        </tr>
                                      ) : (
                                        displayedRegs.map(reg => {
                                          const student = allUsers.find(u => u.uid === reg.studentId || (reg.rollNumber && u.rollNumber?.toUpperCase() === reg.rollNumber.toUpperCase()));
                                          const isSelected = selectedInThis.includes(reg.studentId);
                                          const existingCert = dbCertificates.find(c =>
                                            c.eventId === ev.eventId &&
                                            (c.studentId === reg.studentId || (reg.rollNumber && c.rollNumber.toUpperCase() === reg.rollNumber.toUpperCase()))
                                          );
                                          const isCertIssued = Boolean(existingCert && existingCert.status !== 'Revoked');

                                          return (
                                            <tr key={reg.registrationId} className="hover:bg-[var(--nb-surface-accent)]/50 transition-colors">
                                              <td className="py-2.5 px-3">
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleParticipantSelect(ev.eventId, reg.studentId)}
                                                  className="cursor-pointer text-[var(--nb-secondary)] hover:text-[var(--nb-content)]"
                                                >
                                                  {isSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-[var(--nb-accent)]" />
                                                  ) : (
                                                    <Square className="w-4 h-4 text-[var(--nb-secondary)]/60" />
                                                  )}
                                                </button>
                                              </td>

                                              <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-2">
                                                  <div
                                                    className="w-7 h-7 rounded bg-[var(--nb-surface-accent)] overflow-hidden shrink-0"
                                                    style={{ border: '1px solid var(--nb-ink)' }}
                                                  >
                                                    <img
                                                      src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(reg.studentName || reg.rollNumber || 'User')}`}
                                                      alt=""
                                                      className="w-full h-full object-cover"
                                                    />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <div className="font-bold text-[var(--nb-content)] truncate text-xs">
                                                      {reg.studentName || student?.name || 'Student Participant'}
                                                    </div>
                                                    <div className="text-[9.5px] text-[var(--nb-secondary)] truncate">
                                                      {student?.department || activeTenant?.shortCode || activeTenant?.name || 'Department'} • {student?.year || reg.year || 'III Year'}
                                                    </div>
                                                  </div>
                                                </div>
                                              </td>

                                              <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-[var(--nb-content)]">
                                                {reg.rollNumber || student?.rollNumber || 'N/A'}
                                              </td>

                                              <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-1.5">
                                                  <span
                                                    className={`nb-tag text-[9px] font-bold uppercase ${reg.status === 'Attended'
                                                        ? 'bg-emerald-400 text-black'
                                                        : reg.status === 'Absent'
                                                          ? 'bg-rose-500 text-white'
                                                          : 'bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)]'
                                                      }`}
                                                    style={{ border: '1px solid var(--nb-ink)' }}
                                                  >
                                                    {reg.status}
                                                  </span>

                                                  <button
                                                    type="button"
                                                    onClick={async () => {
                                                      const currentEv = events.find(e => e.eventId === ev.eventId);
                                                      if (reg.status !== 'Attended' && currentEv && isBeforeEventDate(currentEv.date)) {
                                                        setFeedbackErr(`Attendance Locked: Event scheduled for ${currentEv.date}. Check-in opens on event day.`);
                                                        setTimeout(() => setFeedbackErr(''), 3500);
                                                        return;
                                                      }
                                                      const next = reg.status === 'Attended' ? 'Absent' : 'Attended';
                                                      await updateRegistrationStatus(reg.registrationId, next, currentUser.email);
                                                      refreshData();
                                                    }}
                                                    className="nb-label text-[9px] text-[var(--nb-secondary)] hover:text-[var(--nb-content)] underline cursor-pointer"
                                                  >
                                                    TOGGLE
                                                  </button>
                                                </div>
                                              </td>

                                              <td className="py-2.5 px-3">
                                                {isCertIssued && existingCert ? (
                                                  <div className="space-y-0.5">
                                                    <span
                                                      className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded"
                                                      style={{ border: '1px solid var(--nb-ink)' }}
                                                    >
                                                      <ShieldCheck className="w-2.5 h-2.5" />
                                                      <span>Generated</span>
                                                    </span>
                                                    <div className="flex items-center gap-1 text-[8.5px] font-mono text-[var(--nb-secondary)]">
                                                      <span>ID: {existingCert.certificateId}</span>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => handleCopyCertId(existingCert.certificateId, e)}
                                                        className="text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                                                      >
                                                        <Copy className="w-2.5 h-2.5" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <span
                                                    className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded"
                                                    style={{ border: '1px solid var(--nb-ink)' }}
                                                  >
                                                    <Lock className="w-2.5 h-2.5" />
                                                    <span>Locked</span>
                                                  </span>
                                                )}
                                              </td>

                                              <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                  {isCertIssued && existingCert ? (
                                                    <>
                                                      <button
                                                        onClick={() => setActivePreviewCert(existingCert)}
                                                        className="nb-btn-ghost p-1.5 rounded cursor-pointer"
                                                        style={{ border: '1px solid var(--nb-ink)' }}
                                                        title="Preview Certificate"
                                                      >
                                                        <Eye className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                                                      </button>
                                                      <button
                                                        onClick={() => handleRevokeBatchForEvent(ev.eventId, [reg.studentId])}
                                                        className="p-1.5 rounded bg-rose-500 text-white cursor-pointer"
                                                        style={{ border: '1px solid var(--nb-ink)' }}
                                                        title="Lock / Revoke this certificate"
                                                      >
                                                        <Lock className="w-3.5 h-3.5" />
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <button
                                                      onClick={() => handleGenerateBatchForEvent(ev.eventId, [reg.studentId])}
                                                      className="nb-btn flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer"
                                                      title="Generate certificate for this student now"
                                                    >
                                                      <Zap className="w-2.5 h-2.5" />
                                                      <span>Generate</span>
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Sub-Tab 1: CERTIFICATES DATABASE */}
              {certSubTab === 'db' && (
                <div className="p-5 overflow-y-auto space-y-5 flex-grow">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div
                      className="bg-[var(--nb-surface)] rounded-lg p-3.5 space-y-1"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">TOTAL IN DATABASE</span>
                      <div className="text-2xl font-black text-[var(--nb-accent)] nb-headline">
                        {dbCertificates.length}
                      </div>
                      <span className="text-[10px] text-[var(--nb-secondary)]">Verified credentials issued</span>
                    </div>

                    <div
                      className="bg-[var(--nb-surface)] rounded-lg p-3.5 space-y-1"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">ATTENDED REGISTRATIONS</span>
                      <div className="text-2xl font-black text-emerald-600 nb-headline">
                        {registrations.filter(r => r.status === 'Attended').length}
                      </div>
                      <span className="text-[10px] text-[var(--nb-secondary)]">Students eligible for certs</span>
                    </div>

                    <div
                      className="bg-[var(--nb-surface)] rounded-lg p-3.5 space-y-1"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">EVENTS COVERED</span>
                      <div className="text-2xl font-black text-[var(--nb-content)] nb-headline">
                        {new Set(dbCertificates.map(c => c.eventId)).size}
                      </div>
                      <span className="text-[10px] text-[var(--nb-secondary)]">Out of {events.length} total events</span>
                    </div>

                    <div
                      className="bg-[var(--nb-surface)] rounded-lg p-3.5 space-y-1"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">ISSUANCE STATUS</span>
                      <div className={`text-sm font-bold uppercase nb-headline ${isCertificatesEnabled ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {isCertificatesEnabled ? 'Active (Live)' : 'Paused (Hidden)'}
                      </div>
                      <span className="text-[10px] text-[var(--nb-secondary)]">Visible in student profiles</span>
                    </div>
                  </div>

                  {/* Filters: Event Select & Text Search */}
                  <div
                    className="bg-[var(--nb-surface)] rounded-lg p-3.5 flex flex-col sm:flex-row items-center gap-3"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className="relative w-full sm:w-64">
                      <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)]" />
                      <select
                        value={certEventFilter}
                        onChange={(e) => setCertEventFilter(e.target.value)}
                        className="w-full bg-[var(--nb-surface-accent)] rounded pl-9 pr-8 py-2 text-xs text-[var(--nb-content)] outline-none font-bold appearance-none transition-colors"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <option value="all">All Events ({dbCertificates.length})</option>
                        {events.map(ev => {
                          const count = dbCertificates.filter(c => c.eventId === ev.eventId).length;
                          return (
                            <option key={ev.eventId} value={ev.eventId}>
                              {ev.title} ({count})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="relative flex-grow w-full">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search by Certificate ID, Student Name, Roll Number, or Dept..."
                        value={certSearch}
                        onChange={(e) => setCertSearch(e.target.value)}
                        className="w-full bg-[var(--nb-surface-accent)] rounded pl-9 pr-8 py-2 text-xs text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none font-bold"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      />
                      {certSearch && (
                        <button
                          onClick={() => setCertSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 nb-label text-[10px] text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtered Certificates Table / List */}
                  {(() => {
                    const filtered = dbCertificates.filter(cert => {
                      const matchesEvent = certEventFilter === 'all' || cert.eventId === certEventFilter;
                      const q = certSearch.toLowerCase().trim();
                      const matchesSearch = !q ||
                        (cert.certificateId || '').toLowerCase().includes(q) ||
                        (cert.studentName || '').toLowerCase().includes(q) ||
                        (cert.rollNumber || '').toLowerCase().includes(q) ||
                        (cert.eventTitle || '').toLowerCase().includes(q);
                      return matchesEvent && matchesSearch;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div
                          className="bg-[var(--nb-surface)] rounded-lg p-10 text-center space-y-3"
                          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                        >
                          <Award className="w-10 h-10 text-[var(--nb-secondary)] mx-auto opacity-40 mb-1" />
                          <h4 className="nb-headline text-sm text-[var(--nb-content)]">No Certificates in Database</h4>
                          <p className="text-xs text-[var(--nb-secondary)] max-w-md mx-auto">
                            {dbCertificates.length === 0
                              ? "No certificates have been issued yet. Click 'Sync All Attended' to automatically generate official Certificate IDs for all students marked as Attended, or click 'Issue Custom'."
                              : "No certificates matched your current event filter or search query."}
                          </p>
                          {dbCertificates.length === 0 && (
                            <button
                              onClick={handleSyncCertificates}
                              disabled={isSyncingCerts}
                              className="nb-btn px-4 py-2 font-bold text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCerts ? 'animate-spin' : ''}`} />
                              <span>Sync All Attended Students Now</span>
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        className="bg-[var(--nb-surface)] rounded-lg overflow-hidden"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        <div className="px-4 py-3 border-b-2 border-[var(--nb-ink)] flex items-center justify-between bg-[var(--nb-surface-accent)] text-[11px] text-[var(--nb-secondary)] font-bold">
                          <span>Showing <strong className="text-[var(--nb-content)]">{filtered.length}</strong> certificates</span>
                          <span className="nb-label text-[10px]">CLICK "WHO ELSE GOT THIS" TO VIEW FELLOW RECIPIENTS</span>
                        </div>

                        <div className="divide-y divide-[var(--nb-ink)]/15">
                          {filtered.map(cert => {
                            const matchedEvent = events.find(e => e.eventId === cert.eventId);
                            const peerCount = dbCertificates.filter(c => c.eventId === cert.eventId).length;

                            return (
                              <div
                                key={cert.certificateId}
                                className="p-3.5 hover:bg-[var(--nb-surface-accent)]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                              >
                                {/* Left Info: Student + Cert ID */}
                                <div className="flex items-start gap-3 min-w-0">
                                  <div
                                    className="w-9 h-9 rounded bg-[var(--nb-surface-accent)] p-0.5 shrink-0 overflow-hidden mt-0.5"
                                    style={{ border: '1.5px solid var(--nb-ink)' }}
                                  >
                                    <img
                                      src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(cert.studentName || cert.rollNumber)}`}
                                      alt={cert.studentName}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>

                                  <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="nb-headline text-xs sm:text-sm text-[var(--nb-content)] truncate">
                                        {cert.studentName}
                                      </span>
                                      <span
                                        className="nb-tag font-mono text-[10px] font-bold"
                                        style={{ border: '1px solid var(--nb-ink)' }}
                                      >
                                        {cert.rollNumber}
                                      </span>
                                      <span
                                        className="nb-tag font-mono text-[9px] font-bold bg-emerald-400 text-black"
                                        style={{ border: '1px solid var(--nb-ink)' }}
                                      >
                                        {cert.status || 'Verified'}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-[var(--nb-secondary)]">
                                      <span className="text-[var(--nb-content)] font-bold truncate max-w-xs">{cert.eventTitle}</span>
                                      <span>• Date: <strong className="font-mono">{cert.eventDate || cert.issueDate}</strong></span>
                                      {cert.department && <span>• {cert.department}</span>}
                                    </div>

                                    {/* Certificate ID Monospace Pill with Copy */}
                                    <div className="flex items-center gap-2 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyCertId(cert.certificateId, e)}
                                        title="Copy Certificate ID"
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] cursor-pointer transition-all active:scale-95"
                                        style={{ border: '1px solid var(--nb-ink)' }}
                                      >
                                        <ShieldCheck className="w-2.5 h-2.5 text-[var(--nb-accent)]" />
                                        <span>ID: {cert.certificateId}</span>
                                        {copiedCertId === cert.certificateId ? (
                                          <span className="text-emerald-600 text-[8px] font-bold">Copied!</span>
                                        ) : (
                                          <Copy className="w-2 h-2 text-[var(--nb-secondary)]" />
                                        )}
                                      </button>

                                      <span className="text-[9px] text-[var(--nb-secondary)] font-mono">
                                        Issued: {cert.issueDate || cert.issuedAt?.split('T')[0]}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Actions */}
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-center">
                                  {/* Who Else Got This (Peers) */}
                                  <button
                                    onClick={() => {
                                      if (matchedEvent) {
                                        setActivePeersEvent(matchedEvent);
                                      } else {
                                        setActivePeersEvent({
                                          eventId: cert.eventId,
                                          title: cert.eventTitle,
                                          date: cert.eventDate,
                                          venue: cert.eventVenue || 'Campus Auditorium'
                                        } as DepartmentEvent);
                                      }
                                    }}
                                    className="nb-btn-ghost flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold uppercase cursor-pointer"
                                    style={{ border: '1.5px solid var(--nb-ink)' }}
                                    title="See all recipients who earned this certificate"
                                  >
                                    <Users className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                                    <span>Who Else Got This</span>
                                    <span className="nb-tag text-[9px] font-mono font-bold ml-0.5">
                                      {peerCount}
                                    </span>
                                  </button>

                                  {/* Preview Certificate Lightbox */}
                                  <button
                                    onClick={() => setActivePreviewCert(cert)}
                                    className="nb-btn-ghost flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold uppercase cursor-pointer"
                                    style={{ border: '1.5px solid var(--nb-ink)' }}
                                    title="View full certificate"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                                    <span>Preview</span>
                                  </button>

                                  {/* Revoke / Delete */}
                                  <HoldButton
                                    size="sm"
                                    holdTime={1600}
                                    radius={4}
                                    backgroundColor="rgba(244, 63, 94, 0.1)"
                                    fillColor="#e11d48"
                                    textColor="#fda4af"
                                    fillTextColor="#ffffff"
                                    doneLabel="Revoked"
                                    icon={<Trash2 className="w-3.5 h-3.5" />}
                                    onHold={() => handleDeleteCert(cert.certificateId)}
                                    className="border border-rose-500 text-[10px] font-bold uppercase !h-7 !px-2"
                                    style={{ border: '1.5px solid var(--nb-ink)' }}
                                  >
                                    Hold to Revoke
                                  </HoldButton>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sub-Tab 2: TEMPLATE & STYLING */}
              {certSubTab === 'template' && (
                <div className="p-5 overflow-y-auto space-y-6 flex-grow">
                  {/* Feature On / Off Control Banner */}
                  <div
                    className="p-5 rounded-lg transition-all bg-[var(--nb-surface)]"
                    style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isCertificatesEnabled ? 'bg-emerald-500' : 'bg-amber-500'
                            }`} />
                          <h4 className="nb-headline text-sm text-[var(--nb-content)]">
                            Certificate Issuance Status: {isCertificatesEnabled ? 'ACTIVE' : 'PAUSED'}
                          </h4>
                        </div>
                        <p className="text-xs text-[var(--nb-secondary)] max-w-xl">
                          {isCertificatesEnabled
                            ? 'Students who attended verified department events can view, generate, and print their digital credentials from their profile.'
                            : 'Certificate viewing is currently paused. Students will see a friendly notice on their profile that certificates are temporarily paused.'}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleCertificates()}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${isCertificatesEnabled
                            ? 'bg-rose-500 text-white'
                            : 'nb-btn'
                          }`}
                        style={{ border: '2px solid var(--nb-ink)' }}
                      >
                        <div className={`w-2 h-2 rounded-full ${isCertificatesEnabled ? 'bg-white' : 'bg-black'}`} />
                        <span>{isCertificatesEnabled ? 'Turn Feature Off' : 'Turn Feature On'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div
                      className="bg-[var(--nb-surface)] rounded-lg p-4 space-y-1"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <span className="nb-label text-[10px] text-[var(--nb-secondary)]">ELIGIBLE ATTENDEES</span>
                      <div className="text-2xl font-black text-[var(--nb-accent)] nb-headline">
                        {registrations.filter(r => r.status === 'Attended').length}
                      </div>
                      <span className="text-[10px] text-[var(--nb-secondary)]">Students marked as Attended</span>
                    </div>

                    <div
                      className="bg-[var(--nb-surface)] rounded-lg p-4 space-y-1"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <span className="nb-label text-[10px] text-[var(--nb-secondary)]">ACTIVE THEME</span>
                      <div className="text-2xl font-black text-[var(--nb-content)] nb-headline capitalize">
                        {certificateTemplate.theme || 'Indigo'}
                      </div>
                      <span className="text-[10px] text-[var(--nb-secondary)]">{certificateTemplate.badgeStyle || 'Seal'} emblem style</span>
                    </div>

                    <div
                      className="bg-[var(--nb-surface)] rounded-lg p-4 space-y-1"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <span className="nb-label text-[10px] text-[var(--nb-secondary)]">CERTIFICATE TITLE</span>
                      <div className="text-sm font-bold text-[var(--nb-content)] nb-headline truncate">
                        {certificateTemplate.certificateTitle || 'Certificate of Participation'}
                      </div>
                      <span className="text-[10px] text-[var(--nb-secondary)]">{certificateTemplate.orgName || 'NOTX Association'}</span>
                    </div>
                  </div>

                  {/* Live Template Showcase */}
                  <div
                    className="bg-[var(--nb-surface)] rounded-lg p-5 space-y-4"
                    style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                  >
                    <div className="flex items-center justify-between border-b-2 border-[var(--nb-ink)] pb-3">
                      <div>
                        <h4 className="nb-headline text-sm text-[var(--nb-content)]">Current Live Template</h4>
                        <p className="nb-label text-[10px] text-[var(--nb-secondary)]">THIS IS THE DESIGN STUDENTS RECEIVE WHEN OPENING THEIR CERTIFICATES</p>
                      </div>

                      <button
                        onClick={() => setIsEditCertModalOpen(true)}
                        className="nb-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Design</span>
                      </button>
                    </div>

                    <div className="max-w-xl mx-auto py-2">
                      <CertificateCard
                        template={certificateTemplate}
                        studentName="AARAV S. VERMA"
                        rollNumber="22A91A0501"
                        certificateId={`CERT-${activeTenant?.shortCode || 'ORG'}-0501-MLS-8F2B`}
                        issueDate="15 Nov 2026"
                        event={{
                          title: events[0]?.title || "Machine Learning Symposium 2026",
                          date: events[0]?.date || "15 Nov 2026",
                          venue: events[0]?.venue || "Campus Auditorium"
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && canManageRoles && (
            <div className="flex flex-col h-full overflow-hidden">
              <div
                className="px-5 py-3.5 flex items-center justify-between shrink-0 bg-[var(--nb-surface)]"
                style={{ borderBottom: '2px solid var(--nb-ink)' }}
              >
                <h3 className="nb-headline text-sm text-[var(--nb-content)]">System Settings</h3>
              </div>
              <div className="p-5 overflow-y-auto space-y-6">

                {/* Brand Name & Logo Customizer */}
                <div
                  className="bg-[var(--nb-surface)] rounded-lg p-5 space-y-4"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] mb-1.5"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <SlidersHorizontal className="w-3 h-3 text-[var(--nb-accent)]" />
                        PORTAL IDENTITY & LOGO
                      </div>
                      <h4 className="nb-headline text-sm text-[var(--nb-content)] mb-1">Brand Name & Logo Customizer</h4>
                      <p className="text-xs text-[var(--nb-secondary)] leading-relaxed">
                        Change the application brand name (currently <strong>"{branding.appName || 'NOTX'}"</strong>), department subtitle badge, and the adjacent logo across the entire platform.
                      </p>
                    </div>

                    {currentUser.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={() => setIsEditBrandingModalOpen(true)}
                        className="nb-btn flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Name & Logo</span>
                      </button>
                    ) : (
                      <span
                        className="nb-tag text-[10px] font-mono font-bold bg-amber-400 text-black px-2.5 py-1 shrink-0"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        Admin Restricted
                      </span>
                    )}
                  </div>

                  {/* Live brand preview bar */}
                  <div
                    className="bg-[var(--nb-surface-accent)] rounded p-3.5 flex items-center justify-between gap-3 flex-wrap"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <BrandLogo branding={branding} size="md" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <span className="nb-headline text-sm text-[var(--nb-content)]">{branding.appName || 'NOTX'}</span>
                          {branding.subtitle && (
                            <span
                              className="nb-tag text-[9px] font-mono font-bold px-1.5 py-0.2"
                              style={{ border: '1px solid var(--nb-ink)' }}
                            >
                              {branding.subtitle}
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-[var(--nb-secondary)] font-mono mt-0.5">
                          {branding.logoType === 'custom' ? 'Custom Crest / Image Logo' : `Tech Icon: ${branding.logoIcon || 'Cpu'} (${branding.accentColor || 'indigo'})`}
                          {branding.tagline ? ` • Suffix: ${branding.tagline}` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className="nb-tag text-[9.5px] font-mono font-bold bg-emerald-400 text-black px-2 py-0.5"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      Live Dynamic Synced
                    </span>
                  </div>
                </div>


                {/* E-Certificate Feature Toggle & Template Designer */}
                <div
                  className="bg-[var(--nb-surface)] rounded-lg p-5 space-y-4"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] mb-1.5"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <Award className="w-3 h-3 text-[var(--nb-accent)]" />
                        EVENT CREDENTIALS
                      </div>
                      <h4 className="nb-headline text-sm text-[var(--nb-content)] mb-1">E-Certificates Feature</h4>
                      <p className="text-xs text-[var(--nb-secondary)]">Turn certificate viewing on/off and edit the official certificate template.</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setIsEditCertModalOpen(true)}
                        className="nb-btn-ghost flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs uppercase tracking-wider cursor-pointer"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                        <span>Edit Template</span>
                      </button>

                      <button
                        onClick={() => handleToggleCertificates()}
                        className={`relative inline-flex h-7 w-12 items-center rounded transition-colors cursor-pointer ${isCertificatesEnabled ? 'bg-emerald-500' : 'bg-[var(--nb-surface-accent)]'
                          }`}
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                        title="Toggle certificate feature on or off"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded bg-white transition-transform ${isCertificatesEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          style={{ border: '1px solid var(--nb-ink)' }}
                        />
                      </button>
                    </div>
                  </div>

                  <div
                    className="bg-[var(--nb-surface-accent)] rounded p-3.5 space-y-1.5 text-xs"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--nb-content)]">{certificateTemplate.certificateTitle || "Certificate of Participation"}</span>
                      <span
                        className={`nb-tag text-[10px] font-mono font-bold px-2 py-0.5 ${isCertificatesEnabled
                            ? 'bg-emerald-400 text-black'
                            : 'bg-amber-400 text-black'
                          }`}
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        {isCertificatesEnabled ? 'Feature Enabled' : 'Feature Paused'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--nb-secondary)]">
                      Issuing organization: <strong className="text-[var(--nb-content)]">{certificateTemplate.orgName}</strong> ({certificateTemplate.departmentName})
                    </p>
                  </div>
                </div>

                {/* Dynamic Support Box Configuration */}
                <div
                  className="bg-[var(--nb-surface)] rounded-lg p-5 space-y-4"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] mb-1.5"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <ShieldCheck className="w-3 h-3 text-[var(--nb-accent)]" />
                        PROFILE & SUPPORT DESK
                      </div>
                      <h4 className="nb-headline text-sm text-[var(--nb-content)] mb-1">Support Box Details</h4>
                      <p className="text-xs text-[var(--nb-secondary)]">Configure the official department help contacts shown on the profile page and query desk.</p>
                    </div>

                    <button
                      onClick={() => setIsEditSupportModalOpen(true)}
                      className="nb-btn flex items-center gap-1.5 px-3 py-2 font-bold text-xs uppercase tracking-wider cursor-pointer shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Support Box</span>
                    </button>
                  </div>

                  {/* Summary preview */}
                  <div
                    className="bg-[var(--nb-surface-accent)] rounded p-3.5 space-y-2 text-xs"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className="flex items-center justify-between border-b border-[var(--nb-ink)]/15 pb-2">
                      <span className="font-bold text-[var(--nb-content)]">{supportInfo.title || "Help & Support Desk"}</span>
                      <span className="nb-tag text-[10px] font-mono font-bold">{supportInfo.badge || "OFFICIAL CHANNELS"}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-2 text-[var(--nb-secondary)]">
                        <Mail className="w-3.5 h-3.5 text-[var(--nb-accent)] shrink-0" />
                        <span className="text-[var(--nb-content)] font-mono truncate">{supportInfo.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--nb-secondary)]">
                        <Phone className="w-3.5 h-3.5 text-[var(--nb-accent)] shrink-0" />
                        <span className="text-[var(--nb-content)] font-mono truncate">{supportInfo.phone}</span>
                      </div>
                    </div>

                    {supportInfo.location && (
                      <div className="text-[10px] text-[var(--nb-secondary)] flex items-center gap-1.5 pt-1">
                        <span className="font-semibold text-[var(--nb-content)]">Location:</span> {supportInfo.location}
                        {supportInfo.timing ? ` (${supportInfo.timing})` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Overall Data Export & System Backup */}
                <div
                  className="bg-[var(--nb-surface)] rounded-lg p-5 space-y-4"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] mb-1.5"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <FolderArchive className="w-3 h-3 text-[var(--nb-accent)]" />
                        DATABASE BACKUP & ARCHIVAL
                      </div>
                      <h4 className="nb-headline text-sm text-[var(--nb-content)] mb-1">Overall Data Export & System Backup</h4>
                      <p className="text-xs text-[var(--nb-secondary)] leading-relaxed">
                        Export all application data into a consolidated JSON backup or download individual CSV tables for students and attendance before any academic term transitions.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setResetModalInitialTab('export');
                        setIsResetModalOpen(true);
                      }}
                      className="nb-btn flex items-center gap-1.5 px-3 py-2 font-bold text-xs uppercase tracking-wider cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Data Export Hub</span>
                    </button>
                  </div>

                  {/* Quick stats snapshot */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div
                      className="bg-[var(--nb-surface-accent)] rounded p-3 text-center"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                    >
                      <div className="text-lg font-mono font-bold text-[var(--nb-content)]">{allUsers.length}</div>
                      <div className="nb-label text-[9px] text-[var(--nb-secondary)] uppercase mt-0.5">Enrolled Users</div>
                    </div>
                    <div
                      className="bg-[var(--nb-surface-accent)] rounded p-3 text-center"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                    >
                      <div className="text-lg font-mono font-bold text-[var(--nb-accent)]">{events.length}</div>
                      <div className="nb-label text-[9px] text-[var(--nb-secondary)] uppercase mt-0.5">Department Events</div>
                    </div>
                    <div
                      className="bg-[var(--nb-surface-accent)] rounded p-3 text-center"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                    >
                      <div className="text-lg font-mono font-bold text-emerald-600">{registrations.length}</div>
                      <div className="nb-label text-[9px] text-[var(--nb-secondary)] uppercase mt-0.5">Registrations</div>
                    </div>
                    <div
                      className="bg-[var(--nb-surface-accent)] rounded p-3 text-center"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                    >
                      <div className="text-lg font-mono font-bold text-amber-500">{dbCertificates.length}</div>
                      <div className="nb-label text-[9px] text-[var(--nb-secondary)] uppercase mt-0.5">Issued Credentials</div>
                    </div>
                  </div>
                </div>

                {/* Reset Association & Start New Academic Year (DANGER ZONE) */}
                <div
                  className="bg-[var(--nb-surface)] rounded-lg p-5 space-y-4"
                  style={{ border: '2px solid #e11d48', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500 text-white mb-1.5"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        DANGER ZONE • ASSOCIATION LIFECYCLE
                      </div>
                      <h4 className="nb-headline text-sm text-[var(--nb-content)] mb-1">Reset Association • Start New Academic Year</h4>
                      <p className="text-xs text-[var(--nb-secondary)] leading-relaxed">
                        Permanently wipe all past student accounts, events, registrations, certificates, event winners, and photo albums across the entire database to begin a completely clean new association term.
                      </p>
                    </div>

                    {currentUser.isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setResetModalInitialTab('reset');
                          setIsResetModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Start New Association</span>
                      </button>
                    ) : (
                      <div className="shrink-0 flex items-center gap-1 text-[11px] font-mono text-[var(--nb-secondary)] bg-[var(--nb-surface)] px-2.5 py-1.5 rounded border border-[var(--nb-divider)]">
                        <Lock className="w-3 h-3 text-[var(--nb-secondary)]" />
                        <span>Super Admin Restricted</span>
                      </div>
                    )}
                  </div>

                  <div
                    className="bg-[var(--nb-surface-accent)] rounded p-3.5 text-xs flex items-center justify-between gap-3 flex-wrap"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className="text-[11px] text-[var(--nb-secondary)] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Root Admin account (<strong>{currentUser.email}</strong>) is preserved automatically so you never lose access.</span>
                    </div>
                    <span
                      className="nb-tag text-[10px] font-mono text-rose-600 font-bold bg-white"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      Requires Typed Verification
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==================== 7. SUPPORT TICKETS MANAGEMENT TAB ==================== */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              {/* Header Card */}
              <div 
                className="bg-[var(--nb-surface)] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30 mb-1.5">
                    <MessageSquare className="w-3 h-3" />
                    <span>DEPARTMENT SUPPORT HELPDESK</span>
                  </div>
                  <h3 className="nb-headline text-base sm:text-lg text-[var(--nb-content)]">
                    Student Queries &amp; Grievances Desk
                  </h3>
                  <p className="nb-label text-[10px] text-[var(--nb-secondary)]">
                    Direct two-way channel for students of {activeTenant?.name || 'your department'}. Review inquiries, clarify permissions, and transmit official responses.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-2.5 py-1 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] text-center min-w-[65px]">
                    <div className="text-sm font-black font-mono leading-none">{tenantTickets.length}</div>
                    <div className="text-[8.5px] font-mono text-[var(--nb-secondary)] uppercase mt-0.5">Total</div>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-center min-w-[65px]">
                    <div className="text-sm font-black font-mono text-amber-700 dark:text-amber-400 leading-none">{openTenantTicketsCount}</div>
                    <div className="text-[8.5px] font-mono text-amber-700 dark:text-amber-400 uppercase mt-0.5">Pending</div>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-center min-w-[65px]">
                    <div className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 leading-none">
                      {tenantTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
                    </div>
                    <div className="text-[8.5px] font-mono text-emerald-700 dark:text-emerald-400 uppercase mt-0.5">Resolved</div>
                  </div>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div 
                className="bg-[var(--nb-surface)] p-3 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search query topic, student name, roll number, or ticket ID..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--nb-surface-accent)] rounded border border-[var(--nb-ink)] text-[var(--nb-content)] placeholder:text-[var(--nb-secondary)] outline-none font-medium"
                  />
                  {ticketSearch && (
                    <button 
                      onClick={() => setTicketSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(['all', 'open', 'resolved'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTicketStatusFilter(filter)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        ticketStatusFilter === filter
                          ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)] font-black'
                          : 'bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                      }`}
                    >
                      {filter === 'all' ? `All (${tenantTickets.length})` : filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Master-Detail Split Grid */}
              {filteredTenantTickets.length === 0 ? (
                <div 
                  className="p-12 text-center bg-[var(--nb-surface)] rounded-lg space-y-2"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <MessageSquare className="w-8 h-8 text-[var(--nb-secondary)] mx-auto opacity-50" />
                  <h4 className="nb-headline text-sm text-[var(--nb-content)]">No Support Queries Found</h4>
                  <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto">
                    {tenantTickets.length === 0
                      ? "When students submit queries from the Contact & Support box, they will appear here in real-time."
                      : "No queries match your search or status filter."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                  
                  {/* Left Column: Tickets Queue (5 cols) */}
                  <div className="lg:col-span-5 space-y-2 max-h-[680px] overflow-y-auto pr-1">
                    {filteredTenantTickets.map((t) => {
                      const isSelected = selectedTicketId === t.id;
                      const replyCount = t.replies?.length || 0;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`p-3 rounded-lg border-2 transition-all cursor-pointer text-left space-y-1.5 ${
                            isSelected
                              ? 'bg-[var(--nb-surface)] border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)]'
                              : 'bg-[var(--nb-surface)] border-[var(--nb-ink)]/30 hover:border-[var(--nb-ink)] hover:bg-[var(--nb-surface-accent)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-black text-[var(--nb-accent)]">
                                #{t.readableId || t.id.slice(0, 8)}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] border border-[var(--nb-ink)]/20">
                                {t.category}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {t.unreadByAdmin && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Unread student query" />
                              )}
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase ${
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

                          <h5 className="nb-headline text-xs line-clamp-1 text-[var(--nb-content)]">
                            {t.subject}
                          </h5>

                          <p className="text-[11px] text-[var(--nb-secondary)] line-clamp-2 font-sans">
                            {t.message}
                          </p>

                          <div className="flex items-center justify-between text-[9.5px] font-mono text-[var(--nb-secondary)] pt-1 border-t border-[var(--nb-ink)]/10">
                            <span className="truncate max-w-[170px] font-bold text-[var(--nb-content)]">
                              {t.userName} ({t.userRoll || t.userEmail})
                            </span>
                            <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Selected Ticket Thread & Reply Form (7 cols) */}
                  <div className="lg:col-span-7">
                    {selectedTicket ? (
                      <div 
                        className="bg-[var(--nb-surface)] rounded-lg border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] overflow-hidden flex flex-col"
                      >
                        {/* Top bar */}
                        <div className="p-3.5 bg-[var(--nb-surface-accent)] border-b-2 border-[var(--nb-ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-mono text-xs font-black text-[var(--nb-accent)]">
                                #{selectedTicket.readableId || selectedTicket.id.slice(0, 8)}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface)] border border-[var(--nb-ink)] text-[var(--nb-secondary)]">
                                {selectedTicket.category}
                              </span>
                            </div>
                            <h4 className="nb-headline text-sm truncate">{selectedTicket.subject}</h4>
                          </div>

                          {/* Status Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateDeptTicketStatus(selectedTicket.id, 'in_progress')}
                                disabled={isUpdatingTicketStatus}
                                className="nb-btn-ghost text-[9px] font-mono font-bold uppercase py-1 px-2 cursor-pointer"
                              >
                                Set In Progress
                              </button>
                            )}
                            {selectedTicket.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateDeptTicketStatus(selectedTicket.id, 'resolved')}
                                disabled={isUpdatingTicketStatus}
                                className="nb-btn text-[9px] font-mono font-bold uppercase py-1 px-2.5 cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Resolve</span>
                              </button>
                            )}
                            {selectedTicket.status === 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateDeptTicketStatus(selectedTicket.id, 'open')}
                                disabled={isUpdatingTicketStatus}
                                className="nb-btn-ghost text-[9px] font-mono font-bold uppercase py-1 px-2 cursor-pointer text-amber-600"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Student Details Strip */}
                        <div className="p-2.5 bg-[var(--nb-surface)] border-b border-[var(--nb-ink)]/15 flex items-center justify-between text-[11px] font-mono text-[var(--nb-secondary)] flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-[var(--nb-accent)]" />
                            <strong className="text-[var(--nb-content)]">{selectedTicket.userName}</strong>
                            {selectedTicket.userRoll && (
                              <span className="px-1 py-0.2 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/20 text-[9.5px]">
                                {selectedTicket.userRoll}
                              </span>
                            )}
                            <span className="text-[10px] truncate max-w-[180px]">{selectedTicket.userEmail}</span>
                          </div>
                          <span className="text-[9.5px]">
                            {new Date(selectedTicket.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Query & Replies Thread Body */}
                        <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[460px]">
                          {/* Original Query */}
                          <div className="p-3 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/25 space-y-1.5">
                            <div className="flex items-center justify-between text-[9.5px] font-mono text-[var(--nb-secondary)]">
                              <span className="font-bold uppercase text-[var(--nb-content)]">Student Query:</span>
                              <span>{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-[var(--nb-content)] leading-relaxed whitespace-pre-wrap font-sans">
                              {selectedTicket.message}
                            </p>
                          </div>

                          {/* Replies Thread */}
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-1.5 text-[9.5px] font-mono font-bold uppercase text-[var(--nb-secondary)]">
                              <MessageCircle className="w-3 h-3" />
                              <span>Conversation Thread ({selectedTicket.replies?.length || 0})</span>
                            </div>

                            {(selectedTicket.replies || []).map((rep) => {
                              const isStaff = rep.senderRole === 'admin' || rep.senderRole === 'president' || rep.senderRole === 'super_admin' || rep.senderRole === 'associate';
                              return (
                                <div
                                  key={rep.replyId}
                                  className={`p-2.5 rounded border leading-relaxed space-y-1 ${
                                    isStaff
                                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[1px_1px_0_var(--nb-ink)]'
                                      : 'bg-[var(--nb-surface-accent)] border-[var(--nb-ink)]/30 ml-3'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 text-[9.5px] font-mono flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-1 py-0.2 rounded text-[8px] font-mono font-black uppercase ${
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
                                      {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                        {/* Reply Form */}
                        <form onSubmit={handleSendDeptReply} className="p-3 bg-[var(--nb-surface-accent)] border-t-2 border-[var(--nb-ink)] space-y-2">
                          <label className="nb-label text-[9.5px] block">
                            Department Official Response (Visible to student in their Support Box):
                          </label>
                          <div className="flex gap-2 items-start">
                            <textarea
                              rows={2}
                              value={ticketReplyText}
                              onChange={(e) => setTicketReplyText(e.target.value)}
                              placeholder="Write official response, instructions, or resolution details..."
                              className="nb-input text-xs resize-none flex-1 leading-relaxed"
                            />
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                type="submit"
                                disabled={!ticketReplyText.trim() || isSendingTicketReply}
                                className="nb-btn text-xs py-1.5 px-3 cursor-pointer disabled:opacity-50"
                              >
                                <Send className="w-3 h-3" />
                                <span>{isSendingTicketReply ? 'Sending...' : 'Send'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!ticketReplyText.trim()) return;
                                  await handleSendDeptReply({ preventDefault: () => {} } as any);
                                  await handleUpdateDeptTicketStatus(selectedTicket.id, 'resolved');
                                }}
                                disabled={!ticketReplyText.trim() || isSendingTicketReply}
                                className="nb-btn-ghost text-[9px] font-mono font-bold uppercase py-1 px-1.5 cursor-pointer bg-emerald-500/15 border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white disabled:opacity-50"
                              >
                                Reply &amp; Resolve
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div 
                        className="p-12 text-center bg-[var(--nb-surface)] rounded-lg space-y-2"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        <MessageSquare className="w-8 h-8 text-[var(--nb-secondary)] mx-auto opacity-40" />
                        <h4 className="nb-headline text-xs text-[var(--nb-content)]">Select a Ticket</h4>
                        <p className="text-[11px] text-[var(--nb-secondary)] max-w-sm mx-auto">
                          Choose any student query from the list to review the conversation and send an official department reply.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Edit Support Box Modal */}
      <EditSupportBoxModal
        isOpen={isEditSupportModalOpen}
        onClose={() => setIsEditSupportModalOpen(false)}
        currentInfo={supportInfo}
        onSaved={(updated) => {
          setSupportInfo(updated);
          setFeedbackMsg("Support Box information updated successfully!");
          setTimeout(() => setFeedbackMsg(''), 3000);
        }}
      />

      {/* Edit Certificate Template & Feature Hub Modal */}
      <CertificateTemplateModal
        isOpen={isEditCertModalOpen}
        onClose={() => setIsEditCertModalOpen(false)}
        currentTemplate={certificateTemplate}
        onSave={handleSaveCertificateTemplate}
        isCertificatesEnabled={isCertificatesEnabled}
        onToggleEnabled={handleToggleCertificates}
      />

      {/* Certificate Recipients (Who Else Got This) Modal */}
      {activePeersEvent && (
        <CertificateRecipientsModal
          isOpen={!!activePeersEvent}
          onClose={() => setActivePeersEvent(null)}
          eventTitle={activePeersEvent.title}
          eventDate={activePeersEvent.date}
          eventVenue={activePeersEvent.venue}
          certificates={dbCertificates.filter(c => c.eventId === activePeersEvent.eventId)}
          template={certificateTemplate}
        />
      )}

      {/* Certificate Verification Modal */}
      <CertificateVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        initialId={verifyInitialId}
        template={certificateTemplate}
        activeTenant={activeTenant}
      />

      {/* Manual Issue Certificate Modal */}
      {showManualIssueModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 select-none animate-fadeIn">
          <div
            className="bg-[var(--nb-surface)] rounded-lg w-full max-w-md p-5 space-y-4"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--nb-ink)] pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded bg-[var(--nb-surface-accent)] flex items-center justify-center text-[var(--nb-accent)]"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="nb-headline text-sm text-[var(--nb-content)]">Issue Custom Certificate</h4>
                  <p className="nb-label text-[10px] text-[var(--nb-secondary)]">ASSIGN A CREDENTIAL TO A STUDENT FOR ANY EVENT</p>
                </div>
              </div>
              <button
                onClick={() => setShowManualIssueModal(false)}
                className="nb-btn-ghost w-7 h-7 flex items-center justify-center cursor-pointer rounded"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleIssueSingleCert} className="space-y-3.5 text-xs">
              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
                  SELECT STUDENT
                </label>
                <select
                  value={manualStudentUid}
                  onChange={(e) => setManualStudentUid(e.target.value)}
                  className="w-full bg-[var(--nb-surface-accent)] rounded px-3 py-2 text-[var(--nb-content)] outline-none font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {allUsers.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.rollNumber || 'No Roll'}) - {u.department || activeTenant?.shortCode || 'Member'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
                  SELECT EVENT
                </label>
                <select
                  value={manualEventId}
                  onChange={(e) => setManualEventId(e.target.value)}
                  className="w-full bg-[var(--nb-surface-accent)] rounded px-3 py-2 text-[var(--nb-content)] outline-none font-bold"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                  required
                >
                  <option value="">-- Choose Event --</option>
                  {events.map(ev => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {ev.title} ({ev.date})
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="p-3 rounded bg-[var(--nb-surface-accent)] space-y-1"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <span className="nb-label text-[9px] text-[var(--nb-secondary)] block">AUTO-GENERATED ID FORMAT</span>
                <div className="font-mono text-xs font-bold text-emerald-600">
                  CERT-{activeTenant?.shortCode || 'ORG'}-[ROLL]-[EVT]-[HASH]
                </div>
                <p className="text-[10px] text-[var(--nb-secondary)]">A unique tamper-evident verification ID will be generated upon issuance.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t-2 border-[var(--nb-ink)]">
                <button
                  type="button"
                  onClick={() => setShowManualIssueModal(false)}
                  className="nb-btn-ghost px-4 py-2 text-xs font-bold uppercase cursor-pointer"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nb-btn px-4 py-2 font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Issue Certificate Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Lightbox Preview */}
      {activePreviewCert && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-3 animate-fadeIn">
          <div
            className="bg-[var(--nb-surface)] rounded-lg max-w-xl w-full p-4 sm:p-6 space-y-4"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--nb-ink)] pb-2">
              <div>
                <h4 className="nb-headline text-xs text-[var(--nb-content)]">Certificate Preview</h4>
                <p className="nb-label text-[10px] text-[var(--nb-secondary)]">ID: {activePreviewCert.certificateId}</p>
              </div>
              <button
                onClick={() => setActivePreviewCert(null)}
                className="nb-btn-ghost w-7 h-7 flex items-center justify-center cursor-pointer rounded"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <CertificateCard
              template={certificateTemplate}
              studentName={activePreviewCert.studentName}
              rollNumber={activePreviewCert.rollNumber}
              event={{
                title: activePreviewCert.eventTitle,
                date: activePreviewCert.eventDate,
                venue: activePreviewCert.eventVenue || 'Campus Auditorium'
              }}
              certificateId={activePreviewCert.certificateId}
              issueDate={activePreviewCert.issueDate}
              onViewPeers={() => {
                const ev = events.find(e => e.eventId === activePreviewCert.eventId);
                if (ev) setActivePeersEvent(ev);
              }}
              peersCount={dbCertificates.filter(c => c.eventId === activePreviewCert.eventId).length}
            />

            <div className="flex justify-between items-center pt-2">
              <span className="nb-label text-[10px] text-[var(--nb-secondary)]">
                STATUS: <strong className="text-emerald-600 font-mono">{activePreviewCert.status}</strong>
              </span>
              <button
                onClick={() => setActivePreviewCert(null)}
                className="nb-btn-ghost px-4 py-1.5 font-bold text-xs uppercase cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Reset Association & Overall Data Export Hub Modal */}
      <ResetAssociationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        events={events}
        registrations={registrations}
        initialTab={resetModalInitialTab}
        activeTenant={activeTenant}
        onResetComplete={() => {
          refreshData();
          setFeedbackMsg("All prior association records have been wiped clean. Welcome to the fresh academic year!");
          setTimeout(() => setFeedbackMsg(''), 7000);
        }}
      />
      {/* Edit Branding & Logo Modal (Admin Only) */}
      {currentUser.role === 'admin' && (
        <EditBrandingModal
          isOpen={isEditBrandingModalOpen}
          onClose={() => setIsEditBrandingModalOpen(false)}
          currentBranding={branding}
          tenantId={activeTenantIdResolved}
          onSaved={(updated) => {
            setBranding(updated);
            refreshData();
            setFeedbackMsg(`Brand updated to "${updated.appName}" with live dynamic logo!`);
            setTimeout(() => setFeedbackMsg(''), 4000);
          }}
        />
      )}
    </div>
  );
}
