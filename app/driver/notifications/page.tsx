'use client'

import { ConnectedStubPage } from '@/components/rsa/portal-page'
import { useNotifications } from '@/hooks/useNotifications'

export default function DriverNotificationsPage() {
  const { notifications, isLoading } = useNotifications()
  return (
    <ConnectedStubPage
      title="Notifications"
      description="Status alerts and assignment updates."
      loading={isLoading}
      rows={notifications.slice(0, 20).map((n) => ({
        id: n.id,
        title: (n as { title?: string }).title ?? 'Notification',
        subtitle: (n as { body?: string }).body ?? undefined,
      }))}
    />
  )
}
