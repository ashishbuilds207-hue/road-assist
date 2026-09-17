'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Payments live with invoice review — redirect. */
export default function AdminPaymentsPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/invoices')
  }, [router])
  return (
    <p className="p-6 text-sm text-gray">Opening invoice payments…</p>
  )
}
