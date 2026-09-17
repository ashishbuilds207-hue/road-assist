import { NextResponse } from 'next/server'
import {
  getRegistrationById,
  getRegistrationByPhone,
} from '@/lib/registration/store'
import type { UserRole } from '@/types/database'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const phone = searchParams.get('phone')
  const role = searchParams.get('role')?.toUpperCase() as UserRole | undefined

  if (id) {
    const reg = await getRegistrationById(id)
    if (!reg) {
      return NextResponse.json(
        { error: 'Not found', deleted: true },
        { status: 404 }
      )
    }
    return NextResponse.json({ registration: reg })
  }
  if (phone) {
    const reg = await getRegistrationByPhone(phone, role)
    if (!reg) {
      return NextResponse.json(
        { error: 'Not found', deleted: true },
        { status: 404 }
      )
    }
    return NextResponse.json({ registration: reg })
  }
  return NextResponse.json({ error: 'id or phone required' }, { status: 400 })
}
