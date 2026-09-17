'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  FileUp,
  Loader2,
  MapPin,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import {
  LocationPicker,
  type NearbyService,
  type PickedLocation,
} from '@/components/rsa/maps/location-picker'
import { GoogleMapView } from '@/components/rsa/maps/google-map'
import { AuthService } from '@/services/AuthService'
import type { UserRole } from '@/types/database'
import { roleHomePath } from '@/types/rsa'
import { cn } from '@/lib/utils'

type RoleKey = 'DRIVER' | 'SERVICE_PROVIDER'
type Step =
  | 'role'
  | 'phone'
  | 'otp'
  | 'details'
  | 'documents'
  | 'location'
  | 'pending'
  | 'active'

type DocItem = {
  id: string
  category: string
  name: string
  dataUrl?: string
  uploadedAt: string
}

const ROLE_OPTIONS: {
  key: RoleKey
  label: string
  hint: string
  icon: typeof Truck
  docs: string[]
}[] = [
  {
    key: 'DRIVER',
    label: 'Driver / Fleet owner',
    hint: 'Company name, MC, address, docs — then invite drivers after approval',
    icon: Truck,
    docs: [
      'CDL / License',
      'Company insurance',
      'Business license',
      'W-9',
    ],
  },
  {
    key: 'SERVICE_PROVIDER',
    label: 'Service Provider',
    hint: 'Shop address, email, verification docs & photo — cover USA service areas',
    icon: Wrench,
    docs: [
      'Business license',
      'Insurance',
      'W-9',
      'Certifications',
      'Shop / profile photo',
    ],
  },
]

function RegisterInner() {
  const router = useRouter()
  const search = useSearchParams()
  const roleParam = search.get('role')

  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState<RoleKey | null>(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [autofillOtp, setAutofillOtp] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [usdot, setUsdot] = useState('')
  const [mc, setMc] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const [documents, setDocuments] = useState<DocItem[]>([])
  const [location, setLocation] = useState<PickedLocation | null>(null)
  const [nearby, setNearby] = useState<NearbyService[]>([])
  const [nearbyMsg, setNearbyMsg] = useState<string | null>(null)
  const [registrationId, setRegistrationId] = useState<string | null>(null)

  const roleMeta = ROLE_OPTIONS.find((r) => r.key === role)

  useEffect(() => {
    const map: Record<string, RoleKey> = {
      driver: 'DRIVER',
      company: 'DRIVER',
      fleet: 'DRIVER',
      provider: 'SERVICE_PROVIDER',
      'service-provider': 'SERVICE_PROVIDER',
      technician: 'SERVICE_PROVIDER',
      SERVICE_PROVIDER: 'SERVICE_PROVIDER',
      DRIVER: 'DRIVER',
      COMPANY: 'DRIVER',
      TECHNICIAN: 'SERVICE_PROVIDER',
    }
    const key = roleParam ? map[roleParam] : null
    if (key) {
      setRole(key)
      setStep('phone')
    }
  }, [roleParam])

  useEffect(() => {
    if (seconds <= 0) return
    const t = setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [seconds])

  // Real-time poll while pending admin activation
  useEffect(() => {
    if (step !== 'pending' || !registrationId) return
    const poll = async () => {
      const res = await fetch(
        `/api/auth/registration-status?id=${encodeURIComponent(registrationId)}`
      )
      if (!res.ok) return
      const data = await res.json()
      if (data.registration?.status === 'ACTIVE') {
        setStep('active')
        await AuthService.activateRegisteredSession(data.registration)
        setTimeout(() => {
          router.replace(roleHomePath(data.registration.role as UserRole))
        }, 800)
      }
    }
    poll()
    const id = setInterval(poll, 2500)
    return () => clearInterval(id)
  }, [step, registrationId, router])

  const requestOtp = async () => {
    if (!role) return
    setLoading(true)
    setError(null)
    const full = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: full, role }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Could not request OTP')
      return
    }
    setPhone(data.phone.replace('+1', ''))
    setAutofillOtp(data.autofillOtp)
    setOtp(data.autofillOtp || '')
    setSeconds(45)
    setStep('otp')
  }

  const verify = async (code?: string) => {
    if (!role) return
    const value = (code ?? otp).trim()
    if (value.length < 6) return
    setLoading(true)
    setError(null)
    const full = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: full, code: value, role }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Invalid OTP')
      return
    }
    if (data.registration?.status === 'ACTIVE') {
      await AuthService.activateRegisteredSession(data.registration)
      router.replace(roleHomePath(role))
      return
    }
    if (data.registration?.status === 'PENDING') {
      await AuthService.activateRegisteredSession({
        ...data.registration,
        status: 'PENDING',
      })
      router.replace(roleHomePath(role))
      return
    }
    setStep('details')
  }

  const onFile = async (file: File, category: string) => {
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setDocuments((prev) => [
      ...prev.filter((d) => d.category !== category),
      {
        id: `doc-${Date.now()}`,
        category,
        name: file.name,
        dataUrl: dataUrl.slice(0, 500000),
        uploadedAt: new Date().toISOString(),
      },
    ])
  }

  const loadNearby = async (loc: PickedLocation, list?: NearbyService[]) => {
    setLocation(loc)
    if (list) {
      setNearby(list)
      setNearbyMsg(
        list.length
          ? null
          : 'No truck RSA services cover this pin — outside posted service areas.'
      )
      return
    }
    const res = await fetch(
      `/api/providers/nearby?lat=${loc.lat}&lng=${loc.lng}`
    )
    const data = await res.json()
    setNearby(data.providers || [])
    setNearbyMsg(
      (data.providers || []).length
        ? null
        : data.message ||
            'No truck RSA services cover this pin — outside posted service areas.'
    )
  }

  const submitRegistration = async () => {
    if (!role || !location) return
    setLoading(true)
    setError(null)
    const full = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: full,
        email,
        full_name: fullName,
        role,
        membership_type: 'OWNER',
        company_name: companyName || undefined,
        company_address: companyAddress || location.label || undefined,
        business_name: businessName || undefined,
        usdot: usdot || undefined,
        mc_number: mc || undefined,
        photo_url: photoUrl || undefined,
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: location.label || companyAddress,
        documents,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Registration failed')
      return
    }
    setRegistrationId(data.registration.id)
    await AuthService.activateRegisteredSession({
      ...data.registration,
      status: 'PENDING',
    })
    router.replace(roleHomePath(role))
  }

  const stepsLabel = useMemo(() => {
    const map: Record<Step, string> = {
      role: 'Choose role',
      phone: 'Phone',
      otp: 'Verify OTP',
      details: 'Your details',
      documents: 'Documents',
      location: 'Location & nearby services',
      pending: 'Awaiting activation',
      active: 'Activated',
    }
    return map[step]
  }, [step])

  return (
    <div className="grid min-h-screen w-full gap-5 bg-[#07111c] p-4 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-[20px] lg:block">
        <Image
          src="/images/marketing/hero-mobile-repair.png"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07111c] via-[#07111c]/60 to-transparent" />
        <Link href="/" className="absolute left-5 top-5 font-gilroy text-lg font-extrabold text-white">
          RSA <span className="text-primary">PLATFORM</span>
        </Link>
        <div className="absolute bottom-8 left-6 right-6 text-white">
          <h2 className="font-gilroy text-3xl font-bold">Create your account</h2>
          <p className="mt-2 text-sm text-white/75">
            Verify phone with the platform OTP, submit details and documents,
            pin your location, then wait for admin activation.
          </p>
        </div>
      </div>

      <div className="flex overflow-y-auto py-2">
        <Card className="m-auto w-full max-w-[520px] space-y-5 p-5 shadow-sm">
          <CardHeader className="space-y-2 p-0">
            <div className="flex items-center justify-between">
              <Badge variant="pending" size="small">
                {stepsLabel}
              </Badge>
              <Link href="/login" className="text-xs font-semibold text-primary">
                Already active? Sign in
              </Link>
            </div>
            <h1 className="font-gilroy text-xl font-bold text-black">
              Join RSA Platform
            </h1>
            <p className="text-sm text-gray">
              Accounts stay inactive until an admin activates them.
            </p>
          </CardHeader>

          <CardContent className="space-y-4 p-0">
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            {step === 'role' && (
              <div className="grid gap-2">
                {ROLE_OPTIONS.map((r) => {
                  const Icon = r.icon
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        setRole(r.key)
                        setStep('phone')
                      }}
                      className="flex items-center gap-3 rounded-xl border border-gray-300 px-4 py-3 text-left transition hover:border-primary hover:bg-light-theme"
                    >
                      <span className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-black">
                          {r.label}
                        </span>
                        <span className="text-xs text-gray">{r.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {step === 'phone' && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-black">
                  US phone number
                </label>
                <Input
                  variant="input-form"
                  placeholder="5551234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Button
                  type="button"
                  variant="default"
                  size="large"
                  className="w-full"
                  disabled={loading || phone.replace(/\D/g, '').length < 10}
                  onClick={requestOtp}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Get OTP
                </Button>
                <Button type="button" variant="outline-general" onClick={() => setStep('role')}>
                  Back
                </Button>
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-3">
                <p className="text-sm text-gray">
                  OTP loaded from the platform database (SMS is not sent).
                </p>
                {autofillOtp && (
                  <div className="rounded-lg border border-primary/30 bg-light-theme px-3 py-2 text-sm">
                    Autofill code:{' '}
                    <strong className="tracking-widest text-primary">
                      {autofillOtp}
                    </strong>
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      className="ml-2"
                      onClick={() => setOtp(autofillOtp)}
                    >
                      Use code
                    </Button>
                  </div>
                )}
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup className="w-full justify-between gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-10" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  type="button"
                  variant="default"
                  size="large"
                  className="w-full"
                  disabled={loading || otp.length < 6}
                  onClick={() => verify()}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Verify OTP
                </Button>
                <Button
                  type="button"
                  variant="outline-general"
                  disabled={seconds > 0 || loading}
                  onClick={requestOtp}
                >
                  {seconds > 0 ? `Resend in ${seconds}s` : 'Resend OTP'}
                </Button>
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-3">
                <Input
                  variant="input-form"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  variant="input-form"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {role === 'DRIVER' && (
                  <>
                    <Input
                      variant="input-form"
                      placeholder="Company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                    <Input
                      variant="input-form"
                      placeholder="Company address"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                    />
                    <Input
                      variant="input-form"
                      placeholder="MC number"
                      value={mc}
                      onChange={(e) => setMc(e.target.value)}
                    />
                    <Input
                      variant="input-form"
                      placeholder="USDOT"
                      value={usdot}
                      onChange={(e) => setUsdot(e.target.value)}
                    />
                  </>
                )}
                {role === 'SERVICE_PROVIDER' && (
                  <>
                    <Input
                      variant="input-form"
                      placeholder="Business / shop name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                    <Input
                      variant="input-form"
                      placeholder="Business address"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                    />
                    <Input
                      variant="input-form"
                      placeholder="USDOT (optional)"
                      value={usdot}
                      onChange={(e) => setUsdot(e.target.value)}
                    />
                  </>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="large"
                  className="w-full"
                  disabled={
                    !fullName ||
                    !email ||
                    (role === 'DRIVER' &&
                      (!companyName || !companyAddress || !mc)) ||
                    (role === 'SERVICE_PROVIDER' &&
                      (!businessName || !companyAddress))
                  }
                  onClick={() => setStep('documents')}
                >
                  Continue to documents
                </Button>
              </div>
            )}

            {step === 'documents' && (
              <div className="space-y-3">
                <p className="text-sm text-gray">
                  Upload required documents for {roleMeta?.label}. Admin will
                  review before activation.
                </p>
                {(roleMeta?.docs || []).map((cat) => {
                  const existing = documents.find((d) => d.category === cat)
                  return (
                    <label
                      key={cat}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-gray-300 px-3 py-3',
                        existing && 'border-solid border-success bg-success/5'
                      )}
                    >
                      <span className="text-sm font-medium text-black">
                        <FileUp className="mr-2 inline size-4" />
                        {cat}
                        {existing ? ` · ${existing.name}` : ''}
                      </span>
                      <input
                        type="file"
                        accept={
                          cat.toLowerCase().includes('photo')
                            ? 'image/*'
                            : '.pdf,.jpg,.jpeg,.png,.webp'
                        }
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          void onFile(f, cat).then(() => {
                            if (cat.toLowerCase().includes('photo')) {
                              const reader = new FileReader()
                              reader.onload = () =>
                                setPhotoUrl(String(reader.result).slice(0, 500000))
                              reader.readAsDataURL(f)
                            }
                          })
                        }}
                      />
                    </label>
                  )
                })}
                <Button
                  type="button"
                  variant="default"
                  size="large"
                  className="w-full"
                  disabled={
                    documents.length < (roleMeta?.docs.length || 1)
                  }
                  onClick={() => setStep('location')}
                >
                  Continue to location
                </Button>
              </div>
            )}

            {step === 'location' && (
              <div className="space-y-4">
                {!location ? (
                  <LocationPicker
                    title="Pin your live location (USA)"
                    description="Search USA cities/highways only. Only services that posted a service area covering this pin will appear."
                    confirmLabel="Confirm pin & show nearby services"
                    showNearbyServices
                    onConfirm={(loc, list) => void loadNearby(loc, list)}
                  />
                ) : (
                  <>
                    <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                      <MapPin className="mr-1 inline size-4" />
                      Pin set: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </div>
                    <GoogleMapView
                      center={{ lat: location.lat, lng: location.lng }}
                      zoom={11}
                      markers={[
                        {
                          id: 'you',
                          lat: location.lat,
                          lng: location.lng,
                          label: 'You',
                        },
                        ...nearby.map((p) => ({
                          id: p.id,
                          lat: p.lat,
                          lng: p.lng,
                          label: p.name,
                        })),
                      ]}
                      mapContainerClassName="h-56 w-full rounded-lg"
                      restrictToUsa
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-black">
                        Services covering this pin
                      </p>
                      {nearby.length === 0 && (
                        <p className="text-sm text-danger">
                          {nearbyMsg ||
                            'No providers cover this location. Move the pin into a posted USA service area.'}
                        </p>
                      )}
                      {nearby.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        >
                          <p className="font-semibold text-black">{p.name}</p>
                          <p className="text-xs text-gray">
                            {p.services} · {p.miles} mi
                            {p.city ? ` · ${p.city}` : ''}
                            {p.state ? `, ${p.state}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline-general"
                      onClick={() => {
                        setLocation(null)
                        setNearby([])
                        setNearbyMsg(null)
                      }}
                    >
                      Change pin
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="large"
                      className="w-full"
                      disabled={loading}
                      onClick={submitRegistration}
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-4" />
                      )}
                      Submit for admin activation
                    </Button>
                  </>
                )}
              </div>
            )}

            {step === 'pending' && (
              <div className="space-y-4 py-6 text-center">
                <Loader2 className="mx-auto size-10 animate-spin text-primary" />
                <h2 className="font-gilroy text-lg font-bold text-black">
                  Waiting for admin activation
                </h2>
                <p className="text-sm text-gray">
                  Your profile and documents were submitted. You remain inactive
                  until an admin opens the Approvals panel and activates your
                  account. This screen updates in real time.
                </p>
                <p className="text-xs text-gray">
                  Registration ID: {registrationId}
                </p>
              </div>
            )}

            {step === 'active' && (
              <div className="space-y-3 py-6 text-center">
                <ShieldCheck className="mx-auto size-10 text-success" />
                <h2 className="font-gilroy text-lg font-bold text-black">
                  Account activated
                </h2>
                <p className="text-sm text-gray">Taking you to your portal…</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#07111c] text-white">
          Loading…
        </div>
      }
    >
      <RegisterInner />
    </Suspense>
  )
}
