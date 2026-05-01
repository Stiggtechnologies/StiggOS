-- ============================================================================
-- Development seed. Loads only when org slug 'stigg' does not yet exist.
-- Safe to re-run.
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID;
  v_client_northview UUID;
  v_client_canadiantire UUID;
  v_site_fm UUID;
  v_site_calgary UUID;
  v_guard_jemal UUID;
  v_guard_solomon UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM orgs WHERE slug = 'stigg') THEN
    RAISE NOTICE 'Seed skipped — org "stigg" already exists.';
    RETURN;
  END IF;

  INSERT INTO orgs(name, slug, legal_name, region, timezone, ssia_license, gst_number, hq_address)
  VALUES ('Stigg Security', 'stigg', 'Stigg Security Inc.', 'AB', 'America/Edmonton',
          'AB-SSIA-XXXXXX', '1234567890RT0001',
          jsonb_build_object('street','200 Parent Way','city','Fort McMurray','province','AB','postal','T9H 5E6'))
  RETURNING id INTO v_org_id;

  INSERT INTO clients(org_id, name, industry, tier, status, service_lines, primary_contact, portal_enabled)
  VALUES
    (v_org_id, 'Northview Residential REIT', 'real_estate', 'Premium', 'active', ARRAY['guarding','virtual_guard'],
      jsonb_build_object('name','Property Manager','email','pm@northview.example'), TRUE)
  RETURNING id INTO v_client_northview;

  INSERT INTO clients(org_id, name, industry, tier, status, service_lines, primary_contact, portal_enabled)
  VALUES
    (v_org_id, 'Canadian Tire (Calgary)', 'retail', 'Enhanced', 'active', ARRAY['guarding','surveillance'],
      jsonb_build_object('name','Loss Prevention','email','lp@canadiantire.example'), TRUE)
  RETURNING id INTO v_client_canadiantire;

  INSERT INTO clients(org_id, name, industry, tier, status, service_lines)
  VALUES (v_org_id, 'Mainstreet Equity', 'real_estate', 'Enhanced', 'active', ARRAY['guarding']);

  INSERT INTO clients(org_id, name, industry, tier, status, service_lines)
  VALUES (v_org_id, 'Suncor — Mildred Lake', 'oil_gas', 'Enterprise', 'prospect', ARRAY['guarding','virtual_guard','it_security']);

  INSERT INTO partners(org_id, name, partner_type, contact, is_active)
  VALUES
    (v_org_id, 'Mikisew Group', 'indigenous_jv', jsonb_build_object('email','partnerships@mikisew.example'), TRUE),
    (v_org_id, 'Fort McKay Group of Companies', 'indigenous_jv', jsonb_build_object('email','partnerships@fortmckay.example'), TRUE);

  INSERT INTO sites(org_id, client_id, name, city, region, geo, geofence_radius_m, site_type, remote, hazards, service_lines)
  VALUES
    (v_org_id, v_client_northview, 'Northview REIT #5', 'Fort McMurray', 'AB',
      ST_SetSRID(ST_MakePoint(-111.3790, 56.7263), 4326)::GEOGRAPHY, 150, 'residential', FALSE, '{}', ARRAY['guarding','virtual_guard'])
  RETURNING id INTO v_site_fm;

  INSERT INTO sites(org_id, client_id, name, city, region, geo, geofence_radius_m, site_type, remote, hazards, service_lines)
  VALUES
    (v_org_id, v_client_canadiantire, 'Canadian Tire — Deerfoot', 'Calgary', 'AB',
      ST_SetSRID(ST_MakePoint(-114.0719, 51.0447), 4326)::GEOGRAPHY, 120, 'retail', FALSE, '{}', ARRAY['guarding','surveillance'])
  RETURNING id INTO v_site_calgary;

  INSERT INTO sites(org_id, client_id, name, city, region, site_type, remote, hazards, service_lines)
  VALUES
    (v_org_id, (SELECT id FROM clients WHERE name LIKE 'Suncor%' AND org_id = v_org_id),
      'Suncor — Mildred Lake Lease 86', 'Fort McMurray', 'AB', 'oil_gas', TRUE,
      ARRAY['cold_weather','wildlife','remote'], ARRAY['guarding','virtual_guard']);

  INSERT INTO guards(org_id, first_name, last_name, email, phone, hourly_rate, status, employment_type,
                     ssia_license_number, ssia_license_expiry, first_aid_expiry)
  VALUES
    (v_org_id, 'Jemal', 'Hassan', 'jemal@stigg.example', '+1-587-555-0101', 19.00, 'active', 'hourly',
      'AB-12345', current_date + INTERVAL '90 days', current_date + INTERVAL '180 days')
  RETURNING id INTO v_guard_jemal;

  INSERT INTO guards(org_id, first_name, last_name, email, hourly_rate, status, employment_type,
                     ssia_license_number, ssia_license_expiry)
  VALUES
    (v_org_id, 'Solomon', 'Abdi', 'solomon@stigg.example', 18.00, 'active', 'hourly',
      'AB-12346', current_date + INTERVAL '25 days')   -- expiring soon — drives compliance insight
  RETURNING id INTO v_guard_solomon;

  INSERT INTO guards(org_id, first_name, last_name, hourly_rate, status, employment_type,
                     ssia_license_number, ssia_license_expiry)
  VALUES
    (v_org_id, 'Jean', 'Marie', 19.00, 'active', 'hourly', 'AB-12347', current_date + INTERVAL '120 days'),
    (v_org_id, 'Kanwal', 'Singh', 23.25, 'active', 'salary', 'AB-12348', current_date + INTERVAL '300 days');

  INSERT INTO shifts(org_id, guard_id, site_id, scheduled_start, scheduled_end, shift_type, status,
                     bill_rate, pay_rate)
  VALUES
    (v_org_id, v_guard_jemal, v_site_fm,
      now() - INTERVAL '2 hours', now() + INTERVAL '6 hours', 'overnight', 'in_progress', 32.00, 19.00),
    (v_org_id, v_guard_solomon, v_site_calgary,
      now() - INTERVAL '1 hours', now() + INTERVAL '7 hours', 'overnight', 'in_progress', 28.00, 18.00);

  INSERT INTO incidents(org_id, site_id, reported_by_guard_id, title, description,
                        category, severity, status, occurred_at, raw_narration)
  VALUES
    (v_org_id, v_site_fm, v_guard_jemal,
      'Attempted breach at east entrance',
      'Motion sensor triggered on east loading bay door at 02:14. Patrol confirmed door intact, no entry. Two individuals observed leaving in dark sedan, partial plate ABC-1.',
      'trespass', 'high', 'investigating', now() - INTERVAL '4 hours',
      'so I was at northview 5 around 2 AM and the motion alarm went off on the east loading door — got there fast, door was fine but two guys jumped into a dark sedan, only got partial plate, A B C 1, then they peeled off');

  INSERT INTO leads(org_id, source, name, company, email, phone, city, industry,
                    service_lines_interest, ai_score, stage, priority)
  VALUES
    (v_org_id, 'website', 'Sandra Polson', 'Casman Group', 'sandra@casman.example',
      '+1-780-555-0199', 'Fort McMurray', 'construction',
      ARRAY['guarding','surveillance'], 78, 'qualified', 'high');

END $$;
