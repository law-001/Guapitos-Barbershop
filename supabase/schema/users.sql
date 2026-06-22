-- Snapshot of public.users — current shape. Source of truth: migrations/.
create table if not exists public.users (
  id         text primary key,
  first_name text,
  last_name  text,
  mobile     text not null default '',
  email      text unique,
  created_at timestamptz not null default now()
);
create index if not exists users_mobile_idx on public.users (mobile);

alter table public.users enable row level security;
create policy "users read"   on public.users for select using (true);
create policy "users insert" on public.users for insert with check (true);
create policy "users update" on public.users for update using (true) with check (true);
