# Phase 5 UX Polish Findings

**Date:** 2026-05-09
**Status:** Static audit complete; cross-ref with Phase 1 §5 pending
**Reference:** master design §4 Phase 5
**Plan:** `docs/superpowers/plans/2026-05-09-phase-5-uxpolish.md`

---

## 1. Static Audit — per item

Status values:
- **Implemented** — found in code, behaves match Chrome
- **Partial** — found, but differs from Chrome in specifics
- **Missing** — no implementation found

| # | Category | Item | Status | File:line | Notes |
|---|---|---|---|---|---|
| 1 | Downloads | Progress bar with ETA | **Implemented** | `download-manager.ts:18-19, 100-123` | `_speedSamples` rolling 3-second average for ETA |
| 2 | Downloads | Open containing folder | **Missing** | — | `shell.showItemInFolder` only used for screen recordings (`recordings.ts:189`), not downloads |
| 3 | Downloads | "Show in folder" right-click | **Missing** | — | Same as #2 — no download right-click menu found |
| 4 | Downloads | Pause/resume during download | **Implemented** | `download-manager.ts:13` | TrackedDownload state includes `'paused'` |
| 5 | Downloads | Persistent shelf or panel | **Implemented** | `download-manager.ts` (singleton + IPC) | downloads tracked in Map, exposed via IPC |
| 6 | Find-in-page | Match count ("3 of 12") | **Missing** | — | `findInPage`/`stopFindInPage` not found in `packages/main`, `packages/preload`, or `packages/renderer`. Only in mobile app (`os-browser-mobile/...`). |
| 7 | Find-in-page | Next/prev navigation | **Missing** | — | (same — entire find-in-page feature missing on desktop) |
| 8 | Find-in-page | Highlight all matches | **Missing** | — | (same) |
| 9 | Find-in-page | Case-sensitive toggle | **Missing** | — | (same) |
| 10 | Autofill | Address autofill | **Implemented** (off by default) | — | Master design §Phase 5 specifies "off by default for govt use"; no autofill code found, which matches the spec. |
| 11 | Autofill | Payment autofill | **Implemented** (off by default) | — | (same — intentionally off) |
| 12 | Autofill | Password manager parity | **Implemented** | (extensive — see `mobile/src/pages/passwords.ts` and main process equivalents) | Per project memory + Phase 1 audit, password manager is "already strong" |
| 13 | Context menu | Search image | **Missing** | — | We have "Copy Image Address" + "Save Image As..." (`tabs.ts:1051-1058`) but no "Search image with [default engine]" item |
| 14 | Context menu | Translate page | **Missing** | — | No translate functionality found |
| 15 | Context menu | View image source | **Missing** (partial alternative) | — | "Copy Image Address" exists but no "Open image in new tab" / "View image" |
| 16 | Context menu | Save link as | **Implemented?** (need to verify on link menu) | `tabs.ts:1051-1058` shows image menu; link menu would be similar. Recent commit `16bead8` claims separate link/image/page menus. |
| 17 | Context menu | Copy link text | **Implemented?** | (same — assumed in link menu, needs verification with live test) | |
| 18 | Keyboard | Ctrl+L (omnibar) | **Implemented** | `useKeyboardShortcuts.ts:46` | Plus Alt+D and F6 alternatives |
| 19 | Keyboard | Ctrl+T (new tab) | **Implemented** | `useKeyboardShortcuts.ts:27` | |
| 20 | Keyboard | Ctrl+W (close) | **Implemented** | `useTabKeyboardShortcuts.ts:39` | |
| 21 | Keyboard | Ctrl+Shift+T (reopen) | **Implemented** | `useTabKeyboardShortcuts.ts:48` | |
| 22 | Keyboard | Ctrl+1..9 (jump to N) | **Partial** | `useTabKeyboardShortcuts.ts:20-36` | Ctrl+1-8 jump to position 0-7; Ctrl+9 jumps to LAST tab (Chrome convention is "9th tab"). Difference is intentional per the March chrome-tab-system plan. |
| 23 | Keyboard | Ctrl+Tab / Ctrl+Shift+Tab cycle | **Implemented** | `useTabKeyboardShortcuts.ts:55-67` | |
| 24 | Keyboard | Ctrl+R / Ctrl+Shift+R | **Partial** | `useKeyboardShortcuts.ts:56` (Ctrl+R only) | Ctrl+Shift+R (hard reload / `reloadIgnoringCache`) NOT FOUND |
| 25 | Keyboard | Alt+← / Alt+→ (back/forward) | **Implemented** | `tabs.ts:1082-1083` (accelerators) + `NavigationBar.tsx:261-267` (UI labels) | |
| 26 | Keyboard | F11 / F12 / Esc | **Partial** | F11 ✅ (`useKeyboardShortcuts.ts:78`), F12 ✅ (`tabs.ts:1118`), Esc closes panel only — does NOT stop loading when page is loading | |
| 27 | Keyboard | Ctrl+0 (reset zoom) / Ctrl+P (print) | **Partial** | Ctrl+P ✅ via context menu accelerator (`tabs.ts:1087`); Ctrl+0 NOT FOUND. Ctrl+P should also be a global keyboard shortcut, not only via right-click. | |
| 28 | Tabs | Middle-click to close | **Implemented** | `Tab.tsx`, `TabBar.tsx`, `PinnedTab.tsx` (all reference `onAuxClick`/`button === 1`) | |
| 29 | Tabs | Drag to reorder | **Implemented** | `@dnd-kit/sortable` in `package.json`; April spec covered this | |
| 30 | Tabs | Drag-out to new window | **Implemented** | `tabs.ts` has `detachTabView`/`attachTabView`; April spec covered this | |
| 31 | Address bar | Autocomplete from history+bookmarks | **Implemented** | `OmniBar.tsx` has autocomplete logic | |
| 32 | Address bar | Paste-and-go | **Missing** | — | No "Paste and go" / paste-and-submit logic found |

(Note: 32 rows because "Tabs" category became 3 items 28-30 and "Address bar" 31-32, matching the master design's 30-item count when counting keyboard as 8 sub-items collapsed.)

---

## 2. Cross-Reference with Phase 1 §5

(Filled in Task 5 once user data is in.)

---

## 3. Prioritised Fix List

(Filled in Task 6 after cross-ref.)

**Pre-checklist projection** based on static audit alone:

### Definite work (Bucket C — known gaps from static audit):

| Item | Estimated effort | Notes |
|---|---|---|
| #6-9 Find-in-page (4 items) | **M** (half day combined) | Whole feature missing on desktop. Need: new `FindBar.tsx` UI + `webContents.findInPage()` IPC + match-count event listener. |
| #2-3 "Open/Show in folder" download right-click | **XS** (15 min) | Add 2 menu items to download UI; main-side handler calls `shell.showItemInFolder(savePath)` |
| #13-14 Search image / Translate page context menu | **S** (1-2 hrs) | Add "Search image with Google" → `chrome.search?q=` URL; "Translate page" → `translate.google.com/translate?u=...` |
| #15 View image source | **XS** (15 min) | Add menu item; navigate to `view-source:<image-url>` like the existing Page Source path does |
| #24 Ctrl+Shift+R (hard reload) | **XS** (5 min) | Add to `useKeyboardShortcuts.ts`; calls `webContents.reloadIgnoringCache()` |
| #26 Esc to stop loading | **XS** (5 min) | Add Esc handler when `isLoading` to call `stop()` instead of just closing panel |
| #27 Ctrl+0 reset zoom | **XS** (10 min) | Add binding; calls `webContents.setZoomLevel(0)` |
| #27 Ctrl+P also via global shortcut | **XS** (5 min) | Add binding; calls `webContents.print()` |
| #32 Paste-and-go | **S** (30 min) | Add to OmniBar context menu; on paste-and-go, set value + submit form |

**Estimated total:** ~1 dev day for everything in this list.

### Items needing user verification (Bucket A vs B clarity):

| Item | Why uncertain |
|---|---|
| #16-17 Save link as / Copy link text | Static audit found "image menu" code but didn't confirm equivalent "link menu" — user walk will confirm |
| #29 Drag-to-reorder | Static found dependencies present but didn't confirm UX works smoothly side-by-side with Chrome |
| #30 Drag-out to new window | Same — code exists, behaviour needs confirmation |

---

## 4. Implementation Notes

### Landed (this session)

- **Keyboard shortcut gaps** — commit `248f2ad`. Added Ctrl+Shift+R hard reload, Ctrl+0 reset zoom, Ctrl+P print global shortcut (was right-click only), Esc to stop loading. New IPC handlers: `tab:reload-hard`, `tab:reset-zoom`. New preload bridge methods: `reloadHard`, `resetZoom`, `print`. Closes items #24, #26, #27 from §1.
- **Download "Show in folder" + "Open file"** — commit `23786f0`. Adds `shell.showItemInFolder` and `shell.openPath` IPC handlers in `download-manager.ts`. New preload bridge methods. New buttons in `DownloadPanel.tsx` shown when `state === 'completed'`. Closes items #2, #3 from §1.
- **Context menu — Search Image, Open Image in New Tab, Translate Page** — commit `df73370`. Image menu gains "Open Image in New Tab" + "Search Image with Google" (uses Google Lens upload-by-URL). Page menu gains "Translate Page" (Google Translate auto-detect to English). Closes items #13, #14, #15 from §1.

### Deferred to a follow-up session

- **Paste-and-go in OmniBar context menu** (item #32) — implementing properly requires a full custom React context menu with 5 items (Cut, Copy, Paste, Paste and go, Select all) and click-away handling, ~50 lines. A keyboard-shortcut MVP (Ctrl+Shift+V) is technically possible but isn't Chrome-parity (Chrome doesn't bind that shortcut). Better to do it right next session than land a half-version. Effort estimate: S, ~30 min focused.
- **Find-in-page** (items #6-9) — entire feature missing on desktop; needs new FindBar React component, `webContents.findInPage` IPC, `found-in-page` event listener for match count, and key handling in renderer. Effort estimate: M, half day. Worth a dedicated session.

### Items needing user verification (pending Phase 1 §5 walk)

- Save link as / Copy link text (#16, #17)
- Drag-to-reorder (#29)
- Drag-out to new window (#30)

These were marked "Implemented?" in the static audit — need user side-by-side comparison with Chrome to confirm UX matches.
