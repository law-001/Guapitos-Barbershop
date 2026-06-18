import { ACTIVITY, BARBERS } from '../data';
import { iso, todayDate, timeLabel, statusMeta, barberById, tint, nowMin, peso } from '../helpers';

export default function DashboardPage({ bookings, openDrawer, navCalendar }) {
  const todayIso = iso(todayDate());
  const active = bookings.filter(b=>b.status!=='cancelled');
  const todayB = active.filter(b=>b.date===todayIso);
  const nowAbsM = nowMin();
  const schedSorted = todayB.slice().sort((a,b)=>a.start-b.start);
  const nextAppt = schedSorted.find(b=>b.status==='confirmed'&&b.start>=nowAbsM);
  const nextBar = nextAppt ? barberById(nextAppt.barber) : null;
  const nextUpWhen = nextAppt
    ? ((nextAppt.start-nowAbsM)<=0?'happening now':((nextAppt.start-nowAbsM)<60?'in '+(nextAppt.start-nowAbsM)+' min':'at '+timeLabel(nextAppt.start)))
    : '';
  const todayNoShow = bookings.filter(b=>b.date===todayIso&&b.status==='no-show').length;
  const tNow = todayDate();
  const monthVisits = bookings.filter(b=>{
    const d=new Date(b.date+'T00:00:00');
    return b.status==='completed'&&d.getMonth()===tNow.getMonth()&&d.getFullYear()===tNow.getFullYear();
  });
  const revenue = todayB.filter(b=>b.status==='confirmed'||b.status==='completed').reduce((s,b)=>s+b.price,0);

  const dTodaySched = schedSorted.map(b=>{
    const m=statusMeta(b.status); const bar=barberById(b.barber);
    const isNow=b.start<=nowAbsM&&nowAbsM<b.start+b.dur; const isNext=b.id===nextAppt?.id;
    return {...b,timeLabel:timeLabel(b.start),barberColor:bar?.color||'#9A9388',statusLabel:m.label,statusColor:m.color,
      rowBg:isNext?tint('#D6C3A0',0.10):(isNow?tint('#6FA886',0.08):'transparent'),
      markerShow:(isNext||isNow)?'inline-block':'none',marker:isNow?'NOW':'NEXT',markerBg:isNow?'#6FA886':'#D6C3A0'};
  });

  return (
    <div>
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'14px',marginBottom:'18px'}}>
        <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'14px',padding:'18px 20px'}}>
          <div style={{fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',color:'#9A9388'}}>Appointments</div>
          <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'38px',lineHeight:'1.1',color:'#F4EFE7'}}>{todayB.length}</div>
          <div style={{fontSize:'12.5px',color:'#9A9388'}}>{todayB.filter(b=>b.status==='confirmed').length} upcoming · {todayB.filter(b=>b.status==='completed').length} done</div>
        </div>
        <div style={{background:'#15130F',border:'1px solid rgba(214,195,160,0.32)',borderRadius:'14px',padding:'18px 20px'}}>
          <div style={{fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',color:'#9A9388'}}>Expected revenue</div>
          <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'38px',lineHeight:'1.1',color:'#D6C3A0'}}>{peso(revenue)}</div>
          <div style={{fontSize:'12.5px',color:'#9A9388'}}>confirmed + completed today</div>
        </div>
        <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'14px',padding:'18px 20px'}}>
          <div style={{fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',color:'#9A9388'}}>No-shows</div>
          <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'38px',lineHeight:'1.1',color:todayNoShow>0?'#C46A5A':'#F4EFE7'}}>{todayNoShow}</div>
          <div style={{fontSize:'12.5px',color:'#9A9388'}}>flagged today</div>
        </div>
        <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'14px',padding:'18px 20px'}}>
          <div style={{fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',color:'#9A9388'}}>This month</div>
          <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'38px',lineHeight:'1.1',color:'#F4EFE7'}}>{peso(monthVisits.reduce((a,b)=>a+b.price,0))}</div>
          <div style={{fontSize:'12.5px',color:'#9A9388'}}>{monthVisits.length} completed visits</div>
        </div>
      </div>

      {/* Next up */}
      {nextAppt && (
        <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'18px',background:'linear-gradient(100deg,rgba(214,195,160,0.14),rgba(214,195,160,0.04))',border:'1px solid rgba(214,195,160,0.34)',borderRadius:'14px',padding:'18px 22px',marginBottom:'18px'}}>
          <div style={{flexShrink:'0'}}>
            <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.16em',fontSize:'11px',color:'#D6C3A0'}}>Next up · {nextUpWhen}</div>
            <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'32px',lineHeight:'1.05',marginTop:'2px'}}>{timeLabel(nextAppt.start)}</div>
          </div>
          <div style={{flex:'1',minWidth:'160px',borderLeft:'1px solid #2A2622',paddingLeft:'18px'}}>
            <div style={{fontSize:'16px',fontWeight:'600'}}>{nextAppt.customer}</div>
            <div style={{fontSize:'13.5px',color:'#9A9388'}}>{nextAppt.service} · with {nextBar?.name||'—'}</div>
          </div>
          <button onClick={navCalendar} style={{flexShrink:'0',cursor:'pointer',background:'#1D1A15',color:'#F4EFE7',border:'1px solid #2A2622',borderRadius:'9px',padding:'11px 18px',fontWeight:'600',fontSize:'14px'}}>Open schedule →</button>
        </div>
      )}

      {/* Schedule + Activity */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'16px'}}>
        <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'15px',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #2A2622'}}>
            <span style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.08em',fontSize:'15px'}}>Today's schedule</span>
            <button onClick={navCalendar} style={{cursor:'pointer',background:'transparent',border:'none',color:'#D6C3A0',fontSize:'13px',fontWeight:'600'}}>View all →</button>
          </div>
          {dTodaySched.length===0 && <div style={{padding:'34px 20px',textAlign:'center',color:'#9A9388',fontSize:'14px'}}>No appointments booked for today.</div>}
          <div>
            {dTodaySched.map(ap=>(
              <button key={ap.id} onClick={()=>openDrawer(ap.id)}
                style={{width:'100%',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'14px',background:ap.rowBg,border:'none',borderBottom:'1px solid #2A2622',padding:'13px 20px',color:'#F4EFE7'}}>
                <span style={{flexShrink:'0',width:'64px',fontFamily:"'Oswald'",fontSize:'14px',color:'#F4EFE7'}}>{ap.timeLabel}</span>
                <span style={{flex:'1',minWidth:'0'}}>
                  <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{fontWeight:'600',fontSize:'14.5px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ap.customer}</span>
                    {(ap.marker==='NOW'||ap.marker==='NEXT') && ap.markerShow!=='none' && <span style={{flexShrink:'0',fontFamily:"'Oswald'",fontSize:'9.5px',fontWeight:'700',letterSpacing:'0.08em',color:'#0E0E0E',background:ap.markerBg,borderRadius:'4px',padding:'1px 6px'}}>{ap.marker}</span>}
                  </span>
                  <span style={{display:'block',fontSize:'12.5px',color:'#9A9388',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ap.service}</span>
                </span>
                <span style={{flexShrink:'0',display:'flex',alignItems:'center',gap:'7px'}}>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:ap.barberColor}}></span>
                  <span style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.04em',fontWeight:'700',color:ap.statusColor}}>{ap.statusLabel}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'15px',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #2A2622'}}><span style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.08em',fontSize:'15px'}}>Recent activity</span></div>
          <div style={{padding:'6px 4px'}}>
            {ACTIVITY.map((ac,i)=>(
              <div key={i} style={{display:'flex',gap:'13px',padding:'11px 16px'}}>
                <span style={{flexShrink:'0',marginTop:'5px',width:'9px',height:'9px',borderRadius:'50%',background:ac.color}}></span>
                <div style={{flex:'1',minWidth:'0'}}>
                  <div style={{fontSize:'14px',lineHeight:'1.45'}}><b style={{fontWeight:'600'}}>{ac.who}</b> <span style={{color:'#C9C3B8'}}>{ac.action}</span></div>
                  <div style={{fontSize:'12.5px',color:'#9A9388'}}>{ac.detail}</div>
                </div>
                <span style={{flexShrink:'0',fontSize:'11.5px',color:'#5e574d'}}>{ac.ago}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
