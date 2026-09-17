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
    pollMs = 1200,
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

  useEffect(() => {
    if (conversationId) setActive(conversationId)
    return () => setActive(null)
  }, [conversationId, setActive])

  const refresh = useCallback(async () => {
    if (!conversationId || !enabled) return
    try {
      const res = await fetch(
        `/api/chat/live?conversationId=${encodeURIComponent(conversationId)}`
      )
      if (!res.ok) {
        // keep last messages — avoid vanish on blips
        return
      }
      const data = await res.json()
      setConnected(true)
      setLive(true)

      const list = ((data.messages || []) as LiveMessage[]).map((m) => ({
        ...m,
        mine: m.senderId === userId,
      }))

      // Don't wipe a non-empty chat with a transient empty payload
      if (list.length === 0 && !firstLoad.current) {
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
      setMessages(list)

      const peer = data.typing as TypingPeer
      if (peer && peer.userId !== userId) {
        setTyping(peer)
        setTypingLocal(conversationId, true)
      } else {
        setTyping(null)
        setTypingLocal(conversationId, false)
      }
    } catch {
      setConnected(false)
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
    void refresh()
    if (!conversationId || !enabled) return
    const id = setInterval(() => void refresh(), pollMs)
    return () => clearInterval(id)
  }, [conversationId, enabled, pollMs, refresh])

  const send = useCallback(
    async (body: string) => {
      const text = body.trim()
      if (!text || !conversationId || !userId) return false
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
        })
        const data = await res.json()
        if (!res.ok) {
          toast({ title: 'Message failed', description: data.error })
          setSending(false)
          return false
        }
        const msg = data.message as LiveMessage
        knownIds.current.add(msg.id)
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, { ...msg, mine: true, isNew: true }]
        })
        setSending(false)
        return true
      } catch {
        toast({ title: 'Message failed', description: 'Network error' })
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
      })
    },
    [conversationId, userId, senderName]
  )

  const onComposerChange = useCallback(
    (value: string) => {
      if (!conversationId) return
      signalTyping(value.trim().length > 0)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => signalTyping(false), 2200)
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
