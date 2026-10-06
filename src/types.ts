export const SUPER_ADMIN_EMAILS: string[] = ['syedsame2244@gmail.com'];

export interface Tenant {
  tenantId: string;
  name: string;
  shortCode: string;
  adminEmail: string;
  institution?: string;
  status: 'active' | 'inactive';
  branding?: AppBranding;
  supportInfo?: SupportInfo;
  createdAt: string;
  createdBy?: string;
}

export type UserRole = 'admin' | 'president' | 'associate' | 'coordinator' | 'student' | 'faculty';

export interface AssociatePowers {
  canManageEvents?: boolean;
  canManageAnnouncements?: boolean;
  canViewRegistrations?: boolean;
  canManageGallery?: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  isSuperAdmin?: boolean;
  phone?: string;
  profile_pic?: string;
  rollNumber?: string;
  branch?: string;
  year?: string;
  section?: string;
  skills?: string;
  position?: string; // e.g. President, Vice President, Secretary, Coordinator, etc.
  department?: string;
  linkedin?: string;
  responsibilities?: string;
  personalEmail?: string; // Student or user's self-chosen personal contact email (separate from system login ID)
  googleEmail?: string;
  powers?: AssociatePowers; // Admin assigns custom powers to associates
  assignedEvents?: string[]; // Admin assigns coordinators to specific events (array of eventIds)
  password?: string; // Stored password or temporary password
  isFirstLogin?: boolean;
  created_at: string;
}

export interface AssociateMember {
  id: string;
  tenantId: string;
  name: string;
  rollNumber: string;
  position: string;
  role?: string;
  category?: 'ALL' | 'EXECUTIVES' | 'TECH' | 'OPERATIONS' | 'STUDENTS';
  department?: string;
  branch?: string;
  year?: string;
  section?: string;
  profile_pic?: string;
  linkedin?: string;
  responsibilities?: string;
  skills?: string;
  email?: string;
  created_at?: string;
}

export interface AdminAuthRecord {
  id: string; // clean email
  email: string;
  role: 'superadmin' | 'admin';
  tenantId?: string;
  name?: string;
  passwordHash?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}


export interface DepartmentEvent {
  tenantId?: string;
  images?: string[];
  eventId: string;
  title: string;
  category: 'Workshops' | 'Hackathons' | 'Seminars' | 'Cultural Events' | 'Club Meetings';
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  venue: string;
  facultyCoordinator: string;
  studentCoordinators: string;
  maxParticipants: number;
  registrationDeadline: string;
  posterImage: string;
  posterOrientation?: 'portrait' | 'landscape';
  rules?: string;
  requirements?: string;
  createdAt: string;
  isTeamBased?: boolean;
  maxTeamSize?: number;
  currentRegistrations?: number;
}

export interface TeamMember {
  name: string;
  rollNumber: string;
  year: string;
  section: string;
  phone: string;
  status?: 'Pending' | 'Accepted' | 'Declined';
}

export interface EventRegistration {
  tenantId?: string;
  registrationId: string;
  studentId: string;
  eventId: string;
  status: 'Registered' | 'Attended' | 'Absent';
  appliedAt: string;
  attendedAt?: string;
  verifiedBy?: string;
  studentName: string;
  rollNumber: string;
  phone: string;
  year: string;
  teamName?: string;
  isTeam?: boolean;
  teamMembers?: TeamMember[];
}

export interface Album {
  tenantId?: string;
  albumId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  images: string[];
  category: 'Workshops' | 'Hackathons' | 'Seminars' | 'Cultural Events' | 'Club Meetings' | 'Other';
  uploadedBy: string;
  createdAt: string;
}

export interface Announcement {
  tenantId?: string;
  images?: string[];
  announcementId: string;
  title: string;
  content: string;
  category: 'Exam' | 'Workshop' | 'Result' | 'Notice' | 'News';
  date: string;
  author: string;
}

export interface AppNotification {
  id: string;
  tenantId: string;
  userId: string; // Specific user ID or 'all' for tenant-wide broadcast
  title: string;
  message: string;
  type: 'attendance' | 'promotion' | 'assignment' | 'event' | 'announcement' | 'gallery' | 'registration' | 'system';
  link?: string;
  read?: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}


export interface SupportInfo {
  title: string;
  subtitle: string;
  badge?: string;
  email: string;
  phone: string;
  location: string;
  timing: string;
  urgentHelpTitle: string;
  urgentHelpText: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SUPPORT_INFO: SupportInfo = {
  title: "Help & Support Desk",
  subtitle: "Reach out to departmental coordinators, faculty advisors, and lab heads",
  badge: "OFFICIAL CHANNELS",
  email: "hod.cse.aml@aits.edu",
  phone: "+91 98765 43210",
  location: "NOTX AI & ML Innovation Lab: Room 314, Block 3, 2nd Floor",
  timing: "Mon-Fri 9:00 AM - 4:30 PM",
  urgentHelpTitle: "Need Immediate Assistance?",
  urgentHelpText: "For urgent exam hall clearances, project evaluations, or event coordinator permissions, please contact your designated Class Representative (CR) or drop by Block-3 Innovation Lab."
};

export type TicketCategory = 'General' | 'Academics' | 'Events' | 'Grievance';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketReply {
  replyId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  readableId?: string;
  tenantId: string;
  tenantName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRoll?: string;
  userRollNumber?: string;
  category: TicketCategory;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  replies: TicketReply[];
}


export interface CertificateTemplate {
  orgName: string;
  departmentName: string;
  institutionName?: string;
  certificateTitle: string;
  certifyStatement: string;
  bodyText: string;
  signatory1Name: string;
  signatory1Title: string;
  signatory1Dept: string;
  signatory2Name: string;
  signatory2Title: string;
  signatory2Dept: string;
  theme: 'indigo' | 'gold' | 'emerald' | 'crimson' | 'slate';
  badgeStyle: 'seal' | 'shield' | 'star' | 'ribbon';
  accentBorder: boolean;
  showVerificationBadge: boolean;
  footerNote?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_CERTIFICATE_TEMPLATE: CertificateTemplate = {
  orgName: "Student Association",
  departmentName: "Academic Department",
  institutionName: "Faculty of Engineering & Technology",
  certificateTitle: "Certificate of Participation",
  certifyStatement: "This is to certify that",
  bodyText: "has successfully registered and participated in {eventTitle} held on {eventDate} at the institutional campus premises.",
  signatory1Name: "Head of Department",
  signatory1Title: "Department Chair",
  signatory1Dept: "Academic Council",
  signatory2Name: "Association Lead",
  signatory2Title: "Faculty Coordinator",
  signatory2Dept: "Verified Credential",
  theme: "indigo",
  badgeStyle: "seal",
  accentBorder: true,
  showVerificationBadge: true,
  footerNote: "Verified Academic Credential • NOTX Connect"
};

export function createDefaultCertificateTemplate(tenant?: { name?: string; shortCode?: string; orgName?: string }): CertificateTemplate {
  const deptName = tenant?.name || "Academic Department";
  const short = tenant?.shortCode || "ORG";
  return {
    ...DEFAULT_CERTIFICATE_TEMPLATE,
    orgName: tenant?.orgName || `${short} Student Association`,
    departmentName: deptName,
    signatory1Title: `HOD, ${short}`,
    signatory1Dept: deptName,
  };
}

export type ThemePresetKey = 
  | 'cobalt-tech' 
  | 'cyber-gold' 
  | 'emerald-forge' 
  | 'royal-violet' 
  | 'crimson-riot' 
  | 'aqua-nexus' 
  | 'mono-slate' 
  | 'custom';

export interface TenantThemeConfig {
  presetKey: ThemePresetKey;
  name: string;
  description: string;
  heroBg: string;         // Background for Welcome Card & Login Hero Strip
  heroFg: string;         // Foreground text color (#FFFFFF or #111111)
  accent: string;         // Primary CTA buttons & active highlights
  accentFg: string;       // Text color on accent buttons
  subtleBg: string;       // Pill / tag background
  borderInk?: string;     // Border color (default: #1A1A1A)
  previewBadgeClass: string;
}

export interface AppBranding {
  appName: string; // e.g. "NOTX", "THINKBOTZ", "NEXUS"
  tagline?: string; // e.g. "Connect", "Portal", "Hub"
  subtitle?: string; // e.g. "AI & ML", "CSE", "IT"
  institution?: string; // e.g. "Department of CSE, College of Engineering"
  loginHeroText?: string; // Custom welcome notice on login page
  logoType: 'preset' | 'custom';
  logoIcon?: string; // e.g. "Cpu", "Bot", "Sparkles", "Terminal", "Zap", "Rocket", "Atom", "Code2"
  logoImageUrl?: string; // custom image URL or data URL
  accentColor?: string; // e.g. "indigo", "violet", "emerald", "cyan", "amber", "rose"
  theme?: TenantThemeConfig;
  updatedAt?: string;
}

export const DEFAULT_BRANDING: AppBranding = {
  appName: "NOTX",
  tagline: "Connect",
  subtitle: "AI & ML",
  institution: "Academic SaaS Ecosystem",
  loginHeroText: "Universal department pass verification, live notifications, and digital credentials.",
  logoType: "preset",
  logoIcon: "Cpu",
  logoImageUrl: "",
  accentColor: "indigo"
};

export interface AppConfig {
  configId?: string;
  tenantId?: string;
  isCertificatesEnabled?: boolean;
  certificateTemplate?: CertificateTemplate;
  supportInfo?: SupportInfo;
  branding?: AppBranding;
  platformDevConfig?: PlatformDevConfig;
}

export interface PlatformBuilder {
  id: string;
  name: string;
  rollNumber: string;
  role: string;
  department: string;
  bio?: string;
  specialty?: string;
  badge: string;
  badgeStyle?: string;
  badgeColor?: 'amber' | 'cyan' | 'rose' | 'violet' | 'emerald' | 'dark' | string;
  accentBg?: string;
  accentColor?: string;
  profilePic?: string;
  github?: string;
  linkedin?: string;
  email?: string;
  website?: string;
  isLead?: boolean;
}

export interface PlatformDevConfig {
  sectionTitle?: string;
  subtitle?: string;
  badgeText?: string;
  members: PlatformBuilder[];
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PLATFORM_BUILDERS: PlatformBuilder[] = [
  {
    id: 'syed_sameer',
    name: "SYED SAMEER",
    rollNumber: "23HM1A3354",
    role: "Lead Full-Stack Architect",
    department: "CSE (AI & ML) - 3rd Year",
    specialty: "Initiated the project idea and developed the core full-stack application.",
    bio: "Initiated the project idea, architected the multi-tenant SaaS platform, real-time database schema, dynamic QR pass scanner, and automated credentials.",
    badge: "ARCHITECT",
    badgeStyle: "bg-amber-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    badgeColor: "amber",
    accentBg: "bg-amber-400",
    accentColor: "text-amber-500",
    email: "syedsame2244@gmail.com",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    isLead: true
  },
  {
    id: 'aslam_hussain',
    name: "S MD ASLAM HUSSAIN",
    rollNumber: "23HM1A3346",
    role: "Quality & Systems Engineer",
    department: "CSE (AI & ML) - 3rd Year",
    specialty: "Handled data verification, quality testing, and performance optimization.",
    bio: "Managed data integrity verification, multi-device cross-browser testing, load testing, and database query optimization.",
    badge: "TEST LEAD",
    badgeStyle: "bg-rose-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    badgeColor: "rose",
    accentBg: "bg-rose-400",
    accentColor: "text-rose-500",
    email: "aslam@aits.edu",
    github: "https://github.com",
    linkedin: "https://linkedin.com"
  },
  {
    id: 'syed_rayan',
    name: "SYED RAYAN",
    rollNumber: "24HM5A3306",
    role: "Design & UX Specialist",
    department: "CSE (AI & ML) - 2nd Year",
    specialty: "Worked on UI/UX redesigns, design strategy, and website interface improvements.",
    bio: "Engineered Neobrutalist design tokens, responsive mobile views, accessibility enhancements, and interactive UI micro-animations.",
    badge: "UI/UX",
    badgeStyle: "bg-sky-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    badgeColor: "cyan",
    accentBg: "bg-sky-400",
    accentColor: "text-sky-500",
    github: "https://github.com",
    linkedin: "https://linkedin.com"
  },
  {
    id: 'syed_naseer',
    name: "SYED NASEER",
    rollNumber: "24HM5A3305",
    role: "Technical Strategist",
    department: "CSE (AI & ML) - 2nd Year",
    specialty: "Contributed to technical planning, implementation strategy, and feature development.",
    bio: "Led feature requirement specifications, workflow planning, coordinator permission structures, and documentation.",
    badge: "STRATEGY",
    badgeStyle: "bg-purple-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    badgeColor: "violet",
    accentBg: "bg-purple-400",
    accentColor: "text-purple-500",
    github: "https://github.com",
    linkedin: "https://linkedin.com"
  },
  {
    id: 'k_bhanu',
    name: "K BHANU",
    rollNumber: "24HM5A3302",
    role: "Frontend Engineer",
    department: "CSE (AI & ML) - 2nd Year",
    specialty: "Worked on UI designs, frontend styling, and responsive layout optimization.",
    bio: "Built reusable component libraries, event registration cards, certificates verification modal, and mobile navigation docks.",
    badge: "FRONTEND",
    badgeStyle: "bg-emerald-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    badgeColor: "emerald",
    accentBg: "bg-emerald-400",
    accentColor: "text-emerald-500",
    github: "https://github.com",
    linkedin: "https://linkedin.com"
  }
];

export const DEFAULT_PLATFORM_DEV_CONFIG: PlatformDevConfig = {
  sectionTitle: "Platform Builders & Developers",
  subtitle: "The student engineering team behind {appName}",
  badgeText: "DEV TEAM",
  members: DEFAULT_PLATFORM_BUILDERS
};

export const DEV_COLOR_PRESETS: Record<string, { badge: string; accentBg: string; accentColor: string }> = {
  amber: {
    badge: "bg-amber-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    accentBg: "bg-amber-400",
    accentColor: "text-amber-500"
  },
  rose: {
    badge: "bg-rose-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    accentBg: "bg-rose-400",
    accentColor: "text-rose-500"
  },
  cyan: {
    badge: "bg-sky-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    accentBg: "bg-sky-400",
    accentColor: "text-sky-500"
  },
  violet: {
    badge: "bg-purple-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    accentBg: "bg-purple-400",
    accentColor: "text-purple-500"
  },
  emerald: {
    badge: "bg-emerald-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    accentBg: "bg-emerald-400",
    accentColor: "text-emerald-500"
  },
  teal: {
    badge: "bg-teal-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]",
    accentBg: "bg-teal-400",
    accentColor: "text-teal-500"
  }
};

export function isSuperAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  if (user.uid === 'admin_master' || user.uid === 'user_admin_syed') return true;
  return false;
}


export interface IssuedCertificate {
  tenantId?: string;
  certificateId: string; // Unique Certificate ID e.g. CERT-ORG-22A91A0501-E87D
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue?: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  department?: string;
  year?: string;
  section?: string;
  issueDate: string;
  issuedAt: string;
  issuedBy?: string;
  status: 'Issued' | 'Verified' | 'Revoked';
  qrVerificationData?: string;
}

export interface EventWinner {
  tenantId?: string;
  winnerId: string;
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  department?: string;
  year?: string;
  section?: string;
  studentPhoto?: string;
  position: '1st Place' | '2nd Place' | '3rd Place' | 'Special Mention' | string;
  prizeTitle?: string; // e.g. "Gold Medalist / 1st Prize", "Runner-Up / 2nd Prize"
  awardDetails?: string; // e.g. "Cash Prize ₹5,000 + Certificate of Excellence"
  projectTitle?: string; // e.g. "AI Multi-Agent Diagnostic System"
  addedAt: string;
  addedBy?: string;
}

export type AuditAction = 
  | 'event.create' | 'event.update' | 'event.delete' | 'event.cascade_delete'
  | 'registration.create' | 'registration.update' | 'registration.delete'
  | 'user.create' | 'user.update' | 'user.delete' | 'user.role_change' | 'user.password_reset'
  | 'announcement.create' | 'announcement.update' | 'announcement.delete'
  | 'album.create' | 'album.update' | 'album.delete'
  | 'certificate.issue' | 'certificate.revoke' | 'certificate.delete'
  | 'winner.add' | 'winner.update' | 'winner.delete'
  | 'tenant.create' | 'tenant.update' | 'tenant.delete' | 'tenant.switch'
  | 'backup.restore' | 'backup.purge'
  | 'system.reset' | 'system.config_update'
  | 'auth.login' | 'auth.logout' | 'auth.unauthorized_attempt';

export interface AuditActor {
  uid: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin?: boolean;
}

export interface AuditLogEntry {
  logId: string;
  timestamp: string;
  action: AuditAction | string;
  actor: AuditActor;
  tenantId: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

export interface DeletedBackup {
  backupId: string;
  entityType: 'event' | 'event_cascade' | 'registration' | 'announcement' | 
              'album' | 'certificate' | 'user' | 'event_winner' | 
              'association_reset' | string;
  entityId: string;
  entityName?: string;
  originalCollection?: string;
  tenantId: string;
  deletedBy: AuditActor;
  deletedAt: string;
  originalData: any;
  cascadeChildren?: {
    registrations?: EventRegistration[];
    certificates?: IssuedCertificate[];
    winners?: EventWinner[];
    [key: string]: any;
  };
  metadata?: Record<string, any>;
  restoredAt?: string;
  restoredBy?: string;
}

export type SystemLogLevel = 'fatal' | 'error' | 'warn' | 'info';
export type SystemLogCategory = 'react_crash' | 'network' | 'storage' | 'database' | 'security' | 'general' | 'unhandled_window_error' | 'unhandled_promise_rejection';

export interface SystemLogContext {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  url: string;
  userAgent: string;
  isOnline: boolean;
  platform?: string;
  appVersion?: string;
  [key: string]: any;
}

export interface SystemLogEntry {
  logId: string;
  timestamp: string;
  level: SystemLogLevel;
  category: SystemLogCategory;
  message: string;
  errorName?: string;
  stackTrace?: string;
  componentStack?: string;
  context: SystemLogContext;
  hitCount?: number;
  resolved?: boolean;
}





