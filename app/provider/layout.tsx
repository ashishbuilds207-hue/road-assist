'use client'

import type { ReactNode } from 'react'
import {
  Briefcase,
  LayoutDashboard,
  Radio,
  Receipt,
} from 'lucide-react'
import { PortalShell } from '@/components/rsa/portal-shell'

const nav = [
  { href: '/provider', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { href: '/provider/jobs', label: 'Jobs', icon: <Briefcase className="size-4" /> },
  { href: '/provider/active', label: 'Active Jobs', icon: <Radio className="size-4" /> },
  { href: '/provider/invoices', label: 'Invoices', icon: <Receipt className="size-4" /> },
]

export default function ProviderLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      title="Service Provider"
      brand="RSA Provider"
      nav={nav}
      loginPath="/login"
      notificationsHref="/provider/jobs"
    >
      {children}
    </PortalShell>
  )
}
