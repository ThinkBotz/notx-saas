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
  googleEmail?: string;
  powers?: AssociatePowers; // Admin assigns custom powers to associates
  assignedEvents?: string[]; // Admin assigns coordinators to specific events (array of eventIds)
  password?: string; // Stored password or temporary password
  isFirstLogin?: boolean;
  created_at: string;
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


export interface UserInvitation {
  tenantId?: string;
  invitationId: string;
  senderUid: string;
  senderName: string;
  senderRoll: string;
  recipientUid: string;
  recipientRoll: string;
  recipientName: string;
  message: string;
  status: 'Pending' | 'Accepted' | 'Declined';
  createdAt: string;
  type?: 'invite' | 'chat';
  isRead?: boolean;
}

export interface ChatRoom {
  tenantId?: string;
  chatId: string;
  participants: string[];
  messages: UserInvitation[];
  lastMessageAt: string;
  typing?: string[]; // Array of roll numbers currently typing
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
  isChatEnabled: boolean;
  isCertificatesEnabled?: boolean;
  certificateTemplate?: CertificateTemplate;
  supportInfo?: SupportInfo;
  branding?: AppBranding;
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




