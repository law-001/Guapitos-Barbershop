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
