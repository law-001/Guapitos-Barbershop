import { createClient } from '@supabase/supabase-js'

// Vite exposes env vars prefixed with VITE_ via import.meta.env.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  // Fail loud in dev so a missing .env.local is obvious.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local')
}

// --- Remember me -------------------------------------------------------------
// The "Remember me" choice decides WHERE Supabase keeps the auth session:
//   checked   → localStorage   — survives closing the browser; lasts until the
//               server-side session expiry set in the Supabase dashboard.
//   unchecked → sessionStorage — wiped the moment the tab/browser closes.
// The session lifetime itself is server-side (dashboard → Auth → Sessions);
// this flag only controls persistence on THIS device. The flag lives in
// localStorage so the storage adapter below can read it on every access.
const REMEMBER_KEY = 'gb_remember'
// Default to remembering (matches the app's prior always-persist behavior).
export const getRemember = () => { try { return localStorage.getItem(REMEMBER_KEY) !== '0' } catch { return true } }
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
