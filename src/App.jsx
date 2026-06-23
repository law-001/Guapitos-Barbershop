import { useState, useEffect, useRef } from 'react';
import './App.css';
import { iso, todayDate, timeLabel } from './helpers';
import { fetchBookings, insertBooking, updateBooking as apiUpdateBooking } from './lib/bookingsApi';
import { sendEmailOtp, verifyEmailOtp, signOut, getSession, onAuthChange } from './lib/auth';
import { setRemember } from './lib/supabase';
import { fetchUser, upsertUser, touchLogin } from './lib/usersApi';
import { isExpired, isSessionExpired, SESSION_MAX_MS } from './lib/session';
import HomeView from './views/HomeView';
import BookingView from './views/BookingView';
import AccountView from './views/AccountView';
import ProfileView from './views/ProfileView';
import AdminLogin from './admin/AdminLogin';
import AdminShell from './admin/AdminShell';
import Dialog from './Dialog';
import Toast from './Toast';

const todayIso = iso(todayDate());

// DEBUG: floating countdown to absolute session expiry (loginAt + SESSION_MAX_MS).
// Ticks every second so we can eyeball that the clock is running. Remove later.
function SessionTimer({ loginAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!loginAt) return null;
  const expiresAt = new Date(loginAt).getTime() + SESSION_MAX_MS;
  const left = Math.max(0, expiresAt - now);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div style={{ position: 'fixed', right: '12px', bottom: '12px', zIndex: '9999', background: 'rgba(14,14,14,0.9)', border: '1px solid #2A2622', color: left === 0 ? '#ff6b6b' : '#D6C3A0', fontFamily: "'Oswald', monospace", fontSize: '13px', fontWeight: '700', padding: '6px 10px', borderRadius: '8px', letterSpacing: '0.5px', pointerEvents: 'none' }}>
      {left === 0 ? 'SESSION EXPIRED' : `Session: ${pad(h)}:${pad(m)}:${pad(s)}`}
    </div>
  );
}

// --- Login session (email verification) -------------------------------------
// Logging in = verifying an email OTP. The session itself is owned by Supabase
// (server-side): it lives in storage, auto-refreshes, and expires when the
// dashboard's session lifetime lapses, after which you must verify again.
// "Remember me" only chooses where it's stored on this device (see lib/supabase
// rememberStorage: localStorage = survives a browser restart, sessionStorage =
// cleared on close). We just mirror Supabase's signed-in state into the UI.

const initState = {
  view: 'home',
  step: 'service',
  cart: [],
  barber: 'any',
  date: null,
  time: null,
  user: { signedIn: false, firstName: '', lastName: '', mobile: '', email: '' },
  authStep: 'email',     // 'email' (enter address) | 'otp' (enter code)
  remember: true,        // "Remember me" — keep the session after the browser closes
  emailInput: '',
  otpInput: '',
  authBusy: false,       // true while a Supabase auth request is in flight
  authErr: '',           // sign-in error message to show under the field
  devCode: '',           // DEV-only fallback OTP when Supabase email is unavailable
  notes: '',
  payMethod: null,
  lastRef: null,
  lastBooking: null,
  reschedulingId: null,
  bookings: [],
  adminAuthed: false,
  adminUser: 'manager',
  adminPass: 'guapito',
  adminErr: '',
  adminNavOpen: true,
  adminPage: 'dashboard',
  drawerId: null,
  custName: null,
  calMode: 'month',
  calIso: todayIso,
  dialog: null,
  toast: null,
  toastN: 0,
  drawerEdit: false,
  openEditN: 0,
};

// Auto no-show: a 'booked' appointment that is >10 min past its start time
// without being checked in is overdue. Check-in (or any other status) exempts it.
const NOSHOW_GRACE_MS = 10 * 60 * 1000;
const apptStartMs = b => new Date(b.date + 'T00:00:00').getTime() + b.start * 60000;
const overdueBooked = (rows, now = Date.now()) =>
  rows.filter(b => b.status === 'booked' && apptStartMs(b) + NOSHOW_GRACE_MS < now);

export default function App() {
  // The Supabase session is read asynchronously on mount (see the rehydrate
  // effect below), so start signed-out and let that effect sign us back in.
  const [state, setState] = useState(initState);

  const onState = (updater) => {
    if(typeof updater === 'function'){
      setState(s => ({ ...s, ...updater(s) }));
    } else {
      setState(s => ({ ...s, ...updater }));
    }
  };

  // Latest bookings, readable from interval callbacks without stale closures.
  const bookingsRef = useRef(state.bookings);
  useEffect(() => { bookingsRef.current = state.bookings; });

  // Current signed-in flag + user, kept fresh so the interval/subscription
  // callbacks below read them without stale closures or re-subscribing.
  const signedInRef = useRef(state.user.signedIn);
  useEffect(() => { signedInRef.current = state.user.signedIn; });
  const userRef = useRef(state.user);
  useEffect(() => { userRef.current = state.user; });

  // Set true while WE are intentionally signing out (manual or expiry) so the
  // auth-change subscription doesn't treat our own signOut() as an external
  // session loss and double-fire the expiry toast.
  const signingOutRef = useRef(false);

  // Tear down the session: clear Supabase's tokens (server + local storage),
  // reset the UI to signed-out, bounce off any protected view, and show `message`.
  const expireRef = useRef(async () => {});
  useEffect(() => {
    expireRef.current = async (message) => {
      signingOutRef.current = true;
      try { await signOut(); } catch (e) { console.error('signOut failed', e); }
      onState(st => ({
        user: { signedIn: false, firstName: '', lastName: '', mobile: '', email: '' },
        view: st.view === 'account' || st.view === 'profile' ? 'home' : st.view,
        authStep: 'email', emailInput: '', otpInput: '', authErr: '', devCode: '',
        toast: { message, type: 'info' },
        toastN: st.toastN + 1,
      }));
      // Release the guard after the SIGNED_OUT event has settled.
      setTimeout(() => { signingOutRef.current = false; }, 1500);
    };
  });

  // Absolute-expiry validation: compare now against the DB login_timestamp and,
  // if past the configured max, force re-authentication. Used on startup, on
  // protected-page access, and on a periodic interval.
  const validateRef = useRef(async () => {});
  useEffect(() => {
    validateRef.current = async () => {
      const u = userRef.current;
      if (!u.signedIn || !u.email) return;
      if (await isSessionExpired(u.email)) {
        await expireRef.current('Your session has expired. Please sign in again.');
      }
    };
  });

  // Mark overdue 'booked' appointments as No Show (status + persist + one toast).
  const applyNoShows = (overdue) => {
    if (!overdue.length) return;
    const ids = new Set(overdue.map(b => b.id));
    overdue.forEach(b => apiUpdateBooking(b.id, { status: 'no-show' }).catch(err => console.error('Supabase no-show failed.', err)));
    onState(s => ({
      bookings: s.bookings.map(b => ids.has(b.id) ? { ...b, status: 'no-show' } : b),
      toast: { message: overdue.length === 1 ? '1 appointment auto-marked No Show' : overdue.length + ' appointments auto-marked No Show', type: 'danger' },
      toastN: s.toastN + 1,
    }));
  };
  // Always-current sweep, so the mount-only effects below stay dependency-free.
  const sweepRef = useRef(applyNoShows);
  useEffect(() => { sweepRef.current = applyNoShows; });

  // Load live bookings from Supabase on mount, then run the no-show check.
  // The DB is the source of truth, so an empty result shows an empty schedule.
  useEffect(() => {
    fetchBookings()
      .then(rows => { setState(s => ({ ...s, bookings: rows })); sweepRef.current(overdueBooked(rows)); })
      .catch(err => console.error('Supabase fetchBookings failed.', err));
  }, []);

  // Re-run the no-show check periodically while the app is open.
  useEffect(() => {
    const t = setInterval(() => sweepRef.current(overdueBooked(bookingsRef.current)), 60000);
    return () => clearInterval(t);
  }, []);

  // Mirror the Supabase (server-side) session into the UI. On mount we rehydrate
  // from a still-valid session — pulling the saved profile so a refresh keeps the
  // user signed in with their details prefilled — but FIRST enforce the absolute
  // 24h cutoff against the stored login_timestamp, so returning after the window
  // (even from a closed browser) forces re-authentication instead of restoring.
  // We then subscribe to auth changes: if the session vanishes externally (server
  // expiry, refresh-token death, sign-out in another tab) we sign out locally too.
  useEffect(() => {
    let active = true;
    getSession().then(async (session) => {
      if (!active || !session?.user?.email) return;
      const addr = session.user.email;
      let saved = null;
      try { saved = await fetchUser(addr); } catch { /* offline / no row — just don't prefill */ }
      if (saved && isExpired(saved.loginAt)) {
        await expireRef.current('Your session has expired. Please sign in again.');
        return;
      }
      onState({ user: {
        signedIn: true, email: addr,
        firstName: saved?.firstName || '', lastName: saved?.lastName || '', mobile: saved?.mobile || '',
        loginAt: saved?.loginAt || null,
      } });
    }).catch(err => console.error('getSession failed', err));

    const unsub = onAuthChange((session) => {
      if (!session && signedInRef.current && !signingOutRef.current) {
        expireRef.current('Your session expired — please sign in again.');
      }
    });
    return () => { active = false; unsub(); };
  }, []);

  // Re-validate the absolute cutoff periodically while the app stays open, so a
  // tab left running past the window gets signed out without needing a refresh.
  useEffect(() => {
    const t = setInterval(() => { validateRef.current(); }, 60000);
    return () => clearInterval(t);
  }, []);

  // Protected-page access: re-check the cutoff whenever the user lands on a view
  // that requires being signed in (their appointments / profile).
  useEffect(() => {
    if (state.view === 'account' || state.view === 'profile') validateRef.current();
  }, [state.view]);

  // Toast notification (see Toast.jsx). `toastN` bumps so the same message re-shows.
  // opts: { linkText, action } — renders a clickable link in the toast.
  const showToast = (message, type = 'info', opts = {}) =>
    onState(st => ({ toast: { message, type, linkText: opts.linkText, action: opts.action }, toastN: st.toastN + 1 }));
  const closeToast = () => onState({ toast: null });

  // Reopen the reschedule editor for a booking (from the toast link).
  // In admin it re-opens the booking drawer in edit mode; for a customer it
  // jumps back into the booking flow's date/time step.
  const reopenReschedule = (id) => setState(s => {
    if (s.view === 'admin') return { ...s, drawerId: id, drawerEdit: true, openEditN: s.openEditN + 1 };
    const b = s.bookings.find(x => x.id === id);
    return { ...s, view: 'book', step: 'datetime', reschedulingId: id, barber: b ? b.barber : 'any', date: null, time: null, cart: [] };
  });

  // Create: optimistic local update + persist. Persist is fire-and-forget;
  // on failure the UI stays usable and the error is logged.
  const onCreateBooking = (bk) => {
    // Stamp the local copy so it sorts to the top of Recent activity right away;
    // the DB sets its own created_at (used after the next refetch).
    const local = { ...bk, createdAt: bk.createdAt || new Date().toISOString() };
    onState(st => ({ bookings: [...st.bookings, local] }));
    insertBooking(bk).catch(err => console.error('Supabase insertBooking failed.', err));
    showToast('Booking created', 'success');
  };

  // Update by id with a camelCase patch (status / followUp / date / start / barber).
  const onUpdateBooking = (id, patch) => {
    onState(st => ({ bookings: st.bookings.map(b => b.id === id ? { ...b, ...patch } : b) }));
    apiUpdateBooking(id, patch).catch(err => console.error('Supabase updateBooking failed.', err));
    // Plain-language notification for whatever just changed.
    if (patch.date !== undefined || patch.start !== undefined) {
      const label = patch.start !== undefined ? timeLabel(patch.start) : 'view';
      showToast('Rescheduled to', 'info', { linkText: label, action: () => reopenReschedule(id) });
    }
    else if (patch.status === 'completed') showToast('Marked as completed', 'success');
    else if (patch.status === 'checked-in') showToast('Checked in', 'success');
    else if (patch.status === 'in-progress') showToast('Service in progress', 'info');
    else if (patch.status === 'booked') showToast('Marked as booked', 'info');
    else if (patch.status === 'cancelled') showToast('Booking cancelled', 'danger');
    else if (patch.status === 'no-show') showToast('Marked as No Show', 'danger');
    else if (patch.followUp !== undefined) showToast(patch.followUp ? 'Flagged for follow-up' : 'Follow-up removed', 'info');
  };

  // Staff confirms the customer physically arrived: status + check-in timestamp.
  const onCheckIn = (id) => onUpdateBooking(id, { status: 'checked-in', checkedInAt: new Date().toISOString() });

  // In-app dialogs (replace native confirm/alert). See Dialog.jsx.
  const showConfirm = (message, onConfirm, opts = {}) =>
    onState({ dialog: { message, onConfirm, title: opts.title || 'Please confirm', confirmText: opts.confirmText || 'Confirm', cancelText: opts.cancelText || 'Cancel', danger: opts.danger } });
  const showAlert = (message, opts = {}) =>
    onState({ dialog: { message, title: opts.title || 'Heads up', confirmText: opts.okText || 'OK' } });
  const closeDialog = () => onState({ dialog: null });

  const goHome = () => { onState({ view: 'home' }); window.scrollTo({ top: 0 }); };
  const goBook = () => { onState({ view: 'book', step: 'service', cart: [], barber: 'any', date: null, time: null, payMethod: null, notes: '', reschedulingId: null, authStep: 'email', emailInput: '', otpInput: '', authBusy: false, authErr: '' }); window.scrollTo({ top: 0 }); };
  const goAccount = () => { onState(s => s.user.signedIn ? { view: 'account' } : { view: 'account', authStep: 'email', emailInput: '', otpInput: '', authBusy: false, authErr: '', devCode: '' }); window.scrollTo({ top: 0 }); };
  const goProfile = () => { onState({ view: 'profile' }); window.scrollTo({ top: 0 }); };
  const goAdmin = () => { onState({ view: 'admin' }); window.scrollTo({ top: 0 }); };

  // Sign out — clear the Supabase session and reset the local user, back home.
  // Guard so the auth-change subscription doesn't read our own signOut() as an
  // external session loss and tack on an "expired" toast.
  const onSignOut = async () => {
    signingOutRef.current = true;
    try { await signOut(); } catch (e) { console.error('signOut failed', e); }
    onState({
      view: 'home',
      user: { signedIn: false, firstName: '', lastName: '', mobile: '', email: '' },
      authStep: 'email', emailInput: '', otpInput: '', authErr: '', devCode: '',
    });
    setTimeout(() => { signingOutRef.current = false; }, 1500);
    window.scrollTo({ top: 0 });
  };

  // "Remember me" toggle on the sign-in step. We persist the choice immediately
  // (so it's set before verify) and mirror it in state for the checkbox.
  const onToggleRemember = (checked) => { setRemember(checked); onState({ remember: checked }); };

  const navServices = () => {
    onState({ view: 'home' });
    requestAnimationFrame(() => {
      const el = document.getElementById('gb-services');
      if(el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
    });
  };

  const adminLogin = () => {
    const u = state.adminUser.trim().toLowerCase();
    const p = state.adminPass;
    if(u === 'manager' && p === 'guapito'){
      onState({ adminAuthed: true, adminErr: '' });
      window.scrollTo({ top: 0 });
    } else if(u && p){
      onState({ adminErr: "Those credentials don't match. Use the demo login below." });
    } else {
      onState({ adminErr: 'Enter a username and password to continue.' });
    }
  };

  // Turn whatever Supabase / the network throws into a clear, human message.
  // Guaranteed non-empty and never a bare object (which would render as `{}`).
  // Maps known cases to friendly text; falls back to a sensible default so the
  // user always sees actionable guidance instead of `{}` or silence.
  const authMsg = (e) => {
    if (typeof e === 'string' && e.trim()) return e;

    // Config never reached the build — env vars missing on the host (e.g. Vercel).
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      return 'Sign-in is not configured on this site (missing Supabase keys). Contact the shop.';
    }

    const raw = String(e?.message || e?.error_description || e?.msg || e?.error || e?.hint || e?.name || '');
    const status = e?.status ?? e?.statusCode ?? e?.code;
    const t = raw.toLowerCase();

    // Network / CORS / bad URL — request never got a real HTTP response.
    if (t.includes('failed to fetch') || t.includes('networkerror') || t.includes('load failed') ||
        e?.name === 'TypeError' || e?.name === 'AuthRetryableFetchError') {
      return "Couldn't reach the email service. Check your connection and try again.";
    }
    // Too many requests — Supabase rate-limits OTP sends.
    if (status === 429 || t.includes('rate limit') || t.includes('too many') || t.includes('only request this after')) {
      return 'Too many attempts. Please wait a minute, then request a new code.';
    }
    // Wrong / expired OTP on the verify step.
    if (t.includes('expired') || t.includes('invalid') && (t.includes('otp') || t.includes('token') || t.includes('code'))) {
      return 'That code is incorrect or expired. Request a new one and try again.';
    }
    // Email couldn't be sent (SMTP / template / provider issue).
    if (t.includes('error sending') || t.includes('smtp') || t.includes('email') && status >= 500) {
      return "We couldn't send the email right now. Please try again in a moment.";
    }
    // Malformed email address rejected by the API.
    if (status === 400 || t.includes('invalid email') || t.includes('email address')) {
      return 'That email address looks invalid. Please double-check it.';
    }
    // Server-side fault.
    if (typeof status === 'number' && status >= 500) {
      return 'The email service is temporarily unavailable. Please try again shortly.';
    }
    // Known message text we didn't special-case — surface it as-is.
    if (raw.trim()) return raw;
    // Last resort — never let an empty object reach the UI as `{}`.
    return 'Something went wrong sending your code. Please try again.';
  };

  // When Supabase email is unavailable, let DEV keep moving with a local code.
  const devFallback = (addr) => {
    const code = String(Math.floor(10000000 + Math.random() * 90000000)); // 8 digits
    console.warn('[DEV] Supabase email unavailable — using local code:', code);
    onState({ authBusy: false, authStep: 'otp', emailInput: addr, devCode: code, authErr: '' });
  };

  // Booking sign-in: email one-time-password via Supabase.
  const onSendOtp = async (email) => {
    const addr = email.trim();
    if(!addr) return;
    onState({ authBusy: true, authErr: '', devCode: '' });
    try {
      const { error } = await sendEmailOtp(addr);
      if(error){
        console.error('sendEmailOtp error', error);
        if(import.meta.env.DEV){ devFallback(addr); return; }   // email down → local code in dev
        onState({ authBusy: false, authErr: authMsg(error) }); return;
      }
      onState({ authBusy: false, authStep: 'otp', emailInput: addr });
    } catch (e) {
      // Thrown (network down, bad URL/key, CORS) — without this the button
      // would hang on "Sending…" forever with no message.
      console.error('sendEmailOtp threw', e);
      if(import.meta.env.DEV){ devFallback(addr); return; }
      onState({ authBusy: false, authErr: authMsg(e) });
    }
  };

  const onVerifyOtp = async (email, token) => {
    const code = token.trim();
    if(!code) return;
    const addr = email.trim();
    onState({ authBusy: true, authErr: '' });
    // Lock in the Remember-me choice before verify writes the session, so it
    // lands in the right store (local = persistent, session = until tab closes).
    setRemember(state.remember);
    // DEV fallback path: Supabase email was down, so we verify against the
    // locally-generated code instead of calling Supabase.
    if(state.devCode){
      if(code !== state.devCode){ onState({ authBusy: false, authErr: 'Incorrect code. Use the dev code shown above.' }); return; }
      await finishSignIn(addr);
      return;
    }
    let error;
    try {
      ({ error } = await verifyEmailOtp(addr, code));
    } catch (e) {
      console.error('verifyEmailOtp threw', e);
      onState({ authBusy: false, authErr: authMsg(e) }); return;
    }
    if(error){ console.error('verifyEmailOtp error', error); onState({ authBusy: false, authErr: authMsg(error) }); return; }
    await finishSignIn(addr);
  };

  // Shared post-verification step: load saved profile, prefill, go to details.
  const finishSignIn = async (addr) => {
    // Verification succeeded — pull any saved profile so a returning email
    // auto-fills first/last name + mobile in the details step.
    let saved = null;
    try { saved = await fetchUser(addr); } catch { /* table missing / offline — just don't prefill */ }
    // Stamp login_timestamp = now. This (re)starts the absolute 24h clock and is
    // the only write to it, so refreshes / token refreshes never reset it.
    try { await touchLogin(addr); } catch (e) { console.error('touchLogin failed', e); }
    const nextUser = {
      ...state.user,
      signedIn: true,
      email: addr,
      firstName: saved ? saved.firstName : state.user.firstName,
      lastName: saved ? saved.lastName : state.user.lastName,
      mobile: saved ? saved.mobile : state.user.mobile,
      loginAt: new Date().toISOString(),  // touchLogin just stamped now
    };
    // The Supabase session is already created by verifyOtp (or, in the dev
    // fallback, there's no server session — that path is dev-only).
    onState(st => ({
      authBusy: false,
      otpInput: '',
      devCode: '',
      user: { ...st.user, ...nextUser },
      step: 'details',
    }));
    window.scrollTo({ top: 0 });
  };

  // Persist the customer's details to the DB so the next verification of this
  // email auto-fills. Called when leaving the details step.
  const onSaveProfile = async (user) => {
    if(!user?.email) return;
    try {
      await upsertUser({ email: user.email, firstName: user.firstName, lastName: user.lastName, mobile: user.mobile });
    } catch (e) {
      console.error('Failed to save user', e);
    }
  };

  const isAdmin = state.view === 'admin';
  const showHeader = !isAdmin;

  return (
    <div style={{ '--bg': '#0E0E0E', '--surf': '#15130F', '--surf2': '#1D1A15', '--tan': '#D6C3A0', '--tan2': '#BFA877', '--cream': '#F4EFE7', '--muted': '#9A9388', '--hair': '#2A2622', background: '#0E0E0E', color: '#F4EFE7', minHeight: '100vh' }}>
      {/* TOP BAR */}
      {showHeader && (
        <header style={{ position: 'sticky', top: '0', zIndex: '60', display: 'flex', alignItems: 'center', gap: '16px', height: '64px', padding: '0 clamp(16px,4vw,40px)', background: 'rgba(14,14,14,0.82)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2622' }}>
          <img src="/assets/logo.jpg" alt="Guapito's Barbershop" onClick={goHome} style={{ height: '40px', width: 'auto', cursor: 'pointer', borderRadius: '4px' }} />
          <div style={{ flex: '1' }}></div>
          <button onClick={goAccount} style={{ background: 'transparent', border: 'none', color: '#F4EFE7', fontFamily: "'Hanken Grotesk'", fontWeight: '600', fontSize: '14px', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#D6C3A0' }}></span>My Appointments
          </button>
          {/* Profile tab — shows the signed-in email; a Sign in chip otherwise. */}
          {state.user.signedIn ? (
            <button onClick={goProfile} title={`Signed in as ${state.user.email}`}
              style={{ background: 'rgba(214,195,160,0.1)', border: '1px solid #2A2622', color: '#F4EFE7', fontFamily: "'Hanken Grotesk'", fontWeight: '600', fontSize: '14px', cursor: 'pointer', padding: '7px 12px 7px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '9px', maxWidth: '220px' }}>
              <span style={{ flexShrink: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: '#D6C3A0', color: '#0E0E0E', fontFamily: "'Oswald'", fontWeight: '700', fontSize: '14px' }}>{(state.user.firstName || state.user.email).trim().charAt(0).toUpperCase()}</span>
              <span style={{ minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.user.firstName || state.user.email}</span>
            </button>
          ) : (
            <button onClick={goProfile} style={{ background: 'transparent', border: 'none', color: '#9A9388', fontFamily: "'Hanken Grotesk'", fontWeight: '600', fontSize: '14px', cursor: 'pointer', padding: '8px 10px' }}>Profile</button>
          )}
          <button onClick={goBook} style={{ background: '#D6C3A0', color: '#0E0E0E', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '14px', border: 'none', borderRadius: '7px', padding: '11px 20px', cursor: 'pointer' }}>Book Now</button>
        </header>
      )}

      {/* VIEWS */}
      {state.view === 'home' && (
        <HomeView goBook={goBook} goAccount={goAccount} goAdmin={goAdmin} navServices={navServices} />
      )}

      {state.view === 'book' && (
        <BookingView state={state} goHome={goHome} goAccount={goAccount} goBook={goBook} onState={onState} onCreateBooking={onCreateBooking} onUpdateBooking={onUpdateBooking} onSendOtp={onSendOtp} onVerifyOtp={onVerifyOtp} onSaveProfile={onSaveProfile} onToggleRemember={onToggleRemember} />
      )}

      {state.view === 'account' && (
        <AccountView state={state} bookings={state.bookings} user={state.user} goBook={goBook} onState={onState} onUpdateBooking={onUpdateBooking} showAlert={showAlert} onSendOtp={onSendOtp} onVerifyOtp={onVerifyOtp} onToggleRemember={onToggleRemember} />
      )}

      {state.view === 'profile' && (
        <ProfileView user={state.user} goBook={goBook} onSignOut={onSignOut} />
      )}

      {state.view === 'admin' && !state.adminAuthed && (
        <AdminLogin
          adminUser={state.adminUser}
          adminPass={state.adminPass}
          adminErr={state.adminErr}
          onAdminUser={e => onState({ adminUser: e.target.value, adminErr: '' })}
          onAdminPass={e => onState({ adminPass: e.target.value, adminErr: '' })}
          adminLogin={adminLogin}
          goHome={goHome}
        />
      )}

      {state.view === 'admin' && state.adminAuthed && (
        <AdminShell state={state} onState={onState} goHome={goHome} onCreateBooking={onCreateBooking} onUpdateBooking={onUpdateBooking} onCheckIn={onCheckIn} showConfirm={showConfirm} />
      )}

      <Dialog dialog={state.dialog} onClose={closeDialog} />
      <Toast toast={state.toast} nonce={state.toastN} onClose={closeToast} />
      {state.user.signedIn && <SessionTimer loginAt={state.user.loginAt} />}
    </div>
  );
}
