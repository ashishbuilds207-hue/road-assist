import { getSupabase, ok, fail, isMissingRelationError } from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { AuditAction, AuditLog } from '@/types/database'

export type AuditInput = {
  action: AuditAction
  entity_type: string
  entity_id?: string | null
  actor_id?: string | null
  metadata?: Record<string, unknown> | null
  ip_address?: string | null
}

export const AuditService = {
  async log(input: AuditInput): Promise<ServiceResult<AuditLog | null>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          action: input.action,
          entity_type: input.entity_type,
          entity_id: input.entity_id ?? null,
          actor_id: input.actor_id ?? null,
          metadata: input.metadata ?? null,
          ip_address: input.ip_address ?? null,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data as AuditLog)
    } catch (e) {
      return fail(null, e)
    }
  },

  async list(params?: {
    entity_type?: string
    entity_id?: string
    actor_id?: string
    limit?: number
  }): Promise<ServiceResult<AuditLog[]>> {
    try {
      const supabase = getSupabase()
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(params?.limit ?? 50)

      if (params?.entity_type) query = query.eq('entity_type', params.entity_type)
      if (params?.entity_id) query = query.eq('entity_id', params.entity_id)
      if (params?.actor_id) query = query.eq('actor_id', params.actor_id)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok([])
        return fail([], error.message)
      }
      return ok((data as AuditLog[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },
}
