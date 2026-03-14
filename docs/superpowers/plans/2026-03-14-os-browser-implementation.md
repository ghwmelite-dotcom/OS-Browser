# OS Browser Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build OS Browser — an Electron desktop browser with AI sidebar, Ghana-first design, local-first data, and Cloudflare Workers AI backend.

**Architecture:** Electron 33+ app with React renderer, local SQLite (better-sqlite3) for all user data, Cloudflare Worker as stateless AI microservice. WebContentsView for tab rendering. Zustand for state management. Monorepo with npm workspaces.

**Tech Stack:** Electron 33, React 18, TypeScript 5, Vite 6, Tailwind CSS 3, Zustand 5, @journeyapps/sqlcipher (SQLCipher-compatible better-sqlite3), Hono 4, Cloudflare Workers AI, electron-builder

**Spec:** `docs/superpowers/specs/2026-03-14-os-browser-design.md`

---

## Chunk 1: Foundation — Scaffolding, Shared Types, Database

This chunk produces: a working Electron window with SQLite database, IPC bridge, and shared type system. No UI yet — just the skeleton.

---

### Task 1: Initialize Monorepo

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `packages/main/package.json`
- Create: `packages/main/tsconfig.json`
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/tsconfig.json`
- Create: `packages/preload/package.json`
- Create: `packages/preload/tsconfig.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create root package.json with workspaces**

```json
{
  "name": "os-browser",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "packages/*",
    "worker"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "cd packages/main && npm run dev",
    "dev:renderer": "cd packages/renderer && npm run dev",
    "dev:worker": "cd worker && npm run dev",
    "build": "npm run build:shared && npm run build:preload && npm run build:renderer && npm run build:main",
    "build:shared": "cd packages/shared && npm run build",
    "build:main": "cd packages/main && npm run build",
    "build:renderer": "cd packages/renderer && npm run build",
    "build:preload": "cd packages/preload && npm run build",
    "package": "electron-builder --win",
    "package:exe": "electron-builder --win nsis",
    "package:msi": "electron-builder --win msi",
    "deploy:worker": "cd worker && npm run deploy"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Create packages/shared/package.json**

```json
{
  "name": "@os-browser/shared",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 4: Create packages/main/package.json**

```json
{
  "name": "@os-browser/main",
  "version": "1.0.0",
  "private": true,
  "main": "dist/main.js",
  "scripts": {
    "build": "esbuild src/main.ts --bundle --platform=node --outdir=dist --external:electron --external:@journeyapps/sqlcipher",
    "dev": "esbuild src/main.ts --bundle --platform=node --outdir=dist --external:electron --external:@journeyapps/sqlcipher --watch"
  },
  "dependencies": {
    "@os-browser/shared": "*",
    "@journeyapps/sqlcipher": "^5.7.0",
    "electron-updater": "^6.3.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",  /* @journeyapps/sqlcipher is API-compatible */
    "esbuild": "^0.24.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 5: Create packages/renderer/package.json**

```json
{
  "name": "@os-browser/renderer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@os-browser/shared": "*",
    "lucide-react": "^0.460.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-markdown": "^9.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 6: Create packages/preload/package.json**

```json
{
  "name": "@os-browser/preload",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --outdir=dist --external:electron",
    "dev": "esbuild src/index.ts --bundle --platform=node --outdir=dist --external:electron --watch"
  },
  "dependencies": {
    "@os-browser/shared": "*"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 7: Create worker/package.json**

```json
{
  "name": "@os-browser/worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@os-browser/shared": "*"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "typescript": "^5.6.0",
    "wrangler": "^3.93.0"
  }
}
```

- [ ] **Step 8: Create tsconfig files for each package**

Each package tsconfig extends root and sets its own `outDir`, `rootDir`, `include`.

- [ ] **Step 9: Create .gitignore**

```
node_modules/
dist/
.env
*.db
.wrangler/
out/
```

- [ ] **Step 10: Create .env.example**

```
CF_ACCOUNT_ID=
CF_D1_DATABASE_ID=
CF_KV_RATE_LIMITS_ID=
CF_KV_PAGE_CACHE_ID=
CF_KV_SESSIONS_ID=
AUTH_SECRET=
DEVICE_REGISTRATION_SECRET=
```

- [ ] **Step 11: Run npm install, verify workspace resolution**

Run: `npm install`
Expected: All workspaces linked, node_modules created

- [ ] **Step 12: Commit**

```bash
git init
git add -A
git commit -m "feat: initialize monorepo with npm workspaces"
```

---

### Task 2: Shared Types & Constants

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/models.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/ipc-channels.ts`

- [ ] **Step 1: Create types.ts — all shared TypeScript interfaces**

```typescript
// packages/shared/src/types.ts

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
```

- [ ] **Step 2: Create models.ts — AI model registry**

```typescript
// packages/shared/src/models.ts

export interface AIModel {
  id: string;
  label: string;
  provider: string;
  useCase: string;
  isDefault?: boolean;
}

export const AI_MODELS: AIModel[] = [
  {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    label: 'Llama 3.3 70B',
    provider: 'Meta',
    useCase: 'Default chat, reasoning, summarization',
    isDefault: true,
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    label: 'Llama 3.1 8B',
    provider: 'Meta',
    useCase: 'Quick/lightweight responses',
  },
  {
    id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    label: 'DeepSeek R1',
    provider: 'DeepSeek',
    useCase: 'Code, math, deep reasoning',
  },
  {
    id: '@cf/mistral/mistral-small-3.1-24b-instruct',
    label: 'Mistral Small',
    provider: 'Mistral',
    useCase: 'Chat, translation assist',
  },
  {
    id: '@cf/qwen/qwen2.5-72b-instruct',
    label: 'Qwen 2.5 72B',
    provider: 'Alibaba',
    useCase: 'Multilingual, code',
  },
  {
    id: '@hf/google/gemma-7b-it',
    label: 'Gemma 7B',
    provider: 'Google',
    useCase: 'Fast lightweight tasks',
  },
];

export const TRANSLATION_MODEL = '@cf/meta/m2m100-1.2b';
export const EMBEDDING_MODEL = '@cf/baai/bge-large-en-v1.5';

export const MODEL_FALLBACK_CHAIN = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/qwen/qwen2.5-72b-instruct',
  '@cf/meta/llama-3.1-8b-instruct',
];

export const DEFAULT_MODEL = AI_MODELS.find(m => m.isDefault)!.id;
```

- [ ] **Step 3: Create constants.ts — gov portals, defaults**

```typescript
// packages/shared/src/constants.ts

import type { GovPortal } from './types';

export const APP_NAME = 'OS Browser';
export const APP_VERSION = '1.0.0';

export const DEFAULT_GOV_PORTALS: Omit<GovPortal, 'id'>[] = [
  { name: 'Ghana.gov', url: 'https://ghana.gov.gh', category: 'General', icon_path: null, position: 0, is_default: true, is_visible: true },
  { name: 'GIFMIS', url: 'https://gifmis.finance.gov.gh', category: 'Finance', icon_path: null, position: 1, is_default: true, is_visible: true },
  { name: 'CAGD Payroll', url: 'https://cagd.gov.gh', category: 'Payroll', icon_path: null, position: 2, is_default: true, is_visible: true },
  { name: 'GRA Tax Portal', url: 'https://gra.gov.gh', category: 'Tax', icon_path: null, position: 3, is_default: true, is_visible: true },
  { name: 'SSNIT', url: 'https://ssnit.org.gh', category: 'Pensions', icon_path: null, position: 4, is_default: true, is_visible: true },
  { name: 'Public Services Commission', url: 'https://psc.gov.gh', category: 'HR', icon_path: null, position: 5, is_default: true, is_visible: true },
  { name: 'Ghana Health Service', url: 'https://ghs.gov.gh', category: 'Health', icon_path: null, position: 6, is_default: true, is_visible: true },
  { name: 'Ministry of Finance', url: 'https://mofep.gov.gh', category: 'Finance', icon_path: null, position: 7, is_default: true, is_visible: true },
  { name: 'OHCS Platform', url: 'https://ohcs.gov.gh', category: 'HR', icon_path: null, position: 8, is_default: true, is_visible: true },
  { name: 'E-SPAR Portal', url: 'https://ohcsgh.web.app', category: 'HR/Appraisal', icon_path: null, position: 9, is_default: true, is_visible: true },
];

export const AD_BLOCK_WHITELIST = [
  '*.gov.gh',
  '*.mil.gh',
  '*.edu.gh',
  'ohcsgh.web.app',
  'askozzy.ghwmelite.workers.dev',
];

export const SEARCH_ENGINES = {
  osbrowser: { name: 'OS Browser AI', url: '' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
} as const;

export const PAGE_CACHE_LIMIT_MB = 500;
export const FTS_RETENTION_DAYS = 90;
export const TAB_SUSPEND_AFTER_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_CONCURRENT_TABS = 10;
export const HISTORY_EXCERPT_LENGTH = 500;
```

- [ ] **Step 4: Create ipc-channels.ts — IPC channel name constants**

```typescript
// packages/shared/src/ipc-channels.ts

export const IPC = {
  // Tabs
  TAB_CREATE: 'tab:create',
  TAB_CLOSE: 'tab:close',
  TAB_SWITCH: 'tab:switch',
  TAB_UPDATE: 'tab:update',
  TAB_LIST: 'tab:list',
  TAB_NAVIGATE: 'tab:navigate',
  TAB_GO_BACK: 'tab:go-back',
  TAB_GO_FORWARD: 'tab:go-forward',
  TAB_RELOAD: 'tab:reload',
  TAB_STOP: 'tab:stop',

  // History
  HISTORY_LIST: 'history:list',
  HISTORY_ADD: 'history:add',
  HISTORY_DELETE: 'history:delete',
  HISTORY_CLEAR: 'history:clear',
  HISTORY_SEARCH: 'history:search',

  // Bookmarks
  BOOKMARK_LIST: 'bookmark:list',
  BOOKMARK_ADD: 'bookmark:add',
  BOOKMARK_UPDATE: 'bookmark:update',
  BOOKMARK_DELETE: 'bookmark:delete',
  BOOKMARK_FOLDER_CREATE: 'bookmark:folder:create',
  BOOKMARK_FOLDER_DELETE: 'bookmark:folder:delete',
  BOOKMARK_IS_BOOKMARKED: 'bookmark:is-bookmarked',

  // AI
  AI_CHAT: 'ai:chat',
  AI_CHAT_STREAM: 'ai:chat:stream',
  AI_SUMMARIZE: 'ai:summarize',
  AI_TRANSLATE: 'ai:translate',
  AI_SEARCH: 'ai:search',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Conversations
  CONVERSATION_LIST: 'conversation:list',
  CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_DELETE: 'conversation:delete',
  CONVERSATION_MESSAGES: 'conversation:messages',
  CONVERSATION_ADD_MESSAGE: 'conversation:add-message',

  // Agents
  AGENT_LIST: 'agent:list',
  AGENT_CREATE: 'agent:create',
  AGENT_UPDATE: 'agent:update',
  AGENT_DELETE: 'agent:delete',
  AGENT_EXECUTE: 'agent:execute',

  // Stats
  STATS_GET: 'stats:get',
  ADBLOCK_STATS_UPDATE: 'adblock:stats:update',

  // Gov Portals
  GOV_PORTAL_LIST: 'gov-portal:list',
  GOV_PORTAL_UPDATE: 'gov-portal:update',

  // Connectivity
  CONNECTIVITY_STATUS: 'connectivity:status',
  CONNECTIVITY_CHANGED: 'connectivity:changed',

  // Offline Queue
  OFFLINE_QUEUE_COUNT: 'offline-queue:count',
  OFFLINE_QUEUE_STATUS: 'offline-queue:status',

  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_FULLSCREEN: 'window:fullscreen',

  // App
  APP_GET_VERSION: 'app:version',
  APP_CHECK_UPDATE: 'app:check-update',
} as const;
```

- [ ] **Step 5: Create index.ts barrel export**

```typescript
// packages/shared/src/index.ts
export * from './types';
export * from './models';
export * from './constants';
export * from './ipc-channels';
```

- [ ] **Step 6: Build shared package, verify compilation**

Run: `cd packages/shared && npm run build`
Expected: `dist/` created with .js and .d.ts files

- [ ] **Step 7: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types, AI model registry, IPC channels, and Ghana gov portal constants"
```

---

### Task 3: SQLite Database Layer

**Files:**
- Create: `packages/main/src/db/database.ts`
- Create: `packages/main/src/db/migrations/001-initial.ts`
- Create: `packages/main/src/db/seed.ts`

- [ ] **Step 1: Create database.ts — connection, migration runner, encryption**

```typescript
// packages/main/src/db/database.ts
import Database from '@journeyapps/sqlcipher';
import { app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DB_DIR = path.join(app.getPath('userData'), 'os-browser');
const DB_PATH = path.join(DB_DIR, 'data.db');

let db: Database.Database | null = null;

function getOrCreateEncryptionKey(): string {
  // Store encryption key in Electron safeStorage (backed by Windows DPAPI)
  const keyPath = path.join(DB_DIR, '.keyref');

  if (fs.existsSync(keyPath) && safeStorage.isEncryptionAvailable()) {
    const encrypted = fs.readFileSync(keyPath);
    return safeStorage.decryptString(encrypted);
  }

  // Generate new 256-bit key as hex string
  const keyHex = crypto.randomBytes(32).toString('hex');

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(keyHex);
    fs.writeFileSync(keyPath, encrypted);
  }

  return keyHex;
}

export function getDatabase(): Database.Database {
  if (db) return db;

  // Ensure directory exists
  fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);

  // Apply SQLCipher encryption key
  const key = getOrCreateEncryptionKey();
  db.pragma(`key = "x'${key}'"`);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function runMigrations(): void {
  const database = getDatabase();

  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Import and run migrations in order
  const migrations = [
    { name: '001-initial', run: require('./migrations/001-initial').up },
  ];

  const applied = new Set(
    database.prepare('SELECT name FROM _migrations').all()
      .map((row: any) => row.name)
  );

  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      migration.run(database);
      database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
    }
  }
}
```

- [ ] **Step 2: Create 001-initial.ts migration — all tables from spec**

```typescript
// packages/main/src/db/migrations/001-initial.ts
import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      display_name TEXT NOT NULL DEFAULT 'User',
      email TEXT,
      avatar_path TEXT,
      default_model TEXT NOT NULL DEFAULT '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
      language TEXT NOT NULL DEFAULT 'en',
      sidebar_position TEXT NOT NULL DEFAULT 'right' CHECK (sidebar_position IN ('left', 'right')),
      ad_blocking INTEGER NOT NULL DEFAULT 1,
      privacy_mode INTEGER NOT NULL DEFAULT 0,
      search_engine TEXT NOT NULL DEFAULT 'osbrowser',
      sync_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tabs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Tab',
      url TEXT NOT NULL DEFAULT 'os-browser://newtab',
      favicon_path TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_muted INTEGER NOT NULL DEFAULT 0,
      last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      favicon_path TEXT,
      visit_count INTEGER NOT NULL DEFAULT 1,
      last_visited_at TEXT NOT NULL DEFAULT (datetime('now')),
      ai_summary TEXT,
      page_text_excerpt TEXT,
      UNIQUE(url)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
      page_text,
      content='',
      tokenize='porter unicode61'
    );

    CREATE TABLE IF NOT EXISTS history_fts_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      history_id INTEGER NOT NULL REFERENCES history(id) ON DELETE CASCADE,
      fts_rowid INTEGER NOT NULL,
      indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmark_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES bookmark_folders(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      icon TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      folder_id INTEGER REFERENCES bookmark_folders(id) ON DELETE SET NULL,
      favicon_path TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      model TEXT NOT NULL,
      page_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      model TEXT NOT NULL,
      page_context TEXT,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 2,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
      retry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS adblock_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      ads_blocked INTEGER NOT NULL DEFAULT 0,
      trackers_blocked INTEGER NOT NULL DEFAULT 0,
      bytes_saved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      system_prompt TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      triggers TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS translation_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_text_hash TEXT NOT NULL,
      source_lang TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_text_hash, source_lang, target_lang)
    );

    CREATE TABLE IF NOT EXISTS summary_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_hash TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      summary TEXT NOT NULL,
      key_points_json TEXT,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gov_portals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      icon_path TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_pattern TEXT NOT NULL,
      username_encrypted TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      display_name TEXT,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS window_state (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      x INTEGER NOT NULL DEFAULT 100,
      y INTEGER NOT NULL DEFAULT 100,
      width INTEGER NOT NULL DEFAULT 1280,
      height INTEGER NOT NULL DEFAULT 800,
      is_maximized INTEGER NOT NULL DEFAULT 0,
      is_fullscreen INTEGER NOT NULL DEFAULT 0,
      display_id TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
    CREATE INDEX IF NOT EXISTS idx_history_last_visited ON history(last_visited_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status, priority);
    CREATE INDEX IF NOT EXISTS idx_translation_cache_hash ON translation_cache(source_text_hash);

    -- Insert default user profile
    INSERT OR IGNORE INTO user_profile (id) VALUES (1);

    -- Insert default window state
    INSERT OR IGNORE INTO window_state (id) VALUES (1);
  `);
}
```

- [ ] **Step 3: Create seed.ts — default gov portals**

```typescript
// packages/main/src/db/seed.ts
import type Database from 'better-sqlite3';
import { DEFAULT_GOV_PORTALS } from '@os-browser/shared';

export function seedDatabase(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM gov_portals').get() as { count: number };

  if (count.count === 0) {
    const insert = db.prepare(
      'INSERT INTO gov_portals (name, url, category, icon_path, position, is_default, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const insertMany = db.transaction(() => {
      for (const portal of DEFAULT_GOV_PORTALS) {
        insert.run(
          portal.name, portal.url, portal.category,
          portal.icon_path, portal.position,
          portal.is_default ? 1 : 0, portal.is_visible ? 1 : 0
        );
      }
    });

    insertMany();
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/db/
git commit -m "feat: add SQLite database layer with migrations, schema, and Ghana gov portal seeds"
```

---

### Task 4: Electron Main Process Entry & Preload

**Files:**
- Create: `packages/main/src/main.ts`
- Create: `packages/preload/src/index.ts`

- [ ] **Step 1: Create main.ts — app entry, window creation, lifecycle**

```typescript
// packages/main/src/main.ts
import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase, runMigrations } from './db/database';
import { seedDatabase } from './db/seed';

let mainWindow: BrowserWindow | null = null;

function getWindowState() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM window_state WHERE id = 1').get() as any;
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const db = getDatabase();
  db.prepare(`
    UPDATE window_state SET
      x = ?, y = ?, width = ?, height = ?,
      is_maximized = ?, is_fullscreen = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(
    bounds.x, bounds.y, bounds.width, bounds.height,
    mainWindow.isMaximized() ? 1 : 0,
    mainWindow.isFullScreen() ? 1 : 0,
  );
}

function createWindow() {
  const state = getWindowState();

  mainWindow = new BrowserWindow({
    x: state?.x ?? 100,
    y: state?.y ?? 100,
    width: state?.width ?? 1280,
    height: state?.height ?? 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Custom title bar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'dist', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // Preload still has contextBridge + ipcRenderer access with sandbox enabled (Electron 20+)
      webviewTag: false,
    },
  });

  if (state?.is_maximized) {
    mainWindow.maximize();
  }

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '..', '..', 'renderer', 'dist', 'index.html')
    );
  }

  // Save window state on move/resize
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize database
  runMigrations();
  const db = getDatabase();
  seedDatabase(db);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});
```

- [ ] **Step 2: Create preload/src/index.ts — secure IPC bridge**

```typescript
// packages/preload/src/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@os-browser/shared';

// Expose a safe API to the renderer
contextBridge.exposeInMainWorld('osBrowser', {
  // Window controls
  minimize: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE),
  close: () => ipcRenderer.invoke(IPC.WINDOW_CLOSE),
  fullscreen: () => ipcRenderer.invoke(IPC.WINDOW_FULLSCREEN),

  // Tabs
  tabs: {
    create: (url?: string) => ipcRenderer.invoke(IPC.TAB_CREATE, url),
    close: (id: string) => ipcRenderer.invoke(IPC.TAB_CLOSE, id),
    switch: (id: string) => ipcRenderer.invoke(IPC.TAB_SWITCH, id),
    update: (id: string, data: any) => ipcRenderer.invoke(IPC.TAB_UPDATE, id, data),
    list: () => ipcRenderer.invoke(IPC.TAB_LIST),
    navigate: (id: string, url: string) => ipcRenderer.invoke(IPC.TAB_NAVIGATE, id, url),
    goBack: (id: string) => ipcRenderer.invoke(IPC.TAB_GO_BACK, id),
    goForward: (id: string) => ipcRenderer.invoke(IPC.TAB_GO_FORWARD, id),
    reload: (id: string) => ipcRenderer.invoke(IPC.TAB_RELOAD, id),
    stop: (id: string) => ipcRenderer.invoke(IPC.TAB_STOP, id),
  },

  // History
  history: {
    list: (page?: number) => ipcRenderer.invoke(IPC.HISTORY_LIST, page),
    add: (entry: any) => ipcRenderer.invoke(IPC.HISTORY_ADD, entry),
    delete: (id: number) => ipcRenderer.invoke(IPC.HISTORY_DELETE, id),
    clear: () => ipcRenderer.invoke(IPC.HISTORY_CLEAR),
    search: (query: string) => ipcRenderer.invoke(IPC.HISTORY_SEARCH, query),
  },

  // Bookmarks
  bookmarks: {
    list: () => ipcRenderer.invoke(IPC.BOOKMARK_LIST),
    add: (bookmark: any) => ipcRenderer.invoke(IPC.BOOKMARK_ADD, bookmark),
    update: (id: number, data: any) => ipcRenderer.invoke(IPC.BOOKMARK_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.BOOKMARK_DELETE, id),
    isBookmarked: (url: string) => ipcRenderer.invoke(IPC.BOOKMARK_IS_BOOKMARKED, url),
    createFolder: (folder: any) => ipcRenderer.invoke(IPC.BOOKMARK_FOLDER_CREATE, folder),
    deleteFolder: (id: number) => ipcRenderer.invoke(IPC.BOOKMARK_FOLDER_DELETE, id),
  },

  // AI
  ai: {
    chat: (request: any) => ipcRenderer.invoke(IPC.AI_CHAT, request),
    onChatStream: (callback: (chunk: string) => void) => {
      const listener = (_event: any, chunk: string) => callback(chunk);
      ipcRenderer.on(IPC.AI_CHAT_STREAM, listener);
      return () => ipcRenderer.removeListener(IPC.AI_CHAT_STREAM, listener);
    },
    summarize: (request: any) => ipcRenderer.invoke(IPC.AI_SUMMARIZE, request),
    translate: (request: any) => ipcRenderer.invoke(IPC.AI_TRANSLATE, request),
    search: (query: string) => ipcRenderer.invoke(IPC.AI_SEARCH, query),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    update: (data: any) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, data),
  },

  // Conversations
  conversations: {
    list: () => ipcRenderer.invoke(IPC.CONVERSATION_LIST),
    create: (data: any) => ipcRenderer.invoke(IPC.CONVERSATION_CREATE, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.CONVERSATION_DELETE, id),
    messages: (id: number) => ipcRenderer.invoke(IPC.CONVERSATION_MESSAGES, id),
    addMessage: (data: any) => ipcRenderer.invoke(IPC.CONVERSATION_ADD_MESSAGE, data),
  },

  // Agents
  agents: {
    list: () => ipcRenderer.invoke(IPC.AGENT_LIST),
    create: (data: any) => ipcRenderer.invoke(IPC.AGENT_CREATE, data),
    update: (id: number, data: any) => ipcRenderer.invoke(IPC.AGENT_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.AGENT_DELETE, id),
    execute: (id: number, input: string) => ipcRenderer.invoke(IPC.AGENT_EXECUTE, id, input),
  },

  // Stats
  stats: {
    get: () => ipcRenderer.invoke(IPC.STATS_GET),
  },

  // Gov Portals
  govPortals: {
    list: () => ipcRenderer.invoke(IPC.GOV_PORTAL_LIST),
    update: (id: number, data: any) => ipcRenderer.invoke(IPC.GOV_PORTAL_UPDATE, id, data),
  },

  // Connectivity
  connectivity: {
    getStatus: () => ipcRenderer.invoke(IPC.CONNECTIVITY_STATUS),
    onStatusChanged: (callback: (status: string) => void) => {
      const listener = (_event: any, status: string) => callback(status);
      ipcRenderer.on(IPC.CONNECTIVITY_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC.CONNECTIVITY_CHANGED, listener);
    },
  },

  // Offline Queue
  offlineQueue: {
    count: () => ipcRenderer.invoke(IPC.OFFLINE_QUEUE_COUNT),
    onStatus: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.OFFLINE_QUEUE_STATUS, listener);
      return () => ipcRenderer.removeListener(IPC.OFFLINE_QUEUE_STATUS, listener);
    },
  },

  // App
  app: {
    getVersion: () => ipcRenderer.invoke(IPC.APP_GET_VERSION),
    checkUpdate: () => ipcRenderer.invoke(IPC.APP_CHECK_UPDATE),
  },
});
```

- [ ] **Step 3: Create TypeScript declaration for the preload API**

Create `packages/shared/src/preload.d.ts` with the `Window['osBrowser']` type declaration so the renderer gets type safety.

- [ ] **Step 4: Build main and preload, verify Electron launches**

Run: `npm run build:shared && npm run build:preload && npm run build:main`
Then: `npx electron packages/main/dist/main.js`
Expected: Empty Electron window opens, SQLite database created at `%APPDATA%/os-browser/data.db`

- [ ] **Step 5: Commit**

```bash
git add packages/main/src/main.ts packages/preload/
git commit -m "feat: add Electron main process with SQLite init and secure preload IPC bridge"
```

---

### Task 5: IPC Handlers — Settings & Window Controls

**Files:**
- Create: `packages/main/src/ipc/handlers.ts`
- Create: `packages/main/src/ipc/settings.ts`
- Modify: `packages/main/src/main.ts` — register IPC handlers

- [ ] **Step 1: Create handlers.ts — central IPC registration**

```typescript
// packages/main/src/ipc/handlers.ts
import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '@os-browser/shared';
import { registerSettingsHandlers } from './settings';

export function registerAllHandlers(mainWindow: BrowserWindow): void {
  // Window controls
  ipcMain.handle(IPC.WINDOW_MINIMIZE, () => mainWindow.minimize());
  ipcMain.handle(IPC.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle(IPC.WINDOW_CLOSE, () => mainWindow.close());
  ipcMain.handle(IPC.WINDOW_FULLSCREEN, () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  // App
  ipcMain.handle(IPC.APP_GET_VERSION, () => {
    const { app } = require('electron');
    return app.getVersion();
  });

  // Register domain handlers
  registerSettingsHandlers();
}
```

- [ ] **Step 2: Create settings.ts — user profile CRUD**

```typescript
// packages/main/src/ipc/settings.ts
import { ipcMain } from 'electron';
import { IPC } from '@os-browser/shared';
import { getDatabase } from '../db/database';

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  });

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_event, data: Record<string, any>) => {
    const db = getDatabase();
    const allowed = [
      'display_name', 'email', 'avatar_path', 'default_model',
      'theme', 'language', 'sidebar_position', 'ad_blocking',
      'privacy_mode', 'search_engine', 'sync_enabled',
    ];

    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;

    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);

    db.prepare(`UPDATE user_profile SET ${sets} WHERE id = 1`).run(...values);
    return db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  });
}
```

- [ ] **Step 3: Wire handlers into main.ts**

Add `registerAllHandlers(mainWindow)` after window creation in `main.ts`.

- [ ] **Step 4: Build and verify IPC works**

Run: `npm run build && npx electron packages/main/dist/main.js`
Expected: Window opens, no errors in console

- [ ] **Step 5: Commit**

```bash
git add packages/main/src/ipc/
git commit -m "feat: add IPC handler registry with settings and window control handlers"
```

---

## Chunk 2: Cloudflare Worker — AI Microservice

This chunk produces: a deployable Cloudflare Worker with all AI routes, device auth, and rate limiting.

---

### Task 6: Worker Scaffolding & Wrangler Config

**Files:**
- Create: `wrangler.toml`
- Create: `worker/src/index.ts`
- Create: `worker/src/types.ts`

- [ ] **Step 1: Create wrangler.toml**

```toml
name = "os-browser-api"
main = "worker/src/index.ts"
compatibility_date = "2025-12-01"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"

# KV namespace IDs — replace with actual IDs from .env before deployment
# Wrangler does not support variable interpolation. Use actual IDs here
# or manage via a deploy script that generates this file from .env.
[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "REPLACE_WITH_ACTUAL_KV_ID"

[[kv_namespaces]]
binding = "PAGE_CACHE"
id = "REPLACE_WITH_ACTUAL_KV_ID"

[[kv_namespaces]]
binding = "SESSIONS"
id = "REPLACE_WITH_ACTUAL_KV_ID"

[vars]
ENVIRONMENT = "production"
APP_NAME = "OS Browser"
APP_VERSION = "1.0.0"
DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
```

- [ ] **Step 2: Create worker/src/types.ts — Env interface**

```typescript
// worker/src/types.ts
export interface Env {
  AI: Ai;
  RATE_LIMITS: KVNamespace;
  PAGE_CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  DEVICE_REGISTRATION_SECRET: string;
  ENVIRONMENT: string;
  APP_NAME: string;
  DEFAULT_MODEL: string;
}
```

- [ ] **Step 3: Create worker/src/index.ts — Hono app entry**

```typescript
// worker/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { aiRoutes } from './routes/ai';
import { healthRoutes } from './routes/health';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: '*', // Desktop app — no origin restriction needed
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting on all API routes
app.use('/api/v1/*', rateLimitMiddleware);

// Device auth on protected routes
app.use('/api/v1/ai/*', authMiddleware);

// Routes
app.route('/api/v1', healthRoutes);
app.route('/api/v1/ai', aiRoutes);

export default app;
```

- [ ] **Step 4: Commit**

```bash
git add wrangler.toml worker/
git commit -m "feat: scaffold Cloudflare Worker with Hono, env types, and route structure"
```

---

### Task 7: Worker Auth & Rate Limiting Middleware

**Files:**
- Create: `worker/src/middleware/auth.ts`
- Create: `worker/src/middleware/rateLimit.ts`

- [ ] **Step 1: Create auth.ts — device token verification**

```typescript
// worker/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing device token' }, 401);
  }

  const token = authHeader.slice(7);
  const deviceData = await c.env.SESSIONS.get(`device:${token}`, 'json');

  if (!deviceData) {
    return c.json({ error: 'Invalid or revoked device token' }, 401);
  }

  // Check if device is suspended
  const device = deviceData as { id: string; created_at: string; suspended?: boolean };
  if (device.suspended) {
    return c.json({ error: 'Device suspended due to abuse' }, 403);
  }

  // Attach device info to context
  c.set('deviceId', device.id);
  await next();
});
```

- [ ] **Step 2: Create rateLimit.ts — KV sliding window**

```typescript
// worker/src/middleware/rateLimit.ts
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

function getConfig(path: string): RateLimitConfig {
  if (path.includes('/register-device')) return { maxRequests: 5, windowMs: 3600000 }; // 5/hour
  if (path.includes('/ai/search')) return { maxRequests: 10, windowMs: 60000 }; // 10/min
  if (path.includes('/ai/')) return { maxRequests: 30, windowMs: 60000 }; // 30/min
  return { maxRequests: 60, windowMs: 60000 }; // 60/min
}

export const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  // Use device token for authenticated routes (avoids unfairly limiting shared office IPs)
  // Fall back to IP for unauthenticated routes like /register-device
  const deviceId = c.get('deviceId') as string | undefined;
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const identity = deviceId || ip;
  const path = new URL(c.req.url).pathname;
  const config = getConfig(path);

  const key = `rl:${identity}:${path.split('/').slice(0, 5).join('/')}`;
  const now = Date.now();

  const existing = await c.env.RATE_LIMITS.get(key, 'json') as { count: number; reset: number } | null;

  if (existing && now < existing.reset) {
    if (existing.count >= config.maxRequests) {
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(existing.reset));
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    await c.env.RATE_LIMITS.put(key, JSON.stringify({
      count: existing.count + 1,
      reset: existing.reset,
    }), { expirationTtl: Math.ceil(config.windowMs / 1000) });

    c.header('X-RateLimit-Remaining', String(config.maxRequests - existing.count - 1));
  } else {
    await c.env.RATE_LIMITS.put(key, JSON.stringify({
      count: 1,
      reset: now + config.windowMs,
    }), { expirationTtl: Math.ceil(config.windowMs / 1000) });

    c.header('X-RateLimit-Remaining', String(config.maxRequests - 1));
  }

  await next();
});
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/middleware/
git commit -m "feat: add device token auth and KV-based rate limiting middleware"
```

---

### Task 8: Worker AI Routes

**Files:**
- Create: `worker/src/routes/health.ts`
- Create: `worker/src/routes/ai.ts`
- Create: `worker/src/services/ai.ts`

- [ ] **Step 1: Create health.ts — health check, models list, device registration**

```typescript
// worker/src/routes/health.ts
import { Hono } from 'hono';
import type { Env } from '../types';
import { AI_MODELS } from '@os-browser/shared';

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', app: 'OS Browser API', version: '1.0.0' });
});

healthRoutes.get('/models', (c) => {
  return c.json({ models: AI_MODELS });
});

healthRoutes.post('/register-device', async (c) => {
  const body = await c.req.json<{ app_version: string }>();

  // Generate unique device token
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const deviceId = crypto.randomUUID();

  await c.env.SESSIONS.put(`device:${token}`, JSON.stringify({
    id: deviceId,
    created_at: new Date().toISOString(),
    app_version: body.app_version || '1.0.0',
  }));

  return c.json({ device_token: token, device_id: deviceId });
});
```

- [ ] **Step 2: Create services/ai.ts — Workers AI wrapper with fallback**

```typescript
// worker/src/services/ai.ts
import type { Env } from '../types';
import { MODEL_FALLBACK_CHAIN } from '@os-browser/shared';

export interface AIInferenceOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
}

export async function runInference(
  ai: Ai,
  options: AIInferenceOptions
): Promise<ReadableStream | string> {
  const modelsToTry = [options.model, ...MODEL_FALLBACK_CHAIN.filter(m => m !== options.model)];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const result = await ai.run(model as any, {
        messages: options.messages,
        stream: options.stream,
      });

      if (options.stream && result instanceof ReadableStream) {
        return result;
      }

      return (result as any).response || JSON.stringify(result);
    } catch (err) {
      lastError = err as Error;
      // Wait 2s before trying fallback
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw lastError || new Error('All AI models failed');
}

export function buildSystemPrompt(pageContext?: string): string {
  let prompt = `You are OS Browser AI, an intelligent browsing assistant built for Ghana's civil and public servants. You help users summarize pages, answer questions, draft official correspondence, translate between English and Twi, research topics, and analyze data. Be concise, professional, and helpful.`;

  if (pageContext) {
    prompt += `\n\nThe user is currently viewing: ${pageContext}`;
  }

  return prompt;
}
```

- [ ] **Step 3: Create routes/ai.ts — chat, summarize, translate, search, compare**

```typescript
// worker/src/routes/ai.ts
import { Hono } from 'hono';
import type { Env } from '../types';
import { runInference, buildSystemPrompt } from '../services/ai';
import { TRANSLATION_MODEL, EMBEDDING_MODEL } from '@os-browser/shared';

export const aiRoutes = new Hono<{ Bindings: Env }>();

// POST /api/v1/ai/chat
aiRoutes.post('/chat', async (c) => {
  const { message, model, conversation_history, page_context } = await c.req.json();

  const messages = [
    { role: 'system', content: buildSystemPrompt(page_context) },
    ...(conversation_history || []).map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const stream = await runInference(c.env.AI, { model, messages, stream: true });

    if (stream instanceof ReadableStream) {
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return c.json({ content: stream, model });
  } catch (err) {
    return c.json({ error: 'AI service temporarily unavailable' }, 503);
  }
});

// POST /api/v1/ai/summarize
aiRoutes.post('/summarize', async (c) => {
  const { url, page_text } = await c.req.json();

  // Check cache first
  const cacheKey = `summary:${await hashText(url)}`;
  const cached = await c.env.PAGE_CACHE.get(cacheKey, 'json');
  if (cached) return c.json(cached);

  const truncated = (page_text || '').slice(0, 6000);

  try {
    const result = await runInference(c.env.AI, {
      model: c.env.DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'Summarize the following web page content. Provide a concise summary with 3-5 key points. Format with bullet points.' },
        { role: 'user', content: `URL: ${url}\n\nContent:\n${truncated}` },
      ],
    });

    const response = { summary: result as string, url, model: c.env.DEFAULT_MODEL };

    // Cache for 1 hour
    await c.env.PAGE_CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 });

    return c.json(response);
  } catch (err) {
    return c.json({ error: 'Summarization failed' }, 503);
  }
});

// POST /api/v1/ai/translate
aiRoutes.post('/translate', async (c) => {
  const { text, source_lang, target_lang } = await c.req.json();

  try {
    const result = await c.env.AI.run(TRANSLATION_MODEL as any, {
      text,
      source_lang: source_lang || 'en',
      target_lang: target_lang || 'ak', // Akan/Twi
    });

    return c.json({
      translated_text: (result as any).translated_text,
      source_lang,
      target_lang,
      disclaimer: 'Translation may not be fully accurate. Verify important content.',
    });
  } catch (err) {
    return c.json({ error: 'Translation failed' }, 503);
  }
});

// POST /api/v1/ai/search
aiRoutes.post('/search', async (c) => {
  const { query } = await c.req.json();

  // Check cache
  const cacheKey = `search:${await hashText(query)}`;
  const cached = await c.env.PAGE_CACHE.get(cacheKey, 'json');
  if (cached) return c.json(cached);

  try {
    const result = await runInference(c.env.AI, {
      model: c.env.DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'You are a search assistant. Provide a comprehensive answer to the query. Include relevant facts, context, and sources where possible. Be concise but thorough.' },
        { role: 'user', content: query },
      ],
    });

    const response = { answer: result as string, query, model: c.env.DEFAULT_MODEL };

    // Cache for 30 minutes
    await c.env.PAGE_CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 1800 });

    return c.json(response);
  } catch (err) {
    return c.json({ error: 'Search failed' }, 503);
  }
});

// POST /api/v1/ai/compare
aiRoutes.post('/compare', async (c) => {
  const { items, criteria } = await c.req.json();

  try {
    const result = await runInference(c.env.AI, {
      model: c.env.DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'Compare the following items. Create a structured comparison with pros, cons, and a recommendation. Use a table format where appropriate.' },
        { role: 'user', content: `Compare: ${items.join(' vs ')}\n${criteria ? `Criteria: ${criteria}` : ''}` },
      ],
    });

    return c.json({ comparison: result as string, items, model: c.env.DEFAULT_MODEL });
  } catch (err) {
    return c.json({ error: 'Comparison failed' }, 503);
  }
});

// Helper
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Test Worker locally**

Run: `cd worker && npx wrangler dev`
Test: `curl http://localhost:8787/api/v1/health`
Expected: `{"status":"ok","app":"OS Browser API","version":"1.0.0"}`

- [ ] **Step 5: Commit**

```bash
git add worker/
git commit -m "feat: add Cloudflare Worker AI routes — chat, summarize, translate, search, compare with fallback chain"
```

---

## Chunk 3: Renderer Foundation — Design System, Shell Components

This chunk produces: a styled Electron window with custom title bar, tab bar, navigation bar, and status bar. No tab content yet — just the browser chrome.

---

### Task 9: Renderer Scaffolding — Vite, Tailwind, Design System

**Files:**
- Create: `packages/renderer/vite.config.ts`
- Create: `packages/renderer/tailwind.config.js`
- Create: `packages/renderer/postcss.config.js`
- Create: `packages/renderer/index.html`
- Create: `packages/renderer/src/main.tsx`
- Create: `packages/renderer/src/App.tsx`
- Create: `packages/renderer/src/styles/globals.css`

- [ ] **Step 1: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 2: Create postcss.config.js**

```javascript
// packages/renderer/postcss.config.js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 3: Create tailwind.config.js with Ghana design system**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0c0e14', light: '#F8F9FA' },
        surface: {
          1: '#14171f', 2: '#1a1e28', 3: '#21262f',
          '1-light': '#FFFFFF', '2-light': '#F0F1F3', '3-light': '#E8E9EB',
        },
        border: {
          1: '#2a2f3a', 2: '#363c4a',
          '1-light': '#E0E2E6', '2-light': '#D0D3D8',
        },
        text: {
          primary: '#e8eaf0', secondary: '#8b92a5', muted: '#5c637a',
          'primary-light': '#1A1D23', 'secondary-light': '#5C6370', 'muted-light': '#9CA3AF',
        },
        ghana: {
          gold: '#D4A017', 'gold-light': '#F2C94C', 'gold-dim': 'rgba(212,160,23,0.12)',
          'gold-dark': '#B8860B',
          red: '#CE1126', green: '#006B3F',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: '11px', sm: '12px', base: '13px', md: '14px', lg: '16px', xl: '20px', '2xl': '28px',
      },
      borderRadius: {
        card: '12px', search: '16px', btn: '8px',
      },
      animation: {
        'slide-in-right': 'slideInRight 200ms ease-out',
        'fade-in': 'fadeIn 150ms ease-out',
        'gold-pulse': 'goldPulse 2s ease-in-out infinite',
        'dot-pulse': 'dotPulse 1.4s infinite ease-in-out both',
      },
      keyframes: {
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        goldPulse: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,160,23,0.4)' }, '50%': { boxShadow: '0 0 12px 4px rgba(212,160,23,0.2)' } },
        dotPulse: { '0%, 80%, 100%': { opacity: '0' }, '40%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Create globals.css with font imports and base styles**

```css
/* packages/renderer/src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/DMSans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/DMSans-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/DMSans-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@layer base {
  body {
    @apply bg-bg text-text-primary font-sans m-0 p-0 overflow-hidden select-none;
    -webkit-app-region: no-drag;
  }

  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { @apply bg-border-1 rounded-full; }
  ::-webkit-scrollbar-thumb:hover { @apply bg-border-2; }

  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

- [ ] **Step 4: Create index.html, main.tsx, and App.tsx shell**

```html
<!-- packages/renderer/index.html -->
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OS Browser</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src https://*.workers.dev https://askozzy.ghwmelite.workers.dev http://localhost:*">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

```tsx
// packages/renderer/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```tsx
// packages/renderer/src/App.tsx
import React from 'react';

export function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-bg">
      {/* TitleBar placeholder */}
      <div className="h-8 bg-surface-1 border-b border-border-1 flex items-center px-3 text-sm text-text-secondary"
           style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        OS Browser
      </div>

      {/* Main content placeholder */}
      <div className="flex-1 flex items-center justify-center text-text-muted">
        Browser shell ready
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Download and place font files in assets/fonts/**

Download DM Sans and JetBrains Mono .woff2 files from Google Fonts / JetBrains. Place in `assets/fonts/`. Copy to `packages/renderer/public/fonts/` for Vite dev server.

- [ ] **Step 6: Start Vite dev server, verify styles render**

Run: `cd packages/renderer && npm run dev`
Expected: Dark-themed page with "OS Browser" title bar and "Browser shell ready" text

- [ ] **Step 7: Build all and launch Electron with renderer**

Run: `npm run build && npx electron packages/main/dist/main.js`
Expected: Electron window with custom frameless title bar, dark Ghana-themed background

- [ ] **Step 8: Commit**

```bash
git add packages/renderer/ assets/fonts/
git commit -m "feat: scaffold renderer with Vite, Tailwind Ghana design system, font bundling, and App shell"
```

---

### Task 10: TitleBar Component

**Files:**
- Create: `packages/renderer/src/components/Browser/TitleBar.tsx`
- Modify: `packages/renderer/src/App.tsx`

- [ ] **Step 1: Create TitleBar.tsx — custom window chrome with Ghana traffic lights**

```tsx
// packages/renderer/src/components/Browser/TitleBar.tsx
import React from 'react';

export function TitleBar() {
  const handleMinimize = () => window.osBrowser.minimize();
  const handleMaximize = () => window.osBrowser.maximize();
  const handleClose = () => window.osBrowser.close();

  return (
    <div
      className="h-8 bg-surface-1 border-b border-border-1 flex items-center justify-between px-3 shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Traffic light window controls — Ghana flag colors */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Each button has a 32x32px clickable area for accessibility, with a 12px visual dot */}
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          aria-label="Close window"
        >
          <span className="w-3 h-3 rounded-full bg-ghana-red" />
        </button>
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          aria-label="Minimize window"
        >
          <span className="w-3 h-3 rounded-full bg-ghana-gold" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          aria-label="Maximize window"
        >
          <span className="w-3 h-3 rounded-full bg-ghana-green" />
        </button>
      </div>

      {/* Centered title */}
      <span className="text-sm text-text-secondary font-medium tracking-wide">
        OS Browser
      </span>

      {/* Spacer for centering */}
      <div className="w-[52px]" />
    </div>
  );
}
```

- [ ] **Step 2: Wire TitleBar into App.tsx**

Replace the placeholder title bar div with `<TitleBar />`.

- [ ] **Step 3: Verify title bar renders with traffic light buttons**

Expected: Custom title bar with red/gold/green circles, "OS Browser" centered, window draggable

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/src/components/Browser/TitleBar.tsx
git commit -m "feat: add custom TitleBar with Ghana flag traffic light window controls"
```

---

### Task 11: Zustand Stores — Tabs, Navigation, Settings, Connectivity

**Files:**
- Create: `packages/renderer/src/store/tabs.ts`
- Create: `packages/renderer/src/store/navigation.ts`
- Create: `packages/renderer/src/store/settings.ts`
- Create: `packages/renderer/src/store/sidebar.ts`
- Create: `packages/renderer/src/store/connectivity.ts`

- [ ] **Step 1: Create all Zustand stores**

Each store follows the same pattern: state + actions, communicating with main process via `window.osBrowser.*` IPC calls. Stores are the single source of truth for the renderer — components subscribe to stores, stores call IPC, IPC calls SQLite.

Key stores:
- `tabs.ts`: tab list, active tab ID, create/close/switch/reorder actions
- `navigation.ts`: current URL, loading state, canGoBack/canGoForward
- `settings.ts`: user profile, theme, loaded on app init
- `sidebar.ts`: open/closed state, active panel (ai | askozzy | none)
- `connectivity.ts`: online/intermittent/offline state, queued count

- [ ] **Step 2: Commit**

```bash
git add packages/renderer/src/store/
git commit -m "feat: add Zustand stores for tabs, navigation, settings, sidebar, and connectivity"
```

---

### Task 12: TabBar, NavigationBar, StatusBar Components

**Files:**
- Create: `packages/renderer/src/components/Browser/TabBar.tsx`
- Create: `packages/renderer/src/components/Browser/Tab.tsx`
- Create: `packages/renderer/src/components/Browser/NavigationBar.tsx`
- Create: `packages/renderer/src/components/Browser/OmniBar.tsx`
- Create: `packages/renderer/src/components/Browser/StatusBar.tsx`
- Modify: `packages/renderer/src/App.tsx`

- [ ] **Step 1: Create Tab.tsx — individual tab with favicon, title, close button**

Active tab has gold top border. Close button appears on hover. Pinned tabs show favicon only.

- [ ] **Step 2: Create TabBar.tsx — horizontal tab strip with add button**

Tab list from Zustand store. "+" new tab button at right. Keyboard: Ctrl+T creates tab, Ctrl+W closes.

- [ ] **Step 3: Create OmniBar.tsx — unified URL/search input**

Detects URLs (contains ".") vs search queries. Shows shield icon for HTTPS. Debounced history autocomplete from IPC.

- [ ] **Step 4: Create NavigationBar.tsx — back/forward/refresh + omnibar + AI toggle**

Nav buttons (lucide-react icons), OmniBar center, bookmark star + AI toggle button (gold glow when sidebar active) + AskOzzy button on right.

- [ ] **Step 5: Create StatusBar.tsx — bottom bar**

Shows: connection status (green/amber/red dot), ads blocked count, page load time, "Privacy Mode" badge when active.

- [ ] **Step 6: Wire all into App.tsx layout**

```tsx
<div className="h-screen w-screen flex flex-col bg-bg">
  <TitleBar />
  <TabBar />
  <NavigationBar />
  <BookmarksBar /> {/* placeholder for now */}
  <div className="flex-1 flex overflow-hidden">
    <ContentArea /> {/* placeholder */}
    {/* AISidebar slides in here */}
  </div>
  <StatusBar />
</div>
```

- [ ] **Step 7: Verify full browser chrome renders**

Expected: Title bar → tab strip → navigation bar → content area → status bar. All styled with Ghana design system.

- [ ] **Step 8: Commit**

```bash
git add packages/renderer/src/components/Browser/
git commit -m "feat: add TabBar, NavigationBar with OmniBar, and StatusBar — complete browser chrome"
```

---

## Chunk 4: Browser Core — Tab Content, WebContentsView, Navigation

This chunk produces: functional tab browsing — creating tabs, navigating to URLs, back/forward, and rendering web pages via WebContentsView.

---

### Task 13: Tab Management IPC Handlers

**Files:**
- Create: `packages/main/src/ipc/tabs.ts`
- Modify: `packages/main/src/ipc/handlers.ts`
- Modify: `packages/main/src/main.ts`

- [ ] **Step 1: Create tabs.ts — tab CRUD + WebContentsView management**

This is the most complex IPC handler. It manages a Map of `WebContentsView` instances, one per tab. Key operations:
- `tab:create` — create new WebContentsView, add to BrowserWindow, store in SQLite
- `tab:close` — destroy WebContentsView, remove from DB
- `tab:switch` — hide current view, show target view
- `tab:navigate` — call `webContents.loadURL()` on the active tab's view
- `tab:go-back/forward/reload/stop` — delegate to `webContents.goBack()` etc.
- Forward `page-title-updated`, `page-favicon-updated`, `did-navigate` events back to renderer via IPC

- [ ] **Step 2: Register tab handlers in handlers.ts**

- [ ] **Step 3: Test tab creation and navigation**

Expected: Creating a tab opens a WebContentsView. Navigating to `https://ghana.gov.gh` loads the page inside the Electron window.

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/ipc/tabs.ts
git commit -m "feat: add tab management with WebContentsView — create, close, switch, navigate"
```

---

### Task 14: Content Area & New Tab Page

**Files:**
- Create: `packages/renderer/src/components/Content/ContentArea.tsx`
- Create: `packages/renderer/src/components/Content/NewTabPage.tsx`

- [ ] **Step 1: Create ContentArea.tsx**

Manages which content to show based on the active tab's URL. If URL is `os-browser://newtab`, render the NewTabPage React component. Otherwise, the WebContentsView handles rendering (managed by main process — the renderer just shows a transparent container).

- [ ] **Step 2: Create NewTabPage.tsx — Ghana-focused new tab experience**

- Time-aware greeting
- Prominent search bar (OmniBar duplicate, auto-focused)
- Government portals grid (from `window.osBrowser.govPortals.list()`)
- AI Quick Actions cards
- AskOzzy card
- Recent history (last 5)
- Ad block stats summary

- [ ] **Step 3: Verify new tab page renders and gov portals appear**

Expected: Opening OS Browser shows the new tab page with Ghana government portal shortcuts

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/src/components/Content/
git commit -m "feat: add ContentArea and NewTabPage with Ghana gov portals grid and AI quick actions"
```

---

### Task 15: History & Bookmarks IPC Handlers

**Files:**
- Create: `packages/main/src/ipc/history.ts`
- Create: `packages/main/src/ipc/bookmarks.ts`
- Modify: `packages/main/src/ipc/handlers.ts`

- [ ] **Step 1: Create history.ts — auto-record visits, search, CRUD**

- `history:add` — upsert URL (increment visit_count if exists)
- `history:list` — paginated, sorted by last_visited_at DESC
- `history:search` — FTS5 query on history_fts
- `history:delete` / `history:clear`
- Called automatically by tab handler on `did-navigate` events

- [ ] **Step 2: Create bookmarks.ts — CRUD + folders**

- `bookmark:list` — return all bookmarks + folders as tree
- `bookmark:add` / `bookmark:update` / `bookmark:delete`
- `bookmark:folder:create` / `bookmark:folder:delete`
- `bookmark:is-bookmarked` — check if URL is bookmarked

- [ ] **Step 3: Register in handlers.ts, verify via IPC**

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/ipc/history.ts packages/main/src/ipc/bookmarks.ts
git commit -m "feat: add history and bookmark IPC handlers with FTS5 search"
```

---

### Task 16: Ad Blocking Service

**Files:**
- Create: `packages/main/src/services/adblock.ts`
- Modify: `packages/main/src/main.ts`

- [ ] **Step 1: Create adblock.ts — network-level request blocking**

Uses `session.webRequest.onBeforeRequest` to intercept requests before they're sent. Matches against a compiled regex blocklist (subset of EasyList patterns). Auto-whitelists Ghana government domains from `AD_BLOCK_WHITELIST` constant. Tracks per-page stats.

- [ ] **Step 2: Initialize ad blocker in main.ts after app ready**

- [ ] **Step 3: Test by navigating to a page with ads**

Expected: Ads blocked, stats count increments, government portals load without blocking

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/services/adblock.ts
git commit -m "feat: add network-level ad blocking with Ghana gov domain whitelist"
```

---

## Chunk 5: AI Features — Sidebar, Chat, Summarize, Translate

This chunk produces: the AI sidebar with multi-model chat, page summarization, and translation.

---

### Task 17: AI IPC Handler & Cloudflare Client

**Files:**
- Create: `packages/main/src/net/cloudflare.ts`
- Create: `packages/main/src/net/connectivity.ts`
- Create: `packages/main/src/ipc/ai.ts`
- Create: `packages/main/src/services/offline-queue.ts`
- Modify: `packages/main/src/ipc/handlers.ts`

- [ ] **Step 1: Create cloudflare.ts — HTTP client for AI Worker**

Handles device registration on first launch (stores token in safeStorage), sends authenticated requests to the Worker, handles streaming responses (SSE parsing).

- [ ] **Step 2: Create connectivity.ts — online/offline detection**

Periodically pings `/api/v1/health`. Emits connectivity state changes to renderer via IPC.

- [ ] **Step 3: Create offline-queue.ts — queue and process on reconnect**

Saves requests to `offline_queue` table when offline. Processes queue on reconnect with priority ordering.

- [ ] **Step 4: Create ai.ts IPC handler**

Routes AI requests through cloudflare client or offline queue depending on connectivity. Caches responses locally (summary_cache, translation_cache). Streams chat responses back to renderer via IPC events.

- [ ] **Step 5: Commit**

```bash
git add packages/main/src/net/ packages/main/src/ipc/ai.ts packages/main/src/services/offline-queue.ts
git commit -m "feat: add Cloudflare AI client with device auth, offline queue, and AI IPC handlers"
```

---

### Task 18: AI Sidebar Components

**Files:**
- Create: `packages/renderer/src/components/Sidebar/AISidebar.tsx`
- Create: `packages/renderer/src/components/Sidebar/SidebarHeader.tsx`
- Create: `packages/renderer/src/components/Sidebar/ModelSelector.tsx`
- Create: `packages/renderer/src/components/Sidebar/QuickActions.tsx`
- Create: `packages/renderer/src/components/Sidebar/ChatArea.tsx`
- Create: `packages/renderer/src/components/Sidebar/ChatInput.tsx`
- Create: `packages/renderer/src/components/Sidebar/UserMessage.tsx`
- Create: `packages/renderer/src/components/Sidebar/AIMessage.tsx`
- Create: `packages/renderer/src/store/ai.ts`
- Modify: `packages/renderer/src/App.tsx`

- [ ] **Step 1: Create ai.ts Zustand store**

Manages: current conversation, messages array, streaming state, selected model, loading indicator.

- [ ] **Step 2: Create all sidebar components**

- `AISidebar.tsx`: 380px sliding panel, contains header + model selector + quick actions + chat area + input
- `ModelSelector.tsx`: Dropdown showing all 6 models with provider label
- `QuickActions.tsx`: Gold-outlined pill buttons — Summarize, Translate, Explain, Compare
- `ChatArea.tsx`: Scrollable message list with auto-scroll
- `UserMessage.tsx`: Gold-tinted, right-aligned
- `AIMessage.tsx`: Surface-2 background, left-aligned, markdown rendered via react-markdown
- `ChatInput.tsx`: Text input + gold send button, Enter to send, Ctrl+Enter for newline

- [ ] **Step 3: Wire sidebar into App.tsx layout**

Sidebar slides in from right when AI toggle is clicked. Mutually exclusive with AskOzzy panel.

- [ ] **Step 4: Test end-to-end: type message → IPC → Cloudflare Worker → streaming response → rendered in chat**

Expected: Full AI chat working with model selection and markdown rendering

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/components/Sidebar/ packages/renderer/src/store/ai.ts
git commit -m "feat: add AI sidebar with multi-model chat, streaming responses, and quick actions"
```

---

## Chunk 6: Panels, Settings, Keyboard Shortcuts

This chunk produces: history panel, bookmark manager, settings panel, gov portals panel, and all keyboard shortcuts.

---

### Task 19: History & Bookmark Panels

**Files:**
- Create: `packages/renderer/src/components/Panels/HistoryPanel.tsx`
- Create: `packages/renderer/src/components/Panels/BookmarkManager.tsx`
- Create: `packages/renderer/src/components/Browser/BookmarksBar.tsx`
- Create: `packages/renderer/src/store/history.ts`
- Create: `packages/renderer/src/store/bookmarks.ts`

- [ ] **Step 1: Create stores — history and bookmarks**

Load from IPC on init, cache in Zustand, update on mutations.

- [ ] **Step 2: Create HistoryPanel.tsx**

Overlay panel. Time-grouped entries (Today, Yesterday, Last 7 days, Older). Search input at top. Click entry to navigate. Delete individual entries.

- [ ] **Step 3: Create BookmarkManager.tsx**

Overlay panel. Folder tree on left, bookmarks on right. Add/edit/delete bookmarks. Create folders. Drag-to-reorder.

- [ ] **Step 4: Create BookmarksBar.tsx**

Horizontal strip below navigation bar. Shows top-level bookmarks as favicon + truncated title. Click to navigate.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/components/Panels/ packages/renderer/src/components/Browser/BookmarksBar.tsx packages/renderer/src/store/
git commit -m "feat: add history panel, bookmark manager, and bookmarks bar"
```

---

### Task 20: Settings Panel & Gov Portals Panel

**Files:**
- Create: `packages/renderer/src/components/Panels/SettingsPanel.tsx`
- Create: `packages/renderer/src/components/Panels/GovPortalsPanel.tsx`
- Create: `packages/renderer/src/components/Panels/StatsPanel.tsx`

- [ ] **Step 1: Create SettingsPanel.tsx**

Sections: Appearance (theme toggle, sidebar position), AI (default model), Privacy (privacy mode, ad blocking), Search Engine, Language, Network (proxy config), Integrations (AskOzzy connect), Data (import bookmarks, clear data).

- [ ] **Step 2: Create GovPortalsPanel.tsx**

Grid of government portal cards. Toggle visibility. Reorder. Add custom portals.

- [ ] **Step 3: Create StatsPanel.tsx**

Dashboard: total pages visited, total bookmarks, total conversations, total ads blocked, most visited sites, AI usage by model.

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/src/components/Panels/
git commit -m "feat: add settings, gov portals management, and stats dashboard panels"
```

---

### Task 21: Keyboard Shortcuts

**Files:**
- Create: `packages/renderer/src/hooks/useKeyboardShortcuts.ts`
- Modify: `packages/renderer/src/App.tsx`

- [ ] **Step 1: Create useKeyboardShortcuts.ts**

Global keyboard event listener. Maps all shortcuts from spec (Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+L, Ctrl+J, Ctrl+H, Ctrl+B, Ctrl+D, Ctrl+Shift+S, Ctrl+Shift+O, Ctrl+Shift+P, F5, F11, Escape, etc.) to store actions and IPC calls.

- [ ] **Step 2: Wire into App.tsx**

Call `useKeyboardShortcuts()` in App component.

- [ ] **Step 3: Test all shortcuts work**

Expected: Each shortcut triggers the correct action

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/src/hooks/useKeyboardShortcuts.ts
git commit -m "feat: add all keyboard shortcuts — tabs, navigation, features, AI sidebar"
```

---

## Chunk 7: AskOzzy Integration, Agents, Polish

This chunk produces: AskOzzy panel, custom AI agents, system tray, auto-updater, error pages.

---

### Task 22: AskOzzy Panel

**Files:**
- Create: `packages/renderer/src/components/AskOzzyPanel.tsx`

- [ ] **Step 1: Create AskOzzyPanel.tsx**

380px side panel. AskOzzy is loaded in a dedicated WebContentsView managed by the main process (consistent with tab rendering strategy — no `<webview>` tag). Shows connect/disconnect state. "Send to AskOzzy" feature extracts current page text and opens AskOzzy with prefilled context.

- [ ] **Step 2: Add AskOzzy integration settings in SettingsPanel**

Connect/disconnect flow. Token stored in safeStorage via IPC.

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src/components/AskOzzyPanel.tsx
git commit -m "feat: add AskOzzy panel integration with linked account support"
```

---

### Task 23: Custom AI Agents

**Files:**
- Create: `packages/main/src/ipc/agents.ts`
- Create: `packages/renderer/src/components/Sidebar/AgentPanel.tsx`

- [ ] **Step 1: Create agents.ts IPC handler**

CRUD for user_agents table. Execute agent: build messages with custom system prompt, call AI.

- [ ] **Step 2: Create AgentPanel.tsx**

List custom agents. Create/edit form (name, description, system prompt, model, triggers). Execute agent with input.

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/ipc/agents.ts packages/renderer/src/components/Sidebar/AgentPanel.tsx
git commit -m "feat: add custom AI agents — create, manage, and execute with custom system prompts"
```

---

### Task 24: System Tray, Auto-Updater, Error Pages

**Files:**
- Create: `packages/main/src/services/tray.ts`
- Create: `packages/main/src/services/auto-update.ts`
- Create: `packages/renderer/src/components/Content/ErrorPage.tsx`
- Create: `packages/renderer/src/components/Content/SearchResults.tsx`

- [ ] **Step 1: Create tray.ts — system tray icon and menu**

- [ ] **Step 2: Create auto-update.ts — electron-updater with GitHub Releases**

- [ ] **Step 3: Create ErrorPage.tsx — connection error / blocked content page**

- [ ] **Step 4: Create SearchResults.tsx — AI-powered search results display**

AI answer card at top (highlighted with Ghana gold accent), source info, model badge.

- [ ] **Step 5: Commit**

```bash
git add packages/main/src/services/ packages/renderer/src/components/Content/
git commit -m "feat: add system tray, auto-updater, error pages, and AI search results"
```

---

## Chunk 8: Build & Package

This chunk produces: installable .exe and .msi packages.

---

### Task 25: Electron Builder Configuration

**Files:**
- Create: `electron-builder.yml`

- [ ] **Step 1: Create electron-builder.yml**

```yaml
appId: com.osbrowser.app
productName: OS Browser
directories:
  output: out
  buildResources: assets
files:
  - packages/main/dist/**/*
  - packages/preload/dist/**/*
  - packages/renderer/dist/**/*
  - packages/shared/dist/**/*
  - assets/**/*
  - node_modules/better-sqlite3/**/*
win:
  target:
    - target: nsis
      arch: [x64]
    - target: msi
      arch: [x64]
  icon: assets/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: OS Browser
msi:
  oneClick: false
  perMachine: true
publish:
  provider: github
  owner: ohwpstudios
  repo: os-browser
```

- [ ] **Step 2: Build all packages**

Run: `npm run build`
Expected: All packages compile without errors

- [ ] **Step 3: Package .exe installer**

Run: `npm run package:exe`
Expected: `out/OS-Browser-Setup-1.0.0.exe` created (~80MB)

- [ ] **Step 4: Test installer — install, launch, verify full flow**

Expected: Install → launch → new tab page with gov portals → navigate to URL → AI sidebar chat → bookmarks → history → settings all working

- [ ] **Step 5: Commit**

```bash
git add electron-builder.yml
git commit -m "feat: add electron-builder config for .exe and .msi packaging"
```

---

## Chunk 8a: Missing Features — Credentials, Downloads, Print, Page Cache, Proxy

This chunk covers features from the spec that were not in the original task set.

---

### Task 26: Credential Manager

**Files:**
- Create: `packages/main/src/ipc/credentials.ts`
- Create: `packages/main/src/services/credential-encryption.ts`
- Create: `packages/renderer/src/components/UI/CredentialPrompt.tsx`

- [ ] **Step 1: Create credential-encryption.ts — per-credential encryption via safeStorage**

Separate encryption key from DB key. Uses safeStorage to store a credential-specific AES key. Encrypts/decrypts individual username+password values.

- [ ] **Step 2: Create credentials.ts IPC handler**

CRUD for credentials table. Encrypt before store, decrypt on retrieve. Match URLs by pattern.

- [ ] **Step 3: Add form detection to tab WebContentsView**

On `did-finish-load`, inject a script to detect login forms (elements with `type="password"`). When form is submitted and navigation succeeds, send IPC event to prompt user to save credentials.

- [ ] **Step 4: Create CredentialPrompt.tsx**

Slide-down prompt: "Save password for [site]? [Save] [Never for this site]". On revisit, click-to-fill prompt.

- [ ] **Step 5: Commit**

```bash
git add packages/main/src/ipc/credentials.ts packages/main/src/services/credential-encryption.ts packages/renderer/src/components/UI/CredentialPrompt.tsx
git commit -m "feat: add credential manager with encrypted storage and form detection"
```

---

### Task 27: Download Protection

**Files:**
- Create: `packages/main/src/services/downloads.ts`
- Create: `packages/renderer/src/components/UI/DownloadBar.tsx`

- [ ] **Step 1: Create downloads.ts — download handling via session.on('will-download')**

Intercept downloads. Warn on executable extensions (.exe, .bat, .cmd, .ps1, .msi). Block non-HTTPS downloads (configurable). Track download progress. Save to user's Downloads folder.

- [ ] **Step 2: Create DownloadBar.tsx**

Bottom bar showing active downloads with progress, filename, and open/cancel buttons. Warning icon on suspicious files.

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/services/downloads.ts packages/renderer/src/components/UI/DownloadBar.tsx
git commit -m "feat: add download protection with executable warnings and HTTPS enforcement"
```

---

### Task 28: Print Support

**Files:**
- Modify: `packages/main/src/ipc/tabs.ts`
- Modify: `packages/renderer/src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: Add print IPC handlers to tabs.ts**

`tab:print` — calls `webContents.print()` on active tab's WebContentsView
`tab:print-to-pdf` — calls `webContents.printToPDF()`, opens save dialog

- [ ] **Step 2: Add Ctrl+P shortcut to useKeyboardShortcuts.ts**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add print support with Ctrl+P and Print to PDF"
```

---

### Task 29: Page Cache for Offline Browsing

**Files:**
- Create: `packages/main/src/services/page-cache.ts`

- [ ] **Step 1: Create page-cache.ts**

On `did-finish-load`, extract cleaned HTML from WebContentsView via `webContents.executeJavaScript('document.documentElement.outerHTML')`. Hash URL, save to `%APPDATA%/os-browser/page-cache/{hash}.html` with metadata JSON. LRU eviction when cache exceeds `PAGE_CACHE_LIMIT_MB`. Government portals (matching `AD_BLOCK_WHITELIST` patterns) are never auto-evicted.

- [ ] **Step 2: Serve cached pages when offline**

When navigating while offline, check page cache. If hit, load from `file://` path. Show banner: "Viewing cached version from [date]".

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/services/page-cache.ts
git commit -m "feat: add local page cache with LRU eviction and offline serving"
```

---

### Task 30: Tab Suspension

**Files:**
- Modify: `packages/main/src/ipc/tabs.ts`

- [ ] **Step 1: Add suspension timer to tab management**

Track `last_accessed_at` per tab. Run a periodic check every 60 seconds. If a tab hasn't been accessed for `TAB_SUSPEND_AFTER_MS` (5 min) and there are more than `MAX_CONCURRENT_TABS` (10) active WebContentsViews, suspend the oldest inactive tab by destroying its WebContentsView (keep SQLite entry with URL/title/favicon). On switch, restore by creating a new WebContentsView and loading the URL.

- [ ] **Step 2: Show suspended indicator in tab UI**

Renderer shows a subtle "zzz" or dimmed favicon for suspended tabs.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add tab suspension after 5min inactivity to reduce memory usage"
```

---

### Task 31: Certificate Error Handling & Proxy Config

**Files:**
- Modify: `packages/main/src/main.ts`
- Modify: `packages/main/src/ipc/settings.ts`
- Create: `packages/renderer/src/components/Content/CertErrorPage.tsx`

- [ ] **Step 1: Add certificate error handler in main.ts**

```typescript
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // Allow *.gov.gh domains with cert issues (show warning but proceed)
  const hostname = new URL(url).hostname;
  if (hostname.endsWith('.gov.gh') || hostname.endsWith('.mil.gh')) {
    event.preventDefault();
    callback(true); // Allow despite cert error
    // Send warning to renderer
    mainWindow?.webContents.send('cert-warning', { url, error: error.toString() });
  } else {
    callback(false); // Block — show cert error page
  }
});
```

- [ ] **Step 2: Create CertErrorPage.tsx**

Error page for certificate failures. Shows error details, "Advanced > Proceed anyway" option for non-gov sites.

- [ ] **Step 3: Add proxy configuration to settings IPC**

When proxy settings change, call `session.defaultSession.setProxy()` with the new config. Support HTTP, HTTPS, SOCKS5, and PAC URL.

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/ packages/renderer/src/components/Content/CertErrorPage.tsx
git commit -m "feat: add cert error handling for gov.gh domains and proxy configuration"
```

---

### Task 32: Bookmark Import

**Files:**
- Create: `packages/main/src/services/bookmark-import.ts`

- [ ] **Step 1: Create bookmark-import.ts**

Parse Netscape Bookmark File Format (HTML). All three browsers (Chrome, Edge, Firefox) export this format. Extract folder structure (`<DT><H3>` = folder, `<DT><A>` = bookmark). Insert into bookmarks/bookmark_folders tables.

- [ ] **Step 2: Add import IPC handler**

Open file dialog (`dialog.showOpenDialog` with `.html` filter), parse selected file, return preview of bookmarks found, then insert on confirmation.

- [ ] **Step 3: Wire into SettingsPanel > Data > Import Bookmarks**

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/services/bookmark-import.ts
git commit -m "feat: add bookmark import from Chrome/Edge/Firefox (Netscape HTML format)"
```

---

### Task 33: Cloud Sync Module (Deferred — v1.1)

**Note:** This task is intentionally deferred to v1.1. The infrastructure (D1, R2) is provisioned and the `sync_enabled` flag exists in user_profile. Implementation involves:
- `packages/main/src/ipc/sync.ts` — sync bookmarks, tabs, settings to Cloudflare D1
- Worker routes for sync CRUD
- Conflict resolution (last-write-wins)
- Sync status indicator in StatusBar

This is documented here for completeness but is NOT part of the v1.0 implementation.

---

## Task Dependency Summary

```
Task 1 (Monorepo) → Task 2 (Shared) → Task 3 (Database) → Task 4 (Main + Preload)
                                                                ↓
Task 5 (Settings IPC) ← Task 4                    Task 6 (Worker Scaffold)
                                                    ↓
                                                   Task 7 (Worker Auth)
                                                    ↓
                                                   Task 8 (Worker AI Routes)

Task 9 (Renderer Scaffold) ← Task 2
  ↓
Task 10 (TitleBar) → Task 11 (Stores) → Task 12 (Browser Chrome)
  ↓
Task 13 (Tab IPC) → Task 14 (Content Area) → Task 15 (History/Bookmarks IPC)
  ↓
Task 16 (Ad Blocking)

Task 17 (AI IPC) ← Task 8 + Task 5
  ↓
Task 18 (AI Sidebar)

Task 19 (Panels) → Task 20 (Settings Panel) → Task 21 (Shortcuts)
  ↓
Task 22 (AskOzzy) → Task 23 (Agents) → Task 24 (Polish)

Task 26 (Credentials) ← Task 13
Task 27 (Downloads) ← Task 13
Task 28 (Print) ← Task 13 + Task 21
Task 29 (Page Cache) ← Task 13 + Task 16
Task 30 (Tab Suspension) ← Task 13
Task 31 (Cert + Proxy) ← Task 4 + Task 20
Task 32 (Bookmark Import) ← Task 15
  ↓
Task 25 (Package) ← All above
```

**Parallelizable work:**
- Tasks 6-8 (Worker) can run in parallel with Tasks 9-12 (Renderer chrome)
- Tasks 15 (History/Bookmarks IPC) and Task 16 (Ad Blocking) are independent
- Tasks 19-21 (Panels + Shortcuts) are independent of Task 17-18 (AI features)
- Tasks 26-32 (new features) are mostly independent of each other and can run in parallel after Task 13

**Total: 32 tasks + 1 deferred (Cloud Sync v1.1)**
