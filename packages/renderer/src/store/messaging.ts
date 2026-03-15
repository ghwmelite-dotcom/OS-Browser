import { create } from 'zustand';

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
  status: 'sent' | 'delivered' | 'read';
  isEncrypted: boolean;
}

export interface Conversation {
  id: string;
  participants: Contact[];
  lastMessage: Message | null;
  unreadCount: number;
  isPinned: boolean;
}

interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  contacts: Contact[];
  messages: Record<string, Message[]>;
  searchQuery: string;
  isComposing: boolean;

  sendMessage: (conversationId: string, text: string) => void;
  selectConversation: (id: string | null) => void;
  createConversation: (contact: Contact) => void;
  deleteConversation: (id: string) => void;
  togglePin: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setIsComposing: (v: boolean) => void;
  markAsRead: (conversationId: string) => void;
}

const CURRENT_USER_ID = 'current-user';

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
    lastSeen: now - 2 * 60 * 60 * 1000, // 2 hours ago
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
    senderId: CURRENT_USER_ID,
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
    senderId: CURRENT_USER_ID,
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

export const useMessagingStore = create<MessagingState>((set, get) => ({
  conversations: sampleConversations,
  activeConversationId: null,
  contacts: sampleContacts,
  messages: { [kwameConvoId]: sampleMessages },
  searchQuery: '',
  isComposing: false,

  sendMessage: (conversationId: string, text: string) => {
    const id = `msg-${++msgCounter}-${Date.now()}`;
    const message: Message = {
      id,
      conversationId,
      senderId: CURRENT_USER_ID,
      text,
      timestamp: Date.now(),
      status: 'sent',
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

    // Simulate delivery after 1s
    setTimeout(() => {
      const { messages: currentMessages } = get();
      const updated = (currentMessages[conversationId] || []).map(m =>
        m.id === id ? { ...m, status: 'delivered' as const } : m,
      );
      set({ messages: { ...currentMessages, [conversationId]: updated } });
    }, 1000);
  },

  selectConversation: (id: string | null) => {
    set({ activeConversationId: id, isComposing: false });
    if (id) get().markAsRead(id);
  },

  createConversation: (contact: Contact) => {
    const { conversations, messages } = get();
    // Check if conversation already exists with this contact
    const existing = conversations.find(c =>
      c.participants.some(p => p.id === contact.id),
    );
    if (existing) {
      set({ activeConversationId: existing.id, isComposing: false });
      return;
    }
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
    const { conversations, messages } = get();
    const convoMessages = (messages[conversationId] || []).map(m =>
      m.senderId !== CURRENT_USER_ID && m.status !== 'read'
        ? { ...m, status: 'read' as const }
        : m,
    );
    set({
      conversations: conversations.map(c =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
      messages: { ...messages, [conversationId]: convoMessages },
    });
  },
}));

export const CURRENT_USER = CURRENT_USER_ID;
