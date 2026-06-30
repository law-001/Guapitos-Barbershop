-- 0015_staff_auth.sql — real staff authentication + staff-scoped review policies.
-- Forward-only. Apply in the Supabase SQL Editor after 0014.
--
-- Staff now sign in with Supabase email-OTP (same mechanism as customers). An
-- email counts as "staff" only if it matches an active row in public.staff. The
-- is_staff() helper reads the signed-in email from the JWT and checks that, so
-- RLS policies can be scoped to staff at the database level (no more open
-- delete/update). Read stays public-but-approved; insert stays public so guests
-- can submit (but only as unapproved — they can't self-publish).

-- 1) Staff need an email to authenticate with.
alter table public.staff add column if not exists email text unique;

-- Owner/manager login email. Add emails for other staff the same way; only
-- active rows with an email can sign in to the staff console.
update public.staff set email = 'migoyporciuncula@gmail.com' where id = 'st_manager';

-- 2) Staff identity check for RLS. SECURITY DEFINER so it can read public.staff
--    regardless of the caller; STABLE since it doesn't write.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where email = (auth.jwt() ->> 'email')
      and active
  );
$$;

-- 3) Re-scope the reviews policies now that we can identify staff.
drop policy if exists "reviews read"   on public.reviews;
drop policy if exists "reviews insert" on public.reviews;
drop policy if exists "reviews update" on public.reviews;
drop policy if exists "reviews delete" on public.reviews;

-- Public sees only approved reviews; staff see everything (incl. pending).
create policy "reviews read" on public.reviews for select
  using (approved = true or public.is_staff());

-- Anyone can submit, but a non-staff submission must be unapproved (no self-publish).
create policy "reviews insert" on public.reviews for insert
  with check (approved = false or public.is_staff());

-- Only staff can approve (update) or remove (delete) reviews.
create policy "reviews update" on public.reviews for update
  using (public.is_staff()) with check (public.is_staff());
create policy "reviews delete" on public.reviews for delete
  using (public.is_staff());
