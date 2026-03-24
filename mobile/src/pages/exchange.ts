import { h, render } from '../utils/dom';
import { navigate } from '../router';

const API_BASE = 'https://os-browser-worker.ghwmelite.workers.dev/api/v1';

interface RateData {
  base: string;
  rates: Record<string, number>;
  timestamp?: number;
}

const DISPLAY_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { code: 'EUR', name: 'Euro', flag: '\uD83C\uDDEA\uD83C\uDDFA' },
  { code: 'GBP', name: 'British Pound', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '\uD83C\uDDF3\uD83C\uDDEC' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '\uD83C\uDDE8\uD83C\uDDE6' },
];

function showToast(message: string): void {
  const existing = document.querySelector('.exchange-toast');
  if (existing) existing.remove();

  const toast = h('div', {
    className: 'exchange-toast',
    style: {
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30,30,46,0.95)',
      color: '#fff',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '999',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.06)',
    },
  }, message);

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

export function renderExchangePage(container: HTMLElement): void {
  let rateData: RateData | null = null;
  let loading = true;
  let selectedCurrency = 'USD';
  let amount = '1';

  const page = h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      padding: '20px',
      paddingTop: 'calc(env(safe-area-inset-top, 20px) + 16px)',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.35s ease-out',
    },
  });

  // ── Header ──
  const header = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px',
    },
  },
    h('button', {
      style: {
        background: 'none',
        border: 'none',
        color: 'var(--text-primary)',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '8px',
        minWidth: '44px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
      },
      onClick: () => navigate('/'),
    }, '\u2190'),
    h('div', { style: { flex: '1' } },
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(20px, 5vw, 24px)',
          fontWeight: '700',
          letterSpacing: '-0.01em',
        },
      }, 'Exchange Rates'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3vw, 13px)',
          color: 'var(--text-tertiary)',
        },
      }, 'Ghana Cedi (GHS)'),
    ),
    h('button', {
      style: {
        background: 'rgba(212,160,23,0.1)',
        border: '1px solid rgba(212,160,23,0.2)',
        color: '#D4A017',
        borderRadius: '12px',
        padding: '8px 12px',
        fontSize: '14px',
        cursor: 'pointer',
        minWidth: '44px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      onClick: () => fetchRates(),
    }, '\u21BB'),
  );

  // ── Loading / Error states ──
  const statusEl = h('div', {
    style: {
      textAlign: 'center',
      padding: '32px',
      color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
    },
  }, 'Loading rates...');

  // ── Rate Cards Container ──
  const cardsContainer = h('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginBottom: '20px',
    },
  });

  // ── Converter Section ──
  const converterSection = h('div', {
    style: {
      background: 'var(--surface)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid var(--border)',
      marginBottom: '16px',
    },
  });

  // ── Last Updated ──
  const lastUpdated = h('div', {
    style: {
      textAlign: 'center',
      fontSize: 'clamp(10px, 2.6vw, 11px)',
      color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-body)',
      marginTop: '8px',
    },
  });

  function renderRateCards() {
    cardsContainer.innerHTML = '';

    if (!rateData?.rates) return;

    for (const curr of DISPLAY_CURRENCIES) {
      const ghsRate = rateData.rates[curr.code];
      if (!ghsRate) continue;

      // ghsRate = how much GHS per 1 unit of base. We display "1 USD = X GHS".
      const rateStr = ghsRate.toFixed(2);

      const card = h('div', {
        style: {
          background: 'var(--surface)',
          borderRadius: '14px',
          padding: '14px',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          transition: 'transform 0.12s ease, border-color 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
        },
        onClick: () => {
          selectedCurrency = curr.code;
          renderConverter();
          renderRateCards();
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
          h('span', { style: { fontSize: '20px' } }, curr.flag),
          h('span', {
            style: {
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(13px, 3.2vw, 14px)',
              fontWeight: '700',
            },
          }, curr.code),
        ),
        h('div', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(18px, 4.6vw, 22px)',
            fontWeight: '800',
            color: '#D4A017',
            lineHeight: '1.2',
          },
        }, `\u20B5${rateStr}`),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(10px, 2.6vw, 11px)',
            color: 'var(--text-tertiary)',
            marginTop: '4px',
          },
        }, `1 ${curr.code}`),
      );

      if (selectedCurrency === curr.code) {
        card.style.borderColor = 'rgba(212,160,23,0.4)';
        card.style.background = 'rgba(212,160,23,0.04)';
      }

      card.addEventListener('pointerdown', () => { card.style.transform = 'scale(0.97)'; });
      card.addEventListener('pointerup', () => { card.style.transform = 'scale(1)'; });
      card.addEventListener('pointerleave', () => { card.style.transform = 'scale(1)'; });

      cardsContainer.appendChild(card);
    }
  }

  function renderConverter() {
    converterSection.innerHTML = '';

    if (!rateData?.rates) return;

    const ghsRate = rateData.rates[selectedCurrency] || 1;
    const curr = DISPLAY_CURRENCIES.find(c => c.code === selectedCurrency);

    // Title
    converterSection.appendChild(
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        },
      },
        h('span', { style: { fontSize: '16px' } }, '\uD83D\uDCB1'),
        h('span', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(13px, 3.2vw, 14px)',
            fontWeight: '700',
            color: '#D4A017',
          },
        }, 'Currency Converter'),
      ),
    );

    // Amount input
    const amtInput = h('input', {
      type: 'text',
      inputMode: 'decimal',
      value: amount,
      style: {
        width: '100%',
        boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 16px',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(18px, 4.6vw, 22px)',
        fontWeight: '700',
        color: 'var(--text-primary)',
        outline: 'none',
        textAlign: 'center',
        marginBottom: '12px',
        transition: 'border-color 0.2s ease',
      },
    }) as HTMLInputElement;

    amtInput.addEventListener('focus', () => { amtInput.style.borderColor = 'var(--gold)'; });
    amtInput.addEventListener('blur', () => { amtInput.style.borderColor = 'var(--border)'; });
    amtInput.addEventListener('input', () => {
      const v = amtInput.value.replace(/[^0-9.]/g, '');
      amtInput.value = v;
      amount = v;
      updateResult();
    });

    // Currency selector row
    const selectorRow = h('div', {
      style: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        marginBottom: '16px',
        justifyContent: 'center',
      },
    });

    for (const c of DISPLAY_CURRENCIES) {
      const isActive = c.code === selectedCurrency;
      const btn = h('button', {
        style: {
          padding: '6px 12px',
          borderRadius: '20px',
          border: isActive ? '1.5px solid #D4A017' : '1px solid var(--border)',
          background: isActive ? 'rgba(212,160,23,0.12)' : 'var(--surface)',
          color: isActive ? '#D4A017' : 'var(--text-secondary)',
          fontSize: 'clamp(11px, 2.8vw, 12px)',
          fontWeight: '700',
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
        },
        onClick: () => {
          selectedCurrency = c.code;
          renderConverter();
          renderRateCards();
        },
      }, `${c.flag} ${c.code}`);
      selectorRow.appendChild(btn);
    }

    // Arrow
    const arrow = h('div', {
      style: {
        textAlign: 'center',
        fontSize: '20px',
        margin: '4px 0',
        color: 'var(--text-tertiary)',
      },
    }, '\u2193');

    // Result display
    const resultEl = h('div', {
      style: {
        textAlign: 'center',
        padding: '16px',
        background: 'rgba(212,160,23,0.06)',
        borderRadius: '14px',
        border: '1px solid rgba(212,160,23,0.15)',
      },
    });

    function updateResult() {
      const val = parseFloat(amount) || 0;
      const ghsResult = (val * ghsRate).toFixed(2);

      resultEl.innerHTML = '';
      resultEl.appendChild(
        h('div', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 6vw, 30px)',
            fontWeight: '800',
            color: '#D4A017',
            lineHeight: '1.2',
          },
        }, `GH\u20B5 ${ghsResult}`),
      );
      resultEl.appendChild(
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(11px, 2.8vw, 12px)',
            color: 'var(--text-tertiary)',
            marginTop: '4px',
          },
        }, `${val || 0} ${selectedCurrency} = ${ghsResult} GHS`),
      );
    }

    converterSection.appendChild(
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '8px',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          fontWeight: '600',
        },
      },
        h('span', {}, curr?.flag || ''),
        h('span', {}, selectedCurrency),
      ),
    );
    converterSection.appendChild(amtInput);
    converterSection.appendChild(selectorRow);
    converterSection.appendChild(arrow);
    converterSection.appendChild(resultEl);

    updateResult();
  }

  async function fetchRates() {
    loading = true;
    statusEl.textContent = 'Loading rates...';
    statusEl.style.display = 'block';
    cardsContainer.innerHTML = '';
    converterSection.innerHTML = '';
    lastUpdated.textContent = '';

    try {
      const res = await fetch(`${API_BASE}/exchange/rates`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      rateData = await res.json();
      loading = false;
      statusEl.style.display = 'none';

      renderRateCards();
      renderConverter();

      // Last updated
      const ts = rateData?.timestamp || Date.now();
      const d = new Date(ts);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      let hr = d.getHours();
      const mn = d.getMinutes().toString().padStart(2, '0');
      const ampm = hr >= 12 ? 'PM' : 'AM';
      hr = hr % 12 || 12;
      lastUpdated.textContent = `Last updated: ${d.getDate()} ${months[d.getMonth()]}, ${hr}:${mn} ${ampm}`;
    } catch (err) {
      loading = false;
      statusEl.textContent = 'Failed to load rates. Tap refresh to retry.';
      statusEl.style.color = '#CE1126';
    }
  }

  // ── Assemble ──
  page.appendChild(header);
  page.appendChild(statusEl);
  page.appendChild(cardsContainer);
  page.appendChild(converterSection);
  page.appendChild(lastUpdated);

  render(container, page);
  fetchRates();
}
