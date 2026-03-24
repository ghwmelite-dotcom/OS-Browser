import React, { useState, useMemo } from 'react';
import { usePasswordStore, SavedPassword } from '@/store/passwords';
import { Key, Search, Eye, EyeOff, Copy, Plus, Trash2, Edit3, Globe, RefreshCw, X, Check, Shield } from 'lucide-react';

const TOTPManager = React.lazy(() => import('@/components/Passwords/TOTPManager'));

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

function generateStrongPassword(length = 16): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*_+-=?';
  const all = upper + lower + digits + symbols;
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  const rest = Array.from({ length: length - 4 }, () => all[Math.floor(Math.random() * all.length)]);
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  personal: { bg: 'var(--color-surface-2)', text: 'var(--color-text-muted)', label: 'Personal' },
  work: { bg: 'rgba(59,130,246,0.15)', text: 'rgb(59,130,246)', label: 'Work' },
  government: { bg: 'rgba(34,197,94,0.15)', text: 'rgb(34,197,94)', label: 'Government' },
};

interface PasswordFormData {
  url: string;
  username: string;
  password: string;
  name: string;
  category: 'personal' | 'work' | 'government';
}

const emptyForm: PasswordFormData = { url: '', username: '', password: '', name: '', category: 'personal' };

function PasswordForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: PasswordFormData;
  onSubmit: (data: PasswordFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<PasswordFormData>(initial);
  const [showPw, setShowPw] = useState(false);

  const handleGenerate = () => {
    setForm(f => ({ ...f, password: generateStrongPassword() }));
    setShowPw(true);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">{submitLabel === 'Save' ? 'Add Password' : 'Edit Password'}</h2>
          <button onClick={onCancel} className="p-1 rounded-md hover:bg-surface-2 transition-colors">
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">Website URL</label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com"
              className="w-full px-3 py-2 rounded-lg border text-[13px] text-text-primary outline-none transition-colors focus:ring-2 focus:ring-ghana-gold/40"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">Username / Email</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-lg border text-[13px] text-text-primary outline-none transition-colors focus:ring-2 focus:ring-ghana-gold/40"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 pr-9 rounded-lg border text-[13px] text-text-primary outline-none transition-colors focus:ring-2 focus:ring-ghana-gold/40"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-3 transition-colors"
                >
                  {showPw ? <EyeOff size={14} className="text-text-muted" /> : <Eye size={14} className="text-text-muted" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="px-3 py-2 rounded-lg border text-[12px] font-medium text-text-secondary hover:bg-surface-2 transition-colors flex items-center gap-1.5 shrink-0"
                style={{ borderColor: 'var(--color-border-1)' }}
                title="Generate strong password"
              >
                <RefreshCw size={13} /> Generate
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">Friendly Name (optional)</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Work GitHub"
              className="w-full px-3 py-2 rounded-lg border text-[13px] text-text-primary outline-none transition-colors focus:ring-2 focus:ring-ghana-gold/40"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as PasswordFormData['category'] }))}
              className="w-full px-3 py-2 rounded-lg border text-[13px] text-text-primary outline-none transition-colors focus:ring-2 focus:ring-ghana-gold/40"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
            >
              <option value="personal">Personal</option>
              <option value="work">Work</option>
              <option value="government">Government</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-secondary hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.url.trim() || !form.username.trim() || !form.password.trim()) return;
              onSubmit(form);
            }}
            disabled={!form.url.trim() || !form.username.trim() || !form.password.trim()}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-accent)' }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordCard({ entry }: { entry: SavedPassword }) {
  const { updatePassword, removePassword } = usePasswordStore();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'password' | 'username' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const cat = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.personal;

  const handleCopy = async (text: string, field: 'password' | 'username') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      if (field === 'password') {
        updatePassword(entry.id, { lastUsedAt: Date.now() });
      }
      setTimeout(() => setCopiedField(null), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    removePassword(entry.id);
  };

  return (
    <>
      <div
        className="rounded-xl border p-4 transition-all duration-150 hover:shadow-md"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-border-1)',
        }}
      >
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <Globe size={16} className="text-text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-text-primary truncate">
              {entry.name || entry.domain}
            </div>
            {entry.name && (
              <div className="text-[12px] text-text-muted truncate">{entry.domain}</div>
            )}
          </div>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{ background: cat.bg, color: cat.text }}
          >
            {cat.label}
          </span>
        </div>

        {/* Username */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] text-text-muted w-[70px] shrink-0">Username:</span>
          <span className="text-[13px] text-text-primary flex-1 truncate font-mono">{entry.username}</span>
          <button
            onClick={() => handleCopy(entry.username, 'username')}
            className="p-1 rounded hover:bg-surface-2 transition-colors shrink-0"
            title="Copy username"
          >
            {copiedField === 'username' ? (
              <Check size={13} className="text-green-500" />
            ) : (
              <Copy size={13} className="text-text-muted" />
            )}
          </button>
        </div>

        {/* Password */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[12px] text-text-muted w-[70px] shrink-0">Password:</span>
          <span className="text-[13px] text-text-primary flex-1 truncate font-mono">
            {showPassword ? entry.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
          </span>
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 rounded hover:bg-surface-2 transition-colors shrink-0"
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={13} className="text-text-muted" /> : <Eye size={13} className="text-text-muted" />}
          </button>
          <button
            onClick={() => handleCopy(entry.password, 'password')}
            className="p-1 rounded hover:bg-surface-2 transition-colors shrink-0"
            title="Copy password"
          >
            {copiedField === 'password' ? (
              <Check size={13} className="text-green-500" />
            ) : (
              <Copy size={13} className="text-text-muted" />
            )}
          </button>
        </div>

        {/* TOTP 2FA Section */}
        <React.Suspense fallback={null}>
          <TOTPManager credentialId={entry.id} />
        </React.Suspense>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border-1)' }}>
          <span className="text-[11px] text-text-muted">
            Last used: {timeAgo(entry.lastUsedAt)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-secondary hover:bg-surface-2 transition-colors flex items-center gap-1"
            >
              <Edit3 size={11} /> Edit
            </button>
            <button
              onClick={handleDelete}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                confirmDelete
                  ? 'bg-red-500/15 text-red-500'
                  : 'text-text-secondary hover:bg-surface-2'
              }`}
            >
              <Trash2 size={11} /> {confirmDelete ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <PasswordForm
          initial={{
            url: entry.url,
            username: entry.username,
            password: entry.password,
            name: entry.name || '',
            category: entry.category,
          }}
          submitLabel="Update"
          onCancel={() => setEditing(false)}
          onSubmit={(data) => {
            updatePassword(entry.id, {
              url: data.url,
              domain: extractDomain(data.url),
              username: data.username,
              password: data.password,
              name: data.name || undefined,
              category: data.category,
            });
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

export function PasswordManager() {
  const { passwords, searchQuery, setSearchQuery } = usePasswordStore();
  const getFiltered = usePasswordStore(s => s.getFilteredPasswords);
  const addPassword = usePasswordStore(s => s.addPassword);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => getFiltered(), [passwords, searchQuery]);

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[720px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              <Key size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Password Manager</h1>
              <p className="text-[12px] text-text-muted">Manage your saved credentials</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors flex items-center gap-1.5 hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus size={15} /> Add
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search passwords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-[13px] text-text-primary outline-none transition-colors focus:ring-2 focus:ring-ghana-gold/40"
            style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-2 transition-colors"
            >
              <X size={14} className="text-text-muted" />
            </button>
          )}
        </div>

        {/* Password cards */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(entry => (
              <PasswordCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <Shield size={28} className="text-text-muted opacity-40" />
            </div>
            {passwords.length === 0 ? (
              <>
                <p className="text-[15px] font-medium text-text-primary mb-1">No passwords saved yet</p>
                <p className="text-[13px] text-text-muted mb-4">Add your first password to get started.</p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors hover:opacity-90"
                  style={{ background: 'var(--color-accent)' }}
                >
                  <span className="flex items-center gap-1.5 justify-center"><Plus size={15} /> Add Password</span>
                </button>
              </>
            ) : (
              <>
                <p className="text-[15px] font-medium text-text-primary mb-1">No matches found</p>
                <p className="text-[13px] text-text-muted">Try a different search term.</p>
              </>
            )}
          </div>
        )}

        {/* Footer count */}
        {passwords.length > 0 && (
          <div className="mt-6 text-center text-[12px] text-text-muted">
            Total: {passwords.length} password{passwords.length !== 1 ? 's' : ''} saved
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <PasswordForm
          initial={emptyForm}
          submitLabel="Save"
          onCancel={() => setShowAdd(false)}
          onSubmit={(data) => {
            addPassword({
              url: data.url,
              domain: extractDomain(data.url),
              username: data.username,
              password: data.password,
              name: data.name || undefined,
              category: data.category,
            });
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
