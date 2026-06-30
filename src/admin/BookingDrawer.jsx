import { useState } from 'react';
import { barberById, statusMeta, tint, ticketOf, timeLabel, durLabel, peso, genSlots, firstFree, iso, todayDate } from '../helpers';
import { PHONES, BARBERS } from '../data';

export default function BookingDrawer({ bookings, drawerId, closeDrawer, setBookingStatus, toggleFollowUp, onUpdateBooking, onCheckIn, user, showConfirm, startEdit, openEditN, custPhones = {} }) {
  const [editing, setEditing] = useState(false);
  const [rDate, setRDate] = useState(null);
  const [rBarber, setRBarber] = useState('any');
  const [rTime, setRTime] = useState(null);
  // Reset the editor whenever a different booking is opened (adjust-state-during-render).
  const [shownId, setShownId] = useState(drawerId);
  const [prevEditN, setPrevEditN] = useState(openEditN);
  const [didMountEdit, setDidMountEdit] = useState(false);
  if(drawerId !== shownId){ setShownId(drawerId); setEditing(false); setRDate(null); setRTime(null); }

  if(!drawerId) return null;
  const db = bookings.find(x=>x.id===drawerId);
  if(!db) return null;

  const bar = barberById(db.barber);
  const m = statusMeta(db.status);
  const d = new Date(db.date+'T00:00:00');
  const fol = db.followUp ?? false;
  const accent = '#D6C3A0';
  const todayIso = iso(todayDate());

  const beginEdit = () => { setRDate(db.date); setRBarber(db.barber); setRTime(db.start); setEditing(true); };
  // Open the editor when the reschedule toast link is clicked (drawer already open)...
  if(openEditN !== prevEditN){ setPrevEditN(openEditN); beginEdit(); }
  // ...or when the drawer was opened directly in edit mode (from the link, after a remount).
  if(startEdit && !didMountEdit){ setDidMountEdit(true); beginEdit(); }

  // Reschedule editor: slots for the picked date/barber, excluding this booking.
  const eDate = rDate || db.date;
  const eBarber = rBarber === 'any' ? db.barber : rBarber;
  const slots = editing ? genSlots(bookings, eDate, rBarber, db.dur, 0, db.id) : [];

  const saveReschedule = () => {
    const assigned = rBarber === 'any' ? (firstFree(bookings, eDate, rTime, db.dur, db.id) || db.barber) : eBarber;
    onUpdateBooking(db.id, { date: eDate, start: rTime, barber: assigned, status: 'booked' });
    setEditing(false);
  };

  const setDrawerStatus = (val) => {
    if(val==='no-show'||val==='cancelled'){
      showConfirm(
        "Mark "+db.customer+"'s booking as "+(val==='no-show'?'a No Show':'cancelled')+'?',
        ()=>setBookingStatus(db.id, val),
        { title:'Update booking', confirmText: val==='no-show'?'Mark No Show':'Cancel booking', cancelText:'Keep', danger:true }
      );
      return;
    }
    if(val==='checked-in'){ onCheckIn(db.id); return; } // also stamps the check-in time
    setBookingStatus(db.id, val);
  };

  const STATUS_ORDER = ['booked','checked-in','in-progress','completed','no-show','cancelled'];
  const mk = (val) => { const meta=statusMeta(val); const color=meta.color; return {
    label: meta.label, val, color,
    bg: db.status===val ? tint(color,0.18) : '#1D1A15',
    border: db.status===val ? color : '#2A2622',
    textColor: db.status===val ? color : '#9A9388'
  }; };
  const statuses = STATUS_ORDER.map(mk);
  const checkInLabel = db.checkedInAt ? new Date(db.checkedInAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : null;
  const phone = custPhones[(db.email||'').toLowerCase()]||PHONES[db.customer]||(db.mine&&user?.mobile)||'No number';

  return (
    <div style={{position:'fixed',inset:'0',zIndex:'90',display:'flex',justifyContent:'flex-end'}}>
      <div onClick={closeDrawer} style={{position:'absolute',inset:'0',background:'rgba(0,0,0,0.55)',animation:'gbback 0.2s ease both'}}></div>
      <div style={{position:'relative',width:'min(440px,94vw)',height:'100%',overflowY:'auto',background:'#15130F',borderLeft:'1px solid #2A2622',animation:'gbslide 0.26s cubic-bezier(0.22,1,0.36,1) both'}}>
        <div style={{position:'sticky',top:'0',zIndex:'2',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 22px',background:'#15130F',borderBottom:'1px solid #2A2622'}}>
          <div>
            <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'11px',color:accent}}>Booking {ticketOf(bookings,db.id)}</div>
            <div style={{fontSize:'11px',color:'#9A9388'}}>Tap a status to update</div>
          </div>
          <button onClick={closeDrawer} style={{cursor:'pointer',background:'#1D1A15',border:'1px solid #2A2622',color:'#F4EFE7',borderRadius:'8px',width:'34px',height:'34px',fontSize:'18px'}}>✕</button>
        </div>
        <div style={{padding:'22px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px'}}>
            <span style={{flexShrink:'0',width:'52px',height:'52px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'18px',color:accent,background:'#1D1A15',border:'1px solid #2A2622'}}>
              {db.customer.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
            </span>
            <div style={{flex:'1',minWidth:'0'}}>
              <div style={{fontFamily:"'Oswald'",fontSize:'21px',lineHeight:'1.1'}}>{db.customer}</div>
              <div style={{fontSize:'13.5px',color:'#9A9388'}}>{phone}</div>
            </div>
            <span style={{flexShrink:'0',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.04em',fontWeight:'700',color:m.color,background:tint(m.color,0.16),borderRadius:'6px',padding:'5px 10px'}}>{m.label}</span>
          </div>

          {db.status==='booked' && (
            <button onClick={()=>onCheckIn(db.id)}
              style={{cursor:'pointer',width:'100%',background:'#6FA886',color:'#0E0E0E',border:'none',borderRadius:'10px',padding:'13px',fontWeight:'700',fontSize:'14px',marginBottom:'16px'}}>✓ Check in customer</button>
          )}
          {checkInLabel && (
            <div style={{display:'flex',alignItems:'center',gap:'8px',background:tint('#6FA886',0.12),border:'1px solid '+tint('#6FA886',0.4),borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'13.5px',color:'#C9C3B8'}}>
              <span style={{color:'#6FA886',fontWeight:'700'}}>✓</span> Checked in at <b style={{color:'#F4EFE7',fontWeight:'600'}}>{checkInLabel}</b>
            </div>
          )}

          <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'11px',color:'#9A9388',marginBottom:'9px'}}>Change status</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'22px'}}>
            {statuses.map(st=>(
              <button key={st.val} onClick={()=>setDrawerStatus(st.val)}
                style={{cursor:'pointer',background:st.bg,border:'1.5px solid '+st.border,color:st.textColor,borderRadius:'9px',padding:'11px',fontWeight:'600',fontSize:'13.5px'}}>{st.label}</button>
            ))}
          </div>

          {/* RESCHEDULE */}
          {!editing && (
            <button onClick={beginEdit}
              style={{cursor:'pointer',width:'100%',background:'#1D1A15',border:'1px solid #2A2622',color:accent,borderRadius:'10px',padding:'12px',fontWeight:'600',fontSize:'13.5px',marginBottom:'22px'}}>
              ↻ Reschedule booking
            </button>
          )}
          {editing && (
            <div style={{background:'#1D1A15',border:'1px solid '+accent,borderRadius:'12px',padding:'16px',marginBottom:'22px'}}>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'11px',color:accent,marginBottom:'12px'}}>Reschedule</div>

              <div style={{fontSize:'12px',color:'#9A9388',marginBottom:'6px'}}>Date</div>
              <input type="date" value={eDate} min={todayIso}
                onChange={e=>{ setRDate(e.target.value); setRTime(null); }}
                style={{colorScheme:'dark',width:'100%',boxSizing:'border-box',background:'#15130F',border:'1px solid #2A2622',color:'#F4EFE7',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',marginBottom:'14px'}} />

              <div style={{fontSize:'12px',color:'#9A9388',marginBottom:'6px'}}>Barber</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'14px'}}>
                {[{id:'any',name:'First available'},...BARBERS].map(b=>(
                  <button key={b.id} onClick={()=>{ setRBarber(b.id); setRTime(null); }}
                    style={{cursor:'pointer',background:rBarber===b.id?tint(accent,0.18):'#15130F',border:'1.5px solid '+(rBarber===b.id?accent:'#2A2622'),color:rBarber===b.id?accent:'#9A9388',borderRadius:'8px',padding:'7px 11px',fontSize:'12.5px',fontWeight:'600'}}>{b.name}</button>
                ))}
              </div>

              <div style={{fontSize:'12px',color:'#9A9388',marginBottom:'6px'}}>Time</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px',marginBottom:'16px',maxHeight:'168px',overflowY:'auto'}}>
                {slots.length===0 && <div style={{gridColumn:'1 / -1',fontSize:'13px',color:'#9A9388',padding:'6px 0'}}>No open slots that day.</div>}
                {slots.map(sl=>(
                  <button key={sl.min} disabled={!sl.avail} onClick={()=>setRTime(sl.min)}
                    style={{cursor:sl.avail?'pointer':'not-allowed',background:rTime===sl.min?accent:'#15130F',border:'1.5px solid '+(rTime===sl.min?accent:'#2A2622'),color:rTime===sl.min?'#0E0E0E':(sl.avail?'#F4EFE7':'#5a554d'),borderRadius:'8px',padding:'9px 4px',fontSize:'12.5px',fontWeight:'600',opacity:sl.avail?1:0.5}}>{timeLabel(sl.min)}</button>
                ))}
              </div>

              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={()=>setEditing(false)}
                  style={{cursor:'pointer',flex:'1',background:'#15130F',border:'1px solid #2A2622',color:'#F4EFE7',borderRadius:'9px',padding:'11px',fontWeight:'600',fontSize:'13.5px'}}>Cancel</button>
                <button onClick={saveReschedule} disabled={rTime==null}
                  style={{cursor:rTime==null?'not-allowed':'pointer',flex:'1',background:rTime==null?'#2A2622':accent,border:'none',color:rTime==null?'#9A9388':'#0E0E0E',borderRadius:'9px',padding:'11px',fontWeight:'700',fontSize:'13.5px'}}>Save new time</button>
              </div>
            </div>
          )}

          <div style={{background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'12px',padding:'4px 16px',marginBottom:'16px'}}>
            {[
              ['Service',db.service],
              ['Barber',<span style={{display:'flex',alignItems:'center',gap:'7px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:bar?.color||'#9A9388'}}></span>{bar?.name||'First available'}</span>],
              ['When',<span style={{textAlign:'right'}}>{d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}<br/>{timeLabel(db.start)+' – '+timeLabel(db.start+db.dur)}</span>],
              ['Duration',durLabel(db.dur)],
              ['Payment',db.pay==='online'?'Paid online':'Pay at shop'],
            ].map(([label,val],i,arr)=>(
              <div key={label} style={{display:'flex',justifyContent:'space-between',gap:'12px',padding:'11px 0',borderBottom:i<arr.length-1?'1px solid #2A2622':'none',alignItems:'center'}}>
                <span style={{color:'#9A9388',fontSize:'13.5px'}}>{label}</span>
                <span style={{fontSize:'14px',textAlign:'right'}}>{val}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',gap:'12px',padding:'11px 0',alignItems:'baseline'}}>
              <span style={{color:'#9A9388',fontSize:'13.5px'}}>Total</span>
              <span style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'22px',color:accent}}>{peso(db.price)}</span>
            </div>
          </div>

          <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'11px',color:'#9A9388',marginBottom:'7px'}}>Customer notes</div>
          <div style={{background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'12px',padding:'13px 15px',fontSize:'14px',color:'#D9D3C9',lineHeight:'1.5',marginBottom:'16px'}}>{db.notes||'No notes on this booking.'}</div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'12px',padding:'13px 15px'}}>
            <div>
              <div style={{fontSize:'14px',fontWeight:'600'}}>Flag for follow-up</div>
              <div style={{fontSize:'12px',color:'#9A9388'}}>Re-book reminder after this visit</div>
            </div>
            <button onClick={()=>toggleFollowUp(db.id)}
              style={{cursor:'pointer',flexShrink:'0',position:'relative',width:'42px',height:'24px',borderRadius:'999px',border:'none',background:fol?accent:'#2A2622'}}>
              <span style={{position:'absolute',top:'2px',left:fol?'19px':'2px',width:'20px',height:'20px',borderRadius:'50%',background:'#0E0E0E',transition:'left 0.15s'}}></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
