create table public.contacts (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    name text not null,
    email text,
    phone text,
    owner_id uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create index contacts_org_id_idx on public.contacts(org_id);
create index contacts_company_id_idx on public.contacts(company_id);
create index contacts_owner_id_idx on public.contacts(owner_id);
