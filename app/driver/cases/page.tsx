'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useCases } from '@/hooks/useCases'
import { useAuthStore } from '@/stores/authStore'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LoadingSkeleton } from '@/components/rsa/loading-skeleton'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  JobDetailModal,
  type JobDetailRecord,
} from '@/components/rsa/job/job-detail-modal'

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function DriverCasesPage() {
  const driverId = useAuthStore((s) => s.driverId)
  const userId = useAuthStore((s) => s.user?.id)
  const { data: cases = [], isLoading } = useCases({
    driverId: driverId ?? undefined,
  })
  const [solved, setSolved] = useState<JobDetailRecord[]>([])
  const [selected, setSelected] = useState<JobDetailRecord | null>(null)

  const loadSolved = useCallback(async () => {
    if (!driverId && !userId) return
    const params = new URLSearchParams()
    if (driverId) params.set('driverId', driverId)
    if (userId) params.set('driverUserId', userId)
    const res = await fetch(`/api/dispatch/requests?${params.toString()}`)
    const data = await res.json()
    const list = ((data.requests || []) as JobDetailRecord[]).filter(
      (r) => r.jobPhase === 'PAID' || r.caseStatus === 'PAID'
    )
    setSolved(list)
  }, [driverId, userId])

  useEffect(() => {
    void loadSolved()
  }, [loadSolved])

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="My Cases"
        description="Tap a solved invoice to open full timing, bill items, and photos."
      />

      <div className="space-y-3">
        <h3 className="font-semibold text-black">Solved / paid</h3>
        {solved.length === 0 ? (
          <EmptyState
            title="No solved cases yet"
            description="When a job is paid, it closes from Active and lands here."
          />
        ) : (
          <Card className="divide-y divide-gray-200 p-0">
            {solved.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-light-theme"
              >
                <div>
                  <p className="font-semibold text-black">
                    {r.caseNumber || r.caseId}
                  </p>
                  <p className="text-xs text-gray">
                    {r.providerName}
                    {r.bill ? ` · ${money(r.bill.totalCents)}` : ''}
                    {r.bill?.invoiceNumber ? ` · ${r.bill.invoiceNumber}` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-primary">
                    View details →
                  </p>
                </div>
                <Badge variant="success" size="small">
                  PAID · SOLVED
                </Badge>
              </button>
            ))}
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-black">All cases</h3>
        {isLoading ? (
          <LoadingSkeleton rows={5} />
        ) : cases.length === 0 ? (
          <EmptyState
            title="No cases"
            description="When you request assistance, cases will list here."
          />
        ) : (
          <Card className="divide-y divide-gray-200 p-0">
            {cases.map((c) => {
              const match = solved.find((s) => s.caseId === c.id)
              if (match) {
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(match)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-light-theme"
                  >
                    <div>
                      <p className="font-semibold text-black">{c.case_number}</p>
                      <p className="text-xs text-gray">
                        {c.title ?? c.description ?? c.category_slug}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-primary">
                        View invoice details →
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <PriorityBadge priority={c.priority} />
                      <Badge variant="success" size="small">
                        PAID
                      </Badge>
                    </div>
                  </button>
                )
              }
              return (
                <Link
                  key={c.id}
                  href={`/driver/cases/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-gray-200/50"
                >
                  <div>
                    <p className="font-semibold text-black">{c.case_number}</p>
                    <p className="text-xs text-gray">
                      {c.title ?? c.description ?? c.category_slug}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              )
            })}
          </Card>
        )}
      </div>

      <JobDetailModal
        open={Boolean(selected)}
        onOpenChange={(o) => {
          if (!o) setSelected(null)
        }}
        job={selected}
      />
    </div>
  )
}
