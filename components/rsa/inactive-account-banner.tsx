'use client'

import { useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Ban, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { AuthService } from '@/services/AuthService'
import { useToast } from '@/components/ui/use-toast'

/**
 * Checks registration status via normal API whenever the user opens/changes a page.
 * No background polling / webhook.
 */
export function InactiveAccountBanner() {
  const pathname = usePathname()
  const accountStatus = useAuthStore((s) => s.accountStatus)
  const registrationId = useAuthStore((s) => s.registrationId)
  const role = useAuthStore((s) => s.role)
  const setAccountStatus = useAuthStore((s) => s.setAccountStatus)
  const profile = useAuthStore((s) => s.profile)
  const { toast } = useToast()

  const checkStatus = useCallback(async () => {
    if (!registrationId && !(profile?.phone && role)) return
    if (role === 'ADMIN') return

    try {
      let url = ''
      if (registrationId) {
        url = `/api/auth/registration-status?id=${encodeURIComponent(registrationId)}`
      } else if (profile?.phone && role) {
        url = `/api/auth/registration-status?phone=${encodeURIComponent(profile.phone)}&role=${encodeURIComponent(role)}`
      }
      if (!url) return

      const res = await fetch(url, { cache: 'no-store' })
      // Missing registration after hard delete — mark deactivated
      if (res.status === 404) {
        const current = useAuthStore.getState().accountStatus
        if (current !== 'DEACTIVATED') {
          setAccountStatus('DEACTIVATED')
          toast({
            title: 'Account deleted',
            description: 'This account was removed by an admin.',
          })
        }
        return
      }
      if (!res.ok) {
        console.warn('registration-status failed', res.status)
        return
      }

      const data = await res.json()
      const status = data.registration?.status as string | undefined
      if (!status) return

      const current = useAuthStore.getState().accountStatus

      if (status === 'ACTIVE') {
        if (current !== 'ACTIVE') {
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
        if (current !== status) {
          setAccountStatus(status as never)
          if (status === 'SUSPENDED') {
            toast({
              title: 'Account blocked',
              description: 'An admin blocked your account.',
            })
          } else if (status === 'DEACTIVATED') {
            toast({
              title: 'Account deleted',
              description: 'This account was removed by an admin.',
            })
          }
        }
        return
      }

      if (status === 'PENDING' || status === 'PENDING_APPROVAL') {
        if (current !== 'PENDING_APPROVAL') {
          setAccountStatus('PENDING_APPROVAL')
        }
      }
    } catch (e) {
      console.warn('registration-status error', e)
    }
  }, [registrationId, profile?.phone, role, setAccountStatus, toast])

  // Call API on every page change / mount — no interval webhook
  useEffect(() => {
    void checkStatus()
  }, [pathname, checkStatus])

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
