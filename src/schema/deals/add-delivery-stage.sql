-- A signed contract isn't the end of a deal -- the team is still building
-- and delivering the project before it's actually won (paid out, handed
-- over). Adds a stage between Contract and Won so that work is visible on
-- the board instead of disappearing into "closed" the moment paperwork is
-- signed; Won still means the engagement is actually complete.
alter table public.deals drop constraint deals_stage_check;
alter table public.deals add constraint deals_stage_check
    check (stage in ('proposal', 'negotiation', 'contract', 'delivery'));
