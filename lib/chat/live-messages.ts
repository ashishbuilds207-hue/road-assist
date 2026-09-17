import { readBlob, writeBlob } from '@/lib/store/blob-store'

const MSG_KEY = 'live-chat-messages'
const TYPING_KEY = 'live-chat-typing'
const NOTIF_KEY = 'live-chat-notifications'

export type LiveChatMessage = {
  id: string
  conversationId: string
  caseId?: string | null
  senderId: string
  senderName: string
  senderRole?: string | null
  body: string
  createdAt: string
}

export type LiveChatNotification = {
  id: string
  userId: string
  title: string
  body: string
  link?: string | null
  caseId?: string | null
  conversationId?: string | null
  read_at: string | null
  created_at: string
  event: 'MESSAGE_RECEIVED'
}

export type TypingState = {
  userId: string
  name: string
  at: number
}

type MsgFile = { messages: LiveChatMessage[] }
type TypingFile = { typing: Record<string, TypingState> }
type NotifFile = { notifications: LiveChatNotification[] }

function now() {
  return new Date().toISOString()
}

function mergeMessages(
  a: LiveChatMessage[],
  b: LiveChatMessage[]
): LiveChatMessage[] {
  const map = new Map<string, LiveChatMessage>()
  for (const m of [...a, ...b]) {
    if (!m?.id) continue
    map.set(m.id, m)
  }
  return Array.from(map.values()).sort((x, y) =>
    x.createdAt.localeCompare(y.createdAt)
  )
}

async function readMessages(): Promise<MsgFile> {
  // Migrate from legacy combined blob if present
  const parsed = await readBlob<Partial<MsgFile> & { messages?: LiveChatMessage[] }>(
    MSG_KEY,
    {}
  )
  if (parsed.messages?.length) {
    return { messages: parsed.messages }
  }
  const legacy = await readBlob<{ messages?: LiveChatMessage[] }>('live-chat', {})
  return { messages: legacy.messages ?? [] }
}

async function writeMessages(data: MsgFile) {
  await writeBlob(MSG_KEY, data)
}

async function readTyping(): Promise<TypingFile> {
  const parsed = await readBlob<Partial<TypingFile>>(TYPING_KEY, {})
  if (parsed.typing) return { typing: parsed.typing }
  const legacy = await readBlob<{ typing?: Record<string, TypingState> }>(
    'live-chat',
    {}
  )
  return { typing: legacy.typing ?? {} }
}

async function writeTyping(data: TypingFile) {
  await writeBlob(TYPING_KEY, data)
}

async function readNotifs(): Promise<NotifFile> {
  const parsed = await readBlob<Partial<NotifFile>>(NOTIF_KEY, {})
  if (parsed.notifications) return { notifications: parsed.notifications }
  const legacy = await readBlob<{ notifications?: LiveChatNotification[] }>(
    'live-chat',
    {}
  )
  return { notifications: legacy.notifications ?? [] }
}

async function writeNotifs(data: NotifFile) {
  await writeBlob(NOTIF_KEY, data)
}

export async function listLiveMessages(conversationId: string) {
  const file = await readMessages()
  return file.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getTyping(conversationId: string) {
  const file = await readTyping()
  const t = file.typing[conversationId]
  if (!t) return null
  if (Date.now() - t.at > 5000) return null
  return t
}

export async function setTyping(
  conversationId: string,
  userId: string,
  name: string,
  isTyping: boolean
) {
  // Typing is a separate blob so it never overwrites messages
  for (let attempt = 0; attempt < 3; attempt++) {
    const file = await readTyping()
    if (!isTyping) {
      if (file.typing[conversationId]?.userId === userId) {
        delete file.typing[conversationId]
      }
    } else {
      file.typing[conversationId] = { userId, name, at: Date.now() }
    }
    await writeTyping(file)
    return file.typing[conversationId] ?? null
  }
  return null
}

export async function sendLiveMessage(input: {
  conversationId: string
  caseId?: string | null
  senderId: string
  senderName: string
  senderRole?: string | null
  body: string
  notifyUserId?: string | null
  notifyLink?: string | null
}) {
  const ts = now()
  const msg: LiveChatMessage = {
    id: `lm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    conversationId: input.conversationId,
    caseId: input.caseId ?? null,
    senderId: input.senderId,
    senderName: input.senderName,
    senderRole: input.senderRole ?? null,
    body: input.body.trim(),
    createdAt: ts,
  }

  // Retry + merge so concurrent sends / typing never drop messages
  for (let attempt = 0; attempt < 6; attempt++) {
    const file = await readMessages()
    const next = mergeMessages(file.messages, [msg])
    await writeMessages({ messages: next.slice(-2000) })

    const verify = await readMessages()
    if (verify.messages.some((m) => m.id === msg.id)) {
      // Clear own typing without touching message blob
      void setTyping(input.conversationId, input.senderId, input.senderName, false)

      if (input.notifyUserId && input.notifyUserId !== input.senderId) {
        void appendNotification({
          userId: input.notifyUserId,
          title: `New message from ${input.senderName}`,
          body: msg.body.slice(0, 120),
          link: input.notifyLink ?? null,
          caseId: input.caseId ?? null,
          conversationId: input.conversationId,
        })
      }
      return msg
    }
    await new Promise((r) => setTimeout(r, 40 * (attempt + 1)))
  }

  throw new Error('Message could not be saved — please retry')
}

async function appendNotification(input: {
  userId: string
  title: string
  body: string
  link?: string | null
  caseId?: string | null
  conversationId?: string | null
}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const file = await readNotifs()
    const n: LiveChatNotification = {
      id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: input.userId,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      caseId: input.caseId ?? null,
      conversationId: input.conversationId ?? null,
      read_at: null,
      created_at: now(),
      event: 'MESSAGE_RECEIVED',
    }
    const next = [n, ...file.notifications].slice(0, 200)
    await writeNotifs({ notifications: next })
    const verify = await readNotifs()
    if (verify.notifications.some((x) => x.id === n.id)) return
  }
}

export async function listLiveNotifications(userId: string) {
  const file = await readNotifs()
  return file.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function markLiveNotificationsRead(userId: string, id?: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const file = await readNotifs()
    const ts = now()
    const next = file.notifications.map((n) => {
      if (n.userId !== userId) return n
      if (id && n.id !== id) return n
      if (n.read_at) return n
      return { ...n, read_at: ts }
    })
    await writeNotifs({ notifications: next })
    return true
  }
  return false
}
