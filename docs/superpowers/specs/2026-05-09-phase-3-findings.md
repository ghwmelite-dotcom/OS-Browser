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

## 2. Slack +140% LCP — root cause analysis

(Filled in Task 4.)

---

## 3. YouTube +132% LCP — root cause analysis

(Filled in Task 4.)

---

## 4. Minor regressions (X, Meet) — disposition

(Filled in Task 7.)

---

## 5. Fix list

(Filled in Task 5.)

---

## 6. Validation results

(Filled in Task 6.)
