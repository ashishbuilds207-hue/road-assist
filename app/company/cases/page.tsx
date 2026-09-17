'use client'

import { useCases } from '@/hooks/useCases'
import { useAuthStore } from '@/stores/authStore'
import { ConnectedStubPage } from '@/components/rsa/portal-page'

export default function CompanyCasesPage() {
  const companyId = useAuthStore((s) => s.companyId) ?? undefined
  const { data: cases = [], isLoading } = useCases({ companyId })
  return (
    <ConnectedStubPage
      title="Cases"
      description="Fleet roadside assistance cases."
      loading={isLoading}
      rows={cases.map((c) => ({
        id: c.id,
        title: c.case_number,
        subtitle: c.title ?? c.category_slug ?? undefined,
        badge: c.status,
      }))}
    />
  )
}
