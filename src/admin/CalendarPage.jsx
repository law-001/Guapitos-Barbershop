import { useState, useEffect } from 'react';
import { BARBERS, OPEN, CLOSE } from '../data';
import { iso, todayDate, addDays, timeLabel, statusMeta, barberById, tint, nowMin, durLabel } from '../helpers';

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

export default function CalendarPage({ bookings, calMode, calIso, setCalMode, calShift, calToday, selectCalDay, openDayFromMonth, openDrawer, adminNewAppt, adminQuickAdd }) {
  const isMobile = useIsMobile();
  const accent = '#D6C3A0';
  const hair = '#2A2622';
  const todayIso = iso(todayDate());
  const calDate = new Date(calIso+'T00:00:00');
  const active = bookings.filter(b=>b.status!=='cancelled');

  // Month cells
  const first = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
  const startGrid = new Date(first); startGrid.setDate(1-first.getDay());
  const monthCells = [];
  for(let i=0; i<42; i++){
    const d = new Date(startGrid); d.setDate(startGrid.getDate()+i);
    const di = iso(d); const inMonth = d.getMonth()===calDate.getMonth(); const closed = d.getDay()===0; const sel = di===calIso;
    const dayB = active.filter(b=>b.date===di).sort((a,b)=>a.start-b.start);
    const chips = dayB.slice(0,3).map(b=>{ const bar=barberById(b.barber); return {label:timeLabel(b.start).replace(':00','')+' '+b.customer.split(' ')[0],color:bar?.color||'#9A9388',bg:tint(bar?.color||'#9A9388',0.16)}; });
    monthCells.push({key:di,dom:d.getDate(),count:dayB.length,more:Math.max(0,dayB.length-3),chips,sel,inMonth,closed,
      openDay:()=>openDayFromMonth(di),
      bg:sel?tint('#D6C3A0',0.10):(inMonth?'#15130F':'#100E0C'),
      numColor:closed?'#6b5f50':(inMonth?'#F4EFE7':'#5e574d'),
      border:sel?accent:hair,todayDot:di===todayIso});
  }
  const monthLabel = calDate.toLocaleDateString('en-US',{month:'long',year:'numeric'});

  // Week cols
  const weekStart = new Date(calDate); weekStart.setDate(calDate.getDate()-calDate.getDay());
  const weekCols = [];
  for(let i=0; i<7; i++){
    const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); const di = iso(d); const closed = d.getDay()===0;
    const items = active.filter(b=>b.date===di).sort((a,b)=>a.start-b.start).map(b=>{ const bar=barberById(b.barber); const m=statusMeta(b.status); return {id:b.id,timeLabel:timeLabel(b.start),customer:b.customer.split(' ')[0],service:b.service,color:bar?.color||'#9A9388',bg:tint(bar?.color||'#9A9388',0.14),statusColor:m.color,open:()=>openDrawer(b.id)}; });
    weekCols.push({key:di,dow:d.toLocaleDateString('en-US',{weekday:'short'}),dom:d.getDate(),count:items.length,items,empty:items.length===0,sel:di===calIso,closed,headColor:di===todayIso?accent:(closed?'#6b5f50':'#F4EFE7'),select:()=>selectCalDay(di)});
  }
  const we = new Date(weekStart); we.setDate(weekStart.getDate()+6);
  const weekLabel = weekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+we.toLocaleDateString('en-US',{month:'short',day:'numeric'});

  // Day cols (barber columns)
  const dayB2 = active.filter(b=>b.date===calIso);
  const PXMIN = 88/60;
  const gridHeight = Math.round((CLOSE-OPEN)*PXMIN);
  const gridHours = [];
  for(let t=OPEN; t<=CLOSE; t+=60) gridHours.push({key:'gh'+t,label:timeLabel(t).replace(':00',''),top:Math.round((t-OPEN)*PXMIN)});
  const dayGridCols = BARBERS.map(b=>{
    const items = dayB2.filter(x=>x.barber===b.id).map(x=>{ const m=statusMeta(x.status);
      return {id:x.id,top:Math.round((x.start-OPEN)*PXMIN),height:Math.max(Math.round(x.dur*PXMIN)-3,60),timeLabel:timeLabel(x.start),serviceLabel:x.service,customer:x.customer,durLabel:durLabel(x.dur),statusLabel:m.label,statusColor:m.color,bg:tint(b.color,0.16),open:()=>openDrawer(x.id),payShow:x.pay==='online'}; });
    return {id:b.id,name:b.name,initials:b.initials,color:b.color,count:items.length,items,addWalkIn:()=>adminQuickAdd()};
  });
  const nowAbsM = nowMin(); const gridNowShow = calIso===todayIso&&nowAbsM>=OPEN&&nowAbsM<=CLOSE;
  const gridNowTop = Math.round((nowAbsM-OPEN)*PXMIN);
  const dayLabel = calDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const calRangeLabel = calMode==='month'?monthLabel:(calMode==='week'?weekLabel:dayLabel);

  // Side panel
  const selItems = active.filter(b=>b.date===calIso).sort((a,b)=>a.start-b.start).map(b=>{ const m=statusMeta(b.status); const bar=barberById(b.barber); return {id:b.id,timeLabel:timeLabel(b.start),customer:b.customer,service:b.service,barberName:bar?.name||'—',barberColor:bar?.color||'#9A9388',statusLabel:m.label,statusColor:m.color,open:()=>openDrawer(b.id)}; });
  const calSelLabel = calDate.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});

  // Mobile agenda: group non-empty days for month/week view
  const agendaDays = (() => {
    let days = [];
    if(calMode==='month'){
      for(let i=0;i<42;i++){
        const d=new Date(startGrid); d.setDate(startGrid.getDate()+i);
        const di=iso(d); if(d.getMonth()!==calDate.getMonth()) continue;
        const items=active.filter(b=>b.date===di).sort((a,c)=>a.start-c.start);
        if(items.length>0) days.push({di,d,items});
      }
    } else if(calMode==='week'){
      for(let i=0;i<7;i++){
        const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); const di=iso(d);
        const items=active.filter(b=>b.date===di).sort((a,c)=>a.start-c.start);
        if(items.length>0) days.push({di,d,items});
      }
    } else {
      const items=active.filter(b=>b.date===calIso).sort((a,c)=>a.start-c.start);
      if(items.length>0) days.push({di:calIso,d:calDate,items});
    }
    return days;
  })();

  const segBtn = (mode, label) => (
    <button onClick={()=>setCalMode(mode)} style={{cursor:'pointer',border:'none',borderRadius:'7px',padding:'8px 15px',fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.04em',fontSize:'13px',background:calMode===mode?accent:'transparent',color:calMode===mode?'#0E0E0E':'#9A9388'}}>
      {label}
    </button>
  );

  return (
    <div>
      {/* Toolbar — always visible */}
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
        <div style={{display:'flex',background:'#15130F',border:'1px solid #2A2622',borderRadius:'9px',padding:'3px'}}>
          {segBtn('day','Day')}{segBtn('week','Week')}{segBtn('month','Month')}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <button onClick={()=>calShift(-1)} style={{cursor:'pointer',background:'#15130F',border:'1px solid #2A2622',color:'#F4EFE7',borderRadius:'8px',width:'36px',height:'36px',fontSize:'18px'}}>‹</button>
          <button onClick={calToday} style={{cursor:'pointer',background:'#15130F',border:'1px solid #2A2622',color:'#F4EFE7',borderRadius:'8px',padding:'0 14px',height:'36px',fontSize:'13px',fontWeight:'600'}}>Today</button>
          <button onClick={()=>calShift(1)} style={{cursor:'pointer',background:'#15130F',border:'1px solid #2A2622',color:'#F4EFE7',borderRadius:'8px',width:'36px',height:'36px',fontSize:'18px'}}>›</button>
        </div>
        <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.03em',fontSize:'18px',color:'#F4EFE7'}}>{calRangeLabel}</div>
        <div style={{flex:'1'}}></div>
        <button onClick={()=>adminNewAppt(calIso)} style={{cursor:'pointer',background:'#1D1A15',color:accent,border:'1px solid #2A2622',borderRadius:'9px',padding:'9px 16px',fontWeight:'600',fontSize:'13.5px'}}>+ New booking</button>
      </div>

      {/* Mobile agenda (≤768px) */}
      <div className="cal-mobile-agenda">
        {agendaDays.length===0 ? (
          <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'14px',padding:'32px',textAlign:'center',color:'#9A9388'}}>
            {calDate.getDay()===0?'Sunday is a rest day.':'No appointments this period.'}
          </div>
        ) : agendaDays.map(({di,d,items})=>(
          <div key={di} style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'14px',marginBottom:'12px',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #2A2622',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{textAlign:'center',minWidth:'36px'}}>
                <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'24px',lineHeight:'1',color:di===todayIso?accent:'#F4EFE7'}}>{d.getDate()}</div>
                <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',color:'#9A9388'}}>{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
              </div>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'12px',color:'#9A9388'}}>{d.toLocaleDateString('en-US',{month:'long',day:'numeric'})}</div>
              <div style={{marginLeft:'auto',fontFamily:"'Oswald'",fontSize:'13px',color:'#9A9388'}}>{items.length} appt</div>
            </div>
            {items.map(b=>{ const bar=barberById(b.barber); const m=statusMeta(b.status);
              return (
                <button key={b.id} onClick={()=>openDrawer(b.id)}
                  style={{width:'100%',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',background:'transparent',border:'none',borderBottom:'1px solid #2A2622',padding:'12px 16px',color:'#F4EFE7'}}>
                  <span style={{flexShrink:'0',width:'60px',fontFamily:"'Oswald'",fontSize:'13px',color:'#F4EFE7'}}>{timeLabel(b.start)}</span>
                  <span style={{flex:'1',minWidth:'0'}}>
                    <span style={{display:'block',fontWeight:'600',fontSize:'14px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.customer}</span>
                    <span style={{display:'block',fontSize:'12px',color:'#9A9388',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.service}</span>
                  </span>
                  <span style={{flexShrink:'0',display:'flex',alignItems:'center',gap:'6px'}}>
                    <span style={{width:'7px',height:'7px',borderRadius:'50%',background:bar?.color||'#9A9388'}}></span>
                    <span style={{fontSize:'10.5px',textTransform:'uppercase',letterSpacing:'0.03em',fontWeight:'700',color:m.color}}>{m.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Desktop calendar */}
      <div style={{display:'flex',gap:'16px',alignItems:'flex-start'}}>
        <div style={{flex:'1',minWidth:'0'}}>

          {/* DAY VIEW */}
          {calMode==='day' && (
            <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'15px',overflow:'hidden'}}>
              <div style={{display:'flex',borderBottom:'1px solid #2A2622'}}>
                <div style={{width:'58px',flexShrink:'0'}}></div>
                {dayGridCols.map(col=>(
                  <div key={col.id} style={{flex:'1',minWidth:'130px',borderLeft:'1px solid #2A2622',padding:'11px 12px',display:'flex',alignItems:'center',gap:'9px'}}>
                    <span style={{flexShrink:'0',width:'30px',height:'30px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'12px',color:'#0E0E0E',background:col.color}}>{col.initials}</span>
                    <div style={{flex:'1',minWidth:'0'}}>
                      <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',fontSize:'13px',lineHeight:'1.05',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{col.name}</div>
                      <div style={{fontSize:'11px',color:'#9A9388'}}>{col.count} booked</div>
                    </div>
                    <button onClick={col.addWalkIn} title="Add walk-in" style={{flexShrink:'0',cursor:'pointer',width:'26px',height:'26px',borderRadius:'7px',background:'transparent',border:'1px dashed #2A2622',color:accent,fontSize:'15px',lineHeight:'1'}}>+</button>
                  </div>
                ))}
              </div>
              <div style={{maxHeight:'600px',overflowY:'auto',overflowX:'auto'}}>
                <div style={{display:'flex',position:'relative',minWidth:'calc(58px + 130px * 4)'}}>
                  <div style={{width:'58px',flexShrink:'0',position:'relative',height:gridHeight+'px'}}>
                    {gridHours.map(h=>(
                      <div key={h.key} style={{position:'absolute',top:h.top+'px',right:'8px',transform:'translateY(-7px)',fontFamily:"'Oswald'",fontSize:'11px',color:'#9A9388'}}>{h.label}</div>
                    ))}
                  </div>
                  <div style={{flex:'1',display:'flex',position:'relative'}}>
                    {dayGridCols.map(col=>(
                      <div key={col.id} style={{flex:'1',minWidth:'130px',position:'relative',height:gridHeight+'px',borderLeft:'1px solid #2A2622'}}>
                        {gridHours.map(h=>(
                          <div key={h.key} style={{position:'absolute',left:'0',right:'0',top:h.top+'px',borderTop:'1px solid rgba(42,38,34,0.6)'}}></div>
                        ))}
                        {col.items.map(bk=>(
                          <button key={bk.id} onClick={bk.open}
                            style={{position:'absolute',top:bk.top+'px',height:bk.height+'px',left:'5px',right:'5px',overflow:'hidden',textAlign:'left',cursor:'pointer',background:bk.bg,border:'1px solid #2A2622',borderLeft:'3px solid '+bk.statusColor,borderRadius:'8px',padding:'5px 8px',color:'#F4EFE7'}}>
                            <div style={{display:'flex',justifyContent:'space-between',gap:'4px',alignItems:'baseline'}}>
                              <span style={{fontFamily:"'Oswald'",fontSize:'12px'}}>{bk.timeLabel}</span>
                              <span style={{fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.03em',fontWeight:'700',color:bk.statusColor}}>{bk.statusLabel}</span>
                            </div>
                            <div style={{fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{bk.customer}</div>
                            <div style={{fontSize:'11px',color:'#9A9388',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{bk.serviceLabel} · {bk.durLabel}{bk.payShow&&<span style={{color:accent}}> · ● paid</span>}</div>
                          </button>
                        ))}
                      </div>
                    ))}
                    {gridNowShow && (
                      <div style={{position:'absolute',left:'0',right:'0',top:gridNowTop+'px',height:'2px',background:'#C46A5A',zIndex:'6',pointerEvents:'none'}}>
                        <span style={{position:'absolute',left:'-50px',top:'-9px',width:'46px',textAlign:'right',fontFamily:"'Oswald'",fontSize:'10px',color:'#C46A5A'}}>{timeLabel(nowMin())}</span>
                        <span style={{position:'absolute',left:'-3px',top:'-3px',width:'8px',height:'8px',borderRadius:'50%',background:'#C46A5A'}}></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WEEK VIEW — desktop: horizontal scroll; mobile: stacked via CSS class */}
          {calMode==='week' && (
            <>
              {/* Desktop week */}
              <div className="cal-week-desktop" style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'6px'}}>
                {weekCols.map(wc=>(
                  <div key={wc.key} style={{flex:'1',minWidth:'150px',background:'#15130F',border:'1px solid #2A2622',borderRadius:'13px',overflow:'hidden'}}>
                    <button onClick={wc.select} style={{width:'100%',cursor:'pointer',background:'transparent',border:'none',borderBottom:'1px solid #2A2622',padding:'11px 10px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.06em',fontSize:'11px',color:wc.headColor}}>{wc.dow}</div>
                      <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'22px',lineHeight:'1.1',color:wc.headColor}}>{wc.dom}</div>
                      <div style={{fontSize:'11px',color:'#9A9388'}}>{wc.count} appt</div>
                    </button>
                    <div style={{padding:'8px',display:'flex',flexDirection:'column',gap:'6px',minHeight:'120px'}}>
                      {wc.items.map(it=>(
                        <button key={it.id} onClick={it.open} style={{textAlign:'left',cursor:'pointer',background:it.bg,border:'none',borderLeft:'3px solid '+it.statusColor,borderRadius:'7px',padding:'7px 8px',color:'#F4EFE7'}}>
                          <div style={{fontFamily:"'Oswald'",fontSize:'12px'}}>{it.timeLabel}</div>
                          <div style={{fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{it.customer}</div>
                          <div style={{fontSize:'11px',color:'#9A9388',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{it.service}</div>
                        </button>
                      ))}
                      {wc.empty && <div style={{textAlign:'center',color:'#5e574d',fontSize:'12px',padding:'12px 0'}}>—</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* MONTH VIEW */}
          {calMode==='month' && (
            <div className="cal-grid-desktop" style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'15px',padding:'12px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'6px',marginBottom:'6px'}}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
                  <div key={d} style={{textAlign:'center',fontFamily:"'Oswald'",textTransform:'uppercase',fontSize:'11px',letterSpacing:'0.08em',color:'#9A9388',padding:'4px 0'}}>{d}</div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'6px'}}>
                {monthCells.map(mc=>(
                  <button key={mc.key} onClick={mc.openDay}
                    style={{textAlign:'left',cursor:'pointer',minHeight:'96px',background:mc.bg,border:'1px solid '+mc.border,borderRadius:'9px',padding:'6px 7px',color:'#F4EFE7',display:'flex',flexDirection:'column',gap:'3px',overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontFamily:"'Oswald'",fontSize:'13px',color:mc.numColor}}>{mc.dom}</span>
                      {mc.todayDot && <span style={{width:'6px',height:'6px',borderRadius:'50%',background:accent}}></span>}
                    </div>
                    {mc.chips.map((ch,ci)=>(
                      <span key={ci} style={{fontSize:'10.5px',lineHeight:'1.35',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',background:ch.bg,color:ch.color,borderRadius:'4px',padding:'1px 5px'}}>{ch.label}</span>
                    ))}
                    {mc.more>0 && <span style={{fontSize:'10px',color:'#9A9388'}}>+{mc.more} more</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDE PANEL (month/week) */}
        {calMode!=='day' && (
          <aside className="cal-side-panel" style={{width:'288px',flexShrink:'0',background:'#15130F',border:'1px solid #2A2622',borderRadius:'15px',overflow:'hidden',alignSelf:'stretch'}}>
            <div style={{padding:'15px 18px',borderBottom:'1px solid #2A2622'}}>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.06em',fontSize:'14px'}}>{calSelLabel}</div>
            </div>
            {selItems.length===0 && <div style={{padding:'28px 18px',textAlign:'center',color:'#9A9388',fontSize:'13.5px'}}>Nothing booked. {calDate.getDay()===0?'Sunday is a rest day.':'Select a date to see appointments.'}</div>}
            <div>
              {selItems.map(si=>(
                <button key={si.id} onClick={si.open}
                  style={{width:'100%',textAlign:'left',cursor:'pointer',display:'flex',gap:'11px',background:'transparent',border:'none',borderBottom:'1px solid #2A2622',padding:'12px 18px',color:'#F4EFE7'}}>
                  <span style={{flexShrink:'0',width:'58px',fontFamily:"'Oswald'",fontSize:'13px'}}>{si.timeLabel}</span>
                  <span style={{flex:'1',minWidth:'0'}}>
                    <span style={{display:'block',fontWeight:'600',fontSize:'13.5px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{si.customer}</span>
                    <span style={{display:'block',fontSize:'12px',color:'#9A9388',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{si.service}</span>
                    <span style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px'}}>
                      <span style={{width:'7px',height:'7px',borderRadius:'50%',background:si.barberColor}}></span>
                      <span style={{fontSize:'11px',color:'#9A9388'}}>{si.barberName}</span>
                      <span style={{fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.04em',fontWeight:'700',color:si.statusColor}}>· {si.statusLabel}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
