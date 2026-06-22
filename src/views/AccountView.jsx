import { barberById, timeLabel, statusMeta, nowMs } from '../helpers';

export default function AccountView({ state, bookings, user, goBook, onState, onUpdateBooking, showAlert, onSendOtp, onVerifyOtp, onToggleRemember }) {
  const accent = '#D6C3A0';
  const nowAbs = nowMs();
  const startMs = b => new Date(b.date+'T00:00:00').getTime()+b.start*60000;

  // Viewing appointments requires being signed in (= a verified email). When
  // signed out we show the same email-OTP flow used in the booking step; once
  // verified, this view re-renders with the user's own appointments.
  if (!user.signedIn) {
    const s = state;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s.emailInput||'').trim());
    return (
      <main style={{maxWidth:'460px',margin:'0 auto',padding:'clamp(40px,8vw,90px) clamp(16px,4vw,32px) 80px',animation:'gbfade 0.4s ease both'}}>
        <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:accent,marginBottom:'10px'}}>My appointments</div>
        <h1 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(28px,5vw,44px)',margin:'0 0 6px',lineHeight:'1'}}>Sign in to view</h1>
        <p style={{color:'#9A9388',margin:'0 0 26px'}}>Verify your email to see and manage your bookings. We'll send a one-time code.</p>
        {s.authStep==='email' && (
          <>
            <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Enter Email Address</label>
            <input type="email" value={s.emailInput}
              onChange={e=>onState({emailInput:e.target.value,authErr:''})}
              onKeyDown={e=>{ if(e.key==='Enter' && emailOk && !s.authBusy) onSendOtp(s.emailInput); }}
              placeholder="you@email.com" autoComplete="email"
              style={{width:'100%',boxSizing:'border-box',background:'#1D1A15',border:`1px solid ${s.authErr?'#C2553B':'#2A2622'}`,borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'16px',marginBottom:'12px'}}/>
            {s.authErr && <p style={{color:'#E08A6E',fontSize:'13px',margin:'0 0 12px'}}>{s.authErr}</p>}
            <label style={{display:'flex',alignItems:'center',gap:'9px',cursor:'pointer',userSelect:'none',fontSize:'14px',color:'#9A9388',margin:'0 0 14px'}}>
              <input type="checkbox" checked={s.remember} onChange={e=>onToggleRemember(e.target.checked)}
                style={{width:'17px',height:'17px',accentColor:accent,cursor:'pointer'}}/>
              Keep me signed in on this device
            </label>
            <button onClick={()=>onSendOtp(s.emailInput)} disabled={!emailOk || s.authBusy}
              style={{width:'100%',cursor:(!emailOk||s.authBusy)?'not-allowed':'pointer',opacity:(!emailOk||s.authBusy)?0.55:1,background:accent,color:'#0E0E0E',border:'none',borderRadius:'10px',padding:'14px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px'}}>{s.authBusy?'Sending…':'Send code'}</button>
          </>
        )}
        {s.authStep==='otp' && (
          <>
            <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Enter the 8-digit code sent to {s.emailInput||'your email'}</label>
            {s.devCode && (
              <div style={{background:'rgba(214,195,160,0.1)',border:'1px dashed '+accent,borderRadius:'10px',padding:'10px 12px',marginBottom:'12px',fontSize:'13px',color:'#9A9388'}}>
                Email service is down — <b style={{color:accent}}>dev mode</b>. Use code <b style={{color:accent,letterSpacing:'0.15em'}}>{s.devCode}</b>
              </div>
            )}
            <input type="text" inputMode="numeric" value={s.otpInput}
              onChange={e=>onState({otpInput:e.target.value.replace(/\D/g,'').slice(0,8),authErr:''})}
              onKeyDown={e=>{ if(e.key==='Enter' && s.otpInput.length===8 && !s.authBusy) onVerifyOtp(s.emailInput,s.otpInput); }}
              placeholder="• • • • • • • •"
              style={{width:'100%',boxSizing:'border-box',background:'#1D1A15',border:`1px solid ${s.authErr?'#C2553B':'#2A2622'}`,borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'24px',letterSpacing:'0.4em',textAlign:'center',marginBottom:'12px'}}/>
            {s.authErr && <p style={{color:'#E08A6E',fontSize:'13px',margin:'0 0 12px'}}>{s.authErr}</p>}
            <button onClick={()=>onVerifyOtp(s.emailInput,s.otpInput)} disabled={s.otpInput.length!==8 || s.authBusy}
              style={{width:'100%',cursor:(s.otpInput.length!==8||s.authBusy)?'not-allowed':'pointer',opacity:(s.otpInput.length!==8||s.authBusy)?0.55:1,background:accent,color:'#0E0E0E',border:'none',borderRadius:'10px',padding:'14px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px'}}>{s.authBusy?'Verifying…':'Verify & view'}</button>
            <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
              <button onClick={()=>onState({authStep:'email',otpInput:'',authErr:''})}
                style={{flex:'1',cursor:'pointer',background:'transparent',color:'#9A9388',border:'none',padding:'12px',fontSize:'14px'}}>← Change email</button>
              <button onClick={()=>onSendOtp(s.emailInput)} disabled={s.authBusy}
                style={{flex:'1',cursor:s.authBusy?'not-allowed':'pointer',background:'transparent',color:'#9A9388',border:'none',padding:'12px',fontSize:'14px'}}>Resend code</button>
            </div>
          </>
        )}
      </main>
    );
  }

  // Signed in — show only THIS customer's bookings (scoped by verified email).
  const mine = bookings.filter(b=>b.email && b.email===user.email);
  const upcoming = mine.filter(b=>b.status!=='cancelled'&&b.status!=='completed'&&startMs(b)>=nowAbs).sort((a,b)=>startMs(a)-startMs(b));
  const past = mine.filter(b=>b.status==='completed'||b.status==='cancelled'||startMs(b)<nowAbs).sort((a,b)=>startMs(b)-startMs(a));
  const cutoff = 2*3600000;

  const cancelBooking = (b) => {
    if(startMs(b)-nowAbs < cutoff){ showAlert("Sorry — bookings can't be changed within 2 hours of the appointment. Please call the shop.", {title:'Too close to appointment'}); return; }
    onUpdateBooking(b.id,{status:'cancelled'});
  };
  const startReschedule = (b) => {
    onState({view:'book',step:'datetime',reschedulingId:b.id,barber:b.barber,date:null,time:null,cart:[]});
    window.scrollTo({top:0});
  };
  const rebook = (b) => {
    onState({view:'book',step:'service',reschedulingId:null,barber:b.barber,cart:[],date:null,time:null,payMethod:null});
    window.scrollTo({top:0});
  };

  return (
    <main style={{maxWidth:'820px',margin:'0 auto',padding:'clamp(28px,5vw,52px) clamp(16px,4vw,32px) 80px',animation:'gbfade 0.4s ease both'}}>
      <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:accent,marginBottom:'10px'}}>{user.firstName?'Hello, '+user.firstName:'Guest'}</div>
      <h1 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(30px,5vw,52px)',margin:'0 0 30px',lineHeight:'1'}}>My appointments</h1>

      <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.12em',fontSize:'14px',color:'#F4EFE7',marginBottom:'14px'}}>Upcoming</div>
      {upcoming.length===0 && (
        <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'14px',padding:'30px',textAlign:'center',color:'#9A9388',marginBottom:'34px'}}>
          No upcoming bookings yet. <button onClick={goBook} style={{background:'none',border:'none',color:accent,cursor:'pointer',fontSize:'16px',textDecoration:'underline'}}>Book a chair →</button>
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'36px'}}>
        {upcoming.map(b=>{
          const d=new Date(b.date+'T00:00:00'); const locked=startMs(b)-nowAbs<cutoff;
          const m=statusMeta(b.status); const bar=barberById(b.barber);
          return (
            <div key={b.id} style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'15px',padding:'20px',display:'flex',flexWrap:'wrap',gap:'16px',alignItems:'center'}}>
              <div style={{flexShrink:'0',textAlign:'center',background:'#1D1A15',borderRadius:'12px',padding:'12px 16px',border:'1px solid #2A2622'}}>
                <div style={{fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.08em',color:'#9A9388'}}>{d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</div>
                <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'28px',lineHeight:'1',color:accent}}>{d.getDate()}</div>
                <div style={{fontSize:'12px',color:'#9A9388'}}>{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
              </div>
              <div style={{flex:'1',minWidth:'180px'}}>
                <div style={{fontFamily:"'Oswald'",fontSize:'20px',textTransform:'uppercase',letterSpacing:'0.02em'}}>{timeLabel(b.start)}</div>
                <div style={{color:'#F4EFE7',fontSize:'15px',marginTop:'2px'}}>{b.service}</div>
                <div style={{color:'#9A9388',fontSize:'14px',marginTop:'2px'}}>with {bar?.name||'First available'} · {m.label}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'7px',flexShrink:'0'}}>
                <button onClick={()=>startReschedule(b)} style={{cursor:'pointer',background:'#1D1A15',color:'#F4EFE7',border:'1px solid #2A2622',borderRadius:'8px',padding:'9px 16px',fontSize:'13px',fontWeight:'600'}}>Reschedule</button>
                <button onClick={()=>cancelBooking(b)} style={{cursor:locked?'not-allowed':'pointer',background:'transparent',color:locked?'#5e574d':'#C46A5A',border:'1px solid #2A2622',borderRadius:'8px',padding:'9px 16px',fontSize:'13px',fontWeight:'600'}}>{locked?'Locked':'Cancel'}</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.12em',fontSize:'14px',color:'#F4EFE7',marginBottom:'14px'}}>History</div>
      {past.length===0 && (
        <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'14px',padding:'24px',textAlign:'center',color:'#9A9388'}}>Your past visits will show up here.</div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {past.map(b=>{
          const m=statusMeta(b.status); const d=new Date(b.date+'T00:00:00'); const bar=barberById(b.barber);
          return (
            <div key={b.id} style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'13px',padding:'16px 18px',display:'flex',flexWrap:'wrap',gap:'12px',alignItems:'center',opacity:'0.92'}}>
              <div style={{flex:'1',minWidth:'180px'}}>
                <div style={{fontSize:'15px'}}><b style={{fontFamily:"'Oswald'",fontWeight:'600',color:m.color}}>{m.label}</b> · {d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · {timeLabel(b.start)}</div>
                <div style={{color:'#9A9388',fontSize:'14px',marginTop:'2px'}}>{b.service} · {bar?.name||'—'}</div>
              </div>
              <button onClick={()=>rebook(b)} style={{cursor:'pointer',background:'#1D1A15',color:accent,border:'1px solid #2A2622',borderRadius:'8px',padding:'9px 16px',fontSize:'13px',fontWeight:'600',flexShrink:'0'}}>Book again</button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
