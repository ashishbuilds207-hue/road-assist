'use client'

import { useEffect } from 'react'
import { PortalPageHeader, StatCard } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PriorityBadge } from '@/components/rsa/status-badge'
import { useDemoStore } from '@/stores/demoStore'
import { useCasesRealtime } from '@/hooks/useCases'
import { DEMO_ACCOUNTS } from '@/types/rsa'

export default function ProviderDashboardPage() {
  const jobRequests = useDemoStore((s) => s.jobRequests)
  const acceptJob = useDemoStore((s) => s.acceptJob)
  const rejectJob = useDemoStore((s) => s.rejectJob)
  const seedJobRequest = useDemoStore((s) => s.seedJobRequest)
  useCasesRealtime(true)

  useEffect(() => {
    const id = setInterval(() => {
      // Poll demo store + occasionally seed a new request (realtime-style DEMO)
      if (Math.random() > 0.72) seedJobRequest()
    }, 12000)
    return () => clearInterval(id)
  }, [seedJobRequest])

  const pending = jobRequests.filter((j) => j.status === 'pending')
  const demo = DEMO_ACCOUNTS.find((a) => a.role === 'SERVICE_PROVIDER')

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Provider dashboard"
        description="Accept new truck RSA jobs in realtime DEMO mode."
        actions={
          <Button type="button" variant="outline-general" onClick={seedJobRequest}>
            Simulate new job
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Pending requests" value={pending.length} />
        <StatCard
          label="Accepted today"
          value={jobRequests.filter((j) => j.status === 'accepted').length}
        />
        <StatCard label="DEMO phone" value={demo?.phone ?? '—'} />
      </div>

      <Card className="space-y-3 border-2 border-primary/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-gilroy text-lg font-bold text-black">
            NEW JOB REQUEST
          </h2>
          <Badge variant="danger" size="small">
            LIVE DEMO
          </Badge>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-gray">
            Waiting for jobs… polling DEMO store and realtime channel.
          </p>
        ) : (
          pending.map((job) => (
            <div
              key={job.id}
              className="rounded-lg border border-gray-200 bg-gray-200/40 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-black">{job.caseNumber}</p>
                <PriorityBadge priority={job.priority} />
              </div>
              <p className="mt-1 text-sm text-black">{job.category}</p>
              <p className="text-xs text-gray">
                {job.location} · {job.distanceMiles} mi ·{' '}
                {new Date(job.requestedAt).toLocaleTimeString()}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="black"
                  onClick={() => acceptJob(job.id)}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  variant="outline-general"
                  onClick={() => rejectJob(job.id)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
