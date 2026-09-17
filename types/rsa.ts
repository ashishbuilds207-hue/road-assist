import type {
  CasePriority,
  CaseStatus,
  ServiceCategorySlug,
  TruckType,
  UserRole,
} from '@/types/database'

export const TRUCK_TYPES: { value: TruckType; label: string }[] = [
  { value: 'SEMI_TRUCK', label: 'Semi Truck' },
  { value: 'TRACTOR', label: 'Tractor' },
  { value: 'HEAVY_TRUCK', label: 'Heavy Truck' },
  { value: 'COMMERCIAL_TRUCK', label: 'Commercial Truck' },
  { value: 'BOX_TRUCK', label: 'Box Truck' },
  { value: 'PICKUP_TRUCK_COMMERCIAL', label: 'Commercial Pickup' },
  { value: 'TRACTOR_TRAILER', label: 'Tractor-Trailer' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'REEFER_TRAILER', label: 'Reefer Trailer' },
  { value: 'FLATBED_TRAILER', label: 'Flatbed Trailer' },
  { value: 'DRY_VAN', label: 'Dry Van' },
  { value: 'HEAVY_COMMERCIAL', label: 'Heavy Commercial' },
]

function statusLabel(status: CaseStatus): string {
  return status
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

export const CASE_STATUSES: { value: CaseStatus; label: string }[] = (
  [
    'DRAFT',
    'CREATED',
    'SEARCHING_PROVIDER',
    'PROVIDER_REQUESTED',
    'ASSIGNED',
    'PROVIDER_ACCEPTED',
    'PROVIDER_REJECTED',
    'TECHNICIAN_ASSIGNED',
    'EN_ROUTE',
    'ARRIVED',
    'INSPECTION',
    'ESTIMATE_SUBMITTED',
    'WAITING_APPROVAL',
    'APPROVED',
    'REPAIR_STARTED',
    'WAITING_PARTS',
    'REPAIR_COMPLETED',
    'INVOICE_SUBMITTED',
    'INVOICE_REVIEW',
    'INVOICE_APPROVED',
    'INVOICE_REJECTED',
    'DISPUTED',
    'PAYMENT_PENDING',
    'PAID',
    'CLOSED',
    'CANCELLED',
    'OUT_OF_NETWORK',
  ] as CaseStatus[]
).map((value) => ({ value, label: statusLabel(value) }))

export const PRIORITIES: { value: CasePriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'EMERGENCY', label: 'Emergency' },
]

/** 18 seeded truck categories — slugs match SQL service_categories */
export const SERVICE_CATEGORIES: {
  value: ServiceCategorySlug
  label: string
  icon?: string
  isEmergency?: boolean
}[] = [
  { value: 'engine-failure', label: 'Engine Failure', icon: '🔧', isEmergency: true },
  { value: 'truck-wont-start', label: "Truck Won't Start", icon: '🚫', isEmergency: true },
  { value: 'flat-tire', label: 'Flat Tire', icon: '🛞' },
  { value: 'tire-blowout', label: 'Tire Blowout', icon: '💥', isEmergency: true },
  { value: 'multiple-tire-failure', label: 'Multiple Tire Failure', icon: '⚠️', isEmergency: true },
  { value: 'battery-dead', label: 'Battery Dead', icon: '🔋' },
  { value: 'brake-problem', label: 'Brake Problem', icon: '🛑', isEmergency: true },
  { value: 'overheating', label: 'Overheating', icon: '🌡️', isEmergency: true },
  { value: 'transmission-problem', label: 'Transmission Problem', icon: '⚙️', isEmergency: true },
  { value: 'electrical-problem', label: 'Electrical Problem', icon: '⚡' },
  { value: 'fuel-delivery', label: 'Fuel Delivery', icon: '⛽' },
  { value: 'out-of-fuel', label: 'Out of Fuel', icon: '🛢️' },
  { value: 'trailer-problem', label: 'Trailer Problem', icon: '🚛' },
  { value: 'reefer-problem', label: 'Reefer Problem', icon: '❄️', isEmergency: true },
  { value: 'accident-damage', label: 'Accident / Damage', icon: '🚑', isEmergency: true },
  { value: 'tow-required', label: 'Tow Required', icon: '🪝', isEmergency: true },
  { value: 'lockout', label: 'Lockout', icon: '🔑' },
  { value: 'other-truck-breakdown', label: 'Other Truck Breakdown', icon: '🛠️' },
]

export const STATUS_COLORS: Record<CaseStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  CREATED: 'bg-blue-100 text-blue-700',
  SEARCHING_PROVIDER: 'bg-indigo-100 text-indigo-700',
  PROVIDER_REQUESTED: 'bg-violet-100 text-violet-700',
  ASSIGNED: 'bg-purple-100 text-purple-700',
  PROVIDER_ACCEPTED: 'bg-cyan-100 text-cyan-700',
  PROVIDER_REJECTED: 'bg-rose-100 text-rose-700',
  TECHNICIAN_ASSIGNED: 'bg-sky-100 text-sky-700',
  EN_ROUTE: 'bg-amber-100 text-amber-800',
  ARRIVED: 'bg-orange-100 text-orange-800',
  INSPECTION: 'bg-yellow-100 text-yellow-800',
  ESTIMATE_SUBMITTED: 'bg-lime-100 text-lime-800',
  WAITING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REPAIR_STARTED: 'bg-teal-100 text-teal-700',
  WAITING_PARTS: 'bg-orange-100 text-orange-700',
  REPAIR_COMPLETED: 'bg-green-100 text-green-700',
  INVOICE_SUBMITTED: 'bg-blue-100 text-blue-800',
  INVOICE_REVIEW: 'bg-indigo-100 text-indigo-800',
  INVOICE_APPROVED: 'bg-emerald-100 text-emerald-800',
  INVOICE_REJECTED: 'bg-rose-100 text-rose-800',
  DISPUTED: 'bg-red-100 text-red-700',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-zinc-100 text-zinc-600',
  CANCELLED: 'bg-zinc-200 text-zinc-700',
  OUT_OF_NETWORK: 'bg-fuchsia-100 text-fuchsia-700',
}

export interface DemoAccount {
  phone: string
  role: UserRole
  label: string
  redirect: string
  email: string
  fullName: string
  companyId?: string
  providerId?: string
  driverId?: string
  technicianId?: string
}

/** DEMO accounts — clearly labeled for demo OTP login */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    phone: '+15551110001',
    role: 'DRIVER',
    label: 'DEMO Driver',
    redirect: '/driver',
    email: 'demo.driver@rsa.demo',
    fullName: 'Demo Driver',
    companyId: 'demo-co-lonestar',
    driverId: 'demo-driver-1',
  },
  {
    phone: '+15552220001',
    role: 'COMPANY',
    label: 'DEMO Company',
    redirect: '/company',
    email: 'demo.company@rsa.demo',
    fullName: 'Demo Fleet Manager',
    companyId: 'demo-co-lonestar',
  },
  {
    phone: '+15553330001',
    role: 'SERVICE_PROVIDER',
    label: 'DEMO Provider',
    redirect: '/provider',
    email: 'demo.provider@rsa.demo',
    fullName: 'Demo Provider Admin',
    providerId: 'demo-prov-highway',
  },
  {
    phone: '+15554440001',
    role: 'TECHNICIAN',
    label: 'DEMO Technician',
    redirect: '/technician',
    email: 'demo.technician@rsa.demo',
    fullName: 'Demo Technician',
    providerId: 'demo-prov-highway',
    technicianId: 'demo-tech-1',
  },
  {
    phone: '+15555550001',
    role: 'ADMIN',
    label: 'DEMO Admin',
    redirect: '/admin/dashboard',
    email: 'demo.admin@rsa.demo',
    fullName: 'Demo Platform Admin',
  },
]

export const DEMO_SESSION_COOKIE = 'rsa_demo_session'
export const DEMO_SESSION_STORAGE_KEY = 'rsa_demo_session'
export const DEMO_PENDING_OTP_KEY = 'rsa_demo_pending_otp'

export function findDemoAccountByPhone(phone: string): DemoAccount | undefined {
  const normalized = phone.replace(/\D/g, '')
  return DEMO_ACCOUNTS.find(
    (a) => a.phone.replace(/\D/g, '') === normalized || a.phone === phone
  )
}

export function getCategoryLabel(slug: ServiceCategorySlug | null | undefined): string {
  if (!slug) return 'Unknown'
  return SERVICE_CATEGORIES.find((c) => c.value === slug)?.label ?? slug
}

export function getStatusLabel(status: CaseStatus): string {
  return CASE_STATUSES.find((s) => s.value === status)?.label ?? status
}

export function getPriorityLabel(priority: CasePriority): string {
  return PRIORITIES.find((p) => p.value === priority)?.label ?? priority
}

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case 'DRIVER':
      return '/driver'
    case 'COMPANY':
      return '/company'
    case 'SERVICE_PROVIDER':
      return '/provider'
    case 'TECHNICIAN':
      return '/provider'
    case 'ADMIN':
      return '/admin/dashboard'
    default:
      return '/'
  }
}
