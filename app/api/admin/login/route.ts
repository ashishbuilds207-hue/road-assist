import { NextResponse } from 'next/server'
import { verifyAdminLogin } from '@/lib/registration/adminAuth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '')
    const password = String(body.password || '')
    const result = await verifyAdminLogin(email, password)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }
    return NextResponse.json({
      ok: true,
      admin: result.admin,
      message: 'Admin login successful',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Login failed' },
      { status: 500 }
    )
  }
}
