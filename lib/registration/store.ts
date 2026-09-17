import { promises as fs } from 'fs'
import path from 'path'
import type { UserRole } from '@/types/database'
import { isInUSA } from '@/lib/location/usa'
import { getDataDir } from '@/lib/data-dir'

const DATA_DIR = getDataDir()
const OTP_FILE = path.join(DATA_DIR, 'otp.json')
const REG_FILE = path.join(DATA_DIR, 'registrations.json')

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

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(file: string, data: unknown) {
  await ensureDir()
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8')
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

export async function getFixedOtpCode(): Promise<string> {
  const otp = await readJson<OtpFile>(OTP_FILE, {
    fixedCode: process.env.NEXT_PUBLIC_PLATFORM_OTP || process.env.NEXT_PUBLIC_DEMO_OTP || '123456',
    requests: [],
  })
  if (!otp.fixedCode) {
    otp.fixedCode = '123456'
    await writeJson(OTP_FILE, otp)
  }
  return otp.fixedCode
}

export async function requestOtp(phone: string, role: UserRole) {
  const normalized = normalizePhone(phone)
  const code = await getFixedOtpCode()
  const otp = await readJson<OtpFile>(OTP_FILE, { fixedCode: code, requests: [] })
  otp.fixedCode = code
  otp.requests.unshift({
    phone: normalized,
    role,
    code,
    createdAt: new Date().toISOString(),
  })
  otp.requests = otp.requests.slice(0, 200)
  await writeJson(OTP_FILE, otp)
  return { phone: normalized, code, autofill: code }
}

export async function verifyOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone)
  const expected = await getFixedOtpCode()
  const ok = code.trim() === expected
  return { ok, phone: normalized, code: expected }
}

export async function listRegistrations(status?: RegistrationStatus) {
  const file = await readJson<RegFile>(REG_FILE, { items: [] })
  if (!status) return file.items
  if (status === 'PENDING_APPROVAL' || status === 'PENDING') {
    return file.items.filter(
      (i) =>
        i.status === 'PENDING_APPROVAL' ||
        i.status === 'PENDING' ||
        !i.status
    )
  }
  return file.items.filter((i) => i.status === status)
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
  const file = await readJson<RegFile>(REG_FILE, { items: [] })
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
    await writeJson(REG_FILE, file)
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
  await writeJson(REG_FILE, file)
  return created
}

export async function setRegistrationStatus(
  id: string,
  status: RegistrationStatus,
  reason?: string
) {
  const file = await readJson<RegFile>(REG_FILE, { items: [] })
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
  await writeJson(REG_FILE, file)
  return file.items[idx]
}

export async function deleteRegistration(id: string) {
  const file = await readJson<RegFile>(REG_FILE, { items: [] })
  const idx = file.items.findIndex((i) => i.id === id)
  if (idx < 0) return null
  const [removed] = file.items.splice(idx, 1)
  await writeJson(REG_FILE, file)
  return removed
}

/** Providers whose posted service area covers the pin — platform ACTIVE only */
export function nearbyProviders(lat: number, lng: number) {
  if (!isInUSA(lat, lng)) return []
  // No hard-coded network. Callers must use /api/providers/nearby.
  void lat
  void lng
  return []
}
