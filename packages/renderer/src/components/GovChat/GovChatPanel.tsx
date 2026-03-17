import React, { useEffect, useState } from 'react';
import { Shield, PenSquare, X, LogOut, MessageCircle, Lock, Settings } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import { LoginView } from './LoginView';
import { ChatListView } from './ChatListView';
import { ChatView } from './ChatView';
import { AdminPanel } from './AdminPanel';

/* ─────────── connection badge ─────────── */

function ConnectionBadge() {
  const connectionStatus = useGovChatStore(s => s.connectionStatus);
  const authStep = useGovChatStore(s => s.authStep);

  if (authStep !== 'authenticated') return null;

  const configs: Record<string, { color: string; label: string }> = {
    connected: { color: '#006B3F', label: 'Connected' },
    connecting: { color: '#D4A017', label: 'Connecting...' },
    syncing: { color: '#1565C0', label: 'Syncing...' },
    disconnected: { color: '#9E9E9E', label: 'Local mode' },
    error: { color: '#CE1126', label: 'Error' },
  };

  const cfg = configs[connectionStatus] ?? configs.disconnected;

  return (
    <div className="flex items-center gap-1.5 text-[9.5px] font-medium" style={{ color: cfg.color }}>
      <span
        className="w-[6px] h-[6px] rounded-full shrink-0"
        style={{
          background: cfg.color,
          boxShadow: connectionStatus === 'connected' ? `0 0 4px ${cfg.color}` : 'none',
        }}
      />
      {cfg.label}
    </div>
  );
}

/* ─────────── empty state ─────────── */

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6" style={{ background: 'var(--color-bg)' }}>
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(212, 160, 23, 0.12)' }}
      >
        <MessageCircle size={36} style={{ color: '#D4A017' }} />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-text-primary mb-1">GovChat Secure Messenger</p>
        <p className="text-[12px] text-text-muted max-w-[240px]">
          Select a conversation or start a new one to begin secure messaging with government colleagues.
        </p>
      </div>
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px]"
        style={{ background: 'rgba(0, 107, 63, 0.1)', color: '#006B3F' }}
      >
        <Lock size={11} />
        End-to-end encrypted
      </div>
    </div>
  );
}

/* ─────────── main panel ─────────── */

export function GovChatPanel({ onClose }: { onClose: () => void }) {
  const authStep = useGovChatStore(s => s.authStep);
  const currentUser = useGovChatStore(s => s.currentUser);
  const activeRoomId = useGovChatStore(s => s.activeRoomId);
  const isComposing = useGovChatStore(s => s.isComposing);
  const setIsComposing = useGovChatStore(s => s.setIsComposing);
  const logout = useGovChatStore(s => s.logout);
  const initialize = useGovChatStore(s => s.initialize);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const credentials = useGovChatStore(s => s.credentials);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAdmin || !credentials?.accessToken) return;
    fetch(`https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/code-requests/count`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    })
      .then(r => r.json())
      .then(d => setPendingRequestCount(d.count ?? 0))
      .catch(() => {});
  }, [isAdmin, credentials?.accessToken]);

  const isAuthenticated = authStep === 'authenticated';

  return (
    <div
      className="h-full flex flex-col shrink-0 overflow-hidden"
      style={{
        width: '100%',
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
    >
      {/* Gold accent strip */}
      <div className="shrink-0" style={{ height: 3, background: 'linear-gradient(90deg, #D4A017, #006B3F)' }} />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: '#D4A017' }} />
          <span className="text-[13.5px] font-bold text-text-primary">GovChat</span>
          <ConnectionBadge />
          {isAuthenticated && currentUser?.ministry && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full truncate max-w-[100px]"
              style={{ background: 'rgba(0, 107, 63, 0.1)', color: '#006B3F' }}
            >
              {currentUser.ministry}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <>
              {isAdmin && (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="p-1.5 rounded-md hover:bg-surface-2 transition-colors relative"
                  title="Admin Panel"
                >
                  <Settings size={14} style={{ color: '#D4A017' }} />
                  {pendingRequestCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-bold text-white"
                      style={{ background: '#CE1126', lineHeight: 1, padding: '0 3px' }}
                    >
                      {pendingRequestCount > 99 ? '99+' : pendingRequestCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-surface-2 transition-colors"
                title="Log out"
              >
                <LogOut size={14} className="text-text-muted" />
              </button>
              <button
                onClick={() => setIsComposing(true)}
                className="p-1.5 rounded-md hover:bg-surface-2 transition-colors"
                title="New message"
              >
                <PenSquare size={15} className="text-text-secondary" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-2 transition-colors"
          >
            <X size={15} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Auth gate or main content */}
      {!isAuthenticated ? (
        <LoginView />
      ) : (
        <div className="flex-1 flex min-h-0 min-w-0 relative overflow-hidden">
          {/* Chat list (left) */}
          <div
            className="flex flex-col border-r shrink-0"
            style={{ width: 180, borderColor: 'var(--color-border-1)' }}
          >
            <ChatListView />
          </div>

          {/* Chat area (right) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {activeRoomId ? <ChatView /> : <EmptyState />}
          </div>
        </div>
      )}

      {/* Admin Panel overlay */}
      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
}
