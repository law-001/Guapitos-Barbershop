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
create policy "staff read"   on public.staff for select using (true);
create policy "staff insert" on public.staff for insert with check (true);
create policy "staff update" on public.staff for update using (true) with check (true);

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
