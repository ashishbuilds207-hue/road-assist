'use client'

import { useEffect, useState } from 'react'
import { GoogleMapView } from '@/components/rsa/maps/google-map'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { USA_DEFAULT_CITY } from '@/lib/location/usa'

const KEY = 'rsa-provider-service-area'

export default function Page() {
  const registrationId = useAuthStore((s) => s.registrationId)
  const [lat, setLat] = useState(USA_DEFAULT_CITY.lat)
  const [lng, setLng] = useState(USA_DEFAULT_CITY.lng)
  const [radiusMiles, setRadiusMiles] = useState(50)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${KEY}-${registrationId || 'default'}`)
      if (raw) {
        const data = JSON.parse(raw) as {
          lat: number
          lng: number
          radiusMiles: number
        }
        setLat(data.lat)
        setLng(data.lng)
        setRadiusMiles(data.radiusMiles)
      }
    } catch {
      /* ignore */
    }
  }, [registrationId])

  const save = () => {
    localStorage.setItem(
      `${KEY}-${registrationId || 'default'}`,
      JSON.stringify({ lat, lng, radiusMiles })
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Service area"
        description="Set your HQ pin and coverage radius. Drivers only see you when their emergency pin falls inside this USA area."
      />
      <Card className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            variant="input-form"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
            placeholder="Latitude"
          />
          <Input
            variant="input-form"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(Number(e.target.value))}
            placeholder="Longitude"
          />
          <Input
            variant="input-form"
            type="number"
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
            placeholder="Radius (miles)"
          />
        </div>
        <Button type="button" variant="default" onClick={save}>
          {saved ? 'Saved' : 'Save service area'}
        </Button>
        <GoogleMapView
          center={{ lat, lng }}
          zoom={9}
          markers={[{ id: 'hq', lat, lng, label: 'HQ' }]}
          onClick={(la, ln) => {
            setLat(la)
            setLng(ln)
          }}
          mapContainerClassName="h-80 w-full"
          restrictToUsa
        />
        <p className="text-xs text-gray">
          Coverage: {radiusMiles} miles from HQ. Nearby jobs and chats appear when
          a driver books inside this radius.
        </p>
      </Card>
    </div>
  )
}
