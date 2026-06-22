import { fetchLoginAt } from './usersApi'

// Absolute session lifetime, in milliseconds. Configurable via the
// VITE_SESSION_MAX_HOURS env var (see .env.example); defaults to 24 hours.
// The cutoff is measured from the server-stored login_timestamp, so it survives
// browser restarts and page refreshes (those never rewrite the timestamp).
const HOURS = Number(import.meta.env.VITE_SESSION_MAX_HOURS) || 24
export const SESSION_MAX_MS = HOURS * 60 * 60 * 1000
export const SESSION_MAX_HOURS = HOURS

/**
 * Pure check: has `loginAtIso` aged past the max lifetime?
 * A missing/invalid timestamp is treated as NOT expired so we never lock out a
 * row that predates the column (it stamps fresh on the next sign-in).
 * @param {string|null|undefined} loginAtIso  ISO timestamp of last sign-in
 * @param {number} [now]  current epoch ms (injectable for tests)
 * @returns {boolean}
 */
export const isExpired = (loginAtIso, now = Date.now()) => {
  if (!loginAtIso) return false
  const t = new Date(loginAtIso).getTime()
  if (Number.isNaN(t)) return false
  return now - t >= SESSION_MAX_MS
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
