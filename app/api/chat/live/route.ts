import { NextResponse } from 'next/server'
import {
  getTyping,
  listLiveMessages,
  listLiveNotifications,
  markLiveNotificationsRead,
  sendLiveMessage,
  setTyping,
} from '@/lib/chat/live-messages'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')
  const userId = searchParams.get('userId')
  const mode = searchParams.get('mode')

  if (mode === 'notifications' && userId) {
    const notifications = await listLiveNotifications(userId)
    const unread = notifications.filter((n) => !n.read_at).length
    return json({ notifications, unread })
  }

  if (!conversationId) {
    return json({ error: 'conversationId required' }, 400)
  }

  const [messages, typing] = await Promise.all([
    listLiveMessages(conversationId),
    getTyping(conversationId),
  ])

  return json({ messages, typing, serverTime: new Date().toISOString() })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const conversationId = String(body.conversationId || '')
    const senderId = String(body.senderId || '')
    const senderName = String(body.senderName || 'User')
    const text = String(body.body || '').trim()

    if (!conversationId || !senderId || !text) {
      return json(
        { error: 'conversationId, senderId, and body required' },
        400
      )
    }

    const message = await sendLiveMessage({
      conversationId,
      caseId: body.caseId ?? null,
      senderId,
      senderName,
      senderRole: body.senderRole ?? null,
      body: text,
      notifyUserId: body.notifyUserId ?? null,
      notifyLink: body.notifyLink ?? null,
    })

    return json({ message })
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Failed' },
      500
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const action = String(body.action || '')

    if (action === 'markRead') {
      const userId = String(body.userId || '')
      if (!userId) {
        return json({ error: 'userId required' }, 400)
      }
      await markLiveNotificationsRead(userId, body.id)
      return json({ ok: true })
    }

    const conversationId = String(body.conversationId || '')
    const userId = String(body.userId || '')
    const name = String(body.name || 'User')
    const isTyping = Boolean(body.typing)

    if (!conversationId || !userId) {
      return json({ error: 'conversationId and userId required' }, 400)
    }

    const typing = await setTyping(conversationId, userId, name, isTyping)
    return json({ typing })
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Failed' },
      500
    )
  }
}
