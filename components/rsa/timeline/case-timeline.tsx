'use client'

import { useCaseTimeline } from '@/hooks/useCases'
import { LoadingSkeleton } from '@/components/rsa/loading-skeleton'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge } from '@/components/rsa/status-badge'
import { cn } from '@/lib/utils'

export function CaseTimeline({
  caseId,
  className,
}: {
  caseId?: string | null
  className?: string
}) {
  const { data, isLoading } = useCaseTimeline(caseId)

  if (!caseId) {
    return (
      <EmptyState
        title="Select a case"
        description="Timeline events will appear here."
        className={className}
      />
    )
  }

  if (isLoading) return <LoadingSkeleton rows={5} className={className} />

  const events = data ?? []

  if (events.length === 0) {
    return (
      <EmptyState
        title="No timeline yet"
        description="Status changes and dispatch events will be listed here."
        className={className}
      />
    )
  }

  return (
    <ol className={cn('relative space-y-4 border-l border-gray-300 pl-5', className)}>
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full bg-primary" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.to_status} />
              <span className="text-[11px] text-gray">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
            {event.notes && (
              <p className="text-sm text-black">{event.notes}</p>
            )}
            {(event as { note?: string }).note && (
              <p className="text-sm text-black">
                {(event as { note?: string }).note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
