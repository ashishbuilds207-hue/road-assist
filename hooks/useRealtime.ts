'use client'

import { useEffect, useRef } from 'react'
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export type UseRealtimeOptions<T extends object = Record<string, unknown>> = {
  /** Unique channel name — prevents duplicate subscriptions */
  channelName: string
  table: string
  schema?: string
  event?: RealtimeEvent
  filter?: string
  enabled?: boolean
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void
}

const activeChannels = new Map<string, RealtimeChannel>()

/**
 * Subscribe to Supabase table changes with cleanup.
 * Duplicate channel names are reused / replaced safely.
 */
export function useRealtime<T extends object = Record<string, unknown>>(
  options: UseRealtimeOptions<T>
) {
  const {
    channelName,
    table,
    schema = 'public',
    event = '*',
    filter,
    enabled = true,
    onPayload,
  } = options

  const onPayloadRef = useRef(onPayload)
  onPayloadRef.current = onPayload

  useEffect(() => {
    if (!enabled || !channelName) return

    const supabase = getSupabase()

    // Remove existing channel with same name to prevent duplicates
    const existing = activeChannels.get(channelName)
    if (existing) {
      void supabase.removeChannel(existing)
      activeChannels.delete(channelName)
    }

    const config: {
      event: RealtimeEvent
      schema: string
      table: string
      filter?: string
    } = { event, schema, table }
    if (filter) config.filter = filter

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        config as never,
        (payload: RealtimePostgresChangesPayload<T>) => {
          onPayloadRef.current(payload)
        }
      )
      .subscribe()

    activeChannels.set(channelName, channel)

    return () => {
      const current = activeChannels.get(channelName)
      if (current) {
        void supabase.removeChannel(current)
        activeChannels.delete(channelName)
      }
    }
  }, [channelName, table, schema, event, filter, enabled])
}
