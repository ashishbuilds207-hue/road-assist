'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LiveRefreshControls } from '@/components/rsa/live-refresh-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/rsa/empty-state'
import { useAuthStore } from '@/stores/authStore'
import {
  JobDetailModal,
  type JobDetailRecord,
} from '@/components/rsa/job/job-detail-modal'

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function ProviderInvoicesPage() {
  const registrationId = useAuthStore((s) => s.registrationId)
  const storeProviderId = useAuthStore((s) => s.providerId)
  const providerId =
    registrationId || storeProviderId?.replace(/^prov-/, '') || storeProviderId
  const [rows, setRows] = useState<JobDetailRecord[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<JobDetailRecord | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!providerId) return
    if (silent) setRefreshing(true)
    try {
      const res = await fetch(
        `/api/dispatch/requests?providerId=${encodeURIComponent(providerId)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const data = await res.json()
      const list = ((data.requests || []) as JobDetailRecord[]).filter(
        (r) =>
          r.jobPhase === 'PAID' ||
          r.jobPhase === 'BILL_SUBMITTED' ||
          r.bill?.status === 'PAID' ||
          r.bill?.status === 'SUBMITTED'
      )
      setRows(list)
    } catch {
      // keep previous — smooth shared updates
    } finally {
      setRefreshing(false)
    }
  }, [providerId])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(true), 2000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Invoices"
        description="Click an invoice to open full job timing, items, and photos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline-general" size="small">
              <Link href="/provider/jobs">Back to jobs</Link>
            </Button>
            <LiveRefreshControls
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="After service is completed and a bill is submitted, it appears here."
        />
      ) : (
        rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelected(r)}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white p-4 text-left transition hover:border-primary/40 hover:bg-light-theme"
          >
            <div>
              <p className="font-semibold text-black">
                {r.bill?.invoiceNumber || r.caseNumber || r.caseId}
              </p>
              <p className="text-sm text-gray">
                {r.driverName || 'Driver'} · {r.locationLabel || 'USA'}
                {r.bill ? ` · ${money(r.bill.totalCents)}` : ''}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-primary">
                View details →
              </p>
            </div>
            <Badge
              variant={r.jobPhase === 'PAID' ? 'success' : 'pending'}
              size="small"
            >
              {r.jobPhase === 'PAID' ? 'PAID · SOLVED' : 'AWAITING PAY'}
            </Badge>
          </button>
        ))
      )}

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
