import React, { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { StatusBarIndicatorProps } from '@/features/registry';
import { useVaultStore } from '@/store/vault';

const VaultIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor }) => {
  const totalCaptures = useVaultStore(s => s.totalCaptures);
  const loadStats = useVaultStore(s => s.loadStats);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (totalCaptures === 0) return null;

  return React.createElement('span', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: 'var(--color-text-primary)',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap' as const,
    },
    title: 'Interaction Vault - Click to view',
  },
    React.createElement(ShieldCheck, {
      size: 12,
      style: { color: stripColor },
    }),
    React.createElement('span', null, `${totalCaptures} capture${totalCaptures !== 1 ? 's' : ''}`),
  );
};

export { VaultIndicator };
export default VaultIndicator;
