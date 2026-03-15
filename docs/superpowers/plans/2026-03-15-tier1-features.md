# Tier 1 Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Add 4 high-impact features that differentiate OS Browser from Chrome/Edge: Command Palette, Floating AI Page Actions, Split Screen View, and Focus Mode.

**Architecture:** Each feature is a self-contained React component + optional Zustand store, integrated into App.tsx. No backend changes needed — all features are renderer-only.

**Tech Stack:** React 18, Zustand 5, Tailwind CSS, Lucide icons, Electron IPC

---

## Feature 1: Command Palette (Ctrl+K)

### Files:
- Create: `packages/renderer/src/components/CommandPalette.tsx`
- Modify: `packages/renderer/src/hooks/useKeyboardShortcuts.ts` — change Ctrl+K from URL focus to open palette
- Modify: `packages/renderer/src/App.tsx` — render CommandPalette

### Design:
- Full-screen overlay with centered search box (560px wide)
- Real-time search across: open tabs, bookmarks, history, browser commands
- Keyboard navigation: Arrow Up/Down to select, Enter to execute, Escape to close
- Results grouped by type with icons: 🔓 Tabs, ⭐ Bookmarks, 🕐 History, ⚡ Commands
- Commands: "New Tab", "Settings", "Clear History", "Dark Mode", "Light Mode", "AI Assistant", "AskOzzy", "Close Tab", "Fullscreen"

### Implementation:
- State: query string, results array, selected index, isOpen boolean
- On open: focus input, show recent items
- On type: search across all sources with 100ms debounce
- On select: execute action (switch tab, open URL, run command)
- Animated: fade-in backdrop, scale-up modal

---

## Feature 2: Floating AI Page Actions

### Files:
- Create: `packages/renderer/src/components/FloatingAIBar.tsx`
- Modify: `packages/renderer/src/App.tsx` — render FloatingAIBar

### Design:
- Small floating toolbar at bottom-center of the content area
- Only visible when viewing a real webpage (not newtab/settings)
- 5 pill buttons: Summarize, Translate, Extract, Draft Reply, Save PDF
- Click opens AI sidebar with the action pre-filled
- Semi-transparent, subtle until hovered
- Auto-hide after 5 seconds of no interaction, reappear on mouse move

---

## Feature 3: Split Screen View

### Files:
- Create: `packages/renderer/src/components/SplitScreen.tsx`
- Create: `packages/renderer/src/store/splitscreen.ts`
- Modify: `packages/renderer/src/App.tsx` — render SplitScreen
- Modify: `packages/renderer/src/components/Browser/BrowserMenu.tsx` — add "Split Screen" menu item

### Design:
- Split content area into left/right panes
- Each pane shows a different tab
- Drag handle in the middle to resize (50/50 default)
- Button in menu: "Split Screen" → opens current tab on left, lets user pick right tab
- Ctrl+Shift+S shortcut to toggle
- Only works when 2+ tabs are open

---

## Feature 4: Focus Mode

### Files:
- Create: `packages/renderer/src/components/FocusMode.tsx`
- Create: `packages/renderer/src/store/focus.ts`
- Modify: `packages/renderer/src/App.tsx` — render FocusMode overlay
- Modify: `packages/renderer/src/components/Browser/NavigationBar.tsx` — add Focus button
- Modify: `packages/renderer/src/components/Browser/BrowserMenu.tsx` — add "Focus Mode" menu item

### Design:
- Focus button in nav bar (Target/Crosshair icon)
- When active: gold border glow around entire browser window
- Blocks configurable list of distracting sites (social media, news, etc.)
- Timer showing focus duration: "Focused for 1h 23m"
- StatusBar shows focus indicator
- Settings: configurable blocklist, auto-enable during work hours (9-5)

---

## Task Dependencies:
All 4 features are independent. Can be built in parallel.

## Priority Order:
1. Command Palette (biggest wow factor)
2. Floating AI Page Actions (unique AI feature)
3. Focus Mode (productivity tool)
4. Split Screen View (utility feature)
