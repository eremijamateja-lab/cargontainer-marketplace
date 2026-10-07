-- ═══════════════════════════════════════════════════════════════════════
-- Cargontainer Marketplace — Phase 1: own schema in the shared Supabase project
--
-- Project: fkqxptjngfvurthwzzmu ("cargontainer-tms-staging", the one the live
-- TMS Agency / TMS Carrier use). This migration ONLY creates the new schema
-- `marketplace`; it does not touch any existing `public` table, function or
-- policy.
--
-- Why a separate schema: the marketplace's FastAPI models use table names that
-- already exist in `public` for the TMS (companies, shipments, ...). The
-- backend maps every model to `marketplace` (schema_translate_map), so the two
-- can never collide.
--
-- Who reads it: only the Marketplace FastAPI backend, connecting as the
-- database owner through the session pooler. The schema is not exposed through
-- the Supabase REST API (not in "Exposed schemas"), and RLS is enabled with no
-- policies as a second lock: anon/authenticated get nothing even if exposed.
--
-- Link to the shared register: marketplace.companies.shared_company_id holds
-- the uuid of public.companies; the backend fills/syncs it on login from
-- public.company_members / companies / company_products / platform_admins.
-- Users are Supabase auth.users ids (text) everywhere a *_user_id appears.
--
-- Rollback (drops only marketplace data):  drop schema marketplace cascade;
-- ═══════════════════════════════════════════════════════════════════════

begin;

create schema if not exists marketplace;

-- trigram index for location autocomplete (Supabase keeps extensions in `extensions`)
create extension if not exists pg_trgm with schema extensions;

create table marketplace.users (
  id            varchar(255) primary key,          -- auth.users.id
  email         varchar(255) not null,
  name          varchar(255),
  password_hash varchar(255),                       -- unused in Supabase mode
  role          varchar(50)  not null default 'user', -- 'admin' = in public.platform_admins
  created_at    timestamptz default now(),
  last_login    timestamptz
);

create table marketplace.companies (
  id                serial primary key,
  company_name      varchar not null,
  company_type      varchar,
  company_roles     varchar,
  country           varchar,
  city              varchar,
  vat_number        varchar,
  email             varchar,
  phone             varchar,
  website           varchar,
  address           varchar,
  description       varchar,
  logo_url          varchar,
  is_public         boolean,
  subscription_plan varchar,
  active_user_count integer,
  approval_status   varchar,
  shared_company_id varchar unique,                 -- public.companies.id
  created_at        timestamptz,
  updated_at        timestamptz
);

create table marketplace.company_capabilities (
  id                   serial primary key,
  company_id           integer not null,
  vehicle_count        integer,
  vehicle_types        varchar,
  main_routes          varchar,
  transport_categories varchar,
  customs_services     boolean,
  countries_covered    varchar,
  customs_offices      varchar,
  service_regions      varchar,
  created_at           timestamptz,
  updated_at           timestamptz
);
create index on marketplace.company_capabilities (company_id);

create table marketplace.user_profiles (
  id            serial primary key,
  user_id       varchar not null unique,            -- auth.users.id
  role          varchar not null,                   -- forwarder / trucking / terminal
  company_name  varchar not null,
  display_name  varchar,
  created_at    timestamptz,
  company_id    integer,                            -- marketplace.companies.id
  member_role   varchar,
  member_status varchar
);
create index on marketplace.user_profiles (company_id);

create table marketplace.locations (
  id            serial primary key,
  country_code  varchar not null,
  country_name  varchar not null,
  postal_code   varchar,
  city          varchar not null,
  location_name varchar not null,
  location_type varchar,
  search_key    varchar,
  created_at    timestamptz,
  updated_at    timestamptz
);
create index on marketplace.locations (country_code);
create index locations_search_key_trgm on marketplace.locations
  using gin (search_key extensions.gin_trgm_ops);

create table marketplace.transport_requests (
  id                   serial primary key,
  user_id              varchar not null,
  title                varchar,
  origin               varchar,
  destination          varchar,
  origin_country       varchar,
  destination_country  varchar,
  transport_category   varchar,
  transport_mode       varchar,
  vehicle_type         varchar,
  customs_service_type varchar,
  customs_office       varchar,
  invoice_ref          varchar,
  additional_services  varchar,
  container_type       varchar,
  container_count      integer,
  cargo_description    varchar,
  weight_kg            double precision,
  preferred_date       varchar,
  deadline_date        varchar,
  special_requirements varchar,
  status               varchar,
  user_role            varchar,
  user_company         varchar,
  tracking_link        varchar,
  created_at           timestamptz,
  updated_at           timestamptz
);
create index on marketplace.transport_requests (user_id);
create index on marketplace.transport_requests (status);

create table marketplace.offers (
  id             serial primary key,
  user_id        varchar not null,
  request_id     integer not null,
  price          double precision not null,
  currency       varchar not null,
  estimated_days integer,
  transport_mode varchar,
  notes          varchar,
  status         varchar not null,
  carrier_name   varchar,
  service_type   varchar default 'transport',
  created_at     timestamptz,
  updated_at     timestamptz
);
create index on marketplace.offers (request_id);
create index on marketplace.offers (user_id);

create table marketplace.shipments (
  id                  serial primary key,
  user_id             varchar not null,
  request_id          integer,
  offer_id            integer,
  tracking_number     varchar,
  status              varchar,
  current_location    varchar,
  origin              varchar,
  destination         varchar,
  origin_country      varchar,
  destination_country varchar,
  transport_category  varchar,
  additional_services varchar,
  carrier_name        varchar,
  estimated_arrival   varchar,
  actual_arrival      varchar,
  vehicle_plate       varchar,
  container_number    varchar,
  driver_name         varchar,
  driver_phone        varchar,
  trailer_plate       varchar,
  carrier_email       varchar,
  carrier_phone       varchar,
  operational_notes   varchar,
  forwarder_notes     varchar,
  milestone_history   text,
  customs_offer_id    integer,
  customs_agent_name  varchar,
  customs_status      varchar,
  created_at          timestamptz,
  updated_at          timestamptz
);
create index on marketplace.shipments (user_id);
create index on marketplace.shipments (offer_id);
create index on marketplace.shipments (customs_offer_id);

create table marketplace.messages (
  id              serial primary key,
  offer_id        integer,
  request_id      integer,
  carrier_user_id varchar,
  sender_user_id  varchar not null,
  sender_name     varchar,
  body            varchar not null,
  read_at         timestamptz,
  created_at      timestamptz
);
create index on marketplace.messages (offer_id);
create index on marketplace.messages (request_id);
create index on marketplace.messages (carrier_user_id);
create index on marketplace.messages (created_at);

-- Second lock: no API role can read or write marketplace tables directly.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'marketplace' loop
    execute format('alter table marketplace.%I enable row level security', t);
  end loop;
end $$;

revoke all on schema marketplace from anon, authenticated;
revoke all on all tables in schema marketplace from anon, authenticated;
revoke all on all sequences in schema marketplace from anon, authenticated;
alter default privileges in schema marketplace revoke all on tables from anon, authenticated;
alter default privileges in schema marketplace revoke all on sequences from anon, authenticated;

commit;
