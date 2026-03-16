import React, { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';

export function LoginView() {
  const authStep = useGovChatStore(s => s.authStep);
  const authError = useGovChatStore(s => s.authError);
  const redeemInviteCode = useGovChatStore(s => s.redeemInviteCode);
  const continueLocalMode = useGovChatStore(s => s.continueLocalMode);

  const [inviteCode, setInviteCode] = useState('');
  const [staffId, setStaffId] = useState('');
  const [displayName, setDisplayName] = useState('');

  const isRedeeming = authStep === 'redeeming';

  const isFormValid =
    inviteCode.trim().length === 8 &&
    staffId.trim().length > 0 &&
    displayName.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isRedeeming) return;
    await redeemInviteCode(inviteCode.trim().toUpperCase(), staffId.trim(), displayName.trim());
  };

  const handleInviteCodeChange = (val: string) => {
    // Force uppercase, alphanumeric only, max 8 chars
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setInviteCode(cleaned);
  };

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-4" style={{ background: 'var(--color-bg)' }}>
      <div
        className="w-full max-w-[300px] rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-border-1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Gold accent strip */}
        <div style={{ height: 4, background: '#D4A017' }} />

        <div className="p-4">
          {/* Header */}
          <div className="text-center mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(212, 160, 23, 0.12)' }}
            >
              <Shield size={20} style={{ color: '#D4A017' }} />
            </div>
            <h3 className="text-[15px] font-bold text-text-primary">
              GovChat — Secure Government Messenger
            </h3>
            <p className="text-[11.5px] text-text-muted mt-1.5 leading-snug">
              Enter your invite code provided by your IT administrator
            </p>
          </div>

          {/* Error */}
          {authError && (
            <div
              className="mb-3 px-3 py-2 rounded-lg text-[11px] font-medium"
              style={{ background: 'rgba(206, 17, 38, 0.1)', color: '#CE1126' }}
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            {/* Invite Code */}
            <div>
              <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => handleInviteCodeChange(e.target.value)}
                placeholder="XXXXXXXX"
                maxLength={8}
                autoFocus
                className="w-full px-3 py-1.5 rounded-lg text-[14px] font-mono tracking-widest text-text-primary text-center outline-none placeholder:text-text-muted uppercase"
                style={{
                  background: 'var(--color-surface-2)',
                  border: `1.5px solid ${
                    inviteCode.length === 8
                      ? '#006B3F'
                      : 'var(--color-border-1)'
                  }`,
                  letterSpacing: '0.2em',
                }}
              />
              <p className="text-[9.5px] text-text-muted mt-1 text-center">
                8-character code (letters and numbers)
              </p>
            </div>

            {/* Staff ID */}
            <div>
              <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">
                Staff ID
              </label>
              <input
                type="text"
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                placeholder="GH-12345"
                className="w-full px-3 py-1.5 rounded-lg text-[12.5px] text-text-primary outline-none placeholder:text-text-muted"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1.5px solid var(--color-border-1)',
                }}
              />
            </div>

            {/* Display Name */}
            <div>
              <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Kwame Nkrumah"
                className="w-full px-3 py-1.5 rounded-lg text-[12.5px] text-text-primary outline-none placeholder:text-text-muted"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1.5px solid var(--color-border-1)',
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isRedeeming || !isFormValid}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-opacity flex items-center justify-center gap-2 mt-1"
              style={{
                background: '#006B3F',
                opacity: isRedeeming || !isFormValid ? 0.5 : 1,
                cursor: isRedeeming ? 'wait' : 'pointer',
              }}
            >
              {isRedeeming && <Loader2 size={14} className="animate-spin" />}
              {isRedeeming ? 'Joining...' : 'Join GovChat'}
            </button>

            <p className="text-[9.5px] text-text-muted text-center mt-1 leading-snug">
              Your invite code is issued by your ministry's IT administrator.
              All communications are encrypted and retained per government policy.
            </p>
          </form>
        </div>
      </div>

      {/* Local mode link */}
      <button
        onClick={continueLocalMode}
        className="shrink-0 mt-4 text-[10.5px] text-text-muted underline underline-offset-2 hover:text-text-secondary transition-colors"
      >
        Continue in local mode (offline)
      </button>
    </div>
  );
}
