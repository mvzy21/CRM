alter table public.timeline_events enable row level security;

-- Same visibility as leads/deals themselves -- everyone in the org views
-- everything (US-22: "visible to all roles" per the workflow diagram).
create policy "timeline_events_select_same_org"
on public.timeline_events for select
to authenticated
using (org_id = public.current_user_org());

-- Only written by logTimelineEvent() from within another mutating server
-- function, always as the acting user. No update/delete policies --
-- this is an immutable audit trail.
create policy "timeline_events_insert_self"
on public.timeline_events for insert
to authenticated
with check (
    org_id = public.current_user_org()
    and actor_id = auth.uid()
);
