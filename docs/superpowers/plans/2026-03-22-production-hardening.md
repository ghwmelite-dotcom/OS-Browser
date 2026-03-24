# Production Hardening — 34 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 34 audit findings (7 critical, 19 important, 8 minor) without breaking any existing functionality.

**Architecture:** Surgical, minimal changes to existing files. No refactoring, no feature removal. Every fix is additive or modifies only the specific lines identified in the audit.

**Tech Stack:** Electron, TypeScript, React, Vite, Node.js crypto

**CRITICAL CONSTRAINT:** Do NOT delete, remove, or restructure any working feature. Every fix must preserve existing behavior while adding safety/performance improvements.

---

## Batch A — Database Performance & Integrity
**Files:** `packages/main/src/db/database.ts`, `packages/main/src/db/migrations/001-initial.ts`
**Fixes:** #4, #7, #16, #17, #18

- [ ] **A1: Debounce saveToDisk — stop blocking on every write (#4, #7)**
  - In `database.ts`, remove `saveToDisk()` calls from inside `handleInsert()` (line 175), `handleUpdate()` (line 233), `handleDelete()` (line 246, 252)
  - Add a dirty flag: `let isDirty = false;` at module level
  - In each handler, set `isDirty = true` instead of calling `saveToDisk()`
  - Modify the existing `setInterval(saveToDisk, 5000)` to check dirty flag: `if (!isDirty) return; isDirty = false; saveToDisk();`
  - Add a write lock: `let isWriting = false;` — skip save if already writing
  - Keep `saveToDisk()` in `closeDatabase()` for clean shutdown
  - Result: writes batch every 5s instead of blocking on every single operation

- [ ] **A2: Atomic file writes with lock (#7)**
  - In `saveToDisk()`, wrap in lock: `if (isWriting) return; isWriting = true; try { ... } finally { isWriting = false; }`
  - Already uses temp file + rename pattern — just add the lock guard

- [ ] **A3: Log backup failures (#17)**
  - In `database.ts` line 25, change `catch { }` to `catch (err) { console.warn('[DB] Backup write failed:', err); }`

- [ ] **A4: Reset auto-increment on database init (#18)**
  - After `tables = JSON.parse(raw)` in `initDatabase()`, reset the `autoIncrements` map by scanning each table for max ID

- [ ] **A5: Verify build compiles, test basic DB operations**

---

## Batch B — Security: Crypto, Auth & Credentials
**Files:** `packages/main/src/services/credential-encryption.ts`, `packages/main/src/services/profile-manager.ts`, `packages/main/src/ipc/credentials.ts`
**Fixes:** #2, #3, #10, #11, #12, #20

- [ ] **B1: Timing-safe PIN comparison (#3)**
  - In `profile-manager.ts` `verifyPinHash()`, replace both `===` comparisons with `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`
  - Handle different-length buffers: if lengths differ, return false immediately

- [ ] **B2: Remove hardcoded default PIN (#10)**
  - In `profile-manager.ts` migration code (line ~125), generate random 4-digit PIN: `const pin = String(Math.floor(1000 + Math.random() * 9000));`
  - Log it: `console.log('[Profile] Default profile migrated with PIN:', pin);`
  - This only runs on legacy data migration, not new installs

- [ ] **B3: Add encryption key cache timeout (#12)**
  - In `credential-encryption.ts`, add timeout: after setting `_cachedKey`, set `setTimeout(() => { _cachedKey = null; }, 30 * 60 * 1000)`
  - Store timeout ref to clear on new access

- [ ] **B4: Fix credential encryption fallback warning (#2)**
  - In the hostname fallback path, add: `console.warn('[Security] Using hostname-derived key — safeStorage unavailable. Credentials are less secure.');`
  - This alerts in dev console without breaking functionality

- [ ] **B5: Fix ReDoS in credential pattern matching (#11)**
  - In `credentials.ts` `credential:get` handler, escape regex special chars before converting `*` to `.*`:
  ```typescript
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  ```

- [ ] **B6: Add timeout to breach check API (#20)**
  - In `credentials.ts` breach check handler, add `setTimeout(() => request.abort(), 5000)` for network timeout

- [ ] **B7: Verify build compiles**

---

## Batch C — IPC Handlers & Main Process
**Files:** `packages/main/src/ipc/handlers.ts`, `packages/main/src/ipc/tabs.ts`, `packages/main/src/ipc/settings.ts`, `packages/main/src/main.ts`, `packages/main/src/net/connectivity.ts`, `packages/preload/src/index.ts`
**Fixes:** #1, #8, #13, #14, #19, #22, #28, #32

- [ ] **C1: Replace execSync with execFile for registry (#1)**
  - In `handlers.ts` `APP_SET_DEFAULT_BROWSER`, replace each `execSync(cmd, ...)` with `execFileSync('reg.exe', [argArray], { windowsHide: true, stdio: 'ignore' })`
  - Parse each `reg add` command string into an args array

- [ ] **C2: Add URL scheme validation to tab navigation (#13)**
  - Add helper at top of `tabs.ts`:
  ```typescript
  function isAllowedUrl(url: string): boolean {
    if (url.startsWith('os-browser://')) return true;
    try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
  }
  ```
  - In `TAB_NAVIGATE` handler, check `if (!isAllowedUrl(url)) return;` before `loadURL()`
  - In `TAB_CREATE` handler, validate URL if provided

- [ ] **C3: Add recording size limit (#14)**
  - In `handlers.ts` or the recording save handler, add: `if (base64Data.length > 500 * 1024 * 1024) return { success: false, error: 'Recording too large' };`

- [ ] **C4: Add global error handlers (#19)**
  - In `main.ts`, after `app.whenReady()`, add:
  ```typescript
  process.on('unhandledRejection', (reason) => { console.error('[App] Unhandled rejection:', reason); });
  process.on('uncaughtException', (err) => { console.error('[App] Uncaught exception:', err); });
  ```

- [ ] **C5: Fix connectivity timeout cleanup (#22)**
  - In `connectivity.ts`, move `clearTimeout(timeout)` into `finally` block

- [ ] **C6: Add backtick escaping to settings SQL (#28)**
  - In `settings.ts`, change field interpolation to use backtick-escaped names

- [ ] **C7: Add error logging to silent promise catches (#32)**
  - In `tabs.ts`, replace `.catch(() => {})` with `.catch((err) => { console.warn('[Tab] Operation failed:', err); })`

- [ ] **C8: Verify build compiles**

---

## Batch D — Renderer, Build & Config
**Files:** `packages/renderer/vite.config.ts`, `packages/renderer/index.html`, `packages/renderer/src/components/ReadingMode/ReadingModePanel.tsx`, `packages/renderer/src/hooks/useKeyboardShortcuts.ts`, `package.json`, `scripts/afterPack.js`
**Fixes:** #5, #9, #21, #24, #25, #27, #34

- [ ] **D1: Add manualChunks to Vite config (#5)**
  - In `vite.config.ts`, add to `build`:
  ```typescript
  rollupOptions: {
    output: {
      manualChunks: {
        'matrix-sdk': ['matrix-js-sdk'],
        'vendor-react': ['react', 'react-dom'],
        'vendor-zustand': ['zustand'],
      }
    }
  }
  ```

- [ ] **D2: Sanitize dangerouslySetInnerHTML in Reading Mode (#9)**
  - Add a simple sanitizer function that strips `<script>`, `onerror=`, `onload=`, `javascript:` from the HTML string before rendering
  - Do NOT add DOMPurify dependency — use a regex-based strip to keep bundle small:
  ```typescript
  function sanitizeHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
  }
  ```

- [ ] **D3: Fix useKeyboardShortcuts dependency array (#21)**
  - Add the callbacks object to the dependency array, or wrap the handler in useCallback

- [ ] **D4: Add package.json metadata (#24, #25)**
  - Add `"description": "Ghana's AI-Powered Government Browser"`, `"author": "OHCS"`, `"license": "UNLICENSED"`
  - Add `"electron-updater": "^6.3.0"` to devDependencies

- [ ] **D5: Tighten CSP policy (#27)**
  - In `index.html`, restrict `img-src` to specific domains, add `frame-ancestors 'none'`, `base-uri 'self'`
  - Remove `http://localhost:*` from connect-src (only needed in dev)
  - Keep `'unsafe-inline'` for style-src (Tailwind needs it)

- [ ] **D6: Expand afterPack locale list (#34)**
  - In `scripts/afterPack.js`, add `en` to KEEP_LOCALES alongside `en-US` and `en-GB`

- [ ] **D7: Verify build compiles and check bundle size improvement**

---

## Batch E — Services & Stability
**Files:** `packages/main/src/services/adblock-engine.ts`, `packages/main/src/services/tab-suspension.ts`, `packages/main/src/services/offline-queue.ts`, `packages/main/src/ipc/bookmarks.ts`, `packages/main/src/services/profile-manager.ts`
**Fixes:** #6, #15, #23, #29, #30, #31, #33, #26

- [ ] **E1: Add interval cleanup registry to ad blocker (#6, #31)**
  - In `adblock-engine.ts`, before each `executeJavaScript()` that creates `setInterval`, wrap with cleanup tracking
  - Add to `setupViewEvents` in tabs.ts: on `will-navigate` and WebContents destroy, inject cleanup script
  - Minimal approach: add `window.__ozzyCleanup = []` and push intervals, clear on unload

- [ ] **E2: Increase tab suspension threshold (#23)**
  - In `packages/shared/src/constants.ts` (or wherever MAX_CONCURRENT_TABS is defined), change from 10 to 25

- [ ] **E3: Add URL validation to bookmark add (#29)**
  - In `bookmarks.ts` `BOOKMARK_ADD` handler, validate URL scheme before insert:
  ```typescript
  try { const u = new URL(data.url); if (!['http:', 'https:'].includes(u.protocol)) return null; } catch { return null; }
  ```

- [ ] **E4: Add structured error logging to silent catches (#26)**
  - Search for `catch { }` and `catch {}` patterns across main process files
  - Replace with `catch (err) { console.warn('[module] operation failed:', err); }`
  - Do NOT change the behavior — just add logging

- [ ] **E5: Add progress feedback to offline queue (#33)**
  - In `offline-queue.ts`, log batch progress: `console.log('[Queue] Processing batch: ${processed}/${total}')`

- [ ] **E6: Add rate limiting note (#30)**
  - This is MINOR and deferred — just add a TODO comment in handlers.ts: `// TODO: Add rate limiting for credential checks, agent execution`

- [ ] **E7: Verify build compiles**

---

## Final Verification

- [ ] **F1: Full build** — `npm run build`
- [ ] **F2: Package** — `npx electron-builder --win --config electron-builder.yml`
- [ ] **F3: Verify installer size is reasonable**
- [ ] **F4: Verify bundle chunks are split (check vite output)**
