import { create } from 'zustand';
import type {
  GovUser,
  ChatRoom,
  GovChatMessage,
  ClassificationLevel,
  ChatFilter,
  AuthStep,
  GovChatCredentials,
  ReplyTo,
} from '@/types/govchat';
import { DEFAULT_RETENTION_DAYS } from '@/types/govchat';

import { MatrixClientService } from '@/services/MatrixClientService';

/* ──────────────── Credentials persistence ──────────────── */

const CREDENTIALS_KEY = 'govchat_credentials';

function loadCredentials(): GovChatCredentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GovChatCredentials;
  } catch {
    return null;
  }
}

function saveCredentials(credentials: GovChatCredentials): void {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

function clearCredentials(): void {
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
  } catch {
    // silent
  }
}

/* ──────────────── Sample / fallback data ──────────────── */

const now = Date.now();

const CURRENT_USER_ID = '@current-user:govchat.gov.gh';

const currentUser: GovUser = {
  userId: CURRENT_USER_ID,
  staffId: 'GHS-00001',
  displayName: 'You',
  department: 'Digital Services',
  ministry: 'Ministry of Communications',
  role: 'user',
  isOnline: true,
  lastSeen: null,
};

const sampleContacts: GovUser[] = [
  {
    userId: '@kwame.mensah:govchat.gov.gh',
    staffId: 'GHS-10042',
    displayName: 'Kwame Mensah',
    department: 'Budget Division',
    ministry: 'Ministry of Finance',
    role: 'user',
    isOnline: true,
    lastSeen: null,
  },
  {
    userId: '@akua.boateng:govchat.gov.gh',
    staffId: 'GHS-20187',
    displayName: 'Akua Boateng',
    department: 'Human Resource Policy',
    ministry: 'OHCS',
    role: 'admin',
    isOnline: false,
    lastSeen: now - 2 * 60 * 60 * 1000,
  },
  {
    userId: '@yaw.asante:govchat.gov.gh',
    staffId: 'GHS-30099',
    displayName: 'Yaw Asante',
    department: 'Revenue Assurance',
    ministry: 'GRA',
    role: 'user',
    isOnline: true,
    lastSeen: null,
  },
];

const kwameRoomId = 'room-kwame-dm';
const groupRoomId = 'room-budget-committee';

const sampleMessages: GovChatMessage[] = [
  {
    eventId: 'evt-1',
    roomId: kwameRoomId,
    senderId: '@kwame.mensah:govchat.gov.gh',
    senderName: 'Kwame Mensah',
    type: 'text',
    body: 'Good morning. Have you had a chance to review the Q4 budget allocation document?',
    timestamp: now - 3 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
    classification: 'OFFICIAL',
    reactions: [],
    mentions: [],
  },
  {
    eventId: 'evt-2',
    roomId: kwameRoomId,
    senderId: CURRENT_USER_ID,
    senderName: 'You',
    type: 'text',
    body: 'Yes, I went through the line items yesterday. The infrastructure allocation looks solid, but I have concerns about the education sector figures.',
    timestamp: now - 2.5 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
    classification: 'OFFICIAL',
    reactions: [{ key: '\u{1F44D}', senders: ['@kwame.mensah:govchat.gov.gh'] }],
    mentions: [],
  },
  {
    eventId: 'evt-3',
    roomId: kwameRoomId,
    senderId: '@kwame.mensah:govchat.gov.gh',
    senderName: 'Kwame Mensah',
    type: 'text',
    body: 'I agree. Let us schedule a review meeting with the Education Ministry liaison before Friday. I will prepare the revised projections.',
    timestamp: now - 2 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
    classification: 'OFFICIAL',
    reactions: [],
    mentions: [],
  },
  {
    eventId: 'evt-4',
    roomId: kwameRoomId,
    senderId: CURRENT_USER_ID,
    senderName: 'You',
    type: 'text',
    body: 'Sounds good. I will send a calendar invite for Thursday at 10 AM. Please bring the comparative analysis from last fiscal year as well.',
    timestamp: now - 1.5 * 60 * 60 * 1000,
    status: 'delivered',
    isEncrypted: true,
    classification: 'OFFICIAL',
    reactions: [],
    mentions: [],
  },
];

const groupMessages: GovChatMessage[] = [
  {
    eventId: 'evt-g1',
    roomId: groupRoomId,
    senderId: '@akua.boateng:govchat.gov.gh',
    senderName: 'Akua Boateng',
    type: 'text',
    body: 'Team, I have uploaded the revised compensation framework. Please review before our Thursday session.',
    timestamp: now - 5 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
    classification: 'SENSITIVE',
    reactions: [{ key: '\u{1F44D}', senders: ['@yaw.asante:govchat.gov.gh', CURRENT_USER_ID] }],
    mentions: [],
  },
  {
    eventId: 'evt-g2',
    roomId: groupRoomId,
    senderId: '@yaw.asante:govchat.gov.gh',
    senderName: 'Yaw Asante',
    type: 'text',
    body: 'Noted. I will cross-reference with the revenue projections from GRA and flag any gaps.',
    timestamp: now - 4.5 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
    classification: 'SENSITIVE',
    reactions: [],
    mentions: [],
  },
  {
    eventId: 'evt-g3',
    roomId: groupRoomId,
    senderId: '@kwame.mensah:govchat.gov.gh',
    senderName: 'Kwame Mensah',
    type: 'text',
    body: 'Good. Let us aim to finalize the budget committee report by end of week. I have flagged a few line items for discussion.',
    timestamp: now - 4 * 60 * 60 * 1000,
    status: 'read',
    isEncrypted: true,
    classification: 'SENSITIVE',
    reactions: [],
    mentions: [],
  },
];

const mofMinistry = {
  id: 'mof',
  name: 'Ministry of Finance',
  abbreviation: 'MoF',
  color: '#1D4ED8',
};

const sampleRooms: ChatRoom[] = [
  {
    roomId: kwameRoomId,
    name: 'Kwame Mensah',
    isDirect: true,
    isEncrypted: true,
    classification: 'OFFICIAL',
    members: [currentUser, sampleContacts[0]],
    lastMessage: sampleMessages[sampleMessages.length - 1],
    unreadCount: 0,
    isPinned: true,
    ministry: mofMinistry,
    retentionDays: DEFAULT_RETENTION_DAYS.OFFICIAL,
    createdAt: now - 30 * 24 * 60 * 60 * 1000,
  },
  {
    roomId: groupRoomId,
    name: 'Budget Review Committee',
    topic: 'Q4 FY2025/26 budget review and reconciliation',
    isDirect: false,
    isEncrypted: true,
    classification: 'SENSITIVE',
    members: [currentUser, ...sampleContacts],
    lastMessage: groupMessages[groupMessages.length - 1],
    unreadCount: 2,
    isPinned: false,
    ministry: mofMinistry,
    retentionDays: DEFAULT_RETENTION_DAYS.SENSITIVE,
    createdAt: now - 14 * 24 * 60 * 60 * 1000,
  },
];

/* ──────────────── Counter for local message IDs ──────────────── */

let msgCounter = 100;

/* ──────────────── Typing-indicator timers ──────────────── */

const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/* ──────────────── State Interface ──────────────── */

interface GovChatState {
  // Auth
  authStep: AuthStep;
  authError: string | null;
  credentials: GovChatCredentials | null;
  currentUser: GovUser | null;

  // Rooms
  rooms: ChatRoom[];
  activeRoomId: string | null;
  chatFilter: ChatFilter;
  searchQuery: string;

  // Messages
  messages: Record<string, GovChatMessage[]>; // roomId -> messages

  // Typing
  typingByRoom: Record<string, string[]>; // roomId -> userIds

  // UI state
  isComposing: boolean;
  replyingTo: ReplyTo | null;
  activeThreadId: string | null;

  // Connection
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
  isSyncing: boolean;

  // Auth actions
  redeemInviteCode: (code: string, staffId: string, displayName: string) => Promise<boolean>;
  loginWithCredentials: (credentials: GovChatCredentials) => Promise<boolean>;
  continueLocalMode: () => void;
  logout: () => void;

  // Room actions
  selectRoom: (roomId: string | null) => void;
  createDirectRoom: (userId: string) => Promise<string | null>;
  createGroupRoom: (name: string, userIds: string[], classification: ClassificationLevel) => Promise<string | null>;
  deleteRoom: (roomId: string) => void;
  togglePinRoom: (roomId: string) => void;
  setRoomClassification: (roomId: string, level: ClassificationLevel) => void;
  setChatFilter: (filter: ChatFilter) => void;
  setSearchQuery: (query: string) => void;
  setIsComposing: (v: boolean) => void;

  // Message actions
  sendMessage: (roomId: string, body: string, classification?: ClassificationLevel) => void;
  sendFileMessage: (roomId: string, file: File, classification?: ClassificationLevel) => Promise<void>;
  sendVoiceNote: (roomId: string, blob: Blob, duration: number, waveform: number[]) => Promise<void>;
  addReaction: (roomId: string, eventId: string, emoji: string) => void;
  removeReaction: (roomId: string, eventId: string, emoji: string) => void;
  setReplyingTo: (reply: ReplyTo | null) => void;

  // Thread actions
  openThread: (eventId: string) => void;
  closeThread: () => void;

  // Lifecycle
  initialize: () => void;
  markRoomAsRead: (roomId: string) => void;
}

/* ──────────────── Store ──────────────── */

export const useGovChatStore = create<GovChatState>((set, get) => {
  /* ── helper: wire service events to store ── */
  let listenersBound = false;

  const unsubscribers: Array<() => void> = [];

  function bindServiceListeners() {
    if (listenersBound) return;
    listenersBound = true;

    // sync → maps to connectionStatus
    unsubscribers.push(
      MatrixClientService.on('sync', (data: unknown) => {
        const { state } = data as { state: 'PREPARED' | 'SYNCING' | 'ERROR' | 'STOPPED' };
        switch (state) {
          case 'PREPARED':
            set({ connectionStatus: 'connected', isSyncing: false });
            break;
          case 'SYNCING':
            set({ connectionStatus: 'syncing', isSyncing: true });
            break;
          case 'ERROR':
            set({ connectionStatus: 'error', isSyncing: false });
            break;
          case 'STOPPED':
            set({ connectionStatus: 'disconnected', isSyncing: false });
            break;
        }
      }),
    );

    // error
    unsubscribers.push(
      MatrixClientService.on('error', (data: unknown) => {
        const { message } = data as { message: string };
        console.warn('[GovChatStore] Service error:', message);
      }),
    );

    // message → incoming messages
    unsubscribers.push(
      MatrixClientService.on('message', (data: unknown) => {
        const { roomId, message: rawMsg } = data as {
          roomId: string;
          message: GovChatMessage;
        };
        const { messages, rooms, activeRoomId, currentUser: user } = get();

        // Don't re-add our own messages
        if (user && rawMsg.senderId === user.userId) return;

        const convoMessages = [...(messages[roomId] || []), rawMsg];
        const isActiveRoom = activeRoomId === roomId;

        set({
          messages: { ...messages, [roomId]: convoMessages },
          rooms: rooms.map(r =>
            r.roomId === roomId
              ? {
                  ...r,
                  lastMessage: rawMsg,
                  unreadCount: isActiveRoom ? r.unreadCount : r.unreadCount + 1,
                }
              : r,
          ),
        });

        // Auto-mark as read if viewing this room
        if (isActiveRoom) {
          get().markRoomAsRead(roomId);
        }
      }),
    );

    // typing
    unsubscribers.push(
      MatrixClientService.on('typing', (data: unknown) => {
        const { roomId, userIds } = data as { roomId: string; userIds: string[] };

        // Clear existing timer for this room
        if (typingTimers[roomId]) {
          clearTimeout(typingTimers[roomId]);
        }

        set({ typingByRoom: { ...get().typingByRoom, [roomId]: userIds } });

        // Clear after 4 seconds
        typingTimers[roomId] = setTimeout(() => {
          set({ typingByRoom: { ...get().typingByRoom, [roomId]: [] } });
          delete typingTimers[roomId];
        }, 4000);
      }),
    );

    // receipt → read receipts
    unsubscribers.push(
      MatrixClientService.on('receipt', (data: unknown) => {
        const { roomId, eventId } = data as { roomId: string; eventId: string; userId: string };
        const { messages } = get();
        const roomMessages = (messages[roomId] || []).map(m =>
          m.eventId === eventId ? { ...m, status: 'read' as const } : m,
        );
        set({ messages: { ...messages, [roomId]: roomMessages } });
      }),
    );

    // room → new room added
    unsubscribers.push(
      MatrixClientService.on('room', (data: unknown) => {
        const { room } = data as { room: ChatRoom };
        const { rooms, messages } = get();
        // Only add if not already present
        if (!rooms.some(r => r.roomId === room.roomId)) {
          set({
            rooms: [...rooms, room],
            messages: { ...messages, [room.roomId]: messages[room.roomId] ?? [] },
          });
        }
      }),
    );

    // room:update → room metadata changed
    unsubscribers.push(
      MatrixClientService.on('room:update', (data: unknown) => {
        const { room } = data as { room: ChatRoom };
        const { rooms } = get();
        set({
          rooms: rooms.map(r => (r.roomId === room.roomId ? room : r)),
        });
      }),
    );
  }

  /* ── Restore saved credentials ── */
  const savedCredentials = loadCredentials();
  const isRestored = savedCredentials !== null;

  return {
    // Auth
    authStep: isRestored ? 'authenticated' : 'idle',
    authError: null,
    credentials: savedCredentials,
    currentUser: isRestored ? currentUser : null,

    // Rooms
    rooms: sampleRooms,
    activeRoomId: null,
    chatFilter: 'all',
    searchQuery: '',

    // Messages
    messages: {
      [kwameRoomId]: sampleMessages,
      [groupRoomId]: groupMessages,
    },

    // Typing
    typingByRoom: {},

    // UI state
    isComposing: false,
    replyingTo: null,
    activeThreadId: null,

    // Connection
    connectionStatus: 'disconnected',
    isSyncing: false,

    /* ──── Auth actions ──── */

    redeemInviteCode: async (code: string, staffId: string, displayName: string) => {
      set({ authStep: 'redeeming', authError: null });

      try {
        const creds = await MatrixClientService.redeemInviteCode(code, staffId, displayName);
        saveCredentials(creds);
        const user: GovUser = {
          userId: creds.userId,
          staffId: creds.staffId,
          displayName,
          department: '',
          ministry: '',
          role: 'user',
          isOnline: true,
          lastSeen: null,
        };
        set({
          authStep: 'authenticated',
          credentials: creds,
          currentUser: user,
        });
        get().initialize();
        return true;
      } catch (err) {
        console.warn('[GovChatStore] redeemInviteCode failed, falling back to local mode:', err);
      }

      // Local mode fallback: accept any code
      const localCreds: GovChatCredentials = {
        userId: `@${staffId}:govchat.gov.gh`,
        accessToken: `local_${Date.now()}`,
        homeserverUrl: 'https://govchat.gov.gh',
        staffId,
        deviceId: `local_device_${Date.now()}`,
      };
      saveCredentials(localCreds);
      const user: GovUser = {
        userId: localCreds.userId,
        staffId,
        displayName,
        department: 'Digital Services',
        ministry: 'Ministry of Communications',
        role: 'user',
        isOnline: true,
        lastSeen: null,
      };
      set({
        authStep: 'authenticated',
        credentials: localCreds,
        currentUser: user,
      });
      return true;
    },

    loginWithCredentials: async (credentials: GovChatCredentials) => {
      set({ connectionStatus: 'connecting', authError: null });

      try {
        await MatrixClientService.loginWithCredentials(credentials);
        saveCredentials(credentials);
        set({
          authStep: 'authenticated',
          credentials,
          connectionStatus: 'connected',
          currentUser: {
            userId: credentials.userId,
            staffId: credentials.staffId,
            displayName: 'You',
            department: '',
            ministry: '',
            role: 'user',
            isOnline: true,
            lastSeen: null,
          },
        });
        get().initialize();
        return true;
      } catch (err) {
        console.warn('[GovChatStore] loginWithCredentials failed:', err);
      }

      // Local mode fallback
      saveCredentials(credentials);
      set({
        authStep: 'authenticated',
        credentials,
        connectionStatus: 'disconnected',
        currentUser: {
          userId: credentials.userId,
          staffId: credentials.staffId,
          displayName: 'You',
          department: '',
          ministry: '',
          role: 'user',
          isOnline: true,
          lastSeen: null,
        },
      });
      return true;
    },

    continueLocalMode: () => {
      set({
        authStep: 'authenticated',
        currentUser: currentUser,
        connectionStatus: 'disconnected',
        rooms: sampleRooms,
        messages: {
          [kwameRoomId]: sampleMessages,
          [groupRoomId]: groupMessages,
        },
      });
    },

    logout: () => {
      // Unsubscribe all event listeners
      unsubscribers.forEach(unsub => unsub());
      unsubscribers.length = 0;
      listenersBound = false;

      // Tear down the Matrix client (fire-and-forget)
      MatrixClientService.destroy().catch(() => { /* silent */ });
      MatrixClientService.clearCredentials();

      clearCredentials();
      set({
        authStep: 'idle',
        authError: null,
        credentials: null,
        currentUser: null,
        connectionStatus: 'disconnected',
        isSyncing: false,
        activeRoomId: null,
        replyingTo: null,
        activeThreadId: null,
        typingByRoom: {},
        chatFilter: 'all',
        searchQuery: '',
        // Reset to sample data
        rooms: sampleRooms,
        messages: {
          [kwameRoomId]: sampleMessages,
          [groupRoomId]: groupMessages,
        },
      });
    },

    /* ──── Room actions ──── */

    selectRoom: (roomId: string | null) => {
      set({ activeRoomId: roomId, isComposing: false, replyingTo: null });
      if (roomId) {
        get().markRoomAsRead(roomId);
      }
    },

    createDirectRoom: async (userId: string) => {
      // Check if a DM with this user already exists
      const { rooms, messages } = get();
      const existing = rooms.find(
        r => r.isDirect && r.members.some(m => m.userId === userId),
      );
      if (existing) {
        set({ activeRoomId: existing.roomId, isComposing: false });
        return existing.roomId;
      }

      try {
        const roomId = await MatrixClientService.createDirectRoom(userId);
        if (roomId) {
          set({ activeRoomId: roomId });
          return roomId;
        }
      } catch (err) {
        console.warn('[GovChatStore] createDirectRoom failed, using local fallback:', err);
      }

      // Local mode fallback
      const contact = sampleContacts.find(c => c.userId === userId);
      if (!contact) return null;

      const roomId = `room-dm-${Date.now()}`;
      const newRoom: ChatRoom = {
        roomId,
        name: contact.displayName,
        isDirect: true,
        isEncrypted: true,
        classification: 'OFFICIAL',
        members: [currentUser, contact],
        lastMessage: null,
        unreadCount: 0,
        isPinned: false,
        retentionDays: DEFAULT_RETENTION_DAYS.OFFICIAL,
        createdAt: Date.now(),
      };
      set({
        rooms: [...rooms, newRoom],
        messages: { ...messages, [roomId]: [] },
        activeRoomId: roomId,
        isComposing: false,
      });
      return roomId;
    },

    createGroupRoom: async (
      name: string,
      userIds: string[],
      classification: ClassificationLevel,
    ) => {
      try {
        const roomId = await MatrixClientService.createGroupRoom(name, userIds, classification);
        if (roomId) {
          set({ activeRoomId: roomId });
          return roomId;
        }
      } catch (err) {
        console.warn('[GovChatStore] createGroupRoom failed, using local fallback:', err);
      }

      // Local mode fallback
      const { rooms, messages } = get();
      const members = [
        currentUser,
        ...sampleContacts.filter(c => userIds.includes(c.userId)),
      ];
      const roomId = `room-group-${Date.now()}`;
      const newRoom: ChatRoom = {
        roomId,
        name,
        isDirect: false,
        isEncrypted: true,
        classification,
        members,
        lastMessage: null,
        unreadCount: 0,
        isPinned: false,
        retentionDays: DEFAULT_RETENTION_DAYS[classification],
        createdAt: Date.now(),
      };
      set({
        rooms: [...rooms, newRoom],
        messages: { ...messages, [roomId]: [] },
        activeRoomId: roomId,
        isComposing: false,
      });
      return roomId;
    },

    deleteRoom: (roomId: string) => {
      const { rooms, messages, activeRoomId } = get();
      const { [roomId]: _, ...restMessages } = messages;
      set({
        rooms: rooms.filter(r => r.roomId !== roomId),
        messages: restMessages,
        activeRoomId: activeRoomId === roomId ? null : activeRoomId,
      });
    },

    togglePinRoom: (roomId: string) => {
      const { rooms } = get();
      set({
        rooms: rooms.map(r =>
          r.roomId === roomId ? { ...r, isPinned: !r.isPinned } : r,
        ),
      });
    },

    setRoomClassification: (roomId: string, level: ClassificationLevel) => {
      const { rooms } = get();
      set({
        rooms: rooms.map(r =>
          r.roomId === roomId
            ? { ...r, classification: level, retentionDays: DEFAULT_RETENTION_DAYS[level] }
            : r,
        ),
      });
    },

    setChatFilter: (filter: ChatFilter) => set({ chatFilter: filter }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setIsComposing: (v: boolean) => set({ isComposing: v }),

    /* ──── Message actions ──── */

    sendMessage: (roomId: string, body: string, classification?: ClassificationLevel) => {
      const { currentUser: user, messages, rooms, credentials, connectionStatus } = get();
      const senderId = user?.userId ?? CURRENT_USER_ID;
      const senderName = user?.displayName ?? 'You';
      const room = rooms.find(r => r.roomId === roomId);
      const msgClassification = classification ?? room?.classification ?? 'OFFICIAL';

      const eventId = `evt-${++msgCounter}-${Date.now()}`;
      const { replyingTo } = get();

      const message: GovChatMessage = {
        eventId,
        roomId,
        senderId,
        senderName,
        type: 'text',
        body,
        timestamp: Date.now(),
        status: credentials && connectionStatus === 'connected' ? 'sending' : 'sent',
        isEncrypted: true,
        classification: msgClassification,
        reactions: [],
        replyTo: replyingTo ?? undefined,
        mentions: [],
      };

      const roomMessages = [...(messages[roomId] || []), message];
      const updatedRooms = rooms.map(r =>
        r.roomId === roomId ? { ...r, lastMessage: message } : r,
      );
      set({
        messages: { ...messages, [roomId]: roomMessages },
        rooms: updatedRooms,
        replyingTo: null,
      });

      // Send via Matrix if connected
      if (connectionStatus === 'connected') {
        MatrixClientService.sendMessage(roomId, body)
          .then(() => {
            const { messages: currentMessages } = get();
            const updated = (currentMessages[roomId] || []).map(m =>
              m.eventId === eventId ? { ...m, status: 'sent' as const } : m,
            );
            set({ messages: { ...currentMessages, [roomId]: updated } });
          })
          .catch(() => {
            const { messages: currentMessages } = get();
            const updated = (currentMessages[roomId] || []).map(m =>
              m.eventId === eventId ? { ...m, status: 'failed' as const } : m,
            );
            set({ messages: { ...currentMessages, [roomId]: updated } });
          });
        return;
      }

      // Local mode: simulate delivery
      setTimeout(() => {
        const { messages: currentMessages } = get();
        const updated = (currentMessages[roomId] || []).map(m =>
          m.eventId === eventId ? { ...m, status: 'delivered' as const } : m,
        );
        set({ messages: { ...currentMessages, [roomId]: updated } });
      }, 1000);
    },

    sendFileMessage: async (roomId: string, file: File, classification?: ClassificationLevel) => {
      const { currentUser: user, messages, rooms } = get();
      const senderId = user?.userId ?? CURRENT_USER_ID;
      const senderName = user?.displayName ?? 'You';
      const room = rooms.find(r => r.roomId === roomId);
      const msgClassification = classification ?? room?.classification ?? 'OFFICIAL';

      const eventId = `evt-file-${++msgCounter}-${Date.now()}`;

      const message: GovChatMessage = {
        eventId,
        roomId,
        senderId,
        senderName,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        body: file.name,
        timestamp: Date.now(),
        status: 'sending',
        isEncrypted: true,
        classification: msgClassification,
        reactions: [],
        mentions: [],
        file: {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          url: URL.createObjectURL(file), // local blob URL for preview
        },
      };

      const roomMessages = [...(messages[roomId] || []), message];
      const updatedRooms = rooms.map(r =>
        r.roomId === roomId ? { ...r, lastMessage: message } : r,
      );
      set({
        messages: { ...messages, [roomId]: roomMessages },
        rooms: updatedRooms,
      });

      try {
        await MatrixClientService.sendFileMessage(roomId, file);
        const { messages: currentMessages } = get();
        const updated = (currentMessages[roomId] || []).map(m =>
          m.eventId === eventId ? { ...m, status: 'sent' as const } : m,
        );
        set({ messages: { ...currentMessages, [roomId]: updated } });
      } catch (err) {
        console.warn('[GovChatStore] sendFileMessage failed:', err);
        // Local fallback: mark as sent
        setTimeout(() => {
          const { messages: currentMessages } = get();
          const updated = (currentMessages[roomId] || []).map(m =>
            m.eventId === eventId ? { ...m, status: 'sent' as const } : m,
          );
          set({ messages: { ...currentMessages, [roomId]: updated } });
        }, 500);
      } finally {
        // Revoke blob URL to prevent memory leak
        if (message.file?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(message.file.url);
        }
      }
    },

    sendVoiceNote: async (roomId: string, blob: Blob, duration: number, waveform: number[]) => {
      const { currentUser: user, messages, rooms } = get();
      const senderId = user?.userId ?? CURRENT_USER_ID;
      const senderName = user?.displayName ?? 'You';
      const room = rooms.find(r => r.roomId === roomId);
      const msgClassification = room?.classification ?? 'OFFICIAL';

      const eventId = `evt-voice-${++msgCounter}-${Date.now()}`;

      const message: GovChatMessage = {
        eventId,
        roomId,
        senderId,
        senderName,
        type: 'voice',
        body: `Voice note (${Math.round(duration)}s)`,
        timestamp: Date.now(),
        status: 'sending',
        isEncrypted: true,
        classification: msgClassification,
        reactions: [],
        mentions: [],
        voiceNote: {
          duration,
          waveform,
          url: URL.createObjectURL(blob),
          mimeType: blob.type || 'audio/webm',
        },
      };

      const roomMessages = [...(messages[roomId] || []), message];
      const updatedRooms = rooms.map(r =>
        r.roomId === roomId ? { ...r, lastMessage: message } : r,
      );
      set({
        messages: { ...messages, [roomId]: roomMessages },
        rooms: updatedRooms,
      });

      try {
        await MatrixClientService.sendVoiceNote(roomId, blob, duration, waveform);
        const { messages: currentMessages } = get();
        const updated = (currentMessages[roomId] || []).map(m =>
          m.eventId === eventId ? { ...m, status: 'sent' as const } : m,
        );
        set({ messages: { ...currentMessages, [roomId]: updated } });
      } catch (err) {
        console.warn('[GovChatStore] sendVoiceNote failed:', err);
        // Local fallback
        setTimeout(() => {
          const { messages: currentMessages } = get();
          const updated = (currentMessages[roomId] || []).map(m =>
            m.eventId === eventId ? { ...m, status: 'sent' as const } : m,
          );
          set({ messages: { ...currentMessages, [roomId]: updated } });
        }, 500);
      } finally {
        // Revoke blob URL to prevent memory leak
        if (message.voiceNote?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(message.voiceNote.url);
        }
      }
    },

    addReaction: (roomId: string, eventId: string, emoji: string) => {
      const { messages, currentUser: user } = get();
      const senderId = user?.userId ?? CURRENT_USER_ID;

      const roomMessages = (messages[roomId] || []).map(m => {
        if (m.eventId !== eventId) return m;
        const existing = m.reactions.find(r => r.key === emoji);
        if (existing) {
          if (existing.senders.includes(senderId)) return m; // already reacted
          return {
            ...m,
            reactions: m.reactions.map(r =>
              r.key === emoji ? { ...r, senders: [...r.senders, senderId] } : r,
            ),
          };
        }
        return { ...m, reactions: [...m.reactions, { key: emoji, senders: [senderId] }] };
      });
      set({ messages: { ...messages, [roomId]: roomMessages } });

      // Send to server
      try {
        MatrixClientService.addReaction(roomId, eventId, emoji);
      } catch {
        // local only
      }
    },

    removeReaction: (roomId: string, eventId: string, emoji: string) => {
      const { messages, currentUser: user } = get();
      const senderId = user?.userId ?? CURRENT_USER_ID;

      const roomMessages = (messages[roomId] || []).map(m => {
        if (m.eventId !== eventId) return m;
        return {
          ...m,
          reactions: m.reactions
            .map(r =>
              r.key === emoji
                ? { ...r, senders: r.senders.filter(s => s !== senderId) }
                : r,
            )
            .filter(r => r.senders.length > 0),
        };
      });
      set({ messages: { ...messages, [roomId]: roomMessages } });

      // Send to server
      try {
        MatrixClientService.removeReaction(roomId, eventId, emoji);
      } catch {
        // local only
      }
    },

    setReplyingTo: (reply: ReplyTo | null) => set({ replyingTo: reply }),

    /* ──── Thread actions ──── */

    openThread: (eventId: string) => set({ activeThreadId: eventId }),
    closeThread: () => set({ activeThreadId: null }),

    /* ──── Lifecycle ──── */

    markRoomAsRead: (roomId: string) => {
      const { rooms, messages, currentUser: user } = get();
      const senderId = user?.userId ?? CURRENT_USER_ID;

      const roomMessages = (messages[roomId] || []).map(m => {
        if (m.senderId !== senderId && m.status !== 'read') {
          return { ...m, status: 'read' as const };
        }
        return m;
      });
      set({
        rooms: rooms.map(r =>
          r.roomId === roomId ? { ...r, unreadCount: 0 } : r,
        ),
        messages: { ...messages, [roomId]: roomMessages },
      });

      // Notify server
      try {
        MatrixClientService.markRoomAsRead(roomId);
      } catch {
        // local only
      }
    },

    initialize: () => {
      bindServiceListeners();

      const { credentials } = get();
      if (!credentials) {
        // Not authenticated — use sample data (already set as defaults)
        set({ connectionStatus: 'disconnected' });
        return;
      }

      set({ connectionStatus: 'connecting' });

      // Attempt to log in and load backend rooms; fall back to sample data on failure
      MatrixClientService.loginWithCredentials(credentials)
        .then(async () => {
          set({ connectionStatus: 'syncing', isSyncing: true });

          try {
            const backendRooms = await MatrixClientService.getRooms();

            if (backendRooms.length > 0) {
              const messagesByRoom: Record<string, GovChatMessage[]> = {};
              for (const room of backendRooms) {
                messagesByRoom[room.roomId] = [];
              }

              set({
                rooms: backendRooms,
                messages: messagesByRoom,
                connectionStatus: 'connected',
                isSyncing: false,
              });
            } else {
              // Backend reachable but no rooms — keep sample data
              set({ connectionStatus: 'connected', isSyncing: false });
            }
          } catch {
            // Failed to load data — keep sample data
            set({ connectionStatus: 'connected', isSyncing: false });
          }
        })
        .catch(() => {
          // Connection failed — stay in local mode with sample data
          set({ connectionStatus: 'disconnected', isSyncing: false });
        });
    },
  };
});

export { CURRENT_USER_ID };
