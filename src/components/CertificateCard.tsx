import React, { useState } from 'react';
import { Award, ShieldCheck, CheckCircle2, Star, Sparkles, Building2, Calendar, MapPin, Copy, Check, Users, QrCode } from 'lucide-react';
import { CertificateTemplate, DepartmentEvent } from '../types';

interface CertificateCardProps {
  template: CertificateTemplate;
  studentName: string;
  rollNumber: string;
  event: Partial<DepartmentEvent>;
  id?: string;
  className?: string;
  certificateId?: string;
  issueDate?: string;
  onViewPeers?: () => void;
  peersCount?: number;
}

export function formatCertificateBody(
  bodyTemplate: string,
  data: {
    studentName: string;
    rollNumber: string;
    eventTitle: string;
    eventDate: string;
    eventVenue: string;
  }
): string {
  let text = bodyTemplate || "has successfully registered and participated in {eventTitle} held on {eventDate} at {eventVenue}.";
  text = text.replace(/\{name\}/gi, data.studentName);
  text = text.replace(/\{rollNumber\}/gi, data.rollNumber);
  text = text.replace(/\{eventTitle\}/gi, data.eventTitle);
  text = text.replace(/\{eventDate\}/gi, data.eventDate);
  text = text.replace(/\{eventVenue\}/gi, data.eventVenue);
  return text;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  template,
  studentName,
  rollNumber,
  event,
  id = 'digital-certificate-card',
  className = '',
  certificateId,
  issueDate,
  onViewPeers,
  peersCount
}) => {
  const [copied, setCopied] = useState(false);
  const theme = template.theme || 'indigo';

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!certificateId) return;
    navigator.clipboard.writeText(certificateId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Theme palettes for backgrounds, borders, badges and typography
  const themeConfig = {
    indigo: {
      border: 'border-indigo-600',
      badgeBg: 'bg-indigo-600 text-white',
      accentText: 'text-indigo-600 dark:text-indigo-400',
      highlightBadge: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border-indigo-600',
      sealColor: 'text-indigo-600',
    },
    gold: {
      border: 'border-amber-500',
      badgeBg: 'bg-amber-400 text-black',
      accentText: 'text-amber-600 dark:text-amber-400',
      highlightBadge: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-500',
      sealColor: 'text-amber-600',
    },
    emerald: {
      border: 'border-emerald-600',
      badgeBg: 'bg-emerald-500 text-white',
      accentText: 'text-emerald-600 dark:text-emerald-400',
      highlightBadge: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-600',
      sealColor: 'text-emerald-600',
    },
    crimson: {
      border: 'border-rose-600',
      badgeBg: 'bg-rose-600 text-white',
      accentText: 'text-rose-600 dark:text-rose-400',
      highlightBadge: 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-600',
      sealColor: 'text-rose-600',
    },
    slate: {
      border: 'border-neutral-700',
      badgeBg: 'bg-neutral-800 text-white',
      accentText: 'text-neutral-700 dark:text-neutral-300',
      highlightBadge: 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-700',
      sealColor: 'text-neutral-700',
    }
  }[theme];

  const bodyContent = formatCertificateBody(template.bodyText, {
    studentName: studentName || 'STUDENT NAME',
    rollNumber: rollNumber || 'ROLL NUMBER',
    eventTitle: event.title || 'Department Event',
    eventDate: event.date || 'Event Date',
    eventVenue: event.venue || 'Campus Auditorium'
  });

  return (
    <div
      id={id}
      className={`relative rounded-lg p-6 sm:p-8 bg-[var(--nb-surface)] text-[var(--nb-content)] flex flex-col justify-between text-center overflow-hidden min-h-[390px] select-none ${className}`}
      style={{ border: '2.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
    >
      {/* Decorative Guilloche Border insets */}
      {template.accentBorder && (
        <div 
          className="absolute inset-2.5 rounded border pointer-events-none border-dashed"
          style={{ borderColor: 'var(--nb-ink)' }}
        />
      )}

      {/* Top Header Badge & Organization Branding */}
      <div className="relative z-10 flex flex-col items-center">
        <div 
          className={`w-12 h-12 rounded ${themeConfig.badgeBg} flex items-center justify-center mb-2.5`}
          style={{ border: '1.5px solid var(--nb-ink)' }}
        >
          {template.badgeStyle === 'shield' ? (
            <ShieldCheck className="w-6 h-6" />
          ) : template.badgeStyle === 'star' ? (
            <Star className="w-6 h-6" />
          ) : template.badgeStyle === 'ribbon' ? (
            <Sparkles className="w-6 h-6" />
          ) : (
            <Award className="w-6 h-6" />
          )}
        </div>

        <span className={`nb-headline text-xs sm:text-sm tracking-widest uppercase ${themeConfig.accentText}`}>
          {template.orgName || "NOTX ASSOCIATION"}
        </span>
        <span className="nb-label text-[9px] sm:text-[10px] text-[var(--nb-secondary)] tracking-wide mt-0.5 max-w-sm mx-auto">
          {template.departmentName || "Academic Department"}
        </span>
        {template.institutionName && (
          <span className="nb-label text-[8px] text-[var(--nb-secondary)] mt-0.5">
            {template.institutionName}
          </span>
        )}

        {/* Certificate Title Banner */}
        <div 
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-widest bg-[var(--nb-surface-accent)] text-[var(--nb-content)]"
          style={{ border: '1.5px solid var(--nb-ink)' }}
        >
          <Award className={`w-3.5 h-3.5 ${themeConfig.accentText}`} />
          <span>{template.certificateTitle || "Certificate of Participation"}</span>
        </div>
      </div>

      {/* Main Recipient Details */}
      <div className="relative z-10 my-4 space-y-2">
        <span className="nb-label text-[10px] sm:text-[11px] text-[var(--nb-secondary)] tracking-wider uppercase block">
          {template.certifyStatement || "This is to certify that"}
        </span>

        <h2 className="text-xl sm:text-2xl nb-headline text-[var(--nb-content)] tracking-tight uppercase">
          {studentName.toUpperCase() || "RECIPIENT NAME"}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
          <span 
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${themeConfig.highlightBadge}`}
            style={{ border: '1px solid var(--nb-ink)' }}
          >
            <span>ROLL NO:</span>
            <span className="font-extrabold tracking-wider">{rollNumber || "N/A"}</span>
          </span>

          {certificateId && (
            <button
              type="button"
              onClick={handleCopyId}
              title="Click to copy Certificate ID"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] cursor-pointer"
              style={{ border: '1px solid var(--nb-ink)' }}
            >
              <ShieldCheck className={`w-3 h-3 ${themeConfig.accentText}`} />
              <span>ID: <strong className="tracking-wider font-mono">{certificateId}</strong></span>
              {copied ? (
                <span className="text-[8px] text-emerald-600 font-bold ml-0.5">COPIED!</span>
              ) : (
                <Copy className="w-2.5 h-2.5 text-[var(--nb-secondary)]" />
              )}
            </button>
          )}
        </div>

        <p className="text-[11px] text-[var(--nb-content)] max-w-md mx-auto leading-relaxed pt-1.5 px-2 font-medium">
          {bodyContent}
        </p>
      </div>

      {/* Signatures & Footer Metadata */}
      <div 
        className="relative z-10 pt-3 mt-1"
        style={{ borderTop: '1.5px solid var(--nb-ink)' }}
      >
        <div className="grid grid-cols-2 gap-4 items-end">
          {/* Signer 1 */}
          <div className="text-left space-y-0.5">
            <div 
              className="w-24 mb-1" 
              style={{ borderBottom: '1.5px solid var(--nb-ink)' }}
            />
            <div className="text-[10px] font-bold text-[var(--nb-content)] leading-tight font-mono uppercase">
              {template.signatory1Name || "Head of Department"}
            </div>
            <div className="nb-label text-[8px] text-[var(--nb-secondary)]">
              {template.signatory1Title || "Head of Department"}
            </div>
            {template.signatory1Dept && (
              <div className="nb-label text-[7.5px] text-[var(--nb-secondary)]">
                {template.signatory1Dept}
              </div>
            )}
          </div>

          {/* Signer 2 */}
          <div className="text-right space-y-0.5">
            <div 
              className="w-24 mb-1 ml-auto" 
              style={{ borderBottom: '1.5px solid var(--nb-ink)' }}
            />
            <div className={`text-[10px] font-bold ${themeConfig.accentText} leading-tight font-mono uppercase`}>
              {template.signatory2Name || "NOTX Connect"}
            </div>
            <div className="nb-label text-[8px] text-[var(--nb-secondary)]">
              {template.signatory2Title || "Faculty Lead"}
            </div>
            {template.signatory2Dept && (
              <div className="nb-label text-[7.5px] text-[var(--nb-secondary)]">
                {template.signatory2Dept}
              </div>
            )}
          </div>
        </div>

        {/* Footer verification tag & interactive peer link */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono text-[var(--nb-secondary)] mt-3 pt-2"
          style={{ borderTop: '1px solid var(--nb-ink)' }}
        >
          <div className="flex items-center gap-1.5">
            {template.showVerificationBadge && (
              <>
                <CheckCircle2 className={`w-3.5 h-3.5 ${themeConfig.accentText}`} />
                <span className="font-bold">{template.footerNote || "Verified Academic Credential • NOTX Connect"}</span>
              </>
            )}
            {issueDate && (
              <span className="text-[8px] text-[var(--nb-secondary)] ml-1">
                • ISSUED: {issueDate}
              </span>
            )}
          </div>

          {onViewPeers && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewPeers();
              }}
              className="nb-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase cursor-pointer"
              style={{ border: '1px solid var(--nb-ink)' }}
            >
              <Users className="w-3 h-3 text-[var(--nb-accent)]" />
              <span>See Who Else Got This</span>
              {peersCount !== undefined && peersCount > 0 && (
                <span 
                  className="px-1.5 py-0.2 rounded bg-[var(--nb-surface-accent)] font-mono text-[8px] font-bold"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  {peersCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateCard;
