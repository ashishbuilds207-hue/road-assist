'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PortalPageHeader, StatCard } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnalyticsService } from '@/services/AnalyticsService'
import { useAuthStore } from '@/stores/authStore'
import { useCases } from '@/hooks/useCases'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'

export default function CompanyDashboardPage() {
  const companyId = useAuthStore((s) => s.companyId)
  const [metrics, setMetrics] = useState({
    totalCases: 0,
    openCases: 0,
    completed: 0,
    fleetVehicles: 0,
  })
  const { data: cases = [] } = useCases({
    companyId: companyId || undefined,
    limit: 8,
  })

  useEffect(() => {
    if (!companyId) return
    void AnalyticsService.getCompanyMetrics(companyId).then((res) => {
      if (res.data) setMetrics(res.data)
    })
  }, [companyId])

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Fleet dashboard"
        description="Monitor roadside cases, estimates, and fleet readiness from real data only."
        actions={
          <Button asChild variant="black">
            <Link href="/company/estimates">Review estimates</Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cases" value={metrics.totalCases || cases.length} />
        <StatCard label="Open cases" value={metrics.openCases} />
        <StatCard label="Completed" value={metrics.completed} />
        <StatCard label="Fleet vehicles" value={metrics.fleetVehicles} />
      </div>
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-black">Recent cases</h3>
        <ul className="space-y-2">
          {cases.length === 0 && (
            <li className="text-sm text-gray">
              No cases yet. Cases appear when drivers under this company request RSA.
            </li>
          )}
          {cases.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
            >
              <div>
                <p className="font-medium text-black">{c.case_number || c.id}</p>
                <p className="text-xs text-gray">{c.title || c.category_slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={c.priority} />
                <StatusBadge status={c.status} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
