import { supabase } from './supabase'

// Data access for the `reviews` table (customer reviews — mirrored from Google
// plus website submissions). App objects are camelCase; DB columns snake_case.
// Website submissions land approved=false and are hidden from the public site
// until staff approve them in the admin Reviews page.

const TABLE = 'reviews'

// DB row (snake) -> app review (camel)
const fromRow = (r) => ({
  id: r.id,
  author: r.author,
  rating: Number(r.rating),
  body: r.body || '',
  reviewDate: r.review_date,
  relativeTime: r.relative_time || '',
  source: r.source || 'google',
  approved: !!r.approved,
  createdAt: r.created_at,
})

// app review (camel) -> DB row (snake)
const toRow = (r) => ({
  id: r.id,
  author: r.author,
  rating: r.rating,
  body: r.body || '',
  review_date: r.reviewDate || null,
  relative_time: r.relativeTime || null,
  source: r.source || 'website',
  approved: !!r.approved,
})

// Public list: approved reviews only, newest first.
export async function fetchReviews() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(fromRow)
}

// Admin list: every review (pending + approved), newest first.
export async function fetchAllReviews() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(fromRow)
}

export async function insertReview(review) {
  const { error } = await supabase.from(TABLE).insert(toRow(review))
  if (error) throw error
}

// Staff approve a pending review (makes it public).
export async function approveReview(id) {
  const { error } = await supabase.from(TABLE).update({ approved: true }).eq('id', id)
  if (error) throw error
}

// Staff reject/remove a review entirely.
export async function deleteReview(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
