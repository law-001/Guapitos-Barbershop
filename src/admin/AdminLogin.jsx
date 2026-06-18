export default function AdminLogin({ adminUser, adminPass, adminErr, onAdminUser, onAdminPass, adminLogin, goHome }) {
  const pole = {
    display:'block',width:'34px',height:'5px',borderRadius:'3px',
    background:'repeating-linear-gradient(135deg,#D6C3A0 0 7px,#15130F 7px 14px)',
    backgroundSize:'40px 100%',animation:'gbpole 1.6s linear infinite'
  };
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',background:'radial-gradient(120% 90% at 50% 0%,#16130F 0%,#0B0B0B 70%)'}}>
      <div style={{width:'100%',maxWidth:'400px',animation:'gbfade 0.5s ease both'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',marginBottom:'26px'}}>
          <img src="/assets/logo.jpg" alt="Guapito's" style={{height:'60px',borderRadius:'8px',marginBottom:'18px'}}/>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={pole}></span>
            <span style={{fontFamily:"'Oswald'",letterSpacing:'0.2em',textTransform:'uppercase',fontSize:'12px',color:'#D6C3A0'}}>Staff Console</span>
          </div>
          <h1 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'30px',margin:'14px 0 4px',lineHeight:'1'}}>Run the floor</h1>
          <p style={{color:'#9A9388',fontSize:'14px',margin:'0'}}>Owner &amp; barber access · Guapito's Barbershop</p>
        </div>
        <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'16px',padding:'24px'}}>
          <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Username</label>
          <input value={adminUser} onChange={onAdminUser} placeholder="manager" autoComplete="username"
            style={{width:'100%',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'13px',color:'#F4EFE7',fontSize:'16px',marginBottom:'14px'}}/>
          <label style={{display:'block',fontSize:'13px',color:'#9A9388',marginBottom:'7px'}}>Password</label>
          <input type="password" value={adminPass} onChange={onAdminPass} placeholder="••••••••" autoComplete="current-password"
            style={{width:'100%',background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'10px',padding:'13px',color:'#F4EFE7',fontSize:'16px',marginBottom:'16px'}}/>
          {adminErr && (
            <div style={{background:'rgba(196,106,90,0.12)',border:'1px solid rgba(196,106,90,0.4)',color:'#E0A095',borderRadius:'9px',padding:'10px 12px',fontSize:'13px',marginBottom:'14px'}}>{adminErr}</div>
          )}
          <button onClick={adminLogin}
            style={{width:'100%',cursor:'pointer',background:'#D6C3A0',color:'#0E0E0E',border:'none',borderRadius:'10px',padding:'14px',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px'}}>Sign in</button>
          <div style={{marginTop:'16px',paddingTop:'15px',borderTop:'1px solid #2A2622',display:'flex',alignItems:'center',gap:'10px',fontSize:'12.5px',color:'#9A9388'}}>
            <span style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',color:'#5e574d'}}>Demo</span>
            <span>user <b style={{color:'#F4EFE7'}}>manager</b> · pass <b style={{color:'#F4EFE7'}}>guapito</b></span>
          </div>
        </div>
        <button onClick={goHome} style={{display:'block',margin:'18px auto 0',background:'transparent',border:'none',color:'#9A9388',fontSize:'13px',cursor:'pointer'}}>← Back to the customer site</button>
      </div>
    </div>
  );
}
