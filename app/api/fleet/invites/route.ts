import { NextResponse } from 'next/server'
import {
  createInvite,
  listInvites,
  markInviteAccepted,
} from '@/lib/fleet/store'
import {
  normalizePhone,
  upsertRegistration,
} from '@/lib/registration/store'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }
  const invites = await listInvites(companyId)
  return NextResponse.json({ invites })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body.action || 'invite')

    if (action === 'invite') {
      if (!body.companyId || !body.ownerRegistrationId || !body.inviteeName) {
        return NextResponse.json(
          { error: 'companyId, ownerRegistrationId, and name required' },
          { status: 400 }
        )
      }
      if (!body.inviteePhone) {
        return NextResponse.json(
          { error: 'Invitee phone is required for Driver login OTP' },
          { status: 400 }
        )
      }

      const phone = normalizePhone(String(body.inviteePhone))

      // Provision member as DRIVER under company — PENDING until admin activates
      const member = await upsertRegistration({
        phone,
        email: String(body.inviteeEmail || `${phone.replace(/\D/g, '')}@invite.local`),
        full_name: String(body.inviteeName),
        role: 'DRIVER',
        membership_type: 'MEMBER',
        company_id: body.companyId,
        invited_by: body.ownerRegistrationId,
        company_name: body.companyName || null,
        company_address: body.companyAddress || null,
        documents: [
          {
            id: `doc-invite-${Date.now()}`,
            category: 'Company invite',
            name: 'Invited by fleet owner',
            uploadedAt: new Date().toISOString(),
          },
        ],
        status: 'PENDING',
      })

      const invite = await createInvite({
        companyId: body.companyId,
        companyName: body.companyName || 'Fleet',
        ownerRegistrationId: body.ownerRegistrationId,
        inviteeName: String(body.inviteeName),
        inviteePhone: phone,
        inviteeEmail: body.inviteeEmail ? String(body.inviteeEmail) : null,
        memberRegistrationId: member.id,
      })

      await markInviteAccepted(invite.id, member.id)

      return NextResponse.json({
        invite: { ...invite, status: 'ACCEPTED', memberRegistrationId: member.id },
        member,
        message:
          'Driver invited. They can sign in with Driver login (phone OTP) after admin activates them.',
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invite failed' },
      { status: 500 }
    )
  }
}
