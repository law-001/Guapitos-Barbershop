-- 0022_session_fresh_bookings.sql — server-enforced absolute session age.
-- Forward-only. Apply in the Supabase SQL Editor after 0021.
--
-- Problem: the 24h / 30-day "session limit" is enforced ONLY in the browser
-- (src/lib/session.js + the App.jsx timer). The real Supabase session auto-
-- refreshes forever, so a token lifted off a shared/public device — or any
-- caller hitting the REST API directly, bypassing the app's timer — keeps full
-- access with no server-side cutoff. The old anchor (users.login_timestamp) is
-- also user-writable after 0020, so a user could reset their own clock.
--
-- Fix: gate the sensitive tables on session_fresh(), evaluated server-side in
-- RLS. This migration wires it into `bookings` ONLY (read/insert/update) so the
-- change can be verified in isolation before spreading to other tables.
--
-- Anchor: auth.users.last_sign_in_at — maintained by GoTrue, NOT user-writable,
-- and NOT bumped by token refresh (only by a real sign-in / OTP verify). A
-- SECURITY DEFINER function may read auth.users; it returns only a boolean, and
-- only for the caller's own row (auth.uid()), so nothing leaks.
--
-- Fails OPEN on a null/absent timestamp (legacy rows, anon) and CLOSED only when
-- a real timestamp is present and older than the ceiling — so this can never
-- mass-lock-out users, only cut genuinely stale sessions.
--
-- Ceiling: a single hard maximum (default 30 days = the longest client window),
-- so no legitimate "Keep me signed in" user is ever cut early. The browser still
-- does the nicer per-choice 24h/30d timer; this is the backstop wall.

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
    true   -- null/absent (legacy row, or anon) → don't lock out
  );
$$;

-- ── Re-create the bookings policies, ANDing session_fresh() onto each ─────────
-- The owner/staff logic is unchanged from 0018/0019; only the freshness gate is
-- added. NOTE: the public slot picker reads bookings_occupancy (a separate,
-- ungated view), so signed-out availability is unaffected.

drop policy if exists "bookings read own or staff"   on public.bookings;
drop policy if exists "bookings insert own or staff" on public.bookings;
drop policy if exists "bookings update own or staff"  on public.bookings;

create policy "bookings read own or staff"
  on public.bookings for select
  using (
    public.session_fresh()
    and (
      (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
      or public.is_staff()
    )
  );

create policy "bookings insert own or staff"
  on public.bookings for insert
  with check (
    public.session_fresh()
    and (
      (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
      or public.is_staff()
    )
  );

create policy "bookings update own or staff"
  on public.bookings for update
  using (
    public.session_fresh()
    and (
      (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
      or public.is_staff()
    )
  )
  with check (
    public.session_fresh()
    and (
      (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
      or public.is_staff()
    )
  );

-- Rollback (paste in SQL Editor if this ever locks someone out — service_role /
-- the SQL Editor bypass RLS, so you are never truly locked out of the DB):
--   re-run migration 0018 + 0019's policy blocks to drop session_fresh() back
--   out, then `drop function if exists public.session_fresh(integer);`
