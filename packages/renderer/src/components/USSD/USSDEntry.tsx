import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import type { USSDCode } from '@/data/ghana-ussd-codes';
import { CARRIER_COLORS } from '@/data/ghana-ussd-codes';

interface USSDEntryProps {
  entry: USSDCode;
  stripColor: string;
}

/**
 * USSDEntry -- Single USSD code card with copy-to-clipboard functionality.
 *
 * Shows the code in bold monospace gold, a carrier badge pill,
 * description text, and a copy button.
 */
const USSDEntry: React.FC<USSDEntryProps> = ({ entry, stripColor }) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(entry.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = entry.code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, [entry.code]);

  const carrierColor = CARRIER_COLORS[entry.carrier] || CARRIER_COLORS.General;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        background: hovered ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
        transition: 'background 150ms ease, transform 120ms ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        cursor: 'default',
      }}
    >
      {/* Code + carrier + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          {/* USSD Code */}
          <span
            style={{
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
              fontWeight: 700,
              fontSize: 14,
              color: '#D4A017',
              letterSpacing: '0.02em',
            }}
          >
            {entry.code}
          </span>

          {/* Carrier Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 7px',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: '#0f1117',
              background: carrierColor,
              whiteSpace: 'nowrap',
              lineHeight: '16px',
            }}
          >
            {entry.carrier}
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            lineHeight: '16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.description}
        </p>
      </div>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : `Copy ${entry.code}`}
        aria-label={copied ? 'Copied to clipboard' : `Copy ${entry.code} to clipboard`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          minWidth: 32,
          borderRadius: 6,
          border: 'none',
          background: copied ? 'rgba(34, 197, 94, 0.15)' : hovered ? 'var(--color-surface-1)' : 'transparent',
          color: copied ? '#22C55E' : 'var(--color-text-muted)',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          flexShrink: 0,
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
};

export default USSDEntry;
