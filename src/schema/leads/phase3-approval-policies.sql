-- Phase 3: Lead Approval workflow (US-10 to US-13). Additive to the
-- policies in rls-policies.sql -- run this after that file.
--
-- These policies gate which ROWS/roles can update a lead at each step of
-- the workflow; the exact column set touched at each step is enforced by
-- the dedicated server functions in leads.ts (escalateLead,
-- reviewTechnicalFeasibility, reviewFinancialViability, markLeadCold),
-- matching the app-level-enforcement pattern already used elsewhere in
-- this project (see users.ts). Admin has no override on this workflow --
-- confirmed against the team's use case diagram.

-- US-10: Sales Manager escalates a new, Hot-tagged lead to a Tech Lead.
create policy "leads_update_sales_manager_escalate"
on public.leads for update
to authenticated
using (
    org_id = public.current_user_org()
    and public.current_user_role() = 'sales_manager'
    and status = 'new'
    and temperature = 'hot'
)
with check (
    org_id = public.current_user_org()
    and public.current_user_role() = 'sales_manager'
    and status = 'escalated'
);

-- US-11: the assigned Tech Lead reviews an escalated lead.
create policy "leads_update_tech_review"
on public.leads for update
to authenticated
using (
    org_id = public.current_user_org()
    and public.current_user_role() = 'tech_lead'
    and tech_lead_id = auth.uid()
    and status = 'escalated'
)
with check (
    org_id = public.current_user_org()
    and public.current_user_role() = 'tech_lead'
    and tech_lead_id = auth.uid()
    and status in ('tech_approved', 'rejected')
);

-- US-12: any Finance Lead can pick up a tech-approved lead and review it.
create policy "leads_update_finance_review"
on public.leads for update
to authenticated
using (
    org_id = public.current_user_org()
    and public.current_user_role() = 'finance_lead'
    and status = 'tech_approved'
)
with check (
    org_id = public.current_user_org()
    and public.current_user_role() = 'finance_lead'
    and finance_lead_id = auth.uid()
    and status in ('finance_approved', 'rejected')
);

-- US-13: Sales Manager acknowledges a rejection and marks the lead Cold.
create policy "leads_update_sales_manager_mark_cold"
on public.leads for update
to authenticated
using (
    org_id = public.current_user_org()
    and public.current_user_role() = 'sales_manager'
    and status = 'rejected'
)
with check (
    org_id = public.current_user_org()
    and public.current_user_role() = 'sales_manager'
    and status = 'new'
);
