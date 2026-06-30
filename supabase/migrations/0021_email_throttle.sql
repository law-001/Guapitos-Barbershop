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
