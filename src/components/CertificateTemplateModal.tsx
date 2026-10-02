import React, { useState } from 'react';
import { 
  X, 
  Award, 
  Save, 
  RotateCcw, 
  Eye, 
  Sliders, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  Palette, 
  Type, 
  Building2, 
  FileText, 
  UserCheck 
} from 'lucide-react';
import { CertificateTemplate, DEFAULT_CERTIFICATE_TEMPLATE } from '../types';
import CertificateCard from './CertificateCard';

interface CertificateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate?: CertificateTemplate;
  onSave: (template: CertificateTemplate) => Promise<void>;
  isCertificatesEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => Promise<void>;
}

export const CertificateTemplateModal: React.FC<CertificateTemplateModalProps> = ({
  isOpen,
  onClose,
  currentTemplate,
  onSave,
  isCertificatesEnabled,
  onToggleEnabled
}) => {
  const [template, setTemplate] = useState<CertificateTemplate>(() => ({
    ...DEFAULT_CERTIFICATE_TEMPLATE,
    ...(currentTemplate || {})
  }));

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleInsertToken = (token: string) => {
    setTemplate(prev => ({
      ...prev,
      bodyText: `${prev.bodyText} ${token}`
    }));
  };

  const handleReset = () => {
    if (window.confirm("Reset certificate template to standard departmental defaults?")) {
      setTemplate(DEFAULT_CERTIFICATE_TEMPLATE);
      setFeedback({ type: 'success', message: 'Reset to default template settings.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      await onSave(template);
      setFeedback({ type: 'success', message: 'Certificate template updated successfully!' });
      setTimeout(() => {
        setFeedback(null);
      }, 2500);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to save certificate template.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggleEnabled(!isCertificatesEnabled);
      setFeedback({ 
        type: 'success', 
        message: !isCertificatesEnabled 
          ? 'Certificate feature is now ENABLED for all students.' 
          : 'Certificate feature is now PAUSED.' 
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to update certificate feature status.' });
    } finally {
      setIsToggling(false);
    }
  };

  const sampleEvent = {
    title: "AI & Neural Networks Masterclass",
    date: "28 Oct 2026",
    venue: "Main Auditorium, Campus Block-3"
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-4 select-none animate-fadeIn">
      <div 
        className="bg-[var(--nb-surface)] rounded-lg w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        
        {/* Header */}
        <div 
          className="px-5 py-4 border-b-2 border-[var(--nb-ink)] flex items-center justify-between bg-[var(--nb-surface-accent)] shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded bg-[var(--nb-surface)] flex items-center justify-center text-[var(--nb-accent)]"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="nb-headline text-base text-[var(--nb-content)]">Certificate Template & Feature Hub</h3>
                <span 
                  className={`nb-tag text-[9px] font-mono font-bold ${
                    isCertificatesEnabled ? 'bg-emerald-400 text-black' : 'bg-amber-400 text-black'
                  }`}
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  {isCertificatesEnabled ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)]">
                CONFIGURE DIGITAL EVENT CREDENTIALS AND DESIGN
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick feature switch in modal header */}
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                isCertificatesEnabled 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)]'
              }`}
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              title="Turn certificate issuing on or off"
            >
              <div className={`w-2 h-2 rounded-full ${isCertificatesEnabled ? 'bg-white' : 'bg-neutral-500'}`} />
              <span>{isCertificatesEnabled ? 'Feature On' : 'Feature Off'}</span>
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

        {/* Feedback alert banner */}
        {feedback && (
          <div 
            className={`px-5 py-2.5 text-xs font-bold font-mono flex items-center justify-between border-b-2 border-[var(--nb-ink)] ${
              feedback.type === 'success' 
                ? 'bg-emerald-400 text-black' 
                : 'bg-rose-500 text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {feedback.message}
            </span>
            <button onClick={() => setFeedback(null)} className="text-xs font-bold cursor-pointer">✕</button>
          </div>
        )}

        {/* Feature status callout banner */}
        {!isCertificatesEnabled && (
          <div 
            className="bg-amber-400 text-black border-b-2 border-[var(--nb-ink)] px-5 py-2 text-xs font-bold flex items-center justify-between"
          >
            <span>Notice: Certificate feature is currently PAUSED. Students cannot view or print certificates until you toggle it ON.</span>
            <button 
              onClick={handleToggle} 
              disabled={isToggling}
              className="underline font-bold uppercase cursor-pointer"
            >
              Turn On Now
            </button>
          </div>
        )}

        {/* Mobile View Switcher (Editor vs Live Preview) */}
        <div 
          className="flex md:hidden border-b-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-4 py-2 gap-2"
        >
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-1.5 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'editor' ? 'bg-[var(--nb-accent)] text-white' : 'nb-btn-ghost'
            }`}
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            Edit Settings
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-1.5 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'preview' ? 'bg-[var(--nb-accent)] text-white' : 'nb-btn-ghost'
            }`}
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            Live Preview
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x-2 divide-[var(--nb-ink)] bg-[var(--nb-bg)]">
          
          {/* LEFT: Controls & Form (7 cols on desktop) */}
          <div className={`md:col-span-6 lg:col-span-7 p-4 sm:p-6 overflow-y-auto space-y-6 ${
            activeTab === 'preview' ? 'hidden md:block' : 'block'
          }`}>
            <form id="certificate-form" onSubmit={handleSave} className="space-y-6">

              {/* Theme & Visual Styling Palette */}
              <div 
                className="bg-[var(--nb-surface)] rounded p-4 space-y-3"
                style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div className="flex items-center gap-2 nb-headline text-sm text-[var(--nb-content)]">
                  <Palette className="w-4 h-4 text-[var(--nb-accent)]" />
                  <span>Visual Theme & Seal Style</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600' },
                    { id: 'gold', name: 'Imperial Gold', bg: 'bg-amber-500' },
                    { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600' },
                    { id: 'crimson', name: 'Crimson', bg: 'bg-rose-600' },
                    { id: 'slate', name: 'Obsidian', bg: 'bg-neutral-800' }
                  ].map(thm => (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => setTemplate(t => ({ ...t, theme: thm.id as any }))}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        template.theme === thm.id 
                          ? 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)]' 
                          : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)] hover:bg-[var(--nb-surface-accent)]'
                      }`}
                      style={{
                        border: template.theme === thm.id ? '2px solid var(--nb-ink)' : '1.5px solid var(--nb-ink)',
                        boxShadow: template.theme === thm.id ? 'var(--shadow-hard-sm)' : 'none'
                      }}
                    >
                      <div 
                        className={`w-5 h-5 rounded-full ${thm.bg} flex items-center justify-center text-white`}
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        {template.theme === thm.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate">{thm.name}</span>
                    </button>
                  ))}
                </div>

                {/* Badge Seal Options & Accent Border Toggle */}
                <div className="pt-2 border-t-2 border-[var(--nb-ink)] grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="nb-label text-[10px] text-[var(--nb-secondary)] block mb-1">BADGE SYMBOL</label>
                    <select
                      value={template.badgeStyle || 'seal'}
                      onChange={(e) => setTemplate(t => ({ ...t, badgeStyle: e.target.value as any }))}
                      className="w-full bg-[var(--nb-surface-accent)] rounded px-2.5 py-1.5 text-xs font-bold text-[var(--nb-content)] outline-none"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                    >
                      <option value="seal">Academic Seal (Award)</option>
                      <option value="shield">Verified Shield</option>
                      <option value="star">Excellence Star</option>
                      <option value="ribbon">Distinction Sparkles</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={template.accentBorder}
                        onChange={(e) => setTemplate(t => ({ ...t, accentBorder: e.target.checked }))}
                        className="rounded accent-black w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-[var(--nb-content)] uppercase">Decorative Inner Border</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Organization Branding */}
              <div 
                className="bg-[var(--nb-surface)] rounded p-4 space-y-3"
                style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div className="flex items-center gap-2 nb-headline text-sm text-[var(--nb-content)]">
                  <Building2 className="w-4 h-4 text-[var(--nb-accent)]" />
                  <span>Issuing Organization & Department</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="nb-label text-[10px] text-[var(--nb-secondary)] block mb-1">ORGANIZATION HEADER</label>
                    <input
                      type="text"
                      value={template.orgName}
                      onChange={(e) => setTemplate(t => ({ ...t, orgName: e.target.value }))}
                      placeholder="e.g. NOTX Association"
                      className="w-full bg-[var(--nb-surface-accent)] rounded px-3 py-2 text-xs font-bold text-[var(--nb-content)] outline-none"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                      required
                    />
                  </div>

                  <div>
                    <label className="nb-label text-[10px] text-[var(--nb-secondary)] block mb-1">DEPARTMENT / BRANCH</label>
                    <input
                      type="text"
                      value={template.departmentName}
                      onChange={(e) => setTemplate(t => ({ ...t, departmentName: e.target.value }))}
                      placeholder="e.g. Department of Computer Science & Engineering"
                      className="w-full bg-[var(--nb-surface-accent)] rounded px-3 py-2 text-xs font-bold text-[var(--nb-content)] outline-none"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                      required
                    />
                  </div>

                  <div>
                    <label className="nb-label text-[10px] text-[var(--nb-secondary)] block mb-1">INSTITUTION SUBTITLE (OPTIONAL)</label>
                    <input
                      type="text"
                      value={template.institutionName || ''}
                      onChange={(e) => setTemplate(t => ({ ...t, institutionName: e.target.value }))}
                      placeholder="e.g. Department of Computer Science & Engineering"
                      className="w-full bg-[var(--nb-surface-accent)] rounded px-3 py-2 text-xs font-bold text-[var(--nb-content)] outline-none"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Certificate Titles & Wording */}
              <div 
                className="bg-[var(--nb-surface)] rounded p-4 space-y-3"
                style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div className="flex items-center gap-2 nb-headline text-sm text-[var(--nb-content)]">
                  <Type className="w-4 h-4 text-[var(--nb-accent)]" />
                  <span>Certificate Title & Body Text</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="nb-label text-[10px] text-[var(--nb-secondary)] block mb-1">CERTIFICATE TITLE</label>
                    <input
                      type="text"
                      value={template.certificateTitle}
                      onChange={(e) => setTemplate(t => ({ ...t, certificateTitle: e.target.value }))}
                      placeholder="e.g. Certificate of Participation"
                      className="w-full bg-[var(--nb-surface-accent)] rounded px-3 py-2 text-xs font-bold text-[var(--nb-content)] outline-none"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                      required
                    />
                  </div>

                  <div>
                    <label className="nb-label text-[10px] text-[var(--nb-secondary)] block mb-1">PRESENTATION STATEMENT</label>
                    <input
                      type="text"
                      value={template.certifyStatement}
                      onChange={(e) => setTemplate(t => ({ ...t, certifyStatement: e.target.value }))}
                      placeholder="e.g. This is to certify that"
                      className="w-full bg-[var(--nb-surface-accent)] rounded px-3 py-2 text-xs font-bold text-[var(--nb-content)] outline-none"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="nb-label text-[10px] text-[var(--nb-secondary)]">BODY DESCRIPTION TEMPLATE</label>
                    <span className="nb-label text-[9px] text-[var(--nb-accent)] font-bold">INSERT TOKEN:</span>
                  </div>

                  {/* Token Quick-Insert Pills */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {[
                      { label: '{eventTitle}', desc: 'Event Name' },
                      { label: '{eventDate}', desc: 'Event Date' },
                      { label: '{eventVenue}', desc: 'Venue' },
                      { label: '{name}', desc: 'Student Name' },
                      { label: '{rollNumber}', desc: 'Roll Number' }
                    ].map(tok => (
                      <button
                        key={tok.label}
                        type="button"
                        onClick={() => handleInsertToken(tok.label)}
                        className="nb-tag text-[10px] font-mono font-bold cursor-pointer"
                        style={{ border: '1px solid var(--nb-ink)' }}
                        title={`Append ${tok.desc}`}
                      >
                        + {tok.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={template.bodyText}
                    onChange={(e) => setTemplate(t => ({ ...t, bodyText: e.target.value }))}
                    rows={3}
                    placeholder="has successfully registered and participated in {eventTitle} held on {eventDate} at {eventVenue}."
                    className="w-full bg-[var(--nb-surface-accent)] rounded p-3 text-xs font-bold text-[var(--nb-content)] outline-none leading-relaxed"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                    required
                  />
                </div>
              </div>

              {/* Signatories Configuration */}
              <div 
                className="bg-[var(--nb-surface)] rounded p-4 space-y-3"
                style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div className="flex items-center gap-2 nb-headline text-sm text-[var(--nb-content)]">
                  <UserCheck className="w-4 h-4 text-[var(--nb-accent)]" />
                  <span>Certificate Signatories</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Signer 1 (Left) */}
                  <div 
                    className="p-3 rounded bg-[var(--nb-surface-accent)] space-y-2"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <span className="nb-label text-[10px] text-[var(--nb-accent)] block">PRIMARY SIGNATORY (LEFT)</span>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={template.signatory1Name}
                        onChange={(e) => setTemplate(t => ({ ...t, signatory1Name: e.target.value }))}
                        placeholder="Signer Name (e.g. Dr. H. Sharma)"
                        className="w-full bg-[var(--nb-surface)] rounded px-2.5 py-1.5 text-xs font-bold text-[var(--nb-content)] outline-none"
                        style={{ border: '1px solid var(--nb-ink)' }}
                        required
                      />
                      <input
                        type="text"
                        value={template.signatory1Title}
                        onChange={(e) => setTemplate(t => ({ ...t, signatory1Title: e.target.value }))}
                        placeholder="Designation (e.g. Head of Department)"
                        className="w-full bg-[var(--nb-surface)] rounded px-2.5 py-1.5 text-xs font-bold text-[var(--nb-content)] outline-none"
                        style={{ border: '1px solid var(--nb-ink)' }}
                        required
                      />
                      <input
                        type="text"
                        value={template.signatory1Dept}
                        onChange={(e) => setTemplate(t => ({ ...t, signatory1Dept: e.target.value }))}
                        placeholder="Dept / Unit (e.g. Academic Council)"
                        className="w-full bg-[var(--nb-surface)] rounded px-2.5 py-1.5 text-xs font-bold text-[var(--nb-content)] outline-none"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      />
                    </div>
                  </div>

                  {/* Signer 2 (Right) */}
                  <div 
                    className="p-3 rounded bg-[var(--nb-surface-accent)] space-y-2"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <span className="nb-label text-[10px] text-[var(--nb-accent)] block">SECONDARY SIGNATORY (RIGHT)</span>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={template.signatory2Name}
                        onChange={(e) => setTemplate(t => ({ ...t, signatory2Name: e.target.value }))}
                        placeholder="Signer Name (e.g. NOTX Connect)"
                        className="w-full bg-[var(--nb-surface)] rounded px-2.5 py-1.5 text-xs font-bold text-[var(--nb-content)] outline-none"
                        style={{ border: '1px solid var(--nb-ink)' }}
                        required
                      />
                      <input
                        type="text"
                        value={template.signatory2Title}
                        onChange={(e) => setTemplate(t => ({ ...t, signatory2Title: e.target.value }))}
                        placeholder="Designation (e.g. Faculty Lead)"
                        className="w-full bg-[var(--nb-surface)] rounded px-2.5 py-1.5 text-xs font-bold text-[var(--nb-content)] outline-none"
                        style={{ border: '1px solid var(--nb-ink)' }}
                        required
                      />
                      <input
                        type="text"
                        value={template.signatory2Dept}
                        onChange={(e) => setTemplate(t => ({ ...t, signatory2Dept: e.target.value }))}
                        placeholder="Unit (e.g. Verified Credential)"
                        className="w-full bg-[var(--nb-surface)] rounded px-2.5 py-1.5 text-xs font-bold text-[var(--nb-content)] outline-none"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification & Footer Note */}
              <div 
                className="bg-[var(--nb-surface)] rounded p-4 space-y-3"
                style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="nb-headline text-xs text-[var(--nb-content)]">Footer Verification Watermark</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.showVerificationBadge}
                      onChange={(e) => setTemplate(t => ({ ...t, showVerificationBadge: e.target.checked }))}
                      className="rounded accent-black w-4 h-4 cursor-pointer"
                    />
                    <span className="nb-label text-[11px] text-[var(--nb-content)]">SHOW NOTE</span>
                  </label>
                </div>

                {template.showVerificationBadge && (
                  <input
                    type="text"
                    value={template.footerNote || ''}
                    onChange={(e) => setTemplate(t => ({ ...t, footerNote: e.target.value }))}
                    placeholder="e.g. Verified Academic Credential • NOTX Connect"
                    className="w-full bg-[var(--nb-surface-accent)] rounded px-3 py-2 text-xs font-bold text-[var(--nb-content)] outline-none"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                )}
              </div>

            </form>
          </div>

          {/* RIGHT: Live Interactive Preview (5 cols on desktop) */}
          <div className={`md:col-span-6 lg:col-span-5 p-4 sm:p-6 bg-[var(--nb-surface-accent)] flex flex-col justify-between overflow-y-auto space-y-4 ${
            activeTab === 'editor' ? 'hidden md:flex' : 'flex'
          }`}>
            <div>
              <div className="flex items-center justify-between border-b-2 border-[var(--nb-ink)] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[var(--nb-accent)]" />
                  <span className="nb-headline text-sm text-[var(--nb-content)]">Live Certificate Preview</span>
                </div>
                <span className="nb-label text-[9px] text-[var(--nb-secondary)]">REAL-TIME RENDERING</span>
              </div>

              {/* Certificate Card Rendered with Live Template */}
              <div className="max-w-md mx-auto w-full transition-all">
                <CertificateCard
                  template={template}
                  studentName="AARAV S. VERMA"
                  rollNumber="22A91A0501"
                  event={sampleEvent}
                />
              </div>

              <div 
                className="mt-4 p-3 rounded bg-[var(--nb-surface)] text-[10px] text-[var(--nb-secondary)] space-y-1"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <div className="nb-headline text-xs text-[var(--nb-content)] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[var(--nb-accent)]" />
                  Print & PDF Ready
                </div>
                <p className="nb-label text-[10px] text-[var(--nb-secondary)]">
                  CHANGES SAVED HERE IMMEDIATELY APPLY TO ALL STUDENT EVENT CERTIFICATES ACROSS THE SYSTEM.
                </p>
              </div>
            </div>

            {/* Bottom Actions in preview section for mobile */}
            <div className="pt-3 border-t-2 border-[var(--nb-ink)] md:hidden flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className="flex-1 py-2 rounded nb-btn-ghost text-xs font-bold uppercase"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                Back to Edit
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div 
          className="px-5 py-3.5 border-t-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] flex flex-wrap items-center justify-between gap-3 shrink-0"
        >
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-1.5 nb-btn-ghost text-xs font-bold uppercase px-3 py-2 rounded cursor-pointer"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="nb-btn-ghost px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              Cancel
            </button>

            <button
              form="certificate-form"
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded nb-btn text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Template...' : 'Save Template'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CertificateTemplateModal;
