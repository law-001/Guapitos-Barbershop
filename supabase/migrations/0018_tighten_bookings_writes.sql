-- 0018_tighten_bookings_writes.sql — lock down who can write a booking.
-- Forward-only. Apply in the Supabase SQL Editor after 0017.
--
-- Before this, `bookings` had demo-grade RLS: anon could insert/update ANY row
-- (using (true)), so anyone with the public key + a booking id could cancel or
-- change someone else's appointment. This replaces the write policies with
-- owner-or-staff rules. READS stay open for now (the public booking screen needs
-- to see occupancy to offer free slots — locking reads is a separate, larger
-- change that needs an occupancy view first).
--
-- Depends on:
--   • public.is_staff()  (migration 0015 / schema/staff.sql) — SECURITY DEFINER
--     boolean, true when the signed-in JWT email is an active staff member.
--   • mark_overdue_no_shows() (0017) is SECURITY DEFINER, so the auto No-Show
--     sweep keeps working despite these tighter write rules.
--
-- "Owner" = the signed-in customer whose verified email is on the row. Customers
-- sign in via email OTP and staff via the staff-login function, so both carry a
-- real Supabase session whose JWT email we can trust here. Email match is
-- case-insensitive for safety.

-- Remove the permissive write policies.
drop policy if exists "bookings insert" on public.bookings;
drop policy if exists "bookings update" on public.bookings;

-- INSERT: a customer may only create a booking under their own email; staff may
-- create any (walk-ins, phone bookings, etc.).
create policy "bookings insert own or staff"
  on public.bookings for insert
  with check (
    (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff()
  );

-- UPDATE: a customer may only change their own booking (reschedule / cancel);
-- staff may change any. `using` gates which existing rows are visible to update;
-- `with check` ensures they can't reassign a row to someone else.
create policy "bookings update own or staff"
  on public.bookings for update
  using (
    (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff()
  )
  with check (
    (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff()
  );

-- NOTE: no DELETE policy is defined, so with RLS enabled deletes are denied for
-- everyone (anon + authenticated). Bookings are cancelled (status change), never
-- deleted, by the app. Admin housekeeping deletes go through the SQL editor.
-- NOTE: "bookings read" (select using (true)) is intentionally left in place —
-- see header. Tighten reads in a later migration once an occupancy view exists.
