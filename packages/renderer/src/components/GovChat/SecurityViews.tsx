import React, { useState, useMemo, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Key,
  CheckCircle,
  XCircle,
  LogOut,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  X,
  AlertTriangle,
  Monitor,
  Globe,
  RefreshCw,
  Trash2,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * Shared constants & helpers
 * ──────────────────────────────────────────────────────────────────────────── */

const GHANA_GREEN = '#006B3F';
const GHANA_RED = '#CE1126';
const GHANA_GOLD = '#D4A017';

/** SAS-style verification emoji set (64 emoji) */
const VERIFICATION_EMOJI = [
  '\u{1F436}', '\u{1F431}', '\u{1F981}', '\u{1F434}', '\u{1F984}', '\u{1F437}', '\u{1F418}', '\u{1F42D}',
  '\u{1F430}', '\u{1F43C}', '\u{1F426}', '\u{1F427}', '\u{1F422}', '\u{1F41F}', '\u{1F419}', '\u{1F41D}',
  '\u{1F332}', '\u{1F335}', '\u{1F33B}', '\u{1F339}', '\u{1F344}', '\u{1F30D}', '\u{1F319}', '\u{2B50}',
  '\u{2602}\uFE0F', '\u{2744}\uFE0F', '\u{1F525}', '\u{1F308}', '\u{1F3E0}', '\u{1F697}', '\u{1F680}',
  '\u{2708}\uFE0F', '\u{1F6A2}', '\u{1F3A8}', '\u{1F3B5}', '\u{1F3B8}', '\u{1F941}', '\u{1F3C0}', '\u{26BD}',
  '\u{1F3AE}', '\u{1F512}', '\u{1F511}', '\u{1F528}', '\u{1F4A1}', '\u{1F4D6}', '\u{270F}\uFE0F', '\u{1F4CE}',
  '\u{2702}\uFE0F', '\u{1F4F1}', '\u{1F4BB}', '\u{1F5A8}', '\u{1F50D}', '\u{1F514}', '\u{23F0}', '\u{1F3C6}',
  '\u{1F48E}', '\u{1F451}', '\u{1F3AF}', '\u{1F9E9}', '\u{2764}\uFE0F', '\u{1F44D}', '\u{1F44B}', '\u{1F91D}',
  '\u{270C}\uFE0F',
];

function pickRandomEmoji(count: number): string[] {
  const result: string[] = [];
  const pool = [...VERIFICATION_EMOJI];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Reusable card wrapper */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`rounded-2xl p-4 ${className}`}
    style={{
      backgroundColor: 'var(--color-surface-1)',
      border: '1px solid var(--color-border-1)',
    }}
  >
    {children}
  </div>
);

/** Section header used inside the overview */
const ViewHeader: React.FC<{
  title: string;
  onClose: () => void;
  onBack?: () => void;
}> = ({ title, onClose, onBack }) => (
  <div className="mb-4 flex items-center gap-3">
    {onBack && (
      <button
        onClick={onBack}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" style={{ color: 'var(--color-text-primary)' }} />
      </button>
    )}
    <h2
      className="flex-1 text-lg font-semibold"
      style={{ color: 'var(--color-text-primary)' }}
    >
      {title}
    </h2>
    <button
      onClick={onClose}
      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
    >
      <X className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
    </button>
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
 * DeviceVerificationView
 * ──────────────────────────────────────────────────────────────────────────── */

interface DeviceVerificationViewProps {
  onClose: () => void;
}

export const DeviceVerificationView: React.FC<DeviceVerificationViewProps> = ({
  onClose,
}) => {
  const [verified, setVerified] = useState(false);
  const emoji = useMemo(() => pickRandomEmoji(7), []);

  const mockDevice = {
    name: 'OzzySurf Desktop',
    id: 'ABCDEF1234',
    lastSeen: Date.now() - 120_000,
  };

  if (verified) {
    return (
      <div className="flex flex-col gap-4">
        <ViewHeader title="Verify Device" onClose={onClose} />
        <Card className="flex flex-col items-center gap-4 py-8">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: `${GHANA_GREEN}20` }}
          >
            <CheckCircle className="h-8 w-8" style={{ color: GHANA_GREEN }} />
          </div>
          <p
            className="text-lg font-semibold"
            style={{ color: GHANA_GREEN }}
          >
            Device Verified
          </p>
          <p
            className="text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            This session is now trusted. Messages are end-to-end encrypted.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ViewHeader title="Verify Device" onClose={onClose} />

      {/* Device info */}
      <Card className="flex items-center gap-3">
        <Monitor className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
        <div className="flex-1">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {mockDevice.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            ID: {mockDevice.id} &middot; Last seen {timeAgo(mockDevice.lastSeen)}
          </p>
        </div>
      </Card>

      {/* Emoji comparison */}
      <Card className="flex flex-col items-center gap-4">
        <p
          className="text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Compare these emoji with the other device. If they match, the session
          is verified.
        </p>
        <div className="flex gap-3 text-3xl">
          {emoji.map((e, i) => (
            <span key={i} role="img" aria-label="verification emoji">
              {e}
            </span>
          ))}
        </div>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setVerified(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:brightness-110"
          style={{ backgroundColor: GHANA_GREEN }}
        >
          <CheckCircle className="h-4 w-4" />
          They Match
        </button>
        <button
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:brightness-110"
          style={{ backgroundColor: GHANA_RED }}
        >
          <XCircle className="h-4 w-4" />
          They Don&apos;t Match
        </button>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
 * SessionManagementView
 * ──────────────────────────────────────────────────────────────────────────── */

interface SessionManagementViewProps {
  onClose: () => void;
}

interface SessionInfo {
  id: string;
  name: string;
  deviceId: string;
  lastActive: number;
  ip?: string;
  verified: boolean;
  isCurrent: boolean;
}

const MOCK_SESSIONS: SessionInfo[] = [
  {
    id: 'sess-001',
    name: 'OzzySurf Desktop — Windows 11',
    deviceId: 'ABCDEF1234',
    lastActive: Date.now(),
    ip: '192.168.1.42',
    verified: true,
    isCurrent: true,
  },
  {
    id: 'sess-002',
    name: 'OzzySurf Mobile — Android 15',
    deviceId: 'GHIJKL5678',
    lastActive: Date.now() - 3_600_000,
    ip: '10.0.0.15',
    verified: true,
    isCurrent: false,
  },
  {
    id: 'sess-003',
    name: 'Firefox — Ubuntu',
    deviceId: 'MNOPQR9012',
    lastActive: Date.now() - 86_400_000 * 3,
    verified: false,
    isCurrent: false,
  },
];

export const SessionManagementView: React.FC<SessionManagementViewProps> = ({
  onClose,
}) => {
  const [sessions, setSessions] = useState<SessionInfo[]>(MOCK_SESSIONS);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const handleSignOut = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setConfirmId(null);
  }, []);

  const handleSignOutAll = useCallback(() => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setConfirmAll(false);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <ViewHeader title="Active Sessions" onClose={onClose} />

      <div className="flex flex-col gap-3">
        {sessions.map((session) => (
          <Card key={session.id} className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {session.isCurrent ? (
                <Monitor className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GHANA_GREEN }} />
              ) : (
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {session.name}
                  </p>
                  {session.isCurrent && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                      style={{ backgroundColor: GHANA_GREEN }}
                    >
                      This device
                    </span>
                  )}
                  {session.verified && (
                    <ShieldCheck
                      className="h-3.5 w-3.5"
                      style={{ color: GHANA_GREEN }}
                    />
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  ID: {session.deviceId} &middot; {timeAgo(session.lastActive)}
                  {session.ip && ` \u00B7 ${session.ip}`}
                </p>
              </div>
            </div>

            {/* Sign-out per session (not current) */}
            {!session.isCurrent && (
              <>
                {confirmId === session.id ? (
                  <div className="flex items-center gap-2">
                    <p
                      className="flex-1 text-xs"
                      style={{ color: GHANA_RED }}
                    >
                      Sign out this session?
                    </p>
                    <button
                      onClick={() => handleSignOut(session.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110"
                      style={{ backgroundColor: GHANA_RED }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        color: 'var(--color-text-muted)',
                        backgroundColor: 'var(--color-surface-2)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(session.id)}
                    className="flex items-center gap-1.5 self-start text-xs font-medium transition-colors hover:brightness-110"
                    style={{ color: GHANA_RED }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                )}
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Sign out all other */}
      {sessions.filter((s) => !s.isCurrent).length > 0 && (
        <>
          {confirmAll ? (
            <Card className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: GHANA_RED }} />
              <p
                className="flex-1 text-sm"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Sign out all other devices?
              </p>
              <button
                onClick={handleSignOutAll}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110"
                style={{ backgroundColor: GHANA_RED }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmAll(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  color: 'var(--color-text-muted)',
                  backgroundColor: 'var(--color-surface-2)',
                }}
              >
                Cancel
              </button>
            </Card>
          ) : (
            <button
              onClick={() => setConfirmAll(true)}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:brightness-110"
              style={{ backgroundColor: GHANA_RED }}
            >
              <LogOut className="h-4 w-4" />
              Sign out all other devices
            </button>
          )}
        </>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
 * KeyBackupView
 * ──────────────────────────────────────────────────────────────────────────── */

interface KeyBackupViewProps {
  onClose: () => void;
}

export const KeyBackupView: React.FC<KeyBackupViewProps> = ({ onClose }) => {
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mockRecoveryKey = 'EsT3 kZpM 9vRa 2XwL qYhF 7NjC 4BgD uA8i';
  const mockBackupInfo = {
    lastBackup: Date.now() - 3_600_000 * 2,
    keyCount: 247,
  };

  const handleSetUp = useCallback(() => {
    setBackupEnabled(true);
  }, []);

  const handleDelete = useCallback(() => {
    setBackupEnabled(false);
    setConfirmDelete(false);
    setShowRecoveryKey(false);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <ViewHeader title="Key Backup" onClose={onClose} />

      {/* Status */}
      <Card className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: backupEnabled ? `${GHANA_GREEN}20` : `${GHANA_GOLD}20`,
          }}
        >
          <Key
            className="h-5 w-5"
            style={{ color: backupEnabled ? GHANA_GREEN : GHANA_GOLD }}
          />
        </div>
        <div className="flex-1">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {backupEnabled ? 'Key backup enabled' : 'Key backup not set up'}
          </p>
          {backupEnabled && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Last backup: {timeAgo(mockBackupInfo.lastBackup)} &middot;{' '}
              {mockBackupInfo.keyCount} keys
            </p>
          )}
        </div>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: backupEnabled ? GHANA_GREEN : GHANA_GOLD }}
        />
      </Card>

      {!backupEnabled ? (
        /* Not set up — show setup button */
        <>
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Key backup allows you to restore your encrypted message history if
              you lose access to all your devices. Your backup is encrypted with
              a recovery key that only you control.
            </p>
          </Card>
          <button
            onClick={handleSetUp}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:brightness-110"
            style={{ backgroundColor: GHANA_GREEN }}
          >
            <Key className="h-4 w-4" />
            Set Up Key Backup
          </button>
        </>
      ) : (
        /* Backup enabled — management UI */
        <>
          {/* Recovery key */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Recovery Key
              </p>
              <button
                onClick={() => setShowRecoveryKey((p) => !p)}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: GHANA_GREEN }}
              >
                {showRecoveryKey ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Show Recovery Key
                  </>
                )}
              </button>
            </div>

            {showRecoveryKey && (
              <div
                className="select-all rounded-lg px-3 py-2 font-mono text-sm tracking-wider"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {mockRecoveryKey}
              </div>
            )}

            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: `${GHANA_GOLD}15` }}
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: GHANA_GOLD }}
              />
              <p className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                Store your recovery key safely. You will need it if you lose
                access to all your devices.
              </p>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:brightness-110"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-text-primary)',
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Restore from Backup
            </button>
          </div>

          {/* Delete backup */}
          {confirmDelete ? (
            <Card className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GHANA_RED }} />
                <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  Are you sure? Deleting the backup means you cannot recover
                  encrypted messages if you lose all devices.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:brightness-110"
                  style={{ backgroundColor: GHANA_RED }}
                >
                  Delete Backup
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: 'var(--color-text-muted)',
                    backgroundColor: 'var(--color-surface-2)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </Card>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:brightness-110"
              style={{ color: GHANA_RED, backgroundColor: `${GHANA_RED}15` }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Backup
            </button>
          )}
        </>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
 * SecurityOverview
 * ──────────────────────────────────────────────────────────────────────────── */

type SubView = 'verification' | 'sessions' | 'backup' | null;

interface SecurityOverviewProps {
  onClose: () => void;
}

export const SecurityOverview: React.FC<SecurityOverviewProps> = ({
  onClose,
}) => {
  const [activeView, setActiveView] = useState<SubView>(null);

  /* Delegate to sub-views */
  if (activeView === 'verification') {
    return <DeviceVerificationView onClose={() => setActiveView(null)} />;
  }
  if (activeView === 'sessions') {
    return <SessionManagementView onClose={() => setActiveView(null)} />;
  }
  if (activeView === 'backup') {
    return <KeyBackupView onClose={() => setActiveView(null)} />;
  }

  const sections: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action: string;
    status?: { label: string; color: string };
    onClick: () => void;
  }[] = [
    {
      icon: <ShieldCheck className="h-5 w-5" style={{ color: GHANA_GREEN }} />,
      title: 'Encryption Status',
      description: 'End-to-end encryption active for all messages.',
      action: '',
      status: { label: 'Active', color: GHANA_GREEN },
      onClick: () => {},
    },
    {
      icon: <Smartphone className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />,
      title: 'Device Verification',
      description:
        'Verify your other devices using emoji comparison (Matrix SAS).',
      action: 'Verify',
      onClick: () => setActiveView('verification'),
    },
    {
      icon: <Globe className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />,
      title: 'Active Sessions',
      description: 'Manage devices signed in to your account.',
      action: '3 sessions',
      onClick: () => setActiveView('sessions'),
    },
    {
      icon: <Key className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />,
      title: 'Key Backup',
      description: 'Back up encryption keys so you can recover message history.',
      action: 'Manage',
      status: { label: 'Not set up', color: GHANA_GOLD },
      onClick: () => setActiveView('backup'),
    },
    {
      icon: <Shield className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />,
      title: 'Cross-signing',
      description:
        'Allows verified devices to trust each other automatically.',
      action: '',
      status: { label: 'Enabled', color: GHANA_GREEN },
      onClick: () => {},
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6" style={{ color: GHANA_GREEN }} />
        <h2
          className="flex-1 text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Security &amp; Privacy
        </h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <X className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Section cards */}
      {sections.map((section) => (
        <Card key={section.title}>
          <button
            onClick={section.onClick}
            className="flex w-full items-center gap-3 text-left"
            disabled={!section.action && !section.onClick}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--color-surface-2)' }}
            >
              {section.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {section.title}
                </p>
                {section.status && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                    style={{ backgroundColor: section.status.color }}
                  >
                    {section.status.label}
                  </span>
                )}
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {section.description}
              </p>
            </div>
            {section.action && (
              <div className="flex items-center gap-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: GHANA_GREEN }}
                >
                  {section.action}
                </span>
                <ChevronRight className="h-4 w-4" style={{ color: GHANA_GREEN }} />
              </div>
            )}
          </button>
        </Card>
      ))}
    </div>
  );
};

export default SecurityOverview;
