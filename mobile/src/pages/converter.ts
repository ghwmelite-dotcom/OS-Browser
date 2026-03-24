import { h, render } from '../utils/dom';
import { showToast } from '../components/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rate: number; // per 1 GHS
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FALLBACK_CURRENCIES: Currency[] = [
  { code: 'GHS', name: 'Ghana Cedi',        symbol: 'GH\u20B5', flag: '\uD83C\uDDEC\uD83C\uDDED', rate: 1 },
  { code: 'USD', name: 'US Dollar',          symbol: '$',        flag: '\uD83C\uDDFA\uD83C\uDDF8', rate: 0.065 },
  { code: 'EUR', name: 'Euro',               symbol: '\u20AC',   flag: '\uD83C\uDDEA\uD83C\uDDFA', rate: 0.060 },
  { code: 'GBP', name: 'British Pound',      symbol: '\u00A3',   flag: '\uD83C\uDDEC\uD83C\uDDE7', rate: 0.052 },
  { code: 'NGN', name: 'Nigerian Naira',     symbol: '\u20A6',   flag: '\uD83C\uDDF3\uD83C\uDDEC', rate: 99.0 },
  { code: 'XOF', name: 'CFA Franc',          symbol: 'CFA',     flag: '\uD83C\uDDE8\uD83C\uDDEE', rate: 39.5 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R',        flag: '\uD83C\uDDFF\uD83C\uDDE6', rate: 1.18 },
  { code: 'KES', name: 'Kenyan Shilling',    symbol: 'KSh',     flag: '\uD83C\uDDF0\uD83C\uDDEA', rate: 8.4 },
  { code: 'CNY', name: 'Chinese Yuan',       symbol: '\u00A5',   flag: '\uD83C\uDDE8\uD83C\uDDF3', rate: 0.47 },
  { code: 'JPY', name: 'Japanese Yen',       symbol: '\u00A5',   flag: '\uD83C\uDDEF\uD83C\uDDF5', rate: 9.7 },
  { code: 'INR', name: 'Indian Rupee',       symbol: '\u20B9',   flag: '\uD83C\uDDEE\uD83C\uDDF3', rate: 5.4 },
  { code: 'AED', name: 'UAE Dirham',         symbol: '\u062F.\u0625', flag: '\uD83C\uDDE6\uD83C\uDDEA', rate: 0.24 },
];

const STORAGE_KEY = 'os_mobile_exchange_rates';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currencies = [...FALLBACK_CURRENCIES];
let fromCode = 'GHS';
let toCode = 'USD';
let inputValue = '1';
let isLive = false;
let lastUpdated = '';
let swapRotation = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrency(code: string): Currency {
  return currencies.find(c => c.code === code) || currencies[0];
}

function convert(amount: number, from: string, to: string): number {
  const fromRate = getCurrency(from).rate;
  const toRate = getCurrency(to).rate;
  if (fromRate === 0) return 0;
  // Convert: amount in "from" -> GHS -> "to"
  const inGHS = amount / fromRate;
  return inGHS * toRate;
}

function formatResult(n: number): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return '0.00';
  if (n >= 1_000_000) return n.toLocaleString('en', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  // For very small numbers show more decimals
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.00');
}

// ---------------------------------------------------------------------------
// Rate fetching
// ---------------------------------------------------------------------------

async function fetchRates(): Promise<void> {
  // Try cached first
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.rates && parsed.timestamp) {
        applyRates(parsed.rates);
        isLive = true;
        lastUpdated = parsed.timestamp;
      }
    }
  } catch { /* ignore */ }

  // Try live fetch
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/GHS');
    const data = await res.json();
    if (data && data.rates) {
      applyRates(data.rates);
      isLive = true;
      const now = new Date().toISOString();
      lastUpdated = now;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rates: data.rates, timestamp: now }));
    }
  } catch {
    if (!isLive) {
      lastUpdated = 'Offline fallback';
    }
  }
}

function applyRates(apiRates: Record<string, number>): void {
  for (const c of currencies) {
    if (c.code === 'GHS') { c.rate = 1; continue; }
    if (apiRates[c.code] !== undefined) {
      c.rate = apiRates[c.code];
    }
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderConverterPage(container: HTMLElement): void {
  // Reset state
  currencies = FALLBACK_CURRENCIES.map(c => ({ ...c }));
  inputValue = '1';
  fromCode = 'GHS';
  toCode = 'USD';
  isLive = false;
  lastUpdated = '';
  swapRotation = 0;

  fetchRates().then(() => rebuildPage());
  buildPage(container);
}

function buildPage(container: HTMLElement): void {
  const page = h('div', {
    id: 'converter-root',
    style: {
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 20px 100px',
      paddingTop: 'calc(env(safe-area-inset-top, 20px) + 16px)',
      minHeight: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.35s ease-out',
    },
  });

  // Header
  page.appendChild(h('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(22px, 5.8vw, 28px)',
      fontWeight: '800',
      letterSpacing: '-0.02em',
      marginBottom: '4px',
    },
  }, '\uD83D\uDCB1 Currency Converter'));

  page.appendChild(h('div', {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(13px, 3.4vw, 15px)',
      color: 'var(--text-tertiary)',
      marginBottom: '24px',
    },
  }, 'Ghana Cedi focused \u00B7 Offline ready'));

  // --- Converter card ---
  const card = h('div', {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      position: 'relative',
    },
  });

  // From section
  card.appendChild(buildCurrencyRow('from'));
  // Swap button
  card.appendChild(buildSwapButton());
  // To section
  card.appendChild(buildCurrencyRow('to'));

  page.appendChild(card);

  // Status badge
  page.appendChild(buildStatusBadge());

  // Calculator keypad
  page.appendChild(buildKeypad());

  // Rate cards
  page.appendChild(buildRateCards());

  render(container, page);
}

function rebuildPage(): void {
  const root = document.getElementById('converter-root');
  if (root && root.parentElement) {
    buildPage(root.parentElement);
  }
}

// ---------------------------------------------------------------------------
// Currency row
// ---------------------------------------------------------------------------

function buildCurrencyRow(direction: 'from' | 'to'): HTMLElement {
  const code = direction === 'from' ? fromCode : toCode;
  const cur = getCurrency(code);
  const isFrom = direction === 'from';

  const amount = isFrom
    ? inputValue
    : formatResult(convert(parseFloat(inputValue) || 0, fromCode, toCode));

  const row = h('div', {
    style: {
      marginBottom: direction === 'from' ? '0' : '0',
      marginTop: direction === 'to' ? '0' : '0',
    },
  });

  // Label
  row.appendChild(h('div', {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(11px, 2.8vw, 12px)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--text-tertiary)',
      fontWeight: '700',
      marginBottom: '10px',
    },
  }, isFrom ? 'From' : 'To'));

  const inner = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
  });

  // Currency selector button
  const selectorBtn = h('button', {
    onClick: () => openCurrencySelector(direction),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '10px 14px',
      cursor: 'pointer',
      color: 'inherit',
      flexShrink: '0',
      minWidth: '120px',
      transition: 'background 0.15s ease',
      WebkitTapHighlightColor: 'transparent',
    },
  },
    h('span', { style: { fontSize: '22px' } }, cur.flag),
    h('div', { style: { textAlign: 'left' } },
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(15px, 4vw, 17px)',
          fontWeight: '700',
          lineHeight: '1.2',
        },
      }, cur.code),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(10px, 2.6vw, 11px)',
          color: 'var(--text-tertiary)',
          lineHeight: '1.2',
        },
      }, cur.symbol),
    ),
    h('span', {
      style: {
        marginLeft: 'auto',
        fontSize: '10px',
        color: 'var(--text-tertiary)',
      },
    }, '\u25BC'),
  );

  inner.appendChild(selectorBtn);

  // Amount
  if (isFrom) {
    const input = h('input', {
      type: 'text',
      inputmode: 'decimal',
      value: inputValue,
      onInput: (e: Event) => {
        const target = e.target as HTMLInputElement;
        // Allow only numbers and single decimal
        const cleaned = target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        target.value = cleaned;
        inputValue = cleaned;
        updateResult();
      },
      style: {
        flex: '1',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px 14px',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(22px, 6vw, 28px)',
        fontWeight: '700',
        color: '#fff',
        textAlign: 'right',
        outline: 'none',
        minWidth: '0',
        transition: 'border-color 0.15s ease',
      },
    }) as HTMLInputElement;

    input.addEventListener('focus', () => {
      input.style.borderColor = '#D4A017';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--border)';
    });

    inner.appendChild(input);
  } else {
    inner.appendChild(h('div', {
      id: 'converter-result',
      style: {
        flex: '1',
        background: 'rgba(212, 160, 23, 0.06)',
        border: '1px solid rgba(212, 160, 23, 0.2)',
        borderRadius: '12px',
        padding: '12px 14px',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(22px, 6vw, 28px)',
        fontWeight: '700',
        color: '#D4A017',
        textAlign: 'right',
        minWidth: '0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    }, amount));
  }

  row.appendChild(inner);
  return row;
}

function updateResult(): void {
  const el = document.getElementById('converter-result');
  if (el) {
    const num = parseFloat(inputValue) || 0;
    el.textContent = formatResult(convert(num, fromCode, toCode));
  }
}

// ---------------------------------------------------------------------------
// Swap button
// ---------------------------------------------------------------------------

function buildSwapButton(): HTMLElement {
  const wrapper = h('div', {
    style: {
      display: 'flex',
      justifyContent: 'center',
      margin: '14px 0',
      position: 'relative',
      zIndex: '2',
    },
  });

  const btn = h('button', {
    onClick: () => {
      swapRotation += 180;
      const temp = fromCode;
      fromCode = toCode;
      toCode = temp;
      // Keep the numeric value the same
      rebuildPage();
      try { navigator.vibrate(10); } catch { /* ignore */ }
    },
    style: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #D4A017, #b8860b)',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      color: '#000',
      fontWeight: '800',
      boxShadow: '0 4px 16px rgba(212, 160, 23, 0.35)',
      transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: `rotate(${swapRotation}deg)`,
      WebkitTapHighlightColor: 'transparent',
    },
  }, '\u21C5');

  btn.addEventListener('pointerdown', () => {
    btn.style.transform = `rotate(${swapRotation}deg) scale(0.9)`;
  });
  btn.addEventListener('pointerup', () => {
    btn.style.transform = `rotate(${swapRotation}deg) scale(1)`;
  });

  wrapper.appendChild(btn);
  return wrapper;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function buildStatusBadge(): HTMLElement {
  const live = isLive;
  const badgeColor = live ? '#006B3F' : 'rgba(255,255,255,0.08)';
  const dotColor = live ? '#22c55e' : '#D4A017';
  const label = live ? 'Live rates' : 'Offline rates';
  const ts = lastUpdated
    ? (lastUpdated === 'Offline fallback'
      ? 'Using built-in rates'
      : `Updated ${new Date(lastUpdated).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}`)
    : 'Loading\u2026';

  return h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '20px',
    },
  },
    h('div', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: badgeColor,
        borderRadius: '20px',
        padding: '6px 14px',
        fontSize: 'clamp(11px, 2.8vw, 12px)',
        fontFamily: 'var(--font-body)',
        fontWeight: '600',
      },
    },
      h('span', {
        style: {
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: dotColor,
          display: 'inline-block',
        },
      }),
      label,
    ),
    h('span', {
      style: {
        fontSize: 'clamp(10px, 2.6vw, 11px)',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-body)',
      },
    }, ts),
  );
}

// ---------------------------------------------------------------------------
// Calculator keypad
// ---------------------------------------------------------------------------

function buildKeypad(): HTMLElement {
  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', '\u232B',
  ];

  const grid = h('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      marginBottom: '24px',
    },
  });

  for (const key of keys) {
    const isBackspace = key === '\u232B';
    const btn = h('button', {
      onClick: () => handleKeyPress(key),
      style: {
        height: '48px',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: isBackspace ? 'rgba(206, 17, 38, 0.1)' : 'var(--surface)',
        color: isBackspace ? '#CE1126' : '#fff',
        fontFamily: 'var(--font-display)',
        fontSize: isBackspace ? '20px' : 'clamp(18px, 4.8vw, 22px)',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.1s ease, transform 0.1s ease',
        WebkitTapHighlightColor: 'transparent',
      },
    }, key);

    btn.addEventListener('pointerdown', () => {
      btn.style.transform = 'scale(0.94)';
      btn.style.background = isBackspace ? 'rgba(206, 17, 38, 0.2)' : 'rgba(255,255,255,0.08)';
      try { navigator.vibrate(10); } catch { /* ignore */ }
    });
    btn.addEventListener('pointerup', () => {
      btn.style.transform = 'scale(1)';
      btn.style.background = isBackspace ? 'rgba(206, 17, 38, 0.1)' : 'var(--surface)';
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.background = isBackspace ? 'rgba(206, 17, 38, 0.1)' : 'var(--surface)';
    });

    grid.appendChild(btn);
  }

  // Clear row
  const clearBtn = h('button', {
    onClick: () => {
      inputValue = '0';
      const input = document.querySelector('#converter-root input') as HTMLInputElement | null;
      if (input) input.value = '0';
      updateResult();
      try { navigator.vibrate(10); } catch { /* ignore */ }
    },
    style: {
      width: '100%',
      height: '44px',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      background: 'rgba(255,255,255,0.04)',
      color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(13px, 3.4vw, 14px)',
      fontWeight: '700',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      marginTop: '2px',
      transition: 'background 0.1s ease',
      WebkitTapHighlightColor: 'transparent',
    },
  }, 'Clear');

  const keypadWrapper = h('div', { style: { marginBottom: '0' } });
  keypadWrapper.appendChild(grid);
  keypadWrapper.appendChild(clearBtn);
  return keypadWrapper;
}

function handleKeyPress(key: string): void {
  const input = document.querySelector('#converter-root input') as HTMLInputElement | null;

  if (key === '\u232B') {
    // Backspace
    inputValue = inputValue.length > 1 ? inputValue.slice(0, -1) : '0';
  } else if (key === '.') {
    if (!inputValue.includes('.')) {
      inputValue += '.';
    }
  } else {
    // Digit
    if (inputValue === '0') {
      inputValue = key;
    } else {
      inputValue += key;
    }
  }

  if (input) input.value = inputValue;
  updateResult();
}

// ---------------------------------------------------------------------------
// Rate cards
// ---------------------------------------------------------------------------

function buildRateCards(): HTMLElement {
  const section = h('div', { style: { marginBottom: '20px' } });

  section.appendChild(h('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(12px, 3vw, 13px)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--text-tertiary)',
      fontWeight: '700',
      marginBottom: '12px',
    },
  }, 'Popular Rates'));

  const popularCodes = ['USD', 'EUR', 'GBP', 'NGN', 'XOF', 'ZAR'];
  const grid = h('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '10px',
    },
  });

  for (const code of popularCodes) {
    const cur = getCurrency(code);
    const rateStr = cur.rate >= 1
      ? cur.rate.toFixed(2)
      : cur.rate.toFixed(cur.rate < 0.01 ? 4 : 3);

    const card = h('button', {
      onClick: () => {
        toCode = code;
        fromCode = 'GHS';
        rebuildPage();
        showToast(`Showing GHS \u2192 ${code}`, 'info');
      },
      style: {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '14px',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'inherit',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      },
    },
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        },
      },
        h('span', { style: { fontSize: '18px' } }, cur.flag),
        h('span', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(13px, 3.4vw, 15px)',
            fontWeight: '700',
          },
        }, cur.code),
      ),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3.2vw, 14px)',
          color: '#D4A017',
          fontWeight: '600',
          lineHeight: '1.3',
        },
      }, `1 GH\u20B5 = ${cur.symbol}${rateStr}`),
    );

    card.addEventListener('pointerdown', () => { card.style.transform = 'scale(0.96)'; });
    card.addEventListener('pointerup', () => { card.style.transform = 'scale(1)'; });
    card.addEventListener('pointerleave', () => { card.style.transform = 'scale(1)'; });

    grid.appendChild(card);
  }

  section.appendChild(grid);
  return section;
}

// ---------------------------------------------------------------------------
// Currency selector modal
// ---------------------------------------------------------------------------

function openCurrencySelector(direction: 'from' | 'to'): void {
  const current = direction === 'from' ? fromCode : toCode;

  // Overlay
  const overlay = h('div', {
    onClick: (e: Event) => {
      if (e.target === overlay) closeModal();
    },
    style: {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: '9000',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out',
    },
  });

  const modal = h('div', {
    style: {
      width: '100%',
      maxWidth: '480px',
      maxHeight: '75vh',
      background: '#141414',
      borderRadius: '20px 20px 0 0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transform: 'translateY(100%)',
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  });

  // Handle bar
  modal.appendChild(h('div', {
    style: {
      display: 'flex',
      justifyContent: 'center',
      padding: '12px 0 4px',
    },
  },
    h('div', {
      style: {
        width: '36px',
        height: '4px',
        borderRadius: '2px',
        background: 'rgba(255,255,255,0.15)',
      },
    }),
  ));

  // Title
  modal.appendChild(h('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(17px, 4.5vw, 20px)',
      fontWeight: '700',
      padding: '8px 20px 12px',
    },
  }, `Select ${direction === 'from' ? 'source' : 'target'} currency`));

  // Search
  const searchInput = h('input', {
    type: 'text',
    placeholder: 'Search currencies\u2026',
    onInput: () => filterList(),
    style: {
      margin: '0 20px 12px',
      padding: '12px 16px',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      background: 'rgba(255,255,255,0.04)',
      color: '#fff',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(14px, 3.6vw, 16px)',
      outline: 'none',
    },
  }) as HTMLInputElement;

  searchInput.addEventListener('focus', () => {
    searchInput.style.borderColor = '#D4A017';
  });
  searchInput.addEventListener('blur', () => {
    searchInput.style.borderColor = 'var(--border)';
  });

  modal.appendChild(searchInput);

  // List container
  const listContainer = h('div', {
    id: 'currency-selector-list',
    style: {
      flex: '1',
      overflowY: 'auto',
      padding: '0 20px 20px',
      WebkitOverflowScrolling: 'touch',
    },
  });

  function renderList(filter: string = ''): void {
    listContainer.innerHTML = '';
    const q = filter.toLowerCase();
    const filtered = currencies.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );

    for (const cur of filtered) {
      const isSelected = cur.code === current;
      const item = h('button', {
        onClick: () => {
          if (direction === 'from') {
            fromCode = cur.code;
          } else {
            toCode = cur.code;
          }
          closeModal();
          rebuildPage();
          try { navigator.vibrate(10); } catch { /* ignore */ }
        },
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          width: '100%',
          padding: '14px 16px',
          background: isSelected ? 'rgba(212, 160, 23, 0.08)' : 'transparent',
          border: isSelected ? '1.5px solid #D4A017' : '1px solid transparent',
          borderRadius: '14px',
          cursor: 'pointer',
          color: 'inherit',
          marginBottom: '4px',
          transition: 'background 0.1s ease',
          WebkitTapHighlightColor: 'transparent',
        },
      },
        h('span', { style: { fontSize: '26px', flexShrink: '0' } }, cur.flag),
        h('div', { style: { flex: '1', textAlign: 'left' } },
          h('div', {
            style: {
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(15px, 4vw, 17px)',
              fontWeight: '700',
              lineHeight: '1.3',
            },
          }, `${cur.code} \u00B7 ${cur.symbol}`),
          h('div', {
            style: {
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(12px, 3.2vw, 14px)',
              color: 'var(--text-tertiary)',
              lineHeight: '1.3',
            },
          }, cur.name),
        ),
        isSelected
          ? h('span', {
              style: {
                fontSize: '16px',
                color: '#D4A017',
              },
            }, '\u2713')
          : h('span', {}),
      );

      item.addEventListener('pointerdown', () => {
        item.style.background = 'rgba(255,255,255,0.06)';
      });
      item.addEventListener('pointerup', () => {
        item.style.background = isSelected ? 'rgba(212, 160, 23, 0.08)' : 'transparent';
      });

      listContainer.appendChild(item);
    }

    if (filtered.length === 0) {
      listContainer.appendChild(h('div', {
        style: {
          textAlign: 'center',
          padding: '40px 0',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(13px, 3.4vw, 15px)',
        },
      }, 'No currencies found'));
    }
  }

  function filterList(): void {
    renderList(searchInput.value);
  }

  renderList();
  modal.appendChild(listContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Store reference for cleanup
  (overlay as any).__closeModal = closeModal;

  // Animate in
  requestAnimationFrame(() => {
    modal.style.transform = 'translateY(0)';
    searchInput.focus();
  });

  function closeModal(): void {
    modal.style.transform = 'translateY(100%)';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.25s ease';
    setTimeout(() => overlay.remove(), 300);
  }
}
