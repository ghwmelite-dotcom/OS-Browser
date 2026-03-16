/**
 * @deprecated Replaced by store/govchat.ts (GovChat Zustand store).
 * This file is kept for reference during migration and will be removed once GovChat is fully verified.
 */
import { create } from 'zustand';
import { MessagingService } from '@/services/MessagingService';

export interface Contact {
  id: string;
  name: string;
  email: string; // must be @gov.gh
  department: string;
  avatar?: string;
  lastSeen: number | null;
  isOnline: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isEncrypted: boolean;
}

export interface Conversation {
  id: string;
  participants: Contact[];
  lastMessage: Message | null;
  unreadCount: number;
  isPinned: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface TypingState {
  [conversationId: string]: {
    userId: string;
    timeout: ReturnType<typeof setTimeout>;
  } | undefined;
}

interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  contacts: Contact[];
  messages: Record<string, Message[]>;
  searchQuery: string;
  isComposing: boolean;

  // Connection / auth state
  connectionStatus: ConnectionStatus;
  isAuthenticated: boolean;
  currentUserId: string | null;
  currentUserEmail: string | null;
  authStep: 'idle' | 'registering' | 'verify' | 'verifying' | 'authenticated';
  authError: string | null;
  isBackendReachable: boolean;

  // Typing indicators from remote users
  typingUsers: Record<string, string | null>; // conversationId -> userId currently typing (or null)

  // Auth actions
  register: (email: string, name: string, department: string) => Promise<boolean>;
  verify: (email: string, code: string) => Promise<boolean>;
  logout: () => void;

  // Messaging actions
  sendMessage: (conversationId: string, text: string) => void;
  selectConversation: (id: string | null) => void;
  createConversation: (contact: Contact) => void;
  deleteConversation: (id: string) => void;
  togglePin: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setIsComposing: (v: boolean) => void;
  markAsRead: (conversationId: string) => void;

  // Init
  initialize: () => void;
}

/* ──────────────── Sample / fallback data ──────────────── */

const now = Date.now();

const sampleContacts: Contact[] = [
  {
    id: 'contact-kwame',
    name: 'Kwame Mensah',
    email: 'kwame.mensah@mof.gov.gh',
    department: 'Ministry of Finance',
    isOnline: true,
    lastSeen: null,
  },
  {
    id: 'contact-akua',
    name: 'Akua Boateng',
    email: 'akua.boateng@ohcs.gov.gh',
    department: 'OHCS',
    isOnline: false,
    lastSeen: now - 2 * 60 * 60 * 1000,
  },
  {
    id: 'contact-yaw',
    name: 'Yaw Asante',
    email: 'yaw.asante@gra.gov.gh',
    department: 'GRA',
    isOnline: true,
    lastSeen: null,
  },
];

const kwameConvoId = 'conv-kwame';

const sampleMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: kwameConvoId,
    senderId: 'contact-kwame',
    text: 'Good morning. Have you had a chance to review the Q4 budget allocation document?',
    timestamp: now - 3 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
  },
  {
    id: 'msg-2',
    conversationId: kwameConvoId,
    senderId: 'current-user',
    text: 'Yes, I went through the line items yesterday. The infrastructure allocation looks solid, but I have concerns about the education sector figures.',
    timestamp: now - 2.5 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
  },
  {
    id: 'msg-3',
    conversationId: kwameConvoId,
    senderId: 'contact-kwame',
    text: 'I agree. Let us schedule a review meeting with the Education Ministry liaison before Friday. I will prepare the revised projections.',
    timestamp: now - 2 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
  },
  {
    id: 'msg-4',
    conversationId: kwameConvoId,
    senderId: 'current-user',
    text: 'Sounds good. I will send a calendar invite for Thursday at 10 AM. Please bring the comparative analysis from last fiscal year as well.',
    timestamp: now - 1.5 * 60 * 60 * 1000,
    status: 'delivered',
    isEncrypted: true,
  },
];

const sampleConversations: Conversation[] = [
  {
    id: kwameConvoId,
    participants: [sampleContacts[0]],
    lastMessage: sampleMessages[sampleMessages.length - 1],
    unreadCount: 0,
    isPinned: true,
  },
];

let msgCounter = 100;

/* ──────────────── Typing-indicator timers ──────────────── */
const typingTimers: TypingState = {};

/* ──────────────── Store ──────────────── */

export const useMessagingStore = create<MessagingState>((set, get) => {
  /* ── helper: wire service events to store ── */
  let listenersBound = false;

  function bindServiceListeners() {
    if (listenersBound) return;
    listenersBound = true;

    MessagingService.on('connected', (data: unknown) => {
      const { conversationId } = data as { conversationId: string };
      void conversationId;
      // If at least one socket is connected, mark status as connected
      set({ connectionStatus: 'connected' });
    });

    MessagingService.on('connecting', () => {
      const { connectionStatus } = get();
      if (connectionStatus !== 'connected') {
        set({ connectionStatus: 'connecting' });
      }
    });

    MessagingService.on('disconnected', () => {
      // Check if any sockets are still connected
      if (MessagingService.connectedConversations.length === 0) {
        set({ connectionStatus: 'disconnected' });
      }
    });

    MessagingService.on('error', (data: unknown) => {
      const { message } = data as { message: string };
      console.warn('[MessagingStore] Service error:', message);
    });

    MessagingService.on('message:received', (data: unknown) => {
      const { conversationId, message: rawMsg } = data as {
        conversationId: string;
        message: { id: string; senderId: string; text: string; timestamp: number; [k: string]: unknown };
      };
      const { messages, conversations, activeConversationId, currentUserId } = get();

      // Don't re-add our own messages
      if (rawMsg.senderId === currentUserId) return;

      const message: Message = {
        id: rawMsg.id ?? `msg-ws-${Date.now()}`,
        conversationId,
        senderId: rawMsg.senderId,
        text: rawMsg.text,
        timestamp: rawMsg.timestamp ?? Date.now(),
        status: activeConversationId === conversationId ? 'read' : 'delivered',
        isEncrypted: true,
      };

      const convoMessages = [...(messages[conversationId] || []), message];
      const isActiveConvo = activeConversationId === conversationId;

      set({
        messages: { ...messages, [conversationId]: convoMessages },
        conversations: conversations.map(c =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: message,
                unreadCount: isActiveConvo ? c.unreadCount : c.unreadCount + 1,
              }
            : c,
        ),
      });

      // Auto-send read receipt if viewing this conversation
      if (isActiveConvo) {
        MessagingService.sendReadReceipt(conversationId, message.id);
      }
    });

    MessagingService.on('typing', (data: unknown) => {
      const { conversationId, userId } = data as { conversationId: string; userId: string };

      // Clear existing timer for this conversation
      if (typingTimers[conversationId]) {
        clearTimeout(typingTimers[conversationId]!.timeout);
      }

      // Set typing indicator
      set({ typingUsers: { ...get().typingUsers, [conversationId]: userId } });

      // Clear after 3 seconds
      typingTimers[conversationId] = {
        userId,
        timeout: setTimeout(() => {
          set({ typingUsers: { ...get().typingUsers, [conversationId]: null } });
          delete typingTimers[conversationId];
        }, 3000),
      };
    });

    MessagingService.on('read_receipt', (data: unknown) => {
      const { conversationId, messageId } = data as { conversationId: string; messageId: string; userId: string };
      const { messages } = get();
      const convoMessages = (messages[conversationId] || []).map(m =>
        m.id === messageId ? { ...m, status: 'read' as const } : m,
      );
      set({ messages: { ...messages, [conversationId]: convoMessages } });
    });

    MessagingService.on('user_online', (data: unknown) => {
      const { userId } = data as { userId: string };
      const { contacts, conversations } = get();
      set({
        contacts: contacts.map(c => (c.id === userId ? { ...c, isOnline: true, lastSeen: null } : c)),
        conversations: conversations.map(convo => ({
          ...convo,
          participants: convo.participants.map(p =>
            p.id === userId ? { ...p, isOnline: true, lastSeen: null } : p,
          ),
        })),
      });
    });

    MessagingService.on('user_offline', (data: unknown) => {
      const { userId } = data as { userId: string };
      const { contacts, conversations } = get();
      const lastSeen = Date.now();
      set({
        contacts: contacts.map(c => (c.id === userId ? { ...c, isOnline: false, lastSeen } : c)),
        conversations: conversations.map(convo => ({
          ...convo,
          participants: convo.participants.map(p =>
            p.id === userId ? { ...p, isOnline: false, lastSeen } : p,
          ),
        })),
      });
    });

    MessagingService.on('history', (data: unknown) => {
      const { conversationId, messages: historyMsgs } = data as { conversationId: string; messages: Message[] };
      const { messages } = get();
      set({ messages: { ...messages, [conversationId]: historyMsgs } });
    });
  }

  return {
    conversations: sampleConversations,
    activeConversationId: null,
    contacts: sampleContacts,
    messages: { [kwameConvoId]: sampleMessages },
    searchQuery: '',
    isComposing: false,

    // Connection / auth
    connectionStatus: 'disconnected',
    isAuthenticated: MessagingService.isAuthenticated,
    currentUserId: MessagingService.currentUserId,
    currentUserEmail: MessagingService.currentEmail,
    authStep: MessagingService.isAuthenticated ? 'authenticated' : 'idle',
    authError: null,
    isBackendReachable: false,
    typingUsers: {},

    /* ──── Auth actions ──── */

    register: async (email: string, name: string, department: string) => {
      set({ authStep: 'registering', authError: null });
      const result = await MessagingService.register(email, name, department);
      if (result.success && result.userId && result.token) {
        // Auto-approved — go straight to authenticated
        set({
          authStep: 'authenticated',
          isAuthenticated: true,
          currentUserId: result.userId,
          currentUserEmail: email,
        });
        // Load backend data
        get().initialize();
        return true;
      }
      set({ authStep: 'idle', authError: result.message });
      return false;
    },

    verify: async (_email: string, _code: string) => {
      // Verification no longer needed — register auto-approves .gov.gh emails
      return false;
    },

    logout: () => {
      MessagingService.clearCredentials();
      set({
        isAuthenticated: false,
        currentUserId: null,
        currentUserEmail: null,
        authStep: 'idle',
        authError: null,
        connectionStatus: 'disconnected',
        isBackendReachable: false,
        // Reset to sample data
        conversations: sampleConversations,
        contacts: sampleContacts,
        messages: { [kwameConvoId]: sampleMessages },
        activeConversationId: null,
        typingUsers: {},
      });
    },

    /* ──── Messaging actions ──── */

    sendMessage: (conversationId: string, text: string) => {
      const { isAuthenticated, connectionStatus, currentUserId } = get();
      const senderId = currentUserId ?? 'current-user';
      const id = `msg-${++msgCounter}-${Date.now()}`;
      const message: Message = {
        id,
        conversationId,
        senderId,
        text,
        timestamp: Date.now(),
        status: isAuthenticated && connectionStatus === 'connected' ? 'sending' : 'sent',
        isEncrypted: true,
      };

      const { messages, conversations } = get();
      const convoMessages = [...(messages[conversationId] || []), message];
      const updatedConversations = conversations.map(c =>
        c.id === conversationId ? { ...c, lastMessage: message } : c,
      );
      set({
        messages: { ...messages, [conversationId]: convoMessages },
        conversations: updatedConversations,
      });

      // Send via WebSocket if connected
      if (isAuthenticated && MessagingService.isConnected(conversationId)) {
        MessagingService.sendMessage(conversationId, text);
        // Mark as sent after a short delay (optimistic)
        setTimeout(() => {
          const { messages: currentMessages } = get();
          const updated = (currentMessages[conversationId] || []).map(m =>
            m.id === id ? { ...m, status: 'sent' as const } : m,
          );
          set({ messages: { ...currentMessages, [conversationId]: updated } });
        }, 300);
      }

      // Fallback delivery simulation for local-only mode
      if (!isAuthenticated || connectionStatus !== 'connected') {
        setTimeout(() => {
          const { messages: currentMessages } = get();
          const updated = (currentMessages[conversationId] || []).map(m =>
            m.id === id ? { ...m, status: 'delivered' as const } : m,
          );
          set({ messages: { ...currentMessages, [conversationId]: updated } });
        }, 1000);
      }
    },

    selectConversation: (id: string | null) => {
      set({ activeConversationId: id, isComposing: false });
      if (id) {
        get().markAsRead(id);
        // Connect WebSocket for this conversation if authenticated
        if (get().isAuthenticated) {
          MessagingService.connectToConversation(id);
        }
      }
    },

    createConversation: (contact: Contact) => {
      const { conversations, messages, isAuthenticated } = get();
      const existing = conversations.find(c =>
        c.participants.some(p => p.id === contact.id),
      );
      if (existing) {
        set({ activeConversationId: existing.id, isComposing: false });
        return;
      }

      // If authenticated, create on backend first
      if (isAuthenticated) {
        MessagingService.createConversation([contact.id]).then(result => {
          if (result.conversationId) {
            const id = result.conversationId;
            const newConvo: Conversation = {
              id,
              participants: [contact],
              lastMessage: null,
              unreadCount: 0,
              isPinned: false,
            };
            const { conversations: latest, messages: latestMsgs } = get();
            set({
              conversations: [...latest, newConvo],
              messages: { ...latestMsgs, [id]: [] },
              activeConversationId: id,
              isComposing: false,
            });
            MessagingService.connectToConversation(id);
          }
        });
        return;
      }

      // Local-only mode
      const id = `conv-${contact.id}-${Date.now()}`;
      const newConvo: Conversation = {
        id,
        participants: [contact],
        lastMessage: null,
        unreadCount: 0,
        isPinned: false,
      };
      set({
        conversations: [...conversations, newConvo],
        messages: { ...messages, [id]: [] },
        activeConversationId: id,
        isComposing: false,
      });
    },

    deleteConversation: (id: string) => {
      const { conversations, messages, activeConversationId } = get();
      const { [id]: _, ...restMessages } = messages;
      MessagingService.disconnectFromConversation(id);
      set({
        conversations: conversations.filter(c => c.id !== id),
        messages: restMessages,
        activeConversationId: activeConversationId === id ? null : activeConversationId,
      });
    },

    togglePin: (id: string) => {
      const { conversations } = get();
      set({
        conversations: conversations.map(c =>
          c.id === id ? { ...c, isPinned: !c.isPinned } : c,
        ),
      });
    },

    setSearchQuery: (q: string) => set({ searchQuery: q }),
    setIsComposing: (v: boolean) => set({ isComposing: v }),

    markAsRead: (conversationId: string) => {
      const { conversations, messages, currentUserId } = get();
      const senderId = currentUserId ?? 'current-user';
      const convoMessages = (messages[conversationId] || []).map(m => {
        if (m.senderId !== senderId && m.status !== 'read') {
          // Send read receipt via WebSocket
          if (MessagingService.isConnected(conversationId)) {
            MessagingService.sendReadReceipt(conversationId, m.id);
          }
          return { ...m, status: 'read' as const };
        }
        return m;
      });
      set({
        conversations: conversations.map(c =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
        messages: { ...messages, [conversationId]: convoMessages },
      });
    },

    /* ──── Initialization ──── */

    initialize: () => {
      bindServiceListeners();

      if (!MessagingService.isAuthenticated) {
        // Not authenticated — use sample data (already set as defaults)
        set({ isBackendReachable: false });
        return;
      }

      set({
        isAuthenticated: true,
        currentUserId: MessagingService.currentUserId,
        currentUserEmail: MessagingService.currentEmail,
        authStep: 'authenticated',
        connectionStatus: 'connecting',
      });

      // Load backend data; fall back to sample data on failure
      Promise.all([
        MessagingService.getContacts(),
        MessagingService.getConversations(),
      ])
        .then(([contacts, conversations]) => {
          if (contacts.length > 0 || conversations.length > 0) {
            set({
              isBackendReachable: true,
              contacts: contacts.length > 0 ? contacts : sampleContacts,
              conversations: conversations.length > 0 ? conversations : sampleConversations,
            });

            // Connect WebSocket for each conversation
            for (const convo of conversations) {
              MessagingService.connectToConversation(convo.id);
            }
          } else {
            // Backend reachable but no data yet — keep sample data
            set({ isBackendReachable: true });
          }
        })
        .catch(() => {
          // Backend unreachable — stay in local mode
          set({
            isBackendReachable: false,
            connectionStatus: 'disconnected',
          });
        });
    },
  };
});

export const CURRENT_USER = 'current-user';
