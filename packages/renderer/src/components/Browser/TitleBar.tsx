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
      className="h-7 bg-bg flex items-center justify-between px-2 shrink-0 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* macOS-style traffic light dots */}
      <div
        className="flex items-center gap-[6px] pl-1 group"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleClose}
          className="w-[10px] h-[10px] rounded-full bg-[#ff5f57] hover:brightness-110 transition-all duration-150 ease-out focus:outline-none focus:ring-1 focus:ring-ghana-gold/50 focus:ring-offset-1 focus:ring-offset-bg"
          aria-label="Close window"
        />
        <button
          onClick={handleMinimize}
          className="w-[10px] h-[10px] rounded-full bg-[#febc2e] hover:brightness-110 transition-all duration-150 ease-out focus:outline-none focus:ring-1 focus:ring-ghana-gold/50 focus:ring-offset-1 focus:ring-offset-bg"
          aria-label="Minimize window"
        />
        <button
          onClick={handleMaximize}
          className="w-[10px] h-[10px] rounded-full bg-[#28c840] hover:brightness-110 transition-all duration-150 ease-out focus:outline-none focus:ring-1 focus:ring-ghana-gold/50 focus:ring-offset-1 focus:ring-offset-bg"
          aria-label="Maximize window"
        />
      </div>

      {/* Spacer — draggable area */}
      <div className="flex-1" />

      {/* Theme toggle */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={toggleTheme}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-2 transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-ghana-gold/50"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? (
            <Sun size={12} className="text-text-muted hover:text-ghana-gold transition-colors duration-150" />
          ) : (
            <Moon size={12} className="text-text-muted hover:text-ghana-gold transition-colors duration-150" />
          )}
        </button>
      </div>
    </div>
  );
}
