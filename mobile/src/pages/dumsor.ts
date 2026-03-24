import { h, render } from '../utils/dom';
import { showToast } from '../components/toast';

// ── Types ──

interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

interface OutageEvent {
  type: 'offline' | 'online' | 'battery_low' | 'charging_start' | 'charging_stop';
  timestamp: string;
  batteryLevel: number;
}

interface DumsorScheduleEntry {
  day: string;
  startTime: string;
  endTime: string;
}

interface DumsorState {
  currentPage: string;
  timestamp: string;
  formData?: Record<string, string>;
}

// ── Constants ──

const LS_POWER_SAVER = 'os_mobile_power_saver';
const LS_DUMSOR_STATE = 'os_mobile_dumsor_state';
const LS_OUTAGE_LOG = 'os_mobile_outage_log';
const LS_DUMSOR_SCHEDULE = 'os_mobile_dumsor_schedule';

const COLOR_GREEN = '#006B3F';
const COLOR_GOLD = '#D4A017';
const COLOR_RED = '#CE1126';

const EMERGENCY_CONTACTS = [
  { name: 'ECG Hotline', number: '0302-611-611', desc: 'Electricity Company of Ghana' },
  { name: 'GRIDCo Emergency', number: '0302-676-727', desc: 'Grid Company of Ghana' },
  { name: 'Fire Service', number: '192', desc: 'Ghana National Fire Service' },
];

const POWER_TIPS = [
  { icon: '\u{1F50C}', tip: 'Charge devices during off-peak hours' },
  { icon: '\u{1F319}', tip: 'Use dark mode to extend battery' },
  { icon: '\u{1F4E5}', tip: 'Download content for offline use' },
  { icon: '\u{1F5D1}', tip: 'Close background tabs to save power' },
  { icon: '\u{1F50B}', tip: 'Enable power saver mode below 30%' },
  { icon: '\u{23F0}', tip: 'Set charging reminders before peak hours' },
  { icon: '\u{1F4F1}', tip: 'Lower screen brightness to save energy' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Helpers ──

function getOutageLog(): OutageEvent[] {
  try {
    return JSON.parse(localStorage.getItem(LS_OUTAGE_LOG) || '[]');
  } catch { return []; }
}

function addOutageEvent(event: Omit<OutageEvent, 'timestamp'>): void {
  const log = getOutageLog();
  log.unshift({ ...event, timestamp: new Date().toISOString() });
  // Keep last 50 events
  if (log.length > 50) log.length = 50;
  localStorage.setItem(LS_OUTAGE_LOG, JSON.stringify(log));
}

function getSchedule(): DumsorScheduleEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_DUMSOR_SCHEDULE) || '[]');
  } catch { return []; }
}

function saveSchedule(entries: DumsorScheduleEntry[]): void {
  localStorage.setItem(LS_DUMSOR_SCHEDULE, JSON.stringify(entries));
}

function isPowerSaverOn(): boolean {
  return localStorage.getItem(LS_POWER_SAVER) === 'true';
}

function setPowerSaver(on: boolean): void {
  localStorage.setItem(LS_POWER_SAVER, String(on));
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-GH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getBatteryColor(level: number): string {
  if (level > 0.5) return COLOR_GREEN;
  if (level > 0.2) return COLOR_GOLD;
  return COLOR_RED;
}

function eventTypeLabel(type: OutageEvent['type']): { label: string; icon: string; color: string } {
  switch (type) {
    case 'offline': return { label: 'Went Offline', icon: '\u{1F534}', color: COLOR_RED };
    case 'online': return { label: 'Back Online', icon: '\u{1F7E2}', color: COLOR_GREEN };
    case 'battery_low': return { label: 'Battery Low', icon: '\u{1F50B}', color: COLOR_RED };
    case 'charging_start': return { label: 'Charging Started', icon: '\u26A1', color: COLOR_GREEN };
    case 'charging_stop': return { label: 'Charging Stopped', icon: '\u{1F50C}', color: COLOR_GOLD };
  }
}

// ── Section Header Helper ──

function sectionHeader(title: string, icon: string): HTMLElement {
  return h('div', {
    style: {
      display: 'flex', alignItems: 'center', gap: '8px',
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(12px, 3vw, 13px)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--text-tertiary)',
      fontWeight: '700',
      margin: '24px 0 12px',
    },
  }, icon, title);
}

// ── Toggle Switch Helper ──

function toggleSwitch(active: boolean, onChange: (val: boolean) => void): HTMLElement {
  let on = active;
  const dot = h('div', {
    style: {
      width: '18px', height: '18px', borderRadius: '50%',
      background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      transition: 'transform 200ms ease',
      transform: on ? 'translateX(18px)' : 'translateX(2px)',
    },
  });
  const track = h('div', {
    style: {
      width: '40px', height: '22px', borderRadius: '11px',
      background: on ? COLOR_GOLD : 'rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center',
      cursor: 'pointer', transition: 'background 200ms ease',
      flexShrink: '0',
    },
    onClick: () => {
      on = !on;
      track.style.background = on ? COLOR_GOLD : 'rgba(255,255,255,0.15)';
      dot.style.transform = on ? 'translateX(18px)' : 'translateX(2px)';
      onChange(on);
    },
  }, dot);
  return track;
}

// ── Build Battery Icon (CSS only) ──

function buildBatteryIcon(level: number, charging: boolean): HTMLElement {
  const color = getBatteryColor(level);
  const pct = Math.round(level * 100);

  const fillBar = h('div', {
    style: {
      position: 'absolute', bottom: '0', left: '0', right: '0',
      height: `${pct}%`,
      background: `linear-gradient(180deg, ${color}, ${color}cc)`,
      borderRadius: '6px',
      transition: 'height 600ms ease, background 400ms ease',
    },
  });

  const batteryBody = h('div', {
    style: {
      width: '80px', height: '120px',
      border: `3px solid ${color}`,
      borderRadius: '10px',
      position: 'relative',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)',
    },
  }, fillBar);

  // Battery cap (top nub)
  const batteryCap = h('div', {
    style: {
      width: '30px', height: '8px',
      background: color,
      borderRadius: '4px 4px 0 0',
      margin: '0 auto 4px',
      transition: 'background 400ms ease',
    },
  });

  // Charging bolt overlay
  const chargingBolt = charging
    ? h('div', {
        style: {
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '36px',
          filter: 'drop-shadow(0 0 8px rgba(212,160,23,0.6))',
          zIndex: '2',
          animation: 'pulse 1.5s ease-in-out infinite',
        },
      }, '\u26A1')
    : h('span', {});

  return h('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      position: 'relative',
    },
  }, batteryCap, h('div', { style: { position: 'relative' } }, batteryBody, chargingBolt));
}

// ── Build Sections ──

function buildBatteryHero(battery: BatteryManager | null): HTMLElement {
  const level = battery ? battery.level : 0;
  const charging = battery ? battery.charging : false;
  const pct = Math.round(level * 100);
  const color = getBatteryColor(level);

  const timeRemaining = charging
    ? (battery && isFinite(battery.chargingTime) && battery.chargingTime > 0 ? `Full in ${formatTime(battery.chargingTime)}` : 'Calculating...')
    : (battery && isFinite(battery.dischargingTime) && battery.dischargingTime > 0 ? `${formatTime(battery.dischargingTime)} remaining` : 'Estimating...');

  const statusText = charging ? 'Charging' : (pct <= 20 ? 'Low Battery' : 'On Battery');

  return h('div', {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
    },
  },
    buildBatteryIcon(level, charging),
    h('div', { style: { flex: '1', minWidth: '0' } },
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(40px, 10vw, 52px)',
          fontWeight: '800',
          color: color,
          lineHeight: '1',
          letterSpacing: '-0.02em',
        },
      }, `${pct}%`),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(14px, 3.6vw, 16px)',
          color: charging ? COLOR_GREEN : 'var(--text-tertiary)',
          marginTop: '4px',
          display: 'flex', alignItems: 'center', gap: '6px',
        },
      },
        charging ? '\u26A1 ' : '',
        statusText,
      ),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3.2vw, 14px)',
          color: 'var(--text-tertiary)',
          marginTop: '2px',
        },
      }, timeRemaining),
    ),
  );
}

function buildPowerSaverSection(onToggle: (val: boolean) => void): HTMLElement {
  const on = isPowerSaverOn();
  return h('div', {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
  },
    h('div', {},
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(15px, 3.8vw, 17px)',
          fontWeight: '700',
        },
      }, '\u26A1 Power Saver Mode'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3vw, 13px)',
          color: 'var(--text-tertiary)',
          marginTop: '2px',
        },
      }, on ? 'Active \u2014 reducing power usage' : 'Off \u2014 tap to conserve battery'),
    ),
    toggleSwitch(on, onToggle),
  );
}

function buildRecoveryBanner(onRestore: () => void, onDismiss: () => void): HTMLElement {
  let state: DumsorState | null = null;
  try {
    const raw = localStorage.getItem(LS_DUMSOR_STATE);
    if (raw) state = JSON.parse(raw);
  } catch { /* ignore */ }

  if (!state) return h('span', {});

  const age = Date.now() - new Date(state.timestamp).getTime();
  // Only show if state is less than 1 hour old
  if (age > 3600000) {
    localStorage.removeItem(LS_DUMSOR_STATE);
    return h('span', {});
  }

  return h('div', {
    style: {
      background: `linear-gradient(135deg, ${COLOR_GOLD}22, ${COLOR_GOLD}11)`,
      border: `1px solid ${COLOR_GOLD}44`,
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: '12px',
      marginBottom: '16px',
    },
  },
    h('div', {
      style: { fontSize: '24px', flexShrink: '0' },
    }, '\u{1F504}'),
    h('div', { style: { flex: '1', minWidth: '0' } },
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(14px, 3.6vw, 15px)',
          fontWeight: '700', color: COLOR_GOLD,
        },
      }, 'Recovery Available'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3vw, 13px)',
          color: 'var(--text-tertiary)', marginTop: '2px',
        },
      }, `Saved state from ${formatTimestamp(state.timestamp)}`),
    ),
    h('div', { style: { display: 'flex', gap: '8px', flexShrink: '0' } },
      h('button', {
        onClick: onRestore,
        style: {
          background: COLOR_GOLD, color: '#fff', border: 'none',
          borderRadius: '8px', padding: '8px 14px',
          fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: '700',
          cursor: 'pointer', minHeight: '44px',
        },
      }, 'Restore'),
      h('button', {
        onClick: onDismiss,
        style: {
          background: 'rgba(255,255,255,0.08)', color: 'var(--text-tertiary)', border: 'none',
          borderRadius: '8px', padding: '8px 12px',
          fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: '700',
          cursor: 'pointer', minHeight: '44px',
        },
      }, '\u2715'),
    ),
  );
}

function buildOutageLog(): HTMLElement {
  const events = getOutageLog().slice(0, 20);

  if (events.length === 0) {
    return h('div', {
      style: {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
      },
    },
      h('div', { style: { fontSize: '28px', marginBottom: '8px' } }, '\u{1F4CA}'),
      h('div', {
        style: {
          fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 15px)',
          fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px',
        },
      }, 'No events recorded'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)',
          color: 'var(--text-tertiary)',
        },
      }, 'Power events will appear here automatically'),
    );
  }

  const timeline = h('div', {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
    },
  });

  events.forEach((event, i) => {
    const info = eventTypeLabel(event.type);
    const row = h('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px',
        borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none',
      },
    },
      // Timeline dot
      h('div', {
        style: {
          width: '10px', height: '10px', borderRadius: '50%',
          background: info.color, flexShrink: '0',
          boxShadow: `0 0 6px ${info.color}66`,
        },
      }),
      h('div', { style: { flex: '1', minWidth: '0' } },
        h('div', {
          style: {
            fontFamily: 'var(--font-display)', fontSize: 'clamp(13px, 3.4vw, 14px)',
            fontWeight: '600',
          },
        }, `${info.icon} ${info.label}`),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 2.8vw, 12px)',
            color: 'var(--text-tertiary)', marginTop: '1px',
          },
        }, formatTimestamp(event.timestamp)),
      ),
      h('div', {
        style: {
          fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 3vw, 13px)',
          fontWeight: '700', color: getBatteryColor(event.batteryLevel / 100),
          flexShrink: '0',
        },
      }, `${event.batteryLevel}%`),
    );
    timeline.appendChild(row);
  });

  return timeline;
}

function buildEmergencyContacts(): HTMLElement {
  const grid = h('div', {
    style: { display: 'flex', flexDirection: 'column', gap: '10px' },
  });

  for (const contact of EMERGENCY_CONTACTS) {
    const card = h('div', {
      style: {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex', alignItems: 'center', gap: '14px',
      },
    },
      h('div', {
        style: {
          width: '44px', height: '44px', borderRadius: '12px',
          background: `${COLOR_RED}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: '0',
        },
      }, '\u{1F4DE}'),
      h('div', { style: { flex: '1', minWidth: '0' } },
        h('div', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(14px, 3.6vw, 15px)',
            fontWeight: '700',
          },
        }, contact.name),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(12px, 3vw, 13px)',
            color: 'var(--text-tertiary)', marginTop: '1px',
          },
        }, contact.desc),
      ),
      // Call button
      h('a', {
        href: `tel:${contact.number.replace(/-/g, '')}`,
        style: {
          width: '44px', height: '44px', borderRadius: '12px',
          background: COLOR_GREEN,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', textDecoration: 'none', flexShrink: '0',
        },
      }, '\u{1F4DE}'),
      // Copy button
      h('button', {
        onClick: () => {
          navigator.clipboard.writeText(contact.number).then(() => {
            showToast('Number copied', 'success');
          }).catch(() => {
            showToast('Failed to copy', 'error');
          });
        },
        style: {
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', cursor: 'pointer', flexShrink: '0',
          color: 'var(--text-tertiary)',
        },
      }, '\u{1F4CB}'),
    );
    grid.appendChild(card);
  }

  return grid;
}

function buildScheduleSection(onUpdate: () => void): HTMLElement {
  const schedule = getSchedule();

  const wrapper = h('div', {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
    },
  });

  // ECG link
  wrapper.appendChild(
    h('a', {
      href: 'https://www.ecg.com.gh',
      target: '_blank',
      rel: 'noopener noreferrer',
      style: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        textDecoration: 'none', color: 'inherit',
        minHeight: '44px',
      },
    },
      h('div', {
        style: { fontSize: '18px', flexShrink: '0' },
      }, '\u{1F310}'),
      h('div', { style: { flex: '1' } },
        h('div', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(13px, 3.4vw, 14px)',
            fontWeight: '700',
          },
        }, 'Check ECG Schedule'),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(11px, 2.8vw, 12px)',
            color: 'var(--text-tertiary)',
          },
        }, 'View load shedding timetable on ecg.com.gh'),
      ),
      h('span', {
        style: { color: COLOR_GOLD, fontSize: '18px' },
      }, '\u2192'),
    ),
  );

  // Day/time grid for manual entries
  if (schedule.length > 0) {
    for (const entry of schedule) {
      wrapper.appendChild(
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
          },
        },
          h('span', {
            style: {
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(13px, 3.4vw, 14px)',
              fontWeight: '600',
            },
          }, entry.day),
          h('span', {
            style: {
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(12px, 3vw, 13px)',
              color: COLOR_RED,
              fontWeight: '600',
            },
          }, `${entry.startTime} - ${entry.endTime}`),
        ),
      );
    }
  }

  // Add entry form
  let selectedDay = DAYS[0];
  let startTime = '06:00';
  let endTime = '18:00';

  const daySelect = h('select', {
    style: {
      flex: '1', padding: '10px 8px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.06)', color: '#fff',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-body)', fontSize: '13px',
      minHeight: '44px',
    },
    onChange: (e: Event) => { selectedDay = (e.target as HTMLSelectElement).value; },
  });
  for (const day of DAYS) {
    daySelect.appendChild(h('option', { value: day, style: { background: '#141414', color: '#fff' } }, day));
  }

  const startInput = h('input', {
    type: 'time', value: startTime,
    style: {
      width: '80px', padding: '10px 6px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.06)', color: '#fff',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-body)', fontSize: '13px',
      minHeight: '44px',
    },
    onInput: (e: Event) => { startTime = (e.target as HTMLInputElement).value; },
  });

  const endInput = h('input', {
    type: 'time', value: endTime,
    style: {
      width: '80px', padding: '10px 6px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.06)', color: '#fff',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-body)', fontSize: '13px',
      minHeight: '44px',
    },
    onInput: (e: Event) => { endTime = (e.target as HTMLInputElement).value; },
  });

  const addBtn = h('button', {
    onClick: () => {
      const entries = getSchedule();
      // Replace existing entry for same day
      const idx = entries.findIndex(e => e.day === selectedDay);
      const newEntry = { day: selectedDay, startTime, endTime };
      if (idx >= 0) entries[idx] = newEntry;
      else entries.push(newEntry);
      saveSchedule(entries);
      showToast(`Schedule saved for ${selectedDay}`, 'success');
      onUpdate();
    },
    style: {
      padding: '10px 16px', borderRadius: '8px',
      background: COLOR_GOLD, color: '#fff', border: 'none',
      fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: '700',
      cursor: 'pointer', minHeight: '44px', whiteSpace: 'nowrap',
    },
  }, 'Add');

  wrapper.appendChild(
    h('div', {
      style: {
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '8px',
        flexWrap: 'wrap',
      },
    },
      daySelect, startInput,
      h('span', { style: { color: 'var(--text-tertiary)', fontSize: '12px' } }, 'to'),
      endInput, addBtn,
    ),
  );

  return wrapper;
}

function buildPowerTips(): HTMLElement {
  const list = h('div', {
    style: {
      display: 'flex', gap: '10px',
      overflowX: 'auto',
      paddingBottom: '4px',
      scrollSnapType: 'x mandatory',
      WebkitOverflowScrolling: 'touch',
    },
  });

  for (const tip of POWER_TIPS) {
    list.appendChild(
      h('div', {
        style: {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '16px',
          minWidth: '160px',
          maxWidth: '200px',
          flexShrink: '0',
          scrollSnapAlign: 'start',
        },
      },
        h('div', {
          style: {
            fontSize: '24px', marginBottom: '8px',
          },
        }, tip.icon),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(12px, 3.2vw, 14px)',
            color: 'var(--text-secondary)',
            lineHeight: '1.4',
          },
        }, tip.tip),
      ),
    );
  }

  return list;
}

function buildStatusBar(battery: BatteryManager | null): HTMLElement {
  const level = battery ? battery.level : 0;
  const charging = battery ? battery.charging : false;
  const pct = Math.round(level * 100);
  const color = getBatteryColor(level);
  const powerSaver = isPowerSaverOn();

  const lastEvent = getOutageLog()[0];
  const lastOutage = lastEvent ? formatTimestamp(lastEvent.timestamp) : 'None';

  return h('div', {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '8px',
    },
  },
    h('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: '6px',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(13px, 3.4vw, 14px)',
        fontWeight: '700', color: color,
      },
    }, charging ? '\u26A1' : '\u{1F50B}', `${pct}%`),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(11px, 2.8vw, 12px)',
        color: 'var(--text-tertiary)',
        textAlign: 'center',
      },
    }, `Last event: ${lastOutage}`),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(11px, 2.8vw, 12px)',
        color: powerSaver ? COLOR_GOLD : 'var(--text-tertiary)',
        fontWeight: powerSaver ? '700' : '400',
      },
    }, powerSaver ? '\u26A1 Saver ON' : 'Saver OFF'),
  );
}

// ── Render Page ──

export function renderDumsorPage(container: HTMLElement): void {
  let battery: BatteryManager | null = null;
  let batteryHeroEl: HTMLElement;
  let statusBarEl: HTMLElement;

  const page = h('div', {
    style: {
      display: 'flex', flexDirection: 'column',
      padding: '20px 20px 100px',
      paddingTop: 'calc(env(safe-area-inset-top, 20px) + 16px)',
      minHeight: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.35s ease-out',
    },
  });

  // Inject pulse animation
  if (!document.getElementById('dumsor-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'dumsor-styles';
    styleEl.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Page title
  page.appendChild(
    h('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '20px',
      },
    },
      h('div', {
        style: {
          width: '40px', height: '40px', borderRadius: '12px',
          background: `linear-gradient(135deg, ${COLOR_GOLD}, ${COLOR_RED})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: '0',
          boxShadow: `0 4px 16px ${COLOR_GOLD}33`,
        },
      }, '\u26A1'),
      h('div', {},
        h('div', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(22px, 5.8vw, 26px)',
            fontWeight: '800',
            lineHeight: '1.2',
            letterSpacing: '-0.01em',
          },
        }, 'Dumsor Guard'),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(12px, 3vw, 13px)',
            color: 'var(--text-tertiary)',
            marginTop: '2px',
          },
        }, 'Power monitoring & outage protection'),
      ),
    ),
  );

  // Recovery banner
  const recoveryBanner = buildRecoveryBanner(
    () => {
      // Restore: read state and navigate
      try {
        const raw = localStorage.getItem(LS_DUMSOR_STATE);
        if (raw) {
          const state: DumsorState = JSON.parse(raw);
          showToast('State restored successfully', 'success');
          // Clear after restore
          localStorage.removeItem(LS_DUMSOR_STATE);
          // Navigate if there's a page to go to
          if (state.currentPage && typeof (window as any).__osNavigate === 'function') {
            (window as any).__osNavigate(state.currentPage);
          }
        }
      } catch { showToast('Failed to restore state', 'error'); }
      renderDumsorPage(container);
    },
    () => {
      localStorage.removeItem(LS_DUMSOR_STATE);
      renderDumsorPage(container);
    },
  );
  page.appendChild(recoveryBanner);

  // Status bar
  statusBarEl = buildStatusBar(null);
  page.appendChild(statusBarEl);

  // Battery hero
  page.appendChild(sectionHeader('Battery Monitor', '\u{1F50B}'));
  batteryHeroEl = buildBatteryHero(null);
  page.appendChild(batteryHeroEl);

  // Power saver
  page.appendChild(sectionHeader('Power Saver', '\u26A1'));
  const powerSaverSection = buildPowerSaverSection((on) => {
    setPowerSaver(on);
    showToast(on ? 'Power saver enabled' : 'Power saver disabled', on ? 'success' : 'info');
    // Refresh status bar
    const newStatus = buildStatusBar(battery);
    statusBarEl.replaceWith(newStatus);
    statusBarEl = newStatus;
  });
  page.appendChild(powerSaverSection);

  // Outage log
  page.appendChild(sectionHeader('Outage Log', '\u{1F4CA}'));
  page.appendChild(buildOutageLog());

  // Emergency contacts
  page.appendChild(sectionHeader('Emergency Contacts', '\u{1F6A8}'));
  page.appendChild(buildEmergencyContacts());

  // Dumsor schedule
  page.appendChild(sectionHeader('Load Shedding Schedule', '\u{1F4C5}'));
  page.appendChild(buildScheduleSection(() => renderDumsorPage(container)));

  // Power tips
  page.appendChild(sectionHeader('Power Tips', '\u{1F4A1}'));
  page.appendChild(buildPowerTips());

  render(container, page);

  // ── Battery API hookup ──
  if ('getBattery' in navigator) {
    (navigator as any).getBattery().then((bm: BatteryManager) => {
      battery = bm;

      // Initial update
      const newHero = buildBatteryHero(battery);
      batteryHeroEl.replaceWith(newHero);
      batteryHeroEl = newHero;

      const newStatus = buildStatusBar(battery);
      statusBarEl.replaceWith(newStatus);
      statusBarEl = newStatus;

      // Real-time updates
      const updateBattery = () => {
        const updatedHero = buildBatteryHero(battery);
        batteryHeroEl.replaceWith(updatedHero);
        batteryHeroEl = updatedHero;

        const updatedStatus = buildStatusBar(battery);
        statusBarEl.replaceWith(updatedStatus);
        statusBarEl = updatedStatus;
      };

      bm.addEventListener('levelchange', updateBattery);
      bm.addEventListener('chargingchange', () => {
        updateBattery();
        if (bm.charging) {
          addOutageEvent({ type: 'charging_start', batteryLevel: Math.round(bm.level * 100) });
        } else {
          addOutageEvent({ type: 'charging_stop', batteryLevel: Math.round(bm.level * 100) });
        }
      });
      bm.addEventListener('chargingtimechange', updateBattery);
      bm.addEventListener('dischargingtimechange', updateBattery);

      // Auto-enable power saver when battery < 20%
      bm.addEventListener('levelchange', () => {
        if (bm.level < 0.2 && !isPowerSaverOn()) {
          setPowerSaver(true);
          showToast('Power saver auto-enabled \u2014 battery below 20%', 'info');
          addOutageEvent({ type: 'battery_low', batteryLevel: Math.round(bm.level * 100) });
        }
      });
    }).catch(() => {
      // Battery API not available
    });
  }
}

// ── Init Dumsor Guard (called from main.ts on boot) ──

let _guardInterval: ReturnType<typeof setInterval> | null = null;

export function initDumsorGuard(): void {
  // Avoid double-init
  if (_guardInterval) return;

  // 1. Set up battery monitoring
  if ('getBattery' in navigator) {
    (navigator as any).getBattery().then((bm: BatteryManager) => {
      // Log charging changes
      bm.addEventListener('chargingchange', () => {
        if (bm.charging) {
          addOutageEvent({ type: 'charging_start', batteryLevel: Math.round(bm.level * 100) });
        } else {
          addOutageEvent({ type: 'charging_stop', batteryLevel: Math.round(bm.level * 100) });
        }
      });

      // Auto-enable power saver
      bm.addEventListener('levelchange', () => {
        if (bm.level < 0.2 && !isPowerSaverOn()) {
          setPowerSaver(true);
          showToast('Power saver auto-enabled \u2014 battery below 20%', 'info');
          addOutageEvent({ type: 'battery_low', batteryLevel: Math.round(bm.level * 100) });
        }
      });
    }).catch(() => { /* not available */ });
  }

  // 2. Periodic state save (every 30 seconds)
  _guardInterval = setInterval(() => {
    try {
      const state: DumsorState = {
        currentPage: window.location.hash || window.location.pathname,
        timestamp: new Date().toISOString(),
      };

      // Capture form data from any visible inputs
      const formData: Record<string, string> = {};
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((el, i) => {
        const input = el as HTMLInputElement;
        if (input.value && input.value.length > 0) {
          const key = input.name || input.id || `field_${i}`;
          formData[key] = input.value;
        }
      });
      if (Object.keys(formData).length > 0) {
        state.formData = formData;
      }

      localStorage.setItem(LS_DUMSOR_STATE, JSON.stringify(state));
    } catch { /* ignore storage errors */ }
  }, 30000);

  // 3. Online/offline event listeners
  window.addEventListener('online', () => {
    let batteryLevel = 0;
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bm: BatteryManager) => {
        batteryLevel = Math.round(bm.level * 100);
        addOutageEvent({ type: 'online', batteryLevel });
      }).catch(() => {
        addOutageEvent({ type: 'online', batteryLevel: 0 });
      });
    } else {
      addOutageEvent({ type: 'online', batteryLevel: 0 });
    }
    showToast('Connection restored', 'success');
  });

  window.addEventListener('offline', () => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bm: BatteryManager) => {
        addOutageEvent({ type: 'offline', batteryLevel: Math.round(bm.level * 100) });
      }).catch(() => {
        addOutageEvent({ type: 'offline', batteryLevel: 0 });
      });
    } else {
      addOutageEvent({ type: 'offline', batteryLevel: 0 });
    }
    showToast('You are offline \u2014 possible power outage', 'error');
  });

  // 4. Check for recovery state on boot
  try {
    const raw = localStorage.getItem(LS_DUMSOR_STATE);
    if (raw) {
      const state: DumsorState = JSON.parse(raw);
      const age = Date.now() - new Date(state.timestamp).getTime();
      // If state is recent (< 1 hour), it means we may have crashed
      if (age > 5000 && age < 3600000) {
        showToast('Recovery state available \u2014 open Dumsor Guard to restore', 'info');
      } else if (age >= 3600000) {
        // Too old, clean up
        localStorage.removeItem(LS_DUMSOR_STATE);
      }
    }
  } catch { /* ignore */ }
}
