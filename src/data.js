export const SERVICES = [
  {id:'hc',cat:'Cuts & Shave',name:'Haircut',sub:'with shampoo',price:300,dur:45},
  {id:'sig',cat:'Cuts & Shave',name:"Guapito's Signature",sub:'shampoo + face massage',price:350,dur:60},
  {id:'shave',cat:'Cuts & Shave',name:'Signature Shave',sub:'',price:300,dur:30},
  {id:'wcut',cat:'Cuts & Shave',name:"Women's Cut",sub:'',price:400,dur:60},
  {id:'deepcon',cat:'Treatments',name:'Deep Conditioning',sub:'',price:900,dur:45},
  {id:'dryscalp',cat:'Treatments',name:'Dry Scalp Treatment',sub:'',price:950,dur:45},
  {id:'antidan',cat:'Treatments',name:'Anti Dandruff',sub:'',price:950,dur:45},
  {id:'massage',cat:'Treatments',name:'Massage',sub:'scalp / back / hand · 15 min',price:300,dur:15},
  {id:'hcolO',cat:'Color',name:'Hair Color — Ordinary',sub:'',price:750,dur:90},
  {id:'hcolG',cat:'Color',name:'Hair Color — Organic',sub:'',price:1050,dur:90},
  {id:'bcolO',cat:'Color',name:'Beard Color — Ordinary',sub:'',price:550,dur:45},
  {id:'bcolG',cat:'Color',name:'Beard Color — Organic',sub:'',price:850,dur:45},
  {id:'pkgCS',cat:'Packages',name:'Cut & Shave',sub:'',price:550,dur:75},
  {id:'pkgDC',cat:'Packages',name:'Cut & Treatment',sub:'Deep Conditioning',price:1200,dur:90},
  {id:'pkgAD',cat:'Packages',name:'Cut & Treatment',sub:'Anti Dandruff / Dry Scalp',price:1250,dur:90},
  {id:'pkgCO',cat:'Packages',name:'Cut & Color — Ordinary',sub:'',price:1100,dur:120},
  {id:'pkgCOg',cat:'Packages',name:'Cut & Color — Organic',sub:'',price:1400,dur:120},
  {id:'perm',cat:'Packages',name:'Perm',sub:'',price:2000,dur:120},
  {id:'hlO',cat:'Packages',name:'Highlights — Only',sub:'',price:1200,dur:150},
  {id:'hlB',cat:'Packages',name:'Highlights — w/ Base Color',sub:'',price:1900,dur:150},
  {id:'bleach',cat:'Packages',name:'Bleach / Fashion Color',sub:'',price:1800,dur:150}
];

export const CATS = ['Cuts & Shave','Treatments','Color','Packages'];

export const BARBERS = [
  {id:'b1',name:'Marco Cano',spec:'Skin fades & tapers',initials:'MC',color:'#D6C3A0'},
  {id:'b2',name:'Rico Delgado',spec:'Classic cuts & hot-towel shaves',initials:'RD',color:'#A8B59A'},
  {id:'b3',name:'Tonio Reyes',spec:'Color, highlights & perms',initials:'TR',color:'#9FB4C2'},
  {id:'b4',name:'JP Salcedo',spec:'Beard sculpting & kids cuts',initials:'JP',color:'#C89B72'}
];

export const PHONES = {
  'Diego Ramos':'0917 555 0142','Paolo Cruz':'0917 233 8841','Migs Tan':'0918 770 1209','Andro Lim':'0915 442 6677',
  'Kiko Vera':'0917 909 3321','Bea Santos':'0916 558 0042','Tom Aquino':'0905 661 7788','Rafa Diaz':'0917 014 9920',
  'Leo Mercado':'0919 332 1144','Nina Cho':'0917 880 4521','Erik Pena':'0908 221 9087','Sam Ong':'0917 600 1132',
  'Jepoy Reyes':'0915 778 3360','Carlo Yu':'0917 449 2288','Vince Lao':'0918 003 7741','You':'0917 555 0142'
};

export const ACTIVITY = [
  {who:'Migs Tan',action:'booked a Haircut',detail:'3:00 PM today · with Marco Cano',ago:'12m',color:'#D6C3A0'},
  {who:'Tonio Reyes',action:'marked a Perm as done',detail:'Bea Santos · ₱2,000 collected',ago:'48m',color:'#6FA886'},
  {who:'Kiko Vera',action:'paid online for Hair Color',detail:'1:30 PM today · with Rico Delgado',ago:'1h',color:'#D6C3A0'},
  {who:'Tom Aquino',action:'was a no-show',detail:'3:00 PM slot · Tonio Reyes freed up',ago:'2h',color:'#C46A5A'},
  {who:'JP Salcedo',action:'completed a Signature Shave',detail:'Rafa Diaz · ₱300 collected',ago:'3h',color:'#6FA886'},
  {who:'Erik Pena',action:'rescheduled to tomorrow',detail:'Cut & Color · 11:00 AM with Rico Delgado',ago:'5h',color:'#9FB4C2'}
];

export const OPEN = 540;
export const CLOSE = 1140;
