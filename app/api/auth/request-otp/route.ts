import { NextResponse } from 'next/server'
import { requestOtp } from '@/lib/registration/store'
import type { UserRole } from '@/types/database'

const ROLES: UserRole[] = ['DRIVER', 'COMPANY', 'SERVICE_PROVIDER', 'ADMIN']

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const phone = String(body.phone || '')
    const role = String(body.role || 'DRIVER').toUpperCase() as UserRole
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Valid US phone required' }, { status: 400 })
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const result = await requestOtp(phone, role)
    // Autofill OTP from database/fixed platform code — SMS is not sent
    return NextResponse.json({
      phone: result.phone,
      autofillOtp: result.autofill,
      message: 'OTP loaded from platform database. Enter the code to continue.',
      smsSent: false,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'OTP request failed' },
      { status: 500 }
    )
  }
}
