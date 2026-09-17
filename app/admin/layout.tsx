'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Building2,
  ClipboardList,
  Container,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Shield,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'
import { PortalShell, type PortalNavGroup } from '@/components/rsa/portal-shell'

const groups: PortalNavGroup[] = [
  {
    title: 'Operations',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
      { href: '/admin/approvals', label: 'Approvals', icon: <Shield className="size-4" /> },
      { href: '/admin/operations', label: 'Live Operations', icon: <Activity className="size-4" /> },
      { href: '/admin/cases', label: 'Cases', icon: <ClipboardList className="size-4" /> },
    ],
  },
  {
    title: 'Payments',
    items: [
      { href: '/admin/invoices', label: 'Pay & Accept', icon: <CreditCard className="size-4" /> },
      { href: '/admin/invoices?tab=all', label: 'All Invoices', icon: <Receipt className="size-4" /> },
    ],
  },
  {
    title: 'Directory',
    items: [
      { href: '/admin/drivers', label: 'Drivers', icon: <Users className="size-4" /> },
      { href: '/admin/companies', label: 'Companies', icon: <Building2 className="size-4" /> },
      { href: '/admin/providers', label: 'Providers', icon: <Wrench className="size-4" /> },
      { href: '/admin/trucks', label: 'Trucks', icon: <Truck className="size-4" /> },
      { href: '/admin/trailers', label: 'Trailers', icon: <Container className="size-4" /> },
    ],
  },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <PortalShell
      title="Platform Admin"
      brand="RSA Admin"
      groups={groups}
      loginPath="/admin/login"
      notificationsHref="/admin/dashboard"
    >
      {children}
    </PortalShell>
  )
}
