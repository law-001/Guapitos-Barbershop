import { createClient } from '@supabase/supabase-js'

// Vite exposes env vars prefixed with VITE_ via import.meta.env.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  // Fail loud in dev so a missing .env.local is obvious.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local')
}

// Single shared browser client for the whole app.
// Usage:  import { supabase } from '@/lib/supabase'  (or relative path)
//         const { data, error } = await supabase.from('bookings').select()
export const supabase = createClient(url, key)
