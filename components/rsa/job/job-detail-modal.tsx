'use client'

import {
  Clock,
  MapPin,
  Wrench,
  Receipt,
  CreditCard,
  Phone,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { JobBill, JobPhase } from '@/lib/dispatch/service-requests'
import { cn } from '@/lib/utils'

export type JobDetailRecord = {
  id: string
  caseId: string
  caseNumber?: string
  category?: string
  description?: string
  locationLabel?: string
  driverName?: string | null
  driverPhone?: string | null
  providerName?: string
  providerPhone?: string | null
  status?: string
  jobPhase?: JobPhase | string | null
  caseStatus?: string | null
  arrivedAt?: string | null
  completedAt?: string | null
  requestedAt?: string
  respondedAt?: string | null
  created_at?: string
  updated_at?: string
  bill?: JobBill | null
}

const PHASES: { key: string; label: string }[] = [
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'ARRIVED', label: 'Arrived' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'BILL_SUBMITTED', label: 'Bill sent' },
  { key: 'PAID', label: 'Paid' },
]

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function phaseIndex(phase?: string | null) {
  const i = PHASES.findIndex((p) => p.key === phase)
  return i < 0 ? 0 : i
}

export function JobDetailModal({
  open,
  onOpenChange,
  job,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: JobDetailRecord | null
}) {
  if (!job) return null

  const bill = job.bill
  const idx = phaseIndex(job.jobPhase || job.caseStatus)

  const timeline = [
    {
      label: 'Request sent',
      at: job.requestedAt || job.created_at,
      icon: Clock,
    },
    {
      label: 'Provider accepted',
      at: job.respondedAt,
      icon: CheckCircle2,
    },
    {
      label: 'Arrived on location',
      at: job.arrivedAt,
      icon: MapPin,
    },
    {
      label: 'Service completed',
      at: job.completedAt,
      icon: Wrench,
    },
    {
      label: 'Bill submitted',
      at: bill?.submittedAt,
      icon: Receipt,
    },
    {
      label: 'Payment completed',
      at: bill?.paidAt,
      icon: CreditCard,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="space-y-1 border-b border-gray-300 px-5 py-4 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <DialogTitle className="font-gilroy text-lg font-bold text-black">
              {bill?.invoiceNumber || job.caseNumber || job.caseId}
            </DialogTitle>
            <Badge
              variant={job.jobPhase === 'PAID' ? 'success' : 'pending'}
              size="small"
            >
              {job.jobPhase === 'PAID'
                ? 'PAID · SOLVED'
                : job.caseStatus || job.jobPhase || job.status || 'OPEN'}
            </Badge>
          </div>
          <DialogDescription className="text-sm text-gray">
            Full job timeline, bill items, and photos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                Case
              </p>
              <p className="font-semibold text-black">
                {job.caseNumber || job.caseId}
              </p>
              <p className="text-xs text-gray">
                {job.category || 'Truck RSA'}
                {job.description ? ` · ${job.description}` : ''}
              </p>
            </div>
            <div className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                Location
              </p>
              <p className="flex items-start gap-1.5 font-semibold text-black">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {job.locationLabel || 'USA'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-300 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                Driver
              </p>
              <p className="font-semibold text-black">
                {job.driverName || 'Driver'}
              </p>
              {job.driverPhone ? (
                <a
                  href={`tel:${job.driverPhone}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                >
                  <Phone className="size-3" />
                  {job.driverPhone}
                </a>
              ) : null}
            </div>
            <div className="rounded-lg border border-gray-300 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                Provider
              </p>
              <p className="font-semibold text-black">
                {job.providerName || 'Service'}
              </p>
              {job.providerPhone ? (
                <a
                  href={`tel:${job.providerPhone}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                >
                  <Phone className="size-3" />
                  {job.providerPhone}
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-black">Progress</p>
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
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-black">
              Timing log
            </p>
            <div className="space-y-2">
              {timeline.map((t) => {
                const Icon = t.icon
                const done = Boolean(t.at)
                return (
                  <div
                    key={t.label}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
                      done
                        ? 'border-primary/20 bg-light-theme'
                        : 'border-gray-300 bg-white opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          'size-4',
                          done ? 'text-primary' : 'text-gray-600'
                        )}
                      />
                      <span className="text-sm font-medium text-black">
                        {t.label}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray">
                      {formatWhen(t.at)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-black">
              Bill / invoice
              {bill?.invoiceNumber ? ` · ${bill.invoiceNumber}` : ''}
            </p>
            {!bill || bill.items.length === 0 ? (
              <p className="text-xs text-gray">No line items on this bill.</p>
            ) : (
              <div className="space-y-2">
                {bill.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-black">{it.description}</p>
                      <p className="text-[11px] text-gray">
                        {it.quantity} × {money(it.unitPriceCents)} · by{' '}
                        {it.addedBy}
                      </p>
                    </div>
                    <span className="font-semibold text-black">
                      {money(it.totalCents)}
                    </span>
                  </div>
                ))}
                <div className="rounded-md bg-gray-100 px-3 py-2 text-sm">
                  <div className="flex justify-between text-gray">
                    <span>Subtotal</span>
                    <span>{money(bill.subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-gray">
                    <span>Tax</span>
                    <span>{money(bill.taxCents)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-bold text-black">
                    <span>Total</span>
                    <span>{money(bill.totalCents)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {bill?.photos && bill.photos.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-black">
                Photos (parts / work)
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {bill.photos.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-lg border border-gray-300 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.dataUrl}
                      alt={p.name}
                      className="aspect-square w-full object-cover"
                    />
                    <p className="truncate px-2 py-1 text-[10px] text-gray">
                      {p.name} · {p.addedBy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-gray-300 pt-3">
            <Button
              type="button"
              variant="outline-general"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
