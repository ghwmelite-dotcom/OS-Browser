import React from 'react';
import { Eye } from 'lucide-react';
import { StatusBarIndicatorProps } from '@/features/registry';
import { useChangeDetectorStore } from '@/store/change-detector';

const WatcherIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor }) => {
  const unreadCount = useChangeDetectorStore(s => s.unreadCount);

  if (unreadCount === 0) return null;

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
    title: `${unreadCount} page${unreadCount !== 1 ? 's' : ''} changed`,
  },
    React.createElement(Eye, {
      size: 12,
      style: {
        color: stripColor,
        animation: 'pulse 1.2s ease-in-out infinite',
      },
    }),
    React.createElement('span', null, `${unreadCount} changed`),
  );
};

export { WatcherIndicator };
export default WatcherIndicator;
