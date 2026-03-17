export interface Env {
  AI: Ai;
  RATE_LIMITS: KVNamespace;
  PAGE_CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  MESSAGES: KVNamespace;
  DEVICE_REGISTRATION_SECRET: string;
  ENVIRONMENT: string;
  APP_NAME: string;
  DEFAULT_MODEL: string;
  CHAT_ROOM: DurableObjectNamespace;
  USER_PRESENCE: DurableObjectNamespace;
  INVITE_CODES: KVNamespace;
  MATRIX_HOMESERVER_URL: string;
  SYNAPSE_REGISTRATION_SECRET: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  isEncrypted: boolean;
  encryptedText?: string;
}

export interface Contact {
  userId: string;
  email: string;
  name: string;
  department: string;
  registeredAt: number;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  createdAt: number;
  lastMessageAt: number;
  lastMessagePreview?: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  department: string;
  token: string;
  createdAt: number;
}

export interface InviteCode {
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  department: string;
  ministry: string;
  isRevoked: boolean;
}

export interface GovChatSession {
  userId: string;
  staffId: string;
  displayName: string;
  department: string;
  ministry: string;
  token: string;
  homeserverUrl: string;
  deviceId: string;
  createdAt: number;
  role: 'user' | 'admin' | 'superadmin' | 'public';
}

export interface CodeRequest {
  id: string;
  name: string;
  email: string;
  department: string;
  ministry: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  rejectionReason?: string;
  generatedCode?: string;
}
