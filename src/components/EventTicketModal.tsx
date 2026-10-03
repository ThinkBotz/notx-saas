import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, MapPin, Users, Check, Copy, 
  Sparkles, CheckCircle2, ShieldCheck, Download, Share2
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { fireConfetti } from '../utils/confetti';
import { DepartmentEvent, EventRegistration, UserProfile, AppBranding, DEFAULT_BRANDING } from '../types';

interface EventTicketModalProps {
  event: DepartmentEvent;
  registration: EventRegistration;
  user: UserProfile;
  onClose: () => void;
  branding?: AppBranding;
}

export default function EventTicketModal({
  event,
  registration,
  user,
  onClose,
  branding = DEFAULT_BRANDING,
}: EventTicketModalProps) {
  const [copied, setCopied] = useState(false);

  // Generate standardized ticket number
  const roll = user?.rollNumber || registration?.rollNumber || 'STU';
  const eventCode = (event.title || 'EVT').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const regCode = (registration.registrationId || '0000').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const ticketNumber = `NOTX-${roll}-${eventCode}-${regCode}`;

  // Clean registration ID payload for fast, reliable, low-density camera QR scanning
  const qrPayload = registration.registrationId || (roll ? roll.toUpperCase() : 'PASS');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=000000&bgcolor=ffffff&margin=1&data=${encodeURIComponent(qrPayload)}`;

  const handleCopyTicket = () => {
    navigator.clipboard.writeText(ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Google Calendar URL generator
  const getGoogleCalendarUrl = () => {
    try {
      const title = encodeURIComponent(event.title);
      const details = encodeURIComponent(`${event.description || ''}\n\nVenue: ${event.venue}\nTicket ID: ${ticketNumber}`);
      const location = encodeURIComponent(event.venue || 'Campus');
      
      // Parse date and time into YYYYMMDDTHHMMSSZ format
      let startIso = '';
      let endIso = '';
      if (event.date) {
        const dClean = event.date.replace(/-/g, '');
        startIso = `${dClean}T043000Z`; // Default fallback
        endIso = `${dClean}T073000Z`;
      }
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
    } catch {
      return '#';
    }
  };

  const [liveRegistration, setLiveRegistration] = useState<EventRegistration>(registration);

  useEffect(() => {
    setLiveRegistration(registration);
  }, [registration]);

  useEffect(() => {
    if (!registration?.registrationId) return;
    const unsub = onSnapshot(doc(db, 'registrations', registration.registrationId), (snap) => {
      if (snap.exists()) {
        const fresh = { registrationId: snap.id, ...snap.data() } as EventRegistration;
        setLiveRegistration(prev => {
          if (prev.status !== 'Attended' && fresh.status === 'Attended') {
            try {
              fireConfetti(2200);
            } catch (_) {}
          }
          return fresh;
        });
      }
    }, (err) => {
      console.warn("Realtime ticket listener warning:", err);
    });
    return () => unsub();
  }, [registration?.registrationId]);

  const isCheckedIn = liveRegistration.status === 'Attended';
  const isAbsent = liveRegistration.status === 'Absent';

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[150] flex flex-col items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button 
        type="button"
        onClick={onClose} 
        aria-label="Close Ticket"
        className="absolute top-4 right-4 w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all z-20"
        title="Close"
      >
        <X className="w-4 h-4 stroke-[2.5]" />
      </button>

      <div className="relative w-full max-w-[340px] my-auto">
        {/* Pass Ticket Container */}
        <div 
          className="w-full flex flex-col bg-[var(--nb-surface)] rounded-lg overflow-hidden relative"
          style={{ border: '2.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
        >
          {/* Lanyard Hole Graphical Notch */}
          <div className="pt-2 pb-1.5 flex justify-center bg-[var(--nb-surface-accent)] border-b border-[var(--nb-ink)]">
            <div 
              className="w-14 h-2.5 rounded-full bg-[var(--nb-ink)] mx-auto flex items-center justify-center"
            >
              <div className="w-8 h-0.5 rounded-full bg-white/30" />
            </div>
          </div>

          {/* Header Strip */}
          <div 
            className="px-4 py-2 flex justify-between items-center border-b-2 border-[var(--nb-ink)]"
            style={{ backgroundColor: 'var(--tenant-hero-bg)', color: 'var(--tenant-hero-fg)' }}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" style={{ fill: 'var(--tenant-hero-fg)', color: 'var(--tenant-hero-fg)' }} />
              <span className="font-display font-black text-sm tracking-wider uppercase">
                {branding?.appName || 'NOTX'} OFFICIAL PASS
              </span>
            </div>
            <span 
              className="text-[9px] font-mono font-black px-2 py-0.5 rounded-none bg-black text-[#FFE600]"
              style={{ border: '1px solid var(--nb-ink)' }}
            >
              ADMIT ONE
            </span>
          </div>

          {/* Status Banner */}
          <div className={`px-4 py-2 flex items-center justify-between border-b-2 text-[10px] font-mono font-black uppercase ${
            isCheckedIn 
              ? 'bg-emerald-400 text-black border-[var(--nb-ink)]'
              : isAbsent
              ? 'bg-rose-500 text-white border-[var(--nb-ink)]'
              : 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)] border-[var(--nb-ink)]'
          }`}>
            <span className="flex items-center gap-1.5">
              {isCheckedIn ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>CHECKED IN & ADMITTED</span>
                </>
              ) : isAbsent ? (
                <span>ABSENT FROM EVENT</span>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5] text-[var(--nb-accent)]" />
                  <span>VALID PASS • READY FOR SCAN</span>
                </>
              )}
            </span>
            <span className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded">#{regCode}</span>
          </div>
          
          {/* Event Content & Poster */}
          <div className="p-4 space-y-3">
            <div className="flex gap-3">
              <div 
                className="w-[74px] h-[96px] flex-shrink-0 bg-[var(--nb-surface-accent)] rounded overflow-hidden relative"
                style={{ border: '2px solid var(--nb-ink)' }}
              >
                <img 
                  src={event.posterImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80'} 
                  alt={event.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <span className="nb-tag text-[8.5px] font-mono uppercase inline-block mb-1">
                    {event.category}
                  </span>
                  <h2 className="nb-headline text-base text-[var(--nb-content)] leading-snug line-clamp-2">
                    {event.title}
                  </h2>
                </div>
                
                <div className="space-y-1 text-xs pt-1 border-t border-[var(--nb-ink)]/15">
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <Calendar className="w-3 h-3 text-[var(--nb-accent)] shrink-0" />
                    <span className="font-mono font-bold text-[var(--nb-content)]">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <Clock className="w-3 h-3 text-[var(--nb-accent)] shrink-0" />
                    <span className="font-mono font-medium text-[var(--nb-content)] truncate">
                      {event.startTime}{event.endTime && event.endTime !== 'N/A' ? ` – ${event.endTime}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <MapPin className="w-3 h-3 text-[var(--nb-accent)] shrink-0" />
                    <span className="font-medium text-[var(--nb-secondary)] truncate max-w-[130px]">
                      {event.venue}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendee Info Card */}
            <div 
              className="p-2.5 bg-[var(--nb-surface-accent)] rounded text-xs flex justify-between items-center"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <div className="min-w-0">
                <span className="nb-label text-[8.5px] text-[var(--nb-secondary)] block">ATTENDEE</span>
                <span className="font-bold text-[var(--nb-content)] text-xs truncate block">{user.name}</span>
                <span className="font-mono text-[9.5px] text-[var(--nb-secondary)]">{roll} • {user.year || '3rd Year'}</span>
              </div>
              {liveRegistration.isTeam && (
                <div className="text-right flex-shrink-0 pl-2 border-l border-[var(--nb-ink)]/20">
                  <span className="nb-label text-[8.5px] text-[var(--nb-secondary)] block">TEAM</span>
                  <span className="font-bold text-[10.5px] text-[var(--nb-content)] truncate max-w-[100px] block">
                    {liveRegistration.teamName || 'Solo'}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {(liveRegistration.teamMembers?.length || 0) + 1} Members
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Perforated Ticket Divider with Notches */}
          <div className="relative py-2 bg-[var(--nb-surface)] border-y-2 border-dashed border-[var(--nb-ink)] flex items-center justify-between px-6">
            {/* Left circular cutout notch */}
            <div 
              className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/80" 
              style={{ borderRight: '2px solid var(--nb-ink)' }}
            />
            {/* Right circular cutout notch */}
            <div 
              className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/80" 
              style={{ borderLeft: '2px solid var(--nb-ink)' }}
            />

            <span className="font-mono text-[9px] font-black text-[var(--nb-secondary)] uppercase tracking-wider">
              OFFICIAL ENTRY CODE
            </span>
            <button
              onClick={handleCopyTicket}
              className="flex items-center gap-1 font-mono text-[9px] font-black text-[var(--nb-accent)] hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>{ticketNumber}</span>
                </>
              )}
            </button>
          </div>
          
          {/* QR Code Section */}
          <div className="p-4 flex items-center gap-4 bg-[var(--nb-surface)]">
            <div 
              className="w-28 h-28 bg-white p-1.5 rounded shrink-0 flex items-center justify-center relative overflow-hidden"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <img 
                src={qrUrl} 
                alt="Entry QR Pass" 
                className="w-full h-full object-contain select-none pointer-events-none" 
                referrerPolicy="no-referrer"
              />
              {isCheckedIn && (
                <div 
                  className="absolute inset-0 bg-emerald-400 flex flex-col items-center justify-center p-1 text-center select-none rotate-[-8deg]"
                  style={{ border: '2px solid var(--nb-ink)' }}
                >
                  <CheckCircle2 className="w-7 h-7 text-black stroke-[3]" />
                  <span className="font-display font-black text-[11px] text-black tracking-wider leading-none mt-0.5">ADMITTED</span>
                  <span className="font-mono text-[7px] font-black text-black">ENTRY CONFIRMED</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1.5">
              <div>
                <span className="nb-label text-[8.5px] text-[var(--nb-secondary)] uppercase block">
                  FAST SCAN ENTRANCE
                </span>
                <span className="text-xs font-bold text-[var(--nb-content)] block truncate">
                  Show at Venue Gate
                </span>
              </div>
              <p className="text-[10px] text-[var(--nb-secondary)] leading-tight font-sans">
                Scan with coordinator camera for instant attendance check-in.
              </p>
              
              {/* Decorative mini barcode */}
              <div className="pt-1 opacity-70">
                <div className="flex items-center gap-[1.5px] h-3.5">
                  {[2, 4, 1, 3, 2, 5, 1, 4, 2, 3, 1, 4, 2, 3, 5, 2, 1, 3].map((w, idx) => (
                    <div key={idx} className="h-full bg-[var(--nb-ink)]" style={{ width: `${w}px` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer Action Strip */}
          <div 
            className="bg-[var(--nb-surface-accent)] px-4 py-2.5 flex justify-between items-center border-t-2"
            style={{ borderColor: 'var(--nb-ink)' }}
          >
            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9.5px] font-mono font-bold text-[var(--nb-content)] hover:text-[var(--nb-accent)] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Calendar className="w-3 h-3 text-[var(--nb-accent)]" />
              Add to Google Cal
            </a>

            <button
              onClick={() => window.print()}
              className="text-[9.5px] font-mono font-bold text-[var(--nb-secondary)] hover:text-[var(--nb-content)] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Print / Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
