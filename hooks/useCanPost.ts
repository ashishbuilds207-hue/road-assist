'use client'

import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/use-toast'

/** Returns whether writes are allowed; shows toast when blocked */
export function useCanPost() {
  const accountStatus = useAuthStore((s) => s.accountStatus)
  const { toast } = useToast()
  const canPost = accountStatus === 'ACTIVE'

  const guardPost = (actionLabel = 'do this') => {
    if (canPost) return true
    toast({
      title: 'Account not active',
      description: `Please wait for admin activation before you can ${actionLabel}.`,
    })
    return false
  }

  return { canPost, guardPost, accountStatus }
}
