'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  getPriorityLabel,
  getStatusLabel,
  PRIORITIES,
  CASE_STATUSES,
} from '@/types/rsa'
import type { CasePriority, CaseStatus } from '@/types/database'

const STATUS_VARIANT: Record<string, string> = {
  draft: 'grey-400',
  DRAFT: 'grey-400',
  submitted: 'blue',
  CREATED: 'blue',
  matching: 'purple',
  SEARCHING_PROVIDER: 'purple',
  PROVIDER_REQUESTED: 'purple',
  dispatched: 'purple',
  ASSIGNED: 'blue',
  accepted: 'green',
  PROVIDER_ACCEPTED: 'green',
  PROVIDER_REJECTED: 'red',
  TECHNICIAN_ASSIGNED: 'blue',
  en_route: 'orange',
  EN_ROUTE: 'orange',
  on_site: 'orange',
  ARRIVED: 'orange',
  INSPECTION: 'pending',
  in_progress: 'pending',
  REPAIR_STARTED: 'pending',
  WAITING_PARTS: 'pending',
  ESTIMATE_SUBMITTED: 'blue',
  WAITING_APPROVAL: 'pending',
  APPROVED: 'green',
  REPAIR_COMPLETED: 'green',
  completed: 'green',
  CLOSED: 'green',
  PAID: 'green',
  cancelled: 'grey-500',
  CANCELLED: 'grey-500',
  disputed: 'red',
  DISPUTED: 'red',
  OUT_OF_NETWORK: 'orange',
}

const PRIORITY_VARIANT: Record<string, string> = {
  low: 'grey-400',
  LOW: 'grey-400',
  medium: 'blue',
  NORMAL: 'blue',
  high: 'orange',
  HIGH: 'orange',
  critical: 'danger',
  URGENT: 'danger',
  EMERGENCY: 'danger',
}

function labelForStatus(status: string): string {
  const fromRsa = CASE_STATUSES.find((s) => s.value === (status as never))
  if (fromRsa) return fromRsa.label
  try {
    return getStatusLabel(status as CaseStatus)
  } catch {
    return status.replace(/_/g, ' ')
  }
}

function labelForPriority(priority: string): string {
  const fromRsa = PRIORITIES.find((p) => p.value === (priority as never))
  if (fromRsa) return fromRsa.label
  try {
    return getPriorityLabel(priority as CasePriority)
  } catch {
    return priority
  }
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const variant = (STATUS_VARIANT[status] ?? 'grey-400') as
    | 'default'
    | 'primary'
    | 'outline'
    | 'success'
    | 'pending'
    | 'danger'
    | 'orange'
    | 'green'
    | 'blue'
    | 'purple'
    | 'red'
    | 'grey'
    | 'grey-700'
    | 'grey-600'
    | 'grey-500'
    | 'grey-400'
    | 'grey-300'

  return (
    <Badge variant={variant} size="small" className={cn(className)}>
      {labelForStatus(status)}
    </Badge>
  )
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: string
  className?: string
}) {
  const variant = (PRIORITY_VARIANT[priority] ?? 'outline') as
    | 'default'
    | 'primary'
    | 'outline'
    | 'success'
    | 'pending'
    | 'danger'
    | 'orange'
    | 'green'
    | 'blue'
    | 'purple'
    | 'red'
    | 'grey'
    | 'grey-400'

  return (
    <Badge variant={variant} size="small" className={cn(className)}>
      {labelForPriority(priority)}
    </Badge>
  )
}
