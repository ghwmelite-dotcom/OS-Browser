import React, { useState, useEffect, useCallback } from 'react';
import { Settings, X, Loader2, Copy, Check, XCircle, ShieldAlert, UserCog, Shield, ChevronDown } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';

const API_BASE = 'https://os-browser-worker.ghwmelite.workers.dev';

interface UserInfo {
  userId: string;
  staffId: string;
  displayName: string;
  department: string;
  ministry: string;
  role: 'user' | 'admin' | 'superadmin';
  createdAt: number;
}

interface InviteCode {
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  department: string;
  ministry: string;
  isRevoked: boolean;
}

type CodeStatus = 'active' | 'expired' | 'maxed' | 'revoked';

function getCodeStatus(code: InviteCode): CodeStatus {
  if (code.isRevoked) return 'revoked';
  if (code.usedCount >= code.maxUses) return 'maxed';
  if (Date.now() > code.expiresAt) return 'expired';
  return 'active';
}

const STATUS_CONFIG: Record<CodeStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#006B3F', bg: 'rgba(0, 107, 63, 0.1)' },
  expired: { label: 'Expired', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' },
  maxed: { label: 'Maxed Out', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  revoked: { label: 'Revoked', color: '#CE1126', bg: 'rgba(206, 17, 38, 0.1)' },
};

/* ─────────── Copy button with feedback ─────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-[var(--color-surface-2)] transition-colors"
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? (
        <Check size={13} style={{ color: '#006B3F' }} />
      ) : (
        <Copy size={13} className="text-text-muted" />
      )}
    </button>
  );
}

/* ─────────── Main AdminPanel ─────────── */

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const currentUser = useGovChatStore(s => s.currentUser);
  const credentials = useGovChatStore(s => s.credentials);

  const isAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  /* ── Generate form state ── */
  const [department, setDepartment] = useState('');
  const [ministry, setMinistry] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresInHours, setExpiresInHours] = useState('72');
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  /* ── Codes list state ── */
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);

  /* ── User management state (superadmin only) ── */
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'codes' | 'users'>('codes');
  const isSuperadmin = currentUser?.role === 'superadmin';

  const authHeader = credentials?.accessToken
    ? { Authorization: `Bearer ${credentials.accessToken}` }
    : {};

  /* ── Fetch codes ── */
  const fetchCodes = useCallback(async () => {
    if (!credentials?.accessToken) return;
    setLoadingCodes(true);
    setCodesError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/govchat/invite-codes`, {
        headers: { ...authHeader } as HeadersInit,
      });
      if (!res.ok) throw new Error(`Failed to fetch codes (${res.status})`);
      const data = await res.json();
      setCodes(data.codes ?? []);
    } catch (err: any) {
      setCodesError(err.message ?? 'Failed to load invite codes');
    } finally {
      setLoadingCodes(false);
    }
  }, [credentials?.accessToken]);

  useEffect(() => {
    if (isAuthorized) fetchCodes();
  }, [isAuthorized, fetchCodes]);

  /* ── Generate code ── */
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department.trim() || !ministry.trim() || generating) return;

    setGenerating(true);
    setGenerateError(null);
    setGeneratedCode(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/govchat/invite-codes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        } as HeadersInit,
        body: JSON.stringify({
          department: department.trim(),
          ministry: ministry.trim(),
          maxUses: parseInt(maxUses, 10) || 1,
          expiresInHours: parseInt(expiresInHours, 10) || 72,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Generation failed (${res.status})`);
      }

      const data = await res.json();
      setGeneratedCode(data.code ?? data.inviteCode ?? null);
      // Refresh the list
      await fetchCodes();
    } catch (err: any) {
      setGenerateError(err.message ?? 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  /* ── Revoke code ── */
  const handleRevoke = async (code: string) => {
    if (revokingCode) return;
    setRevokingCode(code);
    try {
      const res = await fetch(`${API_BASE}/api/v1/govchat/invite-codes/${code}`, {
        method: 'DELETE',
        headers: { ...authHeader } as HeadersInit,
      });
      if (!res.ok) throw new Error(`Revoke failed (${res.status})`);
      await fetchCodes();
    } catch {
      // Silently fail — user can retry
    } finally {
      setRevokingCode(null);
    }
  };

  /* ── Fetch users (superadmin only) ── */
  const fetchUsers = useCallback(async () => {
    if (!credentials?.accessToken || !isSuperadmin) return;
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/govchat/users`, {
        headers: { ...authHeader } as HeadersInit,
      });
      if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err: any) {
      setUsersError(err.message ?? 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [credentials?.accessToken, isSuperadmin]);

  useEffect(() => {
    if (isSuperadmin && activeTab === 'users') fetchUsers();
  }, [isSuperadmin, activeTab, fetchUsers]);

  /* ── Change user role ── */
  const handleRoleChange = async (staffId: string, newRole: 'user' | 'admin' | 'superadmin') => {
    if (changingRole) return;
    setChangingRole(staffId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/govchat/users/${staffId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader } as HeadersInit,
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error(`Role change failed (${res.status})`);
      await fetchUsers();
    } catch {
      // Silent fail — user can retry
    } finally {
      setChangingRole(null);
    }
  };

  /* ── Access denied ── */
  if (!isAuthorized) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="w-full max-w-[380px] rounded-xl border overflow-hidden"
          style={{
            background: 'var(--color-surface-1)',
            borderColor: 'var(--color-border-1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          }}
        >
          <div style={{ height: 3, background: '#CE1126' }} />
          <div className="p-6 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(206, 17, 38, 0.1)' }}
            >
              <ShieldAlert size={26} style={{ color: '#CE1126' }} />
            </div>
            <h3 className="text-[15px] font-bold text-text-primary mb-1">Access Denied</h3>
            <p className="text-[12px] text-text-muted mb-4">
              You do not have permission to access the Admin Panel. Only admin and superadmin users can manage invite codes.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
              style={{ background: '#CE1126' }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main panel ── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[520px] max-h-[85vh] rounded-xl border overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-border-1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        }}
      >
        {/* Gold accent strip */}
        <div className="shrink-0" style={{ height: 3, background: 'linear-gradient(90deg, #D4A017, #006B3F)' }} />

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--color-border-1)' }}
        >
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: '#D4A017' }} />
            <span className="text-[14px] font-bold text-text-primary">Admin Panel</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <X size={15} className="text-text-muted" />
          </button>
        </div>

        {/* Tabs (superadmin gets Users tab) */}
        {isSuperadmin && (
          <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
            <button
              onClick={() => setActiveTab('codes')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors"
              style={{
                color: activeTab === 'codes' ? '#D4A017' : 'var(--color-text-muted)',
                borderBottom: activeTab === 'codes' ? '2px solid #D4A017' : '2px solid transparent',
              }}
            >
              <Settings size={13} />
              Invite Codes
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors"
              style={{
                color: activeTab === 'users' ? '#D4A017' : 'var(--color-text-muted)',
                borderBottom: activeTab === 'users' ? '2px solid #D4A017' : '2px solid transparent',
              }}
            >
              <UserCog size={13} />
              Manage Users
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

          {activeTab === 'codes' && <>
          {/* ── Generate form ── */}
          <div
            className="rounded-xl border p-4"
            style={{
              background: 'var(--color-surface-1)',
              borderColor: 'var(--color-border-1)',
            }}
          >
            <h4 className="text-[12.5px] font-semibold text-text-primary mb-3">
              Generate New Invite Code
            </h4>

            <form onSubmit={handleGenerate} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Department */}
                <div>
                  <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="Budget Division"
                    className="w-full px-3 py-2 rounded-lg text-[12px] text-text-primary outline-none placeholder:text-text-muted"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1.5px solid var(--color-border-1)',
                    }}
                  />
                </div>

                {/* Ministry */}
                <div>
                  <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">
                    Ministry
                  </label>
                  <input
                    type="text"
                    value={ministry}
                    onChange={e => setMinistry(e.target.value)}
                    placeholder="Ministry of Finance"
                    className="w-full px-3 py-2 rounded-lg text-[12px] text-text-primary outline-none placeholder:text-text-muted"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1.5px solid var(--color-border-1)',
                    }}
                  />
                </div>

                {/* Max Uses */}
                <div>
                  <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={e => setMaxUses(e.target.value)}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 rounded-lg text-[12px] text-text-primary outline-none placeholder:text-text-muted"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1.5px solid var(--color-border-1)',
                    }}
                  />
                </div>

                {/* Expires In Hours */}
                <div>
                  <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">
                    Expires In (hours)
                  </label>
                  <input
                    type="number"
                    value={expiresInHours}
                    onChange={e => setExpiresInHours(e.target.value)}
                    min={1}
                    max={720}
                    className="w-full px-3 py-2 rounded-lg text-[12px] text-text-primary outline-none placeholder:text-text-muted"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1.5px solid var(--color-border-1)',
                    }}
                  />
                </div>
              </div>

              {/* Generate button */}
              <button
                type="submit"
                disabled={generating || !department.trim() || !ministry.trim()}
                className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-opacity flex items-center justify-center gap-2"
                style={{
                  background: '#D4A017',
                  opacity: generating || !department.trim() || !ministry.trim() ? 0.5 : 1,
                  cursor: generating ? 'wait' : 'pointer',
                }}
              >
                {generating && <Loader2 size={14} className="animate-spin" />}
                {generating ? 'Generating...' : 'Generate Code'}
              </button>
            </form>

            {/* Error */}
            {generateError && (
              <div
                className="mt-3 px-3 py-2 rounded-lg text-[11px] font-medium"
                style={{ background: 'rgba(206, 17, 38, 0.1)', color: '#CE1126' }}
              >
                {generateError}
              </div>
            )}

            {/* Success banner */}
            {generatedCode && (
              <div
                className="mt-3 px-4 py-3 rounded-lg flex items-center justify-between"
                style={{ background: 'rgba(0, 107, 63, 0.1)', border: '1.5px solid rgba(0, 107, 63, 0.3)' }}
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#006B3F' }}>
                    New Code
                  </p>
                  <p className="text-[18px] font-mono font-bold tracking-widest" style={{ color: '#006B3F' }}>
                    {generatedCode}
                  </p>
                </div>
                <CopyButton text={generatedCode} />
              </div>
            )}
          </div>

          {/* ── Codes table ── */}
          <div
            className="rounded-xl border"
            style={{
              background: 'var(--color-surface-1)',
              borderColor: 'var(--color-border-1)',
            }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
              <h4 className="text-[12.5px] font-semibold text-text-primary">
                Active Invite Codes
                {!loadingCodes && (
                  <span className="text-text-muted font-normal ml-1">({codes.length})</span>
                )}
              </h4>
            </div>

            {loadingCodes ? (
              <div className="flex items-center justify-center py-8 gap-2 text-text-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[12px]">Loading codes...</span>
              </div>
            ) : codesError ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-text-muted">{codesError}</p>
                <button
                  onClick={fetchCodes}
                  className="mt-2 text-[11px] font-semibold underline underline-offset-2"
                  style={{ color: '#D4A017' }}
                >
                  Retry
                </button>
              </div>
            ) : codes.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px] text-text-muted">
                  No invite codes yet. Generate one above.
                </p>
              </div>
            ) : (
              <div className="max-h-[260px] overflow-y-auto">
                {/* Table header */}
                <div
                  className="grid gap-2 px-4 py-2 text-[9.5px] font-semibold text-text-muted uppercase tracking-wide border-b sticky top-0"
                  style={{
                    gridTemplateColumns: '1fr 0.7fr 0.7fr 0.5fr 0.6fr auto',
                    borderColor: 'var(--color-border-1)',
                    background: 'var(--color-surface-1)',
                  }}
                >
                  <span>Code</span>
                  <span>Department</span>
                  <span>Ministry</span>
                  <span>Used</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                {/* Table rows */}
                {codes.map(code => {
                  const status = getCodeStatus(code);
                  const cfg = STATUS_CONFIG[status];
                  const isRevoking = revokingCode === code.code;

                  return (
                    <div
                      key={code.code}
                      className="grid gap-2 px-4 py-2.5 items-center border-b last:border-b-0 hover:bg-[var(--color-surface-2)] transition-colors"
                      style={{
                        gridTemplateColumns: '1fr 0.7fr 0.7fr 0.5fr 0.6fr auto',
                        borderColor: 'var(--color-border-1)',
                      }}
                    >
                      {/* Code */}
                      <span className="text-[11.5px] font-mono font-semibold text-text-primary tracking-wide truncate">
                        {code.code}
                      </span>

                      {/* Department */}
                      <span className="text-[11px] text-text-muted truncate" title={code.department}>
                        {code.department}
                      </span>

                      {/* Ministry */}
                      <span className="text-[11px] text-text-muted truncate" title={code.ministry}>
                        {code.ministry}
                      </span>

                      {/* Used/Max */}
                      <span className="text-[11px] text-text-muted">
                        {code.usedCount}/{code.maxUses}
                      </span>

                      {/* Status badge */}
                      <span
                        className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full text-center truncate"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <CopyButton text={code.code} />
                        {status === 'active' && (
                          <button
                            onClick={() => handleRevoke(code.code)}
                            disabled={isRevoking}
                            className="p-1 rounded-md hover:bg-[var(--color-surface-2)] transition-colors"
                            title="Revoke code"
                            style={{ opacity: isRevoking ? 0.5 : 1 }}
                          >
                            {isRevoking ? (
                              <Loader2 size={13} className="animate-spin" style={{ color: '#CE1126' }} />
                            ) : (
                              <XCircle size={13} style={{ color: '#CE1126' }} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>}

          {/* ── Users management (superadmin only) ── */}
          {activeTab === 'users' && isSuperadmin && (
            <div
              className="rounded-xl border"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-1)',
              }}
            >
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-1)' }}>
                <h4 className="text-[12.5px] font-semibold text-text-primary flex items-center gap-1.5">
                  <UserCog size={14} style={{ color: '#D4A017' }} />
                  Registered Users
                  {!loadingUsers && (
                    <span className="text-text-muted font-normal ml-1">({users.length})</span>
                  )}
                </h4>
                <button
                  onClick={fetchUsers}
                  className="text-[10.5px] font-semibold underline underline-offset-2"
                  style={{ color: '#D4A017' }}
                >
                  Refresh
                </button>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-8 gap-2 text-text-muted">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[12px]">Loading users...</span>
                </div>
              ) : usersError ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[12px] text-text-muted">{usersError}</p>
                  <button
                    onClick={fetchUsers}
                    className="mt-2 text-[11px] font-semibold underline underline-offset-2"
                    style={{ color: '#D4A017' }}
                  >
                    Retry
                  </button>
                </div>
              ) : users.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[12px] text-text-muted">No users registered yet.</p>
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  {users.map(user => {
                    const isCurrentUser = user.staffId === currentUser?.staffId;
                    const isChanging = changingRole === user.staffId;
                    const roleColors: Record<string, { color: string; bg: string }> = {
                      superadmin: { color: '#D4A017', bg: 'rgba(212, 160, 23, 0.1)' },
                      admin: { color: '#006B3F', bg: 'rgba(0, 107, 63, 0.1)' },
                      user: { color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' },
                    };
                    const rc = roleColors[user.role] ?? roleColors.user;

                    return (
                      <div
                        key={user.staffId}
                        className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-[var(--color-surface-2)] transition-colors"
                        style={{ borderColor: 'var(--color-border-1)' }}
                      >
                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ background: user.role === 'superadmin' ? '#D4A017' : user.role === 'admin' ? '#006B3F' : '#9CA3AF' }}
                        >
                          {user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-text-primary truncate">
                              {user.displayName}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(212, 160, 23, 0.15)', color: '#D4A017' }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-muted truncate">
                            {user.staffId} · {user.department}
                          </div>
                        </div>

                        {/* Role badge */}
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0"
                          style={{ background: rc.bg, color: rc.color }}
                        >
                          {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'IT Admin' : 'User'}
                        </span>

                        {/* Role change buttons (not for self) */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-1 shrink-0">
                            {user.role === 'user' && (
                              <button
                                onClick={() => handleRoleChange(user.staffId, 'admin')}
                                disabled={isChanging}
                                className="px-2 py-1 rounded-md text-[9.5px] font-semibold transition-opacity"
                                style={{
                                  background: 'rgba(0, 107, 63, 0.1)',
                                  color: '#006B3F',
                                  opacity: isChanging ? 0.5 : 1,
                                }}
                                title="Promote to IT Admin"
                              >
                                {isChanging ? <Loader2 size={11} className="animate-spin" /> : 'Make Admin'}
                              </button>
                            )}
                            {user.role === 'admin' && (
                              <button
                                onClick={() => handleRoleChange(user.staffId, 'user')}
                                disabled={isChanging}
                                className="px-2 py-1 rounded-md text-[9.5px] font-semibold transition-opacity"
                                style={{
                                  background: 'rgba(206, 17, 38, 0.1)',
                                  color: '#CE1126',
                                  opacity: isChanging ? 0.5 : 1,
                                }}
                                title="Demote to regular user"
                              >
                                {isChanging ? <Loader2 size={11} className="animate-spin" /> : 'Remove Admin'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
