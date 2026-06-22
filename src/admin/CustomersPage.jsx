import { useState } from 'react';
import { PHONES } from '../data';
import { barberById, peso } from '../helpers';

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
        Showing <b style={{color:'#F4EFE7'}}>{startIdx+1}–{endIdx}</b> of <b style={{color:'#F4EFE7'}}>{totalCount}</b> customers
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

export default function CustomersPage({ bookings, openCust }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Reset to page 1 when the search changes (adjust-state-during-render pattern).
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) { setPrevSearch(search); setPage(1); }

  const accent = '#D6C3A0';
  const hair = '#2A2622';
  const surf = '#15130F';
  const surf2 = '#1D1A15';
  const muted = '#9A9388';

  // Build customer map
  const custMap = {};
  for(const b of bookings){
    if(b.customer==='Walk-in') continue;
    const k=b.customer;
    if(!custMap[k]) custMap[k]={name:k,bookings:[],spent:0,last:''};
    custMap[k].bookings.push(b);
    if(b.status==='completed') custMap[k].spent+=b.price;
    if(b.status!=='cancelled'&&(!custMap[k].last||b.date>custMap[k].last)) custMap[k].last=b.date;
  }
  const custArr = Object.values(custMap).map(c=>{
    const visits=c.bookings.filter(b=>b.status!=='cancelled').length;
    const cnt={}; c.bookings.forEach(b=>cnt[b.barber]=(cnt[b.barber]||0)+1);
    const pref=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
    const bar=barberById(pref);
    return {name:c.name,phone:PHONES[c.name]||'No number',visits,spent:c.spent,last:c.last,prefName:bar?.name||'—',prefColor:bar?.color||'#9A9388'};
  });

  const q = search.trim().toLowerCase();
  const filtered = custArr.filter(c=>!q||(c.name+' '+c.phone).toLowerCase().includes(q)).sort((a,b)=>b.visits-a.visits);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total/perPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage-1)*perPage;
  const endIdx = Math.min(startIdx+perPage, total);
  const pageRows = filtered.slice(startIdx, endIdx);

  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone…"
        style={{width:'100%',maxWidth:'420px',background:surf,border:'1px solid '+hair,borderRadius:'9px',padding:'11px 14px',color:'#F4EFE7',fontSize:'14.5px',marginBottom:'16px'}}/>

      {/* Showing label */}
      {total > 0 && (
        <div style={{fontSize:'13px',color:muted,marginBottom:'10px'}}>
          Showing <b style={{color:'#F4EFE7'}}>{startIdx+1}–{endIdx}</b> of <b style={{color:'#F4EFE7'}}>{total}</b> customers
        </div>
      )}

      <div style={{background:surf,border:'1px solid '+hair,borderRadius:'14px',overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:'700px'}}>
            {/* Header */}
            <div style={{display:'grid',gridTemplateColumns:'1.6fr 1.2fr 0.8fr 1fr 1.3fr 0.9fr 0.6fr',gap:'10px',padding:'12px 18px',borderBottom:'1px solid '+hair,background:surf2,fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.06em',fontSize:'11.5px',color:muted}}>
              <span>Name</span><span>Phone</span><span>Visits</span><span>Lifetime</span><span>Preferred Barber</span><span>Last Visit</span><span></span>
            </div>
            {pageRows.length===0 && (
              <div style={{padding:'34px',textAlign:'center',color:muted,fontSize:'14px'}}>No customers match that search.</div>
            )}
            {pageRows.map(c=>{
              const initials=c.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
              const lastLabel=c.last?new Date(c.last+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'—';
              return (
                <button key={c.name} onClick={()=>openCust(c.name)}
                  style={{width:'100%',textAlign:'left',cursor:'pointer',display:'grid',gridTemplateColumns:'1.6fr 1.2fr 0.8fr 1fr 1.3fr 0.9fr 0.6fr',gap:'10px',alignItems:'center',background:'transparent',border:'none',borderBottom:'1px solid '+hair,padding:'12px 18px',color:'#F4EFE7'}}>
                  <span style={{display:'flex',alignItems:'center',gap:'10px',minWidth:'0'}}>
                    <span style={{flexShrink:'0',width:'34px',height:'34px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'13px',color:accent,background:surf2,border:'1px solid '+hair}}>{initials}</span>
                    <span style={{fontWeight:'600',fontSize:'14px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</span>
                  </span>
                  <span style={{fontSize:'13px',color:'#C9C3B8'}}>{c.phone}</span>
                  <span style={{fontFamily:"'Oswald'",fontWeight:'600',fontSize:'15px'}}>{c.visits}</span>
                  <span style={{fontFamily:"'Oswald'",fontWeight:'600',fontSize:'15px',color:accent}}>{peso(c.spent)}</span>
                  <span style={{display:'flex',alignItems:'center',gap:'7px',minWidth:'0'}}>
                    <span style={{flexShrink:'0',width:'8px',height:'8px',borderRadius:'50%',background:c.prefColor}}></span>
                    <span style={{fontSize:'13px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.prefName}</span>
                  </span>
                  <span style={{fontSize:'13px',color:'#C9C3B8'}}>{lastLabel}</span>
                  <span style={{textAlign:'right'}}>
                    <span style={{display:'inline-block',fontSize:'12px',color:accent,border:'1px solid '+hair,borderRadius:'7px',padding:'4px 10px',fontWeight:'600'}}>View</span>
                  </span>
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
