'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Siren } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SmartEmergencyFlow } from '@/components/rsa/emergency/smart-emergency-flow'
import { PortalPageHeader, StatCard } from '@/components/rsa/portal-page'
import { useCases } from '@/hooks/useCases'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'
import { useCanPost } from '@/hooks/useCanPost'

export default function DriverDashboardPage() {
  const [open, setOpen] = useState(false)
  const driverId = useAuthStore((s) => s.driverId)
  const profile = useAuthStore((s) => s.profile)
  const accountStatus = useAuthStore((s) => s.accountStatus)
  const { data: cases = [] } = useCases({
    driverId: driverId ?? undefined,
    limit: 5,
  })
  const { canPost, guardPost } = useCanPost()

  const openCases = cases.filter(
    (c) =>
      !['completed', 'cancelled', 'CLOSED', 'CANCELLED', 'PAID'].includes(
        c.status
      )
  )

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title={`Hello, ${profile?.full_name ?? 'Driver'}`}
        description={
          accountStatus === 'ACTIVE'
            ? 'Commercial truck roadside assistance — request help in minutes.'
            : 'Your account is not active right now — please wait. You can browse but not post.'
        }
      />

      <Card className="overflow-hidden bg-gradient-to-br from-[#1a237e] to-primary p-5 text-white shadow-3xl sm:p-8">
        <p className="text-sm font-medium text-white/80">Emergency roadside</p>
        <h2 className="mt-2 font-gilroy text-2xl font-bold sm:text-3xl">
          Need truck assistance now?
        </h2>
        <p className="mt-2 max-w-xl text-sm text-white/85">
          Start the guided request for commercial trucks only. If you are in
          immediate danger, call 911 first — RSA does not replace emergency
          services.
        </p>
        <Button
          type="button"
          size="extralarge"
          variant="black"
          className="mt-6 w-full bg-white text-black hover:bg-gray-200 sm:w-auto"
          onClick={() => {
            if (!guardPost('request truck assistance')) return
            setOpen(true)
          }}
        >
          <Siren className="size-5" />
          🚨 I NEED TRUCK ASSISTANCE
          {!canPost ? ' (locked)' : ''}
        </Button>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Open cases" value={openCases.length} />
        <StatCard label="Total cases" value={cases.length} />
        <StatCard
          label="Account"
          value={accountStatus}
          hint={
            accountStatus === 'ACTIVE' ? 'Full access' : 'Waiting for admin'
          }
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-black">Recent cases</h3>
          <Link
            href="/driver/cases"
            className="text-xs font-semibold text-primary"
          >
            View all
          </Link>
        </div>
        {cases.length === 0 ? (
          <p className="text-sm text-gray">
            No cases yet. Request assistance when your account is active.
          </p>
        ) : (
          <ul className="space-y-2">
            {cases.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/driver/cases/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-200/60"
                >
                  <div>
                    <p className="font-semibold text-black">{c.case_number}</p>
                    <p className="text-xs text-gray">
                      {c.title ?? c.category_slug ?? 'Assistance'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SmartEmergencyFlow open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
