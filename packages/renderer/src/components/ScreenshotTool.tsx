import React, { useState } from 'react';
import { Camera, Check, Monitor, Maximize, Scissors } from 'lucide-react';

export function ScreenshotButton() {
  const [showMenu, setShowMenu] = useState(false);
  const [status, setStatus] = useState<'idle' | 'done'>('idle');
  const [message, setMessage] = useState('');

  const showSuccess = (msg: string) => {
    setStatus('done');
    setMessage(msg);
    setTimeout(() => { setStatus('idle'); setMessage(''); }, 2500);
  };

  const captureVisiblePage = async () => {
    setShowMenu(false);
    // Show web views so we capture actual page content
    window.osBrowser?.showWebViews?.();
    // Brief delay to let views render
    await new Promise(r => setTimeout(r, 400));
    try {
      const result = await (window.osBrowser as any)?.captureScreenshot?.();
      if (result?.success) {
        showSuccess(`Saved: ${result.filename}`);
      } else if (result?.error === 'Cancelled') {
        // User cancelled Save As dialog — no message needed
      } else {
        showSuccess(result?.error || 'Screenshot failed');
      }
    } catch {
      showSuccess('Screenshot failed');
    }
  };

  const captureFullPage = async () => {
    await captureVisiblePage();
  };

  const captureSelection = () => {
    setShowMenu(false);
    window.osBrowser?.showWebViews?.();
    showSuccess('Selection capture — coming soon');
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          const newState = !showMenu;
          setShowMenu(newState);
          if (newState) window.osBrowser?.hideWebViews?.();
          else window.osBrowser?.showWebViews?.();
        }}
        className="w-[32px] h-[32px] flex items-center justify-center rounded-full transition-all duration-100 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold/40"
        aria-label="Screenshot" title="Screenshot"
      >
        {status === 'done' ? (
          <Check size={15} strokeWidth={1.8} style={{ color: 'var(--color-accent-green)' }} />
        ) : (
          <Camera size={15} strokeWidth={1.8} className="text-text-secondary" />
        )}
      </button>

      {message && !showMenu && (
        <div className="absolute top-full right-0 mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap shadow-lg z-[100]"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)', color: 'var(--color-accent-green)' }}>
          <span className="flex items-center gap-1.5"><Check size={11} /> {message}</span>
        </div>
      )}

      {showMenu && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => { setShowMenu(false); window.osBrowser?.showWebViews?.(); }} />
          <div className="absolute top-full right-0 mt-2 w-[220px] rounded-xl border shadow-2xl z-[100] py-1.5 overflow-hidden"
            style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>

            <p className="px-4 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wider">Capture</p>

            <button onClick={captureVisiblePage}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors">
              <Monitor size={14} className="text-text-muted" />
              <div>
                <div className="text-[13px] text-text-primary">Visible Area</div>
                <div className="text-[10px] text-text-muted">Capture what's on screen</div>
              </div>
            </button>

            <button onClick={captureFullPage}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors">
              <Maximize size={14} className="text-text-muted" />
              <div>
                <div className="text-[13px] text-text-primary">Full Page</div>
                <div className="text-[10px] text-text-muted">Entire scrollable page</div>
              </div>
            </button>

            <button onClick={captureSelection}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors">
              <Scissors size={14} className="text-text-muted" />
              <div>
                <div className="text-[13px] text-text-primary">Selected Area</div>
                <div className="text-[10px] text-text-muted">Draw to capture a region</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
