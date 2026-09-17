import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type {
  Dispute,
  DisputeStatus,
  SupportTicketStatus,
  CasePriority,
} from '@/types/database'
import { getDemoData, useDemoDataStore } from '@/stores/demoDataStore'

export type SupportTicket = {
  id: string
  subject: string
  body: string | null
  status: SupportTicketStatus
  priority: CasePriority | 'LOW' | 'NORMAL' | 'HIGH'
  requester_id: string | null
  case_id: string | null
  created_at: string
  updated_at: string
}

export const SupportService = {
  async listTickets(params?: {
    requesterId?: string
    status?: string
    limit?: number
  }): Promise<ServiceResult<SupportTicket[]>> {
    try {
      const supabase = getSupabase()
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(params?.limit ?? 50)

      if (params?.requesterId)
        query = query.eq('requester_id', params.requesterId)
      if (params?.status) query = query.eq('status', params.status)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok([])
        return fail([], error.message)
      }
      return ok((data as SupportTicket[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async createTicket(input: {
    subject: string
    body?: string | null
    requester_id?: string | null
    case_id?: string | null
    priority?: SupportTicket['priority']
  }): Promise<ServiceResult<SupportTicket | null>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          subject: input.subject,
          body: input.body ?? null,
          requester_id: input.requester_id ?? null,
          case_id: input.case_id ?? null,
          priority: input.priority ?? 'NORMAL',
          status: 'OPEN',
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          const now = new Date().toISOString()
          return ok({
            id: `local-${Date.now()}`,
            subject: input.subject,
            body: input.body ?? null,
            status: 'OPEN',
            priority: input.priority ?? 'NORMAL',
            requester_id: input.requester_id ?? null,
            case_id: input.case_id ?? null,
            created_at: now,
            updated_at: now,
          })
        }
        return fail(null, error.message)
      }
      return ok(data as SupportTicket)
    } catch (e) {
      return fail(null, e)
    }
  },

  async updateTicketStatus(
    id: string,
    status: SupportTicket['status']
  ): Promise<ServiceResult<SupportTicket | null>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('support_tickets')
        .update({
          status,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data as SupportTicket)
    } catch (e) {
      return fail(null, e)
    }
  },

  async listDisputes(params?: {
    caseId?: string
    status?: DisputeStatus
  }): Promise<ServiceResult<Dispute[]>> {
    try {
      if (shouldUseDemoStore()) {
        let list = getDemoData().disputes
        if (params?.caseId) list = list.filter((d) => d.case_id === params.caseId)
        if (params?.status) list = list.filter((d) => d.status === params.status)
        return ok(list)
      }

      const supabase = getSupabase()
      let query = supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (params?.caseId) query = query.eq('case_id', params.caseId)
      if (params?.status) query = query.eq('status', params.status)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok(getDemoData().disputes)
        return fail([], error.message)
      }
      return ok((data as Dispute[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async openDispute(input: {
    case_id: string
    invoice_id?: string | null
    opened_by?: string | null
    reason: string
    description?: string | null
  }): Promise<ServiceResult<Dispute | null>> {
    try {
      const dispute: Dispute = {
        id: `disp-${Date.now()}`,
        case_id: input.case_id,
        invoice_id: input.invoice_id ?? null,
        opened_by: input.opened_by ?? null,
        status: 'OPEN',
        reason: input.reason,
        description: input.description ?? null,
        resolution: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (shouldUseDemoStore()) {
        useDemoDataStore.setState((s) => ({
          disputes: [dispute, ...s.disputes],
        }))
        getDemoData().updateCaseStatus(input.case_id, 'DISPUTED')
        return ok(dispute)
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('disputes')
        .insert({
          case_id: input.case_id,
          invoice_id: input.invoice_id ?? null,
          opened_by: input.opened_by ?? null,
          reason: input.reason,
          description: input.description ?? null,
          status: 'OPEN',
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          useDemoDataStore.setState((s) => ({
            disputes: [dispute, ...s.disputes],
          }))
          return ok(dispute)
        }
        return fail(null, error.message)
      }
      return ok(data as Dispute)
    } catch (e) {
      return fail(null, e)
    }
  },
}
