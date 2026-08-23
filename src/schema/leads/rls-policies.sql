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
-- (US-08, US-09). The owner's branch is restricted to status = 'new' so
-- they can't use a raw update to jump the lead past the approval workflow
-- (escalate/review/mark-cold each require their own role, enforced by the
-- Phase 3 policies) -- Admin keeps unrestricted edit access to basic
-- fields regardless of status, since Admin has no role in the approval
-- workflow itself but does retain the general edit override.
create policy "leads_update_owner_or_admin"
on public.leads for update
to authenticated
using (
    org_id = public.current_user_org()
    and (
        (owner_id = auth.uid() and status = 'new')
        or public.current_user_role() = 'admin'
    )
)
with check (
    org_id = public.current_user_org()
    and (
        (owner_id = auth.uid() and status = 'new')
        or public.current_user_role() = 'admin'
    )
);
