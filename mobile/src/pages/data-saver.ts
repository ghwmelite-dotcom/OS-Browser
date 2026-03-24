import { h, render } from '../utils/dom';
import { showToast } from '../components/toast';

// ── Interfaces ──

interface DataPlan {
  sizeGB: number;
  costGHS: number;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
}

interface DailyUsage {
  date: string;
  bytes: number;
}

// ── Constants ──

const PLAN_KEY = 'os_mobile_data_plan';
const USAGE_KEY = 'os_mobile_data_usage';
const HISTORY_KEY = 'os_mobile_data_history';
const SAVER_KEY = 'os_mobile_data_saver';

const GREEN = '#006B3F';
const GOLD = '#D4A017';
const RED = '#CE1126';

const PLAN_SIZES = [1, 2, 5, 10, 20, -1]; // -1 = Unlimited
const PLAN_LABELS = ['1 GB', '2 GB', '5 GB', '10 GB', '20 GB', 'Unlimited'];

// ── Helpers ──

function getPlan(): DataPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePlan(plan: DataPlan): void {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

function getUsageBytes(): number {
  return Number(localStorage.getItem(USAGE_KEY) || '0');
}

function setUsageBytes(b: number): void {
  localStorage.setItem(USAGE_KEY, String(Math.max(0, b)));
}

function getHistory(): DailyUsage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(h: DailyUsage[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, i)).toFixed(i > 1 ? 2 : 0) + ' ' + units[i];
}

function gbToBytes(gb: number): number {
  return gb * 1024 * 1024 * 1024;
}

function usageColor(ratio: number): string {
  if (ratio < 0.5) return GREEN;
  if (ratio < 0.8) return GOLD;
  return RED;
}

// ── Track usage via Performance API ──

let observer: PerformanceObserver | null = null;

function startTracking(): void {
  if (observer) return;
  if (!('PerformanceObserver' in window)) return;

  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const res = entry as PerformanceResourceTiming;
        if (res.transferSize && res.transferSize > 0) {
          const current = getUsageBytes();
          setUsageBytes(current + res.transferSize);

          // Update daily history
          const history = getHistory();
          const today = todayStr();
          const todayEntry = history.find((d) => d.date === today);
          if (todayEntry) {
            todayEntry.bytes += res.transferSize;
          } else {
            history.push({ date: today, bytes: res.transferSize });
          }
          // Keep only last 7 days
          const trimmed = history.slice(-7);
          saveHistory(trimmed);
        }
      }
    });
    observer.observe({ type: 'resource', buffered: false });
  } catch {
    // Silently fail if not supported
  }
}

// ── SVG Progress Ring ──

function createProgressRing(usedGB: number, totalGB: number): HTMLElement {
  const ratio = totalGB > 0 ? Math.min(usedGB / totalGB, 1) : 0;
  const color = usageColor(ratio);

  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  const svgNS = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.style.display = 'block';
  svg.style.margin = '0 auto';

  // Background circle
  const bgCircle = document.createElementNS(svgNS, 'circle');
  bgCircle.setAttribute('cx', String(size / 2));
  bgCircle.setAttribute('cy', String(size / 2));
  bgCircle.setAttribute('r', String(radius));
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', 'rgba(255,255,255,0.08)');
  bgCircle.setAttribute('stroke-width', String(strokeWidth));

  // Progress circle
  const progressCircle = document.createElementNS(svgNS, 'circle');
  progressCircle.setAttribute('cx', String(size / 2));
  progressCircle.setAttribute('cy', String(size / 2));
  progressCircle.setAttribute('r', String(radius));
  progressCircle.setAttribute('fill', 'none');
  progressCircle.setAttribute('stroke', color);
  progressCircle.setAttribute('stroke-width', String(strokeWidth));
  progressCircle.setAttribute('stroke-linecap', 'round');
  progressCircle.setAttribute('stroke-dasharray', String(circumference));
  progressCircle.setAttribute('stroke-dashoffset', String(circumference)); // start empty
  progressCircle.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
  progressCircle.style.transition = 'stroke-dashoffset 1.2s ease-out';

  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);

  // Animate after mount
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progressCircle.setAttribute('stroke-dashoffset', String(dashOffset));
    });
  });

  // Center text overlay
  const usedText = usedGB.toFixed(2) + ' GB';
  const planText = totalGB > 0 ? `of ${totalGB} GB plan` : 'Unlimited plan';

  const wrapper = h('div', {
    style: {
      position: 'relative', width: `${size}px`, height: `${size}px`, margin: '0 auto',
    },
  });

  const svgContainer = h('div', {});
  svgContainer.appendChild(svg);

  const centerLabel = h('div', {
    style: {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    },
  },
    h('div', {
      style: {
        fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 6vw, 30px)',
        fontWeight: '700', color: '#fff',
      },
    }, usedText),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 14px)',
        color: 'rgba(255,255,255,0.5)', marginTop: '4px',
      },
    }, planText),
  );

  wrapper.appendChild(svgContainer);
  wrapper.appendChild(centerLabel);

  return wrapper;
}

// ── Main Render ──

export function renderDataSaverPage(container: HTMLElement): void {
  startTracking();

  const plan = getPlan();
  const usageBytes = getUsageBytes();
  const usedGB = usageBytes / gbToBytes(1);
  const totalGB = plan && plan.sizeGB > 0 ? plan.sizeGB : 0;
  const ratio = totalGB > 0 ? Math.min(usedGB / totalGB, 1) : 0;

  // ── Section helper ──
  function sectionHeader(title: string): HTMLElement {
    return h('div', {
      style: {
        fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 3.2vw, 14px)', fontWeight: '700',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px',
        padding: '24px 16px 8px',
      },
    }, title);
  }

  function card(...children: (string | HTMLElement)[]): HTMLElement {
    return h('div', {
      style: {
        background: 'var(--surface, #141414)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: '16px', padding: '16px', margin: '0 16px 12px',
      },
    }, ...children);
  }

  // ── 1. Progress Ring ──
  const ringSection = h('div', {
    style: { padding: '24px 0 16px', textAlign: 'center' },
  },
    h('div', {
      style: {
        fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 4.8vw, 22px)',
        fontWeight: '700', color: '#fff', marginBottom: '20px',
      },
    }, 'Data Usage'),
    createProgressRing(usedGB, totalGB),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 14px)',
        color: usageColor(ratio), marginTop: '12px', fontWeight: '600',
      },
    }, totalGB > 0 ? `${Math.round(ratio * 100)}% used` : 'Set a plan to track usage'),
  );

  // ── 2. Plan Setup ──
  const currentPlan = plan || { sizeGB: 5, costGHS: 50, period: 'monthly' as const, startDate: todayStr() };
  let selectedSize = currentPlan.sizeGB;
  let selectedCost = currentPlan.costGHS;
  let selectedPeriod = currentPlan.period;

  function planSizeBtn(label: string, value: number): HTMLElement {
    const active = selectedSize === value;
    return h('button', {
      style: {
        padding: '10px 0', border: 'none', borderRadius: '10px',
        background: active ? GREEN : 'rgba(255,255,255,0.06)',
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
        fontFamily: 'var(--font-display)', fontSize: 'clamp(13px, 3.4vw, 15px)', fontWeight: '600',
        cursor: 'pointer', minHeight: '44px', minWidth: '44px',
        transition: 'all 150ms ease',
      },
      onClick: () => {
        selectedSize = value;
        renderDataSaverPage(container);
      },
    }, label);
  }

  function periodBtn(label: string, value: 'daily' | 'weekly' | 'monthly'): HTMLElement {
    const active = selectedPeriod === value;
    return h('button', {
      style: {
        flex: '1', padding: '10px 0', border: 'none', borderRadius: '8px',
        background: active ? GOLD : 'rgba(255,255,255,0.06)',
        color: active ? '#000' : 'rgba(255,255,255,0.6)',
        fontFamily: 'var(--font-display)', fontSize: 'clamp(13px, 3.4vw, 15px)', fontWeight: '600',
        cursor: 'pointer', minHeight: '44px',
        transition: 'all 150ms ease',
      },
      onClick: () => {
        selectedPeriod = value;
        renderDataSaverPage(container);
      },
    }, label);
  }

  const costInput = h('input', {
    type: 'number',
    value: String(selectedCost),
    placeholder: 'Cost in GH₵',
    style: {
      width: '100%', padding: '12px', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px', background: 'rgba(255,255,255,0.04)', color: '#fff',
      fontFamily: 'var(--font-body)', fontSize: 'clamp(15px, 3.8vw, 16px)',
      outline: 'none', boxSizing: 'border-box',
    },
    onInput: (e: Event) => {
      selectedCost = Number((e.target as HTMLInputElement).value) || 0;
    },
  }) as HTMLInputElement;

  const savePlanBtn = h('button', {
    style: {
      width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
      background: GREEN, color: '#fff',
      fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '700',
      cursor: 'pointer', marginTop: '12px', minHeight: '48px',
    },
    onClick: () => {
      savePlan({
        sizeGB: selectedSize,
        costGHS: selectedCost,
        period: selectedPeriod,
        startDate: todayStr(),
      });
      showToast('Data plan saved', 'success');
      renderDataSaverPage(container);
    },
  }, 'Save Plan');

  const planSection = card(
    h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '700', color: '#fff', marginBottom: '12px' } }, 'Your Data Plan'),

    h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' } }, 'Plan size'),
    h('div', {
      style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' },
    }, ...PLAN_SIZES.map((s, i) => planSizeBtn(PLAN_LABELS[i], s))),

    h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' } }, 'Cost (GH₵)'),
    costInput,

    h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)', color: 'rgba(255,255,255,0.4)', margin: '16px 0 8px' } }, 'Billing period'),
    h('div', {
      style: { display: 'flex', gap: '8px' },
    },
      periodBtn('Daily', 'daily'),
      periodBtn('Weekly', 'weekly'),
      periodBtn('Monthly', 'monthly'),
    ),

    savePlanBtn,
  );

  // ── 3. Cost Calculator ──
  let costSection: HTMLElement;
  if (plan && plan.costGHS > 0 && plan.sizeGB > 0) {
    const planBytes = gbToBytes(plan.sizeGB);
    const costPerMB = plan.costGHS / (plan.sizeGB * 1024);
    const costPerGB = plan.costGHS / plan.sizeGB;
    const spentSoFar = (usageBytes / planBytes) * plan.costGHS;
    const remaining = Math.max(0, plan.costGHS - spentSoFar);

    function costRow(label: string, value: string, color: string): HTMLElement {
      return h('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
        },
      },
        h('span', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 15px)', color: 'rgba(255,255,255,0.6)' } }, label),
        h('span', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 16px)', fontWeight: '700', color } }, value),
      );
    }

    costSection = card(
      h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '700', color: '#fff', marginBottom: '8px' } }, 'Cost Breakdown'),
      costRow('Per MB', `GH₵ ${costPerMB.toFixed(3)}`, GOLD),
      costRow('Per GB', `GH₵ ${costPerGB.toFixed(2)}`, GOLD),
      costRow('Spent so far', `GH₵ ${spentSoFar.toFixed(2)}`, usageColor(ratio)),
      h('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0',
        },
      },
        h('span', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 15px)', color: 'rgba(255,255,255,0.6)' } }, 'Remaining'),
        h('span', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 16px)', fontWeight: '700', color: remaining > 0 ? GREEN : RED } }, `GH₵ ${remaining.toFixed(2)}`),
      ),
    );
  } else {
    costSection = card(
      h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 15px)', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px 0' } },
        'Set a data plan above to see cost breakdown'),
    );
  }

  // ── 4. Connection Info ──
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const connType = conn?.effectiveType || conn?.type || 'Unknown';
  const downlink = conn?.downlink ? `${conn.downlink} Mbps` : 'N/A';
  const saveData = conn?.saveData ? 'Enabled' : 'Disabled';
  const isOnline = navigator.onLine;

  function infoRow(label: string, value: string, valueColor?: string): HTMLElement {
    return h('div', {
      style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
      },
    },
      h('span', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 15px)', color: 'rgba(255,255,255,0.6)' } }, label),
      h('span', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(13px, 3.4vw, 15px)', fontWeight: '600', color: valueColor || '#fff' } }, value),
    );
  }

  const connectionSection = card(
    h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '700', color: '#fff', marginBottom: '8px' } }, 'Connection'),
    infoRow('Status', isOnline ? 'Online' : 'Offline', isOnline ? GREEN : RED),
    infoRow('Type', connType.toUpperCase(), GOLD),
    infoRow('Bandwidth', downlink, '#fff'),
    h('div', {
      style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 0',
      },
    },
      h('span', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 15px)', color: 'rgba(255,255,255,0.6)' } }, 'Browser Save-Data'),
      h('span', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(13px, 3.4vw, 15px)', fontWeight: '600', color: saveData === 'Enabled' ? GREEN : 'rgba(255,255,255,0.4)' } }, saveData),
    ),
  );

  // ── 5. Savings Tips ──
  const dataSaverOn = localStorage.getItem(SAVER_KEY) === 'true';

  function tipCard(icon: string, title: string, description: string, toggle?: HTMLElement): HTMLElement {
    return h('div', {
      style: {
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
        marginBottom: '8px',
      },
    },
      h('div', {
        style: {
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'rgba(0,107,63,0.15)', color: GREEN,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: '0',
        },
      }, icon),
      h('div', { style: { flex: '1', minWidth: '0' } },
        h('div', {
          style: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '4px',
          },
        },
          h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 15px)', fontWeight: '700', color: '#fff' } }, title),
          ...(toggle ? [toggle] : []),
        ),
        h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' } }, description),
      ),
    );
  }

  function toggleSwitch(active: boolean, onChange: (val: boolean) => void): HTMLElement {
    let on = active;
    const dot = h('div', {
      style: {
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'transform 200ms ease',
        transform: on ? 'translateX(16px)' : 'translateX(2px)',
      },
    });
    const track = h('div', {
      style: {
        width: '36px', height: '20px', borderRadius: '10px',
        background: on ? GREEN : 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center',
        cursor: 'pointer', transition: 'background 200ms ease',
        flexShrink: '0',
      },
      onClick: (e: Event) => {
        e.stopPropagation();
        on = !on;
        track.style.background = on ? GREEN : 'rgba(255,255,255,0.15)';
        dot.style.transform = on ? 'translateX(16px)' : 'translateX(2px)';
        onChange(on);
      },
    }, dot);
    return track;
  }

  const dataSaverToggle = toggleSwitch(dataSaverOn, (on) => {
    localStorage.setItem(SAVER_KEY, String(on));
    showToast(on ? 'Data Saver enabled — images will load in lower quality' : 'Data Saver disabled', 'info');
  });

  const tipsSection = card(
    h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '700', color: '#fff', marginBottom: '12px' } }, 'Savings Tips'),
    tipCard('📉', 'Enable Data Saver', 'Reduces image quality and disables auto-loading media to save data.', dataSaverToggle),
    tipCard('📄', 'Use Offline Mode', 'Save pages for offline reading when on Wi-Fi to avoid using mobile data later.'),
    tipCard('🔇', 'Disable Auto-play', 'Videos and animations consume large amounts of data. Disable auto-play in settings.'),
    tipCard('📶', 'Use Wi-Fi When Available', 'Connect to Wi-Fi at work or home to preserve your mobile data bundle.'),
  );

  // ── 6. Usage History (Bar Chart) ──
  const history = getHistory();
  const last7: DailyUsage[] = [];

  // Fill 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const existing = history.find((e) => e.date === dateStr);
    last7.push(existing || { date: dateStr, bytes: 0 });
  }

  const maxBytes = Math.max(...last7.map((d) => d.bytes), 1);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const bars = last7.map((day) => {
    const heightPct = Math.max((day.bytes / maxBytes) * 100, 4); // min 4% for visibility
    const dayDate = new Date(day.date + 'T00:00:00');
    const dayLabel = dayLabels[dayDate.getDay()];
    const barRatio = totalGB > 0 ? (day.bytes / gbToBytes(totalGB)) * last7.length : 0;
    const barColor = usageColor(barRatio < 0.5 ? barRatio : barRatio < 0.8 ? 0.6 : 0.9);

    return h('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1', gap: '6px',
      },
    },
      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(255,255,255,0.4)',
        },
      }, day.bytes > 0 ? formatBytes(day.bytes) : ''),
      h('div', {
        style: {
          width: '100%', maxWidth: '28px', height: '120px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        },
      },
        h('div', {
          style: {
            width: '100%', height: `${heightPct}%`, background: barColor,
            borderRadius: '6px 6px 2px 2px', minHeight: '4px',
            transition: 'height 0.6s ease-out',
          },
        }),
      ),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(10px, 2.8vw, 12px)',
          color: 'rgba(255,255,255,0.5)', fontWeight: '600',
        },
      }, dayLabel),
    );
  });

  const historySection = card(
    h('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    },
      h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '700', color: '#fff' } }, 'Last 7 Days'),
      h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 2.8vw, 12px)', color: 'rgba(255,255,255,0.3)' } },
        `Total: ${formatBytes(last7.reduce((s, d) => s + d.bytes, 0))}`),
    ),
    h('div', {
      style: { display: 'flex', gap: '4px', alignItems: 'flex-end' },
    }, ...bars),
  );

  // ── 7. Reset / Actions ──
  const resetBtn = h('button', {
    style: {
      width: 'calc(100% - 32px)', margin: '8px 16px', padding: '14px',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
      background: 'transparent', color: RED,
      fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 15px)', fontWeight: '600',
      cursor: 'pointer', minHeight: '48px',
    },
    onClick: () => {
      if (confirm('Reset all usage data? This is for a new billing cycle.')) {
        setUsageBytes(0);
        saveHistory([]);
        showToast('Usage data reset', 'success');
        renderDataSaverPage(container);
      }
    },
  }, 'Reset Usage (New Billing Cycle)');

  // ── Render ──
  render(container,
    h('div', {
      style: { paddingBottom: '100px', overflowY: 'auto', height: '100%' },
    },
      ringSection,

      sectionHeader('Plan'),
      planSection,

      sectionHeader('Costs'),
      costSection,

      sectionHeader('Network'),
      connectionSection,

      sectionHeader('Save Data'),
      tipsSection,

      sectionHeader('History'),
      historySection,

      resetBtn,
    ),
  );
}
