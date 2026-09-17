'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useToast } from '@/components/ui/use-toast'

export type LiveMessage = {
  id: string
  conversationId: string
  caseId?: string | null
  senderId: string
  senderName: string
  senderRole?: string | null
  body: string
  createdAt: string
  mine?: boolean
  isNew?: boolean
  pending?: boolean
}

type TypingPeer = {
  userId: string
  name: string
  at: number
} | null

function playPing() {
  if (typeof window === 'undefined') return
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
    osc.type = 'sine'
    osc.frequency.setValueAtTime(920, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // ignore
  }
}

function mergeLists(
  local: LiveMessage[],
  remote: LiveMessage[],
  userId?: string
): LiveMessage[] {
  const map = new Map<string, LiveMessage>()
  for (const m of local) {
    map.set(m.id, m)
  }
  for (const m of remote) {
    const prev = map.get(m.id)
    map.set(m.id, {
      ...prev,
      ...m,
      mine: m.senderId === userId,
      pending: false,
      isNew: prev?.isNew && !prev.pending ? prev.isNew : undefined,
    })
  }
  // Drop pending locals that match a confirmed remote by body+sender near time
  const confirmed = Array.from(map.values()).filter((m) => !m.pending)
  const pending = Array.from(map.values()).filter((m) => m.pending)
  const keptPending = pending.filter((p) => {
    return !confirmed.some(
      (c) =>
        c.senderId === p.senderId &&
        c.body === p.body &&
        Math.abs(
          new Date(c.createdAt).getTime() - new Date(p.createdAt).getTime()
        ) < 15000
    )
  })
  return [...confirmed, ...keptPending].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )
}

export function useLiveChat(opts: {
  conversationId?: string | null
  caseId?: string | null
  peerUserId?: string | null
  peerName?: string | null
  notifyLink?: string | null
  pollMs?: number
  enabled?: boolean
}) {
  const {
    conversationId,
    caseId,
    peerUserId,
    peerName,
    notifyLink,
    pollMs = 800,
    enabled = true,
  } = opts

  const userId = useAuthStore((s) => s.user?.id)
  const senderName =
    useAuthStore((s) => s.profile?.full_name) ||
    useAuthStore((s) => s.user?.email) ||
    'You'
  const role = useAuthStore((s) => s.role)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const setTypingLocal = useChatStore((s) => s.setTyping)
  const incrementUnread = useNotificationStore((s) => s.incrementUnread)
  const soundEnabled = useNotificationStore((s) => s.soundEnabled)
  const { toast } = useToast()

  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [typing, setTyping] = useState<TypingPeer>(null)
  const [sending, setSending] = useState(false)
  const [live, setLive] = useState(false)
  const [connected, setConnected] = useState(false)
  const knownIds = useRef<Set<string>>(new Set())
  const firstLoad = useRef(true)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshInFlight = useRef(false)
  const messagesRef = useRef<LiveMessage[]>([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (conversationId) setActive(conversationId)
    return () => setActive(null)
  }, [conversationId, setActive])

  const refresh = useCallback(async () => {
    if (!conversationId || !enabled) return
    if (refreshInFlight.current) return
    refreshInFlight.current = true
    try {
      const res = await fetch(
        `/api/chat/live?conversationId=${encodeURIComponent(conversationId)}&_=${Date.now()}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        setConnected(false)
        return
      }
      const data = await res.json()
      setConnected(true)
      setLive(true)

      const list = ((data.messages || []) as LiveMessage[]).map((m) => ({
        ...m,
        mine: m.senderId === userId,
      }))

      // Never wipe non-empty local chat with empty remote (race / blip)
      if (list.length === 0 && messagesRef.current.length > 0) {
        setTyping(null)
        return
      }

      const incoming: LiveMessage[] = []
      for (const m of list) {
        if (!knownIds.current.has(m.id)) {
          if (!firstLoad.current && m.senderId !== userId) {
            incoming.push({ ...m, isNew: true })
          }
          knownIds.current.add(m.id)
        }
      }

      if (incoming.length > 0) {
        incrementUnread(incoming.length)
        if (soundEnabled) playPing()
        const last = incoming[incoming.length - 1]
        toast({
          title: `${last.senderName} messaged you`,
          description: last.body.slice(0, 80),
        })
      }

      firstLoad.current = false
      setMessages((prev) => {
        const merged = mergeLists(prev, list, userId)
        // Mark newly arrived remote messages
        return merged.map((m) =>
          incoming.some((i) => i.id === m.id) ? { ...m, isNew: true } : m
        )
      })

      const peer = data.typing as TypingPeer
      if (peer && peer.userId !== userId && Date.now() - (peer.at || 0) < 5000) {
        setTyping(peer)
        setTypingLocal(conversationId, true)
      } else {
        setTyping(null)
        setTypingLocal(conversationId, false)
      }
    } catch {
      setConnected(false)
    } finally {
      refreshInFlight.current = false
    }
  }, [
    conversationId,
    enabled,
    userId,
    incrementUnread,
    soundEnabled,
    toast,
    setTypingLocal,
  ])

  useEffect(() => {
    knownIds.current = new Set()
    firstLoad.current = true
    setMessages([])
    setConnected(false)
    void refresh()
    if (!conversationId || !enabled) return

    const id = setInterval(() => void refresh(), pollMs)

    const onFocus = () => void refresh()
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [conversationId, enabled, pollMs, refresh])

  const send = useCallback(
    async (body: string) => {
      const text = body.trim()
      if (!text || !conversationId || !userId) return false

      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const optimistic: LiveMessage = {
        id: tempId,
        conversationId,
        caseId: caseId ?? null,
        senderId: userId,
        senderName,
        senderRole: role ?? null,
        body: text,
        createdAt: new Date().toISOString(),
        mine: true,
        isNew: true,
        pending: true,
      }
      knownIds.current.add(tempId)
      setMessages((prev) => [...prev, optimistic])
      setSending(true)

      try {
        const res = await fetch('/api/chat/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            caseId,
            senderId: userId,
            senderName,
            senderRole: role,
            body: text,
            notifyUserId: peerUserId,
            notifyLink:
              notifyLink ||
              (caseId ? `/driver/active?caseId=${caseId}` : null),
          }),
          cache: 'no-store',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId))
          knownIds.current.delete(tempId)
          toast({
            title: 'Message failed',
            description: data.error || 'Could not send. Try again.',
          })
          setSending(false)
          return false
        }
        const msg = data.message as LiveMessage
        knownIds.current.add(msg.id)
        knownIds.current.delete(tempId)
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId)
          if (withoutTemp.some((m) => m.id === msg.id)) return withoutTemp
          return [
            ...withoutTemp,
            { ...msg, mine: true, isNew: true, pending: false },
          ]
        })
        // Pull quickly so peer side / other tabs sync
        void refresh()
        setSending(false)
        return true
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        knownIds.current.delete(tempId)
        toast({ title: 'Message failed', description: 'Network error — retry' })
        setSending(false)
        return false
      }
    },
    [
      conversationId,
      caseId,
      userId,
      senderName,
      role,
      peerUserId,
      notifyLink,
      toast,
      refresh,
    ]
  )

  const signalTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId || !userId) return
      void fetch('/api/chat/live', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userId,
          name: senderName,
          typing: isTyping,
        }),
        cache: 'no-store',
      }).catch(() => {})
    },
    [conversationId, userId, senderName]
  )

  const onComposerChange = useCallback(
    (value: string) => {
      if (!conversationId) return
      signalTyping(value.trim().length > 0)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => signalTyping(false), 1800)
    },
    [conversationId, signalTyping]
  )

  return {
    messages,
    typing,
    sending,
    live,
    connected,
    peerName: peerName || typing?.name || 'Peer',
    send,
    onComposerChange,
    refresh,
    userId,
  }
}
