import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Archive, 
  Users, 
  Calendar, 
  Ticket, 
  Lock, 
  Check, 
  RefreshCw,
  Building2,
  FileText
} from 'lucide-react';
import { Tenant, UserProfile } from '../types';
import { deleteTenant, DEFAULT_TENANT_ID } from '../firebase';
import { resolveTenantTheme } from '../utils/themePresets';

interface DeleteTenantModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSuccess: (deletedTenantId: string, backupId?: string) => void;
  onViewVault?: () => void;
  stats?: {
    users: number;
    events: number;
    registrations: number;
  };
  currentUser: UserProfile;
}

type StepKey = 'impact' | 'checklist' | 'verification' | 'executing' | 'completed';

export default function DeleteTenantModal({
  isOpen,
  tenant,
  onClose,
  onSuccess,
  onViewVault,
  stats,
  currentUser
}: DeleteTenantModalProps) {
  const [currentStep, setCurrentStep] = useState<StepKey>('impact');
  
  // Step 2: Safety checklist states
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  // Step 3: Verification states
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [reasonCategory, setReasonCategory] = useState('End of Academic Year / Term Completed');
  const [reasonNotes, setReasonNotes] = useState('');

  // Step 4: Execution states
  const [executionStep, setExecutionStep] = useState<number>(1);
  const [executionMessage, setExecutionMessage] = useState<string>('Preparing de-provisioning sequence...');
  const [completedBackupId, setCompletedBackupId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset form when modal opens or tenant changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('impact');
      setCheck1(false);
      setCheck2(false);
      setCheck3(false);
      setTypedConfirmation('');
      setReasonCategory('End of Academic Year / Term Completed');
      setReasonNotes('');
      setExecutionStep(1);
      setExecutionMessage('Preparing de-provisioning sequence...');
      setCompletedBackupId(null);
      setExecutionError(null);
      setIsDeleting(false);
    }
  }, [isOpen, tenant]);

  if (!isOpen || !tenant) return null;

  const isDefaultTenant = tenant.tenantId.trim().toLowerCase() === DEFAULT_TENANT_ID;
  const themeConfig = tenant.branding?.theme || resolveTenantTheme(tenant.branding);

  // Check if typed confirmation matches exactly
  const targetSlug = tenant.tenantId.trim().toLowerCase();
  const normalizedTyped = typedConfirmation.trim().toLowerCase();
  const isMatch = normalizedTyped === targetSlug || normalizedTyped === `delete ${targetSlug}`;

  const allChecksPassed = check1 && check2 && check3;

  const handleExecuteDeletion = async () => {
    if (!isMatch || isDeleting) return;

    setIsDeleting(true);
    setCurrentStep('executing');
    setExecutionError(null);

    try {
      const fullReason = reasonNotes.trim() 
        ? `${reasonCategory}: ${reasonNotes.trim()}`
        : reasonCategory;

      const backup = await deleteTenant(
        tenant.tenantId,
        {
          uid: currentUser.uid,
          email: currentUser.email || 'superadmin@notx.app',
          name: currentUser.name || 'Super Admin',
          role: 'superadmin',
          isSuperAdmin: true
        },
        {
          reason: fullReason,
          onProgress: (step, _total, message) => {
            setExecutionStep(step);
            setExecutionMessage(message);
          }
        }
      );

      setCompletedBackupId(backup.backupId);
      setCurrentStep('completed');
      onSuccess(tenant.tenantId, backup.backupId);
    } catch (err: any) {
      console.error('Error during tenant de-provisioning:', err);
      setExecutionError(err?.message || 'An unexpected error occurred during tenant de-provisioning.');
      setIsDeleting(false);
    }
  };

  const stepsList = [
    { key: 'impact', label: '1. Impact' },
    { key: 'checklist', label: '2. Safeguards' },
    { key: 'verification', label: '3. Verify' },
    { key: 'executing', label: '4. Decommission' }
  ];

  const getStepStatus = (stepKey: string) => {
    const order: StepKey[] = ['impact', 'checklist', 'verification', 'executing', 'completed'];
    const curIdx = order.indexOf(currentStep);
    const targetIdx = order.indexOf(stepKey as StepKey);

    if (curIdx > targetIdx || currentStep === 'completed') return 'done';
    if (curIdx === targetIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[var(--nb-surface)] border-2 border-[var(--nb-ink)] rounded-2xl shadow-[6px_6px_0_var(--nb-ink)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Warning Indicator */}
        <div className="p-4 sm:p-5 border-b-2 border-[var(--nb-ink)] bg-rose-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-rose-500 text-white">
                  Danger Zone
                </span>
                <span className="text-[11px] font-mono text-[var(--nb-secondary)]">
                  De-provision Organization
                </span>
              </div>
              <h3 className="text-lg font-black font-display text-[var(--nb-content)]">
                Delete Tenant: {tenant.name}
              </h3>
            </div>
          </div>

          {currentStep !== 'executing' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[var(--nb-ink)] hover:bg-[var(--nb-surface-accent)] cursor-pointer transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-5 py-3 border-b border-[var(--nb-ink)]/15 bg-[var(--nb-surface-accent)]/40">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-[var(--nb-ink)]/15 -z-0" />
            
            {stepsList.map((s, idx) => {
              const status = getStepStatus(s.key);
              return (
                <div key={s.key} className="flex items-center gap-1.5 bg-[var(--nb-surface)] px-2 py-0.5 rounded-md border border-[var(--nb-ink)]/30 z-10 text-[10px] font-mono font-bold">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                    status === 'done' 
                      ? 'bg-emerald-500 text-white' 
                      : status === 'active' 
                      ? 'bg-rose-500 text-white' 
                      : 'bg-neutral-300 dark:bg-neutral-700 text-[var(--nb-secondary)]'
                  }`}>
                    {status === 'done' ? '✓' : idx + 1}
                  </span>
                  <span className={status === 'active' ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-[var(--nb-secondary)]'}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Default Tenant Protection Guard */}
          {isDefaultTenant ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500 text-center space-y-2">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-display font-bold text-base text-[var(--nb-content)]">
                Root Tenant Is Protected
              </h4>
              <p className="text-xs text-[var(--nb-secondary)] max-w-md mx-auto">
                <strong>{tenant.name}</strong> (<code className="font-mono text-amber-600 dark:text-amber-400">{DEFAULT_TENANT_ID}</code>) is the platform's primary root organization and cannot be deleted.
              </p>
            </div>
          ) : (
            <>
              {/* STEP 1: IMPACT REVIEW */}
              {currentStep === 'impact' && (
                <div className="space-y-4">
                  {/* Tenant Identity Card */}
                  <div className="p-4 rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-10 h-10 rounded-xl border-2 border-[var(--nb-ink)] flex items-center justify-center text-white font-black font-mono shadow-[2px_2px_0_var(--nb-ink)]"
                          style={{ background: themeConfig.accent }}
                        >
                          {(tenant.shortCode || tenant.name.substring(0, 3)).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-[var(--nb-content)]">{tenant.name}</h4>
                          <p className="text-xs text-[var(--nb-secondary)]">{tenant.institution || 'Main Campus'}</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs px-2.5 py-1 rounded bg-[var(--nb-surface)] border border-[var(--nb-ink)] font-bold">
                        ID: {tenant.tenantId}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-[var(--nb-secondary)] flex items-center gap-1.5 pt-1 border-t border-[var(--nb-ink)]/15">
                      <span>Administrator Email:</span>
                      <strong className="text-[var(--nb-content)]">{tenant.adminEmail}</strong>
                    </div>
                  </div>

                  {/* Impact Stats Breakdown */}
                  <div className="space-y-2">
                    <div className="text-xs font-mono font-bold uppercase text-[var(--nb-secondary)]">
                      Associated Fleet Resources to be Cascaded:
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="p-3 rounded-xl border border-[var(--nb-ink)] bg-[var(--nb-surface)] shadow-[2px_2px_0_var(--nb-ink)]">
                        <Users className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                        <div className="text-lg font-black font-display text-[var(--nb-content)]">
                          {stats ? stats.users : 0}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--nb-secondary)] uppercase">User Profiles</div>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--nb-ink)] bg-[var(--nb-surface)] shadow-[2px_2px_0_var(--nb-ink)]">
                        <Calendar className="w-4 h-4 mx-auto text-violet-500 mb-1" />
                        <div className="text-lg font-black font-display text-[var(--nb-content)]">
                          {stats ? stats.events : 0}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--nb-secondary)] uppercase">Dept Events</div>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--nb-ink)] bg-[var(--nb-surface)] shadow-[2px_2px_0_var(--nb-ink)]">
                        <Ticket className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                        <div className="text-lg font-black font-display text-[var(--nb-content)]">
                          {stats ? stats.registrations : 0}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--nb-secondary)] uppercase">Active Passes</div>
                      </div>
                    </div>
                  </div>

                  {/* Vault Protection Note */}
                  <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/10 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-violet-700 dark:text-violet-300">
                      <Archive className="w-4 h-4" />
                      <span>Zero Data Loss Protection (Deleted Vault)</span>
                    </div>
                    <p className="text-[11px] text-[var(--nb-secondary)] leading-relaxed">
                      De-provisioning this tenant will immediately take the portal <code className="font-mono bg-violet-500/20 px-1 py-0.5 rounded">/?tenant={tenant.tenantId}</code> offline. However, all configuration, users, events, and records will be securely archived into the <strong>Deleted Vault</strong>, where you can inspect or restore it at any time.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: SAFETY CHECKLIST */}
              {currentStep === 'checklist' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-700 dark:text-amber-400 block font-bold">
                        Acknowledge De-provisioning Consequences
                      </strong>
                      <span className="text-[var(--nb-secondary)] text-[11px]">
                        Please check all 3 safety safeguards below to unlock the verification step.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                      check1 
                        ? 'border-rose-500 bg-rose-500/5' 
                        : 'border-[var(--nb-ink)]/30 hover:border-[var(--nb-ink)] bg-[var(--nb-surface)]'
                    }`}>
                      <input
                        type="checkbox"
                        checked={check1}
                        onChange={(e) => setCheck1(e.target.checked)}
                        className="mt-0.5 rounded border-[var(--nb-ink)] text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[var(--nb-content)] block">
                          Revoke Department Portal Access
                        </span>
                        <p className="text-[11px] text-[var(--nb-secondary)] leading-relaxed">
                          I understand that department administrator <strong>{tenant.adminEmail}</strong> and all associated faculty & students will immediately lose active access.
                        </p>
                      </div>
                    </label>

                    <label className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                      check2 
                        ? 'border-rose-500 bg-rose-500/5' 
                        : 'border-[var(--nb-ink)]/30 hover:border-[var(--nb-ink)] bg-[var(--nb-surface)]'
                    }`}>
                      <input
                        type="checkbox"
                        checked={check2}
                        onChange={(e) => setCheck2(e.target.checked)}
                        className="mt-0.5 rounded border-[var(--nb-ink)] text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[var(--nb-content)] block">
                          Archive Associated Events & Passes to Vault
                        </span>
                        <p className="text-[11px] text-[var(--nb-secondary)] leading-relaxed">
                          I acknowledge that active events, registration tickets, certificates, and announcements will be unlinked and bundled into a recoverable cascade snapshot.
                        </p>
                      </div>
                    </label>

                    <label className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                      check3 
                        ? 'border-rose-500 bg-rose-500/5' 
                        : 'border-[var(--nb-ink)]/30 hover:border-[var(--nb-ink)] bg-[var(--nb-surface)]'
                    }`}>
                      <input
                        type="checkbox"
                        checked={check3}
                        onChange={(e) => setCheck3(e.target.checked)}
                        className="mt-0.5 rounded border-[var(--nb-ink)] text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[var(--nb-content)] block">
                          Record Super Admin Audit Entry
                        </span>
                        <p className="text-[11px] text-[var(--nb-secondary)] leading-relaxed">
                          I confirm that this administrative de-provisioning will be permanently logged in the immutable Audit Trail under <strong>{currentUser.email}</strong>.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: VERIFICATION & REASON */}
              {currentStep === 'verification' && (
                <div className="space-y-4">
                  {/* Type Confirmation Box */}
                  <div className="p-4 rounded-xl border-2 border-rose-500 bg-rose-500/5 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                      <Lock className="w-4 h-4" />
                      <span>Security Verification Required</span>
                    </div>

                    <p className="text-xs text-[var(--nb-secondary)]">
                      To prevent accidental deletion, please type the tenant ID <strong className="font-mono text-rose-600 dark:text-rose-400 select-all">{tenant.tenantId}</strong> below:
                    </p>

                    <div className="relative">
                      <input
                        type="text"
                        value={typedConfirmation}
                        onChange={(e) => setTypedConfirmation(e.target.value)}
                        placeholder={`Type "${tenant.tenantId}" to confirm`}
                        className={`w-full py-2.5 px-3.5 rounded-lg border-2 font-mono text-xs focus:outline-none transition-all ${
                          isMatch 
                            ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' 
                            : 'border-[var(--nb-ink)] bg-[var(--nb-surface)] text-[var(--nb-content)]'
                        }`}
                        autoFocus
                      />
                      {isMatch && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>Matched</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reason & Notes for Audit Trail */}
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-mono font-bold uppercase text-[var(--nb-secondary)] block">
                        De-provisioning Reason (For Audit Log):
                      </label>
                      <select
                        value={reasonCategory}
                        onChange={(e) => setReasonCategory(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-[var(--nb-ink)] bg-[var(--nb-surface)] text-xs font-sans text-[var(--nb-content)] focus:outline-none"
                      >
                        <option value="End of Academic Year / Term Completed">End of Academic Year / Term Completed</option>
                        <option value="Department Merged or Restructured">Department Merged or Restructured</option>
                        <option value="Sandbox / Staging Fleet Cleanup">Sandbox / Staging Fleet Cleanup</option>
                        <option value="Formal Request by College Administration">Formal Request by College Administration</option>
                        <option value="Administrative Re-provisioning Required">Administrative Re-provisioning Required</option>
                        <option value="Other Administrative Reason">Other Administrative Reason</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono font-bold uppercase text-[var(--nb-secondary)] block">
                        Administrative Notes (Optional):
                      </label>
                      <input
                        type="text"
                        value={reasonNotes}
                        onChange={(e) => setReasonNotes(e.target.value)}
                        placeholder="e.g., Requested by Dean Office on Oct 2nd"
                        className="w-full py-2 px-3 rounded-lg border border-[var(--nb-ink)] bg-[var(--nb-surface)] text-xs text-[var(--nb-content)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: EXECUTING LIVE STEPS */}
              {currentStep === 'executing' && (
                <div className="py-6 space-y-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border-2 border-rose-500 text-rose-500 flex items-center justify-center mx-auto shadow-[4px_4px_0_var(--nb-ink)] animate-pulse">
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-display font-black text-lg text-[var(--nb-content)]">
                      De-commissioning Organization Fleet...
                    </h4>
                    <p className="text-xs font-mono text-[var(--nb-secondary)]">
                      {executionMessage}
                    </p>
                  </div>

                  {/* Stepped Progress Checklist */}
                  <div className="max-w-md mx-auto p-4 rounded-xl border border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] text-left space-y-3">
                    <div className="flex items-center gap-2.5 text-xs font-mono">
                      {executionStep > 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin shrink-0" />
                      )}
                      <span className={executionStep >= 1 ? 'font-bold text-[var(--nb-content)]' : 'text-[var(--nb-secondary)]'}>
                        1. Querying active records &amp; dependencies
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-mono">
                      {executionStep > 2 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : executionStep === 2 ? (
                        <div className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[var(--nb-ink)]/40 shrink-0" />
                      )}
                      <span className={executionStep >= 2 ? 'font-bold text-[var(--nb-content)]' : 'text-[var(--nb-secondary)]'}>
                        2. Archiving snapshot in Deleted Vault
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-mono">
                      {executionStep > 3 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : executionStep === 3 ? (
                        <div className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[var(--nb-ink)]/40 shrink-0" />
                      )}
                      <span className={executionStep >= 3 ? 'font-bold text-[var(--nb-content)]' : 'text-[var(--nb-secondary)]'}>
                        3. Removing active tenant documents &amp; routing
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-mono">
                      {executionStep > 4 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : executionStep === 4 ? (
                        <div className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[var(--nb-ink)]/40 shrink-0" />
                      )}
                      <span className={executionStep >= 4 ? 'font-bold text-[var(--nb-content)]' : 'text-[var(--nb-secondary)]'}>
                        4. Committing immutable platform audit log
                      </span>
                    </div>
                  </div>

                  {executionError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500 text-rose-600 text-xs font-mono">
                      Error: {executionError}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: COMPLETED */}
              {currentStep === 'completed' && (
                <div className="py-6 space-y-5 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto border-2 border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] animate-in zoom-in-50 duration-200">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-display font-black text-xl text-[var(--nb-content)]">
                      Tenant Successfully De-provisioned
                    </h4>
                    <p className="text-xs text-[var(--nb-secondary)] max-w-md mx-auto">
                      <strong>{tenant.name}</strong> (<code className="font-mono text-emerald-600 dark:text-emerald-400">{tenant.tenantId}</code>) has been taken offline and securely archived into the Deleted Vault.
                    </p>
                  </div>

                  {completedBackupId && (
                    <div className="p-3.5 rounded-xl border border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] text-xs font-mono space-y-1 max-w-md mx-auto">
                      <div className="flex items-center justify-between text-[var(--nb-secondary)]">
                        <span>Vault Archive ID:</span>
                        <strong className="text-[var(--nb-content)]">{completedBackupId}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[var(--nb-secondary)]">
                        <span>Protection Level:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Zero Data Loss Cascade</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 sm:p-5 border-t-2 border-[var(--nb-ink)] bg-[var(--nb-surface-accent)]/60 flex items-center justify-between gap-3">
          {isDefaultTenant ? (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="nb-btn py-2 px-5 text-xs font-bold uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : currentStep === 'completed' ? (
            <div className="w-full flex items-center justify-between gap-3">
              {onViewVault && (
                <button
                  onClick={() => {
                    onClose();
                    onViewVault();
                  }}
                  className="nb-btn-ghost py-2 px-4 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer text-violet-600 dark:text-violet-400"
                >
                  <Archive className="w-4 h-4" />
                  <span>Inspect in Deleted Vault</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="ml-auto nb-btn py-2 px-5 text-xs font-bold uppercase cursor-pointer bg-emerald-500 text-white"
              >
                Done
              </button>
            </div>
          ) : currentStep === 'executing' ? (
            <div className="w-full text-center text-xs font-mono text-[var(--nb-secondary)]">
              Do not close window during active de-provisioning...
            </div>
          ) : (
            <>
              {currentStep === 'impact' ? (
                <button
                  onClick={onClose}
                  className="nb-btn-ghost py-2 px-4 text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
              ) : currentStep === 'checklist' ? (
                <button
                  onClick={() => setCurrentStep('impact')}
                  className="nb-btn-ghost py-2 px-3 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep('checklist')}
                  className="nb-btn-ghost py-2 px-3 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              {currentStep === 'impact' ? (
                <button
                  onClick={() => setCurrentStep('checklist')}
                  className="nb-btn py-2 px-4 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer bg-[var(--nb-ink)] text-[var(--nb-bg)]"
                >
                  <span>Proceed to Safeguards</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : currentStep === 'checklist' ? (
                <button
                  onClick={() => setCurrentStep('verification')}
                  disabled={!allChecksPassed}
                  className={`nb-btn py-2 px-4 text-xs font-bold uppercase flex items-center gap-1.5 ${
                    allChecksPassed 
                      ? 'cursor-pointer bg-rose-500 text-white' 
                      : 'opacity-40 cursor-not-allowed bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <span>Proceed to Verification</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleExecuteDeletion}
                  disabled={!isMatch || isDeleting}
                  className={`nb-btn py-2 px-5 text-xs font-black uppercase flex items-center gap-1.5 ${
                    isMatch && !isDeleting
                      ? 'cursor-pointer bg-rose-600 text-white shadow-[2px_2px_0_var(--nb-ink)]' 
                      : 'opacity-40 cursor-not-allowed bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Delete Organization</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
