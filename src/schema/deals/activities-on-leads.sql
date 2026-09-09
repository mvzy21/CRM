-- Sprint 1 review feedback (PO): "There is no place to add client
-- interaction; hence there is no way to mark the lead hot or cold."
--
-- Interactions (call / meeting / note) could only be attached to a Deal,
-- because `deal_id` was `not null`. A Deal only exists after the whole
-- approval chain has run, so at the point where a Sales Rep actually tags a
-- lead Hot or Cold, there was nowhere to record the call or meeting that
-- justified the call -- and the Tech/Finance reviewers had no interaction
-- history to read either.
--
-- An activity now hangs off exactly one parent: a lead or a deal. Same
-- shape as `reminders`, which already worked this way.
alter table public.activities
    alter column deal_id drop not null;

alter table public.activities
    add column if not exists lead_id uuid references public.leads(id) on delete cascade;

alter table public.activities
    drop constraint if exists activities_exactly_one_parent;

alter table public.activities
    add constraint activities_exactly_one_parent check (
        (lead_id is not null and deal_id is null)
        or (lead_id is null and deal_id is not null)
    );

create index if not exists activities_lead_id_idx on public.activities(lead_id);

-- Extends activities_insert_deal_access (rls-policies.sql, as amended by
-- tighten-activities-owner.sql and allow-sales-manager-activities.sql) to
-- cover the new lead branch. Access on a lead mirrors the deal rule
-- exactly: the owning Sales Rep, a Sales Manager (oversight), or an Admin.
-- Reading is unchanged -- activities_select_same_org already makes the
-- history visible org-wide, which is what lets a reviewer read it.
alter policy "activities_insert_deal_access"
on public.activities
with check (
    org_id = public.current_user_org()
    and author_id = auth.uid()
    and (
        (
            deal_id is not null
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
        )
        or (
            lead_id is not null
            and exists (
                select 1 from public.leads l
                where l.id = lead_id
                  and l.org_id = public.current_user_org()
                  and (
                      l.owner_id = auth.uid()
                      or public.current_user_role() = 'admin'
                      or public.current_user_role() = 'sales_manager'
                  )
            )
        )
    )
);
