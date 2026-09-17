'use client'

import type { ReactNode } from 'react'
import {
  Briefcase,
  Camera,
  ClipboardCheck,
  Map,
  MessageSquare,
  Navigation,
  Wrench,
} from 'lucide-react'
import { PortalShell } from '@/components/rsa/portal-shell'

const nav = [
  { href: '/technician', label: 'Assigned Jobs', icon: <Briefcase className="size-4" /> },
  { href: '/technician/current', label: 'Current Job', icon: <Navigation className="size-4" /> },
  { href: '/technician/navigation', label: 'Navigation', icon: <Map className="size-4" /> },
  { href: '/technician/inspection', label: 'Inspection', icon: <ClipboardCheck className="size-4" /> },
  { href: '/technician/repair', label: 'Repair', icon: <Wrench className="size-4" /> },
  { href: '/technician/photos', label: 'Photos', icon: <Camera className="size-4" /> },
  { href: '/technician/messages', label: 'Messages', icon: <MessageSquare className="size-4" /> },
]

export default function TechnicianLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      title="Technician"
      brand="RSA Tech"
      nav={nav}
      loginPath="/login"
      notificationsHref="/technician/messages"
    >
      {children}
    </PortalShell>
  )
}
