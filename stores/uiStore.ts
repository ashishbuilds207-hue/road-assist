'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  demoBannerVisible: boolean
  soundEnabled: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  setDemoBannerVisible: (visible: boolean) => void
  dismissDemoBanner: () => void
  setSoundEnabled: (enabled: boolean) => void
  toggleSound: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      demoBannerVisible: true,
      soundEnabled: true,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setDemoBannerVisible: (visible) => set({ demoBannerVisible: visible }),
      dismissDemoBanner: () => set({ demoBannerVisible: false }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
    }),
    {
      name: 'rsa-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        demoBannerVisible: state.demoBannerVisible,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
)
