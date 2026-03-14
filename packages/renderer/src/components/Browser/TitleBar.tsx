import React from 'react';
import { Sun, Moon, Minus, Square, X } from 'lucide-react';
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
      className="h-8 bg-bg flex items-center justify-between shrink-0 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: App title */}
      <div className="flex items-center gap-2 pl-3">
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-accent)' }}>
          OS Browser
        </span>
      </div>

      {/* Center: draggable area */}
      <div className="flex-1" />

      {/* Right: Theme toggle + Window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-full flex items-center justify-center hover:bg-surface-2 transition-colors duration-100"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? (
            <Sun size={13} className="text-text-muted" />
          ) : (
            <Moon size={13} className="text-text-muted" />
          )}
        </button>

        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center hover:bg-surface-2 transition-colors duration-100"
          aria-label="Minimize"
          title="Minimize"
        >
          <Minus size={14} className="text-text-secondary" />
        </button>

        {/* Maximize */}
        <button
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center hover:bg-surface-2 transition-colors duration-100"
          aria-label="Maximize"
          title="Maximize"
        >
          <Square size={11} className="text-text-secondary" />
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors duration-100 group"
          aria-label="Close"
          title="Close"
        >
          <X size={14} className="text-text-secondary group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
