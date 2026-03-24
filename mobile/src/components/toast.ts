import { h } from '../utils/dom';

export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const colors = { info: '#D4A017', success: '#006B3F', error: '#CE1126' };

  // Count existing toasts to stack them
  const existing = document.querySelectorAll('.os-toast');
  const offset = existing.length * 48;

  const toast = h('div', {
    className: 'os-toast',
    style: {
      position: 'fixed',
      top: '0',
      left: '50%',
      transform: 'translateX(-50%) translateY(-100%)',
      background: colors[type],
      color: '#fff',
      padding: '12px 24px',
      borderRadius: '0 0 12px 12px',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(13px, 3.4vw, 14px)',
      fontWeight: '500',
      zIndex: '9999',
      transition: 'transform 300ms ease',
      maxWidth: '90vw',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    },
  }, message);

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = `translateX(-50%) translateY(${offset}px)`;
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(-100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
