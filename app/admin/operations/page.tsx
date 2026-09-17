'use client'

import { useMemo, useState } from 'react'
import { useCases, useCase } from '@/hooks/useCases'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'
import { CaseTimeline } from '@/components/rsa/timeline/case-timeline'
import { ChatPanel } from '@/components/rsa/chat/chat-panel'
import { GoogleMapView } from '@/components/rsa/maps/google-map'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export default function AdminOperationsPage() {
  const { data: cases = [] } = useCases({ limit: 50 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeId = selectedId ?? cases[0]?.id ?? null
  const { data: selected } = useCase(activeId)

  const markers = useMemo(
    () =>
      cases.slice(0, 20).map((c, i) => ({
        id: c.id,
        lat: 41.5 + (i % 5) * 0.08,
        lng: -93.6 - (i % 4) * 0.1,
        label: c.case_number,
      })),
    [cases]
  )

  const center = markers[0]
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : { lat: 39.8283, lng: -98.5795 }

  return (
    <div className="space-y-3">
      <PortalPageHeader
        title="Live Operations Center"
        description="Active cases, map, detail, and case tools."
      />
      <div className="grid gap-3 xl:grid-cols-[280px_1fr_320px]">
        <Card className="max-h-[70vh] overflow-y-auto p-2">
          <p className="px-2 py-1 text-xs font-bold uppercase text-gray">
            Active cases
          </p>
          {cases.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'mb-1 w-full rounded-lg px-2 py-2 text-left hover:bg-gray-200',
                activeId === c.id && 'bg-primary/10'
              )}
            >
              <p className="text-sm font-semibold text-black">{c.case_number}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <PriorityBadge priority={c.priority} />
                <StatusBadge status={c.status} />
              </div>
            </button>
          ))}
          {cases.length === 0 && (
            <p className="p-3 text-sm text-gray">No active cases loaded.</p>
          )}
        </Card>

        <Card className="p-2">
          <GoogleMapView
            center={center}
            zoom={markers.length ? 7 : 4}
            markers={markers}
            mapContainerClassName="h-[420px] w-full"
            onClick={() => undefined}
          />
        </Card>

        <Card className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          {selected ? (
            <>
              <h3 className="font-gilroy text-lg font-bold text-black">
                {selected.case_number}
              </h3>
              <div className="flex flex-wrap gap-1">
                <PriorityBadge priority={selected.priority} />
                <StatusBadge status={selected.status} />
              </div>
              <p className="text-sm text-gray">
                {selected.title ?? selected.description ?? selected.category_slug}
              </p>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray">Driver</dt>
                  <dd className="text-black">{selected.driver_id ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray">Provider</dt>
                  <dd className="text-black">
                    {(selected as { provider_id?: string | null }).provider_id ??
                      selected.service_provider_id ??
                      '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray">Vehicle</dt>
                  <dd className="text-black">{selected.vehicle_id ?? '—'}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-gray">Select a case</p>
          )}
        </Card>
      </div>

      <Card className="p-3">
        <Tabs defaultValue="timeline">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-3">
            <CaseTimeline caseId={activeId} />
          </TabsContent>
          <TabsContent value="chat" className="mt-3">
            <ChatPanel
              caseId={activeId}
              conversationId={activeId ? `case-${activeId}` : null}
            />
          </TabsContent>
          <TabsContent value="photos" className="mt-3 text-sm text-gray">
            Case photos appear here when uploaded.
          </TabsContent>
          <TabsContent value="estimate" className="mt-3 text-sm text-gray">
            Estimate review panel — connect via Estimates module.
          </TabsContent>
          <TabsContent value="invoice" className="mt-3 text-sm text-gray">
            Invoice review panel — connect via Invoices module.
          </TabsContent>
          <TabsContent value="audit" className="mt-3 text-sm text-gray">
            Audit trail for case mutations.
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
