# OS Browser vs Chrome — Phase 0 Audit Results

**Date:** 2026-05-09
**Status:** Partial — synthesis complete; Task 6 (scroll/switch feel) and the Phase 5 UX checklist are deferred to a follow-up session
**Reference:** `docs/superpowers/specs/2026-05-09-chrome-parity-master-design.md`
**Plan:** `docs/superpowers/plans/2026-05-09-phase-0-audit.md`

**Machine:** OZZY-PC | Windows 11 Pro 10.0.26200 | 15.3 GB RAM | AMD Ryzen 5 PRO 5650U with Radeon Graphics
**Chrome version:** 147.0.7727.138
**Lighthouse version:** 13.3.0
**OS Browser commit:** `6b4c587` (with temporary `[TabPerf]` instrumentation; stripped in Task 9)

---

## 1. Per-Site Measurement Table

All times in ms. CLS is unitless. "n/a" = not measurable. "blocked" = site failed to load.

**Methodology note:** Chrome rows captured via `npx lighthouse --headless` with default Lighthouse simulated throttling. OS Browser rows captured via Chrome DevTools Protocol against `out/win-unpacked/OS Browser.exe` with applied throttling (Network: slow 4G, CPU: 4x). LCP captured via injected `PerformanceObserver`. TTI/CLS/TBT not measured for OS Browser rows — they require Lighthouse's full audit pipeline which doesn't work against Electron (`Target.createTarget: Not supported`). The two methodologies are not perfectly comparable, but OS Browser's LCP regressions on Slack/YouTube/Meet are large enough to be directionally meaningful regardless of throttling differences.

| # | Site | Browser | FCP | LCP | TTI | CLS | TBT | Errors |
|---|---|---|---|---|---|---|---|---|
| 1 | gmail.com | Chrome | 3923 | 3923 | 8833 | 0 | 532 | login wall (measured login page) |
| 1 | gmail.com | OS Browser | 2471 | 2971 | n/a | n/a | n/a | 1 ad-blocker block (ERR_BLOCKED_BY_CLIENT) |
| 2 | meet.google.com | Chrome | 7349 | 11759 | 20716 | 0.572 | 1033 | high CLS — layout settles slowly |
| 2 | meet.google.com | OS Browser | 4809 | 14566 | n/a | n/a | n/a | 2 ad-blocker blocks; LCP +24% vs Chrome |
| 3 | youtube.com | Chrome | 6427 | 7921 | 12444 | 0.001 | 520 | |
| 3 | youtube.com | OS Browser | 4424 | 18407 | n/a | n/a | n/a | 5 HTTP 403 errors; LCP +132% vs Chrome — REGRESSION |
| 4 | netflix.com | Chrome | 3594 | 4806 | 17565 | 0.001 | 617 | DRM not exercised in headless; verify in Task 5 |
| 4 | netflix.com | OS Browser | 2122 | 2122 | n/a | n/a | n/a | 4 ad-blocker blocks; OneTrust X-OneTrust-IsBot header refused; DRM not exercised in landing page |
| 5 | drive.google.com | Chrome | 7017 | 7917 | 23623 | 0 | 1091 | login wall |
| 5 | drive.google.com | OS Browser | 3525 | 7481 | n/a | n/a | n/a | 5+ ad-blocker blocks; LCP near-parity with Chrome |
| 6 | github.com | Chrome | 5707 | 5707 | 25983 | 0.047 | 708 | |
| 6 | github.com | OS Browser | 3757 | 4157 | n/a | n/a | n/a | 5+ ad-blocker blocks; LCP -27% vs Chrome (faster) |
| 7 | office.com | Chrome | 4322 | 4972 | 19564 | 0.014 | 297 | login wall |
| 7 | office.com | OS Browser | 2388 | 2904 | n/a | n/a | n/a | 5+ ad-blocker blocks; LCP -42% vs Chrome (faster) |
| 8 | zoom.us/wc | Chrome | 10875 | 12054 | 12065 | 0 | 775 | |
| 8 | zoom.us/wc | OS Browser | 12187 | 12187 | n/a | n/a | n/a | 5+ ad-blocker blocks; LCP near-parity with Chrome |
| 9 | app.slack.com | Chrome | 4168 | 14373 | 40276 | 0.043 | 12382 | very high TBT — heavy SPA |
| 9 | app.slack.com | OS Browser | 3198 | 34464 | n/a | n/a | n/a | 3 ad-blocker blocks; LCP +140% vs Chrome — REGRESSION on heavy SPA |
| 10 | x.com | Chrome | 1468 | 9078 | 25167 | 0.004 | 15637 | very high TBT |
| 10 | x.com | OS Browser | 2014 | 11547 | n/a | n/a | n/a | ad-blocker blocks + aborted requests; LCP +27% vs Chrome |
| 11 | ghana.gov.gh | Chrome | 4697 | 8505 | 8505 | 0.010 | 157 | |
| 11 | ghana.gov.gh | OS Browser | 2154 | 4554 | n/a | n/a | n/a | clean (no errors); LCP -46% vs Chrome (faster) |
| 12 | ecobank.com | Chrome | 9768 | 50575 | 50626 | 0.667 | 205 | LCP 50s — heavy hero content; high CLS |
| 12 | ecobank.com | OS Browser | 7760 | 46809 | n/a | n/a | n/a | 1 script 404; LCP near-parity (50s ceiling is the site itself) |
| 13 | nytimes.com | Chrome | 5558 | 5700 | 34231 | 0.009 | 3850 | |
| 13 | nytimes.com | OS Browser | 2820 | 3037 | n/a | n/a | n/a | 5+ ad-blocker blocks; LCP -47% vs Chrome (faster) |
| 14 | web.whatsapp.com | Chrome | 11300 | 11300 | 13461 | 0.178 | 40 | QR scan page |
| 14 | web.whatsapp.com | OS Browser | 10942 | 11309 | n/a | n/a | n/a | clean (no errors); QR scan page loads fine; near-parity |
| 15 | webauthn.io | Chrome | 2755 | 3558 | 3558 | 0.002 | 3 | |
| 15 | webauthn.io | OS Browser | 3765 | 4148 | n/a | n/a | n/a | clean (no errors); near-parity with Chrome |

---

## 2. Tab Switch & Scroll Feel (Subjective)

Sites picked for hands-on observation: 1, 3, 5, 7, 11, 13.

| # | Site | Tab switch (Chrome) | Tab switch (OS Browser) | Scroll FPS (Chrome) | Scroll FPS (OS Browser) | Notes |
|---|---|---|---|---|---|---|
| 1 | gmail.com | | | | | |
| 3 | youtube.com | | | | | |
| 5 | drive.google.com | | | | | |
| 7 | office.com | | | | | |
| 11 | ghana.gov.gh | | | | | |
| 13 | nytimes.com | | | | | |

Recordings folder: `(to be filled — local path, do not commit videos)`

---

## 3. Memory Curve

**Methodology note:** Original plan was 1/5/10 simultaneously-open tabs, but Electron's `Target.createTarget` is unsupported via CDP (same blocker as Lighthouse hit), so multi-tab automation wasn't feasible. Instead, we measured memory growth during **15-site sequential navigation in 1 tab** with throttling on (slow 4G + 4x CPU). Sites navigated in the same order as §1. RSS sampled every 3s via `Get-Process | Where-Object Path -eq <browser exe> | sum WorkingSet64`.

For both browsers, we report baseline (start), RSS at the ~5-site mark (1/3 through), ~10-site mark (2/3 through), end RSS, peak RSS, and average across the run.

| Browser | Baseline | ~5 sites | ~10 sites | End | Peak | Avg | Samples |
|---|---|---|---|---|---|---|---|
| Chrome | 606 MB | 1070 MB | 1230 MB | 1376 MB | **2922 MB** | 1206 MB | 148 |
| OS Browser | 513 MB | 634 MB | 753 MB | 823 MB | **1311 MB** | 794 MB | 164 |
| **Delta** | **−93 MB** | **−436 MB** | **−477 MB** | **−553 MB** | **−1611 MB** | **−412 MB** | — |
| **OS Browser is** | 15% lower | 41% lower | 39% lower | 40% lower | **55% lower** | 34% lower | — |

**Headline:** OS Browser uses materially less memory than Chrome across all checkpoints, with peak RSS less than half of Chrome's. Likely drivers: OS Browser's ad blocker preventing tracker resource loads, and Electron's process model being less aggressive on out-of-process iframes / utility services than current Chrome.

Raw CSVs: `./osb-rss.csv` (164 samples), `./chrome-rss.csv` (148 samples).

---

## 4. Tab Operation Timing (from `[TabPerf]` console logs)

**Status: deferred.** The instrumentation (commit `6b4c587`) lives in `packages/main/src/tabs/TabWebContents.ts` and fires only in dev builds. The OS Browser binary used for this audit (`out/win-unpacked/OS Browser.exe`) was built before the instrumentation was added, so no `[TabPerf]` logs were captured during the audit run.

**To capture this data:** rebuild the production app from current HEAD (`npm run package`), then re-run a dev session and exercise tab open/close/switch with the main-process console open.

**Phase 0 conclusion without this data:** sufficient. Phase 2 (render & switch feel) will instrument fresh and gather these numbers as part of its baseline.

---

## 5. Phase 1 Inputs — Compatibility Blockers

**Headline:** No hard blockers. All 15 sites in the matrix loaded successfully with valid titles in OS Browser. This is a strong starting position — there are no Netflix-DRM-style "doesn't work at all" gaps. The Phase 1 work is more about polish and edge cases.

**Specific issues to investigate:**

- **[#3] YouTube — 5× HTTP 403 errors** during page load (capped at 5 in our capture; real count likely higher). Worth investigating whether these are tracker requests being blocked, region issues, or YouTube-specific content delivery quirks.
- **[#4] Netflix — DRM not exercised.** The landing page loads fine, but Widevine playback was not tested. This is the highest-risk compat gap and needs a manual end-to-end play test.
- **[#2] Google Meet & [#8] Zoom — WebRTC not exercised.** Both pages load, but a real call (camera/mic/screenshare) was not initiated. WebRTC has known Electron-version-specific quirks; needs manual end-to-end test.
- **All sites except 4 — heavy `ERR_BLOCKED_BY_CLIENT` noise.** This is the OS Browser ad blocker working as designed, but we should verify it's not over-blocking first-party resources. Sites that came through clean with no errors: ghana.gov.gh, web.whatsapp.com, webauthn.io, and (no errors but blank title) whatsapp QR page. Worth comparing ad-blocker behavior vs Chrome's UBlock Origin or similar.

**Recommended Phase 1 scope:**
1. End-to-end manual test on 4 highest-risk sites: Netflix (DRM playback), Meet (real call), Zoom (real call), Slack (workspace login + message send).
2. YouTube 403 investigation — capture network panel, identify which requests fail and why.
3. Ad blocker first-party-allowlist audit — for each site with errors, classify each blocked URL as tracker / first-party / ambiguous.

---

## 6. Phase 2 Inputs — Render & Switch Feel Gaps

**Status: deferred.** Task 6 (manual scroll/switch observation across 6 representative sites with side-by-side video recording) was not completed in this session and is the user's next action when they have ~15 min available.

§4 also has no `[TabPerf]` data because the audit ran against a production binary built before the instrumentation was added.

**Phase 2 cannot be planned in detail until this gap closes.** Concrete Phase 2 entry criteria:
1. Task 6 completed — §2 of this doc populated with scroll FPS + tab switch observations on 6 sites.
2. Fresh production build run with the `[TabPerf]` instrumentation, §4 of this doc populated.
3. At that point, Phase 2 can prioritize specific render/switch issues based on real measurements.

---

## 7. Phase 3 Inputs — Page Load Speed Gaps

**Methodology caveat reminder:** Chrome data uses Lighthouse simulated throttling (calculates metrics from a fast unthrottled run); OS Browser data uses CDP applied throttling (real slow 4G + 4x CPU). Numbers are directional, not exact.

**Significant LCP regressions (OS Browser slower than Chrome):**

| Rank | Site | OS Browser LCP | Chrome LCP | Δ | Notes |
|---|---|---|---|---|---|
| 1 | app.slack.com | 34464 ms | 14373 ms | **+140%** | Heavy SPA — main thread bottleneck likely |
| 2 | youtube.com | 18407 ms | 7921 ms | **+132%** | + 5 HTTP 403 errors during load |
| 3 | x.com | 11547 ms | 9078 ms | **+27%** | Heavy timeline + media |
| 4 | meet.google.com | 14566 ms | 11759 ms | **+24%** | Initial chrome render |

**Sites where OS Browser matches or beats Chrome (positive observations):**

| Site | OS Browser LCP | Chrome LCP | Δ | Notes |
|---|---|---|---|---|
| nytimes.com | 3037 | 5700 | −47% | Big win — likely ad blocker pre-empt |
| ghana.gov.gh | 4554 | 8505 | −46% | Big win — local gov content |
| office.com | 2904 | 4972 | −42% | Login page |
| github.com | 4157 | 5707 | −27% | Dev site |
| gmail.com | 2971 | 3923 | −24% | Login page |

**Recommended Phase 3 scope:**
1. Profile the Slack and YouTube LCP regressions specifically — they are the only large gaps. Capture full Performance traces in DevTools to identify the bottleneck.
2. Decide whether the Meet & X gaps (24–27%) are worth chasing or are within tolerance.
3. Validate the "wins" — sites where OS Browser appears faster — to make sure the ad blocker isn't artificially shrinking LCP by blocking the actual largest content. Spot-check a couple of sites visually.

---

## 8. Phase 4 Inputs — Memory Behavior

**Headline finding:** OS Browser is **significantly lighter** on memory than Chrome across every measurement point — peak RSS is **55% lower** (1311 MB vs 2922 MB). Average RSS during the run is **34% lower** (794 MB vs 1206 MB).

**Implications for Phase 4 plan:**

1. **Background tab discard is less urgent than originally thought.** If OS Browser already runs at half Chrome's memory, the Phase 4 effort of building tab-discard logic + UI + form-data protection has a smaller payoff. Reconsider whether to ship Phase 4 at all, or scope it down to a simpler "freeze inactive renderers" approach without UI changes.
2. **Methodology limit:** the 1-tab sequential measurement is not the same as 30-tab simultaneous measurement. Before fully de-scoping Phase 4, run a real multi-tab test (would need OS Browser-side IPC support to open tabs programmatically, since CDP `Target.createTarget` is blocked).
3. **Worth keeping:** OS-level memory pressure handler — even with lighter baseline, a low-memory laptop can still get into pressure on heavy SPAs. Cheap to add, useful when it triggers.

**Recommended Phase 4 scope (revised):**
- DESCOPE: full discard UI, "click to reload" indicator, form-modification protection
- KEEP: memory pressure event handler (proactive freeze on OS pressure signal)
- DEFER: real multi-tab measurement until OS Browser exposes a tab-creation IPC for testing

---

## 9. Phase 5 Inputs — UX Polish Gaps

**Status: deferred.** The 30-item Chrome-parity behavior checklist (downloads, find-in-page, autofill, context menu, keyboard shortcuts, tabs, address bar, misc) requires hands-on testing in both browsers and was not completed in this session.

**Phase 5 entry criteria:**
1. User walks the 30-item checklist (Phase 5 §4 of master design spec) in OS Browser, side-by-side with Chrome.
2. Each item marked ✅ matches / ❌ different — record specific delta.
3. Phase 5 implementation prioritizes the ❌ items by user-visibility.

This task is complementary to Task 6 (scroll/switch) and is best done in the same session, so user can have OS Browser + Chrome open side-by-side and walk through both checklists together.

---

## 10. Top 10 User-Visible Gaps (Priority Order)

The actionable punch list. Each item is one of: a known data point, a known unknown that needs investigating, or a recommended scope adjustment.

1. **Slack LCP regression (+140%)** — heavy SPA significantly slower in OS Browser; profile and fix in Phase 3.
2. **YouTube LCP regression (+132%) + 5 HTTP 403 errors** — investigate ad-blocker over-block vs upstream issue; Phase 1.
3. **Render & switch feel — UNKNOWN** — Task 6 deferred; Phase 2 cannot be planned in detail until measured.
4. **DRM playback compatibility — UNKNOWN** — Netflix landing loads, but actual playback not tested; Phase 1.
5. **WebRTC compatibility — UNKNOWN** — Meet/Zoom landing loads, but actual call not tested; Phase 1.
6. **UX polish gaps — UNKNOWN** — 30-item Chrome-parity checklist deferred; Phase 5 cannot be planned until walked.
7. **Tab operation timing — UNKNOWN** — `[TabPerf]` instrumentation didn't reach the audited binary; Phase 2 entry criterion.
8. **Meet LCP regression (+24%) and X LCP regression (+27%)** — minor but worth profiling; Phase 3.
9. **Ad-blocker over-blocking risk** — verify the high `ERR_BLOCKED_BY_CLIENT` count isn't catching first-party resources; Phase 1.
10. **Phase 4 (memory) less urgent than expected** — OS Browser already 55% lighter than Chrome; descope discard UI work.

---

## 11. Conclusions & Recommendations

**Where OS Browser is at parity or ahead:**
- All 15 test-matrix sites loaded successfully — basic compatibility is strong, no hard blockers found.
- Page LCP at parity or **better** than Chrome on majority of sites (github, ghana.gov.gh, nytimes, office, drive, ecobank, whatsapp, webauthn) — likely driven by the ad blocker pre-empting tracker requests.
- **Memory footprint significantly lighter than Chrome** across every checkpoint (peak: −55%, average: −34%) — major positive for the civil servant audience on lower-spec hardware.
- Webauthn / passkey demo loads cleanly with no errors.

**Where the biggest gaps are:**
1. **Heavy SPAs (Slack, YouTube)** show large LCP regressions (+132% to +140%) — the most actionable engineering target for Phase 3.
2. **Render/switch feel and UX polish data is missing** — Task 6 and the 30-item polish checklist are deferred to a follow-up session. Phases 2 and 5 of the master plan cannot be detailed until these complete.
3. **Specific compat suspects need real end-to-end tests** — Netflix DRM, Meet/Zoom WebRTC calls, YouTube HTTP 403s. Cannot be assessed with load-only testing.

**Recommended Phase 1 scope (revised based on audit data):**
- **Highest priority:** End-to-end manual test on Netflix DRM, Meet WebRTC call, Zoom WebRTC call, Slack workspace use. These are the riskiest unknowns from Phase 0.
- **Investigate:** YouTube HTTP 403 errors — could be a 1-line fix (header/UA tweak) or a deeper ad-blocker rule issue.
- **Audit:** ad-blocker rules to ensure no first-party content is being blocked across the 11 sites that produced `ERR_BLOCKED_BY_CLIENT`.
- **Phase 4 descope:** drop the discard UI work; keep only memory pressure handler.

**Phase ordering revision suggestion:**
The master plan ordered phases 0 → 1 → 2 → 3 → 4 → 5. Given Phase 0 found that Phase 4 is less urgent and that Phase 2 needs more measurement before planning, a revised order might be:

```
Phase 1 (compat unknowns)
  → Phase 6 [NEW] Render & UX measurement (Task 6 + 30-item checklist, ~1 day)
  → Phase 2 (render & switch perf fixes)
  → Phase 3 (page load — focus on Slack + YouTube)
  → Phase 5 (UX polish)
  → Phase 4 (descoped memory work, ship-or-skip decision)
```

This puts the biggest unknowns first (compat), gathers the missing measurement data next, and defers the lowest-payoff work last.
