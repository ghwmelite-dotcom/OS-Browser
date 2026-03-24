import React, { useState, useCallback } from 'react';
import { Clock, CheckCircle2, XCircle, Banknote } from 'lucide-react';
import { MoMoUSSDHelper } from './MoMoUSSDHelper';

/* ─────────── types ─────────── */

export type MoMoProvider = 'mtn-momo' | 'telecel-cash' | 'airteltigo-money';
export type MoMoRequestStatus = 'pending' | 'completed' | 'declined';

export interface MoMoRequestContent {
  msgtype: 'm.momo.request';
  body: string;
  amount: number;
  currency: string;
  note: string;
  provider: MoMoProvider;
  status: MoMoRequestStatus;
  requestId: string;
}

export const PROVIDER_INFO: Record<MoMoProvider, { name: string; color: string; bg: string }> = {
  'mtn-momo': { name: 'MTN MoMo', color: '#FFCC00', bg: 'rgba(255, 204, 0, 0.15)' },
  'telecel-cash': { name: 'Telecel Cash', color: '#0066CC', bg: 'rgba(0, 102, 204, 0.12)' },
  'airteltigo-money': { name: 'AirtelTigo Money', color: '#E40000', bg: 'rgba(228, 0, 0, 0.10)' },
};

const STATUS_CONFIG: Record<MoMoRequestStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  completed: { label: 'Completed', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  declined: { label: 'Declined', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)' },
};

/* ─────────── component ─────────── */

interface MoMoRequestCardProps {
  content: MoMoRequestContent;
  isOwn: boolean;
  roomId: string;
  onStatusUpdate?: (requestId: string, status: MoMoRequestStatus) => void;
  onPayConfirm?: (requestId: string, amount: number, provider: MoMoProvider) => void;
}

export function MoMoRequestCard({ content, isOwn, roomId, onStatusUpdate, onPayConfirm }: MoMoRequestCardProps) {
  const [showUSSD, setShowUSSD] = useState(false);
  const provider = PROVIDER_INFO[content.provider];
  const statusCfg = STATUS_CONFIG[content.status];

  const handlePay = useCallback(() => {
    setShowUSSD(true);
  }, []);

  const handleDecline = useCallback(() => {
    onStatusUpdate?.(content.requestId, 'declined');
  }, [content.requestId, onStatusUpdate]);

  const handlePayConfirm = useCallback(() => {
    setShowUSSD(false);
    onPayConfirm?.(content.requestId, content.amount, content.provider);
  }, [content.requestId, content.amount, content.provider, onPayConfirm]);

  return (
    <>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          borderLeft: '4px solid #D4A017',
          background: isOwn ? 'rgba(0, 0, 0, 0.15)' : 'rgba(212, 160, 23, 0.06)',
          maxWidth: 300,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid rgba(212, 160, 23, 0.12)' }}>
          <Banknote size={16} style={{ color: '#D4A017' }} />
          <span
            className="text-[11px] font-semibold"
            style={{ color: isOwn ? 'rgba(255,255,255,0.9)' : '#D4A017' }}
          >
            Money Request
          </span>
          <div className="flex-1" />
          {/* Status badge */}
          <span
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: statusCfg.color, background: statusCfg.bg }}
          >
            {statusCfg.label}
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

        {/* Provider badge */}
        <div className="flex justify-center pb-2">
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ color: provider.color, background: provider.bg }}
          >
            {provider.name}
          </span>
        </div>

        {/* Action buttons (receiver only, pending status) */}
        {!isOwn && content.status === 'pending' && (
          <div
            className="flex gap-2 px-3 py-2.5"
            style={{ borderTop: '1px solid rgba(212, 160, 23, 0.12)' }}
          >
            <button
              onClick={handlePay}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #D4A017, #B8860B)',
                color: '#FFFFFF',
              }}
            >
              <Banknote size={13} />
              Pay via MoMo
            </button>
            <button
              onClick={handleDecline}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium transition-all hover:opacity-80 active:scale-[0.98]"
              style={{
                background: 'rgba(220, 38, 38, 0.08)',
                color: '#DC2626',
              }}
            >
              <XCircle size={12} />
              Decline
            </button>
          </div>
        )}

        {/* Completed indicator (for sender) */}
        {content.status === 'completed' && (
          <div
            className="flex items-center justify-center gap-1.5 px-3 py-2"
            style={{ borderTop: '1px solid rgba(5, 150, 105, 0.12)' }}
          >
            <CheckCircle2 size={13} style={{ color: '#059669' }} />
            <span className="text-[10.5px] font-medium" style={{ color: '#059669' }}>
              Payment confirmed
            </span>
          </div>
        )}

        {/* Declined indicator */}
        {content.status === 'declined' && (
          <div
            className="flex items-center justify-center gap-1.5 px-3 py-2"
            style={{ borderTop: '1px solid rgba(220, 38, 38, 0.12)' }}
          >
            <XCircle size={13} style={{ color: '#DC2626' }} />
            <span className="text-[10.5px] font-medium" style={{ color: '#DC2626' }}>
              Request declined
            </span>
          </div>
        )}
      </div>

      {/* USSD Helper overlay */}
      {showUSSD && (
        <MoMoUSSDHelper
          provider={content.provider}
          amount={content.amount}
          onConfirm={handlePayConfirm}
          onCancel={() => setShowUSSD(false)}
        />
      )}
    </>
  );
}
