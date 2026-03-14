# SPARKBROWSE — AI-Powered Browser on Cloudflare
## Comprehensive Claude Code Build Prompt

---

## PROJECT IDENTITY

**Name:** SparkBrowse  
**Tagline:** AI-Powered Browser · Built Entirely on Cloudflare  
**Owner:** Hodges & Co. Limited / ohwpstudios  
**Developer:** Ozzy (Senior IT Technician, Ghana Civil Service + Freelance Web Developer)  
**Repo:** Create at `~/sparkbrowse/` (or the current working directory)

---

## WHAT IS SPARKBROWSE?

SparkBrowse is a web-based AI browser application inspired by Genspark AI Browser (https://www.genspark.ai/browser). It is NOT a native desktop browser — it is a **web application** that provides an AI-enhanced browsing experience entirely within the browser, built 100% on the Cloudflare stack (Workers, Workers AI, Pages, D1, KV, R2, Durable Objects).

**Core concept:** A browser-within-a-browser that wraps web content in an intelligent layer — AI chat sidebar, page summarization, multi-model selection, ad blocking, smart search, browsing history, bookmarks, tab sync, custom AI agents, and autopilot mode.

---

## CLOUDFLARE RESOURCES (ALREADY PROVISIONED — DO NOT RECREATE)

All infrastructure resources have been created. Use these exact IDs in wrangler.toml:

```
Account ID: ea2eb3a9813660dfca2a60e594858538

D1 Database:
  Name: sparkbrowse-db
  ID: 537dda37-9fe1-41fe-a174-a88c115dca45
  Tables already created: users, tabs, history, bookmark_folders, bookmarks, 
                          conversations, chat_messages, adblock_stats, api_keys, user_agents

KV Namespaces:
  SESSIONS:    c5ff0cd2de1e4325a11ca987d729a6b5
  PAGE_CACHE:  cc0756a5ce3840efabb0fc021ff0bfef
  RATE_LIMITS: c159da5e083a4c2283af673653958537

R2 Bucket:
  Name: sparkbrowse-assets

Workers AI: Binding = "AI" (no ID needed)
```

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | React 18+ with Vite, deployed to Cloudflare Pages |
| Backend API | Cloudflare Workers with Hono framework (TypeScript) |
| AI Inference | Cloudflare Workers AI (6 models — see below) |
| Database | Cloudflare D1 (SQLite) |
| Session/Cache | Cloudflare KV (3 namespaces) |
| File Storage | Cloudflare R2 |
| Real-time Sync | Cloudflare Durable Objects (WebSocket) |
| Auth | JWT (jose library) + PBKDF2 password hashing |
| Styling | Tailwind CSS |
| Deployment | wrangler CLI |

---

## AI MODELS (via Workers AI)

Use these exact model IDs for Workers AI inference:

| Model | CF Model ID | Use Case |
|---|---|---|
| Llama 3.3 70B | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Default chat, reasoning, summarization |
| Llama 3.1 8B | `@cf/meta/llama-3.1-8b-instruct` | Quick/lightweight responses |
| DeepSeek R1 Distill | `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | Code generation, math, deep reasoning |
| Mistral Small 3.1 | `@cf/mistral/mistral-small-3.1-24b-instruct` | Chat, translation support |
| Qwen 2.5 72B | `@cf/qwen/qwen2.5-72b-instruct` | Multilingual, code |
| Gemma 7B | `@hf/google/gemma-7b-it` | Fast lightweight tasks |

Translation model: `@cf/meta/m2m100-1.2b`  
Embedding model: `@cf/baai/bge-large-en-v1.5`

---

## DATABASE SCHEMA (ALREADY APPLIED TO D1)

The following 10 tables already exist in the D1 database. Do NOT recreate them — just use them. If you need to add columns or new tables, use ALTER TABLE or CREATE TABLE IF NOT EXISTS.

```sql
-- users: id, email, password_hash, display_name, avatar_url, default_model, theme, 
--        ad_blocking, privacy_mode, search_engine, language, sidebar_position, is_active,
--        created_at, updated_at

-- tabs: id, user_id, title, url, favicon_url, position, is_pinned, is_active, 
--       created_at, updated_at

-- history: id, user_id, url, title, visit_count, last_visited_at, ai_summary, created_at

-- bookmark_folders: id, user_id, name, parent_id, position, created_at

-- bookmarks: id, user_id, url, title, description, folder_id, favicon_url, position, created_at

-- conversations: id, user_id, title, model, page_url, created_at, updated_at

-- chat_messages: id, user_id, conversation_id, role, content, model, page_context, 
--               tokens_used, created_at

-- adblock_stats: id, user_id, url, ads_blocked, trackers_blocked, bytes_saved, created_at

-- api_keys: id, user_id, name, key_hash, permissions, last_used_at, expires_at, created_at

-- user_agents: id, user_id, name, description, system_prompt, model, triggers, is_active,
--             created_at, updated_at
```

---

## PROJECT STRUCTURE

Build the project with this exact structure:

```
sparkbrowse/
├── wrangler.toml                    # Cloudflare Worker config (use IDs above)
├── package.json                     # Root monorepo scripts
├── tsconfig.json                    # TypeScript base config
│
├── api/                             # Backend — Cloudflare Worker
│   ├── src/
│   │   ├── index.ts                 # Main Hono app entry, route registration, exports DO classes
│   │   ├── types.ts                 # Env interface, all TypeScript types, model registry
│   │   ├── auth.ts                  # Auth routes + middleware (JWT, PBKDF2, KV sessions)
│   │   ├── middleware/
│   │   │   ├── auth.ts              # Auth middleware (JWT verify, KV session cache)
│   │   │   └── rateLimit.ts         # Rate limiting middleware (KV-based sliding window)
│   │   ├── routes/
│   │   │   ├── ai.ts                # /api/ai/* — chat, summarize, translate, search, compare
│   │   │   ├── proxy.ts             # /api/proxy/* — page fetch, ad blocking, content extraction
│   │   │   ├── history.ts           # /api/history/* — CRUD + search
│   │   │   ├── bookmarks.ts         # /api/bookmarks/* — CRUD + folders
│   │   │   ├── tabs.ts              # /api/tabs/* — CRUD + batch sync
│   │   │   ├── conversations.ts     # /api/conversations/* — chat sessions + messages
│   │   │   ├── agents.ts            # /api/agents/* — custom super agents CRUD + execute
│   │   │   ├── assets.ts            # /api/assets/* — R2 upload/download
│   │   │   └── stats.ts             # /api/stats — user analytics dashboard data
│   │   ├── services/
│   │   │   ├── ai.ts                # Workers AI wrapper — multi-model inference, streaming
│   │   │   ├── adblock.ts           # Ad blocking engine (regex patterns + HTMLRewriter)
│   │   │   └── search.ts            # AI-enhanced search with embeddings
│   │   └── durable-objects/
│   │       ├── BrowserSession.ts    # WebSocket-based real-time tab sync between devices
│   │       └── AutopilotAgent.ts    # Long-running agentic browsing tasks
│   └── db/
│       ├── schema.sql               # Full schema (reference only — already applied)
│       └── seed.sql                 # Default data for new installations
│
├── frontend/                        # Frontend — React + Vite → Cloudflare Pages
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   └── manifest.json
│   └── src/
│       ├── main.tsx                 # React entry point
│       ├── App.tsx                  # Root component with router
│       ├── api/
│       │   └── client.ts            # API client (fetch wrapper with auth headers)
│       ├── store/
│       │   ├── auth.ts              # Auth state (Zustand)
│       │   ├── browser.ts           # Browser state — tabs, URL, navigation (Zustand)
│       │   ├── sidebar.ts           # AI sidebar state (Zustand)
│       │   └── settings.ts          # User settings state (Zustand)
│       ├── hooks/
│       │   ├── useAI.ts             # Hook for AI chat/summarize/translate calls
│       │   ├── useTabs.ts           # Tab management hook
│       │   ├── useHistory.ts        # History management hook
│       │   └── useWebSocket.ts      # Durable Object WebSocket for real-time sync
│       ├── components/
│       │   ├── Browser/
│       │   │   ├── TitleBar.tsx      # macOS-style title bar with traffic lights
│       │   │   ├── TabBar.tsx        # Tab strip — add, close, reorder, pin, active state
│       │   │   ├── NavigationBar.tsx # Back, forward, refresh, URL bar, AI toggle
│       │   │   ├── BookmarksBar.tsx  # Quick-access bookmark strip
│       │   │   └── StatusBar.tsx     # Bottom bar: ads blocked, load time, secure indicator
│       │   ├── Content/
│       │   │   ├── NewTab.tsx        # New tab page — search, bookmarks grid, AI capabilities
│       │   │   ├── WebView.tsx       # Proxied page display (via iframe or injected HTML)
│       │   │   ├── SearchResults.tsx # AI-powered search results with AI answer card
│       │   │   └── ErrorPage.tsx     # Navigation error / blocked content
│       │   ├── Sidebar/
│       │   │   ├── AISidebar.tsx     # Main AI sidebar container
│       │   │   ├── ModelSelector.tsx # Dropdown to switch AI models
│       │   │   ├── QuickActions.tsx  # Summarize, Translate, Extract, Compare buttons
│       │   │   ├── ChatArea.tsx      # Message list with markdown rendering
│       │   │   ├── ChatInput.tsx     # Message input with send button
│       │   │   └── AgentPanel.tsx    # Custom agent management
│       │   ├── Panels/
│       │   │   ├── HistoryPanel.tsx  # Browsing history overlay
│       │   │   ├── BookmarkManager.tsx # Full bookmark management with folders
│       │   │   ├── SettingsPanel.tsx # User settings (theme, model, privacy, etc.)
│       │   │   └── StatsPanel.tsx    # Usage analytics dashboard
│       │   ├── Auth/
│       │   │   ├── LoginPage.tsx     # Login form
│       │   │   ├── SignupPage.tsx    # Registration form
│       │   │   └── AuthGuard.tsx     # Protected route wrapper
│       │   └── UI/
│       │       ├── Button.tsx
│       │       ├── Input.tsx
│       │       ├── Modal.tsx
│       │       ├── Dropdown.tsx
│       │       ├── Toast.tsx
│       │       └── LoadingSpinner.tsx
│       ├── utils/
│       │   ├── formatters.ts        # Date, URL, byte formatters
│       │   └── constants.ts         # Model list, default bookmarks, keyboard shortcuts
│       └── styles/
│           └── globals.css          # Tailwind imports + custom CSS variables
│
└── README.md
```

---

## DESIGN SYSTEM

### Color Palette (Dark theme — primary)
```
Background:     #0c0e14
Surface:        #14171f
Surface 2:      #1a1e28
Surface 3:      #21262f
Border:         #2a2f3a
Border 2:       #363c4a
Text Primary:   #e8eaf0
Text Secondary: #8b92a5
Text Muted:     #5c637a
Accent:         #f97316 (Orange — SparkBrowse brand)
Accent Light:   #fb923c
Accent Dim:     rgba(249,115,22,0.12)
Green:          #22c55e
Red:            #ef4444
Blue:           #3b82f6
```

### Light theme variant
Provide a light theme as well. Invert the backgrounds (white/light grays) while keeping the orange accent.

### Typography
- UI Font: "DM Sans" (Google Fonts) — all interface text
- Code/URL Font: "JetBrains Mono" — URL bar, code blocks, monospace contexts
- Avoid generic fonts (Inter, Arial, Roboto)

### Key UI Characteristics
- macOS-style window chrome with traffic light buttons (red/yellow/green circles)
- Tabs with active state indicated by orange top border + lighter background
- Rounded corners (8-12px on cards, 16px on search bars)
- Subtle animations: fade-in for new content, slide-in for sidebar, dot-pulse for thinking state
- The AI sidebar slides in from the right, width ~380px
- Orange "AI" toggle button in the navigation bar that glows when sidebar is active

---

## FEATURES TO BUILD (COMPREHENSIVE)

### 1. Browser Chrome (Tab Management)
- Multiple tabs with add/close/switch/reorder
- Pin tabs (stay left, smaller width)
- Tab favicon + title display with ellipsis overflow
- Active tab has orange top border accent
- "New Tab" button (+ icon)
- Close tab (X button, appears on hover)
- When last tab is closed, create a new blank tab automatically
- Keyboard shortcuts: Ctrl+T (new tab), Ctrl+W (close tab), Ctrl+Tab (next tab)

### 2. Navigation Bar
- Back / Forward / Refresh buttons (SVG icons)
- URL/Search bar (unified omnibar):
  - Typing a URL (contains "." with no spaces) → navigate to that URL
  - Typing text → AI-enhanced search
  - Shows shield icon for HTTPS, search icon otherwise
  - Auto-complete from history (debounced, top 5 matches)
- Bookmark star button (toggles current page bookmark)
- History clock button (opens history panel)
- AI toggle button (opens/closes sidebar)

### 3. New Tab Page
- SparkBrowse logo (bolt icon + gradient text)
- Unified search bar (prominent, centered)
- Quick-access bookmarks grid (icon + label)
- "AI Capabilities" cards grid showing features:
  - AI-Powered Search, Summarize Page, Code Assistant, Research Agent, Compare Products, Translate Page
- Footer showing Cloudflare stack badges
- Clean, spacious layout with fade-in animation

### 4. Web Proxy (Page Display)
- Pages are fetched through the Workers API (`/api/proxy/fetch`)
- The Worker fetches the target URL, strips ads/trackers, and returns sanitized HTML
- Display in a sandboxed iframe or via `srcdoc`
- Status bar below content showing: secure connection indicator, ads blocked count, load time
- Floating action bar on proxied pages: Summarize, Translate, Extract Data, Analyze

### 5. AI Sidebar (Core Feature)
- **Model Selector:** Dropdown showing all 6 models with icon, name, provider. User can switch anytime.
- **Quick Actions:** Pill buttons — "Summarize Page", "Find Deals", "Explain Code", "Translate", "Compare"
- **Chat Area:** 
  - Message bubbles: user messages (orange, right-aligned), AI messages (dark surface, left-aligned with bot avatar)
  - AI avatar is the SparkBrowse bolt icon in an orange-tinted circle
  - Markdown rendering in AI responses (bold, italic, bullet points, code blocks)
  - Thinking indicator: 3 animated dots
  - Auto-scroll to latest message
  - Each message shows which model generated it
- **Chat Input:** Text input + orange send button. Enter to send.
- **Context Awareness:** The sidebar knows what page the user is currently viewing and can reference it
- **Conversation History:** User can view past conversations and continue them

### 6. AI Chat Backend
- POST `/api/ai/chat` — accepts: message, model_id, conversation_history[], page_context
- Builds system prompt: "You are SparkBrowse AI, an intelligent browsing assistant powered by Cloudflare Workers AI. You help users summarize pages, answer questions, compare products, write code, translate content, and research topics."
- If page_context is provided, append: "The user is currently viewing: {url}"
- Call Workers AI with the selected model
- Store messages in D1 (chat_messages table)
- Return streaming response if possible (Workers AI supports streaming)

### 7. Page Summarization
- POST `/api/ai/summarize` — accepts: url, html_content (truncated to ~6000 chars)
- Check KV cache first (`summary:{url}`) — return cached if exists
- Use the SUMMARIZE_MODEL for inference
- Cache result in KV with 1-hour TTL
- Return structured summary with key points

### 8. Translation
- POST `/api/ai/translate` — accepts: text, source_lang, target_lang
- Uses the m2m100-1.2b translation model
- Supports 100+ language pairs

### 9. AI-Powered Search
- POST `/api/ai/search` — accepts: query
- Generate embedding of query using bge-large-en-v1.5
- Use Llama 3.3 70B to generate comprehensive AI answer
- Display results in SearchResults component with:
  - AI Answer card (highlighted, top) with source count + model info
  - Traditional-style result list below

### 10. Web Proxy + Ad Blocking
- POST `/api/proxy/fetch` — accepts: url
- Fetch the target page with appropriate User-Agent header
- Ad blocking via regex pattern matching:
  - Remove `<script>` tags containing: ads, analytics, tracking, doubleclick, googletag, adsbygoogle
  - Remove `<iframe>` tags containing: ads, banner, sponsor
  - Remove `<div>` tags with ad-related class/id names
- Count blocked elements and return alongside content
- Cache cleaned pages in KV with 30-minute TTL
- Extract page title from `<title>` tag

### 11. Authentication System
- **Signup:** POST `/api/auth/signup` — email, password (min 8 chars), display_name
  - Password hashed with PBKDF2 (100K iterations, SHA-256, 16-byte salt)
  - Returns access_token (24h JWT) + refresh_token (30d JWT)
  - Creates default bookmarks for new users
- **Login:** POST `/api/auth/login` — email, password
  - Verify password against stored hash
  - Returns tokens + user profile
- **Refresh:** POST `/api/auth/refresh` — refresh_token
  - Token rotation: old refresh token deleted, new pair issued
- **Logout:** POST `/api/auth/logout` — invalidates session in KV
- **Get Profile:** GET `/api/auth/me` — returns user data
- **Update Settings:** PUT `/api/auth/settings` — update theme, model, language, etc.
- **Change Password:** PUT `/api/auth/password` — current + new password
- **Auth Middleware:** Checks Bearer token → KV session cache (fast) → JWT verify (slow) → caches in KV
- **Public routes** (no auth required): `/`, `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/models`

### 12. Rate Limiting
- KV-based sliding window rate limiter
- Default: 60 requests/minute
- AI endpoints (`/api/ai/*`): 30 requests/minute
- Auth endpoints (`/api/auth/*`): 10 requests/minute
- Returns `X-RateLimit-Remaining` header

### 13. History Management
- Auto-record every page visit (upsert: increment visit_count if URL exists)
- GET `/api/history` — paginated, sorted by last_visited_at DESC
- POST `/api/history` — add entry
- DELETE `/api/history` — clear all
- DELETE `/api/history/:id` — delete single entry
- Search history by URL or title
- Frontend: History panel overlay with time-grouped entries

### 14. Bookmarks
- Full CRUD for bookmarks and folders
- Nested folder support (parent_id)
- Drag-and-drop reordering (position field)
- Bookmark bar shows top-level bookmarks
- Full bookmark manager panel with folder tree

### 15. Tab Sync (Durable Objects)
- BrowserSession Durable Object handles WebSocket connections
- When user opens/closes/switches tabs, broadcast changes to all connected devices
- PUT `/api/tabs/sync` — batch sync all tabs
- GET `/api/tabs` — get synced tabs

### 16. Custom AI Agents (Super Agents)
- Users can create custom AI agents with:
  - Name, description, system prompt, model preference, trigger patterns
- GET `/api/agents` — list user's agents
- POST `/api/agents` — create agent
- PUT `/api/agents/:id` — update agent
- DELETE `/api/agents/:id` — delete agent
- POST `/api/agents/:id/execute` — run agent with user input
- Frontend: Agent panel in sidebar for managing and invoking agents

### 17. Autopilot Mode (Durable Object)
- AutopilotAgent Durable Object for long-running agentic tasks
- Start a task: POST to DO with task description + URLs
- The DO iterates through URLs, fetches, analyzes with AI, and compiles results
- Status endpoint to check progress
- Results stored in D1 when complete

### 18. Asset Storage (R2)
- POST `/api/assets/upload` — upload files (screenshots, exports)
- GET `/api/assets/:key` — retrieve files with proper Content-Type headers
- Used for: page screenshots, exported conversations, user avatars

### 19. User Stats Dashboard
- GET `/api/stats` — returns:
  - Total pages visited
  - Total bookmarks
  - Total conversations
  - Total ads blocked
  - Most visited sites
  - AI usage by model

### 20. Settings Panel
- Theme: dark/light/system
- Default AI model selection
- Ad blocking toggle
- Privacy mode toggle
- Search engine preference (sparkbrowse/google/duckduckgo/bing)
- Language preference
- Sidebar position (left/right)

---

## WRANGLER.TOML

```toml
name = "sparkbrowse-api"
main = "api/src/index.ts"
compatibility_date = "2025-12-01"
compatibility_flags = ["nodejs_compat"]
account_id = "ea2eb3a9813660dfca2a60e594858538"

[ai]
binding = "AI"

[[d1_databases]]
binding = "DB"
database_name = "sparkbrowse-db"
database_id = "537dda37-9fe1-41fe-a174-a88c115dca45"

[[kv_namespaces]]
binding = "SESSIONS"
id = "c5ff0cd2de1e4325a11ca987d729a6b5"

[[kv_namespaces]]
binding = "PAGE_CACHE"
id = "cc0756a5ce3840efabb0fc021ff0bfef"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "c159da5e083a4c2283af673653958537"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "sparkbrowse-assets"

[[durable_objects.bindings]]
name = "BROWSER_SESSIONS"
class_name = "BrowserSession"

[[durable_objects.bindings]]
name = "AUTOPILOT"
class_name = "AutopilotAgent"

[[migrations]]
tag = "v1"
new_classes = ["BrowserSession", "AutopilotAgent"]

[vars]
ENVIRONMENT = "production"
APP_NAME = "SparkBrowse"
APP_VERSION = "1.0.0"
CORS_ORIGIN = "https://sparkbrowse.pages.dev"
DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
SUMMARIZE_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
CODE_MODEL = "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"
TRANSLATE_MODEL = "@cf/meta/m2m100-1.2b"
EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5"

[triggers]
crons = ["0 3 * * *", "0 */6 * * *"]
```

Set secrets via CLI:
```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put ADMIN_API_KEY
npx wrangler secret put ENCRYPTION_KEY
```

---

## DEPENDENCIES

### Backend (api/package.json)
```json
{
  "dependencies": {
    "hono": "^4.6.0",
    "jose": "^5.9.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "typescript": "^5.6.0",
    "wrangler": "^3.93.0"
  }
}
```

### Frontend (frontend/package.json)
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.28.0",
    "zustand": "^5.0.0",
    "react-markdown": "^9.0.0",
    "lucide-react": "^0.460.0"
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

---

## API ROUTES SUMMARY

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/api/models` | No | List available AI models |
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/refresh` | No | Refresh tokens |
| POST | `/api/auth/logout` | Yes | Logout (invalidate session) |
| GET | `/api/auth/me` | Yes | Get current user profile |
| PUT | `/api/auth/settings` | Yes | Update user settings |
| PUT | `/api/auth/password` | Yes | Change password |
| POST | `/api/ai/chat` | Yes | AI chat (multi-model) |
| POST | `/api/ai/summarize` | Yes | Summarize page content |
| POST | `/api/ai/translate` | Yes | Translate text |
| POST | `/api/ai/search` | Yes | AI-powered search |
| POST | `/api/ai/compare` | Yes | Compare products/topics |
| POST | `/api/proxy/fetch` | Yes | Fetch + ad-block web page |
| GET | `/api/history` | Yes | Get browsing history |
| POST | `/api/history` | Yes | Add history entry |
| DELETE | `/api/history` | Yes | Clear all history |
| DELETE | `/api/history/:id` | Yes | Delete single entry |
| GET | `/api/bookmarks` | Yes | Get bookmarks + folders |
| POST | `/api/bookmarks` | Yes | Add bookmark |
| PUT | `/api/bookmarks/:id` | Yes | Update bookmark |
| DELETE | `/api/bookmarks/:id` | Yes | Delete bookmark |
| POST | `/api/bookmarks/folders` | Yes | Create folder |
| GET | `/api/tabs` | Yes | Get synced tabs |
| PUT | `/api/tabs/sync` | Yes | Batch sync tabs |
| GET | `/api/conversations` | Yes | List conversations |
| GET | `/api/conversations/:id/messages` | Yes | Get conversation messages |
| POST | `/api/conversations` | Yes | Create conversation |
| DELETE | `/api/conversations/:id` | Yes | Delete conversation |
| GET | `/api/agents` | Yes | List custom agents |
| POST | `/api/agents` | Yes | Create agent |
| PUT | `/api/agents/:id` | Yes | Update agent |
| DELETE | `/api/agents/:id` | Yes | Delete agent |
| POST | `/api/agents/:id/execute` | Yes | Execute agent |
| POST | `/api/assets/upload` | Yes | Upload file to R2 |
| GET | `/api/assets/:key` | Yes | Download file from R2 |
| GET | `/api/stats` | Yes | User analytics |

---

## KEYBOARD SHORTCUTS

| Shortcut | Action |
|---|---|
| Ctrl+T | New tab |
| Ctrl+W | Close current tab |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |
| Ctrl+L | Focus URL bar |
| Ctrl+K | Focus URL bar (search mode) |
| Ctrl+B | Toggle bookmarks bar |
| Ctrl+H | Toggle history panel |
| Ctrl+J | Toggle AI sidebar |
| Ctrl+Shift+S | Summarize current page |
| Escape | Close sidebar/panel |

---

## DEPLOYMENT

### Backend (Worker)
```bash
cd sparkbrowse
npm install
npx wrangler deploy
```

### Frontend (Pages)
```bash
cd sparkbrowse/frontend
npm install
npm run build
npx wrangler pages deploy dist --project-name=sparkbrowse
```

The frontend will be available at `https://sparkbrowse.pages.dev`
The API will be available at `https://sparkbrowse-api.<account>.workers.dev`

---

## BUILD INSTRUCTIONS

1. **Start with the backend API** — build all routes, middleware, services, and Durable Objects first. Make sure `npx wrangler dev` runs without errors.

2. **Then build the frontend** — React app with all components. Make sure `npm run dev` works and the UI renders correctly.

3. **Wire them together** — API client in frontend that talks to the Worker backend.

4. **Test the full flow:** signup → login → new tab page → navigate to URL → AI sidebar chat → summarize page → bookmarks → history → settings.

5. **Deploy both** — Worker via `wrangler deploy`, frontend via `wrangler pages deploy`.

Build everything. Do not stub or skip features. Every route should be fully implemented, every component should be fully styled, and the app should be production-ready. Use proper error handling, loading states, and edge case coverage throughout.
