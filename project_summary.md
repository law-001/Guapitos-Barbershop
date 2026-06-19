# Guapito's Barbershop — Project Summary

Barbershop booking web app. Customer side books appointments; admin side runs the shop. Single-page, static data, no backend — all in-memory.

## What it does

**Customer:** browse services, pick service(s) + barber + date + time, sign in by phone/OTP (fake), pick pay method, get a booking ref. View/reschedule own appointments in "My Appointments".

**Admin** (login `manager` / `guapito`): dashboard, calendar (month/day), bookings drawer, customers list + drawer, records, create new booking. All state lives in the same React tree.

## Tech stack

| Thing | Choice |
|-------|--------|
| UI | React 19 (`.jsx`) |
| Build/dev | Vite 8 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) + heavy inline `style={{}}` with CSS vars |
| Lint | ESLint 10 (+ react-hooks, react-refresh) |
| Routing | None — `view` field in one `useState` |
| Types | No TypeScript |
| Fonts | Oswald + Hanken Grotesk (Google Fonts) |

## Structure

```
src/
  App.jsx        # root: state shape, top bar, view switch
  main.jsx       # React mount
  data.js        # SERVICES, CATS, BARBERS, PHONES, ACTIVITY, OPEN/CLOSE hours
  helpers.js     # time/date utils, peso fmt, slot availability, seed bookings
  App.css / index.css
  views/
    HomeView.jsx
    BookingView.jsx
    AccountView.jsx
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

Customer flow: `view` (`home | book | account | admin`), `step`, `cart`, `barber`, `date`, `time`, `user`, `authStep`, `phoneInput`, `otpInput`, `notes`, `payMethod`, `lastRef`, `lastBooking`, `reschedulingId`.

Data: `bookings` (seeded array — today's schedule + history + your own).

Admin: `adminAuthed`, `adminUser`, `adminPass`, `adminErr`, `adminNavOpen`, `adminPage`, `drawerId`, `custName`, `calMode`, `calIso`.

## Data model

- **Service**: `{id, cat, name, sub, price, dur}` — 4 categories (Cuts & Shave, Treatments, Color, Packages).
- **Barber**: `{id, name, spec, initials, color}` — 4 barbers, `'any'` = first free.
- **Booking**: `{id, date(iso), barber, start(min from midnight), dur, service, price, customer, status, mine, pay, notes, followUp}`.
- **Status**: `confirmed | completed | no-show | cancelled`.
- Shop hours: `OPEN 600` (10:00) → `CLOSE 1200` (20:00), minutes from midnight. Slots every 30 min.

## Key logic (helpers.js)

- `slotFree` / `firstFree` / `genSlots` — overlap-based availability per barber, respects lead time for same-day.
- `initBookings()` — generates today's schedule, ~28-day history, and your bookings.
- Formatters: `peso`, `timeLabel`, `dateFull`, `durLabel`, `ticketOf` (`GB-####`).

## Theme

Dark, warm tan/cream palette via CSS vars on root: bg `#0E0E0E`, accent tan `#D6C3A0`, cream text `#F4EFE7`.

## Commands

```bash
npm run dev      # dev server
npm run build    # build → dist/
npm run lint     # ESLint
npm run preview  # serve dist/
```
