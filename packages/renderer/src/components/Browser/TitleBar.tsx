import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';

declare global {
  interface Window {
    osBrowser: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      fullscreen: () => Promise<void>;
      [key: string]: any;
    };
  }
}

export function TitleBar() {
  const { settings, updateSettings } = useSettingsStore();
  const isDark = settings?.theme !== 'light';

  const handleMinimize = () => window.osBrowser?.minimize();
  const handleMaximize = () => window.osBrowser?.maximize();
  const handleClose = () => window.osBrowser?.close();

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  return (
    <div
      className="h-8 bg-surface-1 border-b border-border-1 flex items-center justify-between px-3 shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Traffic light window controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          aria-label="Close window"
        >
          <span className="w-3 h-3 rounded-full bg-ghana-red" />
        </button>
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          aria-label="Minimize window"
        >
          <span className="w-3 h-3 rounded-full bg-ghana-gold" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          aria-label="Maximize window"
        >
          <span className="w-3 h-3 rounded-full bg-ghana-green" />
        </button>
      </div>

      <span className="text-sm text-text-secondary font-medium tracking-wide">
        OS Browser
      </span>

      {/* Theme toggle */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? (
            <Sun size={14} className="text-ghana-gold" />
          ) : (
            <Moon size={14} className="text-ghana-gold" />
          )}
        </button>
      </div>
    </div>
  );
}
