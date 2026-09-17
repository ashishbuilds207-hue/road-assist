'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CaseService,
  type CreateCaseInput,
  type ListCasesParams,
} from '@/services/CaseService'
import type { CaseStatus } from '@/types/database'
import { useRealtime } from '@/hooks/useRealtime'
import { shouldUseDemoStore } from '@/services/_helpers'

/** Poll often in DEMO so cross-tab/role Zustand persist updates show without refresh */
const DEMO_REFETCH_MS = 2500

function demoRefetchInterval() {
  return shouldUseDemoStore() ? DEMO_REFETCH_MS : false
}

export function useCases(params: ListCasesParams = {}) {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: async () => {
      const res = await CaseService.listCases(params)
      if (res.error && res.data.length === 0) {
        // Soft fallback — empty list when tables missing
        return []
      }
      return res.data
    },
    refetchInterval: demoRefetchInterval(),
  })
}

export function useCase(id: string | null | undefined) {
  return useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      if (!id) return null
      const res = await CaseService.getCase(id)
      return res.data
    },
    enabled: Boolean(id),
    refetchInterval: demoRefetchInterval(),
  })
}

export function useCaseTimeline(caseId: string | null | undefined) {
  return useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: async () => {
      if (!caseId) return []
      const res = await CaseService.getTimeline(caseId)
      return res.data
    },
    enabled: Boolean(caseId),
    refetchInterval: demoRefetchInterval(),
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCaseInput) => {
      const res = await CaseService.createCase(input)
      if (res.error && !res.data) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export function useUpdateCaseStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      caseId: string
      status: CaseStatus
      note?: string
      changed_by?: string | null
    }) => {
      const res = await CaseService.updateStatus(input.caseId, input.status, {
        note: input.note,
        changed_by: input.changed_by,
      })
      if (res.error && !res.data) throw new Error(res.error)
      return res.data
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] })
      void queryClient.invalidateQueries({ queryKey: ['case', vars.caseId] })
      void queryClient.invalidateQueries({
        queryKey: ['case-timeline', vars.caseId],
      })
    },
  })
}

/** Realtime refresh for cases list */
export function useCasesRealtime(enabled = true) {
  const queryClient = useQueryClient()
  useRealtime({
    channelName: 'cases:list',
    table: 'cases',
    enabled,
    onPayload: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export function useMatchProviders(input: {
  categorySlug?: Parameters<typeof CaseService.matchProviders>[0]['categorySlug']
  state?: string | null
  city?: string | null
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['match-providers', input.categorySlug, input.state, input.city],
    queryFn: async () => {
      const res = await CaseService.matchProviders({
        categorySlug: input.categorySlug,
        state: input.state,
        city: input.city,
      })
      return res.data
    },
    enabled: input.enabled !== false,
  })
}
