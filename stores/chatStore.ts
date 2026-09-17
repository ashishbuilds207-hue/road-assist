'use client'

import { create } from 'zustand'

interface ChatState {
  activeConversationId: string | null
  typing: Record<string, boolean>
  setActiveConversation: (id: string | null) => void
  setTyping: (conversationId: string, isTyping: boolean) => void
  clearTyping: (conversationId?: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  typing: {},

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setTyping: (conversationId, isTyping) =>
    set((s) => ({
      typing: { ...s.typing, [conversationId]: isTyping },
    })),

  clearTyping: (conversationId) =>
    set((s) => {
      if (!conversationId) return { typing: {} }
      const next = { ...s.typing }
      delete next[conversationId]
      return { typing: next }
    }),
}))
