export interface Finding {
  rule_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  scope_type: 'guard' | 'site' | 'client' | 'contract' | 'org';
  scope_id?: string;
  title: string;
  description: string;
  regulatory_anchor: string;       // e.g. 'AB SSIA s.13', 'PIPEDA s.10.1', 'AB OHS s.198'
  recommended_action: string;
  due_by?: string;                 // ISO date
  citations: Array<{ table: string; id: string; note?: string }>;
}

export interface ComplianceContext {
  org_id: string;
  region?: string;                 // 'AB' default
  /** Inputs the rules need. Caller fetches these from the DB. */
  guards: Array<{
    id: string;
    first_name: string;
    last_name: string;
    status: string;
    ssia_license_number: string | null;
    ssia_license_expiry: string | null;
    first_aid_expiry: string | null;
    drivers_license_expiry: string | null;
    certifications: Array<{ type: string; expiry?: string }>;
  }>;
  sites: Array<{
    id: string;
    name: string;
    site_type: string;
    remote: boolean;
    hazards: string[];
  }>;
  contracts: Array<{
    id: string;
    client_id: string;
    end_date: string | null;
    status: string;
  }>;
  privacy_breaches: Array<{
    id: string;
    detected_at: string;
    notification_sent: boolean;
    opc_reported: boolean;
    records_affected: number | null;
  }>;
  /** Today (UTC). Lets tests pin time. */
  now?: Date;
}

export type RuleFn = (ctx: ComplianceContext) => Promise<Finding[] | null> | Finding[] | null;
