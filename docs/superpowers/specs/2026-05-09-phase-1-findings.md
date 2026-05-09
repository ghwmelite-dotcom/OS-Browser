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

Walked in OS Browser side-by-side with Chrome.

### Downloads (5 items)
- [ ] Progress bar with ETA
- [ ] "Open containing folder" right-click works
- [ ] "Show in folder" right-click works
- [ ] Pause/resume during download
- [ ] Persistent downloads shelf or panel

### Find-in-page (4 items)
- [ ] Match count shown ("3 of 12")
- [ ] Next/previous navigation buttons
- [ ] All matches highlighted
- [ ] Case-sensitive toggle

### Autofill (3 items)
- [ ] Address autofill behavior matches expected (govt-use default)
- [ ] Payment autofill behavior matches expected (govt-use default)
- [ ] Password manager parity with Chrome

### Context menu (5 items)
- [ ] "Search image with default engine"
- [ ] "Translate page"
- [ ] "View image source"
- [ ] "Save link as"
- [ ] "Copy link text"

### Keyboard shortcuts (8 items)
- [ ] Ctrl+L (omnibar), Ctrl+T (new tab), Ctrl+W (close)
- [ ] Ctrl+Shift+T (reopen closed)
- [ ] Ctrl+1..9 (jump to tab N)
- [ ] Ctrl+Tab / Ctrl+Shift+Tab (cycle)
- [ ] Ctrl+R / Ctrl+Shift+R (reload / hard reload)
- [ ] Alt+← / Alt+→ (back/forward)
- [ ] F11, F12, Esc
- [ ] Ctrl+0, Ctrl+P

### Tabs (3 items)
- [ ] Middle-click to close
- [ ] Drag to reorder
- [ ] Drag-out to new window

### Address bar (2 items)
- [ ] Autocomplete from history + bookmarks
- [ ] Paste-and-go

For each ❌ item, add a one-line description of how OS Browser differs from Chrome.

---

## 6. Phase 1 Fix List

(Compiled in Task 11.)

---

## 7. Recommendation for Phase 1B Fix Plan

(Filled in Task 11.)
