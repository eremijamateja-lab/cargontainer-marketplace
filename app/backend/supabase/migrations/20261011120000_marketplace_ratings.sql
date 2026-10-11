-- ═══════════════════════════════════════════════════════════════════════
-- Cargontainer Marketplace — ratings after a delivered transport (Phase 3 "poverenje")
-- Adds one table to the `marketplace` schema; same locks as the base schema (RLS on, no
-- policies, no access for anon/authenticated — only the FastAPI backend reads it).
-- Company verification itself lives on public.companies (cargontainer-tms migration
-- 20261011120000_company_verification.sql), set by the Platform admin in TMS Agency.
-- Rollback: drop table marketplace.ratings;
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table marketplace.ratings (
  id            serial primary key,
  shipment_id   integer not null,
  rater_company varchar not null,        -- shared company uuid of the rating side
  rater_user_id varchar not null,        -- actor id of the person who rated
  rated_company varchar not null,        -- shared company uuid of the other side
  rater_role    varchar not null check (rater_role in ('forwarder','carrier')),
  s1            integer not null check (s1 between 1 and 5),
  s2            integer not null check (s2 between 1 and 5),
  s3            integer not null check (s3 between 1 and 5),
  overall       double precision not null,
  comment       varchar,
  created_at    timestamptz default now(),
  constraint uq_ratings_shipment_rater unique (shipment_id, rater_company)
);
create index on marketplace.ratings (rated_company);
create index on marketplace.ratings (shipment_id);

alter table marketplace.ratings enable row level security;
revoke all on marketplace.ratings from anon, authenticated;
revoke all on all sequences in schema marketplace from anon, authenticated;

commit;
