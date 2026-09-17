'use client'

import { useMemo, useState } from 'react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge } from '@/components/rsa/status-badge'
import { useToast } from '@/components/ui/use-toast'
import { useDemoDataStore } from '@/stores/demoDataStore'
import { useAuthStore } from '@/stores/authStore'
import type { CaseStatus, EstimateLineItem } from '@/types/database'

const ESTIMATE_ELIGIBLE: CaseStatus[] = [
  'ARRIVED',
  'INSPECTION',
  'APPROVED',
  'PROVIDER_ACCEPTED',
  'TECHNICIAN_ASSIGNED',
  'REPAIR_COMPLETED',
]

export default function ProviderEstimatesPage() {
  const { toast } = useToast()
  const providerId =
    useAuthStore((s) => s.providerId) || 'demo-prov-highway'
  const ensureSeeded = useDemoDataStore((s) => s.ensureSeeded)
  ensureSeeded()
  const cases = useDemoDataStore((s) => s.cases)
  const estimates = useDemoDataStore((s) => s.estimates)
  const submitEstimate = useDemoDataStore((s) => s.submitEstimate)

  const eligibleCases = useMemo(
    () =>
      cases.filter(
        (c) =>
          (c.service_provider_id === providerId || !c.service_provider_id) &&
          (ESTIMATE_ELIGIBLE.includes(c.status) ||
            c.status === 'WAITING_APPROVAL' ||
            c.status === 'ESTIMATE_SUBMITTED')
      ),
    [cases, providerId]
  )

  const [caseId, setCaseId] = useState('')
  const [laborDesc, setLaborDesc] = useState('Mobile service call')
  const [laborCents, setLaborCents] = useState('12500')
  const [partDesc, setPartDesc] = useState('Parts')
  const [partCents, setPartCents] = useState('6000')
  const [notes, setNotes] = useState('')

  const selectedId = caseId || eligibleCases[0]?.id || ''

  const providerEstimates = estimates.filter(
    (e) =>
      e.service_provider_id === providerId ||
      eligibleCases.some((c) => c.id === e.case_id)
  )

  const onSubmit = () => {
    if (!selectedId) {
      toast({ title: 'Select a case', description: 'No eligible case selected.' })
      return
    }
    const labor = Math.max(0, parseInt(laborCents, 10) || 0)
    const part = Math.max(0, parseInt(partCents, 10) || 0)
    const line_items: EstimateLineItem[] = [
      {
        description: laborDesc || 'Labor',
        quantity: 1,
        unit_price_cents: labor,
        total_cents: labor,
      },
    ]
    if (part > 0) {
      line_items.push({
        description: partDesc || 'Parts',
        quantity: 1,
        unit_price_cents: part,
        total_cents: part,
      })
    }
    const est = submitEstimate({
      case_id: selectedId,
      service_provider_id: providerId,
      line_items,
      notes: notes || undefined,
    })
    toast({
      title: 'Estimate submitted',
      description: `$${((est.total_cents ?? 0) / 100).toFixed(2)} — company can approve in DEMO.`,
    })
    setNotes('')
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Estimates"
        description="Draft and submit estimates for active jobs (demoDataStore)."
      />

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold text-black">Submit estimate</h3>
        {eligibleCases.length === 0 ? (
          <EmptyState
            title="No eligible cases"
            description="Arrive on site or accept a job first."
          />
        ) : (
          <>
            <label className="block text-sm text-black">
              Case
              <select
                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                value={selectedId}
                onChange={(e) => setCaseId(e.target.value)}
              >
                {eligibleCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} · {c.status}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={laborDesc}
                onChange={(e) => setLaborDesc(e.target.value)}
                placeholder="Labor description"
              />
              <Input
                value={laborCents}
                onChange={(e) => setLaborCents(e.target.value)}
                placeholder="Labor cents"
                inputMode="numeric"
              />
              <Input
                value={partDesc}
                onChange={(e) => setPartDesc(e.target.value)}
                placeholder="Part description"
              />
              <Input
                value={partCents}
                onChange={(e) => setPartCents(e.target.value)}
                placeholder="Part cents"
                inputMode="numeric"
              />
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes for company approval"
              rows={2}
            />
            <Button type="button" variant="black" onClick={onSubmit}>
              Submit estimate
            </Button>
          </>
        )}
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold text-black">Submitted</h3>
        {providerEstimates.length === 0 ? (
          <EmptyState
            title="No estimates yet"
            description="Submitted estimates appear here."
          />
        ) : (
          providerEstimates.map((est) => {
            const c = cases.find((x) => x.id === est.case_id)
            return (
              <Card key={est.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-semibold text-black">
                    {c?.case_number ?? est.case_id}
                  </p>
                  <p className="text-sm text-gray">
                    ${((est.total_cents ?? 0) / 100).toFixed(2)} USD
                  </p>
                </div>
                <div className="flex gap-2">
                  {c && <StatusBadge status={c.status} />}
                  <Badge
                    variant={
                      est.status === 'APPROVED'
                        ? 'success'
                        : est.status === 'REJECTED'
                          ? 'danger'
                          : 'pending'
                    }
                  >
                    {est.status}
                  </Badge>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
