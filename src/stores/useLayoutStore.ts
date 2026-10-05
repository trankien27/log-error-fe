import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type LayoutState = {
  isSidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  toggleSidebarCollapsed: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    set => ({
      isSidebarCollapsed: false,
      isCommandPaletteOpen: false,
      toggleSidebarCollapsed: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setCommandPaletteOpen: open => set({ isCommandPaletteOpen: open }),
    }),
    {
      name: 'app-layout',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    },
  ),
);
