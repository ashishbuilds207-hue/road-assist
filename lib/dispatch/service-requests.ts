import { readBlob, writeBlob } from '@/lib/store/blob-store'

const STORE_KEY = 'service-requests'

export const PROVIDER_ACCEPT_SECONDS = 5 * 60

export type ServiceRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'

export type JobPhase =
  | 'NONE'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'BILL_SUBMITTED'
  | 'PAID'

export type BillLineItem = {
  id: string
  description: string
  quantity: number
  unitPriceCents: number
  totalCents: number
  addedBy: 'driver' | 'provider' | 'admin'
}

export type BillPhoto = {
  id: string
  name: string
  category: string
  dataUrl: string
  addedBy: 'driver' | 'provider'
}

export type JobBill = {
  invoiceId: string
  invoiceNumber: string
  items: BillLineItem[]
  photos: BillPhoto[]
  notes?: string | null
  subtotalCents: number
  taxCents: number
  totalCents: number
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID'
  submittedAt?: string | null
  paidAt?: string | null
  submittedBy?: string | null
}

export type ServiceRequest = {
  id: string
  caseId: string
  caseNumber?: string
  category?: string
  description?: string
  locationLabel?: string
  lat?: number
  lng?: number
  driverId?: string | null
  driverName?: string | null
  driverPhone?: string | null
  driverUserId?: string | null
  companyId?: string | null
  providerId: string
  providerName: string
  providerPhone?: string | null
  providerUserId?: string | null
  status: ServiceRequestStatus
  jobPhase?: JobPhase
  caseStatus?: string
  arrivedAt?: string | null
  completedAt?: string | null
  bill?: JobBill | null
  requestedAt: string
  expiresAt: string
  respondedAt?: string | null
  rejectReason?: string | null
  created_at: string
  updated_at: string
}

type FileShape = { items: ServiceRequest[] }

async function readFile(): Promise<FileShape> {
  return readBlob<FileShape>(STORE_KEY, { items: [] })
}

async function writeFile(data: FileShape) {
  await writeBlob(STORE_KEY, data)
}

function now() {
  return new Date().toISOString()
}

export async function expireOverdue(items: ServiceRequest[]) {
  const t = Date.now()
  let changed = false
  const next = items.map((r) => {
    if (r.status === 'PENDING' && new Date(r.expiresAt).getTime() <= t) {
      changed = true
      return {
        ...r,
        status: 'EXPIRED' as const,
        respondedAt: now(),
        updated_at: now(),
      }
    }
    return r
  })
  return { items: next, changed }
}

export async function listServiceRequests(filter?: {
  providerId?: string
  caseId?: string
  driverId?: string
  driverUserId?: string
  status?: ServiceRequestStatus | ServiceRequestStatus[]
}) {
  const file = await readFile()
  const expired = await expireOverdue(file.items)
  if (expired.changed) await writeFile({ items: expired.items })

  let list = expired.items
  if (filter?.providerId) {
    const pid = filter.providerId.replace(/^prov-/, '')
    list = list.filter(
      (r) =>
        r.providerId === filter.providerId ||
        r.providerId === pid ||
        r.providerId.replace(/^prov-/, '') === pid
    )
  }
  if (filter?.caseId) {
    list = list.filter((r) => r.caseId === filter.caseId)
  }
  if (filter?.driverId || filter?.driverUserId) {
    list = list.filter(
      (r) =>
        (filter.driverId && r.driverId === filter.driverId) ||
        (filter.driverUserId && r.driverUserId === filter.driverUserId)
    )
  }
  if (filter?.status) {
    const statuses = Array.isArray(filter.status)
      ? filter.status
      : [filter.status]
    list = list.filter((r) => statuses.includes(r.status))
  }
  return list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export async function createServiceRequest(
  input: Omit<
    ServiceRequest,
    'id' | 'status' | 'requestedAt' | 'expiresAt' | 'created_at' | 'updated_at'
  > & { acceptSeconds?: number }
) {
  const file = await readFile()
  const ts = now()
  const seconds = input.acceptSeconds ?? PROVIDER_ACCEPT_SECONDS
  const expiresAt = new Date(Date.now() + seconds * 1000).toISOString()
  const row: ServiceRequest = {
    id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    caseId: input.caseId,
    caseNumber: input.caseNumber,
    category: input.category,
    description: input.description,
    locationLabel: input.locationLabel,
    lat: input.lat,
    lng: input.lng,
    driverId: input.driverId,
    driverName: input.driverName,
    driverPhone: input.driverPhone,
    driverUserId: input.driverUserId ?? null,
    companyId: input.companyId,
    providerId: input.providerId,
    providerName: input.providerName,
    providerPhone: input.providerPhone ?? null,
    providerUserId:
      input.providerUserId ??
      (input.providerId.startsWith('reg-')
        ? input.providerId
        : `reg-${input.providerId}`),
    status: 'PENDING',
    jobPhase: 'NONE',
    caseStatus: 'PROVIDER_REQUESTED',
    arrivedAt: null,
    completedAt: null,
    bill: null,
    requestedAt: ts,
    expiresAt,
    respondedAt: null,
    rejectReason: null,
    created_at: ts,
    updated_at: ts,
  }
  file.items.unshift(row)
  await writeFile(file)
  return row
}

export async function respondServiceRequest(
  id: string,
  action: 'accept' | 'reject' | 'cancel',
  reason?: string
) {
  const file = await readFile()
  const expired = await expireOverdue(file.items)
  const idx = expired.items.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const row = expired.items[idx]
  if (row.status !== 'PENDING') {
    await writeFile({ items: expired.items })
    return row
  }
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    expired.items[idx] = {
      ...row,
      status: 'EXPIRED',
      respondedAt: now(),
      updated_at: now(),
    }
    await writeFile({ items: expired.items })
    return expired.items[idx]
  }
  const status: ServiceRequestStatus =
    action === 'accept'
      ? 'ACCEPTED'
      : action === 'reject'
        ? 'REJECTED'
        : 'CANCELLED'
  expired.items[idx] = {
    ...row,
    status,
    rejectReason: reason || null,
    respondedAt: now(),
    updated_at: now(),
    ...(action === 'accept'
      ? {
          jobPhase: 'ACCEPTED' as const,
          caseStatus: 'PROVIDER_ACCEPTED',
        }
      : {}),
  }
  await writeFile({ items: expired.items })
  return expired.items[idx]
}

export async function updateJobWorkflow(
  id: string,
  action: 'arrive' | 'complete' | 'submitBill' | 'payBill' | 'saveBillDraft',
  payload?: {
    items?: BillLineItem[]
    photos?: BillPhoto[]
    notes?: string
    submittedBy?: string
  }
) {
  const file = await readFile()
  const idx = file.items.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const row = file.items[idx]
  if (row.status !== 'ACCEPTED') return row
  const ts = now()

  if (action === 'arrive') {
    file.items[idx] = {
      ...row,
      jobPhase: 'ARRIVED',
      caseStatus: 'ARRIVED',
      arrivedAt: ts,
      updated_at: ts,
    }
  } else if (action === 'complete') {
    file.items[idx] = {
      ...row,
      jobPhase: 'COMPLETED',
      caseStatus: 'REPAIR_COMPLETED',
      completedAt: ts,
      updated_at: ts,
      bill: row.bill ?? {
        invoiceId: `inv-${Date.now()}`,
        invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`,
        items: [],
        photos: [],
        notes: null,
        subtotalCents: 0,
        taxCents: 0,
        totalCents: 0,
        status: 'DRAFT',
        submittedAt: null,
        paidAt: null,
      },
    }
  } else if (action === 'saveBillDraft' || action === 'submitBill') {
    const items = payload?.items ?? row.bill?.items ?? []
    const photos = (payload?.photos ?? row.bill?.photos ?? []).slice(0, 8)
    const subtotal = items.reduce((s, i) => s + i.totalCents, 0)
    const tax = Math.round(subtotal * 0.08)
    const bill: JobBill = {
      invoiceId: row.bill?.invoiceId ?? `inv-${Date.now()}`,
      invoiceNumber:
        row.bill?.invoiceNumber ??
        `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`,
      items,
      photos,
      notes: payload?.notes ?? row.bill?.notes ?? null,
      subtotalCents: subtotal,
      taxCents: tax,
      totalCents: subtotal + tax,
      status: action === 'submitBill' ? 'SUBMITTED' : 'DRAFT',
      submittedAt: action === 'submitBill' ? ts : row.bill?.submittedAt ?? null,
      paidAt: null,
      submittedBy: payload?.submittedBy ?? row.bill?.submittedBy ?? null,
    }
    file.items[idx] = {
      ...row,
      bill,
      jobPhase: action === 'submitBill' ? 'BILL_SUBMITTED' : row.jobPhase || 'COMPLETED',
      caseStatus:
        action === 'submitBill' ? 'INVOICE_REVIEW' : row.caseStatus || 'REPAIR_COMPLETED',
      updated_at: ts,
    }
  } else if (action === 'payBill') {
    if (!row.bill) return row
    file.items[idx] = {
      ...row,
      jobPhase: 'PAID',
      caseStatus: 'PAID',
      bill: {
        ...row.bill,
        status: 'PAID',
        paidAt: ts,
      },
      updated_at: ts,
    }
  }

  await writeFile(file)
  return file.items[idx]
}

export async function listBillsForAdmin() {
  const list = await listServiceRequests()
  return list.filter(
    (r) =>
      Boolean(r.bill) &&
      (r.jobPhase === 'BILL_SUBMITTED' ||
        r.jobPhase === 'PAID' ||
        r.jobPhase === 'COMPLETED' ||
        r.bill?.status === 'SUBMITTED' ||
        r.bill?.status === 'PAID' ||
        r.bill?.status === 'DRAFT')
  )
}

export async function getServiceRequest(id: string) {
  const list = await listServiceRequests()
  return list.find((r) => r.id === id) ?? null
}

export function secondsLeft(expiresAt: string) {
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  )
}
