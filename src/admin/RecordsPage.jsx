import { useState, useEffect } from 'react';
import { barberById, statusMeta, tint, ticketOf, timeLabel, peso, iso, todayDate } from '../helpers';

function Pagination({ page, totalPages, totalCount, perPage, setPage, setPerPage, startIdx, endIdx }) {
  const accent = '#D6C3A0';
  const hair = '#2A2622';
  const surf = '#15130F';
  const muted = '#9A9388';

  const pages = [];
  const maxButtons = 5;
  let start = Math.max(1, page - Math.floor(maxButtons/2));
  let end = Math.min(totalPages, start + maxButtons - 1);
  if(end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
  for(let i=start; i<=end; i++) pages.push(i);

  const btnStyle = (active, disabled) => ({
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? accent : surf,
    color: active ? '#0E0E0E' : (disabled ? '#5e574d' : '#F4EFE7'),
    border: '1px solid ' + (active ? accent : hair),
    borderRadius: '7px',
    padding: '7px 12px',
    fontFamily: active ? "'Oswald'" : "'Hanken Grotesk'",
    fontWeight: active ? '600' : '500',
    fontSize: '13px',
    minWidth: '34px',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:'12px',marginTop:'14px'}}>
      <div style={{fontSize:'13px',color:muted}}>
        Showing <b style={{color:'#F4EFE7'}}>{startIdx+1}–{endIdx}</b> of <b style={{color:'#F4EFE7'}}>{totalCount}</b> records
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:muted}}>
          Rows:
          <select value={perPage} onChange={e=>{ setPerPage(Number(e.target.value)); setPage(1); }}
            style={{background:surf,border:'1px solid '+hair,borderRadius:'7px',padding:'6px 10px',color:'#F4EFE7',fontSize:'13px',cursor:'pointer'}}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
          <button onClick={()=>setPage(1)} disabled={page===1} style={btnStyle(false,page===1)}>«</button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={btnStyle(false,page===1)}>‹</button>
          {pages.map(p=>(
            <button key={p} onClick={()=>setPage(p)} style={btnStyle(p===page,false)}>{p}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages||totalPages===0} style={btnStyle(false,page===totalPages||totalPages===0)}>›</button>
          <button onClick={()=>setPage(totalPages)} disabled={page===totalPages||totalPages===0} style={btnStyle(false,page===totalPages||totalPages===0)}>»</button>
        </div>
      </div>
    </div>
  );
}

export default function RecordsPage({ bookings, openDrawer }) {
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [barberF, setBarberF] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(()=>{ setPage(1); }, [search, statusF, barberF, dateFrom, dateTo]);

  const accent = '#D6C3A0';
  const hair = '#2A2622';
  const surf = '#15130F';
  const surf2 = '#1D1A15';
  const muted = '#9A9388';

  // Quick date preset helpers
  const todayIso = iso(todayDate());
  const getWeekStart = () => { const d = todayDate(); d.setDate(d.getDate() - d.getDay()); return iso(d); };
  const getMonthStart = () => { const d = todayDate(); d.setDate(1); return iso(d); };
  const presets = [
    { label: 'Today',      from: todayIso,        to: todayIso },
    { label: 'This week',  from: getWeekStart(),   to: todayIso },
    { label: 'This month', from: getMonthStart(),  to: todayIso },
  ];
  const activePreset = presets.find(p => p.from === dateFrom && p.to === dateTo)?.label || null;
  const applyPreset = p => { setDateFrom(p.from); setDateTo(p.to); };
  const clearDates = () => { setDateFrom(''); setDateTo(''); };
  const hasDateFilter = dateFrom || dateTo;

  let filtered = bookings.slice();
  if(statusF!=='all') filtered = filtered.filter(b=>b.status===statusF);
  if(barberF!=='all') filtered = filtered.filter(b=>b.barber===barberF);
  if(dateFrom) filtered = filtered.filter(b=>b.date >= dateFrom);
  if(dateTo) filtered = filtered.filter(b=>b.date <= dateTo);
  const q = search.trim().toLowerCase();
  if(q) filtered = filtered.filter(b=>(b.customer+' '+b.service+' '+ticketOf(bookings,b.id)).toLowerCase().includes(q));
  filtered.sort((a,b)=>new Date(b.date+'T00:00:00').getTime()+b.start*60000 - (new Date(a.date+'T00:00:00').getTime()+a.start*60000));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total/perPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage-1)*perPage;
  const endIdx = Math.min(startIdx+perPage, total);
  const pageRows = filtered.slice(startIdx, endIdx);

  const inputStyle = {background:surf,border:'1px solid '+hair,borderRadius:'9px',padding:'11px 14px',color:'#F4EFE7',fontSize:'14.5px'};
  const dateInputStyle = {...inputStyle, colorScheme:'dark', padding:'10px 12px', fontSize:'13.5px'};
  const presetBtn = (label, active) => ({
    cursor:'pointer', border:'1px solid '+(active?accent:hair), borderRadius:'7px', padding:'8px 13px',
    background:active?'rgba(214,195,160,0.12)':surf, color:active?accent:muted,
    fontFamily:"'Oswald'", textTransform:'uppercase', letterSpacing:'0.06em', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap'
  });

  return (
    <div>
      {/* Row 1: search + status + barber */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'10px',marginBottom:'10px'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, service or ticket…"
          style={{...inputStyle,flex:'1',minWidth:'220px'}}/>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{...inputStyle,cursor:'pointer'}}>
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="no-show">No-show</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={barberF} onChange={e=>setBarberF(e.target.value)} style={{...inputStyle,cursor:'pointer'}}>
          <option value="all">All barbers</option>
          <option value="b1">Marco Cano</option>
          <option value="b2">Rico Delgado</option>
          <option value="b3">Tonio Reyes</option>
          <option value="b4">JP Salcedo</option>
        </select>
      </div>

      {/* Row 2: date filter */}
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
        {presets.map(p=>(
          <button key={p.label} onClick={()=>activePreset===p.label?clearDates():applyPreset(p)} style={presetBtn(p.label, activePreset===p.label)}>{p.label}</button>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:'6px',marginLeft:'4px'}}>
          <span style={{fontSize:'12.5px',color:muted,whiteSpace:'nowrap'}}>From</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={dateInputStyle}/>
          <span style={{fontSize:'12.5px',color:muted,whiteSpace:'nowrap'}}>To</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={dateInputStyle}/>
        </div>
        {hasDateFilter && (
          <button onClick={clearDates}
            style={{cursor:'pointer',background:'transparent',border:'1px solid '+hair,borderRadius:'7px',padding:'8px 12px',color:muted,fontSize:'12.5px'}}>
            Clear ✕
          </button>
        )}
      </div>

      {/* Showing label */}
      {total > 0 && (
        <div style={{fontSize:'13px',color:'#9A9388',marginBottom:'10px'}}>
          Showing <b style={{color:'#F4EFE7'}}>{startIdx+1}–{endIdx}</b> of <b style={{color:'#F4EFE7'}}>{total}</b> records
        </div>
      )}

      <div style={{background:surf,border:'1px solid '+hair,borderRadius:'14px',overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:'760px'}}>
            <div style={{display:'grid',gridTemplateColumns:'88px 1.4fr 1.6fr 1.2fr 1fr 0.9fr 0.9fr',gap:'10px',padding:'12px 18px',borderBottom:'1px solid '+hair,position:'sticky',top:'0',background:surf2,fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.06em',fontSize:'11.5px',color:'#9A9388'}}>
              <span>Ticket</span><span>Customer</span><span>Service</span><span>Barber</span><span>When</span><span>Status</span><span style={{textAlign:'right'}}>Total</span>
            </div>
            {pageRows.length===0 && (
              <div style={{padding:'34px',textAlign:'center',color:'#9A9388',fontSize:'14px'}}>No bookings match these filters.</div>
            )}
            {pageRows.map(b=>{
              const m=statusMeta(b.status); const bar=barberById(b.barber); const d=new Date(b.date+'T00:00:00');
              return (
                <button key={b.id} onClick={()=>openDrawer(b.id)}
                  style={{width:'100%',textAlign:'left',cursor:'pointer',display:'grid',gridTemplateColumns:'88px 1.4fr 1.6fr 1.2fr 1fr 0.9fr 0.9fr',gap:'10px',alignItems:'center',background:'transparent',border:'none',borderBottom:'1px solid '+hair,padding:'12px 18px',color:'#F4EFE7'}}>
                  <span style={{fontFamily:"'Oswald'",fontSize:'12px',color:'#9A9388'}}>{ticketOf(bookings,b.id)}</span>
                  <span style={{fontWeight:'600',fontSize:'14px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.customer}</span>
                  <span style={{fontSize:'13.5px',color:'#C9C3B8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.service}</span>
                  <span style={{display:'flex',alignItems:'center',gap:'7px',minWidth:'0'}}>
                    <span style={{flexShrink:'0',width:'8px',height:'8px',borderRadius:'50%',background:bar?.color||'#9A9388'}}></span>
                    <span style={{fontSize:'13px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{bar?.name||'—'}</span>
                  </span>
                  <span style={{fontSize:'13px',color:'#C9C3B8'}}>{d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {timeLabel(b.start)}</span>
                  <span><span style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.03em',fontWeight:'700',color:m.color,background:tint(m.color,0.14),borderRadius:'5px',padding:'3px 8px'}}>{m.label}</span></span>
                  <span style={{textAlign:'right',fontFamily:"'Oswald'",fontWeight:'600',color:accent}}>{peso(b.price)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Pagination page={safePage} totalPages={totalPages} totalCount={total} perPage={perPage}
        setPage={setPage} setPerPage={setPerPage} startIdx={startIdx} endIdx={endIdx}/>
    </div>
  );
}
