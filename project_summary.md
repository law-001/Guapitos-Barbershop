# Guapito's Barbershop — Project Summary

Barbershop booking web app. Customer side books appointments; admin side runs the shop. Single-page, no router. Data is persisted to a **Supabase** backend (Postgres) — the UI updates locally first (optimistic), then writes through. Two Supabase **Edge Functions** back staff login and booking-confirmation email.

## What it does

**Customer:** browse services, pick service(s) + barber + date + time, sign in by **email OTP**, fill name/mobile, pick pay method, get a booking ref. A confirmation **email** is sent with reschedule/cancel deep-links. View/reschedule/cancel own appointments in "My Appointments". Edit saved details in **Profile**. Read the public **Reviews** wall and write a review (held for staff approval). "Keep me signed in" chooses a short (~24h) or long (~30-day) session.

**Admin / staff** (real Supabase email + password, gated by a `staff` table): dashboard (Today), calendar (Schedule), records, customers, and a **Reviews** moderation queue (approve / reject). Create/edit bookings from a drawer. Login is brute-force throttled server-side and supports "Forgot password?".

## Tech stack

| Thing | Choice |
|-------|--------|
| UI | React 19 (`.jsx`) |
| Build/dev | Vite 8 |
| Backend | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — Postgres + Auth + Edge Functions |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) + heavy inline `style={{}}` with CSS vars |
| Lint | ESLint 10 (+ react-hooks, react-refresh) |
| Routing | None — `view` field in one `useState` |
| Types | No TypeScript |
| Fonts | Oswald + Hanken Grotesk (Google Fonts) |

## Structure

```
src/
  App.jsx        # root: state shape, top bar, view switch, all Supabase wiring (auth, sessions, bookings, reviews)
  main.jsx       # React mount
  data.js        # SERVICES (+ excl groups), CATS, BARBERS, PHONES, ACTIVITY, OPEN/CLOSE hours
  helpers.js     # time/date utils, peso fmt, slot availability, statusMeta, auto-package logic, seed bookings
  Dialog.jsx     # in-app confirm/alert modal (replaces native confirm/alert)
  Toast.jsx      # toast notifications (supports clickable link/action)
  AuthModal.jsx        # top-bar sign-in modal (email OTP) gating Book Now / profile
  ProfileMenu.jsx      # signed-in avatar + dropdown in the top bar
  ReviewModal.jsx      # write-a-review form (name, stars, body)
  ResetPasswordModal.jsx # staff "set a new password" form (password-recovery flow)
  App.css / index.css
  lib/
    supabase.js       # shared browser client + remember-me storage switch
    auth.js           # email OTP, staff login (Edge Fn), password reset/recovery, session helpers
    session.js        # absolute session lifetime (24h vs 30d) + expiry checks vs DB login_timestamp
    bookingsApi.js    # fetch/insert/update bookings + occupancy feed + no-show sweep (camel<->snake)
    bookingEmail.js   # fire booking-confirm Edge Function (confirmation email)
    reviewsApi.js     # fetch/insert/approve/delete reviews (public + admin lists)
    reviewRateLimit.js# per-device throttle on posting reviews
    resetRateLimit.js # per-device throttle on password-reset requests
    staffApi.js       # look up a staff row by email (authorization gate)
    usersApi.js       # fetch/upsert customer, touch/fetch login_timestamp, list all users
  views/
    HomeView.jsx
    BookingView.jsx
    AccountView.jsx
    ProfileView.jsx
    ReviewsView.jsx
  admin/
    AdminLogin.jsx        # staff email + password + forgot-password
    AdminShell.jsx        # admin layout + collapsible nav (Today/Schedule/Records/Customers/Reviews)
    DashboardPage.jsx
    CalendarPage.jsx
    RecordsPage.jsx
    CustomersPage.jsx
    ReviewsPage.jsx       # moderation queue (approve/reject), pending badge
    BookingDrawer.jsx
    CustomerDrawer.jsx
    AdminNewBookingDrawer.jsx
supabase/
  migrations/    # forward-only 0001..0023 — source of truth
  schema/        # CREATE TABLE snapshots per table
  seed/          # seed rows per table
  functions/
    staff-login/index.ts     # Edge Function: password login + server-side brute-force throttle
    booking-confirm/index.ts # Edge Function: send booking-confirmation email
  setup.sql      # generated one-paste bundle of all migrations (never hand-edit)
  HANDOFF.md     # how to stand up the DB on a fresh Supabase project
index.html
```

## State (one useState in App, spread-merge updates via `onState`)

Customer flow: `view` (`home | book | account | profile | reviews | admin`), `step`, `cart`, `barber`, `date`, `time`, `user` (`{signedIn, firstName, lastName, mobile, email, loginAt}`), `notes`, `payMethod`, `lastRef`, `lastBooking`, `reschedulingId`.

Auth (customer): `authStep` (`email | otp`), `remember` ("Keep me signed in"), `emailInput`, `otpInput`, `authBusy`, `authErr`, `devCode` (DEV-only fallback OTP), `authModalOpen`, `postAuthAction` (`book | profile | emailAction`), `sessionChecked`.

Data: `bookings` (starts `[]`, hydrated via `fetchBookings()` — RLS-scoped: own rows for a customer, all for staff), `occupancy` (public no-PII slot feed that drives the picker for everyone), `custPhones` (admin: email→mobile map), `reviews` (public/approved), `adminReviews` (all incl. pending).

Staff/admin: `adminAuthed`, `adminStaff` (signed-in staff row), `adminEmail`, `adminPass`, `adminBusy`, `adminErr`, `adminLockUntil` (server throttle), `recoveryOpen` (password-reset link opened), `adminNavOpen`, `adminPage`, `drawerId`, `custName`, `calMode`, `calIso`, `drawerEdit`, `openEditN`.

UI: `dialog` (Dialog modal), `toast` + `toastN` (bump re-shows same message), `reviewModalOpen`.

## Backend / data flow

- `lib/supabase.js` — single shared client; reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.local`. Also owns the "remember me" storage switch (localStorage = persists across restarts, sessionStorage = cleared on close).
- `lib/auth.js` — customer **email OTP** (Magic Link template must include `{{ .Token }}` to send a 6-digit code), **staff login** through the `staff-login` Edge Function (returns a session only on success), and **password reset/recovery** (`resetPasswordForEmail` → `PASSWORD_RECOVERY` event → set-new-password modal).
- `lib/session.js` — absolute session lifetime measured from the DB `login_timestamp` (survives refreshes): **~24h** default, **~30 days** when "Keep me signed in" is checked. App re-validates on startup, on protected-page access, and on a 60s interval; expiry forces re-auth. (Env-tunable: `VITE_SESSION_MAX_HOURS`, `VITE_SESSION_REMEMBER_DAYS`.)
- `lib/bookingsApi.js` — `fetchBookings` (RLS-scoped) / `fetchOccupancy` (public, no PII) / `insertBooking` / `updateBooking` (only whitelisted `PATCH_COLS`) / `markOverdueNoShows`; maps app camelCase ↔ DB snake_case (`start`↔`start_min`, `followUp`↔`follow_up`).
- `lib/bookingEmail.js` — fire-and-forget confirmation email via the `booking-confirm` Edge Function; formatting reuses `helpers.js`. Email links land back as `?b=<id>&do=reschedule|cancel&e=<email>`, handled once on load (prompts sign-in as the right account if needed, then acts).
- `lib/reviewsApi.js` / `staffApi.js` / `usersApi.js` — reviews CRUD (post as pending → staff approve publishes), staff-by-email authorization lookup, and customer profile + login-timestamp persistence.
- Writes are optimistic-local then persisted fire-and-forget; failures are logged to console.

## Data model

- **Service**: `{id, cat, name, sub, price, dur, excl?}` — 4 categories (Cuts & Shave, Treatments, Color, Packages). `excl` = mutual-exclusion group (radio-style: `cut`, `haircolor`, `beardcolor`, `cutpkg`, `lighten`).
- **Barber**: `{id, name, spec, initials, color}` — 4 barbers (Marco Cano, Rico Delgado, Tonio Reyes, JP Salcedo); `'any'` = first free.
- **Booking**: `{id, date(iso), barber, start(min from midnight), dur, service, price, customer, email, status, mine, pay, notes, followUp, checkedInAt, createdAt}`.
- **Review**: `{id, author, rating, body, reviewDate, relativeTime, source, approved, createdAt}` — `approved:false` = pending (hidden from public until staff approve).
- **Staff**: email-keyed row (`id, name, role, active, …`) — a valid Supabase login is only let into the console if it matches an active staff row.
- **Status**: `booked | checked-in | in-progress | completed | cancelled | no-show` (see `statusMeta`; `isLive` = booked/checked-in/in-progress).
- Shop hours: `OPEN 540` (09:00) → `CLOSE 1140` (19:00), minutes from midnight. Slots every 30 min. Sunday closed.

## Key logic (helpers.js)

- `slotFree` / `firstFree` / `genSlots` — overlap-based availability per barber, respects lead time for same-day.
- `applyPackages` / `cartServiceLabel` / `PACKAGE_RECIPES` — auto-bundle à-la-carte picks into a cheaper package (e.g. Haircut + Signature Shave → "Cut & Shave") only when it actually saves money; never charges more than à la carte.
- `initBookings()` — generates today's schedule + ~28-day history (used only as a local seed fallback; live data comes from Supabase).
- Auto no-show: a `booked` appointment >10 min past start without check-in is auto-marked No Show (in-tab sweep every 60s + persisted; a `pg_cron` job runs the same sweep server-side).
- Formatters/ids: `peso`, `timeLabel`, `dateFull`, `durLabel`, `statusMeta`, `ticketOf` (`GB-####`), `genRef` (`GB-XXXXX`), `genId`.

## Security posture

- **Row Level Security** on every table. Customers read only their own bookings; staff read all (checked against the `staff` table). Slot availability is exposed through a **no-PII occupancy view** so logged-out visitors can still see open slots without seeing names.
- Staff login runs through the `staff-login` Edge Function with a **progressive brute-force throttle** (`login_throttle` table); the browser never gates lockouts.
- OTP-send and review/reset actions are **rate-limited**; `email_throttle` guards server-side email sends.
- Non-staff who complete a valid Supabase login are rejected and signed out. See `GO-LIVE.md` / `supabase/HANDOFF.md` for deploy steps and secrets.

> Note: `App.jsx` still renders a DEBUG floating `SessionTimer` (bottom-right session countdown) — intended to be removed before final.

## Theme

Dark, warm tan/cream palette via CSS vars on root: bg `#0E0E0E`, surfaces `#15130F`/`#1D1A15`, accent tan `#D6C3A0`, cream text `#F4EFE7`, muted `#9A9388`, hairline `#2A2622`.

## Commands

```bash
npm run dev      # dev server
npm run build    # build → dist/
npm run lint     # ESLint
npm run preview  # serve dist/
```

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (optional session tuning: `VITE_SESSION_MAX_HOURS`, `VITE_SESSION_REMEMBER_DAYS`). Database is reproducible from `supabase/setup.sql` (one paste) — see [supabase/HANDOFF.md](supabase/HANDOFF.md).
