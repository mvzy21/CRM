create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    org_id uuid not null references public.organizations(id) on delete cascade,
    team_id uuid references public.teams(id) on delete set null,
    role public.app_role not null,
    email text not null unique,
    display_name text,
    avatar_url text,
    is_active boolean not null default true,
    invited_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create index profiles_org_id_idx on public.profiles(org_id);
create index profiles_team_id_idx on public.profiles(team_id);
