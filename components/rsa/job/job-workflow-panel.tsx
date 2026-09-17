'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  MapPin,
  Wrench,
  Receipt,
  Plus,
  Trash2,
  ImagePlus,
  CreditCard,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { CaseService } from '@/services/CaseService'
import type {
  BillLineItem,
  BillPhoto,
  JobBill,
  JobPhase,
} from '@/lib/dispatch/service-requests'
import { cn } from '@/lib/utils'

const PHASES: { key: JobPhase; label: string }[] = [
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'ARRIVED', label: 'Arrived' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'BILL_SUBMITTED', label: 'Bill sent' },
  { key: 'PAID', label: 'Paid' },
]

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function phaseIndex(phase?: JobPhase | null) {
  const i = PHASES.findIndex((p) => p.key === phase)
  return i < 0 ? 0 : i
}

export function JobWorkflowPanel({
  requestId,
  caseId,
  jobPhase,
  caseStatus,
  bill,
  role,
  onUpdated,
}: {
  requestId: string
  caseId: string
  jobPhase?: JobPhase | null
  caseStatus?: string | null
  bill?: JobBill | null
  role: 'provider' | 'driver' | 'admin'
  onUpdated?: () => void
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<BillLineItem[]>(bill?.items ?? [])
  const [photos, setPhotos] = useState<BillPhoto[]>(bill?.photos ?? [])
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState(bill?.notes ?? '')

  useEffect(() => {
    setItems(bill?.items ?? [])
    setPhotos(bill?.photos ?? [])
    setNotes(bill?.notes ?? '')
  }, [bill?.invoiceId, bill?.status, bill?.items?.length, bill?.photos?.length])

  const phase = (jobPhase || 'ACCEPTED') as JobPhase
  const idx = phaseIndex(phase)
  const canEditBill =
    (role === 'provider' || role === 'driver') &&
    (phase === 'COMPLETED' || phase === 'BILL_SUBMITTED') &&
    bill?.status !== 'PAID'
  const locked = bill?.status === 'SUBMITTED' || bill?.status === 'PAID'

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.totalCents, 0)
    const tax = Math.round(subtotal * 0.08)
    return { subtotal, tax, total: subtotal + tax }
  }, [items])

  const patch = async (
    action: string,
    extra?: Record<string, unknown>
  ) => {
    setBusy(true)
    const res = await fetch('/api/dispatch/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId, action, ...extra }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      toast({ title: 'Failed', description: data.error })
      return null
    }
    onUpdated?.()
    return data.request
  }

  const syncCase = async (status: string, note: string) => {
    try {
      await CaseService.updateStatus(caseId, status as never, { note })
    } catch {
      // demo / missing table soft-fail
    }
  }

  const onArrive = async () => {
    const row = await patch('arrive')
    if (!row) return
    await syncCase('ARRIVED', 'Service team arrived on location')
    toast({
      title: 'Arrived',
      description: 'Driver can see you arrived at the location.',
    })
  }

  const onComplete = async () => {
    const row = await patch('complete')
    if (!row) return
    await syncCase('REPAIR_COMPLETED', 'Service completed on site')
    toast({
      title: 'Service completed',
      description: 'Add bill items and photos, then submit for payment.',
    })
  }

  const addItem = () => {
    const d = desc.trim()
    const q = Math.max(1, parseInt(qty, 10) || 1)
    const unit = Math.max(0, Math.round(parseFloat(price || '0') * 100))
    if (!d || unit <= 0) {
      toast({ title: 'Add item', description: 'Enter description and price.' })
      return
    }
    setItems((prev) => [
      ...prev,
      {
        id: `li-${Date.now()}`,
        description: d,
        quantity: q,
        unitPriceCents: unit,
        totalCents: q * unit,
        addedBy: role === 'driver' ? 'driver' : 'provider',
      },
    ])
    setDesc('')
    setQty('1')
    setPrice('')
  }

  const onPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    const next = [...photos]
    for (const file of Array.from(files).slice(0, 6 - next.length)) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      next.push({
        id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: file.name,
        category: 'service',
        dataUrl,
        addedBy: role === 'driver' ? 'driver' : 'provider',
      })
    }
    setPhotos(next.slice(0, 6))
  }

  const saveDraft = async () => {
    await patch('saveBillDraft', {
      items,
      photos,
      notes,
      submittedBy: role,
    })
    toast({ title: 'Bill saved', description: 'Draft updated for both sides.' })
  }

  const submitBill = async () => {
    if (items.length === 0) {
      toast({ title: 'Add line items', description: 'Bill needs at least one item.' })
      return
    }
    const row = await patch('submitBill', {
      items,
      photos,
      notes,
      submittedBy: role,
    })
    if (!row) return
    await syncCase('INVOICE_REVIEW', 'Invoice submitted for admin payment')
    toast({
      title: 'Bill submitted',
      description: 'Admin can review and pay this invoice.',
    })
  }

  const payBill = async () => {
    const row = await patch('payBill')
    if (!row) return
    await syncCase('PAID', 'Admin paid invoice')
    toast({ title: 'Payment complete', description: 'Case marked as paid.' })
  }

  return (
    <Card className="space-y-4 border-gray-300 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-gilroy text-base font-bold text-black">
            Job progress
          </h3>
          <p className="text-xs text-gray">
            {caseStatus || phase} · live for driver, provider & admin
          </p>
        </div>
        <Badge
          variant={phase === 'PAID' ? 'success' : 'pending'}
          size="small"
        >
          {PHASES[idx]?.label || phase}
        </Badge>
      </div>

      <div className="flex gap-1">
        {PHASES.map((p, i) => (
          <div key={p.key} className="flex-1 space-y-1">
            <div
              className={cn(
                'h-1.5 rounded-full',
                i <= idx ? 'bg-primary' : 'bg-gray-300'
              )}
            />
            <p
              className={cn(
                'truncate text-[10px] font-medium',
                i <= idx ? 'text-primary' : 'text-gray-600'
              )}
            >
              {p.label}
            </p>
          </div>
        ))}
      </div>

      {phase === 'ACCEPTED' && role === 'provider' && (
        <div className="rounded-lg border border-primary/20 bg-light-theme px-4 py-3">
          <p className="text-sm font-semibold text-black">
            On the way / at site?
          </p>
          <p className="mb-3 text-xs text-gray">
            Tap Arrived so the driver sees your team is on location.
          </p>
          <Button
            type="button"
            variant="default"
            disabled={busy}
            onClick={() => void onArrive()}
          >
            <MapPin className="size-4" />
            Arrived on location
          </Button>
        </div>
      )}

      {phase === 'ARRIVED' && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <MapPin className="size-4" />
            Service team arrived on location
          </p>
          {role === 'provider' && (
            <Button
              type="button"
              variant="default"
              className="mt-3"
              disabled={busy}
              onClick={() => void onComplete()}
            >
              <Wrench className="size-4" />
              Service completed
            </Button>
          )}
          {role === 'driver' && (
            <p className="mt-1 text-xs text-gray">
              Waiting for the provider to finish service…
            </p>
          )}
        </div>
      )}

      {(phase === 'COMPLETED' ||
        phase === 'BILL_SUBMITTED' ||
        phase === 'PAID') && (
        <div className="space-y-3 rounded-lg border border-gray-300 bg-gray-100 p-3">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <p className="font-semibold text-black">
              Bill {bill?.invoiceNumber ? `· ${bill.invoiceNumber}` : ''}
            </p>
          </div>

          {canEditBill && !locked && (
            <div className="grid gap-2 sm:grid-cols-[1fr_70px_90px_auto]">
              <Input
                variant="input-form"
                placeholder="Item / part / labor"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <Input
                variant="input-form"
                placeholder="Qty"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <Input
                variant="input-form"
                placeholder="Price $"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Button type="button" variant="outline-general" onClick={addItem}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-xs text-gray">No line items yet.</p>
            ) : (
              items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-black">{it.description}</p>
                    <p className="text-[11px] text-gray">
                      {it.quantity} × {money(it.unitPriceCents)} · by {it.addedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-black">
                      {money(it.totalCents)}
                    </span>
                    {canEditBill && !locked && (
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() =>
                          setItems((prev) => prev.filter((x) => x.id !== it.id))
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-black">Photos (parts / work)</p>
            {canEditBill && !locked && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-medium text-primary">
                <ImagePlus className="size-4" />
                Add photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void onPhotos(e.target.files)}
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.dataUrl}
                    alt={p.name}
                    className="size-16 rounded-md border border-gray-300 object-cover"
                  />
                  {canEditBill && !locked && (
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 rounded-full bg-danger p-0.5 text-white"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((x) => x.id !== p.id))
                      }
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-white px-3 py-2 text-sm">
            <div className="flex justify-between text-gray">
              <span>Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray">
              <span>Tax (8%)</span>
              <span>{money(totals.tax)}</span>
            </div>
            <div className="mt-1 flex justify-between font-bold text-black">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>

          {canEditBill && !locked && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline-general"
                disabled={busy}
                onClick={() => void saveDraft()}
              >
                Save draft
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={busy}
                onClick={() => void submitBill()}
              >
                <CheckCircle2 className="size-4" />
                Submit bill to admin
              </Button>
            </div>
          )}

          {phase === 'BILL_SUBMITTED' && role !== 'admin' && (
            <p className="text-xs font-medium text-primary">
              Bill sent to admin for payment review.
            </p>
          )}

          {role === 'admin' && phase === 'BILL_SUBMITTED' && (
            <Button
              type="button"
              variant="default"
              disabled={busy}
              onClick={() => void payBill()}
            >
              <CreditCard className="size-4" />
              Pay bill {money(bill?.totalCents || totals.total)}
            </Button>
          )}

          {phase === 'PAID' && (
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" />
              Paid
              {bill?.paidAt
                ? ` · ${new Date(bill.paidAt).toLocaleString()}`
                : ''}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
