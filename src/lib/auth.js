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

// Email + password sign-in — used by the staff console. The account (with its
// password) is created by the owner in the Supabase dashboard; this just signs
// them in. Staff access is then gated by the staff-table check in the app.
export async function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

// Email a password-reset link. `redirectTo` is where the link lands back in the
// app (must be listed in Supabase → Authentication → URL Configuration). Opening
// that link signs the user into a short recovery session and fires a
// PASSWORD_RECOVERY event (see onPasswordRecovery) so we can show a "set new
// password" form.
export async function sendPasswordReset(email, redirectTo) {
  return supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined)
}

// Set a new password for the currently-signed-in (recovery) session.
export async function updatePassword(password) {
  return supabase.auth.updateUser({ password })
}

// Fire `cb` when Supabase detects the user arrived via a password-reset link.
export function onPasswordRecovery(cb) {
  const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') cb() })
  return () => data.subscription?.unsubscribe()
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
