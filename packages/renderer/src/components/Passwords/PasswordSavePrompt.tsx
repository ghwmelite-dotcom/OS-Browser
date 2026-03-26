import React, { useEffect, useState } from 'react';

interface PasswordSavePromptProps {
  domain: string;
  username: string;
  password: string;
  url: string;
  onSave: () => void;
  onNever: () => void;
  onDismiss: () => void;
}

export function PasswordSavePrompt({
  domain,
  username,
  onSave,
  onNever,
  onDismiss,
}: PasswordSavePromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-down animation
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 15 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 15000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleSave = () => {
    setVisible(false);
    setTimeout(onSave, 200);
  };

  const handleNever = () => {
    setVisible(false);
    setTimeout(onNever, 200);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        padding: '8px 16px',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderRadius: 12,
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border-1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          maxWidth: 560,
          width: '100%',
          pointerEvents: 'auto',
        }}
      >
        {/* Key icon */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Save password for{' '}
            <span style={{ color: 'var(--color-accent)' }}>{domain}</span>?
          </p>
          <p
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              margin: '2px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {username}
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          style={{
            padding: '6px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: '#3B82F6',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Save
        </button>

        {/* Never button */}
        <button
          onClick={handleNever}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border-1)',
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          Never
        </button>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--color-text-muted)',
            fontSize: 18,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
