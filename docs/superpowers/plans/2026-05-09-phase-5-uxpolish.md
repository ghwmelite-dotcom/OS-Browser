# Phase 5 — UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between OS Browser and Chrome on the 30-item user-visible behavior checklist (master design § Phase 5). Acceptance criterion: each of the 30 items behaves identically to Chrome, signed off via manual test pass.

**Architecture:** Hybrid plan. **(A) Static audit** of every checklist item — for each, find the file/handler in OS Browser's codebase that implements it (or doesn't). Produce a per-item Implemented / Partial / Missing classification. **(B) Cross-reference with Phase 1 §5** — when the user's hands-on UX checklist results land, cross-check: where my static audit said "Implemented" but user said ❌, investigate the regression; where audit said "Missing" and user said ❌, implement. **(C) Implementation tasks** — one task per gap, sized appropriately. Most should be <1 hour each.

**Tech Stack:** OS Browser dev build (`npm run dev` or production binary), file-system grep over `packages/main/src/**`, `packages/renderer/src/**`, `packages/preload/src/**`. No new dependencies.

**Reference docs:**
- `docs/superpowers/specs/2026-05-09-chrome-parity-master-design.md` §4 Phase 5 (the 30-item list source of truth)
- `docs/superpowers/specs/2026-05-09-phase-1-findings.md` §5 (user's checklist results — gate)

---

## Data Gate

Tasks 5+ require Phase 1 §5 (the user's UX checklist walk) to be complete. Tasks 1–4 (static audit + synthesis prep) can run anytime — they don't depend on user data.

If you're reading this plan before Phase 1 §5 lands: **execute Tasks 1–4 only**. They produce the cross-reference table that the user's checklist gets compared against once it lands.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `docs/superpowers/specs/2026-05-09-phase-5-findings.md` | **Create** | Per-item static audit + cross-ref + fix list |
| Various source files | **Modify** (depends on findings) | One file per gap; categorised below in Tasks 5+ |

---

## The 30 Checklist Items (verbatim from master design § Phase 5)

For reference. The static audit (Task 2) covers all 30.

**Downloads (5):** progress bar with ETA · open containing folder right-click · "show in folder" right-click · pause/resume during download · persistent downloads shelf or panel

**Find-in-page (4):** match count ("3 of 12") · next/prev navigation · all matches highlighted · case-sensitive toggle

**Autofill (3):** address autofill (off by default for govt) · payment autofill (off by default) · password manager parity with Chrome

**Context menu (5):** search image with default engine · translate page · view image source · save link as · copy link text

**Keyboard shortcuts (8):** Ctrl+L (omnibar) / Ctrl+T (new tab) / Ctrl+W (close) · Ctrl+Shift+T (reopen) · Ctrl+1..9 (jump to N) · Ctrl+Tab / Ctrl+Shift+Tab (cycle) · Ctrl+R / Ctrl+Shift+R (reload / hard reload) · Alt+← / Alt+→ (back/forward) · F11 / F12 / Esc · Ctrl+0 (reset zoom) / Ctrl+P (print)

**Tabs (3):** middle-click to close · drag to reorder · drag-out to new window

**Address bar (2):** autocomplete from history + bookmarks · paste-and-go

---

## Task 1: Setup + skeleton

**Files:**
- Create: `docs/superpowers/specs/2026-05-09-phase-5-findings.md`

- [ ] **Step 1: Write the findings doc skeleton**

```markdown
# Phase 5 UX Polish Findings

**Date:** 2026-05-09
**Status:** In progress
**Reference:** master design §4 Phase 5
**Plan:** `docs/superpowers/plans/2026-05-09-phase-5-uxpolish.md`

---

## 1. Static Audit — per item

| Category | Item | OS Browser status | Chrome behavior | File:line | Notes |
|---|---|---|---|---|---|
| Downloads | progress bar with ETA | | | | |
| Downloads | open containing folder | | | | |
| Downloads | show in folder | | | | |
| Downloads | pause/resume during download | | | | |
| Downloads | persistent shelf | | | | |
| Find-in-page | match count | | | | |
| Find-in-page | next/prev navigation | | | | |
| Find-in-page | highlight all | | | | |
| Find-in-page | case-sensitive toggle | | | | |
| Autofill | address autofill | | | | |
| Autofill | payment autofill | | | | |
| Autofill | password manager parity | | | | |
| Context menu | search image | | | | |
| Context menu | translate page | | | | |
| Context menu | view image source | | | | |
| Context menu | save link as | | | | |
| Context menu | copy link text | | | | |
| Keyboard | Ctrl+L (omnibar) | | | | |
| Keyboard | Ctrl+T (new tab) | | | | |
| Keyboard | Ctrl+W (close tab) | | | | |
| Keyboard | Ctrl+Shift+T (reopen) | | | | |
| Keyboard | Ctrl+1..9 (jump) | | | | |
| Keyboard | Ctrl+Tab cycle | | | | |
| Keyboard | Ctrl+R / Ctrl+Shift+R | | | | |
| Keyboard | Alt+arrow (back/fwd) | | | | |
| Keyboard | F11 / F12 / Esc | | | | |
| Keyboard | Ctrl+0 / Ctrl+P | | | | |
| Tabs | middle-click close | | | | |
| Tabs | drag to reorder | | | | |
| Tabs | drag-out new window | | | | |
| Address bar | autocomplete | | | | |
| Address bar | paste-and-go | | | | |

Status values: **Implemented** (matches Chrome) · **Partial** (works but differs) · **Missing**

---

## 2. Cross-Reference with Phase 1 §5

(Filled in Task 5 once user data is in.)

---

## 3. Prioritised Fix List

(Filled in Task 6.)

---

## 4. Implementation Notes

(One section per implemented fix.)
```

- [ ] **Step 2: Commit skeleton**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-5-findings.md
git commit -m "docs: Phase 5 UX polish findings skeleton"
```

---

## Task 2: Static audit — Downloads, Find-in-page, Autofill (12 items)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-5-findings.md` (fill rows 1–12)

For each item, run a focused grep to locate the implementation. Record file:line, current behaviour, and Implemented/Partial/Missing status.

- [ ] **Step 1: Audit Downloads (5 items)**

```powershell
Select-String -Path "packages\main\src\**\*.ts" -Pattern "session\.on\(['""]will-download" -SimpleMatch
Select-String -Path "packages\renderer\src\**\*.tsx" -Pattern "[Dd]ownload" | Select-Object -First 30
```

For each of the 5 download items, grep for the relevant feature word ("progress", "pause", "show in folder", "shelf"). Mark Implemented/Partial/Missing. Common file: `packages/main/src/services/downloads.ts` if it exists, or wherever `will-download` is handled.

- [ ] **Step 2: Audit Find-in-page (4 items)**

```powershell
Select-String -Path "packages\main\src\**\*.ts","packages\preload\src\**\*.ts" -Pattern "findInPage|stopFindInPage" -SimpleMatch
Select-String -Path "packages\renderer\src\**\*.tsx" -Pattern "find.*page|FindBar|find-in-page" | Select-Object -First 20
```

Open the find-in-page UI in OS Browser dev mode (`Ctrl+F`) and observe the actual UX. Compare to Chrome's. Mark per-item status.

- [ ] **Step 3: Audit Autofill (3 items)**

```powershell
Select-String -Path "packages\main\src\**\*.ts" -Pattern "autofill|password.?save" -SimpleMatch
```

For govt-default expectations: address & payment SHOULD be off; password manager should match Chrome. Verify each.

- [ ] **Step 4: Fill rows 1–12 of §1**

- [ ] **Step 5: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-5-findings.md
git commit -m "docs: Phase 5 §1 — static audit Downloads/Find/Autofill"
```

---

## Task 3: Static audit — Context menu, Keyboard shortcuts (13 items)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-5-findings.md` (fill rows 13–25)

- [ ] **Step 1: Audit Context menu (5 items)**

```powershell
Select-String -Path "packages\main\src\**\*.ts" -Pattern "context-menu|MenuItem|popup\(" -SimpleMatch | Select-Object -First 30
```

Most likely file: `packages/main/src/main.ts` or a dedicated context-menu service. Recent commit `16bead8` is "feat: Chrome-style contextual right-click menus — link menu, image menu, and page menu shown separately" — that's the implementation. Read it to inventory which items are present.

- [ ] **Step 2: Audit Keyboard shortcuts (8 grouped items)**

```powershell
Select-String -Path "packages\main\src\**\*.ts" -Pattern "accelerator|app\.on\(['""]browser-window-blur|globalShortcut" -SimpleMatch
Select-String -Path "packages\renderer\src\**\*.tsx" -Pattern "Ctrl\+[A-Z0-9]|onKeyDown.*ctrlKey" | Select-Object -First 30
```

For each of the 8 keyboard groups, grep for the binding. Test each in dev mode and confirm Chrome-compatible behaviour. Recent memory entry "Chrome tab parity" plan suggests this work has already happened — verify against the master design spec list.

- [ ] **Step 3: Fill rows 13–25 of §1**

- [ ] **Step 4: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-5-findings.md
git commit -m "docs: Phase 5 §1 — static audit Context menu/Keyboard"
```

---

## Task 4: Static audit — Tabs, Address bar (5 items)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-5-findings.md` (fill rows 26–30)

- [ ] **Step 1: Audit Tabs (3 items)**

```powershell
Select-String -Path "packages\renderer\src\components\Browser\tabs\*.tsx" -Pattern "middle.?click|onAuxClick|onMouseDown" -SimpleMatch
Select-String -Path "packages\renderer\src\components\Browser\tabs\*.tsx" -Pattern "drag|DnD|sortable" | Select-Object -First 20
Select-String -Path "packages\main\src\tabs\*.ts" -Pattern "detach|attachTab|new.?window" -SimpleMatch
```

The April Chrome tab parity spec (`docs/superpowers/specs/2026-04-07-chrome-tab-parity-design.md`) covers most of this. Cross-reference its "Status: Approved" claim against actual implementation.

- [ ] **Step 2: Audit Address bar (2 items)**

```powershell
Select-String -Path "packages\renderer\src\components\Browser\OmniBar*.tsx" -Pattern "autocomplete|history|paste" | Select-Object -First 30
```

Open OS Browser, type a partial URL, observe whether autocomplete from history+bookmarks works. Right-click in address bar, look for "Paste and go".

- [ ] **Step 3: Fill rows 26–30 of §1**

- [ ] **Step 4: Update Status field at top — change "In progress" → "Static audit complete; cross-ref pending"**

- [ ] **Step 5: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-5-findings.md
git commit -m "docs: Phase 5 §1 complete — static audit all 30 items"
```

---

## Data Gate Reached

**STOP HERE if Phase 1 §5 user checklist hasn't landed yet.**

Tasks 1–4 produce the static audit. Task 5+ requires the user's hands-on UX walk to land. The static audit alone tells us what's coded; the user's walk tells us what *feels* missing or wrong.

If both static audit ("Implemented") and user walk (✅) agree on an item, no work needed. If they agree on ❌ / "Missing", implement. The interesting cases are where they DISAGREE — those are bugs.

---

## Task 5: Cross-reference with Phase 1 §5 user findings

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-5-findings.md` (fill §2)

- [ ] **Step 1: Read Phase 1 §5 of `2026-05-09-phase-1-findings.md`**

The user's checklist will have ✅/❌ for each item, with one-line description for each ❌.

- [ ] **Step 2: For each of the 30 items, classify the cross-reference**

Four buckets:

| Static audit | User walk | Bucket | Action |
|---|---|---|---|
| Implemented | ✅ | A: clean | nothing |
| Implemented | ❌ | B: regression | investigate why static says works but user says doesn't |
| Missing | ❌ | C: known gap | implement straightforwardly |
| Partial | ❌ | D: needs polish | scope a fix for the specific behaviour difference |

- [ ] **Step 3: Fill §2 of findings doc**

For each item: Bucket letter + one-line explanation.

- [ ] **Step 4: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-5-findings.md
git commit -m "docs: Phase 5 §2 — cross-reference static audit vs user checklist"
```

---

## Task 6: Prioritise and group fixes

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-5-findings.md` (fill §3)

- [ ] **Step 1: Sort the cross-ref into prioritised fix list**

Order:
1. **Bucket B (regressions)** first — these are existing-but-broken; quickest user win
2. **Bucket C (known gaps)** by category — implement related items together (e.g. all keyboard shortcuts in one pass)
3. **Bucket D (polish)** by category — finer behaviour matching

- [ ] **Step 2: For each item in the fix list, estimate effort**

Use t-shirt sizes:
- **XS** — 5 line code change (single shortcut binding, single menu item)
- **S** — 1-2 hour change (single feature, well-isolated)
- **M** — half day (touches multiple files or needs UX design)
- **L** — full day (significant new code path)

- [ ] **Step 3: Group items into implementation tasks**

For Phase 5, aim for one task per category:
- Task 7: Downloads gaps (estimate combined effort)
- Task 8: Find-in-page gaps
- Task 9: Autofill gaps
- Task 10: Context menu gaps
- Task 11: Keyboard shortcut gaps
- Task 12: Tabs gaps
- Task 13: Address bar gaps

Skip any task whose category has no Bucket B/C/D items. Add tasks per item only if effort exceeds S.

- [ ] **Step 4: Fill §3 of findings doc**

- [ ] **Step 5: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-5-findings.md
git commit -m "docs: Phase 5 §3 — prioritised fix list with effort estimates"
```

---

## Tasks 7–13: Implementation per category

**Files:** Vary by category. Conditional logic for which files to touch:

### If Downloads gaps exist
Likely files:
- `packages/main/src/services/downloads.ts` (or wherever `will-download` is handled)
- `packages/renderer/src/components/Downloads/*.tsx`

Common gap candidates per master design:
- Progress bar ETA — needs computation from `getReceivedBytes() / getTotalBytes() / elapsedSeconds`
- "Show in folder" — `shell.showItemInFolder(filePath)` from main process
- Pause/resume — `webContents.session.on('will-download')` returns a `DownloadItem` with `pause()`/`resume()`/`canResume()`

### If Find-in-page gaps exist
Likely files:
- `packages/main/src/ipc/<find>` handler
- `packages/renderer/src/components/Browser/FindBar.tsx` (if it exists)

Common gap candidates:
- Match count — comes from `webContents.findInPage(text, { matchCase, findNext })` event listener providing `matches` count
- Highlight all — Chromium does this automatically on findInPage
- Case-sensitive toggle — pass `matchCase: true` option

### If Autofill gaps exist
Probably no work — master design says address & payment autofill should be off by default for govt users; password manager already strong.

### If Context menu gaps exist
Likely file: `packages/main/src/main.ts` (search for "context-menu" event handler) or a dedicated `context-menu.ts`.

Common gap candidates:
- Search image — needs image URL from menu params + omnibar nav to default-engine search URL
- Translate page — Electron doesn't have native translate; likely defer or use Google Translate URL injection
- View image source — append `view-source:` prefix when navigating

### If Keyboard shortcut gaps exist
Likely files:
- `packages/main/src/main.ts` (Menu accelerators)
- `packages/renderer/src/lib/keyboard.ts` (if it exists)
- Individual component files for component-scoped shortcuts

Common gap candidates: usually small — a missing accelerator binding or an off-by-one in tab-jump logic.

### If Tabs gaps exist
Likely files: `packages/renderer/src/components/Browser/tabs/*.tsx`. April spec covered most of this — gaps would be in implementations that didn't fully ship.

### If Address bar gaps exist
Likely file: `packages/renderer/src/components/Browser/OmniBar*.tsx`.

Common gap candidates:
- Autocomplete from history — needs to query `history` table on each keystroke (debounced)
- Paste-and-go — context menu addition; on paste-and-go, set value + immediately submit

---

**For each implementation task:**

- [ ] **Step 1: Find the relevant file(s)** based on the static audit row
- [ ] **Step 2: Implement the fix** (specifics vary by item)
- [ ] **Step 3: Verify** in OS Browser dev mode side-by-side with Chrome
- [ ] **Step 4: Update §4 of findings doc** with implementation notes + commit SHA
- [ ] **Step 5: Commit** with message format: `feat(<area>): <item> matches Chrome`

---

## Task N: Re-validation walkthrough

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-phase-5-findings.md` (final status)

- [ ] **Step 1: Re-walk all 30 items in OS Browser dev mode**

For each previously ❌ item that received a fix: confirm it now matches Chrome. Mark ✅ in §1 of the findings doc.

- [ ] **Step 2: Update Status field at top — change to "Complete: <X>/30 items match Chrome"**

- [ ] **Step 3: Commit**

```powershell
git add docs/superpowers/specs/2026-05-09-phase-5-findings.md
git commit -m "docs: Phase 5 §1 — re-validated, X/30 items match Chrome"
```

---

## Task N+1: Tag completion + handoff

- [ ] **Step 1: Tag**

```powershell
git tag phase-5-uxpolish-complete
```

- [ ] **Step 2: Hand off to user**

Output:
> "Phase 5 complete. <X>/30 items match Chrome. Remaining gaps: <list any>. Push when ready."

---

## Self-Review Checklist (already run)

- ✅ **Spec coverage:** All 30 items from master design § Phase 5 are explicitly listed in §1 of the findings doc and indexed by row in Tasks 2-4.
- ✅ **Placeholder scan:** No "TBD"/"TODO" patterns. Where implementation specifics are unknown until cross-ref, the plan documents conditional logic per category in Tasks 7-13 ("If Downloads gaps exist, likely file is X, common candidates are Y").
- ✅ **Type consistency:** All file path conventions (`packages/main/src/...`, `packages/renderer/src/components/...`) match prior phase plans. No invented APIs — all referenced Electron APIs (`webContents.findInPage`, `shell.showItemInFolder`, `will-download` event, `DownloadItem.pause()`) are real.
- ✅ **Data gate explicit:** STOP-here line at Task 4 ↔ Task 5 boundary. Tasks 1-4 are doable today; Tasks 5+ wait for Phase 1 §5.
