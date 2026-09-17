'use client'

import type { ReactNode } from 'react'
import {
  Bell,
  Building2,
  Car,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Settings,
  Container,
  Truck,
  Users,
  Wallet,
  Wrench,
  BarChart3,
  Package,
} from 'lucide-react'
import { PortalShell } from '@/components/rsa/portal-shell'

const nav = [
  { href: '/company', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { href: '/company/drivers', label: 'Drivers', icon: <Users className="size-4" /> },
  { href: '/company/vehicles', label: 'Vehicles', icon: <Truck className="size-4" /> },
  { href: '/company/trailers', label: 'Trailers', icon: <Container className="size-4" /> },
  { href: '/company/cases', label: 'Cases', icon: <ClipboardList className="size-4" /> },
  { href: '/company/dispatch', label: 'Dispatch', icon: <Car className="size-4" /> },
  { href: '/company/providers', label: 'Providers', icon: <Building2 className="size-4" /> },
  { href: '/company/estimates', label: 'Estimates', icon: <Package className="size-4" /> },
  { href: '/company/repairs', label: 'Repairs', icon: <Wrench className="size-4" /> },
  { href: '/company/invoices', label: 'Invoices', icon: <Receipt className="size-4" /> },
  { href: '/company/payments', label: 'Payments', icon: <Wallet className="size-4" /> },
  { href: '/company/reports', label: 'Reports', icon: <BarChart3 className="size-4" /> },
  { href: '/company/messages', label: 'Messages', icon: <MessageSquare className="size-4" /> },
  { href: '/company/notifications', label: 'Notifications', icon: <Bell className="size-4" /> },
  { href: '/company/documents', label: 'Documents', icon: <FileText className="size-4" /> },
  { href: '/company/settings', label: 'Settings', icon: <Settings className="size-4" /> },
]

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      title="Fleet Company"
      brand="RSA Company"
      nav={nav}
      loginPath="/login"
      notificationsHref="/company/notifications"
    >
      {children}
    </PortalShell>
  )
}
