'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Phone, MessageSquare, Clock, History } from 'lucide-react'
import { useCases } from '@/hooks/useCases'
import { useAuthStore } from '@/stores/authStore'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatPanel } from '@/components/rsa/chat/chat-panel'
import { JobWorkflowPanel } from '@/components/rsa/job/job-workflow-panel'
import {
  JobDetailModal,
  type JobDetailRecord,
} from '@/components/rsa/job/job-detail-modal'
import { DispatchService } from '@/services/DispatchService'
import type { JobBill, JobPhase } from '@/lib/dispatch/service-requests'

type LiveRequest = {
  id: string
  caseId: string
  caseNumber?: string
  providerId: string
  providerName: string
  providerPhone?: string | null
  providerUserId?: string | null
  driverUserId?: string | null
  locationLabel?: string
  status: string
  jobPhase?: JobPhase
  caseStatus?: string
  bill?: JobBill | null
  expiresAt: string
  secondsLeft: number
}

function formatMmSs(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function isSolved(r: LiveRequest) {
  return (
    r.jobPhase === 'PAID' || r.caseStatus === 'PAID' || r.bill?.status === 'PAID'
  )
}

export default function DriverActiveClient() {
  const search = useSearchParams()
  const caseIdParam = search.get('caseId')
  const requestIdParam = search.get('requestId')
  const driverId = useAuthStore((s) => s.driverId)
  const userId = useAuthStore((s) => s.user?.id)
  const { data: cases = [], refetch } = useCases({
    driverId: driverId ?? undefined,
  })
  const [allRequests, setAllRequests] = useState<LiveRequest[]>([])
  const [seconds, setSeconds] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [selected, setSelected] = useState<JobDetailRecord | null>(null)

  const loadRequests = useCallback(async () => {
    if (!driverId && !userId && !caseIdParam) return
    const params = new URLSearchParams()
    if (driverId) params.set('driverId', driverId)
    if (userId) params.set('driverUserId', userId)
    if (!driverId && !userId && caseIdParam) {
      params.set('caseId', caseIdParam)
    }
    try {
      const res = await fetch(`/api/dispatch/requests?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      setAllRequests((data.requests || []) as LiveRequest[])
    } catch {
      // keep previous
    }
  }, [driverId, userId, caseIdParam])

  useEffect(() => {
    void loadRequests()
    const id = setInterval(() => void loadRequests(), 2000)
    return () => clearInterval(id)
  }, [loadRequests])

  const history = useMemo(
    () =>
      allRequests.filter(
        (r) =>
          isSolved(r) ||
          r.status === 'EXPIRED' ||
          r.status === 'CANCELLED' ||
          r.status === 'REJECTED'
      ),
    [allRequests]
  )

  const request = useMemo(() => {
    const live = allRequests.filter(
      (r) =>
        (r.status === 'PENDING' || r.status === 'ACCEPTED') && !isSolved(r)
    )
    if (requestIdParam) {
      const byId = live.find((r) => r.id === requestIdParam)
      if (byId) return byId
    }
    if (caseIdParam) {
      const byCase = live.find((r) => r.caseId === caseIdParam)
      if (byCase) return byCase
    }
    return (
      live.find((r) => r.status === 'PENDING') ||
      live.find((r) => r.status === 'ACCEPTED') ||
      null
    )
  }, [allRequests, caseIdParam, requestIdParam])

  const active = useMemo(() => {
    if (!request) return null
    return cases.find((c) => c.id === request.caseId) || null
  }, [cases, request])

  useEffect(() => {
    if (!request || request.status !== 'PENDING') return
    setSeconds(request.secondsLeft || 0)
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          void fetch('/api/dispatch/requests', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: request.id, action: 'cancel' }),
          }).then(() => {
            void DispatchService.rejectJob(
              request.caseId,
              request.providerId,
              'Expired — no response in 5 minutes'
            )
            void loadRequests()
            void refetch()
          })
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [request?.id, request?.status, loadRequests, refetch])

  const accepted = request?.status === 'ACCEPTED'
  const expired =
    request?.status === 'EXPIRED' || request?.status === 'CANCELLED'
  const pending = request?.status === 'PENDING'

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Active Case"
        description="Open jobs only. Paid cases move to Solved history."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={showHistory ? 'default' : 'outline-general'}
              onClick={() => setShowHistory((v) => !v)}
            >
              <History className="size-4" />
              Solved ({history.length})
            </Button>
            <Button asChild variant="black">
              <Link href="/driver/request">New request</Link>
            </Button>
          </div>
        }
      />

      {!request ? (
        <EmptyState
          title="No active case"
          description="Your last job is closed. Start a new request when you need help."
          action={
            <Button asChild variant="black">
              <Link href="/driver/request">Request assistance</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-gilroy text-lg font-bold text-black">
                {active?.case_number ||
                  request.caseNumber ||
                  request.caseId ||
                  'Request'}
              </h2>
              {active && <PriorityBadge priority={active.priority} />}
              {active && <StatusBadge status={active.status} />}
              {request.caseStatus && !active && (
                <Badge variant="pending" size="small">
                  {request.caseStatus}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray">
              {active?.title ?? active?.description ?? request.locationLabel}
            </p>

            {pending && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="flex items-center gap-2 font-semibold text-amber-950">
                  <Clock className="size-4" />
                  Waiting for {request.providerName} to accept
                </p>
                <p className="mt-1 font-gilroy text-3xl font-bold tracking-widest text-amber-950">
                  {formatMmSs(seconds)}
                </p>
              </div>
            )}

            {expired && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
                <p className="font-semibold text-danger">
                  Request expired / cancelled
                </p>
                <Button asChild variant="default" className="mt-2">
                  <Link href="/driver/request">New request</Link>
                </Button>
              </div>
            )}

            {accepted && (
              <div className="space-y-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
                <p className="font-semibold text-success">
                  {request.providerName} accepted your request
                </p>
                <div className="flex flex-wrap gap-2">
                  {request.providerPhone ? (
                    <Button asChild variant="default">
                      <a href={`tel:${request.providerPhone}`}>
                        <Phone className="size-4" />
                        Call service station
                      </a>
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline-general">
                    <MessageSquare className="size-4" />
                    Chat below
                  </Button>
                </div>
              </div>
            )}

            {accepted && (
              <JobWorkflowPanel
                requestId={request.id}
                caseId={request.caseId}
                jobPhase={request.jobPhase || 'ACCEPTED'}
                caseStatus={request.caseStatus}
                bill={request.bill}
                role="driver"
                onUpdated={() => {
                  void loadRequests()
                  void refetch()
                }}
              />
            )}
          </Card>

          {accepted && (
            <ChatPanel
              caseId={request.caseId}
              conversationId={`case-${request.caseId}`}
              title={`Live chat · ${request.providerName}`}
              peerName={request.providerName}
              peerPhone={request.providerPhone}
              peerUserId={
                request.providerUserId ||
                (request.providerId.startsWith('reg-')
                  ? request.providerId
                  : `reg-${request.providerId}`)
              }
              notifyLink={`/provider/jobs`}
            />
          )}
        </>
      )}

      {showHistory && (
        <div className="space-y-3 border-t border-gray-300 pt-4">
          <h3 className="font-gilroy text-lg font-bold text-black">
            Solved / history
          </h3>
          {history.length === 0 ? (
            <EmptyState
              title="No solved cases yet"
              description="Completed and paid requests appear here."
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
                    {r.providerName}
                    {r.bill ? ` · ${money(r.bill.totalCents)}` : ''}
                    {r.locationLabel ? ` · ${r.locationLabel}` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-primary">
                    View details →
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
          <Button asChild variant="outline-general">
            <Link href="/driver/cases">Open all cases</Link>
          </Button>
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
