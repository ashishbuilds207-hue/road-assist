'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, UserRole } from '@/types/database'

export type AccountStatus =
  | 'PENDING_APPROVAL'
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'DEACTIVATED'
  | 'REQUIRES_REVIEW'

export interface AuthUser {
  id: string
  email?: string | null
  phone?: string | null
}

interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  role: UserRole | null
  companyId: string | null
  providerId: string | null
  driverId: string | null
  technicianId: string | null
  demoMode: boolean
  accountStatus: AccountStatus
  registrationId: string | null
  membershipType: 'OWNER' | 'MEMBER' | null
  setAuth: (payload: {
    user: AuthUser | null
    profile?: Profile | null
    demoMode?: boolean
    companyId?: string | null
    providerId?: string | null
    driverId?: string | null
    technicianId?: string | null
    accountStatus?: AccountStatus
    registrationId?: string | null
    membershipType?: 'OWNER' | 'MEMBER' | null
  }) => void
  setAccountStatus: (status: AccountStatus) => void
  hydrateFromProfile: (
    profile: Profile | null,
    links?: {
      companyId?: string | null
      providerId?: string | null
      driverId?: string | null
      technicianId?: string | null
    }
  ) => void
  logout: () => void
  isAccountActive: () => boolean
  isFleetOwner: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      role: null,
      companyId: null,
      providerId: null,
      driverId: null,
      technicianId: null,
      demoMode: false,
      accountStatus: 'PENDING_APPROVAL',
      registrationId: null,
      membershipType: 'OWNER',

      setAuth: ({
        user,
        profile = null,
        demoMode = false,
        companyId,
        providerId,
        driverId,
        technicianId,
        accountStatus = 'PENDING_APPROVAL',
        registrationId = null,
        membershipType = 'OWNER',
      }) =>
        set({
          user,
          profile,
          role: profile?.role ?? null,
          companyId: companyId ?? null,
          providerId: providerId ?? null,
          driverId: driverId ?? null,
          technicianId: technicianId ?? null,
          demoMode,
          accountStatus:
            accountStatus === 'PENDING' ? 'PENDING_APPROVAL' : accountStatus,
          registrationId,
          membershipType,
        }),

      setAccountStatus: (accountStatus) =>
        set((s) => ({
          accountStatus,
          profile: s.profile
            ? { ...s.profile, is_active: accountStatus === 'ACTIVE' }
            : s.profile,
        })),

      hydrateFromProfile: (profile, links) =>
        set({
          profile,
          role: profile?.role ?? null,
          companyId: links?.companyId ?? null,
          providerId: links?.providerId ?? null,
          driverId: links?.driverId ?? null,
          technicianId: links?.technicianId ?? null,
          accountStatus: profile?.is_active === false ? 'PENDING' : 'ACTIVE',
        }),

      logout: () =>
        set({
          user: null,
          profile: null,
          role: null,
          companyId: null,
          providerId: null,
          driverId: null,
          technicianId: null,
          demoMode: false,
          accountStatus: 'PENDING_APPROVAL',
          registrationId: null,
          membershipType: 'OWNER',
        }),

      isAccountActive: () => get().accountStatus === 'ACTIVE',
      isFleetOwner: () =>
        get().role === 'DRIVER' && get().membershipType !== 'MEMBER',
    }),
    { name: 'rsa-auth' }
  )
)
