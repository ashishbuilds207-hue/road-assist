'use client'

import { ConnectedStubPage } from '@/components/rsa/portal-page'
import { useNotifications } from '@/hooks/useNotifications'

export default function Page() {
  const { notifications, isLoading } = useNotifications()
  return (
    <ConnectedStubPage
      title="Notifications"
      loading={isLoading}
      rows={notifications.map((n) => ({
        id: n.id,
        title: (n as { title?: string }).title ?? 'Alert',
      }))}
    />
  )
}
