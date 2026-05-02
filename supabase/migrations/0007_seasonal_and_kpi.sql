-- ============================================================================
-- Seasonal pricing on contracts + monthly KPI snapshots.
--
-- Northview's signed PO uses a month-to-month MSA with seasonal rates:
--   • May–Oct: $8,950 core + $950 MacDonald
--   • Nov–Apr: $12,500 core + $1,650 MacDonald
-- Generalised so every future seasonal contract works the same way.
-- ============================================================================

-- ─── Seasonal pricing on contracts ──────────────────────────────────────────
-- pricing_schedule is the source of truth for billing-run when present.
-- Shape:
--   {
--     "kind": "seasonal" | "flat",
--     "default_currency": "CAD",
--     "schedule": [
--       { "label":"summer", "months":[5,6,7,8,9,10], "monthly_cad":9900,
--         "components":[ {"label":"Core","monthly_cad":8950},
--                        {"label":"MacDonald add-on","monthly_cad":950} ] },
--       { "label":"winter", "months":[11,12,1,2,3,4], "monthly_cad":14150,
--         "components":[ ... ] }
--     ]
--   }
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pricing_schedule JSONB;

-- KPI targets specific to this contract (Northview's framework with thresholds).
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS kpi_targets JSONB DEFAULT '{}'::jsonb;

-- The contract→sites linkage. A single contract may cover N sites; we want
-- explicit linkage for billing line-items, KPI scoping, and the dashboard.
CREATE TABLE IF NOT EXISTS contract_sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contract_id    UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  site_id        UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  is_optional    BOOLEAN NOT NULL DEFAULT FALSE,
  added_at       DATE NOT NULL DEFAULT current_date,
  removed_at     DATE,
  notes          TEXT,
  UNIQUE (contract_id, site_id)
);
CREATE INDEX IF NOT EXISTS contract_sites_lookup ON contract_sites(contract_id, removed_at);

-- ─── KPI snapshots per contract per month ──────────────────────────────────
-- Computed by a monthly job (or on-demand from the dashboard). The contract
-- review meeting reads from here so historical KPI values don't drift if the
-- underlying data is amended later.
CREATE TABLE IF NOT EXISTS contract_kpi_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contract_id    UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  -- The five canonical KPI buckets from the Northview proposal.
  asset_protection      JSONB NOT NULL DEFAULT '{}'::jsonb,
  patrol_delivery       JSONB NOT NULL DEFAULT '{}'::jsonb,
  incident_response     JSONB NOT NULL DEFAULT '{}'::jsonb,
  hotspot_trends        JSONB NOT NULL DEFAULT '{}'::jsonb,
  maintenance_impact    JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_md      TEXT,           -- AI-written monthly review narrative
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS kpi_snap_lookup ON contract_kpi_snapshots(contract_id, period_start DESC);

-- ─── Post-order templates per site type (used by the generator) ─────────────
ALTER TABLE sites ADD COLUMN IF NOT EXISTS post_order_template TEXT;

-- Sites that participate in a residential portfolio benefit from a default
-- structure: entrance · lobby · parking · stairwells · laundry · perimeter.
-- The seed populates per-site overrides.

-- ─── RLS + audit on the new tenant tables ──────────────────────────────────
SELECT install_tenant_rls(t) FROM unnest(ARRAY[
  'contract_sites','contract_kpi_snapshots'
]) AS t;
SELECT install_audit_trigger(t) FROM unnest(ARRAY[
  'contract_sites','contract_kpi_snapshots'
]) AS t;

-- ─── A view: monthly patrol delivery per contract (used by the dashboard) ───
-- Patrol delivery = completed shifts ÷ scheduled shifts for sites under the
-- contract, scoped to the requested period. RLS works through the underlying
-- shifts/contract_sites/sites RLS.
CREATE OR REPLACE VIEW v_contract_patrol_delivery AS
SELECT
  c.org_id,
  c.id AS contract_id,
  date_trunc('month', s.scheduled_start) AS month_start,
  count(*)                              AS scheduled,
  count(*) FILTER (WHERE s.status = 'completed') AS completed,
  count(*) FILTER (WHERE s.status = 'no_show')   AS no_shows,
  count(*) FILTER (WHERE s.status = 'cancelled') AS cancelled,
  CASE WHEN count(*) > 0
    THEN round(100.0 * count(*) FILTER (WHERE s.status = 'completed') / count(*), 2)
    ELSE NULL END                                AS completion_pct
FROM contracts c
JOIN contract_sites cs ON cs.contract_id = c.id AND cs.removed_at IS NULL
JOIN shifts s          ON s.site_id      = cs.site_id
GROUP BY c.org_id, c.id, date_trunc('month', s.scheduled_start);
