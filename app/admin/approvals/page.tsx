'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Eye, FileWarning } from 'lucide-react'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LiveRefreshControls } from '@/components/rsa/live-refresh-controls'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/rsa/empty-state'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type RegDoc = {
  id?: string
  category: string
  name: string
  dataUrl?: string
  uploadedAt?: string
  status?: string
  expirationDate?: string
}

type Reg = {
  id: string
  phone: string
  email: string
  full_name: string
  role: string
  company_name?: string | null
  business_name?: string | null
  usdot?: string | null
  mc_number?: string | null
  status: string
  documents: RegDoc[]
  latitude?: number | null
  longitude?: number | null
  formatted_address?: string | null
  company_address?: string | null
  created_at: string
}

type TabKey = 'DRIVER' | 'COMPANY' | 'SERVICE_PROVIDER' | 'DOCUMENTS'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'DRIVER', label: 'Drivers' },
  { key: 'COMPANY', label: 'Companies' },
  { key: 'SERVICE_PROVIDER', label: 'Providers' },
  { key: 'DOCUMENTS', label: 'Documents' },
]

export default function AdminApprovalsPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<TabKey>('DRIVER')
  const [items, setItems] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing] = useState<string | null>(null)
  const [selected, setSelected] = useState<Reg | null>(null)
  const [previewDoc, setPreviewDoc] = useState<RegDoc | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [infoNote, setInfoNote] = useState('')

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(
        '/api/admin/registrations?status=PENDING_APPROVAL',
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      // keep previous list
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(true), 4000)
    return () => clearInterval(id)
  }, [load])

  const filtered = useMemo(() => {
    if (tab === 'DOCUMENTS') return items
    return items.filter((i) => i.role === tab)
  }, [items, tab])

  const allDocs = useMemo(() => {
    return items.flatMap((r) =>
      (r.documents || []).map((d) => ({
        ...d,
        applicant: r.full_name,
        role: r.role,
        appId: r.id,
      }))
    )
  }, [items])

  const act = async (
    id: string,
    action: 'activate' | 'reject' | 'request_info' | 'suspend'
  ) => {
    if (action === 'reject' && !rejectReason.trim()) {
      toast({ title: 'Rejection reason required' })
      return
    }
    if (action === 'request_info' && !infoNote.trim()) {
      toast({ title: 'Admin note required' })
      return
    }
    setActing(id)
    const res = await fetch('/api/admin/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        action,
        reason: rejectReason || undefined,
        note: infoNote || undefined,
      }),
    })
    const data = await res.json()
    setActing(null)
    if (!res.ok) {
      toast({ title: 'Failed', description: data.error })
      return
    }
    toast({
      title: 'Updated',
      description: `${data.registration.full_name} → ${data.registration.status}`,
    })
    setRejectReason('')
    setInfoNote('')
    setSelected(null)
    void load(true)
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Approvals"
        description="Review real registration applications. Approve only after checking documents. No fake users."
        actions={
          <LiveRefreshControls
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            size="small"
            variant={tab === t.key ? 'default' : 'outline-general'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : tab === 'DOCUMENTS' ? (
        allDocs.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Documents appear when applicants upload them during signup."
          />
        ) : (
          <Card className="divide-y divide-gray-200 p-0">
            {allDocs.map((d, i) => (
              <button
                key={`${d.appId}-${d.category}-${i}`}
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-light-theme"
                onClick={() => setPreviewDoc(d)}
              >
                <div>
                  <p className="font-semibold text-black">{d.category}</p>
                  <p className="text-xs text-gray">
                    {d.applicant} · {d.role} · {d.name}
                  </p>
                </div>
                <Badge variant="pending" size="small">
                  {d.status || 'UPLOADED'}
                </Badge>
              </button>
            ))}
          </Card>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`No pending ${TABS.find((t) => t.key === tab)?.label?.toLowerCase()}`}
          description="New real registrations appear here after submit."
        />
      ) : (
        filtered.map((r) => (
          <Card
            key={r.id}
            className={cn(
              'cursor-pointer space-y-2 p-4 transition hover:border-primary/40'
            )}
            onClick={() => setSelected(r)}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-black">{r.full_name}</p>
                <p className="text-sm text-gray">
                  {r.email} · {r.phone}
                </p>
                <p className="text-xs text-gray">
                  {r.company_name || r.business_name || r.formatted_address || '—'}
                  {r.mc_number ? ` · MC ${r.mc_number}` : ''}
                  {r.usdot ? ` · USDOT ${r.usdot}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="pending" size="small">
                  PENDING_APPROVAL
                </Badge>
                <Eye className="size-4 text-primary" />
              </div>
            </div>
            <p className="text-xs text-gray">
              Submitted {new Date(r.created_at).toLocaleString()} ·{' '}
              {(r.documents || []).length} document(s)
            </p>
          </Card>
        ))
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.full_name}</DialogTitle>
                <DialogDescription>
                  {selected.role} · PENDING_APPROVAL ·{' '}
                  {new Date(selected.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-gray">Email:</span> {selected.email}
                </p>
                <p>
                  <span className="text-gray">Phone:</span> {selected.phone}
                </p>
                <p>
                  <span className="text-gray">Business:</span>{' '}
                  {selected.company_name || selected.business_name || '—'}
                </p>
                <p>
                  <span className="text-gray">MC / USDOT:</span>{' '}
                  {selected.mc_number || '—'} / {selected.usdot || '—'}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-gray">Address:</span>{' '}
                  {selected.company_address || selected.formatted_address || '—'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Documents</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(selected.documents || []).map((d) => (
                    <button
                      key={`${d.category}-${d.name}`}
                      type="button"
                      className="rounded-lg border p-2 text-left text-xs hover:border-primary"
                      onClick={() => setPreviewDoc(d)}
                    >
                      <p className="font-semibold text-primary">{d.category}</p>
                      <p className="truncate text-gray">{d.name}</p>
                      {d.dataUrl?.startsWith('data:image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.dataUrl}
                          alt=""
                          className="mt-2 h-24 w-full rounded object-cover"
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">
                  Rejection reason (required to reject)
                </label>
                <Input
                  variant="input-form"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this application rejected?"
                />
                <label className="text-xs font-semibold">
                  Request information note
                </label>
                <Input
                  variant="input-form"
                  value={infoNote}
                  onChange={(e) => setInfoNote(e.target.value)}
                  placeholder="What extra info/docs are needed?"
                />
              </div>

              <div className="flex flex-wrap gap-2">
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
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline-general"
                  disabled={acting === selected.id}
                  onClick={() => void act(selected.id, 'request_info')}
                >
                  <FileWarning className="size-4" />
                  Request information
                </Button>
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
                  disabled={acting === selected.id}
                  onClick={() => void act(selected.id, 'suspend')}
                >
                  Suspend
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewDoc)} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl">
          {previewDoc && (
            <>
              <DialogHeader>
                <DialogTitle>{previewDoc.category}</DialogTitle>
                <DialogDescription>{previewDoc.name}</DialogDescription>
              </DialogHeader>
              {previewDoc.dataUrl?.startsWith('data:image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDoc.dataUrl}
                  alt=""
                  className="max-h-[70vh] w-full rounded object-contain"
                />
              ) : previewDoc.dataUrl ? (
                <a
                  href={previewDoc.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary"
                >
                  Open file
                </a>
              ) : (
                <p className="text-sm text-gray">No preview available.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
