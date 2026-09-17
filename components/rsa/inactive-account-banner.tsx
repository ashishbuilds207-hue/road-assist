'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { AuthService } from '@/services/AuthService'
import { useToast } from '@/components/ui/use-toast'

/**
 * Always polls registration status so admin block/delete applies live.
 * Block → status banner. Delete → forced logout.
 */
export function InactiveAccountBanner() {
  const accountStatus = useAuthStore((s) => s.accountStatus)
  const registrationId = useAuthStore((s) => s.registrationId)
  const setAccountStatus = useAuthStore((s) => s.setAccountStatus)
  const profile = useAuthStore((s) => s.profile)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!registrationId) return

    const poll = async () => {
      const res = await fetch(
        `/api/auth/registration-status?id=${encodeURIComponent(registrationId)}`
      )
      if (res.status === 404) {
        const data = await res.json().catch(() => ({}))
        if (data.deleted) {
          toast({
            title: 'Account deleted',
            description:
              'An admin removed your account. You have been signed out.',
          })
          await AuthService.logout()
          router.replace('/login')
        }
        return
      }
      if (!res.ok) return
      const data = await res.json()
      const status = data.registration?.status as string | undefined
      if (!status) return

      if (status === 'ACTIVE') {
        if (accountStatus !== 'ACTIVE') {
          setAccountStatus('ACTIVE')
          await AuthService.activateRegisteredSession({
            ...data.registration,
            status: 'ACTIVE',
          })
          toast({
            title: 'Account approved',
            description: 'Your account is active again.',
          })
        }
        return
      }

      if (
        status === 'REJECTED' ||
        status === 'SUSPENDED' ||
        status === 'REQUIRES_REVIEW' ||
        status === 'DEACTIVATED'
      ) {
        if (accountStatus !== status) {
          setAccountStatus(status as never)
          if (status === 'SUSPENDED') {
            toast({
              title: 'Account blocked',
              description: 'An admin blocked your account.',
            })
          }
        }
        return
      }

      if (status === 'PENDING' || status === 'PENDING_APPROVAL') {
        if (accountStatus !== 'PENDING_APPROVAL') {
          setAccountStatus('PENDING_APPROVAL')
        }
      }
    }

    void poll()
    const id = setInterval(() => void poll(), 2000)
    return () => clearInterval(id)
  }, [accountStatus, registrationId, setAccountStatus, toast, router])

  if (accountStatus === 'ACTIVE' || !registrationId) return null

  const blocked = accountStatus === 'SUSPENDED'
  const title =
    accountStatus === 'REJECTED'
      ? 'Your application was rejected'
      : blocked
        ? 'Your account is blocked'
        : accountStatus === 'REQUIRES_REVIEW'
          ? 'More information required'
          : accountStatus === 'DEACTIVATED'
            ? 'Your account is deactivated'
            : 'Your account is currently under review'

  const body = blocked
    ? `Hi ${profile?.full_name || 'there'}, an admin blocked this account. Contact support to restore access.`
    : accountStatus === 'REJECTED' || accountStatus === 'DEACTIVATED'
      ? `Hi ${profile?.full_name || 'there'}, contact support or wait for admin guidance.`
      : accountStatus === 'REQUIRES_REVIEW'
        ? 'An admin requested more information. Update your documents, then wait for re-review.'
        : 'You can browse, but you cannot create RSA requests until approved.'

  return (
    <div
      className={
        blocked || accountStatus === 'REJECTED'
          ? 'border-b border-danger/30 bg-danger/5 px-4 py-2.5 text-danger'
          : 'border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-950'
      }
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2 text-sm">
        {blocked ? (
          <Ban className="mt-0.5 size-4 shrink-0" />
        ) : (
          <Clock className="mt-0.5 size-4 shrink-0" />
        )}
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs opacity-80">{body}</p>
        </div>
      </div>
    </div>
  )
}
