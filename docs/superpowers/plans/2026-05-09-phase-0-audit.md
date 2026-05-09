# Phase 0 — Chrome-Parity Audit & Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a quantified Chrome-parity gap report at `docs/superpowers/specs/2026-05-09-audit-results.md` covering 15 sites across compat, perf, memory, and UX so Phases 1–5 can be planned against real numbers, not guesses.

**Architecture:** Hybrid measurement plan. Add ~20 lines of temporary `performance.now()` instrumentation to `packages/main/src/tabs/TabWebContents.ts` for tab-create/show/first-load timing. Use Electron DevTools Performance panel for per-page FCP/LCP/TTI. Use Chrome stable on the same machine as the baseline. Remove instrumentation after data capture. No production telemetry, no outbound data — measurement is local-only.

**Tech Stack:** Existing OS Browser dev build (Electron 33, npm run dev), Chrome stable, Lighthouse CLI (npx), Electron DevTools Performance panel, Windows Game Bar or OBS for screen recording, manual notes in markdown.

**Reference spec:** `docs/superpowers/specs/2026-05-09-chrome-parity-master-design.md`

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `docs/superpowers/specs/2026-05-09-audit-results.md` | **Create** | The numbered punch list — Phase 0's deliverable |
| `packages/main/src/tabs/TabWebContents.ts` | **Modify** (instrumentation only) | Temporary `performance.now()` timing for tab create/show/first-load. Removed in Task 9. |

No other files touched. No tests written (Phase 0 is measurement, not feature work).

---

## Test Matrix (referenced in tasks)

The 15 sites to audit, in this exact order:

| # | URL | Why |
|---|---|---|
| 1 | https://gmail.com | OAuth + Service Worker |
| 2 | https://meet.google.com | WebRTC + camera |
| 3 | https://www.youtube.com | Video + ad-block interaction |
| 4 | https://www.netflix.com | Widevine DRM |
| 5 | https://drive.google.com | Heavy SPA |
| 6 | https://github.com | Developer site |
| 7 | https://www.office.com | Microsoft 365 |
| 8 | https://zoom.us/wc | WebRTC web client |
| 9 | https://app.slack.com | Heavy SPA |
| 10 | https://x.com | Timeline + media |
| 11 | https://ghana.gov.gh | Local gov site |
| 12 | https://ecobank.com | Ghana banking site |
| 13 | https://www.nytimes.com | Heavy front-page perf benchmark |
| 14 | https://web.whatsapp.com | QR + Service Worker |
| 15 | https://webauthn.io | Passkey / WebAuthn demo |

---

## Task 1: Set up measurement environment

**Files:** None (environment-only)

- [ ] **Step 1: Verify Chrome stable is installed and capture its version**

Run:
```powershell
(Get-Item "C:\Program Files\Google\Chrome\Application\chrome.exe").VersionInfo.ProductVersion
```
Expected: a version string like `131.0.6778.86`. Write this version to a scratch note — you'll cite it in the audit doc.

If Chrome is not installed, install Chrome stable from https://www.google.com/chrome/ before proceeding.

- [ ] **Step 2: Verify Lighthouse CLI is callable**

Run:
```powershell
npx --yes lighthouse --version
```
Expected: a version string like `12.x.x` and the CLI usage banner. If it prints a version, you're set — no global install needed.

- [ ] **Step 3: Capture machine specs for the audit doc**

Run:
```powershell
Get-ComputerInfo | Select-Object CsName, OsName, OsVersion, CsTotalPhysicalMemory, CsProcessors | Format-List
```
Save the output to a scratch file or paste directly into the audit doc skeleton in Task 3. Same machine must be used for both Chrome and OS Browser measurements — no cross-machine comparisons.

- [ ] **Step 4: Confirm Windows Game Bar is enabled for screen recording**

Press `Win+G`. If the Game Bar overlay opens, it's enabled. You will use it in Task 6 to record tab-switch transitions. If disabled, enable in Settings → Gaming → Game Bar.

- [ ] **Step 5: Close every other Chrome and OS Browser window**

Run:
```powershell
Get-Process | Where-Object { $_.ProcessName -in @('chrome', 'OS Browser', 'electron') } | Format-Table Name, Id
```
If any are listed, close them via Task Manager. A clean state is required so memory measurements aren't polluted.

---

## Task 2: Add temporary tab perf instrumentation

**Files:**
- Modify: `packages/main/src/tabs/TabWebContents.ts`

The existing `createTabView`, `showTabView`, and `resizeAllViews` functions are the three hot paths for "tab feel." Instrument them with `performance.now()` and log to the main-process console. This adds ~25 lines, all clearly tagged `[TabPerf]` so they're trivial to grep and remove in Task 9.

- [ ] **Step 1: Add the perf timer map and helper at the top of TabWebContents.ts**

Insert immediately after the existing `tabViews` map declaration (around line 7):

```ts
// ── TEMPORARY: Phase 0 audit instrumentation. Remove after audit-results.md is committed. ──
const tabPerfTimers = new Map<string, number>();
function tabPerfLog(event: string, tabId: string, durationMs: number): void {
  console.log(`[TabPerf] ${event} tab=${tabId} dur=${durationMs.toFixed(2)}ms`);
}
// ── END TEMPORARY ──
```

- [ ] **Step 2: Instrument `createTabView` to log creation duration and first-load**

Replace the existing `createTabView` function (around lines 45–51) with:

```ts
export function createTabView(tabId: string, mainWindow: BrowserWindow): WebContentsView {
  const t0 = performance.now();
  tabPerfTimers.set(tabId, t0);
  const view = new WebContentsView();
  mainWindow.contentView.addChildView(view);
  resizeView(view, mainWindow);
  tabViews.set(tabId, view);
  tabPerfLog('create', tabId, performance.now() - t0);
  view.webContents.once('did-finish-load', () => {
    const start = tabPerfTimers.get(tabId);
    if (start !== undefined) {
      tabPerfLog('first-load', tabId, performance.now() - start);
      tabPerfTimers.delete(tabId);
    }
  });
  return view;
}
```

- [ ] **Step 3: Instrument `showTabView` to log show duration**

Replace the existing `showTabView` function (around lines 80–98) with the same body wrapped by perf timing:

```ts
export function showTabView(tabId: string, mainWindow?: BrowserWindow): void {
  const t0 = performance.now();
  for (const [id, view] of tabViews) {
    if (id === tabId) {
      view.setVisible(true);
    } else if (id === pipTabId) {
      view.setVisible(true);
      if (mainWindow) {
        try {
          mainWindow.contentView.removeChildView(view);
          mainWindow.contentView.addChildView(view);
        } catch {}
      }
    } else {
      view.setVisible(false);
    }
  }
  tabPerfLog('show', tabId, performance.now() - t0);
}
```

- [ ] **Step 4: Instrument `resizeAllViews` to log resize-storm cost**

Replace the existing `resizeAllViews` function (around lines 224–234) with:

```ts
export function resizeAllViews(mainWindow: BrowserWindow): void {
  const t0 = performance.now();
  for (const [id, view] of tabViews) {
    if (id === pipTabId) {
      const [winW, winH] = mainWindow.getContentSize();
      view.setBounds({ x: winW - 416, y: winH - 271, width: 400, height: 225 });
    } else {
      resizeView(view, mainWindow);
    }
  }
  tabPerfLog('resize-all', `(${tabViews.size} views)`, performance.now() - t0);
}
```

- [ ] **Step 5: Build and run the dev environment**

Run:
```powershell
npm run dev
```
Expected: OS Browser launches. Open DevTools on the main window with `Ctrl+Shift+I`, then check the **main process console** (not renderer console) — in Electron dev, main-process logs appear in the terminal where `npm run dev` was run.

- [ ] **Step 6: Verify instrumentation prints to console**

In the running OS Browser, open a new tab and navigate to `https://example.com`. In the terminal you should see (numbers will vary):
```
[TabPerf] create tab=<uuid> dur=12.34ms
[TabPerf] show tab=<uuid> dur=2.10ms
[TabPerf] first-load tab=<uuid> dur=842.55ms
```
If you don't see these lines, the instrumentation didn't compile or didn't load. Check the terminal for TypeScript errors and fix before proceeding.

- [ ] **Step 7: Commit the instrumentation**

Run:
```powershell
git add packages/main/src/tabs/TabWebContents.ts
git commit -m "chore: add Phase 0 audit perf instrumentation (temporary)"
```

---

## Task 3: Create the audit results doc skeleton

**Files:**
- Create: `docs/superpowers/specs/2026-05-09-audit-results.md`

- [ ] **Step 1: Write the skeleton**

Create the file with this exact starting content:

```markdown
# OS Browser vs Chrome — Phase 0 Audit Results

**Date:** 2026-05-09
**Status:** In progress
**Reference:** `docs/superpowers/specs/2026-05-09-chrome-parity-master-design.md`
**Machine specs:** [PASTE FROM TASK 1 STEP 3]
**Chrome version:** [PASTE FROM TASK 1 STEP 1]
**OS Browser commit:** [run `git rev-parse HEAD` and paste]

---

## 1. Per-Site Measurement Table

| # | Site | Browser | FCP (ms) | LCP (ms) | TTI (ms) | CLS | TBT (ms) | Errors |
|---|---|---|---|---|---|---|---|---|
| 1 | gmail.com | Chrome | | | | | | |
| 1 | gmail.com | OS Browser | | | | | | |
| 2 | meet.google.com | Chrome | | | | | | |
| 2 | meet.google.com | OS Browser | | | | | | |
| 3 | youtube.com | Chrome | | | | | | |
| 3 | youtube.com | OS Browser | | | | | | |
| 4 | netflix.com | Chrome | | | | | | |
| 4 | netflix.com | OS Browser | | | | | | |
| 5 | drive.google.com | Chrome | | | | | | |
| 5 | drive.google.com | OS Browser | | | | | | |
| 6 | github.com | Chrome | | | | | | |
| 6 | github.com | OS Browser | | | | | | |
| 7 | office.com | Chrome | | | | | | |
| 7 | office.com | OS Browser | | | | | | |
| 8 | zoom.us/wc | Chrome | | | | | | |
| 8 | zoom.us/wc | OS Browser | | | | | | |
| 9 | app.slack.com | Chrome | | | | | | |
| 9 | app.slack.com | OS Browser | | | | | | |
| 10 | x.com | Chrome | | | | | | |
| 10 | x.com | OS Browser | | | | | | |
| 11 | ghana.gov.gh | Chrome | | | | | | |
| 11 | ghana.gov.gh | OS Browser | | | | | | |
| 12 | ecobank.com | Chrome | | | | | | |
| 12 | ecobank.com | OS Browser | | | | | | |
| 13 | nytimes.com | Chrome | | | | | | |
| 13 | nytimes.com | OS Browser | | | | | | |
| 14 | web.whatsapp.com | Chrome | | | | | | |
| 14 | web.whatsapp.com | OS Browser | | | | | | |
| 15 | webauthn.io | Chrome | | | | | | |
| 15 | webauthn.io | OS Browser | | | | | | |

---

## 2. Tab Switch & Scroll Feel (Subjective)

Per site, recorded from screen recordings + side-by-side observation:

| # | Site | Tab switch (Chrome) | Tab switch (OS Browser) | Scroll FPS (Chrome) | Scroll FPS (OS Browser) | Notes |
|---|---|---|---|---|---|---|
| 1 | gmail.com | | | | | |

(Repeat row template for sites 2–15 — leave empty for now.)

---

## 3. Memory Curve

| Tabs open | Chrome RSS (MB) | OS Browser RSS (MB) | Delta |
|---|---|---|---|
| 1 | | | |
| 5 | | | |
| 10 | | | |

Sites used: NYTimes, Gmail, YouTube, GitHub, Drive (open in this order).

---

## 4. Tab Operation Timing (from `[TabPerf]` console logs)

Median over 10 tab opens:

| Operation | Median (ms) | p95 (ms) |
|---|---|---|
| `create` | | |
| `show` | | |
| `first-load` (NYTimes) | | |
| `resize-all` (5 views) | | |

---

## 5. Phase 1 Inputs — Compatibility Blockers

(One bullet per broken site, with the specific error.)

---

## 6. Phase 2 Inputs — Render & Switch Feel Gaps

(One bullet per visible jank or flicker observation.)

---

## 7. Phase 3 Inputs — Page Load Speed Gaps

(One bullet per site where OS Browser LCP exceeds Chrome by >10%.)

---

## 8. Phase 4 Inputs — Memory Behavior

(Observations from §3.)

---

## 9. Phase 5 Inputs — UX Polish Gaps

(One bullet per Chrome behavior that OS Browser does differently.)

---

## 10. Top 10 User-Visible Gaps (Priority Order)

1.
2.
3.
4.
5.
6.
7.
8.
9.
10.

---

## 11. Conclusions & Recommendations

(Filled at end of Task 8.)
```

- [ ] **Step 2: Fill in Chrome version, machine specs, and HEAD commit**

Edit the three `[PASTE...]` placeholders at the top of the file with the values from Task 1 Step 1, Task 1 Step 3, and the output of:
```powershell
git rev-parse HEAD
```

- [ ] **Step 3: Commit the skeleton**

Run:
```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md
git commit -m "docs: Phase 0 audit results skeleton"
```

---

## Task 4: Capture Chrome baseline (Lighthouse for sites 1–15)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-audit-results.md` (fill in §1 Chrome rows)

This task runs Lighthouse against each of the 15 sites in Chrome. Lighthouse CLI launches headless Chrome internally, so it does not require any windows to be open. Rows are filled into the §1 table.

- [ ] **Step 1: Run Lighthouse against site 1 (gmail.com) and capture metrics**

Run:
```powershell
npx --yes lighthouse https://gmail.com --only-categories=performance --output=json --output-path=./lh-1-gmail.json --chrome-flags="--headless=new"
```
Expected: a JSON file is created and a summary table prints to console with `first-contentful-paint`, `largest-contentful-paint`, `interactive`, `cumulative-layout-shift`, `total-blocking-time` numeric values.

If Lighthouse can't reach the URL because it requires login, mark Errors as "requires login" and use the public-equivalent or the redirect URL — note it in the audit doc.

- [ ] **Step 2: Extract and record metrics in the audit table**

Open `lh-1-gmail.json`, find the `audits` object, and pull these values (numeric, ms unless noted):
- `audits['first-contentful-paint'].numericValue` → FCP
- `audits['largest-contentful-paint'].numericValue` → LCP
- `audits['interactive'].numericValue` → TTI
- `audits['cumulative-layout-shift'].numericValue` → CLS (unitless)
- `audits['total-blocking-time'].numericValue` → TBT

Round each to integer ms (or 3 decimals for CLS). Fill into the gmail.com → Chrome row in §1 of the audit doc.

- [ ] **Step 3: Repeat for sites 2 through 15**

Run the same command pattern, swapping the URL and output filename:
```powershell
npx --yes lighthouse <url> --only-categories=performance --output=json --output-path=./lh-N-<slug>.json --chrome-flags="--headless=new"
```
Where `<slug>` is a short site identifier (e.g. `meet`, `youtube`, `netflix`).

For each site: extract the same five metrics, fill the Chrome row in §1.

If a site cannot be measured by Lighthouse headless (DRM, login wall, geo-block), record reason in the Errors column and proceed to next site.

- [ ] **Step 4: Delete the Lighthouse JSON files**

Run:
```powershell
Remove-Item ./lh-*.json
```

- [ ] **Step 5: Commit the Chrome baseline rows**

Run:
```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md
git commit -m "docs: Phase 0 audit — Chrome baseline metrics for 15 sites"
```

---

## Task 5: Capture OS Browser metrics (DevTools Performance panel)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-audit-results.md` (fill in §1 OS Browser rows)

Lighthouse cannot drive an Electron app directly. Instead, use the Electron DevTools Performance panel manually for each site. This is slower but accurate.

- [ ] **Step 1: Launch OS Browser dev build (instrumentation already on from Task 2)**

Run:
```powershell
npm run dev
```
Wait for the window to appear and Kente sidebar to render.

- [ ] **Step 2: Open DevTools on the active tab's WebContentsView**

Right-click the page area → "Inspect element" (or `Ctrl+Shift+I` while focused on the web content). The DevTools panel should attach to the WebContentsView (not the chrome window). Confirm by checking that the URL bar in DevTools shows the page URL, not `file://` for the Electron chrome.

If DevTools attaches to the chrome by default, find the keyboard shortcut wired in `packages/renderer` for "open content devtools" — there is an existing menu item for this; use it.

- [ ] **Step 3: Run Performance recording for site 1**

In DevTools:
1. Switch to the **Performance** tab
2. Click the gear icon → set CPU throttling to "No throttling", Network to "No throttling"
3. Tick "Screenshots" and "Web Vitals"
4. Click the reload-and-record button (the circular arrow at top-left of Performance panel)
5. Wait until the timeline shows the page is fully loaded (network is idle for 2+ seconds)
6. Click Stop

The timeline will show **FCP**, **LCP**, **DCL** markers in the "Timings" lane (Web Vitals row).

- [ ] **Step 4: Read FCP, LCP, TTI from the Performance timeline**

Hover the FCP marker — the tooltip shows the time in ms relative to navigation start. Record:
- FCP (Web Vitals row, "FCP" marker)
- LCP (Web Vitals row, "LCP" marker)
- TTI: not directly shown by DevTools — use the moment Long Tasks stop appearing as a proxy, or skip TTI for OS Browser rows and record "n/a"
- CLS: from Web Vitals overlay (in the "Layout shift" lane) — sum the shift scores
- TBT: from the "Bottom-up" tab → "Total Blocking Time" (DevTools shows this in newer versions)

If a metric is unreadable, record "n/a" rather than guessing. The §10 priority list won't suffer from a few n/a cells; it will from fabricated numbers.

- [ ] **Step 5: Note any console errors during the recording**

Switch to **Console** tab in DevTools. Capture the first 1–2 lines of any red error or yellow warning that fires during page load. Paste short summaries into the Errors column for site 1's OS Browser row.

- [ ] **Step 6: Fill site 1's OS Browser row in §1**

Edit `docs/superpowers/specs/2026-05-09-audit-results.md`, fill the gmail.com → OS Browser row.

- [ ] **Step 7: Repeat steps 3–6 for sites 2 through 15**

For each site:
1. Open in a new tab in OS Browser (`Ctrl+T`, paste URL, Enter)
2. Open DevTools on that tab's content view
3. Run Performance recording
4. Capture FCP, LCP, TTI(or n/a), CLS, TBT, errors
5. Fill the row

If a site fails to load entirely (e.g. Netflix DRM error), record FCP/LCP as "blocked" and put the exact error message in Errors. This is a Phase 1 input.

- [ ] **Step 8: Commit the OS Browser rows**

Run:
```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md
git commit -m "docs: Phase 0 audit — OS Browser metrics for 15 sites"
```

---

## Task 6: Capture tab-switch and scroll-feel observations

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-audit-results.md` (fill in §2)

Subjective and video-recorded. Goal is to characterise *visual feel*, not just numbers.

- [ ] **Step 1: Open both browsers side-by-side with the same 5 tabs**

In Chrome and OS Browser, open these 5 tabs in this order: NYTimes, Gmail, YouTube, GitHub, Drive. Wait until all 5 are loaded.

- [ ] **Step 2: Enable Electron DevTools FPS overlay on OS Browser**

Open DevTools on the active content view → press `Ctrl+Shift+P` → type "frame rate" → select "Show frames per second (FPS) meter". An FPS overlay appears in the top-right of the page area.

Do the same in Chrome stable for parity.

- [ ] **Step 3: Record a 10-second scroll on NYTimes in Chrome**

Open Game Bar (`Win+G`), start recording, focus the Chrome NYTimes tab, scroll smoothly from top to bottom over ~10s. Stop recording. Note FPS overlay numbers (median, dips below 60).

- [ ] **Step 4: Repeat the same scroll on NYTimes in OS Browser**

Same procedure. Compare FPS distributions visually.

- [ ] **Step 5: Record 5 tab switches in Chrome**

Switch between tabs 1→2→3→4→5→1 in Chrome with `Ctrl+Tab`. Record. Note: any white flash, lag, content jump.

- [ ] **Step 6: Repeat 5 tab switches in OS Browser**

Same procedure. Compare directly.

- [ ] **Step 7: Fill §2 row for NYTimes (sample row)**

Example row:
```
| 13 | nytimes.com | smooth, 60fps | smooth, ~58fps | 60fps, no dips | 50–60fps, occasional dip to 35fps on image render | OS Browser scroll noticeably less smooth on image-heavy section |
```

- [ ] **Step 8: Repeat steps 3–6 for sites 1, 3, 5, 7, 11, 13**

Six sites is enough for representative scroll/switch data — full 15 is overkill for subjective measurement. Sites picked: Gmail, YouTube, Drive, Office, ghana.gov.gh, NYTimes.

For each: scroll for 10s, switch tabs 5x, fill the §2 row.

- [ ] **Step 9: Save screen recordings to a local folder for reference**

Move the captured `.mp4` files from `Videos/Captures/` to a folder you can reference later (do not commit these — they are large and contain on-screen page content). Note the folder path in §2 of the audit doc.

- [ ] **Step 10: Commit §2**

Run:
```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md
git commit -m "docs: Phase 0 audit — tab switch and scroll feel observations"
```

---

## Task 7: Capture memory curve at 1/5/10 tabs

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-audit-results.md` (fill in §3 and §4)

- [ ] **Step 1: Restart Chrome with no tabs**

Close all Chrome windows. Reopen Chrome. Confirm only the new-tab page is open.

- [ ] **Step 2: Capture Chrome RSS at 1 tab**

Open NYTimes. Wait 30s for full load + idle. In Chrome's task manager (`Shift+Esc`), record the **total** memory across all Chrome processes. This is the "1 tab" RSS for Chrome.

- [ ] **Step 3: Capture Chrome RSS at 5 tabs**

Add 4 more tabs in this order: Gmail, YouTube, GitHub, Drive. Wait 30s after the last load. Record total Chrome RSS.

- [ ] **Step 4: Capture Chrome RSS at 10 tabs**

Add 5 more tabs: Office, Slack, X, WhatsApp, Zoom. Wait 30s. Record total Chrome RSS.

- [ ] **Step 5: Restart OS Browser dev build, fully clean**

Close OS Browser. Re-run `npm run dev`. Wait until launched.

- [ ] **Step 6: Capture OS Browser RSS at 1, 5, 10 tabs**

Use the same 10-site list and same order as Chrome (NYTimes, Gmail, YouTube, GitHub, Drive, then Office, Slack, X, WhatsApp, Zoom). Wait 30s after each batch.

For OS Browser RSS, sum across all `electron.exe` and `OS Browser.exe` processes. Run:
```powershell
Get-Process | Where-Object { $_.ProcessName -in @('electron', 'OS Browser') } | Measure-Object -Property WorkingSet64 -Sum | Select-Object @{N='SumMB';E={[math]::Round($_.Sum/1MB,1)}}
```
Record the `SumMB` value at each of the 1/5/10 tab points.

- [ ] **Step 7: Fill §3**

Edit the audit doc; populate Chrome RSS, OS Browser RSS, and Delta columns.

- [ ] **Step 8: Capture tab operation timings from `[TabPerf]` logs**

In the terminal running `npm run dev`, look at the `[TabPerf]` lines emitted during steps 5–6. Collect 10 `create` durations, 10 `show` durations, 1 `first-load` for NYTimes, and at least 5 `resize-all` durations.

Compute median and p95 for each metric. (Sort the values, take the middle and the 9th-of-10 value as p95 approximation.) Fill into §4 of the audit doc.

- [ ] **Step 9: Commit §3 and §4**

Run:
```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md
git commit -m "docs: Phase 0 audit — memory curve and tab operation timing"
```

---

## Task 8: Compile gap punch list

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-audit-results.md` (fill in §5–§11)

This is the synthesis task — turn raw measurements into a numbered, actionable list.

- [ ] **Step 1: Fill §5 Phase 1 Inputs (Compat Blockers)**

For each site row in §1 with non-empty Errors column, write one bullet in §5:
- Format: `- [#N] <site>: <error summary> (Chrome: works fine | OS Browser: <broken behavior>)`
- Order: most critical first (banking, OAuth, video DRM, productivity, then less-critical).

If §1 shows no errors at all, write a single line: `- No compat blockers found in audit.`

- [ ] **Step 2: Fill §6 Phase 2 Inputs (Render/Switch Feel)**

From §2 and §4:
- Any site where OS Browser scroll FPS drops below 50 → bullet in §6
- Any site where OS Browser tab switch shows visible jank/flash → bullet in §6
- If §4 `show` p95 > 30ms or `resize-all` p95 > 50ms → bullet citing those numbers

- [ ] **Step 3: Fill §7 Phase 3 Inputs (Page Load Gaps)**

For each site row pair in §1:
- Compute LCP delta: `(OS_LCP - Chrome_LCP) / Chrome_LCP * 100`
- If delta > 10%, write a bullet: `- [#N] <site>: LCP <X>ms vs Chrome <Y>ms (+<delta>% slower)`
- Order by delta % descending (worst first)

- [ ] **Step 4: Fill §8 Phase 4 Inputs (Memory)**

From §3:
- Compute RSS-per-tab at the 10-tab point for each browser
- Note any non-linear curve (e.g. Chrome saturates, OS Browser linear → flag as discard candidate)
- One paragraph max — this is one of the smaller sections

- [ ] **Step 5: Fill §9 Phase 5 Inputs (UX Polish)**

Walk the spec's §4 Phase 5 checklist (30 items: downloads, find-in-page, autofill, context menu, keyboard shortcuts, tabs, address bar, misc). For each item:
- Open OS Browser. Try the behavior. Compare against Chrome.
- If different, write a bullet: `- <category>: <item> behaves differently — Chrome does <X>, OS Browser does <Y>`
- Skip items that already match.

This is the longest sub-step — budget 30–45 minutes.

- [ ] **Step 6: Fill §10 Top 10 User-Visible Gaps (Priority Order)**

Read all bullets from §5–§9. Pick the 10 that are most user-visible and most fixable. Order by impact (a Gmail OAuth break is #1; a missing keyboard shortcut is #8). Write each as one line.

This is the punch list that actually drives the next phase plans.

- [ ] **Step 7: Fill §11 Conclusions & Recommendations**

Three short paragraphs:
1. **Where OS Browser is at parity** — mention sites/behaviors that match Chrome.
2. **Where the biggest gaps are** — name the top 3 from §10 and characterise the gap (compat / perf / UX).
3. **Recommended Phase 1 scope** — given the audit, suggest which subset of compat issues to tackle first. This feeds directly into the Phase 1 plan.

- [ ] **Step 8: Update Status field at the top of the audit doc**

Change `**Status:** In progress` to `**Status:** Complete`.

- [ ] **Step 9: Commit the synthesis**

Run:
```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md
git commit -m "docs: Phase 0 audit — punch list and recommendations complete"
```

---

## Task 9: Remove temporary instrumentation

**Files:**
- Modify: `packages/main/src/tabs/TabWebContents.ts`

Strip every line introduced in Task 2. The audit log data is captured in §4 of the results doc; the instrumentation has no further purpose.

- [ ] **Step 1: Revert the `tabPerfTimers`/`tabPerfLog` block**

Remove the block added in Task 2 Step 1 (everything between `// ── TEMPORARY: Phase 0 audit instrumentation` and `// ── END TEMPORARY ──`).

- [ ] **Step 2: Revert `createTabView` to its original form**

The `createTabView` function should look exactly like its pre-Task-2 form:

```ts
export function createTabView(tabId: string, mainWindow: BrowserWindow): WebContentsView {
  const view = new WebContentsView();
  mainWindow.contentView.addChildView(view);
  resizeView(view, mainWindow);
  tabViews.set(tabId, view);
  return view;
}
```

- [ ] **Step 3: Revert `showTabView` to its original form**

```ts
export function showTabView(tabId: string, mainWindow?: BrowserWindow): void {
  for (const [id, view] of tabViews) {
    if (id === tabId) {
      view.setVisible(true);
    } else if (id === pipTabId) {
      view.setVisible(true);
      if (mainWindow) {
        try {
          mainWindow.contentView.removeChildView(view);
          mainWindow.contentView.addChildView(view);
        } catch {}
      }
    } else {
      view.setVisible(false);
    }
  }
}
```

- [ ] **Step 4: Revert `resizeAllViews` to its original form**

```ts
export function resizeAllViews(mainWindow: BrowserWindow): void {
  for (const [id, view] of tabViews) {
    if (id === pipTabId) {
      const [winW, winH] = mainWindow.getContentSize();
      view.setBounds({ x: winW - 416, y: winH - 271, width: 400, height: 225 });
    } else {
      resizeView(view, mainWindow);
    }
  }
}
```

- [ ] **Step 5: Verify no `[TabPerf]` references remain**

Run:
```powershell
Select-String -Path "packages\main\src\tabs\TabWebContents.ts" -Pattern "TabPerf|tabPerfTimers|tabPerfLog"
```
Expected: no matches. If any line still references these, remove it.

- [ ] **Step 6: Verify the build still compiles**

Run:
```powershell
npm run build:main
```
Expected: no TypeScript errors. If errors appear, the revert was incomplete — re-check steps 2–4.

- [ ] **Step 7: Commit the cleanup**

Run:
```powershell
git add packages/main/src/tabs/TabWebContents.ts
git commit -m "chore: remove Phase 0 audit instrumentation"
```

---

## Task 10: Final review and handoff

**Files:** None (review only)

- [ ] **Step 1: Re-read the audit doc end-to-end**

Open `docs/superpowers/specs/2026-05-09-audit-results.md`. Read it as if you were a stakeholder seeing it for the first time. Check:
- Are all §1 cells filled (or marked n/a with reason)?
- Is §10's top-10 list ordered by impact?
- Does §11's recommended Phase 1 scope make sense given the data?

If anything is missing or unclear, fix it and amend the previous commit:
```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md
git commit --amend --no-edit
```

- [ ] **Step 2: Tag the Phase 0 completion**

Run:
```powershell
git tag phase-0-audit-complete
```
This is a local tag — push only after the user reviews:
```powershell
git push origin phase-0-audit-complete
```
Skip the push step until user approval.

- [ ] **Step 3: Notify the user**

Output to the user:
> "Phase 0 audit complete. Results at `docs/superpowers/specs/2026-05-09-audit-results.md`. Top 10 gaps in §10. Recommended Phase 1 scope in §11. Please review — once approved, I'll write the Phase 1 implementation plan based on the §10 priority list."

Wait for user response. Do not start Phase 1 planning until user has reviewed and approved the audit results.

---

## Self-Review Checklist (already run)

- ✅ **Spec coverage:** All five Phase 0 deliverables from `2026-05-09-chrome-parity-master-design.md` §4 are mapped to tasks (15-site matrix → Tasks 4–5; FCP/LCP/TTI → Tasks 4–5; scroll FPS → Task 6; memory at 1/5/10 → Task 7; punch list → Task 8; Phase 1–5 input lists → Task 8 §5–§9; top-10 → Task 8 §10).
- ✅ **Placeholder scan:** No "TBD" / "implement later" / "appropriate error handling" found. The `[PASTE...]` markers in Task 3 Step 1 are intentional fill-in-the-blank slots, resolved in Task 3 Step 2.
- ✅ **Type consistency:** All function names match `TabWebContents.ts` (`createTabView`, `showTabView`, `resizeAllViews`, `resizeView`). Helper names consistent (`tabPerfTimers`, `tabPerfLog`).
- ✅ **No undefined references:** All file paths verified to exist. PowerShell commands tested for syntax.
