# Guapito's Barbershop

Barbershop booking web app. Customer side books appointments; admin side runs the shop. Single-page React, no router — `view` field in one `useState` in `App.jsx`. See [project_summary.md](project_summary.md) for the full breakdown.

## Stack

- **React 19** with JSX (`.jsx` files)
- **Vite 8** for dev server and build
- **Tailwind CSS 4** (`@tailwindcss/vite`) + heavy inline `style={{}}` with CSS vars
- **ESLint 10** (+ react-hooks, react-refresh)
- No TypeScript, no router

## Project structure

```
src/
  App.jsx        # root: state shape, top bar, view switch
  main.jsx       # React mount
  data.js        # SERVICES, CATS, BARBERS, PHONES, ACTIVITY, OPEN/CLOSE hours
  helpers.js     # time/date utils, peso fmt, slot availability, seed bookings
  App.css / index.css
  views/         # HomeView, BookingView, AccountView
  admin/         # AdminLogin, AdminShell, DashboardPage, CalendarPage,
                 # RecordsPage, CustomersPage, BookingDrawer,
                 # CustomerDrawer, AdminNewBookingDrawer
supabase/        # ALL SQL lives here (see Database rules)
  migrations/    # forward-only NNNN_*.sql — source of truth
  schema/        # current CREATE TABLE snapshot per table
  seed/          # seed rows per table
src/lib/
  supabase.js    # shared browser client
  bookingsApi.js # bookings fetch/insert/update (camel<->snake mapping)
```

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # production build → dist/
npm run lint     # ESLint check
npm run preview  # serve dist/ locally
```

## After every prompt — RULE 1

Run lint then build. Both must pass before a change is considered done:

```bash
npm run lint && npm run build
```

If lint fails, **fix every error** before moving on — do not stop at reporting them, and do not consider the change done while any error remains. This includes pre-existing errors surfaced by the run. Warnings are acceptable, errors are not. Do this after **every** code change, automatically, without being asked.

## Database — RULE 2 (Supabase, SQL migrations only)

Database is **Supabase** (Postgres). `bookings` is live (loaded + persisted); `barbers`/`services` are mirrored in DB but the UI still reads the static copies in `data.js`.

**Setup (done):**
- Packages: `@supabase/supabase-js`, `@supabase/ssr`.
- Env in `.env.local` (gitignored via `*.local`) — Vite-style `VITE_` prefix, **not** `NEXT_PUBLIC_`:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Template in [.env.example](.env.example).
- Browser client in [src/lib/supabase.js](src/lib/supabase.js); bookings data access in [src/lib/bookingsApi.js](src/lib/bookingsApi.js).
- [App.jsx](src/App.jsx) loads bookings on mount (falls back to local seed if DB unreachable) and exposes `onCreateBooking` / `onUpdateBooking` — every booking mutation goes optimistic-local + persist through these. App objects are **camelCase**; DB columns are **snake_case** (`start`↔`start_min`, `followUp`↔`follow_up`) — `bookingsApi.js` maps both ways.
- **This is a Vite SPA, not Next.js.** Ignore Supabase's Next.js quickstart (`next/headers`, `next/server`, `server.ts`, `middleware.ts`, server components) — none applies. Browser client only.

**ALL SQL lives in `supabase/`.** Every schema/data change MUST go through a migration:

- **Every** table, column, index, or row change ships as a `.sql` file in `supabase/migrations/`.
- Never edit a database by hand or write one-off scripts. Migrations are the only way schema or seed data changes.
- Naming: `supabase/migrations/NNNN_short_description.sql` (zero-padded, sequential — `0001_init.sql`, `0002_seed.sql`).
- Each migration is **forward-only**. Never edit a migration that already ran — write a new one to change it.
- Keep a **snapshot copy of every table and its seed rows** so the DB is reproducible from `supabase/` alone:
  - `supabase/schema/<table>.sql` — `CREATE TABLE` + indexes + RLS for each table (kept current).
  - `supabase/seed/<table>.sql` — `INSERT` rows for that table.
- A migration that creates or alters a table must update the matching `schema/` and `seed/` snapshot in the same change.
- Before writing a new migration, read the latest `schema/` snapshot so the new SQL matches existing columns/types.
- Migrations are applied in the **Supabase SQL Editor** (or `supabase db push`). The `.sql` file is the source of truth — paste/run it there, never click-edit the table in the dashboard.
- **Row Level Security** is on for every table; include its policies in the same migration. Current policies are **demo-grade** (anon can read/insert/update `bookings`) because there's no Supabase Auth yet — tighten before production.

## Adding a feature / button / UI element — RULE 3

Whenever you add or change a feature, button, view, or any UI element, after the change always report:

1. **Where** — a clickable `file:line` link to the exact code that renders or controls it, e.g. [BookingView.jsx:42](src/views/BookingView.jsx#L42).
2. **How to edit it manually** — name the thing to change (label text, handler, style prop, data entry) and what each change does, so it can be tweaked by hand without re-asking.

For anything that touches placement (`left`/`right`/`top`/`bottom`/`margin`/`transform`/`gap`/`padding`), also name the property + value and which direction each way moves it (e.g. "`gap: 12` — smaller = tighter, bigger = more space"). Prefer plain px values over `50%` + `translate(-50%)` tricks so values stay easy to find and drag.

## Styling conventions

- Tailwind utility classes + inline `style={{}}` with CSS vars on root.
- Theme: dark warm palette — bg `#0E0E0E`, accent tan `#D6C3A0`, cream text `#F4EFE7`.
- Fonts: Oswald + Hanken Grotesk (Google Fonts).

## State

One `useState` in `App.jsx`, spread-merge updates via `onState`. Customer flow (`view`, `step`, `cart`, `barber`, `date`, `time`, `user`, `authStep`, `payMethod`, `lastRef`, `reschedulingId`…), seeded `bookings` array, and admin keys (`adminAuthed`, `adminPage`, `drawerId`, `calMode`, `calIso`…). Admin login: `manager` / `guapito`.

## Data model

- **Service**: `{id, cat, name, sub, price, dur}` — 4 categories (Cuts & Shave, Treatments, Color, Packages).
- **Barber**: `{id, name, spec, initials, color}` — `'any'` = first free.
- **Booking**: `{id, date(iso), barber, start(min from midnight), dur, service, price, customer, status, mine, pay, notes, followUp}`.
- **Status**: `confirmed | completed | no-show | cancelled`.
- Shop hours: `OPEN 600` (10:00) → `CLOSE 1200` (20:00), minutes from midnight, 30-min slots.
