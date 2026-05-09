# Phase 2 — Render & Switch Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate visible tab-switch flicker, lift scroll FPS to 60 on a 4K image-heavy page, and verify no jank during sidebar collapse/expand. Three measurable acceptance criteria from the master design spec § Phase 2: (1) video recording shows tab swap indistinguishable from Chrome (<16ms perceived), (2) 60fps scroll on NYTimes front page, (3) no jank when collapsing/expanding the Kente sidebar.

**Architecture:** Three-pass approach. **(A) Static audit** of current Electron flags, `WebContentsView` show/hide ordering, scroll event passivity, and resize debounce path — all doable without runtime data. **(B) Data gate** — wait for Phase 1 §4 (scroll/switch observations on 6 sites) and re-instrumented `[TabPerf]` timings on a production build. **(C) Targeted fixes** — implement only changes that close gaps the data identified, then re-measure.

**Tech Stack:** Electron 33 main process, Chromium command-line flags (`--enable-gpu-rasterization`, `--enable-zero-copy`, `--ignore-gpu-blocklist`), `WebContentsView` (already in use), `performance.mark`/`measure` for instrumentation, Windows Game Bar (`Win+Alt+R`) for visual verification.

**Reference docs:**
- `docs/superpowers/specs/2026-05-09-chrome-parity-master-design.md` (master plan, Phase 2 in §4)
- `docs/superpowers/specs/2026-05-09-audit-results.md` §2, §4 (data feeds Phase 2)
- `docs/superpowers/specs/2026-05-09-phase-1-findings.md` §4 (scroll/switch observations once landed)

---

## Data Gate

Tasks 5 onwards CANNOT START until both:
1. **Phase 1 §4 (scroll/switch observations)** is populated — gives us the ground truth on which sites and which interactions feel janky.
2. **Re-instrumented `[TabPerf]` timing data** is captured against a production build — gives us median/p95 numbers for tab create/show/resize-all.

If you're reading this plan before either of those land, **execute Tasks 1–4 only** — they are the static audit that sets up the runtime fixes once data arrives.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `docs/superpowers/specs/2026-05-09-phase-2-findings.md` | **Create** | Static-audit findings + post-data fix plan |
| `packages/main/src/main.ts` | **Modify** (likely) | Add or adjust GPU/compositor command-line flags |
| `packages/main/src/tabs/TabWebContents.ts` | **Modify** (likely) | Tab show/hide ordering, resize debounce |
| `packages/renderer/src/components/KenteSystem/*` | **Modify** (possible) | Sidebar resize emit debouncing |

---

## Task 1: Static audit — GPU & compositor flags

**Files:**
- Read: `packages/main/src/main.ts`
- Create: `docs/superpowers/specs/2026-05-09-phase-2-findings.md` (open with §1 — flags audit)

Goal: identify which Chromium command-line flags OS Browser currently passes, gap-analysis against Chrome's defaults and known performance flags.

- [ ] **Step 1: List every `app.commandLine.appendSwitch` and `app.commandLine.appendArgument` call in the main process**

Run:
```powershell
Select-String -Path "packages\main\src\**\*.ts" -Pattern "appendSwitch|appendArgument" -SimpleMatch
```
Capture file:line and the flag name for each match.

- [ ] **Step 2: Cross-check with the recommended Chromium performance flag set**

Compare the captured flags against this baseline:

| Flag | Default in Chromium? | Effect |
|---|---|---|
| `--enable-gpu-rasterization` | Yes (Win/Mac) | GPU compositing |
| `--enable-zero-copy` | Yes | GPU upload optimisation |
| `--ignore-gpu-blocklist` | No | Force GPU even on flagged hardware |
| `--enable-features=UseSkiaRenderer` | Yes (newer) | Skia compositor |
| `--disable-features=CalculateNativeWinOcclusion` | No | Avoid occlusion stalls when window is partly hidden |
| `--enable-accelerated-video-decode` | Yes | Hardware video decode |

For each row: is OS Browser explicitly setting it? Defaulting on? Defaulting off?

- [ ] **Step 3: Write §1 of the findings doc**

Create `docs/superpowers/specs/2026-05-09-phase-2-findings.md` with:

```markdown
# Phase 2 Render & Switch Findings

**Date:** 2026-05-09
**Status:** In progress
**Reference:** `docs/superpowers/specs/2026-05-09-phase-2-render.md`

---

## 1. GPU & Compositor Flags Audit

| Flag | Currently set? | Where | Recommended action |
|---|---|---|---|
| --enable-gpu-rasterization | | | |
| --enable-zero-copy | | | |
| --ignore-gpu-blocklist | | | |
| --disable-features=CalculateNativeWinOcclusion | | | |
| --enable-accelerated-video-decode | | | |

(Filled rows for each flag; "Recommended action" = "leave alone" / "add" / "remove" with reason.)

---

## 2. WebContentsView show/hide ordering audit

(Filled in Task 2.)

---

## 3. Scroll event passivity audit

(Filled in Task 3.)

---

## 4. Resize debounce path audit

(Filled in Task 4.)

---

## 5. [TabPerf] instrumentation re-run

(Filled in Task 5 — gated on Phase 1 data.)

---

## 6. Tab-switch flicker root cause

(Filled in Task 6 — synthesizes data from §1–§5 + Phase 1 §4.)

---

## 7. Targeted fix list

(Filled in Task 7.)
```

- [ ] **Step 4: Commit the skeleton + §1**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-2-findings.md
git commit -m "docs: Phase 2 findings — GPU/compositor flags audit"
```

---

## Task 2: Static audit — WebContentsView show/hide ordering

**Files:**
- Read: `packages/main/src/tabs/TabWebContents.ts`
- Modify: `docs/superpowers/specs/2026-05-09-phase-2-findings.md` (fill §2)

Goal: identify whether the current `showTabView` order causes a brief moment where neither old nor new view is composited (white flash).

- [ ] **Step 1: Read `showTabView` carefully**

Specifically, look at the loop:
```ts
for (const [id, view] of tabViews) {
  if (id === tabId) {
    view.setVisible(true);
  } else if (id === pipTabId) {
    // ...
  } else {
    view.setVisible(false);
  }
}
```

Note: this loop iterates Map entries in insertion order. The new view's `setVisible(true)` may happen AFTER the old view's `setVisible(false)`, depending on insertion order. That gap is the flicker window.

- [ ] **Step 2: Determine the actual insertion order vs the desired show-then-hide order**

The desired order is: new view visible FIRST, then old view hidden. Walk through the code; confirm whether insertion-order in `tabViews` Map maps to the right behaviour by accident, or whether we need explicit two-pass logic.

- [ ] **Step 3: Write §2 of the findings doc**

Document one of three outcomes:
- "**Already correct:** new view always shown before old view hidden — no fix needed"
- "**Race exists, accidentally OK:** insertion order happens to keep new visible before old hidden, but it's fragile — propose explicit two-pass"
- "**Race exists, causes flicker:** confirm with manual recording (Phase 1 §4); fix needed"

- [ ] **Step 4: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-2-findings.md
git commit -m "docs: Phase 2 §2 — WebContentsView show/hide order audit"
```

---

## Task 3: Static audit — scroll event passivity

**Files:**
- Read: `packages/renderer/src/**/*.tsx`, `packages/preload/src/**/*.ts`
- Modify: `docs/superpowers/specs/2026-05-09-phase-2-findings.md` (fill §3)

Goal: any non-passive `wheel` / `touchmove` / `scroll` listeners block the scroll path on the main thread.

- [ ] **Step 1: Search for scroll/wheel/touch listeners**

Run:
```powershell
Select-String -Path "packages\renderer\src\**\*.tsx","packages\renderer\src\**\*.ts","packages\preload\src\**\*.ts" -Pattern "addEventListener.*(wheel|touchmove|scroll)"
```

- [ ] **Step 2: For each match, check the third argument (passive)**

Three possibilities per call:
- `addEventListener('wheel', handler)` — defaults to non-passive in older browsers, passive in modern. **Risky — make explicit.**
- `addEventListener('wheel', handler, false)` — explicitly non-passive. **Bad — change to `{ passive: true }`.**
- `addEventListener('wheel', handler, { passive: true })` — explicit passive. **Good.**

- [ ] **Step 3: Walk into the WebContentsView content**

The renderer bundle handles the chrome (sidebar, tabs, omnibar). The WebContentsView content is per-page from third-party sites — we can't change those. But our own injected scriptlets (ad blocker scriptlets, password-save prompt, etc.) MIGHT add scroll listeners. Search:
```powershell
Select-String -Path "packages\main\src\**\*.ts" -Pattern "addEventListener.*(wheel|touchmove|scroll)"
```

- [ ] **Step 4: Write §3 of findings doc**

For each listener: file:line, is it passive, recommendation. If all are passive or harmless, note "audit clean".

- [ ] **Step 5: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-2-findings.md
git commit -m "docs: Phase 2 §3 — scroll passivity audit"
```

---

## Task 4: Static audit — resize debounce path

**Files:**
- Read: `packages/main/src/tabs/TabWebContents.ts`, `packages/renderer/src/components/KenteSystem/*`, `packages/preload/src/index.ts`
- Modify: `docs/superpowers/specs/2026-05-09-phase-2-findings.md` (fill §4)

Goal: when the Kente sidebar collapses/expands, does each pixel of width change trigger a separate `resizeAllViews` call? If yes, that's a resize storm — fix with debounce.

- [ ] **Step 1: Trace the chain**

The sidebar lives in the renderer. As it animates, its width changes. The width is reported to main via IPC. Main calls `setChromeLeftOffset`, which calls `resizeAllViews`.

Find every callsite of `setChromeLeftOffset` (likely in `packages/main/src/ipc/...`). Find what the renderer sends — is it on every animation frame, or only on animation end?

- [ ] **Step 2: Check renderer side — width reporting cadence**

In `packages/renderer/src/components/KenteSystem/KenteSidebar.tsx` (or similar), find where the sidebar reports its width to main. Is it:
- Once per animation frame (60 calls per second during a 1s collapse) — **needs debounce**
- ResizeObserver firing on every reflow — **needs debounce**
- Only on transitionend / animationend — **already debounced**

- [ ] **Step 3: Recommend a fix if needed**

Two options:
- **Renderer-side debounce:** in the sidebar component, throttle the IPC emit to ~16ms intervals
- **Main-side debounce:** in `setChromeLeftOffset`, schedule `resizeAllViews` via `requestAnimationFrame`-equivalent (`setImmediate` + dedup)

Recommend whichever is cheaper to land. Renderer-side is usually simpler (single component, single emitter).

- [ ] **Step 4: Write §4 of findings doc**

- [ ] **Step 5: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-2-findings.md
git commit -m "docs: Phase 2 §4 — resize debounce path audit"
```

---

## Data Gate Reached

**STOP HERE if Phase 1 §4 has not landed.**

Tasks 1–4 are pure static audit — they don't depend on runtime data. Tasks 5+ require:
- Phase 1 findings §4 (scroll/switch observations from the user's hands-on session)
- Re-instrumented `[TabPerf]` data on production build

Until both land, the rest of this plan is on hold. The static audit produces a clear shortlist of suspects; data tells us which suspects are real.

---

## Task 5: Re-instrument & re-measure tab perf

**Files:**
- Modify: `packages/main/src/tabs/TabWebContents.ts` (re-add the instrumentation from Phase 0, commit `6b4c587`)
- Build: `npm run build:main` + `npm run package`
- Run: production binary against the 15-site test matrix

Goal: capture the missing Phase 0 §4 data — median/p95 of `create`, `show`, `first-load`, `resize-all` — against the production binary.

- [ ] **Step 1: Re-apply the Phase 0 instrumentation to TabWebContents.ts**

The instrumentation was committed at `6b4c587` and stripped at `6362f3d`. Cherry-pick or hand-apply the 21-line diff:

```ts
// After `const tabViews = new Map<string, WebContentsView>();`
// ── TEMPORARY: Phase 2 timing instrumentation ──
const tabPerfTimers = new Map<string, number>();
function tabPerfLog(event: string, tabId: string, durationMs: number): void {
  console.log(`[TabPerf] ${event} tab=${tabId} dur=${durationMs.toFixed(2)}ms`);
}
// ── END TEMPORARY ──
```

Plus the timing wrappers in `createTabView`, `showTabView`, `resizeAllViews`. Same as Phase 0 Task 2 of `2026-05-09-phase-0-audit.md`.

- [ ] **Step 2: Build production**

```powershell
npm run package
```

This creates a fresh `out/win-unpacked/OS Browser.exe` with the instrumentation.

- [ ] **Step 3: Run the OS Browser audit script against the new build**

```powershell
powershell -NoProfile -File scripts\audit-osbrowser-launch.ps1
```

The audit navigates 15 sites; the `[TabPerf]` console output will appear in the OS Browser binary's main-process console (not the script output). To capture: launch the binary manually with stdout to a file:

```powershell
& '.\out\win-unpacked\OS Browser.exe' --remote-debugging-port=9223 --user-data-dir=$env:TEMP\osb-perf 2>&1 | Tee-Object -FilePath .\osb-tabperf.log &
```
Then in another shell run the audit script. Stop the binary after.

- [ ] **Step 4: Parse the log into median/p95 stats**

Run:
```powershell
$lines = Get-Content .\osb-tabperf.log | Where-Object { $_ -match '\[TabPerf\]' }
foreach ($event in @('create', 'show', 'first-load', 'resize-all')) {
  $values = $lines | Where-Object { $_ -match "\[TabPerf\] $event" } | ForEach-Object {
    if ($_ -match 'dur=([\d.]+)ms') { [double]$matches[1] }
  } | Sort-Object
  if ($values.Count -gt 0) {
    $median = $values[[int]($values.Count / 2)]
    $p95 = $values[[int]($values.Count * 0.95)]
    "{0,-12} median={1,8:N2}ms  p95={2,8:N2}ms  samples={3}" -f $event, $median, $p95, $values.Count
  }
}
```

- [ ] **Step 5: Update audit-results.md §4 AND phase-2-findings.md §5**

- [ ] **Step 6: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-audit-results.md docs/superpowers/specs/2026-05-09-phase-2-findings.md
git commit -m "docs: Phase 0 §4 + Phase 2 §5 — tab perf timing data"
```

---

## Task 6: Synthesize tab-switch flicker root cause

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-2-findings.md` (fill §6)

Goal: with §1–§5 + Phase 1 §4 in hand, identify the specific root cause(s) of any visible flicker or jank.

- [ ] **Step 1: Cross-reference Phase 1 §4 observations against §1–§4 audit findings**

For each subjective complaint (e.g. "white flash on tab switch", "scroll choppy on NYTimes"), pick the most likely root cause from the audits. Examples:
- "white flash" → §2 show/hide order
- "scroll choppy" → §3 non-passive listener OR §1 missing GPU flag
- "sidebar collapse jank" → §4 resize storm

- [ ] **Step 2: Write §6 — root cause analysis**

For each observed problem: write 1 paragraph explaining the most likely cause and confidence level (High / Medium / Low). Note any cases where the audits found NO smoking gun — those are unknowns and need deeper investigation.

- [ ] **Step 3: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-2-findings.md
git commit -m "docs: Phase 2 §6 — root cause analysis of render/switch gaps"
```

---

## Task 7: Land targeted fixes

**Files:** Varies based on findings.

For each root cause from §6 with **High** confidence, land a fix. Each fix is its own commit. Examples of likely fixes:

**If §1 found missing GPU flags:**
- Edit `packages/main/src/main.ts` to add the missing `app.commandLine.appendSwitch(...)` lines
- One commit per flag

**If §2 found show/hide race:**
- Edit `showTabView` in `TabWebContents.ts` to do explicit two-pass: show new view first, await `nextTick`, hide others
- One commit

**If §3 found non-passive scroll listener:**
- Edit the listener call site to add `{ passive: true }` option
- One commit per listener

**If §4 found resize storm:**
- Add a `requestAnimationFrame`-equivalent debounce in `setChromeLeftOffset` OR throttle the renderer's IPC emit
- One commit

**Medium and Low confidence root causes get deferred to a Phase 2B plan, not landed inline.**

- [ ] **Step 1: For each High-confidence fix, write a small TDD-style test if possible**

Many of these (GPU flags, listener options) are config-style changes hard to unit-test. For those, the test plan is "manually re-record tab switch + scroll on the affected site, confirm visible improvement". Note this in the findings doc per fix.

- [ ] **Step 2: Land each fix as its own commit**

```powershell
git add <file>
git commit -m "perf(<area>): <specific change> — fixes <symptom>"
```

- [ ] **Step 3: Update §7 of findings.md as each fix lands**

Add the fix to §7 with status "Landed at <SHA>".

---

## Task 8: Re-measure & validate

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-2-findings.md` (validate fixes worked)

After Task 7's fixes land:

- [ ] **Step 1: Rebuild production**

```powershell
npm run package
```

- [ ] **Step 2: Re-run the audit-osbrowser-launch.ps1 with re-instrumented build**

(Same as Task 5 Step 3.)

- [ ] **Step 3: Re-run the manual scroll/switch observations from Phase 1 §4**

For each gap observed in Phase 1, manually re-test in the new build. Compare side-by-side with Chrome. Note before/after.

- [ ] **Step 4: Confirm acceptance criteria**

The Phase 2 master design § acceptance criteria:
1. Video recording shows tab swap indistinguishable from Chrome (<16ms perceived).
2. 60fps scroll on NYTimes front page.
3. No visible jank when collapsing/expanding the Kente sidebar.

For each: PASS / PARTIAL: <details> / FAIL: <details>.

- [ ] **Step 5: Commit validation results**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-2-findings.md
git commit -m "docs: Phase 2 §7 — fix validation results"
```

---

## Task 9: Strip Task 5 instrumentation

**Files:**
- Modify: `packages/main/src/tabs/TabWebContents.ts`

Same cleanup as Phase 0 Task 9. Remove the temporary `[TabPerf]` block. Verify build green.

- [ ] **Step 1: Strip lines re-added in Task 5 Step 1**

- [ ] **Step 2: Build and verify**

```powershell
npm run build:main
```

- [ ] **Step 3: Confirm no `TabPerf` references remain**

```powershell
Select-String -Path "packages\main\src\tabs\TabWebContents.ts" -Pattern "TabPerf"
```
Expected: no matches.

- [ ] **Step 4: Commit**

```powershell
git add packages/main/src/tabs/TabWebContents.ts
git commit -m "chore: remove Phase 2 timing instrumentation"
```

---

## Task 10: Tag completion + handoff

**Files:** None (review only)

- [ ] **Step 1: Update Phase 2 findings doc Status**

Change `**Status:** In progress` → `**Status:** Complete` in `phase-2-findings.md`.

- [ ] **Step 2: Tag**

```powershell
git tag phase-2-render-complete
git push origin phase-2-render-complete
```
(Skip the push step until user approval.)

- [ ] **Step 3: Hand off to user**

Output to user:
> "Phase 2 complete. Fixes landed (count: X). Acceptance criteria status: <PASS/PARTIAL/FAIL on each>. Next phase: Phase 3 page-load speed — focused on Slack +140% LCP and YouTube +132% LCP regressions identified in Phase 0."

Wait for approval before starting Phase 3 plan.

---

## Self-Review Checklist (already run)

- ✅ **Spec coverage:** Tasks 1–4 cover the static side of the master design's Phase 2 scope (GPU flags, show/hide ordering, scroll passivity, resize debounce). Tasks 5–8 cover the runtime side (instrumentation, root cause, fixes, validation). Acceptance criteria explicitly checked in Task 8 Step 4.
- ✅ **Placeholder scan:** No "TBD"/"appropriate fix" patterns. Where fix specifics are genuinely unknown (Task 7), the plan documents the conditional logic ("If §1 found missing flags, do X") rather than placeholder language.
- ✅ **Type consistency:** File paths, function names (`createTabView`, `showTabView`, `resizeAllViews`, `setChromeLeftOffset`) match `TabWebContents.ts`. Commit SHAs `6b4c587` (Phase 0 instrumentation) and `6362f3d` (Phase 0 cleanup) verified against actual git log.
- ✅ **Data gate explicit:** The plan opens with a "Data Gate" section that names the two prerequisites (Phase 1 §4 + re-instrumented [TabPerf]) and tells the executor to stop after Task 4 if either is missing. No silent placeholders later.
