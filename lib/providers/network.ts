import { haversineMiles } from '@/lib/location/usa'

export type NetworkProvider = {
  id: string
  name: string
  services: string
  lat: number
  lng: number
  city: string
  state: string
  phone: string
  radiusMiles: number
  categories: string[]
}

/**
 * HARD RULE (spec 108 / 162):
 * Provider database comes ONLY from platform-registered ACTIVE providers.
 * Do NOT hard-code Google Places or external businesses here.
 */
export const USA_NETWORK_PROVIDERS: NetworkProvider[] = []

export function providersCoveringPoint(
  lat: number,
  lng: number,
  providers: NetworkProvider[] = USA_NETWORK_PROVIDERS
) {
  return providers
    .map((p) => {
      const miles = haversineMiles(lat, lng, p.lat, p.lng)
      return {
        ...p,
        miles: Number(miles.toFixed(1)),
        inServiceArea: miles <= p.radiusMiles,
      }
    })
    .filter((p) => p.inServiceArea)
    .sort((a, b) => a.miles - b.miles)
}
