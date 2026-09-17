'use client'

import { Bell, Volume2, VolumeX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUiStore } from '@/stores/uiStore'
import { EmptyState } from '@/components/rsa/empty-state'
import Link from 'next/link'

export function NotificationBell({
  inboxHref = '#',
}: {
  inboxHref?: string
}) {
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const soundEnabled = useNotificationStore((s) => s.soundEnabled)
  const setSoundEnabled = useNotificationStore((s) => s.setSoundEnabled)
  const uiSound = useUiStore((s) => s.soundEnabled)
  const setUiSound = useUiStore((s) => s.setSoundEnabled)

  const enabled = soundEnabled && uiSound

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline-general"
          size="small"
          className="!px-2 relative size-9"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="danger"
              size="number"
              className="absolute -right-1 -top-1"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-black">Notifications</p>
          <div className="flex items-center gap-2">
            {enabled ? (
              <Volume2 className="size-3.5 text-primary" />
            ) : (
              <VolumeX className="size-3.5 text-gray" />
            )}
            <Switch
              checked={enabled}
              onCheckedChange={(v) => {
                setSoundEnabled(v)
                setUiSound(v)
              }}
              aria-label="Toggle notification sound"
            />
          </div>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {notifications.length === 0 ? (
            <EmptyState
              title="No notifications"
              description="You are all caught up."
              className="border-0 bg-transparent py-8 shadow-none"
            />
          ) : (
            notifications.slice(0, 8).map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-gray-200 px-3 py-2 transition hover:border-primary/30 hover:bg-primary/5"
              >
                <p className="text-xs font-semibold text-black">
                  {(n as { title?: string }).title ?? 'Update'}
                </p>
                <p className="text-xs text-gray">
                  {(n as { body?: string }).body ??
                    (n as { message?: string }).message ??
                    'New event'}
                </p>
                {(n as { link?: string }).link ? (
                  <Link
                    href={(n as { link?: string }).link!}
                    className="mt-1 inline-block text-[11px] font-semibold text-primary hover:underline"
                  >
                    Open
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
          <Button
            type="button"
            variant="outline-general"
            size="small"
            onClick={() => void markAllRead()}
          >
            Mark all read
          </Button>
          <Link
            href={inboxHref}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
