import { createClient } from '@supabase/supabase-js'

// Vite exposes env vars prefixed with VITE_ via import.meta.env.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  // Fail loud in dev so a missing .env.local is obvious.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local')
}

// --- Keep me signed in -------------------------------------------------------
// The "Keep me signed in on this device" choice decides two things:
//   checked   → localStorage   — survives closing the browser; long absolute
//               expiry window (SESSION_REMEMBER_MS, ~1 month — see lib/session).
//   unchecked → sessionStorage — wiped the moment the tab/browser closes; short
//               absolute expiry window (SESSION_MAX_MS, ~24h). DEFAULT.
// This flag controls device persistence here; lib/session reads it to pick the
// matching expiry window. The flag lives in localStorage so the storage adapter
// below (and the expiry check) can read it on every access.
const REMEMBER_KEY = 'gb_remember'
// Default to NOT remembering (unchecked): a stored '1' is the only "remember".
export const getRemember = () => { try { return localStorage.getItem(REMEMBER_KEY) === '1' } catch { return false } }
export const setRemember = (v) => { try { localStorage.setItem(REMEMBER_KEY, v ? '1' : '0') } catch { /* ignore */ } }

// Storage adapter Supabase uses for the auth token. Writes go to the store the
// Remember-me flag selects; reads check localStorage first then sessionStorage
// so a session is never lost if the flag flips between visits.
const rememberStorage = {
  getItem: (k) => {
    try { return localStorage.getItem(k) ?? sessionStorage.getItem(k) } catch { return null }
  },
  setItem: (k, v) => {
    try {
      const remember = getRemember()
      ;(remember ? localStorage : sessionStorage).setItem(k, v)
      ;(remember ? sessionStorage : localStorage).removeItem(k)  // no copy in the wrong store
    } catch { /* ignore */ }
  },
  removeItem: (k) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k) } catch { /* ignore */ } },
}

// Single shared browser client for the whole app.
// Usage:  import { supabase } from '@/lib/supabase'  (or relative path)
//         const { data, error } = await supabase.from('bookings').select()
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: rememberStorage,
  },
})
