'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, RefreshCw } from 'lucide-react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/rsa/empty-state'
import { JobWorkflowPanel } from '@/components/rsa/job/job-workflow-panel'
import {
  JobDetailModal,
  type JobDetailRecord,
} from '@/components/rsa/job/job-detail-modal'

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<JobDetailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JobDetailRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/dispatch/requests?bills=1')
    const data = await res.json()
    setRows((data.requests || []) as JobDetailRecord[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), 3000)
    return () => clearInterval(id)
  }, [load])

  const pending = rows.filter((r) => r.jobPhase === 'BILL_SUBMITTED')
  const paid = rows.filter((r) => r.jobPhase === 'PAID')

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Invoices & payments"
        description="Click any invoice to see timing, items, photos, and payment status."
        actions={
          <Button
            type="button"
            variant="outline-general"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />

      {loading && rows.length === 0 ? (
        <p className="text-sm text-gray">Loading bills…</p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="No bills yet"
          description="When a provider completes a job and submits the bill, it appears here for admin payment."
        />
      ) : null}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-black">Awaiting payment</h3>
          {pending.map((r) => (
            <Card key={r.id} className="space-y-3 p-4">
              <button
                type="button"
                onClick={() => setSelected(r)}
                className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
              >
                <div>
                  <p className="font-semibold text-black">
                    {r.bill?.invoiceNumber || r.caseNumber || r.caseId}
                  </p>
                  <p className="text-sm text-gray">
                    {r.providerName} · {r.driverName || 'Driver'} ·{' '}
                    {r.locationLabel || 'USA'}
                  </p>
                  <p className="mt-1 text-lg font-bold text-black">
                    {money(r.bill?.totalCents || 0)}
                  </p>
                  <p className="text-[11px] font-medium text-primary">
                    View full details →
                  </p>
                </div>
                <Badge variant="pending" size="small">
                  PAYMENT DUE
                </Badge>
              </button>
              <JobWorkflowPanel
                requestId={r.id}
                caseId={r.caseId}
                jobPhase={r.jobPhase as never}
                caseStatus={r.caseStatus}
                bill={r.bill}
                role="admin"
                onUpdated={() => void load()}
              />
            </Card>
          ))}
        </div>
      )}

      {paid.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-black">Paid / history</h3>
          {paid.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white p-4 text-left transition hover:border-primary/40 hover:bg-light-theme"
            >
              <div>
                <p className="font-semibold text-black">
                  {r.bill?.invoiceNumber || r.caseNumber}
                </p>
                <p className="text-sm text-gray">
                  {r.providerName} · {money(r.bill?.totalCents || 0)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-primary">
                  View timing, bill & photos →
                </p>
              </div>
              <Badge variant="success" size="small">
                <CreditCard className="mr-1 size-3" />
                PAID
              </Badge>
            </button>
          ))}
        </div>
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
