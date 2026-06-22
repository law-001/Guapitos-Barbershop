-- 0001_init.sql — initial schema for Guapito's Barbershop
-- Forward-only. Never edit after it has run; write a new migration to change it.
-- Apply in the Supabase SQL Editor (or `supabase db push`).

-- ============================================================
-- barbers (reference / config — mirrors src/data.js BARBERS)
-- ============================================================
create table if not exists public.barbers (
  id       text primary key,          -- 'b1'..'b4'
  name     text not null,
  spec     text not null default '',
  initials text not null default '',
  color    text not null default '#D6C3A0'
);

-- ============================================================
-- services (reference / config — mirrors src/data.js SERVICES)
-- ============================================================
create table if not exists public.services (
  id    text primary key,
  cat   text not null,
  name  text not null,
  sub   text not null default '',
  price numeric not null default 0,
  dur   integer not null default 45     -- minutes
);

-- ============================================================
-- bookings (the live, mutable table)
-- ============================================================
create table if not exists public.bookings (
  id         text primary key,                       -- app-generated ('seed0', 'u<ts>', 'a<ts>'...)
  date       date not null,                          -- appointment day
  barber     text not null references public.barbers(id),
  start_min  integer not null,                       -- minutes from midnight (e.g. 600 = 10:00)
  dur        integer not null,                       -- duration in minutes
  service    text not null,                          -- denormalized service label ('Haircut', 'Cut & Shave'...)
  price      numeric not null default 0,
  customer   text not null default 'Walk-in',
  status     text not null default 'confirmed'
             check (status in ('confirmed','completed','no-show','cancelled')),
  mine       boolean not null default false,         -- true = belongs to the signed-in demo user
  pay        text,                                   -- 'shop' | 'online' | 'gcash' | 'cod' | 'card'
  notes      text not null default '',
  follow_up  boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists bookings_date_idx   on public.bookings (date);
create index if not exists bookings_barber_idx on public.bookings (barber);

-- ============================================================
-- Row Level Security
-- NOTE: this is a DEMO app with NO Supabase Auth — the browser uses the
-- publishable (anon) key directly. These policies grant the anon role full
-- access so the booking flow works. For production, add real auth and
-- restrict writes (e.g. only staff can change status / read all customers).
-- ============================================================
alter table public.barbers  enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;

-- barbers / services: read-only to everyone
create policy "barbers read"  on public.barbers  for select using (true);
create policy "services read" on public.services for select using (true);

-- bookings: anon may read, create, and update (demo)
create policy "bookings read"   on public.bookings for select using (true);
create policy "bookings insert" on public.bookings for insert with check (true);
create policy "bookings update" on public.bookings for update using (true) with check (true);
