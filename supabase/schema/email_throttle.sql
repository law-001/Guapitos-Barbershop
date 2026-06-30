-- Snapshot of public.email_throttle — current shape. Source of truth: migrations/.
-- Per-user send cap for the `booking-confirm` Edge Function. Written exclusively
-- through the SECURITY DEFINER helper public.email_rate_check (migration 0021),
-- which derives the key from the caller's JWT and exempts staff (is_staff()).
create table if not exists public.email_throttle (
  key          text primary key,             -- 'email:<lower(jwt email)>'
  sent_count   integer not null default 0,   -- sends in the current window
  window_start timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- RLS on with NO policies → no direct anon/authenticated access; the SECURITY
-- DEFINER helper bypasses RLS. service_role bypasses RLS too.
alter table public.email_throttle enable row level security;

-- Reserve-a-send helper. Returns { allowed, retry_after[, remaining] }. Default
-- cap: 5 sends per 600s rolling window for non-staff. See migration 0021 for the
-- body and the grants (authenticated + service_role; revoked from public).
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
  if addr is null or addr = '' then
    return json_build_object('allowed', false, 'retry_after', p_window_secs);
  end if;
  if public.is_staff() then
    return json_build_object('allowed', true, 'retry_after', 0);
  end if;

  k := 'email:' || addr;
  insert into public.email_throttle (key, sent_count, window_start, updated_at)
    values (k, 0, now_ts, now_ts)
    on conflict (key) do nothing;
  select * into r from public.email_throttle where key = k for update;

  if r.window_start < now_ts - make_interval(secs => p_window_secs) then
    r.sent_count := 0;
    r.window_start := now_ts;
  end if;

  if r.sent_count >= p_limit then
    update public.email_throttle set updated_at = now_ts where key = k;
    return json_build_object(
      'allowed', false,
      'retry_after',
        ceil(extract(epoch from (r.window_start + make_interval(secs => p_window_secs) - now_ts)))::int);
  end if;

  update public.email_throttle set
    sent_count = r.sent_count + 1, window_start = r.window_start, updated_at = now_ts
  where key = k;
  return json_build_object(
    'allowed', true, 'retry_after', 0,
    'remaining', greatest(0, p_limit - (r.sent_count + 1)));
end; $$;

revoke all on function public.email_rate_check(integer, integer) from public;
grant execute on function public.email_rate_check(integer, integer) to authenticated, service_role;
