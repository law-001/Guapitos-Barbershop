-- 0004_clear_dummy_data.sql — remove demo/dummy data for a clean slate.
-- Forward-only. Re-running all migrations in order still yields a clean DB:
-- 0002/0003 seed the demo rows, then this migration deletes them.
-- Keeps reference/config data: barbers, services, staff.

-- Remove the 33 demo bookings (ids: seed0-15, hist0-16, mine1, minepast).
-- Real bookings created in the app use 'a...'/'u...' ids and are NOT touched.
delete from public.bookings
where id like 'seed%' or id like 'hist%' or id in ('mine1','minepast');

-- Remove all dummy customers.
delete from public.users;
