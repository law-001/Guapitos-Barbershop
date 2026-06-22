-- 0008_booking_email.sql — tie a booking to the customer's verified email.
-- Forward-only. Apply in the Supabase SQL Editor after 0007.
--
-- "My Appointments" is gated behind email verification (login) and scoped to
-- the signed-in email, so each booking records the email that created it.
-- Nullable: admin/walk-in bookings may have no customer email.

alter table public.bookings add column if not exists email text;

-- Helps the per-customer lookup ("show bookings for this email").
create index if not exists bookings_email_idx on public.bookings (email);
