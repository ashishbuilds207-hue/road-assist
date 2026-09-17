'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
  History,
} from 'lucide-react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LiveRefreshControls } from '@/components/rsa/live-refresh-controls'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/rsa/empty-state'
import { ChatPanel } from '@/components/rsa/chat/chat-panel'
import { JobWorkflowPanel } from '@/components/rsa/job/job-workflow-panel'
import {
  JobDetailModal,
  type JobDetailRecord,
} from '@/components/rsa/job/job-detail-modal'
import { useAuthStore } from '@/stores/authStore'
import { DispatchService } from '@/services/DispatchService'
import { useToast } from '@/components/ui/use-toast'
import type { JobBill, JobPhase } from '@/lib/dispatch/service-requests'

type Incoming = {
  id: string
  caseId: string
  caseNumber?: string
  category?: string
  locationLabel?: string
  description?: string
  driverId?: string | null
  driverName?: string | null
  driverPhone?: string | null
  driverUserId?: string | null
  providerId: string
  providerName: string
  status: string
  jobPhase?: JobPhase
  caseStatus?: string
  bill?: JobBill | null
  expiresAt: string
  secondsLeft: number
  updated_at?: string
}

function formatMmSs(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function isSolved(r: Incoming) {
  return r.jobPhase === 'PAID' || r.caseStatus === 'PAID' || r.bill?.status === 'PAID'
}

function ProviderJobsInner() {
  const { toast } = useToast()
  const registrationId = useAuthStore((s) => s.registrationId)
  const storeProviderId = useAuthStore((s) => s.providerId)
  const providerId =
    registrationId || storeProviderId?.replace(/^prov-/, '') || storeProviderId
  const [items, setItems] = useState<Incoming[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [ticks, setTicks] = useState<Record<string, number>>({})
  const [acting, setActing] = useState<string | null>(null)
  const [activeChat, setActiveChat] = useState<Incoming | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [selected, setSelected] = useState<JobDetailRecord | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!providerId) return
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(
        `/api/dispatch/requests?providerId=${encodeURIComponent(providerId)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const data = await res.json()
      const list = (data.requests || []) as Incoming[]
      setItems(list)
      const next: Record<string, number> = {}
      for (const r of list) {
        if (r.status === 'PENDING') next[r.id] = r.secondsLeft
      }
      setTicks(next)
    } catch {
      // keep previous list — avoid flicker/vanish on network blips
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [providerId])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(true), 2000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    const id = setInterval(() => {
      setTicks((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          if (next[key] > 0) next[key] -= 1
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const act = async (row: Incoming, action: 'accept' | 'reject') => {
    setActing(row.id)
    const res = await fetch('/api/dispatch/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, action }),
    })
    const data = await res.json()
    setActing(null)
    if (!res.ok) {
      toast({ title: 'Failed', description: data.error })
      return
    }
    if (action === 'accept') {
      await DispatchService.acceptJob(row.caseId, row.providerId)
      setActiveChat({ ...row, status: 'ACCEPTED' })
      toast({ title: 'Request accepted', description: 'Chat & call unlocked.' })
    } else {
      await DispatchService.rejectJob(row.caseId, row.providerId, 'Declined')
      toast({ title: 'Request rejected' })
    }
    void load()
  }

  const pending = items.filter((i) => i.status === 'PENDING')
  const activeJobs = items.filter(
    (i) => i.status === 'ACCEPTED' && !isSolved(i)
  )
  const history = items.filter(
    (i) =>
      isSolved(i) ||
      i.status === 'REJECTED' ||
      i.status === 'EXPIRED' ||
      i.status === 'CANCELLED'
  )

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Incoming requests"
        description="Active jobs only. Paid / closed cases move to Solved history."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={showHistory ? 'default' : 'outline-general'}
              onClick={() => setShowHistory((v) => !v)}
            >
              <History className="size-4" />
              Solved ({history.length})
            </Button>
            <LiveRefreshControls
              refreshing={refreshing || loading}
              onRefresh={() => void load(true)}
            />
          </div>
        }
      />

      {!providerId && (
        <EmptyState
          title="Provider account required"
          description="Sign in as an approved service provider to receive jobs."
        />
      )}

      {providerId && pending.length === 0 && activeJobs.length === 0 && (
        <EmptyState
          title="No active requests"
          description="Queue is clear. New driver requests appear here. Paid jobs are in Solved history."
        />
      )}

      {pending.map((r) => (
        <Card key={r.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-black">
                {r.caseNumber || r.caseId} · {r.category || 'Truck RSA'}
              </p>
              <p className="text-sm text-gray">
                {r.driverName || 'Driver'} · {r.locationLabel || 'USA location'}
              </p>
            </div>
            <Badge variant="pending" size="small">
              PENDING
            </Badge>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-950">
            <Clock className="size-4" />
            <span className="font-gilroy text-2xl font-bold tracking-widest">
              {formatMmSs(ticks[r.id] ?? r.secondsLeft)}
            </span>
            <span className="text-xs">to accept</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              disabled={acting === r.id || (ticks[r.id] ?? 1) <= 0}
              onClick={() => void act(r, 'accept')}
            >
              <CheckCircle2 className="size-4" />
              Accept
            </Button>
            <Button
              type="button"
              variant="outline-general"
              disabled={acting === r.id}
              onClick={() => void act(r, 'reject')}
            >
              <XCircle className="size-4" />
              Reject
            </Button>
          </div>
        </Card>
      ))}

      {activeJobs.map((r) => (
        <Card key={r.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-black">
                {r.caseNumber || r.caseId} · {r.jobPhase || 'Accepted'}
              </p>
              <p className="text-sm text-gray">
                {r.driverName || 'Driver'} · {r.locationLabel}
              </p>
            </div>
            <Badge variant="success" size="small">
              {r.caseStatus || r.jobPhase || 'ACCEPTED'}
            </Badge>
          </div>
          <JobWorkflowPanel
            requestId={r.id}
            caseId={r.caseId}
            jobPhase={r.jobPhase || 'ACCEPTED'}
            caseStatus={r.caseStatus}
            bill={r.bill}
            role="provider"
            onUpdated={() => void load()}
          />
          <div className="flex flex-wrap gap-2">
            {r.driverPhone ? (
              <Button asChild variant="default">
                <a href={`tel:${r.driverPhone}`}>
                  <Phone className="size-4" />
                  Call driver
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline-general"
              onClick={() =>
                setActiveChat((cur) => (cur?.id === r.id ? null : r))
              }
            >
              <MessageSquare className="size-4" />
              {activeChat?.id === r.id ? 'Hide chat' : 'Open live chat'}
            </Button>
          </div>
          {activeChat?.id === r.id && (
            <ChatPanel
              caseId={r.caseId}
              conversationId={`case-${r.caseId}`}
              title={`Live chat · ${r.driverName || 'Driver'}`}
              peerName={r.driverName || 'Driver'}
              peerPhone={r.driverPhone}
              peerUserId={
                r.driverUserId ||
                (r.driverId ? r.driverId.replace(/^drv-/, 'reg-') : null)
              }
              notifyLink={`/driver/active?caseId=${encodeURIComponent(r.caseId)}`}
            />
          )}
        </Card>
      ))}

      {showHistory && (
        <div className="space-y-3 border-t border-gray-300 pt-4">
          <h3 className="font-gilroy text-lg font-bold text-black">
            Solved / history
          </h3>
          {history.length === 0 ? (
            <EmptyState
              title="No solved cases yet"
              description="Completed and paid jobs appear here."
            />
          ) : (
            history.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white p-4 text-left transition hover:border-primary/40 hover:bg-light-theme"
              >
                <div>
                  <p className="font-semibold text-black">
                    {r.caseNumber || r.caseId}
                  </p>
                  <p className="text-sm text-gray">
                    {r.driverName || 'Driver'} · {r.locationLabel || 'USA'}
                    {r.bill ? ` · ${money(r.bill.totalCents)}` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-primary">
                    View timing, bill & photos →
                  </p>
                </div>
                <Badge
                  variant={isSolved(r) ? 'success' : 'pending'}
                  size="small"
                >
                  {isSolved(r) ? 'PAID · SOLVED' : r.status}
                </Badge>
              </button>
            ))
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

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-gray">Loading requests…</div>}
    >
      <ProviderJobsInner />
    </Suspense>
  )
}
