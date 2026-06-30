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
