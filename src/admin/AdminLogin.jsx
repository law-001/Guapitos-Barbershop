// Staff console sign-in. Real auth via Supabase email + password. Access is
// granted only if the signed-in email is an active row in the `staff` table
// (checked in App.onAdminLogin). Accounts/passwords are created by the owner in
// the Supabase dashboard.
import { useState, useEffect } from 'react';
import { resetCooldownMs, recordReset } from '../lib/resetRateLimit';

export default function AdminLogin({ adminEmail, adminPass, adminBusy, adminErr, adminLockUntil, onAdminEmail, onAdminPass, onAdminLogin, onAdminForgot, goHome }) {
  const accent = '#D6C3A0';

  // Tick every 500ms so both countdowns stay live. `cooldown` is the local
  // forgot-password gap; `loginCd` counts down to adminLockUntil, the lockout the
  // server throttle returned for the Sign in button.
  const [cooldown, setCooldown] = useState(() => Math.ceil(resetCooldownMs() / 1000));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => { setCooldown(Math.ceil(resetCooldownMs() / 1000)); setNow(Date.now()); }, 500);
    return () => clearInterval(t);
  }, []);

  const loginCd = Math.max(0, Math.ceil(((adminLockUntil || 0) - now) / 1000));
  const lockedOut = loginCd > 0;
  const canSubmit = (adminEmail || '').trim() && adminPass && !adminBusy && !lockedOut;
  const signInLabel = lockedOut ? (loginCd > 99 ? `Locked — ${Math.ceil(loginCd / 60)}m` : `Locked — ${loginCd}s`) : (adminBusy ? 'Signing in…' : 'Sign in');
  const submit = () => { if (canSubmit) onAdminLogin(adminEmail, adminPass); };

  const forgotDisabled = adminBusy || cooldown > 0;
  const forgotLabel = cooldown > 0
    ? (cooldown > 99 ? `Try again in ${Math.ceil(cooldown / 60)}m` : `Try again in ${cooldown}s`)
    : 'Forgot password?';
  // Record the request synchronously on click so the cooldown starts instantly
  // (even before the async send/staff-check), making the button un-spammable.
  const onForgot = () => {
    if (forgotDisabled) return;
    onAdminForgot(adminEmail);
    if ((adminEmail || '').trim()) { recordReset(); setCooldown(Math.ceil(resetCooldownMs() / 1000)); }
  };
  const pole = {
    display: 'block', width: '34px', height: '5px', borderRadius: '3px',
    background: 'repeating-linear-gradient(135deg,#D6C3A0 0 7px,#15130F 7px 14px)',
    backgroundSize: '40px 100%', animation: 'gbpole 1.6s linear infinite'
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'radial-gradient(120% 90% at 50% 0%,#16130F 0%,#0B0B0B 70%)' }}>
      <div style={{ width: '100%', maxWidth: '400px', animation: 'gbfade 0.5s ease both' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '26px' }}>
          <img src="/assets/logo.jpg" alt="Guapito's" style={{ height: '60px', borderRadius: '8px', marginBottom: '18px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={pole}></span>
            <span style={{ fontFamily: "'Oswald'", letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px', color: accent }}>Staff Console</span>
          </div>
          <h1 style={{ fontFamily: "'Oswald'", fontWeight: '700', textTransform: 'uppercase', fontSize: '30px', margin: '14px 0 4px', lineHeight: '1' }}>Run the floor</h1>
          <p style={{ color: '#9A9388', fontSize: '14px', margin: '0' }}>Owner &amp; barber access · Guapito's Barbershop</p>
        </div>
        <div style={{ background: '#15130F', border: '1px solid #2A2622', borderRadius: '16px', padding: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#9A9388', marginBottom: '7px' }}>Staff email</label>
          <input type="email" value={adminEmail} onChange={e => onAdminEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="you@guapitos.com" autoComplete="username" autoFocus
            style={{ width: '100%', boxSizing: 'border-box', background: '#1D1A15', border: `1px solid ${adminErr ? '#C2553B' : '#2A2622'}`, borderRadius: '10px', padding: '13px', color: '#F4EFE7', fontSize: '16px', marginBottom: '14px' }} />
          <label style={{ display: 'block', fontSize: '13px', color: '#9A9388', marginBottom: '7px' }}>Password</label>
          <input type="password" value={adminPass} onChange={e => onAdminPass(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="••••••••" autoComplete="current-password"
            style={{ width: '100%', boxSizing: 'border-box', background: '#1D1A15', border: `1px solid ${adminErr ? '#C2553B' : '#2A2622'}`, borderRadius: '10px', padding: '13px', color: '#F4EFE7', fontSize: '16px', marginBottom: '16px' }} />
          {adminErr && (
            <div style={{ background: 'rgba(196,106,90,0.12)', border: '1px solid rgba(196,106,90,0.4)', color: '#E0A095', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', marginBottom: '14px' }}>{adminErr}</div>
          )}
          <button onClick={submit} disabled={!canSubmit}
            style={{ width: '100%', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.55, background: accent, color: '#0E0E0E', border: 'none', borderRadius: '10px', padding: '14px', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '15px' }}>{signInLabel}</button>
          <button onClick={onForgot} disabled={forgotDisabled}
            style={{ display: 'block', width: '100%', marginTop: '12px', background: 'transparent', border: 'none', color: '#9A9388', fontSize: '13px', cursor: forgotDisabled ? 'not-allowed' : 'pointer', opacity: forgotDisabled ? 0.6 : 1, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{forgotLabel}</button>
          <p style={{ color: '#9A9388', fontSize: '12.5px', textAlign: 'center', margin: '12px 0 0' }}>Only registered staff accounts can sign in.</p>
        </div>
        <button onClick={goHome} style={{ display: 'block', margin: '18px auto 0', background: 'transparent', border: 'none', color: '#9A9388', fontSize: '13px', cursor: 'pointer' }}>← Back to the customer site</button>
      </div>
    </div>
  );
}
