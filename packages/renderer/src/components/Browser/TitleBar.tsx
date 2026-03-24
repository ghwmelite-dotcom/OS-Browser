import React, { useState, useEffect, useRef } from 'react';
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

/** Animated OS Browser logo — Kente-inspired golden compass with subtle glow */
function BrowserLogo() {
  return (
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0" title="OS Browser">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="browser-logo-spin">
        {/* Outer ring */}
        <circle cx="12" cy="12" r="10.5" stroke="url(#logoGrad)" strokeWidth="1.8" fill="none" />
        {/* Inner compass cross */}
        <path d="M12 3.5V8M12 16v4.5M3.5 12H8M16 12h4.5" stroke="url(#logoGrad)" strokeWidth="1.2" strokeLinecap="round" />
        {/* Center globe lines */}
        <ellipse cx="12" cy="12" rx="4.5" ry="10.5" stroke="url(#logoGrad2)" strokeWidth="0.8" opacity="0.5" />
        <ellipse cx="12" cy="12" rx="10.5" ry="4.5" stroke="url(#logoGrad2)" strokeWidth="0.8" opacity="0.5" />
        {/* Center dot */}
        <circle cx="12" cy="12" r="2" fill="url(#logoGrad)" className="browser-logo-pulse" />
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stopColor="#D4A017" />
            <stop offset="50%" stopColor="#F2C94C" />
            <stop offset="100%" stopColor="#D4A017" />
          </linearGradient>
          <linearGradient id="logoGrad2" x1="0" y1="12" x2="24" y2="12">
            <stop offset="0%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#F2C94C" />
          </linearGradient>
        </defs>
      </svg>
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full browser-logo-glow" />
    </div>
  );
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
      className="shrink-0 select-none flex flex-col"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Kente crown — woven band at the very top */}
      <div style={{
        height: 3,
        background: 'var(--kente-crown)',
        flexShrink: 0,
        opacity: isDark ? 0.5 : 1,
      }} />
      <div
        className="h-8 flex items-center justify-between"
        style={{ background: 'var(--kente-header-bg)' }}
      >
      {/* Left: Animated browser logo + App title */}
      <div className="flex items-center gap-2 pl-3">
        <BrowserLogo />
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-accent)', WebkitAppRegion: 'drag' } as React.CSSProperties}>
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
        {/* Theme toggle — more prominent */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-surface-2 transition-all duration-150 mr-1"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{ border: '1px solid var(--color-border-1)' }}
        >
          {isDark ? (
            <Sun size={13} className="text-ghana-gold" />
          ) : (
            <Moon size={13} className="text-text-secondary" />
          )}
          <span className="text-[10px] font-medium" style={{ color: isDark ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
            {isDark ? 'Dark' : 'Light'}
          </span>
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
    </div>
  );
}
