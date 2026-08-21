alter table public.contacts enable row level security;

create policy "contacts_select_same_org"
on public.contacts for select
to authenticated
using (org_id = public.current_user_org());

-- Only Sales Reps create contacts, and only as themselves.
create policy "contacts_insert_sales_rep"
on public.contacts for insert
to authenticated
with check (
    public.current_user_role() = 'sales_rep'
    and org_id = public.current_user_org()
    and owner_id = auth.uid()
);

-- The owning Sales Rep or an Admin can edit a contact (US-06).
create policy "contacts_update_owner_or_admin"
on public.contacts for update
to authenticated
using (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
)
with check (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
);
