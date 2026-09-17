'use client'

import { AdminDirectoryPage } from '@/components/rsa/admin-directory-page'

export default function AdminProvidersPage() {
  return (
    <AdminDirectoryPage
      role="SERVICE_PROVIDER"
      description="Activate, block, or delete providers. Blocked status shows live; delete forces logout."
    />
  )
}
