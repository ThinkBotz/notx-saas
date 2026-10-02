import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  HelpCircle, 
  ShieldCheck, 
  MapPin, 
  Edit3, 
  Clock, 
  Inbox, 
  AlertCircle,
  ChevronRight,
  ChevronDown,
  User,
  Shield,
  CornerDownRight,
  Sparkles,
  Ticket
} from 'lucide-react';
import { UserProfile, SupportInfo, DEFAULT_SUPPORT_INFO, SupportTicket, TicketCategory, TicketStatus } from '../types';
import EditSupportBoxModal from './EditSupportBoxModal';
import { createSupportTicket, subscribeToUserTickets, addTicketReply, markTicketRead } from '../firebase';

interface ContactViewProps {
  user: UserProfile;
  supportInfo?: SupportInfo;
  onSupportInfoUpdated?: (info: SupportInfo) => void;
}

export default function ContactView({ user, supportInfo, onSupportInfoUpdated }: ContactViewProps) {
  const [activeTab, setActiveTab] = useState<'submit' | 'my-tickets'>('submit');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<TicketCategory>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Tickets state
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localSupportInfo, setLocalSupportInfo] = useState<SupportInfo>(supportInfo || DEFAULT_SUPPORT_INFO);

  useEffect(() => {
    if (supportInfo) {
      setLocalSupportInfo(supportInfo);
    }
  }, [supportInfo]);

  // Subscribe to real-time tickets for this user
  useEffect(() => {
    if (!user.uid) return;
    const unsub = subscribeToUserTickets(user.uid, (tickets) => {
      setMyTickets(tickets);
    });
    return () => unsub();
  }, [user.uid]);

  // Selected ticket calculation
  const activeTicket = myTickets.find(t => t.id === selectedTicketId) || null;

  // When activeTicket is opened, mark as read by user if unread
  useEffect(() => {
    if (activeTicket && activeTicket.unreadByUser) {
      markTicketRead(activeTicket.id, 'user').catch(err => {
        console.warn('Failed to mark ticket read for user:', err);
      });
    }
  }, [activeTicket?.id, activeTicket?.unreadByUser]);

  const activeInfo = localSupportInfo || DEFAULT_SUPPORT_INFO;

  // Unread count
  const unreadCount = myTickets.filter(t => t.unreadByUser).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const ticket = await createSupportTicket({
        tenantId: user.tenantId || 'cse-aiml',
        tenantName: activeInfo.title,
        userId: user.uid,
        userName: user.name || user.rollNumber || 'Anonymous Student',
        userEmail: user.email,
        userRoll: user.rollNumber,
        category,
        subject: subject.trim(),
        message: message.trim()
      });

      setCreatedTicket(ticket);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error('Failed to create support ticket:', err);
      setErrorMessage(err.message || 'Failed to submit ticket. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await addTicketReply(
        activeTicket.id,
        {
          senderId: user.uid,
          senderName: user.name || user.rollNumber || 'Student',
          senderEmail: user.email,
          senderRole: user.role || 'student',
          message: replyText.trim()
        },
        false // false = user sender
      );
      setReplyText('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSupportSaved = (updated: SupportInfo) => {
    setLocalSupportInfo(updated);
    if (onSupportInfoUpdated) {
      onSupportInfoUpdated(updated);
    }
  };

  const isAdmin = user.role === 'admin';

  // Filtered tickets
  const filteredTickets = myTickets.filter(t => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return t.status === 'open' || t.status === 'in_progress';
    if (statusFilter === 'resolved') return t.status === 'resolved' || t.status === 'closed';
    return true;
  });

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-600/30">
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-600/30">
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30">
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border border-neutral-600/30">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-36 sm:pb-32 space-y-5 bg-[var(--nb-bg)] text-[var(--nb-content)]">
      
      {/* Header */}
      <div 
        className="p-4 rounded-lg bg-[var(--nb-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
      >
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--nb-surface-accent)] text-[var(--nb-content)] border border-[var(--nb-ink)] mb-2">
            <ShieldCheck className="w-3 h-3 text-[var(--nb-accent)]" />
            <span>{activeInfo.badge || 'OFFICIAL CHANNELS'}</span>
          </div>
          <h3 className="nb-headline text-2xl leading-none">{activeInfo.title}</h3>
          <p className="nb-label text-xs text-[var(--nb-secondary)] mt-1">{activeInfo.subtitle}</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="nb-btn-ghost text-xs !min-h-[38px] py-1.5 px-3 self-start sm:self-auto cursor-pointer"
            title="Edit dynamic support box fields"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Support Box</span>
          </button>
        )}
      </div>

      {/* Primary Contact Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div 
          className="bg-[var(--nb-surface)] p-4 rounded-lg flex items-center gap-3.5"
          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
        >
          <div 
            className="w-11 h-11 rounded-md bg-[var(--nb-surface-accent)] flex items-center justify-center text-[var(--nb-accent)] flex-shrink-0"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="nb-headline text-xs tracking-normal">Department Email</h4>
            <a 
              href={`mailto:${activeInfo.email}`} 
              className="text-xs font-mono font-bold text-[var(--nb-accent)] block hover:underline truncate mt-0.5"
            >
              {activeInfo.email}
            </a>
          </div>
        </div>

        <div 
          className="bg-[var(--nb-surface)] p-4 rounded-lg flex items-center gap-3.5"
          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
        >
          <div 
            className="w-11 h-11 rounded-md bg-[var(--nb-surface-accent)] flex items-center justify-center text-[var(--nb-accent)] flex-shrink-0"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <Phone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="nb-headline text-xs tracking-normal">Hotline Contact</h4>
            <a 
              href={`tel:${activeInfo.phone.replace(/\s+/g, '')}`} 
              className="text-xs font-mono font-bold text-[var(--nb-accent)] block hover:underline truncate mt-0.5"
            >
              {activeInfo.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Department Location & Timings Details */}
      {(activeInfo.location || activeInfo.timing) && (
        <div 
          className="bg-[var(--nb-surface)] p-3.5 rounded-lg flex items-center gap-3"
          style={{ border: '1.5px solid var(--nb-ink)' }}
        >
          <div 
            className="w-9 h-9 rounded bg-[var(--nb-surface-accent)] flex items-center justify-center text-[var(--nb-content)] flex-shrink-0"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <MapPin className="w-4 h-4 text-[var(--nb-accent)]" />
          </div>
          <div className="text-xs leading-relaxed font-sans min-w-0">
            {activeInfo.location && (
              <span className="font-bold text-[var(--nb-content)] block sm:inline">{activeInfo.location}</span>
            )}
            {activeInfo.timing && (
              <span className="text-[var(--nb-secondary)] sm:ml-2 flex sm:inline-flex items-center gap-1 font-mono text-[11px] mt-0.5 sm:mt-0">
                <Clock className="w-3 h-3 text-[var(--nb-accent)] inline" />
                {activeInfo.timing}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── INTERACTIVE SUPPORT SYSTEM (Tabs: Submit Query / My Tickets) ── */}
      <div 
        className="bg-[var(--nb-surface)] rounded-lg overflow-hidden space-y-0"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b-2 border-[var(--nb-ink)] p-2.5 sm:p-3 bg-[var(--nb-surface-accent)] gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('submit');
                setCreatedTicket(null);
              }}
              className={`py-1.5 px-3 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'submit'
                  ? 'bg-[var(--nb-accent)] text-white border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                  : 'bg-[var(--nb-surface)] border border-[var(--nb-ink)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)]'
              }`}
            >
              <Send className="w-3 h-3" />
              <span>Submit Query</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-tickets')}
              className={`py-1.5 px-3 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 relative ${
                activeTab === 'my-tickets'
                  ? 'bg-[var(--nb-accent)] text-white border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                  : 'bg-[var(--nb-surface)] border border-[var(--nb-ink)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)]'
              }`}
            >
              <Inbox className="w-3 h-3" />
              <span>My Tickets & Responses</span>
              {myTickets.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                  activeTab === 'my-tickets' ? 'bg-white text-[var(--nb-ink)]' : 'bg-[var(--nb-accent)] text-white'
                }`}>
                  {myTickets.length}
                </span>
              )}
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </div>

          <span className="nb-tag text-[10px] font-mono truncate max-w-[220px]">
            {user.name} ({user.rollNumber || user.email})
          </span>
        </div>

        {/* ── TAB 1: SUBMIT NEW TICKET ── */}
        {activeTab === 'submit' && (
          <div className="p-4 sm:p-5 space-y-4">
            {createdTicket ? (
              <div 
                className="p-6 rounded-lg text-center space-y-3 bg-[var(--nb-surface-accent)]"
                style={{ border: '2px solid var(--nb-ink)' }}
              >
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
                <div>
                  <span className="inline-block px-2.5 py-1 rounded text-xs font-mono font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-600/40 mb-2">
                    TICKET RAISED: #{createdTicket.readableId || createdTicket.id}
                  </span>
                  <h5 className="nb-headline text-lg">Query Logged in Support Registry</h5>
                  <p className="text-xs text-[var(--nb-secondary)] max-w-md mx-auto leading-relaxed font-sans mt-1">
                    Your inquiry has been logged with status <strong>OPEN</strong>. Department administrators have been notified. You can check replies and converse in real-time in the "My Tickets" section.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(createdTicket.id);
                      setActiveTab('my-tickets');
                      setCreatedTicket(null);
                    }}
                    className="nb-btn text-xs py-2 px-4 cursor-pointer flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Conversation Thread</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreatedTicket(null)}
                    className="nb-btn-ghost text-xs py-2 px-4 cursor-pointer"
                  >
                    <span>Submit Another Query</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {errorMessage && (
                  <div className="p-3 rounded-md bg-rose-500/15 border-2 border-rose-500 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Query Category */}
                <div>
                  <label className="nb-label text-[10px] block mb-1.5">Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['General', 'Academics', 'Events', 'Grievance'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`py-2 px-3 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          category === cat
                            ? 'bg-[var(--nb-accent)] text-white border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]'
                            : 'bg-[var(--nb-surface-accent)] border-[1.5px] border-[var(--nb-ink)] text-[var(--nb-content)] hover:bg-[var(--nb-surface)]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="nb-label text-[10px] block mb-1">Subject / Query Topic *</label>
                  <input 
                    type="text" 
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Permission request for external ML hackathon"
                    className="nb-input text-xs"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="nb-label text-[10px] block mb-1">Detailed Message *</label>
                  <textarea 
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your query, section details, and any relevant context..."
                    className="nb-input text-xs resize-none leading-relaxed"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="nb-btn w-full cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Raising Ticket...' : 'Transmit Query & Raise Ticket'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── TAB 2: MY TICKETS & TWO-WAY CONVERSATION THREAD ── */}
        {activeTab === 'my-tickets' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Status Filter pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--nb-ink)]/15 pb-3">
              <div className="flex items-center gap-1.5">
                {(['all', 'open', 'resolved'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)] font-black'
                        : 'bg-[var(--nb-surface-accent)] text-[var(--nb-secondary)] hover:text-[var(--nb-content)]'
                    }`}
                  >
                    {filter === 'all' ? `All (${myTickets.length})` : filter}
                  </button>
                ))}
              </div>

              <span className="text-[10px] font-mono text-[var(--nb-secondary)]">
                {filteredTickets.length} ticket{filteredTickets.length === 1 ? '' : 's'} found
              </span>
            </div>

            {/* List or Thread View */}
            {filteredTickets.length === 0 ? (
              <div className="py-12 text-center space-y-2 bg-[var(--nb-surface-accent)] rounded-lg border border-[var(--nb-ink)]/20">
                <Ticket className="w-8 h-8 mx-auto text-[var(--nb-secondary)] opacity-60" />
                <p className="text-xs font-bold text-[var(--nb-content)]">No support queries found</p>
                <p className="text-[11px] text-[var(--nb-secondary)] max-w-sm mx-auto">
                  Have an academic question, permission request, or event inquiry? Switch to "Submit Query" to raise a ticket.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  className="nb-btn text-xs py-1.5 px-3 mt-2 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Submit New Query</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((t) => {
                  const isExpanded = selectedTicketId === t.id;
                  const replyCount = t.replies?.length || 0;

                  return (
                    <div 
                      key={t.id}
                      className={`rounded-lg transition-all border-2 border-[var(--nb-ink)] ${
                        isExpanded ? 'bg-[var(--nb-surface)] shadow-[3px_3px_0_var(--nb-ink)]' : 'bg-[var(--nb-surface-accent)] hover:bg-[var(--nb-surface)]'
                      }`}
                    >
                      {/* Ticket Summary Accordion Header */}
                      <div 
                        onClick={() => setSelectedTicketId(isExpanded ? null : t.id)}
                        className="p-3.5 flex items-start sm:items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-[var(--nb-accent)]">
                              #{t.readableId || t.id.slice(0, 8)}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[var(--nb-surface)] border border-[var(--nb-ink)]/30 text-[var(--nb-secondary)]">
                              {t.category}
                            </span>
                            {getStatusBadge(t.status)}
                            {t.unreadByUser && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase bg-rose-500 text-white animate-pulse">
                                New Reply!
                              </span>
                            )}
                          </div>

                          <h5 className="nb-headline text-sm truncate">{t.subject}</h5>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--nb-secondary)]">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(t.createdAt).toLocaleDateString()} at {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                          </div>
                        </div>

                        <div className="shrink-0 pt-1 sm:pt-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[var(--nb-accent)]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[var(--nb-secondary)]" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Conversation Thread */}
                      {isExpanded && (
                        <div className="border-t-2 border-[var(--nb-ink)] p-3.5 sm:p-4 space-y-4 bg-[var(--nb-surface)]">
                          {/* Original Query Box */}
                          <div className="p-3 rounded-md bg-[var(--nb-surface-accent)] border border-[var(--nb-ink)]/30 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--nb-secondary)]">
                              <span className="font-bold text-[var(--nb-content)] flex items-center gap-1.5">
                                <User className="w-3 h-3 text-[var(--nb-accent)]" />
                                {t.userName} ({t.userRoll || t.userEmail})
                              </span>
                              <span>{new Date(t.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-[var(--nb-content)] leading-relaxed whitespace-pre-wrap font-sans">
                              {t.message}
                            </p>
                          </div>

                          {/* Chronological Replies */}
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[var(--nb-secondary)] uppercase">
                              <MessageSquare className="w-3 h-3" />
                              <span>Conversation Thread ({replyCount})</span>
                            </div>

                            {replyCount === 0 ? (
                              <div className="p-3 rounded bg-[var(--nb-surface-accent)]/50 border border-dashed border-[var(--nb-ink)]/30 text-center text-xs text-[var(--nb-secondary)]">
                                Awaiting response from department administrators...
                              </div>
                            ) : (
                              t.replies?.map((rep) => {
                                const isStaff = rep.senderRole === 'admin' || rep.senderRole === 'president' || rep.senderRole === 'super_admin' || rep.senderRole === 'associate';
                                return (
                                  <div
                                    key={rep.replyId}
                                    className={`p-3 rounded-lg border leading-relaxed space-y-1.5 ${
                                      isStaff
                                        ? 'bg-[var(--nb-accent)]/10 border-[var(--nb-accent)] shadow-[1px_1px_0_var(--nb-ink)]'
                                        : 'bg-[var(--nb-surface-accent)] border-[var(--nb-ink)]/40 ml-4'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                        {isStaff ? (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase bg-[var(--nb-accent)] text-white">
                                            {rep.senderRole === 'super_admin' ? 'Super Admin' : 'Dept Official'}
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-neutral-300 dark:bg-neutral-700 text-[var(--nb-content)]">
                                            Student
                                          </span>
                                        )}
                                        <span className="font-bold text-[var(--nb-content)]">{rep.senderName}</span>
                                      </div>
                                      <span className="text-[var(--nb-secondary)]">
                                        {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(rep.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[var(--nb-content)] whitespace-pre-wrap font-sans">
                                      {rep.message}
                                    </p>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Reply Input Form */}
                          <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-[var(--nb-ink)]/20">
                            <label className="nb-label text-[10px] block">
                              Reply to Administration:
                            </label>
                            <div className="flex gap-2 items-start">
                              <textarea
                                rows={2}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write your follow-up reply or clarification..."
                                className="nb-input text-xs resize-none flex-1 leading-relaxed"
                              />
                              <button
                                type="submit"
                                disabled={!replyText.trim() || isSendingReply}
                                className="nb-btn text-xs py-2 px-3 shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isSendingReply ? 'Sending...' : 'Send'}</span>
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Additional Help / FAQs note */}
      {activeInfo.urgentHelpText && (
        <div 
          className="bg-[var(--nb-surface)] p-4 rounded-lg flex gap-3.5 items-start"
          style={{ border: '1.5px solid var(--nb-ink)' }}
        >
          <div 
            className="w-8 h-8 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h5 className="nb-headline text-sm">{activeInfo.urgentHelpTitle || "Need Immediate Assistance?"}</h5>
            <p className="text-xs text-[var(--nb-secondary)] mt-1 leading-relaxed font-sans">
              {activeInfo.urgentHelpText}
            </p>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {isAdmin && (
        <EditSupportBoxModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentInfo={activeInfo}
          onSaved={handleSupportSaved}
        />
      )}
    </div>
  );
}
