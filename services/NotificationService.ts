import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { Notification, NotificationEvent } from '@/types/database'
import { getDemoData } from '@/stores/demoDataStore'

export const NotificationService = {
  async list(userId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
    try {
      if (shouldUseDemoStore()) {
        let list = getDemoData().notifications.filter((n) => n.user_id === userId)
        if (opts?.unreadOnly) list = list.filter((n) => !n.read_at)
        return ok(list.slice(0, opts?.limit ?? 50))
      }

      const supabase = getSupabase()
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(opts?.limit ?? 50)

      if (opts?.unreadOnly) query = query.is('read_at', null)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().notifications.filter((n) => n.user_id === userId)
          )
        }
        return fail([] as Notification[], error.message)
      }
      return ok((data as Notification[]) ?? [])
    } catch (e) {
      return fail([] as Notification[], e)
    }
  },

  async getUnreadCount(userId: string): Promise<ServiceResult<number>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().notifications.filter(
            (n) => n.user_id === userId && !n.read_at
          ).length
        )
      }

      const supabase = getSupabase()
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().notifications.filter(
              (n) => n.user_id === userId && !n.read_at
            ).length
          )
        }
        return fail(0, error.message)
      }
      return ok(count ?? 0)
    } catch (e) {
      return fail(0, e)
    }
  },

  async create(input: {
    user_id: string
    event: NotificationEvent
    title: string
    body?: string | null
    link?: string | null
    case_id?: string | null
  }): Promise<ServiceResult<Notification | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().addNotification({
            user_id: input.user_id,
            event: input.event,
            title: input.title,
            body: input.body ?? undefined,
            link: input.link,
            case_id: input.case_id,
          })
        )
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: input.user_id,
          event: input.event,
          title: input.title,
          body: input.body ?? null,
          link: input.link ?? null,
          case_id: input.case_id ?? null,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().addNotification({
              user_id: input.user_id,
              event: input.event,
              title: input.title,
              body: input.body ?? undefined,
              link: input.link,
              case_id: input.case_id,
            })
          )
        }
        return fail(null, error.message)
      }
      return ok(data as Notification)
    } catch (e) {
      return fail(null, e)
    }
  },

  async markRead(id: string): Promise<ServiceResult<boolean>> {
    try {
      if (shouldUseDemoStore()) {
        const { useDemoDataStore } = await import('@/stores/demoDataStore')
        useDemoDataStore.setState((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n
          ),
        }))
        return ok(true)
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() } as never)
        .eq('id', id)

      if (error) {
        if (isMissingRelationError(error)) return ok(false)
        return fail(false, error.message)
      }
      return ok(true)
    } catch (e) {
      return fail(false, e)
    }
  },

  async markAllRead(userId: string): Promise<ServiceResult<boolean>> {
    try {
      if (shouldUseDemoStore()) {
        const { useDemoDataStore } = await import('@/stores/demoDataStore')
        const ts = new Date().toISOString()
        useDemoDataStore.setState((s) => ({
          notifications: s.notifications.map((n) =>
            n.user_id === userId && !n.read_at ? { ...n, read_at: ts } : n
          ),
        }))
        return ok(true)
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() } as never)
        .eq('user_id', userId)
        .is('read_at', null)

      if (error) {
        if (isMissingRelationError(error)) return ok(false)
        return fail(false, error.message)
      }
      return ok(true)
    } catch (e) {
      return fail(false, e)
    }
  },
}
