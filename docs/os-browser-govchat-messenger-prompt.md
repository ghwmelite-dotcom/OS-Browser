# Claude Code Prompt: OS Browser — E2E Encrypted Government Messenger ("GovChat")

## Copy everything below this line and paste into Claude Code:

---

I'm building **OS Browser**, a desktop browser (React + Electron) for Ghana's civil and public service. I need you to build a **full-featured, end-to-end encrypted messenger** integrated into the browser's Kente Sidebar called **"GovChat"**.

This messenger must be the **best of both worlds**: the rich, fun, engaging UX of Facebook Messenger or Yahoo Messenger (reactions, GIFs, voice notes, typing indicators, read receipts, message threads, stickers) combined with **government-grade security** (E2E encryption, .gov.gh-only access, message retention policies, audit trails, data sovereignty).

**The messenger uses the Matrix protocol** — the same open standard used by the German Armed Forces (BwMessenger, 100,000+ users), the French government (Tchap), NATO, the International Criminal Court, the German healthcare system (74 million citizens), and Luxembourg. Matrix provides E2E encryption via the Olm/Megolm cryptographic ratchet (based on the Signal Protocol's Double Ratchet), decentralized federation, and full data sovereignty.

---

## Tech Stack

- **Protocol**: Matrix (via `matrix-js-sdk` npm package)
- **E2E Encryption**: Matrix's Olm/Megolm (bundled in matrix-js-sdk, uses libolm WASM)
- **Frontend**: React 18+ with TypeScript, TailwindCSS 3+, Framer Motion
- **State Management**: Zustand
- **Desktop Runtime**: Electron 28+ (messenger runs in the renderer process alongside the browser chrome)
- **Backend Homeserver**: Synapse (Python, self-hosted) or Conduit (Rust, lightweight alternative)
- **Media Storage**: Homeserver's built-in media repo (or Cloudflare R2 via media proxy)
- **Real-time**: Matrix's `/sync` long-polling (built into matrix-js-sdk)
- **Local Storage**: IndexedDB via matrix-js-sdk's built-in store for offline message cache + crypto keys
- **Icons**: `lucide-react`
- **Rich Text**: Markdown rendering via `marked` or `react-markdown`
- **Voice Notes**: Web Audio API + Opus encoding via `opus-recorder`

---

## Architecture Overview

GovChat is NOT a separate app — it's a **sidebar panel** inside OS Browser that slides open from the Kente Sidebar's icon rail. It connects to a Matrix homeserver hosted by the Ghana government (OHCS or NITA), ensuring all data stays on Ghanaian infrastructure.

```
┌──────────────────────────────────────────────────────────────────┐
│ OS Browser Chrome (tabs, address bar)                            │
├──────┬───────────────────────┬───────────────────────────────────┤
│ Icon │                       │                                   │
│ Rail │   GovChat Sidebar     │      Web Content                  │
│      │   (320-400px)         │      (BrowserView)                │
│  🏛  │                       │                                   │
│ [💬] │  ┌─────────────────┐  │                                   │
│  📄  │  │ Chat List /      │  │                                   │
│  ✨  │  │ Active Chat /    │  │                                   │
│  👤  │  │ Contact Picker   │  │                                   │
│  ☁  │  └─────────────────┘  │                                   │
│  💳  │                       │                                   │
│      │                       │                                   │
│  ⚙  │                       │                                   │
├──────┴───────────────────────┴───────────────────────────────────┤
│ Status Bar                                                       │
└──────────────────────────────────────────────────────────────────┘
```

### Why Matrix over a custom protocol:

1. **Government-proven**: Used by 10+ national governments including NATO
2. **E2E encryption built-in**: Olm (1:1) and Megolm (group) — based on Signal's Double Ratchet
3. **Data sovereignty**: Ghana hosts its own homeserver, owns all data
4. **Federation**: OHCS can federate with other ministries, each running their own server
5. **Open standard**: No vendor lock-in, auditable, well-documented
6. **Mature SDK**: `matrix-js-sdk` is the same library powering Element (used by millions)
7. **Offline support**: SDK has built-in IndexedDB storage for offline message access

---

## File Structure

```
src/
├── renderer/
│   ├── components/
│   │   └── messenger/
│   │       ├── GovChatPanel.tsx              # Main sidebar panel (registered in Kente Sidebar)
│   │       ├── GovChatProvider.tsx            # Matrix client context provider
│   │       │
│   │       ├── views/
│   │       │   ├── ChatListView.tsx           # Conversation list (default view)
│   │       │   ├── ChatView.tsx               # Active conversation
│   │       │   ├── ContactPickerView.tsx      # New message / Add contacts
│   │       │   ├── RoomInfoView.tsx           # Chat/group details
│   │       │   ├── LoginView.tsx              # Authentication
│   │       │   └── SettingsView.tsx           # Messenger settings
│   │       │
│   │       ├── chat-list/
│   │       │   ├── ChatListHeader.tsx         # Search + New chat button
│   │       │   ├── ChatListItem.tsx           # Individual conversation row
│   │       │   ├── ChatListFilter.tsx         # Filter chips (All, Unread, Groups, DMs)
│   │       │   └── ChatListEmpty.tsx          # Empty state with Adinkra symbol
│   │       │
│   │       ├── chat/
│   │       │   ├── ChatHeader.tsx             # Name, avatar, encryption badge, actions
│   │       │   ├── MessageList.tsx            # Virtualized message list
│   │       │   ├── MessageBubble.tsx          # Individual message
│   │       │   ├── MessageInput.tsx           # Compose bar (text, attachments, voice)
│   │       │   ├── MessageReactions.tsx       # Emoji reactions on messages
│   │       │   ├── MessageThread.tsx          # Thread/reply view
│   │       │   ├── MessageStatus.tsx          # Sent/Delivered/Read indicators
│   │       │   ├── MessageMedia.tsx           # Image/file/voice note renderer
│   │       │   ├── TypingIndicator.tsx        # "Kofi is typing..." animation
│   │       │   ├── DateSeparator.tsx          # "Today", "Yesterday", date headers
│   │       │   ├── SystemMessage.tsx          # "Ama joined the group" etc.
│   │       │   ├── EncryptionBadge.tsx        # Lock icon + "E2E Encrypted" indicator
│   │       │   ├── VoiceNoteRecorder.tsx      # Press-and-hold voice recording
│   │       │   ├── EmojiPicker.tsx            # Emoji + sticker picker
│   │       │   ├── AttachmentPicker.tsx       # File, image, document picker
│   │       │   └── MessageContextMenu.tsx     # Right-click: reply, react, copy, delete, forward
│   │       │
│   │       ├── contacts/
│   │       │   ├── ContactList.tsx            # Directory of civil servants
│   │       │   ├── ContactCard.tsx            # Name, ministry, department, rank
│   │       │   ├── ContactSearch.tsx          # Search by name, staff ID, ministry
│   │       │   └── GroupCreator.tsx           # Create group with name, avatar, members
│   │       │
│   │       ├── security/
│   │       │   ├── VerificationDialog.tsx     # Device verification (emoji comparison)
│   │       │   ├── KeyBackupSetup.tsx         # Cross-signing key backup
│   │       │   ├── SecurityInfo.tsx           # Encryption details for a chat
│   │       │   └── SessionManager.tsx         # Manage logged-in devices
│   │       │
│   │       └── shared/
│   │           ├── Avatar.tsx                 # User/group avatar with presence dot
│   │           ├── PresenceIndicator.tsx      # Online/away/offline dot
│   │           ├── MinistryBadge.tsx          # Ministry/department label
│   │           ├── ClassificationBanner.tsx   # "INTERNAL" / "CONFIDENTIAL" banner
│   │           └── MessageRetentionNotice.tsx # Auto-delete timer notice
│   │
│   ├── stores/
│   │   └── useMessengerStore.ts               # Zustand store
│   │
│   ├── services/
│   │   ├── MatrixClientService.ts             # Matrix client initialization & lifecycle
│   │   ├── NotificationService.ts             # Desktop notifications for messages
│   │   └── VoiceNoteService.ts                # Audio recording & playback
│   │
│   └── utils/
│       ├── matrixHelpers.ts                   # Room/event helper functions
│       ├── messageFormatter.ts                # Markdown/rich text rendering
│       └── govDirectory.ts                    # Civil servant directory helpers
│
├── main/
│   ├── services/
│   │   └── MessengerIPC.ts                    # IPC handlers for notifications, file access
│   └── ipc/
│       └── messenger-handlers.ts
│
└── types/
    └── messenger.ts                           # All TypeScript interfaces
```

---

## 1. Types (`src/types/messenger.ts`)

```typescript
// ─── GOVERNMENT-SPECIFIC TYPES ────────────────────────────

export interface GovUser {
  matrixUserId: string;           // @kofi.mensah:govchat.gov.gh
  displayName: string;
  staffId: string;
  ghanaCardNumber?: string;       // Masked
  ministry: string;
  department: string;
  rank: string;
  officialEmail: string;          // Must end in .gov.gh
  avatarUrl?: string;
  presence: 'online' | 'away' | 'offline';
  lastSeen?: number;
}

export type MessageClassification =
  | 'unclassified'    // Default — normal work chat
  | 'internal'        // For internal use only
  | 'confidential'    // Sensitive government info
  | 'restricted';     // Highest level — limited distribution

export interface ChatRoom {
  roomId: string;
  name: string;
  type: 'dm' | 'group' | 'channel' | 'ministry-channel';
  avatarUrl?: string;
  members: GovUser[];
  memberCount: number;
  lastMessage?: LastMessage;
  unreadCount: number;
  isEncrypted: boolean;
  classification: MessageClassification;
  retentionDays?: number;         // Auto-delete after N days (policy-driven)
  isPinned: boolean;
  isMuted: boolean;
  ministry?: string;              // For ministry-specific channels
}

export interface LastMessage {
  body: string;
  sender: string;
  senderName: string;
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'voice' | 'system';
}

export interface GovChatMessage {
  eventId: string;
  roomId: string;
  sender: GovUser;
  body: string;
  formattedBody?: string;         // HTML/Markdown rendered
  type: 'text' | 'image' | 'file' | 'voice' | 'sticker' | 'system';
  timestamp: number;
  editedAt?: number;
  replyTo?: string;               // Event ID of parent message
  threadId?: string;              // Thread root event ID
  reactions: Map<string, string[]>; // emoji → list of user IDs
  readBy: string[];               // User IDs who have read this
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isEncrypted: boolean;
  classification: MessageClassification;
  attachment?: MessageAttachment;
}

export interface MessageAttachment {
  filename: string;
  mimeType: string;
  size: number;
  url: string;                    // mxc:// URI
  thumbnailUrl?: string;
  duration?: number;              // For voice notes, in seconds
  width?: number;                 // For images
  height?: number;
}

// ─── VIEW STATE ────────────────────────────────────────────

export type MessengerView =
  | 'login'
  | 'chat-list'
  | 'chat'
  | 'contacts'
  | 'room-info'
  | 'settings'
  | 'verification';
```

---

## 2. Matrix Client Service (`src/renderer/services/MatrixClientService.ts`)

This is the core service that initializes and manages the Matrix client connection.

```typescript
import * as sdk from 'matrix-js-sdk';

/**
 * Initializes the Matrix client with:
 * - IndexedDB-backed crypto store (for E2E encryption keys)
 * - IndexedDB-backed sync store (for offline message access)
 * - Automatic E2E encryption for all rooms
 * - Cross-signing support for device verification
 */
export class MatrixClientService {
  private client: sdk.MatrixClient | null = null;
  private static instance: MatrixClientService;

  static getInstance(): MatrixClientService {
    if (!MatrixClientService.instance) {
      MatrixClientService.instance = new MatrixClientService();
    }
    return MatrixClientService.instance;
  }

  /**
   * Initialize and start the Matrix client.
   * 
   * The homeserver URL should point to Ghana's government Matrix server.
   * Example: https://govchat.gov.gh or https://matrix.ohcs.gov.gh
   * 
   * Authentication uses .gov.gh email verification:
   * 1. User enters their .gov.gh email + staff ID
   * 2. Server sends a verification code to the email
   * 3. User enters the code → receives access_token
   * 4. Token is stored securely via Electron's safeStorage
   */
  async initialize(homeserverUrl: string, accessToken: string, userId: string): Promise<sdk.MatrixClient> {
    // Create IndexedDB stores for crypto and sync
    const cryptoStore = new sdk.IndexedDBCryptoStore(
      indexedDB, 'govchat-crypto'
    );
    const store = new sdk.IndexedDBStore({
      indexedDB,
      dbName: 'govchat-sync',
    });
    await store.startup();

    this.client = sdk.createClient({
      baseUrl: homeserverUrl,
      accessToken,
      userId,
      store,
      cryptoStore,
      deviceId: await this.getOrCreateDeviceId(),
      timelineSupport: true,
      // Enable threading support
      experimentalThreadSupport: true,
    });

    // Initialize crypto (E2E encryption)
    await this.client.initCrypto();

    // Enable cross-signing for device verification
    await this.client.bootstrapCrossSigning({
      authUploadDeviceSigningKeys: async (makeRequest) => {
        // In production, prompt user for password/PIN here
        await makeRequest({});
      },
    });

    // Auto-enable E2E encryption for all new rooms
    this.client.setGlobalErrorOnUnknownDevices(false);
    this.client.getCrypto()?.setDeviceVerificationSetting(true);

    // Start syncing
    await this.client.startClient({
      initialSyncLimit: 20,        // Load last 20 messages per room on first sync
      lazyLoadMembers: true,       // Don't load full member lists until needed
    });

    // Wait for initial sync to complete
    await new Promise<void>((resolve) => {
      this.client!.once(sdk.ClientEvent.Sync, (state) => {
        if (state === 'PREPARED') resolve();
      });
    });

    return this.client;
  }

  getClient(): sdk.MatrixClient | null {
    return this.client;
  }

  async logout(): Promise<void> {
    if (this.client) {
      await this.client.logout(true);
      await this.client.clearStores();
      this.client = null;
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    // Store device ID persistently so encryption keys persist across restarts
    let deviceId = localStorage.getItem('govchat-device-id');
    if (!deviceId) {
      deviceId = `OSBROWSER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('govchat-device-id', deviceId);
    }
    return deviceId;
  }
}
```

---

## 3. Zustand Store (`src/renderer/stores/useMessengerStore.ts`)

```typescript
interface MessengerState {
  // Connection
  isConnected: boolean;
  isSyncing: boolean;
  client: MatrixClient | null;
  currentUser: GovUser | null;

  // Navigation
  currentView: MessengerView;
  activeRoomId: string | null;

  // Data
  rooms: ChatRoom[];
  messages: Map<string, GovChatMessage[]>;  // roomId → messages
  typingUsers: Map<string, string[]>;       // roomId → userIds typing

  // UI State
  searchQuery: string;
  filter: 'all' | 'unread' | 'groups' | 'dms';
  isRecordingVoice: boolean;
  replyingTo: GovChatMessage | null;
  editingMessage: GovChatMessage | null;

  // Unread tracking
  totalUnreadCount: number;

  // Actions — Connection
  login: (homeserver: string, email: string, staffId: string, verificationCode: string) => Promise<void>;
  logout: () => Promise<void>;

  // Actions — Navigation
  setView: (view: MessengerView) => void;
  openChat: (roomId: string) => void;
  goBack: () => void;

  // Actions — Messaging
  sendMessage: (roomId: string, body: string, options?: {
    replyTo?: string;
    threadId?: string;
    classification?: MessageClassification;
  }) => Promise<void>;
  sendImage: (roomId: string, file: File) => Promise<void>;
  sendFile: (roomId: string, file: File) => Promise<void>;
  sendVoiceNote: (roomId: string, audioBlob: Blob, duration: number) => Promise<void>;
  editMessage: (roomId: string, eventId: string, newBody: string) => Promise<void>;
  deleteMessage: (roomId: string, eventId: string) => Promise<void>;
  addReaction: (roomId: string, eventId: string, emoji: string) => Promise<void>;
  removeReaction: (roomId: string, eventId: string, emoji: string) => Promise<void>;
  markAsRead: (roomId: string) => Promise<void>;

  // Actions — Rooms
  createDM: (userId: string) => Promise<string>;
  createGroup: (name: string, memberIds: string[], classification: MessageClassification) => Promise<string>;
  createMinistryChannel: (name: string, ministry: string, description: string) => Promise<string>;
  leaveRoom: (roomId: string) => Promise<void>;
  inviteToRoom: (roomId: string, userId: string) => Promise<void>;
  pinRoom: (roomId: string) => void;
  muteRoom: (roomId: string) => void;
  setRoomClassification: (roomId: string, classification: MessageClassification) => Promise<void>;
  setRetentionPolicy: (roomId: string, days: number) => Promise<void>;

  // Actions — Search
  setSearchQuery: (query: string) => void;
  setFilter: (filter: 'all' | 'unread' | 'groups' | 'dms') => void;
  searchMessages: (query: string) => Promise<GovChatMessage[]>;

  // Actions — Security
  verifyDevice: (userId: string, deviceId: string) => Promise<void>;
  getSessionInfo: () => { deviceId: string; deviceKey: string; sessions: number };
}
```

---

## 4. Key UI Components

### `GovChatPanel.tsx` — Main Sidebar Panel

This is registered in the Kente Sidebar's Feature Registry as the messenger's panel component. It manages view routing within the sidebar.

Structure:
- Wraps everything in `<GovChatProvider>` (provides Matrix client context)
- Routes between views: Login → ChatList → Chat → Contacts → RoomInfo → Settings
- Transitions between views use Framer Motion slide animations (left/right)
- Width: inherits from sidebar panel (280-400px)

### `ChatListView.tsx` — Conversation List

The default landing view. Resembles Facebook Messenger's chat list.

**Layout:**
```
┌──────────────────────────────┐
│ GovChat            ⚙ [+]    │ ← Header with settings + new chat
├──────────────────────────────┤
│ 🔍 Search messages...       │ ← Search bar
├──────────────────────────────┤
│ [All] [Unread] [Groups] [DMs] │ ← Filter chips
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ 📌 OHCS Directors        │ │ ← Pinned chats (if any)
│ │    Last: Budget approved  │ │
│ │    10:42 AM        (3)   │ │ ← Unread badge
│ ├──────────────────────────┤ │
│ │ 👤 Kofi Mensah           │ │ ← DM
│ │    Ministry of Finance    │ │ ← Ministry badge
│ │    Thanks for the update  │ │
│ │    9:31 AM          ✓✓   │ │ ← Read receipt
│ ├──────────────────────────┤ │
│ │ 👥 IT Department          │ │ ← Group
│ │    🔒 E2E Encrypted      │ │ ← Encryption badge
│ │    Ama: Server is back up │ │
│ │    Yesterday        (12) │ │
│ └──────────────────────────┘ │
│            ...                │
└──────────────────────────────┘
```

**ChatListItem.tsx details:**
- Avatar (40px circle): User photo or group icon. Presence dot (green/yellow/gray) at bottom-right for DMs.
- Name: 13px weight 500. For groups, show group name. For DMs, show user's display name.
- Ministry badge: small colored chip below the name showing ministry/department (e.g., "Finance" in a subtle pill).
- Last message: 12px, `var(--os-text-secondary)`, single line truncated. For groups, prefix with sender name ("Ama: ...").
- Timestamp: 11px, right-aligned.
- Unread badge: circle with count, `var(--os-error)` bg.
- Encryption indicator: small lock icon next to the timestamp for encrypted rooms.
- Right-click context menu: Pin/Unpin, Mute/Unmute, Mark as Read, Leave Chat.
- Swipe left (or long press): Quick actions — Pin, Mute, Archive.

### `ChatView.tsx` — Active Conversation

The full chat view. This is where the Messenger magic happens.

**Layout:**
```
┌──────────────────────────────┐
│ ← Kofi Mensah     🔒 📞 ⋮  │ ← ChatHeader (back, name, encryption, call, menu)
│   Ministry of Finance • Online │
├──────────────────────────────┤
│ ┌──── CONFIDENTIAL ────────┐ │ ← Classification banner (if set)
│ │ This chat is classified   │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│                              │
│       ── Today ──            │ ← DateSeparator
│                              │
│                 ┌──────────┐ │
│                 │ Hi Ozzy, │ │ ← Received message (left-aligned)
│                 │ the report│ │
│                 │ is ready  │ │
│                 │ 10:42 AM  │ │
│                 │ 😀 👍 (2) │ │ ← Reactions
│                 └──────────┘ │
│ ┌──────────┐                 │
│ │ Great,   │                 │ ← Sent message (right-aligned, gold tint)
│ │ sending  │                 │
│ │ now      │                 │
│ │ 10:43 ✓✓ │                 │ ← Read receipts
│ └──────────┘                 │
│                              │
│ 💬 Kofi is typing...         │ ← TypingIndicator
│                              │
├──────────────────────────────┤
│ ↩ Replying to Kofi...   ✕   │ ← Reply preview (if replying)
├──────────────────────────────┤
│ [😊] [📎] Type a message... [🎤] │ ← MessageInput
└──────────────────────────────┘
```

### `MessageBubble.tsx` — Individual Message

The most important visual component. Must feel as polished as Facebook Messenger.

**Sent messages (right-aligned):**
- Background: `var(--os-accent)` at 15% opacity (subtle gold tint — Ghana gold)
- Border-radius: 16px 16px 4px 16px (flat on bottom-right, the "tail" side)
- Text: `var(--os-text-primary)`, 13px
- Timestamp: 10px, `var(--os-text-tertiary)`, bottom-right
- Status indicators after timestamp: ✓ (sent), ✓✓ (delivered), blue ✓✓ (read)

**Received messages (left-aligned):**
- Background: `var(--os-bg-tertiary)`
- Border-radius: 16px 16px 16px 4px (flat on bottom-left)
- Sender name (in groups): 11px weight 500, colored by a hash of their userId (consistent per-user color)
- Ministry badge: tiny inline chip after sender name

**Reactions:**
- Row of emoji pills below the message bubble
- Each pill: emoji + count (e.g., "😀 2")
- Click to add/remove your reaction
- Long-press to see who reacted

**Reply preview:**
- Small inset card above the message bubble showing the quoted message (truncated, with sender name)
- Click the preview to scroll to the original message

**Voice notes:**
- Waveform visualization (simplified bars) with play/pause button
- Duration label: "0:42"
- Playback speed toggle (1x / 1.5x / 2x)

**Images:**
- Inline thumbnail (max 240px wide within the bubble)
- Click to open in a lightbox overlay
- Blurhash placeholder while loading

**Files:**
- Card with file icon, filename, size
- Click to download
- Progress bar during upload/download

**Message context menu (right-click):**
- Reply
- React (opens emoji picker)
- Copy Text
- Forward
- Edit (own messages only)
- Delete (own messages: "Delete for everyone" + "Delete for me")
- Pin Message
- Thread (reply in thread)
- Report

### `MessageInput.tsx` — Compose Bar

Rich input area at the bottom of the chat.

**Layout:** `[Emoji btn] [Attach btn] [Text input] [Send/Voice btn]`

- **Emoji button**: Opens `EmojiPicker` popover above the input
- **Attachment button**: Opens `AttachmentPicker` popover — options: "Photo/Video", "Document", "Location"
- **Text input**: Auto-expanding textarea (1 line → max 5 lines). Supports:
  - Markdown: `**bold**`, `*italic*`, `` `code` ``, ``` ```code block``` ```
  - @mentions: type `@` to search contacts inline
  - Paste images directly
  - Enter sends, Shift+Enter for new line
- **Send button**: Appears when there's text. Gold accent color (`var(--os-accent)`)
- **Voice button**: Appears when text input is empty. Press and hold to record. Release to send. Drag up to lock recording mode (hands-free). Drag left to cancel.

**Reply mode**: When replying to a message, a preview bar appears above the input showing the quoted message with an X to cancel.

**Edit mode**: When editing a message, the input is pre-filled with the original text. A "Cancel" and "Save" button replace the send button.

### `TypingIndicator.tsx`

Three bouncing dots animation (like iMessage) with the typer's name:
- "Kofi is typing..." for DMs
- "Kofi, Ama are typing..." for groups
- Subtle fade-in/fade-out animation
- Dots bounce with 200ms stagger between each

### `EmojiPicker.tsx`

A full emoji picker popover:
- Search bar at top
- Category tabs: Smileys, People, Nature, Food, Activities, Travel, Objects, Symbols, Ghana Flags
- Recently used section at top
- Grid of emojis (6 columns)
- Click to insert into the message input
- If invoked from a message's reaction, clicking sends the reaction directly

### `VoiceNoteRecorder.tsx`

- Visual: Red recording dot + waveform visualization + elapsed time counter
- Press and hold the mic button to record
- Release sends the voice note
- Drag left to cancel (shows "Slide to cancel" text)
- Drag up to lock recording (hands-free mode — tap stop to finish)
- Max duration: 5 minutes
- Encoded as Opus in an OGG container (small file size, good for Ghana's bandwidth)
- Uses Web Audio API + `MediaRecorder` with Opus codec

---

## 5. Government-Specific Security Features

These are the features that make GovChat suitable for government use, beyond what Facebook Messenger offers.

### Classification System

Every chat room can have a classification level. This affects how messages are handled:

```typescript
const CLASSIFICATION_CONFIG = {
  unclassified: {
    label: 'Unclassified',
    color: 'var(--os-text-secondary)',
    banner: false,
    screenshotAllowed: true,
    forwardAllowed: true,
    copyAllowed: true,
    retentionDefault: null,        // Keep forever
  },
  internal: {
    label: 'Internal — For Official Use',
    color: '#3B8BD4',
    banner: true,
    bannerText: 'INTERNAL — For official use within Ghana Civil Service',
    screenshotAllowed: true,
    forwardAllowed: true,
    copyAllowed: true,
    retentionDefault: 365,         // Auto-delete after 1 year
  },
  confidential: {
    label: 'Confidential',
    color: '#E5A320',
    banner: true,
    bannerText: 'CONFIDENTIAL — Authorized recipients only',
    screenshotAllowed: false,
    forwardAllowed: false,
    copyAllowed: false,
    retentionDefault: 90,          // Auto-delete after 90 days
  },
  restricted: {
    label: 'Restricted',
    color: '#CE1126',
    banner: true,
    bannerText: 'RESTRICTED — Do not distribute',
    screenshotAllowed: false,
    forwardAllowed: false,
    copyAllowed: false,
    retentionDefault: 30,          // Auto-delete after 30 days
  },
};
```

**ClassificationBanner.tsx**: A colored banner at the top of the chat view (below the header) showing the classification level. Uses the classification's color as background with white text.

**ClassificationPicker**: When creating a group or sending a message to a new chat, the creator can set the classification level. This is stored as a room state event (`m.room.classification` custom state event).

### Message Retention Policies

Rooms can have auto-delete policies. This uses Matrix's `m.room.retention` state event:
- Messages older than the retention period are automatically redacted
- The retention period is displayed as a notice in the chat: "Messages in this chat auto-delete after 90 days"
- Admins (room creators / ministry IT) can set and change retention policies

### .gov.gh-Only Authentication

Registration and login are restricted to .gov.gh email addresses:
1. User enters their official email (e.g., kofi.mensah@finance.gov.gh) + staff ID
2. The homeserver sends a verification code to that email
3. User enters the code
4. The homeserver creates their Matrix account with a Matrix ID derived from their email: `@kofi.mensah:govchat.gov.gh`
5. Their profile is auto-populated from the civil service directory (name, ministry, department, rank)

The login flow in `LoginView.tsx` should be a clean, minimal form:
- Step 1: Email + Staff ID input
- Step 2: Verification code input (6 digits)
- Step 3: "Welcome, Kofi!" → auto-transition to chat list
- Ghana flag colors accent on the login card
- Gye Nyame Adinkra symbol as a subtle watermark

### Device Verification

Matrix supports device verification via emoji comparison or QR code scanning.

**VerificationDialog.tsx**: When a user signs in on a new device, they must verify it against an existing device:
1. Show a set of 7 emoji on both devices
2. User confirms the emoji match
3. Devices are now cross-signed and trusted
4. This ensures no man-in-the-middle attack

### Audit Trail (Admin Feature)

For government compliance, room admins can:
- View who read each message and when
- Export chat history as an encrypted archive (for legal/audit purposes)
- View login history for users in the room
- This is implemented via Matrix's server-side admin API, not in the client itself

---

## 6. Rich Messenger Experience Features

These are the fun, engaging features that make GovChat feel like Facebook Messenger — not a boring government tool.

### Reactions
- Any Unicode emoji can be used as a reaction
- Quick-react bar: 6 most common emojis (👍 ❤️ 😂 😮 😢 🙏) appear on long-press/hover
- Reactions animate in with a scale-up bounce effect
- Tap an existing reaction to add yours (count increments)
- Tap your own reaction to remove it

### Threads
- Reply to any message to start a thread
- Threads are collapsible — the root message shows "3 replies" link
- Clicking opens the thread in a sub-view within the chat panel
- Thread messages have a left border accent for visual distinction

### Read Receipts
- DMs: ✓ (sent to server) → ✓✓ (delivered to recipient's device) → blue ✓✓ (read)
- Groups: Small avatar stack (max 3) of people who've read the message, shown below the bubble on hover

### Presence & Status
- Green dot: Online (active in last 5 minutes)
- Yellow dot: Away (inactive for 5-30 minutes)
- Gray dot: Offline
- Users can set a custom status message (e.g., "In a meeting until 2 PM")

### Message Search
- Global search across all chats
- Results show message, chat name, date
- Click a result to jump to that message in context

### Stickers & GIF Support
- Pre-loaded sticker packs with Ghanaian themes (Adinkra symbols, Ghanaian expressions, etc.)
- GIF search via Tenor/Giphy API (optional, can be disabled for government networks)

### @Mentions
- Type `@` in the input to trigger a contact picker
- Mentioned users get a push notification even if the chat is muted
- Mentions are highlighted in the message body

### Link Previews
- When a URL is typed, fetch Open Graph metadata and show a preview card below the message
- Shows: title, description, image, domain
- Can be disabled for confidential chats

---

## 7. Notification Integration

### Desktop Notifications (`src/renderer/services/NotificationService.ts`)

Use Electron's `Notification` API:
- Show notification with sender name, avatar, and message preview
- Clicking the notification: opens GovChat panel and navigates to that chat
- Respect mute settings: muted chats don't trigger notifications
- Respect classification: confidential/restricted messages show "New encrypted message" instead of the preview
- Sound: subtle notification sound (optional, configurable)
- Badge: unread count on the GovChat icon in the Kente Sidebar rail

### Status Bar Integration

The messenger's unread count feeds into the status bar's `MessageCountIndicator`:
- Shows total unread count across all chats
- Click opens the GovChat sidebar panel

---

## 8. Homeserver Setup Guide

Include a `HOMESERVER_SETUP.md` file with instructions for deploying the Matrix homeserver for the Ghana government:

**Recommended: Synapse (Python)**
- The reference Matrix homeserver, used by Element and most government deployments
- Deploy on a Ghanaian server or cloud provider (e.g., MainOne, Busy Internet, or Ghana government data center)
- Domain: `govchat.gov.gh` or `matrix.ohcs.gov.gh`
- SSL certificate via Let's Encrypt
- PostgreSQL database backend
- Nginx reverse proxy
- Registration restricted to .gov.gh email domain
- Federation disabled initially (single server for OHCS), can be enabled later to federate with other ministries

**Alternative: Conduit (Rust)**
- Much lighter resource usage — suitable for a small deployment
- Single binary, no external database needed (uses sled embedded DB)
- Good for pilot testing with a small team before scaling to Synapse

Provide a `docker-compose.yml` for quick homeserver deployment.

---

## 9. Design Specifications

### Color Usage
- Sent bubbles: `var(--os-accent)` at 15% opacity (gold tint)
- Received bubbles: `var(--os-bg-tertiary)`
- Encryption badge: `var(--os-success)` (green lock icon)
- Classification banners: use each classification's color
- Presence: green (#2DA06B), yellow (#E5A320), gray (#5C6173)
- Links in messages: `var(--os-info-text)`

### Typography
- Message body: 13px, `var(--os-font-body)`
- Sender name: 12px weight 500
- Timestamp: 10px, `var(--os-text-tertiary)`
- Ministry badge: 10px, inside a pill with ministry-derived color

### Animations
- Message send: bubble slides up and fades in (150ms)
- Message receive: bubble slides in from left (150ms)
- Typing dots: three circles bouncing with 200ms stagger
- Reaction add: emoji scales from 0 to 1 with bounce overshoot
- View transitions: slide left (forward) / slide right (back), 200ms

### Sound Effects (optional, toggleable)
- Message sent: subtle "whoosh"
- Message received: soft "ding"
- Voice note start: soft "click"

---

## 10. Dependencies to Install

```bash
npm install matrix-js-sdk
npm install react-markdown marked
npm install react-virtuoso           # Virtualized message list
npm install emoji-mart               # Emoji picker
npm install framer-motion
npm install lucide-react
npm install opus-recorder            # Voice note encoding (optional, fallback to MediaRecorder)
```

---

## 11. Build Order

1. **Types** — All TypeScript interfaces
2. **MatrixClientService** — Matrix client initialization, crypto setup, sync
3. **Zustand store** — Complete messenger state with all actions
4. **GovChatProvider** — React context wrapping the Matrix client
5. **LoginView** — .gov.gh authentication flow
6. **ChatListView** + ChatListItem — Conversation list with filters
7. **ChatView** + MessageList + MessageBubble — Core chat experience
8. **MessageInput** — Compose bar with all input types
9. **Reactions, Threads, Replies** — Interactive message features
10. **VoiceNoteRecorder** — Audio recording and playback
11. **EmojiPicker** — Emoji and reaction picker
12. **ContactPickerView** — Contact directory and group creation
13. **Security views** — Verification, session management, classification
14. **NotificationService** — Desktop notifications
15. **Sidebar integration** — Register in Kente Sidebar Feature Registry

Build everything now. Start with the types and MatrixClientService. Make every component complete and production-ready — this messenger should feel as polished as Facebook Messenger while being as secure as Signal. Use the Ghana-rooted design system (gold accents, Adinkra symbols in empty states, ministry badges on contacts).
