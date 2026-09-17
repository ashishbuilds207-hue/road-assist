'use client'

import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  title = 'Nothing here yet',
  description = 'When data is available, it will appear in this view.',
  icon,
  action,
  className,
}: {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center',
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-gray-200 text-gray">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-black">{title}</h3>
        <p className="max-w-sm text-sm text-gray">{description}</p>
      </div>
      {action}
    </div>
  )
}
