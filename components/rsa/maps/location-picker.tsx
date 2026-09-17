'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Crosshair, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { GoogleMapView } from '@/components/rsa/maps/google-map'
import { isInUSA, USA_DEFAULT_CITY } from '@/lib/location/usa'
import { cn } from '@/lib/utils'

export type PickedLocation = {
  lat: number
  lng: number
  label?: string
}

export type NearbyService = {
  id: string
  name: string
  services: string
  miles: number
  lat: number
  lng: number
  city?: string
  state?: string
  phone?: string | null
  radiusMiles?: number
}

type UsaResult = { label: string; lat: number; lng: number }

const DEFAULT = USA_DEFAULT_CITY

export function LocationPicker({
  value,
  onConfirm,
  confirmLabel = 'Confirm location',
  title = 'Live location (USA)',
  description = 'Search USA cities, highways, or addresses only. Drop/drag a pin inside the United States.',
  showNearbyServices = true,
  onNearbyChange,
}: {
  value?: PickedLocation | null
  onConfirm: (
    loc: PickedLocation,
    nearby: NearbyService[],
    selectedProvider: NearbyService | null
  ) => void
  confirmLabel?: string
  title?: string
  description?: string
  showNearbyServices?: boolean
  onNearbyChange?: (nearby: NearbyService[]) => void
}) {
  const [loc, setLoc] = useState<PickedLocation>(value ?? DEFAULT)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UsaResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [latInput, setLatInput] = useState(String((value ?? DEFAULT).lat))
  const [lngInput, setLngInput] = useState(String((value ?? DEFAULT).lng))
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nearby, setNearby] = useState<NearbyService[]>([])
  const [nearbyMsg, setNearbyMsg] = useState<string | null>(null)
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null
  )
  const skipSearchRef = useRef(false)

  const fetchNearby = useCallback(
    async (lat: number, lng: number) => {
      if (!showNearbyServices) return
      if (!isInUSA(lat, lng)) {
        setNearby([])
        setNearbyMsg('Location must be in the USA to find services.')
        onNearbyChange?.([])
        return
      }
      setLoadingNearby(true)
      try {
        const res = await fetch(
          `/api/providers/nearby?lat=${lat}&lng=${lng}`
        )
        const data = await res.json()
        const list = (data.providers || []) as NearbyService[]
        setNearby(list)
        setNearbyMsg(
          list.length
            ? null
            : data.message ||
                'No truck RSA services cover this pin — outside posted service areas.'
        )
        onNearbyChange?.(list)
      } catch {
        setNearby([])
        setNearbyMsg('Could not load nearby services.')
        onNearbyChange?.([])
      } finally {
        setLoadingNearby(false)
      }
    },
    [showNearbyServices, onNearbyChange]
  )

  useEffect(() => {
    if (!showNearbyServices) return
    if (!isInUSA(loc.lat, loc.lng)) return
    const t = window.setTimeout(() => {
      void fetchNearby(loc.lat, loc.lng)
    }, 350)
    return () => window.clearTimeout(t)
  }, [loc.lat, loc.lng, showNearbyServices, fetchNearby])

  const searchUsa = useCallback(async (term: string, opts?: { openOnly?: boolean }) => {
    const q = term.trim()
    if (q.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/geo/usa-search?q=${encodeURIComponent(q)}`
      )
      const data = await res.json()
      const list = (data.results || []) as UsaResult[]
      setResults(list)
      setShowDropdown(true)
      if (!list.length) {
        setError(
          data.message ||
            'No USA matches. Try e.g. Sacramento, Dallas TX, Houston.'
        )
      }
    } catch {
      setError('USA search failed. Try again.')
      if (!opts?.openOnly) setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  // Live autocomplete dropdown while typing
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false
      return
    }
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    const t = window.setTimeout(() => {
      void searchUsa(q, { openOnly: true })
    }, 250)
    return () => window.clearTimeout(t)
  }, [query, searchUsa])

  const applyCoords = useCallback((lat: number, lng: number, label?: string) => {
    if (!isInUSA(lat, lng)) {
      setError('Pin must be inside the United States (USA only).')
      setNearby([])
      setNearbyMsg(null)
      return
    }
    setError(null)
    setLoc({ lat, lng, label })
    setLatInput(lat.toFixed(6))
    setLngInput(lng.toFixed(6))
  }, [])

  const selectResult = (r: UsaResult) => {
    skipSearchRef.current = true
    applyCoords(r.lat, r.lng, r.label)
    setQuery(r.label)
    setResults([])
    setShowDropdown(false)
    setError(null)
  }

  const useCurrent = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available on this device.')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        applyCoords(
          pos.coords.latitude,
          pos.coords.longitude,
          'Current location'
        )
      },
      () => {
        setError(
          'Unable to get current location. Search a USA city or drop a pin.'
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const applyManualPin = () => {
    const lat = Number(latInput)
    const lng = Number(lngInput)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Enter valid latitude and longitude numbers.')
      return
    }
    applyCoords(lat, lng, loc.label || 'Manual USA pin')
  }

  const mapMarkers = [
    { id: 'pin', lat: loc.lat, lng: loc.lng, label: 'You' },
    ...nearby.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      label: p.name,
    })),
  ]

  return (
    <Card className="space-y-4 p-4">
      <CardHeader className="space-y-1 p-0">
        <h3 className="text-base font-semibold text-black">{title}</h3>
        <p className="text-sm text-gray">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <div className="relative flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Input
              variant="input-form"
              placeholder="Type a USA city (e.g. Sacramento)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => {
                if (results.length) setShowDropdown(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (results.length === 1) {
                    selectResult(results[0])
                  } else {
                    void searchUsa(query)
                  }
                }
                if (e.key === 'Escape') {
                  setShowDropdown(false)
                }
              }}
              iconRight={<Search className="size-4" />}
              className="w-full"
              autoComplete="off"
            />
            {showDropdown && results.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {results.map((r) => (
                  <li key={`${r.label}-${r.lat}-${r.lng}`}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-light-theme"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectResult(r)}
                    >
                      <MapPin className="size-3.5 shrink-0 text-primary" />
                      <span className="font-medium text-black">{r.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && searching && (
              <p className="absolute left-0 top-full z-20 mt-1 rounded bg-white px-2 py-1 text-xs text-gray shadow">
                Searching…
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={searching}
            onClick={() => void searchUsa(query)}
          >
            {searching ? 'Searching…' : 'Search USA'}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={useCurrent}
            disabled={locating}
          >
            <Crosshair className="size-4" />
            {locating ? 'Locating…' : 'Current location'}
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-black">
              Latitude
            </label>
            <Input
              variant="input-form"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="32.776700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-black">
              Longitude
            </label>
            <Input
              variant="input-form"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder="-96.797000"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={applyManualPin}
            >
              Set pin
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <GoogleMapView
          center={{ lat: loc.lat, lng: loc.lng }}
          zoom={11}
          markers={mapMarkers}
          onClick={(lat, lng) => applyCoords(lat, lng, loc.label)}
          onMarkerDragEnd={(_id, lat, lng) => applyCoords(lat, lng, loc.label)}
          mapContainerClassName="h-72 w-full rounded-lg"
          restrictToUsa
        />

        <div className="flex items-start gap-2 rounded-lg bg-gray-200 px-3 py-2 text-xs">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            {loc.label ? `${loc.label} · ` : ''}
            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} (USA)
          </span>
        </div>

        {showNearbyServices && (
          <div className="space-y-2 rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-semibold text-black">
              Services covering this pin — tap one to request
            </p>
            {loadingNearby && (
              <p className="text-xs text-gray">Checking posted service areas…</p>
            )}
            {!loadingNearby && nearby.length === 0 && (
              <p className="text-xs text-danger">
                {nearbyMsg ||
                  'No providers cover this location. Move the pin into a posted USA service area.'}
              </p>
            )}
            {!loadingNearby &&
              nearby.map((p) => {
                const selected = selectedProviderId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProviderId(p.id)}
                    className={cn(
                      'w-full rounded-lg border bg-white px-3 py-2 text-left text-sm transition',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-gray-200 hover:border-primary/40'
                    )}
                  >
                    <p className="font-semibold text-black">
                      {selected ? '✓ ' : ''}
                      {p.name}
                    </p>
                    <p className="text-xs text-gray">
                      {p.services}
                      {p.city ? ` · ${p.city}` : ''}
                      {p.state ? `, ${p.state}` : ''} · {p.miles} mi away
                      {p.radiusMiles ? ` · covers ${p.radiusMiles} mi` : ''}
                    </p>
                  </button>
                )
              })}
            {nearby.length > 0 && !selectedProviderId && (
              <p className="text-xs text-danger">
                Select a service from the list before continuing.
              </p>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="default"
          size="large"
          className="w-full"
          disabled={
            !isInUSA(loc.lat, loc.lng) ||
            (showNearbyServices &&
              nearby.length > 0 &&
              !selectedProviderId)
          }
          onClick={() => {
            if (!isInUSA(loc.lat, loc.lng)) {
              setError('Confirm a pin inside the United States.')
              return
            }
            const selected =
              nearby.find((p) => p.id === selectedProviderId) || null
            if (showNearbyServices && nearby.length > 0 && !selected) {
              setError('Select a service provider from the list.')
              return
            }
            onConfirm(loc, nearby, selected)
          }}
        >
          {confirmLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
