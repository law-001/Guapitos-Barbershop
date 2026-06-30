import { PHONES } from '../data';
import { barberById, statusMeta, peso } from '../helpers';

export default function CustomerDrawer({ bookings, custName, closeCust, openDrawer, custPhones = {} }) {
  if(!custName) return null;
  const accent = '#D6C3A0';

  const cb = bookings.filter(b=>b.customer===custName).sort((a,b)=>{
    const ta=new Date(a.date+'T00:00:00').getTime()+a.start*60000;
    const tb=new Date(b.date+'T00:00:00').getTime()+b.start*60000;
    return tb-ta;
  });
  // Saved mobile, looked up by the customer's booking email (falls back to the
  // static PHONES seed for demo names).
  const custEmail = (cb.find(b=>b.email)?.email || '').toLowerCase();
  const custPhone = custPhones[custEmail] || PHONES[custName] || 'No number';
  const cvisits = cb.filter(b=>b.status!=='cancelled').length;
  const cspent = cb.filter(b=>b.status==='completed').reduce((a,b)=>a+b.price,0);
  const lastB = cb.find(b=>b.status!=='cancelled');
  const cnt = {}; cb.forEach(b=>cnt[b.barber]=(cnt[b.barber]||0)+1);
  const pref = Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const pbar = barberById(pref);
  const cvLast = lastB ? new Date(lastB.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const initials = custName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  return (
    <div style={{position:'fixed',inset:'0',zIndex:'90',display:'flex',justifyContent:'flex-end'}}>
      <div onClick={closeCust} style={{position:'absolute',inset:'0',background:'rgba(0,0,0,0.55)',animation:'gbback 0.2s ease both'}}></div>
      <div style={{position:'relative',width:'min(440px,94vw)',height:'100%',overflowY:'auto',background:'#15130F',borderLeft:'1px solid #2A2622',animation:'gbslide 0.26s cubic-bezier(0.22,1,0.36,1) both'}}>
        <div style={{position:'sticky',top:'0',zIndex:'2',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 22px',background:'#15130F',borderBottom:'1px solid #2A2622'}}>
          <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'11px',color:accent}}>Customer</div>
          <button onClick={closeCust} style={{cursor:'pointer',background:'#1D1A15',border:'1px solid #2A2622',color:'#F4EFE7',borderRadius:'8px',width:'34px',height:'34px',fontSize:'18px'}}>✕</button>
        </div>
        <div style={{padding:'22px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px'}}>
            <span style={{flexShrink:'0',width:'56px',height:'56px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'20px',color:accent,background:'#1D1A15',border:'1px solid #2A2622'}}>{initials}</span>
            <div style={{flex:'1',minWidth:'0'}}>
              <div style={{fontFamily:"'Oswald'",fontSize:'23px',lineHeight:'1.1'}}>{custName}</div>
              <div style={{fontSize:'13.5px',color:'#9A9388'}}>{custPhone}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'9px',marginBottom:'14px'}}>
            <div style={{background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'11px',padding:'13px 15px'}}>
              <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'24px'}}>{cvisits}</div>
              <div style={{fontSize:'12px',color:'#9A9388'}}>total visits</div>
            </div>
            <div style={{background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'11px',padding:'13px 15px'}}>
              <div style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'24px',color:accent}}>{peso(cspent)}</div>
              <div style={{fontSize:'12px',color:'#9A9388'}}>lifetime spend</div>
            </div>
          </div>

          <div style={{display:'flex',gap:'18px',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'11px',padding:'13px 15px',marginBottom:'22px'}}>
            <div>
              <div style={{fontSize:'12px',color:'#9A9388'}}>Preferred barber</div>
              <div style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'14.5px',marginTop:'2px'}}>
                <span style={{width:'8px',height:'8px',borderRadius:'50%',background:pbar?.color||'#9A9388'}}></span>
                {pbar?.name||'—'}
              </div>
            </div>
            <div style={{borderLeft:'1px solid #2A2622',paddingLeft:'18px'}}>
              <div style={{fontSize:'12px',color:'#9A9388'}}>Last visit</div>
              <div style={{fontSize:'14.5px',marginTop:'2px'}}>{cvLast}</div>
            </div>
          </div>

          <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'11px',color:'#9A9388',marginBottom:'9px'}}>Visit history</div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {cb.map(b=>{
              const m=statusMeta(b.status); const bar=barberById(b.barber); const d=new Date(b.date+'T00:00:00');
              return (
                <button key={b.id} onClick={()=>openDrawer(b.id)}
                  style={{textAlign:'left',cursor:'pointer',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'12px 14px',color:'#F4EFE7',display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{flex:'1',minWidth:'0'}}>
                    <span style={{display:'block',fontSize:'14px',fontWeight:'600',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.service}</span>
                    <span style={{display:'block',fontSize:'12.5px',color:'#9A9388'}}>{d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · {bar?.name||'—'}</span>
                  </span>
                  <span style={{flexShrink:'0',textAlign:'right'}}>
                    <span style={{display:'block',fontFamily:"'Oswald'",fontWeight:'600',color:accent}}>{peso(b.price)}</span>
                    <span style={{display:'block',fontSize:'10.5px',textTransform:'uppercase',letterSpacing:'0.04em',fontWeight:'700',color:m.color}}>{m.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
