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
import { useNotificationStore } from '@/store/notifications';
import { useProfileStore } from '@/store/profile';

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

// No sample contacts — real users come from the Matrix homeserver and People directory

// No sample rooms or messages — real data comes from the Matrix homeserver

/* ──────────────── Counter for local message IDs ──────────────── */

let msgCounter = 100;

/* ──────────────── Prevent concurrent DM creation ──────────────── */

const pendingDMs = new Set<string>();

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
  createDirectRoom: (userId: string, displayName?: string) => Promise<string | null>;
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
  sendVoiceNote: (roomId: string, blob: Blob, duration: number, waveform: number[], dataUrl?: string) => Promise<void>;
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
  let initializeStarted = false;

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
          case 'SYNCING':
            set({ connectionStatus: 'connected', isSyncing: false });
            break;
          case 'ERROR':
            // Sync error — client is still usable for API calls, just retry sync
            // Don't show "Local mode" — keep showing "Connected" or "Syncing"
            set({ isSyncing: false });
            break;
          case 'STOPPED':
            // Only show disconnected if explicitly stopped (logout, etc.)
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

        // Dedup: don't add if we already have this event
        const existing = messages[roomId] || [];
        if (rawMsg.eventId && existing.some(m => m.eventId === rawMsg.eventId)) return;

        const convoMessages = [...existing, rawMsg];
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

        // Emit notification for messages in non-active rooms
        if (!isActiveRoom) {
          useNotificationStore.getState().addNotification({
            type: 'chat',
            title: `Message from ${rawMsg.senderName}`,
            message: rawMsg.body.slice(0, 100),
            source: 'govchat',
            icon: '\u{1F4AC}',
            actionLabel: 'Open Chat',
            actionRoute: 'govchat',
            actionData: { roomId },
          });
        }

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
        // Only add if not already present (check by roomId AND by name for DMs)
        const existsById = rooms.some(r => r.roomId === room.roomId);
        const existsByName = room.isDirect && rooms.some(
          r => r.isDirect && r.name === room.name && r.roomId !== room.roomId,
        );
        if (!existsById && !existsByName) {
          set({
            rooms: [...rooms, room],
            messages: { ...messages, [room.roomId]: messages[room.roomId] ?? [] },
          });
        } else if (existsByName && !existsById) {
          // Replace the local room with the Matrix room (has the real roomId)
          set({
            rooms: rooms.map(r =>
              r.isDirect && r.name === room.name ? room : r,
            ),
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

  // Build currentUser from saved credentials (not the generic hardcoded one)
  const restoredUser: GovUser | null = isRestored
    ? {
        userId: savedCredentials!.userId,
        staffId: savedCredentials!.staffId,
        displayName: 'You', // Will be enriched from /auth/me
        department: '',
        ministry: '',
        role: 'user',
        isOnline: true,
        lastSeen: null,
      }
    : null;

  return {
    // Auth
    authStep: isRestored ? 'authenticated' : 'idle',
    authError: null,
    credentials: savedCredentials,
    currentUser: restoredUser,

    // Rooms
    rooms: [],
    activeRoomId: null,
    chatFilter: 'all',
    searchQuery: '',

    // Messages
    messages: {
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

      // Helper to complete auth after getting credentials
      const completeAuth = async (creds: GovChatCredentials, name: string) => {
        saveCredentials(creds);
        let userRole: 'user' | 'admin' | 'superadmin' = 'user';
        let dept = '';
        let min = '';
        try {
          const meRes = await fetch(
            'https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/auth/me',
            { headers: { Authorization: `Bearer ${creds.accessToken}` } },
          );
          if (meRes.ok) {
            const meData = await meRes.json() as { role?: string; department?: string; ministry?: string };
            userRole = (meData.role as 'user' | 'admin' | 'superadmin') ?? 'user';
            dept = meData.department ?? '';
            min = meData.ministry ?? '';
          }
        } catch { /* default to 'user' */ }

        const user: GovUser = {
          userId: creds.userId,
          staffId: creds.staffId,
          displayName: name,
          department: dept,
          ministry: min,
          role: userRole,
          isOnline: true,
          lastSeen: null,
        };
        set({ authStep: 'authenticated', credentials: creds, currentUser: user });
        useProfileStore.getState().setProfile({
          displayName: name,
          staffId: creds.staffId,
          department: dept,
          ministry: min,
        });
        get().initialize();
      };

      // 1. Try login-by-staffId first (for existing users, no invite code needed)
      try {
        const loginRes = await fetch(
          'https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/auth/login',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId, displayName }),
          },
        );
        if (loginRes.ok) {
          const data = await loginRes.json() as any;
          const creds: GovChatCredentials = {
            userId: data.userId,
            accessToken: data.accessToken,
            matrixToken: data.matrixToken || undefined,
            homeserverUrl: data.homeserverUrl,
            staffId: data.staffId,
            deviceId: data.deviceId,
          };
          await completeAuth(creds, displayName);
          return true;
        }
      } catch {
        // Login endpoint failed — try invite code redemption
      }

      // 2. Try invite code redemption (for new users)
      try {
        const creds = await MatrixClientService.redeemInviteCode(code, staffId, displayName);
        await completeAuth(creds, displayName);
        return true;
      } catch (err) {
        console.warn('[GovChatStore] redeemInviteCode failed, falling back to local mode:', err);
      }

      // Local mode fallback: accept any code
      const localCreds: GovChatCredentials = {
        userId: `@${staffId}:gov.gh`,
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
        rooms: [],
        messages: {},
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
      useProfileStore.getState().clearProfile();
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
        rooms: [],
        messages: {},
      });
    },

    /* ──── Room actions ──── */

    selectRoom: (roomId: string | null) => {
      set({ activeRoomId: roomId, isComposing: false, replyingTo: null });
      if (roomId) {
        get().markRoomAsRead(roomId);
      }
    },

    createDirectRoom: async (userId: string, displayName?: string) => {
      // Check if a DM with this user already exists
      const { rooms, messages } = get();
      const existing = rooms.find(
        r => r.isDirect && (
          r.members.some(m => m.userId === userId) ||
          (displayName && r.name === displayName)
        ),
      );
      if (existing) {
        set({ activeRoomId: existing.roomId, isComposing: false });
        return existing.roomId;
      }

      // Prevent concurrent creation for the same user
      if (pendingDMs.has(userId)) {
        // Wait for the first call to finish, then find the room
        await new Promise(r => setTimeout(r, 2000));
        const retryRooms = get().rooms;
        const found = retryRooms.find(
          r => r.isDirect && (
            r.members.some(m => m.userId === userId) ||
            (displayName && r.name === displayName)
          ),
        );
        if (found) {
          set({ activeRoomId: found.roomId, isComposing: false });
          return found.roomId;
        }
        return null;
      }
      pendingDMs.add(userId);

      try {
        const roomId = await MatrixClientService.createDirectRoom(userId);
        if (roomId) {
          // Check again — sync may have added it while we were creating
          const currentRooms = get().rooms;
          if (!currentRooms.some(r => r.roomId === roomId)) {
            const peerUser: GovUser = {
              userId,
              staffId: userId.replace('@', '').split(':')[0],
              displayName: displayName || userId,
              department: '',
              ministry: '',
              role: 'user',
              isOnline: true,
              lastSeen: null,
            };
            const newRoom: ChatRoom = {
              roomId,
              name: displayName || userId,
              isDirect: true,
              isEncrypted: false,
              classification: 'OFFICIAL',
              members: [get().currentUser || currentUser, peerUser],
              lastMessage: null,
              unreadCount: 0,
              isPinned: false,
              retentionDays: DEFAULT_RETENTION_DAYS.OFFICIAL,
              createdAt: Date.now(),
            };
            set({
              rooms: [...currentRooms, newRoom],
              messages: { ...get().messages, [roomId]: [] },
              activeRoomId: roomId,
            });
          } else {
            set({ activeRoomId: roomId });
          }
          pendingDMs.delete(userId);
          return roomId;
        }
      } catch (err) {
        console.warn('[GovChatStore] createDirectRoom via Matrix failed, using local fallback:', err);
      }

      // Local mode fallback
      const peerName = displayName || userId;
      const peerUser: GovUser = {
        userId,
        staffId: userId.replace('@', '').split(':')[0],
        displayName: peerName,
        department: '',
        ministry: '',
        role: 'user',
        isOnline: true,
        lastSeen: null,
      };
      const roomId = `room-dm-${Date.now()}`;
      const newRoom: ChatRoom = {
        roomId,
        name: peerName,
        isDirect: true,
        isEncrypted: false,
        classification: 'OFFICIAL',
        members: [get().currentUser || currentUser, peerUser],
        lastMessage: null,
        unreadCount: 0,
        isPinned: false,
        retentionDays: DEFAULT_RETENTION_DAYS.OFFICIAL,
        createdAt: Date.now(),
      };
      set({
        rooms: [...get().rooms, newRoom],
        messages: { ...get().messages, [roomId]: [] },
        activeRoomId: roomId,
        isComposing: false,
      });
      pendingDMs.delete(userId);
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
        // Members will be populated from Matrix room data
      ];
      const roomId = `room-group-${Date.now()}`;
      const newRoom: ChatRoom = {
        roomId,
        name,
        isDirect: false,
        isEncrypted: false,
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

      // Can send if we have a matrixToken (raw HTTP doesn't need SDK sync status)
      const hasMatrixToken = !!(credentials?.matrixToken);
      const canSendViaMatrix = hasMatrixToken && !credentials?.accessToken.startsWith('local_');

      const message: GovChatMessage = {
        eventId,
        roomId,
        senderId,
        senderName,
        type: 'text',
        body,
        timestamp: Date.now(),
        status: canSendViaMatrix ? 'sending' : 'sent',
        isEncrypted: false,
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

      // Send via Matrix if we have valid credentials (raw HTTP bypasses SDK encryption)
      if (canSendViaMatrix) {
        MatrixClientService.sendMessage(roomId, body)
          .then(() => {
            const { messages: currentMessages } = get();
            const updated = (currentMessages[roomId] || []).map(m =>
              m.eventId === eventId ? { ...m, status: 'sent' as const } : m,
            );
            set({ messages: { ...currentMessages, [roomId]: updated } });
          })
          .catch((err) => {
            console.error('[GovChatStore] sendMessage failed:', err);
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
        isEncrypted: false,
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
      }
      // Keep blob URL alive for preview/download — will be cleaned up on page reload
    },

    sendVoiceNote: async (roomId: string, blob: Blob, duration: number, waveform: number[], dataUrl?: string) => {
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
        isEncrypted: false,
        classification: msgClassification,
        reactions: [],
        mentions: [],
        voiceNote: {
          duration,
          waveform,
          url: dataUrl || URL.createObjectURL(blob),
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
      }
      // Note: blob URL is kept alive for playback — will be cleaned up on room delete or retention
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
      // Prevent double initialization (Provider + Panel both call this)
      if (initializeStarted) return;
      initializeStarted = true;

      bindServiceListeners();

      const { credentials } = get();
      if (!credentials) {
        set({ connectionStatus: 'disconnected' });
        initializeStarted = false;
        return;
      }

      // Local-mode credentials (generated by fallback) skip Matrix connection
      const isLocalCredentials = credentials.accessToken.startsWith('local_');
      if (isLocalCredentials) {
        set({ connectionStatus: 'disconnected', isSyncing: false });
        initializeStarted = false;
        return;
      }

      set({ connectionStatus: 'connecting' });

      // Fetch user profile + matrixToken from /auth/me, then connect
      const enrichAndConnect = async () => {
        // 1. Fetch user profile from worker (enriches displayName, role, matrixToken)
        let enrichedCreds = { ...credentials };
        try {
          const meRes = await fetch(
            'https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/auth/me',
            { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
          );
          if (meRes.ok) {
            const meData = await meRes.json() as {
              userId?: string;
              staffId?: string;
              displayName?: string;
              department?: string;
              ministry?: string;
              role?: string;
              matrixToken?: string;
              deviceId?: string;
            };

            console.info('[GovChatStore] /auth/me response:', {
              userId: meData.userId,
              displayName: meData.displayName,
              hasMatrixToken: !!meData.matrixToken,
              role: meData.role,
            });

            // Update currentUser with real profile data
            const serverUserId = meData.userId || credentials.userId;
            const user: GovUser = {
              userId: serverUserId,
              staffId: meData.staffId || credentials.staffId,
              displayName: meData.displayName || 'You',
              department: meData.department || '',
              ministry: meData.ministry || '',
              role: (meData.role as 'user' | 'admin' | 'superadmin') || 'user',
              isOnline: true,
              lastSeen: null,
            };
            set({ currentUser: user });

            // Sync enriched profile to shared store
            useProfileStore.getState().setProfile({
              displayName: user.displayName,
              staffId: user.staffId,
              department: user.department,
              ministry: user.ministry,
            });

            // Always update credentials from server — ensures matrixToken + deviceId migration
            enrichedCreds = {
              ...credentials,
              userId: serverUserId,
              matrixToken: meData.matrixToken || credentials.matrixToken,
              deviceId: meData.deviceId || credentials.deviceId,
            };
            set({ credentials: enrichedCreds });
            saveCredentials(enrichedCreds);
          } else {
            console.warn('[GovChatStore] /auth/me failed:', meRes.status);
          }
        } catch (fetchErr) {
          console.warn('[GovChatStore] /auth/me fetch error:', fetchErr);
        }

        // 2. Connect to Matrix if we have a matrixToken
        if (!enrichedCreds.matrixToken) {
          console.warn('[GovChatStore] No matrixToken — running in API-only mode');
          set({ connectionStatus: 'connected', isSyncing: false });
          return;
        }

        // 3. Attempt Matrix login with timeout
        const loginTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 15000),
        );

        try {
          await Promise.race([
            MatrixClientService.loginWithCredentials(enrichedCreds),
            loginTimeout,
          ]);

          set({ connectionStatus: 'connected', isSyncing: true });

          // Set presence to online
          MatrixClientService.setPresence(true).catch(() => {});

          // Give sync a moment to populate rooms
          await new Promise(r => setTimeout(r, 2000));
          const backendRooms = await MatrixClientService.getRooms();

          if (backendRooms.length > 0) {
            const messagesByRoom: Record<string, GovChatMessage[]> = {};
            for (const room of backendRooms) {
              messagesByRoom[room.roomId] = [];
            }
            set({
              rooms: backendRooms,
              messages: messagesByRoom,
              isSyncing: false,
            });
          } else {
            set({ isSyncing: false });
          }
        } catch {
          // Matrix connection failed — still functional via worker API
          set({ connectionStatus: 'connected', isSyncing: false });
        }
      };

      enrichAndConnect();
    },
  };
});

export { CURRENT_USER_ID };
