'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/badge'
import { MapPin, FileText } from 'lucide-react'

type RegDoc = {
  category: string
  name: string
  dataUrl?: string
}

type Reg = {
  id: string
  full_name: string
  email: string
  phone: string
  status: string
  formatted_address?: string | null
  latitude?: number | null
  longitude?: number | null
  documents?: RegDoc[]
  company_name?: string | null
  created_at: string
}

export default function DriverProfilePage() {
  const profile = useAuthStore((s) => s.profile)
  const accountStatus = useAuthStore((s) => s.accountStatus)
  const registrationId = useAuthStore((s) => s.registrationId)
  const [reg, setReg] = useState<Reg | null>(null)

  useEffect(() => {
    const load = async () => {
      // Always resolve status from API when possible
      let url = ''
      if (registrationId) {
        url = `/api/auth/registration-status?id=${encodeURIComponent(registrationId)}`
      } else if (profile?.phone) {
        url = `/api/auth/registration-status?phone=${encodeURIComponent(profile.phone)}&role=DRIVER`
      }
      if (!url) {
        setReg(null)
        return
      }
      const r = await fetch(url)
      if (!r.ok) {
        setReg(null)
        return
      }
      const d = await r.json()
      setReg(d.registration || null)
      if (d.registration?.status) {
        useAuthStore.getState().setAccountStatus(d.registration.status)
      }
    }
    void load()
  }, [registrationId, profile?.phone])

  const status = (reg?.status as string) || accountStatus || 'PENDING'
  const isActive = status === 'ACTIVE'

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Profile"
        description="Your driver account details and uploaded documents."
      />
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-black">
            {reg?.full_name ?? profile?.full_name ?? 'Driver'}
          </h2>
          <Badge
            variant={isActive ? 'success' : 'pending'}
            size="small"
          >
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray">Phone</dt>
            <dd className="font-medium text-black">
              {reg?.phone ?? profile?.phone}
            </dd>
          </div>
          <div>
            <dt className="text-gray">Email</dt>
            <dd className="font-medium text-black">
              {reg?.email ?? profile?.email}
            </dd>
          </div>
          <div>
            <dt className="text-gray">Role</dt>
            <dd className="font-medium text-black">{profile?.role ?? 'DRIVER'}</dd>
          </div>
          <div>
            <dt className="text-gray">Account</dt>
            <dd className="font-medium text-black">
              {isActive
                ? 'Active — full access'
                : 'Not active — please wait for admin'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="flex items-center gap-2 font-semibold text-black">
          <MapPin className="size-4 text-primary" />
          Registered location
        </h3>
        <p className="text-sm text-gray">
          {reg?.formatted_address ||
            (reg?.latitude != null
              ? `${reg.latitude}, ${reg.longitude}`
              : 'No location on file')}
        </p>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="flex items-center gap-2 font-semibold text-black">
          <FileText className="size-4 text-primary" />
          Your documents
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(reg?.documents || []).map((d) => (
            <div
              key={d.category}
              className="rounded-lg border border-gray-200 p-3"
            >
              <p className="text-xs font-semibold text-gray">{d.category}</p>
              <p className="mb-2 text-sm text-black">{d.name}</p>
              {d.dataUrl?.startsWith('data:image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.dataUrl}
                  alt={d.category}
                  className="max-h-40 w-full rounded object-contain bg-gray-100"
                />
              ) : d.dataUrl ? (
                <a
                  href={d.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-primary underline"
                >
                  Open document
                </a>
              ) : (
                <p className="text-xs text-gray">No preview</p>
              )}
            </div>
          ))}
          {!reg?.documents?.length && (
            <p className="text-sm text-gray">No documents loaded yet.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
