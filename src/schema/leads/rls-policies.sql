alter table public.leads enable row level security;

create policy "leads_select_same_org"
on public.leads for select
to authenticated
using (org_id = public.current_user_org());

-- Only Sales Reps create leads, and only as themselves (US-07).
create policy "leads_insert_sales_rep"
on public.leads for insert
to authenticated
with check (
    public.current_user_role() = 'sales_rep'
    and org_id = public.current_user_org()
    and owner_id = auth.uid()
);

-- The owning Sales Rep or an Admin can edit lead details and temperature
-- (US-08, US-09). Phase 3 adds separate policies scoping the tech/finance
-- review fields to tech_lead/finance_lead once the approval workflow lands --
-- this policy is not meant to grant them write access to those columns.
create policy "leads_update_owner_or_admin"
on public.leads for update
to authenticated
using (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
)
with check (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
);
