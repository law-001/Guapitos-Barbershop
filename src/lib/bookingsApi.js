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
