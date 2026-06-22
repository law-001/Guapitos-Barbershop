import { useEffect, useRef } from 'react';

// Small auto-dismissing notification at the bottom of the screen.
// Fades in, holds, then fades out — fully gone after 2s (gbtoast keyframe).
// Driven by App state: `toast` ({ message, type, linkText?, action? }) + `nonce`.
// type: 'success' (green) | 'danger' (red) | 'info' (tan).
// If `linkText`/`action` are set, linkText renders as a clickable link.
export default function Toast({ toast, nonce, onClose }) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!nonce) return;
    const t = setTimeout(() => closeRef.current(), 5000);
    return () => clearTimeout(t);
  }, [nonce]);

  if (!toast) return null;

  const colors = { success: '#6FA886', danger: '#C46A5A', info: '#D6C3A0' };
  const icons = { success: '✓', danger: '✕', info: '↻' };
  const c = colors[toast.type] || colors.info;
  const icon = icons[toast.type] || icons.info;

  const onLink = () => { if (toast.action) toast.action(); closeRef.current(); };

  return (
    <div style={{position:'fixed',left:'0',right:'0',bottom:'28px',zIndex:'210',display:'flex',justifyContent:'center',pointerEvents:'none',padding:'0 16px'}}>
      <div key={nonce} style={{pointerEvents:'auto',display:'flex',alignItems:'center',gap:'11px',background:'#1D1A15',border:'1px solid '+c,borderRadius:'999px',padding:'11px 20px 11px 14px',boxShadow:'0 12px 34px rgba(0,0,0,0.45)',animation:'gbtoast 5s ease forwards',maxWidth:'92vw'}}>
        <span style={{flexShrink:'0',width:'24px',height:'24px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:c,color:'#0E0E0E',fontSize:'13px',fontWeight:'700'}}>{icon}</span>
        <span style={{fontSize:'14px',fontWeight:'600',color:'#F4EFE7',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          {toast.message}
          {toast.linkText && (
            <span onClick={onLink} style={{color:c,textDecoration:'underline',cursor:'pointer',marginLeft:'5px'}}>{toast.linkText}</span>
          )}
        </span>
      </div>
    </div>
  );
}
