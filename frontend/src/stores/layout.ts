import { create } from 'zustand';

interface LayoutState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  searchOpen: boolean;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setSidebar: (open: boolean) => void;
  setRightPanel: (open: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
}

export const useLayout = create<LayoutState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: true,
  searchOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
  setRightPanel: (open) => set({ rightPanelOpen: open }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
}));
