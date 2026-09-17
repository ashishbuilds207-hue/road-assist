'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LiveRefreshControls } from '@/components/rsa/live-refresh-controls'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/rsa/empty-state'
import { useAuthStore } from '@/stores/authStore'
import type { JobBill, JobPhase } from '@/lib/dispatch/service-requests'

type Row = {
  id: string
  caseId: string
  caseNumber?: string
  driverName?: string | null
  locationLabel?: string
  jobPhase?: JobPhase
  caseStatus?: string
  status: string
  bill?: JobBill | null
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function isSolved(r: Row) {
  return r.jobPhase === 'PAID' || r.caseStatus === 'PAID' || r.bill?.status === 'PAID'
}

export default function ProviderActivePage() {
  const registrationId = useAuthStore((s) => s.registrationId)
  const storeProviderId = useAuthStore((s) => s.providerId)
  const providerId =
    registrationId || storeProviderId?.replace(/^prov-/, '') || storeProviderId
  const [rows, setRows] = useState<Row[]>([])
  const [refreshing, setRefreshing] = useState(false)

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
      setRows((data.requests || []) as Row[])
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

  const active = rows.filter((r) => r.status === 'ACCEPTED' && !isSolved(r))

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Active Jobs"
        description="Jobs in progress (not paid yet)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline-general" size="small">
              <Link href="/provider/jobs">Incoming & history</Link>
            </Button>
            <LiveRefreshControls
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          </div>
        }
      />
      {active.length === 0 ? (
        <EmptyState
          title="No active jobs"
          description="Accepted work shows here until the bill is paid. Solved cases are in Jobs → Solved."
        />
      ) : (
        active.map((r) => (
          <Card
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-semibold text-black">
                {r.caseNumber || r.caseId}
              </p>
              <p className="text-sm text-gray">
                {r.driverName || 'Driver'} · {r.locationLabel || 'USA'} ·{' '}
                {r.jobPhase || r.caseStatus || 'ACCEPTED'}
              </p>
            </div>
            <Badge variant="pending" size="small">
              {r.jobPhase || 'ACTIVE'}
            </Badge>
          </Card>
        ))
      )}
    </div>
  )
}
