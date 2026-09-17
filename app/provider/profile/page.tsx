'use client'

import { Card } from '@/components/ui/card'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { DEMO_ACCOUNTS } from '@/types/rsa'
import { Badge } from '@/components/ui/badge'

export default function Page() {
  const demo = DEMO_ACCOUNTS.find((a) => a.role === 'SERVICE_PROVIDER')
  return (
    <div className="space-y-4">
      <PortalPageHeader title="Profile" />
      <Card className="space-y-2 p-4">
        <div className="flex gap-2">
          <p className="font-semibold text-black">{demo?.fullName}</p>
          <Badge variant="pending" size="small">
            DEMO
          </Badge>
        </div>
        <p className="text-sm text-gray">{demo?.phone}</p>
        <p className="text-sm text-gray">{demo?.email}</p>
      </Card>
    </div>
  )
}
