import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Code, Award, Edit, Save, X, Eye, Lock, 
  FileBadge, Calendar, Settings, ArrowRight, QrCode, 
  MessageSquare, Camera, Sparkles, Grid, CheckCircle2, Clock, MapPin,
  PhoneCall, Edit3, ShieldCheck, Users, Smartphone, RefreshCw, Copy, ExternalLink
} from 'lucide-react';
import { checkForAppUpdates } from '../pwaUpdateManager';
import { UserProfile, EventRegistration, DepartmentEvent, SupportInfo, DEFAULT_SUPPORT_INFO, CertificateTemplate, DEFAULT_CERTIFICATE_TEMPLATE, IssuedCertificate, AppBranding, DEFAULT_BRANDING, Tenant } from '../types';
import CertificateCard from './CertificateCard';
import { 
  updateUserProfile,
  auth,
  subscribeToCertificates,
  generateCertificateId
} from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { CRAFTWORK_SPECIAL_DATA_URL } from '../lib/craftworkAvatar';
import { AvatarGalleryModal } from './AvatarGalleryModal';
import EditSupportBoxModal from './EditSupportBoxModal';
import CertificateRecipientsModal from './CertificateRecipientsModal';
import CertificateVerificationModal from './CertificateVerificationModal';
import EventTicketModal from './EventTicketModal';
import { hashPassword } from '../utils/auth';

interface ProfileViewProps {
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  registrations: EventRegistration[];
  events: DepartmentEvent[];
  allUsers: UserProfile[];
  onLogout: () => void;
  refreshUsers: () => void;
  onOpenAdminPanel: () => void;
  setActiveTab?: (tab: string) => void;
  supportInfo?: SupportInfo;
  onOpenSupportBox?: () => void;
  onOpenMembers?: () => void;
  onSupportInfoUpdated?: (info: SupportInfo) => void;
  isCertificatesEnabled?: boolean;
  certificateTemplate?: CertificateTemplate;
  branding?: AppBranding;
  activeTenantId?: string;
  activeTenant?: Tenant | null;
}

export default function ProfileView({ 
  user, 
  setUser, 
  registrations, 
  events, 
  allUsers,
  onLogout,
  refreshUsers,
  onOpenAdminPanel,
  setActiveTab,
  supportInfo,
  onOpenSupportBox,
  onOpenMembers,
  onSupportInfoUpdated,
  isCertificatesEnabled = true,
  certificateTemplate,
  branding = DEFAULT_BRANDING,
  activeTenantId,
  activeTenant
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditSupportModalOpen, setIsEditSupportModalOpen] = useState(false);
  const [currentSupportInfo, setCurrentSupportInfo] = useState<SupportInfo>(supportInfo || DEFAULT_SUPPORT_INFO);

  React.useEffect(() => {
    if (supportInfo) {
      setCurrentSupportInfo(supportInfo);
    }
  }, [supportInfo]);

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [year, setYear] = useState(user.year || '3rd Year');
  const [section, setSection] = useState(user.section || 'A');
  const [newPassword, setNewPassword] = useState('');
  const [phone, setPhone] = useState(user.phone || '');
  const [skills, setSkills] = useState(user.skills || '');
  const [linkedin, setLinkedin] = useState(user.linkedin || '');
  const [responsibilities, setResponsibilities] = useState(memberResponsibilities());
  const [profilePic, setProfilePic] = useState(user.profile_pic || '');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );

  // Craftwork / Userpic preset avatars
  const seed = user.rollNumber || user.uid || 'notx';
  const craftworkUserpics = [
    { label: 'Craftwork Special', url: CRAFTWORK_SPECIAL_DATA_URL },
    { label: 'Notionist 1', url: `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}` },
    { label: 'Notionist 2', url: `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}-v2` },
    { label: 'Lorelei', url: `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}` },
    { label: 'Open Peeps', url: `https://api.dicebear.com/9.x/open-peeps/svg?seed=${seed}` },
    { label: 'Avataaars', url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}` },
    { label: 'Adventurer', url: `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}` },
    { label: 'Micah', url: `https://api.dicebear.com/9.x/micah/svg?seed=${seed}` },
    { label: 'Personas', url: `https://api.dicebear.com/9.x/personas/svg?seed=${seed}` },
    { label: 'Bottts', url: `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}` },
    { label: 'Big Smile', url: `https://api.dicebear.com/9.x/big-smile/svg?seed=${seed}` },
    { label: 'Miniavs', url: `https://api.dicebear.com/9.x/miniavs/svg?seed=${seed}` },
  ];
  
  // Certificate view state & DB subscriptions
  const [activeCertEvent, setActiveCertEvent] = useState<DepartmentEvent | null>(null);
  const [dbCertificates, setDbCertificates] = useState<IssuedCertificate[]>([]);
  const [showPeersModal, setShowPeersModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyInitialId, setVerifyInitialId] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resolvedTenantId = activeTenantId || user.tenantId;

  useEffect(() => {
    const unsub = subscribeToCertificates((certs) => {
      setDbCertificates(certs);
    }, resolvedTenantId);
    return () => unsub();
  }, [resolvedTenantId]);

  const [activeTicket, setActiveTicket] = useState<{event: DepartmentEvent, registration: EventRegistration} | null>(null);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  
  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleEmail = result.user.email;
      
      await updateUserProfile(user.uid, { googleEmail });
      setUser({ ...user, googleEmail: googleEmail || undefined });
      refreshUsers();
      
      alert("Successfully connected Google Account: " + googleEmail);
    } catch (err: any) {
      if (err.code === 'auth/credential-already-in-use') {
        alert("This Google account is already linked to another user.");
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        alert("Failed to link Google account: " + err.message);
      }
      console.error("Google link error:", err);
    } finally {
      setIsLinkingGoogle(false);
    }
  };


  function memberResponsibilities() {
    if (user.role === 'admin') return user.responsibilities || 'Strategic oversight';
    if (user.role === 'associate') return user.responsibilities || 'Coordination and management';
    if (user.role === 'coordinator') return user.responsibilities || 'Event execution and coordination';
    return '';
  }

  const myRegs = registrations.filter(r => {
    if (r.studentId === user.uid) return true;
    if (user.rollNumber && r.rollNumber?.toLowerCase() === user.rollNumber.toLowerCase()) return true;
    if (user.rollNumber && r.teamMembers) {
      return r.teamMembers.some(m => m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase() && m.status !== 'Declined');
    }
    return false;
  });
  const attendedRegs = myRegs.filter(r => r.status === 'Attended');

  // Find associated events for attended registrations
  const attendedEvents = events.filter(e => 
    attendedRegs.some(r => r.eventId === e.eventId)
  );

  const handleSave = async () => {
    try {
      const updates: Partial<UserProfile> = {
        name,
        email,
        phone,
        year,
        section,
        skills,
        linkedin,
        profile_pic: profilePic,
        ...(user.role !== 'student' ? { responsibilities } : {})
      };

      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          alert('New password must be at least 6 characters long.');
          return;
        }
        updates.password = await hashPassword(newPassword.trim());
      }

      await updateUserProfile(user.uid, updates);
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      setNewPassword('');
      setIsEditing(false);
      refreshUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const defaultAvatar = `https://api.dicebear.com/9.x/notionists/svg?seed=${user.rollNumber || user.uid}`;
  const currentAvatar = isEditing ? (profilePic || defaultAvatar) : (user.profile_pic || defaultAvatar);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36 sm:pb-32 space-y-4 bg-background">
      
      {/* Profile Core Header */}
      <div 
        className="p-5 sm:p-6 rounded-lg bg-[var(--nb-surface)] text-center relative overflow-hidden"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
      >
        <div className="relative pt-1 flex flex-col items-center">
          <button 
            type="button"
            onClick={() => setIsEditing(true)}
            className="relative group cursor-pointer"
            title="Click to edit profile & change avatar"
          >
            <div 
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-md overflow-hidden p-[2px] bg-[var(--nb-surface-accent)]"
              style={{ border: '2px solid var(--nb-ink)' }}
            >
              <img 
                src={currentAvatar} 
                alt={user.name} 
                className="w-full h-full rounded-md object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div 
              className="absolute -bottom-1 -right-1 bg-[var(--nb-ink)] text-[var(--nb-bg)] p-1.5 rounded"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <Camera className="w-3.5 h-3.5" />
            </div>
          </button>

          <h3 className="nb-headline text-2xl mt-3 text-[var(--nb-content)]">{user.name}</h3>
          
          <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] uppercase ${
              user.role === 'admin' ? 'nb-pill-coral' :
              user.role === 'president' || user.role === 'associate' ? 'nb-pill-purple' :
              user.role === 'coordinator' ? 'nb-pill-blue' : 'nb-pill-green'
            }`}>
              {user.role}
            </span>
            {user.rollNumber && (
              <span className="nb-pill-yellow text-[10px] font-mono font-bold shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                {user.rollNumber}
              </span>
            )}
          </div>
          <p className="nb-label text-xs text-[var(--nb-secondary)] mt-1.5">
            {user.role === 'student' ? `${user.branch} • ${user.year}` : user.position}
          </p>
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onOpenMembers}
          className="nb-card-blue py-3 px-4 text-xs font-mono font-bold justify-center flex items-center gap-2 cursor-pointer shadow-[2.5px_2.5px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          <Users className="w-4 h-4 text-white" />
          <span>Members Directory</span>
        </button>
        <button 
          onClick={onOpenSupportBox}
          className="nb-card-pink py-3 px-4 text-xs font-mono font-bold justify-center flex items-center gap-2 cursor-pointer shadow-[2.5px_2.5px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          <PhoneCall className="w-4 h-4 text-white" />
          <span>Support Box</span>
        </button>
      </div>

      {/* EXECUTIVE COMMAND CENTER QUICK LINK */}
      {user.role !== 'student' && (
        <button 
          onClick={onOpenAdminPanel}
          className="w-full nb-btn py-3.5 px-5 text-xs font-bold tracking-wider flex items-center justify-between gap-2 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 text-left">
            <div 
              className="w-7 h-7 rounded bg-[var(--nb-ink)] text-[var(--nb-bg)] flex items-center justify-center flex-shrink-0"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold text-sm">Executive Control Desk</span>
              <span className="block text-[10px] text-inherit opacity-80">Manage Roles, Assignments & Attendance</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Action Tabs (Edit/Save) */}
      <div className="flex justify-between items-center px-0.5">
        <h4 className="nb-label text-[10px] text-[var(--nb-secondary)]">CONTACT & CORE SPECS</h4>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="nb-btn-ghost px-3 py-1 text-[11px] font-bold cursor-pointer"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <Edit className="w-3 h-3 text-[var(--nb-accent)]" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="nb-btn-ghost px-3 py-1 text-[11px] font-bold cursor-pointer"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="nb-btn px-3 py-1 text-[11px] font-bold cursor-pointer"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          </div>
        )}
      </div>

      {/* Editable Fields / Info card */}
      <div 
        className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
      >
        {/* Craftwork / Userpic Avatar Picker when Editing */}
        {isEditing && (
          <div className="pb-3 border-b border-[var(--nb-ink)]/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="nb-label text-[10px] text-[var(--nb-accent)]">CHOOSE AVATAR MODEL</span>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                className="nb-btn px-2.5 py-1 text-[10px] font-bold cursor-pointer"
              >
                <Grid className="w-3 h-3" />
                Browse 120+ Models
              </button>
            </div>
            
            <div className="grid grid-cols-6 gap-2 pt-1">
              {craftworkUserpics.map((pic) => {
                const isSelected = profilePic === pic.url || (!profilePic && pic.url === defaultAvatar);
                return (
                  <button
                    key={pic.label}
                    type="button"
                    onClick={() => setProfilePic(pic.url)}
                    className="relative rounded-md overflow-hidden aspect-square transition-transform p-1 bg-[var(--nb-surface-accent)] cursor-pointer"
                    style={{ 
                      border: isSelected ? '2px solid var(--nb-accent)' : '1.5px solid var(--nb-ink)',
                      transform: isSelected ? 'scale(1.05)' : 'none'
                    }}
                    title={pic.label}
                  >
                    <img src={pic.url} alt={pic.label} className="w-full h-full object-cover rounded" />
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <div className="flex-1">
                <label className="nb-label text-[9px] text-[var(--nb-secondary)] block mb-1">Custom Photo / Avatar URL</label>
                <input
                  type="text"
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  placeholder="https://..."
                  className="nb-input py-1 text-xs w-full font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                className="mt-4 nb-btn-ghost py-1 px-2.5 text-xs font-semibold cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <Sparkles className="w-3 h-3 text-[var(--nb-accent)]" />
                Full Gallery
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <User className="w-4 h-4 text-[var(--nb-secondary)] flex-shrink-0" />
          <div className="flex-1">
            <div className="nb-label text-[9px] text-[var(--nb-secondary)]">FULL NAME</div>
            {!isEditing ? (
              <div className="text-[var(--nb-content)] font-bold text-xs mt-0.5">{user.name}</div>
            ) : (
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="nb-input py-1 text-xs mt-1 w-full"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs border-t border-[var(--nb-ink)]/15 pt-2.5">
          <Mail className="w-4 h-4 text-[var(--nb-secondary)] flex-shrink-0" />
          <div className="flex-1">
            <div className="nb-label text-[9px] text-[var(--nb-secondary)]">EMAIL ADDRESS</div>
            {!isEditing ? (
              <div className="text-[var(--nb-secondary)] mt-0.5 font-mono text-xs">{user.email}</div>
            ) : (
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="nb-input py-1 text-xs mt-1 w-full font-mono"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs border-t border-[var(--nb-ink)]/15 pt-2.5">
          <Lock className="w-4 h-4 text-[var(--nb-secondary)] flex-shrink-0" />
          <div className="flex-1">
            <div className="nb-label text-[9px] text-[var(--nb-secondary)]">ACCESS PASSWORD</div>
            {!isEditing ? (
              <div className="text-[var(--nb-secondary)] mt-0.5 font-mono text-xs">•••••••• (Secured)</div>
            ) : (
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="nb-input py-1 text-xs mt-1 w-full font-mono"
                placeholder="Leave blank to keep current, or enter new (min 6 chars)"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs border-t border-[var(--nb-ink)]/15 pt-2.5">
          <Phone className="w-4 h-4 text-[var(--nb-secondary)] flex-shrink-0" />
          <div className="flex-1">
            <div className="nb-label text-[9px] text-[var(--nb-secondary)]">PHONE NUMBER</div>
            {!isEditing ? (
              <div className="text-[var(--nb-secondary)] mt-0.5 font-mono text-xs">{user.phone || 'Not added'}</div>
            ) : (
              <input 
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="nb-input py-1 text-xs mt-1 w-full font-mono"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--nb-ink)]/15 pt-2.5">
          <div className="text-xs">
            <div className="nb-label text-[9px] text-[var(--nb-secondary)]">YEAR</div>
            {!isEditing ? (
              <div className="text-[var(--nb-content)] font-bold mt-0.5 text-xs font-mono">{user.year || '3rd Year'}</div>
            ) : (
              <select 
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="nb-input py-1 text-xs mt-1 w-full"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            )}
          </div>
          <div className="text-xs">
            <div className="nb-label text-[9px] text-[var(--nb-secondary)]">SECTION</div>
            {!isEditing ? (
              <div className="text-[var(--nb-content)] font-bold mt-0.5 text-xs font-mono">{user.section || 'A'}</div>
            ) : (
              <input 
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="nb-input py-1 text-xs mt-1 w-full font-mono"
              />
            )}
          </div>
        </div>

        {user.role === 'student' ? (
          <div className="flex items-center gap-3 text-xs border-t border-[var(--nb-ink)]/15 pt-2.5">
            <Code className="w-4 h-4 text-[var(--nb-secondary)] flex-shrink-0" />
            <div className="flex-1">
              <div className="nb-label text-[9px] text-[var(--nb-secondary)]">TECHNICAL SKILLS</div>
              {!isEditing ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(user.skills || 'Add skills...').split(',').map((skill, i) => (
                    <span key={i} className="nb-tag text-[9px]">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <input 
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Python, ML, React"
                  className="nb-input py-1 text-xs mt-1 w-full"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-xs border-t border-[var(--nb-ink)]/15 pt-2.5">
            <Award className="w-4 h-4 text-[var(--nb-secondary)] flex-shrink-0" />
            <div className="flex-1">
              <div className="nb-label text-[9px] text-[var(--nb-secondary)]">EXECUTIVE ROLE & RESPONSIBILITIES</div>
              {!isEditing ? (
                <div className="text-[var(--nb-content)] mt-0.5 leading-relaxed text-xs">{user.responsibilities || 'Coordination'}</div>
              ) : (
                <textarea 
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  className="nb-input py-1 text-xs mt-1 w-full resize-none h-16"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* DIGITAL CHECK-IN PASS (LAMINATED BADGE FORMAT) */}
      {user.role !== 'admin' && user.rollNumber && (
        <div 
          className="bg-[var(--nb-surface)] rounded-xl relative overflow-hidden"
          style={{ border: '2.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
        >
          {/* Lanyard Clip Hole Representation */}
          <div className="pt-2.5 pb-1 flex justify-center bg-[var(--nb-surface-accent)] border-b border-[var(--nb-ink)]/15">
            <div 
              className="w-16 h-3 rounded-full bg-[var(--nb-ink)] mx-auto flex items-center justify-center"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--nb-surface)] opacity-30" />
            </div>
          </div>

          {/* Badge Top Header */}
          <div 
            className="p-3 flex justify-between items-center border-b-2 border-dashed border-[var(--nb-ink)]"
            style={{ backgroundColor: 'var(--tenant-hero-bg)', color: 'var(--tenant-hero-fg)' }}
          >
            <div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider block opacity-80">
                {activeTenant?.name?.toUpperCase() || (branding?.subtitle ? `${branding.subtitle.toUpperCase()} DEPARTMENT` : 'DEPARTMENT ASSOCIATION')}
              </span>
              <span className="font-display text-base tracking-wider leading-none">
                OFFICIAL STUDENT PASS
              </span>
            </div>
            <span className="nb-pill-green text-[9px] font-mono font-bold shadow-[1.5px_1.5px_0_var(--nb-ink)]">
              VERIFIED ID
            </span>
          </div>
          
          {/* Badge Card Body */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div 
              className="p-2.5 bg-white rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: '2px 2px 0 var(--nb-ink)' }}
            >
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=000000&bgcolor=ffffff&data=${encodeURIComponent(user.rollNumber.toUpperCase())}`} 
                alt="Student Registration QR Code" 
                className="w-28 h-28 select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h5 className="nb-headline text-xl text-[var(--nb-content)] truncate">{user.name}</h5>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="nb-pill-cyan text-[10px] font-mono font-bold shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                  {user.rollNumber}
                </span>
                <span className="nb-tag text-[9px] font-mono">
                  {user.year} ({user.section})
                </span>
              </div>

              {/* Barcode Graphic */}
              <div className="mt-3 pt-2 border-t border-[var(--nb-ink)]/15">
                <div className="flex items-center justify-center sm:justify-start gap-[2px] h-6 py-0.5 opacity-80">
                  {[2, 4, 1, 3, 2, 5, 1, 4, 2, 3, 1, 5, 2, 4, 1, 3, 5, 2, 1, 4, 3, 2, 4].map((width, idx) => (
                    <div 
                      key={idx} 
                      className="h-full bg-[var(--nb-ink)]"
                      style={{ width: `${width}px` }}
                    />
                  ))}
                </div>
                <p className="font-mono text-[8px] text-[var(--nb-tertiary)] tracking-widest mt-1">
                  NOTX-{(activeTenant?.shortCode || 'ORG').toUpperCase()}-PASS-{(user.rollNumber || user.uid || 'STU').slice(-6).toUpperCase()}-{new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>

          {/* Badge Footer Stamp */}
          <div className="bg-[var(--nb-surface-accent)] px-4 py-2 flex items-center justify-between border-t border-[var(--nb-ink)]/20 text-[10px] font-mono text-[var(--nb-secondary)]">
            <span className="flex items-center gap-1 font-bold">
              <QrCode className="w-3.5 h-3.5 text-[var(--nb-accent)]" /> Instant Venue Entry
            </span>
            <span className="uppercase text-[9px] font-bold">Admit One Only</span>
          </div>
        </div>
      )}

      {/* REGISTERED EVENTS STATUS TRACKER */}
      <div className="space-y-2">
        <h4 className="nb-label text-[10px] text-[var(--nb-secondary)] border-b border-[var(--nb-ink)]/20 pb-1.5">
          MY REGISTERED EVENTS ({myRegs.length})
        </h4>
        {myRegs.length === 0 ? (
          <div 
            className="bg-[var(--nb-surface)] p-5 text-center text-xs text-[var(--nb-secondary)] font-medium rounded-lg"
            style={{ border: '1.5px dashed var(--nb-ink)' }}
          >
            You haven't registered for any departmental event yet.
          </div>
        ) : (
          <div className="space-y-2">
            {myRegs.map((reg) => {
              const ev = events.find(e => e.eventId === reg.eventId);
              if (!ev) return null;
              return (
                <div 
                  key={reg.registrationId} 
                  onClick={() => setActiveTicket({ event: ev, registration: reg })} 
                  className="bg-[var(--nb-surface)] p-3 rounded-lg flex justify-between items-center gap-3 cursor-pointer hover:bg-[var(--nb-surface-accent)] transition-colors"
                  style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="min-w-0">
                    <h5 className="nb-headline text-sm text-[var(--nb-content)] truncate">{ev.title}</h5>
                    <p className="nb-label text-[9px] text-[var(--nb-secondary)] mt-0.5">{ev.date} • {ev.venue.split(',')[0]}</p>
                  </div>
                  <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] uppercase ${
                    reg.status === 'Attended' 
                      ? 'nb-pill-green' 
                      : reg.status === 'Absent' 
                      ? 'nb-pill-coral' 
                      : 'nb-pill-yellow'
                  }`}>
                    {reg.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DIGITAL E-CERTIFICATES LOG */}
      {user.role === 'student' && (
        <div className="space-y-3">
          {(() => {
            const certsWithStatus = attendedEvents.map((ev) => {
              const userCert = dbCertificates.find(c => 
                c.eventId === ev.eventId && 
                (c.studentId === user.uid || (user.rollNumber && c.rollNumber.toUpperCase() === user.rollNumber.toUpperCase()))
              );
              const isUnlocked = Boolean(userCert && userCert.status !== 'Revoked');
              const certId = userCert?.certificateId || '';
              const peersCount = dbCertificates.filter(c => c.eventId === ev.eventId).length;
              return { ev, userCert, isUnlocked, certId, peersCount };
            });

            const unlockedCerts = certsWithStatus.filter(c => c.isUnlocked);
            const lockedCerts = certsWithStatus.filter(c => !c.isUnlocked);

            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--nb-ink)]/20 pb-2 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="nb-label text-[10px] text-[var(--nb-secondary)] flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                      <span>CERTIFICATES ({unlockedCerts.length} ISSUED</span>
                      {lockedCerts.length > 0 && (
                        <span className="text-amber-500">• {lockedCerts.length} LOCKED</span>
                      )}
                      <span>)</span>
                    </h4>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyInitialId('');
                        setShowVerifyModal(true);
                      }}
                      className="nb-btn-ghost px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                      style={{ border: '1px solid var(--nb-ink)' }}
                      title="Verify any Certificate ID in institutional registry"
                    >
                      <ShieldCheck className="w-3 h-3 text-[var(--nb-accent)]" />
                      <span>Verify ID</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span className="nb-tag-accent text-[9px] font-bold">
                      🟢 {unlockedCerts.length} Unlocked
                    </span>
                    {lockedCerts.length > 0 && (
                      <span className="nb-tag text-[9px]">
                        🔒 {lockedCerts.length} Awaiting Batch
                      </span>
                    )}
                    {!isCertificatesEnabled && (
                      <span className="nb-tag text-[9px] bg-amber-500 text-black">
                        Feature Paused
                      </span>
                    )}
                  </div>
                </div>

                {!isCertificatesEnabled ? (
                  <div 
                    className="bg-[var(--nb-surface)] p-4 text-center rounded-lg space-y-1"
                    style={{ border: '2px solid var(--nb-ink)' }}
                  >
                    <FileBadge className="w-5 h-5 mx-auto text-[var(--nb-secondary)]" />
                    <span className="nb-headline text-sm block">E-Certificates Temporarily Paused</span>
                    <p className="text-[10px] text-[var(--nb-secondary)] max-w-xs mx-auto">
                      The department administration has temporarily paused certificate viewing. Please check back soon.
                    </p>
                  </div>
                ) : attendedEvents.length === 0 ? (
                  <div 
                    className="bg-[var(--nb-surface)] p-5 text-center text-xs text-[var(--nb-secondary)] font-medium rounded-lg flex flex-col items-center gap-1"
                    style={{ border: '1.5px dashed var(--nb-ink)' }}
                  >
                    <FileBadge className="w-5 h-5 mb-1" />
                    <span>Certificates are issued post attending events and admin authorization.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {certsWithStatus.map(({ ev, userCert, isUnlocked, certId, peersCount }) => {
                      if (!isUnlocked) {
                        // LOCKED STATE
                        return (
                          <div 
                            key={ev.eventId} 
                            className="bg-[var(--nb-surface)] p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden"
                            style={{ border: '1.5px dashed var(--nb-ink)' }}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div 
                                className="w-8 h-8 rounded bg-[var(--nb-surface-accent)] flex items-center justify-center shrink-0 mt-0.5"
                                style={{ border: '1px solid var(--nb-ink)' }}
                              >
                                <Lock className="w-4 h-4 text-amber-500" />
                              </div>

                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="nb-headline text-sm truncate">{ev.title}</h5>
                                  <span className="nb-tag text-[8.5px] bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                    Locked
                                  </span>
                                  <span className="nb-tag-accent text-[8.5px]">
                                    Attended
                                  </span>
                                </div>

                                <p className="text-[10px] text-[var(--nb-secondary)] leading-snug">
                                  Attendance verified. Waiting for department administration to generate the certificate batch.
                                </p>

                                <div className="nb-label text-[9px] text-[var(--nb-secondary)]">
                                  Event Date: {ev.date} • Venue: {ev.venue || 'Campus Auditorium'}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 self-end sm:self-center">
                              <span 
                                className="nb-btn-ghost px-3 py-1 text-[10px] opacity-60 cursor-not-allowed inline-flex items-center gap-1.5"
                                style={{ border: '1px solid var(--nb-ink)' }}
                              >
                                <Lock className="w-3 h-3 text-amber-500" />
                                <span>Awaiting Batch</span>
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // UNLOCKED STATE
                      return (
                        <div 
                          key={ev.eventId} 
                          className="bg-[var(--nb-surface)] p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden transition-transform hover:-translate-y-0.5"
                          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div 
                              className="w-8 h-8 rounded bg-[var(--nb-accent)] text-black flex items-center justify-center shrink-0 mt-0.5"
                              style={{ border: '1.5px solid var(--nb-ink)' }}
                            >
                              <FileBadge className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="nb-headline text-sm truncate">{ev.title}</h5>
                                <span className="nb-tag-accent text-[8.5px]">
                                  Official
                                </span>
                              </div>
                              
                              {/* Certificate ID Pill */}
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(certId);
                                    setCopiedId(certId);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] cursor-pointer transition-all active:scale-95"
                                  style={{ border: '1px solid var(--nb-ink)' }}
                                  title="Click to copy Certificate ID"
                                >
                                  <ShieldCheck className="w-2.5 h-2.5 text-[var(--nb-accent)]" />
                                  <span>ID: {certId}</span>
                                  {copiedId === certId ? (
                                    <span className="text-[var(--nb-accent)] font-bold">Copied!</span>
                                  ) : (
                                    <Copy className="w-2 h-2 text-[var(--nb-secondary)]" />
                                  )}
                                </button>

                                <span className="nb-label text-[9px] text-[var(--nb-secondary)]">
                                  Date: {ev.date}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button 
                              onClick={() => {
                                setActiveCertEvent(ev);
                                setShowPeersModal(true);
                              }}
                              className="nb-btn-ghost px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              style={{ border: '1.5px solid var(--nb-ink)' }}
                              title="See who else got this certificate"
                            >
                              <Users className="w-3 h-3 text-[var(--nb-accent)]" />
                              <span>Recipients</span>
                              {peersCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-[var(--nb-ink)] text-[var(--nb-bg)] font-mono text-[8px] font-bold">
                                  {peersCount}
                                </span>
                              )}
                            </button>

                            <button 
                              onClick={() => setActiveCertEvent(ev)}
                              className="nb-btn px-3 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* DYNAMIC DEPARTMENT SUPPORT BOX */}
      <div 
        className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3 relative overflow-hidden"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--nb-ink)]/20 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded bg-[var(--nb-surface-accent)] flex items-center justify-center text-[var(--nb-accent)]"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h4 className="nb-headline text-base text-[var(--nb-content)]">
                {currentSupportInfo.title || "Help & Support Desk"}
              </h4>
              <span className="nb-label text-[9px] text-[var(--nb-secondary)]">
                {currentSupportInfo.badge || "OFFICIAL CHANNELS"}
              </span>
            </div>
          </div>

          {user.role === 'admin' && (
            <button
              onClick={() => setIsEditSupportModalOpen(true)}
              className="nb-btn-ghost px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              style={{ border: '1.5px solid var(--nb-ink)' }}
              title="Admin: Edit dynamic Support Box details"
            >
              <Edit3 className="w-3 h-3 text-[var(--nb-accent)]" />
              <span>Edit Box</span>
            </button>
          )}
        </div>

        {currentSupportInfo.subtitle && (
          <p className="text-xs text-[var(--nb-secondary)] leading-relaxed">
            {currentSupportInfo.subtitle}
          </p>
        )}

        {/* Contact channels grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          <a 
            href={`mailto:${currentSupportInfo.email}`}
            className="bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-surface)] p-2.5 rounded flex items-center gap-2.5 transition-colors cursor-pointer"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <div 
              className="w-7 h-7 rounded bg-[var(--nb-surface)] flex items-center justify-center text-[var(--nb-accent)] shrink-0"
              style={{ border: '1px solid var(--nb-ink)' }}
            >
              <Mail className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="nb-label text-[9px] text-[var(--nb-secondary)]">EMAIL SUPPORT</div>
              <div className="text-xs text-[var(--nb-content)] font-mono font-medium truncate">
                {currentSupportInfo.email}
              </div>
            </div>
          </a>

          <a 
            href={`tel:${currentSupportInfo.phone.replace(/\s+/g, '')}`}
            className="bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-surface)] p-2.5 rounded flex items-center gap-2.5 transition-colors cursor-pointer"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <div 
              className="w-7 h-7 rounded bg-[var(--nb-surface)] flex items-center justify-center text-[var(--nb-accent)] shrink-0"
              style={{ border: '1px solid var(--nb-ink)' }}
            >
              <Phone className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="nb-label text-[9px] text-[var(--nb-secondary)]">HOTLINE</div>
              <div className="text-xs text-[var(--nb-content)] font-mono font-medium truncate">
                {currentSupportInfo.phone}
              </div>
            </div>
          </a>
        </div>

        {(currentSupportInfo.location || currentSupportInfo.timing) && (
          <div 
            className="p-2.5 rounded flex items-center gap-2 text-xs text-[var(--nb-secondary)] bg-[var(--nb-surface-accent)]"
            style={{ border: '1px solid var(--nb-ink)' }}
          >
            <MapPin className="w-3.5 h-3.5 text-[var(--nb-accent)] shrink-0" />
            <span className="truncate">
              {currentSupportInfo.location}
              {currentSupportInfo.timing ? ` • ${currentSupportInfo.timing}` : ''}
            </span>
          </div>
        )}

        {/* Button to open full query desk modal */}
        <button
          onClick={() => onOpenSupportBox ? onOpenSupportBox() : null}
          className="w-full nb-btn-ghost py-2.5 px-3 text-xs font-bold justify-center cursor-pointer"
          style={{ border: '1.5px solid var(--nb-ink)' }}
        >
          <MessageSquare className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
          <span>Open Full Support Desk & Submit Ticket</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>

      {/* GOOGLE ACCOUNT LINKING */}
      {true && (
        <div 
          className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-2.5"
          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--nb-ink)]/20 pb-2">
            <h4 className="nb-label text-[10px] text-[var(--nb-secondary)]">CONNECTED ACCOUNTS</h4>
          </div>
          <div className="pt-1">
            {user.googleEmail ? (
              <div 
                className="flex items-center gap-3 bg-[var(--nb-surface-accent)] p-3 rounded"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <div className="overflow-hidden">
                  <p className="nb-label text-[9px] text-[var(--nb-secondary)]">GOOGLE CONNECTED</p>
                  <p className="text-xs text-[var(--nb-content)] font-mono truncate">{user.googleEmail}</p>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLinkGoogle}
                disabled={isLinkingGoogle}
                className="w-full nb-btn-ghost flex items-center justify-center gap-2 text-xs font-bold !min-h-[44px] cursor-pointer"
              >
                {isLinkingGoogle ? (
                  <span className="w-4 h-4 rounded-full border-2 border-neutral-400 border-t-black animate-spin"></span>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span>Connect Google Account</span>
                  </>
                )}
              </button>
            )}
            <p className="nb-label text-[9px] text-[var(--nb-secondary)] mt-2 text-center">
              Link your Google account to enable easy sign-in.
            </p>
          </div>
        </div>
      )}

      {/* PWA & AUTO-UPDATE STATUS CARD */}
      <div 
        className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-8 h-8 rounded bg-[var(--nb-surface-accent)] flex items-center justify-center text-[var(--nb-accent)] shrink-0"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="nb-headline text-sm text-[var(--nb-content)]">PWA & APK Auto-Sync</span>
                <span className="nb-tag-accent text-[9px] font-bold">
                  Active
                </span>
              </div>
              <p className="text-[10px] text-[var(--nb-secondary)] truncate mt-0.5">
                {isStandalone ? 'Installed as Standalone App (Home Screen / APK)' : 'Running in Web Browser'}
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              setIsCheckingUpdate(true);
              setUpdateMessage(null);
              const res = await checkForAppUpdates();
              setIsCheckingUpdate(false);
              setUpdateMessage(res.message);
            }}
            disabled={isCheckingUpdate}
            className="nb-btn-ghost px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            Check
          </button>
        </div>

        {updateMessage && (
          <div 
            className="text-[10px] text-[var(--nb-content)] bg-[var(--nb-surface-accent)] p-2 rounded text-center"
            style={{ border: '1px solid var(--nb-ink)' }}
          >
            {updateMessage}
          </div>
        )}

        <div className="text-[10px] text-[var(--nb-secondary)] leading-relaxed border-t border-[var(--nb-ink)]/15 pt-2.5 flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--nb-accent)] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[var(--nb-content)] font-bold">Automatic Live Updates:</strong> When updates are published on the website, this installed app (iOS Home Screen & Android PWA APK) automatically syncs new changes upon opening.
          </span>
        </div>
      </div>

      {/* LOGOUT BUTTON */}
      <button 
        onClick={onLogout}
        className="w-full nb-btn-ghost text-xs !min-h-[44px] uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
        style={{ border: '2px solid var(--nb-ink)' }}
      >
        Sign Out Securely
      </button>

      {/* DIGITAL CERTIFICATE FULL SCREEN LIGHTBOX */}
      {activeCertEvent && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col justify-center items-center p-4 select-none">
          <div className="w-full max-w-lg flex flex-col justify-between max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex justify-end">
              <button 
                onClick={() => setActiveCertEvent(null)}
                className="w-9 h-9 rounded bg-[var(--nb-surface)] text-[var(--nb-content)] flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Digital Certificate */}
            <div className="w-full">
              {(() => {
                const userCert = dbCertificates.find(c => 
                  c.eventId === activeCertEvent.eventId && 
                  (c.studentId === user.uid || (user.rollNumber && c.rollNumber.toUpperCase() === user.rollNumber.toUpperCase()))
                );

                if (!userCert || userCert.status === 'Revoked') {
                  return (
                    <div 
                      className="bg-[var(--nb-surface)] p-6 text-center space-y-3 rounded-lg"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
                    >
                      <div 
                        className="w-12 h-12 rounded bg-[var(--nb-surface-accent)] text-amber-500 flex items-center justify-center mx-auto"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="nb-headline text-lg text-[var(--nb-content)]">Certificate is Locked</h4>
                      <p className="text-xs text-[var(--nb-secondary)] max-w-sm mx-auto leading-relaxed">
                        The department administrator has not generated the batch certificates for <strong>{activeCertEvent.title}</strong> yet.
                        Certificates are authorized in batches by the administrator after verifying attendance.
                      </p>
                      <button
                        onClick={() => setActiveCertEvent(null)}
                        className="nb-btn px-4 py-2 text-xs font-bold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  );
                }

                const certId = userCert.certificateId;
                const peersCount = dbCertificates.filter(c => c.eventId === activeCertEvent.eventId).length;

                return (
                  <div className="space-y-3">
                    <CertificateCard 
                      template={certificateTemplate || DEFAULT_CERTIFICATE_TEMPLATE}
                      studentName={user.name}
                      rollNumber={user.rollNumber || ''}
                      event={activeCertEvent}
                      certificateId={certId}
                      issueDate={userCert.issueDate || activeCertEvent.date}
                      onViewPeers={() => setShowPeersModal(true)}
                      peersCount={peersCount}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button 
                        onClick={() => setShowPeersModal(true)}
                        className="w-full nb-btn-ghost py-2.5 px-3 text-xs font-bold justify-center cursor-pointer"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <Users className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                        <span>See Who Else Got This</span>
                        {peersCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-[var(--nb-ink)] text-[var(--nb-bg)] font-mono text-[9px] font-bold">
                            {peersCount}
                          </span>
                        )}
                      </button>

                      <button 
                        onClick={() => {
                          setVerifyInitialId(certId);
                          setShowVerifyModal(true);
                        }}
                        className="w-full nb-btn-ghost py-2.5 px-3 text-xs font-bold justify-center cursor-pointer"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                        <span>Verify Credential ID</span>
                      </button>
                    </div>

                    <button 
                      onClick={() => window.print()}
                      className="w-full nb-btn py-2.5 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Download / Print PDF Certificate
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Certificate Recipients (Who Else Got This) Modal */}
      {showPeersModal && activeCertEvent && (
        <CertificateRecipientsModal
          isOpen={showPeersModal}
          onClose={() => setShowPeersModal(false)}
          eventTitle={activeCertEvent.title}
          eventDate={activeCertEvent.date}
          eventVenue={activeCertEvent.venue}
          certificates={dbCertificates.filter(c => c.eventId === activeCertEvent.eventId)}
          template={certificateTemplate || DEFAULT_CERTIFICATE_TEMPLATE}
        />
      )}

      {/* Certificate Verification Modal */}
      <CertificateVerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        initialId={verifyInitialId}
        template={certificateTemplate || DEFAULT_CERTIFICATE_TEMPLATE}
        activeTenant={activeTenant}
      />

      {/* Avatar Gallery Modal */}
      <AvatarGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectAvatar={(url) => setProfilePic(url)}
        currentUrl={profilePic || defaultAvatar}
        userSeed={seed}
      />

      {activeTicket && (
        <EventTicketModal
          event={activeTicket.event}
          registration={registrations.find(r => r.registrationId === activeTicket.registration.registrationId) || activeTicket.registration}
          user={user}
          onClose={() => setActiveTicket(null)}
          branding={branding}
        />
      )}

      {/* Edit Support Box Modal (Admin only) */}
      {user.role === 'admin' && (
        <EditSupportBoxModal
          isOpen={isEditSupportModalOpen}
          onClose={() => setIsEditSupportModalOpen(false)}
          currentInfo={currentSupportInfo}
          onSaved={(updated) => {
            setCurrentSupportInfo(updated);
            if (onSupportInfoUpdated) {
              onSupportInfoUpdated(updated);
            }
          }}
        />
      )}
    </div>
  );
}
