'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, CreditCard, RefreshCw } from 'lucide-react'
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
import { useToast } from '@/components/ui/use-toast'
import { CaseService } from '@/services/CaseService'

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function AdminInvoicesInner() {
  const search = useSearchParams()
  const tabParam = search.get('tab')
  const { toast } = useToast()
  const [rows, setRows] = useState<JobDetailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JobDetailRecord | null>(null)
  const [paying, setPaying] = useState<string | null>(null)
  const [tab, setTab] = useState<'due' | 'all'>(
    tabParam === 'all' ? 'all' : 'due'
  )

  useEffect(() => {
    setTab(tabParam === 'all' ? 'all' : 'due')
  }, [tabParam])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/dispatch/requests?bills=1', {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setRows((data.requests || []) as JobDetailRecord[])
    } catch {
      // keep previous — smooth UX
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(true), 2000)
    return () => clearInterval(id)
  }, [load])

  const pending = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.jobPhase === 'BILL_SUBMITTED' ||
          r.bill?.status === 'SUBMITTED'
      ),
    [rows]
  )
  const paid = useMemo(
    () => rows.filter((r) => r.jobPhase === 'PAID' || r.bill?.status === 'PAID'),
    [rows]
  )
  const all = useMemo(
    () =>
      rows.filter(
        (r) =>
          Boolean(r.bill) &&
          (r.jobPhase === 'BILL_SUBMITTED' ||
            r.jobPhase === 'PAID' ||
            r.jobPhase === 'COMPLETED' ||
            r.bill?.status === 'SUBMITTED' ||
            r.bill?.status === 'PAID' ||
            r.bill?.status === 'DRAFT')
      ),
    [rows]
  )

  const acceptPay = async (row: JobDetailRecord) => {
    setPaying(row.id)
    try {
      const res = await fetch('/api/dispatch/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action: 'payBill' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Pay failed', description: data.error })
        return
      }
      try {
        await CaseService.updateStatus(row.caseId, 'PAID' as never, {
          note: 'Admin accepted and paid invoice',
        })
      } catch {
        // soft fail
      }
      toast({
        title: 'Payment accepted',
        description: `${row.bill?.invoiceNumber || row.caseNumber} marked PAID. Driver & provider updated.`,
      })
      void load(true)
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Pay & Accept"
        description="Accept provider bills, pay invoices, and view full invoice history. Live for driver & provider."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={tab === 'due' ? 'default' : 'outline-general'}
              onClick={() => setTab('due')}
            >
              Due ({pending.length})
            </Button>
            <Button
              type="button"
              variant={tab === 'all' ? 'default' : 'outline-general'}
              onClick={() => setTab('all')}
            >
              All invoices ({all.length})
            </Button>
            <Button
              type="button"
              variant="outline-general"
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {loading && rows.length === 0 ? (
        <p className="text-sm text-gray">Loading invoices…</p>
      ) : null}

      {tab === 'due' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-black">Awaiting accept & pay</h3>
          {pending.length === 0 ? (
            <EmptyState
              title="No bills waiting"
              description="When a provider submits a bill, it appears here for you to accept and pay."
            />
          ) : (
            pending.map((r) => (
              <Card key={r.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-semibold text-black">
                      {r.bill?.invoiceNumber || r.caseNumber || r.caseId}
                    </p>
                    <p className="text-sm text-gray">
                      {r.providerName} · {r.driverName || 'Driver'} ·{' '}
                      {r.locationLabel || 'USA'}
                    </p>
                    <p className="mt-1 text-xl font-bold text-black">
                      {money(r.bill?.totalCents || 0)}
                    </p>
                    <p className="text-[11px] font-medium text-primary">
                      View invoice details →
                    </p>
                  </button>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="pending" size="small">
                      PAYMENT DUE
                    </Badge>
                    <Button
                      type="button"
                      variant="default"
                      disabled={paying === r.id}
                      onClick={() => void acceptPay(r)}
                    >
                      <CheckCircle2 className="size-4" />
                      Accept & Pay
                    </Button>
                  </div>
                </div>
                <JobWorkflowPanel
                  requestId={r.id}
                  caseId={r.caseId}
                  jobPhase={r.jobPhase as never}
                  caseStatus={r.caseStatus}
                  bill={r.bill}
                  role="admin"
                  onUpdated={() => void load(true)}
                />
              </Card>
            ))
          )}

          {paid.length > 0 && (
            <div className="space-y-3 border-t border-gray-300 pt-4">
              <h3 className="font-semibold text-black">Recently paid</h3>
              {paid.slice(0, 5).map((r) => (
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
                  </div>
                  <Badge variant="success" size="small">
                    <CreditCard className="mr-1 size-3" />
                    PAID
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'all' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-black">All invoices</h3>
          {all.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Completed job bills from providers appear here."
            />
          ) : (
            all.map((r) => {
              const isPaid =
                r.jobPhase === 'PAID' || r.bill?.status === 'PAID'
              const isDue =
                r.jobPhase === 'BILL_SUBMITTED' ||
                r.bill?.status === 'SUBMITTED'
              return (
                <Card
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelected(r)}
                  >
                    <p className="font-semibold text-black">
                      {r.bill?.invoiceNumber || r.caseNumber || r.caseId}
                    </p>
                    <p className="text-sm text-gray">
                      {r.providerName} · {r.driverName || 'Driver'} ·{' '}
                      {r.locationLabel || 'USA'}
                    </p>
                    <p className="mt-1 font-bold text-black">
                      {money(r.bill?.totalCents || 0)}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={isPaid ? 'success' : isDue ? 'pending' : 'pending'}
                      size="small"
                    >
                      {isPaid
                        ? 'PAID'
                        : isDue
                          ? 'DUE'
                          : r.bill?.status || r.jobPhase || 'OPEN'}
                    </Badge>
                    {isDue && (
                      <Button
                        type="button"
                        variant="default"
                        size="small"
                        disabled={paying === r.id}
                        onClick={() => void acceptPay(r)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Accept & Pay
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })
          )}
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

export default function AdminInvoicesPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-gray">Loading invoices…</div>}
    >
      <AdminInvoicesInner />
    </Suspense>
  )
}
