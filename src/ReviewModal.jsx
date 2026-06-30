// Write-a-review modal. Opens from the "Write review" buttons (landing section +
// Reviews page). Collects a name, a 1-5 star rating, and optional text, then
// calls onSubmit({ author, rating, body }) — App persists it to the `reviews`
// table and prepends it to the list. Portaled to <body> so the fixed overlay
// centers on the viewport regardless of scroll.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Mounted only while open (parent gates it), so useState initializers reset the
// form on each open — no reset-in-effect needed.
export default function ReviewModal({ onClose, onSubmit, defaultName = '' }) {
  const accent = '#D6C3A0', hair = '#2A2622';
  const [author, setAuthor] = useState(defaultName);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Lock body scroll + close on Escape while mounted.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const canSubmit = author.trim() && rating >= 1 && !busy;
  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setError('');
    const res = await onSubmit({ author: author.trim(), rating, body: body.trim() });
    if (res && res.ok === false) { setError(res.error || 'Could not post your review.'); setBusy(false); return; }
    onClose();
  };

  return createPortal((
    <div style={{ position: 'fixed', inset: '0', zIndex: '185', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: '0', background: 'rgba(0,0,0,0.65)', animation: 'gbback 0.18s ease both' }}></div>
      <div role="dialog" aria-modal="true" aria-label="Write a review"
        style={{ position: 'relative', width: 'min(460px,94vw)', maxHeight: '90vh', overflowY: 'auto', background: '#15130F', border: '1px solid ' + hair, borderRadius: '16px', padding: 'clamp(22px,4vw,30px)', boxShadow: '0 20px 60px rgba(0,0,0,0.55)', animation: 'gbfade 0.2s ease both' }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: '#9A9388', cursor: 'pointer', fontSize: '22px', lineHeight: '1', padding: '4px 8px' }}>×</button>
        <div style={{ fontFamily: "'Oswald'", letterSpacing: '0.22em', textTransform: 'uppercase', fontSize: '12px', color: accent, marginBottom: '8px' }}>Your turn</div>
        <h2 style={{ fontFamily: "'Oswald'", fontWeight: '700', textTransform: 'uppercase', fontSize: 'clamp(22px,4vw,30px)', margin: '0 0 18px', lineHeight: '1.05' }}>Write a review</h2>

        {/* Name */}
        <label style={{ display: 'block', fontSize: '13px', color: '#9A9388', marginBottom: '7px' }}>Your name</label>
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Juan Dela Cruz" autoComplete="name"
          style={{ width: '100%', boxSizing: 'border-box', background: '#1D1A15', border: '1px solid ' + hair, borderRadius: '10px', padding: '14px', color: '#F4EFE7', fontSize: '16px', marginBottom: '16px' }} />

        {/* Star rating picker */}
        <label style={{ display: 'block', fontSize: '13px', color: '#9A9388', marginBottom: '7px' }}>Your rating</label>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', lineHeight: '1', fontSize: '34px', color: n <= (hover || rating) ? accent : '#3A352D' }}>★</button>
          ))}
        </div>

        {/* Review text (optional) */}
        <label style={{ display: 'block', fontSize: '13px', color: '#9A9388', marginBottom: '7px' }}>Your review <span style={{ opacity: '0.6' }}>(optional)</span></label>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Tell others about your visit — the cut, the barber, the vibe." rows={4}
          style={{ width: '100%', boxSizing: 'border-box', background: '#1D1A15', border: '1px solid ' + hair, borderRadius: '10px', padding: '14px', color: '#F4EFE7', fontSize: '16px', resize: 'vertical', marginBottom: '20px' }} />

        {error && <p style={{ color: '#E08A6E', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}
        <button onClick={submit} disabled={!canSubmit}
          style={{ width: '100%', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5, background: accent, color: '#0E0E0E', border: 'none', borderRadius: '10px', padding: '14px', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '15px' }}>
          {busy ? 'Posting…' : 'Post review'}
        </button>
        <p style={{ color: '#9A9388', fontSize: '12px', textAlign: 'center', margin: '12px 0 0' }}>Reviews are checked by staff before they appear.</p>
      </div>
    </div>
  ), document.body);
}
