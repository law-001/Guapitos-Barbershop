// Admin Reviews moderation page. Lists pending (unapproved) reviews first with
// Approve / Reject actions, then the already-approved ones (reject still works).
// Data comes from `reviews` (all rows, incl. pending) loaded in App.jsx.
const accent = '#D6C3A0', hair = '#2A2622';

const Stars = ({ value = 0, size = 14 }) => (
  <span style={{ display: 'inline-flex', gap: '2px', lineHeight: '1' }} aria-label={`${value} of 5 stars`}>
    {[1, 2, 3, 4, 5].map(n => (
      <span key={n} style={{ color: n <= Math.round(value) ? accent : '#3A352D', fontSize: size + 'px' }}>★</span>
    ))}
  </span>
);

function ReviewCard({ r, onApprove, onReject, pending }) {
  const initial = (r.author || '?').trim().charAt(0).toUpperCase();
  return (
    <div style={{ background: '#15130F', border: '1px solid ' + (pending ? accent : hair), borderRadius: '14px', padding: '18px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: accent, color: '#0E0E0E', fontFamily: "'Oswald'", fontWeight: '700', fontSize: '18px' }}>{initial}</span>
      <div style={{ flex: '1', minWidth: '180px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Oswald'", fontSize: '17px' }}>{r.author}</span>
          <Stars value={r.rating} />
          <span style={{ color: '#9A9388', fontSize: '12.5px' }}>{r.relativeTime || ''} · {r.source}</span>
        </div>
        {r.body && <p style={{ color: '#F4EFE7', fontSize: '14.5px', lineHeight: '1.5', margin: '8px 0 0' }}>{r.body}</p>}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {pending && (
          <button onClick={() => onApprove(r.id)} style={{ cursor: 'pointer', background: accent, color: '#0E0E0E', border: 'none', borderRadius: '8px', padding: '9px 16px', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '13px' }}>Approve</button>
        )}
        <button onClick={() => onReject(r)} style={{ cursor: 'pointer', background: 'transparent', color: '#C46A5A', border: '1px solid ' + hair, borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '600' }}>{pending ? 'Reject' : 'Remove'}</button>
      </div>
    </div>
  );
}

export default function ReviewsPage({ reviews = [], onApprove, onReject }) {
  const pending = reviews.filter(r => !r.approved);
  const approved = reviews.filter(r => r.approved);

  return (
    <div>
      <div style={{ fontFamily: "'Oswald'", textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '14px', color: '#F4EFE7', marginBottom: '14px' }}>
        Pending approval {pending.length > 0 && <span style={{ color: accent }}>· {pending.length}</span>}
      </div>
      {pending.length === 0 ? (
        <div style={{ background: '#15130F', border: '1px solid ' + hair, borderRadius: '14px', padding: '26px', textAlign: 'center', color: '#9A9388', marginBottom: '34px' }}>No reviews waiting for approval.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '34px' }}>
          {pending.map(r => <ReviewCard key={r.id} r={r} onApprove={onApprove} onReject={onReject} pending />)}
        </div>
      )}

      <div style={{ fontFamily: "'Oswald'", textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '14px', color: '#F4EFE7', marginBottom: '14px' }}>
        Published <span style={{ color: '#9A9388' }}>· {approved.length}</span>
      </div>
      {approved.length === 0 ? (
        <div style={{ background: '#15130F', border: '1px solid ' + hair, borderRadius: '14px', padding: '26px', textAlign: 'center', color: '#9A9388' }}>No published reviews yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {approved.map(r => <ReviewCard key={r.id} r={r} onApprove={onApprove} onReject={onReject} pending={false} />)}
        </div>
      )}
    </div>
  );
}
