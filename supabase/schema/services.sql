-- Snapshot of public.services — current shape. Source of truth: migrations/.
create table if not exists public.services (
  id    text primary key,
  cat   text not null,
  name  text not null,
  sub   text not null default '',
  price numeric not null default 0,
  dur   integer not null default 45
);
alter table public.services enable row level security;
create policy "services read" on public.services for select using (true);
