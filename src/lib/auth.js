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
