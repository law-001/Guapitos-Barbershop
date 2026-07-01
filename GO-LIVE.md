# Guapito's Barbershop — Go-Live Runbook

Steps to take the app from "works on localhost" to "live for a paying shop."
Do them in order. Menu names in the Supabase/Resend/Vercel dashboards may shift
slightly over time — the path is the guide, not gospel.

Legend: 🖥️ = dashboard click-path · ⌨️ = terminal command.

---

## Pre-flight — database is fully migrated

Fresh project? Don't paste 23 files — paste **one**:
[supabase/setup.sql](supabase/setup.sql) into the SQL Editor once. See
[supabase/HANDOFF.md](supabase/HANDOFF.md).

Then confirm every migration `0001`–`0023` is applied in the **production**
Supabase project. Quick check in SQL Editor:

```sql
select policyname, tablename from pg_policies
where schemaname = 'public' order by tablename, policyname;
```

You should see the owner/staff + `session_fresh()` policies on `bookings`,
`users`, `staff`, `reviews`. If any table still shows `using (true)`, an older
migration didn't run — apply the missing `NNNN_*.sql` files in order.

---

## Step 1 — Resend: verify the shop's sending domain

Until this is done, confirmation emails only send from `onboarding@resend.dev`
to your own inbox. Real customers get nothing.

1. 🖥️ resend.com → **Domains** → **Add Domain** → enter the shop's domain
   (e.g. `guapitos.ph`). *(No domain yet? Buy one first — you can't send branded
   mail from a domain you don't control.)*
2. Resend shows DNS records (SPF, DKIM, and a DMARC record). Add each one at your
   **domain registrar / DNS host** (GoDaddy, Namecheap, Cloudflare, etc.).
3. Back in Resend, wait for the domain to go **Verified** (green) — minutes to a
   few hours depending on DNS.
4. 🖥️ Resend → **API Keys** → **Create API Key** → copy it (starts `re_…`).
   Store it safely; you set it as a Supabase secret in Step 2.
5. Decide the **From** address on the verified domain, e.g.
   `Guapito's Barbershop <noreply@guapitos.ph>`.

---

## Step 2 — Supabase Edge Function secrets + deploy

The functions read these at runtime; they are **server-only** (never `VITE_`).

⌨️ From the project root (logged in via `supabase login`, linked with
`supabase link`):

```bash
supabase secrets set \
  RESEND_API_KEY="re_your_key_from_step_1" \
  EMAIL_FROM="Guapito's Barbershop <noreply@guapitos.ph>" \
  APP_URL="https://your-live-site.com"
```

Then (re)deploy both functions so the latest code + secrets are live:

```bash
supabase functions deploy booking-confirm
supabase functions deploy staff-login
```

Notes:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are
  **auto-injected** by Supabase — do NOT set them.
- `APP_URL` must be the real site (it builds the Reschedule/Cancel links AND is
  the allowed CORS origin). Prod + localhost are both allowed by the code.
- Prefer the dashboard? 🖥️ Edge Functions → **Manage secrets**.

---

## Step 3 — Supabase Auth hardening + URLs

1. 🖥️ **Authentication → URL Configuration**
   - **Site URL** = your production URL (`https://your-live-site.com`).
   - **Redirect URLs** → add the production URL **and** `http://localhost:5173`
     (dev). Password-recovery and magic links only land on listed URLs.
2. 🖥️ **Authentication → Sessions** (session security)
   - Enable **refresh-token rotation** and set a short **reuse interval**
     (e.g. 10s). This detects/revokes a stolen refresh token — pairs with the
     `session_fresh()` DB wall.
3. 🖥️ **Authentication → (Settings)** — set **Access token (JWT) expiry** to
   `3600` (1h) or lower. Shorter = smaller stolen-token window.
4. 🖥️ **Authentication → Email Templates → Magic Link** — confirm the template
   includes the `{{ .Token }}` variable, so the OTP email shows the 6-digit code
   (the app's sign-in expects a numeric code, not just a link). See
   [src/lib/auth.js](src/lib/auth.js).
5. 🖥️ **Authentication → Rate Limits** — keep sensible caps on OTP/email sends
   (defaults are fine for one shop).

---

## Step 4 — Create real staff accounts

`is_staff()` matches the signed-in **email** to a row in `public.staff`. So each
staff member needs BOTH: (a) a Supabase Auth user with a password, and (b) a
matching `staff` row. The password lives in Auth, never in the `staff` table.

1. 🖥️ **Authentication → Users → Add user** → email + a **strong** password for
   each staff member (manager, barbers, cashier…). Repeat per person.
2. Add a matching `staff` row **via a migration** (RULE 2 — never hand-edit the
   table). Create `supabase/migrations/0024_seed_real_staff.sql`:

```sql
insert into public.staff (id, name, role, username, email, active, barber_id)
values
  ('s_manager', 'Shop Manager', 'manager', 'manager', 'manager@guapitos.ph', true, null),
  ('s_andro',   'Andro Lim',    'barber',  'andro',   'andro@guapitos.ph',   true, 'b1')
on conflict (email) do update
  set name = excluded.name, role = excluded.role, active = excluded.active;
```

   Run it in the SQL Editor. The `email` MUST equal the Auth user's email.
3. Delete/deactivate any demo staff rows you don't want live (`active = false`).

---

## Step 5 — Vercel deploy + env + live end-to-end test

1. 🖥️ Vercel → your project → **Settings → Environment Variables** (scope:
   Production) — add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the `sb_publishable_…` key
   - *(optional)* `VITE_SESSION_MAX_HOURS`, `VITE_SESSION_REMEMBER_DAYS`
   See [.env.example](.env.example) for the full list.
2. **Redeploy** on Vercel (env changes only apply to a fresh build).
3. Make sure the Vercel production domain matches `APP_URL` (Step 2) and the
   Supabase **Site URL** (Step 3).
4. **Full end-to-end test on the LIVE URL** (not localhost):

   Customer:
   - [ ] Enter email → receive the 6-digit OTP → sign in.
   - [ ] Book a service → see the GB-reference confirmation screen.
   - [ ] **Confirmation email arrives** (check inbox AND spam).
   - [ ] Click **Reschedule** / **Cancel** link in the email → lands in the app
         and works.
   - [ ] Reload past your session window → signed out / re-auth prompt.

   Staff:
   - [ ] Log in with a real staff account (password) → console unlocks.
   - [ ] Dashboard / Calendar / Records / Customers / Reviews all load.
   - [ ] Customers page shows real saved mobiles.
   - [ ] Create a walk-in; change a booking status; approve/reject a review.

If every box is checked, you're live.

---

## Known operating limits (tell the client)

- **Resend free** = 100 emails/day, 3000/month. A busy shop will exceed this →
  paid Resend tier.
- **Supabase free** pauses a project after ~7 days of inactivity and caps the DB
  at 500 MB. A live shop with daily bookings won't idle-pause, but for "we host
  it" (Option B) budget the paid tier for headroom + backups.
- These are business/hosting choices, not bugs — reflect them in the quote.

---

## If something breaks (rollback)

- The **SQL Editor bypasses RLS**, so you are never locked out of the database.
- To drop a session/RLS change, re-run the prior migration's policy block (each
  migration header lists its rollback).
- Functions: redeploy the previous version, or check logs at
  🖥️ Edge Functions → the function → **Logs**.
