-- 0009_clear_all_bookings.sql — wipe ALL bookings for a clean slate.
-- Forward-only. Apply in the Supabase SQL Editor after 0008.
--
-- Destructive: removes every row in public.bookings (demo + real). Keeps the
-- table, its columns/indexes, and reference data (barbers, services, staff).
-- After this, My Appointments and the admin schedule start empty.

delete from public.bookings;
