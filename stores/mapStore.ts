'use client'

import { create } from 'zustand'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label?: string
  type?: 'case' | 'provider' | 'technician' | 'vehicle' | 'other'
}

interface MapState {
  selectedMarker: MapMarker | null
  mapCenter: { lat: number; lng: number }
  zoom: number
  setSelectedMarker: (marker: MapMarker | null) => void
  setMapCenter: (center: { lat: number; lng: number }) => void
  setZoom: (zoom: number) => void
  focusOn: (lat: number, lng: number, zoom?: number) => void
  resetMap: () => void
}

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 } // continental US
const DEFAULT_ZOOM = 4

export const useMapStore = create<MapState>((set) => ({
  selectedMarker: null,
  mapCenter: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,

  setSelectedMarker: (marker) => set({ selectedMarker: marker }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setZoom: (zoom) => set({ zoom }),
  focusOn: (lat, lng, zoom) =>
    set({
      mapCenter: { lat, lng },
      ...(zoom !== undefined ? { zoom } : {}),
    }),
  resetMap: () =>
    set({
      selectedMarker: null,
      mapCenter: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    }),
}))
