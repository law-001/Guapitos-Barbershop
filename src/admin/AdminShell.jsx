import { useState, useEffect, useRef } from 'react';
import { BARBERS } from '../data';
import { iso, todayDate, dateFull } from '../helpers';
import DashboardPage from './DashboardPage';
import CalendarPage from './CalendarPage';
import RecordsPage from './RecordsPage';
import CustomersPage from './CustomersPage';
import ReviewsPage from './ReviewsPage';
import BookingDrawer from './BookingDrawer';
import CustomerDrawer from './CustomerDrawer';
import AdminNewBookingDrawer from './AdminNewBookingDrawer';

export default function AdminShell({ state, onState, onCreateBooking, onUpdateBooking, onCheckIn, showConfirm, onApproveReview, onRejectReview, onAdminSignOut }) {
  const s = state;
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const onStateRef = useRef(onState);
  useEffect(() => { onStateRef.current = onState; });
  const accent = '#D6C3A0';

  const navOpen = s.adminNavOpen;
  const page = s.adminPage;
  const todayIso = iso(todayDate());

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = (e) => {
      setIsMobile(e.matches);
      if (e.matches) onStateRef.current({ adminNavOpen: false });
    };
    mq.addEventListener('change', update);
    if (mq.matches) onStateRef.current({ adminNavOpen: false });
    return () => mq.removeEventListener('change', update);
  }, []);

  const navBg = p => page===p ? 'rgba(214,195,160,0.14)' : 'transparent';
  const navCol = p => page===p ? accent : '#9A9388';
  const setPage = p => { onState({adminPage:p,drawerId:null,custName:null,...(isMobile?{adminNavOpen:false}:{})}); window.scrollTo({top:0}); };

  const openDrawer = id => onState({drawerId:id,custName:null,drawerEdit:false});
  const closeDrawer = () => onState({drawerId:null});
  const openCust = name => onState({custName:name,drawerId:null});
  const closeCust = () => onState({custName:null});

  const setBookingStatus = (id, st) => onUpdateBooking(id, { status: st });
  const toggleFollowUp = id => {
    const cur = s.bookings.find(b=>b.id===id);
    onUpdateBooking(id, { followUp: !(cur && cur.followUp) });
  };

  const adminQuickAdd = () => setNewBookingOpen(true);

  const adminNewAppt = () => setNewBookingOpen(true);

  const handleNewBookingConfirm = (bk) => {
    onCreateBooking(bk);
    onState({ drawerId: bk.id, drawerEdit: false });
    setNewBookingOpen(false);
  };

  const calShift = dir => {
    const d=new Date(s.calIso+'T00:00:00');
    if(s.calMode==='day') d.setDate(d.getDate()+dir);
    else if(s.calMode==='week') d.setDate(d.getDate()+dir*7);
    else d.setMonth(d.getMonth()+dir);
    onState({calIso:iso(d)});
  };

  const pageTitles = {dashboard:'Dashboard',records:'Records',calendar:'Calendar',customers:'Customers',reviews:'Reviews'};
  const pendingReviews = (s.adminReviews || []).filter(r => !r.approved).length;

  const sv = (children) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:'0'}}>
      {children}
    </svg>
  );

  const icons = {
    dashboard: sv(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>),
    calendar:  sv(<><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></>),
    records:   sv(<><path d="M4 6h16M4 12h16M4 18h10"/></>),
    customers: sv(<><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></>),
    reviews:   sv(<><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z"/></>),
    collapse:  sv(<><path d="M15 18l-6-6 6-6"/></>),
    expand:    sv(<><path d="M9 18l6-6-6-6"/></>),
    signout:   sv(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h12"/></>),
    menu:      sv(<><path d="M3 6h18M3 12h18M3 18h18"/></>),
  };

  const showLabel = navOpen || isMobile;

  const navBtn = (p, icon, label) => (
    <button onClick={()=>setPage(p)} title={label}
      style={{display:'flex',alignItems:'center',gap:'13px',cursor:'pointer',background:navBg(p),border:'none',borderRadius:'10px',padding:'11px 12px',color:navCol(p),fontFamily:"'Hanken Grotesk'",fontWeight:'600',fontSize:'14.5px',whiteSpace:'nowrap',width:'100%'}}>
      {icon}
      {showLabel && <span>{label}</span>}
    </button>
  );

  const sidebarStyle = isMobile
    ? {width:'232px',flexShrink:'0',position:'fixed',top:'0',left:'0',height:'100dvh',maxHeight:'100vh',display:'flex',flexDirection:'column',background:'#0B0B0B',borderRight:'1px solid #2A2622',transition:'transform 0.22s ease',transform:navOpen?'translateX(0)':'translateX(-100%)',overflow:'hidden',zIndex:'50'}
    : {width:navOpen?'232px':'72px',flexShrink:'0',position:'sticky',top:'0',height:'100dvh',maxHeight:'100vh',display:'flex',flexDirection:'column',background:'#0B0B0B',borderRight:'1px solid #2A2622',transition:'width 0.18s ease',overflow:'hidden',zIndex:'20'};

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#141210'}}>
      {/* MOBILE BACKDROP */}
      {isMobile && navOpen && (
        <div onClick={()=>onState({adminNavOpen:false})}
          style={{position:'fixed',inset:'0',background:'rgba(0,0,0,0.65)',zIndex:'49',touchAction:'none'}}/>
      )}

      {/* SIDEBAR */}
      <aside style={sidebarStyle}>
        <div style={{display:'flex',alignItems:'center',gap:'11px',height:'64px',flexShrink:'0',padding:'0 16px',borderBottom:'1px solid #2A2622'}}>
          <img src="/assets/logo.jpg" alt="Guapito's" style={{height:'34px',width:'34px',objectFit:'cover',borderRadius:'7px',flexShrink:'0'}}/>
          {showLabel && (
            <div style={{minWidth:'0'}}>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.04em',fontSize:'15px',lineHeight:'1',whiteSpace:'nowrap'}}>Guapito's</div>
              <div style={{fontSize:'10.5px',color:accent,textTransform:'uppercase',letterSpacing:'0.16em',whiteSpace:'nowrap'}}>Staff</div>
            </div>
          )}
        </div>
        <nav style={{flex:'1',minHeight:'0',overflowY:'auto',padding:'14px 12px',display:'flex',flexDirection:'column',gap:'5px'}}>
          {navBtn('dashboard', icons.dashboard, 'Today')}
          {navBtn('calendar',  icons.calendar,  'Schedule')}
          {navBtn('records',   icons.records,   'Records')}
          {navBtn('customers', icons.customers, 'Customers')}
          {/* Reviews nav: pending count badge so flooding is visible at a glance. */}
          <button onClick={()=>setPage('reviews')} title="Reviews"
            style={{display:'flex',alignItems:'center',gap:'13px',cursor:'pointer',background:navBg('reviews'),border:'none',borderRadius:'10px',padding:'11px 12px',color:navCol('reviews'),fontFamily:"'Hanken Grotesk'",fontWeight:'600',fontSize:'14.5px',whiteSpace:'nowrap',width:'100%'}}>
            {icons.reviews}
            {showLabel && <span style={{flex:'1',textAlign:'left'}}>Reviews</span>}
            {pendingReviews>0 && <span style={{flexShrink:'0',minWidth:'18px',height:'18px',padding:'0 5px',borderRadius:'999px',background:accent,color:'#0E0E0E',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center'}}>{pendingReviews}</span>}
          </button>
        </nav>
        <div style={{padding:'12px',flexShrink:'0',borderTop:'1px solid #2A2622',display:'flex',flexDirection:'column',gap:'6px'}}>
          {!isMobile && (
            <button onClick={()=>onState(st=>({adminNavOpen:!st.adminNavOpen}))} title={navOpen?'Collapse':'Expand'}
              style={{display:'flex',alignItems:'center',gap:'13px',cursor:'pointer',background:'transparent',border:'none',borderRadius:'10px',padding:'10px 12px',color:'#9A9388',fontSize:'14px',whiteSpace:'nowrap',width:'100%'}}>
              {navOpen ? icons.collapse : icons.expand}
              {navOpen && <span>Collapse</span>}
            </button>
          )}
          <button onClick={onAdminSignOut} title="Sign out"
            style={{display:'flex',alignItems:'center',gap:'13px',cursor:'pointer',background:'transparent',border:'none',borderRadius:'10px',padding:'10px 12px',color:'#9A9388',fontSize:'14px',whiteSpace:'nowrap',width:'100%'}}>
            {icons.signout}
            {showLabel && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:'1',minWidth:'0',width:'100%',display:'flex',flexDirection:'column'}}>
        {/* TOPBAR */}
        <header style={{position:'sticky',top:'0',zIndex:'15',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',minHeight:'64px',padding:'12px clamp(16px,3vw,32px)',background:'rgba(11,11,11,0.9)',backdropFilter:'blur(12px)',borderBottom:'1px solid #2A2622'}}>
          {isMobile && (
            <button onClick={()=>onState(st=>({adminNavOpen:!st.adminNavOpen}))}
              style={{display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'transparent',border:'none',borderRadius:'8px',padding:'8px',color:'#9A9388',flexShrink:'0'}}>
              {icons.menu}
            </button>
          )}
          <div style={{minWidth:'0'}}>
            <h1 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.02em',fontSize:'clamp(20px,2.4vw,27px)',margin:'0',lineHeight:'1'}}>{pageTitles[page]}</h1>
            <div style={{fontSize:'12.5px',color:'#9A9388',marginTop:'2px'}}>{dateFull(todayIso)}</div>
          </div>
          <div style={{flex:'1',minWidth:'12px'}}></div>
          <div style={{display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap'}}>
            {!isMobile && (
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                {BARBERS.map(b=>(
                  <span key={b.id} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'#9A9388'}}>
                    <span style={{width:'9px',height:'9px',borderRadius:'50%',background:b.color}}></span>{b.name}
                  </span>
                ))}
              </div>
            )}
            <button onClick={()=>setNewBookingOpen(true)}
              style={{cursor:'pointer',background:accent,color:'#0E0E0E',border:'none',borderRadius:'9px',padding:'11px 18px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.05em',textTransform:'uppercase',fontSize:'13.5px',whiteSpace:'nowrap'}}>{isMobile?'+ New':'+ New booking'}</button>
          </div>
        </header>

        <div style={{padding:'clamp(18px,2.6vw,30px) clamp(16px,3vw,32px) 60px',animation:'gbfade 0.35s ease both'}}>
          {page==='dashboard' && (
            <DashboardPage bookings={s.bookings} openDrawer={openDrawer} navCalendar={()=>setPage('calendar')} onCheckIn={onCheckIn} onUpdateBooking={onUpdateBooking}/>
          )}
          {page==='calendar' && (
            <CalendarPage
              bookings={s.bookings}
              calMode={s.calMode}
              calIso={s.calIso}
              setCalMode={m=>onState({calMode:m})}
              calShift={calShift}
              calToday={()=>onState({calIso:iso(todayDate())})}
              selectCalDay={d=>onState({calIso:d})}
              openDayFromMonth={d=>onState({calIso:d,calMode:'day'})}
              openDrawer={openDrawer}
              adminNewAppt={adminNewAppt}
              adminQuickAdd={adminQuickAdd}
            />
          )}
          {page==='records' && (
            <RecordsPage bookings={s.bookings} openDrawer={openDrawer}/>
          )}
          {page==='customers' && (
            <CustomersPage bookings={s.bookings} openCust={openCust}/>
          )}
          {page==='reviews' && (
            <ReviewsPage reviews={s.adminReviews} onApprove={onApproveReview} onReject={onRejectReview}/>
          )}
        </div>
      </div>

      {/* DRAWERS */}
      {s.drawerId && (
        <BookingDrawer bookings={s.bookings} drawerId={s.drawerId} closeDrawer={closeDrawer} setBookingStatus={setBookingStatus} toggleFollowUp={toggleFollowUp} onUpdateBooking={onUpdateBooking} onCheckIn={onCheckIn} user={s.user} showConfirm={showConfirm} startEdit={s.drawerEdit} openEditN={s.openEditN}/>
      )}
      {s.custName && (
        <CustomerDrawer bookings={s.bookings} custName={s.custName} closeCust={closeCust} openDrawer={openDrawer}/>
      )}
      {newBookingOpen && (
        <AdminNewBookingDrawer
          bookings={s.bookings}
          onClose={()=>setNewBookingOpen(false)}
          onConfirm={handleNewBookingConfirm}
        />
      )}
    </div>
  );
}
