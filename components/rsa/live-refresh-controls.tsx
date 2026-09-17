'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Fixed top-right live refresh: source + small spinner + Refresh button. */
export function LiveRefreshControls({
  source,
  refreshing,
  onRefresh,
  className,
}: {
  source?: string
  refreshing?: boolean
  onRefresh: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-end gap-2 self-start sm:self-center',
        className
      )}
    >
      {source ? (
        <span className="hidden text-[11px] text-gray sm:inline">
          Source: {source}
        </span>
      ) : null}
      <span
        className="inline-flex size-5 items-center justify-center"
        aria-live="polite"
        aria-busy={refreshing || false}
      >
        {refreshing ? (
          <Loader2
            className="size-4 animate-spin text-primary"
            aria-label="Loading new data"
          />
        ) : (
          <span className="size-4" aria-hidden />
        )}
      </span>
      <Button
        type="button"
        variant="outline-general"
        size="small"
        disabled={refreshing}
        onClick={onRefresh}
      >
        <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  )
}
