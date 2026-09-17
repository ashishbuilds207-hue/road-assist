import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { Case, CaseStatus, Invoice, Review } from '@/types/database'
import { getDemoData } from '@/stores/demoDataStore'

export type DayCount = { date: string; count: number }
export type StatusCount = { status: CaseStatus | string; count: number }
export type StateCount = { state: string; count: number }

function filterDemoCases(params?: {
  companyId?: string
  providerId?: string
}): Case[] {
  let list = getDemoData().cases
  if (params?.companyId) list = list.filter((c) => c.company_id === params.companyId)
  if (params?.providerId)
    list = list.filter((c) => c.service_provider_id === params.providerId)
  return list
}

function aggregateByDay(cases: Case[]): DayCount[] {
  const map = new Map<string, number>()
  cases.forEach((row) => {
    const day = (row.created_at || row.requested_at || '').slice(0, 10)
    if (!day) return
    map.set(day, (map.get(day) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateByStatus(cases: Case[]): StatusCount[] {
  const map = new Map<string, number>()
  cases.forEach((row) => {
    map.set(row.status, (map.get(row.status) ?? 0) + 1)
  })
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }))
}

function aggregateByStateFromCases(cases: Case[]): StateCount[] {
  const map = new Map<string, number>()
  cases.forEach((c) => {
    const state =
      (c.metadata?.state as string) ||
      (typeof c.breakdown_notes === 'string' && c.breakdown_notes.includes(',')
        ? c.breakdown_notes.split(',').pop()?.trim()
        : null) ||
      'Unknown'
    map.set(state, (map.get(state) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
}

export const AnalyticsService = {
  async getCasesByDay(params?: {
    from?: string
    to?: string
    companyId?: string
    providerId?: string
  }): Promise<ServiceResult<DayCount[]>> {
    try {
      if (shouldUseDemoStore()) {
        let list = filterDemoCases(params)
        if (params?.from) list = list.filter((c) => c.created_at >= params.from!)
        if (params?.to) list = list.filter((c) => c.created_at <= params.to!)
        return ok(aggregateByDay(list))
      }

      const supabase = getSupabase()
      let query = supabase.from('cases').select('created_at')
      if (params?.from) query = query.gte('created_at', params.from)
      if (params?.to) query = query.lte('created_at', params.to)
      if (params?.companyId) query = query.eq('company_id', params.companyId)
      if (params?.providerId) query = query.eq('service_provider_id', params.providerId)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) {
          return ok(aggregateByDay(filterDemoCases(params)))
        }
        return fail([], error.message)
      }

      const map = new Map<string, number>()
      ;((data as { created_at: string }[]) ?? []).forEach((row) => {
        const day = row.created_at.slice(0, 10)
        map.set(day, (map.get(day) ?? 0) + 1)
      })

      const result = Array.from(map.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return ok(result)
    } catch (e) {
      return fail([], e)
    }
  },

  async getCasesByStatus(params?: {
    companyId?: string
    providerId?: string
  }): Promise<ServiceResult<StatusCount[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(aggregateByStatus(filterDemoCases(params)))
      }

      const supabase = getSupabase()
      let query = supabase.from('cases').select('status')
      if (params?.companyId) query = query.eq('company_id', params.companyId)
      if (params?.providerId) query = query.eq('service_provider_id', params.providerId)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) {
          return ok(aggregateByStatus(filterDemoCases(params)))
        }
        return fail([], error.message)
      }

      const map = new Map<string, number>()
      ;((data as { status: string }[]) ?? []).forEach((row) => {
        map.set(row.status, (map.get(row.status) ?? 0) + 1)
      })

      return ok(
        Array.from(map.entries()).map(([status, count]) => ({ status, count }))
      )
    } catch (e) {
      return fail([], e)
    }
  },

  async getCasesByState(): Promise<ServiceResult<StateCount[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(aggregateByStateFromCases(getDemoData().cases))
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('case_locations')
        .select('state')

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(aggregateByStateFromCases(getDemoData().cases))
        }
        return fail([], error.message)
      }

      const map = new Map<string, number>()
      ;((data as { state: string | null }[]) ?? []).forEach((row) => {
        const state = row.state || 'Unknown'
        map.set(state, (map.get(state) ?? 0) + 1)
      })

      return ok(
        Array.from(map.entries())
          .map(([state, count]) => ({ state, count }))
          .sort((a, b) => b.count - a.count)
      )
    } catch (e) {
      return fail([], e)
    }
  },

  async getProviderPerformance(
    providerId: string
  ): Promise<
    ServiceResult<{
      totalCases: number
      completed: number
      avgRating: number
      ratingCount: number
    }>
  > {
    const empty = {
      totalCases: 0,
      completed: 0,
      avgRating: 0,
      ratingCount: 0,
    }
    try {
      const supabase = getSupabase()
      const { data: cases, error } = await supabase
        .from('cases')
        .select('status')
        .eq('service_provider_id', providerId)

      if (error) {
        if (isMissingRelationError(error)) return ok(empty)
        return fail(empty, error.message)
      }

      const list = (cases as Pick<Case, 'status'>[]) ?? []
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('service_provider_id', providerId)

      const reviewList = (reviews as Pick<Review, 'rating'>[]) ?? []
      const ratingCount = reviewList.length
      const avgRating =
        ratingCount === 0
          ? 0
          : reviewList.reduce((s, r) => s + r.rating, 0) / ratingCount

      return ok({
        totalCases: list.length,
        completed: list.filter((c) => c.status === 'CLOSED' || c.status === 'PAID').length,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount,
      })
    } catch (e) {
      return fail(empty, e)
    }
  },

  async getCompanyMetrics(
    companyId: string
  ): Promise<
    ServiceResult<{
      totalCases: number
      openCases: number
      completed: number
      fleetVehicles: number
    }>
  > {
    const empty = {
      totalCases: 0,
      openCases: 0,
      completed: 0,
      fleetVehicles: 0,
    }
    const openStatuses = new Set([
      'CREATED',
      'SEARCHING_PROVIDER',
      'PROVIDER_REQUESTED',
      'ASSIGNED',
      'PROVIDER_ACCEPTED',
      'TECHNICIAN_ASSIGNED',
      'EN_ROUTE',
      'ARRIVED',
      'INSPECTION',
      'ESTIMATE_SUBMITTED',
      'WAITING_APPROVAL',
      'APPROVED',
      'REPAIR_STARTED',
      'WAITING_PARTS',
      'INVOICE_SUBMITTED',
      'INVOICE_REVIEW',
      'PAYMENT_PENDING',
    ])

    const fromDemo = () => {
      const store = getDemoData()
      const list = store.cases.filter((c) => c.company_id === companyId)
      return ok({
        totalCases: list.length,
        openCases: list.filter((c) => openStatuses.has(c.status)).length,
        completed: list.filter(
          (c) =>
            c.status === 'CLOSED' ||
            c.status === 'PAID' ||
            c.status === 'REPAIR_COMPLETED'
        ).length,
        fleetVehicles: store.vehicles.filter((v) => v.company_id === companyId)
          .length,
      })
    }

    try {
      if (shouldUseDemoStore()) return fromDemo()

      const supabase = getSupabase()
      const { data: cases, error } = await supabase
        .from('cases')
        .select('status')
        .eq('company_id', companyId)

      if (error) {
        if (isMissingRelationError(error)) return fromDemo()
        return fail(empty, error.message)
      }

      const list = (cases as Pick<Case, 'status'>[]) ?? []

      const { count } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      return ok({
        totalCases: list.length,
        openCases: list.filter((c) => openStatuses.has(c.status)).length,
        completed: list.filter(
          (c) => c.status === 'CLOSED' || c.status === 'PAID' || c.status === 'REPAIR_COMPLETED'
        ).length,
        fleetVehicles: count ?? 0,
      })
    } catch (e) {
      return fail(empty, e)
    }
  },

  async getDriverMetrics(
    driverId: string
  ): Promise<
    ServiceResult<{ totalCases: number; completed: number; openCases: number }>
  > {
    const empty = { totalCases: 0, completed: 0, openCases: 0 }
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('cases')
        .select('status')
        .eq('driver_id', driverId)

      if (error) {
        if (isMissingRelationError(error)) return ok(empty)
        return fail(empty, error.message)
      }

      const list = (data as Pick<Case, 'status'>[]) ?? []
      return ok({
        totalCases: list.length,
        completed: list.filter((c) => c.status === 'CLOSED' || c.status === 'PAID').length,
        openCases: list.filter(
          (c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED' && c.status !== 'PAID'
        ).length,
      })
    } catch (e) {
      return fail(empty, e)
    }
  },

  async getFleetMetrics(
    companyId: string
  ): Promise<
    ServiceResult<{
      vehicles: number
      trailers: number
      drivers: number
      activeCases: number
    }>
  > {
    const empty = { vehicles: 0, trailers: 0, drivers: 0, activeCases: 0 }
    try {
      const supabase = getSupabase()
      const [vehicles, trailers, drivers, cases] = await Promise.all([
        supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('trailers')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('drivers')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('cases')
          .select('status')
          .eq('company_id', companyId)
          .not('status', 'in', '("CLOSED","CANCELLED","DRAFT","PAID")'),
      ])

      if (
        isMissingRelationError(vehicles.error) ||
        isMissingRelationError(trailers.error) ||
        isMissingRelationError(drivers.error) ||
        isMissingRelationError(cases.error)
      ) {
        return ok(empty)
      }

      return ok({
        vehicles: vehicles.count ?? 0,
        trailers: trailers.count ?? 0,
        drivers: drivers.count ?? 0,
        activeCases: (cases.data as unknown[] | null)?.length ?? 0,
      })
    } catch (e) {
      return fail(empty, e)
    }
  },

  async getInvoiceMetrics(params?: {
    companyId?: string
    providerId?: string
  }): Promise<
    ServiceResult<{
      totalInvoiced: number
      totalPaid: number
      outstanding: number
      count: number
    }>
  > {
    const empty = {
      totalInvoiced: 0,
      totalPaid: 0,
      outstanding: 0,
      count: 0,
    }
    try {
      const supabase = getSupabase()
      let query = supabase.from('invoices').select('total_cents, amount_paid_cents, status')
      if (params?.companyId) query = query.eq('company_id', params.companyId)
      if (params?.providerId) query = query.eq('service_provider_id', params.providerId)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok(empty)
        return fail(empty, error.message)
      }

      const list =
        (data as Pick<Invoice, 'total_cents' | 'amount_paid_cents' | 'status'>[]) ??
        []
      const totalInvoiced = list.reduce((s, i) => s + (i.total_cents ?? 0), 0)
      const totalPaid = list.reduce((s, i) => s + (i.amount_paid_cents ?? 0), 0)

      return ok({
        totalInvoiced,
        totalPaid,
        outstanding: Math.max(0, totalInvoiced - totalPaid),
        count: list.length,
      })
    } catch (e) {
      return fail(empty, e)
    }
  },

  async getRatingMetrics(params?: {
    providerId?: string
  }): Promise<
    ServiceResult<{ avg: number; count: number; distribution: Record<number, number> }>
  > {
    const empty = {
      avg: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }
    try {
      const supabase = getSupabase()
      let query = supabase.from('reviews').select('rating')
      if (params?.providerId) query = query.eq('service_provider_id', params.providerId)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok(empty)
        return fail(empty, error.message)
      }

      const list = (data as Pick<Review, 'rating'>[]) ?? []
      const distribution: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      }
      list.forEach((r) => {
        const key = Math.min(5, Math.max(1, Math.round(r.rating)))
        distribution[key] = (distribution[key] ?? 0) + 1
      })
      const count = list.length
      const avg =
        count === 0 ? 0 : list.reduce((s, r) => s + r.rating, 0) / count

      return ok({
        avg: Math.round(avg * 10) / 10,
        count,
        distribution,
      })
    } catch (e) {
      return fail(empty, e)
    }
  },
}
