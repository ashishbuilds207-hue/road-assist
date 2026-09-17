'use client'

import { create } from 'zustand'

export type FilterValue = string | number | boolean | null | undefined

export type FiltersMap = Record<string, FilterValue>

interface FilterState {
  filters: FiltersMap
  setFilter: (key: string, value: FilterValue) => void
  setFilters: (filters: FiltersMap) => void
  clearFilter: (key: string) => void
  clearFilters: () => void
  getFilter: <T extends FilterValue = FilterValue>(key: string) => T | undefined
}

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: {},

  setFilter: (key, value) =>
    set((s) => {
      if (value === null || value === undefined || value === '') {
        const next = { ...s.filters }
        delete next[key]
        return { filters: next }
      }
      return { filters: { ...s.filters, [key]: value } }
    }),

  setFilters: (filters) =>
    set((s) => ({
      filters: { ...s.filters, ...filters },
    })),

  clearFilter: (key) =>
    set((s) => {
      const next = { ...s.filters }
      delete next[key]
      return { filters: next }
    }),

  clearFilters: () => set({ filters: {} }),

  getFilter: <T extends FilterValue = FilterValue>(key: string) =>
    get().filters[key] as T | undefined,
}))
