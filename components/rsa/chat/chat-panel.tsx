'use client'

import { useEffect, useRef, useState } from 'react'
import { Phone, Radio, Send, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLiveChat } from '@/hooks/useLiveChat'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function ChatPanel({
  conversationId,
  caseId,
  title = 'Live chat',
  className,
  peerUserId,
  peerName,
  peerPhone,
  notifyLink,
  compact,
}: {
  conversationId?: string | null
  caseId?: string | null
  title?: string
  className?: string
  peerUserId?: string | null
  peerName?: string | null
  peerPhone?: string | null
  notifyLink?: string | null
  compact?: boolean
}) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    typing,
    sending,
    live,
    connected,
    send,
    onComposerChange,
  } = useLiveChat({
    conversationId,
    caseId,
    peerUserId,
    peerName,
    notifyLink,
    enabled: Boolean(conversationId),
  })

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages.length, typing, messages[messages.length - 1]?.id])

  const submit = async () => {
    if (!text.trim()) return
    const body = text
    setText('')
    onComposerChange('')
    await send(body)
  }

  const displayPeer = peerName || 'Connected party'

  return (
    <div
      className={cn(
        'relative flex h-[400px] flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-3xl',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-light-theme/60" />

      <div className="relative z-[1] flex shrink-0 items-center justify-between gap-3 border-b border-gray-300 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                  connected ? 'bg-success' : 'bg-gray-500'
                )}
              />
              <span
                className={cn(
                  'relative inline-flex size-2.5 rounded-full',
                  connected ? 'bg-success' : 'bg-gray-600'
                )}
              />
            </span>
            <h3 className="truncate font-gilroy text-base font-bold text-black">
              {title}
            </h3>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray">
            {connected ? (
              <Wifi className="size-3 text-success" />
            ) : (
              <WifiOff className="size-3 text-gray-600" />
            )}
            {connected ? (
              <>
                Live with{' '}
                <span className="font-semibold text-black">{displayPeer}</span>
                {live ? ' · syncing' : ''}
              </>
            ) : (
              'Connecting live channel…'
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1 rounded-full bg-light-theme px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline-flex">
            <Radio className="size-3 text-primary" />
            Live
          </span>
          {peerPhone ? (
            <Button asChild variant="default" size="small" className="!h-8">
              <a href={`tel:${peerPhone}`}>
                <Phone className="size-3.5" />
                Call
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative z-[1] min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-gray-100 px-3 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center animate-chat-fade-in">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Radio className="size-5 animate-pulse" />
            </div>
            <p className="font-semibold text-black">You&apos;re connected</p>
            <p className="text-xs text-gray">
              Messages appear instantly for both sides. Say hello to start.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = Boolean(m.mine)
            return (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col gap-1',
                  mine ? 'items-end' : 'items-start',
                  m.isNew ? 'animate-chat-pop' : 'animate-chat-fade-in'
                )}
              >
                <div className="flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                  <span>{mine ? 'You' : m.senderName}</span>
                  <span>{formatTime(m.createdAt)}</span>
                </div>
                <div
                  className={cn(
                    'max-w-[85%] break-words rounded-2xl px-3.5 py-2.5 text-sm font-medium leading-relaxed shadow-sm',
                    mine
                      ? 'rounded-br-md bg-primary text-white'
                      : 'rounded-bl-md border border-gray-300 bg-white text-black'
                  )}
                  style={
                    mine
                      ? {
                          backgroundColor: '#335CFF',
                          color: '#FFFFFF',
                        }
                      : {
                          backgroundColor: '#FFFFFF',
                          color: '#171718',
                          borderColor: '#E2E8F0',
                        }
                  }
                >
                  {m.body}
                </div>
              </div>
            )
          })
        )}

        {typing && (
          <div className="flex items-start animate-chat-fade-in">
            <div className="rounded-2xl rounded-bl-md border border-gray-300 bg-white px-3 py-2 shadow-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                {typing.name}
              </p>
              <div className="flex items-center gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:120ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:240ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="relative z-[1] shrink-0 border-t border-gray-300 bg-white p-3">
        <div className="flex items-center gap-2">
          <Input
            variant="input-form"
            placeholder={`Message ${displayPeer}…`}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              onComposerChange(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
            className="rounded-full border-gray-300 bg-gray-100 focus-visible:ring-primary/30"
          />
          <Button
            type="button"
            variant="default"
            size="small"
            className="!size-10 shrink-0 !rounded-full !px-0 transition hover:scale-105 active:scale-95"
            disabled={sending || !text.trim() || !conversationId}
            onClick={() => void submit()}
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-600">
          Live sync · both sides see new messages automatically
        </p>
      </div>
    </div>
  )
}
