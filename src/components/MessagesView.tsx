import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Search, Check, CheckCheck, 
  X, Sparkles, Loader2, Plus, MessageCircle,
  AlertCircle, ChevronRight, CornerDownRight, User, Trash2
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { UserProfile, UserInvitation, Tenant } from '../types';
import HoldButton from './HoldButton';
import { 
  getChatRoomId,
  sendChatMessage,
  respondToChatInvite,
  markMessagesAsRead,
  deleteChatRoom,
  deleteChatMessage,
  rtdb
} from '../firebase';

interface MessagesViewProps {
  user: UserProfile;
  allUsers: UserProfile[];
  initialTargetRoll?: string | null;
  onTargetHandled?: () => void;
  activeTenantId?: string;
  activeTenant?: Tenant | null;
}

interface Conversation {
  classmateRoll: string;
  classmateName: string;
  classmateProfile?: UserProfile;
  messages: UserInvitation[];
  lastMessageAt: string;
  typing?: string[];
}

export default function MessagesView({ user, allUsers, initialTargetRoll, onTargetHandled, activeTenantId, activeTenant }: MessagesViewProps) {
  const tenant = activeTenantId || user.tenantId;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedRoll, setSelectedRoll] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New conversation / Search state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Message input state
  const [newMessageText, setNewMessageText] = useState('');
  const [messageType, setMessageType] = useState<'chat' | 'invite'>('chat');
  
  // Form status
  const [actionError, setActionError] = useState('');

  // Delete Chat / Message Modals State
  const [chatToDelete, setChatToDelete] = useState<{ roll: string; name: string } | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; text: string } | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTargetRoll) {
      const roll = initialTargetRoll.toUpperCase();
      const exists = conversations.some(c => c.classmateRoll.toUpperCase() === roll);
      if (!exists) {
        const recipient = allUsers.find(u => (u.rollNumber || u.uid).toUpperCase() === roll);
        if (recipient) {
          const dummyConv: Conversation = {
            classmateRoll: roll,
            classmateName: recipient.name,
            classmateProfile: recipient,
            messages: [],
            lastMessageAt: new Date().toISOString()
          };
          setConversations(prev => [dummyConv, ...prev]);
        }
      }
      setSelectedRoll(roll);
      if (onTargetHandled) onTargetHandled();
    }
  }, [initialTargetRoll, onTargetHandled, conversations, allUsers]);

  // Real-time listener for RTDB chats where user is a participant
  useEffect(() => {
    if (!user || !user.rollNumber) return;
    
    setIsLoading(true);
    const userRollUpper = user.rollNumber.trim().toUpperCase();
    const chatsPath = tenant ? `chats/${tenant.trim().toLowerCase()}` : 'chats';
    const chatsRef = ref(rtdb, chatsPath);

    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const list: Conversation[] = [];
      const val = snapshot.val() || {};

      Object.values(val).forEach((roomAny: any) => {
        const room = roomAny as {
          chatId?: string;
          participants?: string[];
          messages?: Record<string, UserInvitation> | UserInvitation[];
          lastMessageAt?: string;
          typing?: Record<string, boolean> | string[];
        };

        const participants = Array.isArray(room.participants) ? room.participants : [];
        if (!participants.some(p => p.toUpperCase() === userRollUpper)) return;

        // Find classmate's roll number (the other participant)
        const classmateRoll = participants.find(
          roll => roll.toUpperCase() !== userRollUpper
        ) || userRollUpper;

        // Find classmate profile
        const classmateProfile = allUsers.find(
          u => u.rollNumber && u.rollNumber.toUpperCase() === classmateRoll.toUpperCase()
        );

        // Convert messages object/array to array
        let rawMsgs: UserInvitation[] = [];
        if (Array.isArray(room.messages)) {
          rawMsgs = room.messages;
        } else if (room.messages && typeof room.messages === 'object') {
          rawMsgs = Object.values(room.messages);
        }

        const sortedMsgs = rawMsgs.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Find classmate name
        let classmateName = 'Unknown Student';
        if (classmateProfile) {
          classmateName = classmateProfile.name;
        } else {
          const firstOtherMsg = sortedMsgs.find(m => m.senderRoll.toUpperCase() === classmateRoll.toUpperCase());
          const firstMyMsg = sortedMsgs.find(m => m.recipientRoll.toUpperCase() === classmateRoll.toUpperCase());
          if (firstOtherMsg) classmateName = firstOtherMsg.senderName;
          else if (firstMyMsg) classmateName = firstMyMsg.recipientName;
        }

        // Convert typing status
        let typingArr: string[] = [];
        if (Array.isArray(room.typing)) {
          typingArr = room.typing;
        } else if (room.typing && typeof room.typing === 'object') {
          typingArr = Object.keys(room.typing).filter(k => (room.typing as Record<string, boolean>)[k] === true);
        }

        list.push({
          classmateRoll,
          classmateName,
          classmateProfile,
          messages: sortedMsgs,
          lastMessageAt: room.lastMessageAt || (sortedMsgs.length > 0 ? sortedMsgs[sortedMsgs.length - 1].createdAt : new Date(0).toISOString()),
          typing: typingArr
        });
      });

      list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setConversations(list);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, allUsers, tenant]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedRoll, conversations]);

  // Mark messages as read when viewing a chat
  useEffect(() => {
    if (!selectedRoll || !user?.rollNumber) return;
    markMessagesAsRead(user.rollNumber, selectedRoll, tenant);
  }, [selectedRoll, user, tenant]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedRoll || !user || !user.rollNumber) return;

    try {
      const activeConv = conversations.find(c => c.classmateRoll.toUpperCase() === selectedRoll.toUpperCase());
      const recipientUid = activeConv?.classmateProfile?.uid || '';
      const recipientName = activeConv?.classmateName || selectedRoll;

      await sendChatMessage(
        user,
        selectedRoll,
        recipientUid,
        recipientName,
        newMessageText,
        messageType
      );
      setNewMessageText('');
      setMessageType('chat');
    } catch (err) {
      console.error("Failed to send message", err);
      setActionError("Failed to deliver message. Check internet connection.");
    }
  };

  const handleRespondToInvite = async (inviteId: string, status: 'Accepted' | 'Declined') => {
    if (!user || !user.rollNumber || !selectedRoll) return;
    try {
      const chatId = getChatRoomId(user.rollNumber, selectedRoll, tenant);
      await respondToChatInvite(chatId, inviteId, status);
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete || !user.rollNumber) return;
    setIsDeletingChat(true);
    setActionError('');
    try {
      const chatId = getChatRoomId(user.rollNumber, chatToDelete.roll, tenant);
      await deleteChatRoom(chatId);
      
      setConversations(prev => prev.filter(c => c.classmateRoll.toUpperCase() !== chatToDelete.roll.toUpperCase()));
      
      if (selectedRoll?.toUpperCase() === chatToDelete.roll.toUpperCase()) {
        setSelectedRoll(null);
      }
      setChatToDelete(null);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      setActionError("Failed to delete chat. Please try again.");
    } finally {
      setIsDeletingChat(false);
    }
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !user.rollNumber || !selectedRoll) return;
    setIsDeletingMessage(true);
    setActionError('');
    try {
      const chatId = getChatRoomId(user.rollNumber, selectedRoll, tenant);
      await deleteChatMessage(chatId, messageToDelete.id);
      
      setConversations(prev => prev.map(c => {
        if (c.classmateRoll.toUpperCase() === selectedRoll.toUpperCase()) {
          const remaining = c.messages.filter(m => m.invitationId !== messageToDelete.id);
          return {
            ...c,
            messages: remaining,
            lastMessageAt: remaining.length > 0 ? remaining[remaining.length - 1].createdAt : c.lastMessageAt
          };
        }
        return c;
      }));
      
      setMessageToDelete(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
      setActionError("Failed to delete message. Please try again.");
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handleStartNewChat = (recipient: UserProfile) => {
    const roll = (recipient.rollNumber || recipient.uid).toUpperCase();
    
    const exists = conversations.some(c => c.classmateRoll.toUpperCase() === roll);
    if (!exists) {
      const dummyConv: Conversation = {
        classmateRoll: roll,
        classmateName: recipient.name,
        classmateProfile: recipient,
        messages: [],
        lastMessageAt: new Date().toISOString()
      };
      setConversations(prev => [dummyConv, ...prev]);
    }
    
    setSelectedRoll(roll);
    setShowNewChatModal(false);
    setSearchQuery('');
  };

  const activeConversation = conversations.find(
    c => c.classmateRoll.toUpperCase() === (selectedRoll || '').toUpperCase()
  );

  const filteredStudentsForChat = allUsers.filter(u => {
    if (u.uid === user.uid) return false;
    if (!u.rollNumber) return false;
    
    const term = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.rollNumber.toLowerCase().includes(term) ||
      (u.department || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-grow flex flex-col md:flex-row min-h-0 bg-[var(--nb-bg)] text-[var(--nb-content)] overflow-hidden">
      {/* LEFT COLUMN: Active Chats List */}
      <div 
        className={`w-full md:w-80 lg:w-96 flex-col flex-shrink-0 bg-[var(--nb-surface)] h-full ${selectedRoll ? 'hidden md:flex' : 'flex'}`}
        style={{ borderRight: '2px solid var(--nb-ink)' }}
      >
        {/* Chat List Header */}
        <div 
          className="p-3.5 flex justify-between items-center bg-[var(--nb-surface-accent)]"
          style={{ borderBottom: '2px solid var(--nb-ink)' }}
        >
          <div>
            <h3 className="nb-headline text-base flex items-center gap-1.5 leading-none">
              <MessageCircle className="w-4 h-4 text-[var(--nb-accent)]" />
              Classmate Chats
            </h3>
            <p className="nb-label text-[10px] text-[var(--nb-secondary)] mt-0.5">
              Direct Peer Network
            </p>
          </div>
          
          <button
            onClick={() => {
              setShowNewChatModal(true);
              setActionError('');
            }}
            className="nb-btn-icon w-8 h-8 rounded cursor-pointer"
            title="Start New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search for Chat locally */}
        <div className="p-3 border-b border-[var(--nb-divider)] bg-[var(--nb-surface)]">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="nb-input !min-h-[38px] text-xs text-[var(--nb-secondary)] flex items-center gap-2 text-left cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[var(--nb-tertiary)]" />
            <span>Search Roll Number or Name...</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto pb-28">
          {isLoading && conversations.length === 0 ? (
            <div className="p-8 text-center text-[var(--nb-secondary)] space-y-2">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--nb-accent)]" />
              <p className="nb-label text-xs">Syncing conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-[var(--nb-secondary)] space-y-3">
              <div 
                className="w-12 h-12 rounded-md bg-[var(--nb-surface-accent)] flex items-center justify-center mx-auto text-[var(--nb-content)]"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <MessageSquare className="w-6 h-6 text-[var(--nb-accent)]" />
              </div>
              <p className="text-xs font-sans text-[var(--nb-secondary)] leading-relaxed">No active chat sessions.</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="nb-btn text-xs !min-h-[38px] px-3.5 cursor-pointer"
              >
                Find Classmate
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selectedRoll?.toUpperCase() === conv.classmateRoll.toUpperCase();
              const lastMsg = conv.messages[conv.messages.length - 1];
              
              const pendingCount = conv.messages.filter(
                m => m.recipientRoll.toUpperCase() === (user.rollNumber || '').toUpperCase() && m.status === 'Pending' && m.type === 'invite'
              ).length;
              
              const unreadCount = isSelected ? 0 : conv.messages.filter(
                m => m.recipientRoll.toUpperCase() === (user.rollNumber || '').toUpperCase() && m.type === 'chat' && !m.isRead
              ).length;

              const isTyping = conv.typing?.some(r => r.toUpperCase() === conv.classmateRoll.toUpperCase());

              return (
                <div
                  key={conv.classmateRoll}
                  onClick={() => setSelectedRoll(conv.classmateRoll)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRoll(conv.classmateRoll); }}
                  className={`w-full text-left p-3 flex items-start gap-3 transition-all relative outline-none cursor-pointer border-b border-[var(--nb-divider)] ${
                    isSelected 
                      ? 'bg-[var(--nb-surface-accent)]' 
                      : 'hover:bg-[var(--nb-surface-accent)]/50'
                  }`}
                  style={{
                    borderLeft: isSelected 
                      ? '5px solid var(--nb-accent)' 
                      : unreadCount > 0 
                      ? '5px solid var(--nb-ink)' 
                      : '5px solid transparent'
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-md bg-[var(--nb-surface)] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 overflow-hidden relative"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <img 
                      src={conv.classmateProfile?.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${conv.classmateRoll}`} 
                      alt="avatar" 
                      className="w-full h-full object-cover" 
                    />
                    {unreadCount > 0 && (
                      <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[var(--nb-accent)] border border-[var(--nb-ink)]" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="nb-headline text-xs tracking-normal truncate pr-1">
                        {conv.classmateName}
                      </h4>
                      <span className="nb-label text-[9px] flex-shrink-0 text-[var(--nb-tertiary)]">
                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    
                    <p className="nb-label text-[9px] text-[var(--nb-accent)] mt-0.5">
                      {conv.classmateRoll}
                    </p>

                    <p className="text-xs truncate mt-0.5 text-[var(--nb-secondary)] font-sans">
                      {isTyping ? (
                        <span className="text-[var(--nb-accent)] font-bold italic">typing...</span>
                      ) : lastMsg ? (
                        <>
                          <strong className="text-[var(--nb-content)] mr-1 font-mono text-[10px]">
                            {lastMsg.senderUid === user.uid ? 'You:' : 'Them:'}
                          </strong>
                          {lastMsg.type === 'invite' ? '📬 Team Invite: ' : ''}
                          {lastMsg.message}
                        </>
                      ) : (
                        <span className="text-[var(--nb-tertiary)] italic">Tap to start chat...</span>
                      )}
                    </p>
                  </div>

                  {/* Actions & Badges */}
                  <div className="flex items-center gap-1 self-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatToDelete({ roll: conv.classmateRoll, name: conv.classmateName });
                      }}
                      className="p-1 text-[var(--nb-secondary)] hover:text-rose-600 rounded transition-all cursor-pointer"
                      title="Delete Entire Chat"
                      aria-label="Delete Entire Chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {pendingCount > 0 && (
                      <span className="nb-tag text-[9px] font-bold bg-amber-500 text-black border-amber-600">
                        {pendingCount}
                      </span>
                    )}
                    {unreadCount > 0 && pendingCount === 0 && (
                      <span className="nb-tag-accent text-[9px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Room / Thread View */}
      <div className={`flex-1 flex-col min-h-0 bg-[var(--nb-bg)] ${selectedRoll ? 'flex' : 'hidden md:flex'}`}>
        {activeConversation ? (
          <>
            {/* Thread Header */}
            <div 
              className="p-3 bg-[var(--nb-surface)] flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '2px solid var(--nb-ink)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  onClick={() => setSelectedRoll(null)}
                  className="nb-btn-icon w-8 h-8 rounded cursor-pointer md:hidden flex-shrink-0"
                  title="Back to list"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <div 
                  className="w-9 h-9 rounded-md bg-[var(--nb-surface-accent)] flex items-center justify-center text-xs font-mono font-bold overflow-hidden flex-shrink-0"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <img 
                    src={activeConversation.classmateProfile?.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${activeConversation.classmateRoll}`} 
                    alt="avatar" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="nb-headline text-sm tracking-normal leading-tight truncate">
                    {activeConversation.classmateName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="nb-tag text-[9px] flex-shrink-0">
                      {activeConversation.classmateRoll}
                    </span>
                    {activeConversation.classmateProfile && (
                      <span className="nb-label text-[9px] text-[var(--nb-secondary)] truncate">
                        ({activeConversation.classmateProfile.year} • Sec {activeConversation.classmateProfile.section})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="nb-tag text-[9px]">
                  SECURE
                </span>

                <button
                  type="button"
                  onClick={() => setChatToDelete({ roll: activeConversation.classmateRoll, name: activeConversation.classmateName })}
                  className="nb-btn-ghost text-xs !min-h-[34px] px-2.5 text-rose-600 dark:text-rose-400 cursor-pointer"
                  title="Delete entire conversation"
                  aria-label="Delete entire conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Chat</span>
                </button>
              </div>
            </div>

            {/* Message History Feed */}
            {activeConversation.messages.some(m => m.type === 'invite' && m.status === 'Pending' && m.recipientRoll.toUpperCase() === (user.rollNumber || '').toUpperCase()) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[var(--nb-bg)]">
                <div 
                  className="w-14 h-14 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4"
                  style={{ border: '2px solid var(--nb-ink)' }}
                >
                  <Sparkles className="w-7 h-7" />
                </div>
                
                <h3 className="nb-headline text-lg mb-1.5">
                  New Conversation Request
                </h3>
                
                <p className="text-xs text-[var(--nb-secondary)] max-w-sm mb-4 leading-relaxed font-sans">
                  <strong className="text-[var(--nb-content)] font-bold">{activeConversation.classmateName}</strong> wants to connect and collaborate. Accept their invitation to unlock the chat interface.
                </p>

                <div 
                  className="p-3.5 rounded-lg max-w-sm w-full mb-5 bg-[var(--nb-surface)]"
                  style={{ border: '1.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                   <p className="text-xs italic whitespace-pre-wrap font-sans text-[var(--nb-content)]">
                     &ldquo;{activeConversation.messages.find(m => m.type === 'invite' && m.status === 'Pending')?.message}&rdquo;
                   </p>
                </div>
                
                <div className="flex items-center justify-center gap-2.5 w-full max-w-sm">
                  <button
                    onClick={() => handleRespondToInvite(activeConversation.messages.find(m => m.type === 'invite' && m.status === 'Pending')!.invitationId, 'Declined')}
                    className="nb-btn-ghost flex-1 text-xs cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleRespondToInvite(activeConversation.messages.find(m => m.type === 'invite' && m.status === 'Pending')!.invitationId, 'Accepted')}
                    className="nb-btn flex-1 text-xs cursor-pointer"
                  >
                    Accept Request
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[var(--nb-bg)]">
                {activeConversation.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2.5">
                    <div 
                      className="w-12 h-12 rounded-md flex items-center justify-center bg-[var(--nb-surface)]"
                      style={{ border: '2px dashed var(--nb-divider)' }}
                    >
                      <CornerDownRight className="w-5 h-5 text-[var(--nb-accent)]" />
                    </div>
                    <div>
                      <h4 className="nb-headline text-base">Start the Conversation</h4>
                      <p className="text-xs text-[var(--nb-secondary)] max-w-xs mx-auto mt-0.5 leading-relaxed font-sans">
                        Send a message or invite to coordinate events and hackathons!
                      </p>
                    </div>
                  </div>
                ) : (
                  activeConversation.messages.map((msg, idx) => {
                    const isMe = msg.senderUid === user.uid;
                    const isInvite = msg.type === 'invite';
                    const canDelete = isMe || user.role === 'admin' || user.role === 'coordinator' || user.role === 'president';

                    return (
                      <div 
                        key={msg.invitationId || idx} 
                        className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 relative`}
                      >
                        {!isMe && (
                          <span className="nb-label text-[9px] text-[var(--nb-tertiary)] ml-1">
                            {msg.senderName} ({msg.senderRoll})
                          </span>
                        )}

                        <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
                          <div 
                            className={`p-3 rounded-md space-y-1.5 ${
                              isMe 
                                ? 'bg-[var(--nb-ink)] text-[var(--nb-bg)]' 
                                : 'bg-[var(--nb-surface)] text-[var(--nb-content)]'
                            }`}
                            style={{ 
                              border: '1.5px solid var(--nb-ink)',
                              boxShadow: 'var(--shadow-hard-sm)'
                            }}
                          >
                            
                            {isInvite && (
                              <div className="flex items-center gap-1.5 pb-1.5 border-b border-amber-500/40">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span className="nb-label text-[9px] text-amber-500 font-bold">
                                  Team Collaboration Invite
                                </span>
                              </div>
                            )}

                            <p className="text-xs font-sans leading-relaxed whitespace-pre-wrap select-text">
                              {msg.message}
                            </p>

                            {isInvite && (
                              <div className="pt-1.5 flex flex-col gap-1.5 border-t border-[var(--nb-divider)]">
                                <div className="flex items-center justify-between text-[9px] font-mono">
                                  <span>Proposal Status:</span>
                                  <span className={`font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    msg.status === 'Accepted'
                                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                      : msg.status === 'Declined'
                                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  }`}>
                                    {msg.status}
                                  </span>
                                </div>

                                {msg.status === 'Pending' && !isMe && (
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={() => handleRespondToInvite(msg.invitationId, 'Accepted')}
                                      className="nb-btn text-[9px] !min-h-[28px] py-0.5 px-2.5 flex-1 cursor-pointer"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleRespondToInvite(msg.invitationId, 'Declined')}
                                      className="nb-btn-ghost text-[9px] !min-h-[28px] py-0.5 px-2.5 flex-1 text-rose-600 dark:text-rose-400 cursor-pointer"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                )}

                                {msg.status !== 'Pending' && (
                                  <p className="text-[9px] font-mono text-[var(--nb-secondary)] text-center pt-0.5">
                                    {msg.status === 'Accepted' 
                                      ? `✓ Accepted on ${new Date(msg.createdAt).toLocaleDateString()}`
                                      : `✕ Declined`}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex justify-end items-center gap-1 text-[8px] font-mono mt-1 opacity-70">
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && (
                                msg.isRead 
                                  ? <CheckCheck className="w-3 h-3 text-[var(--nb-accent)]" />
                                  : <Check className="w-3 h-3 text-inherit" />
                              )}
                            </div>
                          </div>

                          {/* Individual Message Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMessageToDelete({ id: msg.invitationId, text: msg.message });
                              }}
                              className="opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 text-[var(--nb-secondary)] hover:text-rose-600 rounded cursor-pointer flex-shrink-0 self-center"
                              title="Delete message"
                              aria-label="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Form Error / Alerts inside chat */}
            {actionError && (
              <div 
                className="px-4 py-2 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 font-bold"
                style={{ borderTop: '1.5px solid currentColor' }}
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Chat Input Bar */}
            {activeConversation.messages.some(m => m.type === 'invite' && m.status === 'Pending' && m.recipientRoll.toUpperCase() === (user.rollNumber || '').toUpperCase()) ? (
              <div 
                className="p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-3 bg-[var(--nb-surface)] flex-shrink-0 text-center"
                style={{ borderTop: '2px solid var(--nb-ink)' }}
              >
                <p className="nb-label text-xs text-amber-600 dark:text-amber-400 py-2">
                  Accept the invitation above to start messaging.
                </p>
              </div>
            ) : activeConversation.messages.some(m => m.type === 'invite' && m.status === 'Pending' && m.senderUid === user.uid) ? (
              <div 
                className="p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-3 bg-[var(--nb-surface)] flex-shrink-0 text-center"
                style={{ borderTop: '2px solid var(--nb-ink)' }}
              >
                <p className="nb-label text-xs text-[var(--nb-secondary)] py-2">
                  Waiting for {activeConversation.classmateName} to accept your invitation...
                </p>
              </div>
            ) : (
              <form 
                onSubmit={handleSendMessage} 
                className="p-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-3 bg-[var(--nb-surface)] flex-shrink-0"
                style={{ borderTop: '2px solid var(--nb-ink)' }}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => {
                      setNewMessageText(e.target.value);
                      setActionError('');
                    }}
                    placeholder={
                      (!activeConversation.messages || activeConversation.messages.length === 0)
                        ? `Send an invite to chat with ${activeConversation.classmateName}...` 
                        : `Message ${activeConversation.classmateName}...`
                    }
                    className="nb-input text-xs flex-1 rounded-md"
                  />
                  
                  <button
                    type="submit"
                    disabled={!newMessageText.trim()}
                    className="nb-btn px-4 cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* Empty Active Session State */
          <div className="flex-1 flex flex-col relative items-center justify-center p-6 text-center space-y-3">
            <div 
              className="w-14 h-14 rounded-md bg-[var(--nb-surface)] flex items-center justify-center"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
            >
              <MessageSquare className="w-7 h-7 text-[var(--nb-accent)]" />
            </div>
            <div>
              <h3 className="nb-headline text-lg">No Active Chat</h3>
              <p className="text-xs text-[var(--nb-secondary)] max-w-xs mx-auto mt-0.5 leading-relaxed font-sans">
                Select a classmate from the list or start a new conversation.
              </p>
            </div>
            <button
              onClick={() => {
                setShowNewChatModal(true);
                setActionError('');
              }}
              className="nb-btn text-xs px-4 cursor-pointer"
            >
              Start New Conversation
            </button>
          </div>
        )}
      </div>

      {/* NEW CHAT MODAL SCREEN */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[999] select-none">
          <div 
            className="bg-[var(--nb-surface)] text-[var(--nb-content)] rounded-lg w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            {/* Modal Header */}
            <div 
              className="p-3.5 bg-[var(--nb-surface-accent)] flex justify-between items-center"
              style={{ borderBottom: '2px solid var(--nb-ink)' }}
            >
              <div>
                <h4 className="nb-headline text-base flex items-center gap-1.5 leading-none">
                  <User className="w-4 h-4 text-[var(--nb-accent)]" />
                  Lookup Classmate
                </h4>
                <p className="nb-label text-[10px] text-[var(--nb-secondary)] mt-0.5">
                  NOTX Student Directory
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Search Input */}
            <div className="p-3 border-b border-[var(--nb-divider)] bg-[var(--nb-surface)]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter Name, Roll Number, or branch..."
                  className="nb-input !pl-9 !pr-8 text-xs"
                  autoFocus
                />
                <Search className="w-3.5 h-3.5 text-[var(--nb-tertiary)] absolute left-3 top-3.5" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="nb-label absolute right-3 top-3 text-[10px] text-[var(--nb-secondary)] hover:text-[var(--nb-content)]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Modal Student List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--nb-divider)] max-h-64">
              {filteredStudentsForChat.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--nb-secondary)] font-sans">
                  No registered students match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredStudentsForChat.map((student) => (
                  <button
                    key={student.uid}
                    onClick={() => handleStartNewChat(student)}
                    className="w-full text-left p-3 flex items-center justify-between hover:bg-[var(--nb-surface-accent)] transition-all outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-9 h-9 rounded-md bg-[var(--nb-surface-accent)] flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 overflow-hidden"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <img 
                          src={student.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${student.rollNumber || student.uid}`} 
                          alt="avatar" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <h5 className="nb-headline text-xs tracking-normal">{student.name}</h5>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="nb-tag text-[9px]">
                            {student.rollNumber || 'N/A'}
                          </span>
                          <span className="nb-label text-[9px] text-[var(--nb-secondary)]">
                            • {student.year || '3rd Year'} ({student.department || activeTenant?.shortCode || activeTenant?.name || 'Student'})
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--nb-tertiary)]" />
                  </button>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 bg-[var(--nb-surface-accent)] border-t border-[var(--nb-divider)] text-center">
              <span className="nb-label text-[9px] text-[var(--nb-secondary)]">
                Direct peer-to-peer communication
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ENTIRE CHAT CONFIRMATION MODAL */}
      {chatToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[1000] select-none">
          <div 
            className="bg-[var(--nb-surface)] text-[var(--nb-content)] rounded-lg w-full max-w-sm p-5 space-y-4"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="nb-headline text-base">Delete Entire Chat?</h4>
                <p className="nb-label text-[9px] text-[var(--nb-secondary)]">Permanent wipeout</p>
              </div>
            </div>
            
            <p className="text-xs text-[var(--nb-secondary)] leading-relaxed font-sans">
              Are you sure you want to permanently delete all messages and the entire chat history with <strong className="text-[var(--nb-content)]">{chatToDelete.name}</strong> ({chatToDelete.roll})? This action cannot be undone.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingChat}
                onClick={() => setChatToDelete(null)}
                className="nb-btn-ghost flex-1 text-xs !min-h-[40px] cursor-pointer"
              >
                Cancel
              </button>
              <HoldButton
                size="sm"
                holdTime={1800}
                backgroundColor="var(--nb-surface-accent)"
                fillColor="var(--nb-accent)"
                textColor="var(--nb-content)"
                fillTextColor="#ffffff"
                radius={4}
                doneLabel="Chat Deleted"
                disabled={isDeletingChat}
                onHold={confirmDeleteChat}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                className="flex-1 text-xs font-mono font-bold uppercase cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                Hold to Delete
              </HoldButton>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SINGLE MESSAGE CONFIRMATION MODAL */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[1000] select-none">
          <div 
            className="bg-[var(--nb-surface)] text-[var(--nb-content)] rounded-lg w-full max-w-sm p-5 space-y-4"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="nb-headline text-base">Delete Message?</h4>
                <p className="nb-label text-[9px] text-[var(--nb-secondary)]">Remove from conversation</p>
              </div>
            </div>
            
            <p className="text-xs text-[var(--nb-secondary)] leading-relaxed font-sans">
              Are you sure you want to delete this message? It will be removed for all participants.
            </p>

            <div 
              className="bg-[var(--nb-surface-accent)] p-3 rounded text-xs text-[var(--nb-content)] italic line-clamp-3 font-sans"
              style={{ border: '1px solid var(--nb-divider)' }}
            >
              &ldquo;{messageToDelete.text}&rdquo;
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingMessage}
                onClick={() => setMessageToDelete(null)}
                className="nb-btn-ghost flex-1 text-xs !min-h-[40px] cursor-pointer"
              >
                Cancel
              </button>
              <HoldButton
                size="sm"
                holdTime={1600}
                backgroundColor="var(--nb-surface-accent)"
                fillColor="var(--nb-accent)"
                textColor="var(--nb-content)"
                fillTextColor="#ffffff"
                radius={4}
                doneLabel="Deleted"
                disabled={isDeletingMessage}
                onHold={confirmDeleteMessage}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                className="flex-1 text-xs font-mono font-bold uppercase cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                Hold to Delete
              </HoldButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
