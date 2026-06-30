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
