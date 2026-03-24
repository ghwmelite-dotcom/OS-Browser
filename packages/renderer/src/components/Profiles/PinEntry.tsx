import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Delete } from 'lucide-react';
import type { ProfilePublic } from '@/store/profiles';

interface PinEntryProps {
  profile: ProfilePublic;
  onVerified: () => void;
  onCancel: () => void;
}

export function PinEntry({ profile, onVerified, onCancel }: PinEntryProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const shakeRef = useRef(false);

  const MAX_ATTEMPTS = 3;
  const LOCK_SECONDS = 30;

  // Countdown timer for lock
  useEffect(() => {
    if (!lockUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) {
        setLockUntil(null);
        setAttempts(0);
        setLockCountdown(0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleDigit = useCallback(async (digit: string) => {
    if (lockUntil) return;
    if (pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      // Verify PIN
      try {
        const valid = await window.osBrowser.profiles.verifyPin(profile.id, newPin);
        if (valid) {
          onVerified();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setError(true);
          shakeRef.current = true;
          setTimeout(() => {
            setPin('');
            setError(false);
            shakeRef.current = false;
          }, 600);

          if (newAttempts >= MAX_ATTEMPTS) {
            setLockUntil(Date.now() + LOCK_SECONDS * 1000);
            setLockCountdown(LOCK_SECONDS);
          }
        }
      } catch {
        setPin('');
        setError(true);
      }
    }
  }, [pin, attempts, lockUntil, profile.id, onVerified]);

  const handleBackspace = useCallback(() => {
    if (lockUntil) return;
    setPin(p => p.slice(0, -1));
    setError(false);
  }, [lockUntil]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Backspace') {
        handleBackspace();
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDigit, handleBackspace, onCancel]);

  const isLocked = lockUntil !== null && lockCountdown > 0;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>

      <div className="w-[calc(100%-2rem)] max-w-[340px] rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>

        {/* Kente crown */}
        <div style={{
          height: 3,
          background: 'var(--kente-crown)',
          borderRadius: '16px 16px 0 0',
        }} />

        {/* Cancel button */}
        <div className="flex justify-end px-4 pt-3">
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-surface-2 transition-colors"
            aria-label="Cancel">
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        {/* Profile avatar and name */}
        <div className="flex flex-col items-center px-6 pb-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg"
            style={{ background: profile.color }}>
            <span className="text-[22px] font-bold text-white">{getInitials(profile.name)}</span>
          </div>
          <span className="text-[15px] font-semibold text-text-primary">{profile.name}</span>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 py-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i}
              className="w-3.5 h-3.5 rounded-full transition-all duration-150"
              style={{
                background: i < pin.length
                  ? (error ? '#e53e3e' : 'var(--color-accent)')
                  : 'var(--color-border-2)',
                transform: error && shakeRef.current ? `translateX(${Math.sin(Date.now() / 30) * 8}px)` : 'none',
                animation: error ? 'pinShake 0.5s ease-in-out' : 'none',
              }}
            />
          ))}
        </div>

        {/* Lock message or error */}
        <div className="text-center h-6 mb-2">
          {isLocked ? (
            <span className="text-[12px] text-red-500 font-medium">
              Too many attempts. Try again in {lockCountdown}s
            </span>
          ) : error ? (
            <span className="text-[12px] text-red-500 font-medium">Wrong PIN</span>
          ) : (
            <span className="text-[12px] text-text-muted">Enter your 4-digit PIN</span>
          )}
        </div>

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2 px-8 pb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key) => {
            if (key === '') return <div key="empty" />;
            if (key === 'back') {
              return (
                <button key="back" onClick={handleBackspace} disabled={isLocked}
                  className="h-12 rounded-xl flex items-center justify-center transition-all hover:bg-surface-2 active:scale-95 disabled:opacity-30"
                  style={{ background: 'var(--color-surface-2)' }}
                  aria-label="Backspace">
                  <Delete size={20} className="text-text-secondary" />
                </button>
              );
            }
            return (
              <button key={key} onClick={() => handleDigit(key)} disabled={isLocked}
                className="h-12 rounded-xl text-[18px] font-semibold text-text-primary transition-all hover:bg-surface-2 active:scale-95 disabled:opacity-30"
                style={{ background: 'var(--color-surface-2)' }}>
                {key}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-6px); }
          30%, 70% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
