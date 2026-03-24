import React from 'react';
import { CheckCircle2, Receipt } from 'lucide-react';
import { PROVIDER_INFO } from './MoMoRequestCard';
import type { MoMoProvider } from './MoMoRequestCard';

/* ─────────── types ─────────── */

export interface MoMoReceiptContent {
  msgtype: 'm.momo.receipt';
  body: string;
  amount: number;
  currency: string;
  provider: MoMoProvider;
  transactionId: string;
  note: string;
  requestId?: string;
  timestamp: number;
}

/* ─────────── helpers ─────────── */

function formatReceiptTime(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${day} ${month}, ${h}:${m} ${ampm}`;
}

/* ─────────── component ─────────── */

interface MoMoReceiptCardProps {
  content: MoMoReceiptContent;
  isOwn: boolean;
}

export function MoMoReceiptCard({ content, isOwn }: MoMoReceiptCardProps) {
  const provider = PROVIDER_INFO[content.provider];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        borderLeft: '4px solid #006B3F',
        background: isOwn ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 107, 63, 0.05)',
        maxWidth: 300,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0, 107, 63, 0.12)' }}
      >
        <CheckCircle2 size={16} style={{ color: '#059669' }} />
        <span
          className="text-[11px] font-semibold"
          style={{ color: isOwn ? 'rgba(255,255,255,0.9)' : '#059669' }}
        >
          Payment Confirmed
        </span>
      </div>

      {/* Amount */}
      <div className="px-3 py-3 text-center">
        <p
          className="text-[22px] font-bold tracking-tight"
          style={{ color: isOwn ? '#FFFFFF' : 'var(--color-text-primary)' }}
        >
          GH&#x20B5;{content.amount.toFixed(2)}
        </p>
        {content.note && (
          <p
            className="text-[11px] mt-1"
            style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}
          >
            {content.note}
          </p>
        )}
      </div>

      {/* Details */}
      <div
        className="px-3 py-2 space-y-1.5"
        style={{ borderTop: '1px solid rgba(0, 107, 63, 0.08)' }}
      >
        {/* Provider */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px]"
            style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }}
          >
            Provider
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: provider.color, background: provider.bg }}
          >
            {provider.name}
          </span>
        </div>

        {/* Transaction ref */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px]"
            style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }}
          >
            Ref
          </span>
          <span
            className="text-[10px] font-mono"
            style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--color-text-primary)' }}
          >
            {content.transactionId}
          </span>
        </div>

        {/* Timestamp */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px]"
            style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }}
          >
            Time
          </span>
          <span
            className="text-[10px]"
            style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}
          >
            {formatReceiptTime(content.timestamp)}
          </span>
        </div>
      </div>

      {/* Footer check */}
      <div
        className="flex items-center justify-center gap-1 px-3 py-2"
        style={{ borderTop: '1px solid rgba(0, 107, 63, 0.08)' }}
      >
        <Receipt size={11} style={{ color: '#059669' }} />
        <span className="text-[9px]" style={{ color: '#059669' }}>
          Mobile money receipt
        </span>
      </div>
    </div>
  );
}
