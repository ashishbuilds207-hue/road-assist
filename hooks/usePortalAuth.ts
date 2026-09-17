'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/AuthService'
import { useAuthStore, type AccountStatus } from '@/stores/authStore'

/**
 * Hydrates auth, then syncs ACTIVE/PENDING from registration API (source of truth).
 * One API call on portal open — no background webhook.
 */
export function usePortalAuth(loginPath = '/login') {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const demoMode = useAuthStore((s) => s.demoMode)
  const accountStatus = useAuthStore((s) => s.accountStatus)
  const registrationId = useAuthStore((s) => s.registrationId)
  const setAccountStatus = useAuthStore((s) => s.setAccountStatus)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await AuthService.hydrate()
      if (cancelled) return
      const state = useAuthStore.getState()
      if (!res.data?.user && !state.user) {
        router.replace(loginPath)
        return
      }

      // Admins are always treated as active
      if (state.role === 'ADMIN') {
        setAccountStatus('ACTIVE')
        setReady(true)
        return
      }

      // Source of truth: registration API (once on enter)
      try {
        let url = ''
        if (state.registrationId) {
          url = `/api/auth/registration-status?id=${encodeURIComponent(state.registrationId)}`
        } else if (state.profile?.phone && state.role) {
          url = `/api/auth/registration-status?phone=${encodeURIComponent(state.profile.phone)}&role=${encodeURIComponent(state.role)}`
        }

        if (url) {
          const r = await fetch(url, { cache: 'no-store' })
          if (r.ok) {
            const data = await r.json()
            const reg = data.registration
            if (reg?.status) {
              const status = reg.status as AccountStatus
              setAuth({
                user: state.user,
                profile: state.profile
                  ? { ...state.profile, is_active: status === 'ACTIVE' }
                  : state.profile,
                demoMode: state.demoMode,
                companyId: state.companyId,
                providerId: state.providerId,
                driverId: state.driverId,
                technicianId: state.technicianId,
                accountStatus: status,
                registrationId: reg.id ?? state.registrationId,
              })
            }
            // Missing status → keep hydrated session status
          } else if (r.status !== 404) {
            console.warn('portal auth registration-status', r.status)
          }
        }
      } catch (e) {
        console.warn('portal auth registration-status error', e)
        // Keep existing session status on network error
      }

      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router, loginPath, setAccountStatus, setAuth])

  return {
    ready: ready && Boolean(user || profile),
    user,
    profile,
    demoMode,
    accountStatus,
    registrationId,
  }
}
