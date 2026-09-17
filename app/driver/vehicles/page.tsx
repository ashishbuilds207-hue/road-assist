'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/rsa/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { TRUCK_TYPES } from '@/types/rsa'
import { useCanPost } from '@/hooks/useCanPost'

type Truck = {
  id: string
  unitNumber: string
  make: string
  model: string
  year: string
  plate: string
  vin: string
  truckType: string
  status: string
}

export default function DriverVehiclesPage() {
  const { toast } = useToast()
  const companyId = useAuthStore((s) => s.companyId)
  const registrationId = useAuthStore((s) => s.registrationId)
  const isOwner = useAuthStore((s) => s.isFleetOwner())
  const { canPost } = useCanPost()
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    unitNumber: '',
    make: '',
    model: '',
    year: '',
    plate: '',
    vin: '',
    truckType: 'SEMI_TRUCK',
  })

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await fetch(
      `/api/fleet/trucks?companyId=${encodeURIComponent(companyId)}`
    )
    const data = await res.json()
    setTrucks(data.trucks || [])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    void load()
  }, [load])

  const add = async () => {
    if (!companyId || !registrationId) return
    setSaving(true)
    const res = await fetch('/api/fleet/trucks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        companyId,
        ownerRegistrationId: registrationId,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast({ title: 'Could not add truck', description: data.error })
      return
    }
    toast({ title: 'Truck added' })
    setOpen(false)
    setForm({
      unitNumber: '',
      make: '',
      model: '',
      year: '',
      plate: '',
      vin: '',
      truckType: 'SEMI_TRUCK',
    })
    void load()
  }

  const remove = async (id: string) => {
    if (!companyId) return
    const res = await fetch(
      `/api/fleet/trucks?id=${encodeURIComponent(id)}&companyId=${encodeURIComponent(companyId)}`,
      { method: 'DELETE' }
    )
    if (!res.ok) {
      toast({ title: 'Remove failed' })
      return
    }
    void load()
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Fleet trucks"
        description={
          isOwner
            ? 'Post commercial trucks for your company. Invited drivers can use these units for RSA requests.'
            : 'Trucks assigned to your company. Contact your fleet owner to add units.'
        }
        actions={
          isOwner ? (
            <Button
              type="button"
              variant="default"
              disabled={!canPost}
              onClick={() => setOpen((v) => !v)}
            >
              <Plus className="size-4" />
              Add truck
            </Button>
          ) : undefined
        }
      />

      {!canPost && isOwner && (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-black">
          Account inactive — admin must approve before you can post trucks.
        </p>
      )}

      {open && isOwner && (
        <Card className="space-y-3 p-4">
          <p className="font-semibold text-black">Vehicle details</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              variant="input-form"
              placeholder="Unit number"
              value={form.unitNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, unitNumber: e.target.value }))
              }
            />
            <Input
              variant="input-form"
              placeholder="Plate"
              value={form.plate}
              onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
            />
            <Input
              variant="input-form"
              placeholder="Make"
              value={form.make}
              onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
            />
            <Input
              variant="input-form"
              placeholder="Model"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            />
            <Input
              variant="input-form"
              placeholder="Year"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
            />
            <Input
              variant="input-form"
              placeholder="VIN"
              value={form.vin}
              onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))}
            />
            <select
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm"
              value={form.truckType}
              onChange={(e) =>
                setForm((f) => ({ ...f, truckType: e.target.value }))
              }
            >
              {TRUCK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="default"
            disabled={saving || !form.unitNumber || !form.plate}
            onClick={() => void add()}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save truck
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : trucks.length === 0 ? (
        <EmptyState
          title="No trucks yet"
          description={
            isOwner
              ? 'Add your first commercial truck to use in emergency requests.'
              : 'Your fleet owner has not posted trucks yet.'
          }
        />
      ) : (
        <div className="space-y-2">
          {trucks.map((t) => (
            <Card
              key={t.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-semibold text-black">
                  Unit {t.unitNumber}
                  {t.make ? ` · ${t.make}` : ''}
                  {t.model ? ` ${t.model}` : ''}
                </p>
                <p className="text-xs text-gray">
                  Plate {t.plate}
                  {t.year ? ` · ${t.year}` : ''} · {t.truckType.replace(/_/g, ' ')}
                  {t.vin ? ` · VIN ${t.vin}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="small">
                  {t.status}
                </Badge>
                {isOwner && (
                  <Button
                    type="button"
                    variant="outline-general"
                    size="small"
                    onClick={() => void remove(t.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
