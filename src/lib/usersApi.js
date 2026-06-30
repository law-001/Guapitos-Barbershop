import { supabase } from './supabase'

// Data access for the `users` table (customers). Remembers a customer's name +
// mobile keyed on their (verified) email, so a returning, re-verified email
// auto-fills the details step instead of re-typing.
//
// The app uses camelCase; the DB uses snake_case. These mappers bridge the two.

const TABLE = 'users'

const norm = (email) => (email || '').trim().toLowerCase()
// Stable id derived from the email so repeated upserts touch the same row.
const idForEmail = (email) => 'u_' + norm(email).replace(/[^a-z0-9]+/g, '_')

// DB row (snake) -> app user (camel)
const fromRow = (r) => ({
  email: r.email,
  firstName: r.first_name || '',
  lastName: r.last_name || '',
  mobile: r.mobile || '',
  loginAt: r.login_timestamp || null,   // ISO string of last sign-in, or null
})

// Fetch a saved customer by email. Returns null when none exists (new customer).
export async function fetchUser(email) {
  const addr = norm(email)
  if (!addr) return null
  const { data, error } = await supabase.from(TABLE).select('*').eq('email', addr).maybeSingle()
  if (error) throw error
  return data ? fromRow(data) : null
}

// Create or update the customer for this email (upsert on the unique email).
export async function upsertUser({ email, firstName, lastName, mobile }) {
  const addr = norm(email)
  if (!addr) return
  const row = {
    id: idForEmail(addr),
    email: addr,
    first_name: (firstName || '').trim(),
    last_name: (lastName || '').trim(),
    mobile: (mobile || '').trim(),
  }
  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'email' })
  if (error) throw error
}

// Stamp the customer's login time = now on a successful sign-in. Upsert touches
// only id/email/login_timestamp, so an existing profile's name/mobile are kept.
// Returns the ISO timestamp written. This is the ONLY place the clock is set, so
// token auto-refresh and page reloads never move it (absolute, not sliding).
export async function touchLogin(email) {
  const addr = norm(email)
  if (!addr) return null
  const ts = new Date().toISOString()
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: idForEmail(addr), email: addr, login_timestamp: ts }, { onConflict: 'email' })
  if (error) throw error
  return ts
}

// Fetch every saved customer (staff-only read under RLS 0020). Used by the admin
// Customers page + drawers to show real saved mobiles, keyed by email.
export async function fetchAllUsers() {
  const { data, error } = await supabase.from(TABLE).select('email, first_name, last_name, mobile')
  if (error) throw error
  return (data || []).map(fromRow)
}

// Read just the stored login timestamp for this email (null when no row yet).
export async function fetchLoginAt(email) {
  const addr = norm(email)
  if (!addr) return null
  const { data, error } = await supabase.from(TABLE).select('login_timestamp').eq('email', addr).maybeSingle()
  if (error) throw error
  return data?.login_timestamp || null
}
