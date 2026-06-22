-- 0003_staff_users.sql — add staff (employees) and users (customers) tables
-- Forward-only. Apply in the Supabase SQL Editor after 0001 and 0002.

-- ============================================================
-- staff — shop employees (manager, barbers, cashier...)
-- A staff member who is also a barber links to their barbers row.
-- NOTE: no password column on purpose — real auth should go through
-- Supabase Auth, not a plaintext field. `username` is just a handle.
-- ============================================================
create table if not exists public.staff (
  id         text primary key,                  -- 'st_manager', 'st_b1'...
  name       text not null,
  role       text not null default 'barber'
             check (role in ('manager','barber','cashier','receptionist')),
  username   text unique,
  active     boolean not null default true,
  barber_id  text references public.barbers(id),-- nullable: set when staff is a barber
  created_at timestamptz not null default now()
);

create index if not exists staff_role_idx on public.staff (role);

-- ============================================================
-- users — customers (people who book)
-- Standalone for now; bookings still store the customer name as text.
-- mobile is NOT unique (demo data reuses a number for 'You').
-- ============================================================
create table if not exists public.users (
  id         text primary key,                  -- app-generated slug / id
  name       text not null,
  mobile     text not null default '',
  email      text,
  created_at timestamptz not null default now()
);

create index if not exists users_mobile_idx on public.users (mobile);

-- ============================================================
-- Row Level Security
-- DEMO-grade policies (anon read/insert/update). These tables hold personal
-- data (names, phone numbers) — LOCK THIS DOWN before production: restrict
-- staff to authenticated staff, and limit users to each customer's own row.
-- ============================================================
alter table public.staff enable row level security;
alter table public.users enable row level security;

create policy "staff read"   on public.staff for select using (true);
create policy "staff insert" on public.staff for insert with check (true);
create policy "staff update" on public.staff for update using (true) with check (true);

create policy "users read"   on public.users for select using (true);
create policy "users insert" on public.users for insert with check (true);
create policy "users update" on public.users for update using (true) with check (true);

-- ---------- seed: staff ----------
insert into public.staff (id, name, role, username, active, barber_id) values
  ('st_manager','Guapito Reyes','manager','manager',true,null),
  ('st_b1','Marco Cano','barber','marco',true,'b1'),
  ('st_b2','Rico Delgado','barber','rico',true,'b2'),
  ('st_b3','Tonio Reyes','barber','tonio',true,'b3'),
  ('st_b4','JP Salcedo','barber','jp',true,'b4')
on conflict (id) do nothing;

-- ---------- seed: users (from the demo customer list) ----------
insert into public.users (id, name, mobile) values
  ('u_diego-ramos','Diego Ramos','0917 555 0142'),
  ('u_paolo-cruz','Paolo Cruz','0917 233 8841'),
  ('u_migs-tan','Migs Tan','0918 770 1209'),
  ('u_andro-lim','Andro Lim','0915 442 6677'),
  ('u_kiko-vera','Kiko Vera','0917 909 3321'),
  ('u_bea-santos','Bea Santos','0916 558 0042'),
  ('u_tom-aquino','Tom Aquino','0905 661 7788'),
  ('u_rafa-diaz','Rafa Diaz','0917 014 9920'),
  ('u_leo-mercado','Leo Mercado','0919 332 1144'),
  ('u_nina-cho','Nina Cho','0917 880 4521'),
  ('u_erik-pena','Erik Pena','0908 221 9087'),
  ('u_sam-ong','Sam Ong','0917 600 1132'),
  ('u_jepoy-reyes','Jepoy Reyes','0915 778 3360'),
  ('u_carlo-yu','Carlo Yu','0917 449 2288'),
  ('u_vince-lao','Vince Lao','0918 003 7741'),
  ('u_you','You','0917 555 0142')
on conflict (id) do nothing;
