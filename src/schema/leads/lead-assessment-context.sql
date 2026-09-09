-- Sprint 1 review feedback (PO): "There is no data provided about the lead
-- for the Tech Lead to do his assessment."
--
-- A lead carried only a title and a free-text description. The Tech Lead was
-- asked to review technical feasibility, and the Finance Lead to review
-- financial viability, against that alone -- the Finance Lead in particular
-- was approving a budget that did not exist anywhere on the record, because
-- `budget` only lived on `deals`, which are created *after* finance approval.
--
-- These columns move the assessable facts to where the assessment actually
-- happens: on the lead, before the approval chain runs.
alter table public.leads
    add column if not exists budget numeric,
    add column if not exists requirements text,
    add column if not exists expected_close_date date;

-- A negative budget is never a real figure; reject it at the layer that
-- can't be bypassed, matching the same guard used on deals.
alter table public.leads
    drop constraint if exists leads_budget_non_negative;

alter table public.leads
    add constraint leads_budget_non_negative
    check (budget is null or budget >= 0);
