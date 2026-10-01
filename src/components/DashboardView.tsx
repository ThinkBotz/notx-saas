import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  Award, 
  BookOpen, 
  ChevronRight, 
  Volume2, 
  Sparkles, 
  AlertCircle, 
  Bookmark, 
  Flame,
  ShieldCheck,
  GraduationCap,
  Hash,
  Cpu,
  Trophy,
  Medal,
  Plus,
  Trash2,
  Star,
  CheckCircle2,
  Edit3,
  Eye,
  Search,
  X,
  Filter
} from 'lucide-react';
import { UserProfile, DepartmentEvent, Announcement, EventRegistration, EventWinner, Tenant, AppBranding } from '../types';
import { subscribeToEventWinners, deleteEventWinner } from '../firebase';
import AddEventWinnerModal from './AddEventWinnerModal';
import WinnerDetailsModal from './WinnerDetailsModal';
import HoldButton from './HoldButton';

interface DashboardViewProps {
  user: UserProfile;
  allUsers?: UserProfile[];
  events: DepartmentEvent[];
  announcements: Announcement[];
  registrations: EventRegistration[];
  onNavigate: (tab: string) => void;
  onSelectEvent: (event: DepartmentEvent) => void;
  isLoading?: boolean;
  activeTenantId?: string;
  activeTenant?: Tenant | null;
  branding?: AppBranding;
}

export default function DashboardView({ 
  user, 
  allUsers = [],
  events, 
  announcements, 
  registrations, 
  onNavigate,
  onSelectEvent,
  isLoading = false,
  activeTenantId,
  activeTenant,
  branding
}: DashboardViewProps) {
  const [winners, setWinners] = useState<EventWinner[]>([]);
  const [isAddWinnerOpen, setIsAddWinnerOpen] = useState(false);
  const [winnerToEdit, setWinnerToEdit] = useState<EventWinner | null>(null);
  const [winnerToView, setWinnerToView] = useState<EventWinner | null>(null);
  const [winnerToDelete, setWinnerToDelete] = useState<EventWinner | null>(null);
  const [isDeletingWinner, setIsDeletingWinner] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Search and filter for Wall of Champions
  const [winnerSearch, setWinnerSearch] = useState('');
  const [winnerRankFilter, setWinnerRankFilter] = useState<'all' | '1st' | '2nd' | '3rd' | 'Special'>('all');

  const resolvedTenantId = activeTenantId || user.tenantId;

  useEffect(() => {
    const unsub = subscribeToEventWinners((fetchedWinners) => {
      setWinners(fetchedWinners);
    }, resolvedTenantId);
    return () => unsub();
  }, [resolvedTenantId]);

  const canManageWinners = user.role === 'admin' || user.role === 'president' || (user.role === 'associate' && user.powers?.canManageEvents);

  const handleOpenAdd = () => {
    setWinnerToEdit(null);
    setIsAddWinnerOpen(true);
  };

  const handleOpenEdit = (w: EventWinner) => {
    setWinnerToEdit(w);
    setIsAddWinnerOpen(true);
  };

  const confirmDeleteWinner = async () => {
    if (!winnerToDelete) return;
    setIsDeletingWinner(true);
    try {
      await deleteEventWinner(winnerToDelete.winnerId);
      setToastMessage(`Champion record for "${winnerToDelete.studentName}" was removed from the Wall of Fame.`);
      setTimeout(() => setToastMessage(null), 3500);
      setWinnerToDelete(null);
    } catch (err) {
      console.error("Failed to delete event winner:", err);
    } finally {
      setIsDeletingWinner(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36 sm:pb-32 space-y-4 select-none">
        {/* Shimmer Welcoming Card */}
        <div className="relative rounded-lg bg-[var(--nb-surface)] p-4 border-2 border-[var(--nb-ink)] overflow-hidden animate-pulse">
          <div className="flex items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-13 h-13 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4.5 w-36 bg-surface-accent rounded-md" />
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-16 bg-surface-accent rounded-lg" />
                  <div className="h-4 w-20 bg-surface-accent/60 rounded-lg" />
                  <div className="h-4 w-24 bg-surface-accent/60 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="hidden sm:block w-10 h-10 rounded-xl bg-surface-accent/60" />
          </div>
        </div>

        {/* Shimmer Upcoming Events Carousel */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <div className="h-3 w-28 bg-surface-accent rounded animate-pulse" />
            <div className="h-3 w-12 bg-surface-accent/60 rounded animate-pulse" />
          </div>
          <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none">
            {[1, 2].map((i) => (
              <div key={i} className="w-[240px] flex-shrink-0 bg-[var(--nb-surface)] rounded-lg border-2 border-[var(--nb-ink)] overflow-hidden animate-pulse">
                <div className="h-24 bg-surface-accent" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 w-3/4 bg-surface-accent rounded" />
                  <div className="flex justify-between items-center pt-1">
                    <div className="h-2.5 w-16 bg-surface-accent/60 rounded" />
                    <div className="h-3 w-16 bg-surface-accent/60 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // User registrations lookup
  const myRegs = registrations.filter(r => {
    if (r.studentId === user.uid) return true;
    if (user.rollNumber && r.rollNumber?.toLowerCase() === user.rollNumber.toLowerCase()) return true;
    if (user.rollNumber && r.teamMembers) {
      return r.teamMembers.some(m => m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase() && m.status !== 'Declined');
    }
    return false;
  });

  // Upcoming active events
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 3);

  // Latest notices
  const recentAnnouncements = [...announcements]
    .sort((a, b) => {
      const tsA = parseInt(a.announcementId.split('_')[1] || '0', 10);
      const tsB = parseInt(b.announcementId.split('_')[1] || '0', 10);
      if (tsA && tsB) return tsB - tsA;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-5 bg-[var(--nb-bg)] text-[var(--nb-content)]">

      {/* ── WELCOME HERO STRIP (BOLD DYNAMIC MULTI-TENANT BRAND BLOCK) ── */}
      <div
        className="flex items-center gap-4 p-4 sm:p-5 rounded-lg nb-tenant-hero"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-[var(--nb-surface-accent)]"
            style={{ border: '2px solid var(--nb-ink)' }}
          >
            <img
              src={user.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.rollNumber || user.uid}`}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Online dot */}
          <span
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
            style={{ border: '2px solid var(--nb-ink)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--nb-surface)]" />
          </span>
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-extrabold tracking-wider uppercase opacity-90" style={{ color: 'var(--tenant-hero-fg)' }}>
            GOOD {new Date().getHours() < 12 ? 'MORNING' : new Date().getHours() < 18 ? 'AFTERNOON' : 'EVENING'}
          </p>
          <h2
            className="nb-headline leading-none truncate"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', color: 'var(--tenant-hero-fg)' }}
          >
            {user.name}!
          </h2>
          {/* Badge row */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className={`nb-pill-${user.role === 'admin' ? 'coral' : user.role === 'associate' ? 'purple' : 'blue'} text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold text-white border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)]`}>
              {user.role === 'admin' ? <ShieldCheck className="w-3 h-3 text-white" /> : user.role === 'associate' ? <Award className="w-3 h-3 text-white" /> : <GraduationCap className="w-3 h-3 text-white" />}
              {user.role.toUpperCase()}
            </span>
            {user.rollNumber && (
              <span className="nb-pill-green text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono font-bold text-neutral-900 border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                <Hash className="w-3 h-3 text-neutral-900" />
                {user.rollNumber}
              </span>
            )}
            {user.role === 'student' && (user.year || user.section) ? (
              <span className="nb-pill-pink text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold text-white border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                <BookOpen className="w-3 h-3 text-white" />
                {user.year}{user.section ? ` · SEC ${user.section}` : ''}
              </span>
            ) : user.position ? (
              <span className="nb-pill-cyan text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold text-neutral-900 border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                <Award className="w-3 h-3 text-neutral-900" />
                {user.position}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── 4-CARD BOLD COLOR STATS GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => onNavigate('events')}
          className="nb-card-blue p-3.5 rounded-lg flex flex-col justify-between cursor-pointer transition-transform hover:-translate-y-0.5 select-none"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-black tracking-wider text-white uppercase">TOTAL EVENTS</span>
            <Calendar className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <div className="nb-headline text-2xl sm:text-3xl text-white">{events.length}</div>
          <span className="text-[10px] font-bold text-white mt-1 uppercase font-mono tracking-wider">Campus Events →</span>
        </div>

        <div 
          onClick={() => onNavigate('events')}
          className="nb-card-green p-3.5 rounded-lg flex flex-col justify-between cursor-pointer transition-transform hover:-translate-y-0.5 select-none"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-black tracking-wider text-white uppercase">REGISTERED</span>
            <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <div className="nb-headline text-2xl sm:text-3xl text-white">{myRegs.length}</div>
          <span className="text-[10px] font-bold text-white mt-1 uppercase font-mono tracking-wider">My Passes →</span>
        </div>

        <div 
          onClick={() => onNavigate('announcements')}
          className="nb-card-coral p-3.5 rounded-lg flex flex-col justify-between cursor-pointer transition-transform hover:-translate-y-0.5 select-none"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-black tracking-wider text-white uppercase">NOTICES</span>
            <Volume2 className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <div className="nb-headline text-2xl sm:text-3xl text-white">{announcements.length}</div>
          <span className="text-[10px] font-bold text-white mt-1 uppercase font-mono tracking-wider">Bulletins →</span>
        </div>

        <div 
          onClick={() => {
            const el = document.getElementById('wall-of-champions');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="nb-card-purple p-3.5 rounded-lg flex flex-col justify-between cursor-pointer transition-transform hover:-translate-y-0.5 select-none"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-black tracking-wider text-white uppercase">CHAMPIONS</span>
            <Trophy className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <div className="nb-headline text-2xl sm:text-3xl text-white">{winners.length}</div>
          <span className="text-[10px] font-bold text-white mt-1 uppercase font-mono tracking-wider">Wall of Fame →</span>
        </div>
      </div>

      {/* â”€â”€ WALL OF CHAMPIONS â”€â”€ */}
      <div id="wall-of-champions" className="space-y-3">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: '#F59E0B', border: '1.5px solid var(--nb-ink)', color: '#1A1A1A' }}
            >
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="nb-headline text-sm" style={{ color: 'var(--nb-content)' }}>
                Wall of Champions
              </h3>
              {winners.length > 0 && (
                <span className="nb-tag text-[11px]">
                  {winners.length} {winners.length === 1 ? 'Champion' : 'Champions'}
                </span>
              )}
            </div>
          </div>

          {canManageWinners && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="nb-btn text-[11px] py-2 px-4 self-end sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Winner
            </button>
          )}
        </div>

        {/* Search + rank filter bar */}
        {winners.length > 0 && (
          <div
            className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5"
            style={{ border: '1.5px solid var(--nb-ink)', borderRadius: '8px', background: 'var(--nb-surface)' }}
          >
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nb-tertiary)' }} />
              <input
                type="text"
                value={winnerSearch}
                onChange={(e) => setWinnerSearch(e.target.value)}
                placeholder="Search by name, roll no, eventâ€¦"
                className="nb-input !pl-9 !pr-8 text-[13px] py-2"
              />
              {winnerSearch && (
                <button
                  type="button"
                  onClick={() => setWinnerSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--nb-tertiary)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              {[
                { id: 'all', label: 'All' },
                { id: '1st', label: 'ðŸ† 1st' },
                { id: '2nd', label: 'ðŸ¥ˆ 2nd' },
                { id: '3rd', label: 'ðŸ¥‰ 3rd' },
                { id: 'Special', label: 'ðŸŒŸ Special' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setWinnerRankFilter(f.id as any)}
                  className="px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors"
                  style={winnerRankFilter === f.id
                    ? { background: 'var(--nb-accent)', color: 'var(--nb-accent-fg)', border: '1.5px solid var(--nb-ink)', borderRadius: '6px' }
                    : { background: 'var(--nb-surface-accent)', color: 'var(--nb-secondary)', border: '1.5px solid var(--nb-divider)', borderRadius: '6px' }
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Winners grid / empty */}
        {winners.length === 0 ? (
          <div
            className="p-8 sm:p-10 text-center rounded-xl bg-[var(--nb-surface)] relative overflow-hidden"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full nb-pill-purple text-white text-[10px] font-mono font-bold tracking-wider uppercase border-1.5 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]">
              <span>★ PODIUM SPOTLIGHT ★</span>
            </div>

            <div
              className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center nb-card-yellow"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: '3px 3px 0 var(--nb-ink)' }}
            >
              <Trophy className="w-8 h-8 text-neutral-900 stroke-[2.5]" />
            </div>

            <h5 className="nb-headline text-lg sm:text-xl text-[var(--nb-content)] mb-1.5">
              THE PODIUM IS WAITING
            </h5>

            <p className="text-xs text-[var(--nb-secondary)] font-sans max-w-md mx-auto leading-relaxed mb-5">
              {canManageWinners 
                ? 'Department champions, hackathon winners, and quiz titans will be spotlighted on this Wall of Fame. Feature your first winner now!'
                : 'Department competition winners, coding sprint champions, and hackathon leaders will be officially celebrated here.'}
            </p>

            {canManageWinners && (
              <button 
                type="button" 
                onClick={handleOpenAdd} 
                className="nb-btn text-xs py-2 px-4 rounded-md mx-auto cursor-pointer font-mono font-bold uppercase inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Feature First Champion
              </button>
            )}
          </div>
        ) : (() => {
          const filteredWinners = winners.filter((winner) => {
            if (winnerRankFilter !== 'all') {
              if (winnerRankFilter === '1st' && !winner.position.includes('1st')) return false;
              if (winnerRankFilter === '2nd' && !winner.position.includes('2nd')) return false;
              if (winnerRankFilter === '3rd' && !winner.position.includes('3rd')) return false;
              if (winnerRankFilter === 'Special' && !winner.position.toLowerCase().includes('special')) return false;
            }
            if (!winnerSearch.trim()) return true;
            const q = winnerSearch.toLowerCase().trim();
            return (
              (winner.studentName || '').toLowerCase().includes(q) ||
              (winner.rollNumber || '').toLowerCase().includes(q) ||
              (winner.eventTitle || '').toLowerCase().includes(q) ||
              (winner.prizeTitle || '').toLowerCase().includes(q) ||
              (winner.projectTitle || '').toLowerCase().includes(q) ||
              (winner.department || '').toLowerCase().includes(q)
            );
          });

          if (filteredWinners.length === 0) {
            return (
              <div 
                className="p-8 text-center rounded-xl bg-[var(--nb-surface)] space-y-3" 
                style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div className="w-10 h-10 rounded-lg mx-auto flex items-center justify-center nb-pill-coral text-white font-mono font-bold text-sm">
                  0
                </div>
                <h6 className="nb-headline text-base text-[var(--nb-content)]">No Champions Match "{winnerSearch}"</h6>
                <p className="text-xs text-[var(--nb-secondary)] font-sans">
                  Try adjusting your search criteria or clear the filters.
                </p>
                <button
                  type="button"
                  onClick={() => { setWinnerSearch(''); setWinnerRankFilter('all'); }}
                  className="nb-btn-ghost text-xs py-1.5 px-3 rounded-md cursor-pointer font-mono font-bold uppercase inline-block"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  Reset Filter
                </button>
              </div>
            );
          }

          // rank accent colours (saturated neo-brutalist)
          const rankStyle = (position: string) => {
            if (position.includes('1st')) return { accent: 'var(--nb-yellow)', fg: '#000000', icon: '🏆', borderTop: '4px solid var(--nb-yellow)', pillClass: 'nb-pill-yellow' };
            if (position.includes('2nd')) return { accent: 'var(--nb-cyan)', fg: '#000000', icon: '🥈', borderTop: '4px solid var(--nb-cyan)', pillClass: 'nb-pill-cyan' };
            if (position.includes('3rd')) return { accent: 'var(--nb-coral)', fg: '#FFFFFF', icon: '🥉', borderTop: '4px solid var(--nb-coral)', pillClass: 'nb-pill-coral' };
            return { accent: 'var(--nb-purple)', fg: '#FFFFFF', icon: '🌟', borderTop: '4px solid var(--nb-purple)', pillClass: 'nb-pill-purple' };
          };

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredWinners.map((winner) => {
                const rs = rankStyle(winner.position);
                return (
                  <div
                    key={winner.winnerId}
                    onClick={() => setWinnerToView(winner)}
                    className="nb-card flex flex-col justify-between cursor-pointer group"
                    style={{ borderTop: rs.borderTop, borderLeft: '2px solid var(--nb-ink)', borderRight: '2px solid var(--nb-ink)', borderBottom: '2px solid var(--nb-ink)' }}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded ${rs.pillClass}`}
                      >
                        {rs.icon} {winner.position}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {winner.eventDate && (
                          <span className="nb-label text-[10px] hidden sm:inline" style={{ color: 'var(--nb-tertiary)' }}>
                            {winner.eventDate}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setWinnerToView(winner)}
                          className="nb-btn-icon w-8 h-8"
                          title="View credential"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canManageWinners && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(winner)}
                            className="nb-btn-icon w-8 h-8"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canManageWinners && (
                          <button
                            type="button"
                            onClick={() => setWinnerToDelete(winner)}
                            className="nb-btn-icon w-8 h-8"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Student info */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className="w-10 h-10 rounded overflow-hidden flex-shrink-0"
                        style={{ border: '2px solid var(--nb-ink)' }}
                      >
                        <img
                          src={winner.studentPhoto || `https://api.dicebear.com/9.x/notionists/svg?seed=${winner.rollNumber || winner.studentId}`}
                          alt={winner.studentName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-sm font-bold truncate" style={{ color: 'var(--nb-content)' }}>
                          {winner.studentName}
                        </h5>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="nb-pill-blue text-[9px] px-1.5 py-0.5 rounded font-mono">{winner.rollNumber}</span>
                          <span className="nb-label text-[10px] truncate" style={{ color: 'var(--nb-tertiary)' }}>
                            {winner.department || activeTenant?.shortCode || activeTenant?.name || 'Department'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Event + prize */}
                    <div
                      className="space-y-1.5 pt-2"
                      style={{ borderTop: '1.5px solid var(--nb-divider)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 flex-shrink-0 text-[var(--nb-accent)]" />
                        <span className="text-[12px] font-bold truncate" style={{ color: 'var(--nb-content)' }}>
                          {winner.eventTitle}
                        </span>
                      </div>
                      {winner.prizeTitle && (
                        <div className="text-[11px] font-bold flex items-center gap-1 text-amber-500 font-mono">
                          <Sparkles className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{winner.prizeTitle}</span>
                        </div>
                      )}
                      {winner.awardDetails && (
                        <div
                          className="text-[11px] leading-relaxed px-2 py-1 rounded line-clamp-2"
                          style={{ background: 'var(--nb-surface-accent)', border: '1px solid var(--nb-divider)', color: 'var(--nb-secondary)' }}
                        >
                          {winner.awardDetails}
                        </div>
                      )}
                      {winner.projectTitle && (
                        <div
                          className="text-[11px] font-mono italic truncate px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--nb-surface-accent)', border: '1px solid var(--nb-divider)', color: 'var(--nb-secondary)' }}
                        >
                          💡 {winner.projectTitle}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-1.5 flex justify-between items-center nb-label text-[10px]" style={{ borderTop: '1px solid var(--nb-divider)', color: 'var(--nb-tertiary)' }}>
                      <span className="font-bold text-[var(--nb-accent)]">Tap for Credential</span>
                      <span>{winner.addedBy ? `By ${winner.addedBy}` : 'Department'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── UPCOMING EVENTS ── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="nb-headline text-sm" style={{ color: 'var(--nb-content)' }}>Upcoming Events</h3>
          <button
            onClick={() => onNavigate('events')}
            className="nb-label flex items-center gap-1 cursor-pointer font-bold"
            style={{ color: 'var(--nb-accent)' }}
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingEvents.length === 0 ? (
          <div
            className="p-5 text-center rounded-md"
            style={{ border: '1.5px solid var(--nb-divider)', background: 'var(--nb-surface)' }}
          >
            <p className="nb-body" style={{ color: 'var(--nb-secondary)' }}>No upcoming events listed right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {upcomingEvents.map((event) => {
              const isRegistered = myRegs.some(r => r.eventId === event.eventId);
              return (
                <div
                  key={event.eventId}
                  onClick={() => onSelectEvent(event)}
                  className="nb-card flex flex-col cursor-pointer group"
                >
                  {/* Poster */}
                  <div className="relative -mx-4 -mt-4 mb-3 h-28 sm:h-32 overflow-hidden rounded-t-[7px]" style={{ marginLeft: '-1rem', marginRight: '-1rem', marginTop: '-1rem' }}>
                    <img
                      src={event.posterImage}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Category tag */}
                    <span
                      className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] uppercase ${
                        event.category === 'Workshops' ? 'nb-pill-blue' :
                        event.category === 'Hackathons' ? 'nb-pill-purple' :
                        event.category === 'Seminars' ? 'nb-pill-green' :
                        event.category === 'Cultural Events' ? 'nb-pill-pink' :
                        event.category === 'Club Meetings' ? 'nb-pill-coral' : 'nb-pill-yellow'
                      }`}
                    >
                      {event.category}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold truncate" style={{ color: 'var(--nb-content)' }}>
                    {event.title}
                  </h5>
                  <div
                    className="flex justify-between items-center mt-2 pt-2"
                    style={{ borderTop: '1.5px solid var(--nb-divider)' }}
                  >
                    <span className="nb-label" style={{ color: 'var(--nb-secondary)' }}>{event.date}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        isRegistered ? 'nb-pill-green' : 'nb-pill-blue'
                      }`}
                    >
                      {isRegistered ? 'REGISTERED' : 'OPEN'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── LATEST BULLETINS ── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="nb-headline text-sm" style={{ color: 'var(--nb-content)' }}>Latest Bulletins</h3>
          <button
            onClick={() => onNavigate('announcements')}
            className="nb-label flex items-center gap-1 cursor-pointer font-bold"
            style={{ color: 'var(--nb-accent)' }}
          >
            All Bulletins <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {recentAnnouncements.map((announce) => (
            <div
              key={announce.announcementId}
              onClick={() => onNavigate('announcements')}
              className="nb-card flex gap-3 items-start cursor-pointer hover:bg-[var(--nb-surface-accent)] transition-colors"
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] ${
                  announce.category === 'Exam' ? 'nb-pill-coral' :
                  announce.category === 'Workshop' ? 'nb-pill-blue' :
                  announce.category === 'Result' ? 'nb-pill-green' :
                  announce.category === 'News' ? 'nb-pill-pink' : 'nb-pill-cyan'
                }`}
              >
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] uppercase ${
                    announce.category === 'Exam' ? 'nb-pill-coral' :
                    announce.category === 'Workshop' ? 'nb-pill-blue' :
                    announce.category === 'Result' ? 'nb-pill-green' :
                    announce.category === 'News' ? 'nb-pill-pink' : 'nb-pill-cyan'
                  }`}>
                    {announce.category}
                  </span>
                  <span className="nb-label text-[10px]" style={{ color: 'var(--nb-tertiary)' }}>{announce.date}</span>
                </div>
                <h5 className="text-sm font-bold mt-1 truncate" style={{ color: 'var(--nb-content)' }}>{announce.title}</h5>
                <p className="nb-body text-[12px] mt-0.5 line-clamp-1" style={{ color: 'var(--nb-secondary)' }}>{announce.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* â”€â”€ MODALS â”€â”€ */}

      {isAddWinnerOpen && (
        <AddEventWinnerModal
          isOpen={isAddWinnerOpen}
          onClose={() => { setIsAddWinnerOpen(false); setWinnerToEdit(null); }}
          events={events}
          allUsers={allUsers}
          currentUser={user}
          initialWinner={winnerToEdit}
          activeTenant={activeTenant}
          onWinnerSaved={() => {
            setToastMessage(winnerToEdit ? 'Winner updated!' : 'New Champion published!');
            setTimeout(() => setToastMessage(null), 3500);
          }}
        />
      )}

      {winnerToView && (
        <WinnerDetailsModal
          isOpen={Boolean(winnerToView)}
          winner={winnerToView}
          onClose={() => setWinnerToView(null)}
          canManageWinners={canManageWinners}
          onEdit={(w) => { setWinnerToView(null); handleOpenEdit(w); }}
          onDelete={(w) => { setWinnerToView(null); setWinnerToDelete(w); }}
          activeTenant={activeTenant}
        />
      )}

      {/* Delete confirm modal */}
      {winnerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="w-full max-w-sm p-5 space-y-4 rounded-md"
            style={{ background: 'var(--nb-surface)', border: '2px solid var(--nb-ink)' }}
          >
            <div
              className="w-11 h-11 rounded flex items-center justify-center mx-auto"
              style={{ background: 'var(--nb-accent)', border: '2px solid var(--nb-ink)', color: 'var(--nb-accent-fg)' }}
            >
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold" style={{ color: 'var(--nb-content)' }}>Remove from Wall of Champions?</h4>
              <p className="nb-body text-[12px]" style={{ color: 'var(--nb-secondary)' }}>
                Remove <strong style={{ color: 'var(--nb-content)' }}>{winnerToDelete.studentName}</strong>{' '}
                ({winnerToDelete.position}) for "{winnerToDelete.eventTitle}"?
              </p>
            </div>
            <div
              className="flex items-center gap-2.5 p-3 rounded-md"
              style={{ background: 'var(--nb-surface-accent)', border: '1px solid var(--nb-divider)' }}
            >
              <img
                src={winnerToDelete.studentPhoto || `https://api.dicebear.com/9.x/notionists/svg?seed=${winnerToDelete.rollNumber || winnerToDelete.studentId}`}
                alt=""
                className="w-8 h-8 rounded object-cover"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: 'var(--nb-content)' }}>{winnerToDelete.studentName}</div>
                <div className="nb-label text-[10px]" style={{ color: 'var(--nb-secondary)' }}>{winnerToDelete.rollNumber} Â· {winnerToDelete.position}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDeletingWinner}
                onClick={() => setWinnerToDelete(null)}
                className="nb-btn-ghost flex-1"
              >
                Cancel
              </button>
              <HoldButton
                size="sm"
                holdTime={1800}
                backgroundColor="var(--nb-surface)"
                fillColor="var(--nb-accent)"
                textColor="var(--nb-content)"
                fillTextColor="var(--nb-accent-fg)"
                radius={8}
                doneLabel="Removed"
                disabled={isDeletingWinner}
                onHold={confirmDeleteWinner}
                className="flex-1"
              >
                Hold to Remove
              </HoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 flex items-center gap-2 text-sm font-semibold rounded-md"
          style={{ background: 'var(--nb-ink)', color: 'var(--nb-surface)', border: '2px solid var(--nb-ink)' }}
        >
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
