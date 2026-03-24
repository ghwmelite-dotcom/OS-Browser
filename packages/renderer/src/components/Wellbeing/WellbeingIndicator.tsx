import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import type { StatusBarIndicatorProps } from '@/features/registry';
import { useWellbeingStore } from '@/store/wellbeing';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '<1m';
}

function getTimeColor(
  dailyBrowsingSeconds: number,
  dailyGoalMinutes: number,
  stripColor: string,
): string {
  if (dailyGoalMinutes <= 0) return stripColor;

  const goalSeconds = dailyGoalMinutes * 60;
  const ratio = dailyBrowsingSeconds / goalSeconds;

  if (ratio >= 1) return '#EF4444';
  if (ratio >= 0.75) return '#F59E0B';
  return stripColor;
}

export const WellbeingIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor }) => {
  const { dailyBrowsingSeconds, dailyGoalMinutes } = useWellbeingStore();
  const [, setTick] = useState(0);

  // Force re-render every 10 seconds to keep the display fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const color = getTimeColor(dailyBrowsingSeconds, dailyGoalMinutes, stripColor);
  const label = formatTime(dailyBrowsingSeconds);

  return React.createElement(
    'span',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        color,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap' as const,
      },
      title: 'Digital Wellbeing — Browsing time today',
    },
    React.createElement(Clock, { size: 12, style: { color } }),
    React.createElement('span', null, label),
  );
};
