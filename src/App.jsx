import { useState, useEffect, useRef } from 'react';
import './App.css';
import { iso, todayDate, timeLabel, genId, dateFull, durLabel, peso, barberById } from './helpers';
import { fetchBookings, fetchOccupancy, insertBooking, updateBooking as apiUpdateBooking, markOverdueNoShows } from './lib/bookingsApi';
import { fetchReviews, fetchAllReviews, insertReview, approveReview, deleteReview } from './lib/reviewsApi';
import { canPostReview, recordReviewPost } from './lib/reviewRateLimit';
import { canRequestReset } from './lib/resetRateLimit';
import { fetchStaffByEmail } from './lib/staffApi';
import { sendEmailOtp, verifyEmailOtp, staffLogin, setSession, sendPasswordReset, updatePassword, onPasswordRecovery, signOut, getSession, onAuthChange } from './lib/auth';
import { setRemember } from './lib/supabase';
import { fetchUser, upsertUser, touchLogin, fetchAllUsers } from './lib/usersApi';
import { isExpired, isSessionExpired, sessionMaxMs } from './lib/session';
import HomeView from './views/HomeView';
import BookingView from './views/BookingView';
import AccountView from './views/AccountView';
import ProfileView from './views/ProfileView';
import ReviewsView from './views/ReviewsView';
import AdminLogin from './admin/AdminLogin';
import AdminShell from './admin/AdminShell';
import Dialog from './Dialog';
import Toast from './Toast';
import AuthModal from './AuthModal';
import ProfileMenu from './ProfileMenu';
import ReviewModal from './ReviewModal';
import ResetPasswordModal from './ResetPasswordModal';

const todayIso = iso(todayDate());

// True when this page load came from a password-reset link. Supabase returns the
// recovery token either in the hash (#...type=recovery) or, with PKCE, as a
// ?code= query param. This app has no other redirect/OAuth flow, so a code param
// on load is always a recovery. Used to suppress the customer session-expiry
// logic, which would otherwise sign out the temporary recovery session before
// the user can save a new password.
const urlLooksLikeRecovery = () => {
  try {
    return (window.location.hash || '').includes('type=recovery') || /[?&]code=/.test(window.location.search || '');
  } catch { return false; }
};

// Booking-confirmation email deep-links land here as ?b=<id>&do=reschedule|cancel.
// Parse them once on load; returns { id, do } or null. The handler effect below
// acts on it (after bookings load) and then strips the params from the URL.
const readEmailAction = () => {
  try {
    const q = new URLSearchParams(window.location.search || '');
    const id = q.get('b'); const action = q.get('do'); const email = q.get('e') || '';
    if (id && (action === 'reschedule' || action === 'cancel')) return { id, do: action, email };
  } catch { /* ignore */ }
  return null;
};

// Human-friendly wait time for a lockout countdown ("45s" / "5m").
const fmtWait = (secs) => (secs >= 60 ? `${Math.ceil(secs / 60)}m` : `${Math.max(0, Math.ceil(secs))}s`);

// DEBUG: floating countdown to absolute session expiry (loginAt + active window).
// Ticks every second so we can eyeball that the clock is running. Remove later.
function SessionTimer({ loginAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!loginAt) return null;
  const expiresAt = new Date(loginAt).getTime() + sessionMaxMs();
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
// "Keep me signed in on this device" chooses BOTH where it's stored (localStorage
// = survives a browser restart, sessionStorage = cleared on close) AND the
// absolute expiry window (checked = ~1 month, unchecked = ~24h; see lib/session).
// Default is unchecked. We just mirror Supabase's signed-in state into the UI.

const initState = {
  view: 'home',
  step: 'service',
  cart: [],
  barber: 'any',
  date: null,
  time: null,
  user: { signedIn: false, firstName: '', lastName: '', mobile: '', email: '' },
  custPhones: {},        // admin: lowercased email -> saved mobile (from users.mobile)
  authStep: 'email',     // 'email' (enter address) | 'otp' (enter code)
  remember: false,       // "Keep me signed in" — checked = ~1mo & persist; unchecked (default) = ~24h
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
  occupancy: [],          // no-PII slot availability (public view); drives the picker
  reviews: [],            // public list — approved reviews only
  adminReviews: [],       // admin moderation list — all reviews incl. pending
  reviewModalOpen: false,
  adminAuthed: false,
  adminStaff: null,        // the signed-in staff record (id, name, role, …)
  adminEmail: '',
  adminPass: '',
  adminBusy: false,        // true while a staff auth request is in flight
  adminErr: '',
  adminLockUntil: 0,       // epoch ms the staff login is locked until (from the server throttle)
  recoveryOpen: false,     // true after a password-reset link is opened
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
  // Top-bar sign-in modal. Opens when a logged-out visitor clicks Book Now (or
  // any other entry point that needs auth). `postAuthAction` is a tag the
  // app reads after successful verification to decide where to send the user:
  //  - 'book'    → continue into the booking flow (goBook)
  //  - 'profile' → open the profile view
  //  - null      → just close
  authModalOpen: false,
  postAuthAction: null,
  // Flips true once the mount-time Supabase session restore has settled. The
  // email-link handler waits for this so it doesn't treat a still-restoring
  // session as "signed out" and pop the sign-in modal by mistake.
  sessionChecked: false,
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

  // Pending reschedule/cancel from a confirmation-email link, applied once the
  // bookings have loaded (so the target booking exists). Cleared after one use.
  const emailActionRef = useRef(readEmailAction());
  // Guards the one-time sign-in prompt for an email action, so re-renders (e.g.
  // bookings finishing loading) don't reset the modal while the user is typing.
  const emailAuthPromptedRef = useRef(false);

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

  // True for the lifetime of a password-recovery page load. While set, the
  // customer session-restore/expiry effects below stand down so they don't tear
  // down the recovery session out from under updateUser().
  const recoveringRef = useRef(urlLooksLikeRecovery());

  // Guards against concurrent "Forgot password?" sends: set synchronously the
  // instant a request starts, so rapid double-clicks during the async send are
  // ignored (the rate-limit timestamps only get written after a send completes).
  const resetInFlightRef = useRef(false);
  // Same idea for the staff Sign in button — block concurrent submits.
  const loginInFlightRef = useRef(false);

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
      if (recoveringRef.current) return;
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
    // Persist via the server function (safe under tightened RLS); a pg_cron job
    // runs the same sweep, so this is just for an instant in-tab update.
    markOverdueNoShows().catch(err => console.error('Supabase no-show sweep failed.', err));
    onState(s => ({
      bookings: s.bookings.map(b => ids.has(b.id) ? { ...b, status: 'no-show' } : b),
      toast: { message: overdue.length === 1 ? '1 appointment auto-marked No Show' : overdue.length + ' appointments auto-marked No Show', type: 'danger' },
      toastN: s.toastN + 1,
    }));
  };
  // Always-current sweep, so the mount-only effects below stay dependency-free.
  const sweepRef = useRef(applyNoShows);
  useEffect(() => { sweepRef.current = applyNoShows; });

  // Pull the booking rows the current session is allowed to see (own for a
  // customer, all for staff — RLS decides) and run the no-show check. Called on
  // mount AND whenever the auth session changes, because the scoped result
  // depends on who's signed in (see the auth-change subscription below).
  const refreshBookings = () => fetchBookings()
    .then(rows => { setState(s => ({ ...s, bookings: rows })); sweepRef.current(overdueBooked(rows)); })
    .catch(err => console.error('Supabase fetchBookings failed.', err));

  // Load on mount: scoped bookings + the public (no-PII) occupancy feed that
  // drives the slot picker for everyone, signed in or not.
  useEffect(() => {
    refreshBookings();
    fetchOccupancy()
      .then(rows => setState(s => ({ ...s, occupancy: rows })))
      .catch(err => console.error('Supabase fetchOccupancy failed.', err));
  }, []);

  // Load customer reviews once on mount (Reviews page reads from state.reviews).
  useEffect(() => {
    fetchReviews()
      .then(rows => setState(s => ({ ...s, reviews: rows })))
      .catch(err => console.error('Supabase fetchReviews failed.', err));
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
    // During password recovery, leave the recovery session alone — restoring it
    // as a "customer" and running the expiry check would sign it out.
    if (recoveringRef.current) return undefined;
    let active = true;
    getSession().then(async (session) => {
      if (!active) return;
      if (!session?.user?.email) { onState({ sessionChecked: true }); return; }
      const addr = session.user.email;
      let saved = null;
      try { saved = await fetchUser(addr); } catch { /* offline / no row — just don't prefill */ }
      if (saved && isExpired(saved.loginAt)) {
        await expireRef.current('Your session has expired. Please sign in again.');
        if (active) onState({ sessionChecked: true });
        return;
      }
      onState({ user: {
        signedIn: true, email: addr,
        firstName: saved?.firstName || '', lastName: saved?.lastName || '', mobile: saved?.mobile || '',
        loginAt: saved?.loginAt || null,
      }, sessionChecked: true });
    }).catch(err => { console.error('getSession failed', err); if (active) onState({ sessionChecked: true }); });

    const unsub = onAuthChange((session) => {
      // Re-pull bookings whenever the session changes: now that reads are scoped
      // by RLS, a customer's own rows only come back once their session is
      // attached (and clear back to none on sign-out).
      refreshBookings();
      if (!session && signedInRef.current && !signingOutRef.current) {
        expireRef.current('Your session expired — please sign in again.');
      }
    });
    return () => { active = false; unsub(); };
  }, []);

  // Password recovery: when the user opens a reset link, Supabase processes the
  // token in the URL and fires PASSWORD_RECOVERY. Show the "set new password"
  // modal so they can choose one (saved against the temporary recovery session).
  useEffect(() => {
    const unsub = onPasswordRecovery(async () => {
      recoveringRef.current = true;
      // Only offer the set-new-password form if the recovery session belongs to
      // an active staff member. Otherwise sign out and ignore (no reset UI).
      let addr = '';
      try { const s = await getSession(); addr = s?.user?.email || ''; } catch { /* no session */ }
      const staff = addr ? await fetchStaffByEmail(addr) : null;
      if (!staff) {
        recoveringRef.current = false;
        signingOutRef.current = true;
        try { await signOut(); } catch (e) { console.error(e); }
        setTimeout(() => { signingOutRef.current = false; }, 1500);
        return;
      }
      onState({ recoveryOpen: true });
    });
    return () => unsub();
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

  // Load the full review list (incl. pending) for the admin moderation page once
  // staff log in.
  useEffect(() => {
    if (state.view === 'admin' && state.adminAuthed) {
      fetchAllReviews()
        .then(rows => setState(s => ({ ...s, adminReviews: rows })))
        .catch(err => console.error('Supabase fetchAllReviews failed.', err));
    }
  }, [state.view, state.adminAuthed]);

  // Load saved customer mobiles (users.mobile) for the admin once staff log in,
  // keyed by lowercased email. Staff-only read (RLS 0020). The Customers page and
  // drawers look phones up here by the booking's email.
  useEffect(() => {
    if (state.view === 'admin' && state.adminAuthed) {
      fetchAllUsers()
        .then(rows => {
          const map = {};
          for (const u of rows) { if (u.email && u.mobile) map[u.email.toLowerCase()] = u.mobile; }
          setState(s => ({ ...s, custPhones: map }));
        })
        .catch(err => console.error('Supabase fetchAllUsers failed.', err));
    }
  }, [state.view, state.adminAuthed]);

  // Seamless re-entry: if a still-valid Supabase session belongs to an active
  // staff member, auto-unlock the console when they open the admin view (so a
  // page refresh doesn't force them to OTP again).
  useEffect(() => {
    if (state.view !== 'admin' || state.adminAuthed) return undefined;
    let active = true;
    getSession().then(async (session) => {
      const addr = session?.user?.email;
      if (!active || !addr) return;
      const staff = await fetchStaffByEmail(addr);
      if (active && staff) onState({ adminAuthed: true, adminStaff: staff });
    }).catch(err => console.error('admin auto-auth failed', err));
    return () => { active = false; };
  }, [state.view, state.adminAuthed]);

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
    const occ = { id: bk.id, date: bk.date, barber: bk.barber, start: bk.start, dur: bk.dur, status: bk.status };
    onState(st => ({ bookings: [...st.bookings, local], occupancy: [...st.occupancy, occ] }));
    insertBooking(bk).catch(err => console.error('Supabase insertBooking failed.', err));
    showToast('Booking created', 'success');
  };

  // Update by id with a camelCase patch (status / followUp / date / start / barber).
  const onUpdateBooking = (id, patch) => {
    // Mirror status/date/start/barber changes into occupancy so the picker stays
    // accurate in-session (e.g. cancelling frees the slot immediately).
    onState(st => ({
      bookings: st.bookings.map(b => b.id === id ? { ...b, ...patch } : b),
      occupancy: st.occupancy.map(o => o.id === id ? { ...o, ...patch } : o),
    }));
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

  // Full booking summary shown inside the cancel confirmation modal so the
  // customer can see exactly what they're about to cancel. (Dialog renders the
  // `message` as a node, so JSX is fine here.)
  const cancelDetails = (bk) => {
    const rows = [
      ['Service', bk.service],
      ['Date', dateFull(bk.date)],
      ['Time', timeLabel(bk.start)],
      ['Duration', durLabel(bk.dur)],
      ['Barber', barberById(bk.barber)?.name || 'First available'],
      ['Payment', bk.pay === 'online' ? 'Paid online' : 'Pay at shop'],
      ['Total', peso(bk.price)],
    ];
    if (bk.customer) rows.unshift(['Name', bk.customer]);
    if (bk.notes) rows.push(['Notes', bk.notes]);
    return (
      <div>
        <div style={{ marginBottom: '14px' }}>Cancel this booking? This can&apos;t be undone.</div>
        <div style={{ background: '#0E0E0E', border: '1px solid #2A2622', borderRadius: '10px', padding: '2px 14px' }}>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '8px 0', borderTop: i ? '1px solid #211E1A' : 'none' }}>
              <span style={{ color: '#9A9388', fontSize: '13px', whiteSpace: 'nowrap' }}>{k}</span>
              <span style={{ color: '#F4EFE7', fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Shared cancel-confirm: shows the full booking summary (cancelDetails) and
  // only cancels on confirm. Used by BOTH the email-link flow and the My
  // Appointments cancel button so the popup looks identical in both places.
  const confirmCancelBooking = (bk) =>
    showConfirm(cancelDetails(bk),
      () => { onUpdateBooking(bk.id, { status: 'cancelled' }); closeDialog(); },
      { title: 'Cancel booking', confirmText: 'Cancel booking', cancelText: 'Keep it', danger: true });

  // Act on a confirmation-email link (?b=<id>&do=reschedule|cancel&e=<email>).
  // Order of events: wait for the session restore to settle; if the visitor is
  // not signed in, pop the sign-in modal PREFILLED with the booking's email so
  // they re-auth as the right account — this effect re-runs after sign-in and
  // resumes. Once signed in AND the bookings have loaded, verify the booking is
  // theirs, then reschedule or cancel. Runs once, then strips the URL params.
  useEffect(() => {
    const act = emailActionRef.current;
    if (!act || !state.sessionChecked) return;

    // Not signed in yet → prompt sign-in once, prefilled with the linked email.
    if (!state.user.signedIn) {
      if (!emailAuthPromptedRef.current) {
        emailAuthPromptedRef.current = true;
        onState({ authModalOpen: true, postAuthAction: 'emailAction', authStep: 'email',
          emailInput: act.email || '', otpInput: '', authBusy: false, authErr: '', devCode: '' });
      }
      return;
    }

    if (state.bookings.length === 0) return; // signed in — wait for bookings to load

    emailActionRef.current = null; // one-shot
    try { window.history.replaceState({}, '', window.location.pathname); } catch { /* ignore */ }

    const bk = state.bookings.find(b => b.id === act.id);
    if (!bk) { showAlert("We couldn't find that booking. It may have been removed."); return; }
    // Ownership: only let the signed-in account act on its own booking.
    const owned = !bk.email || !state.user.email || bk.email.toLowerCase() === state.user.email.toLowerCase();
    if (!owned) { showAlert('That booking is under a different account. Sign in with the email it was booked under.'); return; }
    if (bk.status === 'cancelled' || bk.status === 'completed') {
      showAlert(`This booking is already ${bk.status}.`); return;
    }
    if (act.do === 'reschedule') { reopenReschedule(act.id); return; }
    confirmCancelBooking(bk);
  }, [state.bookings, state.user.signedIn, state.sessionChecked]);

  const goHome = () => { onState({ view: 'home' }); window.scrollTo({ top: 0 }); };
  const goBook = () => { onState({ view: 'book', step: 'service', cart: [], barber: 'any', date: null, time: null, payMethod: null, notes: '', reschedulingId: null, authStep: 'email', emailInput: '', otpInput: '', authBusy: false, authErr: '' }); window.scrollTo({ top: 0 }); };
  const goAccount = () => { onState(s => s.user.signedIn ? { view: 'account' } : { view: 'account', authStep: 'email', emailInput: '', otpInput: '', authBusy: false, authErr: '', devCode: '' }); window.scrollTo({ top: 0 }); };
  const goProfile = () => { onState({ view: 'profile' }); window.scrollTo({ top: 0 }); };
  const goReviews = () => { onState({ view: 'reviews' }); window.scrollTo({ top: 0 }); };

  // Write-a-review modal: open/close + persist. A submitted review is added to
  // the top of state.reviews optimistically, then written to Supabase.
  const openReviewModal = () => onState({ reviewModalOpen: true });
  const closeReviewModal = () => onState({ reviewModalOpen: false });
  // Submit a review: rate-limit per device, then persist as PENDING (approved
  // false) so it stays off the public site until staff approve it. Returns
  // { ok } so the modal can show an inline error and stay open when blocked.
  const onSubmitReview = async ({ author, rating, body }) => {
    const gate = canPostReview();
    if (!gate.ok) return { ok: false, error: gate.error };
    const review = { id: genId('r'), author, rating, body, reviewDate: null, relativeTime: 'just now', source: 'website', approved: false };
    try {
      await insertReview(review);
    } catch (err) {
      console.error('Supabase insertReview failed.', err);
      return { ok: false, error: "Couldn't post your review. Please try again." };
    }
    recordReviewPost();
    showToast('Thanks! Your review will appear once approved.', 'success');
    return { ok: true };
  };

  // Staff approve a pending review: publish it (optimistic) + persist. The
  // approved row also joins the public list, newest-first.
  const onApproveReview = (id) => {
    onState(s => {
      const r = s.adminReviews.find(x => x.id === id);
      const adminReviews = s.adminReviews.map(x => x.id === id ? { ...x, approved: true } : x);
      const reviews = r
        ? [{ ...r, approved: true }, ...s.reviews.filter(x => x.id !== id)].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        : s.reviews;
      return { adminReviews, reviews };
    });
    approveReview(id).catch(err => console.error('Supabase approveReview failed.', err));
    showToast('Review published', 'success');
  };

  // Staff reject/remove a review (confirm first; deletes the row everywhere).
  const onRejectReview = (r) => {
    showConfirm(`Remove ${r.author}'s review? This can't be undone.`, () => {
      onState(s => ({ adminReviews: s.adminReviews.filter(x => x.id !== r.id), reviews: s.reviews.filter(x => x.id !== r.id) }));
      deleteReview(r.id).catch(err => console.error('Supabase deleteReview failed.', err));
      showToast('Review removed', 'danger');
    }, { title: 'Remove review', confirmText: 'Remove', danger: true });
  };
  const goAdmin = () => { onState({ view: 'admin' }); window.scrollTo({ top: 0 }); };

  // Gate the top-bar Book Now behind sign-in. If already signed in, jump
  // straight into the booking flow; otherwise open the AuthModal and queue
  // 'book' as the post-verification action.
  const openAuthModal = (postAction = null) =>
    onState({ authModalOpen: true, postAuthAction: postAction, authStep: 'email', emailInput: '', otpInput: '', authBusy: false, authErr: '', devCode: '' });
  const closeAuthModal = () =>
    onState({ authModalOpen: false, postAuthAction: null, authErr: '', authBusy: false });
  const requireBook = () => { if (state.user.signedIn) goBook(); else openAuthModal('book'); };

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

  // --- Staff console auth (real Supabase email + password, gated by the staff
  // table) --- Accounts are created by the owner in the Supabase dashboard; this
  // signs them in, then confirms the email is an active staff row before
  // unlocking. A valid login for a non-staff email is rejected (and signed out).
  // Staff sign-in via the `staff-login` Edge Function, which enforces the
  // progressive brute-force throttle server-side and returns a session only on
  // success. The browser just relays the result and (on success) installs the
  // session, then confirms staff membership.
  const onAdminLogin = async (email, password) => {
    const addr = (email || '').trim();
    if (!addr || !password) { onState({ adminErr: 'Enter your email and password.' }); return; }
    if (loginInFlightRef.current) return;
    loginInFlightRef.current = true;
    onState({ adminBusy: true, adminErr: '' });
    setRemember(true);
    try {
      const data = await staffLogin(addr, password);
      if (!data || data.result === 'error') {
        onState({ adminBusy: false, adminErr: 'Could not reach the login service. Please try again.' }); return;
      }
      if (data.result === 'locked') {
        onState({ adminBusy: false, adminLockUntil: Date.now() + (data.retry_after || 0) * 1000,
          adminErr: `Too many attempts. Try again in ${fmtWait(data.retry_after || 0)}.` });
        return;
      }
      if (data.result === 'invalid') {
        const left = data.attempts_left ?? 0;
        onState({ adminBusy: false,
          adminErr: left > 0 ? `Email or password is incorrect. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Email or password is incorrect.' });
        return;
      }
      if (data.result !== 'ok' || !data.access_token) {
        onState({ adminBusy: false, adminErr: 'Login failed. Please try again.' }); return;
      }
      // Install the session the function handed back.
      const { error: sErr } = await setSession(data.access_token, data.refresh_token);
      if (sErr) { console.error('setSession failed', sErr); onState({ adminBusy: false, adminErr: 'Could not start your session. Please try again.' }); return; }
      // Authorization: must be an active staff member.
      const staff = await fetchStaffByEmail(addr);
      if (!staff) {
        signingOutRef.current = true; try { await signOut(); } catch (e) { console.error(e); } setTimeout(() => { signingOutRef.current = false; }, 1500);
        onState({ adminBusy: false, adminErr: "That account isn't registered as staff. Contact the owner." });
        return;
      }
      recoveringRef.current = false;
      onState({ adminAuthed: true, adminStaff: staff, adminBusy: false, adminErr: '', adminPass: '', adminLockUntil: 0 });
      window.scrollTo({ top: 0 });
    } finally {
      loginInFlightRef.current = false;
    }
  };

  // "Forgot password?" — email a reset link to the address in the email field.
  // The link returns to this app (redirectTo) and triggers the recovery flow.
  const onAdminForgot = async (email) => {
    const addr = (email || '').trim();
    if (!addr) { onState({ adminErr: 'Type your email above first, then tap “Forgot password?”.' }); return; }
    // Ignore clicks while a send is already in flight (synchronous guard — beats
    // the async state update that disables the button).
    if (resetInFlightRef.current) return;
    // Rate-limit reset requests so the button can't be spammed.
    const gate = canRequestReset();
    if (!gate.ok) { onState({ adminErr: gate.error }); return; }
    resetInFlightRef.current = true;
    onState({ adminBusy: true, adminErr: '' });
    try {
      // Only staff may reset a staff password — don't email a link to anyone else.
      const staff = await fetchStaffByEmail(addr);
      if (!staff) { onState({ adminBusy: false, adminErr: "That email isn't registered as staff. Contact the owner." }); return; }
      const { error } = await sendPasswordReset(addr, window.location.origin);
      if (error) { console.error('sendPasswordReset error', error); onState({ adminBusy: false, adminErr: authMsg(error) }); return; }
      onState({ adminBusy: false });
      showToast('Reset link sent — check your email.', 'success');
    } catch (e) {
      console.error('sendPasswordReset threw', e);
      onState({ adminBusy: false, adminErr: authMsg(e) });
    } finally {
      resetInFlightRef.current = false;
    }
  };

  // Turn a password-update failure into a clear message. Kept separate from
  // authMsg (which is email/OTP-oriented and would call a 400 here an "invalid
  // email"). Supabase's own password messages are clear, so we mostly surface
  // them, special-casing an expired/missing recovery session.
  const passwordErr = (e) => {
    const raw = String(e?.message || e?.error_description || e?.msg || e?.error || '');
    const t = raw.toLowerCase();
    if (t.includes('session') || t.includes('jwt') || t.includes('not authenticated') || t.includes('expired'))
      return 'Your reset link has expired. Request a new one from “Forgot password?” and try again.';
    if (t.includes('different from the old')) return 'New password must be different from your current one.';
    if (raw.trim()) return raw;   // e.g. "Password should be at least 6 characters."
    return 'Could not update your password. Please try again.';
  };

  // Save the new password chosen in the recovery modal. Returns an error string
  // on failure (the modal shows it), or null on success — after which we sign
  // out and drop the user on the staff login to sign in with the new password.
  const onSetNewPassword = async (password) => {
    try {
      const { error } = await updatePassword(password);
      if (error) { console.error('updatePassword error', error); return passwordErr(error); }
    } catch (e) { console.error('updatePassword threw', e); return passwordErr(e); }
    recoveringRef.current = false;
    signingOutRef.current = true;
    try { await signOut(); } catch (e) { console.error(e); }
    setTimeout(() => { signingOutRef.current = false; }, 1500);
    onState({ recoveryOpen: false, view: 'admin', adminAuthed: false, adminStaff: null, adminPass: '' });
    showToast('Password updated — sign in with your new password.', 'success');
    window.scrollTo({ top: 0 });
    return null;
  };

  // Staff sign-out: end the Supabase session and reset the console state.
  const onAdminSignOut = async () => {
    signingOutRef.current = true;
    try { await signOut(); } catch (e) { console.error('admin signOut failed', e); }
    onState({
      adminAuthed: false, adminStaff: null,
      adminEmail: '', adminPass: '', adminBusy: false, adminErr: '',
      view: 'home',
    });
    setTimeout(() => { signingOutRef.current = false; }, 1500);
    window.scrollTo({ top: 0 });
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

    // If the top-bar AuthModal triggered this sign-in, close it and route the
    // user wherever the entry point intended (booking flow, profile, etc.).
    if (state.authModalOpen) {
      const action = state.postAuthAction;
      onState({ authModalOpen: false, postAuthAction: null });
      if (action === 'book') goBook();
      else if (action === 'profile') goProfile();
    }
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
      {/* TOP BAR
          Logged out: logo (left) + Book Now (right). Clicking Book Now opens
          the AuthModal — booking is gated behind sign-in.
          Logged in:  logo (left) + ProfileMenu (avatar + dropdown) + Book Now. */}
      {showHeader && (
        <header style={{ position: 'sticky', top: '0', zIndex: '60', display: 'flex', alignItems: 'center', gap: '12px', height: '64px', padding: '0 clamp(12px,4vw,40px)', background: 'rgba(14,14,14,0.82)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2622' }}>
          <img src="/assets/logo.jpg" alt="Guapito's Barbershop" onClick={goHome} style={{ height: '40px', width: 'auto', cursor: 'pointer', borderRadius: '4px' }} />
          <div style={{ flex: '1' }}></div>
          {state.user.signedIn && (
            <ProfileMenu user={state.user} goAccount={goAccount} onSignOut={onSignOut} />
          )}
          <button onClick={goAccount} className="gb-appts-cta"
            style={{ background: 'transparent', color: '#F4EFE7', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '14px', border: '1px solid #2A2622', borderRadius: '7px', padding: '11px 18px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            View Appointments
          </button>
          <button onClick={requireBook} className="gb-book-cta"
            style={{ background: '#D6C3A0', color: '#0E0E0E', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '14px', border: 'none', borderRadius: '7px', padding: '11px 20px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Book Now
          </button>
        </header>
      )}

      {/* VIEWS */}
      {state.view === 'home' && (
        <HomeView goBook={goBook} goAccount={goAccount} goAdmin={goAdmin} navServices={navServices} goReviews={goReviews} reviews={state.reviews} onWriteReview={openReviewModal} />
      )}

      {state.view === 'book' && (
        <BookingView state={state} goHome={goHome} goAccount={goAccount} goBook={goBook} onState={onState} onCreateBooking={onCreateBooking} onUpdateBooking={onUpdateBooking} onSendOtp={onSendOtp} onVerifyOtp={onVerifyOtp} onSaveProfile={onSaveProfile} onToggleRemember={onToggleRemember} />
      )}

      {state.view === 'account' && (
        <AccountView state={state} bookings={state.bookings} user={state.user} goHome={goHome} goBook={goBook} onState={onState} onUpdateBooking={onUpdateBooking} showAlert={showAlert} confirmCancel={confirmCancelBooking} onSendOtp={onSendOtp} onVerifyOtp={onVerifyOtp} onToggleRemember={onToggleRemember} onSignOut={onSignOut} />
      )}

      {state.view === 'profile' && (
        <ProfileView user={state.user} goBook={goBook} onSignOut={onSignOut} />
      )}

      {state.view === 'reviews' && (
        <ReviewsView reviews={state.reviews} goHome={goHome} onWriteReview={openReviewModal} />
      )}

      {state.view === 'admin' && !state.adminAuthed && (
        <AdminLogin
          adminEmail={state.adminEmail}
          adminPass={state.adminPass}
          adminBusy={state.adminBusy}
          adminErr={state.adminErr}
          adminLockUntil={state.adminLockUntil}
          onAdminEmail={v => onState({ adminEmail: v, adminErr: '' })}
          onAdminPass={v => onState({ adminPass: v, adminErr: '' })}
          onAdminLogin={onAdminLogin}
          onAdminForgot={onAdminForgot}
          goHome={goHome}
        />
      )}

      {state.view === 'admin' && state.adminAuthed && (
        <AdminShell state={state} onState={onState} goHome={goHome} onCreateBooking={onCreateBooking} onUpdateBooking={onUpdateBooking} onCheckIn={onCheckIn} showConfirm={showConfirm} onApproveReview={onApproveReview} onRejectReview={onRejectReview} onAdminSignOut={onAdminSignOut} />
      )}

      <Dialog dialog={state.dialog} onClose={closeDialog} />
      <Toast toast={state.toast} nonce={state.toastN} onClose={closeToast} />
      <AuthModal state={state} onState={onState} onClose={closeAuthModal}
        onSendOtp={onSendOtp} onVerifyOtp={onVerifyOtp} onToggleRemember={onToggleRemember} />
      {state.reviewModalOpen && (
        <ReviewModal onClose={closeReviewModal} onSubmit={onSubmitReview}
          defaultName={`${state.user.firstName || ''} ${state.user.lastName || ''}`.trim()} />
      )}
      {state.recoveryOpen && (
        <ResetPasswordModal onSubmit={onSetNewPassword} />
      )}
      {state.user.signedIn && <SessionTimer loginAt={state.user.loginAt} />}
    </div>
  );
}
