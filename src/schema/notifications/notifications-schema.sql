-- In-app notifications for the lead approval handoffs: escalating to a Tech
-- Lead, a review decision, and a conversion all involve someone waiting on
-- someone else with no way to know it happened except by checking. This
-- closes that gap without a background job -- every notification is written
-- inline by the same server function that already writes the timeline event.
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    entity_type text not null check (entity_type in ('lead', 'deal')),
    entity_id uuid not null,
    title text not null,
    body text,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_org_id_idx on public.notifications(org_id);
create index notifications_user_unread_idx
    on public.notifications(user_id)
    where not is_read;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

-- A notification is written by whoever performed the triggering action (the
-- Sales Manager who escalated, the reviewer who decided) on behalf of the
-- person it's for, not by that person themselves -- so this can't be
-- "user_id = auth.uid()" the way most insert policies here are. Scoped to
-- the same org instead: any authenticated org member can notify any other
-- org member, which matches the trust level already implicit in an
-- org-wide-visible CRM (everyone already sees everyone's leads and deals);
-- it does not let anyone read, forge on behalf of, or notify across orgs.
create policy "notifications_insert_org_member"
on public.notifications for insert
to authenticated
with check (
    org_id = public.current_user_org()
    and exists (
        select 1 from public.profiles p
        where p.id = user_id and p.org_id = public.current_user_org()
    )
);

create policy "notifications_update_own"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
