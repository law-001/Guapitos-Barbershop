// Client-side rate limiting for review submissions, to keep one device from
// flooding the admin moderation queue. Stored in localStorage as a list of
// recent post timestamps. This is a best-effort guard (a determined user can
// clear storage) — pair it with the staff approval step for real protection.

const KEY = 'gb_review_posts'
const MIN_GAP_MS = 60 * 1000          // at least 60s between posts
const WINDOW_MS = 24 * 60 * 60 * 1000 // rolling 24h window
const MAX_PER_WINDOW = 3              // at most 3 posts per 24h

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter(t => typeof t === 'number') }
  catch { return [] }
}
const write = (arr) => { try { localStorage.setItem(KEY, JSON.stringify(arr)) } catch { /* storage off */ } }

// Returns { ok: true } if a post is allowed now, else { ok: false, error }.
export function canPostReview(now = Date.now()) {
  const recent = read().filter(t => now - t < WINDOW_MS)
  if (recent.length) {
    const sinceLast = now - Math.max(...recent)
    if (sinceLast < MIN_GAP_MS) {
      const wait = Math.ceil((MIN_GAP_MS - sinceLast) / 1000)
      return { ok: false, error: `Please wait ${wait}s before posting another review.` }
    }
  }
  if (recent.length >= MAX_PER_WINDOW) {
    return { ok: false, error: "You've reached the review limit for today. Try again tomorrow." }
  }
  return { ok: true }
}

// Record a successful post so future calls to canPostReview() count it.
export function recordReviewPost(now = Date.now()) {
  const recent = read().filter(t => now - t < WINDOW_MS)
  recent.push(now)
  write(recent)
}
