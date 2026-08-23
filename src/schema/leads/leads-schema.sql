create table public.leads (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    contact_id uuid references public.contacts(id) on delete set null,
    owner_id uuid references public.profiles(id) on delete set null,
    title text not null,
    description text,
    temperature text check (temperature in ('hot', 'cold')),
    status text not null default 'new' check (
        status in ('new', 'escalated', 'tech_approved', 'finance_approved', 'rejected', 'converted')
    ),
    tech_lead_id uuid references public.profiles(id) on delete set null,
    tech_decision text check (tech_decision in ('approved', 'rejected')),
    tech_notes text,
    finance_lead_id uuid references public.profiles(id) on delete set null,
    finance_decision text check (finance_decision in ('approved', 'rejected')),
    finance_notes text,
    created_at timestamptz not null default now()
);

create index leads_org_id_idx on public.leads(org_id);
create index leads_company_id_idx on public.leads(company_id);
create index leads_contact_id_idx on public.leads(contact_id);
create index leads_owner_id_idx on public.leads(owner_id);
create index leads_status_idx on public.leads(status);
