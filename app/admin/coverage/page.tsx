'use client'

import { GoogleMapView } from '@/components/rsa/maps/google-map'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Coverage"
        description="National coverage heatmap placeholder (DEMO)."
      />
      <Card className="p-3">
        <GoogleMapView
          center={{ lat: 39.8283, lng: -98.5795 }}
          zoom={4}
          markers={[
            { id: '1', lat: 41.5868, lng: -93.625, label: 'IA' },
            { id: '2', lat: 39.7392, lng: -104.9903, label: 'CO' },
            { id: '3', lat: 32.7767, lng: -96.797, label: 'TX' },
          ]}
          mapContainerClassName="h-96 w-full"
        />
      </Card>
    </div>
  )
}
