-- US-19: Schedule a follow-up reminder against a Lead or a Deal (exactly
-- one of lead_id/deal_id is set). Used for the "Mark Lead Cold, Schedule
-- Follow-up" step and for Sales Rep deal management reminders.
create table public.reminders (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete cascade,
    deal_id uuid references public.deals(id) on delete cascade,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    remind_at timestamptz not null,
    message text not null,
    is_done boolean not null default false,
    created_at timestamptz not null default now(),
    constraint reminders_exactly_one_parent check (
        (lead_id is not null and deal_id is null)
        or (lead_id is null and deal_id is not null)
    )
);

create index reminders_org_id_idx on public.reminders(org_id);
create index reminders_lead_id_idx on public.reminders(lead_id);
create index reminders_deal_id_idx on public.reminders(deal_id);
create index reminders_owner_id_idx on public.reminders(owner_id);
create index reminders_remind_at_idx on public.reminders(remind_at);
