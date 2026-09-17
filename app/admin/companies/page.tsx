'use client'

import { AdminDirectoryPage } from '@/components/rsa/admin-directory-page'

export default function Page() {
  return (
    <AdminDirectoryPage
      role="COMPANY"
      description="Activate, block, or delete companies. Changes apply live to the signed-in user."
    />
  )
}
