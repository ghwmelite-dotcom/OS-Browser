import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Copy, Check, Plus, Eye, EyeOff, KeyRound, Clock, X, Link2 } from 'lucide-react';

interface TOTPManagerProps {
  credentialId: string;
  onClose?: () => void;
}

interface TOTPData {
  secret: string;
  issuer?: string;
  account?: string;
}

export default function TOTPManager({ credentialId, onClose }: TOTPManagerProps) {
  const [totpData, setTotpData] = useState<TOTPData | null>(null);
  const [currentCode, setCurrentCode] = useState('------');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupMode, setSetupMode] = useState<'manual' | 'uri'>('manual');
  const [secretInput, setSecretInput] = useState('');
  const [uriInput, setUriInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing TOTP for this credential
  useEffect(() => {
    loadTOTP();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [credentialId]);

  const loadTOTP = async () => {
    try {
      const result = await (window as any).osBrowser.totp.getTotp(credentialId);
      if (result) {
        setTotpData({ secret: result.secret });
        setCurrentCode(result.code);
        setTimeRemaining(result.timeRemaining);
        startRefreshTimer(result.secret);
      }
    } catch {
      // No TOTP configured for this credential
    }
  };

  const startRefreshTimer = useCallback((secret: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const result = await (window as any).osBrowser.totp.generate(secret);
        if (result) {
          setCurrentCode(result.code);
          setTimeRemaining(result.timeRemaining);
        }
      } catch { /* timer error — non-critical */ }
    }, 1000);
  }, []);

  const handleSaveSecret = async () => {
    setError('');
    let secret = '';

    if (setupMode === 'uri') {
      try {
        const parsed = await (window as any).osBrowser.totp.parseUri(uriInput.trim());
        if (!parsed) {
          setError('Invalid otpauth:// URI');
          return;
        }
        secret = parsed.secret;
        setTotpData({ secret, issuer: parsed.issuer, account: parsed.account });
      } catch {
        setError('Failed to parse URI');
        return;
      }
    } else {
      secret = secretInput.trim().replace(/\s/g, '').toUpperCase();
      if (secret.length < 16) {
        setError('Secret must be at least 16 characters');
        return;
      }
      setTotpData({ secret });
    }

    try {
      await (window as any).osBrowser.totp.saveTotp(credentialId, secret);
      setShowSetup(false);
      setSecretInput('');
      setUriInput('');
      startRefreshTimer(secret);

      // Generate initial code
      const result = await (window as any).osBrowser.totp.generate(secret);
      if (result) {
        setCurrentCode(result.code);
        setTimeRemaining(result.timeRemaining);
      }
    } catch {
      setError('Failed to save TOTP secret');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      const codes = await (window as any).osBrowser.totp.generateBackupCodes();
      setBackupCodes(codes);
      setShowBackupCodes(true);
    } catch { /* failed to generate */ }
  };

  // Countdown arc
  const arcProgress = timeRemaining / 30;
  const arcStrokeDasharray = `${arcProgress * 88} 88`;

  // If no TOTP is configured, show the add button
  if (!totpData && !showSetup) {
    return (
      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-1)' }}>
        <button
          onClick={() => setShowSetup(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors hover:bg-surface-2 w-full"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Shield size={14} />
          <span>Add 2FA (TOTP)</span>
          <Plus size={12} className="ml-auto" />
        </button>
      </div>
    );
  }

  // Setup form
  if (showSetup) {
    return (
      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-1)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
            <Shield size={14} /> Setup 2FA
          </span>
          <button
            onClick={() => { setShowSetup(false); setError(''); }}
            className="p-1 rounded hover:bg-surface-2 transition-colors"
          >
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-3 p-0.5 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          <button
            onClick={() => setSetupMode('manual')}
            className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${
              setupMode === 'manual' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted'
            }`}
            style={setupMode === 'manual' ? { background: 'var(--color-surface-1)' } : {}}
          >
            <KeyRound size={11} /> Manual
          </button>
          <button
            onClick={() => setSetupMode('uri')}
            className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${
              setupMode === 'uri' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted'
            }`}
            style={setupMode === 'uri' ? { background: 'var(--color-surface-1)' } : {}}
          >
            <Link2 size={11} /> URI Paste
          </button>
        </div>

        {setupMode === 'manual' ? (
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-text-muted mb-1">Base32 Secret Key</label>
            <input
              type={showSecret ? 'text' : 'password'}
              value={secretInput}
              onChange={e => setSecretInput(e.target.value)}
              placeholder="JBSWY3DPEHPK3PXP..."
              className="w-full px-3 py-2 rounded-lg border text-[12px] text-text-primary font-mono outline-none transition-colors focus:ring-2 focus:ring-ghana-gold/40"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
            />
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="flex items-center gap-1 mt-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              {showSecret ? <EyeOff size={10} /> : <Eye size={10} />}
              {showSecret ? 'Hide' : 'Show'} secret
            </button>
          </div>
        ) : (
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-text-muted mb-1">OTPAuth URI</label>
            <input
              type="text"
              value={uriInput}
              onChange={e => setUriInput(e.target.value)}
              placeholder="otpauth://totp/Issuer:account?secret=..."
              className="w-full px-3 py-2 rounded-lg border text-[12px] text-text-primary font-mono outline-none transition-colors focus:ring-2 focus:ring-ghana-gold/40"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
            />
          </div>
        )}

        {error && (
          <div className="text-[11px] text-red-500 mb-2">{error}</div>
        )}

        <button
          onClick={handleSaveSecret}
          className="w-full px-3 py-2 rounded-lg text-[12px] font-medium text-white transition-colors hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          Save & Enable 2FA
        </button>
      </div>
    );
  }

  // TOTP display
  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-1)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Shield size={13} className="text-green-500" />
        <span className="text-[11px] font-semibold text-green-500">2FA Enabled</span>
        {totpData?.issuer && (
          <span className="text-[10px] text-text-muted ml-auto">{totpData.issuer}</span>
        )}
      </div>

      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ background: 'var(--color-surface-2)' }}
      >
        {/* Countdown ring */}
        <div className="relative w-10 h-10 shrink-0">
          <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
            <circle
              cx="20" cy="20" r="14"
              stroke="var(--color-border-1)"
              strokeWidth="3"
              fill="none"
            />
            <circle
              cx="20" cy="20" r="14"
              stroke={timeRemaining <= 5 ? '#ef4444' : 'var(--color-accent)'}
              strokeWidth="3"
              fill="none"
              strokeDasharray={arcStrokeDasharray}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[10px] font-bold"
              style={{ color: timeRemaining <= 5 ? '#ef4444' : 'var(--color-text-secondary)' }}
            >
              {timeRemaining}
            </span>
          </div>
        </div>

        {/* Code display */}
        <div className="flex-1">
          <div
            className="text-[22px] font-bold tracking-[0.25em] font-mono"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {currentCode.slice(0, 3)} {currentCode.slice(3)}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <Clock size={9} />
            <span>Refreshes every 30s</span>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyCode}
          className="p-2 rounded-lg hover:bg-surface-3 transition-colors shrink-0"
          title="Copy code"
        >
          {copied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} className="text-text-muted" />
          )}
        </button>
      </div>

      {/* Backup codes toggle */}
      <div className="mt-2">
        <button
          onClick={handleGenerateBackupCodes}
          className="text-[11px] text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
        >
          <KeyRound size={10} />
          {showBackupCodes ? 'Regenerate Backup Codes' : 'Generate Backup Codes'}
        </button>

        {showBackupCodes && backupCodes.length > 0 && (
          <div
            className="mt-2 p-3 rounded-lg border"
            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-text-primary">Backup Codes</span>
              <button
                onClick={() => setShowBackupCodes(false)}
                className="p-0.5 rounded hover:bg-surface-3 transition-colors"
              >
                <X size={12} className="text-text-muted" />
              </button>
            </div>
            <p className="text-[10px] text-text-muted mb-2">
              Save these codes securely. Each can be used once if you lose your authenticator.
            </p>
            <div className="grid grid-cols-2 gap-1">
              {backupCodes.map((code, i) => (
                <div
                  key={i}
                  className="text-[11px] font-mono text-text-primary px-2 py-1 rounded"
                  style={{ background: 'var(--color-surface-1)' }}
                >
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
