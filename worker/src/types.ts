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
