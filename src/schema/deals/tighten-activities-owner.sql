-- Tightens activities_insert_deal_access (from rls-policies.sql) so only
-- the deal's owner or an Admin can log an activity. Per the team's
-- workflow diagram, the Sales Manager's role stops at converting the lead
-- (oversight only) -- the owning Sales Rep is the one who operates the
-- deal day-to-day, so sales_manager should not be able to log
-- interactions on a deal they don't own.
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
          )
    )
);
