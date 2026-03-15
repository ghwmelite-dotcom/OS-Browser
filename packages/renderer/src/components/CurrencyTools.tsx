import React, { useState, useCallback } from 'react';
import { X, DollarSign, ArrowUpDown } from 'lucide-react';

// Approximate exchange rates (updated periodically via API in future)
const RATES: Record<string, number> = {
  USD: 15.5, EUR: 16.8, GBP: 19.6, NGN: 0.0098, CNY: 2.13, ZAR: 0.85,
  CAD: 11.2, AUD: 10.1, JPY: 0.103, INR: 0.185,
};

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
];

export function CurrencyTools({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'converter' | 'ssnit'>('converter');
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [direction, setDirection] = useState<'to-ghs' | 'from-ghs'>('to-ghs');

  // SSNIT calculator state
  const [basicSalary, setBasicSalary] = useState('');

  const convert = useCallback(() => {
    const num = parseFloat(amount) || 0;
    const rate = RATES[fromCurrency] || 1;
    if (direction === 'to-ghs') {
      return (num * rate).toFixed(2);
    } else {
      return (num / rate).toFixed(2);
    }
  }, [amount, fromCurrency, direction]);

  // SSNIT calculations
  const ssnitCalc = useCallback(() => {
    const salary = parseFloat(basicSalary) || 0;
    const employeeContrib = salary * 0.055; // 5.5%
    const employerContrib = salary * 0.13;  // 13%
    const totalContrib = employeeContrib + employerContrib; // 18.5%
    const takeHome = salary - employeeContrib;
    return { employeeContrib, employerContrib, totalContrib, takeHome, salary };
  }, [basicSalary]);

  return (
    <div
      className="w-[340px] border-l flex flex-col h-full animate-slide-in-right"
      style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <div className="flex items-center gap-2">
          <DollarSign size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[14px] font-bold text-text-primary">Ghana Tools</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2"
          aria-label="Close Ghana Tools"
        >
          <X size={14} className="text-text-muted" />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b" style={{ borderColor: 'var(--color-border-1)' }}>
        <button
          onClick={() => setTab('converter')}
          className={`flex-1 py-2.5 text-[12px] font-medium text-center transition-colors ${
            tab === 'converter' ? 'border-b-2' : 'text-text-muted hover:text-text-secondary'
          }`}
          style={tab === 'converter' ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : {}}
        >
          💱 Currency Converter
        </button>
        <button
          onClick={() => setTab('ssnit')}
          className={`flex-1 py-2.5 text-[12px] font-medium text-center transition-colors ${
            tab === 'ssnit' ? 'border-b-2' : 'text-text-muted hover:text-text-secondary'
          }`}
          style={tab === 'ssnit' ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : {}}
        >
          🏦 SSNIT Calculator
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'converter' && (
          <div>
            {/* Amount input */}
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-[18px] font-mono font-bold outline-none border mb-4"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />

            {/* Currency selector */}
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
              {direction === 'to-ghs' ? 'From' : 'To'}
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setFromCurrency(c.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border transition-all ${
                    fromCurrency === c.code ? 'font-semibold' : 'hover:bg-surface-2'
                  }`}
                  style={{
                    borderColor: fromCurrency === c.code ? 'var(--color-accent)' : 'var(--color-border-1)',
                    background: fromCurrency === c.code ? 'var(--glass-bg)' : 'transparent',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span>{c.flag}</span>
                  <span>{c.code}</span>
                </button>
              ))}
            </div>

            {/* Direction toggle */}
            <button
              onClick={() => setDirection(d => d === 'to-ghs' ? 'from-ghs' : 'to-ghs')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border mb-4 hover:bg-surface-2 transition-colors"
              style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
            >
              <ArrowUpDown size={14} />
              <span className="text-[12px] font-medium">
                {direction === 'to-ghs' ? `${fromCurrency} → GHS` : `GHS → ${fromCurrency}`}
              </span>
            </button>

            {/* Result */}
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-surface-2)' }}>
              <p className="text-[11px] text-text-muted mb-1">
                {direction === 'to-ghs' ? `${amount} ${fromCurrency} =` : `${amount} GHS =`}
              </p>
              <p className="text-[28px] font-bold" style={{ color: 'var(--color-accent)' }}>
                {direction === 'to-ghs'
                  ? '₵'
                  : CURRENCIES.find(c => c.code === fromCurrency)?.symbol}
                {convert()}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                1 {fromCurrency} = ₵{RATES[fromCurrency]?.toFixed(2)}
              </p>
            </div>

            <p className="text-[10px] text-text-muted text-center mt-3">
              Rates are approximate. Last updated: March 2026
            </p>
          </div>
        )}

        {tab === 'ssnit' && (
          <div>
            <p className="text-[12px] text-text-secondary mb-4">
              Calculate your SSNIT (Social Security) contributions based on basic salary.
            </p>

            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
              Monthly Basic Salary (GHS)
            </label>
            <input
              type="number"
              value={basicSalary}
              onChange={e => setBasicSalary(e.target.value)}
              placeholder="Enter basic salary"
              className="w-full px-3 py-2.5 rounded-lg text-[16px] font-mono outline-none border mb-4"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />

            {basicSalary && parseFloat(basicSalary) > 0 && (
              <div className="space-y-3">
                {[
                  { label: 'Your Contribution (5.5%)', value: ssnitCalc().employeeContrib, color: 'var(--color-accent)' },
                  { label: 'Employer Contribution (13%)', value: ssnitCalc().employerContrib, color: 'var(--color-accent-green)' },
                  { label: 'Total to SSNIT (18.5%)', value: ssnitCalc().totalContrib, color: 'var(--color-text-primary)' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    <span className="text-[12px] text-text-secondary">{item.label}</span>
                    <span className="text-[14px] font-bold font-mono" style={{ color: item.color }}>
                      ₵{item.value.toFixed(2)}
                    </span>
                  </div>
                ))}

                <div
                  className="rounded-xl p-4 text-center mt-2"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}
                >
                  <p className="text-[11px] text-text-muted mb-1">Estimated Take-Home Pay</p>
                  <p className="text-[24px] font-bold" style={{ color: 'var(--color-accent)' }}>
                    ₵{ssnitCalc().takeHome.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">After 5.5% SSNIT deduction</p>
                </div>

                <div className="rounded-lg p-3 mt-2" style={{ background: 'var(--color-surface-2)' }}>
                  <p className="text-[11px] text-text-muted">
                    <strong>Annual contributions:</strong><br />
                    Employee: ₵{(ssnitCalc().employeeContrib * 12).toFixed(2)}<br />
                    Employer: ₵{(ssnitCalc().employerContrib * 12).toFixed(2)}<br />
                    Total: ₵{(ssnitCalc().totalContrib * 12).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
