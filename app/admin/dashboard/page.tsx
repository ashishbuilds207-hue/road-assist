'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PortalPageHeader, StatCard } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnalyticsService } from '@/services/AnalyticsService'
import { useCases } from '@/hooks/useCases'
import { useDemoDataStore } from '@/stores/demoDataStore'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'
import { DEMO_ACCOUNTS } from '@/types/rsa'

const CLOSED_STATUSES = new Set(['CLOSED', 'CANCELLED', 'PAID'])

export default function AdminDashboardPage() {
  const ensureSeeded = useDemoDataStore((s) => s.ensureSeeded)
  ensureSeeded()
  const storeCases = useDemoDataStore((s) => s.cases)
  const providers = useDemoDataStore((s) => s.providers)
  const companies = useDemoDataStore((s) => s.companies)

  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>(
    []
  )
  const [byDay, setByDay] = useState<{ date: string; count: number }[]>([])
  const { data: cases = [] } = useCases({ limit: 10 })
  const demo = DEMO_ACCOUNTS.find((a) => a.role === 'ADMIN')

  useEffect(() => {
    void AnalyticsService.getCasesByStatus().then((res) => {
      if (res.data) setByStatus(res.data)
    })
    void AnalyticsService.getCasesByDay().then((res) => {
      if (res.data) setByDay(res.data)
    })
  }, [storeCases])

  const statusSource =
    byStatus.length > 0
      ? byStatus
      : Object.entries(
          storeCases.reduce<Record<string, number>>((acc, c) => {
            acc[c.status] = (acc[c.status] ?? 0) + 1
            return acc
          }, {})
        ).map(([status, count]) => ({ status, count }))

  const total =
    statusSource.reduce((s, r) => s + r.count, 0) ||
    storeCases.length ||
    cases.length
  const open =
    statusSource
      .filter((r) => !CLOSED_STATUSES.has(r.status))
      .reduce((s, r) => s + r.count, 0) ||
    storeCases.filter((c) => !CLOSED_STATUSES.has(c.status)).length

  const recent = useMemo(() => {
    const list = cases.length > 0 ? cases : storeCases
    return [...list]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10)
  }, [cases, storeCases])

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Admin dashboard"
        description="Live platform stats from AnalyticsService and the demo case store."
        actions={
          <Button asChild variant="black">
            <Link href="/admin/operations">Open live operations</Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cases" value={total} />
        <StatCard label="Open / active" value={open} />
        <StatCard label="Companies" value={companies.length} />
        <StatCard
          label="Providers"
          value={providers.length}
          hint={`DEMO admin ${demo?.phone ?? ''}`}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-semibold text-black">Cases by status</h3>
          <ul className="space-y-2">
            {statusSource.length === 0 && (
              <li className="text-sm text-gray">No cases yet.</li>
            )}
            {statusSource.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between text-sm"
              >
                <StatusBadge status={row.status} />
                <span className="font-semibold text-black">{row.count}</span>
              </li>
            ))}
          </ul>
          {byDay.length > 0 && (
            <p className="mt-3 text-xs text-gray">
              {byDay.length} day(s) with volume in analytics.
            </p>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-semibold text-black">Recent cases</h3>
          <ul className="space-y-2">
            {recent.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/cases/${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-200/50"
                >
                  <span className="font-semibold text-black">{c.case_number}</span>
                  <div className="flex gap-1">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
