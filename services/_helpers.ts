import { getSupabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export type ServiceResult<T> = {
  data: T
  error: string | null
}

export function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null }
}

export function fail<T>(fallback: T, error: unknown): ServiceResult<T> {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error'
  return { data: fallback, error: message }
}

/** Soft-handle missing tables / RLS / network for demo */
export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string }
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    e.code === 'PGRST116' ||
    Boolean(e.message?.toLowerCase().includes('does not exist')) ||
    Boolean(e.message?.toLowerCase().includes('schema cache'))
  )
}

export function isDemoModeEnv(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    process.env.DEMO_MODE === 'true'
  )
}

/** Prefer demo data store when session is DEMO or env demo mode */
export function shouldUseDemoStore(): boolean {
  if (typeof window === 'undefined') return isDemoModeEnv()
  try {
    return useAuthStore.getState().demoMode || isDemoModeEnv()
  } catch {
    return isDemoModeEnv()
  }
}

export { getSupabase }
