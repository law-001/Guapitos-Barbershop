-- Snapshot of public.bookings — current shape. Source of truth: migrations/.
create table if not exists public.bookings (
  id         text primary key,
  date       date not null,
  barber     text not null references public.barbers(id),
  start_min  integer not null,
  dur        integer not null,
  service    text not null,
  price      numeric not null default 0,
  customer   text not null default 'Walk-in',
  email      text,
  status     text not null default 'booked'
             check (status in ('booked','checked-in','in-progress','completed','cancelled','no-show')),
  mine       boolean not null default false,
  pay        text,
  notes      text not null default '',
  follow_up  boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bookings_date_idx   on public.bookings (date);
create index if not exists bookings_barber_idx on public.bookings (barber);
create index if not exists bookings_email_idx  on public.bookings (email);

alter table public.bookings enable row level security;
create policy "bookings read"   on public.bookings for select using (true);
create policy "bookings insert" on public.bookings for insert with check (true);
create policy "bookings update" on public.bookings for update using (true) with check (true);
