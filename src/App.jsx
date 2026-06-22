import { useState, useEffect, useRef } from 'react';
import './App.css';
import { iso, todayDate, timeLabel } from './helpers';
import { fetchBookings, insertBooking, updateBooking as apiUpdateBooking } from './lib/bookingsApi';
import { sendEmailOtp, verifyEmailOtp } from './lib/auth';
import HomeView from './views/HomeView';
import BookingView from './views/BookingView';
import AccountView from './views/AccountView';
import AdminLogin from './admin/AdminLogin';
import AdminShell from './admin/AdminShell';
import Dialog from './Dialog';
import Toast from './Toast';

const todayIso = iso(todayDate());

const initState = {
  view: 'home',
  step: 'service',
  cart: [],
  barber: 'any',
  date: null,
  time: null,
  user: { signedIn: false, name: '', mobile: '', email: '' },
  authStep: 'email',     // 'email' (enter address) | 'otp' (enter code)
  emailInput: '',
  otpInput: '',
  authBusy: false,       // true while a Supabase auth request is in flight
  authErr: '',           // sign-in error message to show under the field
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
  const goAccount = () => { onState({ view: 'account' }); window.scrollTo({ top: 0 }); };
  const goAdmin = () => { onState({ view: 'admin' }); window.scrollTo({ top: 0 }); };

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

  // Booking sign-in: email one-time-password via Supabase.
  const onSendOtp = async (email) => {
    const addr = email.trim();
    if(!addr) return;
    onState({ authBusy: true, authErr: '' });
    const { error } = await sendEmailOtp(addr);
    if(error){ onState({ authBusy: false, authErr: error.message }); return; }
    onState({ authBusy: false, authStep: 'otp', emailInput: addr });
  };

  const onVerifyOtp = async (email, token) => {
    const code = token.trim();
    if(!code) return;
    onState({ authBusy: true, authErr: '' });
    const { error } = await verifyEmailOtp(email.trim(), code);
    if(error){ onState({ authBusy: false, authErr: error.message }); return; }
    onState(st => ({ authBusy: false, otpInput: '', user: { ...st.user, signedIn: true, email: email.trim() }, step: 'details' }));
    window.scrollTo({ top: 0 });
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
          <button onClick={goBook} style={{ background: '#D6C3A0', color: '#0E0E0E', fontFamily: "'Oswald'", fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '14px', border: 'none', borderRadius: '7px', padding: '11px 20px', cursor: 'pointer' }}>Book Now</button>
        </header>
      )}

      {/* VIEWS */}
      {state.view === 'home' && (
        <HomeView goBook={goBook} goAccount={goAccount} goAdmin={goAdmin} navServices={navServices} />
      )}

      {state.view === 'book' && (
        <BookingView state={state} goHome={goHome} goAccount={goAccount} goBook={goBook} onState={onState} onCreateBooking={onCreateBooking} onUpdateBooking={onUpdateBooking} onSendOtp={onSendOtp} onVerifyOtp={onVerifyOtp} />
      )}

      {state.view === 'account' && (
        <AccountView bookings={state.bookings} user={state.user} goBook={goBook} onState={onState} onUpdateBooking={onUpdateBooking} showAlert={showAlert} />
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
    </div>
  );
}
