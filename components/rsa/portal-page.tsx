'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/rsa/empty-state'
import { LoadingSkeleton } from '@/components/rsa/loading-skeleton'
import { Badge } from '@/components/ui/badge'

export function PortalPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-gilroy text-xl font-bold text-black sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray">{description}</p>
        )}
      </div>
      {actions}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray">
        {label}
      </p>
      <p className="mt-2 font-gilroy text-2xl font-bold text-black">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray">{hint}</p>}
    </Card>
  )
}

export function ConnectedStubPage({
  title,
  description,
  rows = [],
  loading = false,
  emptyTitle = 'No records yet',
  emptyDescription = 'Connected to live services when data is available. DEMO may show empty lists.',
  actionHref,
  actionLabel,
}: {
  title: string
  description?: string
  rows?: { id: string; title: string; subtitle?: string; badge?: string }[]
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div>
      <PortalPageHeader
        title={title}
        description={description}
        actions={
          actionHref ? (
            <Button asChild variant="black">
              <Link href={actionHref}>{actionLabel ?? 'Open'}</Link>
            </Button>
          ) : undefined
        }
      />
      <Card className="p-4">
        <CardHeader className="mb-3 p-0">
          <p className="text-sm font-semibold text-black">Records</p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : rows.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          ) : (
            <ul className="divide-y divide-gray-200">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-semibold text-black">{row.title}</p>
                    {row.subtitle && (
                      <p className="text-xs text-gray">{row.subtitle}</p>
                    )}
                  </div>
                  {row.badge && (
                    <Badge variant="outline" size="small">
                      {row.badge}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
