import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Medal, 
  Sparkles, 
  Calendar, 
  User, 
  Hash, 
  BookOpen, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Award,
  GraduationCap
} from 'lucide-react';
import { EventWinner, UserProfile, Tenant } from '../types';
import HoldButton from './HoldButton';

interface WinnerDetailsModalProps {
  winner: EventWinner | null;
  isOpen: boolean;
  onClose: () => void;
  canManageWinners?: boolean;
  onEdit?: (winner: EventWinner) => void;
  onDelete?: (winner: EventWinner) => void;
  activeTenant?: Tenant | null;
}

export default function WinnerDetailsModal({
  winner,
  isOpen,
  onClose,
  canManageWinners = false,
  onEdit,
  onDelete,
  activeTenant
}: WinnerDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !winner) return null;

  const isFirst = winner.position.includes('1st');
  const isSecond = winner.position.includes('2nd');
  const isThird = winner.position.includes('3rd');

  const rankBadgeBg = isFirst 
    ? 'bg-amber-400 text-black' 
    : isSecond
    ? 'bg-slate-300 text-black'
    : isThird
    ? 'bg-amber-600 text-white'
    : 'bg-indigo-500 text-white';

  const rankIcon = isFirst ? '🏆' : isSecond ? '🥈' : isThird ? '🥉' : '🌟';

  const handleCopyCitation = () => {
    const code = (activeTenant?.shortCode || 'ORG').replace(/[^a-zA-Z0-9]/g, '');
    const deptTag = activeTenant?.name ? `#${activeTenant.name.replace(/[^a-zA-Z0-9]/g, '')}` : `#${code}`;
    const text = `🏆 Wall of Champions: Congratulations to ${winner.studentName} (${winner.rollNumber || code}) for securing ${winner.position} [${winner.prizeTitle || 'Champion'}] in "${winner.eventTitle}"! ${winner.awardDetails ? `Award: ${winner.awardDetails}.` : ''} ${deptTag} #NOTXConnect`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div 
        className="bg-[var(--nb-surface)] rounded-lg w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] relative"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        {/* Modal Top Bar */}
        <div 
          className="p-4 border-b-2 border-[var(--nb-ink)] flex items-center justify-between bg-[var(--nb-surface-accent)] shrink-0"
        >
          <div className="flex items-center gap-2">
            <span 
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded font-mono uppercase tracking-wider ${rankBadgeBg}`}
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <span>{rankIcon}</span>
              <span>{winner.position}</span>
            </span>
            <span className="nb-label text-[10px] text-[var(--nb-secondary)]">WALL OF CHAMPIONS</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCitation}
              className="nb-btn-ghost px-2.5 py-1 rounded flex items-center gap-1 text-xs cursor-pointer"
              style={{ border: '1.5px solid var(--nb-ink)' }}
              title="Copy achievement citation"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="nb-label text-[10px]">{copied ? 'COPIED!' : 'SHARE'}</span>
            </button>

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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Champion Profile Spotlight */}
          <div 
            className="flex items-center gap-3.5 p-3 rounded bg-[var(--nb-surface-accent)]"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <div 
              className="relative w-16 h-16 rounded overflow-hidden shrink-0 bg-[var(--nb-surface)]"
              style={{ border: '2px solid var(--nb-ink)' }}
            >
              <img
                src={winner.studentPhoto || `https://api.dicebear.com/9.x/notionists/svg?seed=${winner.rollNumber || winner.studentId}`}
                alt={winner.studentName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="nb-headline text-lg text-[var(--nb-content)] truncate">
                  {winner.studentName}
                </h3>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {winner.rollNumber && (
                  <span 
                    className="font-mono text-[10px] font-bold text-[var(--nb-content)] bg-[var(--nb-surface)] px-2 py-0.5 rounded"
                    style={{ border: '1px solid var(--nb-ink)' }}
                  >
                    {winner.rollNumber}
                  </span>
                )}
                <span className="nb-label text-[11px] text-[var(--nb-secondary)] truncate">
                  {winner.department || activeTenant?.shortCode || activeTenant?.name || 'Department'}
                </span>
                {(winner.year || winner.section) && (
                  <span className="nb-label text-[10px] text-[var(--nb-secondary)]">
                    • {winner.year}{winner.section ? ` Sec ${winner.section}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Event & Award Spotlight Card */}
          <div 
            className="bg-[var(--nb-surface)] rounded p-4 space-y-3"
            style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
          >
            <div>
              <div className="nb-label text-[9.5px] text-[var(--nb-secondary)] flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-[var(--nb-accent)]" />
                <span>DEPARTMENT EVENT</span>
              </div>
              <div className="nb-headline text-base text-[var(--nb-content)]">
                {winner.eventTitle}
              </div>
              {winner.eventDate && (
                <div className="nb-label text-[10px] text-[var(--nb-secondary)] mt-0.5">
                  CONDUCTED ON {winner.eventDate}
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t-2 border-[var(--nb-ink)]">
              <div className="nb-label text-[9.5px] text-[var(--nb-secondary)] flex items-center gap-1 mb-1">
                <Trophy className="w-3 h-3 text-amber-500" />
                <span>PRIZE & DISTINCTION</span>
              </div>
              <div className="text-xs font-bold text-[var(--nb-content)] flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{winner.prizeTitle || winner.position}</span>
              </div>
              {winner.awardDetails && (
                <div 
                  className="mt-2 text-xs text-[var(--nb-content)] font-bold leading-relaxed bg-[var(--nb-surface-accent)] rounded p-2.5"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  {winner.awardDetails}
                </div>
              )}
            </div>

            {winner.projectTitle && (
              <div className="pt-2.5 border-t-2 border-[var(--nb-ink)]">
                <div className="nb-label text-[9.5px] text-[var(--nb-accent)] flex items-center gap-1 mb-1">
                  <span>💡 WINNING PROJECT / TOPIC</span>
                </div>
                <div 
                  className="text-xs font-bold text-[var(--nb-content)] font-mono bg-[var(--nb-surface-accent)] rounded p-2.5"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  {winner.projectTitle}
                </div>
              </div>
            )}
          </div>

          {/* Verification Footnote */}
          <div 
            className="flex items-center justify-between text-[10px] nb-label text-[var(--nb-secondary)] pt-1"
          >
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <Award className="w-3.5 h-3.5" />
              VERIFIED DEPARTMENT WINNER
            </span>
            <span>{winner.addedBy ? `BY ${winner.addedBy.toUpperCase()}` : 'ADMIN VERIFIED'}</span>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div 
          className="p-4 border-t-2 border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] flex items-center justify-between gap-2 shrink-0"
        >
          {canManageWinners ? (
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(winner);
                  }}
                  className="nb-btn-ghost px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer uppercase"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}

              {onDelete && (
                <HoldButton
                  size="sm"
                  holdTime={1600}
                  radius={4}
                  backgroundColor="#fee2e2"
                  fillColor="#e11d48"
                  textColor="#e11d48"
                  fillTextColor="#ffffff"
                  doneLabel="Deleted"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onHold={() => {
                    setTimeout(() => {
                      onClose();
                      onDelete(winner);
                    }, 400);
                  }}
                  className="border-[1.5px] border-[var(--nb-ink)] text-xs font-bold font-mono uppercase"
                >
                  Hold to Delete
                </HoldButton>
              )}
            </div>
          ) : (
            <div className="nb-label text-[10px] text-[var(--nb-secondary)]">
              ACADEMIC ACHIEVER CREDENTIAL
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="nb-btn-ghost px-4 py-1.5 rounded text-xs font-bold uppercase cursor-pointer"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
