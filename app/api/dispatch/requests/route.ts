import { NextResponse } from 'next/server'
import {
  createServiceRequest,
  listBillsForAdmin,
  listServiceRequests,
  respondServiceRequest,
  secondsLeft,
  updateJobWorkflow,
} from '@/lib/dispatch/service-requests'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId') || undefined
  const caseId = searchParams.get('caseId') || undefined
  const driverId = searchParams.get('driverId') || undefined
  const driverUserId = searchParams.get('driverUserId') || undefined
  const status = searchParams.get('status') || undefined
  const bills = searchParams.get('bills') === '1'

  if (bills) {
    const items = await listBillsForAdmin()
    return json({
      requests: items.map((r) => ({
        ...r,
        secondsLeft: 0,
      })),
    })
  }

  const items = await listServiceRequests({
    providerId,
    caseId,
    driverId,
    driverUserId,
    status: status
      ? (status.split(',') as (
          | 'PENDING'
          | 'ACCEPTED'
          | 'REJECTED'
          | 'EXPIRED'
          | 'CANCELLED'
        )[])
      : undefined,
  })
  return json({
    requests: items.map((r) => ({
      ...r,
      secondsLeft: r.status === 'PENDING' ? secondsLeft(r.expiresAt) : 0,
    })),
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.caseId || !body.providerId || !body.providerName) {
      return json(
        { error: 'caseId, providerId, providerName required' },
        400
      )
    }

    const row = await createServiceRequest({
      caseId: body.caseId,
      caseNumber: body.caseNumber,
      category: body.category,
      description: body.description,
      locationLabel: body.locationLabel,
      lat: body.lat,
      lng: body.lng,
      driverId: body.driverId,
      driverName: body.driverName,
      driverPhone: body.driverPhone,
      driverUserId: body.driverUserId,
      companyId: body.companyId,
      providerId: body.providerId,
      providerName: body.providerName,
      providerPhone: body.providerPhone,
      providerUserId: body.providerUserId,
    })

    return json({
      request: {
        ...row,
        secondsLeft: secondsLeft(row.expiresAt),
      },
    })
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Failed' },
      500
    )
  }
}

const WORKFLOW = [
  'arrive',
  'complete',
  'submitBill',
  'payBill',
  'saveBillDraft',
] as const

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const id = String(body.id || '')
    const action = String(body.action || '')
    if (!id || !action) {
      return json({ error: 'id and action required' }, 400)
    }

    if (['accept', 'reject', 'cancel'].includes(action)) {
      const row = await respondServiceRequest(
        id,
        action as 'accept' | 'reject' | 'cancel',
        body.reason
      )
      if (!row) {
        return json({ error: 'Not found' }, 404)
      }
      return json({
        request: {
          ...row,
          secondsLeft: row.status === 'PENDING' ? secondsLeft(row.expiresAt) : 0,
        },
      })
    }

    if ((WORKFLOW as readonly string[]).includes(action)) {
      const row = await updateJobWorkflow(
        id,
        action as (typeof WORKFLOW)[number],
        {
          items: body.items,
          photos: body.photos,
          notes: body.notes,
          submittedBy: body.submittedBy,
        }
      )
      if (!row) {
        return json({ error: 'Not found' }, 404)
      }
      return json({
        request: { ...row, secondsLeft: 0 },
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Failed' },
      500
    )
  }
}
