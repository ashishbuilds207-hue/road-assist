'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, TriangleAlert, Truck, Wrench, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { AuthService } from '@/services/AuthService'
import type { UserRole } from '@/types/database'
import { roleHomePath } from '@/types/rsa'

type RoleKey = 'DRIVER' | 'COMPANY' | 'SERVICE_PROVIDER'

const ROLE_BUTTONS: {
  key: RoleKey
  label: string
  hint: string
  icon: typeof Truck
}[] = [
  {
    key: 'DRIVER',
    label: 'Driver',
    hint: 'Solo or company driver — register & wait for admin approval',
    icon: Truck,
  },
  {
    key: 'COMPANY',
    label: 'Company / Fleet',
    hint: 'Fleet operators — MC/USDOT & business documents',
    icon: Building2,
  },
  {
    key: 'SERVICE_PROVIDER',
    label: 'Service Provider',
    hint: 'Mobile RSA shops — approved providers only on the network',
    icon: Wrench,
  },
]

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-gray">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const search = useSearchParams()
  const redirect = search.get('redirect')
  const roleParam = search.get('role')

  const [step, setStep] = useState<'role' | 'phone' | 'otp'>('role')
  const [role, setRole] = useState<RoleKey | null>(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [autofill, setAutofill] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const map: Record<string, RoleKey> = {
      driver: 'DRIVER',
      company: 'COMPANY',
      fleet: 'COMPANY',
      provider: 'SERVICE_PROVIDER',
      'service-provider': 'SERVICE_PROVIDER',
      DRIVER: 'DRIVER',
      COMPANY: 'COMPANY',
      SERVICE_PROVIDER: 'SERVICE_PROVIDER',
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
      setError(data.error || 'OTP request failed')
      return
    }
    setPhone(data.phone.replace('+1', ''))
    setAutofill(data.autofillOtp)
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

    if (data.next === 'register' || !data.registration) {
      setError('No account for this phone. Please register first.')
      return
    }
    if (
      data.registration.status === 'REJECTED' ||
      data.registration.status === 'SUSPENDED'
    ) {
      setError(`Account status: ${data.registration.status}`)
      return
    }

    await AuthService.activateRegisteredSession({
      ...data.registration,
      status: data.registration.status,
    })
    router.replace(
      redirect || roleHomePath(data.registration.role as UserRole)
    )
  }

  return (
    <div className="grid h-screen w-full gap-5 bg-[#07111c] p-4 md:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-[20px] md:block md:h-full">
        <Image
          src="/images/marketing/hero-truck-roadside.png"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07111c] via-[#07111c]/55 to-[#07111c]/20" />
        <Link
          href="/"
          className="absolute left-5 top-5 z-10 font-gilroy text-lg font-extrabold text-white"
        >
          RSA <span className="text-primary">PLATFORM</span>
        </Link>
        <div className="absolute bottom-8 left-6 right-6 z-10 space-y-2 text-white">
          <h2 className="font-gilroy text-2xl font-bold lg:text-3xl">
            Sign in to your portal
          </h2>
          <p className="max-w-md text-sm text-white/75">
            Two logins only: Driver/Fleet or Service Provider. New accounts stay
            inactive until an admin approves them.
          </p>
        </div>
      </div>

      <div className="flex overflow-y-auto py-2">
        <Card className="m-auto w-full max-w-[420px] space-y-6 p-5 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="pending" size="small">
                Phone OTP
              </Badge>
              <Link href="/" className="text-xs font-semibold text-primary underline">
                ← Home
              </Link>
            </div>
            <h2 className="font-gilroy text-xl font-bold text-black lg:text-2xl">
              RSA PLATFORM
            </h2>
            <p className="font-medium leading-tight text-gray">
              Inactive accounts can browse; posting unlocks after admin approval.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="flex gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                <TriangleAlert className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 'role' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-black">Continue as</p>
                {ROLE_BUTTONS.map((b) => {
                  const Icon = b.icon
                  return (
                    <Button
                      key={b.key}
                      type="button"
                      variant="outline-general"
                      size="large"
                      className="h-auto w-full justify-start gap-3 py-3"
                      onClick={() => {
                        setRole(b.key)
                        setStep('phone')
                      }}
                    >
                      <Icon className="size-5 shrink-0 text-primary" />
                      <span className="text-left">
                        <span className="block font-semibold">{b.label}</span>
                        <span className="block text-xs font-normal text-gray">
                          {b.hint}
                        </span>
                      </span>
                    </Button>
                  )
                })}
                <Link
                  href="/register"
                  className="block text-center text-sm font-semibold text-primary"
                >
                  New user? Register →
                </Link>
              </div>
            )}

            {step === 'phone' && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-black">Phone</label>
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
                  disabled={loading}
                  onClick={requestOtp}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Get OTP
                </Button>
                <Button
                  type="button"
                  variant="outline-general"
                  onClick={() => setStep('role')}
                >
                  Back
                </Button>
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-3">
                {autofill && (
                  <div className="rounded-lg border border-primary/30 bg-light-theme px-3 py-2 text-sm">
                    Database OTP autofill:{' '}
                    <strong className="tracking-widest text-primary">
                      {autofill}
                    </strong>
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
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant="outline-general"
                  disabled={seconds > 0}
                  onClick={requestOtp}
                >
                  {seconds > 0 ? `Resend ${seconds}s` : 'Resend OTP'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
