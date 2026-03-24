import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Banknote, Receipt, Send } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import type { MoMoProvider } from './MoMoRequestCard';
import { PROVIDER_INFO } from './MoMoRequestCard';

/* ─────────── types ─────────── */

type PanelTab = 'request' | 'record';

const PROVIDERS: { value: MoMoProvider; label: string }[] = [
  { value: 'mtn-momo', label: 'MTN MoMo' },
  { value: 'telecel-cash', label: 'Telecel Cash' },
  { value: 'airteltigo-money', label: 'AirtelTigo Money' },
];

/* ─────────── component ─────────── */

interface MoMoPanelProps {
  onClose: () => void;
}

export function MoMoPanel({ onClose }: MoMoPanelProps) {
  const activeRoomId = useGovChatStore(s => s.activeRoomId);
  const sendMoMoRequest = useGovChatStore(s => s.sendMoMoRequest);
  const sendMoMoReceipt = useGovChatStore(s => s.sendMoMoReceipt);

  const [activeTab, setActiveTab] = useState<PanelTab>('request');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [provider, setProvider] = useState<MoMoProvider>('mtn-momo');
  const [transactionId, setTransactionId] = useState('');
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow only numbers and decimal point
    if (/^\d*\.?\d{0,2}$/.test(raw) || raw === '') {
      setAmount(raw);
    }
  }, []);

  const parsedAmount = parseFloat(amount) || 0;
  const isRequestValid = parsedAmount > 0;
  const isReceiptValid = parsedAmount > 0 && transactionId.trim().length > 0;

  const handleSendRequest = useCallback(async () => {
    if (!activeRoomId || !isRequestValid || sending) return;
    setSending(true);
    try {
      sendMoMoRequest(activeRoomId, parsedAmount, note.trim(), provider);
      onClose();
    } finally {
      setSending(false);
    }
  }, [activeRoomId, parsedAmount, note, provider, isRequestValid, sending, sendMoMoRequest, onClose]);

  const handleSendReceipt = useCallback(async () => {
    if (!activeRoomId || !isReceiptValid || sending) return;
    setSending(true);
    try {
      sendMoMoReceipt(activeRoomId, parsedAmount, provider, transactionId.trim(), note.trim());
      onClose();
    } finally {
      setSending(false);
    }
  }, [activeRoomId, parsedAmount, provider, transactionId, note, isReceiptValid, sending, sendMoMoReceipt, onClose]);

  const providerInfo = PROVIDER_INFO[provider];

  return (
    <div
      ref={panelRef}
      className="absolute left-0 right-0 bottom-full mb-1 rounded-xl overflow-hidden shadow-xl z-50"
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        animation: 'slideUp 0.25s ease-out',
        maxWidth: 380,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: '1px solid var(--color-border-1)' }}
      >
        <div className="flex items-center gap-1.5">
          <Banknote size={16} style={{ color: '#D4A017' }} />
          <span
            className="text-[12px] font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            MoMo in Chat
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Close MoMo panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--color-border-1)' }}>
        {(['request', 'record'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors"
            style={{
              color: activeTab === tab ? '#D4A017' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab ? '2px solid #D4A017' : '2px solid transparent',
              background: activeTab === tab ? 'rgba(212, 160, 23, 0.04)' : 'transparent',
            }}
          >
            {tab === 'request' ? <Banknote size={13} /> : <Receipt size={13} />}
            {tab === 'request' ? 'Request Money' : 'Record Payment'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="px-3 py-3 space-y-3">
        {/* Amount */}
        <div>
          <label
            className="block text-[10px] font-semibold mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Amount
          </label>
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-1)',
            }}
          >
            <span
              className="px-3 py-2 text-[13px] font-bold shrink-0"
              style={{
                color: '#D4A017',
                borderRight: '1px solid var(--color-border-1)',
                background: 'rgba(212, 160, 23, 0.04)',
              }}
            >
              GH&#x20B5;
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="flex-1 bg-transparent px-3 py-2 text-[13px] font-medium outline-none"
              style={{ color: 'var(--color-text-primary)' }}
              autoFocus
            />
          </div>
        </div>

        {/* Transaction ID (record tab only) */}
        {activeTab === 'record' && (
          <div>
            <label
              className="block text-[10px] font-semibold mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Transaction ID / Reference
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. TXN-12345678"
              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        )}

        {/* Note */}
        <div>
          <label
            className="block text-[10px] font-semibold mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={activeTab === 'request' ? 'What is this for?' : 'Payment description'}
            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-1)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Provider selector */}
        <div>
          <label
            className="block text-[10px] font-semibold mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Provider
          </label>
          <div className="flex gap-1.5">
            {PROVIDERS.map(p => {
              const pInfo = PROVIDER_INFO[p.value];
              const isSelected = provider === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setProvider(p.value)}
                  className="flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all active:scale-[0.97]"
                  style={{
                    background: isSelected ? pInfo.bg : 'var(--color-surface-2)',
                    color: isSelected ? pInfo.color : 'var(--color-text-muted)',
                    border: isSelected
                      ? `1.5px solid ${pInfo.color}`
                      : '1.5px solid var(--color-border-1)',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Send button */}
      <div className="px-3 pb-3">
        <button
          onClick={activeTab === 'request' ? handleSendRequest : handleSendReceipt}
          disabled={activeTab === 'request' ? !isRequestValid || sending : !isReceiptValid || sending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: activeTab === 'request'
              ? 'linear-gradient(135deg, #D4A017, #B8860B)'
              : 'linear-gradient(135deg, #006B3F, #004D2C)',
            color: '#FFFFFF',
          }}
        >
          <Send size={14} />
          {sending
            ? 'Sending...'
            : activeTab === 'request'
              ? `Send Request${parsedAmount > 0 ? ` — GH\u20B5${parsedAmount.toFixed(2)}` : ''}`
              : `Send Receipt${parsedAmount > 0 ? ` — GH\u20B5${parsedAmount.toFixed(2)}` : ''}`
          }
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
