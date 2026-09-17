'use client'

import { useMemo } from 'react'
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  type Libraries,
} from '@react-google-maps/api'
import { LoadingSkeleton } from '@/components/rsa/loading-skeleton'
import { cn } from '@/lib/utils'

const libraries: Libraries = ['places']

export type MapMarkerPoint = {
  id: string
  lat: number
  lng: number
  label?: string
}

export function GoogleMapView({
  center,
  zoom = 12,
  markers = [],
  onClick,
  onMarkerDragEnd,
  className,
  mapContainerClassName,
  restrictToUsa = false,
}: {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarkerPoint[]
  onClick?: (lat: number, lng: number) => void
  onMarkerDragEnd?: (id: string, lat: number, lng: number) => void
  className?: string
  mapContainerClassName?: string
  restrictToUsa?: boolean
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'rsa-google-maps',
    googleMapsApiKey: apiKey,
    libraries,
  })

  const options = useMemo(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      ...(restrictToUsa
        ? {
            restriction: {
              latLngBounds: {
                north: 49.5,
                south: 24.5,
                west: -125,
                east: -66.5,
              },
              strictBounds: false,
            },
          }
        : {}),
    }),
    [restrictToUsa]
  )

  if (!apiKey) {
    return (
      <div
        className={cn(
          'flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-200 text-center text-xs text-gray',
          className
        )}
      >
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable maps.
        <br />
        Showing map placeholder (DEMO).
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={cn('rounded-lg bg-danger-light p-4 text-sm', className)}>
        Failed to load Google Maps.
      </div>
    )
  }

  if (!isLoaded) {
    return <LoadingSkeleton rows={5} className={className} />
  }

  return (
    <div className={cn('overflow-hidden rounded-lg', className)}>
      <GoogleMap
        mapContainerClassName={cn('h-64 w-full', mapContainerClassName)}
        center={center}
        zoom={zoom}
        options={options}
        onClick={(e) => {
          if (e.latLng && onClick) {
            onClick(e.latLng.lat(), e.latLng.lng())
          }
        }}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.label}
            draggable={Boolean(onMarkerDragEnd)}
            onDragEnd={(e) => {
              if (e.latLng && onMarkerDragEnd) {
                onMarkerDragEnd(m.id, e.latLng.lat(), e.latLng.lng())
              }
            }}
          />
        ))}
      </GoogleMap>
    </div>
  )
}
