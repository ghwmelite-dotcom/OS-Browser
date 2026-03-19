import React, { useEffect, useRef, useState } from 'react';
import { Shield, Loader2, ArrowLeft, Send, Globe } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import { useNotificationStore } from '@/store/notifications';
import { useProfileStore } from '@/store/profile';

type ViewMode = 'login' | 'request' | 'public';

export function LoginView() {
  const authStep = useGovChatStore(s => s.authStep);
  const authError = useGovChatStore(s => s.authError);
  const redeemInviteCode = useGovChatStore(s => s.redeemInviteCode);
  const continueLocalMode = useGovChatStore(s => s.continueLocalMode);
  const loginWithCredentials = useGovChatStore(s => s.loginWithCredentials);

  const [view, setView] = useState<ViewMode>('login');

  // Login form state
  const [inviteCode, setInviteCode] = useState('');
  const [staffId, setStaffId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Request code form state
  const [reqFullName, setReqFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqDepartment, setReqDepartment] = useState('');
  const [reqMinistry, setReqMinistry] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [approvedCode, setApprovedCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-poll request status every 20s after submission — notify when approved/rejected
  useEffect(() => {
    if (!reqSuccess || !reqEmail.trim() || approvedCode) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(
          `https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/code-requests/status?email=${encodeURIComponent(reqEmail.trim())}`,
        );
        if (!res.ok) return;
        const data = await res.json() as { status: string; code?: string; rejectionReason?: string };

        if (data.status === 'approved' && data.code) {
          setApprovedCode(data.code);
          setStatusMessage('');
          useNotificationStore.getState().addNotification({
            type: 'success',
            title: 'Invite Code Ready!',
            message: `Your invite code request has been approved. Code: ${data.code}`,
            source: 'govchat',
            icon: '\u2705',
            actionLabel: 'Login Now',
            actionRoute: 'govchat',
          });
          // Stop polling once resolved
          if (statusPollRef.current) clearInterval(statusPollRef.current);
        } else if (data.status === 'rejected') {
          const reason = data.rejectionReason
            ? `Reason: ${data.rejectionReason}`
            : 'Please contact your IT administrator.';
          setStatusMessage(`Request was declined. ${reason}`);
          useNotificationStore.getState().addNotification({
            type: 'warning',
            title: 'Code Request Declined',
            message: `Your invite code request was declined. ${reason}`,
            source: 'govchat',
            icon: '\u274C',
          });
          if (statusPollRef.current) clearInterval(statusPollRef.current);
        }
      } catch {
        // Silent — will retry on next interval
      }
    };

    // Initial check after 5s, then every 20s
    const initialTimeout = setTimeout(pollStatus, 5000);
    statusPollRef.current = setInterval(pollStatus, 20_000);

    return () => {
      clearTimeout(initialTimeout);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [reqSuccess, reqEmail, approvedCode]);

  // Public user form state
  const [pubName, setPubName] = useState('');
  const [pubEmail, setPubEmail] = useState('');
  const [pubSubmitting, setPubSubmitting] = useState(false);
  const [pubError, setPubError] = useState('');

  const isRedeeming = authStep === 'redeeming';

  const isFormValid =
    inviteCode.trim().length === 8 &&
    staffId.trim().length > 0 &&
    displayName.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isRedeeming) return;
    const success = await redeemInviteCode(inviteCode.trim().toUpperCase(), staffId.trim(), displayName.trim());
    if (success && email.trim()) {
      useProfileStore.getState().setProfile({ email: email.trim() });
    }
  };

  const handleInviteCodeChange = (val: string) => {
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setInviteCode(cleaned);
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Request code submit
  const isReqFormValid =
    reqFullName.trim().length > 0 &&
    reqEmail.trim().length > 0 &&
    isValidEmail(reqEmail.trim()) &&
    reqDepartment.trim().length > 0 &&
    reqMinistry.trim().length > 0 &&
    reqReason.trim().length > 0;

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReqFormValid || reqSubmitting) return;

    setReqSubmitting(true);
    setReqError('');

    try {
      const res = await fetch('https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/code-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reqFullName.trim(),
          email: reqEmail.trim(),
          department: reqDepartment.trim(),
          ministry: reqMinistry.trim(),
          reason: reqReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setReqSuccess(true);
    } catch (err: any) {
      setReqError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setReqSubmitting(false);
    }
  };

  // Public user submit
  const isPubFormValid =
    pubName.trim().length > 0 &&
    pubEmail.trim().length > 0 &&
    isValidEmail(pubEmail.trim()) &&
    !pubEmail.trim().toLowerCase().endsWith('.gov.gh');

  const handlePublicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPubFormValid || pubSubmitting) return;

    if (pubEmail.trim().toLowerCase().endsWith('.gov.gh')) {
      setPubError('Government email addresses must use the invite code flow.');
      return;
    }

    setPubSubmitting(true);
    setPubError('');

    try {
      const res = await fetch('https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/auth/public-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pubName.trim(),
          email: pubEmail.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Signup failed (${res.status})`);
      }

      const creds = await res.json();

      // Use store's loginWithCredentials to properly initialize
      await loginWithCredentials({
        userId: creds.userId,
        accessToken: creds.accessToken,
        homeserverUrl: creds.homeserverUrl,
        staffId: creds.staffId || '',
        deviceId: creds.deviceId,
      });
    } catch (err: any) {
      setPubError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setPubSubmitting(false);
    }
  };

  const handleBack = () => {
    setView('login');
    setReqError('');
    setReqSuccess(false);
    setPubError('');
  };

  // Shared input style
  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    border: '1.5px solid var(--color-border-1)',
  };

  const inputClassName =
    'w-full px-3 py-1.5 rounded-lg text-[12.5px] text-text-primary outline-none placeholder:text-text-muted';

  const labelClassName =
    'text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block';

  // ─── Request Code View ───
  if (view === 'request') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', minHeight: 0, padding: '16px', background: 'var(--color-bg)' }}>
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
            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-colors mb-3"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            {/* Header */}
            <div className="text-center mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(212, 160, 23, 0.12)' }}
              >
                <Send size={20} style={{ color: '#D4A017' }} />
              </div>
              <h3 className="text-[15px] font-bold text-text-primary">
                Request an Invite Code
              </h3>
              <p className="text-[11.5px] text-text-muted mt-1.5 leading-snug">
                Fill in your details. An administrator will review your request.
              </p>
            </div>

            {/* Success message + status check */}
            {reqSuccess ? (
              <div className="flex flex-col gap-3">
                <div
                  className="px-3 py-3 rounded-lg text-[11.5px] font-medium leading-snug text-center"
                  style={{ background: 'rgba(0, 107, 63, 0.1)', color: '#006B3F' }}
                >
                  Request submitted! You'll receive your invite code once approved by an administrator.
                </div>

                {/* Approved code display */}
                {approvedCode && (
                  <div
                    className="px-4 py-3 rounded-lg text-center"
                    style={{ background: 'rgba(0, 107, 63, 0.15)', border: '1.5px solid rgba(0, 107, 63, 0.3)' }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#006B3F' }}>Your Invite Code</p>
                    <p className="text-[20px] font-mono font-bold tracking-widest" style={{ color: '#006B3F' }}>{approvedCode}</p>
                    <p className="text-[10px] mt-2" style={{ color: '#006B3F' }}>Use this code on the login screen to join GovChat.</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(approvedCode); }}
                      className="mt-2 px-3 py-1 rounded text-[10px] font-semibold"
                      style={{ background: 'rgba(0, 107, 63, 0.2)', color: '#006B3F', border: 'none', cursor: 'pointer' }}
                    >
                      Copy Code
                    </button>
                  </div>
                )}

                {/* Status message */}
                {statusMessage && !approvedCode && (
                  <div
                    className="px-3 py-2 rounded-lg text-[11px] text-center"
                    style={{ background: 'rgba(212, 160, 23, 0.1)', color: '#D4A017' }}
                  >
                    {statusMessage}
                  </div>
                )}

                {/* Check status button */}
                {!approvedCode && (
                  <button
                    onClick={async () => {
                      setCheckingStatus(true);
                      setStatusMessage('');
                      try {
                        const res = await fetch(
                          `https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/code-requests/status?email=${encodeURIComponent(reqEmail.trim())}`,
                        );
                        if (!res.ok) throw new Error('Failed to check status');
                        const data = await res.json() as { status: string; code?: string; rejectionReason?: string };
                        if (data.status === 'approved' && data.code) {
                          setApprovedCode(data.code);
                        } else if (data.status === 'rejected') {
                          setStatusMessage(`Request was declined${data.rejectionReason ? ': ' + data.rejectionReason : '. Please contact your IT administrator.'}`);
                        } else if (data.status === 'pending') {
                          setStatusMessage('Your request is still pending review. Please check back later.');
                        } else {
                          setStatusMessage('No request found for this email. Please submit a new request.');
                        }
                      } catch {
                        setStatusMessage('Unable to check status. Please try again.');
                      } finally {
                        setCheckingStatus(false);
                      }
                    }}
                    disabled={checkingStatus}
                    className="w-full py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-2"
                    style={{
                      background: '#D4A017',
                      color: '#fff',
                      border: 'none',
                      cursor: checkingStatus ? 'wait' : 'pointer',
                      opacity: checkingStatus ? 0.6 : 1,
                    }}
                  >
                    {checkingStatus ? 'Checking...' : 'Check Request Status'}
                  </button>
                )}

                <button
                  onClick={() => { setReqSuccess(false); setApprovedCode(null); setStatusMessage(''); setView('login'); }}
                  className="text-[10.5px] text-text-muted underline underline-offset-2"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <>
                {/* Error */}
                {reqError && (
                  <div
                    className="mb-3 px-3 py-2 rounded-lg text-[11px] font-medium"
                    style={{ background: 'rgba(206, 17, 38, 0.1)', color: '#CE1126' }}
                  >
                    {reqError}
                  </div>
                )}

                <form onSubmit={handleRequestSubmit} className="flex flex-col gap-2.5">
                  {/* Full Name */}
                  <div>
                    <label className={labelClassName}>Full Name</label>
                    <input
                      type="text"
                      value={reqFullName}
                      onChange={e => setReqFullName(e.target.value)}
                      placeholder="Kwame Asante"
                      className={inputClassName}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelClassName}>Email</label>
                    <input
                      type="email"
                      value={reqEmail}
                      onChange={e => setReqEmail(e.target.value)}
                      placeholder="kwame.asante@gov.gh"
                      className={inputClassName}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className={labelClassName}>Department</label>
                    <input
                      type="text"
                      value={reqDepartment}
                      onChange={e => setReqDepartment(e.target.value)}
                      placeholder="Information Technology"
                      className={inputClassName}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Ministry */}
                  <div>
                    <label className={labelClassName}>Ministry</label>
                    <input
                      type="text"
                      value={reqMinistry}
                      onChange={e => setReqMinistry(e.target.value)}
                      placeholder="Ministry of Communications"
                      className={inputClassName}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className={labelClassName}>Reason for Access</label>
                    <textarea
                      value={reqReason}
                      onChange={e => setReqReason(e.target.value.slice(0, 200))}
                      placeholder="Briefly describe why you need access..."
                      maxLength={200}
                      rows={3}
                      className={`${inputClassName} resize-none`}
                      style={inputStyle}
                      required
                    />
                    <p className="text-[9.5px] text-text-muted mt-0.5 text-right">
                      {reqReason.length}/200
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={reqSubmitting || !isReqFormValid}
                    className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-opacity flex items-center justify-center gap-2 mt-1"
                    style={{
                      background: '#006B3F',
                      opacity: reqSubmitting || !isReqFormValid ? 0.5 : 1,
                      cursor: reqSubmitting ? 'wait' : 'pointer',
                    }}
                  >
                    {reqSubmitting && <Loader2 size={14} className="animate-spin" />}
                    {reqSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Public User View ───
  if (view === 'public') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', minHeight: 0, padding: '16px', background: 'var(--color-bg)' }}>
        <div
          className="w-full max-w-[300px] rounded-2xl border overflow-hidden"
          style={{
            background: 'var(--color-surface-1)',
            borderColor: 'var(--color-border-1)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          {/* Grey accent strip */}
          <div style={{ height: 4, background: '#6B7280' }} />

          <div className="p-4">
            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-colors mb-3"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            {/* Header */}
            <div className="text-center mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(107, 114, 128, 0.12)' }}
              >
                <Globe size={20} style={{ color: '#6B7280' }} />
              </div>
              <h3 className="text-[15px] font-bold text-text-primary">
                Join as Public User
              </h3>
              <p className="text-[11.5px] text-text-muted mt-1.5 leading-snug">
                Chat with other public users. Government channels require an invite code.
              </p>
            </div>

            {/* Error */}
            {pubError && (
              <div
                className="mb-3 px-3 py-2 rounded-lg text-[11px] font-medium"
                style={{ background: 'rgba(206, 17, 38, 0.1)', color: '#CE1126' }}
              >
                {pubError}
              </div>
            )}

            <form onSubmit={handlePublicSubmit} className="flex flex-col gap-2.5">
              {/* Display Name */}
              <div>
                <label className={labelClassName}>Display Name</label>
                <input
                  type="text"
                  value={pubName}
                  onChange={e => setPubName(e.target.value)}
                  placeholder="Ama Mensah"
                  autoFocus
                  className={inputClassName}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className={labelClassName}>Email</label>
                <input
                  type="email"
                  value={pubEmail}
                  onChange={e => setPubEmail(e.target.value)}
                  placeholder="ama@example.com"
                  className={inputClassName}
                  style={inputStyle}
                  required
                />
                {pubEmail.trim().toLowerCase().endsWith('.gov.gh') && (
                  <p className="text-[9.5px] mt-1 font-medium" style={{ color: '#CE1126' }}>
                    Government emails must use the invite code flow.
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={pubSubmitting || !isPubFormValid}
                className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-opacity flex items-center justify-center gap-2 mt-1"
                style={{
                  background: '#006B3F',
                  opacity: pubSubmitting || !isPubFormValid ? 0.5 : 1,
                  cursor: pubSubmitting ? 'wait' : 'pointer',
                }}
              >
                {pubSubmitting && <Loader2 size={14} className="animate-spin" />}
                {pubSubmitting ? 'Joining...' : 'Join GovChat'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Login View (default) ───
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', minHeight: 0, padding: '16px', background: 'var(--color-bg)' }}>
      <div
        className="w-full max-w-[300px] rounded-2xl border"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-border-1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 280px)',
          overflow: 'hidden',
        }}
      >
        {/* Gold accent strip */}
        <div style={{ height: 4, background: '#D4A017', flexShrink: 0 }} />

        <div style={{ padding: 16, overflowY: 'auto', flex: 1, minHeight: 0 }}>
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

            {/* Email (optional) */}
            <div>
              <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">
                Email (optional)
              </label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full px-3 py-2 rounded-lg text-[12px] text-text-primary outline-none placeholder:text-text-muted"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}
                type="email"
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

          </form>
        </div>
      </div>

      {/* Options below the card — always visible */}
      <div className="w-full max-w-[300px] flex flex-col gap-2 mt-3">
        <button
          onClick={() => setView('request')}
          className="w-full py-2 rounded-lg text-[11.5px] font-semibold flex items-center justify-center gap-2"
          style={{
            background: 'transparent',
            border: '1.5px solid #D4A017',
            color: '#D4A017',
          }}
        >
          <Send size={12} />
          Request an Invite Code
        </button>

        <button
          onClick={() => setView('public')}
          className="w-full py-2 rounded-lg text-[11.5px] font-semibold flex items-center justify-center gap-2"
          style={{
            background: 'transparent',
            border: '1.5px solid var(--color-border-1)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Globe size={12} />
          Join as Public User
        </button>

        <button
          onClick={continueLocalMode}
          className="text-[10px] text-text-muted underline underline-offset-2 hover:text-text-secondary transition-colors mt-1"
        >
          Continue in local mode (offline)
        </button>
      </div>
    </div>
  );
}
