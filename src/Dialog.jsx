// Reusable in-app dialog — replaces native window.confirm / alert.
// Driven by App state (`state.dialog`). Shape:
//   { message, title?, onConfirm?, confirmText?, cancelText?, danger? }
// If `onConfirm` is a function it renders Confirm + Cancel; otherwise just OK.
export default function Dialog({ dialog, onClose }) {
  if (!dialog) return null;
  const accent = '#D6C3A0';
  const danger = '#C46A5A';
  const isConfirm = typeof dialog.onConfirm === 'function';
  const primary = dialog.danger ? danger : accent;

  const confirm = () => { if (dialog.onConfirm) dialog.onConfirm(); onClose(); };

  return (
    <div style={{position:'fixed',inset:'0',zIndex:'200',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div onClick={onClose} style={{position:'absolute',inset:'0',background:'rgba(0,0,0,0.6)',animation:'gbback 0.18s ease both'}}></div>
      <div role="dialog" aria-modal="true" style={{position:'relative',width:'min(400px,94vw)',background:'#15130F',border:'1px solid #2A2622',borderRadius:'16px',padding:'24px',boxShadow:'0 20px 60px rgba(0,0,0,0.5)',animation:'gbfade 0.2s ease both'}}>
        {dialog.title && (
          <div style={{fontFamily:"'Oswald'",fontSize:'19px',marginBottom:'8px',color:'#F4EFE7'}}>{dialog.title}</div>
        )}
        <div style={{fontSize:'14.5px',color:'#C9C2B6',lineHeight:'1.5',marginBottom:'22px'}}>{dialog.message}</div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:'10px'}}>
          {isConfirm && (
            <button onClick={onClose}
              style={{cursor:'pointer',background:'#1D1A15',border:'1px solid #2A2622',color:'#F4EFE7',borderRadius:'9px',padding:'10px 16px',fontWeight:'600',fontSize:'14px'}}>
              {dialog.cancelText || 'Cancel'}
            </button>
          )}
          <button onClick={confirm}
            style={{cursor:'pointer',background:primary,border:'none',color:'#0E0E0E',borderRadius:'9px',padding:'10px 18px',fontWeight:'700',fontSize:'14px'}}>
            {dialog.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
