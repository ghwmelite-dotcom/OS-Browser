import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  BatteryCharging,
  Zap,
  Save,
  Clock,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import type { SidebarPanelProps } from '@/features/registry';
import { useTabsStore } from '@/store/tabs';

// ── Types ──────────────────────────────────────────────────────────────
interface PowerStatus {
  isOnBattery: boolean;
  batteryLevel: number;
  powerSaverEnabled: boolean;
}

interface SessionSnapshot {
  id: string;
  timestamp: number;
  tabCount: number;
  tabs: Array<{ id: string; url: string; title: string }>;
}

// ── Styles ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  border: '1px solid var(--color-border-1)',
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: 12,
};

const listItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 0',
  fontSize: 13,
  color: 'var(--color-text-secondary)',
};

// ── Helpers ─────────────────────────────────────────────────────────────
function getBatteryIcon(level: number, isOnBattery: boolean) {
  if (!isOnBattery) return BatteryCharging;
  if (level <= 15) return BatteryLow;
  if (level <= 50) return BatteryMedium;
  return BatteryFull;
}

function getBatteryColor(level: number, isOnBattery: boolean): string {
  if (!isOnBattery) return '#3DDC84';
  if (level <= 15) return '#CE1126';
  if (level <= 30) return '#FCD116';
  return '#3DDC84';
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;

  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString('en-GH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SNAPSHOT_KEY = 'os-browser:dumsor-snapshots';
const SESSION_KEY = 'os-browser:dumsor-session';
const MAX_SNAPSHOTS = 5;

function loadSnapshots(): SessionSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSnapshot(tabs: Array<{ id: string; url: string; title: string }>): SessionSnapshot {
  const snapshot: SessionSnapshot = {
    id: `snap-${Date.now()}`,
    timestamp: Date.now(),
    tabCount: tabs.length,
    tabs,
  };

  const snapshots = loadSnapshots();
  snapshots.unshift(snapshot);
  while (snapshots.length > MAX_SNAPSHOTS) snapshots.pop();

  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
  } catch {
    // Storage may be full
  }

  return snapshot;
}

// ── Component ──────────────────────────────────────────────────────────
export const DumsorPanel: React.FC<SidebarPanelProps> = ({ width = 340, stripColor, onClose }) => {
  const [powerStatus, setPowerStatus] = useState<PowerStatus>({
    isOnBattery: false,
    batteryLevel: 100,
    powerSaverEnabled: false,
  });
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [snapshots, setSnapshots] = useState<SessionSnapshot[]>(loadSnapshots());
  const [saveFlash, setSaveFlash] = useState(false);

  // Fetch power status
  const fetchPowerStatus = useCallback(async () => {
    try {
      const status = await (window as any).osBrowser.power.getStatus();
      if (status) setPowerStatus(status);
    } catch {
      // Power monitor may not be ready
    }
  }, []);

  // Also try navigator.getBattery for battery level
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        setPowerStatus(prev => ({
          ...prev,
          batteryLevel: Math.round(batt.level * 100),
          isOnBattery: !batt.charging,
        }));

        batt.addEventListener('levelchange', () => {
          setPowerStatus(prev => ({
            ...prev,
            batteryLevel: Math.round(batt.level * 100),
          }));
        });

        batt.addEventListener('chargingchange', () => {
          setPowerStatus(prev => ({
            ...prev,
            isOnBattery: !batt.charging,
          }));
        });
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetchPowerStatus();
    const interval = setInterval(fetchPowerStatus, 15_000);
    return () => clearInterval(interval);
  }, [fetchPowerStatus]);

  // Listen for power status changes from main process
  useEffect(() => {
    try {
      const unsub = (window as any).osBrowser.power.onStatusChanged((data: PowerStatus) => {
        setPowerStatus(data);
      });
      return unsub;
    } catch {
      return undefined;
    }
  }, []);

  // Auto-save session periodically (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      doSave();
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  const doSave = useCallback(() => {
    try {
      const tabs = useTabsStore.getState().tabs;
      const sessionData = tabs.map(t => ({ id: t.id, url: t.url, title: t.title }));
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        tabs: sessionData,
        activeTabId: useTabsStore.getState().activeTabId,
        savedAt: Date.now(),
      }));
      setLastSaved(Date.now());
    } catch {
      // Silently handle storage errors
    }
  }, []);

  const handleSaveNow = () => {
    // Save session
    doSave();
    // Also create a snapshot for recovery
    const tabs = useTabsStore.getState().tabs;
    const sessionData = tabs.map(t => ({ id: t.id, url: t.url, title: t.title }));
    saveSnapshot(sessionData);
    setSnapshots(loadSnapshots());

    // Flash feedback
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  const handleRestore = (snapshot: SessionSnapshot) => {
    for (const tab of snapshot.tabs) {
      if (tab.url) {
        useTabsStore.getState().createTab(tab.url);
      }
    }
  };

  const handleToggleSaver = async () => {
    try {
      const result = await (window as any).osBrowser.power.toggleSaver();
      if (result) setPowerStatus(result);
    } catch {
      // Fallback: toggle locally
      setPowerStatus(prev => ({ ...prev, powerSaverEnabled: !prev.powerSaverEnabled }));
    }
  };

  const BattIcon = getBatteryIcon(powerStatus.batteryLevel, powerStatus.isOnBattery);
  const battColor = getBatteryColor(powerStatus.batteryLevel, powerStatus.isOnBattery);

  return (
    <div
      style={{
        width,
        height: '100%',
        overflowY: 'auto',
        padding: 20,
        background: 'var(--color-bg)',
        borderLeft: `3px solid ${stripColor}`,
        fontFamily: 'var(--font-sans, inherit)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} style={{ color: stripColor }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            DumsorGuard
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: 'var(--color-text-muted)',
            padding: 4,
          }}
          aria-label="Close panel"
        >
          \u00D7
        </button>
      </div>

      {/* Power Status Card */}
      <div style={card}>
        <div style={sectionHeader}>
          <Battery size={16} style={{ color: battColor }} />
          <span>Power Status</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <BattIcon size={32} style={{ color: battColor }} />
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              {powerStatus.batteryLevel}%
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
              {powerStatus.isOnBattery ? 'On Battery' : 'On AC Power'}
            </p>
          </div>
        </div>

        {powerStatus.isOnBattery && powerStatus.batteryLevel <= 20 && (
          <div
            style={{
              background: '#CE112615',
              border: '1px solid #CE112640',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 12,
              color: '#CE1126',
              fontWeight: 500,
            }}
          >
            Low battery! Sessions are being saved frequently.
          </div>
        )}
      </div>

      {/* Power Saver Toggle */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={18} style={{ color: powerStatus.powerSaverEnabled ? '#F59E0B' : 'var(--color-text-muted)' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                Power Saver
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0', maxWidth: 200 }}>
                Reduce CPU usage, suspend idle tabs, and disable background refresh
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleSaver}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              background: powerStatus.powerSaverEnabled ? stripColor : 'var(--color-border-2)',
              position: 'relative',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
            role="switch"
            aria-checked={powerStatus.powerSaverEnabled}
            aria-label="Toggle power saver"
          >
            <span
              style={{
                position: 'absolute',
                top: 4,
                left: powerStatus.powerSaverEnabled ? 24 : 4,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>
      </div>

      {/* Session Protection */}
      <div style={card}>
        <div style={sectionHeader}>
          <Save size={16} style={{ color: stripColor }} />
          <span>Session Protection</span>
        </div>

        <div style={listItem}>
          <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span>Auto-saving every 15 seconds</span>
        </div>

        <div style={listItem}>
          <CheckCircle size={14} style={{ color: stripColor }} />
          <span>Last saved: {formatTimestamp(lastSaved)}</span>
        </div>

        <button
          onClick={handleSaveNow}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            color: '#fff',
            background: saveFlash ? '#3DDC84' : stripColor,
            transition: 'background 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {saveFlash ? (
            <>
              <CheckCircle size={14} />
              Saved!
            </>
          ) : (
            <>
              <Save size={14} />
              Save Now
            </>
          )}
        </button>
      </div>

      {/* Recovery History */}
      <div style={card}>
        <div style={sectionHeader}>
          <RotateCcw size={16} style={{ color: stripColor }} />
          <span>Recovery History</span>
        </div>

        {snapshots.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0' }}>
            No snapshots yet. Click "Save Now" to create one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border-1)',
                }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
                    {formatTimestamp(snap.timestamp)}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    {snap.tabCount} tab{snap.tabCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(snap)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: `1px solid ${stripColor}40`,
                    background: `${stripColor}15`,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    color: stripColor,
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Protections */}
      {powerStatus.powerSaverEnabled && (
        <div style={card}>
          <div style={sectionHeader}>
            <Zap size={16} style={{ color: '#F59E0B' }} />
            <span>Active Protections</span>
          </div>

          {[
            'Reduced tab suspension threshold',
            'Background refresh disabled',
            'Animations reduced',
          ].map((protection) => (
            <div key={protection} style={listItem}>
              <CheckCircle size={14} style={{ color: '#3DDC84' }} />
              <span>{protection}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DumsorPanel;
