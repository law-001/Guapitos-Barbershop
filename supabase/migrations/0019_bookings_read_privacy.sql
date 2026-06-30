-- 0019_bookings_read_privacy.sql — stop the public from reading customer details.
-- Forward-only. Apply in the Supabase SQL Editor after 0018.
--
-- Before: `bookings` had `select using (true)` — anyone with the public key could
-- read every row (names, emails, notes). That was needed because the public
-- booking screen reads bookings to know which slots are taken.
--
-- This splits the two needs:
--   • A slim VIEW (bookings_occupancy) exposes ONLY date/barber/time/status — no
--     names, emails, notes, price. Anyone may read it (for slot availability).
--   • The base table's reads are locked to owner-or-staff, matching the write
--     rules from 0018.
--
-- Net effect: the public can see "3 PM is taken" but never WHO booked it.

-- ── 1) Occupancy view (safe, public-readable, no PII) ────────────────────────
-- security_invoker = false (the default, set explicitly for clarity): the view
-- runs with its owner's rights, so it returns all rows for availability even
-- though the caller can't read the base table. It only ever exposes the columns
-- listed here, so there is no PII to leak.
create or replace view public.bookings_occupancy
  with (security_invoker = false) as
  select id, date, barber, start_min, dur, status
  from public.bookings;

grant select on public.bookings_occupancy to anon, authenticated;

-- ── 2) Lock the base table reads to owner-or-staff ───────────────────────────
drop policy if exists "bookings read" on public.bookings;
create policy "bookings read own or staff"
  on public.bookings for select
  using (
    (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff()
  );

-- NOTE: Supabase's Security Advisor will flag bookings_occupancy as a
-- "security definer view" — that is intentional here; it exposes only non-PII
-- columns on purpose so anonymous visitors can compute free slots.
