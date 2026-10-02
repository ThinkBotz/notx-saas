import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Upload, 
  Check, 
  Image as ImageIcon, 
  Sliders, 
  Eye, 
  RefreshCw,
  Palette,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { AppBranding, DEFAULT_BRANDING } from '../types';
import BrandLogo, { BRAND_ICONS, ACCENT_THEMES } from './BrandLogo';
import { updateAppBranding } from '../firebase';

interface EditBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranding?: AppBranding;
  onSaved?: (updated: AppBranding) => void;
  tenantId?: string;
}

export default function EditBrandingModal({
  isOpen,
  onClose,
  currentBranding = DEFAULT_BRANDING,
  onSaved,
  tenantId
}: EditBrandingModalProps) {
  const [appName, setAppName] = useState(currentBranding.appName || 'NOTX');
  const [tagline, setTagline] = useState(currentBranding.tagline || 'Connect');
  const [subtitle, setSubtitle] = useState(currentBranding.subtitle || 'AI & ML');
  const [logoType, setLogoType] = useState<'preset' | 'custom'>(currentBranding.logoType || 'preset');
  const [logoIcon, setLogoIcon] = useState(currentBranding.logoIcon || 'Cpu');
  const [logoImageUrl, setLogoImageUrl] = useState(currentBranding.logoImageUrl || '');
  const [accentColor, setAccentColor] = useState(currentBranding.accentColor || 'indigo');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Live draft object for real-time preview
  const liveDraft: AppBranding = {
    appName: appName.trim() || 'NOTX',
    tagline: tagline.trim(),
    subtitle: subtitle.trim(),
    logoType,
    logoIcon,
    logoImageUrl,
    accentColor
  };

  const currentTheme = ACCENT_THEMES[accentColor] || ACCENT_THEMES.indigo;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 1.5MB for fast loading.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoImageUrl(base64);
      setLogoType('custom');
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      setErrorMsg('Brand name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updated: AppBranding = {
        appName: appName.trim(),
        tagline: tagline.trim(),
        subtitle: subtitle.trim(),
        logoType,
        logoIcon,
        logoImageUrl: logoType === 'custom' ? logoImageUrl : '',
        accentColor,
        updatedAt: new Date().toISOString()
      };

      await updateAppBranding(updated, tenantId);
      if (onSaved) onSaved(updated);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save brand settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = () => {
    setAppName(DEFAULT_BRANDING.appName);
    setTagline(DEFAULT_BRANDING.tagline || '');
    setSubtitle(DEFAULT_BRANDING.subtitle || '');
    setLogoType(DEFAULT_BRANDING.logoType);
    setLogoIcon(DEFAULT_BRANDING.logoIcon || 'Cpu');
    setLogoImageUrl('');
    setAccentColor(DEFAULT_BRANDING.accentColor || 'indigo');
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div 
        className="bg-[var(--nb-surface)] rounded-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        {/* Modal Header */}
        <div 
          className="p-4 border-b-2 border-[var(--nb-ink)] flex items-center justify-between bg-[var(--nb-surface-accent)] shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded bg-[var(--nb-surface)] flex items-center justify-center text-[var(--nb-accent)]"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="nb-headline text-base text-[var(--nb-content)]">Portal Branding & Logo Customizer</h3>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)]">
                DYNAMICALLY CUSTOMIZE APPLICATION NAME, CREST & ACCENT
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs flex-grow bg-[var(--nb-bg)]">
          {errorMsg && (
            <div 
              className="p-2.5 rounded bg-rose-500/10 text-rose-600 font-bold text-xs"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              {errorMsg}
            </div>
          )}

          {/* LIVE HEADER PREVIEW */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="nb-label text-[10px] text-[var(--nb-secondary)] flex items-center gap-1">
                <Eye className="w-3 h-3 text-[var(--nb-accent)]" />
                <span>LIVE NAVIGATION BAR PREVIEW</span>
              </span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="nb-label text-[10px] text-[var(--nb-accent)] font-bold cursor-pointer underline"
              >
                Reset to default
              </button>
            </div>

            <div 
              className="p-3 rounded bg-[var(--nb-surface)] flex items-center justify-between"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandLogo branding={liveDraft} size="md" />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <h4 className="nb-headline text-base text-[var(--nb-content)] tracking-tight truncate">
                      {liveDraft.appName}
                    </h4>
                    {liveDraft.subtitle && (
                      <span 
                        className="nb-tag text-[9px] font-mono font-bold"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        {liveDraft.subtitle}
                      </span>
                    )}
                  </div>
                  <p className="nb-label text-[9px] text-[var(--nb-secondary)] leading-none mt-0.5 flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span>{liveDraft.tagline ? `${liveDraft.tagline.toUpperCase()} PORTAL` : 'CONNECTED PORTAL'}</span>
                  </p>
                </div>
              </div>

              <span 
                className="nb-tag text-[9px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)]"
                style={{ border: '1px solid var(--nb-ink)' }}
              >
                ACTIVE
              </span>
            </div>
          </div>

          {/* 1. BRAND NAME & TAGLINE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
                BRAND NAME * (E.G. NOTX)
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. NOTX or THINKBOTZ"
                className="w-full bg-[var(--nb-surface-accent)] rounded text-xs text-[var(--nb-content)] font-bold py-2 px-3 outline-none uppercase font-mono"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              />
            </div>

            <div>
              <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
                DEPARTMENT BADGE (E.G. AI & ML)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. AI & ML, CSE, IT"
                className="w-full bg-[var(--nb-surface-accent)] rounded text-xs text-[var(--nb-content)] font-bold py-2 px-3 outline-none"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              />
            </div>
          </div>

          {/* 2. TAGLINE */}
          <div>
            <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
              PORTAL SUFFIX / TAGLINE
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Connect, Hub, Portal, Community"
              className="w-full bg-[var(--nb-surface-accent)] rounded text-xs text-[var(--nb-content)] font-bold py-2 px-3 outline-none"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            />
          </div>

          {/* 3. LOGO TYPE: PRESET VS CUSTOM */}
          <div className="space-y-1.5">
            <label className="block nb-label text-[10px] text-[var(--nb-secondary)]">
              LOGO PRESENTATION STYLE
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLogoType('preset')}
                className={`p-2.5 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  logoType === 'preset'
                    ? 'bg-[var(--nb-accent)] text-white'
                    : 'bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)]'
                }`}
                style={{
                  border: '1.5px solid var(--nb-ink)',
                  boxShadow: logoType === 'preset' ? 'var(--shadow-hard-sm)' : 'none'
                }}
              >
                <Cpu className="w-4 h-4" />
                <span>Tech Icon Preset</span>
              </button>

              <button
                type="button"
                onClick={() => setLogoType('custom')}
                className={`p-2.5 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  logoType === 'custom'
                    ? 'bg-[var(--nb-accent)] text-white'
                    : 'bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)]'
                }`}
                style={{
                  border: '1.5px solid var(--nb-ink)',
                  boxShadow: logoType === 'custom' ? 'var(--shadow-hard-sm)' : 'none'
                }}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Custom Image / Crest</span>
              </button>
            </div>
          </div>

          {/* 4. PRESET ICONS GRID */}
          {logoType === 'preset' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="nb-label text-[10px] text-[var(--nb-secondary)]">
                  CHOOSE LOGO ICON
                </span>
                <span className="nb-label text-[9.5px] text-[var(--nb-secondary)]">SELECTED: {logoIcon.toUpperCase()}</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {Object.keys(BRAND_ICONS).map((iconKey) => {
                  const IconComp = BRAND_ICONS[iconKey];
                  const isSelected = logoIcon === iconKey;
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setLogoIcon(iconKey)}
                      title={iconKey}
                      className={`h-10 rounded border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)]'
                          : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                      }`}
                      style={{
                        border: isSelected ? '2px solid var(--nb-ink)' : '1.5px solid var(--nb-ink)',
                        boxShadow: isSelected ? 'var(--shadow-hard-sm)' : 'none'
                      }}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              {/* Accent Color Picker */}
              <div className="space-y-1.5 pt-1">
                <span className="nb-label text-[10px] text-[var(--nb-secondary)] flex items-center gap-1">
                  <Palette className="w-3 h-3 text-[var(--nb-accent)]" />
                  <span>LOGO ACCENT PALETTE</span>
                </span>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'indigo', label: 'Indigo', color: 'bg-indigo-600' },
                    { id: 'violet', label: 'Violet', color: 'bg-violet-600' },
                    { id: 'emerald', label: 'Emerald', color: 'bg-emerald-600' },
                    { id: 'cyan', label: 'Cyan', color: 'bg-cyan-600' },
                    { id: 'amber', label: 'Amber', color: 'bg-amber-500' },
                    { id: 'rose', label: 'Rose', color: 'bg-rose-600' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAccentColor(c.id)}
                      className={`p-1.5 rounded flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase transition-all cursor-pointer ${
                        accentColor === c.id
                          ? 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)]'
                          : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)]'
                      }`}
                      style={{
                        border: accentColor === c.id ? '2px solid var(--nb-ink)' : '1.5px solid var(--nb-ink)',
                        boxShadow: accentColor === c.id ? 'var(--shadow-hard-sm)' : 'none'
                      }}
                    >
                      <span 
                        className={`w-3 h-3 rounded-full ${c.color} shrink-0`} 
                        style={{ border: '1px solid var(--nb-ink)' }}
                      />
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* CUSTOM LOGO IMAGE UPLOADER */
            <div className="space-y-3">
              <span className="nb-label text-[10px] text-[var(--nb-secondary)]">
                UPLOAD ASSOCIATION LOGO / CREST
              </span>

              <div 
                className="p-3.5 bg-[var(--nb-surface)] rounded space-y-3"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded bg-[var(--nb-surface-accent)] overflow-hidden flex items-center justify-center shrink-0"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    {logoImageUrl ? (
                      <img src={logoImageUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-[var(--nb-secondary)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <label 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded nb-btn font-bold text-xs uppercase cursor-pointer"
                      style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="nb-label text-[10px] text-[var(--nb-secondary)]">PNG, JPG, OR SVG TRANSPARENT RECOMMENDED</p>
                  </div>
                </div>

                <div>
                  <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
                    OR PASTE IMAGE URL DIRECTLY:
                  </label>
                  <input
                    type="url"
                    value={logoImageUrl}
                    onChange={(e) => setLogoImageUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-[var(--nb-surface-accent)] rounded text-xs text-[var(--nb-content)] py-2 px-3 outline-none font-mono text-[11px]"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-[var(--nb-ink)]">
            <button
              type="button"
              onClick={onClose}
              className="nb-btn-ghost px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !appName.trim()}
              className="nb-btn px-5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Update Portal Brand & Logo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
