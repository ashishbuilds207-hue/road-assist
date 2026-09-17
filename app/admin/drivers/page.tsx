'use client'

import { AdminDirectoryPage } from '@/components/rsa/admin-directory-page'

export default function AdminDriversPage() {
  return (
    <AdminDirectoryPage
      role="DRIVER"
      description="Activate, block, or delete drivers. Blocked users see it live; deleted users are signed out."
    />
  )
}
