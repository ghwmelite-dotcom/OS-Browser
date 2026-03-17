// ── Typing Speed Game ────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { pickPassage } from './typingTexts';
import { gameSounds } from '../GameSoundEngine';

type Duration = 30 | 60 | 120;

interface Stats {
  wpm: number;
  accuracy: number;
  correctChars: number;
  wrongChars: number;
  totalChars: number;
  elapsed: number;
}

// WPM percentile brackets (approximate for general population)
function getPercentile(wpm: number): string {
  if (wpm >= 100) return 'Top 1%';
  if (wpm >= 80) return 'Top 5%';
  if (wpm >= 65) return 'Top 15%';
  if (wpm >= 50) return 'Top 30%';
  if (wpm >= 40) return 'Top 50%';
  if (wpm >= 30) return 'Top 70%';
  if (wpm >= 20) return 'Top 85%';
  return 'Keep practicing!';
}

export const TypingSpeedGame: React.FC = () => {
  const [duration, setDuration] = useState<Duration>(60);
  const [passage, setPassage] = useState(() => pickPassage());
  const [typed, setTyped] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [cursorBlink, setCursorBlink] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const text = passage.text;

  // ── Stats computation ──────────────────────────────────────────────
  const stats: Stats = useMemo(() => {
    let correctChars = 0;
    let wrongChars = 0;
    for (let i = 0; i < typed.length; i++) {
      if (i < text.length && typed[i] === text[i]) {
        correctChars++;
      } else {
        wrongChars++;
      }
    }
    const elapsed = started ? (duration - timeLeft) : 0;
    const minutes = Math.max(elapsed / 60, 1 / 60);
    const wpm = Math.round((correctChars / 5) / minutes);
    const accuracy = typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100;

    return { wpm, accuracy, correctChars, wrongChars, totalChars: typed.length, elapsed };
  }, [typed, text, started, duration, timeLeft]);

  // ── Cursor blink ───────────────────────────────────────────────────
  useEffect(() => {
    blinkRef.current = setInterval(() => setCursorBlink((b) => !b), 530);
    return () => {
      if (blinkRef.current) clearInterval(blinkRef.current);
    };
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setFinished(true);
          gameSounds.win();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, finished]);

  // ── Handle input ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (finished) return;

      // Start on first keystroke
      if (!started && e.key.length === 1) {
        setStarted(true);
        startTimeRef.current = Date.now();
      }

      if (e.key === 'Backspace') {
        setTyped((t) => t.slice(0, -1));
        return;
      }

      // Ignore modifier keys, function keys, etc.
      if (e.key.length !== 1) return;

      const nextChar = text[typed.length];
      if (typed.length >= text.length) {
        // Finished typing the whole passage
        setFinished(true);
        if (timerRef.current) clearInterval(timerRef.current);
        gameSounds.win();
        return;
      }

      if (e.key === nextChar) {
        gameSounds.type();
      }

      setTyped((t) => t + e.key);
    },
    [started, finished, typed, text],
  );

  // ── Focus input on click ───────────────────────────────────────────
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // ── Restart ────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    setPassage(pickPassage());
    setTyped('');
    setStarted(false);
    setFinished(false);
    setTimeLeft(duration);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [duration]);

  // ── Change duration ────────────────────────────────────────────────
  const changeDuration = useCallback((d: Duration) => {
    setDuration(d);
    setTimeLeft(d);
    setTyped('');
    setStarted(false);
    setFinished(false);
    setPassage(pickPassage());
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ── Render text with coloring ──────────────────────────────────────
  const renderText = () => {
    const chars: React.ReactNode[] = [];
    for (let i = 0; i < text.length; i++) {
      let color = 'rgba(250,246,238,0.3)'; // untyped = dim gray
      let textDecoration = 'none';
      let bg = 'transparent';

      if (i < typed.length) {
        if (typed[i] === text[i]) {
          color = '#4CAF50'; // correct = green
        } else {
          color = '#F44336'; // wrong = red
          textDecoration = 'underline';
        }
      }

      // Cursor position
      const isCursor = i === typed.length;

      chars.push(
        <span
          key={i}
          style={{
            color,
            textDecoration,
            position: 'relative',
            background: isCursor && cursorBlink ? 'rgba(252,209,22,0.4)' : bg,
            borderLeft: isCursor ? '2px solid #FCD116' : 'none',
          }}
        >
          {text[i]}
        </span>,
      );
    }
    return chars;
  };

  // ── Styles ─────────────────────────────────────────────────────────
  const container: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(8px, 2vw, 16px)',
    width: '100%',
    maxWidth: 700,
    padding: 'clamp(8px, 2vw, 16px)',
    color: '#FAF6EE',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const statsRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-around',
    width: '100%',
    flexWrap: 'wrap',
    gap: 'clamp(8px, 2vw, 16px)',
  };

  const statBox: React.CSSProperties = {
    textAlign: 'center',
    minWidth: 60,
  };

  const statLabel: React.CSSProperties = {
    fontSize: 'clamp(9px, 1.4vw, 11px)',
    color: 'rgba(250,246,238,0.5)',
  };

  const statValue: React.CSSProperties = {
    fontSize: 'clamp(16px, 3vw, 28px)',
    fontWeight: 700,
    color: '#FCD116',
    fontVariantNumeric: 'tabular-nums',
  };

  const textDisplay: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
    fontSize: 'clamp(14px, 2vw, 20px)',
    lineHeight: 1.8,
    padding: 'clamp(12px, 2.5vw, 24px)',
    borderRadius: 12,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
    width: '100%',
    cursor: 'text',
    userSelect: 'none',
    wordBreak: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
  };

  const btnStyle: React.CSSProperties = {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)',
    borderRadius: 8,
    border: '1px solid rgba(252,209,22,0.3)',
    background: 'rgba(252,209,22,0.1)',
    color: '#FCD116',
    fontSize: 'clamp(12px, 1.6vw, 14px)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
  };

  const durationBtn = (d: Duration): React.CSSProperties => ({
    ...btnStyle,
    padding: '4px 12px',
    background: duration === d ? 'rgba(252,209,22,0.2)' : 'transparent',
    border:
      duration === d
        ? '1px solid rgba(252,209,22,0.5)'
        : '1px solid rgba(255,255,255,0.1)',
    color: duration === d ? '#FCD116' : 'rgba(250,246,238,0.4)',
  });

  // ── Finished Screen ────────────────────────────────────────────────
  if (finished) {
    return (
      <div style={container}>
        <div style={{ fontSize: 'clamp(20px, 4vw, 32px)', fontWeight: 700 }}>Time&apos;s Up!</div>

        <div style={{ fontSize: 'clamp(40px, 8vw, 64px)', fontWeight: 800, color: '#FCD116' }}>
          {stats.wpm}
          <span style={{ fontSize: 'clamp(14px, 2vw, 20px)', opacity: 0.5 }}> WPM</span>
        </div>

        <div style={{ fontSize: 'clamp(12px, 2vw, 16px)', opacity: 0.6 }}>
          {getPercentile(stats.wpm)}
        </div>

        <div style={statsRow}>
          <div style={statBox}>
            <div style={statLabel}>Accuracy</div>
            <div style={{ ...statValue, color: stats.accuracy >= 95 ? '#4CAF50' : stats.accuracy >= 85 ? '#FFC107' : '#F44336' }}>
              {stats.accuracy}%
            </div>
          </div>
          <div style={statBox}>
            <div style={statLabel}>Characters</div>
            <div style={statValue}>{stats.totalChars}</div>
          </div>
          <div style={statBox}>
            <div style={statLabel}>Correct</div>
            <div style={{ ...statValue, color: '#4CAF50' }}>{stats.correctChars}</div>
          </div>
          <div style={statBox}>
            <div style={statLabel}>Errors</div>
            <div style={{ ...statValue, color: stats.wrongChars > 0 ? '#F44336' : '#4CAF50' }}>{stats.wrongChars}</div>
          </div>
        </div>

        <button onClick={restart} style={btnStyle}>
          Play Again
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={container}>
      {/* Duration selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {([30, 60, 120] as Duration[]).map((d) => (
          <button key={d} onClick={() => changeDuration(d)} style={durationBtn(d)} disabled={started}>
            {d}s
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div style={statsRow}>
        <div style={statBox}>
          <div style={statLabel}>WPM</div>
          <div style={statValue}>{started ? stats.wpm : '--'}</div>
        </div>
        <div style={statBox}>
          <div style={statLabel}>Accuracy</div>
          <div style={{ ...statValue, fontSize: 'clamp(14px, 2.5vw, 22px)' }}>
            {started ? `${stats.accuracy}%` : '--'}
          </div>
        </div>
        <div style={statBox}>
          <div style={statLabel}>Chars</div>
          <div style={{ ...statValue, fontSize: 'clamp(14px, 2.5vw, 22px)' }}>{stats.totalChars}</div>
        </div>
        <div style={statBox}>
          <div style={statLabel}>Time</div>
          <div
            style={{
              ...statValue,
              fontSize: 'clamp(14px, 2.5vw, 22px)',
              color: timeLeft <= 10 ? '#F44336' : '#FCD116',
            }}
          >
            {timeLeft}s
          </div>
        </div>
      </div>

      {/* Category & difficulty */}
      <div style={{ display: 'flex', gap: 8, fontSize: 'clamp(10px, 1.4vw, 12px)' }}>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 8,
            background: 'rgba(0,107,63,0.2)',
            border: '1px solid rgba(0,107,63,0.3)',
            color: '#4CAF50',
          }}
        >
          {passage.category}
        </span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 8,
            background: 'rgba(252,209,22,0.1)',
            border: '1px solid rgba(252,209,22,0.2)',
            color: 'rgba(252,209,22,0.7)',
          }}
        >
          {passage.difficulty}
        </span>
      </div>

      {/* Text display */}
      <div style={textDisplay} onClick={focusInput}>
        {renderText()}
      </div>

      {/* Hidden input to capture keystrokes */}
      <input
        ref={inputRef}
        autoFocus
        onKeyDown={handleKeyDown}
        style={{
          position: 'absolute',
          opacity: 0,
          height: 0,
          width: 0,
          overflow: 'hidden',
        }}
        aria-label="Type the text shown above"
      />

      {/* Instructions */}
      {!started && (
        <div style={{ fontSize: 'clamp(11px, 1.6vw, 14px)', opacity: 0.5, textAlign: 'center' }}>
          Click the text area and start typing. Timer begins on first keystroke.
        </div>
      )}

      {/* New passage button */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={restart} style={btnStyle} disabled={started && !finished}>
          New Passage
        </button>
      </div>
    </div>
  );
};

export default TypingSpeedGame;
