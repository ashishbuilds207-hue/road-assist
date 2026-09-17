import { NextResponse } from 'next/server'
import {
  getTyping,
  listLiveMessages,
  listLiveNotifications,
  markLiveNotificationsRead,
  sendLiveMessage,
  setTyping,
} from '@/lib/chat/live-messages'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')
  const userId = searchParams.get('userId')
  const mode = searchParams.get('mode')

  if (mode === 'notifications' && userId) {
    const notifications = await listLiveNotifications(userId)
    const unread = notifications.filter((n) => !n.read_at).length
    return NextResponse.json({ notifications, unread })
  }

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId required' },
      { status: 400 }
    )
  }

  const [messages, typing] = await Promise.all([
    listLiveMessages(conversationId),
    getTyping(conversationId),
  ])

  return NextResponse.json({ messages, typing })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const conversationId = String(body.conversationId || '')
    const senderId = String(body.senderId || '')
    const senderName = String(body.senderName || 'User')
    const text = String(body.body || '').trim()

    if (!conversationId || !senderId || !text) {
      return NextResponse.json(
        { error: 'conversationId, senderId, and body required' },
        { status: 400 }
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

    return NextResponse.json({ message })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
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
        return NextResponse.json({ error: 'userId required' }, { status: 400 })
      }
      await markLiveNotificationsRead(userId, body.id)
      return NextResponse.json({ ok: true })
    }

    const conversationId = String(body.conversationId || '')
    const userId = String(body.userId || '')
    const name = String(body.name || 'User')
    const isTyping = Boolean(body.typing)

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: 'conversationId and userId required' },
        { status: 400 }
      )
    }

    const typing = await setTyping(conversationId, userId, name, isTyping)
    return NextResponse.json({ typing })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    )
  }
}
