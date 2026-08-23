-- One-time bootstrap: makes the first authenticated user (created outside
-- the app, before any admin existed to invite anyone) the org's first Admin.
-- Not meant to run again — every user after this one is provisioned through
-- the Create User Account flow (US-20), which requires an existing admin.
with new_org as (
    insert into public.organizations (name)
    values ('Altrium')
    returning id
)
insert into public.profiles (id, org_id, role, email, display_name)
select u.id, new_org.id, 'admin', u.email, u.email
from auth.users u, new_org
where u.email = 'liyahimaz@gmail.com';
