-- Extends deals_update_owner_or_admin (rls-policies.sql, tightened by
-- tighten-owner-update-open-only.sql) so a Sales Manager can also update
-- deal details, move stage, and close a deal Won/Lost -- not just the
-- owning Sales Rep or an Admin. Sales Manager already escalates leads and
-- converts them into deals; extending oversight through to closing the
-- deal is a natural continuation of that role, not a new capability class.
-- Scoped to status = 'open' like the owner's branch (not unrestricted like
-- Admin) -- Sales Manager oversees active deals, not a fix-anything override.
alter policy "deals_update_owner_or_admin"
on public.deals
using (
    org_id = public.current_user_org()
    and (
        (owner_id = auth.uid() and status = 'open')
        or public.current_user_role() = 'admin'
        or (public.current_user_role() = 'sales_manager' and status = 'open')
    )
)
with check (
    org_id = public.current_user_org()
    and (
        owner_id = auth.uid()
        or public.current_user_role() = 'admin'
        or public.current_user_role() = 'sales_manager'
    )
);
