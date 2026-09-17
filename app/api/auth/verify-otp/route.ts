import { NextResponse } from 'next/server'
import { verifyOtp, getRegistrationByPhone } from '@/lib/registration/store'
import type { UserRole } from '@/types/database'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const phone = String(body.phone || '')
    const code = String(body.code || '')
    const role = body.role
      ? (String(body.role).toUpperCase() as UserRole)
      : undefined

    const result = await verifyOtp(phone, code)
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Invalid OTP. Use the code from the platform database.' },
        { status: 401 }
      )
    }

    const existing = await getRegistrationByPhone(result.phone, role)
    return NextResponse.json({
      verified: true,
      phone: result.phone,
      registration: existing,
      next:
        existing?.status === 'ACTIVE'
          ? 'login'
          : existing
            ? 'pending'
            : 'register',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Verify failed' },
      { status: 500 }
    )
  }
}
