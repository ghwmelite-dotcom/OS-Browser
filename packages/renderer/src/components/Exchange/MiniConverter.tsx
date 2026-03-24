import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUpDown, X } from 'lucide-react';
import { useExchangeStore, CURRENCIES, GHS_INFO } from '@/store/exchange';

/**
 * MiniConverter — small floating panel anchored above the status bar.
 * Shows an amount input, currency selector, and real-time GHS conversion.
 */
export function MiniConverter() {
  const { rates, miniConverterOpen, miniConverterCurrency, closeMiniConverter, convert, convertFromGhs } = useExchangeStore();
  const [amount, setAmount] = useState('1');
  const [selectedCurrency, setSelectedCurrency] = useState(miniConverterCurrency);
  const [reversed, setReversed] = useState(false); // false = foreign->GHS, true = GHS->foreign
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync currency when mini converter opens with a specific currency
  useEffect(() => {
    if (miniConverterOpen) {
      setSelectedCurrency(miniConverterCurrency);
      setAmount('1');
      setReversed(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [miniConverterOpen, miniConverterCurrency]);

  // Close on click outside
  useEffect(() => {
    if (!miniConverterOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeMiniConverter();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [miniConverterOpen, closeMiniConverter]);

  // Close on Escape
  useEffect(() => {
    if (!miniConverterOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMiniConverter();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [miniConverterOpen, closeMiniConverter]);

  const handleSwap = useCallback(() => {
    setReversed((r) => !r);
  }, []);

  if (!miniConverterOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const rate = rates[selectedCurrency] || 0;

  let fromLabel: string;
  let toLabel: string;
  let result: number;
  let resultSymbol: string;
  let rateDisplay: string;

  if (!reversed) {
    // Foreign -> GHS
    fromLabel = selectedCurrency;
    toLabel = 'GHS';
    result = convert(numAmount, selectedCurrency);
    resultSymbol = 'GH\u20B5';
    rateDisplay = `1 ${selectedCurrency} = \u20B5${rate.toFixed(2)}`;
  } else {
    // GHS -> Foreign
    fromLabel = 'GHS';
    toLabel = selectedCurrency;
    result = convertFromGhs(numAmount, selectedCurrency);
    const currInfo = CURRENCIES.find((c) => c.code === selectedCurrency);
    resultSymbol = currInfo?.symbol || selectedCurrency;
    rateDisplay = rate > 0 ? `1 ${selectedCurrency} = \u20B5${rate.toFixed(2)}` : '';
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: 36,
        right: 16,
        width: 280,
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 9999,
        overflow: 'hidden',
        animation: 'fadeUp 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--color-border-1)',
          background: 'rgba(212, 160, 23, 0.06)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#D4A017' }}>
          Quick Convert
        </span>
        <button
          onClick={closeMiniConverter}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            padding: 2,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Close converter"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {/* From row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              flex: 1,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-1)',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 14,
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--color-text-primary)',
              outline: 'none',
              transition: 'border-color 150ms',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#D4A017';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-1)';
            }}
          />
          {reversed ? (
            <span
              style={{
                minWidth: 44,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                padding: '8px 6px',
                background: 'var(--color-surface-2)',
                borderRadius: 8,
                border: '1px solid var(--color-border-1)',
              }}
            >
              GH\u20B5
            </span>
          ) : (
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              style={{
                minWidth: 64,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-1)',
                borderRadius: 8,
                padding: '8px 6px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Swap button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
          <button
            onClick={handleSwap}
            style={{
              background: 'var(--color-surface-3)',
              border: '1px solid var(--color-border-1)',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#D4A017',
              transition: 'all 150ms',
            }}
            title="Swap direction"
            aria-label="Swap conversion direction"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)';
            }}
          >
            <ArrowUpDown size={14} />
          </button>
        </div>

        {/* Result row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(212, 160, 23, 0.08)',
            border: '1px solid rgba(212, 160, 23, 0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            marginTop: 4,
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 18,
              fontWeight: 700,
              fontFamily: 'ui-monospace, monospace',
              color: '#D4A017',
            }}
          >
            {resultSymbol}{result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {reversed ? (
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              style={{
                minWidth: 64,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-1)',
                borderRadius: 8,
                padding: '8px 6px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
          ) : (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
              }}
            >
              GH\u20B5
            </span>
          )}
        </div>

        {/* Rate info */}
        {rateDisplay && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: 'var(--color-text-muted)',
              marginTop: 8,
            }}
          >
            {rateDisplay}
          </div>
        )}
      </div>
    </div>
  );
}

export default MiniConverter;
