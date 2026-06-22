-- Snapshot of public.staff — current shape. Source of truth: migrations/.
create table if not exists public.staff (
  id         text primary key,
  name       text not null,
  role       text not null default 'barber'
             check (role in ('manager','barber','cashier','receptionist')),
  username   text unique,
  active     boolean not null default true,
  barber_id  text references public.barbers(id),
  created_at timestamptz not null default now()
);
create index if not exists staff_role_idx on public.staff (role);

alter table public.staff enable row level security;
create policy "staff read"   on public.staff for select using (true);
create policy "staff insert" on public.staff for insert with check (true);
create policy "staff update" on public.staff for update using (true) with check (true);
