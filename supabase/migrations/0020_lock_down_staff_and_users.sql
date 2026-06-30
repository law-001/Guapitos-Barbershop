-- 0020_lock_down_staff_and_users.sql — close two wide-open tables from 0003.
-- Forward-only. Apply in the Supabase SQL Editor after 0019.
--
-- Background: migration 0003 created `staff` and `users` with demo-grade RLS
-- (`using (true)` / `with check (true)` on every command). Bookings were later
-- tightened (0018/0019) but these two were never revisited, leaving two holes:
--
--   1) PRIVILEGE ESCALATION via `staff`. Anyone signed in (customers self-serve
--      an OTP session) could INSERT a staff row with their own email. is_staff()
--      then returns true for them, handing over every booking's PII, review
--      moderation, etc. — without ever knowing a staff password. The server-side
--      staff-login throttle is moot if the staff gate can be written directly.
--
--   2) PII LEAK via `users`. `select using (true)` let anyone dump every
--      customer's name, mobile and email; `update using (true)` let anyone
--      overwrite any profile. This undoes the privacy work of 0018/0019, which
--      hid the same data on `bookings`.
--
-- Fix: scope both tables to owner-or-staff, mirroring the bookings policies.
--
-- Depends on:
--   • public.is_staff() (0015 / schema/staff.sql) — SECURITY DEFINER, so it still
--     reads `staff` even after these reads are locked down (it bypasses RLS).
--
-- Bootstrapping note: new staff rows are added by the seed in supabase/seed or
-- the staff-login Edge Function (service_role) — both bypass RLS — so the
-- "staff may write staff" rule never deadlocks legitimate admin provisioning.

-- ── staff: no anonymous access; staff-only writes ────────────────────────────
drop policy if exists "staff read"   on public.staff;
drop policy if exists "staff insert" on public.staff;
drop policy if exists "staff update" on public.staff;

-- READ: staff see the whole roster. The self-email clause lets a member who just
-- signed in (their JWT email matches their own row) read it even before any
-- other staff context exists — without exposing the roster to outsiders.
create policy "staff read" on public.staff for select
  using (public.is_staff() or lower(email) = lower(auth.jwt() ->> 'email'));

-- WRITE: only existing staff may add or change staff. (Initial provisioning runs
-- as service_role / via the SQL editor, which bypass RLS.)
create policy "staff insert" on public.staff for insert
  with check (public.is_staff());
create policy "staff update" on public.staff for update
  using (public.is_staff()) with check (public.is_staff());
-- No DELETE policy → deactivate via `active=false`, not row deletes.

-- ── users: own row or staff ──────────────────────────────────────────────────
drop policy if exists "users read"   on public.users;
drop policy if exists "users insert" on public.users;
drop policy if exists "users update" on public.users;

-- READ: a customer may read only their own profile; staff may read all (the
-- admin Customers page). Killing the open read also closes the pre-login
-- "type an email, get the saved name+mobile" enumeration leak.
create policy "users read" on public.users for select
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.is_staff());

-- INSERT / UPDATE: a signed-in customer may only write the row whose email
-- matches their verified JWT email. touchLogin/upsertUser always run after OTP
-- verify, so the session's email equals the row's email.
create policy "users insert" on public.users for insert
  with check (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "users update" on public.users for update
  using (lower(email) = lower(auth.jwt() ->> 'email'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));
-- No DELETE policy → customer rows are not deleted by the app.
