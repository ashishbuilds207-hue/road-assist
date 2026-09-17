import type { UserRole } from '@/types/database'
import { isInUSA } from '@/lib/location/usa'
import { readBlob, writeBlob } from '@/lib/store/blob-store'

const OTP_KEY = 'otp'
const REG_KEY = 'registrations'

export type RegistrationStatus =
  | 'PENDING_APPROVAL'
  | 'PENDING' // legacy alias — treat as PENDING_APPROVAL
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'DEACTIVATED'
  | 'REQUIRES_REVIEW'

export function normalizeAccountStatus(
  status?: string | null
): Exclude<RegistrationStatus, 'PENDING'> {
  if (!status || status === 'PENDING') return 'PENDING_APPROVAL'
  if (
    status === 'PENDING_APPROVAL' ||
    status === 'ACTIVE' ||
    status === 'REJECTED' ||
    status === 'SUSPENDED' ||
    status === 'DEACTIVATED' ||
    status === 'REQUIRES_REVIEW'
  ) {
    return status
  }
  return 'PENDING_APPROVAL'
}

export type RegistrationDoc = {
  id: string
  category: string
  name: string
  dataUrl?: string
  uploadedAt: string
}

export type RegistrationRecord = {
  id: string
  phone: string
  email: string
  full_name: string
  role: UserRole
  /** Fleet company owner vs invited company driver */
  membership_type?: 'OWNER' | 'MEMBER' | null
  company_id?: string | null
  invited_by?: string | null
  company_name?: string | null
  company_address?: string | null
  usdot?: string | null
  mc_number?: string | null
  business_name?: string | null
  photo_url?: string | null
  latitude?: number | null
  longitude?: number | null
  formatted_address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  documents: RegistrationDoc[]
  status: RegistrationStatus
  activated_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

type OtpFile = {
  fixedCode: string
  requests: { phone: string; role: string; code: string; createdAt: string }[]
}

type RegFile = { items: RegistrationRecord[] }

async function readJson<T>(key: string, fallback: T): Promise<T> {
  return readBlob(key, fallback)
}

async function writeJson(key: string, data: unknown) {
  await writeBlob(key, data)
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

export async function getFixedOtpCode(): Promise<string> {
  const otp = await readJson<OtpFile>(OTP_KEY, {
    fixedCode: process.env.NEXT_PUBLIC_PLATFORM_OTP || process.env.NEXT_PUBLIC_DEMO_OTP || '123456',
    requests: [],
  })
  if (!otp.fixedCode) {
    otp.fixedCode = '123456'
    await writeJson(OTP_KEY, otp)
  }
  return otp.fixedCode
}

export async function requestOtp(phone: string, role: UserRole) {
  const normalized = normalizePhone(phone)
  const code = await getFixedOtpCode()
  const otp = await readJson<OtpFile>(OTP_KEY, { fixedCode: code, requests: [] })
  otp.fixedCode = code
  otp.requests.unshift({
    phone: normalized,
    role,
    code,
    createdAt: new Date().toISOString(),
  })
  otp.requests = otp.requests.slice(0, 200)
  await writeJson(OTP_KEY, otp)
  return { phone: normalized, code, autofill: code }
}

export async function verifyOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone)
  const expected = await getFixedOtpCode()
  const ok = code.trim() === expected
  return { ok, phone: normalized, code: expected }
}

export async function listRegistrations(status?: RegistrationStatus) {
  const file = await readJson<RegFile>(REG_KEY, { items: [] })
  // Drop hard-deleted leftovers so they never reappear in admin lists
  const cleaned = file.items.filter((i) => i.status !== 'DEACTIVATED')
  if (cleaned.length !== file.items.length) {
    await writeJson(REG_KEY, { items: cleaned })
  }
  const items = cleaned
  if (!status) return items
  if (status === 'PENDING_APPROVAL' || status === 'PENDING') {
    return items.filter(
      (i) =>
        i.status === 'PENDING_APPROVAL' ||
        i.status === 'PENDING' ||
        !i.status
    )
  }
  return items.filter((i) => i.status === status)
}

export async function getRegistrationById(id: string) {
  const items = await listRegistrations()
  return items.find((i) => i.id === id) ?? null
}

export async function getRegistrationByPhone(phone: string, role?: UserRole) {
  const normalized = normalizePhone(phone)
  const items = await listRegistrations()
  return (
    items.find(
      (i) =>
        i.phone === normalized && (!role || i.role === role)
    ) ?? null
  )
}

export async function upsertRegistration(
  input: Omit<RegistrationRecord, 'id' | 'created_at' | 'updated_at' | 'status'> & {
    id?: string
    status?: RegistrationStatus
  }
): Promise<RegistrationRecord> {
  const file = await readJson<RegFile>(REG_KEY, { items: [] })
  const now = new Date().toISOString()
  const phone = normalizePhone(input.phone)
  const existingIdx = file.items.findIndex(
    (i) => i.phone === phone && i.role === input.role
  )

  if (existingIdx >= 0) {
    const prev = file.items[existingIdx]
    const next: RegistrationRecord = {
      ...prev,
      ...input,
      phone,
      documents: input.documents ?? prev.documents,
      status: input.status ?? prev.status,
      updated_at: now,
    }
    file.items[existingIdx] = next
    await writeJson(REG_KEY, file)
    return next
  }

  const created: RegistrationRecord = {
    id: input.id || `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phone,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    membership_type: input.membership_type ?? 'OWNER',
    company_id:
      input.company_id ??
      (input.role === 'DRIVER' ? `co-${Date.now().toString(36)}` : null),
    invited_by: input.invited_by ?? null,
    company_name: input.company_name ?? null,
    company_address: input.company_address ?? null,
    usdot: input.usdot ?? null,
    mc_number: input.mc_number ?? null,
    business_name: input.business_name ?? null,
    photo_url: input.photo_url ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    formatted_address: input.formatted_address ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    zip: input.zip ?? null,
    documents: input.documents ?? [],
    status: input.status ?? 'PENDING_APPROVAL',
    activated_at: null,
    rejection_reason: null,
    created_at: now,
    updated_at: now,
  }
  file.items.unshift(created)
  await writeJson(REG_KEY, file)
  return created
}

export async function setRegistrationStatus(
  id: string,
  status: RegistrationStatus,
  reason?: string
) {
  const file = await readJson<RegFile>(REG_KEY, { items: [] })
  const idx = file.items.findIndex((i) => i.id === id)
  if (idx < 0) return null
  const now = new Date().toISOString()
  file.items[idx] = {
    ...file.items[idx],
    status,
    activated_at: status === 'ACTIVE' ? now : file.items[idx].activated_at,
    rejection_reason: reason ?? null,
    updated_at: now,
  }
  await writeJson(REG_KEY, file)
  return file.items[idx]
}

export async function deleteRegistration(id: string) {
  const file = await readJson<RegFile>(REG_KEY, { items: [] })
  const idx = file.items.findIndex((i) => i.id === id)
  if (idx < 0) return null
  const [removed] = file.items.splice(idx, 1)
  await writeJson(REG_KEY, file)
  return removed
}

/** Hard-delete registration + related blobs + Supabase row. */
export async function purgeRegistrationCompletely(id: string) {
  const existing =
    (await getRegistrationById(id)) ||
    (await listRegistrations()).find(
      (i) => i.id === id || i.phone === id || i.email === id
    ) ||
    null

  // Always hard-remove from local/rsa_store registrations (also strip DEACTIVATED leftovers)
  const file = await readJson<RegFile>(REG_KEY, { items: [] })
  const before = file.items.length
  const removed =
    existing ||
    file.items.find((i) => i.id === id) ||
    null
  file.items = file.items.filter(
    (i) =>
      i.id !== id &&
      !(removed && i.phone === removed.phone && i.role === removed.role) &&
      i.status !== 'DEACTIVATED'
  )
  if (file.items.length !== before || removed) {
    await writeJson(REG_KEY, file)
  }

  const phone = removed?.phone
  const role = removed?.role
  const providerKeys = removed
    ? [
        removed.id,
        removed.id.replace(/^reg-/, ''),
        `prov-${removed.id.replace(/^reg-/, '')}`,
        removed.id.startsWith('reg-') ? removed.id : `reg-${removed.id}`,
      ]
    : [id]

  // Purge OTP rows for this phone
  if (phone) {
    const otp = await readJson<OtpFile>(OTP_KEY, {
      fixedCode:
        process.env.NEXT_PUBLIC_PLATFORM_OTP ||
        process.env.NEXT_PUBLIC_DEMO_OTP ||
        '123456',
      requests: [],
    })
    otp.requests = otp.requests.filter((r) => r.phone !== phone)
    await writeJson(OTP_KEY, otp)
  }

  // Purge service requests tied to this driver/provider
  try {
    const jobs = await readJson<{ items: Record<string, unknown>[] }>(
      'service-requests',
      { items: [] }
    )
    const next = (jobs.items || []).filter((row) => {
      const driverId = String(row.driverId || '')
      const driverUserId = String(row.driverUserId || '')
      const providerId = String(row.providerId || '')
      const providerUserId = String(row.providerUserId || '')
      const driverPhone = String(row.driverPhone || '')
      const providerPhone = String(row.providerPhone || '')
      if (phone && (driverPhone === phone || providerPhone === phone)) return false
      if (providerKeys.some((k) => k && (providerId === k || providerUserId === k)))
        return false
      if (providerKeys.some((k) => k && (driverId === k || driverUserId === k)))
        return false
      if (id && (driverId === id || providerId === id || driverUserId === id || providerUserId === id))
        return false
      return true
    })
    await writeJson('service-requests', { items: next })
  } catch {
    // ignore
  }

  // Purge chat notifications for this user id
  try {
    const notifs = await readJson<{
      notifications: { userId?: string }[]
    }>('live-chat-notifications', { notifications: [] })
    notifs.notifications = (notifs.notifications || []).filter(
      (n) => n.userId !== id && !(removed && n.userId === removed.id)
    )
    await writeJson('live-chat-notifications', notifs)
  } catch {
    // ignore
  }

  // Hard delete from Supabase registration_requests if table exists
  await deleteFromSupabaseRegistration(id, phone, role)

  return removed
}

async function deleteFromSupabaseRegistration(
  id: string,
  phone?: string | null,
  role?: string | null
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url.includes('your-project') || key.length < 20) return

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'return=minimal',
  }

  try {
    await fetch(
      `${url}/rest/v1/registration_requests?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers, cache: 'no-store' }
    )
  } catch {
    // ignore
  }

  if (phone && role) {
    try {
      await fetch(
        `${url}/rest/v1/registration_requests?phone=eq.${encodeURIComponent(phone)}&role=eq.${encodeURIComponent(role)}`,
        { method: 'DELETE', headers, cache: 'no-store' }
      )
    } catch {
      // ignore
    }
  }

  // Also clear any soft-deleted leftovers in that table
  try {
    await fetch(
      `${url}/rest/v1/registration_requests?status=eq.DEACTIVATED`,
      { method: 'DELETE', headers, cache: 'no-store' }
    )
  } catch {
    // ignore
  }
}

/** Providers whose posted service area covers the pin — platform ACTIVE only */
export function nearbyProviders(lat: number, lng: number) {
  if (!isInUSA(lat, lng)) return []
  // No hard-coded network. Callers must use /api/providers/nearby.
  void lat
  void lng
  return []
}
