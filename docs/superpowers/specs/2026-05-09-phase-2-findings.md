# Phase 2 Render & Switch Findings

**Date:** 2026-05-09
**Status:** Static audits complete; runtime data gated on Phase 1 §4 + re-instrumented [TabPerf]
**Plan:** `docs/superpowers/plans/2026-05-09-phase-2-render.md`

---

## 1. GPU & Compositor Flags Audit

**Finding:** OS Browser passes **zero** Chromium command-line switches. Verified via:
```
Select-String packages\main\src\**\*.ts -Pattern "appendSwitch|appendArgument|disableHardwareAcceleration"
```
No matches anywhere in main process. The only "GPU" matches in the codebase are WebGL fingerprint-spoofing strings in `services/adblock-engine.ts` and `services/privacy-engine.ts` — unrelated to perf flags.

**Implication:** OS Browser uses pure Electron 33 (Chromium 130) defaults. For this version, the relevant defaults are:

| Flag | Default in Electron 33 | OS Browser status |
|---|---|---|
| `--enable-gpu-rasterization` | ON | inherits ON ✅ |
| `--enable-zero-copy` | ON | inherits ON ✅ |
| `--enable-features=UseSkiaRenderer` | ON | inherits ON ✅ |
| `--enable-accelerated-video-decode` | ON | inherits ON ✅ |
| `--ignore-gpu-blocklist` | OFF | inherits OFF |
| `--disable-features=CalculateNativeWinOcclusion` | OFF | inherits OFF |

**Recommended actions:**
- **No fixes required for the "missing flag" hypothesis.** The defaults are good.
- **One optional add worth A/B testing:** `--disable-features=CalculateNativeWinOcclusion`. This is a known Electron-on-Windows recommendation — when the OS Browser window is partly occluded by another window, Chromium would otherwise stall checking native occlusion state. Disabling has no risk for our audience and modestly improves perceived responsiveness. Add at top of `packages/main/src/main.ts` BEFORE `app` is used.
- **Do NOT add `--ignore-gpu-blocklist`.** Some civil-servant hardware has older drivers blocked for crash safety; forcing GPU could cause unrecoverable crashes on field machines.

**Status:** No required fixes. One optional one-line add as a candidate for Task 7.

---

## 2. WebContentsView Show/Hide Ordering Audit

**Finding:** `showTabView` in `packages/main/src/tabs/TabWebContents.ts:80–98` has a **structural race**. The current implementation:

```ts
export function showTabView(tabId: string, mainWindow?: BrowserWindow): void {
  for (const [id, view] of tabViews) {
    if (id === tabId) {
      view.setVisible(true);
    } else if (id === pipTabId) {
      view.setVisible(true);
      // ...
    } else {
      view.setVisible(false);
    }
  }
}
```

**The race:** `tabViews` is iterated in Map insertion order. If the user has tabs T1, T2, T3, T4, T5 in that insertion order and switches active from T1 to T5, the loop visits T1 first (hides it), then T2, T3, T4 (hides them), and ONLY THEN reaches T5 (shows it). Between hiding T1 and showing T5, all tabs are invisible.

**In practice:** Electron may batch `setVisible` calls within a tick, so the race may not be visually observable. But it is structurally incorrect and fragile. Any future change that introduces an async point in the loop (e.g. an `await` for animation timing) would expose a real white-flash bug.

**Recommended fix (one-liner-ish, ~6 lines):** explicit two-pass:
```ts
export function showTabView(tabId: string, mainWindow?: BrowserWindow): void {
  // Pass 1: show the new active view (and PiP if any) FIRST
  const newView = tabViews.get(tabId);
  if (newView) newView.setVisible(true);
  if (pipTabId && pipTabId !== tabId) {
    const pipView = tabViews.get(pipTabId);
    if (pipView) {
      pipView.setVisible(true);
      if (mainWindow) {
        try {
          mainWindow.contentView.removeChildView(pipView);
          mainWindow.contentView.addChildView(pipView);
        } catch {}
      }
    }
  }
  // Pass 2: hide everything else
  for (const [id, view] of tabViews) {
    if (id !== tabId && id !== pipTabId) view.setVisible(false);
  }
}
```

**Status:** Recommended fix for Task 7. Confirm with Phase 1 §4 video evidence whether the structural race manifests as visible flicker.

---

## 3. Scroll Event Passivity Audit

**Finding:** Renderer scroll/wheel/touch listeners are clean. Five matches in renderer, zero in main, zero in preload:

| File:line | Event | Passive option | Verdict |
|---|---|---|---|
| `TabBar.tsx:127` | scroll | `{ passive: true }` | ✅ |
| `Game2048.tsx:190` | touchstart | `{ passive: true }` | ✅ |
| `Game2048.tsx:191` | touchend | `{ passive: true }` | ✅ |
| `SolitaireGame.tsx:227` | touchmove | `{ passive: true }` | ✅ |
| `SolitaireGame.tsx:228` | touchend | (none) | ⚠️ inconsistent — but touchend doesn't block scroll, so harmless |
| `ReadingModePanel.tsx:93` | scroll | `{ passive: true }` | ✅ |

**Critical context:** these listeners are in OS Browser's chrome (tab strip, games, reading mode). The actual page scroll happens INSIDE the WebContentsView, which is third-party content out of our control. Page-level scroll perf is a function of the page itself plus Chromium's defaults.

**Recommended actions:**
- **None required for perf.** All chrome listeners are passive.
- **Optional cosmetic:** add `{ passive: true }` to `SolitaireGame.tsx:228` for consistency with line 227. Pure stylistic, no perf impact.

**Status:** No fixes required. The Phase 0 Slack/YouTube LCP regressions are not caused by main-thread scroll listener blocking.

---

## 4. Resize Debounce Path Audit

**Finding:** The chain is well-debounced by design.

**Path:**
1. `KenteSidebar.tsx` `useEffect` (deps: `state, activePanel, isSmallScreen, effectiveWidth`)
2. → calls `window.osBrowser.setChromeLeft(leftOffset)` over IPC
3. → main receives via `webviews:set-chrome-left` handler in `handlers.ts:210`
4. → calls `setChromeLeftOffset` in `TabWebContents.ts:22`
5. → which has a value-change guard: `if (clamped === currentLeftOffset) return;`
6. → otherwise calls `resizeAllViews` which iterates and `setBounds` each view

**Why it's debounced:**
- All four useEffect deps are **discrete**, not animated. `effectiveWidth` is computed as `activeFeature?.surfaces.sidebar?.defaultPanelWidth ?? panelWidth` — a value from the active feature's config, NOT a continuously-animated number.
- Each sidebar state transition (collapse → expand, switch panel) fires the IPC **once**.
- The main-side value-change guard would catch any duplicate calls, even if they happened.

**Open question for Task 6 (when Phase 1 §4 lands):** is there a *visual* mismatch between the CSS-animated panel slide-in (e.g. 300ms transition) and the WebContentsView's instant snap to the new left bound? In theory:
- Panel CSS-animates from 0 → 280px width over 300ms (slide-in)
- WebContentsView immediately repositions to left=328px (new offset)
- For the 300ms animation, the page area is at its final position while the panel is still mid-slide

If this looks like the page "pops" while the panel slides, the fix would be to ALSO animate the WebContentsView bounds (would need a tick-driven `setBounds` loop) OR tie the IPC call to the animation's transitionend event.

**Recommended actions:**
- **No required fix.** The pipeline is correctly debounced.
- **Conditional fix for Task 7 IF Phase 1 §4 confirms a visual pop:** drive the WebContentsView's `setBounds` via animation frames during sidebar transitions to match the CSS animation timing.

**Status:** Static audit clean. Runtime check pending Phase 1 §4.

---

## 5. [TabPerf] Instrumentation Re-run

**Status: gated on production rebuild + re-instrumentation (Task 5).**

The instrumentation was committed at `6b4c587` (Phase 0) and stripped at `6362f3d`. To capture Phase 0 §4's missing data:
1. Re-apply the 21-line diff from `6b4c587` to `TabWebContents.ts`
2. Run `npm run package` to produce a fresh `out/win-unpacked/OS Browser.exe`
3. Run `audit-osbrowser-launch.ps1` against the new binary
4. Parse `[TabPerf]` lines into median + p95

Will execute once Phase 1 manual tasks land.

---

## 6. Tab-Switch Flicker Root Cause

**Status: gated on Phase 1 §4 (scroll/switch observations).**

Synthesis of §1–§5 + Phase 1 §4 will identify which of the static-audit findings are real causes of observed jank vs. theoretical-only.

**Suspects ranked by static-audit confidence:**
1. **§2 show/hide race** — High structural confidence, unconfirmed visual evidence
2. **§4 panel-vs-WebContentsView animation mismatch** — Medium structural confidence, unconfirmed visual evidence
3. **§1 missing CalculateNativeWinOcclusion flag** — Low confidence; only matters when window is partly occluded

---

## 7. Targeted Fix List

**Status: gated on §6.**

Once the data lands, fixes will go here with one bullet per fix and commit SHA after landing.

**Pre-identified candidates from §1–§4 (will land if Phase 1 §4 confirms relevance):**

- **§1 candidate:** Add `app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')` to `packages/main/src/main.ts` before `app` is used. ~1 line. Risk: minimal.
- **§2 candidate:** Refactor `showTabView` to explicit two-pass. ~6 lines net. Risk: low (Pass 1 must execute before Pass 2 — done synchronously, no async).
- **§3 candidate:** Add `{ passive: true }` to `SolitaireGame.tsx:228`. Cosmetic only.
- **§4 candidate (conditional):** Drive `WebContentsView.setBounds` via rAF during sidebar transitions. ~30 lines. Risk: medium (introduces animation logic into geometry path).
