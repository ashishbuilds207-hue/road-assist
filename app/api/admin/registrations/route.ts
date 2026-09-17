import { NextResponse } from 'next/server'
import {
  deleteRegistration,
  listRegistrations,
  setRegistrationStatus,
  type RegistrationRecord,
} from '@/lib/registration/store'
import type { UserRole } from '@/types/database'

async function fetchFromSupabase(role?: string, status?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return [] as RegistrationRecord[]

  try {
    const params = new URLSearchParams()
    params.set('select', '*')
    params.set('order', 'created_at.desc')
    if (role) params.set('role', `eq.${role}`)
    if (status) params.set('status', `eq.${status}`)

    const res = await fetch(
      `${url}/rest/v1/registration_requests?${params.toString()}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    const rows = (await res.json()) as RegistrationRecord[]
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const role = searchParams.get('role')?.toUpperCase() as UserRole | undefined

  const statusFilter =
    status === 'PENDING' || status === 'PENDING_APPROVAL'
      ? 'PENDING_APPROVAL'
      : (status as
          | 'PENDING_APPROVAL'
          | 'ACTIVE'
          | 'REJECTED'
          | 'SUSPENDED'
          | 'DEACTIVATED'
          | 'REQUIRES_REVIEW'
          | undefined)

  const local = await listRegistrations(statusFilter || undefined)
  const remoteStatus =
    status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : status || undefined
  const remote = await fetchFromSupabase(role, remoteStatus)

  const map = new Map<string, RegistrationRecord>()
  for (const item of [...remote, ...local]) {
    const key = item.id || `${item.phone}-${item.role}`
    const prev = map.get(key)
    if (!prev) {
      map.set(key, item)
      continue
    }
    const prevTime = new Date(prev.updated_at || prev.created_at).getTime()
    const nextTime = new Date(item.updated_at || item.created_at).getTime()
    if (nextTime >= prevTime) map.set(key, item)
  }

  let items = Array.from(map.values())
  if (role) items = items.filter((i) => i.role === role)
  if (statusFilter === 'PENDING_APPROVAL') {
    items = items.filter(
      (i) => i.status === 'PENDING_APPROVAL' || i.status === 'PENDING'
    )
  } else if (statusFilter) {
    items = items.filter((i) => i.status === statusFilter)
  }

  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return NextResponse.json({
    items,
    source: remote.length ? 'supabase+local' : 'local',
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const id = String(body.id || '')
    const action = String(body.action || 'activate')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    if (action === 'delete') {
      const removed = await deleteRegistration(id)
      if (!removed) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({
        deleted: true,
        registration: removed,
      })
    }

    const nextStatus =
      action === 'reject'
        ? 'REJECTED'
        : action === 'suspend' || action === 'block'
          ? 'SUSPENDED'
          : action === 'request_info'
            ? 'REQUIRES_REVIEW'
            : action === 'deactivate'
              ? 'DEACTIVATED'
              : 'ACTIVE'
    const updated = await setRegistrationStatus(
      id,
      nextStatus as
        | 'ACTIVE'
        | 'REJECTED'
        | 'SUSPENDED'
        | 'REQUIRES_REVIEW'
        | 'DEACTIVATED'
        | 'PENDING_APPROVAL',
      body.reason || body.note
    )
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ registration: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 }
    )
  }
}
