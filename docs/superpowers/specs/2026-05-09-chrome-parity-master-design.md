# OS Browser Chrome-Parity — Master Design Spec

**Date:** 2026-05-09
**Status:** Draft (awaiting user review)
**Scope:** Whole-browser parity with Chrome across compatibility, performance, and UX

---

## 1. Goal

Make OS Browser feel indistinguishable from Chrome in everyday use. Civil servants should never think "I should switch to Chrome to do this" — every site should work, every interaction should be fast, every UX detail should match what users already expect.

This is not a single feature. It is a coordinated, sequenced effort across five sub-projects, executed in a fixed order so each phase builds on the previous phase's evidence base.

---

## 2. Scope

### In scope

Five sub-projects, executed in this order:

1. **Site compatibility** — every common site works (OAuth, video DRM, banking, gov.gh, productivity)
2. **Render & switch feel** — no flicker on tab swap, 60fps scroll, smooth resize
3. **Page load speed** — first-paint within 10% of Chrome on the same machine
4. **Memory & many-tab** — 30+ open tabs without slowdown, background discard
5. **UX polish** — Chrome-parity downloads, find-in-page, autofill, context menu, keyboard shortcuts

### Out of scope

- **Chrome extension support** (separate, much larger project)
- **Cross-device sync** of tabs, history, bookmarks (separate project — different security model for civil servants)
- **Reader mode, reading list, cast/AirPlay** (Phase 5 explicitly excludes these)
- **Custom prerendering / speculative navigation** (Phase 3 excludes — too risky for the user base)
- **Tab strip UI** — already covered in `2026-04-07-chrome-tab-parity-design.md` (April work stream is the visual layer; this spec is the rest)

### Deliberately not addressed

- Marketing, branding, distribution: this spec is engineering only.
- Mobile parity: the OS Mini mobile app has its own roadmap.

---

## 3. Phased Roadmap

```
Phase 0 ── AUDIT & BASELINE              ~2 days
Phase 1 ── SITE COMPATIBILITY            ~3-5 days
Phase 2 ── RENDER & SWITCH FEEL          ~3-4 days
Phase 3 ── PAGE LOAD SPEED               ~2-3 days
Phase 4 ── MEMORY & MANY-TAB             ~3-4 days
Phase 5 ── UX POLISH                     ~5 days (continuous)

Total focused dev: 17–25 days
```

**Sequencing rationale:**

1. **Audit first.** A 2-day baseline turns 23 days of guesswork into 23 days of targeted work.
2. **Compat before polish.** A polished browser that breaks Gmail OAuth is unusable.
3. **Switch-feel before page-load.** They share root causes (compositor, GPU, geometry); fixing #2 often improves #3 for free.
4. **Memory last among the perf phases.** Background-tab discard has tradeoffs (form-data loss); bank the easy wins first.
5. **Polish runs alongside.** Most polish items are 1–4 hour tasks done between bigger work.

---

## 4. Phase Details

### Phase 0 — Audit & Baseline

**In scope:** Run a 15-site test matrix side-by-side: Chrome stable vs OS Browser, same machine, same network. Capture for each site:

- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Scroll FPS on long content
- Memory at 1, 5, 10 open tabs
- List of errors / breakage / visual differences
- Subjective tab-switch and scroll notes

**Test matrix** (15 sites, mix of Ghana relevance + general parity coverage):

1. Gmail (OAuth + service worker)
2. Google Meet (WebRTC + camera)
3. YouTube (video + ads)
4. Netflix (Widevine DRM)
5. Google Drive (large SPA)
6. GitHub (developer site)
7. Microsoft 365 / OneDrive (Office for Web)
8. Zoom web client (WebRTC)
9. Slack web (heavy SPA)
10. Twitter / X (timeline + media)
11. ghana.gov.gh + selected ministry sites
12. A Ghanaian banking site (e.g. ecobank.com)
13. NYTimes (heavy front page — perf benchmark)
14. WhatsApp Web (QR + Service Worker)
15. A passkey/WebAuthn flow (e.g. github.com/login or webauthn.io demo)

**Deliverable:** A new file `docs/superpowers/specs/<date>-audit-results.md` (date stamped on the day the audit completes) containing:
- A numbered punch list (every gap quantified)
- Top 10 user-visible Chrome-parity gaps in priority order
- Phase 1–5 input lists derived from the audit

**Out of scope:** Fixing anything in this phase. Measurement only.

---

### Phase 1 — Site Compatibility

**In scope:** Walk the audit punch list, fix every blocker. Likely suspects to investigate:

- **User-Agent string:** ensure it matches a real Chrome version (no "Electron" token)
- **Widevine DRM:** verify Castlabs Electron-for-content-security or alternative for Netflix / Spotify
- **WebAuthn / passkeys:** verify Electron's WebAuthn support is on
- **Service Worker quirks:** registration, cache, background sync
- **Permission prompts:** camera, microphone, notifications, geolocation
- **Referrer policy** and third-party cookie behavior on OAuth flows
- **Custom protocol handlers** (mailto, tel, etc.)

**Done:** 15/15 sites in the test matrix work indistinguishably from Chrome. The matrix becomes a release-gate smoke test.

**Out of scope:**
- Sites not in the matrix (revisit after first ship)
- Chrome extension API surface
- Enterprise policy / managed-browser features

---

### Phase 2 — Render & Switch Feel

**In scope:**

- **Tab swap flicker:** audit `showTabView` in `packages/main/src/tabs/TabWebContents.ts`. Ensure new view is composited *before* old one is hidden. Eliminate any white-flash on first paint of a freshly-shown tab.
- **GPU flag audit:** confirm `--enable-gpu-rasterization`, `--enable-zero-copy`, hardware accel always on. Document chosen flags in code with rationale.
- **Resize race conditions:** debounce sidebar collapse/expand → `WebContentsView` geometry updates. Currently `setChromeLeftOffset` calls `resizeAllViews` synchronously — investigate whether this causes visible jank during animation.
- **Scroll perf:** verify passive listeners, no main-thread blockers from injected scriptlets during scroll.
- **Compositor scheduling:** verify smooth animation curves on tab open/close (already partially addressed in April spec).

**Done:**
- Video recording shows tab swap indistinguishable from Chrome (<16ms perceived latency)
- 60fps scroll on a 4K image-heavy page (NYTimes front page is the canonical test)
- No visible jank when collapsing/expanding the Kente sidebar

**Out of scope:** New scrollbar styles, animation polish (those are Phase 5).

---

### Phase 3 — Page Load Speed

**In scope:**

- **Process model:** verify site-per-process isolation is on (Electron default but confirm)
- **Network hints:** `<link rel="preconnect">` for common gov.gh + utility hosts; DNS prefetch
- **HTTP/3:** confirm enabled
- **Cache strategy:** audit cache header behavior — match Chrome's
- **Service Worker preload:** verify enabled
- **Per-page extension cost:** the April-era audit found heavy MutationObservers; confirm they no longer fire before DOMContentLoaded

**Done:** Median LCP across the 15-site matrix within 10% of Chrome. Cold start of a heavy site (NYTimes) within 15% of Chrome.

**Out of scope:** Custom prerendering, speculative navigation.

---

### Phase 4 — Memory & Many-Tab

**In scope:**

- **Background tab discard policy:** tabs untouched for >30 min, when total RSS exceeds a configurable threshold
- **Discard UI:** faded favicon + "click to reload" indicator on discarded tabs
- **Memory pressure handler:** OS-level memory pressure event triggers proactive freeze
- **Form-data protection:** before discarding, check for modified input fields; warn or skip discard
- **Optional dev panel:** per-tab memory readout

**Done:**
- 30 tabs open, RSS curve flattens after the first 10 active tabs
- Reactivating a discarded tab takes <1s on warm cache
- No data loss on form-bearing pages

**Out of scope:** Cross-device tab sync, session restore changes (already work).

**Risk:** Background discard has a real downside — accidental data loss on revisit. See Section 6.

---

### Phase 5 — UX Polish (continuous checklist)

**In scope:** A 30-item Chrome-parity checklist, picked off incrementally:

**Downloads (5 items)**
- Progress bar with ETA
- Open containing folder
- Retry / pause / resume
- "Show in folder" right-click action
- Persistent downloads shelf or panel

**Find-in-page (4 items)**
- Match count (e.g. "3 of 12")
- Next / previous navigation
- Highlight all matches
- Case-sensitive toggle

**Autofill (3 items)**
- Address autofill (off by default for govt use)
- Payment autofill (off by default)
- Password manager parity (already strong — verify)

**Context menu (5 items)**
- Search image with default engine
- Translate page
- View image source
- Save link as
- Copy link text

**Keyboard shortcuts (8 items)**
- Ctrl+L (focus omnibar), Ctrl+T (new tab), Ctrl+W (close tab)
- Ctrl+Shift+T (reopen closed tab), Ctrl+1..9 (jump to tab N)
- Ctrl+Tab / Ctrl+Shift+Tab (cycle tabs), Ctrl+F (find)
- Ctrl+R / Ctrl+Shift+R (reload / hard reload)
- Alt+← / Alt+→ (back / forward)
- F11 (fullscreen), F12 (devtools), Esc (stop loading)
- Ctrl+0 (reset zoom), Ctrl+P (print)

**Tabs (3 items)**
- Middle-click to close
- Drag to reorder
- Drag-out to new window (already in April spec — verify shipped)

**Address bar (2 items)**
- Autocomplete from history + bookmarks
- Search suggestions, paste-and-go

**Done:** All 30 items behave identically to Chrome. Manual test pass signed off in release notes.

**Out of scope:** Reader mode, reading list, cast/AirPlay, send-to-my-devices.

---

## 5. Cross-Cutting Concerns

### 5.1 Measurement / telemetry

- **Per-phase baseline + after report.** Phase 0 captures numbers; every later phase reports the delta on the same metrics. No "trust me, it's faster."
- **Local instrumentation.** Add `performance.mark()` calls in `TabWebContents.ts` for `tab:create-start`, `tab:show-start`, `tab:first-paint`, `tab:resize-debounce-end`. Logged to a dev-only console panel; off in production.
- **No outbound telemetry.** Civil servant audience — measurement happens on dev machines, not on user installs.

### 5.2 Regression strategy

- **Site test matrix becomes a release smoke test.** The 15 sites get manually re-validated before every release; sign-off recorded in the GitHub release notes.
- **Perf budget per release.** Once Phase 3 closes the LCP gap, no future release may regress any site by more than 15% without a written justification.
- **No "fix forward" on Phase 2 regressions.** Render/switch jank is user-visible immediately. If a release ships janky tab swaps, hotfix the same day.

### 5.3 Rollback / feature flag strategy

- **Phase 4 (memory) gets a flag.** Background tab discard has a real downside (form data loss on revisit). Wire behind `settings.experimental.tabDiscard`, off by default for the first release. Enable after a week of dogfooding.
- **Phases 1, 2, 3, 5 ship without flags.** Compat fixes, perf, and UX polish have no downside; flagging delays value. Standard "if it breaks, revert the commit" rollback.
- **Per-phase tag.** Tag each phase completion (`v1.1-compat`, `v1.2-render`, `v1.3-load`, `v1.4-memory`, `v1.5-polish`) for clean bisect and revert.

### 5.4 Definition of "shippable"

A phase is done when:
1. Its measurable milestone is met (numbers in this spec)
2. Site test matrix still 15/15 green (no regression in earlier phases)
3. Diff has been reviewed via `superpowers:requesting-code-review`
4. A short release-note line is written and the phase is tagged

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Widevine DRM licensing for Netflix is non-trivial | Medium | High (Phase 1) | Investigate Castlabs Electron-for-content-security build; if blocked, document Netflix as known-out-of-scope |
| Phase 4 discard causes data loss complaints | Medium | High | Feature flag + form-modification check before discard + UI warning |
| Phase 2 GPU flag changes destabilize on certain Windows GPUs | Low | Medium | Test on min-spec hardware (Intel UHD Graphics) before tagging release |
| Audit reveals 30+ blockers, not 5–10 | Medium | Medium | If audit finds >15 Phase-1 blockers, replan with user — likely defer some to a Phase 1.5 |
| Dev time exceeds estimate by >50% | Medium | Low | Each phase is independently shippable; can stop after any phase if value is already there |

---

## 7. Dependencies / Related Work

- **`docs/superpowers/specs/2026-04-07-chrome-tab-parity-design.md`** — tab strip visual layer (trapezoid shape, overlap, animations). Complementary to this spec, not duplicated.
- **`docs/superpowers/specs/2026-04-07-mini-player-design.md`** — Arc-style mini player. Already shipped; verify it survives Phase 2 changes.
- **`docs/superpowers/plans/2026-05-06-baobab-desktop-p0a.md`** — Baobab is a separate consumer browser product. Lessons from this Chrome-parity work may apply, but the projects ship independently.

---

## 8. Open Questions for User Review

1. **Test matrix:** is the 15-site list above correct, or should we add/remove specific Ghana gov sites?
2. **30-tab target:** is that the right ceiling for Phase 4, or do users routinely run 50+?
3. **Phase 4 flag default:** ship the discard flag off, then flip on after a week — or ship off and let users opt in via settings?
4. **Audit timing:** start Phase 0 immediately, or batch with another piece of work?

---

## 9. Next Step

After user approval of this design, the next step is to invoke `superpowers:writing-plans` to produce a detailed implementation plan for **Phase 0** only. Phases 1–5 each get their own implementation plan after their preceding phase completes — we don't plan Phase 1 in detail until Phase 0's audit tells us what to plan for.
