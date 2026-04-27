export interface Organization {
  id: string
  name: string
  address: string
  phone: string
  email: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  org_id: string
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  billing_address: string
  monthly_value: number
  contract_status: 'active' | 'pending' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  client_id: string
  name: string
  address: string
  city: string
  province: string
  postal_code: string
  site_type: 'residential' | 'commercial' | 'industrial'
  square_footage: number
  access_points: number
  created_at: string
  updated_at: string
}

export interface Guard {
  id: string
  org_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  hire_date: string
  status: 'active' | 'off_duty' | 'on_leave' | 'terminated'
  hourly_rate: number
  certifications: string[]
  current_assignment_id?: string
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  guard_id: string
  site_id: string
  start_time: string
  end_time: string
  shift_type: 'day' | 'night' | 'weekend'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface Incident {
  id: string
  org_id: string
  site_id: string
  guard_id?: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  incident_type: string
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  reported_at: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  client_id: string
  invoice_number: string
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issue_date: string
  due_date: string
  paid_date?: string
  created_at: string
  updated_at: string
}

export interface PayrollLiability {
  id: string
  org_id: string
  guard_id: string
  amount: number
  period_start: string
  period_end: string
  status: 'accrued' | 'paid' | 'pending'
  created_at: string
  updated_at: string
}

export interface Patrol {
  id: string
  guard_id: string
  site_id: string
  start_time: string
  end_time?: string
  status: 'active' | 'completed' | 'paused'
  route_id?: string
  checkpoint_count: number
  created_at: string
  updated_at: string
}

export interface Checkpoint {
  id: string
  patrol_id: string
  location: string
  timestamp: string
  lat: number
  lng: number
  notes?: string
  created_at: string
}

export interface Contract {
  id: string
  client_id: string
  contract_number: string
  start_date: string
  end_date: string
  monthly_value: number
  services: string[]
  status: 'active' | 'pending' | 'expired' | 'terminated'
  created_at: string
  updated_at: string
}

export interface KPIScore {
  id: string
  org_id: string
  category: 'response_time' | 'incident_resolution' | 'guard_satisfaction' | 'client_satisfaction' | 'compliance'
  score: number
  target: number
  period: string
  created_at: string
}

export interface Route {
  id: string
  site_id: string
  name: string
  description: string
  checkpoints: string[]
  estimated_duration_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  org_id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'supervisor' | 'guard'
  avatar_url?: string
  created_at: string
  updated_at: string
}
