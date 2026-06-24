// Email-OTP sign-in modal. Opens from the top-bar Book Now (and anywhere else
// that needs a logged-in user). Mirrors the same two-step (email → OTP) UX
// used inside the booking flow, but as an overlay so the user doesn't lose
// their current view. After verification, `postAuthAction` (passed via state)
// runs so the caller can route the user onward (e.g. into the booking flow).
import { useEffect } from 'react';

export default function AuthModal({ state, onState, onClose, onSendOtp, onVerifyOtp, onToggleRemember }) {
  const open = state.authModalOpen;
  const accent = '#D6C3A0';
  const s = state;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s.emailInput || '').trim());

  // Close on Escape, lock body scroll while open. Hook must run every render
  // (no early-return above it) — guard the side-effects on `open` instead.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: '0', zIndex: '180', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: '0', background: 'rgba(0,0,0,0.65)', animation: 'gbback 0.18s ease both' }}></div>
      <div role="dialog" aria-modal="true" aria-label="Sign in"
        style={{ position: 'relative', width: 'min(440px,94vw)', background: '#15130F', border: '1px solid #2A2622', borderRadius: '16px', padding: 'clamp(20px,4vw,28px)', boxShadow: '0 20px 60px rgba(0,0,0,0.55)', animation: 'gbfade 0.2s ease both' }}>
        {/* Close (X) */}
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: '#9A9388', cursor: 'pointer', fontSize: '22px', lineHeight: '1', padding: '4px 8px' }}>×</button>

        <div style={{ fontFamily: "'Oswald'", letterSpacing: '0.22em', textTransform: 'uppercase', fontSize: '12px', color: accent, marginBottom: '8px' }}>
          {s.authStep === 'otp' ? 'Verify email' : 'Sign in'}
        </div>
        <h2 style={{ fontFamily: "'Oswald'", fontWeight: '700', textTransform: 'uppercase', fontSize: 'clamp(22px,4vw,30px)', margin: '0 0 6px', lineHeight: '1.05' }}>
          {s.authStep === 'otp' ? 'Enter your code' : 'Welcome back'}
        </h2>
        <p style={{ color: '#9A9388', margin: '0 0 20px', fontSize: '14px' }}>
          {s.authStep === 'otp'
            ? `We sent an 8-digit code to ${s.emailInput || 'your email'}.`
            : "We'll email a one-time code to sign you in. No password needed."}
        </p>

        {s.authStep === 'email' && (
          <>
            <label style={{ display: 'block', fontSize: '13px', color: '#9A9388', marginBottom: '7px' }}>Email address</label>
            <input type="email" value={s.emailInput} autoFocus
              onChange={e => onState({ emailInput: e.target.value, authErr: '' })}
              onKeyDown={e => { if (e.key === 'Enter' && emailOk && !s.authBusy) onSendOtp(s.emailInput); }}
              placeholder="you@email.com" autoComplete="email"
              style={{ width: '100%', boxSizing: 'border-box', background: '#1D1A15', border: `1px solid ${s.authErr ? '#C2553B' : '#2A2622'}`, borderRadius: '10px', padding: '14px', color: '#F4EFE7', fontSize: '16px', marginBottom: '12px' }} />
            {s.authErr && <p style={{ color: '#E08A6E', fontSize: '13px', margin: '0 0 12px' }}>{s.authErr}</p>}
            <label style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', userSelect: 'none', fontSize: '14px', color: '#9A9388', margin: '0 0 16px' }}>
              <input type="checkbox" checked={s.remember} onChange={e => onToggleRemember(e.target.checked)}
                style={{ width: '17px', height: '17px', accentColor: accent, cursor: 'pointer' }} />
              Keep me signed in on this device
            </label>
            <button onClick={() => onSendOtp(s.emailInput)} disabled={!emailOk || s.authBusy}
              style={{ width: '100%', cursor: (!emailOk || s.authBusy) ? 'not-allowed' : 'pointer', opacity: (!emailOk || s.authBusy) ? 0.55 : 1, background: accent, color: '#0E0E0E', border: 'none', borderRadius: '10px', padding: '14px', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '15px' }}>
              {s.authBusy ? 'Sending…' : 'Send code'}
            </button>
          </>
        )}

        {s.authStep === 'otp' && (
          <>
            {s.devCode && (
              <div style={{ background: 'rgba(214,195,160,0.1)', border: '1px dashed ' + accent, borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', color: '#9A9388' }}>
                Email service is down — <b style={{ color: accent }}>dev mode</b>. Use code <b style={{ color: accent, letterSpacing: '0.15em' }}>{s.devCode}</b>
              </div>
            )}
            <input type="text" inputMode="numeric" value={s.otpInput} autoFocus
              onChange={e => onState({ otpInput: e.target.value.replace(/\D/g, '').slice(0, 8), authErr: '' })}
              onKeyDown={e => { if (e.key === 'Enter' && s.otpInput.length === 8 && !s.authBusy) onVerifyOtp(s.emailInput, s.otpInput); }}
              placeholder="• • • • • • • •"
              style={{ width: '100%', boxSizing: 'border-box', background: '#1D1A15', border: `1px solid ${s.authErr ? '#C2553B' : '#2A2622'}`, borderRadius: '10px', padding: '14px', color: '#F4EFE7', fontSize: '22px', letterSpacing: '0.4em', textAlign: 'center', marginBottom: '12px' }} />
            {s.authErr && <p style={{ color: '#E08A6E', fontSize: '13px', margin: '0 0 12px' }}>{s.authErr}</p>}
            <button onClick={() => onVerifyOtp(s.emailInput, s.otpInput)} disabled={s.otpInput.length !== 8 || s.authBusy}
              style={{ width: '100%', cursor: (s.otpInput.length !== 8 || s.authBusy) ? 'not-allowed' : 'pointer', opacity: (s.otpInput.length !== 8 || s.authBusy) ? 0.55 : 1, background: accent, color: '#0E0E0E', border: 'none', borderRadius: '10px', padding: '14px', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '15px' }}>
              {s.authBusy ? 'Verifying…' : 'Verify & continue'}
            </button>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => onState({ authStep: 'email', otpInput: '', authErr: '' })}
                style={{ flex: '1', cursor: 'pointer', background: 'transparent', color: '#9A9388', border: 'none', padding: '12px', fontSize: '14px' }}>← Change email</button>
              <button onClick={() => onSendOtp(s.emailInput)} disabled={s.authBusy}
                style={{ flex: '1', cursor: s.authBusy ? 'not-allowed' : 'pointer', background: 'transparent', color: '#9A9388', border: 'none', padding: '12px', fontSize: '14px' }}>Resend code</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
