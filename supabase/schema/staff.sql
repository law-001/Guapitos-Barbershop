-- Snapshot of public.staff — current shape. Source of truth: migrations/.
create table if not exists public.staff (
  id         text primary key,
  name       text not null,
  role       text not null default 'barber'
             check (role in ('manager','barber','cashier','receptionist')),
  username   text unique,
  email      text unique,
  active     boolean not null default true,
  barber_id  text references public.barbers(id),
  created_at timestamptz not null default now()
);
create index if not exists staff_role_idx on public.staff (role);

alter table public.staff enable row level security;
-- Owner-or-staff (migration 0020). The self-email clause lets a just-signed-in
-- member read their own row; is_staff() (defined below, SECURITY DEFINER) covers
-- the full roster. Writes are staff-only; initial provisioning runs as
-- service_role / via the SQL editor, which bypass RLS.
create policy "staff read" on public.staff for select
  using (public.is_staff() or lower(email) = lower(auth.jwt() ->> 'email'));
-- Writes also require a fresh session (migration 0023). Read stays ungated so
-- staff login / password-recovery / admin auto-unlock work from a recovery
-- session whose last_sign_in_at may be stale.
create policy "staff insert" on public.staff for insert
  with check (public.session_fresh() and public.is_staff());
create policy "staff update" on public.staff for update
  using (public.session_fresh() and public.is_staff())
  with check (public.session_fresh() and public.is_staff());
-- No DELETE policy → deactivate via active=false, not row deletes.

-- Staff identity check used by other tables' RLS (e.g. reviews). True when the
-- signed-in JWT email matches an active staff row.
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
