'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export function DemoBanner({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const visible = useUiStore((s) => s.demoBannerVisible)
  const dismiss = useUiStore((s) => s.dismissDemoBanner)

  if (!visible) return null

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-950',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="pending" size="small">
          DEMO ENVIRONMENT
        </Badge>
        {!compact && (
          <span className="text-xs font-medium sm:text-sm">
            DEMO MODE — data and OTP are for demonstration only. Not live
            production roadside assistance.
          </span>
        )}
        {compact && (
          <span className="text-xs font-semibold tracking-wide">DEMO MODE</span>
        )}
      </div>
      <Button
        type="button"
        variant="outline-general"
        size="small"
        className="!px-2 size-7 shrink-0 text-amber-900 hover:bg-amber-100"
        onClick={dismiss}
        aria-label="Dismiss demo banner"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
