'use client'

import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/rsa/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { useDemoDataStore } from '@/stores/demoDataStore'
import { useAuthStore } from '@/stores/authStore'

export default function CompanyEstimatesPage() {
  const { toast } = useToast()
  const companyId = useAuthStore((s) => s.companyId) || 'demo-co-lonestar'
  const estimates = useDemoDataStore((s) => s.estimates)
  const cases = useDemoDataStore((s) => s.cases)
  const approveEstimate = useDemoDataStore((s) => s.approveEstimate)
  const updateCaseStatus = useDemoDataStore((s) => s.updateCaseStatus)
  const ensureSeeded = useDemoDataStore((s) => s.ensureSeeded)
  ensureSeeded()

  const companyCaseIds = new Set(
    cases.filter((c) => c.company_id === companyId).map((c) => c.id)
  )
  const items = estimates.filter(
    (e) => companyCaseIds.has(e.case_id) || !e.case_id
  )

  const decide = (id: string, approve: boolean) => {
    if (approve) {
      const est = approveEstimate(id)
      if (est?.case_id) {
        updateCaseStatus(est.case_id, 'APPROVED', {
          note: 'Company approved estimate',
        })
      }
      toast({
        title: 'Estimate approved',
        description: 'Provider will see approval in real time (DEMO store).',
      })
    } else {
      useDemoDataStore.setState((s) => ({
        estimates: s.estimates.map((e) =>
          e.id === id
            ? { ...e, status: 'REJECTED' as const, updated_at: new Date().toISOString() }
            : e
        ),
      }))
      const est = estimates.find((e) => e.id === id)
      if (est?.case_id) {
        updateCaseStatus(est.case_id, 'ESTIMATE_SUBMITTED', {
          note: 'Company rejected estimate — awaiting revision',
        })
      }
      toast({
        title: 'Estimate rejected',
        description: 'Provider notified (DEMO).',
      })
    }
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Estimate approval"
        description="Review provider estimates before repair work continues."
      />
      {items.length === 0 ? (
        <EmptyState
          title="No estimates"
          description="When a provider submits an estimate, it appears here for approval."
        />
      ) : (
        items.map((est) => {
          const c = cases.find((x) => x.id === est.case_id)
          const total =
            ((est.total_cents ?? est.subtotal_cents ?? 0) as number) / 100
          return (
            <Card key={est.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-black">
                    {c?.case_number ?? est.case_id} · Estimate
                  </p>
                  <p className="text-sm text-gray">${total.toFixed(2)} USD</p>
                </div>
                <Badge
                  variant={
                    est.status === 'APPROVED'
                      ? 'success'
                      : est.status === 'REJECTED'
                        ? 'danger'
                        : 'pending'
                  }
                >
                  {est.status}
                </Badge>
              </div>
              {(est.status === 'SUBMITTED' || est.status === 'DRAFT') && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="black"
                    onClick={() => decide(est.id, true)}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline-general"
                    onClick={() => decide(est.id, false)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
