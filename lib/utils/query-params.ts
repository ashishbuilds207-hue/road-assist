export type QueryParamValue = string | number | boolean | null | undefined

export type QueryParamsMap = Record<string, QueryParamValue>

const FILTER_KEYS = [
  'page',
  'limit',
  'status',
  'search',
  'from',
  'to',
  'state',
  'city',
  'priority',
  'category',
  'companyId',
  'providerId',
  'driverId',
  'technicianId',
  'sort',
  'order',
] as const

export type FilterKey = (typeof FILTER_KEYS)[number]

/**
 * Read a single query param from a URLSearchParams / URL / search string.
 */
export function getQueryParam(
  source: URLSearchParams | URL | string | null | undefined,
  key: string,
  fallback = ''
): string {
  if (!source) return fallback
  let params: URLSearchParams
  if (typeof source === 'string') {
    params = new URLSearchParams(
      source.startsWith('?') ? source.slice(1) : source
    )
  } else if (source instanceof URL) {
    params = source.searchParams
  } else {
    params = source
  }
  const value = params.get(key)
  return value ?? fallback
}

/**
 * Build or merge query params for filter URLs.
 * Omits null/undefined/empty values. Returns a search string without leading `?`
 * unless `asSearch` is true.
 */
export function setQueryParams(
  current: URLSearchParams | URL | string | null | undefined,
  updates: QueryParamsMap,
  options?: { asSearch?: boolean; replace?: boolean }
): string {
  const { asSearch = false, replace = false } = options ?? {}
  let params: URLSearchParams

  if (replace || !current) {
    params = new URLSearchParams()
  } else if (typeof current === 'string') {
    params = new URLSearchParams(
      current.startsWith('?') ? current.slice(1) : current
    )
  } else if (current instanceof URL) {
    params = new URLSearchParams(current.searchParams)
  } else {
    params = new URLSearchParams(current)
  }

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      params.delete(key)
      return
    }
    params.set(key, String(value))
  })

  const qs = params.toString()
  return asSearch ? (qs ? `?${qs}` : '') : qs
}

/** Parse common list filters from search params */
export function parseListFilters(
  source: URLSearchParams | URL | string | null | undefined
) {
  const page = Math.max(1, Number(getQueryParam(source, 'page', '1')) || 1)
  const limit = Math.min(
    100,
    Math.max(1, Number(getQueryParam(source, 'limit', '20')) || 20)
  )

  return {
    page,
    limit,
    status: getQueryParam(source, 'status') || undefined,
    search: getQueryParam(source, 'search') || undefined,
    from: getQueryParam(source, 'from') || undefined,
    to: getQueryParam(source, 'to') || undefined,
    state: getQueryParam(source, 'state') || undefined,
    city: getQueryParam(source, 'city') || undefined,
    priority: getQueryParam(source, 'priority') || undefined,
    category: getQueryParam(source, 'category') || undefined,
    companyId: getQueryParam(source, 'companyId') || undefined,
    providerId: getQueryParam(source, 'providerId') || undefined,
    driverId: getQueryParam(source, 'driverId') || undefined,
    technicianId: getQueryParam(source, 'technicianId') || undefined,
    sort: getQueryParam(source, 'sort', 'created_at'),
    order: (getQueryParam(source, 'order', 'desc') as 'asc' | 'desc') || 'desc',
  }
}
