'use client'

import { ChatPanel } from '@/components/rsa/chat/chat-panel'
import { PortalPageHeader } from '@/components/rsa/portal-page'

export default function DriverMessagesPage() {
  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Messages"
        description="Case and dispatch conversations."
      />
      <ChatPanel conversationId="driver-inbox" title="Inbox" />
    </div>
  )
}
