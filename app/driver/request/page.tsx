'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SmartEmergencyFlow } from '@/components/rsa/emergency/smart-emergency-flow'
import { PortalPageHeader } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { useCanPost } from '@/hooks/useCanPost'

export default function DriverRequestPage() {
  const [open, setOpen] = useState(false)
  const { canPost, guardPost } = useCanPost()

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Request Assistance"
        description="Commercial trucks only. Platform-approved providers only — no Google business listings."
      />
      <Card className="space-y-3 p-5">
        {!canPost ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Your account is currently under review. You will be able to request
            roadside assistance after your account is approved.
          </p>
        ) : (
          <p className="text-sm text-gray">
            Passenger vehicles are not supported. Keep your unit number and plate
            ready. Photos help providers arrive prepared.
          </p>
        )}
        <Button
          type="button"
          variant="black"
          size="large"
          disabled={!canPost}
          onClick={() => {
            if (!guardPost('request roadside assistance')) return
            setOpen(true)
          }}
        >
          Start request wizard
        </Button>
      </Card>
      {canPost && (
        <SmartEmergencyFlow open={open} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
