alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;

-- Organizations: members can see their own org row, nothing else.
create policy "organizations_select_member"
on public.organizations for select
to authenticated
using (id = public.current_user_org());

-- Teams: any org member can see the teams in their org (needed for
-- assignment dropdowns); only admins create/edit/delete teams.
create policy "teams_select_same_org"
on public.teams for select
to authenticated
using (org_id = public.current_user_org());

create policy "teams_write_admin_only"
on public.teams for all
to authenticated
using (public.current_user_role() = 'admin' and org_id = public.current_user_org())
with check (public.current_user_role() = 'admin' and org_id = public.current_user_org());

-- Profiles: any org member can see co-workers (owner dropdowns, team
-- rosters); only admins may create, edit, or deactivate accounts. There is
-- no self-service update in Sprint 1 — the backlog only specifies
-- admin-driven account management (US-20/21/22).
create policy "profiles_select_same_org"
on public.profiles for select
to authenticated
using (org_id = public.current_user_org());

create policy "profiles_insert_admin_only"
on public.profiles for insert
to authenticated
with check (public.current_user_role() = 'admin' and org_id = public.current_user_org());

create policy "profiles_update_admin_only"
on public.profiles for update
to authenticated
using (public.current_user_role() = 'admin' and org_id = public.current_user_org())
with check (public.current_user_role() = 'admin' and org_id = public.current_user_org());
