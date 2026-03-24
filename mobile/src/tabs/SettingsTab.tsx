import React from 'react';
import { Sun, Moon, Trash2, Info } from 'lucide-react';

interface SettingsTabProps {
  colors: Record<string, string>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function SettingsTab({ colors, theme, onToggleTheme }: SettingsTabProps) {
  const clearData = () => {
    if (confirm('Clear all browsing data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      {/* Header */}
      <div style={{ padding: '12px 0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>Settings</h1>
      </div>

      {/* Theme */}
      <Section title="Appearance" colors={colors}>
        <Row colors={colors} onClick={onToggleTheme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {theme === 'dark' ? <Moon size={18} style={{ color: colors.accent }} /> : <Sun size={18} style={{ color: colors.accent }} />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>Theme</div>
              <div style={{ fontSize: 12, color: colors.textMuted }}>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</div>
            </div>
          </div>
          <div style={{
            width: 44, height: 24, borderRadius: 12, padding: 2, cursor: 'pointer',
            background: theme === 'dark' ? colors.accent : colors.border,
            transition: 'background 200ms ease',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform 200ms ease',
            }} />
          </div>
        </Row>
      </Section>

      {/* Data */}
      <Section title="Privacy" colors={colors}>
        <Row colors={colors} onClick={clearData}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Trash2 size={18} style={{ color: '#EF4444' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>Clear Browsing Data</div>
              <div style={{ fontSize: 12, color: colors.textMuted }}>Remove history, bookmarks, and settings</div>
            </div>
          </div>
        </Row>
      </Section>

      {/* About */}
      <Section title="About" colors={colors}>
        <Row colors={colors}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Info size={18} style={{ color: colors.accent }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>OS Browser Mobile</div>
              <div style={{ fontSize: 12, color: colors.textMuted }}>Version 1.0.0 — Ghana's AI-Powered Browser</div>
            </div>
          </div>
        </Row>
      </Section>

      <div style={{ textAlign: 'center', padding: '32px 0', color: colors.textMuted, fontSize: 12 }}>
        Powered by OHCS
      </div>
    </div>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: Record<string, string> }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: colors.accent, marginBottom: 8 }}>
        {title}
      </h3>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}`, background: colors.surface1 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children, colors, onClick }: { children: React.ReactNode; colors: Record<string, string>; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', borderBottom: `1px solid ${colors.border}`,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {children}
    </div>
  );
}
