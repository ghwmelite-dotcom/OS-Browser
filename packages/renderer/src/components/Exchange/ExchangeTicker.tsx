import React, { useEffect, useRef } from 'react';
import { useExchangeStore } from '@/store/exchange';

const TICKER_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '\u20AC', GBP: '\u00A3', CNY: '\u00A5', NGN: '\u20A6', CAD: 'C$',
};

/** Refresh interval: 30 minutes */
const REFRESH_MS = 30 * 60 * 1000;

/**
 * Compact exchange rate ticker for the KenteStatusBar.
 * Displays: USD \u20B516.50 | EUR \u20B517.82 | GBP \u20B520.94
 * Clicking a rate opens the mini converter for that currency.
 */
export const ExchangeTicker: React.FC = () => {
  const { rates, isLoading, fetchRates, openMiniConverter } = useExchangeStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch on mount + every 30 minutes
  useEffect(() => {
    // Only fetch if we don't have rates yet or they're stale
    if (Object.keys(rates).length === 0) {
      fetchRates();
    }

    intervalRef.current = setInterval(fetchRates, REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const hasRates = Object.keys(rates).length > 0;

  if (isLoading && !hasRates) {
    return (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: 'var(--color-text-muted)',
          fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
          whiteSpace: 'nowrap',
        }}
      >
        Loading rates...
      </span>
    );
  }

  if (!hasRates) return null;

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        fontSize: 11,
        fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
        whiteSpace: 'nowrap',
      }}
    >
      {TICKER_CURRENCIES.map((code, i) => {
        const rate = rates[code];
        if (!rate) return null;
        return (
          <React.Fragment key={code}>
            {i > 0 && (
              <span style={{ color: 'var(--color-text-muted)', margin: '0 2px' }}>|</span>
            )}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                openMiniConverter(code);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  openMiniConverter(code);
                }
              }}
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '0 2px',
                borderRadius: 3,
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(212, 160, 23, 0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
              title={`1 ${code} = \u20B5${rate.toFixed(2)} — Click to convert`}
            >
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {CURRENCY_SYMBOLS[code] || code}
              </span>
              <span style={{ color: '#D4A017', fontWeight: 600 }}>
                \u20B5{rate.toFixed(2)}
              </span>
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
};

export default ExchangeTicker;
