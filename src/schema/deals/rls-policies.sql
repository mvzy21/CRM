alter table public.deals enable row level security;
alter table public.activities enable row level security;

create policy "deals_select_same_org"
on public.deals for select
to authenticated
using (org_id = public.current_user_org());

-- Deals are only ever created by convertLead() (US-14), gated to
-- sales_manager, converting a finance_approved lead. No open insert path
-- for any other role.
create policy "deals_insert_sales_manager"
on public.deals for insert
to authenticated
with check (
    public.current_user_role() = 'sales_manager'
    and org_id = public.current_user_org()
);

-- The owning Sales Rep or an Admin can update deal details, move it
-- through the pipeline stage, and close it (US-15, 16, 20, 21).
create policy "deals_update_owner_or_admin"
on public.deals for update
to authenticated
using (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
)
with check (
    org_id = public.current_user_org()
    and (owner_id = auth.uid() or public.current_user_role() = 'admin')
);

create policy "activities_select_same_org"
on public.activities for select
to authenticated
using (org_id = public.current_user_org());

-- Log Customer Interaction (US-17): only the deal owner (Sales Rep) or an
-- Admin can log an activity against a deal. Sales Manager's role stops at
-- converting the lead -- oversight only, not day-to-day deal operation.
create policy "activities_insert_deal_access"
on public.activities for insert
to authenticated
with check (
    org_id = public.current_user_org()
    and author_id = auth.uid()
    and exists (
        select 1 from public.deals d
        where d.id = deal_id
          and d.org_id = public.current_user_org()
          and (
              d.owner_id = auth.uid()
              or public.current_user_role() = 'admin'
          )
    )
);
