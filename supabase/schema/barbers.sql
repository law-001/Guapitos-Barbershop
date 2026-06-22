-- Snapshot of public.barbers — current shape. Source of truth: migrations/.
create table if not exists public.barbers (
  id       text primary key,
  name     text not null,
  spec     text not null default '',
  initials text not null default '',
  color    text not null default '#D6C3A0'
);
alter table public.barbers enable row level security;
create policy "barbers read" on public.barbers for select using (true);
