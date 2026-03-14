// === Database row types ===
export interface UserProfile {
  id: number;
  display_name: string;
  email: string | null;
  avatar_path: string | null;
  default_model: string;
  theme: 'dark' | 'light' | 'system';
  language: string;
  sidebar_position: 'left' | 'right';
  ad_blocking: boolean;
  privacy_mode: boolean;
  search_engine: string;
  sync_enabled: boolean;
  created_at: string;
}

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon_path: string | null;
  position: number;
  is_pinned: boolean;
  is_active: boolean;
  is_muted: boolean;
  last_accessed_at: string;
}

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  favicon_path: string | null;
  visit_count: number;
  last_visited_at: string;
  ai_summary: string | null;
  page_text_excerpt: string | null;
}

export interface BookmarkFolder {
  id: number;
  name: string;
  parent_id: number | null;
  position: number;
  icon: string | null;
  created_at: string;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string | null;
  folder_id: number | null;
  favicon_path: string | null;
  position: number;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  model: string;
  page_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string;
  page_context: string | null;
  tokens_used: number;
  created_at: string;
}

export interface OfflineQueueItem {
  id: number;
  endpoint: string;
  payload_json: string;
  priority: number;
  created_at: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  retry_count: number;
}

export interface AdBlockStats {
  id: number;
  url: string;
  ads_blocked: number;
  trackers_blocked: number;
  bytes_saved: number;
  created_at: string;
}

export interface UserAgent {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  triggers: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GovPortal {
  id: number;
  name: string;
  url: string;
  category: string;
  icon_path: string | null;
  position: number;
  is_default: boolean;
  is_visible: boolean;
}

export interface WindowState {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  is_maximized: boolean;
  is_fullscreen: boolean;
  display_id: string;
  updated_at: string;
}

// === AI types ===
export interface AIChatRequest {
  message: string;
  model: string;
  conversation_history: ChatMessage[];
  page_context?: string;
}

export interface AIChatResponse {
  content: string;
  model: string;
  tokens_used: number;
}

export interface AISummarizeRequest {
  url: string;
  page_text: string;
}

export interface AITranslateRequest {
  text: string;
  source_lang: string;
  target_lang: string;
}

// === Connectivity ===
export type ConnectivityState = 'online' | 'intermittent' | 'offline';
