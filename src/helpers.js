import { SERVICES, BARBERS, OPEN, CLOSE } from './data';

export const pad = n => String(n).padStart(2,'0');

export const iso = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());

export const todayDate = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

export const addDays = (n, base) => {
  const x = base ? new Date(base) : todayDate();
  x.setDate(x.getDate()+n);
  return x;
};

export const nowMin = () => {
  const t = todayDate();
  return Math.floor((Date.now()-t.getTime())/60000);
};

// Current epoch ms — kept here (plain module fn) so component bodies stay pure.
export const nowMs = () => Date.now();

// Unique id generator for client-created bookings.
let _idSeq = 0;
export const genId = (prefix='') => prefix + Date.now().toString(36) + (++_idSeq).toString(36);

// Customer-facing booking reference (GB-XXXXX). Lives here as a plain module fn
// so component bodies stay pure — Math.random must not be called during render.
export const genRef = () => 'GB-' + Math.random().toString(36).slice(2,7).toUpperCase();

export const durLabel = m => {
  const h=Math.floor(m/60), mm=m%60;
  let s='';
  if(h) s+=h+'h';
  if(mm) s+=(h?' ':'')+mm+'m';
  return s||'0m';
};

export const timeLabel = min => {
  let h=Math.floor(min/60), m=min%60;
  const ap=h>=12?'PM':'AM';
  let hh=h%12; if(hh===0) hh=12;
  return hh+':'+pad(m)+' '+ap;
};

export const peso = n => '₱'+Number(n).toLocaleString('en-PH');

export const dateFull = isoStr => {
  const d=new Date(isoStr+'T00:00:00');
  return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
};

export const svcById = id => SERVICES.find(s=>s.id===id);
export const barberById = id => BARBERS.find(b=>b.id===id);

// --- Auto packages ----------------------------------------------------------
// When a customer hand-picks à-la-carte services that match a bundled package
// AND the package is cheaper than buying those parts apart, the package price +
// duration replace those parts. Base cut is 'Haircut only' (hc) per shop pricing
// — to let other cuts qualify, add recipes (e.g. swap 'hc' for 'sig'/'wcut').
// Each recipe: { pkg:<package service id>, parts:[<component service ids>] }.
export const PACKAGE_RECIPES = [
  { pkg:'pkgCS',  parts:['hc','shave'] },    // Cut & Shave
  { pkg:'pkgDC',  parts:['hc','deepcon'] },  // Cut & Treatment — Deep Conditioning
  { pkg:'pkgAD',  parts:['hc','antidan'] },  // Cut & Treatment — Anti Dandruff
  { pkg:'pkgAD',  parts:['hc','dryscalp'] }, // Cut & Treatment — Dry Scalp
  { pkg:'pkgCO',  parts:['hc','hcolO'] },    // Cut & Color — Ordinary
  { pkg:'pkgCOg', parts:['hc','hcolG'] },    // Cut & Color — Organic
];

// Resolve a cart (array of service ids) into a package-adjusted breakdown:
//   { packages:[{pkg, parts, save}], leftovers:[id], total, dur, saved }
// Greedy: each recipe consumes its component ids once, and only when the package
// beats the sum of those parts — so the customer never pays MORE than à la carte.
export const applyPackages = (cart=[]) => {
  const ids = [...cart];
  const used = new Array(ids.length).fill(false);
  const packages = [];
  for(const r of PACKAGE_RECIPES){
    const slots = r.parts.map(pid => ids.findIndex((c,i)=>!used[i] && c===pid));
    if(slots.some(i=>i<0)) continue;                  // a component missing or already taken
    const partsSum = r.parts.reduce((sum,pid)=>sum+(svcById(pid)?.price||0),0);
    const pkg = svcById(r.pkg);
    if(!pkg || pkg.price>=partsSum) continue;         // apply only if it actually saves
    slots.forEach(i=>{ used[i]=true; });
    packages.push({ pkg, parts:r.parts, save: partsSum-pkg.price });
  }
  const leftovers = ids.filter((c,i)=>!used[i]);
  const indivPrice = leftovers.reduce((sum,id)=>sum+(svcById(id)?.price||0),0);
  const indivDur   = leftovers.reduce((sum,id)=>sum+(svcById(id)?.dur||0),0);
  return {
    packages, leftovers,
    total: indivPrice + packages.reduce((sum,p)=>sum+p.pkg.price,0),
    dur:   indivDur   + packages.reduce((sum,p)=>sum+p.pkg.dur,0),
    saved: packages.reduce((sum,p)=>sum+p.save,0),
  };
};

// Human label for a package-adjusted cart, e.g. "Cut & Shave + Hair Color — Organic".
// Package parts collapse into the package name; leftover services list as-is.
export const cartServiceLabel = (cart=[]) => {
  const { packages, leftovers } = applyPackages(cart);
  return [
    ...packages.map(p=>p.pkg.name + (p.pkg.sub?` — ${p.pkg.sub}`:'')),
    ...leftovers.map(id=>svcById(id)?.name).filter(Boolean),
  ].join(' + ');
};

export const tint = (hex, a) => {
  const h=hex.replace('#','');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
};

// Appointment statuses still "live" (not finished/voided). Used for upcoming
// counts, the next-up card, and the auto no-show grace (only 'booked' qualifies).
export const isLive = st => st==='booked' || st==='checked-in' || st==='in-progress';

export const statusMeta = st => {
  const m={
    booked:{label:'Booked',color:'#6E97C9'},          // blue
    'checked-in':{label:'Checked In',color:'#6FA886'}, // green
    'in-progress':{label:'In Progress',color:'#E0913F'},// orange
    completed:{label:'Completed',color:'#8A8378'},     // gray
    cancelled:{label:'Cancelled',color:'#C46A5A'},     // red
    'no-show':{label:'No Show',color:'#8B2F22'}        // dark red
  };
  return m[st]||m.booked;
};

export const ticketOf = (bookings, id) => {
  const i = bookings.findIndex(x=>x.id===id);
  return 'GB-'+(1024+(i<0?0:i));
};

export const slotFree = (bookings, barber, isoStr, start, dur, excludeId=null) => {
  const end = start+dur;
  return !bookings
    .filter(b=>b.barber===barber && b.date===isoStr && b.status!=='cancelled' && b.id!==excludeId)
    .some(b=> start < b.start+b.dur && end > b.start);
};

export const firstFree = (bookings, isoStr, start, dur, excludeId=null) => {
  for(const b of BARBERS){
    if(slotFree(bookings, b.id, isoStr, start, dur, excludeId)) return b.id;
  }
  return null;
};

export const genSlots = (bookings, date, barber, totalDur, leadHours=1, reschedulingId=null) => {
  if(!date) return [];
  const dur = totalDur||45;
  const isToday = date===iso(todayDate());
  const lead = leadHours*60;
  const minStart = isToday ? nowMin()+lead : 0;
  const out=[];
  for(let t=OPEN; t+dur<=CLOSE; t+=30){
    if(t<minStart) continue;
    const avail = barber==='any'
      ? firstFree(bookings, date, t, dur, reschedulingId)!=null
      : slotFree(bookings, barber, date, t, dur, reschedulingId);
    out.push({min:t,avail});
  }
  return out;
};

export const initBookings = () => {
  const today = todayDate();
  const dayIso = off => { const x = new Date(today); x.setDate(x.getDate()+off); return iso(x); };

  const defs = [
    [0,'b1',600,45,'Haircut',300,'Diego Ramos','completed'],
    [0,'b1',720,75,'Cut & Shave',550,'Paolo Cruz','confirmed'],
    [0,'b1',900,45,'Haircut',300,'Migs Tan','confirmed'],
    [0,'b2',630,60,"Guapito's Signature",350,'Andro Lim','completed'],
    [0,'b2',810,90,'Hair Color — Organic',1050,'Kiko Vera','confirmed'],
    [0,'b3',660,120,'Perm',2000,'Bea Santos','confirmed'],
    [0,'b3',900,45,'Beard Color — Ordinary',550,'Tom Aquino','no-show'],
    [0,'b4',600,30,'Signature Shave',300,'Rafa Diaz','completed'],
    [0,'b4',690,45,'Haircut',300,'Leo Mercado','confirmed'],
    [0,'b4',840,60,"Women's Cut",400,'Nina Cho','confirmed'],
    [1,'b1',600,45,'Haircut',300,'Walk-in','confirmed'],
    [1,'b2',660,90,'Cut & Color — Ordinary',1100,'Erik Pena','confirmed'],
    [1,'b3',720,150,'Highlights — Only',1200,'Sam Ong','confirmed'],
    [1,'b4',780,75,'Cut & Shave',550,'Jepoy Reyes','confirmed'],
    [2,'b2',630,45,'Haircut',300,'Carlo Yu','confirmed'],
    [2,'b3',900,120,'Cut & Color — Organic',1400,'Vince Lao','confirmed']
  ];
  const bookings = defs.map((d,i)=>({
    id:'seed'+i,date:dayIso(d[0]),barber:d[1],start:d[2],dur:d[3],
    service:d[4],price:d[5],customer:d[6],status:d[7],mine:false,pay:'shop',notes:'',followUp:false
  }));

  const HIST = [
    [-2,'b1',600,45,'Haircut',300,'Migs Tan','completed'],
    [-2,'b3',900,90,'Hair Color — Organic',1050,'Kiko Vera','completed'],
    [-3,'b2',720,75,'Cut & Shave',550,'Paolo Cruz','completed'],
    [-3,'b4',780,60,"Women's Cut",400,'Nina Cho','no-show'],
    [-5,'b1',660,45,'Haircut',300,'Leo Mercado','completed'],
    [-6,'b3',600,120,'Perm',2000,'Bea Santos','completed'],
    [-7,'b2',840,30,'Signature Shave',300,'Rafa Diaz','completed'],
    [-9,'b1',600,45,'Haircut',300,'Diego Ramos','completed'],
    [-10,'b4',690,45,'Beard Color — Ordinary',550,'Tom Aquino','completed'],
    [-12,'b2',720,120,'Cut & Color — Ordinary',1100,'Erik Pena','completed'],
    [-14,'b3',840,150,'Highlights — Only',1200,'Sam Ong','completed'],
    [-15,'b1',660,75,'Cut & Shave',550,'Jepoy Reyes','completed'],
    [-18,'b2',630,45,'Haircut',300,'Carlo Yu','completed'],
    [-20,'b1',600,45,'Haircut',300,'Migs Tan','completed'],
    [-22,'b3',810,90,'Hair Color — Organic',1050,'Kiko Vera','completed'],
    [-25,'b2',720,75,'Cut & Shave',550,'Paolo Cruz','cancelled'],
    [-28,'b1',660,60,"Guapito's Signature",350,'Andro Lim','completed']
  ];
  HIST.forEach((d,i)=>bookings.push({
    id:'hist'+i,date:dayIso(d[0]),barber:d[1],start:d[2],dur:d[3],
    service:d[4],price:d[5],customer:d[6],status:d[7],mine:false,
    pay:(i%3===0?'online':'shop'),notes:'',followUp:false
  }));

  bookings.push({id:'mine1',date:dayIso(3),barber:'b1',start:660,dur:45,service:'Haircut',price:300,customer:'You',status:'confirmed',mine:true,pay:'online',notes:'Mid skin fade, scissor on top',followUp:false});
  bookings.push({id:'minepast',date:dayIso(-7),barber:'b2',start:720,dur:75,service:'Cut & Shave',price:550,customer:'You',status:'completed',mine:true,pay:'shop',notes:'',followUp:false});

  return bookings;
};
