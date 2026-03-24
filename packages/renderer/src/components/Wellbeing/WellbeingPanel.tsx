import React, { useState, useEffect } from 'react';
import { Clock, Coffee, TrendingUp, Settings, BarChart3, Timer, Heart } from 'lucide-react';
import type { SidebarPanelProps } from '@/features/registry';
import { useWellbeingStore } from '@/store/wellbeing';

// ── Helpers ────────────────────────────────────────────────────────────
function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '<1m';
}

function goalColor(ratio: number, stripColor: string): string {
  if (ratio >= 1) return '#EF4444';
  if (ratio >= 0.75) return '#F59E0B';
  return stripColor;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '\u2026' : str;
}

// ── Styles ─────────────────────────────────────────────────────────────
const sectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: 12,
};

const card: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  border: '1px solid var(--color-border-1)',
};

const statRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: 12,
  color: 'var(--color-text-secondary)',
  padding: '6px 0',
};

const settingRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: 12,
  color: 'var(--color-text-secondary)',
  padding: '8px 0',
  borderBottom: '1px solid var(--color-border-1)',
};

// ── Component ──────────────────────────────────────────────────────────
export const WellbeingPanel: React.FC<SidebarPanelProps> = ({ width = 360, stripColor, onClose }) => {
  const store = useWellbeingStore();
  const [, setTick] = useState(0);

  // Refresh display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const topSites = store.getTopSites().slice(0, 5);
  const maxSeconds = topSites.length > 0 ? topSites[0].seconds : 1;

  const goalRatio = store.dailyGoalMinutes > 0
    ? store.dailyBrowsingSeconds / (store.dailyGoalMinutes * 60)
    : 0;

  return (
    <div
      style={{
        width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface-1)',
        borderLeft: '1px solid var(--color-border-1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Scrollable Content ────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
        }}
      >
        {/* ── Section 1: Today's Session ──────────────────────────── */}
        <div style={sectionHeader}>
          <Heart size={14} style={{ color: stripColor }} />
          Today's Session
        </div>

        <div style={card}>
          {/* Browsing Time */}
          <div style={statRow}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
              Browsing Time
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
              {formatTime(store.dailyBrowsingSeconds)}
            </span>
          </div>

          {/* Breaks Taken */}
          <div style={statRow}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Coffee size={12} style={{ color: 'var(--color-text-muted)' }} />
              Breaks Taken
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {store.breaksTaken}
            </span>
          </div>

          {/* Current Site */}
          <div style={statRow}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={12} style={{ color: 'var(--color-text-muted)' }} />
              Current Site
            </span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {store.currentSite ?? 'Internal page'}
            </span>
          </div>
        </div>

        {/* ── Section 2: Top Sites ────────────────────────────────── */}
        <div style={sectionHeader}>
          <BarChart3 size={14} style={{ color: stripColor }} />
          Top Sites
        </div>

        <div style={card}>
          {topSites.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                textAlign: 'center',
                padding: '12px 0',
              }}
            >
              No sites tracked yet
            </div>
          ) : (
            topSites.map((site, i) => (
              <div key={site.hostname} style={{ marginBottom: i < topSites.length - 1 ? 10 : 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    marginBottom: 4,
                  }}
                >
                  <span>{truncate(site.hostname, 20)}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {formatTime(site.seconds)}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: 'var(--color-border-1)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 2,
                      width: `${(site.seconds / maxSeconds) * 100}%`,
                      background: stripColor,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Section 3: Daily Goal (conditional) ─────────────────── */}
        {store.dailyGoalMinutes > 0 && (
          <>
            <div style={sectionHeader}>
              <Timer size={14} style={{ color: stripColor }} />
              Daily Goal
            </div>

            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 8,
                }}
              >
                <span>
                  {Math.floor(store.dailyBrowsingSeconds / 60)} of {store.dailyGoalMinutes} minutes
                </span>
                <span style={{ fontWeight: 600, color: goalColor(goalRatio, stripColor) }}>
                  {Math.min(Math.round(goalRatio * 100), 999)}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--color-border-1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    width: `${Math.min(goalRatio * 100, 100)}%`,
                    background: goalColor(goalRatio, stripColor),
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Section 4: Settings ─────────────────────────────────── */}
        <div style={sectionHeader}>
          <Settings size={14} style={{ color: stripColor }} />
          Settings
        </div>

        <div style={card}>
          {/* Break Interval */}
          <div style={settingRow}>
            <span>Break Interval</span>
            <select
              value={store.breakInterval}
              onChange={e => store.setBreakInterval(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--color-border-1)',
                background: 'var(--color-surface-1)',
                color: 'var(--color-text-primary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </div>

          {/* Daily Goal */}
          <div style={settingRow}>
            <span>Daily Goal (min)</span>
            <input
              type="number"
              min={0}
              value={store.dailyGoalMinutes}
              onChange={e => store.setDailyGoal(Math.max(0, Number(e.target.value)))}
              placeholder="0 = no limit"
              style={{
                width: 80,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--color-border-1)',
                background: 'var(--color-surface-1)',
                color: 'var(--color-text-primary)',
                fontSize: 12,
                textAlign: 'right',
              }}
            />
          </div>

          {/* Enabled Toggle */}
          <div style={{ ...settingRow, borderBottom: 'none' }}>
            <span>Enabled</span>
            <div
              onClick={() => store.toggleEnabled()}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: store.enabled ? stripColor : 'var(--color-border-1)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 2,
                  left: store.enabled ? 18 : 2,
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Take a Break Button ───────────────────────────── */}
      <div style={{ padding: 16, borderTop: '1px solid var(--color-border-1)' }}>
        <button
          onClick={() => store.takeBreak()}
          style={{
            width: '100%',
            padding: '10px 0',
            borderRadius: 8,
            border: 'none',
            background: stripColor,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Take a Break
        </button>
      </div>
    </div>
  );
};
