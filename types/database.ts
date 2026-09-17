/**
 * Truck RSA Platform — database domain types.
 * Enums match supabase/migrations/001_rsa_schema.sql exactly (UPPERCASE).
 */

export type UserRole =
  | 'DRIVER'
  | 'COMPANY'
  | 'SERVICE_PROVIDER'
  | 'TECHNICIAN'
  | 'ADMIN'

export type AdminSubrole =
  | 'SUPER_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'DISPATCHER'
  | 'BILLING_ADMIN'
  | 'FINANCE_ADMIN'
  | 'SUPPORT_ADMIN'

export type CompanyRole =
  | 'OWNER'
  | 'FLEET_MANAGER'
  | 'DISPATCHER'
  | 'BILLING_MANAGER'
  | 'VIEWER'

export type CaseStatus =
  | 'DRAFT'
  | 'CREATED'
  | 'SEARCHING_PROVIDER'
  | 'PROVIDER_REQUESTED'
  | 'ASSIGNED'
  | 'PROVIDER_ACCEPTED'
  | 'PROVIDER_REJECTED'
  | 'TECHNICIAN_ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'INSPECTION'
  | 'ESTIMATE_SUBMITTED'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'REPAIR_STARTED'
  | 'WAITING_PARTS'
  | 'REPAIR_COMPLETED'
  | 'INVOICE_SUBMITTED'
  | 'INVOICE_REVIEW'
  | 'INVOICE_APPROVED'
  | 'INVOICE_REJECTED'
  | 'DISPUTED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED'
  | 'OUT_OF_NETWORK'

export type CasePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY'

export type ProviderAvailability =
  | 'OPEN'
  | 'BUSY'
  | 'FULL'
  | 'EMERGENCY_ONLY'
  | 'OFFLINE'
  | 'TEMPORARILY_UNAVAILABLE'

export type TechnicianStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'BUSY'
  | 'OFFLINE'

export type TruckType =
  | 'SEMI_TRUCK'
  | 'TRACTOR'
  | 'HEAVY_TRUCK'
  | 'COMMERCIAL_TRUCK'
  | 'BOX_TRUCK'
  | 'PICKUP_TRUCK_COMMERCIAL'
  | 'TRACTOR_TRAILER'
  | 'TRAILER'
  | 'REEFER_TRAILER'
  | 'FLATBED_TRAILER'
  | 'DRY_VAN'
  | 'HEAVY_COMMERCIAL'

export type DocumentStatus =
  | 'PENDING'
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'

export type InvoiceStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'VOID'

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED'

export type SupportTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED'

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'LOCATION'

export type NotificationEvent =
  | 'CASE_CREATED'
  | 'CASE_ASSIGNED'
  | 'CASE_STATUS_CHANGED'
  | 'PROVIDER_REQUESTED'
  | 'PROVIDER_ACCEPTED'
  | 'PROVIDER_REJECTED'
  | 'TECHNICIAN_ASSIGNED'
  | 'TECHNICIAN_EN_ROUTE'
  | 'TECHNICIAN_ARRIVED'
  | 'ESTIMATE_SUBMITTED'
  | 'ESTIMATE_APPROVED'
  | 'ESTIMATE_REJECTED'
  | 'INVOICE_SUBMITTED'
  | 'INVOICE_APPROVED'
  | 'INVOICE_REJECTED'
  | 'PAYMENT_RECEIVED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'MESSAGE_RECEIVED'
  | 'DOCUMENT_REQUIRED'
  | 'DOCUMENT_VERIFIED'
  | 'SUPPORT_TICKET_UPDATED'
  | 'PROVIDER_TIMEOUT_WARNING'
  | 'PROVIDER_TIMEOUT_ALERT'

export type RepairStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'COMPLETED'
  | 'CANCELLED'

/** Seeded service_categories.slug values (hyphenated, matching SQL) */
export type ServiceCategorySlug =
  | 'engine-failure'
  | 'truck-wont-start'
  | 'flat-tire'
  | 'tire-blowout'
  | 'multiple-tire-failure'
  | 'battery-dead'
  | 'brake-problem'
  | 'overheating'
  | 'transmission-problem'
  | 'electrical-problem'
  | 'fuel-delivery'
  | 'out-of-fuel'
  | 'trailer-problem'
  | 'reefer-problem'
  | 'accident-damage'
  | 'tow-required'
  | 'lockout'
  | 'other-truck-breakdown'

export type WorkOrderStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type EstimateStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'

export type PaymentMethod =
  | 'CARD'
  | 'ACH'
  | 'CHECK'
  | 'CASH'
  | 'CREDIT'
  | 'OTHER'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'STATUS_CHANGE'
  | 'ASSIGN'
  | 'PAYMENT'
  | 'OTHER'

/** Matches public.profiles */
export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  admin_subrole: AdminSubrole | null
  is_active: boolean
  last_seen_at: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  legal_name: string | null
  usdot: string | null
  mc_number: string | null
  ein: string | null
  phone: string | null
  email: string | null
  website: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string
  is_active: boolean
  is_verified: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  user_id: string
  cdl_number: string | null
  cdl_state: string | null
  cdl_class: string | null
  cdl_expiry: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  years_experience: number | null
  is_active: boolean
  /** Demo/convenience fields */
  company_id?: string | null
  full_name?: string | null
  phone?: string | null
  email?: string | null
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  company_id: string
  unit_number: string | null
  vin: string | null
  truck_type: TruckType
  make: string | null
  model: string | null
  year: number | null
  license_plate: string | null
  license_state: string | null
  color: string | null
  gross_vehicle_weight_lbs: number | null
  axle_count: number | null
  fuel_type: string | null
  is_active: boolean
  notes: string | null
  driver_id?: string | null
  created_at: string
  updated_at: string
}

export interface Trailer {
  id: string
  company_id: string
  unit_number: string | null
  vin: string | null
  truck_type: TruckType
  make: string | null
  model: string | null
  year: number | null
  license_plate: string | null
  license_state: string | null
  length_feet: number | null
  is_reefer: boolean
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ServiceProvider {
  id: string
  business_name: string
  legal_name: string | null
  usdot: string | null
  mc_number: string | null
  ein: string | null
  phone: string
  email: string | null
  website: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string
  latitude: number | null
  longitude: number | null
  availability: ProviderAvailability
  service_radius_miles: number | null
  average_rating: number | null
  total_reviews: number
  is_verified: boolean
  is_active: boolean
  accepts_emergency: boolean
  notes: string | null
  /** Demo: category slugs served */
  categories?: ServiceCategorySlug[] | null
  created_at: string
  updated_at: string
}

export interface Technician {
  id: string
  user_id?: string | null
  service_provider_id: string
  full_name?: string | null
  phone?: string | null
  email?: string | null
  status: TechnicianStatus
  current_latitude: number | null
  current_longitude: number | null
  is_active: boolean
  specialties?: ServiceCategorySlug[] | null
  created_at: string
  updated_at: string
}

export interface Case {
  id: string
  case_number: string
  company_id: string
  driver_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  service_category_id: string | null
  service_provider_id: string | null
  technician_id: string | null
  status: CaseStatus
  priority: CasePriority
  description: string | null
  breakdown_notes: string | null
  is_out_of_network: boolean
  requested_at: string | null
  assigned_at: string | null
  arrived_at: string | null
  completed_at: string | null
  closed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_by: string | null
  metadata: Record<string, unknown>
  /** Demo convenience (not always in SQL row) */
  category_slug?: ServiceCategorySlug | null
  title?: string | null
  is_safe?: boolean | null
  is_accident?: boolean | null
  is_highway?: boolean | null
  created_at: string
  updated_at: string
}

export interface CaseLocation {
  id: string
  case_id: string
  location_type: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  latitude: number | null
  longitude: number | null
  landmark: string | null
  highway: string | null
  mile_marker: string | null
  direction: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CaseStatusHistory {
  id: string
  case_id: string
  from_status: CaseStatus | null
  to_status: CaseStatus
  changed_by: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CaseAssignment {
  id: string
  case_id: string
  service_provider_id: string | null
  technician_id: string | null
  assigned_by: string | null
  assignment_type: string
  status: string
  requested_at: string
  responded_at: string | null
  expires_at: string | null
  response_notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkOrder {
  id: string
  case_id: string
  work_order_number: string
  service_provider_id: string | null
  technician_id: string | null
  status: WorkOrderStatus | string
  description: string | null
  started_at: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EstimateLineItem {
  id?: string
  description: string
  quantity: number
  unit_price_cents: number
  total_cents?: number
}

export interface Estimate {
  id: string
  case_id: string
  work_order_id: string | null
  service_provider_id: string | null
  status: EstimateStatus | string
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  valid_until: string | null
  notes: string | null
  submitted_at: string | null
  created_by: string | null
  line_items?: EstimateLineItem[] | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  case_id: string
  work_order_id: string | null
  service_provider_id: string | null
  company_id: string | null
  invoice_number: string
  status: InvoiceStatus
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  amount_paid_cents: number
  due_date: string | null
  notes: string | null
  submitted_at: string | null
  approved_at: string | null
  paid_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  company_id: string | null
  amount_cents: number
  currency: string
  payment_method: string | null
  status: PaymentStatus | string
  external_reference: string | null
  paid_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Dispute {
  id: string
  case_id: string
  invoice_id: string | null
  opened_by: string | null
  status: DisputeStatus
  reason: string
  description: string | null
  resolution: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  case_id: string | null
  service_provider_id: string | null
  technician_id: string | null
  reviewer_id: string | null
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id?: string | null
  case_id: string | null
  sender_id: string | null
  body: string | null
  message_type: MessageType
  attachment_url?: string | null
  read_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  event: NotificationEvent
  title: string
  body: string | null
  link: string | null
  case_id: string | null
  read_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: AuditAction | string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

/** Loose Supabase Database shape for client typing */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      companies: { Row: Company; Insert: Partial<Company>; Update: Partial<Company> }
      drivers: { Row: Driver; Insert: Partial<Driver>; Update: Partial<Driver> }
      vehicles: { Row: Vehicle; Insert: Partial<Vehicle>; Update: Partial<Vehicle> }
      trailers: { Row: Trailer; Insert: Partial<Trailer>; Update: Partial<Trailer> }
      service_providers: {
        Row: ServiceProvider
        Insert: Partial<ServiceProvider>
        Update: Partial<ServiceProvider>
      }
      technicians: {
        Row: Technician
        Insert: Partial<Technician>
        Update: Partial<Technician>
      }
      cases: { Row: Case; Insert: Partial<Case>; Update: Partial<Case> }
      case_locations: {
        Row: CaseLocation
        Insert: Partial<CaseLocation>
        Update: Partial<CaseLocation>
      }
      case_status_history: {
        Row: CaseStatusHistory
        Insert: Partial<CaseStatusHistory>
        Update: Partial<CaseStatusHistory>
      }
      case_assignments: {
        Row: CaseAssignment
        Insert: Partial<CaseAssignment>
        Update: Partial<CaseAssignment>
      }
      work_orders: {
        Row: WorkOrder
        Insert: Partial<WorkOrder>
        Update: Partial<WorkOrder>
      }
      estimates: { Row: Estimate; Insert: Partial<Estimate>; Update: Partial<Estimate> }
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      disputes: { Row: Dispute; Insert: Partial<Dispute>; Update: Partial<Dispute> }
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> }
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> }
      notifications: {
        Row: Notification
        Insert: Partial<Notification>
        Update: Partial<Notification>
      }
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      case_status: CaseStatus
      case_priority: CasePriority
      truck_type: TruckType
      provider_availability: ProviderAvailability
      technician_status: TechnicianStatus
      invoice_status: InvoiceStatus
      dispute_status: DisputeStatus
      message_type: MessageType
      notification_event: NotificationEvent
      repair_status: RepairStatus
      document_status: DocumentStatus
    }
  }
}
