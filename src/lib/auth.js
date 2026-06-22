import { supabase } from './supabase'

// Email one-time-password (OTP) auth for the booking sign-in step.
//
// sendEmailOtp emails a 6-digit code to the address. For the email to contain
// a numeric code (not just a magic link), the Supabase project's "Magic Link"
// email template must include the {{ .Token }} variable
// (Dashboard → Authentication → Email Templates).

export async function sendEmailOtp(email) {
  return supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
}

export async function verifyEmailOtp(email, token) {
  return supabase.auth.verifyOtp({ email, token, type: 'email' })
}

export async function signOut() {
  return supabase.auth.signOut()
}

// Current server-side session (null when signed out / expired). Supabase reads
// it from storage and auto-refreshes it; we just mirror its signed-in state.
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

// Subscribe to auth changes (sign-in, token refresh, expiry, sign-out). The
// callback gets the new session or null. Returns an unsubscribe function.
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session ?? null))
  return () => data.subscription?.unsubscribe()
}
