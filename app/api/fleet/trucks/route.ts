import { NextResponse } from 'next/server'
import { addTruck, listTrucks, removeTruck } from '@/lib/fleet/store'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }
  const trucks = await listTrucks(companyId)
  return NextResponse.json({ trucks })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.companyId || !body.ownerRegistrationId) {
      return NextResponse.json(
        { error: 'companyId and ownerRegistrationId required' },
        { status: 400 }
      )
    }
    if (!body.unitNumber || !body.plate || !body.truckType) {
      return NextResponse.json(
        { error: 'Unit number, plate, and truck type are required' },
        { status: 400 }
      )
    }
    const truck = await addTruck({
      companyId: body.companyId,
      ownerRegistrationId: body.ownerRegistrationId,
      unitNumber: String(body.unitNumber),
      make: String(body.make || ''),
      model: String(body.model || ''),
      year: String(body.year || ''),
      plate: String(body.plate),
      vin: String(body.vin || ''),
      truckType: String(body.truckType),
      color: body.color ? String(body.color) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    })
    return NextResponse.json({ truck })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to add truck' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const companyId = searchParams.get('companyId')
  if (!id || !companyId) {
    return NextResponse.json({ error: 'id and companyId required' }, { status: 400 })
  }
  const ok = await removeTruck(id, companyId)
  return NextResponse.json({ ok })
}
