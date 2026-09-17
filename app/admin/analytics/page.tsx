'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PortalPageHeader, StatCard } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { AnalyticsService } from '@/services/AnalyticsService'
import { useDemoDataStore } from '@/stores/demoDataStore'

export default function AdminAnalyticsPage() {
  const ensureSeeded = useDemoDataStore((s) => s.ensureSeeded)
  ensureSeeded()
  const storeCases = useDemoDataStore((s) => s.cases)

  const [byDay, setByDay] = useState<{ date: string; count: number }[]>([])
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>(
    []
  )
  const [byState, setByState] = useState<{ state: string; count: number }[]>([])

  useEffect(() => {
    void AnalyticsService.getCasesByDay().then((r) => setByDay(r.data ?? []))
    void AnalyticsService.getCasesByStatus().then((r) =>
      setByStatus(r.data ?? [])
    )
    void AnalyticsService.getCasesByState().then((r) => setByState(r.data ?? []))
  }, [storeCases])

  const totalCases = byStatus.reduce((s, r) => s + r.count, 0) || storeCases.length

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Analytics"
        description="Platform volume charts powered by AnalyticsService + Recharts (demo store when DEMO MODE is on)."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total cases" value={totalCases} />
        <StatCard label="Status groups" value={byStatus.length} />
        <StatCard label="States" value={byState.length} />
      </div>
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-black">Cases by day</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay.length ? byDay : [{ date: '—', count: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#335CFF" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-black">Cases by status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byStatus.length ? byStatus : [{ status: '—', count: 0 }]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a237e" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-black">Cases by state</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byState.length ? byState : [{ state: '—', count: 0 }]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0d9488" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
