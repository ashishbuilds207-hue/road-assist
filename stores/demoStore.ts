'use client'

/**
 * Compatibility facade over demoDataStore.
 * Provider/technician UI pages import useDemoStore — keep them wired
 * to the same connected case dataset as CaseService.
 */
import { useMemo } from 'react'
import { useDemoDataStore } from '@/stores/demoDataStore'
import { getCategoryLabel } from '@/types/rsa'
import type { CaseStatus, TechnicianStatus } from '@/types/database'

export type DemoJobRequest = {
  id: string
  caseNumber: string
  category: string
  priority: string
  location: string
  distanceMiles: number
  requestedAt: string
  status: 'pending' | 'accepted' | 'rejected'
  caseId: string
  providerId: string
}

const DEMO_PROVIDER_ID = ''
const DEMO_TECH_ID = ''

const PENDING_STATUSES: CaseStatus[] = [
  'CREATED',
  'SEARCHING_PROVIDER',
  'PROVIDER_REQUESTED',
]

function caseToJob(c: {
  id: string
  case_number: string
  status: CaseStatus
  priority: string
  category_slug?: string | null
  metadata?: Record<string, unknown> | null
  requested_at?: string | null
  created_at?: string
  service_provider_id?: string | null
}): DemoJobRequest {
  const city = (c.metadata?.city as string) || 'USA'
  const state = (c.metadata?.state as string) || ''
  let status: DemoJobRequest['status'] = 'pending'
  if (
    [
      'PROVIDER_ACCEPTED',
      'ASSIGNED',
      'TECHNICIAN_ASSIGNED',
      'EN_ROUTE',
      'ARRIVED',
      'INSPECTION',
      'ESTIMATE_SUBMITTED',
      'WAITING_APPROVAL',
      'APPROVED',
      'REPAIR_STARTED',
      'WAITING_PARTS',
      'REPAIR_COMPLETED',
      'INVOICE_SUBMITTED',
      'INVOICE_REVIEW',
      'INVOICE_APPROVED',
      'PAYMENT_PENDING',
      'PAID',
      'CLOSED',
    ].includes(c.status)
  ) {
    status = 'accepted'
  } else if (c.status === 'PROVIDER_REJECTED' || c.status === 'CANCELLED') {
    status = 'rejected'
  }

  return {
    id: c.id,
    caseId: c.id,
    caseNumber: c.case_number,
    category: getCategoryLabel(c.category_slug as never) || 'Truck Assistance',
    priority: c.priority,
    location: [city, state].filter(Boolean).join(', '),
    distanceMiles: Number(((c.id.length % 20) + 3 + Math.random()).toFixed(1)),
    requestedAt: c.requested_at || c.created_at || new Date().toISOString(),
    status,
    providerId: c.service_provider_id || '',
  }
}

/** Hook used by provider/technician pages — mirrors connected demoDataStore */
export function useDemoStore<T>(
  selector: (s: {
    jobRequests: DemoJobRequest[]
    technicianStatus: string
    technicianLat: number
    technicianLng: number
    seedJobRequest: () => void
    acceptJob: (id: string) => void
    rejectJob: (id: string) => void
    setTechnicianStatus: (status: string) => void
    simulateTechnicianMovement: () => void
  }) => T
): T {
  const cases = useDemoDataStore((s) => s.cases)
  const technicians = useDemoDataStore((s) => s.technicians)
  const ensureSeeded = useDemoDataStore((s) => s.ensureSeeded)
  const createCase = useDemoDataStore((s) => s.createCase)
  const requestProvider = useDemoDataStore((s) => s.requestProvider)
  const acceptJobAction = useDemoDataStore((s) => s.acceptJob)
  const rejectJobAction = useDemoDataStore((s) => s.rejectJob)
  const assignTechnician = useDemoDataStore((s) => s.assignTechnician)
  const updateTechnicianStatus = useDemoDataStore((s) => s.updateTechnicianStatus)
  const simulate = useDemoDataStore((s) => s.simulateTechnicianMovement)

  const tech = technicians.find((t) => t.id === DEMO_TECH_ID) ?? technicians[0]

  const facade = useMemo(() => {
    ensureSeeded()
    const jobRequests = cases
      .filter((c) => !c.id.startsWith('demo-'))
      .filter(
        (c) =>
          PENDING_STATUSES.includes(c.status) ||
          Boolean(c.service_provider_id) ||
          !c.service_provider_id
      )
      .map(caseToJob)
      .sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      )

    return {
      jobRequests,
      technicianStatus: (tech?.status as string) || 'AVAILABLE',
      technicianLat: tech?.current_latitude ?? 0,
      technicianLng: tech?.current_longitude ?? 0,
      seedJobRequest: () => {
        // Disabled — no dummy job seeding
      },
      acceptJob: (id: string) => {
        const providerId =
          cases.find((c) => c.id === id)?.service_provider_id ||
          technicians[0]?.service_provider_id
        if (!providerId) return
        acceptJobAction(id, providerId)
        const techId = technicians[0]?.id
        if (techId) {
          assignTechnician(id, techId)
          updateTechnicianStatus(techId, 'ASSIGNED' as TechnicianStatus)
        }
      },
      rejectJob: (id: string) => {
        const providerId =
          cases.find((c) => c.id === id)?.service_provider_id ||
          technicians[0]?.service_provider_id
        if (!providerId) return
        rejectJobAction(id, providerId, 'Provider declined')
      },
      setTechnicianStatus: (status: string) => {
        const techId = technicians[0]?.id
        if (techId) {
          updateTechnicianStatus(techId, status as TechnicianStatus)
        }
      },
      simulateTechnicianMovement: () => {
        const techId = technicians[0]?.id
        if (techId) simulate(techId)
      },
    }
  }, [
    cases,
    tech,
    technicians,
    ensureSeeded,
    acceptJobAction,
    rejectJobAction,
    assignTechnician,
    updateTechnicianStatus,
    simulate,
  ])

  return selector(facade)
}
