// Signed-in profile chip in the top bar. Shows a circular generic-person SVG
// avatar + the user's first name (or email), and opens a dropdown with:
//   1) My profile        → goProfile()
//   2) My appointments   → goAccount()
//   3) Sign out          → onSignOut()
// On mobile (<= 540px), the name is hidden via the `gb-profile-name` class
// (see index.css) so just the round avatar remains tappable.
import { useEffect, useRef, useState } from 'react';

const PersonIcon = ({ size = 18, color = '#0E0E0E' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="8" r="4" fill={color} />
    <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6v1H4v-1z" fill={color} />
  </svg>
);

export default function ProfileMenu({ user, goProfile, goAccount, onSignOut }) {
  const accent = '#D6C3A0';
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const label = user.firstName || user.email || 'Account';

  // Close on outside-click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = (fn) => { setOpen(false); fn(); };

  const items = [
    { key: 'profile', label: 'My profile', onClick: () => pick(goProfile) },
    { key: 'appts', label: 'My appointments', onClick: () => pick(goAccount) },
    { key: 'signout', label: 'Sign out', onClick: () => pick(onSignOut), danger: true },
  ];

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}
        title={`Signed in as ${user.email}`}
        style={{ background: 'rgba(214,195,160,0.1)', border: '1px solid #2A2622', color: '#F4EFE7', fontFamily: "'Hanken Grotesk'", fontWeight: '600', fontSize: '14px', cursor: 'pointer', padding: '6px 12px 6px 6px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '9px', maxWidth: '220px' }}>
        <span style={{ flexShrink: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: accent, color: '#0E0E0E' }}>
          <PersonIcon size={18} />
        </span>
        <span className="gb-profile-name" style={{ minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </button>

      {open && (
        <div role="menu"
          style={{ position: 'absolute', top: 'calc(100% + 8px)', right: '0', minWidth: '220px', background: '#15130F', border: '1px solid #2A2622', borderRadius: '12px', padding: '8px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', zIndex: '70', animation: 'gbfade 0.16s ease both' }}>
          <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid #2A2622', marginBottom: '6px' }}>
            <div style={{ fontFamily: "'Oswald'", fontSize: '14px', lineHeight: '1.2', color: '#F4EFE7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
            <div style={{ fontSize: '12px', color: '#9A9388', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
          {items.map(it => (
            <button key={it.key} role="menuitem" onClick={it.onClick}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', color: it.danger ? '#E08A6E' : '#F4EFE7', fontFamily: "'Hanken Grotesk'", fontWeight: '600', fontSize: '14px', padding: '10px 12px', borderRadius: '8px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,195,160,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
