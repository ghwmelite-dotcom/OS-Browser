import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  Square as StopIcon,
  Printer,
  Minus,
  Plus,
  BookOpen,
} from 'lucide-react';
import { ttsService } from '../../services/TextToSpeech';

// ── Types ──────────────────────────────────────────────────────────────

interface ReadingModePanelProps {
  content: string;
  title: string;
  url: string;
  onClose: () => void;
}

type ThemeKey = 'light' | 'dark' | 'sepia' | 'oled';
type FontFamily = 'serif' | 'sans' | 'mono';

interface ThemeDef {
  bg: string;
  fg: string;
  accent: string;
  highlight: string;
  label: string;
}

const THEMES: Record<ThemeKey, ThemeDef> = {
  light: { bg: '#ffffff', fg: '#1a1a1a', accent: '#3B82F6', highlight: 'rgba(59,130,246,0.12)', label: 'Light' },
  dark: { bg: '#1a1a2e', fg: '#e0e0e0', accent: '#60A5FA', highlight: 'rgba(96,165,250,0.15)', label: 'Dark' },
  sepia: { bg: '#f4ecd8', fg: '#433422', accent: '#B45309', highlight: 'rgba(180,83,9,0.12)', label: 'Sepia' },
  oled: { bg: '#000000', fg: '#d4d4d4', accent: '#818CF8', highlight: 'rgba(129,140,248,0.15)', label: 'OLED' },
};

const FONT_MAP: Record<FontFamily, string> = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'Inter, system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, '');
}

// ── Component ──────────────────────────────────────────────────────────

const ReadingModePanel: React.FC<ReadingModePanelProps> = ({ content, title, url, onClose }) => {
  // ── State ──────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<ThemeKey>('light');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.7);
  const [progress, setProgress] = useState(0);

  // TTS state
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const [ttsSpeed, setTTSSpeed] = useState(1);
  const [ttsLang, setTTSLang] = useState('en-GB');
  const [currentSentence, setCurrentSentence] = useState(-1);

  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const t = THEMES[theme];

  // ── Estimated reading time ─────────────────────────────────────────
  const readingTime = useMemo(() => {
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }, [content]);

  // ── Scroll progress ────────────────────────────────────────────────
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const handler = () => {
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
      setProgress(Math.min(1, Math.max(0, pct)));
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  // ── TTS helpers ────────────────────────────────────────────────────
  const handleTTSPlay = useCallback(() => {
    if (isTTSPaused) {
      ttsService.resume();
      setIsTTSPaused(false);
      setIsTTSPlaying(true);
      return;
    }
    ttsService.speak(content, ttsLang, ttsSpeed, (i) => setCurrentSentence(i));
    setIsTTSPlaying(true);
    setIsTTSPaused(false);
  }, [content, ttsLang, ttsSpeed, isTTSPaused]);

  const handleTTSPause = useCallback(() => {
    ttsService.pause();
    setIsTTSPaused(true);
  }, []);

  const handleTTSStop = useCallback(() => {
    ttsService.stop();
    setIsTTSPlaying(false);
    setIsTTSPaused(false);
    setCurrentSentence(-1);
  }, []);

  const handleSpeedChange = useCallback(
    (speed: number) => {
      setTTSSpeed(speed);
      ttsService.setRate(speed);
    },
    [],
  );

  const handleLangChange = useCallback((lang: string) => {
    setTTSLang(lang);
    ttsService.setLang(lang);
  }, []);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      ttsService.stop();
    };
  }, []);

  // ── Render sentences with highlight ────────────────────────────────
  const renderContent = useMemo(() => {
    if (currentSentence < 0 || !isTTSPlaying) {
      return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />;
    }

    // Split into sentences for highlighting
    const sentences = content.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g) || [content];
    return (
      <div>
        {sentences.map((s, i) => (
          <span
            key={i}
            style={{
              background: i === currentSentence ? t.highlight : 'transparent',
              borderRadius: i === currentSentence ? 4 : 0,
              padding: i === currentSentence ? '2px 0' : 0,
              transition: 'background 200ms ease',
            }}
          >
            {s}
          </span>
        ))}
      </div>
    );
  }, [content, currentSentence, isTTSPlaying, t.highlight]);

  const langs = ttsService.getSupportedLanguages();

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: t.bg,
        color: t.fg,
        overflowY: 'auto',
        fontFamily: FONT_MAP[fontFamily],
        fontSize,
        lineHeight,
        transition: 'background 300ms, color 300ms',
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 3,
          width: `${progress * 100}%`,
          background: t.accent,
          zIndex: 10001,
          transition: 'width 100ms linear',
        }}
      />

      {/* Sticky toolbar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10001,
          background: t.bg,
          borderBottom: `1px solid ${theme === 'oled' ? '#222' : theme === 'dark' ? '#2a2a40' : '#e5e5e5'}`,
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={iconBtn(t)} title="Close reading mode">
          <X size={18} />
        </button>

        <div style={{ width: 1, height: 24, background: 'rgba(128,128,128,0.2)' }} />

        {/* Font family */}
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value as FontFamily)}
          style={selectStyle(t)}
        >
          <option value="serif">Serif</option>
          <option value="sans">Sans</option>
          <option value="mono">Mono</option>
        </select>

        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setFontSize((s) => Math.max(14, s - 1))}
            style={iconBtn(t)}
            title="Decrease font size"
          >
            <Minus size={14} />
          </button>
          <span style={{ fontSize: 12, minWidth: 28, textAlign: 'center' }}>{fontSize}px</span>
          <button
            onClick={() => setFontSize((s) => Math.min(28, s + 1))}
            style={iconBtn(t)}
            title="Increase font size"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Line height */}
        <input
          type="range"
          min={1.4}
          max={2.0}
          step={0.1}
          value={lineHeight}
          onChange={(e) => setLineHeight(parseFloat(e.target.value))}
          style={{ width: 64, accentColor: t.accent }}
          title={`Line height: ${lineHeight}`}
        />

        <div style={{ width: 1, height: 24, background: 'rgba(128,128,128,0.2)' }} />

        {/* Themes */}
        {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            title={THEMES[key].label}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: THEMES[key].bg,
              border: theme === key ? `2px solid ${t.accent}` : '2px solid rgba(128,128,128,0.3)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}

        <div style={{ width: 1, height: 24, background: 'rgba(128,128,128,0.2)' }} />

        {/* TTS controls */}
        {isTTSPlaying && !isTTSPaused ? (
          <button onClick={handleTTSPause} style={iconBtn(t)} title="Pause TTS">
            <Pause size={16} />
          </button>
        ) : (
          <button onClick={handleTTSPlay} style={iconBtn(t)} title="Play TTS">
            <Play size={16} />
          </button>
        )}

        {isTTSPlaying && (
          <button onClick={handleTTSStop} style={iconBtn(t)} title="Stop TTS">
            <StopIcon size={16} />
          </button>
        )}

        {/* TTS speed */}
        <select value={ttsSpeed} onChange={(e) => handleSpeedChange(Number(e.target.value))} style={selectStyle(t)}>
          {SPEED_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        {/* TTS language */}
        <select value={ttsLang} onChange={(e) => handleLangChange(e.target.value)} style={selectStyle(t)}>
          {langs.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Save as PDF */}
        <button onClick={() => window.print()} style={iconBtn(t)} title="Save as PDF">
          <Printer size={16} />
        </button>
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '48px 24px 96px',
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: fontSize + 10,
            fontWeight: 700,
            lineHeight: 1.25,
            marginBottom: 8,
          }}
        >
          {title}
        </h1>

        {/* Meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            opacity: 0.6,
            marginBottom: 32,
          }}
        >
          <BookOpen size={14} />
          <span>{readingTime} min read</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 300,
            }}
          >
            {url}
          </span>
        </div>

        {/* Article body */}
        <div
          style={{
            fontSize,
            lineHeight,
          }}
        >
          {renderContent}
        </div>
      </div>
    </div>
  );
};

// ── Shared styles ──────────────────────────────────────────────────────

function iconBtn(t: ThemeDef): React.CSSProperties {
  return {
    background: 'rgba(128,128,128,0.1)',
    border: 'none',
    borderRadius: 8,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: t.fg,
    cursor: 'pointer',
    transition: 'background 150ms',
  };
}

function selectStyle(t: ThemeDef): React.CSSProperties {
  return {
    background: 'rgba(128,128,128,0.1)',
    color: t.fg,
    border: 'none',
    borderRadius: 8,
    padding: '4px 8px',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
  };
}

export default ReadingModePanel;
