import React, { useState } from 'react';
import { X, Save, RotateCcw, ShieldCheck, Mail, Phone, MapPin, Clock, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { SupportInfo, DEFAULT_SUPPORT_INFO } from '../types';
import { updateSupportInfo } from '../firebase';

interface EditSupportBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInfo?: SupportInfo;
  onSaved?: (updated: SupportInfo) => void;
}

export default function EditSupportBoxModal({
  isOpen,
  onClose,
  currentInfo,
  onSaved
}: EditSupportBoxModalProps) {
  const initialData: SupportInfo = currentInfo ? { ...DEFAULT_SUPPORT_INFO, ...currentInfo } : { ...DEFAULT_SUPPORT_INFO };

  const [formData, setFormData] = useState<SupportInfo>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if currentInfo changes when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData(currentInfo ? { ...DEFAULT_SUPPORT_INFO, ...currentInfo } : { ...DEFAULT_SUPPORT_INFO });
      setSaveSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, currentInfo]);

  if (!isOpen) return null;

  const handleChange = (field: keyof SupportInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all support box fields to department defaults?")) {
      setFormData({ ...DEFAULT_SUPPORT_INFO });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await updateSupportInfo(formData);
      setSaveSuccess(true);
      if (onSaved) {
        onSaved(formData);
      }
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Failed to save support info:", err);
      setErrorMessage(err.message || "Failed to update support info. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 select-none">
      <div 
        className="bg-[var(--nb-surface)] text-[var(--nb-content)] w-full max-w-lg rounded-lg max-h-[92vh] flex flex-col overflow-hidden"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
      >
        
        {/* Header */}
        <div 
          className="p-4 flex justify-between items-center bg-[var(--nb-surface-accent)]"
          style={{ borderBottom: '2px solid var(--nb-ink)' }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded bg-[var(--nb-ink)] text-[var(--nb-bg)] flex items-center justify-center"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <ShieldCheck className="w-4 h-4 text-[var(--nb-accent)]" />
            </div>
            <div>
              <h3 className="nb-headline text-base">Edit Support Box (Admin)</h3>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)]">
                Updates help desk contacts across Profile and Support views dynamically
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4 text-xs font-sans">
          
          {saveSuccess && (
            <div 
              className="p-3 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-xs font-bold"
              style={{ border: '1.5px solid currentColor' }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Support Box updated successfully! Changes are live across all devices.</span>
            </div>
          )}

          {errorMessage && (
            <div 
              className="p-3 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center gap-2 text-xs font-bold"
              style={{ border: '1.5px solid currentColor' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title & Subtitle */}
          <div 
            className="space-y-3 bg-[var(--nb-surface-accent)] p-3.5 rounded-md"
            style={{ border: '1.5px solid var(--nb-divider)' }}
          >
            <h4 className="nb-label text-[11px] text-[var(--nb-content)]">Desk Identity</h4>
            <div>
              <label className="nb-label text-[10px] block mb-1">
                Support Desk Title *
              </label>
              <input 
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Help & Support Desk"
                className="nb-input text-xs"
              />
            </div>

            <div>
              <label className="nb-label text-[10px] block mb-1">
                Badge Tag
              </label>
              <input 
                type="text"
                value={formData.badge || 'OFFICIAL CHANNELS'}
                onChange={(e) => handleChange('badge', e.target.value)}
                placeholder="e.g. OFFICIAL CHANNELS"
                className="nb-input text-xs"
              />
            </div>

            <div>
              <label className="nb-label text-[10px] block mb-1">
                Subtitle / Description
              </label>
              <input 
                type="text"
                value={formData.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                placeholder="e.g. Reach out to departmental coordinators, faculty advisors, and lab heads"
                className="nb-input text-xs"
              />
            </div>
          </div>

          {/* Contact Channels */}
          <div 
            className="space-y-3 bg-[var(--nb-surface-accent)] p-3.5 rounded-md"
            style={{ border: '1.5px solid var(--nb-divider)' }}
          >
            <h4 className="nb-label text-[11px] text-[var(--nb-content)]">Contact Details</h4>
            
            <div>
              <label className="nb-label text-[10px] block mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                Department Official Email *
              </label>
              <input 
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. hod.cse.aml@aits.edu"
                className="nb-input text-xs font-mono"
              />
            </div>

            <div>
              <label className="nb-label text-[10px] block mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                Hotline / Phone Number *
              </label>
              <input 
                type="text"
                required
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="nb-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Location & Timings */}
          <div 
            className="space-y-3 bg-[var(--nb-surface-accent)] p-3.5 rounded-md"
            style={{ border: '1.5px solid var(--nb-divider)' }}
          >
            <h4 className="nb-label text-[11px] text-[var(--nb-content)]">Physical Office / Lab</h4>
            
            <div>
              <label className="nb-label text-[10px] block mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                Location &amp; Lab Room
              </label>
              <input 
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g. NOTX AI & ML Innovation Lab: Room 314, Block 3, 2nd Floor"
                className="nb-input text-xs"
              />
            </div>

            <div>
              <label className="nb-label text-[10px] block mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                Operational Hours / Days
              </label>
              <input 
                type="text"
                value={formData.timing}
                onChange={(e) => handleChange('timing', e.target.value)}
                placeholder="e.g. Mon-Fri 9:00 AM - 4:30 PM"
                className="nb-input text-xs"
              />
            </div>
          </div>

          {/* Immediate Assistance / Notice */}
          <div 
            className="space-y-3 bg-[var(--nb-surface-accent)] p-3.5 rounded-md"
            style={{ border: '1.5px solid var(--nb-divider)' }}
          >
            <h4 className="nb-label text-[11px] text-[var(--nb-content)]">Immediate Guidance Note</h4>
            
            <div>
              <label className="nb-label text-[10px] block mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                Heading
              </label>
              <input 
                type="text"
                value={formData.urgentHelpTitle}
                onChange={(e) => handleChange('urgentHelpTitle', e.target.value)}
                placeholder="e.g. Need Immediate Assistance?"
                className="nb-input text-xs"
              />
            </div>

            <div>
              <label className="nb-label text-[10px] block mb-1">
                Notice / Help Text
              </label>
              <textarea 
                rows={3}
                value={formData.urgentHelpText}
                onChange={(e) => handleChange('urgentHelpText', e.target.value)}
                placeholder="e.g. For urgent exam hall clearances, project evaluations, or permissions..."
                className="nb-input text-xs resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="nb-btn-ghost text-xs !min-h-[40px] px-3 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="nb-btn flex-1 !min-h-[40px] cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
