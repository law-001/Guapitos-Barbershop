import { barberById, timeLabel, statusMeta, nowMs } from '../helpers';

export default function AccountView({ bookings, user, goBook, onState, onUpdateBooking, showAlert }) {
  const accent = '#D6C3A0';
  const nowAbs = nowMs();
  const startMs = b => new Date(b.date+'T00:00:00').getTime()+b.start*60000;
  const mine = bookings.filter(b=>b.mine);
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
      <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:accent,marginBottom:'10px'}}>{user.name?'Hello, '+user.name.split(' ')[0]:'Guest'}</div>
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
