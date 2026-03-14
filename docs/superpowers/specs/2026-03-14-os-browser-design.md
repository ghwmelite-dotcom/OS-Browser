# OS Browser — Design Specification

**Product:** OS Browser (OzzySurf)
**Type:** AI-Powered Desktop Browser for Ghana Civil/Public Servants
**Owner:** Hodges & Co. Limited / ohwpstudios
**Developer:** Ozzy
**Date:** 2026-03-14
**Status:** Approved

---

## 1. Product Overview

OS Browser is a standalone Electron-based desktop browser built for Ghana's civil and public servants. It combines a full Chromium browsing experience with AI-powered productivity features, Ghana-first design, and government-grade privacy.

### Target Audience
- Ghana civil servants and public sector workers
- Daily tasks: accessing government portals (GIFMIS, CAGD, GRA, OHCS, E-SPAR), writing official correspondence, research and report compilation, email/communication, data entry into government databases

### Core Value Proposition
- **Ghana-first identity** — Ghana flag-inspired color palette, pre-loaded government portals, Twi language support
- **AI assistant built in** — Summarize pages, translate content, draft letters, research topics — all via Cloudflare Workers AI (free tier)
- **AskOzzy integration** — One-click access to Ghana's sovereign AI platform for deep research and analysis
- **Privacy by design** — All data local by default, encrypted database, no server-side user data storage
- **Works offline** — Cached pages, saved AI responses, queued requests processed on reconnect
- **Lightweight ad blocking** — Network-level blocking saves bandwidth, auto-whitelists government domains
- **Enterprise-ready** — MSI installer for IT department deployment via Group Policy

### What Sets It Apart from Top Browsers

| Shortcoming | Chrome/Edge/Firefox | OS Browser |
|---|---|---|
| RAM hungry | No tab suspension, wastes memory | Tab suspension after 5min inactivity, limits concurrent webview processes to 10 |
| No offline capability | Useless without internet | Cached pages, queued AI, offline history |
| Generic UI | No focus on productivity | Ghana gov portals, AI quick actions, civil service tools |
| No built-in AI | Must switch to ChatGPT separately | AI sidebar + AskOzzy integration built in |
| Poor data management | Bookmarks/history scattered | Organized, searchable, AI-summarized history |
| No local language support | English only | English + Twi translation (expanding) |
| Privacy concerns | Extensive tracking | Local-first, encrypted, no cloud telemetry |
| No gov integration | Generic browser | Pre-loaded Ghana government portals, auto-whitelisted |
| Ad overload | Extensions needed | Network-level blocking built in |

---

## 2. Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    OS Browser (Electron)                 │
│                                                         │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │    Main Process      │  │   Renderer Process      │  │
│  │    (Node.js)         │  │   (React + Chromium)     │  │
│  │                      │  │                          │  │
│  │  - Local SQLite DB   │  │  - Browser Chrome UI     │  │
│  │  - File system I/O   │  │  - Tab management        │  │
│  │  - Auto-updater      │  │  - AI Sidebar            │  │
│  │  - Ad blocking       │  │  - Settings/Panels       │  │
│  │  - System tray       │  │  - New Tab Page           │  │
│  │  - IPC handlers      │  │  - Webview containers    │  │
│  │  - Offline queue     │  │                          │  │
│  └──────────┬───────────┘  └──────────┬───────────────┘  │
│             │         IPC Bridge       │                  │
│             └──────────┬───────────────┘                  │
└────────────────────────┼────────────────────────────────┘
                         │ HTTPS (when online)
              ┌──────────▼──────────┐
              │  Cloudflare Worker  │
              │  (Stateless AI      │
              │   Microservice)     │
              │                     │
              │  - AI chat/reason   │
              │  - Summarization    │
              │  - Translation      │
              │  - AI search        │
              │  - Rate limiting    │
              │  - No user data     │
              └─────────────────────┘

              ┌─────────────────────┐
              │  Optional Sync      │
              │  (Cloudflare D1/KV) │  <- Only when user opts in
              │  - Bookmarks sync   │
              │  - Tab sync         │
              │  - Settings sync    │
              └─────────────────────┘
```

### Key Principles
- **Main Process** handles all local data (SQLite), file I/O, network-level ad blocking, system integration, and the offline queue
- **Renderer Process** is the React UI — all browser chrome, tabs, sidebar, panels
- **IPC Bridge** connects them securely (context isolation enabled, preload scripts)
- **Cloudflare Worker** is a stateless AI proxy — receives prompt, returns response, stores nothing
- **Optional Sync Module** uses D1/KV only when user explicitly enables sync

### Electron Tab Rendering Strategy
Each tab uses Electron's `WebContentsView` (Electron 30+) to render actual web pages. This is the modern replacement for the deprecated `<webview>` tag, with better process isolation and security:
- True web page rendering (not proxied/iframe'd)
- Network-level request interception for ad blocking (via `webRequest` API)
- Full cookie/session isolation per tab
- Better process isolation than `<webview>`
- DevTools disabled in production builds by default (admin-configurable via MSI property `ENABLE_DEVTOOLS=1`)

---

## 3. Local Data Layer

SQLite database stored at `%APPDATA%/os-browser/data.db` using `better-sqlite3`. Encrypted with SQLCipher (AES-256-CBC). Encryption key stored in Electron's `safeStorage` API (backed by Windows DPAPI), generated on first launch.

### Tables

```sql
-- User profile (single row — one user per install)
user_profile: id, display_name, email, avatar_path, default_model,
              theme, language, sidebar_position, ad_blocking,
              privacy_mode, search_engine, sync_enabled, created_at

-- Tabs (current session)
tabs: id, title, url, favicon_path, position, is_pinned,
      is_active, is_muted, last_accessed_at

-- History
history: id, url, title, favicon_path, visit_count,
         last_visited_at, ai_summary, page_text_excerpt

-- Full-text search index (separate from history for size management)
history_fts: id, history_id, page_text, indexed_at

-- Bookmark folders
bookmark_folders: id, name, parent_id, position, icon, created_at

-- Bookmarks
bookmarks: id, url, title, description, folder_id,
           favicon_path, position, created_at

-- AI conversations (saved locally)
conversations: id, title, model, page_url, created_at, updated_at

-- AI chat messages
chat_messages: id, conversation_id, role, content, model,
               page_context, tokens_used, created_at

-- Offline queue (requests to process when back online)
offline_queue: id, endpoint, payload_json, priority,
               created_at, status, retry_count

-- Ad block stats
adblock_stats: id, url, ads_blocked, trackers_blocked,
               bytes_saved, created_at

-- Custom AI agents
user_agents: id, name, description, system_prompt, model,
             triggers, is_active, created_at

-- Cached translations
translation_cache: id, source_text_hash, source_lang,
                   target_lang, translated_text, created_at

-- Cached page summaries
summary_cache: id, url_hash, url, summary, key_points_json,
               model, created_at

-- Government portal shortcuts
gov_portals: id, name, url, category, icon_path, position,
             is_default, is_visible

-- Saved credentials (encrypted)
credentials: id, url_pattern, username_encrypted, password_encrypted,
             display_name, last_used_at, created_at

-- Window state persistence
window_state: id, x, y, width, height, is_maximized, is_fullscreen,
              display_id, updated_at
```

**Note on `history_fts`:** Uses SQLite FTS5 virtual table for full-text search. `page_text_excerpt` in the history table stores the first 500 chars for display; full text lives in `history_fts` with a 90-day retention policy (auto-purged via scheduled cleanup).

### Default Ghana Government Portals (Pre-seeded)

| Name | URL | Category |
|---|---|---|
| Ghana.gov | ghana.gov.gh | General |
| GIFMIS | gifmis.finance.gov.gh | Finance |
| CAGD Payroll | cagd.gov.gh | Payroll |
| GRA Tax Portal | gra.gov.gh | Tax |
| SSNIT | ssnit.org.gh | Pensions |
| Public Services Commission | psc.gov.gh | HR |
| Ghana Health Service | ghs.gov.gh | Health |
| Ministry of Finance | mofep.gov.gh | Finance |
| OHCS Platform | ohcs.gov.gh | HR |
| E-SPAR Portal | ohcsgh.web.app | HR/Appraisal |

### File System Layout

```
%APPDATA%/os-browser/
├── data.db              # SQLite database (encrypted)
├── favicons/            # Cached favicons
├── page-cache/          # Cached page HTML (cleaned/ad-blocked)
│   ├── {url-hash}.html
│   └── {url-hash}.meta.json
└── exports/             # User-exported conversations, screenshots
```

- Pages cached automatically on visit (cleaned HTML, no ads/trackers)
- Cache limit: 500MB default (configurable in settings)
- LRU eviction — oldest unvisited pages removed first
- Government portals prioritized in cache (never auto-evicted)

---

## 4. Electron Main Process

### Module Structure

```
main/
├── main.ts              # App entry — window creation, lifecycle
├── ipc/
│   ├── handlers.ts      # IPC handler registration (single registry)
│   ├── tabs.ts          # Tab CRUD, webview management
│   ├── history.ts       # History read/write/search
│   ├── bookmarks.ts     # Bookmark CRUD + folders
│   ├── ai.ts            # AI requests -> Cloudflare or offline queue
│   ├── settings.ts      # User profile + preferences
│   ├── agents.ts        # Custom AI agent CRUD + execution
│   └── sync.ts          # Optional cloud sync module
├── db/
│   ├── database.ts      # SQLite connection, migrations
│   ├── migrations/      # Versioned schema migrations
│   └── seed.ts          # Default gov portals, default bookmarks
├── services/
│   ├── adblock.ts       # Network-level ad/tracker blocking
│   ├── offline-queue.ts # Queue AI requests, process on reconnect
│   ├── auto-update.ts   # Electron auto-updater config
│   └── tray.ts          # System tray icon + menu
├── net/
│   ├── cloudflare.ts    # HTTP client for Cloudflare AI Worker
│   └── connectivity.ts  # Online/offline detection + events
└── preload.ts           # Secure bridge — exposes IPC to renderer
```

### Ad Blocking (Network Level)

Uses Electron's `session.webRequest.onBeforeRequest` API:
- Blocklist sources: EasyList + EasyPrivacy (~70K rules)
- Ghana whitelist: `*.gov.gh`, `*.mil.gh`, `*.edu.gh`, `ohcsgh.web.app`
- Blocking happens before the request is sent — saves bandwidth
- Stats tracked per-page: ads blocked, trackers blocked, bytes saved

### Offline Queue

When offline:
1. AI requests saved to `offline_queue` table with priority
2. UI shows subtle indicator: "Offline — AI requests queued"
3. On reconnect, queue processes in priority order (FIFO within priority)
4. Desktop notification when queued responses complete

### Auto-Updater

- Uses `electron-updater` with GitHub Releases as update server
- Delta updates: ~5-15MB vs full ~80MB
- Silent background check every 6 hours
- User prompted to restart — never forced

### System Tray

- OS Browser icon in system tray
- Right-click menu: Open Browser, Quick Search, New Tab, Quit
- Minimize to tray option
- Badge count for queued offline AI responses

---

## 5. Renderer — UI & Component Architecture

### Component Tree

```
App.tsx
├── TitleBar.tsx                # Custom title bar — Ghana gold accent, window controls
├── TabBar.tsx                  # Horizontal tab strip
│   ├── Tab.tsx                 # Individual tab (favicon, title, close, pin)
│   └── NewTabButton.tsx        # "+" button
├── NavigationBar.tsx           # URL bar + controls
│   ├── NavButtons.tsx          # Back, Forward, Refresh, Home
│   ├── OmniBar.tsx             # Unified URL/search input
│   ├── BookmarkStar.tsx        # Toggle bookmark for current page
│   ├── ShieldIcon.tsx          # Ad block status indicator
│   └── AIToggle.tsx            # Open/close AI sidebar (gold glow when active)
├── BookmarksBar.tsx            # Quick-access strip below nav
├── ContentArea.tsx             # Main content region
│   ├── TabContentView.tsx      # Manages Electron WebContentsView per tab
│   ├── NewTabPage.tsx          # Default page — search, gov portals grid, AI features
│   ├── SearchResults.tsx       # AI-powered search results
│   └── ErrorPage.tsx           # Connection errors, blocked content
├── AISidebar.tsx               # Slides in from right (~380px)
│   ├── SidebarHeader.tsx       # Title + close button
│   ├── ModelSelector.tsx       # Dropdown — 6 AI models
│   ├── QuickActions.tsx        # Summarize, Translate, Explain, Compare pills
│   ├── ChatArea.tsx            # Message list (markdown rendered)
│   │   ├── UserMessage.tsx     # Gold-accented, right-aligned
│   │   └── AIMessage.tsx       # Dark surface, left-aligned, bot avatar
│   ├── ChatInput.tsx           # Text input + send button
│   └── AgentPanel.tsx          # Custom agent management
├── AskOzzyPanel.tsx            # AskOzzy integration (right side, replaces AI sidebar when open — only one panel open at a time)
├── Panels/
│   ├── HistoryPanel.tsx        # Time-grouped browsing history
│   ├── BookmarkManager.tsx     # Full folder tree + CRUD
│   ├── SettingsPanel.tsx       # All user preferences
│   ├── StatsPanel.tsx          # Usage analytics dashboard
│   └── GovPortalsPanel.tsx     # Manage Ghana government shortcuts
└── StatusBar.tsx               # Bottom bar — ads blocked, load time, online/offline, security
```

### State Management (Zustand)

```
store/
├── tabs.ts        # Active tabs, current tab, tab order, pinned state
├── navigation.ts  # Current URL, can-go-back/forward, loading state
├── sidebar.ts     # Sidebar open/closed, active panel, current conversation
├── settings.ts    # Theme, language, model, ad blocking, privacy
├── history.ts     # Recent history (in-memory cache of DB)
├── bookmarks.ts   # Bookmark tree (in-memory cache of DB)
├── ai.ts          # Current conversation, messages, streaming state, model
├── connectivity.ts # Online/offline status, queued request count
└── stats.ts       # Ad block counts, usage metrics
```

### New Tab Page

- Time-aware greeting ("Good morning/afternoon/evening, {name}")
- Prominent unified search bar
- Government portals grid — pre-seeded, customizable, drag-to-reorder
- AI Quick Actions: Summarize Page, Translate to Twi, Research Helper, Draft Letter, Privacy Report, Compare Options
- AskOzzy quick-launch card
- Recent history (last 5 visited pages)
- Running ad block stats
- Clean, spacious layout with Ghana Gold accents

---

## 6. Ghana-Inspired Design System

### Color Palette — Dark Theme (Primary)

```
Background:       #0c0e14
Surface 1:        #14171f
Surface 2:        #1a1e28
Surface 3:        #21262f
Border 1:         #2a2f3a
Border 2:         #363c4a
Text Primary:     #e8eaf0
Text Secondary:   #8b92a5
Text Muted:       #5c637a

-- Ghana Accent Colors --
Gold (Primary):   #D4A017      (Main accent — buttons, active states, links)
Gold Light:       #F2C94C      (Hover states, highlights)
Gold Dim:         rgba(212,160,23,0.12)  (Subtle backgrounds)
Red:              #CE1126      (Ghana flag red — destructive actions, errors)
Green:            #006B3F      (Ghana flag green — success, secure, online)

-- Utility --
Blue:             #3B82F6
Warning:          #F59E0B
```

### Color Palette — Light Theme

```
Background:       #F8F9FA
Surface 1:        #FFFFFF
Surface 2:        #F0F1F3
Surface 3:        #E8E9EB
Border 1:         #E0E2E6
Border 2:         #D0D3D8
Text Primary:     #1A1D23
Text Secondary:   #5C6370
Text Muted:       #9CA3AF

Gold (Primary):   #B8860B      (Darker for AA contrast on white)
Gold Light:       #D4A017
Red:              #CE1126
Green:            #006B3F
```

### Typography

```
UI Font:          "DM Sans" (bundled — OFL license, self-hosted in assets/fonts/)
Code/URL Font:    "JetBrains Mono" (bundled — OFL license, self-hosted in assets/fonts/)
Fallback:         system-ui, -apple-system, sans-serif

Scale:
  xs:   11px    (timestamps, badge counts)
  sm:   12px    (status bar, labels)
  base: 13px    (tab titles, menu items)
  md:   14px    (body text, chat messages)
  lg:   16px    (panel headings, omnibar)
  xl:   20px    (new tab greeting)
  2xl:  28px    (new tab branding)
```

### UI Identity

- Custom title bar with Ghana gold subtle gradient; window controls styled as traffic lights using Ghana flag colors (red #CE1126, gold #D4A017, green #006B3F)
- Active tab: Gold top border (2px), lighter surface background
- OmniBar: 16px rounded corners, Surface 2 background
- AI Toggle: Gold circle button, glows with gold pulse when sidebar active
- AskOzzy button: Ghana flag shield icon
- Cards: 12px radius, subtle layered shadows, hover lift effect
- Animations: slideInRight 200ms (sidebar), fadeIn 150ms (content), crossfade 100ms (tabs)
- All animations respect `prefers-reduced-motion`

### Logo Concept

Gold hexagonal shield shape containing "OS" letters:
- Shield represents security/protection
- Hexagon is modern, tech-forward
- Gold ties to Ghana identity
- Works as favicon (16x16) and splash screen

---

## 7. Cloudflare AI Microservice

### Purpose

Stateless AI proxy. Receives prompts, calls Workers AI, streams responses, stores nothing.

### Routes

```
POST /api/v1/ai/chat        — Multi-model chat inference
POST /api/v1/ai/summarize   — Page summarization
POST /api/v1/ai/translate   — Text translation (English <-> Twi)
POST /api/v1/ai/search      — AI-powered search with embedding
POST /api/v1/ai/compare     — Compare topics/products/options
GET  /api/v1/models         — List available models (dynamic — returns only currently available models)
POST /api/v1/register-device — Register new device, returns device token
GET  /api/v1/health          — Health check
```

**API versioning is critical** — once the desktop app is distributed, we cannot force users to update. Versioned routes allow API evolution without breaking older app versions.

### Request Flow

```
OS Browser (Electron)
    |
    |  First launch: POST /api/v1/register-device
    |  Returns: device_token (unique, revocable)
    |  Stored in: Electron safeStorage
    |
    |  Subsequent requests:
    |  POST /api/v1/ai/chat
    |  Headers: Authorization: Bearer <device_token>
    |  Body: { message, model, context, conversation_history[] }
    |
    v
Cloudflare Worker
    |
    +- 1. Verify device_token (per-device, revocable via KV)
    +- 2. Rate limit by device_token (KV-based sliding window)
    +- 3. Build system prompt + user message
    +- 4. Call Workers AI with selected model
    +- 5. Stream response back to Electron
    +- 6. Done. No user data stored. No prompts logged.
```

### Design Decisions

- **Per-device authentication** — On first launch, the app registers with the Worker and receives a unique device token (stored in `safeStorage`). This is revocable server-side, preventing abuse if the token is extracted. No user accounts required — just device-level identity.
- **No user data stored** — No D1 writes for user content. Worker receives prompt, calls AI, streams response, forgets. Device tokens stored in KV for validation only.
- **Conversation context sent from client** — Electron sends last N messages as `conversation_history[]`.
- **Streaming responses** — Workers AI streaming, displayed as typewriter effect in renderer.
- **Abuse monitoring** — Worker tracks request counts per device token. Anomalous usage patterns trigger automatic token suspension.

### Model Fallback Chain

If the selected model fails or is unavailable:
1. Llama 3.3 70B (primary) -> Qwen 2.5 72B -> Llama 3.1 8B (final fallback)
2. One retry with 2s delay before falling back
3. `/api/v1/models` returns only currently available models so the client adapts
4. Error surfaced to user if all models fail: "AI service temporarily unavailable"

### Rate Limits (by device token)

| Endpoint | Limit |
|---|---|
| `/api/v1/ai/*` (general) | 30 requests/minute |
| `/api/v1/ai/search` | 10 requests/minute |
| `/api/v1/register-device` | 5 requests/hour |
| All other `/api/v1/*` routes | 60 requests/minute |

### AI Models

| ID | Label | Use Case |
|---|---|---|
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Llama 3.3 70B | Default chat, reasoning, summarization |
| `@cf/meta/llama-3.1-8b-instruct` | Llama 3.1 8B | Quick/lightweight responses |
| `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | DeepSeek R1 | Code, math, deep reasoning |
| `@cf/mistral/mistral-small-3.1-24b-instruct` | Mistral Small | Chat, translation assist |
| `@cf/qwen/qwen2.5-72b-instruct` | Qwen 2.5 72B | Multilingual, code |
| `@hf/google/gemma-7b-it` | Gemma 7B | Fast lightweight tasks |
| `@cf/meta/m2m100-1.2b` | M2M-100 | Translation (English <-> Twi) |
| `@cf/baai/bge-large-en-v1.5` | BGE Large | Embeddings for search |

### Cloudflare Resource Usage

| Resource | Usage |
|---|---|
| Workers AI | Primary — all AI inference |
| KV: RATE_LIMITS | Rate limiting by device token |
| KV: PAGE_CACHE | Cache anonymous, non-user-specific content (AI search results keyed by query hash, summary results keyed by URL hash — no user-identifiable data) |
| KV: SESSIONS | Device token registry (device_id -> token metadata) |
| D1: os-browser-db | Only if user opts into cloud sync (rename from sparkbrowse-db before development) |
| R2: os-browser-assets | Only if user opts into cloud sync (rename from sparkbrowse-assets before development) |

---

## 8. AskOzzy Integration

### Overview

AskOzzy (askozzy.ghwmelite.workers.dev) is Ghana's sovereign AI platform — the government's version of ChatGPT. OS Browser integrates it as a premium AI layer alongside the built-in free AI sidebar.

### Integration Model: Linked Accounts

- OS Browser has its own lightweight local profile (no mandatory signup)
- AskOzzy integration via "Connect AskOzzy" button in Settings > Integrations
- Once linked, AskOzzy session token stored securely in Electron's `safeStorage`
- Users without AskOzzy accounts get full browser + free Cloudflare AI features

### AI Hierarchy

```
Layer 1: OS Browser Quick AI (free, fast, lightweight)
  - Cloudflare Workers AI
  - Summarize, translate, quick chat
  - Works offline (cached responses)

Layer 2: AskOzzy (powerful, sovereign, premium)
  - GPT-OSS 120B, DeepSeek R1, Qwen, Granite, Gemma
  - Deep research, data analysis, document drafting
  - "Send to AskOzzy" context handoff from any page
```

### UI Integration

- Dedicated AskOzzy button in toolbar (Ghana flag shield icon)
- Opens AskOzzy in a pinned side panel (not a tab)
- "Send to AskOzzy" context menu on any page
- New Tab Page: prominent AskOzzy card
- Settings > Integrations: Connect/disconnect AskOzzy account

---

## 9. Offline Strategy & Connectivity

### Three States

```
GREEN  ONLINE        — Full AI via Cloudflare, all features active
AMBER  INTERMITTENT  — Requests sometimes fail, auto-retry with backoff
RED    OFFLINE       — Local-only mode, AI requests queued
```

### What Works Offline (Always)

| Feature | How |
|---|---|
| Browsing cached pages | Previously visited pages in local cache |
| History & bookmarks | Full CRUD — all in local SQLite |
| Tab management | Fully local |
| Reading saved AI summaries | Cached in `summary_cache` table |
| Reading past AI conversations | Stored in local `chat_messages` table |
| Searching history | Full-text search over locally stored page text |
| Reading cached translations | Stored in `translation_cache` table |
| Ad block stats | Local counters |
| Settings changes | All local |
| Gov portal shortcuts | Local DB |

### Offline Queue

When a user triggers an AI action while offline:
1. Request saved to `offline_queue` table with priority
2. Toast shown: "You're offline. This will process when you reconnect."
3. StatusBar shows: "Offline - 3 AI requests queued"

### Reconnection Flow

1. StatusBar updates: "Back online - Processing 3 queued requests..."
2. Queue processed FIFO within priority:
   - Priority 1: Chat messages (user is waiting)
   - Priority 2: Summarize/Translate (background)
   - Priority 3: Search queries (least urgent)
3. Each completed request: save to local cache, show desktop notification, remove from queue
4. StatusBar: "Online - All caught up"

### Connectivity Detection

1. `navigator.onLine` (basic)
2. Periodic ping to Cloudflare Worker `/api/v1/health` (reliable)
3. Exponential backoff when intermittent (1s -> 2s -> 4s -> max 30s)

---

## 10. Security & Privacy Model

### Data Classification

```
LOCAL ONLY (never leaves device)
- Browsing history
- Bookmarks
- Tab sessions
- Cached pages
- AI conversation logs
- User profile & settings
- Saved translations & summaries
- AskOzzy session tokens
- Ad block stats

SENT TO CLOUDFLARE (stateless, not stored)
- AI prompts (chat, summarize, translate)
- Page text for summarization (truncated to 6000 chars)
- Search queries for embedding

OPTIONAL CLOUD SYNC (only if user opts in)
- Bookmarks
- Settings
- Tab list
```

### Encryption

**At Rest:**
- SQLite DB: Encrypted with SQLCipher (AES-256-CBC). Encryption key generated on first launch (cryptographically random 256-bit key) and stored in Electron's `safeStorage` API (backed by Windows DPAPI — tied to the Windows user account, protected by OS-level encryption). This means: only the logged-in Windows user can decrypt the database, and the key is not derivable from hardware IDs.
- Saved credentials: Double-encrypted — stored in SQLCipher DB (already encrypted), with individual credential values encrypted using a separate key from `safeStorage`
- AskOzzy tokens: Stored via Electron `safeStorage` API (OS-level keychain)
- Page cache: Not encrypted (public web content)

**In Transit:**
- All Cloudflare requests: HTTPS/TLS 1.3
- Device auth: Bearer token per device (revocable, stored in `safeStorage`)
- Certificate pinning: Pin Cloudflare's root CA to prevent MITM

### Privacy Mode

When enabled:
- No history recorded
- No page caching
- No AI conversation logs saved
- No autocomplete suggestions
- Session cleared on close
- StatusBar shows shield icon: Privacy Mode

### Credential Manager (v1 — Basic)

- Form detection: detect login forms on page load (username + password input patterns)
- Save prompt: after successful login, offer to save credentials
- Autofill prompt: on revisiting a saved site, offer to fill credentials
- Storage: encrypted in `credentials` table (SQLCipher DB + per-credential encryption via `safeStorage` key)
- No master password in v1 — relies on Windows user account protection via DPAPI
- Never autofill without user confirmation (click-to-fill)

### Webview Sandboxing

Each tab's `WebContentsView` runs in a sandboxed process:
- No access to Node.js APIs
- No access to Electron main process
- No access to local file system
- Isolated cookies/storage per origin
- `contextIsolation: true`, `nodeIntegration: false`

### Ad Blocking as Security

Network-level blocking prevents: malvertising, tracking scripts, fingerprinting, cryptominers, phishing iframes, data exfiltration beacons.

### Download Protection

- Warn on executable downloads (.exe, .bat, .cmd, .ps1, .msi)
- Block downloads from non-HTTPS sources (configurable)
- Quarantine folder for suspicious files

### Electron Hardening

```typescript
{
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webviewTag: false,
    allowRunningInsecureContent: false,
    enableWebSQL: false,
  }
}
```

CSP header on renderer (browser chrome UI only):
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src https://*.workers.dev https://askozzy.ghwmelite.workers.dev
```

**Note:** Fonts (DM Sans, JetBrains Mono) are bundled with the application in `assets/fonts/`, not loaded from Google Fonts CDN. This ensures fonts work offline and removes external CDN dependencies from the CSP.

**Webview content policy:** Web pages loaded in tabs run with permissive CSP (they are arbitrary websites). The strict CSP above applies only to the browser chrome UI.

### Certificate Error Handling

- For `*.gov.gh` domains with expired/invalid certificates: show a warning page but allow the user to proceed (government sites in Ghana may have certificate issues)
- For all other domains: show standard certificate error page with "Advanced > Proceed" option
- Log certificate errors to local DB for the user's awareness

### Print Support

- `Ctrl+P` triggers print dialog for the active tab via `webContents.print()`
- "Print to PDF" option via `webContents.printToPDF()` — saves to user-chosen location
- Print preview rendered in a modal

### Network/Proxy Configuration

- By default, Electron respects the system proxy settings (Windows proxy auto-detection)
- Settings > Network: manual proxy configuration (HTTP, HTTPS, SOCKS5)
- PAC file URL support for enterprise environments
- Proxy bypass list (default includes: `localhost`, `*.gov.gh`)

---

## 11. Keyboard Shortcuts

### Tab Management
| Shortcut | Action |
|---|---|
| Ctrl+T | New tab |
| Ctrl+W | Close current tab |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |
| Ctrl+1-9 | Switch to tab 1-9 |
| Ctrl+Shift+T | Reopen last closed tab |

### Navigation
| Shortcut | Action |
|---|---|
| Ctrl+L | Focus URL bar |
| Ctrl+K | Focus URL bar (search mode) |
| Alt+Left | Back |
| Alt+Right | Forward |
| F5 / Ctrl+R | Refresh |
| Escape | Stop loading / close sidebar / close panel |

### Features
| Shortcut | Action |
|---|---|
| Ctrl+B | Toggle bookmarks bar |
| Ctrl+H | Toggle history panel |
| Ctrl+J | Toggle AI sidebar |
| Ctrl+Shift+O | Open AskOzzy panel |
| Ctrl+Shift+S | Summarize current page |
| Ctrl+D | Bookmark current page |
| Ctrl+Shift+P | Toggle privacy mode |
| F11 | Toggle fullscreen |

### AI Sidebar
| Shortcut | Action |
|---|---|
| Ctrl+Enter | Send message |
| Ctrl+M | Cycle AI model |
| Ctrl+Shift+C | Clear conversation |

---

## 12. Accessibility

### Visual
- AA contrast minimum: all text meets WCAG 2.1 AA (4.5:1 ratio)
- Gold on dark: #D4A017 on #0c0e14 = ~6.4:1 (AA compliant for normal text, AAA for large text)
- Gold on light: #B8860B on #FFFFFF = ~4.6:1 (AA compliant for normal text)
- All contrast ratios to be verified during implementation with automated tooling
- 2px gold outline focus indicators on all interactive elements
- Font scaling: respects system font size preference (100%-200%)
- Detects Windows High Contrast mode and adapts

### Motor
- Minimum 44x44px touch targets on all clickable elements
- Full keyboard navigation through all UI
- "Skip to content" link on New Tab Page
- No hover-only actions

### Screen Readers
- ARIA labels on all buttons, inputs, panels
- `aria-live` regions for AI chat messages
- `role="tablist"` with proper `aria-selected` states
- StatusBar: `aria-live="polite"`

### Motion
- All animations disabled when `prefers-reduced-motion` is set
- No auto-playing content
- Static spinner option available

---

## 13. Distribution & Build Pipeline

### Installers

**Individual Users:**
- `OS-Browser-Setup-1.0.0.exe` — NSIS installer (~80MB compressed)
- Desktop shortcut + Start Menu entry
- Optional: Set as default browser
- Optional: Import bookmarks from Chrome/Edge/Firefox

**Government IT Departments:**
- `OS-Browser-1.0.0.msi` — MSI package for Group Policy deployment
- Silent install: `msiexec /i OS-Browser-1.0.0.msi /qn`
- Pre-configurable defaults: DEFAULT_PORTALS, PRIVACY_MODE, SYNC_ENABLED, AUTO_UPDATE

### Auto-Update

- Update server: GitHub Releases
- Delta updates: ~5-15MB vs full ~80MB
- Silent background check every 6 hours
- User prompted to restart — never forced
- Gentle notification if ignored for 7 days

### Monorepo Structure

```
os-browser/
├── package.json              # Root — workspaces config + scripts
├── electron-builder.yml      # Build/packaging config
├── wrangler.toml             # Cloudflare Worker config
│
├── packages/
│   ├── main/                 # Electron main process
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │
│   ├── renderer/             # React UI (Vite)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── index.html
│   │   └── src/
│   │
│   ├── preload/              # Preload scripts (IPC bridge)
│   │   ├── package.json
│   │   └── src/
│   │       └── index.ts
│   │
│   └── shared/               # Shared types, constants
│       ├── package.json
│       └── src/
│           ├── types.ts
│           ├── models.ts
│           ├── constants.ts
│           └── ipc-channels.ts
│
├── worker/                   # Cloudflare AI Microservice
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── routes/
│       │   ├── ai.ts
│       │   └── health.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── rateLimit.ts
│       └── services/
│           └── ai.ts
│
├── assets/
│   ├── icon.png
│   ├── icon.ico
│   ├── tray-icon.png
│   ├── fonts/
│   │   ├── DMSans-*.woff2       # DM Sans (OFL license)
│   │   └── JetBrainsMono-*.woff2 # JetBrains Mono (OFL license)
│   └── gov-portals/
│
└── docs/
    └── superpowers/
        └── specs/
```

### NPM Scripts

```
dev              — Run main + renderer + preload in dev mode
dev:renderer     — Vite dev server for React UI
dev:main         — esbuild watch + electron reload
dev:worker       — wrangler dev (local Cloudflare Worker)
build            — Build all packages
build:renderer   — vite build
build:main       — esbuild bundle
package          — electron-builder --win
package:msi      — electron-builder --win msi
package:exe      — electron-builder --win nsis
deploy:worker    — wrangler deploy
```

---

## 14. Language Support

### Phase 1 (v1.0)
- English (UI language)
- English <-> Twi translation via Cloudflare Workers AI (m2m100-1.2b)
- **Quality note:** M2M-100 has limited Twi training data. Translation quality will vary. UI should label translations as "Beta" and display a disclaimer: "Translation may not be fully accurate. Verify important content."
- **Khaya API feasibility check:** Evaluate Ghana NLP's Khaya API (khaya.ai) during Phase 1 development. If available and production-ready, use it as the primary Twi translation provider instead of m2m100

### Phase 2 (v1.1)
- Add Ga and Ewe translation

### Phase 3 (v1.2)
- Add Dagbani, Hausa, Fante
- Full production integration of Khaya API for all supported Ghanaian languages (if Phase 1 feasibility check was positive)

---

## 15. Cloudflare Resources

All infrastructure already provisioned. Resource IDs are stored separately in a `.env` file (not committed to version control) and referenced in `wrangler.toml` via environment variables.

**Resources:**
- **D1 Database:** `os-browser-db` (rename from sparkbrowse-db before development)
- **KV: RATE_LIMITS** — Device-level rate limiting
- **KV: PAGE_CACHE** — Anonymous AI response caching
- **KV: SESSIONS** — Device token registry
- **R2: os-browser-assets** — Optional sync storage (rename from sparkbrowse-assets)
- **Workers AI:** Binding = "AI"

**Action items before development:**
1. Rename D1 database from `sparkbrowse-db` to `os-browser-db`
2. Rename R2 bucket from `sparkbrowse-assets` to `os-browser-assets`
3. Move all resource IDs to `.env` file, reference via `wrangler.toml` vars
4. Set up device registration endpoint secrets

### Bookmark Import

Supports importing bookmarks from Chrome, Edge, and Firefox using the Netscape Bookmark File Format (HTML export). All three browsers export to this standard format. Import is offered during first-launch setup and available anytime in Settings > Data > Import Bookmarks.
