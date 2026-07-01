# Database handoff — stand up Guapito's on a fresh Supabase project

The whole database (schema, RLS, functions, views, seed data) is bundled into one
file so you don't paste 23 migrations. Run it once.

## One-paste setup

1. Create the Supabase project (or open the client's).
2. 🖥️ **SQL Editor → New query**.
3. Open [setup.sql](setup.sql), copy **all** of it, paste, **Run**.
4. Done — every table, policy, function and seed row is created in order
   (`0001` → `0023`).

That's the entire database. (Backend still needs the two Edge Functions + their
secrets — see [../GO-LIVE.md](../GO-LIVE.md) steps 1–2.)

## Verify it worked

Run in the SQL Editor after:

```sql
select tablename, count(*) as policies
from pg_policies where schemaname = 'public'
group by tablename order by tablename;
```

Expect policies on `bookings`, `users`, `staff`, `reviews`, and RLS-locked
`login_throttle` / `email_throttle` (no policies by design). Tables present:
`barbers, bookings, email_throttle, login_throttle, reviews, services, staff, users`.

## One optional thing: pg_cron

`setup.sql` tries to enable `pg_cron` (for the every-minute No-Show sweep). If the
fresh project can't auto-enable it you'll see a NOTICE — that's fine, the app's
in-tab sweep covers it. To turn the server cron on later:
🖥️ **Database → Extensions → enable `pg_cron`**, then re-run just the schedule
block from `migrations/0017_noshow_autosweep.sql`.

## Rules for changing the DB after handoff

- **`setup.sql` is generated — never hand-edit it.** The source of truth stays
  `supabase/migrations/*.sql` (see the project's Database rule).
- New change → write the next `supabase/migrations/00NN_*.sql`, run it, then
  **regenerate the bundle** so a future fresh setup includes it:

  ```bash
  # from the repo root (Git Bash)
  {
    echo "-- Guapito's Barbershop — FULL DATABASE SETUP (generated bundle)"
    echo "-- Source of truth: supabase/migrations/*.sql — do NOT hand-edit."
    for f in supabase/migrations/[0-9]*.sql; do
      printf '\n-- ////////////////////////////////////////////\n-- %s\n-- ////////////////////////////////////////////\n' "$(basename "$f")"
      cat "$f"; echo
    done
  } > supabase/setup.sql
  ```

## Migrating an EXISTING project (not fresh)

If a project already has some migrations applied, do **not** run `setup.sql`
(it re-runs everything). Apply only the new numbered migrations it's missing,
in order, in the SQL Editor.
