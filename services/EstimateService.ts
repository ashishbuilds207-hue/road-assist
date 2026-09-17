import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { Estimate, EstimateLineItem, EstimateStatus } from '@/types/database'
import { getDemoData } from '@/stores/demoDataStore'

export const EstimateService = {
  async get(id: string): Promise<ServiceResult<Estimate | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().estimates.find((e) => e.id === id) ?? null)
      }
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().estimates.find((e) => e.id === id) ?? null)
        }
        return fail(null, error.message)
      }
      return ok(data ? (data as Estimate) : null)
    } catch (e) {
      return fail(null, e)
    }
  },

  async listByCase(caseId: string): Promise<ServiceResult<Estimate[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().estimates.filter((e) => e.case_id === caseId))
      }
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().estimates.filter((e) => e.case_id === caseId))
        }
        return fail([], error.message)
      }
      return ok((data as Estimate[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async create(input: {
    case_id: string
    work_order_id?: string | null
    service_provider_id?: string | null
    line_items: EstimateLineItem[]
    tax_cents?: number
    notes?: string | null
    valid_until?: string | null
  }): Promise<ServiceResult<Estimate | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().submitEstimate({
            case_id: input.case_id,
            service_provider_id: input.service_provider_id,
            line_items: input.line_items,
            notes: input.notes ?? undefined,
          })
        )
      }

      const supabase = getSupabase()
      const subtotal = input.line_items.reduce(
        (sum, i) => sum + (i.total_cents ?? i.quantity * i.unit_price_cents),
        0
      )
      const tax = input.tax_cents ?? 0
      const total = subtotal + tax

      const { data, error } = await supabase
        .from('estimates')
        .insert({
          case_id: input.case_id,
          work_order_id: input.work_order_id ?? null,
          service_provider_id: input.service_provider_id ?? null,
          status: 'DRAFT',
          subtotal_cents: subtotal,
          tax_cents: tax,
          total_cents: total,
          notes: input.notes ?? null,
          valid_until: input.valid_until ?? null,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().submitEstimate({
              case_id: input.case_id,
              service_provider_id: input.service_provider_id,
              line_items: input.line_items,
              notes: input.notes ?? undefined,
            })
          )
        }
        return fail(null, error.message)
      }
      return ok(data as Estimate)
    } catch (e) {
      return fail(null, e)
    }
  },

  async updateStatus(
    id: string,
    status: EstimateStatus
  ): Promise<ServiceResult<Estimate | null>> {
    try {
      if (shouldUseDemoStore()) {
        if (status === 'APPROVED') {
          return ok(getDemoData().approveEstimate(id))
        }
        const { useDemoDataStore } = await import('@/stores/demoDataStore')
        const existing = getDemoData().estimates.find((e) => e.id === id)
        if (!existing) return ok(null)
        const next = { ...existing, status, updated_at: new Date().toISOString() }
        useDemoDataStore.setState((s) => ({
          estimates: s.estimates.map((e) => (e.id === id ? next : e)),
        }))
        return ok(next)
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('estimates')
        .update({
          status,
          updated_at: new Date().toISOString(),
          submitted_at:
            status === 'SUBMITTED' ? new Date().toISOString() : undefined,
        } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data as Estimate)
    } catch (e) {
      return fail(null, e)
    }
  },
}
