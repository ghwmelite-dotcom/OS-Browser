# Phase 1 — Site Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate end-to-end compatibility on 4 high-risk sites (Netflix DRM, Meet WebRTC, Zoom WebRTC, Slack), investigate the YouTube HTTP 403 errors found in Phase 0, audit the OS Browser ad-blocker for first-party over-blocking, and produce a numbered fix-list at `docs/superpowers/specs/2026-05-09-phase-1-findings.md`. Also bundle the two Phase 0 tasks the user deferred (scroll/switch + 30-item UX checklist) into the same hands-on session.

**Architecture:** Phase 1 is **diagnose first, fix in a follow-up plan**. The output of this plan is a numbered findings doc and zero or more "obvious one-line fixes" landed inline. Anything bigger gets written into a separate Phase 1B plan once we know what we're fixing — we do not pre-write fix tasks for unknown bugs.

**Tech Stack:** OS Browser dev build (`npm run dev` or `out/win-unpacked/OS Browser.exe`), Chrome stable for side-by-side comparison, Electron DevTools, Game Bar (`Win+Alt+R`) for screen recording, real test accounts (Netflix, Gmail, Slack workspace, Zoom). One reusable PowerShell script for the ad-blocker audit.

**Reference docs:**
- `docs/superpowers/specs/2026-05-09-chrome-parity-master-design.md` (master plan, Phase 1 in §4)
- `docs/superpowers/specs/2026-05-09-audit-results.md` (Phase 0 findings — see §5 and §11)

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `docs/superpowers/specs/2026-05-09-phase-1-findings.md` | **Create** | Numbered findings list — Phase 1's deliverable |
| `scripts/audit-adblocker.ps1` | **Create** | Reusable: rerun OS Browser CDP audit while logging every blocked request URL |

If specific compat fixes turn out to be one-line tweaks (e.g. user-agent string change), they go inline into the relevant source file as part of Task 8. Anything larger goes into a separate Phase 1B plan written after this one completes.

---

## Required Test Resources (gather BEFORE starting)

Phase 1 needs real working accounts. Confirm you have these before Task 1:

- [ ] **Netflix:** an active subscription (any plan)
- [ ] **Google account:** for Meet (no special account; Gmail signed-in is enough)
- [ ] **Zoom test meeting:** the user's Personal Meeting Room ID, OR a second device that can host
- [ ] **Slack workspace:** any workspace where the user can sign in and send a message
- [ ] **30 minutes of uninterrupted hands-on time** (split into smaller blocks if needed)

If any of these aren't available, that test gets marked `BLOCKED-NO-ACCOUNT` and we move on — the rest of the plan still produces value.

---

## Task 1: Set up the findings doc + test session

**Files:**
- Create: `docs/superpowers/specs/2026-05-09-phase-1-findings.md`

- [ ] **Step 1: Create the findings doc skeleton**

Write to `docs/superpowers/specs/2026-05-09-phase-1-findings.md`:

```markdown
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

(Filled in Task 6.)

---

## 3. Ad-Blocker First-Party Audit

(Filled in Task 7.)

---

## 4. Deferred Phase 0 Data — Scroll/Switch Feel

(Filled in Task 9. References audit-results.md §2.)

---

## 5. Deferred Phase 0 Data — UX Polish 30-Item Checklist

(Filled in Task 10.)

---

## 6. Phase 1 Fix List

(Compiled in Task 11.)

---

## 7. Recommendation for Phase 1B Fix Plan

(Filled in Task 11.)
```

- [ ] **Step 2: Build OS Browser dev (one-time, ~5 min)**

If you want the `[TabPerf]` instrumentation back for the deferred Phase 0 §4 capture, re-run `npm run build:main` from main HEAD AFTER restoring it (it was stripped in Phase 0 Task 9). Otherwise you can skip and use `out/win-unpacked/OS Browser.exe` for everything — manual tests don't need instrumentation.

For Phase 1, use the production binary by default:

```powershell
& '.\out\win-unpacked\OS Browser.exe'
```

This launches the same OS Browser users have. Sign in with your existing user profile (no audit isolation here — we want real-user behavior).

- [ ] **Step 3: Open Chrome stable in a separate window for side-by-side**

Have both browsers visible. Most tests below say "compare with Chrome" — having them side-by-side makes the comparison instant.

- [ ] **Step 4: Commit the skeleton**

Run:
```powershell
git add docs/superpowers/specs/2026-05-09-phase-1-findings.md
git commit -m "docs: Phase 1 compat findings skeleton"
```

---

## Task 2: Netflix DRM end-to-end test

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill row 1 of §1)

This is the highest-risk gap from Phase 0. Phase 0 confirmed the landing page loads, but never tested actual playback. Widevine DRM in Electron has known limits.

- [ ] **Step 1: Sign in to Netflix in OS Browser**

Navigate to `https://www.netflix.com`. Click sign-in. Enter your credentials.

If sign-in fails (form not interactive, OAuth redirect breaks): record `FAIL: <reason>` in row 1, skip remaining steps.

- [ ] **Step 2: Try to play any episode**

Pick any title from your "Continue Watching" or trending list. Click Play.

Three possible outcomes — record exactly what happens:

- **PASS:** video plays, audio plays, no error overlay
- **FAIL: DRM error:** Netflix shows a "this device isn't supported" or "Error Code: M7355" or similar message
- **PARTIAL:** video plays but at very low quality (480p only — Widevine L1 blocked, L3 fallback)

Record the exact error code/text in the Notes column.

- [ ] **Step 3: Compare with Chrome**

Same title, in Chrome. Confirm Chrome plays cleanly. If Chrome also fails, the issue is account-side, not OS Browser.

- [ ] **Step 4: Capture details if FAIL**

If OS Browser failed:
1. Open DevTools Console; copy any `EME` or `MediaKeys` related errors
2. Open `chrome://components/` (DevTools URL bar) — record the version of `Widevine Content Decryption Module`
3. Note in findings doc whether Widevine appears registered or not

This data is what Phase 1B's fix plan will need.

- [ ] **Step 5: Fill row 1 in §1 of the findings doc**

Example:
```
| 1 | Netflix | Sign in + play | PARTIAL: 480p only | Widevine L1 not enabled — needs Castlabs Electron build or VMP |
```

---

## Task 3: Google Meet WebRTC test

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill row 2 of §1)

- [ ] **Step 1: Sign in and start a meeting**

Open `https://meet.google.com` in OS Browser. Sign in with your Google account if not already. Click "New meeting" → "Start an instant meeting".

If sign-in fails: record `FAIL: <reason>`, skip rest.

- [ ] **Step 2: Test camera permission**

When Meet asks for camera permission, click Allow. Verify your video preview appears.

If the permission prompt doesn't appear, OS Browser may not be exposing the permission API correctly — record this.

- [ ] **Step 3: Test microphone permission**

Same flow for microphone. Verify audio level indicator moves when you speak.

- [ ] **Step 4: Test screen share**

Click "Present now" → "Your entire screen". Confirm the screen-picker dialog appears. Cancel out (don't actually share — we just need to know the dialog opens).

- [ ] **Step 5: Test leave call**

Click "Leave call" (red phone icon). Verify Meet returns to home screen cleanly.

- [ ] **Step 6: Compare any failures with Chrome**

For any feature that failed, repeat in Chrome. If Chrome works, the bug is OS Browser-specific.

- [ ] **Step 7: Fill row 2 in §1 of the findings doc**

Format the result as: PASS, or `PARTIAL: camera works, screen-share dialog never opens`, etc. Be specific in the Notes column.

---

## Task 4: Zoom WebRTC test

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill row 3 of §1)

- [ ] **Step 1: Get a meeting ID**

Either:
- Use your Zoom Personal Meeting Room (visit zoom.us → Personal Room → copy ID), OR
- Have a second device or person host a meeting and share the ID

- [ ] **Step 2: Open zoom.us/wc and join**

Navigate to `https://zoom.us/wc/<meeting-id>/join` in OS Browser. Click "Join Audio by Computer" when prompted.

If the join page redirects to the desktop app installer — note this. The web client should be the default for `zoom.us/wc` URLs.

- [ ] **Step 3: Test video and audio**

Once joined, enable camera (button in toolbar). Enable mic. Verify both work — your video appears in the participant tile and the speaking indicator moves.

- [ ] **Step 4: Leave the meeting**

Click "End" → "Leave Meeting".

- [ ] **Step 5: Fill row 3 in §1 of the findings doc**

Format same as previous tasks: PASS, FAIL: <reason>, BLOCKED-NO-ACCOUNT, or PARTIAL: <details>.

---

## Task 5: Slack workspace test

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill row 4 of §1)

Slack is in the test matrix because Phase 0 found a +140% LCP regression (the largest in the audit). This task verifies basic functionality even if performance is degraded.

- [ ] **Step 1: Sign in to a Slack workspace**

Navigate to `https://app.slack.com` or your workspace's URL (`<workspace>.slack.com`). Sign in with email/password or SSO.

If sign-in fails: record `FAIL: <reason>`, skip rest.

- [ ] **Step 2: Send a text message**

Pick any channel (e.g. your DMs with yourself). Type a message and press Enter. Confirm it appears in the channel.

- [ ] **Step 3: Send a file attachment**

Click the `+` button → "Upload from your computer". Pick any small file. Send. Confirm it uploads and appears.

If upload hangs or fails: capture the DevTools Network panel error.

- [ ] **Step 4: Reply in thread**

Hover your message → "Reply in thread". Type a reply. Send. Confirm it appears in the thread sidebar.

- [ ] **Step 5: Note the LCP regression context**

Even if all steps PASS functionally, recall that Phase 0 measured Slack at LCP 34s vs Chrome 14s in OS Browser. In the Notes column, add a one-line subjective note: does Slack feel noticeably slower than Chrome side-by-side? (yes/no/marginal)

- [ ] **Step 6: Fill row 4 in §1 of the findings doc**

---

## Task 6: YouTube 403 investigation

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill §2)

Phase 0 saw 5+ HTTP 403 responses on YouTube load in OS Browser. Find out which URLs and why.

- [ ] **Step 1: Open YouTube in OS Browser with DevTools open BEFORE navigation**

Press `Ctrl+T` for new tab. Press `F12` to open DevTools. Switch to the **Network** tab. Click the gear icon → check "Preserve log". Click the red record button if not already on.

- [ ] **Step 2: Navigate to youtube.com**

Type `https://www.youtube.com` in the address bar. Wait for the page to fully load.

- [ ] **Step 3: Filter for 403 responses**

In the Network panel filter row, type `status:403` (or use the dropdown to select Status → 403).

- [ ] **Step 4: Capture each 403 URL**

For each 403 row:
1. Right-click → Copy → Copy as URL
2. Paste into the findings doc (§2)
3. Look at the Initiator column — note what triggered the request (script name or "Other")

Aim to capture all 403 URLs (Phase 0 found 5+; could be more).

- [ ] **Step 5: Categorize each URL**

For each URL, classify it (you'll see patterns):
- **Tracker:** something like `googletagmanager.com`, `doubleclick.net`, `googleads.g.doubleclick.net` — expected to fail
- **YouTube content/API:** `googlevideo.com`, `ytimg.com`, `youtube.com/api/...` — should NOT fail in normal use
- **Other**

If any URL is in the "YouTube content/API" bucket and 403'ing, that's a real Phase 1 bug — record specifically.

- [ ] **Step 6: Repeat the same in Chrome**

Same procedure in Chrome. Compare which URLs 403 there. If a URL 403s in OS Browser but not in Chrome, the cause is OS Browser-specific (likely user-agent, cookies, or ad-blocker behavior).

- [ ] **Step 7: Fill §2 of the findings doc**

Format example:
```
- 5 of 7 403s are trackers (googletagmanager, doubleclick, etc.) — expected
- 2 of 7 are youtube.com/api/stats/qoe — these don't fail in Chrome
- ROOT CAUSE: OS Browser user-agent string contains "os-browser/1.0.0" which YouTube's anti-abuse rejects
- FIX: change user-agent in <file>:<line>
```

---

## Task 7: Ad-blocker first-party allowlist audit

**Files:**
- Create: `scripts/audit-adblocker.ps1`
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill §3)

Phase 0 saw `ERR_BLOCKED_BY_CLIENT` on 11 of 15 sites (capped at 5 errors per site — real count higher). The ad blocker is doing its job, but we need to verify it's not over-blocking first-party content.

- [ ] **Step 1: Write the audit script**

Create `scripts/audit-adblocker.ps1`:

```powershell
# Phase 1 - Ad-blocker first-party audit
# Re-runs OS Browser CDP audit and captures EVERY blocked request URL (not capped).

$ErrorActionPreference = 'Continue'

# Reuses scripts/audit-osbrowser-launch.ps1 launch logic but with an enhanced CDP script

# Step 1: launch OS Browser
$port = 9223
$exe = './out/win-unpacked/OS Browser.exe'
$profileDir = Join-Path $env:TEMP 'os-browser-adblock-audit'

if (Test-Path $profileDir) { Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue }

$proc = Start-Process -FilePath $exe `
  -ArgumentList ('--remote-debugging-port=' + $port), ('--user-data-dir=' + $profileDir) `
  -PassThru

Start-Sleep -Seconds 5
for ($i = 1; $i -le 12; $i++) {
  try {
    $null = Invoke-RestMethod -Uri ('http://localhost:' + $port + '/json/version') -ErrorAction Stop
    break
  } catch { Start-Sleep -Seconds 2 }
}

# Run the enhanced JS that captures all blocked requests
node scripts/audit-adblocker.js

if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
Get-Process | Where-Object { $_.Path -eq (Resolve-Path $exe).Path } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force } catch {}
}
```

- [ ] **Step 2: Write the enhanced CDP script**

Create `scripts/audit-adblocker.js` based on `scripts/audit-osbrowser-cdp.js` but enhanced with `Network.requestWillBeSent` + `Network.loadingFailed` listeners that record EVERY blocked URL with reason codes:

```js
// scripts/audit-adblocker.js
const CDP = require('chrome-remote-interface');
const fs = require('fs');

const PORT = parseInt(process.env.CDP_PORT_OVERRIDE || '9223', 10);
const SITES = [
  { slug: 'gmail',    url: 'https://gmail.com' },
  { slug: 'meet',     url: 'https://meet.google.com' },
  { slug: 'youtube',  url: 'https://www.youtube.com' },
  { slug: 'netflix',  url: 'https://www.netflix.com' },
  { slug: 'drive',    url: 'https://drive.google.com' },
  { slug: 'github',   url: 'https://github.com' },
  { slug: 'office',   url: 'https://www.office.com' },
  { slug: 'zoom',     url: 'https://zoom.us/wc' },
  { slug: 'slack',    url: 'https://app.slack.com' },
  { slug: 'x',        url: 'https://x.com' },
  { slug: 'ghana',    url: 'https://ghana.gov.gh' },
  { slug: 'ecobank',  url: 'https://ecobank.com' },
  { slug: 'nytimes',  url: 'https://www.nytimes.com' },
  { slug: 'whatsapp', url: 'https://web.whatsapp.com' },
  { slug: 'webauthn', url: 'https://webauthn.io' }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const targets = await CDP.List({ port: PORT });
  const target = targets.find(t => t.type === 'page');
  const client = await CDP({ port: PORT, target });
  await client.Page.enable();
  await client.Network.enable();

  const blockedByUrl = {};

  client.Network.loadingFailed(({ requestId, errorText, blockedReason, type }) => {
    if (errorText && (errorText.includes('BLOCKED_BY_CLIENT') || blockedReason)) {
      const key = blockedByUrl.__currentSite || 'unknown';
      if (!blockedByUrl[key]) blockedByUrl[key] = [];
      const req = blockedByUrl.__pendingReq?.[requestId];
      if (req) {
        blockedByUrl[key].push({ url: req.url, type, errorText, blockedReason: blockedReason || '' });
      }
    }
  });

  client.Network.requestWillBeSent(({ requestId, request, type }) => {
    if (!blockedByUrl.__pendingReq) blockedByUrl.__pendingReq = {};
    blockedByUrl.__pendingReq[requestId] = { url: request.url, type };
  });

  for (const s of SITES) {
    blockedByUrl.__currentSite = s.slug;
    blockedByUrl.__pendingReq = {};
    process.stdout.write('  ' + s.slug.padEnd(10));
    await client.Page.navigate({ url: s.url });
    try {
      await Promise.race([
        client.Page.loadEventFired(),
        sleep(30000)
      ]);
    } catch {}
    await sleep(3000);
    const count = (blockedByUrl[s.slug] || []).length;
    console.log(' blocked=' + count);
  }

  delete blockedByUrl.__currentSite;
  delete blockedByUrl.__pendingReq;

  fs.writeFileSync('./adblock-blocked-urls.json', JSON.stringify(blockedByUrl, null, 2));
  console.log('Saved: ./adblock-blocked-urls.json');

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Parse-check both scripts**

Run:
```powershell
$null = [System.Management.Automation.Language.Parser]::ParseFile("scripts\audit-adblocker.ps1", [ref]$null, [ref]$errors); if ($errors.Count -eq 0) { 'PARSE OK' } else { $errors }
node -c scripts\audit-adblocker.js
```
Both should report no errors.

- [ ] **Step 4: Run the audit**

```powershell
powershell -NoProfile -File scripts\audit-adblocker.ps1
```

This takes ~10 min. Output: `./adblock-blocked-urls.json`.

- [ ] **Step 5: Inspect the blocked URLs**

Read `./adblock-blocked-urls.json`. For each site, classify each blocked URL:
- **Tracker domain** (googletagmanager, doubleclick, scorecard, etc.) — expected, leave alone
- **CDN with mixed use** (jsdelivr, cdnjs, cloudflare) — needs first-party context check
- **First-party domain** (same eTLD+1 as site) — POTENTIALLY OVER-BLOCKED

A simple heuristic: if blocked URL's domain is the same as the site's domain (e.g. `slack.com` blocking `app.slack.com/something.js`), flag it.

- [ ] **Step 6: Compare blocking behavior with Chrome (manual spot check)**

For 3 sites where you found suspect blocks (likely Slack, YouTube, Office given Phase 0 data), open the same site in Chrome with no ad blocker. Note any first-party request that succeeds in Chrome but fails in OS Browser.

- [ ] **Step 7: Fill §3 of the findings doc**

Example:
```
- 11 sites had blocked requests; 89 total blocked URLs
- 84 are clearly trackers (good)
- 3 are CDN scripts (jsdelivr) — Slack, GitHub used these — review
- 2 are first-party (slack.com/static/...) — POTENTIAL BUG, file under fix-list
```

---

## Task 8: Land obvious one-line fixes inline

**Files:** Varies based on findings.

If Tasks 2–7 surfaced any single-line fixes (e.g. user-agent string, a specific ad-blocker rule that's clearly wrong), land them here. **Anything bigger goes into the Phase 1B plan written in Task 11 — do not implement complex fixes inline.**

Examples of "one-line fixes" we might find:
- Change user-agent to remove `os-browser/1.0.0` token if it triggers anti-bot rules
- Add a single domain to ad-blocker first-party allowlist
- Add a permission entry that's currently missing

Examples of fixes that DO NOT belong here:
- Widevine DRM enablement (multi-day work, needs separate plan)
- WebRTC API surface fixes (needs investigation)
- Phase 3 perf work for Slack/YouTube LCP

- [ ] **Step 1: For each candidate one-line fix, evaluate:**
  - Is it a single file, single line, with no API ripple? → land it
  - Anything else? → record it in the fix-list, leave for Phase 1B

- [ ] **Step 2: For each landed fix, add a TDD-light test or manual verification step**

For runtime config tweaks (user-agent, etc.), simply re-run the relevant manual test from Tasks 2–6 and confirm the issue is gone.

- [ ] **Step 3: Commit each one-line fix as its own commit**

```powershell
git add <file>
git commit -m "fix(compat): <site> — <specific change>"
```

- [ ] **Step 4: Note in the findings doc which findings were fixed inline vs deferred**

Add a "Status: Fixed inline at <commit-sha>" or "Status: Deferred to Phase 1B" suffix to each finding bullet.

---

## Task 9: Bundle deferred Phase 0 §2 — Scroll/Switch feel

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-audit-results.md` (fill §2)
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill §4)

Since the user is hands-on with both browsers for Phase 1 anyway, complete the Phase 0 deferred Task 6 here. ~15 min work.

- [ ] **Step 1: Open both browsers side-by-side with the same 5 tabs**

NYTimes, Gmail, YouTube, GitHub, Drive — in this order.

- [ ] **Step 2: Enable FPS overlay in both browsers**

In each browser: open DevTools on a page → `Ctrl+Shift+P` → "Show frames per second (FPS) meter".

- [ ] **Step 3: Record 10s of scroll on NYTimes in each browser**

Press `Win+Alt+R` to start Game Bar recording. Scroll smoothly top-to-bottom over 10s. Press `Win+Alt+R` again to stop. Note the FPS overlay (median, dips).

Repeat in the other browser.

- [ ] **Step 4: Record 5 tab switches (Ctrl+Tab) in each browser**

Same procedure. Note: any white flash, lag, content jump.

- [ ] **Step 5: Repeat scroll+switch for sites Gmail, YouTube, Office, ghana.gov.gh, NYTimes**

Six sites total. Use the audit-results.md §2 row template.

- [ ] **Step 6: Fill §2 of audit-results.md AND §4 of findings.md**

§2 of audit-results gets the data; §4 of findings.md gets a 2-3 sentence summary.

- [ ] **Step 7: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md docs/superpowers/specs/2026-05-09-phase-1-findings.md
git commit -m "docs: Phase 0 §2 + Phase 1 §4 — scroll/switch observations"
```

---

## Task 10: Bundle deferred Phase 0 — UX polish 30-item checklist

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill §5)

The 30-item Chrome-parity checklist from the master design spec §4 Phase 5. ~20 min hands-on. Walk each item; mark ✅ matches Chrome / ❌ different (with one-line description of the difference).

- [ ] **Step 1: Walk through the Downloads checklist (5 items)**

Open OS Browser. Trigger a download (any small file from a CDN). Check:
- Progress bar visible with ETA?
- Right-click on downloaded file → "Open containing folder" works?
- Right-click → "Show in folder" works?
- Pause/resume during download works?
- Persistent downloads shelf or panel exists?

For each item: ✅ or ❌ with details. Compare with Chrome's behavior if uncertain.

- [ ] **Step 2: Walk through Find-in-page checklist (4 items)**

`Ctrl+F` on any text-heavy page (NYTimes article). Check:
- Match count shown ("3 of 12")?
- Next/previous navigation buttons?
- All matches highlighted in page?
- Case-sensitive toggle exists?

- [ ] **Step 3: Walk through Autofill checklist (3 items)**

(Skip address & payment autofill if OS Browser intentionally has them off for govt use — note this in findings.) Check:
- Address autofill — on/off?
- Payment autofill — on/off?
- Password manager — works as expected?

- [ ] **Step 4: Walk through Context menu checklist (5 items)**

Right-click on an image, a link, and plain text. Compare items shown to Chrome's:
- Search image with default engine
- Translate page
- View image source
- Save link as
- Copy link text

- [ ] **Step 5: Walk through Keyboard shortcuts checklist (8 items)**

Try each shortcut. Mark ✅/❌:
- `Ctrl+L` (focus omnibar), `Ctrl+T` (new tab), `Ctrl+W` (close tab)
- `Ctrl+Shift+T` (reopen closed tab), `Ctrl+1..9` (jump to tab N)
- `Ctrl+Tab` / `Ctrl+Shift+Tab` (cycle tabs), `Ctrl+F` (find)
- `Ctrl+R` / `Ctrl+Shift+R` (reload / hard reload)
- `Alt+←` / `Alt+→` (back / forward)
- `F11` (fullscreen), `F12` (devtools), `Esc` (stop loading)
- `Ctrl+0` (reset zoom), `Ctrl+P` (print)

- [ ] **Step 6: Walk through Tabs checklist (3 items)**

- Middle-click on a tab to close — works?
- Drag a tab to reorder — works?
- Drag a tab out of the window to make a new window — works?

- [ ] **Step 7: Walk through Address bar checklist (2 items)**

- Start typing in the omnibar — does it autocomplete from history + bookmarks?
- Right-click in omnibar → "Paste and go" — works?

- [ ] **Step 8: Fill §5 of findings.md**

Format: a numbered list of all 30 items with ✅/❌ and one-line description for each ❌ item. The ❌ items become Phase 5 implementation candidates.

- [ ] **Step 9: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-1-findings.md
git commit -m "docs: Phase 1 §5 — UX polish 30-item checklist"
```

---

## Task 11: Compile fix list + Phase 1B plan recommendation

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-1-findings.md` (fill §6 and §7)

- [ ] **Step 1: Fill §6 — Phase 1 Fix List**

Walk §1 (compat tests), §2 (YouTube 403s), §3 (ad-blocker audit), and §5 (UX checklist). For each finding marked FAIL/PARTIAL/❌, write one bullet:

```
- [Severity] <site/area> — <what's broken> — <suggested fix approach> — Status: <fixed inline at SHA | deferred to Phase 1B>
```

Severity scale:
- **Critical** — site is unusable (Netflix DRM, OAuth break)
- **Important** — major feature broken (no screen-share, no autofill)
- **Minor** — UX nit (missing keyboard shortcut, slightly different context menu)

Order by severity, then by site importance.

- [ ] **Step 2: Fill §7 — Phase 1B fix plan recommendation**

Write a 2-paragraph recommendation:
1. Total finding count, breakdown by severity, what landed inline
2. Recommended Phase 1B scope — which findings should be fixed in the next session, ordered by severity

If the deferred fix list is large (10+ items), recommend splitting Phase 1B into 1B (Critical+Important) and 1C (Minor) plans.

- [ ] **Step 3: Update Status field at top of findings.md**

Change `**Status:** In progress` to `**Status:** Complete — Phase 1B fix plan recommended`.

- [ ] **Step 4: Commit and tag**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-1-findings.md
git commit -m "docs: Phase 1 findings — fix list + recommended Phase 1B scope"
git tag phase-1-compat-complete
```

- [ ] **Step 5: Hand off to user**

Output to user:
> "Phase 1 compat audit complete. Findings at `docs/superpowers/specs/2026-05-09-phase-1-findings.md`. Top issues in §6, recommended Phase 1B scope in §7. Tag: `phase-1-compat-complete`. Want me to push the commits + tag, write the Phase 1B fix plan, or pause here?"

Wait for user direction. Do NOT auto-push or auto-write Phase 1B.

---

## Self-Review Checklist (already run)

- ✅ **Spec coverage:** All Phase 1 deliverables from `2026-05-09-chrome-parity-master-design.md` §4 are covered: site-by-site E2E (Tasks 2–5), YouTube 403 dive (Task 6), ad-blocker audit (Task 7). Plus the deferred Phase 0 work (Tasks 9–10) bundled efficiently. The fix-implementation work is properly deferred to Phase 1B per the audit's §11 recommendation.
- ✅ **Placeholder scan:** No "TBD" / "appropriate fix" / "implement later" patterns. Where fix work is genuinely unknown (Task 8), the plan explicitly defers to Phase 1B with concrete handoff criteria.
- ✅ **Type consistency:** All file paths verified to exist or be intentionally created. Script names consistent across PS and JS. CDP listener API surface matches `chrome-remote-interface` v0.31+ conventions used in `scripts/audit-osbrowser-cdp.js`.
- ✅ **No undefined references:** Account requirements section makes prerequisites explicit; tasks gracefully handle BLOCKED-NO-ACCOUNT.
