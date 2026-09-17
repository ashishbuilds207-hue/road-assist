import { NextResponse } from 'next/server'
import { isInUSA, haversineMiles } from '@/lib/location/usa'
import { listRegistrations } from '@/lib/registration/store'
import { getSupabase } from '@/lib/supabase/client'

/**
 * Spec 108–109: ONLY platform-registered ACTIVE/APPROVED providers.
 * Google Maps is never used as a provider database.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  const category = searchParams.get('category') || undefined

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  if (!isInUSA(lat, lng)) {
    return NextResponse.json({
      providers: [],
      count: 0,
      country: 'non-US',
      message:
        'Location is outside the USA. This platform only serves commercial truck RSA in the United States.',
    })
  }

  type Hit = {
    id: string
    name: string
    services: string
    miles: number
    lat: number
    lng: number
    city?: string | null
    state?: string | null
    phone?: string | null
    radiusMiles: number
    inServiceArea: true
  }

  const hits: Hit[] = []

  // 1) Supabase ACTIVE service_providers (preferred)
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('service_providers')
      .select('*')
      .eq('is_active', true)
      .eq('account_status', 'ACTIVE')

    for (const raw of data || []) {
      const p = raw as Record<string, unknown>
      const plat = Number(p.latitude ?? p.hq_lat)
      const plng = Number(p.longitude ?? p.hq_lng)
      if (!Number.isFinite(plat) || !Number.isFinite(plng)) continue
      const radiusMiles = Number(
        p.service_radius_miles ?? p.radius_miles ?? 50
      )
      const miles = haversineMiles(lat, lng, plat, plng)
      if (miles > radiusMiles) continue
      const services = p.services
      hits.push({
        id: String(p.id),
        name: String(p.business_name || p.name || 'Provider'),
        services: Array.isArray(services)
          ? services.join(' · ')
          : String(p.services_summary || 'Mobile truck RSA'),
        miles: Number(miles.toFixed(1)),
        lat: plat,
        lng: plng,
        city: (p.city as string) || null,
        state: (p.state as string) || null,
        phone: (p.phone as string) || (p.contact_phone as string) || null,
        radiusMiles,
        inServiceArea: true,
      })
    }
  } catch {
    // fall through to local ACTIVE registrations
  }

  // 2) Local ACTIVE SERVICE_PROVIDER registrations (demo/local store)
  const registered = (await listRegistrations('ACTIVE')).filter(
    (r) =>
      r.role === 'SERVICE_PROVIDER' &&
      r.latitude != null &&
      r.longitude != null
  )

  for (const r of registered) {
    const radiusMiles = 50
    const miles = haversineMiles(lat, lng, r.latitude!, r.longitude!)
    if (miles > radiusMiles) continue
    if (hits.some((h) => h.id === r.id)) continue
    hits.push({
      id: r.id,
      name: r.business_name || r.full_name,
      services: 'Mobile truck RSA',
      miles: Number(miles.toFixed(1)),
      lat: r.latitude!,
      lng: r.longitude!,
      city: r.city,
      state: r.state,
      phone: r.phone || null,
      radiusMiles,
      inServiceArea: true,
    })
  }

  let providers = hits.sort((a, b) => a.miles - b.miles)
  if (category) {
    // Category filter applied when providers expose categories; keep all for now
    void category
  }

  return NextResponse.json({
    providers,
    count: providers.length,
    country: 'US',
    source: 'platform-only',
    message:
      providers.length === 0
        ? 'No platform-approved providers cover this USA location yet.'
        : undefined,
  })
}
