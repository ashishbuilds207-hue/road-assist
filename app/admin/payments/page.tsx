'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Payments live on Pay & Accept invoices page. */
export default function AdminPaymentsPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/invoices')
  }, [router])
  return <p className="p-6 text-sm text-gray">Opening Pay & Accept…</p>
}
