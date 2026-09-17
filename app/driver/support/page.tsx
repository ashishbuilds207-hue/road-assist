'use client'

import { ConnectedStubPage } from '@/components/rsa/portal-page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DriverSupportPage() {
  return (
    <div className="space-y-4">
      <ConnectedStubPage
        title="Support"
        description="Get help with the RSA driver portal."
      />
      <Card className="flex flex-col gap-2 p-4 sm:flex-row">
        <Button asChild variant="black">
          <a href="tel:+15551234567">Call support (DEMO)</a>
        </Button>
        <Button asChild variant="outline-general">
          <a href="mailto:support@rsa.demo">Email support</a>
        </Button>
      </Card>
    </div>
  )
}
