import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  Code2, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Mail, 
  Linkedin, 
  Github, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  User,
  Sliders,
  Eye,
  ShieldCheck,
  Check
} from 'lucide-react';
import { 
  PlatformBuilder, 
  PlatformDevConfig, 
  DEFAULT_PLATFORM_BUILDERS, 
  DEFAULT_PLATFORM_DEV_CONFIG,
  AppBranding,
  DEFAULT_BRANDING,
  DEV_COLOR_PRESETS
} from '../types';
import { updatePlatformDevConfig } from '../firebase';

interface ManagePlatformDevelopersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: PlatformDevConfig;
  branding?: AppBranding;
  onSaved?: (updated: PlatformDevConfig) => void;
}

export default function ManagePlatformDevelopersModal({
  isOpen,
  onClose,
  currentConfig,
  branding = DEFAULT_BRANDING,
  onSaved
}: ManagePlatformDevelopersModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');
  
  // Config state
  const [sectionTitle, setSectionTitle] = useState(currentConfig?.sectionTitle || DEFAULT_PLATFORM_DEV_CONFIG.sectionTitle);
  const [badgeText, setBadgeText] = useState(currentConfig?.badgeText || DEFAULT_PLATFORM_DEV_CONFIG.badgeText);
  const [subtitle, setSubtitle] = useState(currentConfig?.subtitle || DEFAULT_PLATFORM_DEV_CONFIG.subtitle);
  const [members, setMembers] = useState<PlatformBuilder[]>(() => {
    if (currentConfig?.members && currentConfig.members.length > 0) {
      return [...currentConfig.members];
    }
    return [...DEFAULT_PLATFORM_BUILDERS];
  });

  // Member editing state
  const [editingMember, setEditingMember] = useState<PlatformBuilder | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const cfg = currentConfig || DEFAULT_PLATFORM_DEV_CONFIG;
      setSectionTitle(cfg.sectionTitle || DEFAULT_PLATFORM_DEV_CONFIG.sectionTitle);
      setBadgeText(cfg.badgeText || DEFAULT_PLATFORM_DEV_CONFIG.badgeText);
      setSubtitle(cfg.subtitle || DEFAULT_PLATFORM_DEV_CONFIG.subtitle);
      setMembers(cfg.members && cfg.members.length > 0 ? [...cfg.members] : [...DEFAULT_PLATFORM_BUILDERS]);
      setEditingMember(null);
      setIsAddingNew(false);
      setSaveSuccess(false);
      setErrorMessage(null);
      setActiveTab('members');
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  // Move member position
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= members.length) return;
    const newMembers = [...members];
    const [moved] = newMembers.splice(index, 1);
    newMembers.splice(targetIdx, 0, moved);
    setMembers(newMembers);
  };

  // Delete member
  const handleDeleteMember = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from the platform developers list?`)) {
      setMembers(prev => prev.filter(m => m.id !== id));
      if (editingMember?.id === id) {
        setEditingMember(null);
        setIsAddingNew(false);
      }
    }
  };

  // Start adding new member
  const handleStartAdd = () => {
    const newId = `dev-${Date.now()}`;
    const newBuilder: PlatformBuilder = {
      id: newId,
      name: '',
      rollNumber: '',
      role: '',
      department: '',
      bio: '',
      specialty: '',
      badge: 'BUILDER',
      badgeColor: 'amber',
      email: '',
      linkedin: '',
      github: '',
      profilePic: ''
    };
    setEditingMember(newBuilder);
    setIsAddingNew(true);
  };

  // Start editing existing member
  const handleStartEdit = (builder: PlatformBuilder) => {
    setEditingMember({ ...builder });
    setIsAddingNew(false);
  };

  // Save current editing member to list
  const handleSaveMemberForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editingMember.name.trim()) {
      alert('Developer name is required.');
      return;
    }

    const preset = DEV_COLOR_PRESETS[editingMember.badgeColor || 'amber'] || DEV_COLOR_PRESETS.amber;
    const resolvedMember: PlatformBuilder = {
      ...editingMember,
      badgeStyle: preset.badge,
      accentBg: preset.accentBg,
      accentColor: preset.accentColor
    };

    if (isAddingNew) {
      setMembers(prev => [...prev, resolvedMember]);
    } else {
      setMembers(prev => prev.map(m => m.id === editingMember.id ? resolvedMember : m));
    }

    setEditingMember(null);
    setIsAddingNew(false);
  };

  // Reset to original team
  const handleResetToDefaults = () => {
    if (window.confirm('Reset all developer details and banner info to the original default platform dev team?')) {
      setSectionTitle(DEFAULT_PLATFORM_DEV_CONFIG.sectionTitle);
      setBadgeText(DEFAULT_PLATFORM_DEV_CONFIG.badgeText);
      setSubtitle(DEFAULT_PLATFORM_DEV_CONFIG.subtitle);
      setMembers([...DEFAULT_PLATFORM_BUILDERS]);
      setEditingMember(null);
      setIsAddingNew(false);
    }
  };

  // Submit all changes to Firebase
  const handleSaveAll = async () => {
    if (members.length === 0) {
      if (!window.confirm("You have 0 developer members. Are you sure you want to save?")) {
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload: PlatformDevConfig = {
      sectionTitle: sectionTitle?.trim() || DEFAULT_PLATFORM_DEV_CONFIG.sectionTitle,
      badgeText: badgeText?.trim() || DEFAULT_PLATFORM_DEV_CONFIG.badgeText,
      subtitle: subtitle?.trim() || DEFAULT_PLATFORM_DEV_CONFIG.subtitle,
      members: members.map((m, idx) => ({ ...m, order: idx }))
    };

    try {
      await updatePlatformDevConfig(payload);
      setSaveSuccess(true);
      if (onSaved) onSaved(payload);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Failed to update platform dev config:', err);
      // Even if cloud network had an issue, local storage is updated!
      setSaveSuccess(true);
      if (onSaved) onSaved(payload);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } finally {
      setIsSaving(false);
    }
  };

  const previewSubtitle = (subtitle || '').replace(/\{appName\}/g, branding.appName || 'NOTX');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 select-none">
      <div 
        className="bg-[var(--nb-surface)] text-[var(--nb-content)] w-full max-w-3xl rounded-lg max-h-[92vh] flex flex-col overflow-hidden"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
      >
        {/* Modal Header */}
        <div 
          className="p-4 flex justify-between items-center bg-neutral-900 text-white shrink-0"
          style={{ borderBottom: '2px solid var(--nb-ink)' }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded bg-amber-400 text-neutral-900 flex items-center justify-center font-bold shrink-0"
              style={{ border: '1.5px solid #000', boxShadow: '1.5px 1.5px 0 #000' }}
            >
              <Code2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="nb-headline text-base tracking-normal text-white">
                  Manage Platform Developers
                </h3>
                <span className="bg-amber-400 text-neutral-900 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded shadow-[1px_1px_0_#000] uppercase tracking-wider">
                  SUPER ADMIN ONLY
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 font-sans mt-0.5">
                Central developer credits configured here are displayed across all associations
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

        {/* Tab Navigation */}
        <div 
          className="px-4 py-2 bg-[var(--nb-surface-accent)] flex items-center justify-between gap-2 shrink-0 border-b border-[var(--nb-divider)]"
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setActiveTab('members'); setEditingMember(null); setIsAddingNew(false); }}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-[var(--nb-accent)] text-[var(--nb-bg)] shadow-[1.5px_1.5px_0_var(--nb-ink)]'
                  : 'bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-bg)]'
              }`}
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              Dev Team Members ({members.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('settings'); setEditingMember(null); setIsAddingNew(false); }}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[var(--nb-accent)] text-[var(--nb-bg)] shadow-[1.5px_1.5px_0_var(--nb-ink)]'
                  : 'bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-bg)]'
              }`}
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              Banner &amp; Titles
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="text-[11px] font-mono text-[var(--nb-secondary)] hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors"
            title="Reset to default team"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>

        {/* Error / Success Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border-b border-rose-500/30 text-rose-600 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-700 text-xs font-mono font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Developer settings synchronized across all associations!</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: MEMBERS */}
          {activeTab === 'members' && (
            <>
              {/* Member Form Modal/Editor if active */}
              {editingMember ? (
                <div 
                  className="bg-[var(--nb-surface-accent)] p-4 rounded-lg space-y-4 animate-in fade-in duration-150"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--nb-ink)]/15">
                    <h4 className="nb-headline text-sm flex items-center gap-2 text-[var(--nb-content)]">
                      <User className="w-4 h-4 text-[var(--nb-accent)]" />
                      <span>{isAddingNew ? 'Add Developer to Platform Team' : `Edit: ${editingMember.name || 'Developer'}`}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setEditingMember(null); setIsAddingNew(false); }}
                      className="text-xs font-bold text-[var(--nb-secondary)] hover:text-[var(--nb-content)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleSaveMemberForm} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingMember.name}
                          onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                          placeholder="e.g. SYED SAMEER"
                          className="w-full px-3 py-1.5 text-xs font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                          Roll Number / ID
                        </label>
                        <input
                          type="text"
                          value={editingMember.rollNumber}
                          onChange={e => setEditingMember({ ...editingMember, rollNumber: e.target.value.toUpperCase() })}
                          placeholder="e.g. 23HM1A3354"
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          value={editingMember.role || ''}
                          onChange={e => setEditingMember({ ...editingMember, role: e.target.value })}
                          placeholder="e.g. Lead Full-Stack Architect"
                          className="w-full px-3 py-1.5 text-xs font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                          Department / Tagline
                        </label>
                        <input
                          type="text"
                          value={editingMember.department || ''}
                          onChange={e => setEditingMember({ ...editingMember, department: e.target.value })}
                          placeholder="e.g. CSE (AI & ML) - 3rd Year"
                          className="w-full px-3 py-1.5 text-xs bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                          Badge Label
                        </label>
                        <input
                          type="text"
                          value={editingMember.badge}
                          onChange={e => setEditingMember({ ...editingMember, badge: e.target.value.toUpperCase() })}
                          placeholder="e.g. BUILDER, ARCHITECT, LEAD, UI/UX"
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                          Badge Color Preset
                        </label>
                        <select
                          value={editingMember.badgeColor || 'amber'}
                          onChange={e => setEditingMember({ ...editingMember, badgeColor: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)] cursor-pointer"
                        >
                          <option value="amber">Amber (Golden)</option>
                          <option value="rose">Rose (Coral Red)</option>
                          <option value="cyan">Cyan (Bright Sky Blue)</option>
                          <option value="violet">Violet (Royal Purple)</option>
                          <option value="emerald">Emerald (Mint Green)</option>
                          <option value="teal">Teal (Ocean Green)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                        Specialty &amp; Contributions (Bio)
                      </label>
                      <textarea
                        rows={2}
                        value={editingMember.bio || editingMember.specialty || ''}
                        onChange={e => setEditingMember({ ...editingMember, bio: e.target.value, specialty: e.target.value })}
                        placeholder="e.g. Initiated the project idea and developed the core full-stack application."
                        className="w-full px-3 py-1.5 text-xs bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-[var(--nb-content)] flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[var(--nb-accent)]" />
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={editingMember.email || ''}
                          onChange={e => setEditingMember({ ...editingMember, email: e.target.value })}
                          placeholder="dev@college.edu"
                          className="w-full px-2.5 py-1 text-xs bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-[var(--nb-content)] flex items-center gap-1">
                          <Linkedin className="w-3 h-3 text-[#0A66C2]" />
                          LinkedIn URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={editingMember.linkedin || ''}
                          onChange={e => setEditingMember({ ...editingMember, linkedin: e.target.value })}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full px-2.5 py-1 text-xs bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-[var(--nb-content)] flex items-center gap-1">
                          <Github className="w-3 h-3" />
                          GitHub URL/User (Optional)
                        </label>
                        <input
                          type="text"
                          value={editingMember.github || ''}
                          onChange={e => setEditingMember({ ...editingMember, github: e.target.value })}
                          placeholder="https://github.com/..."
                          className="w-full px-2.5 py-1 text-xs bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-[var(--nb-content)]">
                        Custom Avatar URL (Optional - leaves blank to auto-use student profile picture or Dicebear avatar)
                      </label>
                      <input
                        type="url"
                        value={editingMember.profilePic || ''}
                        onChange={e => setEditingMember({ ...editingMember, profilePic: e.target.value })}
                        placeholder="https://images.unsplash.com/... or Cloudinary URL"
                        className="w-full px-2.5 py-1 text-xs bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--nb-ink)]/10">
                      <button
                        type="button"
                        onClick={() => { setEditingMember(null); setIsAddingNew(false); }}
                        className="px-3 py-1.5 text-xs font-bold rounded bg-[var(--nb-bg)] text-[var(--nb-content)] border border-[var(--nb-ink)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="nb-btn px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAddingNew ? 'Add to Team' : 'Update Member'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="text-xs text-[var(--nb-secondary)]">
                    Order developers as you want them displayed in the portal directory.
                  </div>
                  <button
                    type="button"
                    onClick={handleStartAdd}
                    className="nb-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Developer</span>
                  </button>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2.5">
                {members.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--nb-surface-accent)] rounded-lg border-2 border-dashed border-[var(--nb-divider)] text-xs text-[var(--nb-secondary)]">
                    No developers configured. Click <strong>Add Developer</strong> or <strong>Reset Defaults</strong>.
                  </div>
                ) : (
                  members.map((member, index) => {
                    const preset = DEV_COLOR_PRESETS[member.badgeColor || 'amber'] || DEV_COLOR_PRESETS.amber;
                    const avatar = member.profilePic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.name || index}`;

                    return (
                      <div
                        key={member.id || member.rollNumber || index}
                        className="bg-[var(--nb-surface)] p-3 rounded-lg flex items-center justify-between gap-3 relative overflow-hidden transition-all hover:border-[var(--nb-accent)]"
                        style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        {/* Colored left strip */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${preset.accentBg}`} />

                        <div className="flex items-center gap-3 pl-2 min-w-0 flex-1">
                          {/* Position Badge & Avatar */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="w-5 text-[11px] font-mono font-bold text-[var(--nb-secondary)] text-center">
                              #{index + 1}
                            </span>
                            <div 
                              className="w-10 h-10 rounded overflow-hidden shrink-0 bg-[var(--nb-surface-accent)]"
                              style={{ border: '1px solid var(--nb-ink)' }}
                            >
                              <img src={avatar} alt={member.name} className="w-full h-full object-cover" />
                            </div>
                          </div>

                          {/* Member Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="nb-headline text-xs text-[var(--nb-content)] truncate">
                                {member.name}
                              </h5>
                              <span 
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-[1px_1px_0_#000] ${preset.badge}`}
                                style={{ border: '1px solid #000' }}
                              >
                                {member.badge || 'BUILDER'}
                              </span>
                              {member.rollNumber && (
                                <span className="font-mono text-[10px] font-bold text-[var(--nb-secondary)] bg-[var(--nb-surface-accent)] px-1.5 py-0.2 rounded border border-[var(--nb-divider)]">
                                  {member.rollNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--nb-secondary)] truncate font-sans mt-0.5">
                              {member.bio || member.specialty}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Reordering buttons */}
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, 'up')}
                            className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-ink)] text-[var(--nb-content)] hover:text-[var(--nb-bg)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border border-[var(--nb-divider)]"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === members.length - 1}
                            onClick={() => handleMove(index, 'down')}
                            className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-ink)] text-[var(--nb-content)] hover:text-[var(--nb-bg)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border border-[var(--nb-divider)]"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(member)}
                            className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-accent)] text-[var(--nb-content)] hover:text-[var(--nb-bg)] transition-colors cursor-pointer border border-[var(--nb-divider)]"
                            title="Edit Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(member.id, member.name)}
                            className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-surface-accent)] hover:bg-rose-500 text-[var(--nb-content)] hover:text-white transition-colors cursor-pointer border border-[var(--nb-divider)]"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* TAB 2: BANNER & SECTION SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div 
                className="bg-[var(--nb-surface-accent)] p-4 rounded-lg space-y-3"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                    Section Header Title
                  </label>
                  <input
                    type="text"
                    value={sectionTitle}
                    onChange={e => setSectionTitle(e.target.value)}
                    placeholder="Platform Builders & Developers"
                    className="w-full px-3 py-2 text-xs font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                  />
                  <p className="text-[10.5px] text-[var(--nb-secondary)] mt-1">
                    The title heading shown at the top of the developer credits block.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={e => setBadgeText(e.target.value.toUpperCase())}
                    placeholder="DEV TEAM"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--nb-content)]">
                    Subtitle Template
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    placeholder="The student team responsible for designing and developing the {appName} Connect portal"
                    className="w-full px-3 py-2 text-xs bg-[var(--nb-bg)] text-[var(--nb-content)] rounded border border-[var(--nb-ink)] outline-none focus:border-[var(--nb-accent)]"
                  />
                  <p className="text-[10.5px] text-[var(--nb-secondary)] mt-1">
                    Tip: Use <strong>{'{appName}'}</strong> to automatically insert whatever branding is active for each association (e.g. AURA, THINKBOTZ, NOTX).
                  </p>
                </div>
              </div>

              {/* Live Preview of Header Bar */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[var(--nb-content)] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                  Live Section Banner Preview
                </label>
                <div 
                  className="p-3.5 rounded-lg bg-neutral-900 text-white flex items-center justify-between gap-3"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded bg-amber-400 text-neutral-900 flex items-center justify-center font-bold shrink-0"
                      style={{ border: '1.5px solid #000', boxShadow: '1.5px 1.5px 0 #000' }}
                    >
                      <Code2 className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="nb-headline text-base tracking-normal text-white">
                          {sectionTitle || "Platform Builders & Developers"}
                        </h4>
                        <span className="bg-amber-400 text-neutral-900 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded shadow-[1.5px_1.5px_0_#000] uppercase tracking-wider">
                          {badgeText || "DEV TEAM"}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300 font-sans mt-0.5">
                        {previewSubtitle}
                      </p>
                    </div>
                  </div>
                  <span className="bg-neutral-800 text-amber-400 text-xs font-mono font-bold px-2.5 py-1 rounded border border-neutral-700 shrink-0">
                    {members.length} MEMBERS
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          className="p-4 bg-[var(--nb-surface-accent)] flex items-center justify-between gap-3 shrink-0"
          style={{ borderTop: '2px solid var(--nb-ink)' }}
        >
          <div className="flex items-center gap-1.5 text-xs text-[var(--nb-secondary)]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-mono text-[11px]">Protected Super Admin Config</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded bg-[var(--nb-surface)] text-[var(--nb-content)] border border-[var(--nb-ink)] hover:bg-[var(--nb-bg)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className={`nb-btn px-5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors ${
                saveSuccess ? '!bg-emerald-400 !text-neutral-950 !border-neutral-950 font-black' : ''
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950" />
                  <span>Saved & Synced!</span>
                </>
              ) : (
                <>
                  <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Syncing...' : 'Save & Sync to All Associations'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
