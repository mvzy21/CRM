alter table public.reminders enable row level security;

-- Reminders are personal follow-up tasks, not shared pipeline data like
-- leads/deals -- only the owner (or an admin) can see or manage their own.
create policy "reminders_select_owner_or_admin"
on public.reminders for select
to authenticated
using (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
);

create policy "reminders_insert_owner"
on public.reminders for insert
to authenticated
with check (
    org_id = public.current_user_org()
    and owner_id = auth.uid()
);

create policy "reminders_update_owner_or_admin"
on public.reminders for update
to authenticated
using (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
)
with check (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
);

create policy "reminders_delete_owner_or_admin"
on public.reminders for delete
to authenticated
using (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
);
