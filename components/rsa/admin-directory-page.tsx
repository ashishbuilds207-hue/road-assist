'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
} from 'lucide-react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LiveRefreshControls } from '@/components/rsa/live-refresh-controls'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/rsa/empty-state'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { UserRole } from '@/types/database'
import { cn } from '@/lib/utils'

type DocItem = {
  id?: string
  category: string
  name: string
  dataUrl?: string
  uploadedAt?: string
}

export type DirectoryUser = {
  id: string
  phone: string
  email: string
  full_name: string
  role: string
  membership_type?: string | null
  company_id?: string | null
  company_name?: string | null
  company_address?: string | null
  business_name?: string | null
  usdot?: string | null
  mc_number?: string | null
  photo_url?: string | null
  status: string
  documents?: DocItem[]
  latitude?: number | null
  longitude?: number | null
  formatted_address?: string | null
  created_at: string
  updated_at?: string
}

const ROLE_LABEL: Record<string, string> = {
  DRIVER: 'Drivers',
  COMPANY: 'Companies',
  SERVICE_PROVIDER: 'Service providers',
  TECHNICIAN: 'Technicians',
}

function statusBadge(status: string) {
  if (status === 'ACTIVE') return { variant: 'success' as const, label: 'Active' }
  if (status === 'SUSPENDED')
    return { variant: 'danger' as const, label: 'Blocked' }
  if (status === 'REJECTED')
    return { variant: 'danger' as const, label: 'Rejected' }
  if (status === 'DEACTIVATED')
    return { variant: 'danger' as const, label: 'Deleted' }
  if (status === 'PENDING' || status === 'PENDING_APPROVAL')
    return { variant: 'pending' as const, label: 'Pending' }
  return { variant: 'pending' as const, label: status }
}

export function AdminDirectoryPage({
  role,
  description,
}: {
  role: UserRole
  description?: string
}) {
  const { toast } = useToast()
  const [items, setItems] = useState<DirectoryUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<DirectoryUser | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [source, setSource] = useState<string>('')
  const actingRef = useRef<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (actingRef.current) return
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/registrations?role=${encodeURIComponent(role)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const data = await res.json()
      if (actingRef.current) return
      const list = ((data.items || []) as DirectoryUser[]).filter(
        (i) => i.status !== 'DEACTIVATED'
      )
      setItems(list)
      setSource(data.source || '')
    } catch {
      if (!silent) setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [role])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(true), 5000)
    return () => clearInterval(id)
  }, [load])

  const act = async (
    id: string,
    action: 'activate' | 'reject' | 'block' | 'delete',
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation()
    if (acting === id) return

    const prev = items.find((i) => i.id === id)
    if (!prev) return

    // Instant UI — no confirm wait
    actingRef.current = id
    setActing(id)
    if (action === 'delete') {
      setItems((list) => list.filter((i) => i.id !== id))
      setSelected((s) => (s?.id === id ? null : s))
      toast({
        title: 'Deleted',
        description: `${prev.full_name} removed. They will be logged out.`,
      })
    } else if (action === 'block') {
      setItems((list) =>
        list.map((i) => (i.id === id ? { ...i, status: 'SUSPENDED' } : i))
      )
      setSelected((s) =>
        s?.id === id ? { ...s, status: 'SUSPENDED' } : s
      )
      toast({
        title: 'Blocked',
        description: `${prev.full_name} → BLOCKED`,
      })
    } else {
      const next = action === 'reject' ? 'REJECTED' : 'ACTIVE'
      setItems((list) =>
        list.map((i) => (i.id === id ? { ...i, status: next } : i))
      )
      setSelected((s) => (s?.id === id ? { ...s, status: next } : s))
      toast({
        title: 'Updated',
        description: `${prev.full_name} → ${next}`,
      })
    }

    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action,
          reason:
            action === 'block'
              ? 'Blocked by admin'
              : action === 'delete'
                ? 'Deleted by admin'
                : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Revert optimistic change
        setItems((list) => {
          if (action === 'delete') {
            const exists = list.some((i) => i.id === id)
            return exists ? list : [...list, prev]
          }
          return list.map((i) => (i.id === id ? prev : i))
        })
        setSelected((s) => (s?.id === id ? prev : s))
        toast({
          title: 'Failed',
          description: data.error || 'Could not update. Restored previous status.',
        })
      }
    } catch {
      setItems((list) => {
        if (action === 'delete') {
          const exists = list.some((i) => i.id === id)
          return exists ? list : [...list, prev]
        }
        return list.map((i) => (i.id === id ? prev : i))
      })
      setSelected((s) => (s?.id === id ? prev : s))
      toast({ title: 'Failed', description: 'Network error. Status restored.' })
    } finally {
      actingRef.current = null
      setActing(null)
    }
  }

  const title = ROLE_LABEL[role] || role

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title={title}
        description={
          description ||
          `Activate, block, or delete ${title.toLowerCase()}. Changes apply live to the user.`
        }
        actions={
          <LiveRefreshControls
            source={source}
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
      />

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          description="Users appear here after they register with phone OTP, documents, and location."
        />
      ) : (
        <Card className="divide-y divide-gray-200 overflow-hidden p-0">
          <div className="flex items-center justify-between bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray">
            <span>Records ({items.length})</span>
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : (
              <span className="size-3.5" aria-hidden />
            )}
          </div>
          {items.map((u) => {
            const badge = statusBadge(u.status)
            return (
              <div
                key={u.id}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-light-theme"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelected(u)}
                >
                  <p className="truncate font-semibold text-black">
                    {u.full_name}
                  </p>
                  <p className="truncate text-sm text-gray">
                    {u.email} · {u.phone}
                  </p>
                  <p className="truncate text-xs text-gray">
                    {u.company_name ||
                      u.business_name ||
                      u.formatted_address ||
                      '—'}
                  </p>
                </button>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant={badge.variant} size="small">
                    {badge.label}
                  </Badge>
                  {u.status === 'ACTIVE' && (
                    <Button
                      type="button"
                      variant="outline-general"
                      size="small"
                      disabled={acting === u.id}
                      onClick={(e) => void act(u.id, 'block', e)}
                    >
                      <Ban className="size-3.5" />
                      Block
                    </Button>
                  )}
                  {u.status === 'SUSPENDED' && (
                    <Button
                      type="button"
                      variant="default"
                      size="small"
                      disabled={acting === u.id}
                      onClick={(e) => void act(u.id, 'activate', e)}
                    >
                      Unblock
                    </Button>
                  )}
                  {u.status !== 'ACTIVE' && u.status !== 'SUSPENDED' && (
                    <Button
                      type="button"
                      variant="default"
                      size="small"
                      disabled={acting === u.id}
                      onClick={(e) => void act(u.id, 'activate', e)}
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline-general"
                    size="small"
                    className="!text-danger"
                    disabled={acting === u.id}
                    onClick={(e) => void act(u.id, 'delete', e)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                  <button
                    type="button"
                    className="rounded p-1.5 text-primary hover:bg-primary/10"
                    onClick={() => setSelected(u)}
                    aria-label="View details"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.full_name}</DialogTitle>
                <DialogDescription>
                  {selected.role} · {selected.status} · Joined{' '}
                  {new Date(selected.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-gray">Email:</span>{' '}
                  <strong>{selected.email}</strong>
                </p>
                <p>
                  <span className="text-gray">Phone:</span>{' '}
                  <strong>{selected.phone}</strong>
                </p>
                <p>
                  <span className="text-gray">Membership:</span>{' '}
                  <strong>{selected.membership_type || 'OWNER'}</strong>
                </p>
                <p>
                  <span className="text-gray">Company / business:</span>{' '}
                  <strong>
                    {selected.company_name || selected.business_name || '—'}
                  </strong>
                </p>
                <p className="sm:col-span-2">
                  <span className="text-gray">Address:</span>{' '}
                  <strong>
                    {selected.company_address ||
                      selected.formatted_address ||
                      '—'}
                  </strong>
                </p>
                <p>
                  <span className="text-gray">USDOT / MC:</span>{' '}
                  <strong>
                    {selected.usdot || '—'} / {selected.mc_number || '—'}
                  </strong>
                </p>
                <p>
                  <span className="text-gray">Status:</span>{' '}
                  <strong
                    className={cn(
                      selected.status === 'SUSPENDED' && 'text-danger'
                    )}
                  >
                    {selected.status === 'SUSPENDED'
                      ? 'BLOCKED'
                      : selected.status}
                  </strong>
                </p>
                {selected.photo_url && (
                  <div className="sm:col-span-2">
                    <p className="mb-1 text-gray">Profile / shop photo</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.photo_url}
                      alt="Uploaded"
                      className="h-40 w-full max-w-sm rounded-lg object-cover"
                    />
                  </div>
                )}
                <p className="sm:col-span-2 break-all text-xs text-gray">
                  ID: {selected.id}
                  {selected.company_id
                    ? ` · Company ${selected.company_id}`
                    : ''}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-black">Documents</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(selected.documents || []).map((d) => (
                    <button
                      key={`${d.category}-${d.name}`}
                      type="button"
                      className="rounded-lg border border-gray-200 p-2 text-left hover:border-primary"
                      onClick={() => setPreviewDoc(d)}
                    >
                      <p className="text-xs font-semibold text-primary">
                        {d.category}
                      </p>
                      <p className="mb-2 truncate text-xs text-gray">{d.name}</p>
                      {d.dataUrl?.startsWith('data:image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.dataUrl}
                          alt={d.category}
                          className="h-28 w-full rounded object-cover bg-gray-100"
                        />
                      ) : (
                        <p className="text-xs text-gray">Open file</p>
                      )}
                    </button>
                  ))}
                  {!selected.documents?.length && (
                    <p className="text-sm text-gray">No documents uploaded.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                {selected.status !== 'ACTIVE' && (
                  <Button
                    type="button"
                    variant="default"
                    disabled={acting === selected.id}
                    onClick={() => void act(selected.id, 'activate')}
                  >
                    {acting === selected.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {selected.status === 'SUSPENDED' ? 'Unblock' : 'Activate'}
                  </Button>
                )}
                {selected.status === 'ACTIVE' && (
                  <Button
                    type="button"
                    variant="outline-general"
                    disabled={acting === selected.id}
                    onClick={() => void act(selected.id, 'block')}
                  >
                    <Ban className="size-4" />
                    Block
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline-general"
                  disabled={acting === selected.id}
                  onClick={() => void act(selected.id, 'reject')}
                >
                  <XCircle className="size-4" />
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="outline-general"
                  className="!text-danger"
                  disabled={acting === selected.id}
                  onClick={() => void act(selected.id, 'delete')}
                >
                  <Trash2 className="size-4" />
                  Delete account
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(previewDoc)}
        onOpenChange={(o) => !o && setPreviewDoc(null)}
      >
        <DialogContent className="max-w-4xl">
          {previewDoc && (
            <>
              <DialogHeader>
                <DialogTitle>{previewDoc.category}</DialogTitle>
                <DialogDescription className="break-all">
                  {previewDoc.name}
                </DialogDescription>
              </DialogHeader>
              {previewDoc.dataUrl?.startsWith('data:image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.category}
                  className="max-h-[70vh] w-full rounded object-contain bg-gray-100"
                />
              ) : previewDoc.dataUrl ? (
                <iframe
                  title={previewDoc.name}
                  src={previewDoc.dataUrl}
                  className="h-[70vh] w-full rounded border"
                />
              ) : (
                <p className="text-sm text-gray">No file data.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
