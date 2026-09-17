import { NextResponse } from 'next/server'
import { searchUsaPlacesLocal } from '@/lib/location/usa'

type SearchHit = {
  label: string
  lat: number
  lng: number
  source: 'usa-catalog' | 'google'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({
      results: [],
      message: 'Type at least 2 characters',
    })
  }

  // Always start with local USA catalog so autocomplete works without Google
  const local: SearchHit[] = searchUsaPlacesLocal(q, 8).map((p) => ({
    label: `${p.label}, USA`,
    lat: p.lat,
    lng: p.lng,
    source: 'usa-catalog' as const,
  }))

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const googleHits: SearchHit[] = []
  if (key) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
      url.searchParams.set('address', q)
      url.searchParams.set('components', 'country:US')
      url.searchParams.set('region', 'us')
      url.searchParams.set('key', key)
      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = (await res.json()) as {
        status: string
        results?: {
          formatted_address: string
          geometry: { location: { lat: number; lng: number } }
          address_components?: { short_name: string; types: string[] }[]
        }[]
      }
      if (data.status === 'OK' && data.results?.length) {
        for (const r of data.results.slice(0, 6)) {
          const country = r.address_components?.find((c) =>
            c.types.includes('country')
          )
          if (country && country.short_name !== 'US') continue
          googleHits.push({
            label: r.formatted_address,
            lat: r.geometry.location.lat,
            lng: r.geometry.location.lng,
            source: 'google',
          })
        }
      }
    } catch {
      // keep local results
    }
  }

  // Dedupe by rounded coords; prefer local labels first
  const seen = new Set<string>()
  const results: SearchHit[] = []
  for (const hit of [...local, ...googleHits]) {
    const keyCoord = `${hit.lat.toFixed(3)},${hit.lng.toFixed(3)}`
    if (seen.has(keyCoord)) continue
    seen.add(keyCoord)
    results.push(hit)
    if (results.length >= 8) break
  }

  return NextResponse.json({
    results,
    country: 'US',
    message: results.length
      ? undefined
      : 'No USA matches. Try a US city (e.g. Sacramento, Dallas TX).',
  })
}
