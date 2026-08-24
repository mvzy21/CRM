create table public.deals (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete set null,
    company_id uuid references public.companies(id) on delete set null,
    contact_id uuid references public.contacts(id) on delete set null,
    owner_id uuid references public.profiles(id) on delete set null,
    title text not null,
    budget numeric,
    deadline date,
    requirements text,
    stage text not null default 'proposal' check (stage in ('proposal', 'negotiation', 'contract')),
    status text not null default 'open' check (status in ('open', 'won', 'lost')),
    lost_reason text,
    closed_at timestamptz,
    created_at timestamptz not null default now()
);

create index deals_org_id_idx on public.deals(org_id);
create index deals_lead_id_idx on public.deals(lead_id);
create index deals_company_id_idx on public.deals(company_id);
create index deals_owner_id_idx on public.deals(owner_id);
create index deals_stage_idx on public.deals(stage);
create index deals_status_idx on public.deals(status);

-- Covers both US-17 (Log Customer Interaction) and, later, US-23 (Notes) --
-- Notes is just a view over activities where kind = 'note'.
create table public.activities (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    deal_id uuid not null references public.deals(id) on delete cascade,
    author_id uuid references public.profiles(id) on delete set null,
    kind text not null check (kind in ('call', 'meeting', 'note')),
    body text not null,
    created_at timestamptz not null default now()
);

create index activities_org_id_idx on public.activities(org_id);
create index activities_deal_id_idx on public.activities(deal_id);
