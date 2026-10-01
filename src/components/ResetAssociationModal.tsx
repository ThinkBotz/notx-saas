import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  FileText, 
  Database, 
  Sparkles, 
  RefreshCw, 
  Lock, 
  Calendar, 
  Users, 
  Award, 
  Trophy, 
  FolderArchive,
  Check,
  AlertCircle
} from 'lucide-react';
import { UserProfile, DepartmentEvent, EventRegistration, Tenant } from '../types';
import HoldButton from './HoldButton';
import { exportAllDatabaseData, resetEntireDatabaseForNewAssociation, SystemBackupData } from '../firebase';

interface ResetAssociationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  events: DepartmentEvent[];
  registrations: EventRegistration[];
  initialTab?: 'export' | 'reset';
  onResetComplete: () => void;
  activeTenant?: Tenant | null;
}

export default function ResetAssociationModal({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  events,
  registrations,
  initialTab = 'export',
  onResetComplete,
  activeTenant
}: ResetAssociationModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'reset'>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setConfirmationInput('');
      setConfirmCheckbox(false);
      setResetCompleteSummary(null);
    }
  }, [isOpen, initialTab]);
  
  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [lastExportName, setLastExportName] = useState('');

  // Reset confirmation states
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetStage, setResetStage] = useState('');
  const [resetPercent, setResetPercent] = useState(0);
  const [resetCompleteSummary, setResetCompleteSummary] = useState<any | null>(null);

  if (!isOpen) return null;

  const CONFIRM_PHRASE = 'RESET-ASSOCIATION';

  const handleDownloadFullBackup = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const backupData: SystemBackupData = await exportAllDatabaseData(currentUser.name, currentUser.tenantId);
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `NOTX_Connect_Full_Backup_${dateStr}.json`;
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setLastExportName(filename);
      setExportSuccess(true);
      setHasBackedUp(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (err) {
      console.error('Backup export failed:', err);
      alert('Failed to generate full backup. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportStudentsCSV = () => {
    const students = allUsers.filter(u => u.role === 'student');
    const headers = ['Roll Number', 'Name', 'Email', 'Department', 'Year', 'Section', 'Phone', 'Created At'];
    const rows = students.map(s => [
      `"${s.rollNumber || ''}"`,
      `"${s.name || ''}"`,
      `"${s.email || ''}"`,
      `"${s.department || ''}"`,
      `"${s.year || ''}"`,
      `"${s.section || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.created_at || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Students_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportRegistrationsCSV = () => {
    const headers = ['Registration ID', 'Event ID', 'Student Name', 'Roll Number', 'Status', 'Applied At', 'Team Name'];
    const rows = registrations.map(r => [
      `"${r.registrationId}"`,
      `"${r.eventId}"`,
      `"${r.studentName}"`,
      `"${r.rollNumber || ''}"`,
      `"${r.status}"`,
      `"${r.appliedAt}"`,
      `"${r.teamName || 'Solo'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Event_Registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExecuteReset = async () => {
    if (confirmationInput.trim() !== CONFIRM_PHRASE || !confirmCheckbox) {
      return;
    }

    setIsResetting(true);
    setResetStage('Preparing system clean...');
    setResetPercent(5);

    try {
      const summary = await resetEntireDatabaseForNewAssociation(currentUser, currentUser.tenantId || '', (stage, percent) => {
        setResetStage(stage);
        setResetPercent(percent);
      });

      setResetCompleteSummary(summary);
      onResetComplete();
    } catch (err: any) {
      console.error('Reset execution failed:', err);
      alert('Error during reset: ' + (err.message || 'Unknown error'));
      setIsResetting(false);
    }
  };

  const isConfirmDisabled = confirmationInput.trim() !== CONFIRM_PHRASE || !confirmCheckbox || isResetting;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div 
        className="bg-[var(--nb-surface)] rounded-lg w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        {/* Header */}
        <div 
          className="p-4.5 border-b-2 border-[var(--nb-ink)] flex items-center justify-between bg-[var(--nb-surface-accent)] shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div 
              className={`w-8 h-8 rounded flex items-center justify-center ${
                activeTab === 'reset' 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-[var(--nb-surface)] text-[var(--nb-accent)]'
              }`}
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              {activeTab === 'reset' ? <AlertTriangle className="w-4 h-4" /> : <Database className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="nb-headline text-base text-[var(--nb-content)]">
                {activeTab === 'reset' ? 'Reset Association • Start New Term' : 'System Backup & Data Export'}
              </h3>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)]">
                {activeTab === 'reset' ? 'CLEAN WIPE DATABASE FOR FRESH ASSOCIATION INSTANCE' : 'DOWNLOAD ARCHIVAL EXPORTS ACROSS ALL COLLECTIONS'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isResetting}
            className="nb-btn-ghost w-7 h-7 rounded flex items-center justify-center cursor-pointer"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-5 pt-3 shrink-0 flex gap-2 border-b-2 border-[var(--nb-ink)] bg-[var(--nb-surface)]">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'export'
                ? 'border-[var(--nb-ink)] text-[var(--nb-content)] font-black'
                : 'border-transparent text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1. Overall Data Export</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'reset'
                ? 'border-rose-600 text-rose-600 font-black'
                : 'border-transparent text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>2. Reset Association (Clean Slate)</span>
          </button>
        </div>

        {/* Tab 1: Export Content */}
        {activeTab === 'export' && (
          <div className="p-5 overflow-y-auto space-y-4 text-xs bg-[var(--nb-bg)]">
            {/* Database Snapshot Stats */}
            <div 
              className="bg-[var(--nb-surface)] rounded p-4 space-y-3"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <div className="flex items-center justify-between">
                <span className="nb-label text-[11px] text-[var(--nb-secondary)] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                  <span>CURRENT DATABASE STATE</span>
                </span>
                <span className="nb-label text-[10px] text-[var(--nb-secondary)]">{activeTenant?.name || activeTenant?.shortCode || 'CURRENT TENANT'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div 
                  className="bg-[var(--nb-surface-accent)] p-2.5 rounded text-center"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  <div className="nb-headline text-lg text-[var(--nb-content)]">{allUsers.length}</div>
                  <div className="nb-label text-[9px] text-[var(--nb-secondary)]">USERS & MEMBERS</div>
                </div>

                <div 
                  className="bg-[var(--nb-surface-accent)] p-2.5 rounded text-center"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  <div className="nb-headline text-lg text-[var(--nb-accent)]">{events.length}</div>
                  <div className="nb-label text-[9px] text-[var(--nb-secondary)]">EVENTS HOSTED</div>
                </div>

                <div 
                  className="bg-[var(--nb-surface-accent)] p-2.5 rounded text-center"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  <div className="nb-headline text-lg text-emerald-600">{registrations.length}</div>
                  <div className="nb-label text-[9px] text-[var(--nb-secondary)]">REGISTRATIONS</div>
                </div>

                <div 
                  className="bg-[var(--nb-surface-accent)] p-2.5 rounded text-center"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  <div className="nb-headline text-lg text-amber-500">FULL</div>
                  <div className="nb-label text-[9px] text-[var(--nb-secondary)]">COLLECTIONS</div>
                </div>
              </div>
            </div>

            {/* Main Export Action Card */}
            <div 
              className="bg-[var(--nb-surface)] rounded p-4.5 space-y-3"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <div>
                <h4 className="nb-headline text-sm text-[var(--nb-content)] flex items-center gap-1.5">
                  <FolderArchive className="w-4 h-4 text-[var(--nb-accent)]" />
                  <span>Complete System Archival JSON</span>
                </h4>
                <p className="text-[var(--nb-secondary)] text-[11px] mt-1 leading-relaxed">
                  Generates a single comprehensive JSON package containing users, events, registrations, certificates, event winners, announcements, photo albums, notifications, and settings.
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadFullBackup}
                  disabled={isExporting}
                  className="px-4 py-2.5 rounded nb-btn font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Backup...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Full Backup (.json)</span>
                    </>
                  )}
                </button>

                {exportSuccess && (
                  <span className="nb-tag text-[10px] text-emerald-600 font-bold flex items-center gap-1 bg-white" style={{ border: '1px solid var(--nb-ink)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>EXPORT SAVED!</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick CSV Export Options */}
            <div className="space-y-2 pt-1">
              <span className="nb-label text-[10px] text-[var(--nb-secondary)]">
                INDIVIDUAL SPREADSHEETS (CSV)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportStudentsCSV}
                  className="p-3 rounded bg-[var(--nb-surface)] hover:bg-[var(--nb-surface-accent)] text-left transition-all cursor-pointer flex items-center justify-between"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-[var(--nb-accent)]" />
                    <div>
                      <div className="font-bold text-[var(--nb-content)] text-xs">Students Directory</div>
                      <div className="nb-label text-[9px] text-[var(--nb-secondary)]">ROLL NUMBERS & SECTIONS</div>
                    </div>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[var(--nb-secondary)]" />
                </button>

                <button
                  type="button"
                  onClick={handleExportRegistrationsCSV}
                  className="p-3 rounded bg-[var(--nb-surface)] hover:bg-[var(--nb-surface-accent)] text-left transition-all cursor-pointer flex items-center justify-between"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-[var(--nb-content)] text-xs">Event Registrations</div>
                      <div className="nb-label text-[9px] text-[var(--nb-secondary)]">PARTICIPATION LOGS</div>
                    </div>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[var(--nb-secondary)]" />
                </button>
              </div>
            </div>

            {/* Next step prompt */}
            <div className="pt-2 border-t-2 border-[var(--nb-ink)] flex items-center justify-between">
              <span className="nb-label text-[10px] text-[var(--nb-secondary)]">READY TO START CLEAN FOR NEW YEAR?</span>
              <button
                type="button"
                onClick={() => setActiveTab('reset')}
                className="text-xs text-rose-600 hover:text-rose-500 font-bold uppercase underline cursor-pointer"
              >
                Proceed to Reset →
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Reset Content */}
        {activeTab === 'reset' && (
          <div className="p-5 overflow-y-auto space-y-4 text-xs bg-[var(--nb-bg)]">
            {resetCompleteSummary ? (
              <div className="py-6 text-center space-y-4 animate-fadeIn">
                <div 
                  className="w-14 h-14 rounded bg-emerald-500 text-white flex items-center justify-center mx-auto"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="nb-headline text-lg text-[var(--nb-content)]">Association Reset Successfully!</h4>
                  <p className="text-[var(--nb-secondary)] text-xs leading-relaxed">
                    All previous student accounts, events, registrations, certificates, and photo records have been permanently wiped.
                  </p>
                </div>

                <div 
                  className="bg-[var(--nb-surface)] rounded p-4 max-w-sm mx-auto text-left space-y-1.5 font-mono text-[11px]"
                  style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="text-[var(--nb-accent)] font-bold border-b border-[var(--nb-ink)] pb-1 mb-1 uppercase font-mono">
                    Clean Slate Summary:
                  </div>
                  <div className="flex justify-between text-[var(--nb-secondary)]">
                    <span>Events Cleared:</span>
                    <span className="text-[var(--nb-content)] font-bold">{resetCompleteSummary.deletedCounts.events || 0}</span>
                  </div>
                  <div className="flex justify-between text-[var(--nb-secondary)]">
                    <span>Registrations Cleared:</span>
                    <span className="text-[var(--nb-content)] font-bold">{resetCompleteSummary.deletedCounts.registrations || 0}</span>
                  </div>
                  <div className="flex justify-between text-[var(--nb-secondary)]">
                    <span>Certificates Cleared:</span>
                    <span className="text-[var(--nb-content)] font-bold">{resetCompleteSummary.deletedCounts.certificates || 0}</span>
                  </div>
                  <div className="flex justify-between text-[var(--nb-secondary)]">
                    <span>Student Accounts Cleared:</span>
                    <span className="text-[var(--nb-content)] font-bold">{resetCompleteSummary.deletedCounts.users || 0}</span>
                  </div>
                  <div className="flex justify-between text-[var(--nb-secondary)] pt-1 border-t border-[var(--nb-ink)] text-[10px]">
                    <span>Preserved Root Admin:</span>
                    <span className="text-emerald-600 font-bold truncate max-w-[140px]">{resetCompleteSummary.preservedAdmin?.email}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.location.reload();
                    }}
                    className="px-6 py-2.5 rounded nb-btn font-bold text-xs uppercase tracking-wider cursor-pointer"
                    style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                  >
                    Refresh App & Start New Academic Term
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Danger Notice Banner */}
                <div 
                  className="p-4 rounded bg-rose-500/10 space-y-2 text-rose-600"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider font-mono">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>DANGER ZONE: START NEW ASSOCIATION TERM</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-medium">
                    This irreversible operation clears all prior session records from Firestore:
                  </p>
                  <ul className="text-[10.5px] list-disc list-inside space-y-0.5 font-mono">
                    <li>All Student, Coordinator & Associate accounts are cleared</li>
                    <li>All Events, Workshops & Hackathons are deleted</li>
                    <li>All Registration rosters & Attendance logs are deleted</li>
                    <li>All Issued E-Certificates & Wall of Champions records are cleared</li>
                    <li>All Photo albums, announcements & chats are cleared</li>
                  </ul>
                  <div 
                    className="text-[10px] text-emerald-700 font-bold bg-white p-2 rounded"
                    style={{ border: '1px solid var(--nb-ink)' }}
                  >
                    🛡️ Safety: Your Administrator profile (<strong>{currentUser.email}</strong>) will be preserved as root admin.
                  </div>
                </div>

                {/* Pre-reset backup check */}
                {!hasBackedUp && (
                  <div 
                    className="bg-amber-400 text-black p-3 rounded flex items-center justify-between gap-3"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="text-[11px] font-bold">Have you downloaded a backup of the current term?</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadFullBackup}
                      disabled={isExporting}
                      className="px-2.5 py-1 rounded bg-white text-black text-[10.5px] font-mono font-bold cursor-pointer shrink-0 uppercase"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      {isExporting ? 'Exporting...' : 'Download Backup'}
                    </button>
                  </div>
                )}

                {/* Confirmation Step 1: Checkbox */}
                <label 
                  className="flex items-start gap-2.5 p-3 rounded bg-[var(--nb-surface)] cursor-pointer hover:bg-[var(--nb-surface-accent)] transition-colors"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <input
                    type="checkbox"
                    checked={confirmCheckbox}
                    onChange={(e) => setConfirmCheckbox(e.target.checked)}
                    disabled={isResetting}
                    className="mt-0.5 rounded accent-rose-600 cursor-pointer w-4 h-4"
                  />
                  <div className="text-[11px] text-[var(--nb-content)] leading-tight">
                    <strong>I confirm that I want to wipe all past academic year data.</strong>
                    <div className="text-[10px] text-[var(--nb-secondary)] mt-0.5 font-mono">Students, registrations, events, certificates, and media will be permanently erased.</div>
                  </div>
                </label>

                {/* Confirmation Step 2: Verification Phrase */}
                <div className="space-y-1.5">
                  <label className="nb-label text-[10px] text-[var(--nb-secondary)] flex items-center justify-between">
                    <span>TYPE CONFIRMATION PHRASE TO UNLOCK:</span>
                    <span 
                      className="font-mono text-rose-600 font-bold select-all bg-white px-1.5 py-0.2 rounded"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      {CONFIRM_PHRASE}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    disabled={isResetting}
                    placeholder={`Type "${CONFIRM_PHRASE}" exactly...`}
                    className="w-full bg-[var(--nb-surface-accent)] text-xs text-[var(--nb-content)] font-bold rounded py-2 px-3 outline-none font-mono uppercase"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>

                {/* Reset Progress Bar */}
                {isResetting && (
                  <div 
                    className="space-y-2 p-3 bg-[var(--nb-surface)] rounded"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-[var(--nb-secondary)]">{resetStage}</span>
                      <span className="text-rose-600 font-bold">{resetPercent}%</span>
                    </div>
                    <div 
                      className="w-full h-3 bg-[var(--nb-surface-accent)] rounded overflow-hidden"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      <div
                        className="h-full bg-rose-600 transition-all duration-300"
                        style={{ width: `${resetPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-[var(--nb-ink)]">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isResetting}
                    className="nb-btn-ghost px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    Cancel
                  </button>

                  <HoldButton
                    size="md"
                    holdTime={2500}
                    radius={4}
                    backgroundColor="#fee2e2"
                    fillColor="#e11d48"
                    textColor="#e11d48"
                    fillTextColor="#ffffff"
                    doneLabel="Database Wiped"
                    disabled={isConfirmDisabled}
                    onHold={handleExecuteReset}
                    icon={isResetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    className="px-5 text-xs font-bold uppercase tracking-wider border-[2px] border-[var(--nb-ink)] shadow-[2px_2px_0_#1A1A1A]"
                  >
                    {isResetting ? 'Resetting Database...' : 'Hold to Wipe Everything & Reset'}
                  </HoldButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
