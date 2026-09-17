'use client'

import { useParams } from 'next/navigation'
import { useCase } from '@/hooks/useCases'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LoadingSkeleton } from '@/components/rsa/loading-skeleton'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'
import { CaseTimeline } from '@/components/rsa/timeline/case-timeline'
import { ChatPanel } from '@/components/rsa/chat/chat-panel'
import { Card } from '@/components/ui/card'

export default function AdminCaseDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: c, isLoading } = useCase(params.id)

  if (isLoading) return <LoadingSkeleton rows={6} />
  if (!c) return <EmptyState title="Case not found" />

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title={c.case_number}
        description={c.title ?? c.description ?? undefined}
        actions={
          <div className="flex gap-1">
            <PriorityBadge priority={c.priority} />
            <StatusBadge status={c.status} />
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <CaseTimeline caseId={c.id} />
        </Card>
        <ChatPanel caseId={c.id} conversationId={`case-${c.id}`} />
      </div>
    </div>
  )
}
