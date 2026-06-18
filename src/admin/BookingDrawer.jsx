import { barberById, statusMeta, tint, ticketOf, timeLabel, durLabel, peso } from '../helpers';
import { PHONES } from '../data';

export default function BookingDrawer({ bookings, drawerId, closeDrawer, setBookingStatus, toggleFollowUp, user }) {
  if(!drawerId) return null;
  const db = bookings.find(x=>x.id===drawerId);
  if(!db) return null;

  const bar = barberById(db.barber);
  const m = statusMeta(db.status);
  const d = new Date(db.date+'T00:00:00');
  const fol = db.followUp ?? false;
  const accent = '#D6C3A0';

  const setDrawerStatus = (val) => {
    if(val==='no-show'||val==='cancelled'){
      if(!window.confirm("Mark "+db.customer+"'s booking as "+(val==='no-show'?'a no-show':'cancelled')+'?')) return;
    }
    setBookingStatus(db.id, val);
  };

  const mk = (val, color, label) => ({
    label, val, color,
    bg: db.status===val ? tint(color,0.18) : '#1D1A15',
    border: db.status===val ? color : '#2A2622',
    textColor: db.status===val ? color : '#9A9388'
  });
  const statuses = [mk('confirmed','#D6C3A0','Confirmed'),mk('completed','#6FA886','Done'),mk('no-show','#C46A5A','No-show'),mk('cancelled','#6b645b','Cancelled')];
  const phone = PHONES[db.customer]||(db.mine?(user?.mobile||'—'):'0917 000 0000');

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

          <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'11px',color:'#9A9388',marginBottom:'9px'}}>Change status</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'22px'}}>
            {statuses.map(st=>(
              <button key={st.val} onClick={()=>setDrawerStatus(st.val)}
                style={{cursor:'pointer',background:st.bg,border:'1.5px solid '+st.border,color:st.textColor,borderRadius:'9px',padding:'11px',fontWeight:'600',fontSize:'13.5px'}}>{st.label}</button>
            ))}
          </div>

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
