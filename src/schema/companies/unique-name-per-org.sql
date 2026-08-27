-- The application-level duplicate check in createCompany/updateCompany
-- (companies.ts) does a lookup-then-insert, which isn't atomic: two
-- concurrent requests (e.g. a double-click, or two reps racing to add the
-- same client) can both pass the lookup before either insert commits,
-- producing two rows with the same name. This unique index closes that
-- race at the database level; the app-level check stays too, since it
-- gives a friendly error message instead of a raw constraint violation in
-- the common (non-concurrent) case.
create unique index companies_org_id_name_unique
on public.companies (org_id, lower(btrim(name)));
