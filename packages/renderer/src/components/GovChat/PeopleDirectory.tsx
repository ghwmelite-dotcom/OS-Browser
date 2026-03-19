import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Users } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';

/* ─────────── types ─────────── */

interface DirectoryUser {
  userId: string;
  staffId?: string;
  displayName: string;
  department?: string;
  ministry?: string;
  role?: 'admin' | 'public' | 'user';
  online?: boolean;
  lastSeen?: string; // ISO timestamp
}

interface PeopleDirectoryProps {
  onStartChat: (userId: string, displayName: string) => void;
}

/* ─────────── helpers ─────────── */

/** Deterministic color from a string (name). */
function avatarColor(name: string): string {
  const COLORS = [
    '#006B3F', '#CE1126', '#D4A017', '#1E40AF',
    '#7C3AED', '#DC2626', '#059669', '#D97706',
    '#0891B2', '#4F46E5', '#BE185D', '#15803D',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

/** Get initials (up to 2 chars). */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

/** Friendly "last seen" label. */
function lastSeenLabel(ts?: string): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─────────── component ─────────── */

export function PeopleDirectory({ onStartChat }: PeopleDirectoryProps) {
  const accessToken = useGovChatStore(s => s.credentials?.accessToken);
  const currentUserId = useGovChatStore(s => s.currentUser?.userId);
  const currentStaffId = useGovChatStore(s => s.credentials?.staffId);

  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  /* ── fetch directory ── */

  const fetchDirectory = useCallback(async () => {
    if (!accessToken) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        'https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/users/directory',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!res.ok) {
        throw new Error(`Directory fetch failed (${res.status})`);
      }

      const data = await res.json();
      // Support both { users: [...] } and raw array responses
      const list: DirectoryUser[] = Array.isArray(data) ? data : data.users ?? [];
      // Filter out current user (backup — server should already exclude them)
      const filtered = list.filter(
        u => u.userId !== currentUserId && u.staffId !== currentStaffId,
      );
      setUsers(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentUserId, currentStaffId]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  /* ── filtered + grouped ── */

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      u =>
        u.displayName.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.ministry?.toLowerCase().includes(q),
    );
  }, [users, search]);

  const onlineCount = useMemo(() => users.filter(u => u.online).length, [users]);

  /** Group users by ministry; public users go into a separate bucket at the end. */
  const grouped = useMemo(() => {
    const ministryMap = new Map<string, DirectoryUser[]>();
    const publicUsers: DirectoryUser[] = [];

    for (const u of filteredUsers) {
      if (u.role === 'public' || !u.ministry) {
        publicUsers.push(u);
      } else {
        const key = u.ministry;
        if (!ministryMap.has(key)) ministryMap.set(key, []);
        ministryMap.get(key)!.push(u);
      }
    }

    // Sort ministries alphabetically
    const sorted = [...ministryMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    // Each group: { label, users }
    const groups: { label: string; users: DirectoryUser[] }[] = sorted.map(([label, list]) => ({
      label,
      users: list.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }));

    if (publicUsers.length > 0) {
      groups.push({
        label: 'PUBLIC USERS',
        users: publicUsers.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      });
    }

    return groups;
  }, [filteredUsers]);

  /* ── render ── */

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-1.5 shrink-0">
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <Search size={12} className="text-text-muted shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            className="flex-1 bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-muted min-w-0"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div
        className="flex items-center justify-between px-3 py-1 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-1)' }}
      >
        <span className="text-[10px] text-text-muted flex items-center gap-1">
          <Users size={10} />
          {onlineCount} {onlineCount === 1 ? 'person' : 'people'} online
        </span>
        <button
          onClick={fetchDirectory}
          disabled={loading}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title="Refresh directory"
        >
          <RefreshCw
            size={11}
            className={`text-text-muted ${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {loading && users.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-text-muted" />
            <p className="text-[11px] text-text-muted">Loading directory...</p>
          </div>
        ) : error ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[11px] text-red-400 mb-2">{error}</p>
            <button
              onClick={fetchDirectory}
              className="text-[10px] px-3 py-1 rounded-md"
              style={{ background: 'rgba(0, 107, 63, 0.15)', color: '#006B3F' }}
            >
              Retry
            </button>
          </div>
        ) : grouped.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[11px] text-text-muted">
              {search ? 'No people match your search' : 'No users found'}
            </p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              {/* Ministry header */}
              <div
                className="px-3 py-1.5 sticky top-0"
                style={{
                  background: 'var(--color-surface-1)',
                  borderBottom: '1px solid var(--color-border-1)',
                }}
              >
                <span className="text-[9px] font-bold tracking-wider text-text-muted uppercase">
                  {group.label}
                </span>
              </div>

              {/* User rows */}
              {group.users.map(user => (
                <button
                  key={user.userId}
                  onClick={() => onStartChat(user.userId, user.displayName)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                  style={{ borderBottom: '1px solid var(--color-border-1)' }}
                >
                  {/* Avatar */}
                  <div
                    className="relative shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: avatarColor(user.displayName) }}
                  >
                    <span className="text-[10px] font-bold text-white leading-none">
                      {initials(user.displayName)}
                    </span>
                    {/* Online indicator */}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{
                        background: user.online ? '#22C55E' : '#6B7280',
                        borderColor: 'var(--color-surface-1)',
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] font-semibold text-text-primary truncate">
                        {user.displayName}
                      </span>
                      {/* Role badge */}
                      {user.role === 'admin' && (
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: 'rgba(0, 107, 63, 0.2)', color: '#006B3F' }}
                        >
                          Admin
                        </span>
                      )}
                      {user.role === 'public' && (
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#9CA3AF' }}
                        >
                          Public
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {user.department && (
                        <span className="text-[10px] text-text-muted truncate">
                          {user.department}
                        </span>
                      )}
                      {!user.online && user.lastSeen && (
                        <span className="text-[9px] text-text-muted opacity-60">
                          ({lastSeenLabel(user.lastSeen)})
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
