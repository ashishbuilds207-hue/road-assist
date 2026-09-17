'use client'

import { useMemo, useState } from 'react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge } from '@/components/rsa/status-badge'
import { useToast } from '@/components/ui/use-toast'
import { useDemoDataStore } from '@/stores/demoDataStore'
import { useAuthStore } from '@/stores/authStore'
import type { CaseStatus } from '@/types/database'

const CHECKS = [
  'Visual damage documented',
  'Safety cones / triangle placed',
  'Plate and unit verified',
  'Customer contacted on site',
]

const INSPECTION_STATUSES: CaseStatus[] = [
  'ARRIVED',
  'INSPECTION',
  'TECHNICIAN_ASSIGNED',
  'EN_ROUTE',
]

export default function TechnicianInspectionPage() {
  const { toast } = useToast()
  const techId = useAuthStore((s) => s.technicianId) || 'demo-tech-1'
  const ensureSeeded = useDemoDataStore((s) => s.ensureSeeded)
  ensureSeeded()
  const cases = useDemoDataStore((s) => s.cases)
  const updateCaseStatus = useDemoDataStore((s) => s.updateCaseStatus)

  const activeCases = useMemo(
    () =>
      cases.filter(
        (c) =>
          (c.technician_id === techId ||
            (!c.technician_id &&
              ['ARRIVED', 'EN_ROUTE', 'TECHNICIAN_ASSIGNED', 'INSPECTION'].includes(
                c.status
              ))) &&
          INSPECTION_STATUSES.includes(c.status)
      ),
    [cases, techId]
  )

  const [caseId, setCaseId] = useState('')
  const [done, setDone] = useState<Record<string, boolean>>({})
  const selectedId = caseId || activeCases[0]?.id || ''
  const selected = cases.find((c) => c.id === selectedId)
  const allChecked = CHECKS.every((c) => done[c])

  const saveInspection = () => {
    if (!selectedId) {
      toast({ title: 'No case', description: 'Select an on-site case first.' })
      return
    }
    if (!allChecked) {
      toast({
        title: 'Checklist incomplete',
        description: 'Complete all inspection items before saving.',
      })
      return
    }
    updateCaseStatus(selectedId, 'INSPECTION', {
      note: 'On-site inspection checklist completed',
    })
    toast({
      title: 'Inspection saved',
      description: 'Case moved to INSPECTION — ready for estimate.',
    })
  }

  if (activeCases.length === 0) {
    return (
      <EmptyState
        title="No inspection jobs"
        description="Arrive on a case (ARRIVED) to run the inspection checklist."
      />
    )
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Inspection"
        description="On-site inspection checklist before estimate."
      />
      <Card className="space-y-3 p-4">
        <label className="block text-sm text-black">
          Case
          <select
            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            value={selectedId}
            onChange={(e) => setCaseId(e.target.value)}
          >
            {activeCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} · {c.status}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <div className="flex gap-2">
            <StatusBadge status={selected.status} />
          </div>
        )}
        {CHECKS.map((c) => (
          <label key={c} className="flex items-center gap-3 text-sm text-black">
            <Checkbox
              checked={Boolean(done[c])}
              onCheckedChange={(v) =>
                setDone((s) => ({ ...s, [c]: Boolean(v) }))
              }
            />
            {c}
          </label>
        ))}
        <Button type="button" variant="black" onClick={saveInspection}>
          Save inspection
        </Button>
      </Card>
    </div>
  )
}
