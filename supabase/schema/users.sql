-- Snapshot of public.users — current shape. Source of truth: migrations/.
create table if not exists public.users (
  id         text primary key,
  first_name text,
  last_name  text,
  mobile     text not null default '',
  email      text unique,
  created_at timestamptz not null default now(),
  login_timestamp timestamptz   -- last successful sign-in; drives 24h absolute expiry
);
create index if not exists users_mobile_idx on public.users (mobile);

alter table public.users enable row level security;
-- Owner-or-staff (migration 0020). A customer may read/write only the row whose
-- email matches their verified JWT email; staff (is_staff()) may read all for the
-- admin Customers page. Closes the old `using (true)` PII dump + the pre-login
-- "email → saved name/mobile" enumeration leak.
-- Each policy also requires a fresh session (migration 0023): session_fresh()
-- blocks reads/writes from a session older than the absolute ceiling.
create policy "users read" on public.users for select
  using (
    public.session_fresh()
    and (lower(email) = lower(auth.jwt() ->> 'email') or public.is_staff())
  );
create policy "users insert" on public.users for insert
  with check (
    public.session_fresh()
    and lower(email) = lower(auth.jwt() ->> 'email')
  );
create policy "users update" on public.users for update
  using (
    public.session_fresh()
    and lower(email) = lower(auth.jwt() ->> 'email')
  )
  with check (
    public.session_fresh()
    and lower(email) = lower(auth.jwt() ->> 'email')
  );
-- No DELETE policy → customer rows are not deleted by the app.

-- Server-side absolute session-age gate (migration 0022). Anchors on GoTrue's
-- auth.users.last_sign_in_at (not user-writable, not bumped by token refresh).
-- Used in other tables' RLS to reject sessions older than the ceiling even when
-- the browser's own expiry timer is bypassed. Fails open on a null timestamp.
create or replace function public.session_fresh(p_max_secs integer default 2592000)  -- 30 days
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select last_sign_in_at from auth.users where id = auth.uid())
      > now() - make_interval(secs => p_max_secs),
    true
  );
$$;
