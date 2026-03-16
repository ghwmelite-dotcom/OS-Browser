/**
 * GovChat Type Definitions
 * Single source of truth for all GovChat types used across the app.
 */

// Security classification levels for government communications
export type ClassificationLevel = 'UNCLASSIFIED' | 'OFFICIAL' | 'SENSITIVE' | 'SECRET';

// Colors for each classification
export const CLASSIFICATION_COLORS: Record<ClassificationLevel, string> = {
  UNCLASSIFIED: '#9CA3AF', // grey
  OFFICIAL: '#3B82F6', // blue
  SENSITIVE: '#F59E0B', // amber
  SECRET: '#EF4444', // red
};

// Retention policies per classification (in days)
export const DEFAULT_RETENTION_DAYS: Record<ClassificationLevel, number> = {
  UNCLASSIFIED: 365,
  OFFICIAL: 730, // 2 years
  SENSITIVE: 1825, // 5 years
  SECRET: 2555, // 7 years
};

export interface GovUser {
  userId: string; // Matrix user ID (@staffId:homeserver)
  staffId: string; // Government staff ID
  displayName: string;
  department: string;
  ministry: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'superadmin';
  isOnline: boolean;
  lastSeen: number | null;
}

export interface MinistryInfo {
  id: string;
  name: string;
  abbreviation: string;
  color: string; // Brand color for badge
}

export interface ChatRoom {
  roomId: string; // Matrix room ID
  name: string;
  topic?: string;
  isDirect: boolean; // DM vs group
  isEncrypted: boolean;
  classification: ClassificationLevel;
  members: GovUser[];
  lastMessage: GovChatMessage | null;
  unreadCount: number;
  isPinned: boolean;
  ministry?: MinistryInfo;
  retentionDays: number;
  avatarUrl?: string;
  createdAt: number;
}

export type MessageType = 'text' | 'file' | 'voice' | 'image' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageReaction {
  key: string; // emoji character
  senders: string[]; // user IDs who reacted
}

export interface ReplyTo {
  eventId: string;
  senderId: string;
  senderName: string;
  body: string; // truncated preview
}

export interface FileAttachment {
  name: string;
  mimeType: string;
  size: number; // bytes
  url: string; // mxc:// URL
  thumbnailUrl?: string;
}

export interface VoiceNote {
  duration: number; // seconds
  waveform: number[]; // amplitude samples 0-1
  url: string; // mxc:// URL
  mimeType: string;
}

export interface GovChatMessage {
  eventId: string; // Matrix event ID
  roomId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  body: string;
  timestamp: number;
  status: MessageStatus;
  isEncrypted: boolean;
  classification: ClassificationLevel;

  // Rich features
  reactions: MessageReaction[];
  replyTo?: ReplyTo;
  threadRootId?: string; // If part of a thread
  threadReplyCount?: number;
  editedAt?: number;

  // Attachments
  file?: FileAttachment;
  voiceNote?: VoiceNote;

  // Mentions
  mentions: string[]; // user IDs mentioned
}

export interface MessageClassification {
  level: ClassificationLevel;
  setBy: string; // user ID
  setAt: number;
  reason?: string;
}

export interface InviteCode {
  code: string;
  createdBy: string; // admin user ID
  createdAt: number;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  department: string;
  ministry: string;
  isRevoked: boolean;
}

export interface RetentionPolicy {
  classification: ClassificationLevel;
  retentionDays: number;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
}

// Auth state for invite code flow
export type AuthStep = 'idle' | 'redeeming' | 'authenticated' | 'error';

export interface GovChatCredentials {
  userId: string; // Matrix user ID
  accessToken: string; // Matrix access token
  homeserverUrl: string;
  staffId: string;
  deviceId: string;
}

// Filter tabs for chat list
export type ChatFilter = 'all' | 'unread' | 'groups' | 'direct';

// Quick reaction emoji set
export const QUICK_REACTIONS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'];

// Typing indicator
export interface TypingInfo {
  roomId: string;
  userIds: string[];
}
