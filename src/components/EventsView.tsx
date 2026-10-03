import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, MapPin, Clock, Users, X, Check, Award, Download, Tag, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, Sparkles, Layers, RotateCw, Lock, ShieldCheck, Zap, UserMinus, Ticket, GraduationCap } from 'lucide-react';
import ImageUploader from './ImageUploader';
import FlipCard from './FlipCard';
import HoldButton from './HoldButton';
import EventTicketModal from './EventTicketModal';
import { fireConfetti } from '../utils/confetti';
import { UserProfile, DepartmentEvent, EventRegistration, IssuedCertificate, AppBranding, DEFAULT_BRANDING, Tenant, SUPER_ADMIN_EMAILS } from '../types';

import { createEvent, createRegistration, updateRegistrationStatus, updateRegistrationTeamMembers, deleteRegistration, deleteCertificate, deleteEvent, updateEvent, subscribeToCertificates, generateBatchCertificatesForEvent } from '../firebase';

interface EventsViewProps {
  user: UserProfile;
  allUsers: UserProfile[];
  events: DepartmentEvent[];
  registrations: EventRegistration[];
  refreshEvents: () => void;
  refreshRegistrations: () => void;
  selectedEvent: DepartmentEvent | null;
  setSelectedEvent: (event: DepartmentEvent | null) => void;
  isLoading?: boolean;
  onMessageCoordinator?: (roll: string) => void;
  branding?: AppBranding;
  activeTenantId?: string;
  activeTenant?: Tenant | null;
}

// Helper: Convert "10:00 AM" or "10:00" to 24h "10:00" or "14:00" for input[type="time"]
function toTime24(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const match24 = trimmed.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (match24) {
    const hh = match24[1].padStart(2, '0');
    const mm = match24[2];
    return `${hh}:${mm}`;
  }
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const modifier = match12[3]?.toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  return '';
}

// Helper: Convert "14:30" back to formatted "02:30 PM"
function toTime12(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  if (!hStr || !mStr) return time24;
  let hours = parseInt(hStr, 10);
  const minutes = mStr;
  const modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${modifier}`;
}

// Helper: Calculate End Time given startTime and duration
function calcEndTime(startStr: string, durationStr: string): string {
  const time24 = toTime24(startStr);
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let hours = parseInt(hStr, 10);
  let minutes = parseInt(mStr, 10);

  let addMinutes = 0;
  const hourMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour|hours)/i);
  const minMatch = durationStr.match(/(\d+)\s*(?:m|min|minute|minutes)/i);

  if (hourMatch) {
    addMinutes += Math.round(parseFloat(hourMatch[1]) * 60);
  } else if (minMatch) {
    addMinutes += parseInt(minMatch[1], 10);
  } else {
    const rawNum = parseFloat(durationStr);
    if (!isNaN(rawNum) && rawNum > 0) {
      addMinutes += Math.round(rawNum * 60);
    }
  }

  if (addMinutes <= 0) return '';

  const totalMin = hours * 60 + minutes + addMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return toTime12(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
}

// Helper: Calculate Duration given startTime and endTime
function calcDurationFromTimes(startStr: string, endStr: string): string {
  const start24 = toTime24(startStr);
  const end24 = toTime24(endStr);
  if (!start24 || !end24) return '';

  const [sH, sM] = start24.split(':').map(Number);
  const [eH, eM] = end24.split(':').map(Number);

  let startTotal = sH * 60 + sM;
  let endTotal = eH * 60 + eM;

  if (endTotal < startTotal) {
    // Crosses midnight
    endTotal += 24 * 60;
  }

  const diffMinutes = endTotal - startTotal;
  if (diffMinutes <= 0) return '';

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} ${hours === 1 ? 'Hour' : 'Hours'} ${mins} Mins`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
  } else {
    return `${mins} Mins`;
  }
}

export default function EventsView({
  user,
  allUsers,
  events,
  registrations,
  refreshEvents,
  refreshRegistrations,
  selectedEvent,
  setSelectedEvent,
  isLoading = false,
  onMessageCoordinator,
  branding = DEFAULT_BRANDING,
  activeTenantId,
  activeTenant
}: EventsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventImageIdx, setEventImageIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Create / Edit Event states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<'Workshops' | 'Hackathons' | 'Seminars' | 'Cultural Events' | 'Club Meetings'>('Workshops');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventDuration, setEventDuration] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventFaculty, setEventFaculty] = useState('');
  const [eventStudent, setEventStudent] = useState('');
  const [eventMaxParticipants, setEventMaxParticipants] = useState(100);
  const [eventDeadline, setEventDeadline] = useState('');
  const [eventPoster, setEventPoster] = useState('');
  const [eventPosterOrientation, setEventPosterOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [posterOrientations, setPosterOrientations] = useState<Record<string, 'portrait' | 'landscape'>>({});
  const [posterMeta, setPosterMeta] = useState<Record<string, { orientation: 'portrait' | 'landscape'; ratio: number; width?: number; height?: number }>>({});
  const [eventImages, setEventImages] = useState<string[]>([]);
  const [eventRules, setEventRules] = useState('');
  const [eventReqs, setEventReqs] = useState('');
  const [eventIsTeamBased, setEventIsTeamBased] = useState(false);
  const [eventMaxTeamSize, setEventMaxTeamSize] = useState(4);

  // Dynamic Coordinator Picker States for Event Form
  const [showCoordPickerModal, setShowCoordPickerModal] = useState(false);
  const [coordSearchQuery, setCoordSearchQuery] = useState('');
  const [coordFilterRole, setCoordFilterRole] = useState<'all' | 'coordinator' | 'associate' | 'student'>('all');

  // Registration States
  const [teamName, setTeamName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [teamMembersInput, setTeamMembersInput] = useState<{ name: string; rollNumber: string; year: string; section: string; phone: string; }[]>([]);
  const [draftRoll, setDraftRoll] = useState('');
  const [regFeedback, setRegFeedback] = useState('');
  const [dbCertificates, setDbCertificates] = useState<IssuedCertificate[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState('');

  const resolvedTenantId = activeTenantId || user.tenantId;

  useEffect(() => {
    const unsub = subscribeToCertificates((certs) => {
      setDbCertificates(certs);
    }, resolvedTenantId);
    return () => unsub();
  }, [resolvedTenantId]);

  const handleGenerateBatchInModal = async (eventId: string) => {
    setIsGeneratingBatch(true);
    try {
      const res = await generateBatchCertificatesForEvent(eventId, {
        events,
        registrations,
        allUsers,
        issuedBy: user.name || 'Department Administration'
      }, resolvedTenantId);
      setBatchFeedback(`Batch generated! ${res.newlyIssued} new certificates generated (${res.alreadyIssued} already existed).`);
      setTimeout(() => setBatchFeedback(''), 4000);
      refreshRegistrations();
    } catch (err) {
      console.error(err);
      setBatchFeedback('Failed to generate batch certificates.');
      setTimeout(() => setBatchFeedback(''), 3000);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Display view mode state
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Calculate initial date for calendar view based on next upcoming event
  const getInitialCalendarDate = () => {
    if (events.length > 0) {
      const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const nextEvent = sorted.find(e => new Date(e.date).getTime() >= Date.now()) || sorted[0];
      if (nextEvent) {
        return new Date(nextEvent.date);
      }
    }
    return new Date();
  };
  const [calendarDate, setCalendarDate] = useState<Date>(() => getInitialCalendarDate());

  // Auto-detect and track poster orientations & aspect ratios (portrait vs landscape)
  useEffect(() => {
    events.forEach(ev => {
      const url = ev.posterImage;
      if (!url) return;
      if (!posterMeta[url]) {
        const img = new Image();
        img.onload = () => {
          const nw = img.naturalWidth || 1;
          const nh = img.naturalHeight || 1;
          const isPort = nh > nw;
          const orient = isPort ? 'portrait' : 'landscape';
          const ratio = nh / nw;
          setPosterMeta(prev => ({ ...prev, [url]: { orientation: orient, ratio, width: nw, height: nh } }));
          setPosterOrientations(prev => prev[url] === orient ? prev : ({ ...prev, [url]: orient }));
        };
        img.src = url;
      }
    });
  }, [events]);

  // Generate days for monthly calendar view
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0: Sunday, 1: Monday, etc.
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDayIndex, totalDays, year, month };
  };

  const { firstDayIndex, totalDays, year, month } = getDaysInMonth(calendarDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  const getEventsForDay = (day: number) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const daysArray: (number | null)[] = [];
  // Trailing spaces
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  // Days of the month
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  const categories = ['All', 'Workshops', 'Hackathons', 'Seminars', 'Cultural Events', 'Club Meetings'];

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || e.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const openCreateForm = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventCategory('Workshops');
    setEventDescription('');
    setEventDate('');
    setEventStartTime('');
    setEventEndTime('');
    setEventDuration('');
    setEventVenue('');
    setEventFaculty('');
    setEventStudent('');
    setEventMaxParticipants(100);
    setEventDeadline('');
    setEventPoster('');
    setEventPosterOrientation('auto');
    setEventImages([]);
    setEventRules('');
    setEventReqs('');
    setEventIsTeamBased(false);
    setEventMaxTeamSize(4);
    setShowAddForm(true);
  };

  const openEditForm = (evt: DepartmentEvent) => {
    setEditingEventId(evt.eventId);
    setEventTitle(evt.title);
    setEventCategory(evt.category);
    setEventDescription(evt.description);
    setEventDate(evt.date);
    setEventStartTime(evt.startTime);
    let resolvedEnd = evt.endTime === 'N/A' ? '' : (evt.endTime || '');
    if (!resolvedEnd && evt.startTime && evt.duration) {
      resolvedEnd = calcEndTime(evt.startTime, evt.duration);
    }
    setEventEndTime(resolvedEnd);
    const resolvedDur = evt.duration || (evt.startTime && resolvedEnd ? calcDurationFromTimes(evt.startTime, resolvedEnd) : '');
    setEventDuration(resolvedDur);
    setEventVenue(evt.venue);
    setEventFaculty(evt.facultyCoordinator === 'Dr. XYZ Prasad' ? '' : evt.facultyCoordinator);
    setEventStudent(evt.studentCoordinators === user.name ? '' : evt.studentCoordinators);
    setEventMaxParticipants(evt.maxParticipants);
    setEventDeadline(evt.registrationDeadline === evt.date ? '' : evt.registrationDeadline);
    setEventPoster(evt.posterImage.includes('unsplash') ? '' : evt.posterImage);
    setEventPosterOrientation(evt.posterOrientation || 'auto');
    setEventImages(evt.images || []);
    setEventRules(evt.rules || '');
    setEventReqs(evt.requirements || '');
    setEventIsTeamBased(evt.isTeamBased || false);
    setEventMaxTeamSize(evt.maxTeamSize || 4);
    setShowAddForm(true);
  };

  const selectedCoordNames = eventStudent
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const toggleCoordinatorName = (name: string) => {
    const current = eventStudent.split(',').map(s => s.trim()).filter(Boolean);
    const exists = current.some(n => n.toLowerCase() === name.toLowerCase());
    let next: string[];
    if (exists) {
      next = current.filter(n => n.toLowerCase() !== name.toLowerCase());
    } else {
      next = [...current, name];
    }
    setEventStudent(next.join(', '));
  };

  const removeCoordinatorName = (nameToRemove: string) => {
    const current = eventStudent.split(',').map(s => s.trim()).filter(Boolean);
    const next = current.filter(n => n.toLowerCase() !== nameToRemove.toLowerCase());
    setEventStudent(next.join(', '));
  };

  const selectFacultyCoordinator = (facultyName: string) => {
    setEventFaculty(facultyName);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate || !eventStartTime || !eventVenue) return;

    try {
      const defaultPoster = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&h=450&q=80';
      const finalPoster = eventPoster || (eventImages.length > 0 ? eventImages[0] : defaultPoster);
      const resolvedOrientation = eventPosterOrientation !== 'auto' ? eventPosterOrientation : (posterOrientations[finalPoster] || 'landscape');

      const computedDuration = (eventStartTime && eventEndTime)
        ? calcDurationFromTimes(eventStartTime, eventEndTime)
        : (eventDuration || '3 Hours');

      if (editingEventId) {
        const existingEvent = events.find(ev => ev.eventId === editingEventId);
        if (!existingEvent) return;

        const updatedEvent: DepartmentEvent = {
          ...existingEvent,
          title: eventTitle,
          category: eventCategory,
          description: eventDescription,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime || 'N/A',
          duration: computedDuration || '3 Hours',
          venue: eventVenue,
          facultyCoordinator: eventFaculty || 'Dr. XYZ Prasad',
          studentCoordinators: eventStudent || user.name,
          maxParticipants: Number(eventMaxParticipants),
          registrationDeadline: eventDeadline || eventDate,
          posterImage: finalPoster,
          posterOrientation: resolvedOrientation,
          images: eventImages.length > 0 ? eventImages : undefined,
          rules: eventRules,
          requirements: eventReqs,
          isTeamBased: eventIsTeamBased,
          maxTeamSize: eventIsTeamBased ? Number(eventMaxTeamSize) : 1
        };

        await updateEvent(updatedEvent);
        if (selectedEvent?.eventId === editingEventId) {
          setSelectedEvent(updatedEvent);
        }
      } else {
        const eventId = `event_${Date.now()}`;
        const newEvent: DepartmentEvent = {
          eventId,
          tenantId: resolvedTenantId,
          title: eventTitle,
          category: eventCategory,
          description: eventDescription,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime || 'N/A',
          duration: computedDuration || '3 Hours',
          venue: eventVenue,
          facultyCoordinator: eventFaculty || 'Dr. XYZ Prasad',
          studentCoordinators: eventStudent || user.name,
          maxParticipants: Number(eventMaxParticipants),
          registrationDeadline: eventDeadline || eventDate,
          posterImage: finalPoster,
          posterOrientation: resolvedOrientation,
          images: eventImages.length > 0 ? eventImages : undefined,
          rules: eventRules,
          requirements: eventReqs,
          createdAt: new Date().toISOString(),
          isTeamBased: eventIsTeamBased,
          maxTeamSize: eventIsTeamBased ? Number(eventMaxTeamSize) : 1
        };

        await createEvent(newEvent);
      }

      refreshEvents();

      // Reset
      setShowAddForm(false);
      setEditingEventId(null);
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventStartTime('');
      setEventEndTime('');
      setEventVenue('');
      setEventRules('');
      setEventReqs('');
      setEventPoster('');
      setEventImages([]);
      setEventIsTeamBased(false);
      setEventMaxTeamSize(4);
    } catch (err) {
      console.error(err);
    }
  };

  // Management role check (Admins and Super Admins cannot register as event participants)
  const isManagementRole = (
    user.role === 'admin' || 
    Boolean(user.isSuperAdmin) || 
    SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') ||
    user.uid === 'admin_master' ||
    user.uid === 'user_admin_syed'
  );

  // Participant list for currently selected event
  const eventRegistrations = selectedEvent ? registrations.filter(r => r.eventId === selectedEvent.eventId) : [];
  const userRegistration = selectedEvent ? registrations.find(r => {
    if (r.eventId !== selectedEvent.eventId) return false;
    if (r.studentId === user.uid) return true;
    if (user.rollNumber && r.rollNumber?.toLowerCase() === user.rollNumber.toLowerCase()) return true;
    if (user.rollNumber && r.teamMembers) {
      const isMember = r.teamMembers.some(m => m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase() && m.status !== 'Declined');
      if (isMember) return true;
    }
    return false;
  }) : null;
  const isUserRegistered = !!userRegistration;
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Capacity & Deadline validations
  const isCapacityFull = Boolean(selectedEvent?.maxParticipants && selectedEvent.maxParticipants > 0 && eventRegistrations.length >= selectedEvent.maxParticipants);
  const isDeadlinePassed = (() => {
    if (!selectedEvent?.registrationDeadline) return false;
    const deadline = new Date(selectedEvent.registrationDeadline);
    return !isNaN(deadline.getTime()) && new Date() > deadline;
  })();

  const handleRegister = async () => {
    if (!selectedEvent) return;

    if (isManagementRole) {
      alert('Administrative and Super Admin accounts are restricted from event participation to preserve audit integrity and accurate attendance records.');
      return;
    }

    if (isCapacityFull) {
      alert(`Registration Closed: This event has reached its maximum capacity of ${selectedEvent.maxParticipants} participants.`);
      return;
    }

    if (isDeadlinePassed) {
      alert(`Registration Closed: The deadline (${new Date(selectedEvent.registrationDeadline).toLocaleDateString()}) for this event has passed.`);
      return;
    }

    if (isUserRegistered) {
      alert('You are already registered for this event.');
      return;
    }

    setIsRegistering(true);

    try {
      const regId = `${user.uid}_${selectedEvent.eventId}`;
      const newReg: EventRegistration = {
        registrationId: regId,
        studentId: user.uid,
        eventId: selectedEvent.eventId,
        status: 'Registered',
        appliedAt: new Date().toISOString(),
        studentName: user.name,
        rollNumber: user.rollNumber || 'N/A',
        phone: user.phone || 'N/A',
        year: user.year || '3rd Year',
        tenantId: selectedEvent.tenantId || resolvedTenantId,
        isTeam: !!selectedEvent.isTeamBased,
      };

      if (selectedEvent.isTeamBased) {
        newReg.teamName = teamName || 'Unnamed Team';
        newReg.teamMembers = teamMembersInput;
      }

      await createRegistration(newReg);
      setTeamName('');
      setTeamMembersInput([]);
      refreshRegistrations();
      fireConfetti(3000);
      setShowTicketModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAttendance = async (regId: string, currentStatus: 'Registered' | 'Attended' | 'Absent', newStatus: 'Registered' | 'Attended' | 'Absent') => {
    if (newStatus === 'Attended' && selectedEvent?.date) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (todayStr < selectedEvent.date) {
        alert(`Attendance check-in opens on the scheduled date (${selectedEvent.date}).`);
        return;
      }
    }
    try {
      await updateRegistrationStatus(regId, newStatus, user.email);
      refreshRegistrations();
    } catch (err) {
      console.error(err);
    }
  };


  // Check if selected event has already concluded (past date/end time)
  const isSelectedEventCompleted = (() => {
    if (!selectedEvent?.date) return false;
    const eventDate = new Date(selectedEvent.date);
    if (isNaN(eventDate.getTime())) return false;
    
    let eventEndTime = eventDate.getTime();
    if (selectedEvent.endTime && selectedEvent.endTime !== 'N/A') {
      const parsed = new Date(`${selectedEvent.date} ${selectedEvent.endTime}`);
      if (!isNaN(parsed.getTime())) {
        eventEndTime = parsed.getTime();
      } else {
        eventDate.setHours(23, 59, 59, 999);
        eventEndTime = eventDate.getTime();
      }
    } else {
      eventDate.setHours(23, 59, 59, 999);
      eventEndTime = eventDate.getTime();
    }
    return Date.now() > eventEndTime;
  })();

  const handleWithdraw = async () => {
    if (!selectedEvent || !userRegistration) return;

    if (userRegistration.status === 'Attended') {
      alert('Attendance has already been marked as Present for this event. Verified attendance records cannot be self-withdrawn. Only a department administrator can remove this record.');
      return;
    }

    if (isSelectedEventCompleted) {
      alert('This event has already concluded. Registrations cannot be withdrawn once an event has ended.');
      return;
    }

    const isLeaderOrSolo = userRegistration.studentId === user.uid;

    // Check if an official certificate was issued for this student & event
    const myCert = dbCertificates.find(c => 
      c.eventId === selectedEvent.eventId && 
      (c.studentId === user.uid || (user.rollNumber && c.rollNumber.toUpperCase() === user.rollNumber.toUpperCase()))
    );

    let confirmPrompt = isLeaderOrSolo
      ? `Are you sure you want to withdraw your registration for "${selectedEvent.title}"? Your reserved pass will be cancelled and the seat released.`
      : `Are you sure you want to withdraw from team "${userRegistration.teamName || 'your team'}" for "${selectedEvent.title}"?`;

    if (myCert) {
      confirmPrompt += `\n\n⚠️ IMPORTANT: An official certificate has already been issued for this event. Withdrawing will permanently revoke and delete this certificate from the database and your profile.`;
    }

    if (!window.confirm(confirmPrompt)) return;

    setIsWithdrawing(true);
    try {
      if (isLeaderOrSolo) {
        await deleteRegistration(userRegistration.registrationId);
      } else {
        const updatedMembers = userRegistration.teamMembers?.map(m => {
          if (m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase()) {
            return { ...m, status: 'Declined' as const };
          }
          return m;
        }) || [];
        await updateRegistrationTeamMembers(userRegistration.registrationId, updatedMembers);
      }

      // Automatically delete and revoke issued certificate if exists
      if (myCert) {
        try {
          await deleteCertificate(myCert.certificateId);
        } catch (certErr) {
          console.error('Error deleting associated certificate:', certErr);
        }
      }

      refreshRegistrations();
    } catch (err) {
      console.error('Withdrawal error:', err);
      alert('Could not withdraw registration. Please check your network and try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Export to CSV function
  const exportParticipantsToCSV = () => {
    if (!selectedEvent || eventRegistrations.length === 0) return;

    const headers = ['Student Name', 'Roll Number', 'Year', 'Phone', 'Team Name', 'Teammates', 'Registration Date', 'Status'];
    const rows = eventRegistrations.map(r => [
      `"${r.studentName.replace(/"/g, '""')}"`,
      `"${r.rollNumber.replace(/"/g, '""')}"`,
      `"${r.year.replace(/"/g, '""')}"`,
      `"'${r.phone.replace(/"/g, '""')}"`,
      `"${(r.teamName || 'Individual').replace(/"/g, '""')}"`,
      `"${(r.teamMembers ? r.teamMembers.map(m => `${m.name} (${m.rollNumber} - ${m.year} Sec ${m.section})`).join('; ') : 'None').replace(/"/g, '""')}"`,
      `"${new Date(r.appliedAt).toLocaleDateString()}"`,
      `"${r.status}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NOTX_Participants_${selectedEvent.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-background text-content scroll-smooth pb-36 sm:pb-32">

      {/* Header Search & Actions */}
      <div className="px-4 pt-4 pb-3 space-y-3 bg-[var(--nb-surface)] border-b border-[var(--nb-divider)]">
        <div className="flex justify-between items-center gap-3">
          <div>
            <h3 className="nb-headline text-2xl leading-none">Events Arena</h3>
            <p className="nb-label text-xs text-[var(--nb-secondary)] mt-1">Hackathons, masterclasses, and tech meets</p>
          </div>
          {(user.role === 'admin' || (user.role === 'associate' && user.powers?.canManageEvents)) && (
            <button
              onClick={openCreateForm}
              className="nb-btn text-xs py-2 px-3.5 !min-h-[38px] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Event</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nb-tertiary)]" />
          <input
            type="text"
            placeholder="Search events, topics, coordinators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="nb-input !pl-10 !pr-10 text-xs rounded-md !min-h-[40px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)] hover:text-[var(--nb-content)] p-1 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Tab Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            const getSelectedCatClass = (category: string) => {
              switch (category) {
                case 'All': return 'nb-pill-yellow text-neutral-900 border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]';
                case 'Workshops': return 'nb-pill-blue text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]';
                case 'Hackathons': return 'nb-pill-purple text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]';
                case 'Seminars': return 'nb-pill-green text-neutral-900 border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]';
                case 'Cultural Events': return 'nb-pill-pink text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]';
                case 'Club Meetings': return 'nb-pill-coral text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]';
                default: return 'nb-pill-cyan text-white border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)]';
              }
            };

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${isSelected
                    ? getSelectedCatClass(cat)
                    : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)]'
                  }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* View Switcher segment */}
        <div className="flex border-t border-[var(--nb-divider)] pt-2.5 items-center justify-between">
          <span className="nb-label text-[10px] text-[var(--nb-secondary)]">Display Mode</span>
          <div
            className="p-1 rounded-md flex gap-1 bg-[var(--nb-surface-accent)]"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'list'
                  ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)] shadow-xs'
                  : 'text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                }`}
            >
              <RotateCw className="w-3 h-3" />
              <span>Flip Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded transition-all cursor-pointer ${viewMode === 'calendar'
                  ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)] shadow-xs'
                  : 'text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Events */}
      <div className="px-4 pb-28 sm:pb-32 space-y-3.5">
        {viewMode === 'calendar' ? (
          <div
            className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-4"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
          >
            {/* Calendar Header with navigation buttons */}
            <div className="flex justify-between items-center border-b border-[var(--nb-ink)]/20 pb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] flex items-center justify-center font-bold text-sm cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)] transition-all"
                title="Previous Month"
              >
                &larr;
              </button>

              <div className="text-center">
                <h4 className="nb-headline text-base text-[var(--nb-content)]">
                  {monthNames[month]} {year}
                </h4>
                <p className="nb-label text-[9px] text-[var(--nb-secondary)] mt-0.5">
                  DEPARTMENT SCHEDULES
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] flex items-center justify-center font-bold text-sm cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)] transition-all"
                title="Next Month"
              >
                &rarr;
              </button>
            </div>

            {/* Days of week titles */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <span key={day} className="nb-label text-[10px] text-[var(--nb-secondary)] py-1">
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {daysArray.map((day, index) => {
                const dayEvents = getEventsForDay(day || 0);
                const hasEvents = dayEvents.length > 0;

                // Highlight current active system date
                const today = new Date();
                const isToday = day &&
                  today.getDate() === day &&
                  today.getMonth() === month &&
                  today.getFullYear() === year;

                return (
                  <div
                    key={index}
                    className={`min-h-[56px] p-1.5 rounded flex flex-col justify-between transition-all relative ${!day
                        ? 'bg-transparent pointer-events-none'
                        : isToday
                          ? 'bg-[var(--nb-accent)] text-black font-bold'
                          : hasEvents
                            ? 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)] cursor-pointer hover:bg-[var(--nb-surface)]'
                            : 'bg-[var(--nb-surface)] text-[var(--nb-secondary)]'
                      }`}
                    style={day ? { border: isToday ? '2px solid var(--nb-ink)' : '1px solid var(--nb-ink)' } : undefined}
                  >
                    <span className={`text-[10px] font-mono font-bold leading-none ${isToday ? 'text-black' : 'text-[var(--nb-secondary)]'
                      }`}>
                      {day}
                    </span>

                    {/* Day scheduled event marks */}
                    {day && hasEvents && (
                      <div className="space-y-1 mt-1">
                        {dayEvents.map(ev => (
                          <div
                            key={ev.eventId}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className="text-[8px] font-mono font-bold px-1 py-0.5 rounded leading-none truncate bg-[var(--nb-ink)] text-[var(--nb-bg)] hover:bg-[var(--nb-accent)] hover:text-black transition-colors cursor-pointer"
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upcoming schedules checklist summary */}
            <div className="border-t border-[var(--nb-ink)]/20 pt-3 space-y-2">
              <span className="nb-label text-[9px] text-[var(--nb-secondary)] block">UPCOMING DEADLINES THIS MONTH</span>
              <div className="space-y-2">
                {events
                  .filter(e => {
                    const eDate = new Date(e.date);
                    return eDate.getMonth() === month && eDate.getFullYear() === year;
                  })
                  .map(e => {
                    const regCount = registrations.filter(r => r.eventId === e.eventId).length;
                    return (
                      <div
                        key={e.eventId}
                        onClick={() => setSelectedEvent(e)}
                        className="bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-surface)] p-2.5 rounded flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="nb-headline text-xs text-[var(--nb-content)] truncate">{e.title}</h5>
                          <div className="flex gap-2 items-center text-[9px] text-[var(--nb-secondary)] mt-1">
                            <span className="nb-tag-accent text-[9px]">
                              {e.date}
                            </span>
                            <span className="nb-label text-[9px]">Deadline: <strong className="text-[var(--nb-content)]">{e.registrationDeadline}</strong></span>
                          </div>
                        </div>
                        <span className="nb-tag text-[9px]">
                          {regCount} Joined
                        </span>
                      </div>
                    );
                  })}
                {events.filter(e => {
                  const eDate = new Date(e.date);
                  return eDate.getMonth() === month && eDate.getFullYear() === year;
                }).length === 0 && (
                    <p className="text-xs text-[var(--nb-secondary)] italic text-center py-2">No department schedules set for this month.</p>
                  )}
              </div>
            </div>
          </div>
        ) : isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface border border-divider rounded-xl overflow-hidden shadow flex flex-col animate-pulse"
            >
              <div className="relative h-28 bg-surface-accent flex-shrink-0">
                <div className="absolute top-2.5 left-2.5 w-16 h-4 bg-divider rounded-md" />
                <div className="absolute bottom-2.5 left-2.5 w-24 h-5 bg-divider rounded-md" />
              </div>

              <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-2/3 bg-divider rounded" />
                  <div className="h-2.5 w-full bg-divider rounded" />
                  <div className="h-2.5 w-4/5 bg-divider rounded" />
                </div>

                <div className="flex justify-between items-center border-t border-divider pt-2">
                  <div className="flex gap-3">
                    <div className="h-3 w-12 bg-divider rounded" />
                    <div className="h-3 w-12 bg-divider rounded" />
                  </div>
                  <div className="h-4 w-14 bg-divider rounded" />
                </div>
              </div>
            </div>
          ))
        ) : filteredEvents.length === 0 ? (
          <div
            className="w-full bg-[var(--nb-surface)] rounded-xl p-8 sm:p-12 text-center mt-4 relative overflow-hidden"
            style={{
              border: '2px solid var(--nb-ink)',
              boxShadow: 'var(--shadow-hard)'
            }}
          >
            {/* Top decorative pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full nb-pill-yellow text-neutral-900 text-[10px] font-mono font-bold tracking-wider uppercase border-1.5 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]">
              <span>★ ARENA RADAR ★</span>
            </div>

            <div
              className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center nb-card-purple"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: '3px 3px 0 var(--nb-ink)' }}
            >
              <Calendar className="w-8 h-8 text-white stroke-[2.5]" />
            </div>

            <h4 className="nb-headline text-lg sm:text-xl text-[var(--nb-content)] mb-1.5">
              {searchQuery ? 'NO MATCHING EVENTS FOUND' : 'NO SESSIONS SCHEDULED YET'}
            </h4>

            <p className="text-xs text-[var(--nb-secondary)] font-sans max-w-md mx-auto leading-relaxed mb-5">
              {searchQuery
                ? `No events found matching "${searchQuery}". Try searching for another topic or reset your search.`
                : activeCategory !== 'All'
                  ? `No upcoming events currently scheduled under the "${activeCategory}" category.`
                  : 'The event calendar is currently quiet. Upcoming workshops, hackathons, and guest seminars will be published here.'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {(activeCategory !== 'All' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
                  className="nb-btn-ghost text-xs py-2 px-4 rounded-md cursor-pointer font-mono font-bold uppercase"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  Clear Filters
                </button>
              )}

              {(user.role === 'admin' || (user.role === 'associate' && user.powers?.canManageEvents)) && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="nb-btn text-xs py-2 px-4 rounded-md cursor-pointer font-mono font-bold uppercase"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Host New Event</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 w-full items-start">
            {filteredEvents.map((event) => {
              const myReg = registrations.find(r => {
                if (r.eventId !== event.eventId) return false;
                if (r.studentId === user.uid) return true;
                if (user.rollNumber && r.rollNumber?.toLowerCase() === user.rollNumber.toLowerCase()) return true;
                if (user.rollNumber && r.teamMembers) {
                  const isMember = r.teamMembers.some(m => m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase() && m.status !== 'Declined');
                  if (isMember) return true;
                }
                return false;
              });
              const regCount = registrations.filter(r => r.eventId === event.eventId).length;

              const isTeammate = myReg && user.rollNumber && myReg.studentId !== user.uid;
              const teammateObj = isTeammate && myReg ? myReg.teamMembers?.find(m => m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase()) : null;
              const isPendingInvite = teammateObj && (teammateObj.status === 'Pending' || !teammateObj.status);
              const eventCoordinators = allUsers.filter(u => u.role === 'coordinator' && u.assignedEvents?.includes(event.eventId));

              // Dynamic aspect ratio & orientation detection for card sizing
              const meta = posterMeta[event.posterImage];
              const isPortrait = (event.posterOrientation === 'portrait') ||
                (meta?.orientation === 'portrait') ||
                (posterOrientations[event.posterImage] === 'portrait');

              // Intrinsic aspect ratio (width / height)
              const rawAspect = (meta?.width && meta?.height)
                ? (meta.width / meta.height)
                : (meta?.ratio ? 1 / meta.ratio : (isPortrait ? 0.72 : 1.55));

              // Dynamic clamping within comfortable, generous UI boundary ranges:
              // Portrait: allows 0.65 (approx 2:3) to 0.85 (approx 4:5), max height 415px, min height 310px
              // Landscape: allows 1.25 (approx 5:4) to 1.78 (16:9), max height 265px, min height 210px
              const clampedAspect = isPortrait
                ? Math.max(0.65, Math.min(0.85, rawAspect))
                : Math.max(1.25, Math.min(1.78, rawAspect));

              const cardAspect = clampedAspect.toFixed(3);
              const cardMaxHeight = isPortrait ? 415 : 265;
              const cardMinHeight = isPortrait ? 310 : 210;

              return (
                <div key={event.eventId} className="w-full">
                  <FlipCard
                    front={
                      <div className="relative w-full h-full overflow-hidden flex flex-col justify-end group bg-neutral-950">
                        {/* Edge-to-edge uncropped poster image: matches card aspect ratio with zero space on sides */}
                        <img
                          src={event.posterImage}
                          alt={event.title}
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            const nw = img.naturalWidth || 1;
                            const nh = img.naturalHeight || 1;
                            const orient = nh > nw ? 'portrait' : 'landscape';
                            const ratio = nh / nw;
                            setPosterMeta(prev => {
                              if (prev[event.posterImage]?.ratio === ratio && prev[event.posterImage]?.width === nw) return prev;
                              return { ...prev, [event.posterImage]: { orientation: orient, ratio, width: nw, height: nh } };
                            });
                            if (posterOrientations[event.posterImage] !== orient) {
                              setPosterOrientations(prev => ({ ...prev, [event.posterImage]: orient }));
                            }
                          }}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                        />

                        {/* Solid high-contrast backing at bottom for brutalist legibility */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-black/85 border-t border-[var(--nb-ink)] pointer-events-none z-10" />

                        {/* Top Badges: Category only */}
                        {event.category && (
                          <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                            <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded shadow-[2px_2px_0_var(--nb-ink)] border border-[var(--nb-ink)] uppercase ${event.category === 'Workshops' ? 'nb-pill-blue' :
                                event.category === 'Hackathons' ? 'nb-pill-purple' :
                                  event.category === 'Seminars' ? 'nb-pill-green' :
                                    event.category === 'Cultural Events' ? 'nb-pill-pink' :
                                      event.category === 'Club Meetings' ? 'nb-pill-coral' : 'nb-pill-yellow'
                              }`}>
                              {event.category}
                            </span>
                          </div>
                        )}

                        {/* Front face Bottom content: ONLY event name and date on cover */}
                        <div className="relative z-20 p-2.5 space-y-1.5 pointer-events-none">
                          <div className="inline-flex items-center gap-1.5 text-neutral-900 text-[9.5px] font-mono font-bold nb-pill-yellow px-2 py-0.5 rounded shadow-[2px_2px_0_var(--nb-ink)] border border-[var(--nb-ink)]">
                            <Calendar className="w-2.5 h-2.5 text-neutral-900" />
                            {event.date}
                          </div>

                          <h3 className="text-sm sm:text-base font-sans font-extrabold text-white tracking-tight leading-snug line-clamp-2">
                            {event.title}
                          </h3>
                        </div>
                      </div>
                    }
                    back={
                      <div style={{ padding: isPortrait ? 13 : 10 }} className="h-full flex flex-col justify-between overflow-y-auto select-text text-neutral-100">
                        <div className="space-y-1.5">
                          {/* Header with category and flip back hint */}
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] uppercase ${event.category === 'Workshops' ? 'nb-pill-blue' :
                                event.category === 'Hackathons' ? 'nb-pill-purple' :
                                  event.category === 'Seminars' ? 'nb-pill-green' :
                                    event.category === 'Cultural Events' ? 'nb-pill-pink' :
                                      event.category === 'Club Meetings' ? 'nb-pill-coral' : 'nb-pill-yellow'
                              }`}>
                              {event.category}
                            </span>
                            <span className="text-[8px] font-mono text-neutral-300 flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                              <RotateCw className="w-2.5 h-2.5 text-[var(--nb-yellow)]" />
                              Poster
                            </span>
                          </div>

                          <div>
                            <h3 className="text-sm sm:text-base font-sans font-extrabold text-white tracking-tight leading-snug line-clamp-2">
                              {event.title}
                            </h3>
                            <p className="text-[9.5px] text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                              {event.description}
                            </p>
                          </div>

                          {/* Quick metadata grid */}
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[8.5px]">
                            <div className="bg-neutral-800/80 border border-white/10 rounded-lg p-1.5">
                              <span className="text-[7.5px] font-mono text-neutral-400 uppercase flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5 text-indigo-400" /> Date & Time
                              </span>
                              <span className="font-bold text-white mt-0.5 block truncate">{event.date}</span>
                              <span className="text-[7.5px] text-neutral-400 font-mono block truncate">{event.startTime}</span>
                            </div>

                            <div className="bg-neutral-800/80 border border-white/10 rounded-lg p-1.5">
                              <span className="text-[7.5px] font-mono text-neutral-400 uppercase flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-indigo-400" /> Venue
                              </span>
                              <span className="font-bold text-white mt-0.5 block truncate">{event.venue.split(',')[0]}</span>
                              <span className="text-[7.5px] text-neutral-400 font-mono block">Campus</span>
                            </div>
                          </div>

                          {/* Extra metadata if vertical room exists (portrait) */}
                          {isPortrait && (
                            <div className="space-y-1 text-[8.5px] bg-neutral-900/90 border border-white/10 p-1.5 rounded-lg font-mono">
                              <div className="flex justify-between items-center text-neutral-400">
                                <span>Deadline:</span>
                                <span className="font-bold text-amber-400">{event.registrationDeadline}</span>
                              </div>
                              <div className="flex justify-between items-center text-neutral-400">
                                <span>Student Lead:</span>
                                <span className="font-medium text-neutral-200 truncate max-w-[120px]">{event.studentCoordinators}</span>
                              </div>
                              <div className="flex justify-between items-center text-neutral-400">
                                <span>Capacity:</span>
                                <span className="text-violet-400 font-bold">{regCount} / {event.maxParticipants}</span>
                              </div>
                              {eventCoordinators.length > 0 && (
                                <div className="flex justify-between items-center text-neutral-400 pt-0.5 border-t border-white/5">
                                  <span>Coordinators:</span>
                                  <span className="text-indigo-300">{eventCoordinators.length} Assigned</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions on back face */}
                        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-1.5 mt-1 flex-shrink-0">
                          {myReg ? (
                            <div className="flex items-center gap-1">
                              <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${isPendingInvite
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : myReg.status === 'Attended'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                }`}>
                                <Check className="w-2.5 h-2.5" />
                                {isPendingInvite ? 'Invited' : myReg.status}
                              </span>

                              {myReg.status === 'Attended' && (() => {
                                const myCert = dbCertificates.find(c => c.eventId === event.eventId && (c.studentId === user.uid || (user.rollNumber && c.rollNumber.toUpperCase() === user.rollNumber.toUpperCase())));
                                const isCertUnlocked = Boolean(myCert && myCert.status !== 'Revoked');
                                return (
                                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border ${isCertUnlocked
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    }`} title={isCertUnlocked ? "Official Certificate Generated" : "Certificate Locked - Pending Admin Batch Generation"}>
                                    {isCertUnlocked ? <Award className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                    <span>{isCertUnlocked ? 'Cert Issued' : 'Cert Locked'}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          ) : null}

                          <button
                            data-no-flip="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setEventImageIdx(0);
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded bg-[var(--nb-yellow)] hover:bg-[#FFE600] text-black border-2 border-[var(--nb-ink)] text-[10px] font-mono font-bold tracking-tight shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Event & Register
                          </button>
                        </div>
                      </div>
                    }
                    axis="y"
                    flipOnClick={true}
                    draggable={true}
                    dragDistance={0}
                    tilt={false}
                    tiltMax={0}
                    glare={false}
                    glareOpacity={0}
                    hoverScale={1.01}
                    perspective={1000}
                    stiffness={170}
                    damping={20}
                    width="100%"
                    aspectRatio={cardAspect}
                    maxHeight={cardMaxHeight}
                    minHeight={cardMinHeight}
                    maxWidth="100%"
                    radius={16}
                    background="#18181b"
                    color="#f5f5f5"
                    shadow={true}
                    shadowColor="#000000"
                    shadowOpacity={0.3}
                    onFlipChange={flipped => console.log('Event card flipped:', event.title, flipped)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* EVENT DETAIL SLIDING OVERLAY PANEL */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
          <div
            className="bg-[var(--nb-surface)] text-[var(--nb-content)] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            {/* Laminated Event Pass Header */}
            <div
              className="p-3 sm:p-4 flex justify-between items-center flex-shrink-0 border-b-2 border-dashed border-[var(--nb-ink)]"
              style={{ backgroundColor: 'var(--tenant-hero-bg)', color: 'var(--tenant-hero-fg)' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] uppercase ${selectedEvent.category === 'Workshops' ? 'nb-pill-blue text-white' :
                    selectedEvent.category === 'Hackathons' ? 'nb-pill-purple text-white' :
                      selectedEvent.category === 'Seminars' ? 'nb-pill-green text-black' :
                        selectedEvent.category === 'Cultural Events' ? 'nb-pill-pink text-white' :
                          selectedEvent.category === 'Club Meetings' ? 'nb-pill-coral text-white' : 'nb-pill-yellow text-black'
                  }`}>
                  {selectedEvent.category}
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black text-white border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                  PASS #{selectedEvent.eventId.slice(-4).toUpperCase()}
                </span>
                <span className="nb-pill-coral text-[9px] font-mono font-bold uppercase hidden sm:inline-block shadow-[1.5px_1.5px_0_var(--nb-ink)]">
                  ★ ADMIT ONE
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Event Media / Photos */}
              {(selectedEvent.images && selectedEvent.images.length > 1) ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-tertiary px-1 font-mono">
                    <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                      <ImageIcon className="w-3.5 h-3.5" /> Event Photos
                    </span>
                    <span>{eventImageIdx + 1} / {selectedEvent.images.length} Photos</span>
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-black/80 border-2 border-[var(--nb-ink)] aspect-video w-full flex items-center justify-center group">
                    <img
                      src={selectedEvent.images[eventImageIdx] || selectedEvent.posterImage}
                      alt={`${selectedEvent.title} photo ${eventImageIdx + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {/* Prev Button */}
                    <button
                      type="button"
                      onClick={() => setEventImageIdx(prev => (prev === 0 ? selectedEvent.images!.length - 1 : prev - 1))}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded bg-black text-white flex items-center justify-center border-2 border-white transition-all cursor-pointer shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() => setEventImageIdx(prev => (prev === selectedEvent.images!.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded bg-black text-white flex items-center justify-center border-2 border-white transition-all cursor-pointer shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                  {/* Thumbnail Strip */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {selectedEvent.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEventImageIdx(idx)}
                        className={`relative flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all cursor-pointer ${idx === eventImageIdx ? 'border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]' : 'border-[var(--nb-divider)] opacity-60 hover:opacity-100'
                          }`}
                      >
                        <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                (() => {
                  const modalImg = selectedEvent.images?.[0] || selectedEvent.posterImage;
                  const isModalPortrait = (selectedEvent.posterOrientation === 'portrait') || (posterOrientations[modalImg] === 'portrait');
                  return (
                    <div className={`rounded-lg overflow-hidden bg-black/80 relative border-2 border-[var(--nb-ink)] flex items-center justify-center group ${isModalPortrait ? 'max-h-[460px] aspect-[3/4] mx-auto w-full max-w-sm' : 'max-h-[300px] aspect-video w-full'
                      }`}>
                      <img
                        src={modalImg}
                        alt={selectedEvent.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  );
                })()
              )}

              <div>
                <h3 className="nb-headline text-xl text-[var(--nb-content)] leading-tight">{selectedEvent.title}</h3>
                <p className="text-xs text-[var(--nb-secondary)] mt-2 leading-relaxed">{selectedEvent.description}</p>
              </div>

              {/* Real-time Seats & Capacity Progress Meter */}
              {(() => {
                const modalRegs = registrations.filter(r => r.eventId === selectedEvent.eventId);
                const maxCap = selectedEvent.maxParticipants || 100;
                const fillPercent = Math.min(100, Math.round((modalRegs.length / maxCap) * 100));
                const spotsLeft = Math.max(0, maxCap - modalRegs.length);
                const isHouseFull = spotsLeft === 0;

                return (
                  <div
                    className="p-3.5 rounded-lg bg-[var(--nb-surface)] space-y-2.5"
                    style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                  >
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="flex items-center gap-1.5 uppercase text-[var(--nb-content)]">
                        <Users className="w-4 h-4 text-[var(--nb-blue)]" />
                        Live Capacity Tracker
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] ${isHouseFull
                          ? 'nb-pill-coral'
                          : spotsLeft <= 10
                            ? 'nb-pill-coral'
                            : 'nb-pill-green'
                        }`}>
                        {isHouseFull ? 'HOUSEFULL' : `${spotsLeft} SEATS LEFT (${fillPercent}%)`}
                      </span>
                    </div>

                    {/* Neo-brutalist progress track */}
                    <div
                      className="h-3.5 w-full rounded-full bg-[var(--nb-surface-accent)] p-0.5 overflow-hidden"
                      style={{ border: '1.5px solid var(--nb-ink)' }}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isHouseFull ? 'bg-[var(--nb-coral)]' : fillPercent > 80 ? 'bg-[var(--nb-yellow)]' : 'bg-[var(--nb-blue)]'
                          }`}
                        style={{ width: `${Math.max(4, fillPercent)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10.5px] font-mono text-[var(--nb-secondary)]">
                      <span>✓ {modalRegs.length} Students Joined</span>
                      <span>Total Capacity: {maxCap}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Registration Deadline Monospace Ticker */}
              {selectedEvent.registrationDeadline && (
                <div
                  className="p-3 rounded-lg flex items-center justify-between font-mono text-xs font-bold nb-pill-yellow"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <span className="flex items-center gap-1.5 uppercase text-black">
                    <Clock className="w-4 h-4 text-black" />
                    Registration Deadline
                  </span>
                  <span className="bg-black text-[#FFE600] px-2.5 py-0.5 rounded text-[11px] font-bold border border-[var(--nb-ink)]">
                    {selectedEvent.registrationDeadline}
                  </span>
                </div>
              )}

              {/* Coordinators Contact Box */}
              {(() => {
                const modalCoordinators = allUsers.filter(u => u.role === 'coordinator' && u.assignedEvents?.includes(selectedEvent.eventId));
                if (modalCoordinators.length === 0) return null;
                return (
                  <div
                    className="bg-[var(--nb-surface-accent)] p-3 rounded-lg space-y-2.5"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <h4 className="nb-label text-[10px] text-[var(--nb-accent)]">EVENT COORDINATORS</h4>
                    <div className="flex flex-col gap-2">
                      {modalCoordinators.map(coord => (
                        <div
                          key={coord.uid}
                          className="flex justify-between items-center bg-[var(--nb-surface)] p-2 rounded"
                          style={{ border: '1px solid var(--nb-ink)' }}
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={coord.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${coord.rollNumber || coord.uid}`}
                              alt={coord.name}
                              className="w-8 h-8 rounded bg-[var(--nb-surface-accent)] object-cover"
                            />
                            <div>
                              <div className="text-xs font-bold text-[var(--nb-content)]">{coord.name}</div>
                              <div className="nb-label text-[9px] text-[var(--nb-secondary)]">{coord.rollNumber}</div>
                            </div>
                          </div>
                          {user.uid !== coord.uid && onMessageCoordinator && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onMessageCoordinator(coord.rollNumber || coord.uid); }}
                              className="nb-btn-ghost text-[10px] font-bold px-2.5 py-1 cursor-pointer"
                              style={{ border: '1px solid var(--nb-ink)' }}
                            >
                              Message
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Event Timing Stats */}
              <div
                className="grid grid-cols-2 gap-2 bg-[var(--nb-surface)] p-3.5 rounded-lg"
                style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[var(--nb-accent)] flex-shrink-0" />
                  <div>
                    <div className="nb-label text-[9px] text-[var(--nb-secondary)]">DATE</div>
                    <div className="text-xs font-mono font-bold text-[var(--nb-content)] mt-0.5">{selectedEvent.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[var(--nb-accent)] flex-shrink-0" />
                  <div>
                    <div className="nb-label text-[9px] text-[var(--nb-secondary)]">TIME & DURATION</div>
                    <div className="text-xs font-mono font-bold text-[var(--nb-content)] mt-0.5">{selectedEvent.startTime} • {selectedEvent.duration}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 col-span-2 border-t border-[var(--nb-ink)]/15 pt-2.5 mt-1">
                  <MapPin className="w-4 h-4 text-[var(--nb-accent)] flex-shrink-0" />
                  <div>
                    <div className="nb-label text-[9px] text-[var(--nb-secondary)]">VENUE</div>
                    <div className="text-xs font-bold text-[var(--nb-content)] mt-0.5">{selectedEvent.venue}</div>
                  </div>
                </div>
              </div>

              {/* Coordinators */}
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className="bg-[var(--nb-surface)] p-3 rounded-lg"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <div className="nb-label text-[9px] text-[var(--nb-secondary)]">FACULTY LEAD</div>
                  <div className="text-xs font-bold text-[var(--nb-content)] mt-1 truncate">{selectedEvent.facultyCoordinator}</div>
                </div>
                <div
                  className="bg-[var(--nb-surface)] p-3 rounded-lg"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <div className="nb-label text-[9px] text-[var(--nb-secondary)]">STUDENT LEAD</div>
                  <div className="text-xs font-bold text-[var(--nb-content)] mt-1 truncate">{selectedEvent.studentCoordinators}</div>
                </div>
              </div>

              {/* Rules & Requirements */}
              {selectedEvent.rules && (
                <div>
                  <h4 className="nb-label text-[10px] text-[var(--nb-secondary)] mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                    EVENT RULES
                  </h4>
                  <div
                    className="bg-[var(--nb-surface)] p-3 rounded-lg"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <p className="text-xs text-[var(--nb-secondary)] whitespace-pre-line leading-relaxed">{selectedEvent.rules}</p>
                  </div>
                </div>
              )}

              {selectedEvent.requirements && (
                <div>
                  <h4 className="nb-label text-[10px] text-[var(--nb-secondary)] mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                    PREREQUISITES & MATERIALS
                  </h4>
                  <div
                    className="bg-[var(--nb-surface)] p-3 rounded-lg"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <p className="text-xs text-[var(--nb-secondary)] leading-relaxed">{selectedEvent.requirements}</p>
                  </div>
                </div>
              )}
              {/* REGISTRATION ACTION BUTTONS */}
              {user && (
                <div className="border-t border-[var(--nb-ink)]/20 pt-3.5 mt-2">
                  {isManagementRole ? (
                    <div
                      className="bg-[var(--nb-surface)] rounded-xl p-4 flex flex-col items-center text-center space-y-2.5 border-2 border-[var(--nb-ink)] shadow-[var(--shadow-hard-sm)]"
                    >
                      <div
                        className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-0.5 border-2 border-[var(--nb-ink)]"
                      >
                        <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <h4 className="nb-headline text-sm font-black uppercase tracking-wider text-[var(--nb-content)]">
                        Administrative Account Guard
                      </h4>
                      <p className="text-xs text-[var(--nb-secondary)] leading-relaxed max-w-md">
                        Super Administrators and Department Administrators are restricted from event participant registrations to safeguard audit compliance and registration integrity. You can manage participants, attendance, certificates, and winners below.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="nb-tag font-mono text-[9px] font-bold uppercase bg-[var(--nb-surface-accent)] text-[var(--nb-content)]">
                          Account: {user.isSuperAdmin ? 'Super Admin' : 'Admin'}
                        </span>
                        <span className="nb-tag font-mono text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          Enrolled: {eventRegistrations.length}{selectedEvent.maxParticipants ? ` / ${selectedEvent.maxParticipants}` : ''}
                        </span>
                      </div>
                    </div>
                  ) : isUserRegistered ? (

                    userRegistration?.studentId !== user.uid && userRegistration?.teamMembers?.some(m => m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase() && (m.status === 'Pending' || !m.status)) ? (
                      <div
                        className="bg-[var(--nb-surface)] rounded-lg p-4 flex flex-col items-center text-center space-y-2"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        <div
                          className="w-10 h-10 rounded bg-[var(--nb-surface-accent)] text-amber-500 flex items-center justify-center mb-1"
                          style={{ border: '1.5px solid var(--nb-ink)' }}
                        >
                          <Users className="w-5 h-5" />
                        </div>
                        <h4 className="nb-headline text-base text-[var(--nb-content)]">Team Invitation</h4>
                        <p className="text-xs text-[var(--nb-secondary)] leading-relaxed">
                          You have been invited to join team <span className="font-bold text-[var(--nb-content)]">"{userRegistration.teamName}"</span> led by <span className="font-bold text-[var(--nb-content)]">{userRegistration.studentName}</span>.
                        </p>

                        <div className="flex gap-2.5 mt-3 w-full">
                          <button
                            onClick={async () => {
                              if (!userRegistration) return;
                              const updatedMembers = userRegistration.teamMembers?.map(m => {
                                if (m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase()) {
                                  return { ...m, status: 'Accepted' as const };
                                }
                                return m;
                              }) || [];
                              await updateRegistrationTeamMembers(userRegistration.registrationId, updatedMembers);
                              refreshRegistrations();
                            }}
                            className="flex-1 nb-btn py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            onClick={async () => {
                              if (!userRegistration) return;
                              const updatedMembers = userRegistration.teamMembers?.map(m => {
                                if (m.rollNumber?.toLowerCase() === user.rollNumber?.toLowerCase()) {
                                  return { ...m, status: 'Declined' as const };
                                }
                                return m;
                              }) || [];
                              await updateRegistrationTeamMembers(userRegistration.registrationId, updatedMembers);
                              refreshRegistrations();
                            }}
                            className="flex-1 nb-btn-ghost py-2 text-xs font-bold uppercase tracking-wider text-rose-500 cursor-pointer"
                            style={{ border: '1.5px solid var(--nb-ink)' }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="bg-[var(--nb-surface)] rounded-lg p-4 flex flex-col items-center text-center space-y-2"
                        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                      >
                        <div
                          className="w-10 h-10 rounded bg-[var(--nb-accent)] text-black flex items-center justify-center mb-1"
                          style={{ border: '1.5px solid var(--nb-ink)' }}
                        >
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <h4 className="nb-headline text-base text-[var(--nb-content)]">Registration Confirmed</h4>
                        <div className="flex gap-2 items-center flex-wrap justify-center">
                          <span className="nb-tag-accent text-[9px] font-bold">Status: {userRegistration?.status}</span>
                          {userRegistration?.teamName && (
                            <span className="nb-tag text-[9px] font-bold">Team: {userRegistration.teamName}</span>
                          )}
                        </div>
                        {userRegistration?.teamMembers && userRegistration.teamMembers.length > 0 && (
                          <div
                            className="mt-2.5 w-full bg-[var(--nb-surface-accent)] p-2.5 rounded text-left text-xs space-y-1.5"
                            style={{ border: '1px solid var(--nb-ink)' }}
                          >
                            <span className="nb-label text-[9px] text-[var(--nb-secondary)] block">TEAMMATES STATUS:</span>
                            {userRegistration.teamMembers.map((m, i) => (
                              <div
                                key={i}
                                className="text-xs flex justify-between items-center bg-[var(--nb-surface)] p-2 rounded"
                                style={{ border: '1px solid var(--nb-ink)' }}
                              >
                                <span className="truncate max-w-[150px] font-medium">• {m.name} ({m.rollNumber})</span>
                                <span className={`nb-tag text-[8px] font-bold ${m.status === 'Accepted'
                                    ? 'bg-[var(--nb-accent)] text-black'
                                    : m.status === 'Declined'
                                      ? 'bg-rose-500 text-white'
                                      : ''
                                  }`}>
                                  {m.status || 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {userRegistration?.status === 'Attended' && (() => {
                          const myCert = dbCertificates.find(c => c.eventId === selectedEvent.eventId && (c.studentId === user.uid || (user.rollNumber && c.rollNumber.toUpperCase() === user.rollNumber.toUpperCase())));
                          const isCertUnlocked = Boolean(myCert && myCert.status !== 'Revoked');
                          return (
                            <div
                              className="mt-3 w-full p-3 rounded text-left text-xs space-y-1"
                              style={{
                                border: '1.5px solid var(--nb-ink)',
                                backgroundColor: isCertUnlocked ? 'var(--nb-surface-accent)' : 'var(--nb-surface)'
                              }}
                            >
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                {isCertUnlocked ? <ShieldCheck className="w-4 h-4 text-[var(--nb-accent)] shrink-0" /> : <Lock className="w-4 h-4 text-amber-500 shrink-0" />}
                                <span>{isCertUnlocked ? 'Official Certificate Issued & Unlocked' : 'Certificate Locked (Pending Admin Batch Release)'}</span>
                              </div>
                              <p className="text-[10px] text-[var(--nb-secondary)] leading-relaxed">
                                {isCertUnlocked
                                  ? `Official Certificate ID: ${myCert?.certificateId}. Your verified credential can be viewed, downloaded, or shared from your Profile tab.`
                                  : 'Attendance confirmed. The department administrator releases certificates in batches. Once generated by the admin, your certificate will automatically unlock in your Profile.'}
                              </p>
                            </div>
                          );
                        })()}

                        <p className="nb-label text-[9px] text-[var(--nb-secondary)] mt-1">Present your registration roll number at the venue.</p>

                        {/* View Digital Event Pass Button */}
                        <button
                          type="button"
                          onClick={() => setShowTicketModal(true)}
                          className="w-full mt-2.5 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-mono font-black uppercase transition-all cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5"
                          style={{ backgroundColor: 'var(--tenant-hero-bg)', color: 'var(--tenant-hero-fg)' }}
                        >
                          <Ticket className="w-4 h-4 stroke-[2.5]" />
                          View Digital Event Pass (QR)
                        </button>

                        {/* Event Conclusion, Attendance Verified, or Withdraw Option */}
                        <div className="pt-2.5 w-full border-t border-[var(--nb-divider)] mt-2">
                          {userRegistration?.status === 'Attended' ? (
                            <div className="text-center py-1 space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold uppercase">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" /> Attendance Verified • Locked
                              </span>
                              <p className="text-[10px] text-[var(--nb-secondary)] leading-relaxed">
                                Attendance has been confirmed for this event. Verified records cannot be withdrawn. Only a department administrator can remove this record.
                              </p>
                            </div>
                          ) : isSelectedEventCompleted ? (
                            <div className="text-center py-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] border border-[var(--nb-ink)] font-mono text-[10px] font-bold uppercase">
                                <Clock className="w-3.5 h-3.5" /> Event Concluded • Withdrawal Closed
                              </span>
                              <p className="text-[10px] text-[var(--nb-secondary)] mt-1">
                                This event has ended. Registrations and verified credentials are archived.
                              </p>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleWithdraw}
                                disabled={isWithdrawing}
                                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-mono font-bold uppercase transition-all cursor-pointer nb-pill-coral text-white border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                              >
                                {isWithdrawing ? (
                                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                ) : (
                                  <>
                                    <UserMinus className="w-4 h-4 stroke-[2.5]" />
                                    <span>Withdraw Registration</span>
                                  </>
                                )}
                              </button>
                              <p className="text-[10px] text-[var(--nb-secondary)] mt-1.5 text-center">
                                Changed plans? Withdraw before the event ends to release your reserved pass.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div
                      className="space-y-3 bg-[var(--nb-surface)] p-4 rounded-lg"
                      style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="nb-headline text-sm text-[var(--nb-content)]">Register for this event</h4>
                        {selectedEvent.isTeamBased ? (
                          <span className="nb-tag-accent text-[9px] font-bold">
                            TEAM (MAX {selectedEvent.maxTeamSize || 4})
                          </span>
                        ) : (
                          <span className="nb-tag text-[9px] font-bold">
                            INDIVIDUAL
                          </span>
                        )}
                      </div>

                      {selectedEvent.isTeamBased ? (
                        <div className="space-y-3">
                          <div>
                            <label className="nb-label text-[9px] text-[var(--nb-secondary)] block mb-1">TEAM NAME *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Neurons Crew"
                              value={teamName}
                              onChange={(e) => setTeamName(e.target.value)}
                              className="nb-input py-1.5 text-xs w-full"
                            />
                          </div>

                          {/* Dynamic Teammates list */}
                          {teamMembersInput.length > 0 && (
                            <div
                              className="space-y-1.5 bg-[var(--nb-surface-accent)] p-2.5 rounded"
                              style={{ border: '1px solid var(--nb-ink)' }}
                            >
                              <div className="nb-label text-[9px] text-[var(--nb-secondary)]">
                                ADDED TEAMMATES ({teamMembersInput.length + 1} OF {selectedEvent.maxTeamSize || 4})
                              </div>
                              {teamMembersInput.map((m, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center bg-[var(--nb-surface)] p-2 rounded text-xs"
                                  style={{ border: '1px solid var(--nb-ink)' }}
                                >
                                  <div>
                                    <div className="font-bold text-[var(--nb-content)]">{m.name}</div>
                                    <div className="nb-label text-[9px] text-[var(--nb-secondary)]">Roll: {m.rollNumber} • {m.year} Sec {m.section}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setTeamMembersInput(teamMembersInput.filter((_, i) => i !== idx))}
                                    className="px-2 py-0.5 rounded bg-rose-500 text-white font-mono font-bold text-[10px] uppercase border-1.5 border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Subform to add teammate */}
                          {teamMembersInput.length < (selectedEvent.maxTeamSize || 4) - 1 ? (
                            <div
                              className="p-3 bg-[var(--nb-surface-accent)] rounded space-y-2 text-xs"
                              style={{ border: '1px solid var(--nb-ink)' }}
                            >
                              <span className="nb-label text-[10px] text-[var(--nb-accent)] block">ADD TEAM MEMBER</span>

                              <div>
                                <label className="nb-label text-[8px] text-[var(--nb-secondary)] block mb-0.5">ROLL NUMBER *</label>
                                <input
                                  type="text"
                                  placeholder="Enter Roll Number"
                                  value={draftRoll}
                                  onChange={(e) => setDraftRoll(e.target.value)}
                                  className="nb-input py-1 text-xs w-full font-mono"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!draftRoll.trim()) {
                                    setRegFeedback('Teammate Roll Number is required.');
                                    return;
                                  }

                                  const searchRoll = draftRoll.trim().toLowerCase();
                                  if (searchRoll === user.rollNumber?.toLowerCase()) {
                                    setRegFeedback('You cannot add yourself as a teammate.');
                                    return;
                                  }
                                  if (teamMembersInput.some(m => m.rollNumber.toLowerCase() === searchRoll)) {
                                    setRegFeedback('Teammate is already added to the list.');
                                    return;
                                  }

                                  const teammateUser = allUsers.find(u => u.rollNumber?.toLowerCase() === searchRoll);

                                  if (!teammateUser) {
                                    setRegFeedback('No student found with this roll number. They must be registered in NOTX Connect.');
                                    return;
                                  }

                                  setRegFeedback('');
                                  setTeamMembersInput([...teamMembersInput, {
                                    name: teammateUser.name,
                                    rollNumber: teammateUser.rollNumber || draftRoll.trim().toUpperCase(),
                                    year: teammateUser.year || 'N/A',
                                    section: teammateUser.section || 'A',
                                    phone: teammateUser.phone || 'N/A'
                                  }]);

                                  setDraftRoll('');
                                }}
                                className="w-full nb-btn-ghost py-1.5 text-[10px] font-bold cursor-pointer"
                              >
                                + Add Member to Team List
                              </button>
                            </div>
                          ) : (
                            <div
                              className="bg-[var(--nb-surface-accent)] p-2.5 text-center text-xs font-bold rounded"
                              style={{ border: '1px solid var(--nb-ink)' }}
                            >
                              Maximum team size reached.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="text-xs text-[var(--nb-secondary)] bg-[var(--nb-surface-accent)] p-2.5 rounded"
                          style={{ border: '1px solid var(--nb-ink)' }}
                        >
                          Registering as an individual. Your student credentials will be linked automatically.
                        </div>
                      )}

                      {isCapacityFull ? (

                        <div className="bg-[var(--nb-surface)] p-3.5 rounded-lg border-2 border-[var(--nb-ink)] text-center space-y-1">
                          <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                            ⚠️ Registration Capacity Reached
                          </p>
                          <p className="text-[11px] text-[var(--nb-secondary)]">
                            This event has reached its maximum limit of {selectedEvent.maxParticipants} participants.
                          </p>
                        </div>
                      ) : isDeadlinePassed ? (
                        <div className="bg-[var(--nb-surface)] p-3.5 rounded-lg border-2 border-[var(--nb-ink)] text-center space-y-1">
                          <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                            ⏳ Registration Deadline Passed
                          </p>
                          <p className="text-[11px] text-[var(--nb-secondary)]">
                            Registrations closed on {new Date(selectedEvent.registrationDeadline).toLocaleDateString()}.
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedEvent.isTeamBased && !teamName.trim()) {
                              setRegFeedback('Please enter a Team Name.');
                              return;
                            }
                            handleRegister();
                          }}
                          disabled={isRegistering}
                          className="w-full nb-btn py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          {isRegistering ? (
                            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                          ) : "Submit Registration"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PARTICIPANTS & ATTENDANCE DASHBOARD */}
              {(user.role === 'admin' ||
                Boolean(user.isSuperAdmin) ||
                SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') ||
                (user.role === 'associate' && user.powers?.canViewRegistrations) ||
                (user.role === 'coordinator' && user.assignedEvents?.includes(selectedEvent.eventId))) && (

                  <div className="border-t border-[var(--nb-ink)]/20 pt-4 mt-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="nb-headline text-sm uppercase text-[var(--nb-content)]">Participants Management</h4>
                        <p className="nb-label text-[9px] text-[var(--nb-secondary)] mt-0.5">{eventRegistrations.length} Students registered</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateBatchInModal(selectedEvent.eventId)}
                          disabled={isGeneratingBatch || !eventRegistrations.some(r => r.status === 'Attended')}
                          className="nb-btn px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          title="Generate batch certificates for all attended students of this event"
                        >
                          <Zap className={`w-3 h-3 ${isGeneratingBatch ? 'animate-spin' : ''}`} />
                          <span>{isGeneratingBatch ? 'Generating...' : '⚡ Generate Batch Certs'}</span>
                        </button>

                        {eventRegistrations.length > 0 && (
                          <button
                            onClick={exportParticipantsToCSV}
                            className="nb-btn-ghost px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            style={{ border: '1.5px solid var(--nb-ink)' }}
                          >
                            <Download className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                            Export Excel
                          </button>
                        )}
                      </div>
                    </div>

                    {batchFeedback && (
                      <div
                        className="p-2.5 rounded bg-[var(--nb-surface-accent)] text-xs font-semibold flex items-center justify-between"
                        style={{ border: '1px solid var(--nb-ink)' }}
                      >
                        <span>{batchFeedback}</span>
                        <button onClick={() => setBatchFeedback('')} className="p-1 rounded hover:bg-[var(--nb-surface)] cursor-pointer transition-colors" aria-label="Dismiss">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {eventRegistrations.length === 0 ? (
                      <div
                        className="bg-[var(--nb-surface)] rounded-lg p-5 text-center"
                        style={{ border: '1.5px dashed var(--nb-ink)' }}
                      >
                        <p className="text-xs text-[var(--nb-secondary)] font-medium">No registrations submitted yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                        {eventRegistrations.map((reg) => {
                          const regCert = dbCertificates.find(c => c.eventId === selectedEvent.eventId && (c.studentId === reg.studentId || (reg.rollNumber && c.rollNumber.toUpperCase() === reg.rollNumber.toUpperCase())));
                          const isRegCertIssued = Boolean(regCert && regCert.status !== 'Revoked');

                          return (
                            <div
                              key={reg.registrationId}
                              className="bg-[var(--nb-surface)] p-2.5 rounded flex justify-between items-center gap-3"
                              style={{ border: '1.5px solid var(--nb-ink)' }}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[var(--nb-content)] truncate">{reg.studentName}</span>
                                  <span className="nb-label text-[9px] text-[var(--nb-secondary)]">{reg.rollNumber}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="nb-label text-[9px] text-[var(--nb-secondary)]">{reg.year}</span>
                                  {reg.teamName && (
                                    <span className="nb-tag text-[8px]">
                                      Team: {reg.teamName}
                                    </span>
                                  )}
                                </div>
                                {reg.teamMembers && reg.teamMembers.length > 0 && (
                                  <div className="mt-1 pl-2 border-l-2 border-[var(--nb-ink)]/30 space-y-0.5">
                                    <span className="nb-label text-[8px] text-[var(--nb-secondary)] block">Teammates:</span>
                                    {reg.teamMembers.map((m, idx) => (
                                      <div key={idx} className="text-[10px] text-[var(--nb-secondary)]">
                                        • {m.name} ({m.rollNumber}) - {m.year} Sec {m.section}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Attendance & Certificate indicators */}
                              <div className="flex items-center gap-2">
                                {reg.status === 'Attended' && (
                                  <span className="nb-tag-accent text-[8px] font-mono font-bold flex items-center gap-0.5" title={isRegCertIssued ? `Certificate ID: ${regCert?.certificateId}` : 'Certificate Locked - Pending Admin Batch Generation'}>
                                    {isRegCertIssued ? <ShieldCheck className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                    <span>{isRegCertIssued ? 'Issued' : 'Locked'}</span>
                                  </span>
                                )}

                                {/* Attendance Switches */}
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleAttendance(reg.registrationId, reg.status, 'Attended')}
                                    className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 ${reg.status === 'Attended'
                                        ? 'bg-emerald-500 text-white border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                                        : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] hover:bg-[var(--nb-surface-accent)]'
                                      }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => handleAttendance(reg.registrationId, reg.status, 'Absent')}
                                    className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 ${reg.status === 'Absent'
                                        ? 'bg-rose-500 text-white border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                                        : 'bg-[var(--nb-surface)] text-[var(--nb-content)] border-2 border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] hover:bg-[var(--nb-surface-accent)]'
                                      }`}
                                  >
                                    Absent
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              {/* ADMIN ACTIONS (EDIT / DELETE EVENT) */}
              {(user.role === 'admin' || (user.role === 'associate' && user.powers?.canManageEvents)) && (
                <div className="border-t border-[var(--nb-ink)]/20 pt-4 mt-3 flex flex-col gap-2">
                  <div
                    className="bg-[var(--nb-surface)] rounded-lg p-3.5 flex flex-col items-center text-center"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <h4 className="nb-headline text-sm text-[var(--nb-content)]">Manage Event</h4>
                    <p className="text-xs text-[var(--nb-secondary)] mt-0.5 leading-relaxed">
                      Modify details or permanently delete this event.
                    </p>
                    <div className="flex gap-2 mt-3 w-full max-w-xs justify-center">
                      <button
                        type="button"
                        onClick={() => openEditForm(selectedEvent)}
                        className="nb-btn text-xs font-bold uppercase tracking-wider py-2 px-4 cursor-pointer flex-1"
                      >
                        Edit Event
                      </button>
                      <HoldButton
                        size="sm"
                        holdTime={2000}
                        backgroundColor="rgba(244, 63, 94, 0.15)"
                        fillColor="#e11d48"
                        textColor="#fda4af"
                        fillTextColor="#ffffff"
                        radius={8}
                        doneLabel="Deleted"
                        onHold={async () => {
                          try {
                            await deleteEvent(selectedEvent.eventId, {

                              uid: user.uid,
                              email: user.email,
                              name: user.name,
                              role: user.role,
                              isSuperAdmin: Boolean(user.isSuperAdmin)
                            });
                            setConfirmDeleteEvent(false);
                            setSelectedEvent(null);
                            refreshEvents();

                          } catch (err) {
                            console.error("Failed to delete event", err);
                          }
                        }}
                        className="flex-1 text-[10px] font-bold uppercase tracking-wider"
                      >
                        Hold to Delete
                      </HoldButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EVENT FULL OVERLAY FORM */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 select-none">
          <div
            className="bg-[var(--nb-surface)] text-[var(--nb-content)] rounded-xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
            style={{ border: '2.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            {/* Header */}
            <div
              className="p-3.5 sm:p-4 flex justify-between items-center flex-shrink-0 bg-[var(--nb-surface-accent)] border-b-2 border-[var(--nb-ink)]"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-300 text-black border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="nb-headline text-sm sm:text-base truncate">
                      {editingEventId ? 'Edit Department Event' : 'Create New Department Event'}
                    </h3>
                    <span className="bg-amber-300 text-black border border-[var(--nb-ink)] text-[9px] font-mono font-black px-1.5 py-0.5 rounded shadow-[1px_1px_0_var(--nb-ink)] tracking-wider shrink-0">
                      HOSTING
                    </span>
                  </div>
                  <p className="text-[9.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--nb-secondary)] truncate">
                    SCHEDULE &amp; CONFIGURE WORKSHOP, HACKATHON, OR SEMINAR
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingEventId(null);
                }}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0 ml-2"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleCreateEvent} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 sm:p-4.5 space-y-3.5 sm:space-y-4">
                
                {/* 1. BASIC INFORMATION */}
                <div
                  className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-3.5 sm:p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 border-b border-[var(--nb-divider)] pb-2">
                    <FileText className="w-3.5 h-3.5 text-[var(--nb-accent)] stroke-[2.5]" />
                    <span className="text-[11px] font-black font-mono text-[var(--nb-content)] uppercase tracking-wider">
                      1. BASIC INFORMATION
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. AI Builder Arena Hackathon"
                      className="nb-input !text-xs !min-h-[38px] !py-2 !px-3 font-semibold"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider">
                        Category *
                      </label>
                      <span className="text-[9px] font-mono font-bold text-[var(--nb-secondary)]">
                        Quick Select
                      </span>
                    </div>

                    {/* Quick Select Category Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(['Workshops', 'Hackathons', 'Seminars', 'Cultural Events', 'Club Meetings'] as const).map((cat) => {
                        const isSelected = eventCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setEventCategory(cat)}
                            className={`text-[9.5px] font-mono font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--nb-blue)] text-white border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                                : 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)] hover:bg-[var(--nb-surface)] border-[1.5px] border-[var(--nb-ink)]'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    <select
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value as any)}
                      className="nb-input !text-xs !min-h-[38px] !py-2 !px-2.5 cursor-pointer font-bold"
                    >
                      <option value="Workshops">Workshops (Hands-on Technical Labs)</option>
                      <option value="Hackathons">Hackathons (Coding &amp; Innovation)</option>
                      <option value="Seminars">Seminars (Expert Talks &amp; Keynotes)</option>
                      <option value="Cultural Events">Cultural Events (Celebrations &amp; Arts)</option>
                      <option value="Club Meetings">Club Meetings (Internal &amp; Assemblies)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                      Venue Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      placeholder="e.g. Seminar Hall-1 or AI Research Lab"
                      className="nb-input !text-xs !min-h-[38px] !py-2 !px-3 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                      Event Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Provide details about agenda, incentives, topics covered, eligibility..."
                      className="nb-input !text-xs !py-2 !px-3 resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* 2. SCHEDULE, TIMING & CAPACITY */}
                <div
                  className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-3.5 sm:p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 border-b border-[var(--nb-divider)] pb-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--nb-accent)] stroke-[2.5]" />
                    <span className="text-[11px] font-black font-mono text-[var(--nb-content)] uppercase tracking-wider">
                      2. SCHEDULE, TIMING &amp; CAPACITY
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                        Event Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="nb-input !text-xs !min-h-[38px] !py-2 !px-2.5 cursor-pointer font-mono font-bold w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                        Max Participant Capacity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={eventMaxParticipants}
                        onChange={(e) => setEventMaxParticipants(Number(e.target.value))}
                        className="nb-input !text-xs !min-h-[38px] !py-2 !px-3 font-mono font-bold w-full"
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider">
                          Start Time *
                        </label>
                        {eventStartTime && (
                          <span className="text-[10px] font-mono font-bold text-[var(--nb-accent)]">
                            {eventStartTime}
                          </span>
                        )}
                      </div>
                      <input
                        type="time"
                        required
                        value={toTime24(eventStartTime)}
                        onChange={(e) => {
                          const new12 = toTime12(e.target.value);
                          setEventStartTime(new12);
                          if (eventEndTime) {
                            const calculatedDur = calcDurationFromTimes(new12, eventEndTime);
                            if (calculatedDur) setEventDuration(calculatedDur);
                          }
                        }}
                        className="nb-input !text-xs !min-h-[38px] !py-2 !px-2.5 cursor-pointer font-mono font-bold w-full"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider">
                          End Time *
                        </label>
                        {eventEndTime && eventEndTime !== 'N/A' && (
                          <span className="text-[10px] font-mono font-bold text-[var(--nb-accent)]">
                            {eventEndTime}
                          </span>
                        )}
                      </div>
                      <input
                        type="time"
                        required
                        value={toTime24(eventEndTime)}
                        onChange={(e) => {
                          const newEnd12 = toTime12(e.target.value);
                          setEventEndTime(newEnd12);
                          if (eventStartTime && newEnd12) {
                            const calculatedDur = calcDurationFromTimes(eventStartTime, newEnd12);
                            if (calculatedDur) setEventDuration(calculatedDur);
                          }
                        }}
                        className="nb-input !text-xs !min-h-[38px] !py-2 !px-2.5 cursor-pointer font-mono font-bold w-full"
                      />
                    </div>
                  </div>

                  {/* Presets and duration pill */}
                  <div className="pt-2 border-t border-[var(--nb-divider)] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                      <span className="text-[9.5px] font-mono font-bold text-[var(--nb-secondary)]">Presets:</span>
                      {['+1 Hr', '+2 Hrs', '+3 Hrs', '+6 Hrs'].map((chip) => {
                        const durString = chip === '+1 Hr' ? '1 Hour' : chip === '+2 Hrs' ? '2 Hours' : chip === '+3 Hrs' ? '3 Hours' : '6 Hours';
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              if (eventStartTime) {
                                const calculatedEnd = calcEndTime(eventStartTime, durString);
                                if (calculatedEnd) {
                                  setEventEndTime(calculatedEnd);
                                  setEventDuration(durString);
                                }
                              }
                            }}
                            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                              eventDuration === durString
                                ? 'bg-amber-300 text-black border-[1.5px] border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]'
                                : 'bg-[var(--nb-surface-accent)] border-[1.5px] border-[var(--nb-ink)] text-[var(--nb-content)] hover:bg-[var(--nb-surface)]'
                            }`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                    {eventDuration && (
                      <span className="text-[9.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                        Duration: {eventDuration}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. PARTICIPATION FORMAT */}
                <div
                  className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-3.5 sm:p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded-md bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]">
                        <Users className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-black font-mono text-[var(--nb-content)] uppercase tracking-wider">
                          3. PARTICIPATION FORMAT
                        </span>
                        <span className="text-[10px] text-[var(--nb-secondary)] font-medium">
                          Students register as a team or squad
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={eventIsTeamBased}
                      onChange={(e) => setEventIsTeamBased(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-[var(--nb-ink)] text-[var(--nb-accent)] cursor-pointer focus:ring-0 accent-[var(--nb-accent)]"
                    />
                  </div>
                  {eventIsTeamBased && (
                    <div className="pt-2.5 border-t border-[var(--nb-divider)] animate-fade-in">
                      <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                        MAX TEAM SIZE (2 - 10 MEMBERS)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        value={eventMaxTeamSize}
                        onChange={(e) => setEventMaxTeamSize(Number(e.target.value))}
                        className="nb-input !text-xs !min-h-[38px] !py-2 !px-3 font-mono font-bold"
                      />
                    </div>
                  )}
                </div>

                {/* 4. EVENT COORDINATORS */}
                <div
                  className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-3.5 sm:p-4 space-y-3.5"
                >
                  <div className="flex items-center justify-between border-b border-[var(--nb-divider)] pb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[var(--nb-accent)] stroke-[2.5]" />
                      <span className="text-[11px] font-black font-mono text-[var(--nb-content)] uppercase tracking-wider">
                        4. EVENT COORDINATORS
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-[var(--nb-secondary)] font-bold px-2 py-0.5 rounded bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]">
                      {allUsers.filter(u => u.role === 'coordinator' || u.role === 'associate').length} Coordinators in DB
                    </span>
                  </div>

                  {/* Faculty Coordinator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider">
                        Faculty Coordinator
                      </label>
                      <span className="text-[9px] text-[var(--nb-secondary)] font-mono font-bold">
                        Quick Pick
                      </span>
                    </div>

                    <input
                      type="text"
                      value={eventFaculty}
                      onChange={(e) => setEventFaculty(e.target.value)}
                      placeholder="Dr. XYZ Prasad"
                      className="nb-input !text-xs !min-h-[38px] !py-2 !px-3 font-bold"
                    />

                    {/* Quick Faculty Picks */}
                    <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                      <span className="text-[9px] text-[var(--nb-secondary)] font-mono font-bold mr-0.5">Leads:</span>
                      {allUsers.filter(u => u.role === 'faculty').length > 0 ? (
                        allUsers.filter(u => u.role === 'faculty').map(f => (
                          <button
                            key={f.uid}
                            type="button"
                            onClick={() => selectFacultyCoordinator(f.name)}
                            className={`text-[9.5px] px-2 py-0.5 rounded border transition-all cursor-pointer font-bold inline-flex items-center gap-1 ${
                              eventFaculty.toLowerCase() === f.name.toLowerCase()
                                ? 'bg-indigo-600/20 text-indigo-900 border-indigo-500/40 shadow-[1.5px_1.5px_0_var(--nb-ink)]'
                                : 'bg-[var(--nb-surface)] hover:bg-[var(--nb-surface-accent)] text-[var(--nb-content)] border-[1.5px] border-[var(--nb-ink)]'
                            }`}
                          >
                            <GraduationCap className="w-3 h-3 text-indigo-600" />
                            <span>{f.name}</span>
                          </button>
                        ))
                      ) : (
                        ['Dr. XYZ Prasad', 'Prof. A. Sharma', 'Dr. V. Rao'].map(fac => (
                          <button
                            key={fac}
                            type="button"
                            onClick={() => selectFacultyCoordinator(fac)}
                            className={`text-[9.5px] px-2 py-0.5 rounded border transition-all cursor-pointer font-bold inline-flex items-center gap-1 ${
                              eventFaculty.toLowerCase() === fac.toLowerCase()
                                ? 'bg-indigo-600/20 text-indigo-900 border-indigo-500/40 shadow-[1.5px_1.5px_0_var(--nb-ink)]'
                                : 'bg-[var(--nb-surface)] hover:bg-[var(--nb-surface-accent)] text-[var(--nb-content)] border-[1.5px] border-[var(--nb-ink)]'
                            }`}
                          >
                            <GraduationCap className="w-3 h-3 text-indigo-600" />
                            <span>{fac}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Student Coordinators */}
                  <div className="space-y-1.5 pt-1 border-t border-[var(--nb-divider)]">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider">
                        Student Coordinators
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCoordPickerModal(true)}
                        className="inline-flex items-center gap-1 text-[9.5px] font-bold font-mono text-white bg-[var(--nb-purple)] hover:opacity-90 border-[1.5px] border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] px-2 py-0.5 rounded transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                        <span>Fetch from DB</span>
                      </button>
                    </div>

                    {/* Chips for selected student coordinators */}
                    {selectedCoordNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5 p-2 rounded-lg bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]">
                        {selectedCoordNames.map(name => {
                          const matchedUser = allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
                          return (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1.5 bg-[var(--nb-surface)] border-[1.5px] border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)] text-[var(--nb-content)] px-2 py-0.5 rounded text-[10px] font-bold"
                            >
                              <span>{name}</span>
                              {matchedUser?.rollNumber && (
                                <span className="text-[8.5px] font-mono text-[var(--nb-secondary)]">({matchedUser.rollNumber})</span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeCoordinatorName(name)}
                                className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer font-black"
                                title="Remove coordinator"
                              >
                                <X className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <input
                      type="text"
                      value={eventStudent}
                      onChange={(e) => setEventStudent(e.target.value)}
                      placeholder="e.g. Sameer, John (or click Fetch from DB)"
                      className="nb-input !text-xs !min-h-[38px] !py-2 !px-3 font-bold"
                    />

                    {/* Quick DB Coordinator pills */}
                    <div className="pt-1">
                      <div className="text-[9px] text-[var(--nb-secondary)] font-mono font-bold mb-1">
                        Quick Add Coordinators:
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {allUsers
                          .filter(u => u.role === 'coordinator' || u.role === 'associate')
                          .map(c => {
                            const isSelected = selectedCoordNames.some(n => n.toLowerCase() === c.name.toLowerCase());
                            return (
                              <button
                                key={c.uid}
                                type="button"
                                onClick={() => toggleCoordinatorName(c.name)}
                                className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer font-bold ${
                                  isSelected
                                    ? 'bg-[var(--nb-green)] text-neutral-900 border-[1.5px] border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]'
                                    : 'bg-[var(--nb-surface)] hover:bg-[var(--nb-surface-accent)] text-[var(--nb-content)] border-[1.5px] border-[var(--nb-ink)]'
                                }`}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{c.name}</span>
                                {c.rollNumber && (
                                  <span className="font-mono text-[8px] opacity-75">({c.rollNumber})</span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. POSTER & VISUALS */}
                <div
                  className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-3.5 sm:p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 border-b border-[var(--nb-divider)] pb-2">
                    <ImageIcon className="w-3.5 h-3.5 text-[var(--nb-accent)] stroke-[2.5]" />
                    <span className="text-[11px] font-black font-mono text-[var(--nb-content)] uppercase tracking-wider">
                      5. POSTER &amp; VISUALS
                    </span>
                  </div>

                  <div>
                    <ImageUploader
                      maxFiles={5}
                      onUploadSuccess={(urls) => {
                        setEventImages(urls);
                        if (urls.length > 0) {
                          if (!eventPoster) setEventPoster(urls[0]);
                          const img = new Image();
                          img.onload = () => {
                            const orient = img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape';
                            setPosterOrientations(prev => ({ ...prev, [urls[0]]: orient }));
                          };
                          img.src = urls[0];
                        }
                      }}
                      buttonLabel="UPLOAD EVENT PHOTOS"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                        Poster Orientation
                      </label>
                      <select
                        value={eventPosterOrientation}
                        onChange={(e) => setEventPosterOrientation(e.target.value as any)}
                        className="nb-input !text-xs !min-h-[38px] !py-2 !px-2.5 cursor-pointer font-bold w-full"
                      >
                        <option value="auto">Auto-detect from image ratio</option>
                        <option value="portrait">Portrait (Tall)</option>
                        <option value="landscape">Landscape (Wide)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                        Direct Poster URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={eventPoster}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEventPoster(val);
                          if (val) {
                            const img = new Image();
                            img.onload = () => {
                              const orient = img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape';
                              setPosterOrientations(prev => ({ ...prev, [val]: orient }));
                            };
                            img.src = val;
                          }
                        }}
                        placeholder="https://..."
                        className="nb-input !text-xs !min-h-[38px] !py-2 !px-3 truncate w-full"
                      />
                    </div>
                  </div>

                  {eventPoster && (
                    <div className="flex items-center gap-3 p-2 bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)] rounded-lg">
                      <img
                        src={eventPoster}
                        alt="Poster preview"
                        className="w-14 h-14 object-cover rounded border border-[var(--nb-ink)]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono font-bold block truncate">
                          {eventPoster}
                        </span>
                        <span className="text-[9px] text-[var(--nb-secondary)] font-mono">
                          Current Poster Thumbnail
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEventPoster('')}
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 border border-red-500/40 rounded hover:bg-red-500/10 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. GUIDELINES & REQUIREMENTS */}
                <div
                  className="bg-[var(--nb-surface)] rounded-xl border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-3.5 sm:p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 border-b border-[var(--nb-divider)] pb-2">
                    <Tag className="w-3.5 h-3.5 text-[var(--nb-accent)] stroke-[2.5]" />
                    <span className="text-[11px] font-black font-mono text-[var(--nb-content)] uppercase tracking-wider">
                      6. GUIDELINES &amp; REQUIREMENTS
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                      Event Rules
                    </label>
                    <textarea
                      rows={2}
                      value={eventRules}
                      onChange={(e) => setEventRules(e.target.value)}
                      placeholder={`1. Open only to registered ${activeTenant?.shortCode || 'department'} students\n2. Max team size 4...`}
                      className="nb-input !text-xs !py-2 !px-3 resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-[var(--nb-content)] uppercase tracking-wider mb-1">
                      Requirements / Prerequisites
                    </label>
                    <input
                      type="text"
                      value={eventReqs}
                      onChange={(e) => setEventReqs(e.target.value)}
                      placeholder="e.g. Laptops required, GitHub accounts, VS Code"
                      className="nb-input !text-xs !min-h-[38px] !py-2 !px-3"
                    />
                  </div>
                </div>

              </div>

              {/* DOCKED STICKY FOOTER */}
              <div
                className="p-3 sm:p-4 bg-[var(--nb-surface-accent)] border-t-2 border-[var(--nb-ink)] flex items-center justify-end gap-3 flex-shrink-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingEventId(null);
                  }}
                  className="nb-btn-ghost font-bold text-xs uppercase tracking-wider rounded-md py-2.5 px-5 cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-[var(--nb-blue)] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-md py-2.5 px-6 cursor-pointer border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingEventId ? 'SAVE CHANGES' : 'PUBLISH & NOTIFY'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic DB Coordinator Picker Modal */}
      {showCoordPickerModal && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-3 sm:p-4 select-none">
          <div
            className="bg-[var(--nb-surface)] text-[var(--nb-content)] rounded-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            <div
              className="p-4 flex items-center justify-between bg-[var(--nb-surface-accent)] shrink-0"
              style={{ borderBottom: '2px solid var(--nb-ink)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded bg-[var(--nb-ink)] text-[var(--nb-bg)] flex items-center justify-center"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <Users className="w-4 h-4 text-[var(--nb-accent)]" />
                </div>
                <div>
                  <h3 className="nb-headline text-base">Fetch Coordinators from Database</h3>
                  <p className="nb-label text-[10px] text-[var(--nb-secondary)]">Dynamically assign registered students and coordinators</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCoordPickerModal(false)}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search by student name, roll number, or department..."
                  value={coordSearchQuery}
                  onChange={(e) => setCoordSearchQuery(e.target.value)}
                  className="w-full bg-background border border-divider text-xs text-content rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Role Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {(['all', 'coordinator', 'associate', 'student'] as const).map((r) => {
                  const count = r === 'all'
                    ? allUsers.filter(u => u.uid !== 'admin_master').length
                    : allUsers.filter(u => u.role === r).length;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCoordFilterRole(r)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer capitalize shrink-0 ${coordFilterRole === r
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-background text-secondary border-divider hover:text-content'
                        }`}
                    >
                      {r === 'all' ? 'All in DB' : `${r}s`} ({count})
                    </button>
                  );
                })}
              </div>

              {/* User Results List */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto divide-y divide-divider/40">
                {allUsers
                  .filter(u => {
                    if (u.uid === 'admin_master') return false;
                    if (coordFilterRole !== 'all' && u.role !== coordFilterRole) return false;
                    const q = coordSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (u.name || '').toLowerCase().includes(q) ||
                      (u.rollNumber || '').toLowerCase().includes(q) ||
                      (u.department || '').toLowerCase().includes(q);
                  })
                  .map((u) => {
                    const isSelected = selectedCoordNames.some(n => n.toLowerCase() === u.name.toLowerCase());
                    return (
                      <div
                        key={u.uid}
                        className="pt-2 pb-2 flex items-center justify-between gap-3 hover:bg-surface-accent/40 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-surface-accent overflow-hidden shrink-0 border border-divider">
                            <img
                              src={u.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${u.rollNumber || u.uid}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-content text-xs truncate">{u.name}</span>
                              <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                                {u.role}
                              </span>
                            </div>
                            <div className="text-[10px] text-secondary font-mono truncate">
                              {u.rollNumber || 'N/A'} • {u.department || activeTenant?.shortCode || activeTenant?.name || 'Department'} • {u.year || '3rd Year'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCoordinatorName(u.name)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-surface hover:bg-indigo-600/15 text-indigo-300 border-divider hover:border-indigo-500/40'
                            }`}
                        >
                          {isSelected ? '✓ Assigned' : '+ Assign'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer Summary & Done Button */}
            <div className="p-3 border-t border-divider/70 bg-surface-accent/30 flex items-center justify-between shrink-0">
              <div className="text-[10px] text-secondary font-mono">
                <strong className="text-content">{selectedCoordNames.length}</strong> coordinator(s) selected
              </div>
              <button
                type="button"
                onClick={() => setShowCoordPickerModal(false)}
                className="nb-btn font-bold text-xs uppercase tracking-wider px-4 py-2 rounded cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Ticket Modal */}
      {showTicketModal && userRegistration && selectedEvent && (
        <EventTicketModal
          event={selectedEvent}
          registration={userRegistration}
          user={user}
          onClose={() => setShowTicketModal(false)}
          branding={branding}
        />
      )}
    </div>
  );
}
