-- One-time migration for the already-provisioned Supabase project: the
-- Product Backlog v3 rework (2026-08-21) added 'tech_lead' and 'finance_lead'
-- roles for the new lead-approval workflow (US-10/11/12). 'marketing' is no
-- longer offered by the app (see src/lib/supabase/roles.ts) but is left in
-- the enum rather than dropped -- removing a Postgres enum value requires
-- recreating the type, which cascades into current_user_role() and three
-- RLS policies (teams_write_admin_only, profiles_insert_admin_only,
-- profiles_update_admin_only). Not worth the risk for an unused value that
-- does no harm sitting there.
-- Run once in the Supabase SQL editor; not idempotent (rerunning errors
-- with "already exists", which is fine -- it means this already ran).

alter type public.app_role add value 'tech_lead';
alter type public.app_role add value 'finance_lead';
