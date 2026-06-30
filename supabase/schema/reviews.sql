-- Snapshot of public.reviews — current shape. Source of truth: migrations/.
create table if not exists public.reviews (
  id            text primary key,
  author        text not null,
  rating        integer not null check (rating between 1 and 5),
  body          text not null default '',
  review_date   date,
  relative_time text,
  source        text not null default 'google',
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists reviews_rating_idx   on public.reviews (rating);
create index if not exists reviews_approved_idx on public.reviews (approved);

alter table public.reviews enable row level security;
-- Public sees only approved reviews; staff (see public.is_staff()) see all.
create policy "reviews read" on public.reviews for select
  using (approved = true or public.is_staff());
-- Anyone can submit, but non-staff submissions must be unapproved (no self-publish).
create policy "reviews insert" on public.reviews for insert
  with check (approved = false or public.is_staff());
-- Only staff can approve (update) or remove (delete).
create policy "reviews update" on public.reviews for update
  using (public.is_staff()) with check (public.is_staff());
create policy "reviews delete" on public.reviews for delete
  using (public.is_staff());
