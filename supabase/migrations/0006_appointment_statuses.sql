-- 0006_appointment_statuses.sql — richer appointment lifecycle + check-in time
-- Forward-only. Apply in the Supabase SQL Editor after the earlier migrations.
--
-- Statuses: booked | checked-in | in-progress | completed | cancelled | no-show
-- (replaces the old 'confirmed' which becomes 'booked').

alter table public.bookings drop constraint if exists bookings_status_check;

-- migrate any existing rows from the old value
update public.bookings set status = 'booked' where status = 'confirmed';

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('booked','checked-in','in-progress','completed','cancelled','no-show'));

alter table public.bookings alter column status set default 'booked';

-- when the customer is checked in at the shop
alter table public.bookings add column if not exists checked_in_at timestamptz;
