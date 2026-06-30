-- 0017_noshow_autosweep.sql — server-side automatic No-Show marking.
-- Forward-only. Apply in the Supabase SQL Editor after 0016.
--
-- Why this exists: a 'booked' appointment that nobody checked in, left more than
-- a grace period past its start time, becomes a No-Show. The app used to do this
-- in the browser (any open tab wrote the status). That breaks once `bookings`
-- writes are locked down by RLS, AND it never runs when no browser is open.
--
-- This moves the logic into the database so it is authoritative and runs on its
-- own schedule (pg_cron), regardless of who — if anyone — has the site open. The
-- app still calls the same function for an instant in-tab update, but the cron
-- job is the guarantee.
--
-- TWO KNOBS (edit here, both used inside the function below):
--   • Grace period      → interval '10 minutes'   (longer = more lenient)
--   • Shop time zone     → 'Asia/Manila'           (must match the shop's locale;
--                          appointment times are stored as wall-clock minutes)

-- ── 1) The marking function ──────────────────────────────────────────────────
-- SECURITY DEFINER → runs as the function owner (postgres, which bypasses RLS),
-- so it can update rows even after we tighten the table's write policies. It is
-- SAFE to expose because it can ONLY flip overdue 'booked' rows to 'no-show' —
-- it takes no arguments and touches nothing else. Returns the ids it changed so
-- the caller can update its UI and toast.
create or replace function public.mark_overdue_no_shows()
returns table(id text)
language sql
security definer
set search_path = public
as $$
  update public.bookings b
  set status = 'no-show'
  where b.status = 'booked'
    and ((b.date + make_interval(mins => b.start_min)) at time zone 'Asia/Manila')
        + interval '10 minutes' < now()
  returning b.id;
$$;

-- The browser (anon or signed-in) is allowed to trigger the sweep — but only via
-- this constrained function, never a raw UPDATE.
grant execute on function public.mark_overdue_no_shows() to anon, authenticated;

-- ── 2) Schedule it server-side every minute (the real guarantee) ─────────────
-- Best-effort: if pg_cron can't be auto-enabled on this instance, the function
-- + grant above still install, so the in-app sweep keeps working. To add the
-- server cron later: Dashboard → Database → Extensions → enable `pg_cron`, then
-- re-run just the block below.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'Could not enable pg_cron automatically: %. Enable it in Dashboard > Database > Extensions, then re-run the schedule block.', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'noshow-sweep') then
      perform cron.unschedule('noshow-sweep');
    end if;
    perform cron.schedule('noshow-sweep', '* * * * *', 'select public.mark_overdue_no_shows();');
    raise notice 'Scheduled noshow-sweep to run every minute.';
  else
    raise notice 'pg_cron not present — server cron NOT scheduled (in-app sweep still works).';
  end if;
end $$;
