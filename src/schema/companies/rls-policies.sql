alter table public.companies enable row level security;

-- Every org member can view every company (US-04 backlog: visible org-wide,
-- only creation/editing is restricted).
create policy "companies_select_same_org"
on public.companies for select
to authenticated
using (org_id = public.current_user_org());

-- Only Sales Reps create companies, and only as themselves.
create policy "companies_insert_sales_rep"
on public.companies for insert
to authenticated
with check (
    public.current_user_role() = 'sales_rep'
    and org_id = public.current_user_org()
    and owner_id = auth.uid()
);

-- The owning Sales Rep or an Admin can edit a company (US-06).
create policy "companies_update_owner_or_admin"
on public.companies for update
to authenticated
using (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
)
with check (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
);
