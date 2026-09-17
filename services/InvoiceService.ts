import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { Invoice, InvoiceStatus } from '@/types/database'
import { getDemoData } from '@/stores/demoDataStore'

export const InvoiceService = {
  async get(id: string): Promise<ServiceResult<Invoice | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().invoices.find((i) => i.id === id) ?? null)
      }
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().invoices.find((i) => i.id === id) ?? null)
        }
        return fail(null, error.message)
      }
      return ok(data ? (data as Invoice) : null)
    } catch (e) {
      return fail(null, e)
    }
  },

  async list(params?: {
    companyId?: string
    providerId?: string
    caseId?: string
    status?: InvoiceStatus
    limit?: number
    page?: number
  }): Promise<ServiceResult<Invoice[]>> {
    try {
      if (shouldUseDemoStore()) {
        let list = getDemoData().invoices
        if (params?.companyId)
          list = list.filter((i) => i.company_id === params.companyId)
        if (params?.providerId)
          list = list.filter((i) => i.service_provider_id === params.providerId)
        if (params?.caseId) list = list.filter((i) => i.case_id === params.caseId)
        if (params?.status) list = list.filter((i) => i.status === params.status)
        return ok(list)
      }

      const supabase = getSupabase()
      const limit = params?.limit ?? 20
      const page = params?.page ?? 1
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (params?.companyId) query = query.eq('company_id', params.companyId)
      if (params?.providerId)
        query = query.eq('service_provider_id', params.providerId)
      if (params?.caseId) query = query.eq('case_id', params.caseId)
      if (params?.status) query = query.eq('status', params.status)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok(getDemoData().invoices)
        return fail([], error.message)
      }
      return ok((data as Invoice[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async create(input: {
    case_id: string
    company_id?: string | null
    service_provider_id?: string | null
    subtotal_cents: number
    tax_cents?: number
    due_date?: string | null
    notes?: string | null
  }): Promise<ServiceResult<Invoice | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().submitInvoice({
            case_id: input.case_id,
            company_id: input.company_id,
            service_provider_id: input.service_provider_id,
            subtotal_cents: input.subtotal_cents,
            tax_cents: input.tax_cents,
          })
        )
      }

      const supabase = getSupabase()
      const tax = input.tax_cents ?? 0
      const total = input.subtotal_cents + tax
      const { formatInvoiceNumber } = await import('@/lib/utils/case-number')
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: formatInvoiceNumber(new Date(), Date.now() % 100000),
          case_id: input.case_id,
          company_id: input.company_id ?? null,
          service_provider_id: input.service_provider_id ?? null,
          status: 'DRAFT',
          subtotal_cents: input.subtotal_cents,
          tax_cents: tax,
          total_cents: total,
          amount_paid_cents: 0,
          due_date: input.due_date ?? null,
          notes: input.notes ?? null,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().submitInvoice({
              case_id: input.case_id,
              company_id: input.company_id,
              service_provider_id: input.service_provider_id,
              subtotal_cents: input.subtotal_cents,
              tax_cents: input.tax_cents,
            })
          )
        }
        return fail(null, error.message)
      }
      return ok(data as Invoice)
    } catch (e) {
      return fail(null, e)
    }
  },

  async updateStatus(
    id: string,
    status: InvoiceStatus
  ): Promise<ServiceResult<Invoice | null>> {
    try {
      if (shouldUseDemoStore()) {
        if (status === 'APPROVED') {
          return ok(getDemoData().approveInvoice(id))
        }
        const { useDemoDataStore } = await import('@/stores/demoDataStore')
        const existing = getDemoData().invoices.find((i) => i.id === id)
        if (!existing) return ok(null)
        const next: Invoice = {
          ...existing,
          status,
          updated_at: new Date().toISOString(),
          paid_at: status === 'PAID' ? new Date().toISOString() : existing.paid_at,
          submitted_at:
            status === 'SUBMITTED'
              ? new Date().toISOString()
              : existing.submitted_at,
        }
        useDemoDataStore.setState((s) => ({
          invoices: s.invoices.map((i) => (i.id === id ? next : i)),
        }))
        return ok(next)
      }

      const supabase = getSupabase()
      const updates: Partial<Invoice> = {
        status,
        updated_at: new Date().toISOString(),
      }
      if (status === 'SUBMITTED') updates.submitted_at = new Date().toISOString()
      if (status === 'APPROVED') updates.approved_at = new Date().toISOString()
      if (status === 'PAID') updates.paid_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('invoices')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data as Invoice)
    } catch (e) {
      return fail(null, e)
    }
  },
}
