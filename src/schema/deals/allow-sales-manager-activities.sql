-- Extends activities_insert_deal_access (rls-policies.sql, tightened by
-- tighten-activities-owner.sql) so a Sales Manager can also log
-- calls/meetings/notes against a deal they don't own -- not just the
-- owning Sales Rep or an Admin. Now that Sales Manager can edit, move
-- stage, and close a deal (allow-sales-manager-manage.sql), logging
-- interactions on that same deal is a natural extension of the same
-- oversight, not a new capability class.
alter policy "activities_insert_deal_access"
on public.activities
with check (
    org_id = public.current_user_org()
    and author_id = auth.uid()
    and exists (
        select 1 from public.deals d
        where d.id = deal_id
          and d.org_id = public.current_user_org()
          and (
              d.owner_id = auth.uid()
              or public.current_user_role() = 'admin'
              or public.current_user_role() = 'sales_manager'
          )
    )
);
