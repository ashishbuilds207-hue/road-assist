import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '.data')
const FLEET_FILE = path.join(DATA_DIR, 'fleet.json')

export type FleetTruck = {
  id: string
  companyId: string
  ownerRegistrationId: string
  unitNumber: string
  make: string
  model: string
  year: string
  plate: string
  vin: string
  truckType: string
  color?: string
  notes?: string
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at: string
}

export type FleetInvite = {
  id: string
  companyId: string
  companyName: string
  ownerRegistrationId: string
  inviteeName: string
  inviteePhone?: string | null
  inviteeEmail?: string | null
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED'
  created_at: string
  updated_at: string
  /** Registration id created when invitee signs up / is provisioned */
  memberRegistrationId?: string | null
}

type FleetFile = {
  trucks: FleetTruck[]
  invites: FleetInvite[]
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readFleet(): Promise<FleetFile> {
  try {
    const raw = await fs.readFile(FLEET_FILE, 'utf8')
    return JSON.parse(raw) as FleetFile
  } catch {
    return { trucks: [], invites: [] }
  }
}

async function writeFleet(data: FleetFile) {
  await ensureDir()
  await fs.writeFile(FLEET_FILE, JSON.stringify(data, null, 2), 'utf8')
}

export async function listTrucks(companyId: string) {
  const file = await readFleet()
  return file.trucks
    .filter((t) => t.companyId === companyId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function addTruck(
  input: Omit<FleetTruck, 'id' | 'created_at' | 'updated_at' | 'status'> & {
    status?: FleetTruck['status']
  }
) {
  const file = await readFleet()
  const now = new Date().toISOString()
  const truck: FleetTruck = {
    id: `trk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    companyId: input.companyId,
    ownerRegistrationId: input.ownerRegistrationId,
    unitNumber: input.unitNumber,
    make: input.make,
    model: input.model,
    year: input.year,
    plate: input.plate,
    vin: input.vin,
    truckType: input.truckType,
    color: input.color,
    notes: input.notes,
    status: input.status ?? 'ACTIVE',
    created_at: now,
    updated_at: now,
  }
  file.trucks.unshift(truck)
  await writeFleet(file)
  return truck
}

export async function removeTruck(id: string, companyId: string) {
  const file = await readFleet()
  const before = file.trucks.length
  file.trucks = file.trucks.filter(
    (t) => !(t.id === id && t.companyId === companyId)
  )
  await writeFleet(file)
  return before !== file.trucks.length
}

export async function listInvites(companyId: string) {
  const file = await readFleet()
  return file.invites
    .filter((i) => i.companyId === companyId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function createInvite(
  input: Omit<FleetInvite, 'id' | 'created_at' | 'updated_at' | 'status'> & {
    status?: FleetInvite['status']
  }
) {
  const file = await readFleet()
  const now = new Date().toISOString()
  const invite: FleetInvite = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    companyId: input.companyId,
    companyName: input.companyName,
    ownerRegistrationId: input.ownerRegistrationId,
    inviteeName: input.inviteeName,
    inviteePhone: input.inviteePhone ?? null,
    inviteeEmail: input.inviteeEmail ?? null,
    status: input.status ?? 'PENDING',
    memberRegistrationId: input.memberRegistrationId ?? null,
    created_at: now,
    updated_at: now,
  }
  file.invites.unshift(invite)
  await writeFleet(file)
  return invite
}

export async function findInviteByContact(phone?: string | null, email?: string | null) {
  const file = await readFleet()
  const p = phone?.replace(/\D/g, '')
  const e = email?.toLowerCase().trim()
  return (
    file.invites.find((i) => {
      if (i.status !== 'PENDING') return false
      if (p && i.inviteePhone?.replace(/\D/g, '').endsWith(p.slice(-10))) return true
      if (e && i.inviteeEmail?.toLowerCase() === e) return true
      return false
    }) ?? null
  )
}

export async function markInviteAccepted(id: string, memberRegistrationId: string) {
  const file = await readFleet()
  const idx = file.invites.findIndex((i) => i.id === id)
  if (idx < 0) return null
  const now = new Date().toISOString()
  file.invites[idx] = {
    ...file.invites[idx],
    status: 'ACCEPTED',
    memberRegistrationId,
    updated_at: now,
  }
  await writeFleet(file)
  return file.invites[idx]
}
