import { useState } from 'react';
import './App.css';
import { initBookings, iso, todayDate } from './helpers';
import HomeView from './views/HomeView';
import BookingView from './views/BookingView';
import AccountView from './views/AccountView';
import AdminLogin from './admin/AdminLogin';
import AdminShell from './admin/AdminShell';

const initialBookings = initBookings();
const todayIso = iso(todayDate());

const initState = {
  view: 'home',
  step: 'service',
  cart: [],
  barber: 'any',
  date: null,
  time: null,
  user: { signedIn: false, name: '', mobile: '' },
  authStep: 'choose',
  phoneInput: '',
  otpInput: '',
  notes: '',
  payMethod: null,
  lastRef: null,
  lastBooking: null,
  reschedulingId: null,
  bookings: initialBookings,
  adminAuthed: false,
  adminUser: '',
  adminPass: '',
  adminErr: '',
  adminNavOpen: true,
  adminPage: 'dashboard',
  drawerId: null,
  custName: null,
  calMode: 'month',
  calIso: todayIso,
};

export default function App() {
  const [state, setState] = useState(initState);

  const onState = (updater) => {
    if(typeof updater === 'function'){
      setState(s => ({ ...s, ...updater(s) }));
    } else {
      setState(s => ({ ...s, ...updater }));
    }
  };

  const goHome = () => { onState({ view: 'home' }); window.scrollTo({ top: 0 }); };
  const goBook = () => { onState({ view: 'book', step: 'service', cart: [], barber: 'any', date: null, time: null, payMethod: null, notes: '', reschedulingId: null, authStep: 'choose' }); window.scrollTo({ top: 0 }); };
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
        <BookingView state={state} goHome={goHome} goAccount={goAccount} goBook={goBook} onState={onState} />
      )}

      {state.view === 'account' && (
        <AccountView bookings={state.bookings} user={state.user} goBook={goBook} onState={onState} />
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
        <AdminShell state={state} onState={onState} goHome={goHome} />
      )}
    </div>
  );
}
