import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { CaseLocation } from '@/types/database'
import { getDemoData } from '@/stores/demoDataStore'

export type GeoPoint = { lat: number; lng: number }

/** Approximate miles between two lat/lng points (Haversine) */
export function distanceMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const LocationService = {
  async getCaseLocation(
    caseId: string
  ): Promise<ServiceResult<CaseLocation | null>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('case_locations')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data ? (data as CaseLocation) : null)
    } catch (e) {
      return fail(null, e)
    }
  },

  async upsertCaseLocation(
    input: Partial<CaseLocation> & { case_id: string }
  ): Promise<ServiceResult<CaseLocation | null>> {
    try {
      const supabase = getSupabase()
      const existing = await this.getCaseLocation(input.case_id)

      if (existing.data?.id) {
        const { data, error } = await supabase
          .from('case_locations')
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', existing.data.id)
          .select()
          .single()

        if (error) {
          if (isMissingRelationError(error)) return ok(null)
          return fail(null, error.message)
        }
        return ok(data as CaseLocation)
      }

      const { data, error } = await supabase
        .from('case_locations')
        .insert({
          location_type: 'BREAKDOWN',
          ...input,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data as CaseLocation)
    } catch (e) {
      return fail(null, e)
    }
  },

  async updateTechnicianPosition(
    technicianId: string,
    lat: number,
    lng: number
  ): Promise<ServiceResult<boolean>> {
    try {
      if (shouldUseDemoStore()) {
        getDemoData().updateTechnicianLocation(technicianId, lat, lng)
        return ok(true)
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from('technicians')
        .update({
          current_latitude: lat,
          current_longitude: lng,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', technicianId)

      if (error) {
        if (isMissingRelationError(error)) {
          getDemoData().updateTechnicianLocation(technicianId, lat, lng)
          return ok(true)
        }
        return fail(false, error.message)
      }
      return ok(true)
    } catch (e) {
      return fail(false, e)
    }
  },

  formatAddress(loc: Partial<CaseLocation>): string {
    const parts = [
      loc.address_line1,
      loc.address_line2,
      [loc.city, loc.state].filter(Boolean).join(', '),
      loc.zip,
    ].filter(Boolean)
    if (loc.highway) {
      parts.push(
        loc.mile_marker
          ? `${loc.highway} MM ${loc.mile_marker}`
          : loc.highway
      )
    }
    return parts.join(', ')
  },
}
