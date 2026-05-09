# Phase 3 — Page Load Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the LCP regressions Phase 0 measured: Slack +140% (34.5s vs Chrome 14.4s) and YouTube +132% (18.4s vs Chrome 7.9s). Acceptance criteria from master design § Phase 3: median LCP across the 15-site matrix within 10% of Chrome; cold start of NYTimes within 15% of Chrome. Optionally close the minor Meet +24% and X +27% regressions if root cause is shared.

**Architecture:** Profile-first, fix-second. Capture full DevTools Performance traces via CDP (`Tracing.start` / `Tracing.end`) on Slack and YouTube in both OS Browser and Chrome. Diff the traces to identify the divergence: main-thread blocking, network ordering, render-blocking resources, or per-page extension cost. Land targeted fixes for high-confidence root causes, defer the rest to Phase 3B.

**Tech Stack:** Chrome DevTools Protocol `Tracing` domain (built into Chromium), `chrome-remote-interface` for the driver script (already a dev dep), perfetto.dev or DevTools' built-in trace viewer for analysis. Same throttling profile as Phase 0 (slow 4G + 4x CPU) for apples-to-apples.

**Reference docs:**
- `docs/superpowers/specs/2026-05-09-chrome-parity-master-design.md` (master plan, Phase 3 in §4)
- `docs/superpowers/specs/2026-05-09-audit-results.md` §1, §7 (LCP data feeds Phase 3)

---

## Phase 3 Has the Data It Needs

Unlike Phase 2, Phase 3 does NOT gate on Phase 1's manual hands-on tasks. The audit already quantified the LCP regressions per site. We only need profiling traces to find root causes.

**Sites in scope:**

| Site | OS Browser LCP | Chrome LCP | Δ | Severity |
|---|---|---|---|---|
| app.slack.com | 34464 ms | 14373 ms | +140% | **High** |
| youtube.com | 18407 ms | 7921 ms | +132% | **High** |
| x.com | 11547 ms | 9078 ms | +27% | Medium |
| meet.google.com | 14566 ms | 11759 ms | +24% | Medium |

The 4 medium-or-high regressions account for the entire Phase 3 surface. All other sites in the audit are at parity or OS Browser is faster.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `docs/superpowers/specs/2026-05-09-phase-3-findings.md` | **Create** | Profiling notes + root cause + fix list |
| `scripts/audit-trace.js` | **Create** | Reusable: drive `Tracing.start`/`stop` against OS Browser or Chrome, save trace JSON |
| `scripts/audit-trace-launch.ps1` | **Create** | PowerShell wrapper that launches OS Browser and runs the trace driver |
| `traces/<site>-<browser>-<date>.json` | **Create** | Captured trace files (gitignored if too large) |
| `packages/main/src/services/adblock-engine.ts`, `services/privacy-engine.ts` | **Modify** (likely) | Throttle scriptlet injection cost during page load if profiling shows it as a bottleneck |
| `packages/main/src/main.ts` | **Modify** (possibly) | Add network hints (preconnect) or Service Worker preload flags |

---

## Task 1: Setup — findings skeleton + trace tooling

**Files:**
- Create: `docs/superpowers/specs/2026-05-09-phase-3-findings.md`
- Create: `scripts/audit-trace.js`
- Create: `scripts/audit-trace-launch.ps1`

- [ ] **Step 1: Write the findings doc skeleton**

Create `docs/superpowers/specs/2026-05-09-phase-3-findings.md`:

```markdown
# Phase 3 Page Load Speed Findings

**Date:** 2026-05-09
**Status:** In progress
**Reference:** `docs/superpowers/specs/2026-05-09-audit-results.md` §1, §7
**Plan:** `docs/superpowers/plans/2026-05-09-phase-3-pageload.md`

---

## 1. Trace Capture Inventory

| Site | OS Browser trace | Chrome trace | Notes |
|---|---|---|---|
| app.slack.com | | | |
| youtube.com | | | |
| x.com | | | |
| meet.google.com | | | |

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
```

- [ ] **Step 2: Write the trace driver script**

Create `scripts/audit-trace.js`:

```js
// Phase 3 - Capture DevTools Performance trace via CDP for a single URL.
// Usage: node scripts/audit-trace.js <url> <output-path> [throttle=1]

const CDP = require('chrome-remote-interface');
const fs = require('fs');

const PORT = parseInt(process.env.CDP_PORT_OVERRIDE || '9223', 10);
const url = process.argv[2];
const outPath = process.argv[3];
const throttle = process.argv[4] !== '0';

if (!url || !outPath) {
  console.error('Usage: node audit-trace.js <url> <output.json> [throttle=1|0]');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const targets = await CDP.List({ port: PORT });
  const target = targets.find(t => t.type === 'page');
  if (!target) { console.error('No page target'); process.exit(1); }

  const client = await CDP({ port: PORT, target });
  await client.Page.enable();
  await client.Network.enable();
  await client.Tracing; // ensure domain available

  if (throttle) {
    await client.Network.emulateNetworkConditions({
      offline: false,
      latency: 150,
      downloadThroughput: (1.5 * 1024 * 1024) / 8,
      uploadThroughput: (0.75 * 1024 * 1024) / 8
    });
    await client.Emulation.setCPUThrottlingRate({ rate: 4 });
    console.log('Throttling: slow 4G + 4x CPU');
  }

  const chunks = [];
  client.Tracing.dataCollected(({ value }) => { chunks.push(...value); });
  const completePromise = new Promise(resolve => {
    client.Tracing.tracingComplete(() => resolve());
  });

  await client.Tracing.start({
    categories: 'blink.user_timing,loading,devtools.timeline,toplevel,disabled-by-default-devtools.timeline',
    options: 'sampling-frequency=10000'
  });

  console.log('Tracing started. Navigating to ' + url + ' ...');
  await client.Page.navigate({ url });

  // Wait for load + LCP settle
  try {
    await Promise.race([
      client.Page.loadEventFired(),
      sleep(60000)
    ]);
  } catch {}
  await sleep(5000);

  console.log('Stopping trace...');
  await client.Tracing.end();
  await completePromise;

  fs.writeFileSync(outPath, JSON.stringify({ traceEvents: chunks }, null, 0));
  console.log('Saved ' + chunks.length + ' events to ' + outPath);

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Write the launcher**

Create `scripts/audit-trace-launch.ps1`:

```powershell
# Phase 3 - Launch a browser with debug port, capture a trace for a URL, stop browser.
# Usage: powershell -File scripts\audit-trace-launch.ps1 <browser> <url> <out-path>
# browser: "osbrowser" or "chrome"

param(
  [Parameter(Mandatory=$true)][string]$Browser,
  [Parameter(Mandatory=$true)][string]$Url,
  [Parameter(Mandatory=$true)][string]$OutPath
)

$ErrorActionPreference = 'Continue'
if ($Browser -eq 'osbrowser') {
  $exe = './out/win-unpacked/OS Browser.exe'
  $port = 9223
  $profileDir = Join-Path $env:TEMP 'osb-trace-profile'
} elseif ($Browser -eq 'chrome') {
  $exe = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
  $port = 9224
  $profileDir = Join-Path $env:TEMP 'chrome-trace-profile'
} else {
  Write-Host 'Browser must be osbrowser or chrome' -ForegroundColor Red
  exit 1
}

if (Test-Path $profileDir) { Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue }

Write-Host ('Launching ' + $Browser + ' (port ' + $port + ')...')
$proc = Start-Process -FilePath $exe `
  -ArgumentList ('--remote-debugging-port=' + $port), ('--user-data-dir=' + $profileDir), '--no-first-run', '--no-default-browser-check' `
  -PassThru

Start-Sleep -Seconds 5
$ready = $false
for ($i = 1; $i -le 12; $i++) {
  try {
    $null = Invoke-RestMethod -Uri ('http://localhost:' + $port + '/json/version') -ErrorAction Stop
    $ready = $true
    break
  } catch { Start-Sleep -Seconds 2 }
}

if (-not $ready) {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  exit 1
}

$env:CDP_PORT_OVERRIDE = $port
node scripts/audit-trace.js $Url $OutPath
Remove-Item Env:\CDP_PORT_OVERRIDE -ErrorAction SilentlyContinue

if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
Get-Process | Where-Object { $_.Path -eq (Resolve-Path $exe).Path } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force } catch {}
}
```

- [ ] **Step 4: Parse-check both scripts**

```powershell
node -c scripts/audit-trace.js
$null = [System.Management.Automation.Language.Parser]::ParseFile("scripts\audit-trace-launch.ps1", [ref]$null, [ref]$errors); if ($errors.Count -eq 0) { 'PARSE OK' } else { $errors }
```

Both should pass.

- [ ] **Step 5: Commit setup**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-3-findings.md scripts/audit-trace.js scripts/audit-trace-launch.ps1
git commit -m "docs: Phase 3 findings skeleton + trace capture tooling"
```

---

## Task 2: Capture Slack + YouTube traces (OS Browser)

**Files:**
- Create: `traces/slack-osbrowser.json`, `traces/youtube-osbrowser.json`

- [ ] **Step 1: Capture Slack trace in OS Browser**

```powershell
mkdir -Force traces
powershell -NoProfile -File scripts\audit-trace-launch.ps1 -Browser osbrowser -Url 'https://app.slack.com' -OutPath '.\traces\slack-osbrowser.json'
```

Wall-clock: ~1.5 min. The script throttles network/CPU to match Lighthouse defaults.

- [ ] **Step 2: Capture YouTube trace in OS Browser**

```powershell
powershell -NoProfile -File scripts\audit-trace-launch.ps1 -Browser osbrowser -Url 'https://www.youtube.com' -OutPath '.\traces\youtube-osbrowser.json'
```

- [ ] **Step 3: Verify trace files have content**

```powershell
Get-ChildItem traces\*-osbrowser.json | Format-Table Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB,1)}}
```

Each should be 5-50 MB. If <100KB, the trace failed — re-run.

- [ ] **Step 4: Update §1 of findings.md with file paths and sizes**

---

## Task 3: Capture Slack + YouTube traces (Chrome stable)

**Files:**
- Create: `traces/slack-chrome.json`, `traces/youtube-chrome.json`

- [ ] **Step 1: Capture Slack trace in Chrome**

```powershell
powershell -NoProfile -File scripts\audit-trace-launch.ps1 -Browser chrome -Url 'https://app.slack.com' -OutPath '.\traces\slack-chrome.json'
```

- [ ] **Step 2: Capture YouTube trace in Chrome**

```powershell
powershell -NoProfile -File scripts\audit-trace-launch.ps1 -Browser chrome -Url 'https://www.youtube.com' -OutPath '.\traces\youtube-chrome.json'
```

- [ ] **Step 3: Update §1 — full trace inventory complete**

```powershell
git add traces/ docs/superpowers/specs/2026-05-09-phase-3-findings.md
# Note: if traces are >10MB combined, add traces/ to .gitignore instead
git commit -m "docs: Phase 3 §1 — trace capture inventory (4 traces, 2 sites x 2 browsers)"
```

---

## Task 4: Analyze traces — root cause for Slack & YouTube

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-3-findings.md` (fill §2 and §3)

DevTools' Performance panel can open these JSON traces (drag-and-drop into the Performance tab). Or use https://ui.perfetto.dev (open-source web viewer, no upload — runs locally).

For each site, the diagnostic process is the same:

- [ ] **Step 1: Open Slack OS Browser trace in DevTools**

Open Chrome (any tab). Press `F12` → Performance tab → click the upload icon → select `traces/slack-osbrowser.json`. Wait for parsing.

- [ ] **Step 2: Find LCP marker on the timeline**

In the timeline header, look for the "LCP" marker in the "Timings" or "Web Vitals" lane. Note its position.

- [ ] **Step 3: Identify the dominant lane between navigationStart and LCP**

Three buckets to check:
- **Network lane:** are the critical resources (HTML, main JS bundle, hero image) waiting on slow requests?
- **Main-thread lane:** is the main thread saturated with script execution? Long task warnings?
- **Render lane:** are there layout/paint storms before LCP?

For each, capture: the dominant resource/script name (just visible at this zoom level), and a rough percentage of the gap it accounts for.

- [ ] **Step 4: Compare with Slack Chrome trace**

Open `traces/slack-chrome.json` in a second DevTools tab. Same site, much shorter timeline. What's different?

Common patterns we expect to find (one or more):
- **OS Browser bundle is bigger/different.** If user-agent triggers a different Slack bundle (e.g. "legacy" path), main-thread script execution will be longer.
- **Main thread has injected scripts.** OS Browser's `services/adblock-engine.ts` and `services/privacy-engine.ts` inject scriptlets at page load. If those run during the critical path, they cost ms.
- **Network ordering differs.** If OS Browser delays a critical request waiting on something OS-Browser-specific.
- **Service Worker disabled / re-registered.** SW differences cause cold-start delta.

- [ ] **Step 5: Write §2 of findings.md**

Format:
```
### Slack — OS Browser LCP 34464ms vs Chrome 14373ms

Dominant cause (Confidence: High/Med/Low):
  <bucket>: <what's slow> — <how it differs from Chrome>

Secondary causes:
  ...

Recommended fix:
  <specific change to a specific file>
  Expected improvement: ~Xms reduction
```

- [ ] **Step 6: Repeat Steps 1–5 for YouTube**

Open `traces/youtube-osbrowser.json` and `traces/youtube-chrome.json`. Same diagnostic process. Fill §3.

- [ ] **Step 7: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-3-findings.md
git commit -m "docs: Phase 3 §2-§3 — Slack & YouTube root cause analysis"
```

---

## Task 5: Land targeted fixes

**Files:** Varies based on §2 and §3 findings.

For each fix candidate identified in §2 and §3 with **High** confidence, implement it as its own commit. Likely candidates (depending on what the traces reveal):

**If main-thread script injection is the bottleneck:**
- Defer `adblock-engine.ts` scriptlet injection until `did-finish-load` (currently fires earlier)
- Defer `privacy-engine.ts` scriptlet injection same way
- One commit per file

**If user-agent serves a different bundle:**
- Strip `os-browser/1.0.0` and `Electron/33.4.11` tokens from UA
- One commit

**If network ordering is the bottleneck:**
- Add `preconnect` hints in main.ts session.defaultSession via `did-start-loading` event
- One commit

**If Service Worker is broken:**
- Verify `partition` config; check SW registration error in trace
- One commit

**Medium and Low confidence root causes go to a Phase 3B plan, NOT inline.**

- [ ] **Step 1: For each High-confidence fix, implement it**

Each fix gets:
1. A focused code change (1-3 files)
2. A commit message stating the symptom fixed and expected reduction
3. An entry in §5 of findings.md with status

- [ ] **Step 2: Commit each fix separately**

```powershell
git add <file>
git commit -m "perf(<area>): <change> — addresses <site> LCP regression"
```

---

## Task 6: Re-measure

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-3-findings.md` (fill §6)

After Task 5 fixes land:

- [ ] **Step 1: Rebuild production**

```powershell
npm run package
```

- [ ] **Step 2: Re-capture Slack and YouTube traces in OS Browser**

```powershell
powershell -NoProfile -File scripts\audit-trace-launch.ps1 -Browser osbrowser -Url 'https://app.slack.com' -OutPath '.\traces\slack-osbrowser-after.json'
powershell -NoProfile -File scripts\audit-trace-launch.ps1 -Browser osbrowser -Url 'https://www.youtube.com' -OutPath '.\traces\youtube-osbrowser-after.json'
```

- [ ] **Step 3: Re-run the OS Browser CDP audit to refresh §1 of audit-results.md**

```powershell
powershell -NoProfile -File scripts\audit-osbrowser-launch.ps1
```

This regenerates the 15-site OS Browser metrics. Update audit-results.md §1 OS Browser rows where Slack and YouTube changed.

- [ ] **Step 4: Compute deltas**

For Slack and YouTube:
- LCP before: from §1 of audit-results.md
- LCP after: from re-run

For each: did we close the gap? By how much?

Acceptance criterion: median LCP within 10% of Chrome on these 2 sites. Was it met?

- [ ] **Step 5: Write §6 of findings.md**

```
| Site | LCP before | LCP after | Δ | Met 10% goal? |
|---|---|---|---|---|
| Slack | 34464 | <new> | <delta> | YES/NO |
| YouTube | 18407 | <new> | <delta> | YES/NO |
```

- [ ] **Step 6: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-3-findings.md docs/superpowers/specs/2026-05-09-audit-results.md
git commit -m "docs: Phase 3 §6 — fix validation, gaps closed/remaining"
```

---

## Task 7: Decide on minor regressions (Meet, X)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-3-findings.md` (fill §4)

The Meet +24% and X +27% regressions are minor. Two paths:

- [ ] **Path A — investigate:** if Task 4's analysis revealed a shared root cause (e.g. user-agent serving different bundle on multiple sites), capture quick traces for Meet and X to confirm. ~10 min total.

- [ ] **Path B — accept as known:** if Slack and YouTube fixes were site-specific and don't generalize, document Meet and X as known minor regressions and move on.

Pick one. Document the choice in §4 of findings with a short justification:

- "Path A executed: shared root cause confirmed, fixed by <SHA>" — OR
- "Path B chosen: distinct root causes likely, low ROI to chase. Re-evaluate after Phase 5 if user feedback raises these as friction"

- [ ] **Step 1: Commit the decision**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-3-findings.md
git commit -m "docs: Phase 3 §4 — disposition of minor regressions"
```

---

## Task 8: Tag completion + handoff

**Files:** None (review only)

- [ ] **Step 1: Update findings doc Status**

`**Status:** In progress` → `**Status:** Complete`.

- [ ] **Step 2: Tag**

```powershell
git tag phase-3-pageload-complete
```

- [ ] **Step 3: Hand off to user**

Output:
> "Phase 3 complete. Slack LCP: <before> → <after> (<%> closed). YouTube LCP: <before> → <after> (<%> closed). 10% acceptance criterion: <PASS/FAIL>. Tag: `phase-3-pageload-complete` (local). Push when ready."

---

## Self-Review Checklist (already run)

- ✅ **Spec coverage:** All Phase 3 deliverables from `2026-05-09-chrome-parity-master-design.md` §4 are mapped: profiling (Tasks 2-3), root cause (Task 4), targeted fixes (Task 5), re-measurement against acceptance criterion (Task 6). Minor regressions explicitly addressed (Task 7).
- ✅ **Placeholder scan:** Where fix specifics are unknown until profiling completes (Task 5), the plan documents conditional logic ("If X is the bottleneck, do Y") rather than placeholders.
- ✅ **Type consistency:** `chrome-remote-interface` API surface (`Tracing.start`, `Tracing.dataCollected`, `Tracing.tracingComplete`, `Tracing.end`) verified against the package version already installed (used in `scripts/audit-osbrowser-cdp.js`). Throttling code mirrors the working pattern from Phase 0.
- ✅ **Data ready:** Phase 3 does NOT gate on Phase 1's manual hands-on tasks. Phase 0 already produced the LCP regressions; Phase 3 just needs traces.
