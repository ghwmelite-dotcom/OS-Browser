# Phase 1 Compatibility Findings

**Date:** 2026-05-09
**Status:** In progress
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

(Compiled in Task 11.)

---

## 7. Recommendation for Phase 1B Fix Plan

(Filled in Task 11.)
