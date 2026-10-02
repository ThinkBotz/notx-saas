import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Search, 
  Award, 
  ShieldCheck, 
  Copy, 
  Check, 
  Calendar, 
  ExternalLink,
  Eye,
  GraduationCap
} from 'lucide-react';
import { IssuedCertificate, CertificateTemplate, DEFAULT_CERTIFICATE_TEMPLATE, DepartmentEvent } from '../types';
import CertificateCard from './CertificateCard';

interface CertificateRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventDate?: string;
  eventVenue?: string;
  certificates: IssuedCertificate[];
  template?: CertificateTemplate;
}

export const CertificateRecipientsModal: React.FC<CertificateRecipientsModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  eventDate,
  eventVenue,
  certificates,
  template = DEFAULT_CERTIFICATE_TEMPLATE
}) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<IssuedCertificate | null>(null);

  if (!isOpen) return null;

  const filteredCerts = certificates.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.studentName || '').toLowerCase().includes(q) ||
      (c.rollNumber || '').toLowerCase().includes(q) ||
      (c.certificateId || '').toLowerCase().includes(q) ||
      (c.department || '').toLowerCase().includes(q)
    );
  });

  const handleCopyId = (certId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(certId);
    setCopiedId(certId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div 
        className="bg-[var(--nb-surface)] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        
        {/* Header */}
        <div 
          className="p-4 sm:p-5 border-b-2 border-[var(--nb-ink)] flex items-center justify-between bg-[var(--nb-surface-accent)] shrink-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded bg-[var(--nb-surface)] flex items-center justify-center text-[var(--nb-accent)] shrink-0"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="nb-headline text-base text-[var(--nb-content)] truncate">
                  Certificate Recipients
                </h3>
                <span 
                  className="nb-tag text-[10px] font-mono font-bold"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  {certificates.length} {certificates.length === 1 ? 'AWARDEE' : 'AWARDEES'}
                </span>
              </div>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)] truncate mt-0.5">
                {eventTitle} {eventDate ? `• ${eventDate}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Search Bar */}
        <div 
          className="px-4 sm:px-5 py-3 border-b-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] shrink-0"
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)]" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or Certificate ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--nb-surface-accent)] rounded pl-9 pr-4 py-2 text-xs font-bold text-[var(--nb-content)] outline-none"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Recipients List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-grow bg-[var(--nb-bg)]">
          {filteredCerts.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <Award className="w-10 h-10 text-[var(--nb-secondary)] mx-auto opacity-50 mb-2" />
              <p className="nb-headline text-sm text-[var(--nb-content)]">No Recipients Found</p>
              <p className="nb-label text-xs text-[var(--nb-secondary)] max-w-sm mx-auto">
                {search 
                  ? `No certificates matched "${search}". Try searching by roll number or name.`
                  : "No other students have been issued this certificate yet."}
              </p>
            </div>
          ) : (
            filteredCerts.map((cert, index) => {
              const seed = cert.studentName || cert.rollNumber || 'student';
              return (
                <div 
                  key={cert.certificateId || index}
                  className="bg-[var(--nb-surface)] rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img 
                        src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`}
                        alt={cert.studentName}
                        className="w-10 h-10 rounded bg-[var(--nb-surface-accent)] p-0.5 object-cover"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      />
                      <div 
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="nb-headline text-sm text-[var(--nb-content)] truncate">
                          {cert.studentName}
                        </h4>
                        <span 
                          className="nb-tag text-[9px] font-mono font-bold text-emerald-600 bg-white"
                          style={{ border: '1px solid var(--nb-ink)' }}
                        >
                          {cert.status || 'Verified'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--nb-secondary)] mt-0.5 font-mono">
                        <span className="font-bold text-[var(--nb-content)]">{cert.rollNumber}</span>
                        {cert.department && <span>• {cert.department}</span>}
                        {cert.year && <span>• {cert.year}</span>}
                      </div>

                      {/* Certificate ID Pill with Copy */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(cert.certificateId, e)}
                          title="Click to copy Certificate ID"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] cursor-pointer"
                          style={{ border: '1px solid var(--nb-ink)' }}
                        >
                          <ShieldCheck className="w-3 h-3 text-[var(--nb-accent)]" />
                          <span>ID: {cert.certificateId}</span>
                          {copiedId === cert.certificateId ? (
                            <span className="text-emerald-600 text-[8px] font-bold">COPIED!</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-[var(--nb-secondary)]" />
                          )}
                        </button>

                        {cert.issueDate && (
                          <span className="nb-label text-[8.5px] text-[var(--nb-secondary)]">
                            ISSUED: {cert.issueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => setPreviewCert(cert)}
                      className="nb-btn-ghost flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold uppercase cursor-pointer"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                    >
                      <Eye className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div 
          className="px-5 py-3 border-t-2 border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] flex items-center justify-between text-xs text-[var(--nb-secondary)] shrink-0"
        >
          <span className="nb-label text-[10px]">SHOWING {filteredCerts.length} OF {certificates.length} TOTAL RECIPIENTS</span>
          <button
            onClick={onClose}
            className="nb-btn px-4 py-1.5 rounded text-xs font-bold uppercase cursor-pointer"
            style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
          >
            Done
          </button>
        </div>
      </div>

      {/* Sub-modal: Single Certificate Preview */}
      {previewCert && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-3 animate-fadeIn">
          <div 
            className="bg-[var(--nb-surface)] rounded-lg max-w-xl w-full p-4 sm:p-6 space-y-4"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--nb-ink)] pb-2">
              <div>
                <h4 className="nb-headline text-sm text-[var(--nb-content)]">Certificate Preview</h4>
                <p className="nb-label text-[10px] text-[var(--nb-secondary)]">ID: {previewCert.certificateId}</p>
              </div>
              <button 
                onClick={() => setPreviewCert(null)}
                className="nb-btn-ghost w-7 h-7 rounded flex items-center justify-center cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <CertificateCard
              template={template}
              studentName={previewCert.studentName}
              rollNumber={previewCert.rollNumber}
              event={{
                title: previewCert.eventTitle,
                date: previewCert.eventDate,
                venue: previewCert.eventVenue || eventVenue
              }}
              certificateId={previewCert.certificateId}
              issueDate={previewCert.issueDate}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewCert(null)}
                className="nb-btn-ghost px-4 py-1.5 rounded font-bold text-xs uppercase cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateRecipientsModal;
