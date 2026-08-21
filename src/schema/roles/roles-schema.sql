create type public.app_role as enum (
    'admin',
    'sales_manager',
    'sales_rep',
    'tech_lead',
    'finance_lead',
    'leadership'
);

-- security definer so policies on public.profiles can call this without
-- recursing into their own row-level checks while resolving it.
create function public.current_user_role()
returns public.app_role
language sql
security definer
stable
set search_path = public
as $$
    select role from public.profiles where id = auth.uid()
$$;

create function public.current_user_org()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
    select org_id from public.profiles where id = auth.uid()
$$;
