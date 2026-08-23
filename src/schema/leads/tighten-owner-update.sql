-- Tightens leads_update_owner_or_admin (from rls-policies.sql) so the
-- owner's branch only applies while status = 'new'. Without this, a
-- sales_rep could bypass the whole Phase 3 approval workflow by writing
-- directly to status/temperature via the REST API on a lead they own,
-- since the original policy didn't scope by status at all.
alter policy "leads_update_owner_or_admin"
on public.leads
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
