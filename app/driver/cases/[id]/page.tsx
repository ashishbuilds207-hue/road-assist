'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useCase } from '@/hooks/useCases'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { LoadingSkeleton } from '@/components/rsa/loading-skeleton'
import { EmptyState } from '@/components/rsa/empty-state'
import { StatusBadge, PriorityBadge } from '@/components/rsa/status-badge'
import { CaseTimeline } from '@/components/rsa/timeline/case-timeline'
import { ChatPanel } from '@/components/rsa/chat/chat-panel'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCategoryLabel } from '@/types/rsa'
import { RatingService } from '@/services/RatingService'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/use-toast'
import type { Review } from '@/types/database'

export default function DriverCaseDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: c, isLoading } = useCase(params.id)
  const userId = useAuthStore((s) => s.user?.id) ?? 'demo-DRIVER'
  const { toast } = useToast()

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [existing, setExisting] = useState<Review[]>([])
  const [submitting, setSubmitting] = useState(false)

  const canRate = c?.status === 'CLOSED' || c?.status === 'PAID'

  useEffect(() => {
    if (!c?.id || !canRate) return
    void RatingService.list({ caseId: c.id }).then((res) => {
      setExisting(res.data ?? [])
    })
  }, [c?.id, canRate])

  if (isLoading) return <LoadingSkeleton rows={6} />
  if (!c) {
    return (
      <EmptyState
        title="Case not found"
        description="This case may still be syncing in DEMO mode."
      />
    )
  }

  const city = (c.metadata?.city as string) || null
  const state = (c.metadata?.state as string) || null

  const submitRating = async () => {
    setSubmitting(true)
    const res = await RatingService.create({
      case_id: c.id,
      service_provider_id: c.service_provider_id,
      technician_id: c.technician_id,
      reviewer_id: userId,
      rating,
      comment: comment.trim() || null,
    })
    setSubmitting(false)
    if (res.error && !res.data) {
      toast({ title: 'Rating failed', description: res.error })
      return
    }
    toast({ title: 'Thanks for your rating', description: 'Feedback saved.' })
    setComment('')
    const list = await RatingService.list({ caseId: c.id })
    setExisting(list.data ?? [])
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title={c.case_number}
        description={c.title ?? c.description ?? 'Assistance case'}
        actions={
          <div className="flex gap-1">
            <PriorityBadge priority={c.priority} />
            <StatusBadge status={c.status} />
          </div>
        }
      />

      <Card className="border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">
          Company Covered — No Payment Required
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          Your fleet company covers this roadside assistance. You will not be
          charged at the scene.
        </p>
      </Card>

      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray">Category</p>
          <p className="font-semibold text-black">
            {getCategoryLabel(c.category_slug) || c.category_slug || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray">Location</p>
          <p className="font-semibold text-black">
            {city && state ? `${city}, ${state}` : c.breakdown_notes || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray">Reported</p>
          <p className="font-semibold text-black">
            {new Date(c.created_at).toLocaleString()}
          </p>
        </div>
      </Card>

      {canRate && (
        <Card className="space-y-3 p-4">
          <h3 className="font-semibold text-black">Rate this service</h3>
          {existing.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {existing.map((r) => (
                <li key={r.id} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-semibold text-black">
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </p>
                  {r.comment && <p className="mt-1 text-gray">{r.comment}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`h-9 w-9 rounded-md border text-sm font-semibold ${
                      n <= rating
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-gray-200 text-gray'
                    }`}
                    onClick={() => setRating(n)}
                    aria-label={`${n} stars`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Optional comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <Button
                type="button"
                variant="black"
                disabled={submitting}
                onClick={() => void submitRating()}
              >
                Submit rating
              </Button>
            </>
          )}
        </Card>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="chat">Messages</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-3">
          <Card className="p-4">
            <CaseTimeline caseId={c.id} />
          </Card>
        </TabsContent>
        <TabsContent value="chat" className="mt-3">
          <ChatPanel caseId={c.id} conversationId={`case-${c.id}`} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
