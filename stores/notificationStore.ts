'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  unreadCount: number
  soundEnabled: boolean
  setUnread: (count: number) => void
  incrementUnread: (by?: number) => void
  clearUnread: () => void
  setSoundEnabled: (enabled: boolean) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      soundEnabled: true,

      setUnread: (count) => set({ unreadCount: Math.max(0, count) }),
      incrementUnread: (by = 1) =>
        set((s) => ({ unreadCount: Math.max(0, s.unreadCount + by) })),
      clearUnread: () => set({ unreadCount: 0 }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    }),
    {
      name: 'rsa-notification-store',
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
      }),
    }
  )
)
