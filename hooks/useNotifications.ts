'use client'

import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NotificationService } from '@/services/NotificationService'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { useRealtime } from '@/hooks/useRealtime'

type BellNotification = {
  id: string
  title?: string | null
  body?: string | null
  message?: string | null
  link?: string | null
  read_at?: string | null
  created_at?: string
}

export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id)
  const demoMode = useAuthStore((s) => s.demoMode)
  const { unreadCount, setUnread, soundEnabled, incrementUnread } =
    useNotificationStore()
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [] as BellNotification[]
      const [svc, liveRes] = await Promise.all([
        demoMode
          ? Promise.resolve({ data: [] as BellNotification[] })
          : NotificationService.list(userId),
        fetch(
          `/api/chat/live?mode=notifications&userId=${encodeURIComponent(userId)}`
        )
          .then((r) => r.json())
          .catch(() => ({ notifications: [] })),
      ])
      const live = (liveRes.notifications || []) as BellNotification[]
      const merged = [...live, ...(svc.data || [])]
      const seen = new Set<string>()
      return merged.filter((n) => {
        if (seen.has(n.id)) return false
        seen.add(n.id)
        return true
      })
    },
    enabled: Boolean(userId),
    refetchInterval: 2500,
  })

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread', userId],
    queryFn: async () => {
      if (!userId) return 0
      const liveRes = await fetch(
        `/api/chat/live?mode=notifications&userId=${encodeURIComponent(userId)}`
      )
        .then((r) => r.json())
        .catch(() => ({ unread: 0 }))
      const liveUnread = Number(liveRes.unread || 0)
      if (demoMode) return liveUnread
      const res = await NotificationService.getUnreadCount(userId)
      return liveUnread + (res.data || 0)
    },
    enabled: Boolean(userId),
    refetchInterval: 2500,
  })

  useEffect(() => {
    if (typeof unreadQuery.data === 'number') {
      setUnread(unreadQuery.data)
    }
  }, [unreadQuery.data, setUnread])

  useRealtime({
    channelName: userId ? `notifications:${userId}` : 'notifications:none',
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: Boolean(userId) && !demoMode,
    onPayload: (_payload) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      void queryClient.invalidateQueries({
        queryKey: ['notifications-unread', userId],
      })
      incrementUnread(1)
      if (soundEnabled && typeof window !== 'undefined') {
        try {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext
          const ctx = new Ctx()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 880
          gain.gain.value = 0.05
          osc.start()
          osc.stop(ctx.currentTime + 0.08)
        } catch {
          // ignore audio failures
        }
      }
    },
  })

  const markRead = useCallback(
    async (id: string) => {
      if (userId) {
        await fetch('/api/chat/live', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markRead', userId, id }),
        }).catch(() => null)
      }
      await NotificationService.markRead(id)
      void queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      void queryClient.invalidateQueries({
        queryKey: ['notifications-unread', userId],
      })
    },
    [queryClient, userId]
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await fetch('/api/chat/live', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markRead', userId }),
    }).catch(() => null)
    await NotificationService.markAllRead(userId)
    setUnread(0)
    void queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    void queryClient.invalidateQueries({
      queryKey: ['notifications-unread', userId],
    })
  }, [queryClient, userId, setUnread])

  return {
    notifications: listQuery.data ?? [],
    unreadCount: unreadQuery.data ?? unreadCount,
    isLoading: listQuery.isLoading,
    markRead,
    markAllRead,
    refetch: listQuery.refetch,
  }
}
