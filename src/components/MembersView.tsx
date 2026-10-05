import React, { useState, useMemo, useEffect } from 'react';
import { Mail, Linkedin, Shield, Award, Terminal, Heart, Calendar, Code2, Search, Filter, X, ChevronDown, FileText, Coins } from 'lucide-react';
import { 
  UserProfile, 
  DepartmentEvent, 
  AppBranding, 
  DEFAULT_BRANDING, 
  Tenant, 
  PlatformBuilder, 
  PlatformDevConfig, 
  DEFAULT_PLATFORM_BUILDERS, 
  DEFAULT_PLATFORM_DEV_CONFIG,
  DEV_COLOR_PRESETS
} from '../types';
import { subscribeToPlatformDevConfig } from '../firebase';

export { DEV_COLOR_PRESETS };

interface MembersViewProps {
  allUsers: UserProfile[];
  events: DepartmentEvent[];
  branding?: AppBranding;
  activeTenant?: Tenant | null;
  platformDevConfig?: PlatformDevConfig;
}

// Helper for hierarchical executive and lead ranking
const getExecutiveRank = (position?: string, role?: string): number => {
  if (role === 'president') return 1;
  const pos = (position || '').toLowerCase().trim();
  if (pos === 'president') return 1;
  if (pos.includes('vice president') || pos.includes('vp')) return 2;
  if (pos.includes('president')) return 1;
  if (pos.includes('general secretary') || pos.includes('gen sec')) return 3;
  if (pos.includes('joint secretary')) return 4;
  if (pos.includes('treasurer')) return 5;
  if (pos.includes('technical head') || pos.includes('technical lead') || pos.includes('tech lead')) return 10;
  if (pos.includes('event operations') || pos.includes('event lead') || pos.includes('event head')) return 11;
  if (pos.includes('pr &') || pos.includes('social media') || pos.includes('pr lead') || pos.includes('public relations')) return 12;
  if (pos.includes('design') || pos.includes('creative')) return 13;
  return 20;
};

const isExecutivePosition = (position?: string, role?: string): boolean => {
  if (role === 'president') return true;
  const pos = (position || '').toLowerCase().trim();
  return pos.includes('president') || pos.includes('secretary') || pos.includes('treasurer');
};

const getRoleBadgeStyle = (position?: string) => {
  const pos = (position || '').toLowerCase();
  if (pos.includes('president') && !pos.includes('vice')) {
    return 'bg-amber-400 text-neutral-950 font-bold';
  }
  if (pos.includes('vice president') || pos.includes('vp')) {
    return 'bg-yellow-300 text-neutral-950 font-bold';
  }
  if (pos.includes('general secretary') || pos.includes('secretary')) {
    return 'bg-emerald-400 text-neutral-950 font-bold';
  }
  if (pos.includes('treasurer')) {
    return 'bg-teal-300 text-neutral-950 font-bold';
  }
  if (pos.includes('technical') || pos.includes('tech')) {
    return 'bg-sky-400 text-neutral-950 font-bold';
  }
  if (pos.includes('event')) {
    return 'bg-indigo-300 text-neutral-950 font-bold';
  }
  if (pos.includes('pr') || pos.includes('social')) {
    return 'bg-pink-400 text-neutral-950 font-bold';
  }
  if (pos.includes('design') || pos.includes('creative')) {
    return 'bg-purple-300 text-neutral-950 font-bold';
  }
  return 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)] font-bold';
};

const LeaderMemberCard = ({ member }: { member: UserProfile }) => {
  const cleanName = member.name 
    ? member.name.replace(/\s*\([A-Za-z0-9]+\)\s*$/, '').trim() 
    : (member.rollNumber || 'Member');

  return (
    <div 
      className="bg-[var(--nb-surface)] p-3.5 rounded-lg flex items-start gap-3 transition-all h-full hover:border-[var(--nb-accent)] hover:shadow-[2.5px_2.5px_0_var(--nb-ink)]"
      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
    >
      {/* Avatar */}
      <div 
        className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-[var(--nb-surface-accent)] mt-0.5"
      >
        <img 
          src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
          alt={cleanName} 
          className="w-full h-full object-cover" 
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + Contact Actions */}
        <div className="flex items-center justify-between gap-1.5">
          <h5 className="nb-headline text-sm tracking-normal truncate text-[var(--nb-content)]">
            {cleanName}
          </h5>
          {(member.email || member.linkedin) && (
            <div className="flex items-center gap-1 shrink-0">
              {member.email && (
                <a 
                  href={`mailto:${member.email}`} 
                  className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-ink)] text-[var(--nb-content)] hover:text-[var(--nb-bg)] transition-colors cursor-pointer border border-[var(--nb-ink)]"
                  title="Send Email"
                >
                  <Mail className="w-3 h-3" />
                </a>
              )}
              {member.linkedin && (
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[#0A66C2] text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)]"
                  title="LinkedIn"
                >
                  <Linkedin className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Role Badge + Roll Number + Year */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span 
            className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded shrink-0 shadow-[1px_1px_0_#000] ${getRoleBadgeStyle(member.position)}`}
            style={{ border: '1px solid #000' }}
          >
            {member.position}
          </span>
          {member.rollNumber && (
            <span className="font-mono text-xs font-bold text-[var(--nb-content)] bg-[var(--nb-surface-accent)] px-1.5 py-0.5 rounded border border-[var(--nb-divider)] shrink-0">
              {member.rollNumber}
            </span>
          )}
          <span className="text-[10px] font-mono text-[var(--nb-secondary)]">
            • CSE (AI &amp; ML) {member.year ? `• ${member.year}` : ''}
          </span>
        </div>

        {/* Row 3: Responsibilities */}
        {member.responsibilities && (
          <p className="text-xs text-[var(--nb-secondary)] mt-1.5 leading-relaxed font-sans">
            {member.responsibilities.replace(/\s+\./g, '.').trim()}
          </p>
        )}
      </div>
    </div>
  );
};

export default function MembersView({ 
  allUsers, 
  events, 
  branding = DEFAULT_BRANDING, 
  activeTenant,
  platformDevConfig: propDevConfig 
}: MembersViewProps) {
  // Real-time synchronization of Super-Admin-configured platform builders
  const [internalDevConfig, setInternalDevConfig] = useState<PlatformDevConfig>(() => {
    if (propDevConfig) return propDevConfig;
    const cached = localStorage.getItem('notx_platform_devs');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return DEFAULT_PLATFORM_DEV_CONFIG;
  });

  useEffect(() => {
    if (propDevConfig) {
      setInternalDevConfig(propDevConfig);
      return;
    }
    const unsub = subscribeToPlatformDevConfig((config) => {
      setInternalDevConfig(config);
    });
    return () => unsub();
  }, [propDevConfig]);

  // 1. Patrons (Faculty / Admin)
  const rawPatrons = allUsers.filter(u => u.role === 'admin' && !u.isSuperAdmin && u.uid !== 'admin_master');
  const patrons = rawPatrons.filter((p, idx, arr) =>
    idx === arr.findIndex(t => (t.email && t.email.toLowerCase() === p.email?.toLowerCase()) || t.uid === p.uid)
  );

  // 2. Presidents Section: President first, then Vice President
  const presidents = allUsers
    .filter(u => {
      if (u.isSuperAdmin || u.uid === 'admin_master') return false;
      if (u.role === 'admin') return false;
      if (u.role === 'president') return true;
      const pos = (u.position || '').toLowerCase();
      return pos.includes('president');
    })
    .sort((a, b) => {
      const isVP_a = (a.position || '').toLowerCase().includes('vice') || (a.position || '').toLowerCase().includes('vp');
      const isVP_b = (b.position || '').toLowerCase().includes('vice') || (b.position || '').toLowerCase().includes('vp');
      if (!isVP_a && isVP_b) return -1;
      if (isVP_a && !isVP_b) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

  // 3. Secretaries Section: General Secretary, Joint Secretary
  const secretaries = allUsers
    .filter(u => {
      if (u.isSuperAdmin || u.uid === 'admin_master') return false;
      if (u.role === 'admin' || presidents.some(p => p.uid === u.uid)) return false;
      const pos = (u.position || '').toLowerCase();
      return pos.includes('secretary') || pos.includes('sec');
    })
    .sort((a, b) => {
      const isJoint_a = (a.position || '').toLowerCase().includes('joint');
      const isJoint_b = (b.position || '').toLowerCase().includes('joint');
      if (!isJoint_a && isJoint_b) return -1;
      if (isJoint_a && !isJoint_b) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

  // 4. Treasury Section: Treasurer
  const treasurers = allUsers
    .filter(u => {
      if (u.isSuperAdmin || u.uid === 'admin_master') return false;
      if (u.role === 'admin' || presidents.some(p => p.uid === u.uid) || secretaries.some(s => s.uid === u.uid)) return false;
      const pos = (u.position || '').toLowerCase();
      return pos.includes('treasurer') || pos.includes('finance');
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // 5. Technical & Media Team: Technical, Event Ops, PR, Design Leads and other associates
  const technicalAndMedia = allUsers
    .filter(u => {
      if (u.isSuperAdmin || u.uid === 'admin_master') return false;
      if (u.role !== 'associate') return false;
      if (presidents.some(p => p.uid === u.uid)) return false;
      if (secretaries.some(s => s.uid === u.uid)) return false;
      if (treasurers.some(t => t.uid === u.uid)) return false;
      return true;
    })
    .sort((a, b) => getExecutiveRank(a.position, a.role) - getExecutiveRank(b.position, b.role));

  const coordinators = allUsers.filter(u => !u.isSuperAdmin && u.uid !== 'admin_master' && u.role === 'coordinator');
  const generalBody = allUsers.filter(u => 
    !u.isSuperAdmin && u.uid !== 'admin_master' && 
    (!u.role || u.role === 'student')
  );

  // Search & Filter state for General Body
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');

  // Available filters from student registry
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    generalBody.forEach(u => { if (u.year) set.add(u.year.trim()); });
    return Array.from(set).sort();
  }, [generalBody]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    generalBody.forEach(u => { if (u.section) set.add(u.section.trim()); });
    return Array.from(set).sort();
  }, [generalBody]);

  // Filtered and natural-sorted students (by Roll Number)
  const filteredStudents = useMemo(() => {
    return generalBody
      .filter(u => {
        if (selectedYear !== 'ALL' && u.year?.trim() !== selectedYear) return false;
        if (selectedSection !== 'ALL' && u.section?.trim() !== selectedSection) return false;
        if (studentSearch.trim()) {
          const q = studentSearch.toLowerCase().trim();
          const matchesName = (u.name || '').toLowerCase().includes(q);
          const matchesRoll = (u.rollNumber || '').toLowerCase().includes(q);
          const matchesSkill = (u.skills || '').toLowerCase().includes(q);
          return matchesName || matchesRoll || matchesSkill;
        }
        return true;
      })
      .sort((a, b) => (a.rollNumber || a.name || '').localeCompare(b.rollNumber || b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [generalBody, selectedYear, selectedSection, studentSearch]);

  // Group coordinators by event
  const coordinatorsByEvent: Record<string, UserProfile[]> = {};
  coordinators.forEach(coord => {
    if (coord.assignedEvents && coord.assignedEvents.length > 0) {
      coord.assignedEvents.forEach(eventId => {
        if (!coordinatorsByEvent[eventId]) coordinatorsByEvent[eventId] = [];
        coordinatorsByEvent[eventId].push(coord);
      });
    } else {
      if (!coordinatorsByEvent['unassigned']) coordinatorsByEvent['unassigned'] = [];
      coordinatorsByEvent['unassigned'].push(coord);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-36 sm:pb-32 space-y-6 bg-[var(--nb-bg)] text-[var(--nb-content)]">
      
      {/* Title */}
      <div 
        className="p-4 rounded-lg bg-[var(--nb-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
      >
        <div>
          <h3 className="nb-headline text-xl leading-none">Association Directory</h3>
          <p className="nb-label text-xs mt-1 text-[var(--nb-secondary)]">
            Meet the thinkers and creators powering {branding.appName || activeTenant?.name || 'NOTX'} {branding.tagline || 'Connect'}
          </p>
        </div>
        <a
          href="/associates"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-500 text-neutral-950 font-mono text-xs font-black border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>LANYARD ID BADGES</span>
          <span>&rarr;</span>
        </a>
      </div>

      {/* 0. Platform Builders & Engineering Team (Globally Managed by Super Admin) */}
      {(() => {
        const devConfig = propDevConfig || internalDevConfig || DEFAULT_PLATFORM_DEV_CONFIG;
        const devMembers = devConfig.members && devConfig.members.length > 0 ? devConfig.members : DEFAULT_PLATFORM_BUILDERS;
        const appTitle = branding?.appName || activeTenant?.name || 'NOTX';
        const formattedSubtitle = (devConfig.subtitle || "The student team responsible for designing and developing the {appName} Connect portal").replace(/\{appName\}/g, appTitle);

        return (
          <div className="space-y-3">
            <div 
              className="p-3.5 rounded-lg bg-neutral-900 text-white flex items-center justify-between gap-3"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded bg-amber-400 text-neutral-900 flex items-center justify-center font-bold shrink-0"
                  style={{ border: '1.5px solid #000', boxShadow: '1.5px 1.5px 0 #000' }}
                >
                  <Code2 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="nb-headline text-base tracking-normal text-white">
                      {devConfig.sectionTitle || "Platform Builders & Developers"}
                    </h4>
                    <span className="bg-amber-400 text-neutral-900 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded shadow-[1.5px_1.5px_0_#000] uppercase tracking-wider hidden sm:inline-block">
                      {devConfig.badgeText || "DEV TEAM"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 font-sans mt-0.5">
                    {formattedSubtitle}
                  </p>
                </div>
              </div>
              <span className="bg-neutral-800 text-amber-400 text-xs font-mono font-bold px-2.5 py-1 rounded border border-neutral-700 shrink-0">
                {devMembers.length} MEMBERS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {devMembers.map((builder, idx) => {
                const matchingUser = allUsers.find(
                  u => (u.rollNumber && builder.rollNumber && u.rollNumber.toUpperCase() === builder.rollNumber.toUpperCase()) ||
                       (u.name && builder.name && u.name.toLowerCase().includes(builder.name.toLowerCase()))
                );
                const avatar = builder.profilePic || matchingUser?.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${builder.rollNumber || builder.name || idx}`;
                const email = builder.email || matchingUser?.email;
                const linkedin = builder.linkedin || matchingUser?.linkedin;
                const github = builder.github || (matchingUser as any)?.github;

                const preset = builder.badgeColor && DEV_COLOR_PRESETS[builder.badgeColor] ? DEV_COLOR_PRESETS[builder.badgeColor] : null;
                const badgeStyle = builder.badgeStyle || preset?.badge || "bg-amber-400 text-neutral-900 font-extrabold shadow-[1.5px_1.5px_0_#000]";
                const accentBg = builder.accentBg || preset?.accentBg || "bg-amber-400";

                return (
                  <div 
                    key={builder.id || builder.rollNumber || idx}
                    className="bg-[var(--nb-surface)] p-3.5 rounded-lg flex items-start gap-3 transition-all relative overflow-hidden hover:border-[var(--nb-accent)] hover:shadow-[2.5px_2.5px_0_var(--nb-ink)]"
                    style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                  >
                    {/* Top colored accent indicator strip */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${accentBg}`} />

                    {/* Avatar */}
                    <div 
                      className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-[var(--nb-surface-accent)] mt-0.5"
                    >
                      <img 
                        src={avatar} 
                        alt={builder.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Name + Contact Actions */}
                      <div className="flex items-center justify-between gap-1.5">
                        <h5 className="nb-headline text-sm tracking-normal truncate text-[var(--nb-content)]">
                          {builder.name}
                        </h5>
                        {(email || linkedin || github) && (
                          <div className="flex items-center gap-1 shrink-0">
                            {github && (
                              <a 
                                href={github.startsWith('http') ? github : `https://${github}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-neutral-800 text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)]"
                                title="GitHub"
                              >
                                <Terminal className="w-3 h-3" />
                              </a>
                            )}
                            {email && (
                              <a 
                                href={`mailto:${email}`} 
                                className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-ink)] text-[var(--nb-content)] hover:text-[var(--nb-bg)] transition-colors cursor-pointer border border-[var(--nb-ink)]"
                                title="Send Email"
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                            {linkedin && (
                              <a 
                                href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[#0A66C2] text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)]"
                                title="LinkedIn"
                              >
                                <Linkedin className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Row 2: Role Badge + Roll Number + Department */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span 
                          className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${badgeStyle}`}
                          style={{ border: '1px solid #000' }}
                        >
                          {builder.badge}
                        </span>
                        {builder.rollNumber && (
                          <span className="font-mono text-xs font-bold text-[var(--nb-content)] bg-[var(--nb-surface-accent)] px-1.5 py-0.5 rounded border border-[var(--nb-divider)]">
                            {builder.rollNumber}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[var(--nb-secondary)]">
                          • {builder.department || builder.role || 'CSE (AI & ML)'}
                        </span>
                      </div>

                      {/* Row 3: Bio / Specialty */}
                      {(builder.specialty || builder.bio) && (
                        <p className="text-xs text-[var(--nb-secondary)] mt-1.5 leading-relaxed font-sans line-clamp-2">
                          {builder.specialty || builder.bio}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 1. Patrons / Faculty Advisor */}
      {patrons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-coral)] text-white"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Shield className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-base tracking-normal">Patrons &amp; Faculty Advisory</h4>
            <span className="nb-pill-coral text-xs ml-auto font-mono px-2 py-0.5 rounded">{patrons.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patrons.map(member => (
              <div 
                key={member.uid} 
                className="bg-[var(--nb-surface)] p-3.5 rounded-lg flex items-start gap-3 transition-all h-full hover:border-[var(--nb-accent)] hover:shadow-[2.5px_2.5px_0_var(--nb-ink)]"
                style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                {/* Avatar */}
                <div 
                  className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-[var(--nb-surface-accent)] mt-0.5"
                >
                  <img 
                    src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
                    alt={member.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Name + Contact Actions */}
                  <div className="flex items-center justify-between gap-1.5">
                    <h5 className="nb-headline text-sm tracking-normal truncate text-[var(--nb-content)]">
                      {member.name}
                    </h5>
                    {(member.email || member.linkedin) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {member.email && (
                          <a 
                            href={`mailto:${member.email}`} 
                            className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-ink)] text-[var(--nb-content)] hover:text-[var(--nb-bg)] transition-colors cursor-pointer border border-[var(--nb-ink)]"
                            title="Send Email"
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                        )}
                        {member.linkedin && (
                          <a 
                            href={member.linkedin} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-6 h-6 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[#0A66C2] text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)]"
                            title="LinkedIn"
                          >
                            <Linkedin className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Position + Department */}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span 
                      className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                      style={{ border: '1px solid #000' }}
                    >
                      {member.position}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--nb-secondary)]">
                      • {member.department || 'CSE (AI & ML)'}
                    </span>
                  </div>

                  {/* Row 3: Responsibilities */}
                  {member.responsibilities && (
                    <p className="text-xs text-[var(--nb-secondary)] mt-1.5 leading-relaxed font-sans">
                      {member.responsibilities.replace(/\s+\./g, '.').trim()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Presidents & Vice Presidents */}
      {presidents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-yellow)] text-neutral-900"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Award className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-base tracking-normal">President &amp; Vice President</h4>
            <span className="nb-pill-yellow text-xs ml-auto font-mono px-2 py-0.5 rounded">{presidents.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presidents.map(member => (
              <LeaderMemberCard key={member.uid} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Secretaries (General Secretary & Joint Secretary) */}
      {secretaries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-emerald-500 text-neutral-950"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <FileText className="w-3.5 h-3.5 text-neutral-950" />
            </div>
            <h4 className="nb-headline text-base tracking-normal">Secretaries</h4>
            <span className="nb-pill-green text-xs ml-auto font-mono px-2 py-0.5 rounded">{secretaries.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {secretaries.map(member => (
              <LeaderMemberCard key={member.uid} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* 4. Treasury (Treasurer) */}
      {treasurers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-teal-400 text-neutral-950"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Coins className="w-3.5 h-3.5 text-neutral-950" />
            </div>
            <h4 className="nb-headline text-base tracking-normal">Treasurer</h4>
            <span className="nb-pill-purple text-xs ml-auto font-mono px-2 py-0.5 rounded">{treasurers.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {treasurers.map(member => (
              <LeaderMemberCard key={member.uid} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* 5. Technical & Media Team */}
      {technicalAndMedia.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-blue)] text-white"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-base tracking-normal">Technical &amp; Media Team</h4>
            <span className="nb-pill-blue text-xs ml-auto font-mono px-2 py-0.5 rounded">{technicalAndMedia.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {technicalAndMedia.map(member => (
              <LeaderMemberCard key={member.uid} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Coordinators by Event */}
      {coordinators.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-purple)] text-[var(--nb-purple-fg)]"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-base tracking-normal">Event Coordinators</h4>
            <span className="nb-pill-purple text-xs ml-auto font-mono px-2 py-0.5 rounded">{coordinators.length}</span>
          </div>

          <div className="space-y-4">
            {Object.entries(coordinatorsByEvent).map(([eventId, eventCoordinators]) => {
              const event = events.find(e => e.eventId === eventId);
              const title = event ? event.title : (eventId === 'unassigned' ? 'General Coordinators' : 'Unknown Event');
              
              return (
                <div 
                  key={eventId} 
                  className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <h5 className="nb-headline text-xs font-bold text-[var(--nb-content)] uppercase tracking-wider border-b border-[var(--nb-divider)] pb-2">
                    {title}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {eventCoordinators.map(member => {
                      const cleanName = member.name 
                        ? member.name.replace(/\s*\([A-Za-z0-9]+\)\s*$/, '').trim() 
                        : (member.rollNumber || 'Member');

                      return (
                        <div 
                          key={member.uid} 
                          className="flex items-start gap-2.5 p-2.5 rounded-md bg-[var(--nb-surface-accent)] transition-all h-full hover:border-[var(--nb-accent)]"
                          style={{ border: '1.5px solid var(--nb-ink)' }}
                        >
                          {/* Avatar */}
                          <div 
                            className="w-11 h-11 rounded-md overflow-hidden shrink-0 bg-[var(--nb-surface)] mt-0.5"
                          >
                            <img 
                              src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
                              alt={cleanName} 
                              className="w-full h-full object-cover" 
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Row 1: Name + Contact Actions */}
                            <div className="flex items-center justify-between gap-1.5">
                              <h6 className="nb-headline text-xs tracking-normal truncate text-[var(--nb-content)]">
                                {cleanName}
                              </h6>
                            {(member.email || member.linkedin) && (
                              <div className="flex items-center gap-1 shrink-0">
                                {member.email && (
                                  <a 
                                    href={`mailto:${member.email}`} 
                                    className="w-5 h-5 rounded flex items-center justify-center bg-[var(--nb-surface)] hover:bg-[var(--nb-ink)] text-[var(--nb-content)] hover:text-[var(--nb-bg)] transition-colors cursor-pointer border border-[var(--nb-ink)]"
                                    title="Send Email"
                                  >
                                    <Mail className="w-2.5 h-2.5" />
                                  </a>
                                )}
                                {member.linkedin && (
                                  <a 
                                    href={member.linkedin} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-5 h-5 rounded flex items-center justify-center bg-[var(--nb-surface)] hover:bg-[#0A66C2] text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-ink)]"
                                    title="LinkedIn"
                                  >
                                    <Linkedin className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Row 2: Role Badge + Roll Number + Year */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span 
                              className="nb-pill-purple text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                              style={{ border: '1px solid #000' }}
                            >
                              {member.position}
                            </span>
                            {member.rollNumber && (
                              <span className="font-mono text-[11px] font-bold text-[var(--nb-accent)]">
                                {member.rollNumber}
                              </span>
                            )}
                            {member.year && (
                              <span className="text-[10px] font-mono text-[var(--nb-secondary)]">
                                • {member.year}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. General Body */}
      {generalBody.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-green)] text-white"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Heart className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-base tracking-normal">Active Student Registry</h4>
            <span className="nb-pill-green text-xs ml-auto font-mono px-2 py-0.5 rounded">
              {filteredStudents.length} {filteredStudents.length !== generalBody.length ? `/ ${generalBody.length}` : ''}
            </span>
          </div>

          {/* Search & Filters Bar */}
          <div className="flex flex-col md:flex-row gap-1.5 bg-[var(--nb-surface)] p-1.5 rounded-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, roll no, or skills..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-7 py-1 text-xs font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] placeholder:text-stone-400 placeholder:font-normal outline-none focus:border-[var(--nb-accent)] transition-colors"
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => setStudentSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            {(availableYears.length > 0 || availableSections.length > 0) && (
              <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0">
                {availableYears.length > 0 && (
                  <div className="relative flex-1 md:flex-initial min-w-0">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full md:w-auto h-8 pl-2.5 pr-8 py-1 text-xs font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] cursor-pointer appearance-none outline-none focus:border-[var(--nb-accent)] transition-colors"
                    >
                      <option value="ALL">All Years</option>
                      {availableYears.map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
                  </div>
                )}

                {availableSections.length > 0 && (
                  <div className="relative flex-1 md:flex-initial min-w-0">
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full md:w-auto h-8 pl-2.5 pr-8 py-1 text-xs font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] cursor-pointer appearance-none outline-none focus:border-[var(--nb-accent)] transition-colors"
                    >
                      <option value="ALL">All Sections</option>
                      {availableSections.map(sec => (
                        <option key={sec} value={sec}>Sec {sec}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] pointer-events-none" />
                  </div>
                )}

                {(selectedYear !== 'ALL' || selectedSection !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => { setSelectedYear('ALL'); setSelectedSection('ALL'); }}
                    className="h-8 px-2.5 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] text-[10px] font-mono font-bold uppercase tracking-wider border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)] shrink-0 cursor-pointer transition-all"
                    title="Reset dropdown filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Student Grid */}
          {filteredStudents.length === 0 ? (
            <div 
              className="p-6 text-center rounded-lg bg-[var(--nb-surface)] border-2 border-dashed border-[var(--nb-divider)] text-xs text-[var(--nb-secondary)]"
            >
              <p>No students found matching your search or filters.</p>
              {(studentSearch || selectedYear !== 'ALL' || selectedSection !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setStudentSearch(''); setSelectedYear('ALL'); setSelectedSection('ALL'); }}
                  className="mt-3 nb-btn-ghost text-xs px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {filteredStudents.map(member => {
                const isDefaultName = !member.name || member.name.toLowerCase().startsWith('student');
                const displayName = isDefaultName ? (member.name.replace(/\s*\([^)]*\)/, '').trim() || 'Student') : member.name;

                return (
                  <div 
                    key={member.uid} 
                    className="bg-[var(--nb-surface)] p-2.5 rounded-md flex items-center gap-2.5 transition-all hover:border-[var(--nb-accent)] hover:shadow-[2px_2px_0_var(--nb-ink)]"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                    title={`${displayName} (${member.rollNumber || 'N/A'})${member.section ? ` • Sec ${member.section}` : ''}${member.year ? ` • ${member.year}` : ''}${member.skills ? ` • Skills: ${member.skills}` : ''}`}
                  >
                    <div 
                      className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-[var(--nb-surface-accent)]"
                    >
                      <img 
                        src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
                        alt={member.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                      {/* Row 1: Student Name + Section / Skills */}
                      <div className="flex items-center justify-between gap-1.5">
                        <h5 className="nb-headline text-xs tracking-normal truncate text-[var(--nb-content)]">
                          {displayName}
                        </h5>
                        <div className="flex items-center gap-1 shrink-0">
                          {member.skills && (
                            <span 
                              className="text-[9px] font-mono bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 max-w-[65px] truncate"
                              title={`Skills: ${member.skills}`}
                            >
                              {member.skills.split(',')[0].trim()}
                            </span>
                          )}
                          {member.section && (
                            <span className="text-[9.5px] font-mono font-bold text-[var(--nb-secondary)] bg-[var(--nb-surface-accent)] px-1.5 py-0.5 rounded border border-[var(--nb-divider)]">
                              Sec {member.section}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Roll Number + Academic Year */}
                      <div className="flex items-center justify-between gap-1.5 text-[11px] leading-tight">
                        <span className="font-mono font-bold text-xs text-[var(--nb-accent)] whitespace-nowrap shrink-0">
                          {member.rollNumber || 'N/A'}
                        </span>
                        {member.year && (
                          <span className="text-[10px] font-mono text-[var(--nb-secondary)] shrink-0">
                            {member.year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
