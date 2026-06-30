-- Snapshot of public.login_throttle — current shape. Source of truth: migrations/.
-- Server-side progressive throttle for staff login, written only by the
-- `staff-login` Edge Function (service_role). See migrations/0016_login_throttle.sql
-- for the helper functions and grants.
create table if not exists public.login_throttle (
  key             text primary key,
  fail_count      integer not null default 0,
  offense_count   integer not null default 0,
  locked_until    timestamptz,
  last_failed_at  timestamptz,
  last_offense_at timestamptz,
  updated_at      timestamptz not null default now()
);

-- RLS on with NO policies → no anon/authenticated access; service_role bypasses RLS.
alter table public.login_throttle enable row level security;
