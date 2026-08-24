-- Tightens deals_update_owner_or_admin (from rls-policies.sql) so the
-- owner's branch only applies while status = 'open'. Without this, a
-- Sales Rep could keep editing/moving a deal after it's Won or Lost
-- (US-20/21). Admin keeps its unrestricted override regardless of status,
-- matching the same pattern used for leads_update_owner_or_admin.
alter policy "deals_update_owner_or_admin"
on public.deals
using (
    org_id = public.current_user_org()
    and (
        (owner_id = auth.uid() and status = 'open')
        or public.current_user_role() = 'admin'
    )
)
with check (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
);
