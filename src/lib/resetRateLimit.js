// Client-side rate limiting for "Forgot password?" requests, so one device can't
// spam reset emails. Stored in localStorage as a list of recent request
// timestamps. Best-effort (a determined user can clear storage); Supabase also
// rate-limits its email sender server-side as a backstop.

const KEY = 'gb_reset_requests'
const MIN_GAP_MS = 60 * 1000          // at least 60s between requests
const WINDOW_MS = 60 * 60 * 1000      // rolling 1h window
const MAX_PER_WINDOW = 3              // at most 3 reset emails per hour

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter(t => typeof t === 'number') }
  catch { return [] }
}
const write = (arr) => { try { localStorage.setItem(KEY, JSON.stringify(arr)) } catch { /* storage off */ } }

// Returns { ok: true } if a reset request is allowed now, else { ok: false, error }.
export function canRequestReset(now = Date.now()) {
  const recent = read().filter(t => now - t < WINDOW_MS)
  if (recent.length) {
    const sinceLast = now - Math.max(...recent)
    if (sinceLast < MIN_GAP_MS) {
      const wait = Math.ceil((MIN_GAP_MS - sinceLast) / 1000)
      return { ok: false, error: `Please wait ${wait}s before requesting another reset link.` }
    }
  }
  if (recent.length >= MAX_PER_WINDOW) {
    return { ok: false, error: "Too many reset requests. Please try again in an hour." }
  }
  return { ok: true }
}

// Record a sent reset email so future calls to canRequestReset() count it.
export function recordReset(now = Date.now()) {
  const recent = read().filter(t => now - t < WINDOW_MS)
  recent.push(now)
  write(recent)
}

// Milliseconds until another reset request is allowed (0 = allowed now). Drives
// the countdown on the "Forgot password?" button.
export function resetCooldownMs(now = Date.now()) {
  const recent = read().filter(t => now - t < WINDOW_MS)
  if (!recent.length) return 0
  // Hit the hourly cap → wait until the oldest request falls out of the window.
  if (recent.length >= MAX_PER_WINDOW) {
    return Math.max(0, WINDOW_MS - (now - Math.min(...recent)))
  }
  // Otherwise just the per-request gap since the last one.
  return Math.max(0, MIN_GAP_MS - (now - Math.max(...recent)))
}
