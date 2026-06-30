import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SERVICES, CATS, BARBERS } from '../data';
import { durLabel, timeLabel, peso, svcById, barberById, genSlots, iso, addDays, genId, nowMs, dateFull } from '../helpers';
import { sendBookingConfirmation } from '../lib/bookingEmail';

export default function BookingView({ state, goHome, goAccount, goBook, onState, onCreateBooking, onUpdateBooking, onSendOtp, onVerifyOtp, onSaveProfile, onToggleRemember, leadHours=1, onlinePayEnabled=true }) {
  const s = state;
  const accent='#D6C3A0', hair='#2A2622';
  // Tracks whether the "you already have a booking" popup was dismissed so the
  // customer can proceed to book another without it reappearing this session.
  const [warnDismissed, setWarnDismissed] = useState(false);
  // Holds the existing booking that overlaps the slot the customer is trying to
  // confirm (same person, same time, any barber) — drives the clash warning popup.
  const [clashBooking, setClashBooking] = useState(null);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.emailInput.trim());
  const fullName = `${s.user.firstName} ${s.user.lastName}`.trim();

  const navOrder = () => {
    const o=['service','barber','datetime'];
    if(!s.user.signedIn) o.push('signin');
    o.push('details','payment','confirmation');
    return o;
  };
  const order = navOrder();
  const curIdx = order.indexOf(s.step);
  const labels = {service:'Service',barber:'Barber',datetime:'Time',signin:'Sign in',details:'Details',payment:'Payment'};
  const visible = order.filter(k=>k!=='confirmation');

  const totalDur = () => {
    if(s.reschedulingId){ const b=s.bookings.find(x=>x.id===s.reschedulingId); return b?b.dur:45; }
    return s.cart.reduce((sum,id)=>sum+(svcById(id)?.dur||0),0);
  };
  const totalPrice = () => s.cart.reduce((sum,id)=>sum+(svcById(id)?.price||0),0);

  const continueDisabled = () => {
    if(s.step==='service') return s.cart.length===0;
    if(s.step==='datetime') return !(s.date && s.time!=null);
    if(s.step==='details') return !(s.user.firstName.trim() && s.user.lastName.trim() && s.user.mobile.trim());
    if(s.step==='payment') return !s.payMethod;
    return false;
  };
  const disabled = continueDisabled();

  const onContinue = () => {
    if(disabled) return;
    if(s.step==='datetime' && s.reschedulingId){ saveReschedule(); return; }
    if(s.step==='details'){ onSaveProfile?.(s.user); }   // persist name + mobile for next time
    if(s.step==='payment'){ finalize(); return; }
    const i=order.indexOf(s.step);
    onState({step:order[i+1]});
    window.scrollTo({top:0});
  };
  const onBack = () => {
    if(s.reschedulingId && s.step==='datetime'){ onState({reschedulingId:null,view:'account'}); return; }
    const i=order.indexOf(s.step);
    if(i<=0){ goHome(); return; }
    onState({step:order[i-1]});
    window.scrollTo({top:0});
  };

  // Availability is computed from the public, no-PII occupancy feed (state.occupancy)
  // — not state.bookings, which after the read-privacy lock only holds the
  // customer's OWN rows. occupancy carries every booking's date/barber/time/status.
  const occ = s.occupancy || [];
  const firstFreeLocal = (date,start,dur,excludeId) => {
    for(const b of BARBERS){
      const end=start+dur;
      const conflicts = occ.filter(bk=>bk.barber===b.id && bk.date===date && bk.status!=='cancelled' && bk.id!==excludeId);
      if(!conflicts.some(bk=>start<bk.start+bk.dur && end>bk.start)) return b.id;
    }
    return null;
  };

  // Self-clash = this same customer already has an upcoming booking that overlaps
  // the chosen slot, regardless of barber. You can't sit in two chairs at once,
  // so booking June 30 9:00 with barber B while already booked 9:00 with barber A
  // is almost always a mistake. Returns that existing booking (or null).
  const findSelfClash = (date,start,dur) => {
    if(!(s.user.signedIn && s.user.email) || !date || start==null) return null;
    const end=start+dur;
    return s.bookings.find(b=>b.email===s.user.email && b.date===date
      && b.status!=='cancelled' && b.status!=='completed' && b.id!==s.reschedulingId
      && start<b.start+b.dur && end>b.start) || null;
  };

  const finalize = (force=false) => {
    const dur=totalDur();
    if(!force){ const clash=findSelfClash(s.date,s.time,dur); if(clash){ setClashBooking(clash); return; } }
    const assigned = s.barber==='any' ? firstFreeLocal(s.date,s.time,dur,null) : s.barber;
    const ref='GB-'+Math.random().toString(36).slice(2,7).toUpperCase();
    const names=s.cart.map(id=>svcById(id).name);
    const bk={id:genId('u'),date:s.date,start:s.time,dur,barber:assigned,service:names.join(' + '),price:totalPrice(),customer:fullName||'You',email:s.user.email||'',status:'booked',mine:true,pay:s.payMethod,notes:s.notes,followUp:false};
    onCreateBooking(bk);
    sendBookingConfirmation(bk,ref);   // fire-and-forget styled confirmation email
    onState({lastRef:ref,lastBooking:bk,step:'confirmation'});
    window.scrollTo({top:0});
  };

  const saveReschedule = () => {
    const id=s.reschedulingId; const dur=totalDur();
    const assigned = s.barber==='any' ? firstFreeLocal(s.date,s.time,dur,id) : s.barber;
    const ref='GB-'+Math.random().toString(36).slice(2,7).toUpperCase();
    const patch={date:s.date,start:s.time,barber:assigned,status:'booked'};
    onUpdateBooking(id,patch);
    const updated={...s.bookings.find(b=>b.id===id),...patch};
    sendBookingConfirmation(updated,ref);   // email the updated details after a reschedule
    onState({reschedulingId:null,lastRef:ref,lastBooking:updated,step:'confirmation'});
    window.scrollTo({top:0});
  };

  const slots = genSlots(occ, s.date, s.barber, totalDur(), leadHours, s.reschedulingId);

  // "Active" bookings = ALL of this signed-in customer's upcoming bookings
  // (not cancelled/completed, still in the future), earliest first. Used to warn
  // them on the service step that they already have bookings, each with its own
  // quick reschedule jump.
  const startMs = b => new Date(b.date+'T00:00:00').getTime()+b.start*60000;
  const activeBookings = (s.user.signedIn && s.user.email)
    ? s.bookings.filter(b=>b.email===s.user.email && b.status!=='cancelled' && b.status!=='completed' && startMs(b)>=nowMs())
        .sort((a,b)=>startMs(a)-startMs(b))
    : [];
  const goReschedule = (b) => { onState({view:'book',step:'datetime',reschedulingId:b.id,barber:b.barber,date:null,time:null,cart:[]}); window.scrollTo({top:0}); };

  const cont = {service:'Continue',barber:'Continue',datetime:s.reschedulingId?'Confirm new time':'Continue',signin:'Continue',details:'Continue',
    payment:s.payMethod==='online'?'Pay & confirm':'Reserve appointment'}[s.step]||'Continue';

  const lb = s.lastBooking;
  const selBarberName = s.barber==='any'?'First available barber':(barberById(s.barber)?.name||'');
  // The booking being rescheduled (null on a normal booking) — drives the
  // dedicated reschedule header + "current → new" banner so the screen can't be
  // mistaken for a fresh booking.
  const reb = s.reschedulingId ? s.bookings.find(x=>x.id===s.reschedulingId) : null;

  return (
    <main style={{maxWidth:'880px',margin:'0 auto',padding:'clamp(20px,4vw,40px) clamp(16px,4vw,32px) 140px',animation:'gbfade 0.4s ease both'}}>
      {/* Reschedule header (replaces the booking progress bar so this screen is
          unmistakably a reschedule, not a new booking). */}
      {s.reschedulingId ? (
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'26px',background:'rgba(214,195,160,0.10)',border:'1px solid '+accent,borderRadius:'13px',padding:'14px 18px'}}>
          <span style={{flexShrink:'0',fontSize:'22px'}}>↻</span>
          <div>
            <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.10em',fontSize:'13px',color:accent,fontWeight:'700'}}>Rescheduling your appointment</div>
            <div style={{color:'#9A9388',fontSize:'13px',marginTop:'2px'}}>Just pick a new slot below — everything else stays the same.</div>
          </div>
        </div>
      ) : (
        /* Progress */
        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'30px',flexWrap:'wrap'}}>
          {visible.map((k,i)=>{
            const idx=order.indexOf(k); const done=idx<curIdx; const active=idx===curIdx;
            return (
              <div key={k} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:'28px',height:'28px',borderRadius:'50%',fontFamily:"'Oswald'",fontWeight:'600',fontSize:'14px',background:active?accent:(done?'rgba(214,195,160,0.18)':'transparent'),color:active?'#0E0E0E':(done?accent:'#9A9388'),border:'1px solid '+(active?accent:hair)}}>{i+1}</span>
                <span style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.06em',fontSize:'12px',color:active?'#F4EFE7':'#9A9388'}}>{labels[k]}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* STEP: SERVICE */}
      {s.step==='service' && (
        <div>
          <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(26px,4vw,40px)',margin:'0 0 6px'}}>Pick your services</h2>
          <p style={{color:'#9A9388',margin:'0 0 26px'}}>Choose one or more — your total price and chair time update live.</p>
          {CATS.map(cat=>(
            <div key={cat} style={{marginBottom:'26px'}}>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.12em',fontSize:'13px',color:accent,marginBottom:'12px'}}>{cat}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:'11px'}}>
                {SERVICES.filter(x=>x.cat===cat).map(x=>{
                  const sel=s.cart.includes(x.id);
                  return (
                    <button key={x.id} onClick={()=>onState(st=>({cart:st.cart.includes(x.id)?st.cart.filter(c=>c!==x.id):[...st.cart,x.id],time:null}))}
                      style={{textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'13px',background:sel?'rgba(214,195,160,0.08)':'#15130F',border:'1.5px solid '+(sel?accent:hair),borderRadius:'13px',padding:'15px 16px',color:'#F4EFE7'}}>
                      <span style={{flexShrink:'0',width:'22px',height:'22px',borderRadius:'6px',border:'1.5px solid '+(sel?accent:hair),background:sel?accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#0E0E0E',fontSize:'14px',fontWeight:'800'}}>{sel?'✓':''}</span>
                      <span style={{flex:'1',minWidth:'0'}}>
                        <span style={{display:'block',fontWeight:'600',fontSize:'15px'}}>{x.name}</span>
                        <span style={{display:'block',color:'#9A9388',fontSize:'13px'}}>{(x.sub?x.sub+' · ':'')+durLabel(x.dur)}</span>
                      </span>
                      <span style={{fontFamily:"'Oswald'",fontWeight:'600',fontSize:'17px',color:accent}}>{peso(x.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP: BARBER */}
      {s.step==='barber' && (
        <div>
          <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(26px,4vw,40px)',margin:'0 0 6px'}}>Choose your barber</h2>
          <p style={{color:'#9A9388',margin:'0 0 26px'}}>All four are master barbers. Not fussy? "First available" fills the earliest open chair.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'13px'}}>
            {[{id:'any',name:'First available',spec:"We'll match you with the earliest free barber — best for the fastest booking",initials:'★',color:accent},...BARBERS].map(b=>{
              const sel=s.barber===b.id; const isAny=b.id==='any';
              return (
                <button key={b.id} onClick={()=>onState({barber:b.id,time:null})}
                  style={{position:'relative',textAlign:'left',cursor:'pointer',background:sel?'rgba(214,195,160,0.08)':'#15130F',border:'1.5px solid '+(sel?accent:hair),borderRadius:'15px',padding:'20px',color:'#F4EFE7'}}>
                  {isAny && <span style={{position:'absolute',top:'14px',right:'14px',fontFamily:"'Oswald'",fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.08em',color:'#0E0E0E',background:accent,borderRadius:'999px',padding:'3px 10px'}}>Recommended</span>}
                  <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:'54px',height:'54px',borderRadius:'50%',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'20px',background:sel?b.color:'#1D1A15',color:sel?'#0E0E0E':b.color,border:'2px solid '+b.color}}>{b.initials}</span>
                  <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.03em',fontSize:'20px',marginTop:'14px'}}>{b.name}</div>
                  <div style={{color:'#9A9388',fontSize:'14px',marginTop:'3px'}}>{b.spec}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP: DATETIME */}
      {s.step==='datetime' && (
        <div>
          <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(26px,4vw,40px)',margin:'0 0 6px'}}>{s.reschedulingId?'Pick a new time':'Date & time'}</h2>
          <p style={{color:'#9A9388',margin:'0 0 22px'}}>{s.reschedulingId?'Pick a new slot — same service length, no extra charge.':'Open Mon–Sat, 9:00 AM – 7:00 PM. Showing only genuinely free slots for your '+durLabel(totalDur()||45)+' booking.'}</p>

          {/* Reschedule "current → new" banner: shows what's moving so there's no
              doubt this is a reschedule of an existing booking. */}
          {reb && (
            <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'10px 16px',background:'#15130F',border:'1px solid '+hair,borderRadius:'13px',padding:'14px 18px',marginBottom:'22px'}}>
              <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'15px',color:'#F4EFE7',marginRight:'4px'}}>{reb.service}</div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{textAlign:'left'}}>
                  <span style={{display:'block',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.08em',color:'#9A9388'}}>Current</span>
                  <span style={{display:'block',fontSize:'14px',color:'#9A9388',textDecoration:'line-through'}}>{dateFull(reb.date)} · {timeLabel(reb.start)}</span>
                  <span style={{display:'block',fontSize:'12px',color:'#9A9388',textDecoration:'line-through'}}>{barberById(reb.barber)?.name||'Barber'}</span>
                </span>
                <span style={{color:accent,fontSize:'18px'}}>→</span>
                <span style={{textAlign:'left'}}>
                  <span style={{display:'block',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.08em',color:accent}}>New</span>
                  <span style={{display:'block',fontSize:'14px',fontWeight:'700',color:(s.date&&s.time!=null)?accent:'#5A554E'}}>{(s.date&&s.time!=null)?`${dateFull(s.date)} · ${timeLabel(s.time)}`:'Choose below'}</span>
                  <span style={{display:'block',fontSize:'12px',color:accent}}>{selBarberName}</span>
                </span>
              </div>
            </div>
          )}

          {/* Reschedule barber picker: change who cuts you while moving the slot.
              Switching resets the chosen time since availability is per-barber. */}
          {reb && (
            <div style={{marginBottom:'22px'}}>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.12em',fontSize:'13px',color:accent,margin:'0 0 12px'}}>Barber</div>
              <div style={{display:'flex',gap:'9px',overflowX:'auto',padding:'2px'}}>
                {[{id:'any',name:'First available',initials:'★',color:accent},...BARBERS].map(b=>{
                  const sel=s.barber===b.id;
                  return (
                    <button key={b.id} onClick={()=>onState({barber:b.id,time:null})}
                      style={{flexShrink:'0',display:'flex',alignItems:'center',gap:'9px',cursor:'pointer',background:sel?'rgba(214,195,160,0.10)':'#15130F',border:'1.5px solid '+(sel?accent:hair),borderRadius:'999px',padding:'7px 14px 7px 7px',color:'#F4EFE7'}}>
                      <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:'32px',height:'32px',borderRadius:'50%',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'14px',background:sel?b.color:'#1D1A15',color:sel?'#0E0E0E':b.color,border:'2px solid '+b.color}}>{b.initials}</span>
                      <span style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.04em',fontSize:'14px',whiteSpace:'nowrap'}}>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:'10px',overflowX:'auto',padding:'4px 2px 14px',marginBottom:'8px'}}>
            {Array.from({length:14},(_,i)=>{
              const d=addDays(i); const isoStr=iso(d); const closed=d.getDay()===0; const sel=s.date===isoStr;
              return (
                <button key={isoStr} onClick={()=>{ if(!closed) onState({date:isoStr,time:null}); }}
                  disabled={closed}
                  style={{flexShrink:'0',width:'64px',cursor:closed?'not-allowed':'pointer',background:sel?'rgba(214,195,160,0.12)':'#15130F',border:'1.5px solid '+(sel?accent:hair),borderRadius:'12px',padding:'12px 0',color:sel?accent:'#F4EFE7',textAlign:'center',opacity:closed?0.4:1}}>
                  <span style={{display:'block',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.08em',color:closed?'#C46A5A':(sel?accent:'#9A9388')}}>{d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}</span>
                  <span style={{display:'block',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'22px',lineHeight:'1.1'}}>{d.getDate()}</span>
                  <span style={{display:'block',fontSize:'11px',color:closed?'#C46A5A':(sel?accent:'#9A9388')}}>{d.toLocaleDateString('en-US',{month:'short'})}</span>
                </button>
              );
            })}
          </div>
          {s.date && (
            <div>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.12em',fontSize:'13px',color:accent,margin:'18px 0 12px'}}>Available times · {selBarberName}</div>
              {slots.length===0 ? (
                <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'13px',padding:'30px',textAlign:'center',color:'#9A9388'}}>No open slots that day for this selection. Try another date or pick "First available".</div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))',gap:'9px'}}>
                  {slots.map(sl=>{
                    const sel=s.time===sl.min;
                    // Block slots that overlap a booking THIS customer already has
                    // (any barber) — they can't be in two chairs at once.
                    const selfBusy = !!findSelfClash(s.date, sl.min, totalDur());
                    const avail = sl.avail && !selfBusy;
                    return (
                      <button key={sl.min} onClick={()=>{ if(avail) onState({time:sl.min}); }} disabled={!avail}
                        title={selfBusy?'You already have a booking at this time':undefined}
                        style={{cursor:avail?'pointer':'not-allowed',background:sel?accent:'#15130F',border:'1.5px solid '+(sel?accent:hair),borderRadius:'10px',padding:'12px 4px',fontFamily:"'Oswald'",fontWeight:'500',fontSize:'15px',color:sel?'#0E0E0E':'#F4EFE7',opacity:avail?1:0.32,textDecoration:avail?'none':'line-through'}}>{timeLabel(sl.min)}</button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP: SIGNIN */}
      {s.step==='signin' && (
        <div>
          <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(26px,4vw,40px)',margin:'0 0 6px'}}>Sign in to confirm</h2>
          <p style={{color:'#9A9388',margin:'0 0 26px'}}>We keep your bookings and barber preference here. Takes a few seconds.</p>
          <div style={{maxWidth:'420px'}}>
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
                  style={{width:'100%',cursor:(s.otpInput.length!==8||s.authBusy)?'not-allowed':'pointer',opacity:(s.otpInput.length!==8||s.authBusy)?0.55:1,background:accent,color:'#0E0E0E',border:'none',borderRadius:'10px',padding:'14px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px'}}>{s.authBusy?'Verifying…':'Verify & continue'}</button>
                <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
                  <button onClick={()=>onState({authStep:'email',otpInput:'',authErr:''})}
                    style={{flex:'1',cursor:'pointer',background:'transparent',color:'#9A9388',border:'none',padding:'12px',fontSize:'14px'}}>← Change email</button>
                  <button onClick={()=>onSendOtp(s.emailInput)} disabled={s.authBusy}
                    style={{flex:'1',cursor:s.authBusy?'not-allowed':'pointer',background:'transparent',color:'#9A9388',border:'none',padding:'12px',fontSize:'14px'}}>Resend code</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* STEP: DETAILS */}
      {s.step==='details' && (
        <div>
          <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(26px,4vw,40px)',margin:'0 0 6px'}}>Your details</h2>
          <p style={{color:'#9A9388',margin:'0 0 26px'}}>So your barber knows who's coming in — and what you're after.</p>
          <div style={{maxWidth:'480px',display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <div style={{flex:'1',minWidth:'140px'}}>
                <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>First name</label>
                <input value={s.user.firstName} onChange={e=>onState(st=>({user:{...st.user,firstName:e.target.value}}))} placeholder="Juan" autoComplete="given-name"
                  style={{width:'100%',boxSizing:'border-box',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'16px'}}/>
              </div>
              <div style={{flex:'1',minWidth:'140px'}}>
                <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Last name</label>
                <input value={s.user.lastName} onChange={e=>onState(st=>({user:{...st.user,lastName:e.target.value}}))} placeholder="Dela Cruz" autoComplete="family-name"
                  style={{width:'100%',boxSizing:'border-box',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'16px'}}/>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Mobile</label>
              <input type="tel" value={s.user.mobile} onChange={e=>onState(st=>({user:{...st.user,mobile:e.target.value}}))} placeholder="0917 000 0000"
                style={{width:'100%',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'16px'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Notes for your barber <span style={{opacity:'0.6'}}>(optional)</span></label>
              <textarea value={s.notes} onChange={e=>onState({notes:e.target.value})} placeholder="e.g. skin fade, #2 sides, keep length on top" rows={3}
                style={{width:'100%',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'16px',resize:'vertical'}}/>
            </div>
          </div>
        </div>
      )}

      {/* STEP: PAYMENT */}
      {s.step==='payment' && (
        <div>
          <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(26px,4vw,40px)',margin:'0 0 6px'}}>Payment</h2>
          <p style={{color:'#9A9388',margin:'0 0 26px'}}>Pay now to lock the slot, or settle in the chair. Your choice.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'13px',maxWidth:'560px'}}>
            <button onClick={()=>{ if(onlinePayEnabled) onState({payMethod:'online'}); }} disabled={!onlinePayEnabled}
              style={{textAlign:'left',cursor:onlinePayEnabled?'pointer':'not-allowed',background:s.payMethod==='online'?'rgba(214,195,160,0.1)':'#15130F',border:'1.5px solid '+(s.payMethod==='online'?accent:hair),borderRadius:'14px',padding:'20px',color:'#F4EFE7',opacity:onlinePayEnabled?1:0.4}}>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.04em',fontSize:'18px'}}>Pay online now</div>
              <div style={{color:'#9A9388',fontSize:'14px',marginTop:'5px'}}>GCash or card · slot locked instantly{!onlinePayEnabled?' (unavailable)':''}</div>
            </button>
            <button onClick={()=>onState({payMethod:'shop'})}
              style={{textAlign:'left',cursor:'pointer',background:s.payMethod==='shop'?'rgba(214,195,160,0.1)':'#15130F',border:'1.5px solid '+(s.payMethod==='shop'?accent:hair),borderRadius:'14px',padding:'20px',color:'#F4EFE7'}}>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.04em',fontSize:'18px'}}>Pay at the shop</div>
              <div style={{color:'#9A9388',fontSize:'14px',marginTop:'5px'}}>Cash or GCash on arrival · reserves your chair</div>
            </button>
          </div>
        </div>
      )}

      {/* STEP: CONFIRMATION */}
      {s.step==='confirmation' && lb && (
        <div>
          <div style={{textAlign:'center',padding:'10px 0 4px'}}>
            <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'64px',height:'64px',borderRadius:'50%',background:'rgba(214,195,160,0.15)',border:'2px solid #D6C3A0',fontSize:'30px',color:'#D6C3A0',fontWeight:'800'}}>✓</div>
            <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(28px,5vw,46px)',margin:'18px 0 4px'}}>{s.reschedulingId===null?"You're booked.":'Rescheduled.'}</h2>
            <p style={{color:'#9A9388',margin:'0'}}>Booking reference <b style={{color:accent,fontFamily:"'Oswald'",letterSpacing:'0.05em'}}>{s.lastRef}</b></p>
          </div>
          <div style={{maxWidth:'480px',margin:'28px auto 0',background:'#15130F',border:'1px solid #2A2622',borderRadius:'16px',padding:'24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:'12px',paddingBottom:'14px',borderBottom:'1px solid #2A2622'}}>
              <span style={{color:'#9A9388'}}>Barber</span>
              <span style={{fontFamily:"'Oswald'",fontSize:'17px'}}>{barberById(lb.barber)?.name||'First available'}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',gap:'12px',padding:'14px 0',borderBottom:'1px solid #2A2622'}}>
              <span style={{color:'#9A9388'}}>When</span>
              <span style={{fontFamily:"'Oswald'",fontSize:'17px',textAlign:'right'}}>{new Date(lb.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}<br/>{timeLabel(lb.start)+' – '+timeLabel(lb.start+lb.dur)}</span>
            </div>
            <div style={{padding:'14px 0',borderBottom:'1px solid #2A2622'}}>
              <span style={{color:'#9A9388',display:'block',marginBottom:'6px'}}>Services</span>
              <span>{lb.service}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',gap:'12px',padding:'14px 0 0',alignItems:'baseline'}}>
              <span style={{color:'#9A9388'}}>{lb.pay==='online'?'Paid online':'Pay at shop'}</span>
              <span style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'24px',color:accent}}>{peso(lb.price)}</span>
            </div>
          </div>
          <div style={{maxWidth:'480px',margin:'16px auto 0',display:'flex',flexWrap:'wrap',gap:'10px',justifyContent:'center'}}>
            <button onClick={goAccount} style={{cursor:'pointer',background:'#1D1A15',color:'#F4EFE7',border:'1px solid #2A2622',borderRadius:'9px',padding:'13px 20px',fontWeight:'600',fontSize:'14px'}}>View my appointments</button>
            <button onClick={goBook} style={{cursor:'pointer',background:accent,color:'#0E0E0E',border:'none',borderRadius:'9px',padding:'13px 20px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.05em',textTransform:'uppercase',fontSize:'14px'}}>Book another</button>
          </div>
        </div>
      )}

      {/* STICKY FOOTER NAV */}
      {s.step!=='confirmation' && s.step!=='signin' && (
        <div style={{position:'fixed',left:'0',right:'0',bottom:'0',zIndex:'55',background:'rgba(14,14,14,0.92)',backdropFilter:'blur(12px)',borderTop:'1px solid #2A2622',padding:'14px clamp(16px,4vw,32px)'}}>
          <div style={{maxWidth:'880px',margin:'0 auto',display:'flex',alignItems:'center',gap:'14px'}}>
            <button onClick={onBack} style={{cursor:'pointer',background:'transparent',color:'#F4EFE7',border:'1px solid #2A2622',borderRadius:'9px',padding:'13px 18px',fontWeight:'600',fontSize:'15px',flexShrink:'0'}}>← Back</button>
            <div style={{flex:'1',textAlign:'right',lineHeight:'1.2'}}>
              <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'22px',color:accent}}>{peso(totalPrice())}</div>
              <div style={{color:'#9A9388',fontSize:'12px'}}>{totalDur()?('approx. '+durLabel(totalDur())+' in the chair'):'select services'}</div>
            </div>
            <button onClick={onContinue} disabled={disabled}
              style={{cursor:disabled?'not-allowed':'pointer',background:disabled?'#6b645b':accent,color:'#0E0E0E',border:'none',borderRadius:'9px',padding:'14px 26px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px',flexShrink:'0',opacity:disabled?0.45:1}}>{cont}</button>
          </div>
        </div>
      )}

      {/* ALREADY-BOOKED POPUP — centered modal shown when this signed-in customer
          lands on the service step with an active upcoming booking and isn't
          mid-reschedule. Dismiss to book another, or jump into rescheduling.
          Portaled to <body> so the fixed overlay anchors to the viewport (centered
          on screen regardless of scroll), not to the animated <main> container. */}
      {s.step==='service' && !s.reschedulingId && activeBookings.length>0 && !warnDismissed && createPortal((
        <div style={{position:'fixed',inset:'0',zIndex:'180',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div onClick={()=>setWarnDismissed(true)} style={{position:'absolute',inset:'0',background:'rgba(0,0,0,0.65)',animation:'gbback 0.18s ease both'}}></div>
          <div role="dialog" aria-modal="true" aria-label="You already have upcoming bookings"
            style={{position:'relative',width:'min(460px,94vw)',maxHeight:'88vh',overflowY:'auto',background:'#15130F',border:'1px solid '+hair,borderRadius:'16px',padding:'clamp(22px,4vw,30px)',boxShadow:'0 20px 60px rgba(0,0,0,0.55)',animation:'gbfade 0.2s ease both'}}>
            <button onClick={()=>setWarnDismissed(true)} aria-label="Close"
              style={{position:'absolute',top:'12px',right:'12px',background:'transparent',border:'none',color:'#9A9388',cursor:'pointer',fontSize:'22px',lineHeight:'1',padding:'4px 8px'}}>×</button>
            <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'12px',color:accent,marginBottom:'8px'}}>Heads up</div>
            <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(22px,4vw,30px)',margin:'0 0 6px',lineHeight:'1.05'}}>{activeBookings.length===1?'You already have a booking':`You already have ${activeBookings.length} bookings`}</h2>
            <p style={{color:'#9A9388',margin:'0 0 16px',fontSize:'14px'}}>Here's everything upcoming. Want to change the time of one instead of making a new booking?</p>
            <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'18px'}}>
              {activeBookings.map(b=>(
                <div key={b.id} style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'12px',background:'#1D1A15',border:'1px solid '+hair,borderRadius:'12px',padding:'14px 16px'}}>
                  <div style={{flex:'1',minWidth:'160px'}}>
                    <div style={{fontFamily:"'Oswald'",fontSize:'17px'}}>{new Date(b.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · {timeLabel(b.start)}</div>
                    <div style={{color:'#9A9388',fontSize:'14px',marginTop:'3px'}}>{b.service} · with {barberById(b.barber)?.name||'First available'}</div>
                  </div>
                  <button onClick={()=>goReschedule(b)} style={{flexShrink:'0',cursor:'pointer',background:accent,color:'#0E0E0E',border:'none',borderRadius:'9px',padding:'10px 16px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.04em',textTransform:'uppercase',fontSize:'13px'}}>Reschedule</button>
                </div>
              ))}
            </div>
            <button onClick={()=>setWarnDismissed(true)} style={{width:'100%',cursor:'pointer',background:'transparent',color:'#F4EFE7',border:'1px solid '+hair,borderRadius:'10px',padding:'14px',fontWeight:'600',fontSize:'14px'}}>Book another</button>
          </div>
        </div>
      ), document.body)}

      {/* SELF-CLASH (TROLL) WARNING — fires at the confirm step when the customer
          tries to book a slot that overlaps a booking they already have, with any
          barber (you can't be in two chairs at once). Options: jump to reschedule
          the existing one, go back and pick another time, or override and book
          anyway. Portaled to <body> so it's screen-centered. */}
      {clashBooking && createPortal((
        <div style={{position:'fixed',inset:'0',zIndex:'190',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div onClick={()=>setClashBooking(null)} style={{position:'absolute',inset:'0',background:'rgba(0,0,0,0.65)',animation:'gbback 0.18s ease both'}}></div>
          <div role="dialog" aria-modal="true" aria-label="Booking time clash"
            style={{position:'relative',width:'min(460px,94vw)',maxHeight:'88vh',overflowY:'auto',background:'#15130F',border:'1px solid #C2553B',borderRadius:'16px',padding:'clamp(22px,4vw,30px)',boxShadow:'0 20px 60px rgba(0,0,0,0.55)',animation:'gbfade 0.2s ease both'}}>
            <button onClick={()=>setClashBooking(null)} aria-label="Close"
              style={{position:'absolute',top:'12px',right:'12px',background:'transparent',border:'none',color:'#9A9388',cursor:'pointer',fontSize:'22px',lineHeight:'1',padding:'4px 8px'}}>×</button>
            <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'12px',color:'#E08A6E',marginBottom:'8px'}}>Time clash</div>
            <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(22px,4vw,30px)',margin:'0 0 10px',lineHeight:'1.05'}}>You can't be in two chairs at once</h2>
            <p style={{color:'#9A9388',margin:'0 0 14px',fontSize:'14px'}}>This overlaps a booking you already have:</p>
            <div style={{background:'#1D1A15',border:'1px solid '+hair,borderRadius:'12px',padding:'14px 16px',marginBottom:'12px'}}>
              <div style={{fontFamily:"'Oswald'",fontSize:'17px'}}>{new Date(clashBooking.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · {timeLabel(clashBooking.start)}</div>
              <div style={{color:'#9A9388',fontSize:'14px',marginTop:'3px'}}>{clashBooking.service} · with {barberById(clashBooking.barber)?.name||'First available'}</div>
            </div>
            <p style={{color:'#9A9388',margin:'0 0 20px',fontSize:'14px'}}>You're trying to book {timeLabel(s.time)} with {selBarberName}.</p>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <button onClick={()=>{ setClashBooking(null); goReschedule(clashBooking); }} style={{width:'100%',cursor:'pointer',background:accent,color:'#0E0E0E',border:'none',borderRadius:'10px',padding:'14px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.05em',textTransform:'uppercase',fontSize:'14px'}}>Reschedule that booking instead</button>
              <button onClick={()=>{ setClashBooking(null); onState({step:'datetime',time:null}); window.scrollTo({top:0}); }} style={{width:'100%',cursor:'pointer',background:'#1D1A15',color:'#F4EFE7',border:'1px solid '+hair,borderRadius:'10px',padding:'14px',fontWeight:'600',fontSize:'14px'}}>Pick a different time</button>
            </div>
          </div>
        </div>
      ), document.body)}
    </main>
  );
}
