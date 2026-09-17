import { getSupabase, ok, fail, shouldUseDemoStore } from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { AdminSubrole, Profile, UserRole } from '@/types/database'
import {
  DEMO_ACCOUNTS,
  DEMO_PENDING_OTP_KEY,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_STORAGE_KEY,
  findDemoAccountByPhone,
  roleHomePath,
  type DemoAccount,
} from '@/types/rsa'
import { useAuthStore, type AuthUser } from '@/stores/authStore'
import { getDemoData } from '@/stores/demoDataStore'

export type AuthSession = {
  user: AuthUser
  profile: Profile
  demoMode: boolean
  redirect: string
  companyId: string | null
  providerId: string | null
  driverId: string | null
  technicianId: string | null
  accountStatus?:
    | 'PENDING'
    | 'PENDING_APPROVAL'
    | 'ACTIVE'
    | 'REJECTED'
    | 'SUSPENDED'
    | 'DEACTIVATED'
    | 'REQUIRES_REVIEW'
  registrationId?: string | null
  membershipType?: 'OWNER' | 'MEMBER' | null
}

function getDemoOtp(): string {
  return process.env.NEXT_PUBLIC_DEMO_OTP || '123456'
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

function buildDemoProfile(account: DemoAccount): Profile {
  const now = new Date().toISOString()
  const id = `demo-${account.role}`
  return {
    id,
    email: account.email,
    phone: account.phone,
    full_name: account.fullName,
    avatar_url: null,
    role: account.role,
    admin_subrole: account.role === 'ADMIN' ? ('SUPER_ADMIN' as AdminSubrole) : null,
    is_active: true,
    last_seen_at: now,
    timezone: 'America/Chicago',
    created_at: now,
    updated_at: now,
  }
}

function linksFromAccount(account: DemoAccount) {
  return {
    companyId: account.companyId ?? null,
    providerId: account.providerId ?? null,
    driverId: account.driverId ?? null,
    technicianId: account.technicianId ?? null,
  }
}

function setDemoCookie(payload: string) {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 * 24 * 7
  document.cookie = `${DEMO_SESSION_COOKIE}=${encodeURIComponent(payload)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearDemoCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

function persistDemoSession(session: AuthSession) {
  if (typeof window === 'undefined') return
  getDemoData()
  const serialized = JSON.stringify(session)
  localStorage.setItem(DEMO_SESSION_STORAGE_KEY, serialized)
  setDemoCookie(
    JSON.stringify({
      role: session.profile.role,
      phone: session.profile.phone,
      demoMode: session.demoMode,
      accountStatus: session.accountStatus ?? 'PENDING',
      registrationId: session.registrationId ?? null,
    })
  )
  useAuthStore.getState().setAuth({
    user: session.user,
    profile: session.profile,
    demoMode: session.demoMode,
    companyId: session.companyId,
    providerId: session.providerId,
    driverId: session.driverId,
    technicianId: session.technicianId,
    accountStatus: session.accountStatus ?? 'PENDING',
    registrationId: session.registrationId ?? null,
    membershipType: session.membershipType ?? 'OWNER',
  })
}

function clearDemoSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
  localStorage.removeItem(DEMO_PENDING_OTP_KEY)
  clearDemoCookie()
  useAuthStore.getState().logout()
}

function readDemoSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DEMO_SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

function sessionFromAccount(account: DemoAccount, demoMode: boolean): AuthSession {
  const profile = buildDemoProfile(account)
  const links = linksFromAccount(account)
  return {
    user: {
      id: profile.id,
      email: profile.email,
      phone: profile.phone,
    },
    profile,
    demoMode,
    redirect: account.redirect || roleHomePath(account.role),
    ...links,
  }
}

export const AuthService = {
  async requestOtp(phone: string): Promise<ServiceResult<{ phone: string; demo: true }>> {
    try {
      const normalized = normalizePhone(phone)
      const account = findDemoAccountByPhone(normalized)
      if (!account) {
        return fail(
          { phone: normalized, demo: true as const },
          'Phone not recognized. Use a DEMO account phone number.'
        )
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          DEMO_PENDING_OTP_KEY,
          JSON.stringify({ phone: account.phone, requestedAt: Date.now() })
        )
      }
      return ok({ phone: account.phone, demo: true as const })
    } catch (e) {
      return fail({ phone, demo: true as const }, e)
    }
  },

  async verifyOtp(
    phone: string,
    otp: string
  ): Promise<ServiceResult<AuthSession | null>> {
    try {
      const expected = getDemoOtp()
      if (otp.trim() !== expected) {
        return fail(null, 'Invalid OTP. Use the DEMO code.')
      }

      const normalized = normalizePhone(phone)
      const account = findDemoAccountByPhone(normalized)
      if (!account) {
        return fail(null, 'Unknown DEMO phone number')
      }

      getDemoData()

      const supabaseSession = await this.trySupabaseDemoSignIn(account)
      if (supabaseSession) {
        useAuthStore.getState().setAuth({
          user: supabaseSession.user,
          profile: supabaseSession.profile,
          demoMode: false,
          companyId: supabaseSession.companyId,
          providerId: supabaseSession.providerId,
          driverId: supabaseSession.driverId,
          technicianId: supabaseSession.technicianId,
        })
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DEMO_PENDING_OTP_KEY)
        }
        return ok(supabaseSession)
      }

      const session = sessionFromAccount(account, true)
      persistDemoSession(session)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DEMO_PENDING_OTP_KEY)
      }
      return ok(session)
    } catch (e) {
      return fail(null, e)
    }
  },

  async trySupabaseDemoSignIn(
    account: DemoAccount
  ): Promise<AuthSession | null> {
    try {
      const supabase = getSupabase()
      const demoPassword =
        process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'DemoRSA123!'

      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: demoPassword,
      })

      if (error || !data.user) return null

      let profile = buildDemoProfile(account)
      try {
        const { data: row } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()
        if (row) profile = row as Profile
      } catch {
        // use built demo profile
      }

      const links = linksFromAccount(account)
      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          phone: data.user.phone ?? account.phone,
        },
        profile: { ...profile, id: data.user.id, role: account.role },
        demoMode: false,
        redirect: account.redirect,
        ...links,
      }
    } catch {
      return null
    }
  },

  async logout(): Promise<ServiceResult<boolean>> {
    try {
      try {
        const supabase = getSupabase()
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
      clearDemoSession()
      return ok(true)
    } catch (e) {
      clearDemoSession()
      return fail(false, e)
    }
  },

  async getSession(): Promise<ServiceResult<AuthSession | null>> {
    try {
      try {
        const supabase = getSupabase()
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          const user = data.session.user
          let profile: Profile | null = null
          try {
            const { data: row } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle()
            profile = row ? (row as Profile) : null
          } catch {
            profile = null
          }

          if (!profile) {
            const byEmail = DEMO_ACCOUNTS.find((a) => a.email === user.email)
            if (byEmail) profile = buildDemoProfile(byEmail)
          }

          if (profile) {
            const account = DEMO_ACCOUNTS.find((a) => a.role === profile!.role)
            const links = account ? linksFromAccount(account) : {
              companyId: null,
              providerId: null,
              driverId: null,
              technicianId: null,
            }
            const session: AuthSession = {
              user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
              },
              profile,
              demoMode: false,
              redirect: account?.redirect ?? roleHomePath(profile.role),
              ...links,
            }
            useAuthStore.getState().setAuth({
              user: session.user,
              profile: session.profile,
              demoMode: false,
              ...links,
            })
            return ok(session)
          }
        }
      } catch {
        // fall through to demo
      }

      const demo = readDemoSession()
      if (demo) {
        getDemoData()
        useAuthStore.getState().setAuth({
          user: demo.user,
          profile: demo.profile,
          demoMode: demo.demoMode,
          companyId: demo.companyId,
          providerId: demo.providerId,
          driverId: demo.driverId,
          technicianId: demo.technicianId,
          accountStatus:
            demo.profile.role === 'ADMIN'
              ? 'ACTIVE'
              : demo.accountStatus ?? 'PENDING',
          registrationId: demo.registrationId ?? null,
        })
        return ok(demo)
      }

      return ok(null)
    } catch (e) {
      return fail(null, e)
    }
  },

  /** Alias used by portal hooks */
  async hydrate(): Promise<ServiceResult<AuthSession | null>> {
    return this.getSession()
  },

  async switchDemoRole(role: UserRole): Promise<ServiceResult<AuthSession | null>> {
    try {
      const account = DEMO_ACCOUNTS.find((a) => a.role === role)
      if (!account) return fail(null, 'Unknown DEMO role')
      getDemoData()
      const session = sessionFromAccount(account, true)
      persistDemoSession(session)
      return ok(session)
    } catch (e) {
      return fail(null, e)
    }
  },

  listDemoAccounts(): DemoAccount[] {
    return DEMO_ACCOUNTS
  },

  isUsingDemoStore(): boolean {
    return shouldUseDemoStore()
  },

  /** Create local session from registration (ACTIVE or PENDING read-only) */
  async activateRegisteredSession(registration: {
    id: string
    phone: string
    email: string
    full_name: string
    role: UserRole
    company_name?: string | null
    business_name?: string | null
    company_id?: string | null
    membership_type?: 'OWNER' | 'MEMBER' | null
    status?:
      | 'PENDING'
      | 'PENDING_APPROVAL'
      | 'ACTIVE'
      | 'REJECTED'
      | 'SUSPENDED'
      | 'DEACTIVATED'
      | 'REQUIRES_REVIEW'
  }): Promise<ServiceResult<AuthSession | null>> {
    try {
      const now = new Date().toISOString()
      // No technician portal — technicians map to provider portal if legacy
      const portalRole: UserRole =
        registration.role === 'TECHNICIAN'
          ? 'SERVICE_PROVIDER'
          : registration.role
      const status =
        portalRole === 'ADMIN'
          ? 'ACTIVE'
          : registration.status === 'PENDING'
            ? 'PENDING_APPROVAL'
            : registration.status ?? 'PENDING_APPROVAL'
      const isActive = status === 'ACTIVE'
      const companyId =
        registration.company_id ||
        (portalRole === 'DRIVER' || portalRole === 'COMPANY'
          ? `co-${registration.id}`
          : null)
      const profile: Profile = {
        id: `reg-${registration.id}`,
        email: registration.email,
        phone: registration.phone,
        full_name: registration.full_name,
        avatar_url: null,
        role: portalRole,
        admin_subrole: portalRole === 'ADMIN' ? ('SUPER_ADMIN' as AdminSubrole) : null,
        is_active: isActive,
        last_seen_at: now,
        timezone: 'America/Chicago',
        created_at: now,
        updated_at: now,
      }
      const session: AuthSession = {
        user: {
          id: profile.id,
          email: profile.email,
          phone: profile.phone,
        },
        profile,
        demoMode: false,
        redirect: roleHomePath(portalRole),
        companyId,
        providerId:
          portalRole === 'SERVICE_PROVIDER'
            ? `prov-${registration.id}`
            : null,
        driverId: portalRole === 'DRIVER' ? `drv-${registration.id}` : null,
        technicianId: null,
        accountStatus: status,
        registrationId: registration.id,
        membershipType: registration.membership_type ?? 'OWNER',
      }
      persistDemoSession(session)
      return ok(session)
    } catch (e) {
      return fail(null, e)
    }
  },
}
