import React, { useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';

const COLORS = [
  { name: 'Red', value: '#CE1126' },
  { name: 'Gold', value: '#D4A017' },
  { name: 'Green', value: '#006B3F' },
  { name: 'Blue', value: '#1565C0' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Teal', value: '#0891B2' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Pink', value: '#DB2777' },
];

interface CreateProfileFormProps {
  onCreated: (profile: any) => void;
  onCancel?: () => void;
  isFirstProfile?: boolean;
}

export function CreateProfileForm({ onCreated, onCancel, isFirstProfile }: CreateProfileFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[1].value); // Gold default
  const [step, setStep] = useState<'details' | 'pin' | 'confirm'>('details');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleNext = () => {
    if (step === 'details') {
      if (!name.trim()) {
        setError('Name is required');
        return;
      }
      setError('');
      setStep('pin');
    } else if (step === 'pin') {
      if (!/^\d{4}$/.test(pin)) {
        setError('PIN must be exactly 4 digits');
        return;
      }
      setError('');
      setStep('confirm');
    }
  };

  const handleCreate = async () => {
    if (confirmPin !== pin) {
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const result = await window.osBrowser.profiles.create(name.trim(), color, pin);
      if (result.success) {
        onCreated(result.profile);
      } else {
        setError(result.error || 'Failed to create profile');
        setCreating(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'confirm') handleCreate();
      else handleNext();
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto">
      {/* Back button (not on first step of first profile) */}
      {(step !== 'details' || (!isFirstProfile && onCancel)) && (
        <button
          onClick={() => {
            if (step === 'confirm') setStep('pin');
            else if (step === 'pin') setStep('details');
            else onCancel?.();
          }}
          className="flex items-center gap-1 text-[13px] text-text-muted hover:text-text-secondary transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      )}

      {step === 'details' && (
        <>
          <h2 className="text-[20px] font-bold text-text-primary mb-1 text-center">
            {isFirstProfile ? 'Create Your Profile' : 'New Profile'}
          </h2>
          <p className="text-[13px] text-text-muted text-center mb-6">
            {isFirstProfile ? 'Set up your first profile to get started.' : 'Add another person to this browser.'}
          </p>

          {/* Avatar preview */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200"
              style={{ background: color }}>
              <span className="text-[28px] font-bold text-white">{getInitials(name || '?')}</span>
            </div>
          </div>

          {/* Name input */}
          <div className="mb-4">
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Kwame Mensah"
              autoFocus
              maxLength={30}
              className="w-full px-3 py-2.5 rounded-xl text-[14px] outline-none border transition-all focus:ring-2"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
                '--tw-ring-color': 'var(--color-accent)',
              } as React.CSSProperties}
            />
          </div>

          {/* Color picker */}
          <div className="mb-5">
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2 block">
              Profile Color
            </label>
            <div className="flex gap-2.5 justify-center">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className="w-9 h-9 rounded-full transition-all duration-150 flex items-center justify-center"
                  style={{
                    background: c.value,
                    boxShadow: color === c.value ? `0 0 0 3px var(--color-surface-1), 0 0 0 5px ${c.value}` : 'none',
                    transform: color === c.value ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={c.name}
                  aria-label={c.name}
                >
                  {color === c.value && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-red-500 text-center mb-3">{error}</p>}

          <button
            onClick={handleNext}
            className="w-full py-2.5 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            Next — Set PIN
          </button>
        </>
      )}

      {step === 'pin' && (
        <>
          <h2 className="text-[20px] font-bold text-text-primary mb-1 text-center">Set a PIN</h2>
          <p className="text-[13px] text-text-muted text-center mb-6">
            Choose a 4-digit PIN to protect this profile.
          </p>

          <div className="relative mb-5">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) { setPin(e.target.value); setError(''); } }}
              onKeyDown={handleKeyDown}
              placeholder="Enter 4-digit PIN"
              autoFocus
              maxLength={4}
              inputMode="numeric"
              className="w-full px-4 py-3 rounded-xl text-[18px] text-center tracking-[0.5em] font-mono outline-none border transition-all focus:ring-2"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
                '--tw-ring-color': 'var(--color-accent)',
              } as React.CSSProperties}
            />
            <button
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-surface-2 transition-colors"
              tabIndex={-1}
              aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              {showPin ? <EyeOff size={16} className="text-text-muted" /> : <Eye size={16} className="text-text-muted" />}
            </button>
          </div>

          {error && <p className="text-[12px] text-red-500 text-center mb-3">{error}</p>}

          <button
            onClick={handleNext}
            disabled={pin.length !== 4}
            className="w-full py-2.5 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            Next — Confirm PIN
          </button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <h2 className="text-[20px] font-bold text-text-primary mb-1 text-center">Confirm PIN</h2>
          <p className="text-[13px] text-text-muted text-center mb-6">
            Re-enter your 4-digit PIN to confirm.
          </p>

          <div className="relative mb-5">
            <input
              type={showPin ? 'text' : 'password'}
              value={confirmPin}
              onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) { setConfirmPin(e.target.value); setError(''); } }}
              onKeyDown={handleKeyDown}
              placeholder="Confirm PIN"
              autoFocus
              maxLength={4}
              inputMode="numeric"
              className="w-full px-4 py-3 rounded-xl text-[18px] text-center tracking-[0.5em] font-mono outline-none border transition-all focus:ring-2"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
                '--tw-ring-color': 'var(--color-accent)',
              } as React.CSSProperties}
            />
            <button
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-surface-2 transition-colors"
              tabIndex={-1}
            >
              {showPin ? <EyeOff size={16} className="text-text-muted" /> : <Eye size={16} className="text-text-muted" />}
            </button>
          </div>

          {error && <p className="text-[12px] text-red-500 text-center mb-3">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={confirmPin.length !== 4 || creating}
            className="w-full py-2.5 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #CE1126 0%, #006B3F 100%)', color: '#fff' }}
          >
            {creating ? 'Creating...' : 'Create Profile'}
          </button>
        </>
      )}

      <p className="text-[10px] text-text-muted text-center mt-4">
        Your PIN protects this profile's browsing data on this device.
      </p>
    </div>
  );
}
