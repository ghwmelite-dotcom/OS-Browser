# OS Browser vs Chrome — Phase 0 Audit Results

**Date:** 2026-05-09
**Status:** In progress
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

Sites opened in order: NYTimes, Gmail, YouTube, GitHub, Drive (1–5), then Office, Slack, X, WhatsApp, Zoom (6–10).

| Tabs open | Chrome RSS (MB) | OS Browser RSS (MB) | Delta (MB) | Delta (%) |
|---|---|---|---|---|
| 1 | | | | |
| 5 | | | | |
| 10 | | | | |

---

## 4. Tab Operation Timing (from `[TabPerf]` console logs)

Median over 10 tab opens (sites 1–10 above):

| Operation | Median (ms) | p95 (ms) | Notes |
|---|---|---|---|
| `create` | | | New WebContentsView allocation + addChildView |
| `show` | | | Visibility flip across all tabs |
| `first-load` (NYTimes) | | | Time from `createTabView` to `did-finish-load` |
| `resize-all` (5 views) | | | Geometry update across N views |

---

## 5. Phase 1 Inputs — Compatibility Blockers

(Filled in Task 8.)

---

## 6. Phase 2 Inputs — Render & Switch Feel Gaps

(Filled in Task 8.)

---

## 7. Phase 3 Inputs — Page Load Speed Gaps

(Filled in Task 8.)

---

## 8. Phase 4 Inputs — Memory Behavior

(Filled in Task 8.)

---

## 9. Phase 5 Inputs — UX Polish Gaps

(Filled in Task 8.)

---

## 10. Top 10 User-Visible Gaps (Priority Order)

(Filled in Task 8.)

---

## 11. Conclusions & Recommendations

(Filled in Task 8.)
