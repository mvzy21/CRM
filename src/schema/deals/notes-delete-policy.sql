-- Notes can be corrected after the fact (typos, wrong client mentioned),
-- unlike calls/meetings which are meant to stay a permanent factual record.
-- Scoped to kind = 'note' only, and to the same actor set that can already
-- write one (activities_insert_deal_access / activities-on-leads.sql):
-- the author, the owning Sales Rep, a Sales Manager (oversight), or an
-- Admin. The delete itself is never silent -- the server function that
-- calls this also writes a "Deleted a note" timeline_event, so removing a
-- note still leaves a trace even though the content is gone.
create policy "activities_delete_own_note"
on public.activities for delete
to authenticated
using (
    org_id = public.current_user_org()
    and kind = 'note'
    and (
        author_id = auth.uid()
        or public.current_user_role() = 'admin'
        or (
            deal_id is not null
            and exists (
                select 1 from public.deals d
                where d.id = deal_id
                  and d.org_id = public.current_user_org()
                  and (
                      d.owner_id = auth.uid()
                      or public.current_user_role() = 'sales_manager'
                  )
            )
        )
        or (
            lead_id is not null
            and exists (
                select 1 from public.leads l
                where l.id = lead_id
                  and l.org_id = public.current_user_org()
                  and (
                      l.owner_id = auth.uid()
                      or public.current_user_role() = 'sales_manager'
                  )
            )
        )
    )
);
