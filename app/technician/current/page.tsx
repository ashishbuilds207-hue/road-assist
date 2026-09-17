'use client'

import { useDemoStore } from '@/stores/demoStore'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { EmptyState } from '@/components/rsa/empty-state'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/rsa/status-badge'

export default function Page() {
  const job = useDemoStore((s) =>
    s.jobRequests.find((j) => j.status === 'accepted')
  )
  const setStatus = useDemoStore((s) => s.setTechnicianStatus)
  const status = useDemoStore((s) => s.technicianStatus)

  if (!job) {
    return (
      <EmptyState
        title="No current job"
        description="Accepted jobs will appear here for on-site work."
      />
    )
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader title="Current job" description={job.caseNumber} />
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={status} />
        </div>
        <p className="font-semibold text-black">{job.category}</p>
        <p className="text-sm text-gray">{job.location}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline-general" onClick={() => setStatus('EN_ROUTE')}>
            En route
          </Button>
          <Button type="button" variant="outline-general" onClick={() => setStatus('ARRIVED')}>
            Arrived
          </Button>
          <Button type="button" variant="black" onClick={() => setStatus('BUSY')}>
            Start work
          </Button>
          <Button type="button" variant="default" onClick={() => setStatus('AVAILABLE')}>
            Complete
          </Button>
        </div>
      </Card>
    </div>
  )
}
