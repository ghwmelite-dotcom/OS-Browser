import React, { useState, useMemo } from 'react';
import {
  X, Smartphone, Plus, Check, Clock, XCircle, ChevronLeft, ChevronRight,
  Edit3, Trash2, Download, Zap, Droplets, Building, Landmark, Globe,
  CreditCard, FileText, AlertCircle,
} from 'lucide-react';
import {
  useMobileMoneyStore,
  PROVIDER_BRANDING,
  type MoMoAccount,
  type PaymentReceipt,
} from '@/store/mobilemoney';

/* ─── Currency formatter ────────────────────────────────────── */
const ghsCurrency = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  minimumFractionDigits: 2,
});

function formatGHS(amount: number): string {
  return ghsCurrency.format(amount).replace('GHS', 'GH₵');
}

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + '-***-' + phone.slice(-4);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ─── Provider dot / stripe ─────────────────────────────────── */
function ProviderDot({ provider, size = 10 }: { provider: 'mtn' | 'telecel' | 'at'; size?: number }) {
  return (
    <span
      className="rounded-full shrink-0 inline-block"
      style={{ width: size, height: size, background: PROVIDER_BRANDING[provider].color }}
    />
  );
}

/* ─── Status badge ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: PaymentReceipt['status'] }) {
  const cfg = {
    completed: { icon: Check, label: 'Completed', bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
    pending: { icon: Clock, label: 'Pending', bg: 'rgba(212,160,23,0.14)', color: '#b8860b' },
    failed: { icon: XCircle, label: 'Failed', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
  }[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={10} strokeWidth={2.2} />
      {cfg.label}
    </span>
  );
}

/* ─── Tab button ────────────────────────────────────────────── */
function TabPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150"
      style={{
        background: active ? 'var(--color-ghana-gold, #D4A017)' : 'var(--color-surface-2)',
        color: active ? '#000' : 'var(--color-text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Accounts Tab
   ═══════════════════════════════════════════════════════════════ */
function AccountsTab() {
  const { accounts, addAccount, removeAccount, setDefaultAccount } = useMobileMoneyStore();
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState<'mtn' | 'telecel' | 'at'>('mtn');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const resetForm = () => {
    setShowForm(false);
    setProvider('mtn');
    setPhone('');
    setName('');
    setIsDefault(false);
  };

  const handleSave = () => {
    if (!phone.trim() || !name.trim()) return;
    addAccount({ provider, phoneNumber: phone.replace(/\s/g, ''), accountName: name.trim(), isDefault });
    resetForm();
  };

  return (
    <div className="flex flex-col gap-3">
      {accounts.length === 0 && !showForm && (
        <div className="text-center py-10 px-4">
          <Smartphone size={36} className="mx-auto mb-3 text-text-muted opacity-40" />
          <p className="text-[13px] text-text-muted">Add your mobile money accounts for quick payments</p>
        </div>
      )}

      {accounts.map((acct) => (
        <div
          key={acct.id}
          className="flex items-center gap-3 rounded-xl p-3 border transition-all duration-150 hover:shadow-sm"
          style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
          onMouseEnter={() => setHoveredId(acct.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Provider color stripe */}
          <div
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ background: PROVIDER_BRANDING[acct.provider].color }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-text-primary truncate">
                {acct.accountName}
              </span>
              {acct.isDefault && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                  style={{ background: 'rgba(212,160,23,0.18)', color: '#b8860b' }}
                >
                  Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: PROVIDER_BRANDING[acct.provider].color,
                  color: PROVIDER_BRANDING[acct.provider].textColor,
                }}
              >
                {PROVIDER_BRANDING[acct.provider].label}
              </span>
              <span className="text-[12px] text-text-muted font-mono">{maskPhone(acct.phoneNumber)}</span>
            </div>
          </div>

          {/* Hover actions */}
          {hoveredId === acct.id && (
            <div className="flex items-center gap-1 shrink-0">
              {!acct.isDefault && (
                <button
                  onClick={() => setDefaultAccount(acct.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
                  title="Set as default"
                >
                  <Check size={14} className="text-text-muted" />
                </button>
              )}
              <button
                onClick={() => removeAccount(acct.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
                title="Remove account"
              >
                <Trash2 size={14} className="text-text-muted" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add account form */}
      {showForm && (
        <div
          className="rounded-xl p-4 border space-y-3"
          style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-2)' }}
        >
          <p className="text-[12px] font-bold text-text-primary uppercase tracking-wider">New Account</p>

          {/* Provider selector */}
          <div className="flex gap-2">
            {(['mtn', 'telecel', 'at'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold border-2 transition-all duration-150"
                style={{
                  borderColor: provider === p ? PROVIDER_BRANDING[p].color : 'var(--color-border-1)',
                  background: provider === p ? PROVIDER_BRANDING[p].color + '18' : 'transparent',
                  color: provider === p ? PROVIDER_BRANDING[p].color : 'var(--color-text-muted)',
                }}
              >
                {PROVIDER_BRANDING[p].label.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Phone */}
          <div>
            <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0XX XXX XXXX"
              maxLength={13}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border font-mono"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
              Account Holder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kwame Asante"
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Default checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D4A017]"
            />
            <span className="text-[12px] text-text-secondary">Set as default account</span>
          </label>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!phone.trim() || !name.trim()}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
              style={{ background: 'var(--color-ghana-gold, #D4A017)', color: '#000' }}
            >
              Save Account
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg text-[12px] font-medium border transition-colors hover:bg-surface-2"
              style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed text-[12px] font-semibold transition-all duration-150 hover:border-solid flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-muted)' }}
        >
          <Plus size={14} />
          Add Account
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Receipts Tab
   ═══════════════════════════════════════════════════════════════ */
function ReceiptsTab() {
  const {
    selectedMonth, setSelectedMonth, monthlyBudget, setMonthlyBudget,
    getMonthlyTotal, getMonthlyReceipts,
  } = useMobileMoneyStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const total = getMonthlyTotal();
  const receipts = getMonthlyReceipts();
  const pct = monthlyBudget > 0 ? Math.min((total / monthlyBudget) * 100, 100) : 0;

  const barColor = pct > 90 ? '#dc2626' : pct > 70 ? '#b8860b' : '#16a34a';

  const handleExportCSV = () => {
    const header = 'Date,Time,Description,Recipient,Amount (GH₵),Reference,Provider,Status,URL\n';
    const rows = receipts
      .map((r) =>
        [
          formatDate(r.timestamp),
          formatTime(r.timestamp),
          `"${r.description}"`,
          `"${r.recipient}"`,
          r.amount.toFixed(2),
          r.reference,
          PROVIDER_BRANDING[r.provider].label,
          r.status,
          r.url,
        ].join(',')
      )
      .join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `momo-statement-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
        >
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <span className="text-[13px] font-semibold text-text-primary">{monthLabel(selectedMonth)}</span>
        <button
          onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
        >
          <ChevronRight size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Monthly summary */}
      <div
        className="rounded-xl p-4 border"
        style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-2)' }}
      >
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Total Spent
        </p>
        <p className="text-[22px] font-bold text-text-primary leading-tight">{formatGHS(total)}</p>

        {/* Progress bar */}
        <div className="mt-3 mb-2">
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--color-surface-3)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {editingBudget ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-text-muted">Budget: GH₵</span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = parseFloat(budgetInput);
                    if (v > 0) setMonthlyBudget(v);
                    setEditingBudget(false);
                  }
                  if (e.key === 'Escape') setEditingBudget(false);
                }}
                onBlur={() => {
                  const v = parseFloat(budgetInput);
                  if (v > 0) setMonthlyBudget(v);
                  setEditingBudget(false);
                }}
                autoFocus
                className="w-20 px-1.5 py-0.5 rounded text-[11px] outline-none border font-mono"
                style={{
                  background: 'var(--color-surface-1)',
                  borderColor: 'var(--color-border-1)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setBudgetInput(String(monthlyBudget));
                setEditingBudget(true);
              }}
              className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
            >
              Budget: {formatGHS(monthlyBudget)} ✎
            </button>
          )}
          <span className="text-[11px] text-text-muted">
            {receipts.length} transaction{receipts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Receipt list */}
      {receipts.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={28} className="mx-auto mb-2 text-text-muted opacity-40" />
          <p className="text-[12px] text-text-muted">No transactions for this month</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {receipts.map((r) => (
            <div key={r.id}>
              <button
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                className="w-full text-left rounded-xl p-3 border transition-all duration-150 hover:shadow-sm"
                style={{
                  borderColor: 'var(--color-border-1)',
                  background: 'var(--color-surface-1)',
                  borderLeftWidth: 3,
                  borderLeftColor: PROVIDER_BRANDING[r.provider].color,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <ProviderDot provider={r.provider} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[12px] font-semibold text-text-primary truncate">
                        {r.description}
                      </span>
                      <span className="text-[12px] font-bold text-text-primary shrink-0">
                        {formatGHS(r.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-text-muted truncate">{r.recipient}</span>
                      <span className="text-[10px] text-text-muted shrink-0">
                        {formatDate(r.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {expandedId === r.id && (
                <div
                  className="mx-3 px-3 py-2.5 rounded-b-lg border-x border-b text-[11px] space-y-1"
                  style={{
                    borderColor: 'var(--color-border-1)',
                    background: 'var(--color-surface-2)',
                  }}
                >
                  <div className="flex justify-between">
                    <span className="text-text-muted">Reference:</span>
                    <span className="text-text-primary font-mono">{r.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Provider:</span>
                    <span className="text-text-primary">{PROVIDER_BRANDING[r.provider].label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Time:</span>
                    <span className="text-text-primary">{formatTime(r.timestamp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">URL:</span>
                    <span className="text-text-primary truncate max-w-[180px]">{r.url}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Export */}
      {receipts.length > 0 && (
        <button
          onClick={handleExportCSV}
          className="w-full py-2.5 rounded-xl border text-[12px] font-semibold flex items-center justify-center gap-2 transition-all duration-150 hover:bg-surface-2"
          style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
        >
          <Download size={14} />
          Export Statement
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Quick Pay Tab
   ═══════════════════════════════════════════════════════════════ */

const QUICK_SHORTCUTS = [
  {
    id: 'ecg',
    icon: Zap,
    label: 'Pay ECG Bill',
    sub: 'Electricity',
    url: 'https://www.ecg.com.gh',
    color: '#f59e0b',
  },
  {
    id: 'gwcl',
    icon: Droplets,
    label: 'Pay GWCL Bill',
    sub: 'Water',
    url: 'https://www.gwcl.com.gh',
    color: '#3b82f6',
  },
  {
    id: 'ssnit',
    icon: Building,
    label: 'SSNIT Contribution',
    sub: 'Pension',
    url: 'https://www.ssnit.org.gh',
    color: '#10b981',
  },
  {
    id: 'gra',
    icon: Landmark,
    label: 'GRA Tax Payment',
    sub: 'Tax',
    url: 'https://gra.gov.gh',
    color: '#8b5cf6',
  },
  {
    id: 'ghgov',
    icon: Globe,
    label: 'Ghana.gov.gh Service',
    sub: 'Gov Services',
    url: 'https://ghana.gov.gh',
    color: '#ef4444',
  },
];

function QuickPayTab() {
  const { accounts, addReceipt } = useMobileMoneyStore();
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || ''
  );
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleOpenUrl = (url: string) => {
    // Open in new tab via the tab store
    try {
      (window as any).osBrowser?.tabs?.create?.(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleRecordPayment = () => {
    if (!selectedAccountId || !recipient.trim() || !amount.trim() || !description.trim()) return;
    const acct = accounts.find((a) => a.id === selectedAccountId);
    if (!acct) return;

    addReceipt({
      accountId: selectedAccountId,
      provider: acct.provider,
      amount: parseFloat(amount),
      reference: `MAN-${Date.now().toString(36).toUpperCase()}`,
      description: description.trim(),
      recipient: recipient.trim(),
      timestamp: Date.now(),
      status: 'completed',
      url: window.location.href,
    });

    setRecipient('');
    setAmount('');
    setDescription('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Detect payment section */}
      <div
        className="rounded-xl p-4 border"
        style={{
          borderColor: 'var(--color-border-1)',
          background: 'linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-1) 100%)',
        }}
      >
        <div className="flex items-start gap-2.5 mb-2">
          <Smartphone size={18} style={{ color: 'var(--color-ghana-gold, #D4A017)' }} />
          <div>
            <p className="text-[12px] font-bold text-text-primary">Payment Detection</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Auto-detect payment forms on government portals and pre-fill your mobile money details.
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg text-[10px]"
          style={{ background: 'rgba(212,160,23,0.1)', color: '#b8860b' }}
        >
          <AlertCircle size={12} />
          Payment detection on web pages coming soon
        </div>
      </div>

      {/* Quick pay shortcuts */}
      <div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
          Quick Pay Shortcuts
        </p>
        <div className="flex flex-col gap-1.5">
          {QUICK_SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => handleOpenUrl(s.url)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 hover:shadow-sm hover:translate-x-0.5"
                style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: s.color + '18' }}
                >
                  <Icon size={16} style={{ color: s.color }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary">{s.label}</p>
                  <p className="text-[10px] text-text-muted">{s.sub}</p>
                </div>
                <ChevronRight size={14} className="text-text-muted shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual payment entry */}
      <div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
          Record Manual Payment
        </p>
        <div
          className="rounded-xl p-4 border space-y-3"
          style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-2)' }}
        >
          {/* Account selector */}
          {accounts.length > 0 ? (
            <div>
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
                From Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[12px] outline-none border appearance-none cursor-pointer"
                style={{
                  background: 'var(--color-surface-1)',
                  borderColor: 'var(--color-border-1)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {PROVIDER_BRANDING[a.provider].label} — {maskPhone(a.phoneNumber)} ({a.accountName})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[11px] text-text-muted italic">
              Add an account in the Accounts tab first.
            </p>
          )}

          {/* Recipient */}
          <div>
            <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
              Recipient Phone / Reference
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. 0201234567 or ECG-ACC-123"
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none border"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
              Amount (GH₵)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none border font-mono"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electricity prepaid top-up"
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none border"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleRecordPayment}
            disabled={
              !selectedAccountId || !recipient.trim() || !amount.trim() || !description.trim() || accounts.length === 0
            }
            className="w-full py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'var(--color-ghana-gold, #D4A017)', color: '#000' }}
          >
            <CreditCard size={14} />
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Panel
   ═══════════════════════════════════════════════════════════════ */
type TabId = 'accounts' | 'receipts' | 'quickpay';

export function MobileMoneyPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('accounts');

  return (
    <div
      className="w-[360px] h-full flex flex-col shrink-0 border-l"
      style={{
        background: 'var(--color-bg)',
        borderColor: 'var(--color-border-1)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(212,160,23,0.14)' }}
        >
          <Smartphone size={17} style={{ color: 'var(--color-ghana-gold, #D4A017)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-bold text-text-primary">Mobile Money</h2>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
              style={{ background: 'rgba(212,160,23,0.18)', color: '#b8860b' }}
            >
              Quick Pay
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
          aria-label="Close"
        >
          <X size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2.5 flex gap-2 shrink-0 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
        <TabPill active={activeTab === 'accounts'} label="Accounts" onClick={() => setActiveTab('accounts')} />
        <TabPill active={activeTab === 'receipts'} label="Receipts" onClick={() => setActiveTab('receipts')} />
        <TabPill active={activeTab === 'quickpay'} label="Quick Pay" onClick={() => setActiveTab('quickpay')} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'thin' }}>
        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === 'receipts' && <ReceiptsTab />}
        {activeTab === 'quickpay' && <QuickPayTab />}
      </div>
    </div>
  );
}
