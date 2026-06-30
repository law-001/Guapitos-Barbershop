// Set-new-password modal. Shown when the user opens a password-reset link
// (App detects the PASSWORD_RECOVERY auth event). Collects a new password +
// confirmation and calls onSubmit(password), which returns an error string on
// failure or null on success. Portaled to <body> so it centers on the viewport.
import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function ResetPasswordModal({ onSubmit }) {
  const accent = '#D6C3A0', hair = '#2A2622';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (pw.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setBusy(true); setErr('');
    const error = await onSubmit(pw);
    if (error) { setBusy(false); setErr(error); return; }
    // success — App closes the modal and routes on.
  };

  return createPortal((
    <div style={{ position: 'fixed', inset: '0', zIndex: '200', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ position: 'absolute', inset: '0', background: 'rgba(0,0,0,0.7)' }}></div>
      <div role="dialog" aria-modal="true" aria-label="Set a new password"
        style={{ position: 'relative', width: 'min(440px,94vw)', background: '#15130F', border: '1px solid ' + hair, borderRadius: '16px', padding: 'clamp(22px,4vw,30px)', boxShadow: '0 20px 60px rgba(0,0,0,0.55)', animation: 'gbfade 0.2s ease both' }}>
        <div style={{ fontFamily: "'Oswald'", letterSpacing: '0.22em', textTransform: 'uppercase', fontSize: '12px', color: accent, marginBottom: '8px' }}>Password reset</div>
        <h2 style={{ fontFamily: "'Oswald'", fontWeight: '700', textTransform: 'uppercase', fontSize: 'clamp(22px,4vw,30px)', margin: '0 0 18px', lineHeight: '1.05' }}>Set a new password</h2>

        <label style={{ display: 'block', fontSize: '13px', color: '#9A9388', marginBottom: '7px' }}>New password</label>
        <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(''); }} placeholder="••••••••" autoComplete="new-password" autoFocus
          style={{ width: '100%', boxSizing: 'border-box', background: '#1D1A15', border: '1px solid ' + hair, borderRadius: '10px', padding: '13px', color: '#F4EFE7', fontSize: '16px', marginBottom: '14px' }} />

        <label style={{ display: 'block', fontSize: '13px', color: '#9A9388', marginBottom: '7px' }}>Confirm new password</label>
        <input type="password" value={pw2} onChange={e => { setPw2(e.target.value); setErr(''); }}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="••••••••" autoComplete="new-password"
          style={{ width: '100%', boxSizing: 'border-box', background: '#1D1A15', border: `1px solid ${err ? '#C2553B' : hair}`, borderRadius: '10px', padding: '13px', color: '#F4EFE7', fontSize: '16px', marginBottom: '16px' }} />

        {err && (
          <div style={{ background: 'rgba(196,106,90,0.12)', border: '1px solid rgba(196,106,90,0.4)', color: '#E0A095', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', marginBottom: '14px' }}>{err}</div>
        )}

        <button onClick={submit} disabled={busy}
          style={{ width: '100%', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, background: accent, color: '#0E0E0E', border: 'none', borderRadius: '10px', padding: '14px', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '15px' }}>{busy ? 'Saving…' : 'Save new password'}</button>
      </div>
    </div>
  ), document.body);
}
