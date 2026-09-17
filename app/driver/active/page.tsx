'use client'

import { Suspense } from 'react'
import DriverActiveClient from './active-client'

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-gray">Loading active case…</div>}
    >
      <DriverActiveClient />
    </Suspense>
  )
}
