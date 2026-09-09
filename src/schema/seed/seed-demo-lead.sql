-- Sprint 1 review feedback (PO): "Team is not ready with data for the demo."
--
-- Seeds one realistic, fully-populated lead so the escalate -> tech review ->
-- finance review -> convert walkthrough can be demonstrated without anyone
-- typing data in front of the Product Owner. Safe to re-run: it deletes its
-- own previous seed row first and is scoped by the marker title below.
--
-- Prerequisites: run lead-assessment-context.sql and activities-on-leads.sql
-- first, and have at least one sales_rep profile in the org.
do $$
declare
    v_org_id uuid;
    v_rep_id uuid;
    v_company_id uuid;
    v_contact_id uuid;
    v_lead_id uuid;
begin
    select id into v_org_id from public.organizations order by created_at limit 1;
    if v_org_id is null then
        raise exception 'No organization found -- run seed-admin.sql first.';
    end if;

    select id into v_rep_id
    from public.profiles
    where org_id = v_org_id and role = 'sales_rep' and is_active
    order by created_at
    limit 1;

    if v_rep_id is null then
        raise exception 'No active sales_rep in the org -- invite one before seeding the demo lead.';
    end if;

    -- Clear any previous run of this seed.
    delete from public.leads
    where org_id = v_org_id and title = 'Northwind — warehouse rollout (demo)';

    insert into public.companies (org_id, name, industry, owner_id)
    values (v_org_id, 'Northwind Logistics (demo)', 'Logistics', v_rep_id)
    on conflict do nothing;

    select id into v_company_id
    from public.companies
    where org_id = v_org_id and name = 'Northwind Logistics (demo)'
    limit 1;

    insert into public.contacts (org_id, company_id, name, email, phone, owner_id)
    values (
        v_org_id, v_company_id, 'Priya Raman',
        'priya.raman@northwind-demo.test', '+94 77 555 0134', v_rep_id
    )
    returning id into v_contact_id;

    insert into public.leads (
        org_id, company_id, contact_id, owner_id, title, description,
        requirements, budget, expected_close_date, temperature, status
    )
    values (
        v_org_id, v_company_id, v_contact_id, v_rep_id,
        'Northwind — warehouse rollout (demo)',
        'Inbound enquiry from the logistics expo. Priya runs operations across four '
        || 'warehouses and wants a single view of stock movement before their Q4 peak.',
        E'- Replace three spreadsheet-based stock logs with one system\n'
        || E'- Barcode scanning on inbound and outbound at all four sites\n'
        || E'- Read-only dashboard for their finance team\n'
        || E'- Must integrate with their existing SAP export (CSV, nightly)\n'
        || E'- Go-live required before the Q4 peak in November',
        45000,
        (current_date + interval '45 days')::date,
        'hot',
        'new'
    )
    returning id into v_lead_id;

    -- The interaction history behind the Hot tag -- this is what the Tech and
    -- Finance leads read before they decide.
    insert into public.activities (org_id, lead_id, author_id, kind, body, created_at)
    values
        (v_org_id, v_lead_id, v_rep_id, 'call',
         'Intro call with Priya. Four sites, ~60 staff scanning daily. Current spreadsheet '
         || 'process loses roughly a day a week to reconciliation. Budget signed off internally.',
         now() - interval '9 days'),
        (v_org_id, v_lead_id, v_rep_id, 'meeting',
         'On-site visit at the Kelaniya warehouse. Walked the inbound process end to end. '
         || 'Confirmed the SAP nightly CSV export is the only integration they need.',
         now() - interval '5 days'),
        (v_org_id, v_lead_id, v_rep_id, 'note',
         'Tagged Hot: budget confirmed, decision maker engaged, hard November deadline.',
         now() - interval '5 days');

    raise notice 'Seeded demo lead %', v_lead_id;
end $$;
