import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { Case, WorkOrder } from '@/types/database'
import { CaseService } from '@/services/CaseService'
import { AuditService } from '@/services/AuditService'
import { getDemoData, useDemoDataStore } from '@/stores/demoDataStore'

export const DispatchService = {
  async assignProvider(
    caseId: string,
    providerId: string,
    opts?: { changed_by?: string | null }
  ): Promise<ServiceResult<Case | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().requestProvider(caseId, providerId, opts?.changed_by)
        )
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('cases')
        .update({
          service_provider_id: providerId,
          status: 'PROVIDER_REQUESTED',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', caseId)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().requestProvider(caseId, providerId, opts?.changed_by)
          )
        }
        return fail(null, error.message)
      }

      await CaseService.addTimeline(caseId, {
        to_status: 'PROVIDER_REQUESTED',
        notes: `Assigned provider ${providerId}`,
        changed_by: opts?.changed_by,
      })

      await AuditService.log({
        action: 'ASSIGN',
        entity_type: 'case',
        entity_id: caseId,
        actor_id: opts?.changed_by,
        metadata: { providerId },
      })

      return ok(data as Case)
    } catch (e) {
      return fail(null, e)
    }
  },

  async acceptJob(
    caseId: string,
    providerId: string
  ): Promise<ServiceResult<Case | null>> {
    if (shouldUseDemoStore()) {
      return ok(getDemoData().acceptJob(caseId, providerId))
    }
    return CaseService.updateStatus(caseId, 'PROVIDER_ACCEPTED', {
      note: `Provider ${providerId} accepted`,
    })
  },

  async rejectJob(
    caseId: string,
    providerId: string,
    notes?: string
  ): Promise<ServiceResult<Case | null>> {
    if (shouldUseDemoStore()) {
      return ok(getDemoData().rejectJob(caseId, providerId, notes))
    }
    return CaseService.updateStatus(caseId, 'PROVIDER_REJECTED', { note: notes })
  },

  async assignTechnician(
    caseId: string,
    technicianId: string,
    opts?: { changed_by?: string | null }
  ): Promise<ServiceResult<Case | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().assignTechnician(caseId, technicianId))
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('cases')
        .update({
          technician_id: technicianId,
          status: 'TECHNICIAN_ASSIGNED',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', caseId)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().assignTechnician(caseId, technicianId))
        }
        return fail(null, error.message)
      }

      await CaseService.addTimeline(caseId, {
        to_status: 'TECHNICIAN_ASSIGNED',
        notes: `Assigned technician ${technicianId}`,
        changed_by: opts?.changed_by,
      })

      return ok(data as Case)
    } catch (e) {
      return fail(null, e)
    }
  },

  async createWorkOrder(input: {
    case_id: string
    service_provider_id?: string | null
    technician_id?: string | null
    description?: string
  }): Promise<ServiceResult<WorkOrder | null>> {
    try {
      const ts = new Date().toISOString()
      const wo: WorkOrder = {
        id: `wo-${Date.now()}`,
        case_id: input.case_id,
        work_order_number: `WO-${Date.now()}`,
        service_provider_id: input.service_provider_id ?? null,
        technician_id: input.technician_id ?? null,
        status: 'OPEN',
        description: input.description ?? null,
        started_at: null,
        completed_at: null,
        created_by: null,
        created_at: ts,
        updated_at: ts,
      }

      if (shouldUseDemoStore()) {
        getDemoData()
        useDemoDataStore.setState((s) => ({
          workOrders: [wo, ...s.workOrders],
        }))
        return ok(wo)
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('work_orders')
        .insert({
          case_id: input.case_id,
          work_order_number: wo.work_order_number,
          service_provider_id: input.service_provider_id ?? null,
          technician_id: input.technician_id ?? null,
          status: 'OPEN',
          description: input.description ?? null,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          useDemoDataStore.setState((s) => ({
            workOrders: [wo, ...s.workOrders],
          }))
          return ok(wo)
        }
        return fail(null, error.message)
      }
      return ok(data as WorkOrder)
    } catch (e) {
      return fail(null, e)
    }
  },

  async listWorkOrders(params?: {
    caseId?: string
    providerId?: string
    technicianId?: string
    status?: string
  }): Promise<ServiceResult<WorkOrder[]>> {
    try {
      if (shouldUseDemoStore()) {
        let list = getDemoData().workOrders
        if (params?.caseId) list = list.filter((w) => w.case_id === params.caseId)
        if (params?.providerId)
          list = list.filter((w) => w.service_provider_id === params.providerId)
        if (params?.technicianId)
          list = list.filter((w) => w.technician_id === params.technicianId)
        if (params?.status) list = list.filter((w) => w.status === params.status)
        return ok(list)
      }

      const supabase = getSupabase()
      let query = supabase
        .from('work_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (params?.caseId) query = query.eq('case_id', params.caseId)
      if (params?.providerId)
        query = query.eq('service_provider_id', params.providerId)
      if (params?.technicianId)
        query = query.eq('technician_id', params.technicianId)
      if (params?.status) query = query.eq('status', params.status)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok(getDemoData().workOrders)
        return fail([], error.message)
      }
      return ok((data as WorkOrder[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async updateWorkOrderStatus(
    id: string,
    status: WorkOrder['status']
  ): Promise<ServiceResult<WorkOrder | null>> {
    try {
      if (shouldUseDemoStore()) {
        const existing = getDemoData().workOrders.find((w) => w.id === id)
        if (!existing) return ok(null)
        const updates: WorkOrder = {
          ...existing,
          status,
          updated_at: new Date().toISOString(),
          started_at:
            status === 'IN_PROGRESS'
              ? new Date().toISOString()
              : existing.started_at,
          completed_at:
            status === 'COMPLETED'
              ? new Date().toISOString()
              : existing.completed_at,
        }
        useDemoDataStore.setState((s) => ({
          workOrders: s.workOrders.map((w) => (w.id === id ? updates : w)),
        }))
        return ok(updates)
      }

      const supabase = getSupabase()
      const updates: Partial<WorkOrder> = {
        status,
        updated_at: new Date().toISOString(),
      }
      if (status === 'IN_PROGRESS') updates.started_at = new Date().toISOString()
      if (status === 'COMPLETED')
        updates.completed_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('work_orders')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data as WorkOrder)
    } catch (e) {
      return fail(null, e)
    }
  },
}
