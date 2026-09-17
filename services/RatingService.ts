import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { Review } from '@/types/database'
import { getDemoData } from '@/stores/demoDataStore'

export const RatingService = {
  async list(params?: {
    providerId?: string
    technicianId?: string
    caseId?: string
    limit?: number
  }): Promise<ServiceResult<Review[]>> {
    try {
      if (shouldUseDemoStore()) {
        let list = getDemoData().reviews
        if (params?.providerId)
          list = list.filter((r) => r.service_provider_id === params.providerId)
        if (params?.technicianId)
          list = list.filter((r) => r.technician_id === params.technicianId)
        if (params?.caseId) list = list.filter((r) => r.case_id === params.caseId)
        return ok(list.slice(0, params?.limit ?? 50))
      }

      const supabase = getSupabase()
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(params?.limit ?? 50)

      if (params?.providerId)
        query = query.eq('service_provider_id', params.providerId)
      if (params?.technicianId)
        query = query.eq('technician_id', params.technicianId)
      if (params?.caseId) query = query.eq('case_id', params.caseId)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok(getDemoData().reviews)
        return fail([], error.message)
      }
      return ok((data as Review[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async create(input: {
    case_id?: string | null
    service_provider_id?: string | null
    technician_id?: string | null
    reviewer_id?: string | null
    rating: number
    comment?: string | null
  }): Promise<ServiceResult<Review | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().addReview({
            case_id: input.case_id,
            service_provider_id: input.service_provider_id,
            technician_id: input.technician_id,
            reviewer_id: input.reviewer_id,
            rating: input.rating,
            comment: input.comment,
          })
        )
      }

      const rating = Math.min(5, Math.max(1, Math.round(input.rating)))
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          case_id: input.case_id ?? null,
          service_provider_id: input.service_provider_id ?? null,
          technician_id: input.technician_id ?? null,
          reviewer_id: input.reviewer_id ?? null,
          rating,
          comment: input.comment ?? null,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().addReview({
              case_id: input.case_id,
              service_provider_id: input.service_provider_id,
              technician_id: input.technician_id,
              reviewer_id: input.reviewer_id,
              rating: input.rating,
              comment: input.comment,
            })
          )
        }
        return fail(null, error.message)
      }

      if (input.service_provider_id) {
        await this.refreshProviderAverage(input.service_provider_id)
      }

      return ok(data as Review)
    } catch (e) {
      return fail(null, e)
    }
  },

  async refreshProviderAverage(
    providerId: string
  ): Promise<ServiceResult<{ avg: number; count: number }>> {
    try {
      const reviews = await this.list({ providerId, limit: 500 })
      const list = reviews.data
      const count = list.length
      const avg =
        count === 0 ? 0 : list.reduce((sum, r) => sum + r.rating, 0) / count

      if (shouldUseDemoStore()) {
        const { useDemoDataStore } = await import('@/stores/demoDataStore')
        useDemoDataStore.setState((s) => ({
          providers: s.providers.map((p) =>
            p.id === providerId
              ? {
                  ...p,
                  average_rating: Math.round(avg * 10) / 10,
                  total_reviews: count,
                  updated_at: new Date().toISOString(),
                }
              : p
          ),
        }))
        return ok({ avg, count })
      }

      const supabase = getSupabase()
      await supabase
        .from('service_providers')
        .update({
          average_rating: Math.round(avg * 10) / 10,
          total_reviews: count,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', providerId)

      return ok({ avg, count })
    } catch (e) {
      return fail({ avg: 0, count: 0 }, e)
    }
  },

  async averageForProvider(
    providerId: string
  ): Promise<ServiceResult<{ avg: number; count: number }>> {
    const reviews = await this.list({ providerId, limit: 500 })
    if (reviews.error && reviews.data.length === 0) {
      return fail({ avg: 0, count: 0 }, reviews.error)
    }
    const count = reviews.data.length
    const avg =
      count === 0
        ? 0
        : reviews.data.reduce((s, r) => s + r.rating, 0) / count
    return ok({ avg: Math.round(avg * 10) / 10, count })
  },
}
