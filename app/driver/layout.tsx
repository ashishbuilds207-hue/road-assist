'use client'

import type { ReactNode } from 'react'
import {
  Bell,
  BookOpen,
  Car,
  FileText,
  Headset,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Siren,
  User,
  FolderOpen,
  Users,
} from 'lucide-react'
import { PortalShell } from '@/components/rsa/portal-shell'
import { useAuthStore } from '@/stores/authStore'

export default function DriverLayout({ children }: { children: ReactNode }) {
  const isOwner = useAuthStore((s) => s.isFleetOwner())

  const nav = [
    { href: '/driver', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
    { href: '/driver/request', label: 'Request Assistance', icon: <Siren className="size-4" /> },
    { href: '/driver/active', label: 'Active Case', icon: <Radio className="size-4" /> },
    { href: '/driver/cases', label: 'Cases', icon: <FolderOpen className="size-4" /> },
    { href: '/driver/vehicles', label: 'Trucks', icon: <Car className="size-4" /> },
    ...(isOwner
      ? [
          {
            href: '/driver/team',
            label: 'Company drivers',
            icon: <Users className="size-4" />,
          },
        ]
      : []),
    { href: '/driver/bookings', label: 'Bookings', icon: <BookOpen className="size-4" /> },
    { href: '/driver/messages', label: 'Messages', icon: <MessageSquare className="size-4" /> },
    { href: '/driver/notifications', label: 'Notifications', icon: <Bell className="size-4" /> },
    { href: '/driver/documents', label: 'Documents', icon: <FileText className="size-4" /> },
    { href: '/driver/profile', label: 'Profile', icon: <User className="size-4" /> },
    { href: '/driver/support', label: 'Support', icon: <Headset className="size-4" /> },
  ]

  return (
    <PortalShell
      title={isOwner ? 'Fleet Portal' : 'Driver Portal'}
      brand={isOwner ? 'RSA Fleet' : 'RSA Driver'}
      nav={nav}
      loginPath="/login"
      notificationsHref="/driver/notifications"
    >
      {children}
    </PortalShell>
  )
}
