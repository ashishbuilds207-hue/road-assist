'use client'

import { cn } from '@/lib/utils'

export function LoadingSkeleton({
  rows = 4,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg bg-gray-200"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse space-y-3 rounded-lg bg-white p-5 shadow-3xl',
        className
      )}
    >
      <div className="h-4 w-1/3 rounded bg-gray-200" />
      <div className="h-8 w-1/2 rounded bg-gray-200" />
      <div className="h-3 w-full rounded bg-gray-200" />
    </div>
  )
}
