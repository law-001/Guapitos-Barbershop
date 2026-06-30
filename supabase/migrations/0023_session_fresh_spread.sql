-- 0023_session_fresh_spread.sql — extend the server session wall past bookings.
-- Forward-only. Apply in the Supabase SQL Editor after 0022.
--
-- 0022 put public.session_fresh() on `bookings`. This spreads it to the rest of
-- the sensitive surface, ANDed onto the existing owner/staff logic so a session
-- older than the absolute ceiling can't read PII or make privileged changes even
-- when the browser's own expiry timer is bypassed.
--
-- Scoping (deliberate — not every policy is gated):
--   • users  : read + insert + update  → protect customer PII and block profile
--              tampering by a stale session.
--   • reviews: update + delete only     → staff moderation is privileged. READ
--              stays public (approved reviews must show to signed-out visitors)
--              and INSERT stays open (anon may submit a pending review) — gating
--              those would break the public site.
--   • staff  : insert + update only     → staff management is privileged. READ is
--              left ungated so staff login / password-recovery / admin auto-unlock
--              keep working even when last_sign_in_at is stale (recovery sessions
--              can be). A stale session that auto-unlocks still hits gated, empty
--              data everywhere else, so nothing sensitive is exposed.
--
-- session_fresh() and is_staff() are both SECURITY DEFINER and bypass RLS, so
-- gating these tables does not break either helper.

-- ── users: owner-or-staff AND a fresh session ────────────────────────────────
drop policy if exists "users read"   on public.users;
drop policy if exists "users insert" on public.users;
drop policy if exists "users update" on public.users;

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

-- ── reviews: staff moderation AND a fresh session ────────────────────────────
-- (read + insert intentionally left as-is from 0015 — see header.)
drop policy if exists "reviews update" on public.reviews;
drop policy if exists "reviews delete" on public.reviews;

create policy "reviews update" on public.reviews for update
  using (public.session_fresh() and public.is_staff())
  with check (public.session_fresh() and public.is_staff());
create policy "reviews delete" on public.reviews for delete
  using (public.session_fresh() and public.is_staff());

-- ── staff: staff-only writes AND a fresh session ─────────────────────────────
-- (read intentionally left as-is from 0020 — see header.)
drop policy if exists "staff insert" on public.staff;
drop policy if exists "staff update" on public.staff;

create policy "staff insert" on public.staff for insert
  with check (public.session_fresh() and public.is_staff());
create policy "staff update" on public.staff for update
  using (public.session_fresh() and public.is_staff())
  with check (public.session_fresh() and public.is_staff());

-- Rollback: re-run the policy blocks from 0020 (users/staff) and 0015 (reviews)
-- to drop session_fresh() back out. The SQL Editor bypasses RLS, so you can
-- always do this even if a stale session locks you out of the app.
