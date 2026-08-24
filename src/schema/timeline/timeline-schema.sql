-- US-22: read-only audit trail of status-change events on a Lead or Deal.
-- Written by logTimelineEvent() from each mutating server function (e.g.
-- escalate, review, convert, close). Interaction logs (activities) are a
-- separate table and are merged with these at query time for the Deal
-- Timeline view rather than duplicated here.
create table public.timeline_events (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    entity_type text not null check (entity_type in ('lead', 'deal')),
    entity_id uuid not null,
    actor_id uuid references public.profiles(id) on delete set null,
    summary text not null,
    created_at timestamptz not null default now()
);

create index timeline_events_org_id_idx on public.timeline_events(org_id);
create index timeline_events_entity_idx on public.timeline_events(entity_type, entity_id);
