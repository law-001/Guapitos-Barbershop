// Reviews page — shows customer reviews stored in the `reviews` table (loaded in
// App.jsx). Reads from `reviews` prop; renders an overall rating summary + each
// individual review. The "Write review" button opens the in-site review form.

// Row of 5 stars; `value` filled (gold) up to the rating, rest dimmed.
const Stars = ({ value = 0, size = 16 }) => (
  <span style={{ display: 'inline-flex', gap: '2px', lineHeight: '1' }} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(n => (
      <span key={n} style={{ color: n <= Math.round(value) ? '#D6C3A0' : '#3A352D', fontSize: size + 'px' }}>★</span>
    ))}
  </span>
);

export default function ReviewsView({ reviews = [], goHome, onWriteReview }) {
  const accent = '#D6C3A0', hair = '#2A2622';
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count : 0;
  const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase();

  const backBtn = (
    <button onClick={goHome} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'transparent', border: '1px solid ' + hair, color: '#9A9388', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
      <span style={{ fontSize: '16px', lineHeight: '1' }}>←</span> Back to home
    </button>
  );

  return (
    <main style={{ maxWidth: '880px', margin: '0 auto', padding: 'clamp(28px,5vw,52px) clamp(16px,4vw,32px) 80px', animation: 'gbfade 0.4s ease both' }}>
      {/* Heading row: title left, back button far right. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: "'Oswald'", letterSpacing: '0.22em', textTransform: 'uppercase', fontSize: '13px', color: accent, marginBottom: '10px' }}>What clients say</div>
          <h1 style={{ fontFamily: "'Oswald'", fontWeight: '700', textTransform: 'uppercase', fontSize: 'clamp(30px,5vw,52px)', margin: '0', lineHeight: '1' }}>Reviews</h1>
        </div>
        {backBtn}
      </div>

      {/* Summary card: average rating + count + link to write a Google review. */}
      <div style={{ background: '#15130F', border: '1px solid ' + hair, borderRadius: '16px', padding: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
        <div style={{ textAlign: 'center', minWidth: '120px' }}>
          <div style={{ fontFamily: "'Oswald'", fontWeight: '700', fontSize: '52px', lineHeight: '1', color: accent }}>{avg ? avg.toFixed(1) : '—'}</div>
          <div style={{ marginTop: '8px' }}><Stars value={avg} size={18} /></div>
          <div style={{ color: '#9A9388', fontSize: '13px', marginTop: '6px' }}>{count} {count === 1 ? 'review' : 'reviews'}</div>
        </div>
        <div style={{ flex: '1', minWidth: '220px' }}>
          <div style={{ fontFamily: "'Oswald'", textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '18px' }}>From our Google listing</div>
          <p style={{ color: '#9A9388', fontSize: '14px', margin: '6px 0 14px' }}>Real reviews from clients who've sat in our chairs. Been in lately? Leave us one.</p>
          <button onClick={onWriteReview}
            style={{ display: 'inline-block', background: accent, color: '#0E0E0E', border: 'none', cursor: 'pointer', borderRadius: '9px', padding: '12px 20px', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '14px' }}>
            Write review
          </button>
        </div>
      </div>

      {/* Review list. Empty state when nothing is loaded yet. */}
      {count === 0 ? (
        <div style={{ background: '#15130F', border: '1px solid ' + hair, borderRadius: '14px', padding: '40px 30px', textAlign: 'center', color: '#9A9388' }}>
          No reviews yet — <button onClick={onWriteReview} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 'inherit', padding: '0', textDecoration: 'underline' }}>be the first to write one</button>.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background: '#15130F', border: '1px solid ' + hair, borderRadius: '15px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <span style={{ flexShrink: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: accent, color: '#0E0E0E', fontFamily: "'Oswald'", fontWeight: '700', fontSize: '20px' }}>{initialOf(r.author)}</span>
                <div style={{ flex: '1', minWidth: '0' }}>
                  <div style={{ fontFamily: "'Oswald'", fontSize: '18px', lineHeight: '1.2' }}>{r.author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    <Stars value={r.rating} size={14} />
                    {(r.relativeTime || r.reviewDate) && (
                      <span style={{ color: '#9A9388', fontSize: '13px' }}>{r.relativeTime || new Date(r.reviewDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              </div>
              {r.body && <p style={{ color: '#F4EFE7', fontSize: '15px', lineHeight: '1.55', margin: '0' }}>{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
