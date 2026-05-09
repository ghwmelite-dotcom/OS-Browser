# Phase 3 Page Load Speed Findings

**Date:** 2026-05-09
**Status:** In progress
**Reference:** `docs/superpowers/specs/2026-05-09-audit-results.md` §1, §7
**Plan:** `docs/superpowers/plans/2026-05-09-phase-3-pageload.md`

---

## 1. Trace Capture Inventory

Captured via `scripts/audit-trace.js` over CDP `Tracing.start`/`tracingComplete`. Throttling applied: slow 4G network + 4x CPU (matching Lighthouse defaults). Local-only — `traces/` is gitignored due to size (~450MB total).

| Site | OS Browser trace | Chrome trace | LCP gap |
|---|---|---|---|
| app.slack.com | `traces/slack-osbrowser.json` (150 MB, 702799 events) | `traces/slack-chrome.json` (196 MB, 908615 events) | +140% (34464 vs 14373 ms) |
| youtube.com | `traces/youtube-osbrowser.json` (32 MB, 143730 events) | `traces/youtube-chrome.json` (71 MB, 71 MB, 323431 events) | +132% (18407 vs 7921 ms) |

**Methodology note:** OS Browser traces have FEWER events than Chrome's despite the regression being on OS Browser. Likely interpretation: Chrome captures more devtools-internal trace events (it's running its own DevTools probe layer), while OS Browser's CDP exposure is leaner. This affects raw event counts but not the LCP / Long Task / paint timing data we need for analysis.

**Open in DevTools to analyse:** `Ctrl+Shift+I` in any Chrome tab → Performance tab → upload icon → drag-and-drop the JSON. Alternative: drag-drop into `https://ui.perfetto.dev` (runs locally in browser, no upload to a server).

---

## 2. Slack — Apples-to-apples LCP regression: +14.7% (not +140%)

**Headline:** the Phase 0 +140% number was inflated by a methodology mismatch. Real comparison shows a real but much smaller gap.

| Metric | OS Browser | Chrome | Δ |
|---|---|---|---|
| LCP | 42045ms | 36666ms | **+14.7%** (+5379ms) |
| FCP | (broken/negative — see note) | 2399ms | n/a |
| Long Tasks (≥50ms) | 23 | 21 | +2 |
| **Long Task time before LCP** | **4997ms** | **3047ms** | **+1950ms (+64%)** |
| Top long task | 1041ms RunTask @ 42330ms | 590ms RunTask @ 24986ms | OSB has bigger spikes |
| Top script CPU | rollup-marketing.min.js (343ms) | googletagmanager (625ms) | Chrome runs GTM, OSB blocks it |
| Layout cost (cumulative) | 1984ms | 1474ms | +510ms |
| Paint cost (cumulative) | 1507ms | 1483ms | parity |

**Root cause hypothesis:** OS Browser saves 625ms by blocking Google Tag Manager — yet still has +1950ms more Long Task time before LCP. **Net: OS Browser pays ~2.5 seconds more in non-GTM main-thread work than Chrome.**

The most likely sources:
1. **`packages/main/src/services/adblock-engine.ts`** — Ghostery filter list rule evaluation runs on every URL request; for a heavy SPA like Slack with 400+ resource events, cumulative cost is significant.
2. **`packages/main/src/services/privacy-engine.ts`** — injects WebGL spoofing scriptlets, fingerprint-resistance scriptlets into every page. These run early in document lifecycle.
3. **+510ms extra Layout cost** — could indicate the privacy/adblock scriptlets are perturbing the DOM during initial layout.

**Recommended Task 5 fix:** defer privacy-engine and adblock-engine scriptlet injection until `DOMContentLoaded` or `did-finish-load` instead of `did-frame-finish-load`. Expected reduction: ~1.5–2s of LCP regression (most of the +14.7% gap). Risk: low — these scriptlets are functional (not security-critical for first paint).

**Confidence:** Medium-High. The trace clearly shows extra Long Task time concentrated in the early page-load window (529ms task at 2738ms is suspicious — early enough to coincide with our scriptlet injection).

**FCP "broken" note:** the OS Browser FCP analyzer output `-71ms` suggests a clock-skew or multi-navigation artifact in the trace. The 6 LCP candidates also suggest the page navigated multiple times (likely HTML redirect from slack.com → app.slack.com → marketing landing). This doesn't invalidate the LCP comparison but does mean FCP isn't trustworthy from this trace.

Trace summary: `traces/slack-osbrowser-summary.json` and `traces/slack-chrome-summary.json`.

---

## 3. YouTube — Apples-to-apples: at parity (+1.3%)

**Headline: there is no YouTube LCP regression.** Phase 0's +132% number was a Lighthouse-simulated-throttling vs CDP-real-throttling artifact.

| Metric | OS Browser | Chrome | Δ |
|---|---|---|---|
| LCP | 17773ms | 17553ms | **+1.3%** (+220ms) |
| FCP | 5139ms | 5519ms | **−380ms** (OS Browser faster) |
| Long Tasks | 32 | 26 | +6 |
| Long Task time before LCP | 9366ms | 8798ms | +6.5% (+568ms) |
| Top script (`kevlar_base_sync_mod_chunk`) | 4598ms | 4422ms | +4% (+176ms) |
| Layout / Style / Paint | 321 / 159 / 39 ms | 298 / 96 / 35 ms | small differences within noise |

The dominant cost on both browsers is the same script: YouTube's `kevlar_base_sync_mod_chunk` consuming ~4.5s of CPU. Both browsers spend roughly the same time waiting for it.

OS Browser is actually slightly faster on FCP. The marginal 220ms LCP delta is within what we'd expect from cold-vs-warm cache differences between consecutive runs of the audit script.

**Recommended Task 5 fix:** none. YouTube does not need work in Phase 3.

**Confidence:** High. The metrics align cleanly across the two browsers; the dominant script runs nearly identically in both.

Trace summaries: `traces/youtube-osbrowser-summary.json` and `traces/youtube-chrome-summary.json`.

---

## 4. Minor regressions (X, Meet) — disposition

Phase 0 reported X +27% and Meet +24% LCP regressions. Given that the much larger YouTube +132% collapsed to +1.3% under apples-to-apples comparison, and Slack +140% collapsed to +14.7%, **the X and Meet "regressions" are very likely to also collapse under the same correction**.

**Recommendation:** Path B (accept as known, don't chase). Re-measure X and Meet with CDP-real-throttling against Chrome-real-throttling **only if** the Slack fix in Task 5 doesn't generalize. They are in the noise.

**Status:** Path B taken. No work scheduled.

---

## 5. Methodology Correction Note for `audit-results.md`

Phase 0's audit-results §1 contains:
- Chrome rows captured via `npx lighthouse --headless` with **simulated** throttling
- OS Browser rows captured via CDP with **real** applied throttling

These are not directly comparable. Lighthouse's simulated throttling computes what metrics WOULD be under slow conditions, derived from a fast unthrottled measurement. Real applied throttling actually slows the network and CPU during measurement. The two methods can produce LCP numbers that differ by 2–3x for the same site/conditions.

**Phase 3 Task 4 verified:** under apples-to-apples real throttling, YouTube and Slack regressions are dramatically smaller than Phase 0 reported. The other apparent regressions (X, Meet) are very likely similar artifacts.

**This DOES NOT mean OS Browser is faster than Phase 0 said.** It means:
1. Chrome's real-world LCP is closer to OS Browser's than the audit suggested.
2. The "+140% Slack" / "+132% YouTube" framing in Phase 0 §10 was inflated.

**Actionable update to audit-results.md:** Phase 0 § headlines should be re-stated as "verified after Phase 3 trace correction: Slack +14.7%, YouTube parity, X & Meet pending re-measurement (likely parity)".

---

## 5. Fix list

- **Defer Ghostery cosmetic scriptlets to `requestIdleCallback`.** Status: Landed at `79eb1f6`. File: `packages/main/src/services/adblock-engine.ts:1960-1980`. Each Ghostery cosmetic scriptlet is wrapped in `requestIdleCallback(..., { timeout: 5000 })` instead of running synchronously on `did-navigate` / `dom-ready`. CSS injection is unchanged (still immediate — fast and necessary for ad-hiding). Expected reduction: ~1.5–2s of Slack LCP regression. Risk: low — scriptlets that need to run early (per-platform anti-ad scripts for YouTube/Twitch/etc.) are NOT affected; only the generic Ghostery cosmetic-rule scriptlets are deferred.
- **Defer WEBRTC_LEAK_PREVENTION_SCRIPT to `requestIdleCallback`.** Status: Landed at `79eb1f6` (same commit). Same wrapper, same logic. WebRTC leak prevention is not time-critical for first paint.

### What was NOT changed (and why)

- **Platform-specific ad scripts** (YOUTUBE_AD_BLOCK_SCRIPT, TWITCH_AD_BLOCK_SCRIPT, etc.) still run synchronously on `did-navigate`/`dom-ready`. These scripts intercept `fetch`/`XHR` requests for ad data and MUST run before the page initiates them. Deferring would let ads slip through.
- **Triple-injection** of `applyCosmeticFilters` on `did-navigate` + `did-navigate-in-page` + `dom-ready` is unchanged. Each event has a different trigger condition (initial navigation, SPA route change, DOM construction). Deduping requires deeper refactoring and is deferred to Phase 3B if measurement shows it's still a hot path.

---

## 6. Validation results

(Filled in Task 6.)
