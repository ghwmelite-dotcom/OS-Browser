import React, { useCallback, useState } from 'react';
import { X, Copy, CheckCircle2, Phone } from 'lucide-react';
import { PROVIDER_INFO } from './MoMoRequestCard';
import type { MoMoProvider } from './MoMoRequestCard';

/* ─────────── USSD instructions per provider ─────────── */

interface USSDStep {
  instruction: string;
  detail?: string;
}

const USSD_INSTRUCTIONS: Record<MoMoProvider, { dialCode: string; steps: USSDStep[] }> = {
  'mtn-momo': {
    dialCode: '*170#',
    steps: [
      { instruction: 'Dial *170#', detail: 'On your MTN line' },
      { instruction: 'Select Option 1', detail: 'Transfer Money' },
      { instruction: 'Select "MoMo User"' },
      { instruction: 'Enter recipient number' },
      { instruction: 'Enter the amount' },
      { instruction: 'Enter your MoMo PIN to confirm' },
    ],
  },
  'telecel-cash': {
    dialCode: '*110#',
    steps: [
      { instruction: 'Dial *110#', detail: 'On your Telecel line' },
      { instruction: 'Select "Send Money"' },
      { instruction: 'Enter recipient number' },
      { instruction: 'Enter the amount' },
      { instruction: 'Enter your PIN to confirm' },
    ],
  },
  'airteltigo-money': {
    dialCode: '*500#',
    steps: [
      { instruction: 'Dial *500#', detail: 'On your AirtelTigo line' },
      { instruction: 'Select "Send Money"' },
      { instruction: 'Enter recipient number' },
      { instruction: 'Enter the amount' },
      { instruction: 'Enter your PIN to confirm' },
    ],
  },
};

/* ─────────── component ─────────── */

interface MoMoUSSDHelperProps {
  provider: MoMoProvider;
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MoMoUSSDHelper({ provider, amount, onConfirm, onCancel }: MoMoUSSDHelperProps) {
  const [copiedAmount, setCopiedAmount] = useState(false);
  const info = PROVIDER_INFO[provider];
  const ussd = USSD_INSTRUCTIONS[provider];

  const handleCopyAmount = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(amount.toFixed(2));
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = amount.toFixed(2);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  }, [amount]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom"
        style={{
          background: 'var(--color-surface-1)',
          maxHeight: '85vh',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border-1)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <Phone size={18} style={{ color: info.color }} />
            <div>
              <h3
                className="text-[14px] font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Pay via {info.name}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Follow the steps below on your phone
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-full transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Amount display */}
        <div
          className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: info.bg }}
        >
          <div>
            <p className="text-[10px] font-medium" style={{ color: info.color }}>
              Amount to send
            </p>
            <p className="text-[20px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              GH&#x20B5;{amount.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleCopyAmount}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all active:scale-[0.95]"
            style={{
              background: copiedAmount ? 'rgba(5, 150, 105, 0.12)' : 'var(--color-surface-2)',
              color: copiedAmount ? '#059669' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border-1)',
            }}
          >
            {copiedAmount ? (
              <>
                <CheckCircle2 size={13} />
                Copied
              </>
            ) : (
              <>
                <Copy size={13} />
                Copy amount
              </>
            )}
          </button>
        </div>

        {/* USSD dial code */}
        <div className="mx-4 mb-3">
          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-1)',
            }}
          >
            <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
              USSD Code
            </p>
            <p
              className="text-[24px] font-bold font-mono tracking-wider"
              style={{ color: info.color }}
            >
              {ussd.dialCode}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 pb-3">
          <p
            className="text-[11px] font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Steps
          </p>
          <div className="space-y-2">
            {ussd.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ background: info.bg, color: info.color }}
                >
                  {i + 1}
                </span>
                <div>
                  <p
                    className="text-[12px] font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {step.instruction}
                  </p>
                  {step.detail && (
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-4 pb-6 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-[12px] font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
            style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-1)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #006B3F, #004D2C)',
              color: '#FFFFFF',
            }}
          >
            <CheckCircle2 size={14} />
            I've paid — confirm
          </button>
        </div>
      </div>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
