import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { ServiceProvider, Technician, TechnicianStatus } from '@/types/database'
import { getDemoData } from '@/stores/demoDataStore'

export const ProviderService = {
  async getProvider(id: string): Promise<ServiceResult<ServiceProvider | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().providers.find((p) => p.id === id) ?? null)
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().providers.find((p) => p.id === id) ?? null)
        }
        return fail(null, error.message)
      }
      return ok(data ? (data as ServiceProvider) : null)
    } catch (e) {
      return fail(null, e)
    }
  },

  async listProviders(params?: {
    state?: string
    city?: string
    search?: string
    limit?: number
    page?: number
  }): Promise<ServiceResult<ServiceProvider[]>> {
    try {
      if (shouldUseDemoStore()) {
        let list = getDemoData().providers
        if (params?.state)
          list = list.filter((p) => p.state === params.state?.toUpperCase())
        if (params?.city)
          list = list.filter((p) =>
            (p.city ?? '').toLowerCase().includes(params.city!.toLowerCase())
          )
        if (params?.search) {
          const q = params.search.toLowerCase()
          list = list.filter(
            (p) =>
              p.business_name.toLowerCase().includes(q) ||
              (p.city ?? '').toLowerCase().includes(q)
          )
        }
        return ok(list)
      }

      const supabase = getSupabase()
      const limit = params?.limit ?? 20
      const page = params?.page ?? 1
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('service_providers')
        .select('*')
        .eq('is_active', true)
        .order('business_name', { ascending: true })
        .range(from, to)

      if (params?.state) query = query.eq('state', params.state.toUpperCase())
      if (params?.city) query = query.ilike('city', params.city)
      if (params?.search) {
        query = query.or(
          `business_name.ilike.%${params.search}%,city.ilike.%${params.search}%`
        )
      }

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok(getDemoData().providers)
        return fail([], error.message)
      }
      return ok((data as ServiceProvider[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async updateProvider(
    id: string,
    updates: Partial<ServiceProvider>
  ): Promise<ServiceResult<ServiceProvider | null>> {
    try {
      if (shouldUseDemoStore()) {
        const { useDemoDataStore } = await import('@/stores/demoDataStore')
        const existing = getDemoData().providers.find((p) => p.id === id)
        if (!existing) return ok(null)
        const next = { ...existing, ...updates, updated_at: new Date().toISOString() }
        useDemoDataStore.setState((s) => ({
          providers: s.providers.map((p) => (p.id === id ? next : p)),
        }))
        return ok(next)
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('service_providers')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data as ServiceProvider)
    } catch (e) {
      return fail(null, e)
    }
  },

  async listTechnicians(
    providerId: string
  ): Promise<ServiceResult<Technician[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().technicians.filter(
            (t) => t.service_provider_id === providerId
          )
        )
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('service_provider_id', providerId)
        .order('created_at', { ascending: true })

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().technicians.filter(
              (t) => t.service_provider_id === providerId
            )
          )
        }
        return fail([], error.message)
      }
      return ok((data as Technician[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async getTechnician(id: string): Promise<ServiceResult<Technician | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().technicians.find((t) => t.id === id) ?? null)
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().technicians.find((t) => t.id === id) ?? null)
        }
        return fail(null, error.message)
      }
      return ok(data ? (data as Technician) : null)
    } catch (e) {
      return fail(null, e)
    }
  },

  async setTechnicianAvailability(
    id: string,
    status: TechnicianStatus
  ): Promise<ServiceResult<Technician | null>> {
    try {
      if (shouldUseDemoStore()) {
        getDemoData().updateTechnicianStatus(id, status)
        return ok(getDemoData().technicians.find((t) => t.id === id) ?? null)
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('technicians')
        .update({
          status,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          getDemoData().updateTechnicianStatus(id, status)
          return ok(getDemoData().technicians.find((t) => t.id === id) ?? null)
        }
        return fail(null, error.message)
      }
      return ok(data as Technician)
    } catch (e) {
      return fail(null, e)
    }
  },
}
