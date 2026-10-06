import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft, Users } from 'lucide-react';
import { useTenantContext } from '../context/TenantContext';
import MembersView from '../components/MembersView';

export default function MembersPage() {
  const {
    allUsers,
    events,
    currentBranding,
    activeTenant,
    activeTenantId
  } = useTenantContext();

  const navigate = useNavigate();

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const prefix = activeTenantId ? `/${activeTenantId}` : '';
      navigate(`${prefix}/profile`);
    }
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTenantId]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-900/60 backdrop-blur-xs overflow-hidden sm:p-4">
      {/* Bottom Sheet / Pop Up Panel */}
      <div 
        className="flex-1 flex flex-col min-h-0 max-w-5xl mx-auto w-full bg-[var(--nb-bg)] sm:rounded-2xl border-t-4 sm:border-4 border-[var(--nb-ink)] shadow-[0_-6px_0_var(--nb-ink)] sm:shadow-[8px_8px_0_var(--nb-ink)] overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out"
      >
        {/* Top Grab Handle & Header Bar */}
        <div className="bg-[var(--nb-surface)] border-b-2 border-[var(--nb-ink)] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0 select-none shadow-[0_2px_0_var(--nb-ink)]">
          {/* Left Title & Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-neutral-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-sm sm:text-base text-[var(--nb-content)] uppercase tracking-tight truncate">
                  Members Directory
                </h2>
                <span className="nb-pill-blue text-[9px] font-mono font-bold uppercase hidden xs:inline-block">
                  {allUsers.length} MEMBERS
                </span>
              </div>
              <p className="text-[10px] font-mono text-[var(--nb-secondary)] truncate">
                {activeTenant?.name || currentBranding?.appName || 'Campus'} Association Registry
              </p>
            </div>
          </div>

          {/* Right Action: Prominent Close Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--nb-surface-accent)] hover:bg-rose-400 text-[var(--nb-content)] hover:text-neutral-950 font-mono text-xs font-black border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              title="Close Members Directory (Esc)"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
              <span>CLOSE</span>
            </button>
          </div>
        </div>

        {/* Scrollable Members Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto w-full pb-16">
            <MembersView 
              allUsers={allUsers} 
              events={events} 
              branding={currentBranding} 
              activeTenant={activeTenant} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
