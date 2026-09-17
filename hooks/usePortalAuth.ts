'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/AuthService'
import { useAuthStore, type AccountStatus } from '@/stores/authStore'

/**
 * Hydrates auth, then syncs ACTIVE/PENDING from registration API (source of truth).
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

      // Source of truth: registration API
      try {
        let url = ''
        if (state.registrationId) {
          url = `/api/auth/registration-status?id=${encodeURIComponent(state.registrationId)}`
        } else if (state.profile?.phone && state.role) {
          url = `/api/auth/registration-status?phone=${encodeURIComponent(state.profile.phone)}&role=${encodeURIComponent(state.role)}`
        }

        if (url) {
          const r = await fetch(url)
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
            } else {
              // No registration record → inactive by default
              setAccountStatus('PENDING')
            }
          } else {
            setAccountStatus('PENDING')
          }
        } else {
          // No registration id/phone → force inactive for non-admin
          setAccountStatus('PENDING')
        }
      } catch {
        setAccountStatus('PENDING')
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
