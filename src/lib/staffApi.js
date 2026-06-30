import { supabase } from './supabase'

// Staff lookup for the staff-console login. An email is "staff" only if it has
// an active row in public.staff. Returns the staff record (camelCase) or null.
export async function fetchStaffByEmail(email) {
  if (!email) return null
  const addr = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', addr)
    .eq('active', true)
    .maybeSingle()
  if (error) { console.error('fetchStaffByEmail failed', error); return null }
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    username: data.username,
    email: data.email,
    active: data.active,
    barberId: data.barber_id,
  }
}
