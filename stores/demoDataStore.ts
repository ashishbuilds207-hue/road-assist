'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Case,
  CaseAssignment,
  CasePriority,
  CaseStatus,
  CaseStatusHistory,
  Dispute,
  Estimate,
  EstimateLineItem,
  Invoice,
  Message,
  Notification,
  NotificationEvent,
  Review,
  ServiceCategorySlug,
  ServiceProvider,
  Technician,
  TechnicianStatus,
  Vehicle,
  WorkOrder,
} from '@/types/database'
import { calculateCasePriority } from '@/lib/utils/priority'
import { generateTemporaryCaseNumber, formatInvoiceNumber } from '@/lib/utils/case-number'

function nowIso() {
  return new Date().toISOString()
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export type DemoCompany = {
  id: string
  name: string
  state: string
  city: string
}

export type DemoDriver = {
  id: string
  company_id: string
  full_name: string
  phone: string
  user_id: string
}

export type CreateDemoCaseInput = {
  company_id: string
  driver_id?: string | null
  vehicle_id?: string | null
  category_slug?: ServiceCategorySlug
  description?: string
  is_safe?: boolean | null
  is_accident?: boolean | null
  is_highway?: boolean | null
  created_by?: string | null
  city?: string
  state?: string
  priority?: CasePriority
  status?: CaseStatus
}

interface DemoDataState {
  seeded: boolean
  companies: DemoCompany[]
  drivers: DemoDriver[]
  cases: Case[]
  vehicles: Vehicle[]
  providers: ServiceProvider[]
  technicians: Technician[]
  estimates: Estimate[]
  invoices: Invoice[]
  messages: Message[]
  notifications: Notification[]
  statusHistory: CaseStatusHistory[]
  assignments: CaseAssignment[]
  workOrders: WorkOrder[]
  reviews: Review[]
  disputes: Dispute[]
  ensureSeeded: () => void
  createCase: (input: CreateDemoCaseInput) => Case
  updateCaseStatus: (
    caseId: string,
    toStatus: CaseStatus,
    opts?: { note?: string; changed_by?: string | null }
  ) => Case | null
  addTimelineEvent: (
    caseId: string,
    entry: {
      from_status?: CaseStatus | null
      to_status: CaseStatus
      notes?: string
      changed_by?: string | null
    }
  ) => CaseStatusHistory
  requestProvider: (caseId: string, providerId: string, assignedBy?: string | null) => Case | null
  acceptJob: (caseId: string, providerId: string) => Case | null
  rejectJob: (caseId: string, providerId: string, notes?: string) => Case | null
  assignTechnician: (caseId: string, technicianId: string) => Case | null
  updateTechnicianStatus: (technicianId: string, status: TechnicianStatus) => void
  updateTechnicianLocation: (technicianId: string, lat: number, lng: number) => void
  submitEstimate: (input: {
    case_id: string
    service_provider_id?: string | null
    line_items: EstimateLineItem[]
    notes?: string
  }) => Estimate
  approveEstimate: (estimateId: string) => Estimate | null
  startRepair: (caseId: string) => Case | null
  completeRepair: (caseId: string) => Case | null
  submitInvoice: (input: {
    case_id: string
    company_id?: string | null
    service_provider_id?: string | null
    subtotal_cents: number
    tax_cents?: number
  }) => Invoice
  approveInvoice: (invoiceId: string) => Invoice | null
  addMessage: (input: {
    case_id?: string | null
    sender_id?: string | null
    body: string
    conversation_id?: string
  }) => Message
  addNotification: (input: {
    user_id: string
    event: NotificationEvent
    title: string
    body?: string
    case_id?: string | null
    link?: string | null
  }) => Notification
  addReview: (input: {
    case_id?: string | null
    service_provider_id?: string | null
    technician_id?: string | null
    reviewer_id?: string | null
    rating: number
    comment?: string | null
  }) => Review
  simulateTechnicianMovement: (technicianId: string, toward?: { lat: number; lng: number }) => void
  listCases: (filters?: {
    status?: CaseStatus | CaseStatus[]
    companyId?: string
    providerId?: string
    driverId?: string
    technicianId?: string
    search?: string
  }) => Case[]
  getCase: (id: string) => Case | null
  getTimeline: (caseId: string) => CaseStatusHistory[]
  matchProviders: (opts?: {
    categorySlug?: ServiceCategorySlug | null
    state?: string | null
  }) => ServiceProvider[]
}

/** Empty store — real users/providers/cases only. No dummy operational seed. */
function buildSeed() {
  return {
    seeded: true as const,
    companies: [] as DemoCompany[],
    drivers: [] as DemoDriver[],
    cases: [] as Case[],
    vehicles: [] as Vehicle[],
    providers: [] as ServiceProvider[],
    technicians: [] as Technician[],
    estimates: [] as Estimate[],
    invoices: [] as Invoice[],
    messages: [] as Message[],
    notifications: [] as Notification[],
    statusHistory: [] as CaseStatusHistory[],
    assignments: [] as CaseAssignment[],
    workOrders: [] as WorkOrder[],
    reviews: [] as Review[],
    disputes: [] as Dispute[],
  }
}

export const useDemoDataStore = create<DemoDataState>()(
  persist(
    (set, get) => ({
      seeded: false,
      companies: [],
      drivers: [],
      cases: [],
      vehicles: [],
      providers: [],
      technicians: [],
      estimates: [],
      invoices: [],
      messages: [],
      notifications: [],
      statusHistory: [],
      assignments: [],
      workOrders: [],
      reviews: [],
      disputes: [],

      ensureSeeded: () => {
        // Never inject fake ops. Clear any previously persisted dummy seed.
        const hasDummy =
          get().providers.some((p) => p.id.startsWith('demo-')) ||
          get().cases.some((c) => c.id.startsWith('demo-')) ||
          get().companies.some((c) => c.id.startsWith('demo-'))
        if (get().seeded && !hasDummy) return
        const seed = buildSeed()
        set({
          seeded: true,
          companies: seed.companies,
          drivers: seed.drivers,
          cases: seed.cases,
          vehicles: seed.vehicles,
          providers: seed.providers,
          technicians: seed.technicians,
          estimates: seed.estimates,
          invoices: seed.invoices,
          messages: seed.messages,
          notifications: seed.notifications,
          statusHistory: seed.statusHistory,
          assignments: seed.assignments,
          workOrders: seed.workOrders,
          reviews: seed.reviews,
          disputes: seed.disputes,
        })
      },

      createCase: (input) => {
        get().ensureSeeded()
        const priority =
          input.priority ??
          calculateCasePriority({
            isSafe: input.is_safe,
            categorySlug: input.category_slug,
            isAccident: input.is_accident,
            isHighway: input.is_highway,
          })
        const ts = nowIso()
        const created: Case = {
          id: uid('case'),
          case_number: generateTemporaryCaseNumber(),
          company_id: input.company_id,
          driver_id: input.driver_id ?? null,
          vehicle_id: input.vehicle_id ?? null,
          trailer_id: null,
          service_category_id: null,
          service_provider_id: null,
          technician_id: null,
          status: input.status ?? 'CREATED',
          priority,
          description: input.description ?? null,
          breakdown_notes: null,
          is_out_of_network: false,
          requested_at: ts,
          assigned_at: null,
          arrived_at: null,
          completed_at: null,
          closed_at: null,
          cancelled_at: null,
          cancellation_reason: null,
          created_by: input.created_by ?? null,
          metadata: {
            city: input.city,
            state: input.state,
          },
          category_slug: input.category_slug ?? null,
          title: input.description ?? null,
          is_safe: input.is_safe ?? null,
          is_accident: input.is_accident ?? null,
          is_highway: input.is_highway ?? null,
          created_at: ts,
          updated_at: ts,
        }
        set((s) => ({
          cases: [created, ...s.cases],
          statusHistory: [
            {
              id: uid('hist'),
              case_id: created.id,
              from_status: null,
              to_status: created.status,
              changed_by: input.created_by ?? null,
              notes: 'Case created (DEMO)',
              metadata: {},
              created_at: ts,
            },
            ...s.statusHistory,
          ],
        }))
        return created
      },

      updateCaseStatus: (caseId, toStatus, opts) => {
        get().ensureSeeded()
        const existing = get().cases.find((c) => c.id === caseId)
        if (!existing) return null
        const ts = nowIso()
        const updates: Partial<Case> = {
          status: toStatus,
          updated_at: ts,
        }
        if (toStatus === 'ASSIGNED' || toStatus === 'PROVIDER_ACCEPTED') {
          updates.assigned_at = ts
        }
        if (toStatus === 'ARRIVED') updates.arrived_at = ts
        if (toStatus === 'REPAIR_COMPLETED' || toStatus === 'CLOSED' || toStatus === 'PAID') {
          updates.completed_at = ts
        }
        if (toStatus === 'CLOSED') updates.closed_at = ts
        if (toStatus === 'CANCELLED') updates.cancelled_at = ts

        const next = { ...existing, ...updates }
        set((s) => ({
          cases: s.cases.map((c) => (c.id === caseId ? next : c)),
        }))
        get().addTimelineEvent(caseId, {
          from_status: existing.status,
          to_status: toStatus,
          notes: opts?.note,
          changed_by: opts?.changed_by,
        })
        return next
      },

      addTimelineEvent: (caseId, entry) => {
        get().ensureSeeded()
        const event: CaseStatusHistory = {
          id: uid('hist'),
          case_id: caseId,
          from_status: entry.from_status ?? null,
          to_status: entry.to_status,
          changed_by: entry.changed_by ?? null,
          notes: entry.notes ?? null,
          metadata: {},
          created_at: nowIso(),
        }
        set((s) => ({ statusHistory: [event, ...s.statusHistory] }))
        return event
      },

      requestProvider: (caseId, providerId, assignedBy) => {
        get().ensureSeeded()
        const ts = nowIso()
        const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString()
        set((s) => ({
          assignments: [
            {
              id: uid('asg'),
              case_id: caseId,
              service_provider_id: providerId,
              technician_id: null,
              assigned_by: assignedBy ?? null,
              assignment_type: 'MANUAL',
              status: 'PENDING',
              requested_at: ts,
              responded_at: null,
              expires_at: expires,
              response_notes: null,
              is_active: true,
              created_at: ts,
              updated_at: ts,
            },
            ...s.assignments,
          ],
          cases: s.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  service_provider_id: providerId,
                  status: 'PROVIDER_REQUESTED' as CaseStatus,
                  updated_at: ts,
                }
              : c
          ),
        }))
        get().addTimelineEvent(caseId, {
          to_status: 'PROVIDER_REQUESTED',
          notes: `Requested provider ${providerId} (5 min to accept)`,
          changed_by: assignedBy,
        })
        return get().getCase(caseId)
      },

      acceptJob: (caseId, providerId) => {
        get().ensureSeeded()
        const ts = nowIso()
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.case_id === caseId && a.service_provider_id === providerId
              ? { ...a, status: 'ACCEPTED', responded_at: ts, updated_at: ts }
              : a
          ),
          cases: s.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  service_provider_id: providerId,
                  status: 'PROVIDER_ACCEPTED' as CaseStatus,
                  assigned_at: ts,
                  updated_at: ts,
                }
              : c
          ),
        }))
        get().addTimelineEvent(caseId, {
          to_status: 'PROVIDER_ACCEPTED',
          notes: 'Provider accepted job (DEMO)',
        })
        return get().getCase(caseId)
      },

      rejectJob: (caseId, providerId, notes) => {
        get().ensureSeeded()
        const ts = nowIso()
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.case_id === caseId && a.service_provider_id === providerId
              ? {
                  ...a,
                  status: 'REJECTED',
                  responded_at: ts,
                  response_notes: notes ?? null,
                  is_active: false,
                  updated_at: ts,
                }
              : a
          ),
          cases: s.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  status: 'PROVIDER_REJECTED' as CaseStatus,
                  service_provider_id: null,
                  updated_at: ts,
                }
              : c
          ),
        }))
        get().addTimelineEvent(caseId, {
          to_status: 'PROVIDER_REJECTED',
          notes: notes ?? 'Provider rejected job (DEMO)',
        })
        return get().getCase(caseId)
      },

      assignTechnician: (caseId, technicianId) => {
        get().ensureSeeded()
        const tech = get().technicians.find((t) => t.id === technicianId)
        const ts = nowIso()
        set((s) => ({
          technicians: s.technicians.map((t) =>
            t.id === technicianId ? { ...t, status: 'ASSIGNED' as TechnicianStatus, updated_at: ts } : t
          ),
          cases: s.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  technician_id: technicianId,
                  service_provider_id: tech?.service_provider_id ?? c.service_provider_id,
                  status: 'TECHNICIAN_ASSIGNED' as CaseStatus,
                  updated_at: ts,
                }
              : c
          ),
        }))
        get().addTimelineEvent(caseId, {
          to_status: 'TECHNICIAN_ASSIGNED',
          notes: `Technician ${technicianId} assigned`,
        })
        return get().getCase(caseId)
      },

      updateTechnicianStatus: (technicianId, status) => {
        get().ensureSeeded()
        set((s) => ({
          technicians: s.technicians.map((t) =>
            t.id === technicianId ? { ...t, status, updated_at: nowIso() } : t
          ),
        }))
      },

      updateTechnicianLocation: (technicianId, lat, lng) => {
        get().ensureSeeded()
        set((s) => ({
          technicians: s.technicians.map((t) =>
            t.id === technicianId
              ? {
                  ...t,
                  current_latitude: lat,
                  current_longitude: lng,
                  updated_at: nowIso(),
                }
              : t
          ),
        }))
      },

      submitEstimate: (input) => {
        get().ensureSeeded()
        const subtotal = input.line_items.reduce(
          (sum, i) => sum + (i.total_cents ?? i.quantity * i.unit_price_cents),
          0
        )
        const tax = Math.round(subtotal * 0.08)
        const ts = nowIso()
        const estimate: Estimate = {
          id: uid('est'),
          case_id: input.case_id,
          work_order_id: null,
          service_provider_id: input.service_provider_id ?? null,
          status: 'SUBMITTED',
          subtotal_cents: subtotal,
          tax_cents: tax,
          total_cents: subtotal + tax,
          valid_until: null,
          notes: input.notes ?? null,
          submitted_at: ts,
          created_by: null,
          line_items: input.line_items,
          created_at: ts,
          updated_at: ts,
        }
        set((s) => ({ estimates: [estimate, ...s.estimates] }))
        get().updateCaseStatus(input.case_id, 'ESTIMATE_SUBMITTED')
        get().updateCaseStatus(input.case_id, 'WAITING_APPROVAL')
        return estimate
      },

      approveEstimate: (estimateId) => {
        get().ensureSeeded()
        const est = get().estimates.find((e) => e.id === estimateId)
        if (!est) return null
        const next = { ...est, status: 'APPROVED', updated_at: nowIso() }
        set((s) => ({
          estimates: s.estimates.map((e) => (e.id === estimateId ? next : e)),
        }))
        get().updateCaseStatus(est.case_id, 'APPROVED')
        return next
      },

      startRepair: (caseId) => get().updateCaseStatus(caseId, 'REPAIR_STARTED'),

      completeRepair: (caseId) => get().updateCaseStatus(caseId, 'REPAIR_COMPLETED'),

      submitInvoice: (input) => {
        get().ensureSeeded()
        const tax = input.tax_cents ?? Math.round(input.subtotal_cents * 0.08)
        const ts = nowIso()
        const invoice: Invoice = {
          id: uid('inv'),
          case_id: input.case_id,
          work_order_id: null,
          service_provider_id: input.service_provider_id ?? null,
          company_id: input.company_id ?? null,
          invoice_number: formatInvoiceNumber(new Date(), Date.now() % 100000),
          status: 'SUBMITTED',
          subtotal_cents: input.subtotal_cents,
          tax_cents: tax,
          total_cents: input.subtotal_cents + tax,
          amount_paid_cents: 0,
          due_date: null,
          notes: null,
          submitted_at: ts,
          approved_at: null,
          paid_at: null,
          created_by: null,
          created_at: ts,
          updated_at: ts,
        }
        set((s) => ({ invoices: [invoice, ...s.invoices] }))
        get().updateCaseStatus(input.case_id, 'INVOICE_SUBMITTED')
        get().updateCaseStatus(input.case_id, 'INVOICE_REVIEW')
        return invoice
      },

      approveInvoice: (invoiceId) => {
        get().ensureSeeded()
        const inv = get().invoices.find((i) => i.id === invoiceId)
        if (!inv) return null
        const ts = nowIso()
        const next = {
          ...inv,
          status: 'APPROVED' as const,
          approved_at: ts,
          updated_at: ts,
        }
        set((s) => ({
          invoices: s.invoices.map((i) => (i.id === invoiceId ? next : i)),
        }))
        get().updateCaseStatus(inv.case_id, 'INVOICE_APPROVED')
        get().updateCaseStatus(inv.case_id, 'PAYMENT_PENDING')
        return next
      },

      addMessage: (input) => {
        get().ensureSeeded()
        const msg: Message = {
          id: uid('msg'),
          conversation_id: input.conversation_id ?? input.case_id ?? uid('conv'),
          case_id: input.case_id ?? null,
          sender_id: input.sender_id ?? null,
          body: input.body,
          message_type: 'TEXT',
          read_at: null,
          created_at: nowIso(),
        }
        set((s) => ({ messages: [...s.messages, msg] }))
        return msg
      },

      addNotification: (input) => {
        get().ensureSeeded()
        const n: Notification = {
          id: uid('notif'),
          user_id: input.user_id,
          event: input.event,
          title: input.title,
          body: input.body ?? null,
          link: input.link ?? null,
          case_id: input.case_id ?? null,
          read_at: null,
          created_at: nowIso(),
        }
        set((s) => ({ notifications: [n, ...s.notifications] }))
        return n
      },

      addReview: (input) => {
        get().ensureSeeded()
        const review: Review = {
          id: uid('rev'),
          case_id: input.case_id ?? null,
          service_provider_id: input.service_provider_id ?? null,
          technician_id: input.technician_id ?? null,
          reviewer_id: input.reviewer_id ?? null,
          rating: Math.min(5, Math.max(1, Math.round(input.rating))),
          comment: input.comment ?? null,
          created_at: nowIso(),
          updated_at: nowIso(),
        }
        set((s) => ({ reviews: [review, ...s.reviews] }))
        return review
      },

      simulateTechnicianMovement: (technicianId, toward) => {
        get().ensureSeeded()
        const tech = get().technicians.find((t) => t.id === technicianId)
        if (!tech) return
        const lat = tech.current_latitude ?? 39.8283
        const lng = tech.current_longitude ?? -98.5795
        const targetLat = toward?.lat ?? lat + 0.01
        const targetLng = toward?.lng ?? lng + 0.01
        const nextLat = lat + (targetLat - lat) * 0.15
        const nextLng = lng + (targetLng - lng) * 0.15
        get().updateTechnicianLocation(technicianId, nextLat, nextLng)
        if (tech.status === 'ASSIGNED' || tech.status === 'AVAILABLE') {
          get().updateTechnicianStatus(technicianId, 'EN_ROUTE')
        }
      },

      listCases: (filters) => {
        get().ensureSeeded()
        let list = [...get().cases]
        if (filters?.status) {
          const setStatus = Array.isArray(filters.status)
            ? new Set(filters.status)
            : new Set([filters.status])
          list = list.filter((c) => setStatus.has(c.status))
        }
        if (filters?.companyId) list = list.filter((c) => c.company_id === filters.companyId)
        if (filters?.providerId)
          list = list.filter((c) => c.service_provider_id === filters.providerId)
        if (filters?.driverId) list = list.filter((c) => c.driver_id === filters.driverId)
        if (filters?.technicianId)
          list = list.filter((c) => c.technician_id === filters.technicianId)
        if (filters?.search) {
          const q = filters.search.toLowerCase()
          list = list.filter(
            (c) =>
              c.case_number.toLowerCase().includes(q) ||
              (c.description ?? '').toLowerCase().includes(q) ||
              (c.title ?? '').toLowerCase().includes(q)
          )
        }
        return list
      },

      getCase: (id) => {
        get().ensureSeeded()
        return get().cases.find((c) => c.id === id) ?? null
      },

      getTimeline: (caseId) => {
        get().ensureSeeded()
        return get()
          .statusHistory.filter((h) => h.case_id === caseId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
      },

      matchProviders: (opts) => {
        get().ensureSeeded()
        let list = get().providers.filter((p) => p.is_active && p.availability !== 'OFFLINE')
        if (opts?.state) {
          list = list.filter((p) => p.state === opts.state?.toUpperCase())
        }
        if (opts?.categorySlug) {
          list = list.filter(
            (p) =>
              !p.categories?.length || p.categories.includes(opts.categorySlug!)
          )
        }
        return list.sort(
          (a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0)
        )
      },
    }),
    {
      name: 'rsa-ops-data-v2',
      partialize: (state) => ({
        seeded: state.seeded,
        companies: state.companies,
        drivers: state.drivers,
        cases: state.cases,
        vehicles: state.vehicles,
        providers: state.providers,
        technicians: state.technicians,
        estimates: state.estimates,
        invoices: state.invoices,
        messages: state.messages,
        notifications: state.notifications,
        statusHistory: state.statusHistory,
        assignments: state.assignments,
        workOrders: state.workOrders,
        reviews: state.reviews,
        disputes: state.disputes,
      }),
    }
  )
)

/** Safe access for services (ensures seed on read) */
export function getDemoData() {
  const store = useDemoDataStore.getState()
  store.ensureSeeded()
  return store
}
