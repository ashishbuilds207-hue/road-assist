import { NextResponse } from 'next/server'
import { upsertRegistration } from '@/lib/registration/store'
import type { UserRole } from '@/types/database'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const role = String(body.role || 'DRIVER').toUpperCase() as UserRole
    if (!body.phone || !body.full_name || !body.email) {
      return NextResponse.json(
        { error: 'Phone, full name, and email are required' },
        { status: 400 }
      )
    }
    if (!body.latitude || !body.longitude) {
      return NextResponse.json(
        { error: 'Live location pin is required' },
        { status: 400 }
      )
    }
    if (!Array.isArray(body.documents) || body.documents.length === 0) {
      return NextResponse.json(
        { error: 'At least one document is required' },
        { status: 400 }
      )
    }

    const record = await upsertRegistration({
      phone: body.phone,
      email: body.email,
      full_name: body.full_name,
      role,
      membership_type: body.membership_type || 'OWNER',
      company_id: body.company_id,
      invited_by: body.invited_by,
      company_name: body.company_name,
      company_address: body.company_address,
      usdot: body.usdot,
      mc_number: body.mc_number,
      business_name: body.business_name,
      photo_url: body.photo_url,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      formatted_address: body.formatted_address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      documents: body.documents,
      status: 'PENDING_APPROVAL',
    })

    return NextResponse.json({
      registration: record,
      message:
        'Registration submitted. Your account is inactive until an admin activates it.',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Registration failed' },
      { status: 500 }
    )
  }
}
