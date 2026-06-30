import { supabase } from './supabase'

// Data access for the `bookings` table.
// The app uses camelCase booking objects; the DB uses snake_case columns.
// These mappers keep the rest of the app unaware of the DB shape.

const TABLE = 'bookings'

// DB row (snake) -> app booking (camel)
const fromRow = (r) => ({
  id: r.id,
  date: r.date,
  barber: r.barber,
  start: r.start_min,
  dur: r.dur,
  service: r.service,
  price: Number(r.price),
  customer: r.customer,
  email: r.email || '',
  status: r.status,
  mine: r.mine,
  pay: r.pay,
  notes: r.notes || '',
  followUp: r.follow_up,
  checkedInAt: r.checked_in_at,
  createdAt: r.created_at,
})

// app booking (camel) -> DB row (snake)
const toRow = (b) => ({
  id: b.id,
  date: b.date,
  barber: b.barber,
  start_min: b.start,
  dur: b.dur,
  service: b.service,
  price: b.price,
  customer: b.customer,
  email: b.email || null,
  status: b.status,
  mine: b.mine,
  pay: b.pay,
  notes: b.notes || '',
  follow_up: b.followUp,
  checked_in_at: b.checkedInAt || null,
})

// Only these app fields are updatable; maps camel -> snake column.
const PATCH_COLS = {
  status: 'status',
  followUp: 'follow_up',
  checkedInAt: 'checked_in_at',
  date: 'date',
  start: 'start_min',
  barber: 'barber',
}

export async function fetchBookings() {
  const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: true })
  if (error) throw error
  return (data || []).map(fromRow)
}

// Public, no-PII availability feed (see migration 0019). Reads the
// bookings_occupancy view, which anyone may read, so the slot picker works for
// signed-out visitors and signed-in customers alike — without exposing names or
// emails. Shape matches what genSlots/slotFree expect (camelCase `start`).
export async function fetchOccupancy() {
  const { data, error } = await supabase.from('bookings_occupancy').select('*')
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id, date: r.date, barber: r.barber, start: r.start_min, dur: r.dur, status: r.status,
  }))
}

export async function insertBooking(booking) {
  const { error } = await supabase.from(TABLE).insert(toRow(booking))
  if (error) throw error
}

export async function updateBooking(id, patch) {
  const row = {}
  for (const key in patch) {
    if (Object.prototype.hasOwnProperty.call(PATCH_COLS, key)) row[PATCH_COLS[key]] = patch[key]
  }
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from(TABLE).update(row).eq('id', id)
  if (error) throw error
}

// Mark every overdue 'booked' appointment as 'no-show' on the server (see
// migration 0017). Runs as a SECURITY DEFINER function so it works even when the
// table's direct UPDATE is locked down by RLS. Returns the ids it changed so the
// caller can mirror the change locally. A server pg_cron job runs the same thing
// every minute, so this is the live-UI path, not the only guarantee.
export async function markOverdueNoShows() {
  const { data, error } = await supabase.rpc('mark_overdue_no_shows')
  if (error) throw error
  return (data || []).map(r => r.id)
}
