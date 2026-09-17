import { promises as fs } from 'fs'
import path from 'path'
import { getDataDir } from '@/lib/data-dir'

const DATA_DIR = getDataDir()
const FILE = path.join(DATA_DIR, 'live-chat.json')

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

type FileShape = {
  messages: LiveChatMessage[]
  typing: Record<string, TypingState>
  notifications: LiveChatNotification[]
}

async function readFile(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<FileShape>
    return {
      messages: parsed.messages ?? [],
      typing: parsed.typing ?? {},
      notifications: parsed.notifications ?? [],
    }
  } catch {
    return { messages: [], typing: {}, notifications: [] }
  }
}

async function writeFile(data: FileShape) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf8')
}

function now() {
  return new Date().toISOString()
}

export async function listLiveMessages(conversationId: string) {
  const file = await readFile()
  return file.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getTyping(conversationId: string) {
  const file = await readFile()
  const t = file.typing[conversationId]
  if (!t) return null
  if (Date.now() - t.at > 4000) return null
  return t
}

export async function setTyping(
  conversationId: string,
  userId: string,
  name: string,
  isTyping: boolean
) {
  const file = await readFile()
  if (!isTyping) {
    if (file.typing[conversationId]?.userId === userId) {
      delete file.typing[conversationId]
    }
  } else {
    file.typing[conversationId] = { userId, name, at: Date.now() }
  }
  await writeFile(file)
  return file.typing[conversationId] ?? null
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
  const file = await readFile()
  const ts = now()
  const msg: LiveChatMessage = {
    id: `lm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    conversationId: input.conversationId,
    caseId: input.caseId ?? null,
    senderId: input.senderId,
    senderName: input.senderName,
    senderRole: input.senderRole ?? null,
    body: input.body.trim(),
    createdAt: ts,
  }
  file.messages.push(msg)

  if (file.typing[input.conversationId]?.userId === input.senderId) {
    delete file.typing[input.conversationId]
  }

  if (input.notifyUserId && input.notifyUserId !== input.senderId) {
    const n: LiveChatNotification = {
      id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: input.notifyUserId,
      title: `New message from ${input.senderName}`,
      body: msg.body.slice(0, 120),
      link: input.notifyLink ?? null,
      caseId: input.caseId ?? null,
      conversationId: input.conversationId,
      read_at: null,
      created_at: ts,
      event: 'MESSAGE_RECEIVED',
    }
    file.notifications.unshift(n)
    file.notifications = file.notifications.slice(0, 200)
  }

  await writeFile(file)
  return msg
}

export async function listLiveNotifications(userId: string) {
  const file = await readFile()
  return file.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function markLiveNotificationsRead(userId: string, id?: string) {
  const file = await readFile()
  const ts = now()
  file.notifications = file.notifications.map((n) => {
    if (n.userId !== userId) return n
    if (id && n.id !== id) return n
    if (n.read_at) return n
    return { ...n, read_at: ts }
  })
  await writeFile(file)
  return true
}
