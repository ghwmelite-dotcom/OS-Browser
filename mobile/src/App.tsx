import React, { useState, useCallback } from 'react';
import { Globe, MessageCircle, Sparkles, Settings } from 'lucide-react';
import { KenteSplash } from './components/KenteSplash';
import { BrowserTab } from './tabs/BrowserTab';
import { GovChatTab } from './tabs/GovChatTab';
import { AskOzzyTab } from './tabs/AskOzzyTab';
import { SettingsTab } from './tabs/SettingsTab';

type TabId = 'browser' | 'govchat' | 'askozzy' | 'settings';

const TABS = [
  { id: 'browser' as TabId, label: 'Browse', icon: Globe },
  { id: 'govchat' as TabId, label: 'GovChat', icon: MessageCircle },
  { id: 'askozzy' as TabId, label: 'AskOzzy', icon: Sparkles },
  { id: 'settings' as TabId, label: 'Settings', icon: Settings },
];

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('browser');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('os-browser-theme') as 'light' | 'dark') || 'dark';
  });
  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('os-browser-theme', next);
  };

  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#0f1117' : '#faf6f0',
    surface1: isDark ? '#1a1d27' : '#ffffff',
    surface2: isDark ? '#252836' : '#f5f0e8',
    border: isDark ? '#2d3044' : '#e5ddd0',
    text: isDark ? '#e8e6e3' : '#1a1a1a',
    textMuted: isDark ? '#8b8d98' : '#6b6b6b',
    accent: '#D4A017',
    kenteGold: '#D4A017',
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: colors.bg, color: colors.text,
    }}>
      {/* Animated Kente splash screen */}
      {showSplash && <KenteSplash onDone={handleSplashDone} />}

      {/* Kente crown */}
      <div style={{
        height: 3, flexShrink: 0,
        background: 'linear-gradient(90deg, #D4A017 0%, #006B3F 25%, #CE1126 50%, #006B3F 75%, #D4A017 100%)',
      }} />

      {/* Tab content — all tabs mount but only active is visible */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'browser' ? 'flex' : 'none', flexDirection: 'column' }}>
          <BrowserTab colors={colors} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'govchat' ? 'flex' : 'none', flexDirection: 'column' }}>
          <GovChatTab colors={colors} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'askozzy' ? 'flex' : 'none', flexDirection: 'column' }}>
          <AskOzzyTab colors={colors} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'settings' ? 'flex' : 'none', flexDirection: 'column' }}>
          <SettingsTab colors={colors} theme={theme} onToggleTheme={toggleTheme} />
        </div>
      </div>

      {/* Bottom tab bar */}
      <div style={{
        height: 56, flexShrink: 0, display: 'flex',
        background: colors.surface1,
        borderTop: `1px solid ${colors.border}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? colors.accent : colors.textMuted,
              transition: 'color 150ms ease',
            }}>
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
