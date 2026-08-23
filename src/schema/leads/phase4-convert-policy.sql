-- US-14: Sales Manager converts a finance-approved lead into a Deal.
-- Run after phase3-approval-policies.sql.
create policy "leads_update_sales_manager_convert"
on public.leads for update
to authenticated
using (
    org_id = public.current_user_org()
    and public.current_user_role() = 'sales_manager'
    and status = 'finance_approved'
)
with check (
    org_id = public.current_user_org()
    and public.current_user_role() = 'sales_manager'
    and status = 'converted'
);
