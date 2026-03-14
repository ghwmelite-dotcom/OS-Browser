import { create } from 'zustand';

type SidebarPanel = 'ai' | 'askozzy' | 'none';

interface SidebarState {
  isOpen: boolean;
  activePanel: SidebarPanel;

  toggleSidebar: () => void;
  openPanel: (panel: SidebarPanel) => void;
  closePanel: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  isOpen: false,
  activePanel: 'none',

  toggleSidebar: () => {
    const { isOpen } = get();
    set({ isOpen: !isOpen, activePanel: isOpen ? 'none' : 'ai' });
  },

  openPanel: (panel) => {
    set({ isOpen: panel !== 'none', activePanel: panel });
  },

  closePanel: () => {
    set({ isOpen: false, activePanel: 'none' });
  },
}));
