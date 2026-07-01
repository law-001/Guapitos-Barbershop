-- ============================================================================
-- Guapito's Barbershop — FULL DATABASE SETUP (generated bundle)
-- ============================================================================
-- Paste this ONCE into a fresh Supabase project's SQL Editor to build the
-- entire schema, RLS policies, functions, views and seed data in one run.
--
-- SOURCE OF TRUTH is supabase/migrations/*.sql. This file is a generated
-- concatenation of every migration in order — do NOT hand-edit it. After
-- adding a new migration, regenerate (see supabase/HANDOFF.md).
--
-- Safe on a fresh project: migrations use 'if not exists' / 'drop ... if
-- exists' / 'create or replace', so running the whole chain is clean.
-- ============================================================================

-- ////////////////////////////////////////////////////////////////////////
-- 0001_init.sql
-- ////////////////////////////////////////////////////////////////////////
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


-- ////////////////////////////////////////////////////////////////////////
-- 0002_seed.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0002_seed.sql — seed reference data + demo bookings
-- Idempotent via ON CONFLICT. Booking dates are relative to CURRENT_DATE at
-- insert time, so a fresh seed looks "live" (today's schedule + recent history).
-- Re-run this migration any day to refresh the demo dates.

-- ---------- barbers ----------
insert into public.barbers (id, name, spec, initials, color) values
  ('b1','Marco Cano','Skin fades & tapers','MC','#D6C3A0'),
  ('b2','Rico Delgado','Classic cuts & hot-towel shaves','RD','#A8B59A'),
  ('b3','Tonio Reyes','Color, highlights & perms','TR','#9FB4C2'),
  ('b4','JP Salcedo','Beard sculpting & kids cuts','JP','#C89B72')
on conflict (id) do update set
  name=excluded.name, spec=excluded.spec, initials=excluded.initials, color=excluded.color;

-- ---------- services ----------
insert into public.services (id, cat, name, sub, price, dur) values
  ('hc','Cuts & Shave','Haircut','with shampoo',300,45),
  ('sig','Cuts & Shave','Guapito''s Signature','shampoo + face massage',350,60),
  ('shave','Cuts & Shave','Signature Shave','',300,30),
  ('wcut','Cuts & Shave','Women''s Cut','',400,60),
  ('deepcon','Treatments','Deep Conditioning','',900,45),
  ('dryscalp','Treatments','Dry Scalp Treatment','',950,45),
  ('antidan','Treatments','Anti Dandruff','',950,45),
  ('massage','Treatments','Massage','scalp / back / hand · 15 min',300,15),
  ('hcolO','Color','Hair Color — Ordinary','',750,90),
  ('hcolG','Color','Hair Color — Organic','',1050,90),
  ('bcolO','Color','Beard Color — Ordinary','',550,45),
  ('bcolG','Color','Beard Color — Organic','',850,45),
  ('pkgCS','Packages','Cut & Shave','',550,75),
  ('pkgDC','Packages','Cut & Treatment','Deep Conditioning',1200,90),
  ('pkgAD','Packages','Cut & Treatment','Anti Dandruff / Dry Scalp',1250,90),
  ('pkgCO','Packages','Cut & Color — Ordinary','',1100,120),
  ('pkgCOg','Packages','Cut & Color — Organic','',1400,120),
  ('perm','Packages','Perm','',2000,120),
  ('hlO','Packages','Highlights — Only','',1200,150),
  ('hlB','Packages','Highlights — w/ Base Color','',1900,150),
  ('bleach','Packages','Bleach / Fashion Color','',1800,150)
on conflict (id) do update set
  cat=excluded.cat, name=excluded.name, sub=excluded.sub, price=excluded.price, dur=excluded.dur;

-- ---------- bookings ----------
-- date = current_date + offset_days. mine=false unless noted.
insert into public.bookings
  (id, date, barber, start_min, dur, service, price, customer, status, mine, pay, notes, follow_up) values
  -- today's schedule
  ('seed0',  current_date + 0, 'b1', 600, 45, 'Haircut', 300, 'Diego Ramos', 'completed', false, 'shop', '', false),
  ('seed1',  current_date + 0, 'b1', 720, 75, 'Cut & Shave', 550, 'Paolo Cruz', 'confirmed', false, 'shop', '', false),
  ('seed2',  current_date + 0, 'b1', 900, 45, 'Haircut', 300, 'Migs Tan', 'confirmed', false, 'shop', '', false),
  ('seed3',  current_date + 0, 'b2', 630, 60, 'Guapito''s Signature', 350, 'Andro Lim', 'completed', false, 'shop', '', false),
  ('seed4',  current_date + 0, 'b2', 810, 90, 'Hair Color — Organic', 1050, 'Kiko Vera', 'confirmed', false, 'shop', '', false),
  ('seed5',  current_date + 0, 'b3', 660, 120, 'Perm', 2000, 'Bea Santos', 'confirmed', false, 'shop', '', false),
  ('seed6',  current_date + 0, 'b3', 900, 45, 'Beard Color — Ordinary', 550, 'Tom Aquino', 'no-show', false, 'shop', '', false),
  ('seed7',  current_date + 0, 'b4', 600, 30, 'Signature Shave', 300, 'Rafa Diaz', 'completed', false, 'shop', '', false),
  ('seed8',  current_date + 0, 'b4', 690, 45, 'Haircut', 300, 'Leo Mercado', 'confirmed', false, 'shop', '', false),
  ('seed9',  current_date + 0, 'b4', 840, 60, 'Women''s Cut', 400, 'Nina Cho', 'confirmed', false, 'shop', '', false),
  -- upcoming days
  ('seed10', current_date + 1, 'b1', 600, 45, 'Haircut', 300, 'Walk-in', 'confirmed', false, 'shop', '', false),
  ('seed11', current_date + 1, 'b2', 660, 90, 'Cut & Color — Ordinary', 1100, 'Erik Pena', 'confirmed', false, 'shop', '', false),
  ('seed12', current_date + 1, 'b3', 720, 150, 'Highlights — Only', 1200, 'Sam Ong', 'confirmed', false, 'shop', '', false),
  ('seed13', current_date + 1, 'b4', 780, 75, 'Cut & Shave', 550, 'Jepoy Reyes', 'confirmed', false, 'shop', '', false),
  ('seed14', current_date + 2, 'b2', 630, 45, 'Haircut', 300, 'Carlo Yu', 'confirmed', false, 'shop', '', false),
  ('seed15', current_date + 2, 'b3', 900, 120, 'Cut & Color — Organic', 1400, 'Vince Lao', 'confirmed', false, 'shop', '', false),
  -- history
  ('hist0',  current_date - 2,  'b1', 600, 45, 'Haircut', 300, 'Migs Tan', 'completed', false, 'online', '', false),
  ('hist1',  current_date - 2,  'b3', 900, 90, 'Hair Color — Organic', 1050, 'Kiko Vera', 'completed', false, 'shop', '', false),
  ('hist2',  current_date - 3,  'b2', 720, 75, 'Cut & Shave', 550, 'Paolo Cruz', 'completed', false, 'shop', '', false),
  ('hist3',  current_date - 3,  'b4', 780, 60, 'Women''s Cut', 400, 'Nina Cho', 'no-show', false, 'online', '', false),
  ('hist4',  current_date - 5,  'b1', 660, 45, 'Haircut', 300, 'Leo Mercado', 'completed', false, 'shop', '', false),
  ('hist5',  current_date - 6,  'b3', 600, 120, 'Perm', 2000, 'Bea Santos', 'completed', false, 'shop', '', false),
  ('hist6',  current_date - 7,  'b2', 840, 30, 'Signature Shave', 300, 'Rafa Diaz', 'completed', false, 'online', '', false),
  ('hist7',  current_date - 9,  'b1', 600, 45, 'Haircut', 300, 'Diego Ramos', 'completed', false, 'shop', '', false),
  ('hist8',  current_date - 10, 'b4', 690, 45, 'Beard Color — Ordinary', 550, 'Tom Aquino', 'completed', false, 'shop', '', false),
  ('hist9',  current_date - 12, 'b2', 720, 120, 'Cut & Color — Ordinary', 1100, 'Erik Pena', 'completed', false, 'online', '', false),
  ('hist10', current_date - 14, 'b3', 840, 150, 'Highlights — Only', 1200, 'Sam Ong', 'completed', false, 'shop', '', false),
  ('hist11', current_date - 15, 'b1', 660, 75, 'Cut & Shave', 550, 'Jepoy Reyes', 'completed', false, 'shop', '', false),
  ('hist12', current_date - 18, 'b2', 630, 45, 'Haircut', 300, 'Carlo Yu', 'completed', false, 'online', '', false),
  ('hist13', current_date - 20, 'b1', 600, 45, 'Haircut', 300, 'Migs Tan', 'completed', false, 'shop', '', false),
  ('hist14', current_date - 22, 'b3', 810, 90, 'Hair Color — Organic', 1050, 'Kiko Vera', 'completed', false, 'shop', '', false),
  ('hist15', current_date - 25, 'b2', 720, 75, 'Cut & Shave', 550, 'Paolo Cruz', 'cancelled', false, 'online', '', false),
  ('hist16', current_date - 28, 'b1', 660, 60, 'Guapito''s Signature', 350, 'Andro Lim', 'completed', false, 'shop', '', false),
  -- the demo user's own bookings
  ('mine1',    current_date + 3, 'b1', 660, 45, 'Haircut', 300, 'You', 'confirmed', true, 'online', 'Mid skin fade, scissor on top', false),
  ('minepast', current_date - 7, 'b2', 720, 75, 'Cut & Shave', 550, 'You', 'completed', true, 'shop', '', false)
on conflict (id) do nothing;


-- ////////////////////////////////////////////////////////////////////////
-- 0003_staff_users.sql
-- ////////////////////////////////////////////////////////////////////////
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


-- ////////////////////////////////////////////////////////////////////////
-- 0004_clear_dummy_data.sql
-- ////////////////////////////////////////////////////////////////////////
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


-- ////////////////////////////////////////////////////////////////////////
-- 0006_appointment_statuses.sql
-- ////////////////////////////////////////////////////////////////////////
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


-- ////////////////////////////////////////////////////////////////////////
-- 0007_split_user_names.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0007_split_user_names.sql — split public.users.name into first_name + last_name
-- Forward-only. Apply in the Supabase SQL Editor after 0006.
--
-- Also adds a UNIQUE constraint on email so the app can upsert a customer
-- profile keyed on their (verified) email — the next time the same email is
-- verified, first_name / last_name / mobile auto-fill from this row.

-- 1) New columns.
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name  text;

-- 2) Backfill from the old single `name`: everything before the first space is
--    the first name, the remainder is the last name (NULL-safe).
update public.users
set first_name = coalesce(first_name, split_part(name, ' ', 1)),
    last_name  = coalesce(
      nullif(last_name, ''),
      nullif(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), '')
    )
where name is not null;

-- 3) Drop the old column now that data is migrated.
alter table public.users drop column if exists name;

-- 4) Make email unique so upsert-on-email works (multiple NULLs stay allowed —
--    Postgres treats NULLs as distinct under a UNIQUE constraint).
alter table public.users add constraint users_email_key unique (email);


-- ////////////////////////////////////////////////////////////////////////
-- 0008_booking_email.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0008_booking_email.sql — tie a booking to the customer's verified email.
-- Forward-only. Apply in the Supabase SQL Editor after 0007.
--
-- "My Appointments" is gated behind email verification (login) and scoped to
-- the signed-in email, so each booking records the email that created it.
-- Nullable: admin/walk-in bookings may have no customer email.

alter table public.bookings add column if not exists email text;

-- Helps the per-customer lookup ("show bookings for this email").
create index if not exists bookings_email_idx on public.bookings (email);


-- ////////////////////////////////////////////////////////////////////////
-- 0009_clear_all_bookings.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0009_clear_all_bookings.sql — wipe ALL bookings for a clean slate.
-- Forward-only. Apply in the Supabase SQL Editor after 0008.
--
-- Destructive: removes every row in public.bookings (demo + real). Keeps the
-- table, its columns/indexes, and reference data (barbers, services, staff).
-- After this, My Appointments and the admin schedule start empty.

delete from public.bookings;


-- ////////////////////////////////////////////////////////////////////////
-- 0010_login_timestamp.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0010_login_timestamp.sql — record each customer's last successful sign-in.
-- Forward-only. Apply in the Supabase SQL Editor after 0009.
--
-- Drives the absolute session-lifetime policy: the app stamps this column on
-- every successful sign-in and, on startup / protected-page access / periodic
-- checks, signs the user out once (now - login_timestamp) exceeds the configured
-- maximum (VITE_SESSION_MAX_HOURS, default 24h). Because the cutoff is computed
-- from this server-stored value, the clock keeps running while the browser is
-- closed and a plain page refresh never resets it.
--
-- Nullable: rows that predate this column stay null until their next sign-in,
-- and a null timestamp is treated as "not yet expired" (never locks anyone out).

alter table public.users add column if not exists login_timestamp timestamptz;


-- ////////////////////////////////////////////////////////////////////////
-- 0011_reviews.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0011_reviews.sql — customer reviews (mirrored from Guapito's Google Maps page).
-- Forward-only. Apply in the Supabase SQL Editor after 0010.
--
-- Reviews are entered by hand (copied from the shop's Google Maps listing) and
-- stored here so the Reviews page reads them from the DB like everything else.
-- Google does not expose full review text without the paid Places API, so this
-- table is the source of truth; paste new rows into supabase/seed/reviews.sql.
--
-- Columns:
--   id            stable text key (e.g. 'g1', 'g2' for google review #1, #2)
--   author        reviewer's display name as shown on Google
--   rating        1..5 stars
--   body          the review text (may be '' if they left only a star rating)
--   review_date   absolute date if known (Google shows relative time, so often null)
--   relative_time the "2 months ago" style label straight off Google (optional)
--   source        where it came from; defaults to 'google'
--   created_at    when we inserted the row

create table if not exists public.reviews (
  id            text primary key,
  author        text not null,
  rating        integer not null check (rating between 1 and 5),
  body          text not null default '',
  review_date   date,
  relative_time text,
  source        text not null default 'google',
  created_at    timestamptz not null default now()
);
create index if not exists reviews_rating_idx on public.reviews (rating);

alter table public.reviews enable row level security;
-- Demo-grade: anyone can read; only inserts/updates are open too for now (no
-- Supabase Auth yet). Tighten before production so the public can't write.
create policy "reviews read"   on public.reviews for select using (true);
create policy "reviews insert" on public.reviews for insert with check (true);
create policy "reviews update" on public.reviews for update using (true) with check (true);

-- Sample rows so the page renders immediately. REPLACE with the real Google
-- reviews (same shape lives in supabase/seed/reviews.sql).
insert into public.reviews (id, author, rating, body, relative_time, source) values
  ('sample1', 'Sample Reviewer', 5, 'Replace these sample rows with the real reviews from the Google Maps page.', 'just now', 'google')
on conflict (id) do nothing;


-- ////////////////////////////////////////////////////////////////////////
-- 0012_seed_reviews.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0012_seed_reviews.sql — real reviews copied from Guapito's Google Maps listing.
-- Forward-only. Apply in the Supabase SQL Editor after 0011.
--
-- Replaces the placeholder sample row from 0011 with the 22 actual reviews.
-- Google only shows relative dates ("a year ago"), so review_date stays null and
-- relative_time holds that label. Ratings 1-5; body is '' for star-only reviews.

delete from public.reviews where id = 'sample1';

insert into public.reviews (id, author, rating, body, relative_time, source) values
  ('g1',  'Charlie Santiago', 5, 'The best service i ever had,especially the one guy make my hair,i forgot to ask his name but he have long hair 👍👍👍nice cut and perm 😍😍', 'a year ago', 'google'),
  ('g2',  'Gian Francisco', 4, 'Great service and very professional styling. A little expensive at P250 per haircut, but they throw in shaving, shampooing, and a little massage as well.', '6 years ago', 'google'),
  ('g3',  'Calvin Dalisay', 4, 'Service was great! Parking is terrible. Always look for Francis. He knows what he is doing. Pulido gumawa.', '3 years ago', 'google'),
  ('g4',  'rodolfo marcial', 5, 'napaka elegante at napaka linis...i highly recomend guapitos barbershop', '5 years ago', 'google'),
  ('g5',  'Louelle Bernardez', 5, 'Lupet dito☺️🤩', '5 years ago', 'google'),
  ('g6',  'John Vincent Hersalia (2E)', 5, 'Dabest', '3 years ago', 'google'),
  ('g7',  'Tony Conforti', 5, '', '3 years ago', 'google'),
  ('g8',  'Geline Allyson Tallara', 5, '', '2 months ago', 'google'),
  ('g9',  'Gemille Carreon / Toyota Marilao', 5, '', '11 months ago', 'google'),
  ('g10', 'Raul Jr Mendoza', 5, '', '2 years ago', 'google'),
  ('g11', 'Clarence Macapagal', 5, '', '3 years ago', 'google'),
  ('g12', 'EJ-Jalen Abanggan', 5, '', '3 years ago', 'google'),
  ('g13', 'Mendoza Raul Jr', 5, '', '3 years ago', 'google'),
  ('g14', 'Arjenn Enriquez', 5, '', '5 years ago', 'google'),
  ('g15', 'Jeramaine Torres', 5, '', '5 years ago', 'google'),
  ('g16', 'Adrian Aracelli Anderson', 5, '', '5 years ago', 'google'),
  ('g17', 'John Laya', 5, '', '5 years ago', 'google'),
  ('g18', 'Frederick Fabian', 5, '', '5 years ago', 'google'),
  ('g19', 'Jem Mariano', 5, '', '6 years ago', 'google'),
  ('g20', 'Pranc Michael Banluta', 5, '', '6 years ago', 'google'),
  ('g21', 'Richard King', 1, '', '3 years ago', 'google'),
  ('g22', 'Liberty Bernal', 4, '', '2 years ago', 'google')
on conflict (id) do nothing;


-- ////////////////////////////////////////////////////////////////////////
-- 0013_review_moderation.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0013_review_moderation.sql — moderation flag for reviews.
-- Forward-only. Apply in the Supabase SQL Editor after 0012.
--
-- New website-submitted reviews land unapproved (approved=false) and stay hidden
-- from the public site until staff approve them in the admin Reviews page. The
-- existing Google-sourced reviews are real, so backfill them to approved=true.

alter table public.reviews add column if not exists approved boolean not null default false;

-- Backfill: the reviews mirrored from Google are genuine — publish them.
update public.reviews set approved = true where source = 'google';

create index if not exists reviews_approved_idx on public.reviews (approved);


-- ////////////////////////////////////////////////////////////////////////
-- 0014_reviews_delete_policy.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0014_reviews_delete_policy.sql — allow deleting reviews.
-- Forward-only. Apply in the Supabase SQL Editor after 0013.
--
-- The admin Reviews page "Reject"/"Remove" action deletes the row, but RLS had
-- no DELETE policy, so deletes were silently blocked (0 rows affected, no error).
--
-- This policy permits deletes at the DB level. It can't yet be scoped to staff:
-- the admin is a client-side login (manager/guapito), not a Supabase Auth
-- session, so Postgres has no "staff" identity to check against. When staff auth
-- is wired for production, replace this with a staff-only policy, e.g.:
--   create policy "reviews delete" on public.reviews for delete
--     using (auth.jwt() ->> 'role' = 'staff');

create policy "reviews delete" on public.reviews for delete using (true);


-- ////////////////////////////////////////////////////////////////////////
-- 0015_staff_auth.sql
-- ////////////////////////////////////////////////////////////////////////
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


-- ////////////////////////////////////////////////////////////////////////
-- 0016_login_throttle.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0016_login_throttle.sql — progressive, server-side staff-login throttling.
-- Forward-only. Apply in the Supabase SQL Editor after 0015.
--
-- Backs the `staff-login` Edge Function. The function (running as service_role)
-- is the ONLY caller of these helpers — execute is revoked from anon/authenticated
-- so a browser can't poke the throttle directly. State lives in the DB so it
-- survives a cooldown: offenses escalate and only reset on a successful login or
-- after 24h of no failures.
--
-- Keyed generically by `key` so the function can throttle per-email ('email:x')
-- AND per-IP ('ip:1.2.3.4') with the same logic.
--
-- Progressive penalty by offense level (each offense = hitting the fail threshold):
--   1 → 60s · 2 → 5m · 3 → 15m · 4 → 1h · 5+ → 24h (temporary suspension)

create table if not exists public.login_throttle (
  key             text primary key,
  fail_count      integer not null default 0,   -- failures in the current streak
  offense_count   integer not null default 0,   -- lockouts triggered (penalty level)
  locked_until    timestamptz,                  -- current lockout expiry (null = open)
  last_failed_at  timestamptz,
  last_offense_at timestamptz,
  updated_at      timestamptz not null default now()
);

-- Only the service role (Edge Function) may read/write this table.
alter table public.login_throttle enable row level security;

-- Seconds of lockout for a given offense level.
create or replace function public.login_penalty_seconds(p_offense integer)
returns integer language sql immutable as $$
  select case
    when p_offense <= 1 then 60
    when p_offense = 2 then 300
    when p_offense = 3 then 900
    when p_offense = 4 then 3600
    else 86400
  end;
$$;

-- Is this key currently locked? Read-only. Treats >24h-idle history as clean.
create or replace function public.login_throttle_check(p_key text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.login_throttle; now_ts timestamptz := now();
begin
  select * into r from public.login_throttle where key = p_key;
  if not found or r.last_failed_at is null or r.last_failed_at < now_ts - interval '24 hours' then
    return json_build_object('locked', false, 'retry_after', 0, 'offense', 0);
  end if;
  if r.locked_until is not null and r.locked_until > now_ts then
    return json_build_object('locked', true,
      'retry_after', ceil(extract(epoch from (r.locked_until - now_ts)))::int,
      'offense', r.offense_count);
  end if;
  return json_build_object('locked', false, 'retry_after', 0, 'offense', r.offense_count);
end; $$;

-- Record a failed attempt and apply progressive lockout when the streak hits the
-- threshold. Returns the resulting lock state. Atomic (row-locked) per key.
create or replace function public.login_throttle_fail(p_key text, p_threshold integer default 5)
returns json language plpgsql security definer set search_path = public as $$
declare r public.login_throttle; now_ts timestamptz := now(); pen integer;
begin
  insert into public.login_throttle (key, last_failed_at, updated_at)
    values (p_key, now_ts, now_ts)
    on conflict (key) do nothing;
  select * into r from public.login_throttle where key = p_key for update;

  -- Stale streak (>24h since last failure) → start fresh before counting.
  if r.last_failed_at is null or r.last_failed_at < now_ts - interval '24 hours' then
    r.fail_count := 0; r.offense_count := 0; r.locked_until := null;
  end if;

  r.fail_count := r.fail_count + 1;
  r.last_failed_at := now_ts;

  if r.fail_count >= p_threshold then
    r.offense_count := r.offense_count + 1;
    pen := public.login_penalty_seconds(r.offense_count);
    r.locked_until := now_ts + make_interval(secs => pen);
    r.last_offense_at := now_ts;
    r.fail_count := 0;
  end if;

  update public.login_throttle set
    fail_count = r.fail_count, offense_count = r.offense_count,
    locked_until = r.locked_until, last_failed_at = r.last_failed_at,
    last_offense_at = r.last_offense_at, updated_at = now_ts
  where key = p_key;

  return json_build_object(
    'locked', r.locked_until is not null and r.locked_until > now_ts,
    'retry_after', case when r.locked_until is not null and r.locked_until > now_ts
                        then ceil(extract(epoch from (r.locked_until - now_ts)))::int else 0 end,
    'offense', r.offense_count,
    'attempts_left', greatest(0, p_threshold - r.fail_count));
end; $$;

-- Wipe a key's history (called on a successful login for that email).
create or replace function public.login_throttle_clear(p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.login_throttle where key = p_key;
end; $$;

-- Lock the helpers down: browsers (anon/authenticated) cannot call them; only the
-- Edge Function's service_role may.
revoke all on function public.login_throttle_check(text)          from public;
revoke all on function public.login_throttle_fail(text, integer)  from public;
revoke all on function public.login_throttle_clear(text)          from public;
grant execute on function public.login_throttle_check(text)         to service_role;
grant execute on function public.login_throttle_fail(text, integer) to service_role;
grant execute on function public.login_throttle_clear(text)         to service_role;


-- ////////////////////////////////////////////////////////////////////////
-- 0017_noshow_autosweep.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0017_noshow_autosweep.sql — server-side automatic No-Show marking.
-- Forward-only. Apply in the Supabase SQL Editor after 0016.
--
-- Why this exists: a 'booked' appointment that nobody checked in, left more than
-- a grace period past its start time, becomes a No-Show. The app used to do this
-- in the browser (any open tab wrote the status). That breaks once `bookings`
-- writes are locked down by RLS, AND it never runs when no browser is open.
--
-- This moves the logic into the database so it is authoritative and runs on its
-- own schedule (pg_cron), regardless of who — if anyone — has the site open. The
-- app still calls the same function for an instant in-tab update, but the cron
-- job is the guarantee.
--
-- TWO KNOBS (edit here, both used inside the function below):
--   • Grace period      → interval '10 minutes'   (longer = more lenient)
--   • Shop time zone     → 'Asia/Manila'           (must match the shop's locale;
--                          appointment times are stored as wall-clock minutes)

-- ── 1) The marking function ──────────────────────────────────────────────────
-- SECURITY DEFINER → runs as the function owner (postgres, which bypasses RLS),
-- so it can update rows even after we tighten the table's write policies. It is
-- SAFE to expose because it can ONLY flip overdue 'booked' rows to 'no-show' —
-- it takes no arguments and touches nothing else. Returns the ids it changed so
-- the caller can update its UI and toast.
create or replace function public.mark_overdue_no_shows()
returns table(id text)
language sql
security definer
set search_path = public
as $$
  update public.bookings b
  set status = 'no-show'
  where b.status = 'booked'
    and ((b.date + make_interval(mins => b.start_min)) at time zone 'Asia/Manila')
        + interval '10 minutes' < now()
  returning b.id;
$$;

-- The browser (anon or signed-in) is allowed to trigger the sweep — but only via
-- this constrained function, never a raw UPDATE.
grant execute on function public.mark_overdue_no_shows() to anon, authenticated;

-- ── 2) Schedule it server-side every minute (the real guarantee) ─────────────
-- Best-effort: if pg_cron can't be auto-enabled on this instance, the function
-- + grant above still install, so the in-app sweep keeps working. To add the
-- server cron later: Dashboard → Database → Extensions → enable `pg_cron`, then
-- re-run just the block below.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'Could not enable pg_cron automatically: %. Enable it in Dashboard > Database > Extensions, then re-run the schedule block.', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'noshow-sweep') then
      perform cron.unschedule('noshow-sweep');
    end if;
    perform cron.schedule('noshow-sweep', '* * * * *', 'select public.mark_overdue_no_shows();');
    raise notice 'Scheduled noshow-sweep to run every minute.';
  else
    raise notice 'pg_cron not present — server cron NOT scheduled (in-app sweep still works).';
  end if;
end $$;


-- ////////////////////////////////////////////////////////////////////////
-- 0018_tighten_bookings_writes.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0018_tighten_bookings_writes.sql — lock down who can write a booking.
-- Forward-only. Apply in the Supabase SQL Editor after 0017.
--
-- Before this, `bookings` had demo-grade RLS: anon could insert/update ANY row
-- (using (true)), so anyone with the public key + a booking id could cancel or
-- change someone else's appointment. This replaces the write policies with
-- owner-or-staff rules. READS stay open for now (the public booking screen needs
-- to see occupancy to offer free slots — locking reads is a separate, larger
-- change that needs an occupancy view first).
--
-- Depends on:
--   • public.is_staff()  (migration 0015 / schema/staff.sql) — SECURITY DEFINER
--     boolean, true when the signed-in JWT email is an active staff member.
--   • mark_overdue_no_shows() (0017) is SECURITY DEFINER, so the auto No-Show
--     sweep keeps working despite these tighter write rules.
--
-- "Owner" = the signed-in customer whose verified email is on the row. Customers
-- sign in via email OTP and staff via the staff-login function, so both carry a
-- real Supabase session whose JWT email we can trust here. Email match is
-- case-insensitive for safety.

-- Remove the permissive write policies.
drop policy if exists "bookings insert" on public.bookings;
drop policy if exists "bookings update" on public.bookings;

-- INSERT: a customer may only create a booking under their own email; staff may
-- create any (walk-ins, phone bookings, etc.).
create policy "bookings insert own or staff"
  on public.bookings for insert
  with check (
    (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff()
  );

-- UPDATE: a customer may only change their own booking (reschedule / cancel);
-- staff may change any. `using` gates which existing rows are visible to update;
-- `with check` ensures they can't reassign a row to someone else.
create policy "bookings update own or staff"
  on public.bookings for update
  using (
    (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff()
  )
  with check (
    (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff()
  );

-- NOTE: no DELETE policy is defined, so with RLS enabled deletes are denied for
-- everyone (anon + authenticated). Bookings are cancelled (status change), never
-- deleted, by the app. Admin housekeeping deletes go through the SQL editor.
-- NOTE: "bookings read" (select using (true)) is intentionally left in place —
-- see header. Tighten reads in a later migration once an occupancy view exists.


-- ////////////////////////////////////////////////////////////////////////
-- 0019_bookings_read_privacy.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0019_bookings_read_privacy.sql — stop the public from reading customer details.
-- Forward-only. Apply in the Supabase SQL Editor after 0018.
--
-- Before: `bookings` had `select using (true)` — anyone with the public key could
-- read every row (names, emails, notes). That was needed because the public
-- booking screen reads bookings to know which slots are taken.
--
-- This splits the two needs:
--   • A slim VIEW (bookings_occupancy) exposes ONLY date/barber/time/status — no
--     names, emails, notes, price. Anyone may read it (for slot availability).
--   • The base table's reads are locked to owner-or-staff, matching the write
--     rules from 0018.
--
-- Net effect: the public can see "3 PM is taken" but never WHO booked it.

-- ── 1) Occupancy view (safe, public-readable, no PII) ────────────────────────
-- security_invoker = false (the default, set explicitly for clarity): the view
-- runs with its owner's rights, so it returns all rows for availability even
-- though the caller can't read the base table. It only ever exposes the columns
-- listed here, so there is no PII to leak.
create or replace view public.bookings_occupancy
  with (security_invoker = false) as
  select id, date, barber, start_min, dur, status
  from public.bookings;

grant select on public.bookings_occupancy to anon, authenticated;

-- ── 2) Lock the base table reads to owner-or-staff ───────────────────────────
drop policy if exists "bookings read" on public.bookings;
create policy "bookings read own or staff"
  on public.bookings for select
  using (
    (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff()
  );

-- NOTE: Supabase's Security Advisor will flag bookings_occupancy as a
-- "security definer view" — that is intentional here; it exposes only non-PII
-- columns on purpose so anonymous visitors can compute free slots.


-- ////////////////////////////////////////////////////////////////////////
-- 0020_lock_down_staff_and_users.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0020_lock_down_staff_and_users.sql — close two wide-open tables from 0003.
-- Forward-only. Apply in the Supabase SQL Editor after 0019.
--
-- Background: migration 0003 created `staff` and `users` with demo-grade RLS
-- (`using (true)` / `with check (true)` on every command). Bookings were later
-- tightened (0018/0019) but these two were never revisited, leaving two holes:
--
--   1) PRIVILEGE ESCALATION via `staff`. Anyone signed in (customers self-serve
--      an OTP session) could INSERT a staff row with their own email. is_staff()
--      then returns true for them, handing over every booking's PII, review
--      moderation, etc. — without ever knowing a staff password. The server-side
--      staff-login throttle is moot if the staff gate can be written directly.
--
--   2) PII LEAK via `users`. `select using (true)` let anyone dump every
--      customer's name, mobile and email; `update using (true)` let anyone
--      overwrite any profile. This undoes the privacy work of 0018/0019, which
--      hid the same data on `bookings`.
--
-- Fix: scope both tables to owner-or-staff, mirroring the bookings policies.
--
-- Depends on:
--   • public.is_staff() (0015 / schema/staff.sql) — SECURITY DEFINER, so it still
--     reads `staff` even after these reads are locked down (it bypasses RLS).
--
-- Bootstrapping note: new staff rows are added by the seed in supabase/seed or
-- the staff-login Edge Function (service_role) — both bypass RLS — so the
-- "staff may write staff" rule never deadlocks legitimate admin provisioning.

-- ── staff: no anonymous access; staff-only writes ────────────────────────────
drop policy if exists "staff read"   on public.staff;
drop policy if exists "staff insert" on public.staff;
drop policy if exists "staff update" on public.staff;

-- READ: staff see the whole roster. The self-email clause lets a member who just
-- signed in (their JWT email matches their own row) read it even before any
-- other staff context exists — without exposing the roster to outsiders.
create policy "staff read" on public.staff for select
  using (public.is_staff() or lower(email) = lower(auth.jwt() ->> 'email'));

-- WRITE: only existing staff may add or change staff. (Initial provisioning runs
-- as service_role / via the SQL editor, which bypass RLS.)
create policy "staff insert" on public.staff for insert
  with check (public.is_staff());
create policy "staff update" on public.staff for update
  using (public.is_staff()) with check (public.is_staff());
-- No DELETE policy → deactivate via `active=false`, not row deletes.

-- ── users: own row or staff ──────────────────────────────────────────────────
drop policy if exists "users read"   on public.users;
drop policy if exists "users insert" on public.users;
drop policy if exists "users update" on public.users;

-- READ: a customer may read only their own profile; staff may read all (the
-- admin Customers page). Killing the open read also closes the pre-login
-- "type an email, get the saved name+mobile" enumeration leak.
create policy "users read" on public.users for select
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.is_staff());

-- INSERT / UPDATE: a signed-in customer may only write the row whose email
-- matches their verified JWT email. touchLogin/upsertUser always run after OTP
-- verify, so the session's email equals the row's email.
create policy "users insert" on public.users for insert
  with check (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "users update" on public.users for update
  using (lower(email) = lower(auth.jwt() ->> 'email'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));
-- No DELETE policy → customer rows are not deleted by the app.


-- ////////////////////////////////////////////////////////////////////////
-- 0021_email_throttle.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0021_email_throttle.sql — rate-limit the booking-confirm Edge Function.
-- Forward-only. Apply in the Supabase SQL Editor after 0020.
--
-- Why: booking-confirm sends mail through Resend. After 0020's auth gate a
-- signed-in customer can only email their OWN address, but they can still LOOP
-- the call — and every send burns the shared Resend quota (free tier: 100/day).
-- One scripted customer can drain the day's quota so real confirmation emails
-- stop sending for everyone. This caps a non-staff caller to a few sends per
-- rolling window.
--
-- Unlike login_throttle (0016), which is service_role-only, this is called by
-- booking-confirm's USER-scoped client, so:
--   • execute is granted to `authenticated` (not just service_role), and
--   • the key is derived from the request JWT INSIDE the function (auth.jwt()),
--     never from a client argument — so a caller can't dodge the cap by passing
--     a different key. SECURITY DEFINER lets it write the RLS-locked table while
--     the per-request JWT claims (auth.jwt()) still reflect the real caller.
--   • staff are exempt (is_staff()): they legitimately fire walk-in / phone
--     confirmations in bursts, and a trusted staff session is out of scope here.

create table if not exists public.email_throttle (
  key          text primary key,             -- 'email:<lower(jwt email)>'
  sent_count   integer not null default 0,   -- sends in the current window
  window_start timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Runtime-only state; no browser/anon access. SECURITY DEFINER RPC bypasses RLS.
alter table public.email_throttle enable row level security;

-- Reserve one send for the calling user if they're under the cap. Returns
-- { allowed, retry_after[, remaining] }. Atomic (row-locked) per key. Fixed
-- window: the counter resets once p_window_secs has elapsed since window_start.
create or replace function public.email_rate_check(
  p_limit integer default 5,
  p_window_secs integer default 600
)
returns json language plpgsql security definer set search_path = public as $$
declare
  addr   text := lower(auth.jwt() ->> 'email');
  k      text;
  r      public.email_throttle;
  now_ts timestamptz := now();
begin
  -- Must be a signed-in caller (anon / no email → blocked, never counted).
  if addr is null or addr = '' then
    return json_build_object('allowed', false, 'retry_after', p_window_secs);
  end if;

  -- Staff fire walk-in confirmations in bursts and are trusted → never throttled.
  if public.is_staff() then
    return json_build_object('allowed', true, 'retry_after', 0);
  end if;

  k := 'email:' || addr;
  insert into public.email_throttle (key, sent_count, window_start, updated_at)
    values (k, 0, now_ts, now_ts)
    on conflict (key) do nothing;
  select * into r from public.email_throttle where key = k for update;

  -- Window elapsed → start a fresh window.
  if r.window_start < now_ts - make_interval(secs => p_window_secs) then
    r.sent_count := 0;
    r.window_start := now_ts;
  end if;

  -- At the cap → refuse, report when the window frees up.
  if r.sent_count >= p_limit then
    update public.email_throttle set updated_at = now_ts where key = k;
    return json_build_object(
      'allowed', false,
      'retry_after',
        ceil(extract(epoch from (r.window_start + make_interval(secs => p_window_secs) - now_ts)))::int);
  end if;

  -- Under the cap → reserve this send.
  update public.email_throttle set
    sent_count = r.sent_count + 1, window_start = r.window_start, updated_at = now_ts
  where key = k;
  return json_build_object(
    'allowed', true, 'retry_after', 0,
    'remaining', greatest(0, p_limit - (r.sent_count + 1)));
end; $$;

-- Browsers may call it (booking-confirm runs as the user), but the key is taken
-- from their JWT, so they can only throttle themselves. anon/public cannot call.
revoke all on function public.email_rate_check(integer, integer) from public;
grant execute on function public.email_rate_check(integer, integer) to authenticated, service_role;


-- ////////////////////////////////////////////////////////////////////////
-- 0022_session_fresh_bookings.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0022_session_fresh_bookings.sql — server-enforced absolute session age.
-- Forward-only. Apply in the Supabase SQL Editor after 0021.
--
-- Problem: the 24h / 30-day "session limit" is enforced ONLY in the browser
-- (src/lib/session.js + the App.jsx timer). The real Supabase session auto-
-- refreshes forever, so a token lifted off a shared/public device — or any
-- caller hitting the REST API directly, bypassing the app's timer — keeps full
-- access with no server-side cutoff. The old anchor (users.login_timestamp) is
-- also user-writable after 0020, so a user could reset their own clock.
--
-- Fix: gate the sensitive tables on session_fresh(), evaluated server-side in
-- RLS. This migration wires it into `bookings` ONLY (read/insert/update) so the
-- change can be verified in isolation before spreading to other tables.
--
-- Anchor: auth.users.last_sign_in_at — maintained by GoTrue, NOT user-writable,
-- and NOT bumped by token refresh (only by a real sign-in / OTP verify). A
-- SECURITY DEFINER function may read auth.users; it returns only a boolean, and
-- only for the caller's own row (auth.uid()), so nothing leaks.
--
-- Fails OPEN on a null/absent timestamp (legacy rows, anon) and CLOSED only when
-- a real timestamp is present and older than the ceiling — so this can never
-- mass-lock-out users, only cut genuinely stale sessions.
--
-- Ceiling: a single hard maximum (default 30 days = the longest client window),
-- so no legitimate "Keep me signed in" user is ever cut early. The browser still
-- does the nicer per-choice 24h/30d timer; this is the backstop wall.

create or replace function public.session_fresh(p_max_secs integer default 2592000)  -- 30 days
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select last_sign_in_at from auth.users where id = auth.uid())
      > now() - make_interval(secs => p_max_secs),
    true   -- null/absent (legacy row, or anon) → don't lock out
  );
$$;

-- ── Re-create the bookings policies, ANDing session_fresh() onto each ─────────
-- The owner/staff logic is unchanged from 0018/0019; only the freshness gate is
-- added. NOTE: the public slot picker reads bookings_occupancy (a separate,
-- ungated view), so signed-out availability is unaffected.

drop policy if exists "bookings read own or staff"   on public.bookings;
drop policy if exists "bookings insert own or staff" on public.bookings;
drop policy if exists "bookings update own or staff"  on public.bookings;

create policy "bookings read own or staff"
  on public.bookings for select
  using (
    public.session_fresh()
    and (
      (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
      or public.is_staff()
    )
  );

create policy "bookings insert own or staff"
  on public.bookings for insert
  with check (
    public.session_fresh()
    and (
      (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
      or public.is_staff()
    )
  );

create policy "bookings update own or staff"
  on public.bookings for update
  using (
    public.session_fresh()
    and (
      (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
      or public.is_staff()
    )
  )
  with check (
    public.session_fresh()
    and (
      (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
      or public.is_staff()
    )
  );

-- Rollback (paste in SQL Editor if this ever locks someone out — service_role /
-- the SQL Editor bypass RLS, so you are never truly locked out of the DB):
--   re-run migration 0018 + 0019's policy blocks to drop session_fresh() back
--   out, then `drop function if exists public.session_fresh(integer);`


-- ////////////////////////////////////////////////////////////////////////
-- 0023_session_fresh_spread.sql
-- ////////////////////////////////////////////////////////////////////////
-- 0023_session_fresh_spread.sql — extend the server session wall past bookings.
-- Forward-only. Apply in the Supabase SQL Editor after 0022.
--
-- 0022 put public.session_fresh() on `bookings`. This spreads it to the rest of
-- the sensitive surface, ANDed onto the existing owner/staff logic so a session
-- older than the absolute ceiling can't read PII or make privileged changes even
-- when the browser's own expiry timer is bypassed.
--
-- Scoping (deliberate — not every policy is gated):
--   • users  : read + insert + update  → protect customer PII and block profile
--              tampering by a stale session.
--   • reviews: update + delete only     → staff moderation is privileged. READ
--              stays public (approved reviews must show to signed-out visitors)
--              and INSERT stays open (anon may submit a pending review) — gating
--              those would break the public site.
--   • staff  : insert + update only     → staff management is privileged. READ is
--              left ungated so staff login / password-recovery / admin auto-unlock
--              keep working even when last_sign_in_at is stale (recovery sessions
--              can be). A stale session that auto-unlocks still hits gated, empty
--              data everywhere else, so nothing sensitive is exposed.
--
-- session_fresh() and is_staff() are both SECURITY DEFINER and bypass RLS, so
-- gating these tables does not break either helper.

-- ── users: owner-or-staff AND a fresh session ────────────────────────────────
drop policy if exists "users read"   on public.users;
drop policy if exists "users insert" on public.users;
drop policy if exists "users update" on public.users;

create policy "users read" on public.users for select
  using (
    public.session_fresh()
    and (lower(email) = lower(auth.jwt() ->> 'email') or public.is_staff())
  );
create policy "users insert" on public.users for insert
  with check (
    public.session_fresh()
    and lower(email) = lower(auth.jwt() ->> 'email')
  );
create policy "users update" on public.users for update
  using (
    public.session_fresh()
    and lower(email) = lower(auth.jwt() ->> 'email')
  )
  with check (
    public.session_fresh()
    and lower(email) = lower(auth.jwt() ->> 'email')
  );

-- ── reviews: staff moderation AND a fresh session ────────────────────────────
-- (read + insert intentionally left as-is from 0015 — see header.)
drop policy if exists "reviews update" on public.reviews;
drop policy if exists "reviews delete" on public.reviews;

create policy "reviews update" on public.reviews for update
  using (public.session_fresh() and public.is_staff())
  with check (public.session_fresh() and public.is_staff());
create policy "reviews delete" on public.reviews for delete
  using (public.session_fresh() and public.is_staff());

-- ── staff: staff-only writes AND a fresh session ─────────────────────────────
-- (read intentionally left as-is from 0020 — see header.)
drop policy if exists "staff insert" on public.staff;
drop policy if exists "staff update" on public.staff;

create policy "staff insert" on public.staff for insert
  with check (public.session_fresh() and public.is_staff());
create policy "staff update" on public.staff for update
  using (public.session_fresh() and public.is_staff())
  with check (public.session_fresh() and public.is_staff());

-- Rollback: re-run the policy blocks from 0020 (users/staff) and 0015 (reviews)
-- to drop session_fresh() back out. The SQL Editor bypasses RLS, so you can
-- always do this even if a stale session locks you out of the app.

