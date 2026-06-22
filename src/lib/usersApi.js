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
