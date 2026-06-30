import { fetchLoginAt } from './usersApi'
import { getRemember } from './supabase'

// Absolute session lifetime, in milliseconds, measured from the server-stored
// login_timestamp (so it survives browser restarts and page refreshes — those
// never rewrite the timestamp). There are TWO windows, chosen by the "Keep me
// signed in on this device" checkbox at sign-in (locked in at verify):
//   unchecked → SESSION_MAX_MS      — short window (default 24h). DEFAULT.
//   checked   → SESSION_REMEMBER_MS — long window (default 30 days / 1 month).
// Both are configurable via env (see .env.example).
const HOURS = Number(import.meta.env.VITE_SESSION_MAX_HOURS) || 24
export const SESSION_MAX_MS = HOURS * 60 * 60 * 1000
export const SESSION_MAX_HOURS = HOURS

const REMEMBER_DAYS = Number(import.meta.env.VITE_SESSION_REMEMBER_DAYS) || 30
export const SESSION_REMEMBER_MS = REMEMBER_DAYS * 24 * 60 * 60 * 1000
export const SESSION_REMEMBER_DAYS = REMEMBER_DAYS

// The lifetime that applies on THIS device right now, per the locked-in
// "Keep me signed in" choice (read from the persisted remember flag).
export const sessionMaxMs = () => (getRemember() ? SESSION_REMEMBER_MS : SESSION_MAX_MS)

/**
 * Pure check: has `loginAtIso` aged past the max lifetime?
 * A missing/invalid timestamp is treated as NOT expired so we never lock out a
 * row that predates the column (it stamps fresh on the next sign-in).
 * @param {string|null|undefined} loginAtIso  ISO timestamp of last sign-in
 * @param {number} [now]  current epoch ms (injectable for tests)
 * @param {number} [maxMs]  max lifetime in ms (defaults to the active window)
 * @returns {boolean}
 */
export const isExpired = (loginAtIso, now = Date.now(), maxMs = sessionMaxMs()) => {
  if (!loginAtIso) return false
  const t = new Date(loginAtIso).getTime()
  if (Number.isNaN(t)) return false
  return now - t >= maxMs
}

/**
 * Server-truth check: fetch the stored login time for this email and compare.
 * Fails OPEN (returns false) on network/DB errors so a transient outage can't
 * sign everyone out; the absolute cutoff still applies once the DB is reachable.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export const isSessionExpired = async (email) => {
  try { return isExpired(await fetchLoginAt(email)) }
  catch (e) { console.error('session expiry check failed', e); return false }
}
