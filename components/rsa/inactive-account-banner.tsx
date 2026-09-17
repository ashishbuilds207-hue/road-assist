'use client'

import { useEffect } from 'react'
import { Ban, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { AuthService } from '@/services/AuthService'
import { useToast } from '@/components/ui/use-toast'

/**
 * Polls registration status for live admin block/activate.
 * Does NOT logout on 404 — missing rows are normal on serverless /tmp
 * and must not kick active sessions.
 */
export function InactiveAccountBanner() {
  const accountStatus = useAuthStore((s) => s.accountStatus)
  const registrationId = useAuthStore((s) => s.registrationId)
  const setAccountStatus = useAuthStore((s) => s.setAccountStatus)
  const profile = useAuthStore((s) => s.profile)
  const { toast } = useToast()

  useEffect(() => {
    if (!registrationId) return

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/auth/registration-status?id=${encodeURIComponent(registrationId)}`
        )
        // Missing registration (404) — keep current session; do not logout
        if (res.status === 404 || !res.ok) return

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
      } catch {
        // network blip — ignore
      }
    }

    void poll()
    const id = setInterval(() => void poll(), 4000)
    return () => clearInterval(id)
  }, [accountStatus, registrationId, setAccountStatus, toast])

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
