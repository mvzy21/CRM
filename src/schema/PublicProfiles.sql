create table public.profiles(
    id uuid primary key references public.users(id) on delete cascade,
    display_name text,
    avatar_url text,
    created_at timestamptz not null default now()
)