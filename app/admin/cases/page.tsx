'use client'

import Link from 'next/link'
import { useCases } from '@/hooks/useCases'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LoadingSkeleton } from '@/components/rsa/loading-skeleton'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'
import { Card } from '@/components/ui/card'

export default function AdminCasesPage() {
  const { data: cases = [], isLoading } = useCases({ limit: 100 })

  return (
    <div>
      <PortalPageHeader title="Cases" description="All platform RSA cases." />
      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : cases.length === 0 ? (
        <EmptyState title="No cases" description="Cases will list when created." />
      ) : (
        <Card className="divide-y divide-gray-200 p-0">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cases/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-gray-200/50"
            >
              <div>
                <p className="font-semibold text-black">{c.case_number}</p>
                <p className="text-xs text-gray">{c.title ?? c.category_slug}</p>
              </div>
              <div className="flex gap-1">
                <PriorityBadge priority={c.priority} />
                <StatusBadge status={c.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}
