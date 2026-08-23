create table public.companies (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    industry text,
    owner_id uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create index companies_org_id_idx on public.companies(org_id);
create index companies_owner_id_idx on public.companies(owner_id);
