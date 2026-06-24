# Guapito's Barbershop — Project Summary

Barbershop booking web app. Customer side books appointments; admin side runs the shop. Single-page, no router. Data is persisted to a **Supabase** backend (Postgres) — UI updates locally first (optimistic), then writes through.

## What it does

**Customer:** browse services, pick service(s) + barber + date + time, sign in by **email OTP**, fill name/mobile, pick pay method, get a booking ref. View/reschedule own appointments in "My Appointments". Edit saved details in **Profile**.

**Admin** (login `manager` / `guapito`): dashboard, calendar (month/day), bookings drawer, customers list + drawer, records, create new booking. All state lives in the same React tree.

## Tech stack

| Thing | Choice |
|-------|--------|
| UI | React 19 (`.jsx`) |
| Build/dev | Vite 8 |
| Backend | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — `bookings` + `users` tables |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) + heavy inline `style={{}}` with CSS vars |
| Lint | ESLint 10 (+ react-hooks, react-refresh) |
| Routing | None — `view` field in one `useState` |
| Types | No TypeScript |
| Fonts | Oswald + Hanken Grotesk (Google Fonts) |

## Structure

```
src/
  App.jsx        # root: state shape, top bar, view switch, Supabase wiring
  main.jsx       # React mount
  data.js        # SERVICES, CATS, BARBERS, PHONES, ACTIVITY, OPEN/CLOSE hours
  helpers.js     # time/date utils, peso fmt, slot availability, status meta, seed bookings
  Dialog.jsx     # in-app confirm/alert modal (replaces native confirm/alert)
  Toast.jsx      # toast notifications (supports clickable link/action)
  App.css / index.css
  lib/
    supabase.js     # shared browser client (reads VITE_ env vars)
    auth.js         # email OTP: sendEmailOtp / verifyEmailOtp / signOut
    bookingsApi.js  # fetch/insert/update bookings (camel<->snake mappers)
    usersApi.js     # fetch/upsert customer by email
  views/
    HomeView.jsx
    BookingView.jsx
    AccountView.jsx
    ProfileView.jsx
  admin/
    AdminLogin.jsx
    AdminShell.jsx       # admin layout + nav
    DashboardPage.jsx
    CalendarPage.jsx
    RecordsPage.jsx
    CustomersPage.jsx
    BookingDrawer.jsx
    CustomerDrawer.jsx
    AdminNewBookingDrawer.jsx
index.html
```

## State (one useState in App, spread-merge updates via `onState`)

Customer flow: `view` (`home | book | account | profile | admin`), `step`, `cart`, `barber`, `date`, `time`, `user` (`{signedIn, firstName, lastName, mobile, email}`), `notes`, `payMethod`, `lastRef`, `lastBooking`, `reschedulingId`.

Auth: `authStep` (`email | otp`), `emailInput`, `otpInput`, `authBusy` (request in flight), `authErr`, `devCode` (DEV-only fallback OTP when Supabase email is unavailable).

Data: `bookings` — starts `[]`, hydrated from Supabase via `fetchBookings()` on mount.

Admin: `adminAuthed`, `adminUser`, `adminPass`, `adminErr`, `adminNavOpen`, `adminPage`, `drawerId`, `custName`, `calMode`, `calIso`, `drawerEdit`, `openEditN`.

UI: `dialog` (Dialog modal), `toast` + `toastN` (bump re-shows same message).

## Backend / data flow

- `lib/supabase.js` — single shared client; reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.local`.
- `lib/auth.js` — Supabase email OTP. Magic Link template must include `{{ .Token }}` to send a 6-digit code.
- `lib/bookingsApi.js` — `fetchBookings` / `insertBooking` / `updateBooking`; maps app camelCase ↔ DB snake_case. Only whitelisted columns (`PATCH_COLS`) are patchable.
- `lib/usersApi.js` — `fetchUser(email)` / `upsertUser(...)`; remembers name + mobile keyed on verified email (id derived from email), so a returning email auto-fills details.
- Writes are fire-and-forget after local state update; failures are logged to console.

## Data model

- **Service**: `{id, cat, name, sub, price, dur}` — 4 categories (Cuts & Shave, Treatments, Color, Packages).
- **Barber**: `{id, name, spec, initials, color}` — 4 barbers, `'any'` = first free.
- **Booking**: `{id, date(iso), barber, start(min from midnight), dur, service, price, customer, status, mine, pay, notes, followUp, checkedInAt, createdAt}`.
- **Status**: `booked | checked-in | in-progress | completed | cancelled | no-show` (see `statusMeta`; `isLive` = booked/checked-in/in-progress).
- Shop hours: `OPEN 540` (09:00) → `CLOSE 1140` (19:00), minutes from midnight. Slots every 30 min. Sunday closed.

## Key logic (helpers.js)

- `slotFree` / `firstFree` / `genSlots` — overlap-based availability per barber, respects lead time for same-day.
- `initBookings()` — generates today's schedule, ~28-day history, and your bookings (used for seeding).
- Auto no-show: a `booked` appointment >10 min past start without check-in is auto-marked No Show (status + persist + one toast).
- Formatters: `peso`, `timeLabel`, `dateFull`, `durLabel`, `statusMeta`, `ticketOf` (`GB-####`, `1024 + index`).

## Theme

Dark, warm tan/cream palette via CSS vars on root: bg `#0E0E0E`, accent tan `#D6C3A0`, cream text `#F4EFE7`.

## Commands

```bash
npm run dev      # dev server
npm run build    # build → dist/
npm run lint     # ESLint
npm run preview  # serve dist/
```

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
