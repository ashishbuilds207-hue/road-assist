import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
  shouldUseDemoStore,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/database'
import { InvoiceService } from '@/services/InvoiceService'
import { AuditService } from '@/services/AuditService'
import { getDemoData, useDemoDataStore } from '@/stores/demoDataStore'

export const PaymentService = {
  async listByInvoice(invoiceId: string): Promise<ServiceResult<Payment[]>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false })

      if (error) {
        if (isMissingRelationError(error)) return ok([])
        return fail([], error.message)
      }
      return ok((data as Payment[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async record(input: {
    invoice_id: string
    amount_cents: number
    currency?: string
    payment_method?: PaymentMethod | string | null
    external_reference?: string | null
    status?: PaymentStatus
    company_id?: string | null
  }): Promise<ServiceResult<Payment | null>> {
    try {
      const status = input.status ?? 'SUCCEEDED'
      const ts = new Date().toISOString()
      const payment: Payment = {
        id: `pay-${Date.now()}`,
        invoice_id: input.invoice_id,
        company_id: input.company_id ?? null,
        amount_cents: input.amount_cents,
        currency: input.currency ?? 'USD',
        payment_method: input.payment_method ?? null,
        status,
        external_reference: input.external_reference ?? null,
        paid_at: status === 'SUCCEEDED' ? ts : null,
        created_by: null,
        created_at: ts,
        updated_at: ts,
      }

      if (shouldUseDemoStore()) {
        const inv = getDemoData().invoices.find((i) => i.id === input.invoice_id)
        if (inv && status === 'SUCCEEDED') {
          const amountPaid = inv.amount_paid_cents + input.amount_cents
          const fullyPaid = amountPaid >= inv.total_cents
          useDemoDataStore.setState((s) => ({
            invoices: s.invoices.map((i) =>
              i.id === input.invoice_id
                ? {
                    ...i,
                    amount_paid_cents: amountPaid,
                    status: fullyPaid ? 'PAID' : 'PARTIALLY_PAID',
                    paid_at: fullyPaid ? ts : i.paid_at,
                    updated_at: ts,
                  }
                : i
            ),
          }))
          if (fullyPaid) {
            getDemoData().updateCaseStatus(inv.case_id, 'PAID')
          }
        }
        return ok(payment)
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('payments')
        .insert({
          invoice_id: input.invoice_id,
          company_id: input.company_id ?? null,
          amount_cents: input.amount_cents,
          currency: input.currency ?? 'USD',
          payment_method: input.payment_method ?? null,
          external_reference: input.external_reference ?? null,
          status,
          paid_at: status === 'SUCCEEDED' ? ts : null,
        } as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(payment)
        return fail(null, error.message)
      }

      if (status === 'SUCCEEDED') {
        const invoice = await InvoiceService.get(input.invoice_id)
        if (invoice.data) {
          const amountPaid =
            (invoice.data.amount_paid_cents ?? 0) + input.amount_cents
          const fullyPaid = amountPaid >= invoice.data.total_cents
          await InvoiceService.updateStatus(
            input.invoice_id,
            fullyPaid ? 'PAID' : 'PARTIALLY_PAID'
          )
          await supabase
            .from('invoices')
            .update({ amount_paid_cents: amountPaid } as never)
            .eq('id', input.invoice_id)
        }
      }

      await AuditService.log({
        action: 'PAYMENT',
        entity_type: 'payment',
        entity_id: (data as Payment).id,
        metadata: {
          invoice_id: input.invoice_id,
          amount_cents: input.amount_cents,
        },
      })

      return ok(data as Payment)
    } catch (e) {
      return fail(null, e)
    }
  },

  async updateStatus(
    id: string,
    status: PaymentStatus
  ): Promise<ServiceResult<Payment | null>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('payments')
        .update({
          status,
          paid_at: status === 'SUCCEEDED' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) return ok(null)
        return fail(null, error.message)
      }
      return ok(data as Payment)
    } catch (e) {
      return fail(null, e)
    }
  },
}
