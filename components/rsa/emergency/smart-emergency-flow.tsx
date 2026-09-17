'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Mic,
  Phone,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  LocationPicker,
  type NearbyService,
  type PickedLocation,
} from '@/components/rsa/maps/location-picker'
import { PhotoUploader, type UploadedPhoto } from '@/components/rsa/photos/photo-uploader'
import { useAuthStore } from '@/stores/authStore'
import type { ServiceCategorySlug } from '@/types/database'
import { cn } from '@/lib/utils'

const TRUCK_CATEGORIES: {
  slug: ServiceCategorySlug
  label: string
  hint: string
}[] = [
  { slug: 'engine-failure', label: 'Engine Failure', hint: 'Won’t run / severe noise' },
  { slug: 'truck-wont-start', label: "Truck Won't Start", hint: 'Cranks or no crank' },
  { slug: 'flat-tire', label: 'Flat Tire', hint: 'Single tire down' },
  { slug: 'tire-blowout', label: 'Tire Blowout', hint: 'Sudden failure' },
  { slug: 'multiple-tire-failure', label: 'Multiple Tire Failure', hint: '2+ tires' },
  { slug: 'battery-dead', label: 'Dead Battery', hint: 'Jump / replace' },
  { slug: 'brake-problem', label: 'Brake Problem', hint: 'Air / hydraulic' },
  { slug: 'overheating', label: 'Overheating', hint: 'Temp gauge / steam' },
  { slug: 'transmission-problem', label: 'Transmission', hint: 'Won’t shift' },
  { slug: 'electrical-problem', label: 'Electrical', hint: 'Lights / wiring' },
  { slug: 'fuel-delivery', label: 'Fuel Delivery', hint: 'Need fuel on site' },
  { slug: 'out-of-fuel', label: 'Out of Fuel', hint: 'Empty tank' },
  { slug: 'trailer-problem', label: 'Trailer Problem', hint: 'Landing gear / doors' },
  { slug: 'reefer-problem', label: 'Reefer Problem', hint: 'Temp control' },
  { slug: 'accident-damage', label: 'Accident Damage', hint: 'Collision related' },
  { slug: 'tow-required', label: 'Tow Required', hint: 'Cannot drive' },
  { slug: 'lockout', label: 'Lockout', hint: 'Keys locked in' },
  { slug: 'other-truck-breakdown', label: 'Other Truck Breakdown', hint: 'Not listed' },
]

const FALLBACK_TRUCKS: {
  id: string
  unit: string
  type: string
  plate: string
  label: string
}[] = []

const STEPS = [
  'What happened',
  'Safety',
  'Location',
  'Truck',
  'Photos',
  'Description',
  'Summary',
]

export function SmartEmergencyFlow({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean
  onClose?: () => void
  onSubmitted?: (caseId: string) => void
}) {
  const router = useRouter()
  const userId = useAuthStore((s) => s.user?.id)
  const driverId = useAuthStore((s) => s.driverId)
  const companyId = useAuthStore((s) => s.companyId)

  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<ServiceCategorySlug | null>(null)
  const [isSafe, setIsSafe] = useState<boolean | null>(null)
  const [location, setLocation] = useState<PickedLocation | null>(null)
  const [nearbyServices, setNearbyServices] = useState<NearbyService[]>([])
  const [selectedProvider, setSelectedProvider] =
    useState<NearbyService | null>(null)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [fleetTrucks, setFleetTrucks] = useState(FALLBACK_TRUCKS)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) return
    void fetch(`/api/fleet/trucks?companyId=${encodeURIComponent(companyId)}`)
      .then((r) => r.json())
      .then((data) => {
        const list = (data.trucks || []) as {
          id: string
          unitNumber: string
          make: string
          model: string
          plate: string
          truckType: string
        }[]
        if (!list.length) return
        setFleetTrucks(
          list.map((t) => ({
            id: t.id,
            unit: t.unitNumber,
            label: `Unit ${t.unitNumber}${t.make ? ` · ${t.make}` : ''}${t.model ? ` ${t.model}` : ''}`,
            plate: t.plate,
            type: t.truckType,
          }))
        )
      })
      .catch(() => undefined)
  }, [companyId])

  const categoryMeta = useMemo(
    () => TRUCK_CATEGORIES.find((c) => c.slug === category),
    [category]
  )
  const truck = fleetTrucks.find((t) => t.id === vehicleId)

  if (!open) return null

  const canNext = () => {
    if (step === 0) return Boolean(category)
    if (step === 1) return isSafe !== null
    if (step === 2) return Boolean(location && selectedProvider)
    if (step === 3) return Boolean(vehicleId)
    return true
  }

  const submit = async () => {
    if (!category) return
    if (!companyId || !driverId) {
      setError('Sign in with an approved driver account to submit a request.')
      return
    }
    if (!vehicleId) {
      setError('Add a truck in Fleet trucks before requesting assistance.')
      return
    }
    if (!selectedProvider) {
      setError('Select a service provider on the location step.')
      return
    }
    setSubmitting(true)
    setError(null)

    // Always persist case locally so provider portal can see it
    const { getDemoData } = await import('@/stores/demoDataStore')
    const created = getDemoData().createCase({
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      category_slug: category,
      description:
        description ||
        `${categoryMeta?.label ?? 'Breakdown'} at ${location?.label || 'USA pin'}`,
      is_safe: isSafe,
      is_accident: category === 'accident-damage',
      is_highway: true,
      created_by: userId,
      city: location?.label?.split(',')[0]?.trim() || location?.label,
      state: location?.label?.match(/\b([A-Z]{2})\b/)?.[1],
      status: 'CREATED',
    })
    const id = created.id

    getDemoData().updateCaseStatus(id, 'PROVIDER_REQUESTED', {
      note: `Requested ${selectedProvider.name}`,
      changed_by: userId,
    })
    getDemoData().requestProvider(id, selectedProvider.id, userId)

    const profile = useAuthStore.getState().profile
    const reqRes = await fetch('/api/dispatch/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: id,
        caseNumber: created.case_number,
        category: categoryMeta?.label,
        description,
        locationLabel: location?.label,
        lat: location?.lat,
        lng: location?.lng,
        driverId,
        driverName: profile?.full_name,
        driverPhone: profile?.phone,
        driverUserId: userId,
        companyId,
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        providerPhone: selectedProvider.phone || null,
        providerUserId: selectedProvider.id.startsWith('reg-')
          ? selectedProvider.id
          : `reg-${selectedProvider.id}`,
      }),
    })
    const reqData = await reqRes.json()
    setSubmitting(false)
    if (!reqRes.ok) {
      setError(reqData.error || 'Could not send request to provider')
      return
    }

    onSubmitted?.(id)
    onClose?.()
    router.push(
      `/driver/active?caseId=${encodeURIComponent(id)}&requestId=${encodeURIComponent(reqData.request.id)}`
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <Card className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-lg">
        <CardHeader className="space-y-3 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Badge variant="danger" size="small">
                TRUCK ASSISTANCE
              </Badge>
              <h2 className="mt-1 font-gilroy text-lg font-bold text-black">
                Smart Emergency Request
              </h2>
            </div>
            <Button type="button" variant="outline-general" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="flex gap-1">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  i <= step ? 'bg-primary' : 'bg-gray-300'
                )}
                title={label}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-gray">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </CardHeader>

        <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray">
                What happened with your commercial truck? Passenger cars are not
                supported.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TRUCK_CATEGORIES.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCategory(c.slug)}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-left transition',
                      category === c.slug
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 bg-white hover:border-primary/40'
                    )}
                  >
                    <p className="font-semibold text-black">{c.label}</p>
                    <p className="text-xs text-gray">{c.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-base font-semibold text-black">
                Are you and others safe right now?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  size="large"
                  variant={isSafe === true ? 'black' : 'outline-general'}
                  onClick={() => setIsSafe(true)}
                >
                  YES — Safe
                </Button>
                <Button
                  type="button"
                  size="large"
                  variant={isSafe === false ? 'black' : 'outline-general'}
                  className={isSafe === false ? 'bg-danger hover:bg-danger' : ''}
                  onClick={() => setIsSafe(false)}
                >
                  NO — Not safe
                </Button>
              </div>

              {isSafe === false && (
                <Alert className="border-danger/30 bg-danger-light">
                  <AlertTriangle className="size-4 text-danger" />
                  <AlertTitle className="text-black">
                    Safety first — call emergency services if needed
                  </AlertTitle>
                  <AlertDescription className="space-y-3 text-sm text-black">
                    <p>
                      This RSA platform does <strong>not</strong> replace 911 or
                      emergency medical / fire / police response. If anyone is
                      injured or in immediate danger, call 911 now.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild variant="black" size="large">
                        <a href="tel:911">
                          <Phone className="size-4" />
                          Call 911
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="outline-general"
                        size="large"
                        onClick={() => {
                          if (navigator.share && location) {
                            void navigator.share({
                              title: 'My truck location',
                              text: `Lat ${location.lat}, Lng ${location.lng}`,
                            })
                          } else if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((pos) => {
                              void navigator.clipboard?.writeText(
                                `${pos.coords.latitude},${pos.coords.longitude}`
                              )
                            })
                          }
                        }}
                      >
                        <Share2 className="size-4" />
                        Share location
                      </Button>
                      <Button type="button" variant="outline-general" size="large">
                        Contact company
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="default"
                      className="w-full"
                      onClick={() => setStep(2)}
                    >
                      Continue RSA request
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 2 && (
            <LocationPicker
              value={location}
              showNearbyServices
              onConfirm={(loc, nearby, selected) => {
                setLocation(loc)
                setNearbyServices(nearby)
                setSelectedProvider(selected)
                setStep(3)
              }}
              confirmLabel="Yes — this is where my truck is"
            />
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Alert>
                <AlertTitle>Commercial trucks only</AlertTitle>
                <AlertDescription>
                  Select the truck that needs assistance. Passenger cars and
                  light personal vehicles are not eligible for this RSA service.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                {fleetTrucks.length === 0 && (
                  <p className="text-sm text-danger">
                    No trucks on file. Add a truck under Fleet trucks first.
                  </p>
                )}
                {fleetTrucks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setVehicleId(t.id)}
                    className={cn(
                      'w-full rounded-lg border px-4 py-3 text-left',
                      vehicleId === t.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 hover:border-primary/40'
                    )}
                  >
                    <p className="font-semibold text-black">{t.label}</p>
                    <p className="text-xs text-gray">
                      Plate {t.plate} · {t.type.replace(/_/g, ' ')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <PhotoUploader value={photos} onChange={setPhotos} />
          )}

          {step === 5 && (
            <div className="space-y-3">
              <label className="block font-semibold text-black">
                Describe what happened
              </label>
              <Textarea
                rows={5}
                placeholder="Example: Steer tire blew on I-80 westbound, truck on shoulder, no injuries…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button type="button" variant="outline-general" disabled>
                <Mic className="size-4" />
                Voice input — Coming soon
              </Button>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-black">Request summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray">Issue</dt>
                  <dd className="font-medium text-black">
                    {categoryMeta?.label}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray">Safety</dt>
                  <dd className="font-medium text-black">
                    {isSafe ? 'Safe' : 'Not safe — 911 guidance shown'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray">Location</dt>
                  <dd className="text-right font-medium text-black">
                    {location?.label ??
                      `${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)}`}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray">Covering services</dt>
                  <dd className="text-right font-medium text-black">
                    {selectedProvider
                      ? selectedProvider.name
                      : nearbyServices.length
                        ? 'Select a provider on Location step'
                        : 'None in service area'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray">Truck</dt>
                  <dd className="font-medium text-black">{truck?.label}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray">Photos</dt>
                  <dd className="font-medium text-black">{photos.length}</dd>
                </div>
                <div>
                  <dt className="text-gray">Description</dt>
                  <dd className="mt-1 text-black">
                    {description || '—'}
                  </dd>
                </div>
              </dl>
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 p-4">
          <Button
            type="button"
            variant="outline-general"
            disabled={step === 0 || (step === 2 && !location)}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
          {step < 6 ? (
            <Button
              type="button"
              variant="black"
              disabled={!canNext() || (step === 2 && !location)}
              onClick={() => {
                if (step === 2 && !location) return
                setStep((s) => Math.min(6, s + 1))
              }}
            >
              Continue
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="black"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? 'Submitting…' : 'Submit assistance request'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
