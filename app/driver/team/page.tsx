'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/rsa/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { useCanPost } from '@/hooks/useCanPost'
import { useRouter } from 'next/navigation'

type Invite = {
  id: string
  inviteeName: string
  inviteePhone?: string | null
  inviteeEmail?: string | null
  status: string
  memberRegistrationId?: string | null
}

export default function DriverTeamPage() {
  const router = useRouter()
  const { toast } = useToast()
  const companyId = useAuthStore((s) => s.companyId)
  const registrationId = useAuthStore((s) => s.registrationId)
  const isOwner = useAuthStore((s) => s.isFleetOwner())
  const profile = useAuthStore((s) => s.profile)
  const { canPost } = useCanPost()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!isOwner) router.replace('/driver')
  }, [isOwner, router])

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await fetch(
      `/api/fleet/invites?companyId=${encodeURIComponent(companyId)}`
    )
    const data = await res.json()
    setInvites(data.invites || [])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    void load()
  }, [load])

  const invite = async () => {
    if (!companyId || !registrationId) return
    setSaving(true)
    const res = await fetch('/api/fleet/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'invite',
        companyId,
        ownerRegistrationId: registrationId,
        companyName: profile?.full_name,
        inviteeName: name,
        inviteePhone: phone || undefined,
        inviteeEmail: email || undefined,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast({ title: 'Invite failed', description: data.error })
      return
    }
    toast({
      title: 'Driver invited',
      description:
        'They sign in with Driver login. Admin must activate before they can post emergencies.',
    })
    setName('')
    setPhone('')
    setEmail('')
    void load()
  }

  if (!isOwner) return null

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Company drivers"
        description="Invite drivers by phone or email. They join your company with limited access — emergencies, messages, and service status."
      />

      {!canPost && (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-black">
          Activate your account with admin before inviting drivers.
        </p>
      )}

      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-2 font-semibold text-black">
          <UserPlus className="size-4 text-primary" />
          Invite driver
        </p>
        <Input
          variant="input-form"
          placeholder="Driver full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          variant="input-form"
          placeholder="Phone (for Driver login OTP)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          variant="input-form"
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          type="button"
          variant="default"
          disabled={saving || !canPost || !name || !phone}
          onClick={() => void invite()}
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Send invite
        </Button>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : invites.length === 0 ? (
        <EmptyState
          title="No company drivers yet"
          description="Invite team members so they can post emergencies under your company."
        />
      ) : (
        <div className="space-y-2">
          {invites.map((i) => (
            <Card key={i.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-black">{i.inviteeName}</p>
                <p className="text-xs text-gray">
                  {i.inviteePhone || '—'}
                  {i.inviteeEmail ? ` · ${i.inviteeEmail}` : ''}
                </p>
              </div>
              <Badge
                variant={i.status === 'ACCEPTED' ? 'success' : 'pending'}
                size="small"
              >
                {i.status}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
