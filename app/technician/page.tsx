'use client'

import { PortalPageHeader, StatCard } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDemoStore } from '@/stores/demoStore'
import { DEMO_ACCOUNTS } from '@/types/rsa'
import type { TechnicianStatus } from '@/types/database'

const STATUSES: TechnicianStatus[] = [
  'AVAILABLE',
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'BUSY',
  'OFFLINE',
]

export default function TechnicianHomePage() {
  const status = useDemoStore((s) => s.technicianStatus)
  const setStatus = useDemoStore((s) => s.setTechnicianStatus)
  const simulate = useDemoStore((s) => s.simulateTechnicianMovement)
  const lat = useDemoStore((s) => s.technicianLat)
  const lng = useDemoStore((s) => s.technicianLng)
  const jobs = useDemoStore((s) =>
    s.jobRequests.filter((j) => j.status === 'accepted')
  )
  const demo = DEMO_ACCOUNTS.find((a) => a.role === 'TECHNICIAN')

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Assigned jobs"
        description="Mobile-first technician workflow."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Status" value={status} />
        <StatCard label="Assigned" value={jobs.length} />
        <StatCard label="DEMO phone" value={demo?.phone ?? '—'} />
      </div>

      <Card className="space-y-3 p-4">
        <p className="font-semibold text-black">Technician status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s}
              type="button"
              size="small"
              variant={status === s ? 'black' : 'outline-general'}
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <Button type="button" variant="default" onClick={simulate}>
          Simulate Technician Movement (DEMO)
        </Button>
        <p className="text-xs text-gray">
          Position: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      </Card>

      <Card className="divide-y divide-gray-200 p-0">
        {jobs.length === 0 && (
          <p className="p-4 text-sm text-gray">No assigned jobs yet.</p>
        )}
        {jobs.map((j) => (
          <div key={j.id} className="flex items-center justify-between gap-2 p-4">
            <div>
              <p className="font-semibold text-black">{j.caseNumber}</p>
              <p className="text-xs text-gray">
                {j.category} · {j.location}
              </p>
            </div>
            <Badge variant="blue" size="small">
              ASSIGNED
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  )
}
