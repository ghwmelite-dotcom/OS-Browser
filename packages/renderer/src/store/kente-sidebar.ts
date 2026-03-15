import { create } from 'zustand';

// ── Types ───────────────────────────────────────────────────────────
type KenteSidebarVisibility = 'hidden' | 'collapsed' | 'expanded';

interface KenteSidebarStore {
  /** Overall sidebar visibility state */
  state: KenteSidebarVisibility;
  /** Currently active feature panel id, or null */
  activePanel: string | null;
  /** Width of the expanded panel in pixels */
  panelWidth: number;

  /**
   * Toggle a specific feature panel.
   * - If the panel is already active, close it.
   * - If a different panel is active, switch to the new one.
   * - If sidebar is hidden, expand and show the panel.
   */
  togglePanel: (featureId: string) => void;

  /** Close the active panel and collapse the sidebar */
  closePanel: () => void;

  /** Set the panel width (for resize drag), clamped to [280, 600] */
  setPanelWidth: (width: number) => void;

  /** Toggle between hidden and collapsed states (icon strip visibility) */
  toggleSidebar: () => void;
}

// ── Constants ───────────────────────────────────────────────────────
const DEFAULT_PANEL_WIDTH = 340;
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 600;

// ── Store ───────────────────────────────────────────────────────────
export const useKenteSidebarStore = create<KenteSidebarStore>((set, get) => ({
  state: 'collapsed',
  activePanel: null,
  panelWidth: DEFAULT_PANEL_WIDTH,

  togglePanel: (featureId: string) => {
    const { state, activePanel } = get();

    if (state === 'hidden') {
      // Sidebar was hidden — show it and open the panel
      set({ state: 'expanded', activePanel: featureId });
      return;
    }

    if (state === 'expanded' && activePanel === featureId) {
      // Same panel clicked — close it, go to collapsed (icon rail)
      set({ state: 'collapsed', activePanel: null });
      return;
    }

    // Different panel or was collapsed — expand and show
    set({ state: 'expanded', activePanel: featureId });
  },

  closePanel: () => {
    set({ state: 'collapsed', activePanel: null });
  },

  setPanelWidth: (width: number) => {
    const clamped = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, width));
    set({ panelWidth: clamped });
  },

  toggleSidebar: () => {
    const { state } = get();
    if (state === 'hidden') {
      set({ state: 'collapsed', activePanel: null });
    } else {
      set({ state: 'hidden', activePanel: null });
    }
  },
}));
