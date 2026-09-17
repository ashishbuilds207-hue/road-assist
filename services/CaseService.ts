import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type {
  Case,
  CasePriority,
  CaseStatus,
  CaseStatusHistory,
  ServiceCategorySlug,
  ServiceProvider,
} from '@/types/database'
import { calculateCasePriority } from '@/lib/utils/priority'
import { generateTemporaryCaseNumber } from '@/lib/utils/case-number'
import { AuditService } from '@/services/AuditService'
import { getDemoData } from '@/stores/demoDataStore'

export type CreateCaseInput = {
  title?: string
  description?: string
  category_slug?: ServiceCategorySlug
  company_id: string
  driver_id?: string | null
  vehicle_id?: string | null
  trailer_id?: string | null
  is_safe?: boolean | null
  is_accident?: boolean | null
  is_highway?: boolean | null
  priority?: CasePriority
  created_by?: string | null
  status?: CaseStatus
  city?: string
  state?: string
}

export type ListCasesParams = {
  status?: CaseStatus | CaseStatus[]
  companyId?: string
  providerId?: string
  driverId?: string
  technicianId?: string
  search?: string
  from?: string
  to?: string
  limit?: number
  page?: number
}

export const CaseService = {
  async createCase(input: CreateCaseInput): Promise<ServiceResult<Case | null>> {
    try {
      if (shouldUseDemoStore()) {
        const created = getDemoData().createCase({
          company_id: input.company_id,
          driver_id: input.driver_id,
          vehicle_id: input.vehicle_id,
          category_slug: input.category_slug,
          description: input.description ?? input.title,
          is_safe: input.is_safe,
          is_accident: input.is_accident,
          is_highway: input.is_highway,
          created_by: input.created_by,
          city: input.city,
          state: input.state,
          priority: input.priority,
          status: input.status ?? 'CREATED',
        })
        return ok(created)
      }

      const supabase = getSupabase()
      const priority =
        input.priority ??
        calculateCasePriority({
          isSafe: input.is_safe,
          categorySlug: input.category_slug,
          isAccident: input.is_accident,
          isHighway: input.is_highway,
        })

      const payload = {
        case_number: generateTemporaryCaseNumber(),
        status: input.status ?? 'CREATED',
        priority,
        company_id: input.company_id,
        driver_id: input.driver_id ?? null,
        vehicle_id: input.vehicle_id ?? null,
        trailer_id: input.trailer_id ?? null,
        description: input.description ?? input.title ?? null,
        breakdown_notes: null,
        is_out_of_network: false,
        requested_at: new Date().toISOString(),
        created_by: input.created_by ?? null,
        metadata: {
          category_slug: input.category_slug,
          is_safe: input.is_safe,
          is_accident: input.is_accident,
          is_highway: input.is_highway,
          city: input.city,
          state: input.state,
        },
      }

      const { data, error } = await supabase
        .from('cases')
        .insert(payload as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          const created = getDemoData().createCase({
            company_id: input.company_id,
            driver_id: input.driver_id,
            vehicle_id: input.vehicle_id,
            category_slug: input.category_slug,
            description: input.description ?? input.title,
            is_safe: input.is_safe,
            is_accident: input.is_accident,
            is_highway: input.is_highway,
            created_by: input.created_by,
            city: input.city,
            state: input.state,
            priority,
            status: input.status ?? 'CREATED',
          })
          return ok(created)
        }
        return fail(null, error.message)
      }

      const created = data as Case
      await AuditService.log({
        action: 'CREATE',
        entity_type: 'case',
        entity_id: created.id,
        actor_id: input.created_by,
      })
      return ok(created)
    } catch (e) {
      return fail(null, e)
    }
  },

  async getCase(id: string): Promise<ServiceResult<Case | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().getCase(id))
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().getCase(id))
        }
        return fail(null, error.message)
      }
      return ok(data ? (data as Case) : null)
    } catch (e) {
      return fail(null, e)
    }
  },

  async listCases(params: ListCasesParams = {}): Promise<ServiceResult<Case[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().listCases({
            status: params.status,
            companyId: params.companyId,
            providerId: params.providerId,
            driverId: params.driverId,
            technicianId: params.technicianId,
            search: params.search,
          })
        )
      }

      const supabase = getSupabase()
      const limit = params.limit ?? 20
      const page = params.page ?? 1
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (params.status) {
        if (Array.isArray(params.status)) {
          query = query.in('status', params.status)
        } else {
          query = query.eq('status', params.status)
        }
      }
      if (params.companyId) query = query.eq('company_id', params.companyId)
      if (params.providerId)
        query = query.eq('service_provider_id', params.providerId)
      if (params.driverId) query = query.eq('driver_id', params.driverId)
      if (params.technicianId)
        query = query.eq('technician_id', params.technicianId)
      if (params.from) query = query.gte('created_at', params.from)
      if (params.to) query = query.lte('created_at', params.to)
      if (params.search) {
        query = query.or(
          `case_number.ilike.%${params.search}%,description.ilike.%${params.search}%`
        )
      }

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().listCases({
              status: params.status,
              companyId: params.companyId,
              providerId: params.providerId,
              driverId: params.driverId,
              technicianId: params.technicianId,
              search: params.search,
            })
          )
        }
        return fail([], error.message)
      }
      return ok((data as Case[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async updateStatus(
    caseId: string,
    toStatus: CaseStatus,
    opts?: { note?: string; changed_by?: string | null }
  ): Promise<ServiceResult<Case | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().updateCaseStatus(caseId, toStatus, {
            note: opts?.note,
            changed_by: opts?.changed_by,
          })
        )
      }

      const supabase = getSupabase()
      const existing = await this.getCase(caseId)
      const fromStatus = existing.data?.status ?? null

      const updates: Partial<Case> = {
        status: toStatus,
        updated_at: new Date().toISOString(),
      }
      if (toStatus === 'ASSIGNED' || toStatus === 'PROVIDER_ACCEPTED') {
        updates.assigned_at = new Date().toISOString()
      }
      if (toStatus === 'ARRIVED') {
        updates.arrived_at = new Date().toISOString()
      }
      if (
        toStatus === 'REPAIR_COMPLETED' ||
        toStatus === 'CLOSED' ||
        toStatus === 'PAID'
      ) {
        updates.completed_at = new Date().toISOString()
      }
      if (toStatus === 'CLOSED') {
        updates.closed_at = new Date().toISOString()
      }
      if (toStatus === 'CANCELLED') {
        updates.cancelled_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('cases')
        .update(updates as never)
        .eq('id', caseId)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().updateCaseStatus(caseId, toStatus, {
              note: opts?.note,
              changed_by: opts?.changed_by,
            })
          )
        }
        return fail(null, error.message)
      }

      await this.addTimeline(caseId, {
        from_status: fromStatus,
        to_status: toStatus,
        notes: opts?.note,
        changed_by: opts?.changed_by,
      })

      await AuditService.log({
        action: 'STATUS_CHANGE',
        entity_type: 'case',
        entity_id: caseId,
        actor_id: opts?.changed_by,
        metadata: { fromStatus, toStatus },
      })

      return ok(data as Case)
    } catch (e) {
      return fail(null, e)
    }
  },

  async addTimeline(
    caseId: string,
    entry: {
      from_status?: CaseStatus | null
      to_status: CaseStatus
      notes?: string
      note?: string
      changed_by?: string | null
    }
  ): Promise<ServiceResult<CaseStatusHistory | null>> {
    try {
      const notes = entry.notes ?? entry.note
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().addTimelineEvent(caseId, {
            from_status: entry.from_status,
            to_status: entry.to_status,
            notes,
            changed_by: entry.changed_by,
          })
        )
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('case_status_history')
        .insert({
          case_id: caseId,
          from_status: entry.from_status ?? null,
          to_status: entry.to_status,
          notes: notes ?? null,
          changed_by: entry.changed_by ?? null,
          metadata: {},
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().addTimelineEvent(caseId, {
              from_status: entry.from_status,
              to_status: entry.to_status,
              notes,
              changed_by: entry.changed_by,
            })
          )
        }
        return fail(null, error.message)
      }
      return ok(data as CaseStatusHistory)
    } catch (e) {
      return fail(null, e)
    }
  },

  async getTimeline(
    caseId: string
  ): Promise<ServiceResult<CaseStatusHistory[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().getTimeline(caseId))
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('case_status_history')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().getTimeline(caseId))
        }
        return fail([], error.message)
      }
      return ok((data as CaseStatusHistory[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async matchProviders(input: {
    categorySlug?: ServiceCategorySlug | null
    state?: string | null
    city?: string | null
    limit?: number
  }): Promise<ServiceResult<ServiceProvider[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData()
            .matchProviders({
              categorySlug: input.categorySlug,
              state: input.state,
            })
            .slice(0, input.limit ?? 20)
        )
      }

      const supabase = getSupabase()
      let query = supabase
        .from('service_providers')
        .select('*')
        .eq('is_active', true)
        .limit(input.limit ?? 20)

      if (input.state) query = query.eq('state', input.state.toUpperCase())
      if (input.city) query = query.ilike('city', input.city)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().matchProviders({
              categorySlug: input.categorySlug,
              state: input.state,
            })
          )
        }
        return fail([], error.message)
      }

      let providers = (data as ServiceProvider[]) ?? []
      if (input.categorySlug) {
        providers = providers.filter((p) => {
          if (!p.categories || p.categories.length === 0) return true
          return p.categories.includes(input.categorySlug!)
        })
      }

      providers.sort((a, b) => {
        const ratingDiff = (b.average_rating ?? 0) - (a.average_rating ?? 0)
        if (ratingDiff !== 0) return ratingDiff
        return Number(b.accepts_emergency) - Number(a.accepts_emergency)
      })

      return ok(providers)
    } catch (e) {
      return fail([], e)
    }
  },
}
