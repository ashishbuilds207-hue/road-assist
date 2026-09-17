import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** Singleton-style helper for services */
let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (typeof window === 'undefined') {
    return createClient()
  }
  if (!browserClient) {
    browserClient = createClient()
  }
  return browserClient
}
