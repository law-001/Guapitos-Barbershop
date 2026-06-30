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
