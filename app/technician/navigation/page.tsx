'use client'

import { GoogleMapView } from '@/components/rsa/maps/google-map'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { useDemoStore } from '@/stores/demoStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Page() {
  const lat = useDemoStore((s) => s.technicianLat)
  const lng = useDemoStore((s) => s.technicianLng)
  const simulate = useDemoStore((s) => s.simulateTechnicianMovement)

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Navigation"
        description="Route to the truck location (DEMO)."
        actions={
          <Button type="button" variant="black" onClick={simulate}>
            Simulate movement
          </Button>
        }
      />
      <Card className="p-3">
        <GoogleMapView
          center={{ lat, lng }}
          zoom={12}
          markers={[
            { id: 'tech', lat, lng, label: 'You' },
            { id: 'truck', lat: lat + 0.03, lng: lng + 0.02, label: 'Truck' },
          ]}
          mapContainerClassName="h-80 w-full"
        />
      </Card>
    </div>
  )
}
