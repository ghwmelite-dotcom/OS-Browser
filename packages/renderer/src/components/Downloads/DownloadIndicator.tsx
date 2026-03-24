import React from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { StatusBarIndicatorProps } from '@/features/registry';
import { useDownloadStore } from '@/store/downloads';

const DownloadIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor }) => {
  const count = useDownloadStore(s => s.activeCount());

  if (count === 0) return null;

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
    title: 'Downloads — Click to view',
  },
    React.createElement(ArrowDownToLine, {
      size: 12,
      style: {
        color: stripColor,
        animation: 'pulse 1.2s ease-in-out infinite',
      },
    }),
    React.createElement('span', null, `${count} downloading`),
  );
};

export { DownloadIndicator };
export default DownloadIndicator;
