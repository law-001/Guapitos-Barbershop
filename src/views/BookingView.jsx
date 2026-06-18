import { SERVICES, CATS, BARBERS } from '../data';
import { durLabel, timeLabel, peso, svcById, barberById, genSlots, iso, todayDate, addDays } from '../helpers';

export default function BookingView({ state, goHome, goAccount, goBook, onState, leadHours=1, cancelCutoffHours=2, onlinePayEnabled=true }) {
  const s = state;
  const accent='#D6C3A0', hair='#2A2622';

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
    if(s.step==='details') return !(s.user.name.trim() && s.user.mobile.trim());
    if(s.step==='payment') return !s.payMethod;
    return false;
  };
  const disabled = continueDisabled();

  const onContinue = () => {
    if(disabled) return;
    if(s.step==='datetime' && s.reschedulingId){ saveReschedule(); return; }
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

  const firstFreeLocal = (date,start,dur,excludeId) => {
    for(const b of BARBERS){
      const end=start+dur;
      const conflicts = s.bookings.filter(bk=>bk.barber===b.id && bk.date===date && bk.status!=='cancelled' && bk.id!==excludeId);
      if(!conflicts.some(bk=>start<bk.start+bk.dur && end>bk.start)) return b.id;
    }
    return null;
  };

  const finalize = () => {
    const dur=totalDur();
    const assigned = s.barber==='any' ? firstFreeLocal(s.date,s.time,dur,null) : s.barber;
    const ref='GB-'+Math.random().toString(36).slice(2,7).toUpperCase();
    const names=s.cart.map(id=>svcById(id).name);
    const bk={id:'u'+Date.now(),date:s.date,start:s.time,dur,barber:assigned,service:names.join(' + '),price:totalPrice(),customer:s.user.name||'You',status:'confirmed',mine:true,pay:s.payMethod,notes:s.notes,followUp:false};
    onState(st=>({bookings:[...st.bookings,bk],lastRef:ref,lastBooking:bk,step:'confirmation'}));
    window.scrollTo({top:0});
  };

  const saveReschedule = () => {
    const id=s.reschedulingId; const dur=totalDur();
    const assigned = s.barber==='any' ? firstFreeLocal(s.date,s.time,dur,id) : s.barber;
    const ref='GB-'+Math.random().toString(36).slice(2,7).toUpperCase();
    onState(st=>{
      const bookings=st.bookings.map(b=>b.id===id?{...b,date:s.date,start:s.time,barber:assigned,status:'confirmed'}:b);
      const updated=bookings.find(b=>b.id===id);
      return {bookings,reschedulingId:null,lastRef:ref,lastBooking:updated,step:'confirmation'};
    });
    window.scrollTo({top:0});
  };

  const today = todayDate();
  const todayIso = iso(today);
  const slots = genSlots(s.bookings, s.date, s.barber, totalDur(), leadHours, s.reschedulingId);

  const cont = {service:'Continue',barber:'Continue',datetime:s.reschedulingId?'Confirm new time':'Continue',signin:'Continue',details:'Continue',
    payment:s.payMethod==='online'?'Pay & confirm':'Reserve appointment'}[s.step]||'Continue';

  const lb = s.lastBooking;
  const selBarberName = s.barber==='any'?'First available barber':(barberById(s.barber)?.name||'');

  return (
    <main style={{maxWidth:'880px',margin:'0 auto',padding:'clamp(20px,4vw,40px) clamp(16px,4vw,32px) 140px',animation:'gbfade 0.4s ease both'}}>
      {/* Progress */}
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
          <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(26px,4vw,40px)',margin:'0 0 6px'}}>Date &amp; time</h2>
          <p style={{color:'#9A9388',margin:'0 0 22px'}}>{s.reschedulingId?'Pick a new slot — same service length, no extra charge.':'Open Mon–Sat, 10:00 AM – 8:00 PM. Showing only genuinely free slots for your '+durLabel(totalDur()||45)+' booking.'}</p>
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
                    return (
                      <button key={sl.min} onClick={()=>{ if(sl.avail) onState({time:sl.min}); }} disabled={!sl.avail}
                        style={{cursor:sl.avail?'pointer':'not-allowed',background:sel?accent:'#15130F',border:'1.5px solid '+(sel?accent:hair),borderRadius:'10px',padding:'12px 4px',fontFamily:"'Oswald'",fontWeight:'500',fontSize:'15px',color:sel?'#0E0E0E':'#F4EFE7',opacity:sl.avail?1:0.32,textDecoration:sl.avail?'none':'line-through'}}>{timeLabel(sl.min)}</button>
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
            {s.authStep==='choose' && (
              <>
                <button onClick={()=>onState(st=>({user:{...st.user,signedIn:true,name:st.user.name||'Diego Ramos',mobile:st.user.mobile||'0917 555 0142'},step:'details'}))}
                  style={{width:'100%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',background:'#F4EFE7',color:'#1a1a1a',border:'none',borderRadius:'10px',padding:'15px',fontWeight:'700',fontSize:'16px',marginBottom:'12px'}}>
                  <span style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'18px',color:'#4285F4'}}>G</span> Continue with Google
                </button>
                <button onClick={()=>onState({authStep:'phone'})}
                  style={{width:'100%',cursor:'pointer',background:'#1D1A15',color:'#F4EFE7',border:'1px solid #2A2622',borderRadius:'10px',padding:'15px',fontWeight:'600',fontSize:'16px'}}>Continue with phone (OTP)</button>
              </>
            )}
            {s.authStep==='phone' && (
              <>
                <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Mobile number</label>
                <input type="tel" value={s.phoneInput} onChange={e=>onState({phoneInput:e.target.value})} placeholder="0917 000 0000"
                  style={{width:'100%',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'16px',marginBottom:'12px'}}/>
                <button onClick={()=>{ if(s.phoneInput.trim()) onState({authStep:'otp'}); }}
                  style={{width:'100%',cursor:'pointer',background:accent,color:'#0E0E0E',border:'none',borderRadius:'10px',padding:'14px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px'}}>Send code</button>
              </>
            )}
            {s.authStep==='otp' && (
              <>
                <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Enter the 4-digit code sent to {s.phoneInput||'your phone'}</label>
                <input type="tel" value={s.otpInput} onChange={e=>onState({otpInput:e.target.value})} placeholder="• • • •"
                  style={{width:'100%',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'24px',letterSpacing:'0.5em',textAlign:'center',marginBottom:'12px'}}/>
                <button onClick={()=>onState(st=>({user:{...st.user,signedIn:true,mobile:st.phoneInput},step:'details'}))}
                  style={{width:'100%',cursor:'pointer',background:accent,color:'#0E0E0E',border:'none',borderRadius:'10px',padding:'14px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px'}}>Verify &amp; continue</button>
                <button onClick={()=>onState({authStep:'phone',otpInput:''})}
                  style={{width:'100%',cursor:'pointer',background:'transparent',color:'#9A9388',border:'none',padding:'12px',fontSize:'14px'}}>← Use a different number</button>
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
            <div>
              <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Name</label>
              <input value={s.user.name} onChange={e=>onState(st=>({user:{...st.user,name:e.target.value}}))} placeholder="Your name"
                style={{width:'100%',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'14px',color:'#F4EFE7',fontSize:'16px'}}/>
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
    </main>
  );
}
