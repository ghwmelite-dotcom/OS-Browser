# Baobab — Design Spec

**Product:** Baobab — The African AI Browser
**Tagline:** *"The browser that grew here."*
**Owner:** Hodges & Co. Limited / ohwpstudios
**Lead:** Ozzy
**License:** AGPL-3.0
**Spec date:** 2026-05-01
**Status:** Draft for review

---

## 1. Vision & Positioning

Baobab is a standalone, sovereign-by-design AI browser built **for the African continent first, the world second**. Europe has Brave/Vivaldi (privacy-flavored, EU-coded). The US has Arc/Dia (consumer-AI-flavored, US-coded). China has Tencent (state-aligned). **Nothing is built from Africa, for Africa.** Baobab fills that gap.

It is *not* a fork of OzzySurf OS Browser. OzzySurf is the Ghana civil-service browser; Baobab is the consumer/global product. Two separate codebases, two separate brands, one team of one.

**Three positioning pillars:**

1. **Sovereignty by engineering, not slogan.** Data residency surfaced visibly in the UI. Open-source under AGPL. User can swap to their own AI provider. Anyone can self-host the worker.
2. **Africa-first defaults.** African search ranking, low-bandwidth mode, offline-first reading, payment rails native to the continent (M-Pesa / MoMo / Paystack / Flutterwave).
3. **Real browser, not a web wrapper.** Pages render in real platform webviews — full cookies, full auth, full fidelity. The AI layer wraps the browser; it does not replace it.

The product taxonomy stays clean as it grows:
- **Baobab** — the desktop + mobile browser
- **Baobab Cloud** — the worker/sync backend
- **Baobab AI** — the assistant inside it

---

## 2. System Architecture

Three layers with clean separation:

### 2.1 Client shells

- **Baobab Desktop** — Tauri 2.0 (Rust shell + platform webviews: WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux). Bundle target ~12-18 MB. One main window owns the chrome (tabs, sidebar, omnibar, status bar). Each tab is a real `WebviewWindow` — same architectural pattern Arc and Vivaldi use.
- **Baobab Mobile** — Expo SDK 51+ on RN 0.74+. Tabs are `react-native-webview` instances. Android primary distribution; iOS via EAS. APK target ~25 MB (matches the OS Mini constraint already proven shippable).

### 2.2 Shared core (one TS codebase, both shells consume)

- `@baobab/core` — pure TypeScript, zero platform deps: types, ad-block rules engine, sovereignty config, low-bandwidth detection, offline cache logic, search ranking
- `@baobab/ui` — React components, with a thin platform abstraction so the same component tree renders to DOM (Tauri) or React Native primitives (Expo)
- `@baobab/cloud-client` — fetch wrapper for the Worker API, JWT/refresh handling, retry, offline queue, WebSocket client
- `@baobab/brand` — logos, fonts, copy strings, design tokens

### 2.3 Cloud (Cloudflare-only by design)

- **Baobab Worker** (`baobab-api`, Hono framework) — auth, AI inference proxy, ad-block stats, history sync, bookmark sync, conversation storage, agent execution, payments webhook, civic feeds
- **D1** (`baobab-db`) — users, tabs, history, bookmarks, conversations, messages, agents, payments, subscriptions, civic_feeds, offline_articles, passkeys, otp_attempts
- **KV namespaces** — `BAOBAB_SESSIONS`, `BAOBAB_PAGE_CACHE`, `BAOBAB_RATE_LIMITS`, `BAOBAB_OFFLINE_INDEX`, `BAOBAB_OTP`
- **R2 buckets** — `baobab-assets` (screenshots, exports, avatars) and `baobab-offline` (cached articles for offline reading) — both with `eu` jurisdiction (no African R2 jurisdiction available in 2026; disclosed honestly in product)
- **Durable Objects** — `BrowserSession` (cross-device tab sync over WebSocket), `AutopilotAgent` (long-running agentic tasks), `ReaderQueue` (per-user offline article queue + sync state)
- **Workers AI** — same 6-model menu as OzzySurf: Llama 3.3 70B (default), Llama 3.1 8B (low-bandwidth fallback), DeepSeek R1 Distill (code), Mistral Small 3.1 (chat), Qwen 2.5 72B (multilingual), Gemma 7B (lightweight). Translation via `m2m100-1.2b`. Embeddings via `bge-large-en-v1.5`.

### 2.4 Rendering approach: Hybrid (real webview + Reader Mode proxy)

Rejected approach: SparkBrowse's iframe-proxy model — half the web sets `X-Frame-Options: DENY` and would not render.

**Default:** real Tauri/RN webview per tab. Pages load directly from origin. Real cookies, real OAuth, real WebRTC, real everything.

**Reader Mode (a feature, not the architecture):** click the "Reader" icon → `POST /api/proxy/fetch` strips ads/clutter, runs AI extraction, renders cleaned HTML in a side panel. Page is cached in `BAOBAB_PAGE_CACHE` (30 min TTL). User can persist to offline storage.

This makes the proxy a *superpower* (Reader Mode + offline + AI summarization) rather than a load-bearing piece of architecture that can break the whole product.

### 2.5 Typical page-view data flow

```
User types URL in omnibar
  → Tauri creates a WebviewWindow → page loads direct from origin
  → In parallel: client posts {url, title, favicon} to /api/history
  → Tauri injects content-script that surfaces selected text + meta to AI sidebar
  → Sidebar calls /api/ai/chat with page context
  → Worker → Workers AI → stream SSE response back

User clicks Reader Mode:
  → Client calls /api/proxy/fetch?url=...
  → Worker fetches origin, strips ads/clutter, runs AI extraction
  → Returns {clean_html, ai_summary, key_points, ads_blocked, est_read_time}
  → Tauri renders in side panel
  → "Save offline" button persists to R2 + offline_articles row
```

---

## 3. Repository Structure

Fresh repo at `~/baobab/`. npm workspaces + Turborepo.

```
baobab/
├── package.json                       # workspaces: apps/*, packages/*, worker
├── turbo.json
├── tsconfig.base.json
├── README.md
├── LICENSE                            # AGPL-3.0
│
├── apps/
│   ├── desktop/                       # Tauri 2.0
│   │   ├── src-tauri/
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   └── src/
│   │   │       ├── main.rs
│   │   │       ├── tabs.rs            # WebviewWindow lifecycle
│   │   │       ├── adblock.rs         # Ghostery rules engine bridge
│   │   │       ├── ipc.rs             # Renderer ↔ Rust messages
│   │   │       └── sovereignty.rs     # Region detection, residency reporting
│   │   ├── src/                       # React renderer
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── chrome/                # TabBar, Omnibar, Sidebar, StatusBar
│   │   │   ├── reader/                # Reader Mode panel
│   │   │   └── platform/              # Tauri-specific wrappers
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── mobile/                        # Expo
│       ├── app.json
│       ├── eas.json
│       ├── App.tsx
│       ├── src/
│       │   ├── screens/               # Browser, Tabs, Sidebar, Settings, Reader, Civic
│       │   ├── navigation/
│       │   ├── components/
│       │   └── platform/              # Expo-specific wrappers
│       └── (android/ ios/ generated by EAS)
│
├── packages/
│   ├── core/                          # @baobab/core — pure TS
│   │   └── src/
│   │       ├── types.ts
│   │       ├── adblock/               # Ghostery-compatible rules engine
│   │       ├── sovereignty/           # Residency detection, low-bandwidth
│   │       ├── offline/               # Article queue, cache eviction
│   │       └── search/                # African source ranking, query rewriting
│   │
│   ├── ui/                            # @baobab/ui — React + RN components
│   │   └── src/
│   │       ├── primitives/            # Button, Input, Modal — DOM/RN abstraction
│   │       ├── chrome/                # TabStrip, Omnibar (desktop variants)
│   │       ├── sidebar/               # AISidebar, ChatArea, ModelSelector
│   │       ├── reader/                # ReaderPanel, OfflineSavedList
│   │       ├── civic/                 # CivicFeed, ParliamentTracker
│   │       └── theme/                 # Baobab tokens, dark/light, low-bandwidth skin
│   │
│   ├── cloud-client/                  # @baobab/cloud-client — Worker API client
│   │   └── src/
│   │       ├── client.ts              # fetch wrapper, JWT, refresh
│   │       ├── offline-queue.ts
│   │       ├── auth.ts                # phone+OTP, email, passkey
│   │       ├── ai.ts
│   │       ├── history.ts
│   │       ├── bookmarks.ts
│   │       ├── tabs.ts
│   │       ├── agents.ts
│   │       ├── payments.ts            # M-Pesa/MoMo/Paystack/Flutterwave
│   │       └── ws.ts                  # Durable Object WebSocket client
│   │
│   └── brand/                         # @baobab/brand
│       ├── logos/
│       ├── fonts/                     # Recoleta, General Sans, Source Serif 4, JetBrains Mono
│       └── strings.ts                 # English copy (i18n in P1)
│
├── worker/                            # Cloudflare Worker
│   ├── wrangler.toml                  # baobab-* resource names
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                   # Hono app entry
│   │   ├── types.ts                   # Env interface, model registry
│   │   ├── auth/                      # OTP, email, JWT, KV sessions, passkey
│   │   ├── middleware/                # auth, rate-limit, residency-header
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── ai.ts
│   │   │   ├── proxy.ts               # Reader Mode fetch + AI extraction
│   │   │   ├── history.ts
│   │   │   ├── bookmarks.ts
│   │   │   ├── tabs.ts
│   │   │   ├── conversations.ts
│   │   │   ├── agents.ts
│   │   │   ├── assets.ts
│   │   │   ├── stats.ts
│   │   │   ├── payments.ts            # M-Pesa/MoMo/Paystack webhooks + checkout
│   │   │   ├── civic.ts               # African civic feeds
│   │   │   └── search.ts              # African-source ranking
│   │   ├── services/
│   │   │   ├── ai.ts                  # Workers AI wrapper, multi-model, streaming
│   │   │   ├── adblock.ts             # Rule engine + HTMLRewriter
│   │   │   ├── reader.ts              # HTML cleanup + AI extraction
│   │   │   ├── otp.ts                 # Africa's Talking / Twilio / Termii
│   │   │   └── payments/              # M-Pesa, MoMo, Paystack, Flutterwave adapters
│   │   └── durable-objects/
│   │       ├── BrowserSession.ts
│   │       ├── AutopilotAgent.ts
│   │       └── ReaderQueue.ts
│   └── db/
│       ├── schema.sql
│       └── migrations/
│           ├── 0001_initial.sql
│           ├── 0002_payments.sql
│           └── 0003_civic_feeds.sql
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SOVEREIGNTY.md                 # data-residency story, audit trail
│   ├── BUILD.md
│   └── CONTRIBUTING.md
│
└── .github/workflows/
    ├── ci.yml                         # lint, typecheck, tests
    ├── desktop-release.yml            # Tauri builds for win/mac/linux
    ├── mobile-release.yml             # EAS Android + iOS
    └── worker-deploy.yml              # wrangler deploy on main
```

**Principles encoded:**

- Apps are thin shells that wire shared packages to native platforms. Business logic lives in `packages/core`.
- One `git clone` gets everything. Turborepo caches builds across packages.
- Worker stays in this monorepo so server and client share TypeScript types via `packages/core`.
- Brand isolated in its own package — easy to swap logos/fonts later without touching `ui`.

---

## 4. Cloudflare Resources & Sovereignty Layer

### 4.1 Resource map

```
Account ID:   ea2eb3a9813660dfca2a60e594858538

D1:
  Name:           baobab-db
  Location hint:  weur (closest CF D1 region to African POPs as of 2026)

KV namespaces:
  BAOBAB_SESSIONS         — auth sessions, 24h TTL
  BAOBAB_PAGE_CACHE       — Reader Mode cache, 30min TTL
  BAOBAB_RATE_LIMITS      — sliding-window counters, 60s TTL
  BAOBAB_OFFLINE_INDEX    — per-user offline article index
  BAOBAB_OTP              — phone OTP codes, 5min TTL

R2 buckets:
  baobab-assets   — screenshots, exports, avatars (jurisdiction = eu)
  baobab-offline  — cached offline articles (jurisdiction = eu)
                    Note: CF doesn't offer African R2 jurisdiction yet —
                    disclosed in Settings → Privacy and SOVEREIGNTY.md.

Durable Objects (SQLite-backed):
  BrowserSession  — cross-device tab sync (WebSocket)
  AutopilotAgent  — long-running agent tasks
  ReaderQueue     — per-user offline article queue + sync state

Workers AI:       binding "AI", same 6-model menu as OzzySurf.
```

### 4.2 Migration from existing SparkBrowse provisioning

One-shot, ~30 minutes:

```bash
# 1. Export SparkBrowse data
npx wrangler d1 export sparkbrowse-db --output=baobab-migration.sql

# 2. Create Baobab D1
npx wrangler d1 create baobab-db
# (note new ID, paste into wrangler.toml)

# 3. Import schema + data
npx wrangler d1 execute baobab-db --file=baobab-migration.sql

# 4. Recreate KV namespaces
npx wrangler kv namespace create BAOBAB_SESSIONS
npx wrangler kv namespace create BAOBAB_PAGE_CACHE
npx wrangler kv namespace create BAOBAB_RATE_LIMITS
npx wrangler kv namespace create BAOBAB_OFFLINE_INDEX
npx wrangler kv namespace create BAOBAB_OTP

# 5. Create R2 buckets
npx wrangler r2 bucket create baobab-assets --jurisdiction=eu
npx wrangler r2 bucket create baobab-offline --jurisdiction=eu

# 6. Tear down SparkBrowse resources after Baobab Worker verified
npx wrangler d1 delete sparkbrowse-db
# (etc. for KV and R2 — manual confirm each)
```

### 4.3 Sovereignty middleware

Every API response carries a residency header so the UI (and any third-party auditor) can verify the data path:

```typescript
// worker/src/middleware/residency.ts
const AFRICAN_COLOS = new Set([
  'LOS','ABV','LAD','DKR','ACC','ABJ','OUA','CMN','RBA',
  'CAI','TUN','ALG','JIB','ADD','MBA','NBO','KGL','EBB',
  'JNB','CPT','DUR','MPM','BUL','HRE','LUN','GBE','WDH',
])

app.use('*', async (c, next) => {
  const cf = c.req.raw.cf as IncomingRequestCfProperties
  const colo = cf?.colo ?? 'unknown'
  const country = cf?.country ?? 'unknown'
  const isAfricanColo = AFRICAN_COLOS.has(colo)

  c.header('X-Baobab-Colo', colo)
  c.header('X-Baobab-Region', isAfricanColo ? 'africa' : 'edge-fallback')
  c.header('X-Data-Residency', 'd1=weur,r2=eu')

  await next()
})
```

The status bar in both shells surfaces a **Home** indicator (green) when `X-Baobab-Region: africa`, **Roaming** (amber) when fallback, **Offline** (gray) when no network. Click → tooltip showing exact colo + data path.

### 4.4 Low-bandwidth mode

Auto-detected on `slow-2g`/`2g`/`3g` via `navigator.connection.effectiveType` (mobile) or via Rust `network-interface` crate (desktop). Manual toggle in status bar.

When active:
- AI sidebar defaults to Llama 3.1 **8B** instead of 70B
- Images served via Cloudflare Image Resizing at `quality=60, width=720`
- Web fonts served as woff2 subsets (Latin Extended only)
- Pre-fetch off, link-preview off
- Reader Mode strips images by default (tap to load)
- "Saved 47 MB this month" pill in status bar (counter persisted in `users.bandwidth_saved_bytes`)

### 4.5 Sovereign AI option (P1)

Settings → Privacy → "AI provider":

- **Default** — Cloudflare Workers AI (recommended)
- **Custom endpoint** — user enters URL + (optional) bearer token. Must implement OpenAI-compatible `/v1/chat/completions`. Worker proxies the call, OR for fully-sovereign mode the client calls the user's endpoint directly and the Worker is bypassed for AI.
- **Local Ollama** — desktop only. Tauri detects `localhost:11434`, lists installed models, lets user pick. Mobile shows "available on desktop."

This is the "you can leave us" pressure-release valve. Brave can't say this. Arc can't say this. Baobab can.

---

## 5. Auth & Data Schema

### 5.1 Auth: phone-first, email optional

Three sign-in paths, user picks at signup:

1. **Phone + OTP** (primary) — E.164 format, 6-digit code via SMS or WhatsApp, no password stored
2. **Email + password** (familiar) — kept for power users / desktop users
3. **Passkey** (modern) — WebAuthn on devices that support it; biometric on mobile

OTP delivery providers (Africa-tuned):
- **Africa's Talking** — primary across 30+ African countries, cheap, reliable
- **Twilio** — fallback + WhatsApp Business API
- **Termii** — Nigeria-specific fallback (Twilio sometimes throttled there)

Provider chosen per-country at runtime based on cost + delivery rate.

OTP rate limits: max 3 sends per phone per hour, 10 verify attempts before 30-min lockout.

JWT shape: access token (24h) + refresh token (30d), rotation on refresh, KV-cached sessions for fast middleware.

### 5.2 D1 schema (full)

```sql
-- ===== Core user tables =====

CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- ULID
  phone TEXT UNIQUE,                      -- E.164, NULL allowed
  email TEXT UNIQUE,                      -- NULL allowed
  password_hash TEXT,                     -- NULL if phone-only signup
  display_name TEXT,
  avatar_url TEXT,
  default_model TEXT DEFAULT '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  theme TEXT DEFAULT 'dark',
  ad_blocking INTEGER DEFAULT 1,
  privacy_mode INTEGER DEFAULT 1,
  low_bandwidth_mode INTEGER DEFAULT 0,
  search_engine TEXT DEFAULT 'baobab',    -- baobab | google | duckduckgo | bing
  language TEXT DEFAULT 'en',
  country TEXT,                           -- ISO 2-letter
  sidebar_position TEXT DEFAULT 'right',
  bandwidth_saved_bytes INTEGER DEFAULT 0,
  ai_provider TEXT DEFAULT 'cloudflare',  -- cloudflare | custom | ollama
  ai_provider_url TEXT,                   -- nullable
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);

-- ===== Browser state =====

CREATE TABLE tabs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT NOT NULL,
  favicon_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_tabs_user_position ON tabs(user_id, position);

CREATE TABLE history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  visit_count INTEGER DEFAULT 1,
  last_visited_at INTEGER DEFAULT (unixepoch()),
  ai_summary TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_history_user_visited ON history(user_id, last_visited_at DESC);
CREATE INDEX idx_history_url ON history(user_id, url);

CREATE TABLE bookmark_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES bookmark_folders(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  folder_id TEXT REFERENCES bookmark_folders(id) ON DELETE SET NULL,
  favicon_url TEXT,
  position INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_bookmarks_user_folder ON bookmarks(user_id, folder_id, position);

-- ===== AI =====

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  model TEXT,
  page_url TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                     -- user | assistant | system
  content TEXT NOT NULL,
  model TEXT,
  page_context TEXT,
  tokens_used INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_chat_conversation ON chat_messages(conversation_id, created_at);

CREATE TABLE user_agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model TEXT,
  triggers TEXT,                          -- JSON array of trigger patterns
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- ===== Stats / metrics =====

CREATE TABLE adblock_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT,
  ads_blocked INTEGER DEFAULT 0,
  trackers_blocked INTEGER DEFAULT 0,
  bytes_saved INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  key_hash TEXT NOT NULL,
  permissions TEXT,                       -- JSON
  last_used_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- ===== Auth additions =====

CREATE TABLE otp_attempts (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  ip TEXT,
  succeeded INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_otp_phone_time ON otp_attempts(phone, created_at);

CREATE TABLE passkeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id BLOB UNIQUE NOT NULL,
  public_key BLOB NOT NULL,
  counter INTEGER DEFAULT 0,
  device_name TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  last_used_at INTEGER
);

-- ===== Sovereignty: offline =====

CREATE TABLE offline_articles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  r2_key TEXT NOT NULL,                   -- baobab-offline bucket key
  ai_summary TEXT,
  word_count INTEGER,
  est_read_minutes INTEGER,
  saved_at INTEGER DEFAULT (unixepoch()),
  read_at INTEGER,                        -- NULL = unread
  size_bytes INTEGER
);
CREATE INDEX idx_offline_user_unread ON offline_articles(user_id, read_at, saved_at DESC);

-- ===== Payments (P1) =====

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                 -- mpesa | mtn_momo | paystack | flutterwave | stripe
  provider_ref TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,          -- minor units (kobo, pesewas, cents)
  currency TEXT NOT NULL,                 -- NGN, GHS, KES, ZAR, EGP, USD
  product TEXT NOT NULL,
  status TEXT NOT NULL,                   -- pending | success | failed | refunded
  raw_payload TEXT,                       -- full webhook JSON for audit
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER
);
CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_provider_ref ON payments(provider, provider_ref);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,                     -- free | pro | sovereign
  status TEXT NOT NULL,                   -- active | past_due | cancelled | trialing
  current_period_end INTEGER,
  provider TEXT,
  provider_ref TEXT,
  cancelled_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- ===== Civic (P1) =====

CREATE TABLE civic_feeds (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,                    -- pan_african | regional | national
  region TEXT,                            -- ECOWAS, EAC, SADC, AU
  country TEXT,                           -- NG, GH, KE, ZA — NULL for pan-african
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  category TEXT NOT NULL,                 -- parliament | court | news | open_data
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE civic_subscriptions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feed_id TEXT NOT NULL REFERENCES civic_feeds(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, feed_id)
);
```

Migrations strategy: numbered files in `worker/db/migrations/`, applied via `wrangler d1 migrations apply baobab-db`. No live `ALTER TABLE` in production code.

---

## 6. Brand & UI System

### 6.1 Color palette — "Modern Sahel"

Pulled from sunset over the savanna. Avoids Pan-African flag colors (politically loaded, regionally inconsistent).

```
=== Dark theme (primary) ===
Canvas:           #15110d   /* deep night, baobab silhouette at dusk */
Surface 1:        #1c1814
Surface 2:        #251f19
Surface 3:        #2e271f
Border:           #3a3127
Border accent:    #4a3e2f

Text primary:     #f0e9dc   /* warm white */
Text secondary:   #b8ad9a
Text muted:       #7a7060

Accent (primary): #d97706   /* sahel amber — the brand color */
Accent light:     #f59e0b
Accent dim:       rgba(217, 119, 6, 0.12)

Sovereignty OK:   #65a30d   /* leaf green — Home indicator */
Sovereignty warn: #d97706   /* amber — Roaming indicator (uses brand color) */
Critical:         #b91c1c   /* terracotta red */
Info:             #0891b2   /* deep teal */

=== Light theme ===
Canvas:           #faf6ee   /* parchment / dried savanna grass */
Surface 1:        #f4ecdc
Text primary:     #1c1814
Accent:           #c2410c   /* deeper amber for AA contrast on light */
(else mirror dark, inverted)
```

All text/background pairs verified at WCAG AA contrast minimum.

### 6.2 Typography

```
Wordmark / display:    Recoleta (warm geometric serif)
                       — fallback: General Sans Bold
UI:                    General Sans (clean, contemporary, non-Western-default)
Reading (Reader Mode): Source Serif 4 (long-form journalism)
URL bar / code:        JetBrains Mono

Avoid: Inter, Roboto, Arial, Helvetica, DM Sans.
       (Generic by design. Baobab needs a voice.)
```

Web fonts subsetted to Latin Extended + Latin-A (covers French, Portuguese, Swahili diacritics) — keeps mobile bundle <200 KB.

### 6.3 Iconography

Standard icons: Lucide (consistency, accessibility, recognition).

**Five system-status indicators use custom-drawn African-rooted glyphs** with neutral English labels:

| Status | Label | Icon direction |
|---|---|---|
| Data residency = Africa | **Home** | Custom leaf / baobab silhouette glyph |
| Data residency = fallback | **Roaming** | Custom open-eye / alert glyph |
| Sovereign AI mode active | **Sovereign** | Shield glyph (single line, geometric) |
| Offline saved article | **Saved** | Bookmark / folded-cloth glyph |
| Custom agent ready | **Agent** | Concentric circle glyph |

Single-word labels, instantly readable. Visual identity rooted in African motifs (baobab silhouette, woven-cloth folds) so the brand is grounded in place. No emojis in production UI.

Rule: **sovereignty in engineering, not in costume.** A user in Lagos doesn't need to learn vocabulary to use the browser; they see "Home" with a green indicator and know what it means.

### 6.4 Voice & copy

Tagline: *"The browser that grew here."*

System voice rules (enforced via `packages/brand/strings.ts`):

- **Confident, not folksy.** "Your data stays on the continent" — not "Your stuff is safe with us."
- **Specific, not abstract.** "Served from Lagos" — not "Located near you."
- **No tech jargon in user-facing copy.** "Reader Mode" not "Server-side proxy with HTML sanitization."
- **No emoji in production UI.**
- **Loading states are sentences, not spinners alone.** "Reaching across the continent…" while AI loads. "Saving for the next quiet evening…" while saving offline.

### 6.5 Motion language

- Sidebar slide-in: 240ms ease-out
- Tab open: scale 0.96 → 1.0 + fade, 180ms
- Reader Mode reveal: blur-in over the page, 320ms
- Sovereignty leaf pulse: subtle 2s breathing animation when Home, no animation when Roaming/Offline
- Respect `prefers-reduced-motion`: disable transitions, instant state changes

### 6.6 Window chrome

- macOS: native traffic lights (Tauri handles)
- Windows: thin custom titlebar, Baobab wordmark left + minimize/maximize/close right
- Linux: GTK conventions, no custom chrome
- **Vertical tab bar** option in settings (better for African languages with longer words and for low-resolution monitors common in cybercafés/schools)

---

## 7. Feature Catalog

27 features total. **P0** = v1 launch. **P1** = v1.x follow-on (3-6 months after launch). **P2** = future, designed later.

Each feature has a priority, summary, endpoint contract (where relevant), and acceptance criteria.

### 7.1 Browser shell

**A1. Tab management** · P0
Real Tauri `WebviewWindow` per tab on desktop, `react-native-webview` per tab on mobile. Vertical-tabs option in settings. Add/close/reorder/pin. Active tab indicator: amber top border (desktop), amber underline (mobile). New tab opens to right of active tab. Ctrl+T / Ctrl+W / Ctrl+Tab.
✅ Acceptance: open 20 tabs, close all but one, reorder via drag, pin a tab — no leaked webviews, memory stable.

**A2. Omnibar** · P0
Unified URL/search bar. Smart parse: contains `.` and no spaces → URL, else AI-enhanced search. HTTPS shield icon when secure. Autocomplete from history (debounced 150ms, top 5 matches).
✅ Acceptance: typing "github.com" navigates; typing "bus from accra to kumasi" routes to `/api/ai/search`; Esc cancels autocomplete.

**A3. New Tab page** · P0
Baobab logo + omnibar centered + 8-tile bookmark grid + AI capabilities cards (Summarize, Translate, Research, Compare, Code, Civic). Footer: "Served from {colo}" with Home indicator.
✅ Acceptance: loads in <100ms from cache, shows actual current colo, fade-in respects `prefers-reduced-motion`.

**A4. Status bar** · P0
Bottom strip: Home/Roaming indicator (with colo), ads blocked count, page load time, secure indicator, low-bandwidth toggle.
✅ Acceptance: counters update live; click any indicator → tooltip with details.

### 7.2 AI core

**B1. AI sidebar** · P0
Slide-in panel, 380px wide on desktop, full-screen modal on mobile. Model selector (6 models). Quick actions: Summarize · Translate · Extract · Compare · Explain Code. Markdown rendering, copy button per code block. Each message tagged with model name.
✅ Acceptance: opens in <120ms, streams responses token-by-token, auto-scrolls.

**B2. AI chat** · P0
`POST /api/ai/chat` — `{message, model_id, conversation_id?, page_context?}`
System prompt: "You are Baobab AI, an intelligent browsing assistant for an African-first sovereign browser." Streaming SSE. Persists to `chat_messages`. Rate limit: 30 req/min. Low-bandwidth mode silently swaps to 8B model.
✅ Acceptance: 5 concurrent chats, no message loss, conversation continuation across app restart.

**B3. Page summarization** · P0
`POST /api/ai/summarize` — `{url, html_content?}`
KV cache check (`summary:{sha256(url)}`) — return cached if <1h. If no html_content, Worker fetches itself. Returns `{summary, key_points[], est_read_time, cached: bool}`.
✅ Acceptance: 6000-char article summarizes in <8s on 70B, <3s on 8B; cache hit returns in <300ms.

**B4. AI search** · P0
`POST /api/ai/search` — `{query}`
Embedding via `bge-large-en-v1.5`. Llama 3.3 70B answer with citations. Result list ranks African sources higher (see C2).
✅ Acceptance: query "land act ghana 2020" surfaces Ghanaian gov sources in top 3.

**B5. Reader Mode** · P0
Click "Reader" in nav bar → `POST /api/proxy/fetch` strips ads/clutter, renders cleaned HTML in side panel. AI summary + key points auto-generated. "Save offline" button persists to R2 + `offline_articles`. Cached 30min.
✅ Acceptance: works on 95% of news sites tested (sample: BBC Africa, Premium Times, Daily Maverick, The East African, Citi Newsroom, Daily Graphic, Daily Nation).

**B6. Translation** · P1
`POST /api/ai/translate` — `{text, source_lang, target_lang}` via `m2m100-1.2b`. Surfaces in Reader Mode + omnibar context-menu. Pushed to P1 because African-language UI is also P1; ship as a coherent set later.

### 7.3 Sovereignty layer

**C1. Data residency** · P0
Already specified in §4.3. Status bar shows Home/Roaming. Settings → Privacy shows full data path with honest disclosure.
✅ Acceptance: header `X-Baobab-Region` matches displayed indicator, audit log retrievable on demand.

**C2. African search ranking** · P0
Worker maintains a curated allowlist (~500 outlets at launch) in KV, scored by region match (NG, GH, KE, ZA = 1.0, others = 0.7) + recency. User toggle "Show global results" (default off).
✅ Acceptance: query "covid vaccine" surfaces Africa CDC, ministry of health pages in top 5; toggle reveals WHO etc.

**C3. Low-bandwidth mode** · P0
Already specified in §4.4. Auto-detect on `slow-2g`/`2g`/`3g`, manual toggle in status bar.
✅ Acceptance: bandwidth_saved_bytes counter increments correctly, image quality drops verifiably, AI defaults to 8B.

**C4. Offline-first reading** · P0
"Save for later" on any Reader Mode page. Stored in R2 (`baobab-offline`) + `offline_articles`. Mobile: full-screen offline list, ordered by saved date. Desktop: side panel "Saved" section. "Reading queue" widget on New Tab page. Auto-delete read articles >30 days old (configurable).
✅ Acceptance: save 10 articles online, switch to airplane mode, all 10 readable; sync state survives app restart.

**C5. Sovereign AI option** · P1
Already specified in §4.5.
✅ Acceptance: user enters Ollama localhost URL on desktop, AI sidebar uses it; falls back to CF on error with clear message.

**C6. Local payments** · P1
M-Pesa / MTN MoMo / Paystack / Flutterwave. Webhooks: `POST /api/payments/webhook/:provider`.
Subscription tiers (proposed):
- **Free** — full browser, AI 50 messages/day, 3 saved offline articles
- **Pro** — ~$2.99/mo or 30 GHS / 4500 NGN / 400 KES — unlimited AI, unlimited offline, 5 custom agents
- **Sovereign** — ~$9.99/mo — Pro + own AI endpoint + priority support + early features

✅ Acceptance: full happy-path purchase via M-Pesa STK Push, webhook updates `subscriptions.status` to `active` within 60s.

**C7. Pan-African civic layer** · P1
`civic_feeds` populated with curated sources (AU, ECOWAS, EAC, SADC + per-country parliaments/courts/open-data). New Tab page widget pulls from subscribed feeds. Initial seed: ~30 feeds across 8 countries.
✅ Acceptance: user subscribes to Ghana Parliament feed, new bills appear in widget within 1h.

### 7.4 User & infrastructure

**D1. Auth** · P0 — Phone+OTP / email+password / passkey. See §5.
✅ Acceptance: full signup flow on flaky 3G < 30s end-to-end.

**D2. Rate limiting** · P0 — KV sliding-window. Auth: 10/min. AI: 30/min. Default: 60/min. `X-RateLimit-Remaining` header.
✅ Acceptance: 31st AI call in 60s returns 429 with retry-after.

**D3. History** · P0 — Auto-record visits, paginated reads, full-text search by title/URL. Privacy mode skips recording.
Routes: `GET / POST / DELETE /api/history`, `DELETE /api/history/:id`.
✅ Acceptance: 1000-entry history loads in <500ms, search returns in <200ms.

**D4. Bookmarks** · P0 — Full CRUD + nested folders + drag reorder. Bookmarks bar shows top-level only.
✅ Acceptance: 100-folder tree renders without lag, drag-reorder syncs to backend within 1s.

**D5. Tab sync via Durable Objects** · P1 — `BrowserSession` DO, WebSocket-based. Open a tab on desktop → appears on mobile within 2s.
✅ Acceptance: 3 devices simultaneous, tab open/close/switch propagates within 2s.

**D6. Custom AI agents** · P1 — User defines name + system prompt + model + triggers. Stored in `user_agents`. Invokable from sidebar.
✅ Acceptance: user creates "Translate to Yoruba" agent, invokes via slash command, response uses defined system prompt.

**D7. Autopilot DO** · P1 — `AutopilotAgent` runs long agentic tasks (e.g., "compare these 5 phones and pick the best for 2000 cedis"). Status polled, results stored in conversations.
✅ Acceptance: 10-URL research task completes in <3 min, results readable in chat history.

**D8. Asset storage** · P0 — R2-backed uploads/downloads for screenshots, exports, offline articles, avatars.
Routes: `POST /api/assets/upload`, `GET /api/assets/:key`.
✅ Acceptance: 5MB upload completes in <10s on 4G.

**D9. User stats dashboard** · P1 — Pages visited, ads blocked, MB saved, AI usage by model, top sites. `GET /api/stats`.
✅ Acceptance: stats load in <500ms even at 10k history rows.

**D10. Settings** · P0 — Theme, default model, ad-block, privacy, low-bandwidth, search engine, sidebar position, AI provider, country.
✅ Acceptance: settings persist across app restart and sync across devices via D1.

### 7.5 Phase summary

- **P0 (v1 launch):** A1-A4, B1-B5, C1-C4, D1-D4, D8, D10 = **19 features**
- **P1 (v1.1+):** B6, C5-C7, D5-D7, D9 = **8 features**
- **P2 (cut from this spec):** none — but full African-language UI is queued behind P1

Realistic v1 target: 3-4 months solo if disciplined; faster with subagents on parallel sub-tasks.

---

## 8. Build & Deploy

### 8.1 Desktop (Tauri)

```bash
cd apps/desktop
npm install
npm run tauri dev          # opens Baobab on local CF dev worker
npm run tauri build        # outputs to src-tauri/target/release/bundle/

# Per-OS artifacts:
#   Windows:  Baobab_1.0.0_x64-setup.nsis.exe   (~14 MB)
#   macOS:    Baobab_1.0.0_aarch64.dmg          (~16 MB)
#   Linux:    baobab_1.0.0_amd64.AppImage       (~15 MB)
#             baobab_1.0.0_amd64.deb            (~12 MB)
```

**Code signing:**
- **Windows**: Azure Trusted Signing ($10/mo) — replaces EV cert + USB-token model
- **macOS**: Apple Developer Program ($99/yr) for notarization
- **Linux**: AppImage signed with GPG, deb/rpm signed via repo signing key

**Auto-update:** Tauri's built-in updater. Manifest at `https://updates.baobab.africa/{platform}/{arch}/latest.json` served from Worker (D1-backed). Manifest signed with Tauri's signing key.

### 8.2 Mobile (Expo + EAS)

```bash
cd apps/mobile
npm install
npx expo start

eas build --platform android --profile production   # APK + AAB
eas build --platform ios --profile production       # IPA
eas update --branch production --message "Fix tab crash"  # OTA
```

`eas.json` profiles: `preview` (APK for sideload) and `production` (AAB for Play, IPA with autoIncrement).

**Distribution:**
- Android: Google Play (primary) + direct APK on `baobab.africa/download` (sideload — important in markets with uneven Play Store penetration) + Huawei AppGallery (P1)
- iOS: App Store only

### 8.3 Worker

```bash
cd worker
npx wrangler deploy                              # production
npx wrangler deploy --env staging                # staging
npx wrangler d1 migrations apply baobab-db       # apply pending
npx wrangler secret put AUTH_SECRET              # rotate
```

**Secrets** (set via `wrangler secret put`, never in source):
- `AUTH_SECRET`, `ENCRYPTION_KEY`, `ADMIN_API_KEY`
- `OTP_AFRICASTALKING_KEY`, `OTP_TWILIO_KEY`, `OTP_TERMII_KEY`
- (P1) `MPESA_*`, `PAYSTACK_SECRET`, `FLUTTERWAVE_SECRET`, `MTN_MOMO_*`

### 8.4 CI/CD — `.github/workflows/`

- **ci.yml** — runs on every PR + push to main: lint, typecheck, vitest in core/cloud-client, jest in worker, turbo build (cached)
- **desktop-release.yml** — triggered by tag `v*.*.*`, matrix runs on windows-latest / macos-14 / ubuntu-22.04, tauri-action with signing certs from secrets, uploads to GitHub Release, publishes update manifest to R2
- **mobile-release.yml** — triggered by tag `mobile-v*.*.*`, eas build --platform all, uploads APK to R2 for direct download, submits AAB to Play Internal Track + IPA to TestFlight
- **worker-deploy.yml** — triggered by push to main, wrangler deploy, apply pending D1 migrations, smoke test `/health`

### 8.5 Domain & DNS

```
baobab.africa            → Cloudflare Pages (landing + downloads)
app.baobab.africa        → web preview / hosted PWA (P1)
api.baobab.africa        → Worker (custom domain)
updates.baobab.africa    → Worker route serving update manifests
docs.baobab.africa       → Cloudflare Pages (docs site)
```

`.africa` registrar: ZACR, ~$25/yr. Claim `baobab.africa` before announcing the brand.

### 8.6 Release cadence

- **Worker**: continuous deploy on merge to `main`
- **Desktop**: tagged releases every 2-3 weeks during v1 development, monthly post-launch
- **Mobile**: OTA updates weekly via `eas update`, full store releases monthly (anything touching native code)
- **Schema migrations**: never on a Friday, never within 24h of marketing push

### 8.7 Out-of-scope for v1 (explicit)

- Linux Snap / Flatpak (AppImage covers most needs)
- Microsoft Store (NSIS installer is enough)
- iOS sideload (not relevant for African audience)
- Separate web/PWA app (`app.baobab.africa`) — tempting but doubles QA, P1

---

## 9. Risks, Launch Checklist & Beta Plan

### 9.1 Known risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CF doesn't offer African D1/R2 jurisdiction yet | Certain | Medium | Disclose honestly. Use `weur` D1 + `eu` R2. Re-evaluate quarterly. |
| Tauri webview-per-tab less battle-tested than Electron | Medium | High | Memory-stress test in week 1 (open/close 100 tabs). Fall back to Electron desktop if it can't hold up. Mobile unaffected. |
| OTP delivery fails in low-coverage / Nigeria DND | High | Medium | Triple-provider fallback + WhatsApp OTP + email/passkey escape hatches |
| Code signing reputation builds slowly | High | Medium | Submit to Microsoft for whitelist pre-launch. Hash verification on download page. First-install guide. |
| App Store rejection (browsers heavily scrutinized) | Medium | High | Submit early to TestFlight. Don't claim alternative engine — Tauri uses platform webview. |
| Workers AI rate limits / 70B outages | Medium | Medium | Worker fallback chain: 70B → 8B → cached response. Already proven in OS Browser. |
| M-Pesa/MoMo integration takes longer than expected | High | Low (P1) | Treated as P1. Stripe-only Sovereign tier as international fallback. |
| Adblock rules go stale | Certain over time | Low | Worker cron pulls Ghostery TDS list daily. |
| Brand fork by bad actor | Low day 1 | Medium | AGPL keeps forks open. Trademark Baobab in NG/GH/KE/ZA/US (~$1500). |
| Solo founder burnout | High | Existential | Realistic phasing (P0 only for v1). Public roadmap. No marketing push until product is honestly ready. |

### 9.2 Pre-launch checklist (P0 must-haves)

**Technical**
- [ ] Tauri memory test: 100 tab open/close cycles, RSS stable
- [ ] Mobile APK passes Play pre-launch report (no critical crashes)
- [ ] Worker error rate <0.5% over 7-day staging soak
- [ ] D1 query p95 <100ms under simulated 1000-user load
- [ ] All P0 features have at least one integration test
- [ ] Sentry / Workers Analytics dashboard wired
- [ ] Auth golden path tested on 3 phone networks
- [ ] OTP delivers in <30s on each provider
- [ ] Reader Mode tested on 20 sample sites
- [ ] AI streaming doesn't drop on flaky 3G
- [ ] Offline articles survive force-close + restart

**Legal / brand**
- [ ] `baobab.africa` registered
- [ ] "Baobab" trademark filed in NG, GH, KE, ZA
- [ ] Privacy policy (POPIA / NDPR / DPA 2012 compliant)
- [ ] Terms of Service published
- [ ] AGPL-3.0 license in repo
- [ ] Sovereignty whitepaper at `docs.baobab.africa/sovereignty`

**Distribution**
- [ ] Code signing certs active (Windows, macOS)
- [ ] Auto-update manifest serving from staging
- [ ] Google Play Internal Track approved
- [ ] App Store TestFlight build submitted
- [ ] Linux AppImage signed + on R2
- [ ] Direct APK download flow on `baobab.africa/download`
- [ ] Landing page: hero, sovereignty story, downloads, FAQ, blog

**Comms**
- [ ] Founding 100 beta users recruited
- [ ] Twitter/X + Mastodon (afritalk.network or similar) presence
- [ ] LinkedIn page (higher-trust African professional channel)
- [ ] Demo video <90s
- [ ] Launch-day blog post: "Why we built an African browser"
- [ ] Press list: TechCabal, Disrupt Africa, Techpoint, ITNewsAfrica, BusinessDay tech

### 9.3 Beta plan — three concentric circles

**Circle 1: Founding 50** (4-6 weeks pre-launch)
Personal network + OS Browser testers + Hodges & Co. relationships + engaged devs in Lagos/Nairobi/Cape Town. NDA-free; goal is brutal feedback. WhatsApp + private Discord. Weekly build, weekly survey. Reward: lifetime Sovereign tier free.

**Circle 2: Closed Beta 500** (2-4 weeks pre-launch)
Recruited via pan-African dev communities (CcHub, MEST, Andela alumni, Moringa, ALX), African tech newsletters (Afridigest, The Continent, BD's tech section), Reddit r/Africa. Signup at `baobab.africa/beta` with motivation question. Discord + weekly office hours. Goal: real-world stress test across MTN, Airtel, Safaricom, Vodacom, Glo. Reward: founding member badge in app + 1 year Pro free.

**Circle 3: Public Launch**
Open downloads, free tier live, Pro tier behind "Coming soon" if M-Pesa/MoMo not ready. Press outreach Day 0. Product Hunt Day 3. Targets: 5,000 installs Month 1, 50,000 Month 6 if Pro converts at 2%.

### 9.4 What "done" looks like for v1

- All P0 features pass integration tests
- Pre-launch checklist 100% green
- Founding 50 + Closed Beta 500 ran for combined 6 weeks
- Crash-free rate >99% (Sentry)
- D1 + Worker p95 latency green for 14 consecutive days
- Privacy policy, ToS, sovereignty doc published
- Founder can sleep through a Friday night without checking dashboards

---

## 10. Open Questions / Decisions Deferred

These are explicitly *not* decided in this spec — to be resolved during implementation planning or v1.1:

1. **i18n strategy** — full African-language UI is P1+. Which languages first when we get there: Swahili + Hausa + French as the broadest continental reach, or Twi + Yoruba + Zulu as the highest-impact regional plays?
2. **Search engine partnership** — for non-AI-generated results in `/api/ai/search`, which upstream do we use? Brave Search API, Kagi, or self-host SearXNG?
3. **Civic feed governance** — who curates `civic_feeds`? Editorial board, community submissions with moderation, automated ingestion from open-data APIs?
4. **Mobile-only-Pro tier** — do we offer a cheaper "Mobile Pro" SKU at ~$0.99/mo for Africa-only purchasing power? Or one global price?
5. **Self-host story** — Baobab is AGPL, but do we publish a one-click self-host template (Docker compose / Cloudflare deploy button) for organizations that want to run their own backend?

---

## Appendix A — Wrangler config skeleton

> The `<filled-in>` placeholders are populated by running the migration steps in §4.2. Each `wrangler d1 create` / `wrangler kv namespace create` / `wrangler r2 bucket create` command prints an ID that must be pasted in here before the worker will deploy.

```toml
name = "baobab-api"
main = "src/index.ts"
compatibility_date = "2026-05-01"
compatibility_flags = ["nodejs_compat"]
account_id = "ea2eb3a9813660dfca2a60e594858538"

[ai]
binding = "AI"

[[d1_databases]]
binding = "DB"
database_name = "baobab-db"
database_id = "<filled-in-after-d1-create>"

[[kv_namespaces]]
binding = "BAOBAB_SESSIONS"
id = "<filled-in>"

[[kv_namespaces]]
binding = "BAOBAB_PAGE_CACHE"
id = "<filled-in>"

[[kv_namespaces]]
binding = "BAOBAB_RATE_LIMITS"
id = "<filled-in>"

[[kv_namespaces]]
binding = "BAOBAB_OFFLINE_INDEX"
id = "<filled-in>"

[[kv_namespaces]]
binding = "BAOBAB_OTP"
id = "<filled-in>"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "baobab-assets"

[[r2_buckets]]
binding = "OFFLINE"
bucket_name = "baobab-offline"

[[durable_objects.bindings]]
name = "BROWSER_SESSIONS"
class_name = "BrowserSession"

[[durable_objects.bindings]]
name = "AUTOPILOT"
class_name = "AutopilotAgent"

[[durable_objects.bindings]]
name = "READER_QUEUE"
class_name = "ReaderQueue"

[[migrations]]
tag = "v1"
new_classes = ["BrowserSession", "AutopilotAgent", "ReaderQueue"]

[vars]
ENVIRONMENT = "production"
APP_NAME = "Baobab"
APP_VERSION = "1.0.0"
CORS_ORIGIN = "https://baobab.africa,https://app.baobab.africa"
DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
LOWBW_MODEL = "@cf/meta/llama-3.1-8b-instruct"
SUMMARIZE_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
CODE_MODEL = "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"
TRANSLATE_MODEL = "@cf/meta/m2m100-1.2b"
EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5"

[triggers]
crons = ["0 3 * * *", "0 */6 * * *"]
```

---

## Appendix B — API Routes Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/api/models` | No | List available AI models |
| POST | `/api/auth/otp/send` | No | Send OTP to phone |
| POST | `/api/auth/otp/verify` | No | Verify OTP, return tokens |
| POST | `/api/auth/signup` | No | Email signup |
| POST | `/api/auth/login` | No | Email login |
| POST | `/api/auth/passkey/register` | Yes | Register passkey |
| POST | `/api/auth/passkey/verify` | No | Login with passkey |
| POST | `/api/auth/refresh` | No | Refresh tokens |
| POST | `/api/auth/logout` | Yes | Invalidate session |
| GET | `/api/auth/me` | Yes | Get user profile |
| PUT | `/api/auth/settings` | Yes | Update settings |
| PUT | `/api/auth/password` | Yes | Change password |
| POST | `/api/ai/chat` | Yes | AI chat (multi-model, streaming) |
| POST | `/api/ai/summarize` | Yes | Summarize page |
| POST | `/api/ai/translate` | Yes | Translate text (P1) |
| POST | `/api/ai/search` | Yes | AI-powered search w/ African ranking |
| POST | `/api/ai/compare` | Yes | Compare products/topics |
| POST | `/api/proxy/fetch` | Yes | Reader Mode: fetch + ad-block + AI extract |
| GET | `/api/history` | Yes | Get history |
| POST | `/api/history` | Yes | Add entry |
| DELETE | `/api/history` | Yes | Clear all |
| DELETE | `/api/history/:id` | Yes | Delete one |
| GET | `/api/bookmarks` | Yes | Bookmarks + folders |
| POST | `/api/bookmarks` | Yes | Add bookmark |
| PUT | `/api/bookmarks/:id` | Yes | Update |
| DELETE | `/api/bookmarks/:id` | Yes | Delete |
| POST | `/api/bookmarks/folders` | Yes | Create folder |
| GET | `/api/tabs` | Yes | Synced tabs |
| PUT | `/api/tabs/sync` | Yes | Batch sync |
| GET | `/api/conversations` | Yes | List |
| GET | `/api/conversations/:id/messages` | Yes | Messages |
| POST | `/api/conversations` | Yes | Create |
| DELETE | `/api/conversations/:id` | Yes | Delete |
| GET | `/api/agents` | Yes | List custom agents (P1) |
| POST | `/api/agents` | Yes | Create (P1) |
| PUT | `/api/agents/:id` | Yes | Update (P1) |
| DELETE | `/api/agents/:id` | Yes | Delete (P1) |
| POST | `/api/agents/:id/execute` | Yes | Execute (P1) |
| POST | `/api/assets/upload` | Yes | Upload to R2 |
| GET | `/api/assets/:key` | Yes | Download from R2 |
| GET | `/api/stats` | Yes | User analytics (P1) |
| POST | `/api/payments/checkout` | Yes | Initiate checkout (P1) |
| POST | `/api/payments/webhook/:provider` | No | Provider webhook (P1) |
| GET | `/api/civic/feeds` | Yes | Available feeds (P1) |
| POST | `/api/civic/subscribe` | Yes | Subscribe (P1) |
| GET | `/api/civic/items` | Yes | Items from subscribed feeds (P1) |

---

## Appendix C — Keyboard Shortcuts (Desktop)

| Shortcut | Action |
|---|---|
| Ctrl+T | New tab |
| Ctrl+W | Close current tab |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |
| Ctrl+L / Ctrl+K | Focus omnibar |
| Ctrl+B | Toggle bookmarks bar |
| Ctrl+H | Toggle history panel |
| Ctrl+J | Toggle AI sidebar |
| Ctrl+R / F5 | Reload |
| Ctrl+Shift+S | Summarize current page |
| Ctrl+Shift+R | Toggle Reader Mode |
| Ctrl+Shift+O | Save offline |
| Escape | Close sidebar/panel |

---

*End of design spec. Implementation plan to follow via the writing-plans skill.*
