'use client'

import { useRouter } from 'next/navigation'
import { UserRoundCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { AuthService } from '@/services/AuthService'
import { DEMO_ACCOUNTS } from '@/types/rsa'
import { useAuthStore } from '@/stores/authStore'

const ROLE_LABELS: Record<string, string> = {
  driver: 'Driver',
  company: 'Company',
  provider: 'Provider',
  technician: 'Technician',
  admin: 'Admin',
  DRIVER: 'Driver',
  COMPANY: 'Company',
  SERVICE_PROVIDER: 'Provider',
  TECHNICIAN: 'Technician',
  ADMIN: 'Admin',
}

export function RoleSwitcher() {
  const router = useRouter()
  const demoMode = useAuthStore((s) => s.demoMode)
  const role = useAuthStore((s) => s.role)

  if (!demoMode) return null

  const switchRole = async (targetRole: (typeof DEMO_ACCOUNTS)[number]['role']) => {
    const res = await AuthService.switchDemoRole(targetRole)
    if (res.data?.redirect) {
      router.push(res.data.redirect)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline-general"
          size="small"
          className="gap-1.5"
        >
          <UserRoundCog className="size-4" />
          <span className="hidden sm:inline">
            {ROLE_LABELS[role ?? ''] ?? 'Role'}
          </span>
          <Badge variant="pending" size="small">
            DEMO
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch DEMO role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DEMO_ACCOUNTS.map((account) => (
          <DropdownMenuItem
            key={account.phone}
            onClick={() => void switchRole(account.role)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="font-semibold">
              {ROLE_LABELS[account.role] ?? account.label}
            </span>
            <span className="text-[11px] text-gray">{account.phone}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
