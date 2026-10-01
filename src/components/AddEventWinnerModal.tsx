import React, { useState, useEffect } from 'react';
import { X, Trophy, Medal, Search, Sparkles, User, Calendar, Edit3, Plus, CheckCircle2 } from 'lucide-react';
import { UserProfile, DepartmentEvent, EventWinner, Tenant } from '../types';
import { addEventWinner, updateEventWinner } from '../firebase';

interface AddEventWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: DepartmentEvent[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  initialWinner?: EventWinner | null;
  onWinnerSaved?: (winnerId: string) => void;
  onWinnerAdded?: (winnerId: string) => void;
  activeTenant?: Tenant | null;
}

export default function AddEventWinnerModal({
  isOpen,
  onClose,
  events,
  allUsers,
  currentUser,
  initialWinner = null,
  onWinnerSaved,
  onWinnerAdded,
  activeTenant
}: AddEventWinnerModalProps) {
  const isEditing = Boolean(initialWinner);

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [customEventTitle, setCustomEventTitle] = useState('');
  const [useCustomEvent, setUseCustomEvent] = useState(false);

  // Student selection
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  // Award details
  const [position, setPosition] = useState<'1st Place' | '2nd Place' | '3rd Place' | 'Special Mention' | string>('1st Place');
  const [prizeTitle, setPrizeTitle] = useState('🏆 1st Prize • Champion');
  const [awardDetails, setAwardDetails] = useState('₹5,000 Cash Prize + Certificate of Excellence');
  const [projectTitle, setProjectTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize initial state when modal opens or initialWinner changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialWinner) {
      // Find matching event
      const matchedEv = events.find(ev => ev.eventId === initialWinner.eventId || ev.title === initialWinner.eventTitle);
      if (matchedEv) {
        setSelectedEventId(matchedEv.eventId);
        setUseCustomEvent(false);
        setCustomEventTitle('');
      } else {
        setSelectedEventId(events[0]?.eventId || '');
        setUseCustomEvent(true);
        setCustomEventTitle(initialWinner.eventTitle);
      }

      // Find matching student in allUsers
      const matchedStudent = allUsers.find(
        u => u.uid === initialWinner.studentId || 
             (u.rollNumber && initialWinner.rollNumber && u.rollNumber.toLowerCase() === initialWinner.rollNumber.toLowerCase())
      );

      if (matchedStudent) {
        setSelectedStudent(matchedStudent);
      } else {
        // Synthesize user object from winner record
        setSelectedStudent({
          uid: initialWinner.studentId,
          name: initialWinner.studentName,
          email: '',
          role: 'student',
          rollNumber: initialWinner.rollNumber,
          department: initialWinner.department || activeTenant?.shortCode || activeTenant?.name || 'Department',
          year: initialWinner.year || 'III Year',
          section: initialWinner.section || 'A',
          profile_pic: initialWinner.studentPhoto,
          created_at: initialWinner.addedAt || ''
        });
      }

      setPosition(initialWinner.position || '1st Place');
      setPrizeTitle(initialWinner.prizeTitle || '🏆 1st Prize • Champion');
      setAwardDetails(initialWinner.awardDetails || '');
      setProjectTitle(initialWinner.projectTitle || '');
      setErrorMsg('');
    } else {
      // Reset for creation
      setSelectedEventId(events[0]?.eventId || '');
      setCustomEventTitle('');
      setUseCustomEvent(false);
      setSelectedStudent(null);
      setStudentSearch('');
      setPosition('1st Place');
      setPrizeTitle('🏆 1st Prize • Champion');
      setAwardDetails('₹5,000 Cash Prize + Trophy + Certificate');
      setProjectTitle('');
      setErrorMsg('');
    }
  }, [isOpen, initialWinner, events, allUsers]);

  if (!isOpen) return null;

  const filteredStudents = allUsers.filter(u => {
    if (u.uid === 'admin_master') return false;
    const q = studentSearch.toLowerCase().trim();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q) ||
           (u.rollNumber || '').toLowerCase().includes(q) ||
           (u.department || '').toLowerCase().includes(q);
  }).slice(0, 8);

  const handlePositionChange = (pos: string) => {
    setPosition(pos);
    if (pos === '1st Place') {
      setPrizeTitle('🏆 1st Prize • Champion');
      setAwardDetails('₹5,000 Cash Prize + Trophy + Certificate');
    } else if (pos === '2nd Place') {
      setPrizeTitle('🥈 2nd Prize • Runner-Up');
      setAwardDetails('₹3,000 Cash Prize + Medal + Certificate');
    } else if (pos === '3rd Place') {
      setPrizeTitle('🥉 3rd Prize • 2nd Runner-Up');
      setAwardDetails('₹1,500 Cash Prize + Certificate');
    } else if (pos === 'Special Mention') {
      setPrizeTitle('🌟 Special Mention • Best Innovation');
      setAwardDetails('Citation of Excellence + Research Sponsorship');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg('Please select a student from the database.');
      return;
    }

    const matchedEvent = events.find(ev => ev.eventId === selectedEventId);
    const finalEventTitle = useCustomEvent 
      ? (customEventTitle.trim() || 'Department Competition') 
      : (matchedEvent?.title || (isEditing ? initialWinner?.eventTitle : 'Department Event') || 'Department Event');

    const finalEventDate = matchedEvent?.date || (isEditing ? initialWinner?.eventDate : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const winnerPayload = {
        eventId: useCustomEvent ? 'custom_event' : (matchedEvent?.eventId || (isEditing ? initialWinner?.eventId : 'event') || 'event'),
        eventTitle: finalEventTitle,
        eventDate: finalEventDate,
        studentId: selectedStudent.uid,
        studentName: selectedStudent.name,
        rollNumber: selectedStudent.rollNumber || 'N/A',
        department: selectedStudent.department || activeTenant?.shortCode || activeTenant?.name || 'Department',
        year: selectedStudent.year || 'III Year',
        section: selectedStudent.section || 'A',
        studentPhoto: selectedStudent.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${selectedStudent.rollNumber || selectedStudent.uid}`,
        position,
        prizeTitle: prizeTitle.trim(),
        awardDetails: awardDetails.trim(),
        projectTitle: projectTitle.trim() || undefined,
        addedBy: isEditing ? (initialWinner?.addedBy || currentUser.name || 'Department Administration') : (currentUser.name || 'Department Administration')
      };

      if (isEditing && initialWinner) {
        await updateEventWinner(initialWinner.winnerId, winnerPayload);
        if (onWinnerSaved) onWinnerSaved(initialWinner.winnerId);
        if (onWinnerAdded) onWinnerAdded(initialWinner.winnerId);
      } else {
        const winnerId = await addEventWinner(winnerPayload);
        if (onWinnerSaved) onWinnerSaved(winnerId);
        if (onWinnerAdded) onWinnerAdded(winnerId);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save event winner.');
    } finally {
      setIsSubmitting(false);
    }
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
              {isEditing ? <Edit3 className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="nb-headline text-base text-[var(--nb-content)]">
                {isEditing ? 'Edit Wall of Champions Winner' : 'Add Event Winner'}
              </h3>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)]">
                {isEditing ? 'MODIFY PODIUM STANDINGS & PRIZES' : 'FEATURE STUDENT ACHIEVEMENTS ON WALL OF FAME'}
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs flex-grow">
          {errorMsg && (
            <div 
              className="p-2.5 rounded bg-rose-500/10 text-rose-600 font-bold text-xs"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              {errorMsg}
            </div>
          )}

          {/* 1. SELECT EVENT FROM DB */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="nb-label text-[10px] text-[var(--nb-secondary)] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[var(--nb-accent)]" />
                <span>DEPARTMENT EVENT *</span>
              </label>
              <button
                type="button"
                onClick={() => setUseCustomEvent(!useCustomEvent)}
                className="nb-label text-[10px] text-[var(--nb-accent)] font-bold cursor-pointer underline"
              >
                {useCustomEvent ? 'Pick from DB events' : '+ Custom event name'}
              </button>
            </div>

            {useCustomEvent ? (
              <input
                type="text"
                required
                placeholder="e.g. State-Level AI Hackathon 2026"
                value={customEventTitle}
                onChange={(e) => setCustomEventTitle(e.target.value)}
                className="w-full bg-[var(--nb-surface-accent)] rounded text-xs font-bold text-[var(--nb-content)] py-2 px-3 outline-none"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              />
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-[var(--nb-surface-accent)] rounded text-xs font-bold text-[var(--nb-content)] py-2 px-3 outline-none"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                {events.length === 0 ? (
                  <option value="">No events in database (use custom event name)</option>
                ) : (
                  events.map((ev) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {ev.title} ({ev.date}) • {ev.category}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* 2. SELECT STUDENT FROM DB */}
          <div className="space-y-1.5 relative">
            <label className="nb-label text-[10px] text-[var(--nb-secondary)] flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-600" />
              <span>STUDENT WINNER FROM DATABASE *</span>
            </label>

            {selectedStudent ? (
              <div 
                className="p-2.5 rounded bg-[var(--nb-surface-accent)] flex items-center justify-between gap-3"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-8 h-8 rounded bg-[var(--nb-surface)] overflow-hidden shrink-0"
                    style={{ border: '1px solid var(--nb-ink)' }}
                  >
                    <img
                      src={selectedStudent.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${selectedStudent.rollNumber || selectedStudent.uid}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--nb-content)] text-xs truncate flex items-center gap-1">
                      <span>{selectedStudent.name}</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    </div>
                    <div className="text-[10px] text-[var(--nb-secondary)] font-mono truncate">
                      {selectedStudent.rollNumber || 'N/A'} • {selectedStudent.department || activeTenant?.shortCode || activeTenant?.name || 'Department'} • {selectedStudent.year || 'III Year'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearch('');
                  }}
                  className="nb-btn-icon !w-7 !h-7 rounded cursor-pointer"
                  title="Change student"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search by student name, roll number, or department..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setIsStudentDropdownOpen(true);
                    }}
                    onFocus={() => setIsStudentDropdownOpen(true)}
                    className="w-full bg-[var(--nb-surface-accent)] rounded text-xs text-[var(--nb-content)] pl-9 pr-3 py-2 outline-none font-bold"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>

                {isStudentDropdownOpen && (
                  <div 
                    className="mt-1 bg-[var(--nb-surface)] rounded max-h-48 overflow-y-auto z-20 divide-y divide-[var(--nb-ink)]/20"
                    style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                  >
                    {filteredStudents.length === 0 ? (
                      <div className="p-3 text-[11px] text-[var(--nb-secondary)] text-center italic">
                        No students found matching "{studentSearch}"
                      </div>
                    ) : (
                      filteredStudents.map((st) => (
                        <div
                          key={st.uid}
                          onClick={() => {
                            setSelectedStudent(st);
                            setIsStudentDropdownOpen(false);
                          }}
                          className="p-2 hover:bg-[var(--nb-surface-accent)] flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div 
                              className="w-7 h-7 rounded bg-[var(--nb-surface-accent)] overflow-hidden shrink-0"
                              style={{ border: '1px solid var(--nb-ink)' }}
                            >
                              <img
                                src={st.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${st.rollNumber || st.uid}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[var(--nb-content)] text-xs truncate">{st.name}</div>
                              <div className="text-[9.5px] text-[var(--nb-secondary)] font-mono truncate">{st.rollNumber || 'N/A'} • {st.department || 'AI & ML'}</div>
                            </div>
                          </div>

                          <span className="nb-tag text-[10px] font-bold shrink-0">SELECT</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. PODIUM POSITION / TIER */}
          <div className="space-y-1.5">
            <label className="nb-label text-[10px] text-[var(--nb-secondary)] flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>POSITION / PRIZE RANK *</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: '1st Place', icon: '🏆', activeBg: 'bg-amber-400 text-black' },
                { label: '2nd Place', icon: '🥈', activeBg: 'bg-slate-300 text-black' },
                { label: '3rd Place', icon: '🥉', activeBg: 'bg-amber-600 text-white' },
                { label: 'Special Mention', icon: '🌟', activeBg: 'bg-indigo-500 text-white' },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handlePositionChange(item.label)}
                  className={`p-2 rounded text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 text-center ${
                    position === item.label
                      ? `${item.activeBg}`
                      : 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)] hover:bg-[var(--nb-surface)]'
                  }`}
                  style={{
                    border: '1.5px solid var(--nb-ink)',
                    boxShadow: position === item.label ? 'var(--shadow-hard-sm)' : 'none'
                  }}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[10.5px] leading-tight uppercase font-mono">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. PRIZE TITLE & DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
                BADGE / PRIZE TITLE
              </label>
              <input
                type="text"
                required
                value={prizeTitle}
                onChange={(e) => setPrizeTitle(e.target.value)}
                placeholder="e.g. 🏆 1st Prize • Champion"
                className="w-full bg-[var(--nb-surface-accent)] rounded text-xs font-bold text-[var(--nb-content)] py-2 px-3 outline-none"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              />
            </div>

            <div>
              <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
                AWARD / CASH PRIZE DETAILS
              </label>
              <input
                type="text"
                required
                value={awardDetails}
                onChange={(e) => setAwardDetails(e.target.value)}
                placeholder="e.g. ₹5,000 Cash Prize + Trophy"
                className="w-full bg-[var(--nb-surface-accent)] rounded text-xs font-bold text-[var(--nb-content)] py-2 px-3 outline-none"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              />
            </div>
          </div>

          {/* 5. PROJECT / TOPIC TITLE (OPTIONAL) */}
          <div>
            <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">
              PROJECT TITLE OR TOPIC (OPTIONAL)
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. Project: MedPrompt AI Multi-Modal Diagnostic Agent"
              className="w-full bg-[var(--nb-surface-accent)] rounded text-xs font-bold text-[var(--nb-content)] py-2 px-3 outline-none"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-[var(--nb-ink)]">
            <button
              type="button"
              onClick={onClose}
              className="nb-btn-ghost px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedStudent}
              className="nb-btn px-5 py-2 rounded text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              {isEditing ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Updating...' : 'Save Winner Changes'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish to Home Page'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
