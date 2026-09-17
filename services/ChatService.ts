import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { Message, MessageType } from '@/types/database'
import { getDemoData } from '@/stores/demoDataStore'

export const ChatService = {
  async listMessages(
    conversationId: string,
    opts?: { limit?: number }
  ): Promise<ServiceResult<Message[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData()
            .messages.filter((m) => m.conversation_id === conversationId)
            .slice(-(opts?.limit ?? 100))
        )
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(opts?.limit ?? 100)

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().messages.filter(
              (m) => m.conversation_id === conversationId
            )
          )
        }
        return fail([], error.message)
      }
      return ok((data as Message[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async listByCase(caseId: string): Promise<ServiceResult<Message[]>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(getDemoData().messages.filter((m) => m.case_id === caseId))
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(getDemoData().messages.filter((m) => m.case_id === caseId))
        }
        return fail([], error.message)
      }
      return ok((data as Message[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async sendMessage(input: {
    conversation_id?: string
    case_id?: string | null
    sender_id?: string | null
    body?: string | null
    message_type?: MessageType
    attachment_url?: string | null
  }): Promise<ServiceResult<Message | null>> {
    try {
      if (shouldUseDemoStore()) {
        return ok(
          getDemoData().addMessage({
            case_id: input.case_id,
            sender_id: input.sender_id,
            body: input.body ?? '',
            conversation_id: input.conversation_id,
          })
        )
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: input.conversation_id ?? input.case_id,
          case_id: input.case_id ?? null,
          sender_id: input.sender_id ?? null,
          body: input.body ?? null,
          message_type: input.message_type ?? 'TEXT',
          attachment_url: input.attachment_url ?? null,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok(
            getDemoData().addMessage({
              case_id: input.case_id,
              sender_id: input.sender_id,
              body: input.body ?? '',
              conversation_id: input.conversation_id,
            })
          )
        }
        return fail(null, error.message)
      }
      return ok(data as Message)
    } catch (e) {
      return fail(null, e)
    }
  },

  async markRead(messageId: string): Promise<ServiceResult<boolean>> {
    try {
      if (shouldUseDemoStore()) {
        const { useDemoDataStore } = await import('@/stores/demoDataStore')
        useDemoDataStore.setState((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId
              ? { ...m, read_at: new Date().toISOString() }
              : m
          ),
        }))
        return ok(true)
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() } as never)
        .eq('id', messageId)

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
