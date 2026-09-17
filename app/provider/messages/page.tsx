'use client'

import { ChatPanel } from '@/components/rsa/chat/chat-panel'
import { PortalPageHeader } from '@/components/rsa/portal-page'

export default function Page() {
  return (
    <div className="space-y-4">
      <PortalPageHeader title="Messages" />
      <ChatPanel conversationId="provider-inbox" />
    </div>
  )
}
