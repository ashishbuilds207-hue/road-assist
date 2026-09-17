import type { CasePriority, ServiceCategorySlug } from '@/types/database'

export interface PriorityInput {
  isSafe?: boolean | null
  categorySlug?: ServiceCategorySlug | null
  isAccident?: boolean | null
  isHighway?: boolean | null
}

/**
 * Rule-based case priority — no AI.
 * Returns SQL-aligned UPPERCASE priorities.
 */
export function calculateCasePriority(input: PriorityInput): CasePriority {
  const { isSafe, categorySlug, isAccident, isHighway } = input

  // Unsafe, accident, or accident-damage → EMERGENCY
  if (
    isSafe === false ||
    isAccident === true ||
    categorySlug === 'accident-damage'
  ) {
    return 'EMERGENCY'
  }

  // Tire blowout / multiple tire / tow / brake → URGENT
  if (
    categorySlug === 'tire-blowout' ||
    categorySlug === 'multiple-tire-failure' ||
    categorySlug === 'tow-required' ||
    categorySlug === 'brake-problem' ||
    categorySlug === 'engine-failure' ||
    categorySlug === 'overheating'
  ) {
    return 'URGENT'
  }

  // Highway + serious mechanical → HIGH
  if (
    isHighway === true &&
    (categorySlug === 'transmission-problem' ||
      categorySlug === 'truck-wont-start' ||
      categorySlug === 'reefer-problem')
  ) {
    return 'HIGH'
  }

  if (isHighway === true) {
    return 'HIGH'
  }

  if (
    categorySlug === 'flat-tire' ||
    categorySlug === 'fuel-delivery' ||
    categorySlug === 'out-of-fuel' ||
    categorySlug === 'transmission-problem' ||
    categorySlug === 'electrical-problem' ||
    categorySlug === 'trailer-problem' ||
    categorySlug === 'reefer-problem' ||
    categorySlug === 'truck-wont-start'
  ) {
    return 'NORMAL'
  }

  if (categorySlug === 'battery-dead' || categorySlug === 'lockout') {
    return 'LOW'
  }

  return 'NORMAL'
}

export function priorityRank(priority: CasePriority): number {
  switch (priority) {
    case 'EMERGENCY':
      return 5
    case 'URGENT':
      return 4
    case 'HIGH':
      return 3
    case 'NORMAL':
      return 2
    case 'LOW':
      return 1
    default:
      return 0
  }
}
