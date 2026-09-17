'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotificationBell } from '@/components/rsa/notification-bell'
import { InactiveAccountBanner } from '@/components/rsa/inactive-account-banner'
import { usePortalAuth } from '@/hooks/usePortalAuth'
import { useUiStore } from '@/stores/uiStore'
import { AuthService } from '@/services/AuthService'
import { LoadingSkeleton } from '@/components/rsa/loading-skeleton'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

export type PortalNavItem = {
  href: string
  label: string
  icon?: ReactNode
}

export type PortalNavGroup = {
  title: string
  items: PortalNavItem[]
}

export function PortalShell({
  title,
  nav,
  groups,
  children,
  loginPath = '/login',
  notificationsHref = '#',
  brand = 'RSA Platform',
}: {
  title: string
  nav?: PortalNavItem[]
  groups?: PortalNavGroup[]
  children: ReactNode
  loginPath?: string
  notificationsHref?: string
  brand?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { ready, profile, accountStatus } = usePortalAuth(loginPath)
  const registrationId = useAuthStore((s) => s.registrationId)
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleCollapsed = useUiStore((s) => s.toggleSidebarCollapsed)

  const flatNav =
    nav ??
    groups?.flatMap((g) => g.items) ??
    []

  const logout = async () => {
    await AuthService.logout()
    router.replace(loginPath)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-400 p-6">
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-400 font-plus-jakarta text-sm text-gray">
      <InactiveAccountBanner />
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-3 border-b border-gray-300 bg-white px-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline-general"
            size="small"
            className="!px-2 lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <Button
            type="button"
            variant="outline-general"
            size="small"
            className="!px-2 hidden lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </Button>
          <div>
            <p className="font-gilroy text-base font-bold text-black">{brand}</p>
            <p className="text-xs font-medium text-gray">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell inboxHref={notificationsHref} />
          <div className="hidden text-right sm:block">
            <div className="flex items-center justify-end gap-1.5">
              <p className="text-xs font-semibold text-black">
                {profile?.full_name ?? 'User'}
              </p>
              {profile?.role !== 'ADMIN' && (
                <Badge
                  variant={accountStatus === 'ACTIVE' ? 'success' : 'pending'}
                  size="small"
                >
                  {accountStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-gray">
              {profile?.phone ?? profile?.email}
              {registrationId ? ` · #${registrationId.slice(-6)}` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="outline-general"
            size="small"
            className="!px-2 size-9"
            onClick={() => void logout()}
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed bottom-0 left-0 top-[60px] z-40 w-[260px] overflow-y-auto border-r border-gray-300 bg-white p-3 transition-transform lg:translate-x-0',
          collapsed && 'lg:w-[72px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ top: 'calc(60px + var(--demo-banner, 0px))' }}
      >
        <Card className="space-y-1 border-0 p-2 shadow-none">
          {groups
            ? groups.map((group) => (
                <div key={group.title} className="mb-3">
                  {!collapsed && (
                    <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-gray">
                      {group.title}
                    </p>
                  )}
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition hover:bg-gray-200 hover:text-black',
                          active && 'bg-primary/10 font-semibold text-primary'
                        )}
                      >
                        {item.icon}
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    )
                  })}
                </div>
              ))
            : flatNav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition hover:bg-gray-200 hover:text-black',
                      active && 'bg-primary/10 font-semibold text-primary'
                    )}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
        </Card>
      </aside>

      <main
        className={cn(
          'p-4 transition-all lg:ml-[260px]',
          collapsed && 'lg:ml-[72px]'
        )}
      >
        {children}
      </main>
    </div>
  )
}
