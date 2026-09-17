'use client'

import { useMemo, useState } from 'react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge } from '@/components/rsa/status-badge'
import { useToast } from '@/components/ui/use-toast'
import { useDemoDataStore } from '@/stores/demoDataStore'
import { useAuthStore } from '@/stores/authStore'
import type { CaseStatus } from '@/types/database'

const REPAIR_STATUSES: CaseStatus[] = [
  'APPROVED',
  'REPAIR_STARTED',
  'WAITING_PARTS',
  'INSPECTION',
  'WAITING_APPROVAL',
]

export default function TechnicianRepairPage() {
  const { toast } = useToast()
  const techId = useAuthStore((s) => s.technicianId) || 'demo-tech-1'
  const ensureSeeded = useDemoDataStore((s) => s.ensureSeeded)
  ensureSeeded()
  const cases = useDemoDataStore((s) => s.cases)
  const updateCaseStatus = useDemoDataStore((s) => s.updateCaseStatus)
  const startRepair = useDemoDataStore((s) => s.startRepair)
  const completeRepair = useDemoDataStore((s) => s.completeRepair)
  const updateTechnicianStatus = useDemoDataStore(
    (s) => s.updateTechnicianStatus
  )

  const repairCases = useMemo(
    () =>
      cases.filter(
        (c) =>
          (c.technician_id === techId ||
            REPAIR_STATUSES.includes(c.status) ||
            c.status === 'REPAIR_COMPLETED') &&
          (REPAIR_STATUSES.includes(c.status) ||
            c.status === 'REPAIR_STARTED' ||
            c.status === 'REPAIR_COMPLETED')
      ),
    [cases, techId]
  )

  const [caseId, setCaseId] = useState('')
  const selectedId = caseId || repairCases[0]?.id || ''
  const selected = cases.find((c) => c.id === selectedId)

  const started = selected?.status === 'REPAIR_STARTED'
  const completed = selected?.status === 'REPAIR_COMPLETED'

  if (repairCases.length === 0) {
    return (
      <EmptyState
        title="No repair jobs"
        description="Approved estimates appear here for repair work."
      />
    )
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Repair"
        description="Start and complete repair work via updateCaseStatus."
      />
      <Card className="space-y-3 p-4">
        <label className="block text-sm text-black">
          Case
          <select
            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            value={selectedId}
            onChange={(e) => setCaseId(e.target.value)}
          >
            {repairCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} · {c.status}
              </option>
            ))}
          </select>
        </label>
        {selected && <StatusBadge status={selected.status} />}
        <Badge
          variant={completed ? 'success' : started ? 'pending' : 'outline'}
          size="small"
        >
          {completed ? 'COMPLETED' : started ? 'IN PROGRESS' : 'NOT STARTED'}
        </Badge>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="black"
            disabled={!selectedId || started || completed}
            onClick={() => {
              startRepair(selectedId)
              updateTechnicianStatus(techId, 'BUSY')
              toast({
                title: 'Repair started',
                description: 'Case status → REPAIR_STARTED',
              })
            }}
          >
            Start repair
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={!selectedId || !started || completed}
            onClick={() => {
              completeRepair(selectedId)
              updateTechnicianStatus(techId, 'AVAILABLE')
              toast({
                title: 'Repair completed',
                description: 'Case status → REPAIR_COMPLETED',
              })
            }}
          >
            Complete repair
          </Button>
          {selected?.status === 'WAITING_APPROVAL' && (
            <Button
              type="button"
              variant="outline-general"
              onClick={() => {
                updateCaseStatus(selectedId, 'APPROVED', {
                  note: 'Tech noted estimate approved on site (DEMO)',
                })
                toast({ title: 'Marked approved', description: 'Ready to start repair.' })
              }}
            >
              Mark approved (DEMO)
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
