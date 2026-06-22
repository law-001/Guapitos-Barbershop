export default function ProfileView({ user, goBook, onSignOut }) {
  const accent = '#D6C3A0', hair = '#2A2622';
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initial = (user.firstName || user.email || '?').trim().charAt(0).toUpperCase();

  // Not signed in — nudge into the booking flow where sign-in lives.
  if(!user.signedIn){
    return (
      <main style={{maxWidth:'820px',margin:'0 auto',padding:'clamp(28px,5vw,52px) clamp(16px,4vw,32px) 80px',animation:'gbfade 0.4s ease both'}}>
        <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:accent,marginBottom:'10px'}}>Guest</div>
        <h1 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(30px,5vw,52px)',margin:'0 0 24px',lineHeight:'1'}}>Profile</h1>
        <div style={{background:'#15130F',border:'1px solid '+hair,borderRadius:'14px',padding:'30px',textAlign:'center',color:'#9A9388'}}>
          You&apos;re not signed in. <button onClick={goBook} style={{background:'none',border:'none',color:accent,cursor:'pointer',fontSize:'16px',textDecoration:'underline'}}>Start a booking</button> to sign in with your email.
        </div>
      </main>
    );
  }

  const rows = [
    ['Email', user.email],
    ['First name', user.firstName],
    ['Last name', user.lastName],
    ['Mobile', user.mobile],
  ];

  return (
    <main style={{maxWidth:'820px',margin:'0 auto',padding:'clamp(28px,5vw,52px) clamp(16px,4vw,32px) 80px',animation:'gbfade 0.4s ease both'}}>
      <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:accent,marginBottom:'10px'}}>Signed in</div>
      <h1 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(30px,5vw,52px)',margin:'0 0 30px',lineHeight:'1'}}>Profile</h1>

      <div style={{maxWidth:'520px',background:'#15130F',border:'1px solid '+hair,borderRadius:'16px',padding:'24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px',paddingBottom:'18px',borderBottom:'1px solid '+hair}}>
          <span style={{flexShrink:'0',display:'flex',alignItems:'center',justifyContent:'center',width:'56px',height:'56px',borderRadius:'50%',background:accent,color:'#0E0E0E',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'24px'}}>{initial}</span>
          <div style={{minWidth:'0'}}>
            <div style={{fontFamily:"'Oswald'",fontSize:'20px',lineHeight:'1.2'}}>{fullName || 'Your profile'}</div>
            <div style={{color:'#9A9388',fontSize:'14px',wordBreak:'break-word'}}>{user.email}</div>
          </div>
        </div>
        <div style={{paddingTop:'6px'}}>
          {rows.map(([label, value]) => (
            <div key={label} style={{display:'flex',justifyContent:'space-between',gap:'12px',padding:'14px 0',borderBottom:'1px solid '+hair}}>
              <span style={{color:'#9A9388'}}>{label}</span>
              <span style={{fontFamily:"'Oswald'",fontSize:'16px',textAlign:'right',wordBreak:'break-word'}}>{value || <span style={{color:'#6b645b'}}>—</span>}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{maxWidth:'520px',display:'flex',flexWrap:'wrap',gap:'10px',marginTop:'18px'}}>
        <button onClick={goBook} style={{cursor:'pointer',background:accent,color:'#0E0E0E',border:'none',borderRadius:'9px',padding:'13px 20px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.05em',textTransform:'uppercase',fontSize:'14px'}}>Book an appointment</button>
        <button onClick={onSignOut} style={{cursor:'pointer',background:'transparent',color:'#F4EFE7',border:'1px solid '+hair,borderRadius:'9px',padding:'13px 20px',fontWeight:'600',fontSize:'14px'}}>Sign out</button>
      </div>
    </main>
  );
}
