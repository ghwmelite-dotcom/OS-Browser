import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { KeyExchange } from '@/services/KeyExchange';
import { CryptoService } from '@/services/CryptoService';

type EncryptionStatus = 'encrypted' | 'pending' | 'unavailable';

interface EncryptionBadgeProps {
  conversationId: string;
  /** When true, show only the icon without text. */
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  EncryptionStatus,
  { icon: typeof ShieldCheck; color: string; bg: string; label: string }
> = {
  encrypted: {
    icon: ShieldCheck,
    color: '#006B3F',
    bg: 'rgba(0, 107, 63, 0.1)',
    label: 'End-to-end encrypted',
  },
  pending: {
    icon: ShieldAlert,
    color: '#D4A017',
    bg: 'rgba(212, 160, 23, 0.1)',
    label: 'Setting up encryption\u2026',
  },
  unavailable: {
    icon: ShieldOff,
    color: 'var(--color-text-muted)',
    bg: 'var(--color-surface-2)',
    label: 'Encryption unavailable',
  },
};

function getEncryptionStatus(conversationId: string): EncryptionStatus {
  if (CryptoService.hasSharedKey(conversationId)) {
    return 'encrypted';
  }
  if (KeyExchange.isPending(conversationId) || CryptoService.hasKeyPair(conversationId)) {
    return 'pending';
  }
  return 'unavailable';
}

export function EncryptionBadge({ conversationId, compact = false }: EncryptionBadgeProps) {
  const [status, setStatus] = useState<EncryptionStatus>(() =>
    getEncryptionStatus(conversationId),
  );

  // Poll for status changes (key exchange is async and event-less here)
  useEffect(() => {
    const check = () => setStatus(getEncryptionStatus(conversationId));
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        title={config.label}
        className="inline-flex items-center justify-center shrink-0"
        style={{ color: config.color }}
      >
        <Icon size={14} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium select-none shrink-0"
      style={{ background: config.bg, color: config.color }}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}
