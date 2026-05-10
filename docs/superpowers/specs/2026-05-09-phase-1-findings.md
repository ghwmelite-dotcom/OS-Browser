# Phase 1 Compatibility Findings

**Date:** 2026-05-09 (updated 2026-05-10)
**Status:** Auto-tasks complete; manual hands-on (Netflix/Meet/Zoom/Slack) deferred. Major Phase 1B fixes already shipped.
**Reference:** `docs/superpowers/specs/2026-05-09-audit-results.md`
**Plan:** `docs/superpowers/plans/2026-05-09-phase-1-compat.md`

---

## 1. End-to-End Test Matrix

| # | Site | Test | Result | Notes |
|---|---|---|---|---|
| 1 | Netflix | Sign in + play 1 episode | | |
| 2 | Google Meet | Sign in + start meeting + camera + mic + screen-share + leave | | |
| 3 | Zoom | Join test meeting + video + audio + leave | | |
| 4 | Slack | Sign in + send message + send file + reply in thread | | |

Status values: PASS, FAIL: <reason>, BLOCKED-NO-ACCOUNT, PARTIAL: <details>

---

## 2. YouTube 403 Investigation

**Headline finding: Not a content/API failure. Single 403 on Google's passive sign-in flow.**

Captured every HTTP response on YouTube load via `scripts/audit-youtube-403.js`. Result:

- **136 total responses captured**
- **1 response with status 403**, on `accounts.google.com/v3/signin/identifier?continue=...&service=youtube&...&flowName=WebLiteSignIn` — Google's passive sign-in attempt
- **0 trackers** with 403 (the ad blocker had already blocked them upstream — `BLOCKED_BY_CLIENT`, not 403)
- **0 YouTube content/API** with 403 (the actual concern)

**Root cause hypothesis:** Phase 0's "5 errors" were the same URL being retried 5 times by Google's auth flow, captured as 5 separate console.error events. The Phase 1 capture used `Network.responseReceived` directly, so each unique URL counts once.

**Possible contributing factor:** OS Browser's user-agent string contains `os-browser/1.0.0 Chrome/130.0.6723.191 Electron/33.4.11`. Google's anti-bot heuristics may flag the `Electron/` token, causing the passive sign-in to fall back to a "lite" flow that 403s. Worth investigating in Phase 1B as a potential one-line UA tweak.

**Status:** Not a real compatibility blocker. YouTube content loads fine, page title shows "YouTube". The single 403 is on a passive auth check that doesn't break the user experience for unsigned-in users.

**Phase 1B follow-up candidate:** strip `os-browser/1.0.0` and `Electron/33.4.11` tokens from user-agent. Risk: minor — may affect telemetry; some sites use UA for feature detection. Worth A/B testing before shipping.

Raw data: `./youtube-403-results.json` (committed).

---

## 3. Ad-Blocker First-Party Audit

**Headline finding: NO over-blocking. The ad blocker is working correctly across all 15 sites.**

Captured every blocked URL across 15 sites via `scripts/audit-adblocker.js` + CDP `Network.loadingFailed`. Total: 54 blocked URLs.

| Site | Total | First-party | Trackers | CDN | Other | Reviewed |
|---|---|---|---|---|---|---|
| gmail | 1 | 0 | 0 | 0 | 1 | clean |
| meet | 2 | 0 | 2 | 0 | 0 | clean |
| youtube | 0 | 0 | 0 | 0 | 0 | clean |
| netflix | 7 | 7 | 0 | 0 | 0 | telemetry only ✅ |
| drive | 8 | 0 | 2 | 0 | 6 | clean (other = OneTrust consent + cross-tab artifact) |
| github | 4 | 4 | 0 | 0 | 0 | telemetry only ✅ |
| office | 7 | 0 | 0 | 0 | 7 | telemetry only (Microsoft Clarity + OneCollector) |
| zoom | 5 | 1 | 1 | 0 | 3 | telemetry only ✅ |
| slack | 3 | 1 | 1 | 0 | 1 | telemetry only ✅ |
| x | 2 | 0 | 0 | 0 | 2 | clean |
| ghana.gov.gh | 0 | 0 | 0 | 0 | 0 | clean |
| ecobank | 0 | 0 | 0 | 0 | 0 | clean |
| nytimes | 15 | 6 | 5 | 1 | 3 | telemetry only ✅ |
| whatsapp | 0 | 0 | 0 | 0 | 0 | clean |
| webauthn | 0 | 0 | 0 | 0 | 0 | clean |

**On manual inspection of every "first-party" and "other" blocked URL:**
- **All 18 first-party blocks** are the site's own telemetry endpoints (`logs.netflix.com`, `collector.github.com`, `app.slack.com/clog/track/`, `log-gateway.zoom.us/pwa/webclient`, `a.et.nytimes.com/track`, `purr.nytimes.com/v1/purr-cache`, `als-svc.nytimes.com/als`, `api.github.com/_private/browser/stats`).
- **All "other" bucket URLs** are third-party telemetry (Microsoft Clarity, OneCollector, OneTrust consent management). Zero content, auth, or functional resources.
- **No over-blocking action needed.** Ad blocker behaviour is correct as designed.

**Side finding:** YouTube had **zero** blocked requests in this audit run. This is significant because Phase 0 saw 5+ HTTP 403 errors on YouTube. **This rules out the ad blocker as the cause of YouTube's 403s** — the 403s come directly from YouTube's upstream servers. (Most likely culprit: User-Agent string or anti-bot signal — see Task 6.)

**Status:** Section closed. No fix required for ad-blocker behaviour. Raw data: `./adblock-blocked-urls.json` (committed).

---

## 4. Deferred Phase 0 Data — Scroll/Switch Feel

(Filled in Task 9. References audit-results.md §2.)

---

## 5. Deferred Phase 0 Data — UX Polish 30-Item Checklist

Walked in OS Browser side-by-side with Chrome.

### Downloads (5 items)
- [ ] Progress bar with ETA
- [ ] "Open containing folder" right-click works
- [ ] "Show in folder" right-click works
- [ ] Pause/resume during download
- [ ] Persistent downloads shelf or panel

### Find-in-page (4 items)
- [ ] Match count shown ("3 of 12")
- [ ] Next/previous navigation buttons
- [ ] All matches highlighted
- [ ] Case-sensitive toggle

### Autofill (3 items)
- [ ] Address autofill behavior matches expected (govt-use default)
- [ ] Payment autofill behavior matches expected (govt-use default)
- [ ] Password manager parity with Chrome

### Context menu (5 items)
- [ ] "Search image with default engine"
- [ ] "Translate page"
- [ ] "View image source"
- [ ] "Save link as"
- [ ] "Copy link text"

### Keyboard shortcuts (8 items)
- [ ] Ctrl+L (omnibar), Ctrl+T (new tab), Ctrl+W (close)
- [ ] Ctrl+Shift+T (reopen closed)
- [ ] Ctrl+1..9 (jump to tab N)
- [ ] Ctrl+Tab / Ctrl+Shift+Tab (cycle)
- [ ] Ctrl+R / Ctrl+Shift+R (reload / hard reload)
- [ ] Alt+← / Alt+→ (back/forward)
- [ ] F11, F12, Esc
- [ ] Ctrl+0, Ctrl+P

### Tabs (3 items)
- [ ] Middle-click to close
- [ ] Drag to reorder
- [ ] Drag-out to new window

### Address bar (2 items)
- [ ] Autocomplete from history + bookmarks
- [ ] Paste-and-go

For each ❌ item, add a one-line description of how OS Browser differs from Chrome.

---

## 6. Phase 1 Fix List

Compiled across the 2026-05-09 → 2026-05-10 sessions.

### Landed (production binary as of `5ef1c35`)

- **[Critical] User-agent string** — commit `3152cbf`. Set `app.userAgentFallback` to a plain Chrome 130 UA, dropping the `os-browser/1.0.0` and `Electron/33.4.11` tokens that tripped browser-sniffing regexes. **Fixed WhatsApp Web rejection ("WhatsApp works with Google Chrome 85+")** confirmed by user. Almost certainly also fixed YouTube's passive sign-in 403, anti-abuse fallbacks on Google services, and similar UA-based detection elsewhere.

- **[Critical] YouTube authenticated UI buttons** — commit `8fbf7dd`. The `YOUTUBE_AD_BLOCK_SCRIPT` was deleting `json.attestation` from API responses. Attestation is YouTube's anti-bot/integrity token used by **authenticated UI actions** (Create button, Notifications bell, Account avatar menu). Stripping it left those buttons rendered but click-dead. Removed both `delete *.attestation` calls; ad-data deletions remain. Confirmed working by user.

- **[Important] Tab lifecycle relaxed** — commit `3665abc`. Pages were freezing after 5 min and discarding after 15 min — too aggressive given OS Browser already uses 55% less RAM than Chrome (Phase 0 finding). New defaults: freeze 30 min, discard 4 hours, min 8 tabs to trigger. Addresses user-reported "page auto-refreshes after a couple of minutes".

- **[Important] Phase 5 keyboard shortcuts (12+ items)** — commits `248f2ad`, `4fce8fa`, `3665abc`. Wired Ctrl+Shift+R, Ctrl+0, Ctrl+P (global, not just right-click), Esc-to-stop-loading, Ctrl+F5, Ctrl+L, Ctrl+T, Ctrl+W, Ctrl+Shift+T, Ctrl+Tab/Shift+Tab, Ctrl+1..9, Ctrl+H, Ctrl+B, Ctrl+D, Ctrl+J, Ctrl+N, Ctrl+Shift+N, Ctrl+Shift+W, F3/Shift+F3, Ctrl+= / Ctrl+-. Bound in main process `before-input-event` so they work whether page or chrome has focus.

- **[Important] Find-in-page** — commits `fe4d93d`, `3eed8e5`, `389cdf7`. New FindBar UI + IPC bridge + per-tab match-count event. Ctrl+F opens, Enter/Shift+Enter cycle, Aa toggles case sensitivity, Esc closes. Visually distinct (Ghana-green border + drop shadow).

- **[Important] Phase 5 download buttons** — commit `23786f0`. "Show in folder" + "Open file" buttons on completed downloads.

- **[Important] Phase 5 context menu items** — commit `df73370`. Image right-click: Search Image with Google (via Lens), Open Image in New Tab. Page right-click: Translate Page (via Google Translate auto-detect).

- **[Minor] Tab tooltip** — commit `5ef1c35`. Removed competing custom React tooltip; relying on the native OS tooltip (rendered outside Chromium compositor so it can't be hidden by the WebContentsView). Now shows title + URL on two lines.

- **[Minor] Hygiene] Phase 3 ad-block deferral** — commit `79eb1f6`. Ghostery cosmetic scriptlets and WebRTC leak prevention deferred to `requestIdleCallback`. Doesn't measurably help Slack but doesn't hurt anything; sound architectural improvement.

### Deferred (require user hands-on)

- **DRM playback test (Netflix)** — needs active subscription to verify Widevine playback works.
- **WebRTC end-to-end test (Meet)** — needs Google account + actual call (camera/mic/screen-share).
- **WebRTC end-to-end test (Zoom)** — needs Personal Meeting Room or second device.
- **Slack workspace sanity test** — needs workspace login + send message + send file + thread reply.
- **Phase 0 §2 scroll/switch observation** (6 sites) — needs side-by-side video comparison with Chrome.
- **Phase 5 §1 30-item UX checklist walk** — needs hands-on visual comparison with Chrome.

Total user time required: ~60-90 minutes split however they like.

---

## 7. Recommendation for Phase 1B Fix Plan

**No Phase 1B fix plan is needed** — what would have gone into a Phase 1B plan has already been implemented and is shipping in the production binary. The remaining work is entirely user-driven verification, not engineering.

### When the user does the manual session, expected outcomes by site:

| Site | Expected | If different |
|---|---|---|
| Netflix DRM | LIKELY PASSES — UA fix removes Electron/os-browser tokens. If still fails with "Error M7355" or shows 480p only, Widevine L1 isn't enabled. Fix: ship Castlabs Electron-for-content-security build. |
| Google Meet | LIKELY PASSES — Meet's WebRTC is well-supported on Electron. Watch for camera/mic permission prompt UX. |
| Zoom | LIKELY PASSES — same as Meet. Possible quirk: Zoom may try to redirect to native client; user may need to click "Continue in browser". |
| Slack | LIKELY PASSES — basic chat/file/thread work fine. Performance is +14.7% slower (Phase 3 finding) but functionally correct. |

If anything DOES fail in the manual session, that becomes a Phase 1C plan (specific bug fixes per site).

### When the user walks the UX checklist:

The static audit (Phase 5 §1) found 22 of 30 items implemented; 8 had specific gaps that have been landed. **The walkthrough is more of a final QA pass than a discovery exercise.** Anything found ❌ at this point should be a small targeted fix, not a redesign.

---

## 8. Status Summary as of 2026-05-10

- **Auto-driven Phase 1 work:** ✅ Complete
- **Major fix candidates from Phase 1 audit:** ✅ Shipped
- **Manual verification:** ⏳ Awaiting user (~60-90 min hands-on)
- **Phase 1B plan needed:** ❌ No — all known-actionable work is done
- **Tag candidate:** `phase-1-compat-complete` once user verification lands
