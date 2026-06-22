import { useState } from 'react';
import { SERVICES, CATS, BARBERS, OPEN, CLOSE } from '../data';
import { iso, todayDate, addDays, timeLabel, durLabel, peso, svcById, barberById, slotFree, firstFree, nowMin, genId } from '../helpers';

export default function AdminNewBookingDrawer({ bookings, onClose, onConfirm }) {
  const accent = '#D6C3A0';
  const hair = '#2A2622';
  const surf = '#15130F';
  const surf2 = '#1D1A15';
  const muted = '#9A9388';

  const [cart, setCart] = useState([]);
  const [barber, setBarber] = useState('any');
  const [date, setDate] = useState(iso(todayDate()));
  const [time, setTime] = useState(null);
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [payMethod, setPayMethod] = useState('shop');

  const totalDur = cart.reduce((s, id) => s + (svcById(id)?.dur || 0), 0) || 45;
  const totalPrice = cart.reduce((s, id) => s + (svcById(id)?.price || 0), 0);

  const toggleSvc = id => {
    setCart(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
    setTime(null);
  };

  // Generate time slots for selected date/barber
  const slots = (() => {
    if(!date) return [];
    const todayIso = iso(todayDate());
    const isToday = date === todayIso;
    const minStart = isToday ? nowMin() : 0;
    const out = [];
    for(let t = OPEN; t + totalDur <= CLOSE; t += 30) {
      if(t < minStart) continue;
      const avail = barber === 'any'
        ? firstFree(bookings, date, t, totalDur) != null
        : slotFree(bookings, barber, date, t, totalDur);
      out.push({ min: t, avail });
    }
    return out;
  })();

  const canConfirm = cart.length > 0 && date && time != null && customer.trim();

  const handleConfirm = () => {
    if(!canConfirm) return;
    const dur = totalDur;
    const assigned = barber === 'any' ? firstFree(bookings, date, time, dur) : barber;
    const names = cart.map(id => svcById(id).name);
    const bk = {
      id: genId('a'),
      date,
      start: time,
      dur,
      barber: assigned,
      service: names.join(' + '),
      price: totalPrice,
      customer: customer.trim() || 'Walk-in',
      status: 'booked',
      mine: false,
      pay: payMethod,
      notes,
      followUp: false,
    };
    onConfirm(bk);
  };

  const sectionLabel = txt => (
    <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.12em',fontSize:'12px',color:accent,marginBottom:'10px',marginTop:'22px'}}>{txt}</div>
  );

  return (
    <div style={{position:'fixed',inset:'0',zIndex:'90',display:'flex',justifyContent:'flex-end'}}>
      <div onClick={onClose} style={{position:'absolute',inset:'0',background:'rgba(0,0,0,0.55)',animation:'gbback 0.2s ease both'}}></div>
      <div style={{position:'relative',width:'min(480px,96vw)',height:'100%',display:'flex',flexDirection:'column',background:surf,borderLeft:'1px solid '+hair,animation:'gbslide 0.26s cubic-bezier(0.22,1,0.36,1) both'}}>

        {/* Header */}
        <div style={{flexShrink:'0',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 22px',borderBottom:'1px solid '+hair}}>
          <div>
            <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'11px',color:accent}}>New Booking</div>
            <div style={{fontSize:'11px',color:muted}}>Staff entry — all fields required except notes</div>
          </div>
          <button onClick={onClose} style={{cursor:'pointer',background:surf2,border:'1px solid '+hair,color:'#F4EFE7',borderRadius:'8px',width:'34px',height:'34px',fontSize:'18px'}}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{flex:'1',overflowY:'auto',padding:'0 22px 120px'}}>

          {/* SERVICES */}
          {sectionLabel('Services')}
          {CATS.map(cat => (
            <div key={cat} style={{marginBottom:'14px'}}>
              <div style={{fontSize:'12px',color:muted,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'7px'}}>{cat}</div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {SERVICES.filter(x => x.cat === cat).map(x => {
                  const sel = cart.includes(x.id);
                  return (
                    <button key={x.id} onClick={() => toggleSvc(x.id)}
                      style={{textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'11px',background:sel?'rgba(214,195,160,0.08)':surf2,border:'1.5px solid '+(sel?accent:hair),borderRadius:'10px',padding:'10px 13px',color:'#F4EFE7'}}>
                      <span style={{flexShrink:'0',width:'18px',height:'18px',borderRadius:'5px',border:'1.5px solid '+(sel?accent:hair),background:sel?accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#0E0E0E',fontSize:'12px',fontWeight:'800'}}>{sel?'✓':''}</span>
                      <span style={{flex:'1',minWidth:'0'}}>
                        <span style={{display:'block',fontWeight:'600',fontSize:'13.5px'}}>{x.name}{x.sub && <span style={{color:muted,fontWeight:'400'}}> — {x.sub}</span>}</span>
                        <span style={{color:muted,fontSize:'12px'}}>{durLabel(x.dur)}</span>
                      </span>
                      <span style={{fontFamily:"'Oswald'",fontWeight:'600',fontSize:'15px',color:accent,flexShrink:'0'}}>{peso(x.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* BARBER */}
          {sectionLabel('Barber')}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {[{id:'any',name:'First available',initials:'★',color:accent},...BARBERS].map(b => {
              const sel = barber === b.id;
              return (
                <button key={b.id} onClick={() => { setBarber(b.id); setTime(null); }}
                  style={{textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',background:sel?'rgba(214,195,160,0.08)':surf2,border:'1.5px solid '+(sel?accent:hair),borderRadius:'10px',padding:'10px 12px',color:'#F4EFE7'}}>
                  <span style={{flexShrink:'0',width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'11px',background:sel?b.color:surf,color:sel?'#0E0E0E':b.color,border:'1.5px solid '+b.color}}>{b.initials}</span>
                  <span style={{flex:'1',minWidth:'0',fontSize:'13px',fontWeight:'600',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.name}</span>
                </button>
              );
            })}
          </div>

          {/* DATE */}
          {sectionLabel('Date')}
          <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'6px'}}>
            {Array.from({length: 14}, (_, i) => {
              const d = addDays(i);
              const dIso = iso(d);
              const closed = d.getDay() === 0;
              const sel = date === dIso;
              return (
                <button key={dIso} onClick={() => { if(!closed){ setDate(dIso); setTime(null); } }}
                  disabled={closed}
                  style={{flexShrink:'0',width:'58px',cursor:closed?'not-allowed':'pointer',background:sel?'rgba(214,195,160,0.12)':surf2,border:'1.5px solid '+(sel?accent:hair),borderRadius:'10px',padding:'10px 0',textAlign:'center',opacity:closed?0.4:1}}>
                  <span style={{display:'block',fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.06em',color:closed?'#C46A5A':(sel?accent:muted)}}>{d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}</span>
                  <span style={{display:'block',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'20px',lineHeight:'1.1',color:sel?accent:'#F4EFE7'}}>{d.getDate()}</span>
                  <span style={{display:'block',fontSize:'10px',color:closed?'#C46A5A':(sel?accent:muted)}}>{d.toLocaleDateString('en-US',{month:'short'})}</span>
                </button>
              );
            })}
          </div>

          {/* TIME */}
          {date && (
            <>
              {sectionLabel('Time · ' + (barber === 'any' ? 'First available' : barberById(barber)?.name || ''))}
              {slots.length === 0 ? (
                <div style={{background:surf2,border:'1px solid '+hair,borderRadius:'10px',padding:'20px',textAlign:'center',color:muted,fontSize:'13.5px'}}>No open slots that day for this selection.</div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(88px,1fr))',gap:'7px'}}>
                  {slots.map(sl => {
                    const sel = time === sl.min;
                    return (
                      <button key={sl.min} onClick={() => { if(sl.avail) setTime(sl.min); }}
                        disabled={!sl.avail}
                        style={{cursor:sl.avail?'pointer':'not-allowed',background:sel?accent:surf2,border:'1.5px solid '+(sel?accent:hair),borderRadius:'9px',padding:'10px 4px',fontFamily:"'Oswald'",fontWeight:'500',fontSize:'14px',color:sel?'#0E0E0E':'#F4EFE7',opacity:sl.avail?1:0.3,textDecoration:sl.avail?'none':'line-through'}}>
                        {timeLabel(sl.min)}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* CUSTOMER */}
          {sectionLabel('Customer name')}
          <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Full name or Walk-in"
            style={{width:'100%',background:surf2,border:'1px solid '+hair,borderRadius:'10px',padding:'12px 14px',color:'#F4EFE7',fontSize:'15px'}}/>

          {/* NOTES */}
          {sectionLabel('Notes (optional)')}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. skin fade, scissor on top…" rows={2}
            style={{width:'100%',background:surf2,border:'1px solid '+hair,borderRadius:'10px',padding:'12px 14px',color:'#F4EFE7',fontSize:'14px',resize:'vertical'}}/>

          {/* PAYMENT */}
          {sectionLabel('Payment method')}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {[['shop','Pay at shop','Cash or GCash on arrival'],['online','Paid online','GCash / card — already settled']].map(([val,label,sub]) => (
              <button key={val} onClick={() => setPayMethod(val)}
                style={{textAlign:'left',cursor:'pointer',background:payMethod===val?'rgba(214,195,160,0.08)':surf2,border:'1.5px solid '+(payMethod===val?accent:hair),borderRadius:'10px',padding:'12px 14px',color:'#F4EFE7'}}>
                <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.04em',fontSize:'14px'}}>{label}</div>
                <div style={{color:muted,fontSize:'12px',marginTop:'3px'}}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{flexShrink:'0',position:'absolute',bottom:'0',left:'0',right:'0',background:'rgba(21,19,15,0.96)',backdropFilter:'blur(12px)',borderTop:'1px solid '+hair,padding:'14px 22px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{flex:'1',lineHeight:'1.2'}}>
            <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'22px',color:accent}}>{peso(totalPrice)}</div>
            <div style={{color:muted,fontSize:'12px'}}>{cart.length > 0 ? 'approx. '+durLabel(totalDur)+' in the chair' : 'select a service'}</div>
          </div>
          <button onClick={onClose} style={{cursor:'pointer',background:'transparent',color:'#F4EFE7',border:'1px solid '+hair,borderRadius:'9px',padding:'12px 18px',fontWeight:'600',fontSize:'14px',flexShrink:'0'}}>Cancel</button>
          <button onClick={handleConfirm} disabled={!canConfirm}
            style={{cursor:canConfirm?'pointer':'not-allowed',background:canConfirm?accent:'#6b645b',color:'#0E0E0E',border:'none',borderRadius:'9px',padding:'13px 22px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.05em',textTransform:'uppercase',fontSize:'14px',flexShrink:'0',opacity:canConfirm?1:0.5}}>
            Create booking
          </button>
        </div>
      </div>
    </div>
  );
}
