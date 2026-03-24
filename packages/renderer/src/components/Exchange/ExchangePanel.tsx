import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowUpDown, Eye, EyeOff, X, TrendingUp } from 'lucide-react';
import { useExchangeStore, CURRENCIES, GHS_INFO } from '@/store/exchange';

interface ExchangePanelProps {
  onClose: () => void;
}

/**
 * Full exchange rate sidebar panel.
 * Shows rate cards, full converter, last updated, refresh, and overlay toggle.
 */
export function ExchangePanel({ onClose }: ExchangePanelProps) {
  const {
    rates, lastUpdated, isLoading, error,
    overlayEnabled, fetchRates, toggleOverlay,
    convert, convertFromGhs,
  } = useExchangeStore();

  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('GHS');
  const [reversed, setReversed] = useState(false); // false: foreign->GHS, true: GHS->foreign

  useEffect(() => {
    if (Object.keys(rates).length === 0) fetchRates();
  }, []);

  const hasRates = Object.keys(rates).length > 0;

  const numAmount = parseFloat(amount) || 0;
  let result: number;
  let resultSymbol: string;

  if (!reversed) {
    result = convert(numAmount, fromCurrency);
    resultSymbol = 'GH\u20B5';
  } else {
    result = convertFromGhs(numAmount, toCurrency);
    const c = CURRENCIES.find((c) => c.code === toCurrency);
    resultSymbol = c?.symbol || toCurrency;
  }

  const handleSwap = () => {
    setReversed((r) => !r);
  };

  const allCurrencies = [GHS_INFO, ...CURRENCIES];

  const formattedLastUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface-1)',
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border-1)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} style={{ color: '#D4A017' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-heading)' }}>
            Cedi Exchange
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            padding: 4,
            borderRadius: 6,
            display: 'flex',
          }}
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Error state */}
        {error && !hasRates && (
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: 8,
              fontSize: 12,
              color: '#f87171',
              marginBottom: 16,
            }}
          >
            {error}. Tap refresh to retry.
          </div>
        )}

        {/* ── Rate Cards ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 10,
            }}
          >
            Live Rates
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CURRENCIES.map((c) => {
              const rate = rates[c.code];
              return (
                <div
                  key={c.code}
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-1)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    transition: 'all 150ms ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,160,23,0.3)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(212,160,23,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {c.symbol} {c.code}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: 'ui-monospace, monospace',
                      color: '#D4A017',
                    }}
                  >
                    {rate ? `\u20B5${rate.toFixed(2)}` : '---'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    per 1 {c.code}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Full Converter ──────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 10,
            }}
          >
            Converter
          </div>

          <div
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-1)',
              borderRadius: 12,
              padding: 14,
            }}
          >
            {/* Amount input */}
            <div style={{ marginBottom: 10 }}>
              <label
                style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}
              >
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  background: 'var(--color-surface-3)',
                  border: '1px solid var(--color-border-1)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 16,
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
            </div>

            {/* From currency */}
            <div style={{ marginBottom: 6 }}>
              <label
                style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}
              >
                {reversed ? 'From (GHS)' : 'From'}
              </label>
              {reversed ? (
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border-1)',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  GH\u20B5 Ghana Cedi
                </div>
              ) : (
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border-1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Swap button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
              <button
                onClick={handleSwap}
                style={{
                  background: 'var(--color-surface-3)',
                  border: '1px solid var(--color-border-1)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
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

            {/* To currency */}
            <div style={{ marginBottom: 10 }}>
              <label
                style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}
              >
                {reversed ? 'To' : 'To (GHS)'}
              </label>
              {reversed ? (
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border-1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border-1)',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  GH\u20B5 Ghana Cedi
                </div>
              )}
            </div>

            {/* Result */}
            <div
              style={{
                background: 'rgba(212, 160, 23, 0.08)',
                border: '1px solid rgba(212, 160, 23, 0.2)',
                borderRadius: 10,
                padding: '12px 14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                Result
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace',
                  color: '#D4A017',
                }}
              >
                {resultSymbol}
                {result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Overlay Toggle ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-1)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Price Detection Overlay
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Detect and convert prices on web pages
            </div>
          </div>
          <button
            onClick={toggleOverlay}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              background: overlayEnabled
                ? 'linear-gradient(135deg, #D4A017, #E8B840)'
                : 'var(--color-surface-3)',
              transition: 'background 200ms ease',
              flexShrink: 0,
            }}
            aria-label={overlayEnabled ? 'Disable price overlay' : 'Enable price overlay'}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: overlayEnabled ? 21 : 3,
                transition: 'left 200ms ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>

        {/* ── Last Updated + Refresh ──────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            Updated: {formattedLastUpdated}
          </span>
          <button
            onClick={() => fetchRates()}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: isLoading ? 'wait' : 'pointer',
              color: '#D4A017',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'background 150ms',
              opacity: isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading)
                (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'none';
            }}
          >
            <RefreshCw
              size={12}
              style={{
                animation: isLoading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Spin animation for RefreshCw */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ExchangePanel;
