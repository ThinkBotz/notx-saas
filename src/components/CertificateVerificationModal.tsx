import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  Calendar, 
  MapPin, 
  User, 
  Hash, 
  Building2,
  Copy,
  Check
} from 'lucide-react';
import { IssuedCertificate, CertificateTemplate, DEFAULT_CERTIFICATE_TEMPLATE, Tenant } from '../types';
import { verifyCertificateById } from '../firebase';
import CertificateCard from './CertificateCard';

interface CertificateVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialId?: string;
  template?: CertificateTemplate;
  activeTenant?: Tenant | null;
}

export const CertificateVerificationModal: React.FC<CertificateVerificationModalProps> = ({
  isOpen,
  onClose,
  initialId = '',
  template = DEFAULT_CERTIFICATE_TEMPLATE,
  activeTenant
}) => {
  const [certIdInput, setCertIdInput] = useState(initialId);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCert, setVerifiedCert] = useState<IssuedCertificate | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = certIdInput.trim();
    if (!cleanId) return;

    setIsVerifying(true);
    setErrorMsg(null);
    setHasSearched(true);
    setVerifiedCert(null);

    try {
      const result = await verifyCertificateById(cleanId);
      if (result) {
        setVerifiedCert(result);
      } else {
        setErrorMsg(`No active certificate found matching "${cleanId}". Please check the ID and try again.`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Verification request failed. Please check network connection.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = () => {
    if (!verifiedCert) return;
    navigator.clipboard.writeText(verifiedCert.certificateId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div 
        className="bg-[var(--nb-surface)] rounded-lg w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        
        {/* Header */}
        <div 
          className="px-5 py-4 border-b-2 border-[var(--nb-ink)] flex items-center justify-between bg-[var(--nb-surface-accent)] shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded bg-[var(--nb-surface)] flex items-center justify-center text-emerald-600"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="nb-headline text-base text-[var(--nb-content)]">Certificate Verifier</h3>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)]">
                AUTHENTICATE ANY DEPARTMENTAL CERTIFICATE ID
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="nb-btn-icon !w-8 !h-8 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Box */}
        <div 
          className="p-4 sm:p-5 border-b-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] shrink-0"
        >
          <form onSubmit={handleVerify} className="flex gap-2">
            <div className="relative flex-grow">
              <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] font-mono" />
              <input
                type="text"
                placeholder={`e.g. CERT-${activeTenant?.shortCode || 'ORG'}-0501-A4B2...`}
                value={certIdInput}
                onChange={(e) => setCertIdInput(e.target.value)}
                className="w-full bg-[var(--nb-surface-accent)] rounded pl-9 pr-4 py-2.5 text-xs text-[var(--nb-content)] font-mono font-bold uppercase outline-none"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !certIdInput.trim()}
              className="px-4 py-2.5 rounded nb-btn font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Verify ID</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Verification Result Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-grow bg-[var(--nb-bg)]">
          {isVerifying && (
            <div className="py-12 text-center space-y-3">
              <div 
                className="w-10 h-10 border-3 border-[var(--nb-ink)] border-t-[var(--nb-accent)] rounded-full animate-spin mx-auto" 
              />
              <p className="nb-label text-xs text-[var(--nb-secondary)]">VALIDATING CRYPTOGRAPHIC RECORD IN DATABASE...</p>
            </div>
          )}

          {!isVerifying && errorMsg && (
            <div 
              className="p-4 rounded bg-rose-500/10 flex items-start gap-3 text-rose-600"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-1 text-xs">
                <div className="font-bold uppercase tracking-wider font-mono">Verification Failed</div>
                <p className="leading-relaxed font-medium">{errorMsg}</p>
              </div>
            </div>
          )}

          {!isVerifying && verifiedCert && (
            <div className="space-y-4 animate-fadeIn">
              {/* Authenticity Banner */}
              <div 
                className="p-4 rounded bg-emerald-400 text-black flex items-center justify-between gap-3"
                style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div 
                    className="w-9 h-9 rounded bg-[var(--nb-surface)] flex items-center justify-center text-[var(--nb-content)] shrink-0"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider font-mono truncate">
                      Official Verified Credential
                    </div>
                    <div className="text-[10px] font-bold opacity-80 truncate">
                      Tamper-evident record authenticated in institutional database
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-[var(--nb-surface)] text-[var(--nb-content)] text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                  title="Copy Certificate ID"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[var(--nb-content)]" />}
                  <span>{copied ? "COPIED" : "COPY ID"}</span>
                </button>
              </div>

              {/* Credential Attributes Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div 
                  className="bg-[var(--nb-surface)] rounded p-3 space-y-0.5 min-w-0"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <span className="nb-label text-[9px] text-[var(--nb-secondary)] block">RECIPIENT NAME</span>
                  <div className="nb-headline text-sm text-[var(--nb-content)] truncate">{verifiedCert.studentName}</div>
                </div>

                <div 
                  className="bg-[var(--nb-surface)] rounded p-3 space-y-0.5 min-w-0"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <span className="nb-label text-[9px] text-[var(--nb-secondary)] block">ROLL NUMBER</span>
                  <div className="font-bold text-[var(--nb-accent)] font-mono truncate">{verifiedCert.rollNumber}</div>
                </div>

                <div 
                  className="bg-[var(--nb-surface)] rounded p-3 space-y-0.5"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <span className="nb-label text-[9px] text-[var(--nb-secondary)] block">EVENT TITLE</span>
                  <div className="font-bold text-[var(--nb-content)] truncate">{verifiedCert.eventTitle}</div>
                </div>

                <div 
                  className="bg-[var(--nb-surface)] rounded p-3 space-y-0.5"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <span className="nb-label text-[9px] text-[var(--nb-secondary)] block">EVENT / ISSUE DATE</span>
                  <div className="font-bold text-[var(--nb-content)] font-mono">{verifiedCert.eventDate || verifiedCert.issueDate}</div>
                </div>

                <div 
                  className="bg-[var(--nb-surface)] rounded p-3 space-y-0.5 col-span-2"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <span className="nb-label text-[9px] text-[var(--nb-secondary)] block">CERTIFICATE ID</span>
                  <div className="font-mono font-bold text-emerald-600 tracking-wider text-xs">
                    {verifiedCert.certificateId}
                  </div>
                </div>
              </div>

              {/* Certificate Preview Card */}
              <div 
                className="rounded p-3 bg-[var(--nb-surface)] space-y-2"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <span className="nb-label text-[10px] text-[var(--nb-secondary)] block">
                  ORIGINAL CERTIFICATE RENDER
                </span>
                <CertificateCard
                  template={template}
                  studentName={verifiedCert.studentName}
                  rollNumber={verifiedCert.rollNumber}
                  event={{
                    title: verifiedCert.eventTitle,
                    date: verifiedCert.eventDate,
                    venue: verifiedCert.eventVenue
                  }}
                  certificateId={verifiedCert.certificateId}
                  issueDate={verifiedCert.issueDate}
                />
              </div>
            </div>
          )}

          {!hasSearched && (
            <div className="text-center py-10 px-4 space-y-2 text-[var(--nb-secondary)]">
              <Award className="w-10 h-10 mx-auto opacity-30 mb-1" />
              <p className="nb-headline text-sm text-[var(--nb-content)]">Institutional Verification Registry</p>
              <p className="nb-label text-[11px] max-w-sm mx-auto">
                PASTE ANY CERTIFICATE ID ABOVE TO VERIFY ITS AUTHENTICITY, ISSUING BODY, AND RECIPIENT CREDENTIALS.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="px-5 py-3 border-t-2 border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] flex items-center justify-between text-xs text-[var(--nb-secondary)] shrink-0"
        >
          <span className="nb-label text-[10px]">{(activeTenant?.name || activeTenant?.shortCode || 'INSTITUTIONAL').toUpperCase()} CREDENTIAL REGISTRY</span>
          <button
            onClick={onClose}
            className="nb-btn-ghost px-4 py-1.5 rounded font-bold text-xs uppercase cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerificationModal;
