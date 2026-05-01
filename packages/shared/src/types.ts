// Hand-curated type definitions matched to supabase/migrations/0001_foundation.sql.
// In production, run `supabase gen types typescript` to refresh from the live schema.
// This file exists so the app types are TRUE to the schema today instead of drifting.

import type { ServiceLine } from './service-lines.js';

export type Region = 'AB' | 'BC' | 'SK' | 'MB' | 'ON' | 'QC' | 'NB' | 'NS' | 'PE' | 'NL' | 'YT' | 'NT' | 'NU';

export type UserRole =
  | 'owner' | 'admin' | 'manager' | 'dispatcher' | 'supervisor'
  | 'guard' | 'it_tech' | 'transport_officer' | 'client' | 'viewer';

export type IncidentCategory =
  | 'trespass' | 'vandalism' | 'theft' | 'disturbance' | 'medical' | 'fire'
  | 'maintenance' | 'suspicious_activity' | 'vehicle' | 'cyber' | 'transport' | 'other';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'escalated' | 'closed';

export type ShiftStatus =
  | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

export interface Org {
  id: string;
  name: string;
  slug: string;
  region: Region;
  timezone: string;
  ssia_license: string | null;
  service_lines: ServiceLine[];
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  auth_user_id: string | null;
  org_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  org_id: string;
  account_number: string | null;
  name: string;
  industry: string | null;
  tier: 'Essential' | 'Enhanced' | 'Premium' | 'Enterprise' | null;
  status: 'prospect' | 'active' | 'paused' | 'churned';
  service_lines: ServiceLine[];
  primary_contact: { name?: string; email?: string; phone?: string } | null;
  portal_enabled: boolean;
  health_score: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  org_id: string;
  client_id: string;
  name: string;
  city: string | null;
  region: Region | null;
  site_type: 'residential' | 'commercial' | 'industrial' | 'oil_gas' | 'construction' | 'retail' | 'healthcare' | 'hospitality' | 'government' | 'education' | 'remote' | 'other';
  remote: boolean;
  hazards: string[];
  service_lines: ServiceLine[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Guard {
  id: string;
  org_id: string;
  user_profile_id: string | null;
  partner_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated' | 'probation';
  employment_type: 'hourly' | 'salary' | 'contractor';
  hourly_rate: number | null;
  ssia_license_number: string | null;
  ssia_license_expiry: string | null;
  first_aid_expiry: string | null;
  drivers_license_expiry: string | null;
  certifications: Array<{ type: string; issuer?: string; number?: string; expiry?: string }>;
  fatigue_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  org_id: string;
  guard_id: string;
  site_id: string;
  scheduled_start: string;
  scheduled_end: string;
  shift_type: 'standard' | 'overnight' | 'split' | 'on_call' | 'event';
  status: ShiftStatus;
  actual_start: string | null;
  actual_end: string | null;
  hours_worked: number | null;
  overtime_hours: number;
  bill_rate: number | null;
  pay_rate: number | null;
  generated_by_ai: boolean;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  org_id: string;
  site_id: string;
  reported_by_guard_id: string | null;
  shift_id: string | null;
  incident_number: string | null;
  title: string;
  description: string | null;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred_at: string;
  police_called: boolean;
  raw_narration: string | null;
  ai_structured: Record<string, unknown> | null;
  ai_confidence: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CameraAlert {
  id: string;
  org_id: string;
  camera_id: string;
  site_id: string;
  detected_at: string;
  detection_type: string;
  confidence: number | null;
  clip_url: string | null;
  thumbnail_url: string | null;
  triage_status: 'pending' | 'dismissed' | 'escalated' | 'resolved' | 'false_positive';
  incident_id: string | null;
  ai_summary: string | null;
}

export interface AIInsight {
  id: string;
  org_id: string;
  surface: string;
  scope_type: string | null;
  scope_id: string | null;
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: string | null;
  citations: Array<{ table: string; id: string; note?: string }>;
  acknowledged_at: string | null;
  dismissed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  org_id: string;
  source: string | null;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  industry: string | null;
  service_lines_interest: ServiceLine[];
  ai_score: number | null;
  ai_summary: string | null;
  stage: 'new' | 'contacted' | 'qualified' | 'quoted' | 'won' | 'lost' | 'dormant';
  priority: 'low' | 'medium' | 'high' | 'hot';
  created_at: string;
  updated_at: string;
}

export interface SecurityAssessment {
  id: string;
  org_id: string;
  lead_id: string | null;
  client_id: string | null;
  inputs: Record<string, unknown>;
  ai_recommendation: {
    summary: string;
    recommended_services: Array<{ service: ServiceLine; hours_per_week?: number; one_time?: boolean; rationale: string }>;
    estimated_monthly_cad: number;
    estimated_oneoff_cad?: number;
    risks_flagged: string[];
    rationale_md: string;
  } | null;
  estimated_monthly_cad: number | null;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface TransportRun {
  id: string;
  org_id: string;
  client_id: string;
  vehicle_id: string | null;
  primary_officer_id: string | null;
  secondary_officer_id: string | null;
  run_number: string | null;
  cargo_type: string | null;
  cargo_value_cad: number | null;
  scheduled_pickup: string;
  scheduled_dropoff: string;
  status: 'scheduled' | 'en_route_pickup' | 'at_pickup' | 'in_transit' | 'at_dropoff' | 'completed' | 'cancelled' | 'exception';
}
