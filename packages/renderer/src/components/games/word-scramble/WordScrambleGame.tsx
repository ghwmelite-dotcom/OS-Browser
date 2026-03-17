// ── Word Scramble Game ───────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { wordBank, scrambleWord, type WordEntry } from './wordBank';
import { gameSounds } from '../GameSoundEngine';

type Difficulty = 'Easy' | 'Hard';

interface TileLetter {
  char: string;
  id: number;
  placed: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

function pickWord(): WordEntry {
  return wordBank[Math.floor(Math.random() * wordBank.length)];
}

// ── Component ────────────────────────────────────────────────────────

export const WordScrambleGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [currentWord, setCurrentWord] = useState<WordEntry>(pickWord);
  const [tiles, setTiles] = useState<TileLetter[]>([]);
  const [answer, setAnswer] = useState<(TileLetter | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalTime = difficulty === 'Easy' ? 60 : 30;

  // ── Setup a new word ───────────────────────────────────────────────
  const setupWord = useCallback(() => {
    const entry = pickWord();
    setCurrentWord(entry);
    const clean = entry.word.replace(/\s/g, '');
    const scrambled = scrambleWord(entry.word);
    const newTiles = scrambled.split('').map((char, i) => ({
      char: char.toUpperCase(),
      id: i,
      placed: false,
    }));
    setTiles(newTiles);
    setAnswer(new Array(clean.length).fill(null));
    setSolved(false);
    setFailed(false);
    setShowMeaning(false);
    setTimeLeft(totalTime);
  }, [totalTime]);

  // ── Init ───────────────────────────────────────────────────────────
  useEffect(() => {
    setupWord();
  }, [setupWord]);

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (solved || failed || gameOver) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Time up
          clearInterval(timerRef.current!);
          setFailed(true);
          setStreak(0);
          gameSounds.lose();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [solved, failed, gameOver, round]);

  // ── Place a tile ───────────────────────────────────────────────────
  const placeTile = useCallback(
    (tile: TileLetter) => {
      if (solved || failed || tile.placed) return;
      gameSounds.move();
      const slotIdx = answer.findIndex((s) => s === null);
      if (slotIdx === -1) return;

      const newAnswer = [...answer];
      newAnswer[slotIdx] = tile;
      setAnswer(newAnswer);

      const newTiles = tiles.map((t) => (t.id === tile.id ? { ...t, placed: true } : t));
      setTiles(newTiles);

      // Check if complete
      if (newAnswer.every((s) => s !== null)) {
        const guess = newAnswer.map((s) => s!.char).join('');
        const target = currentWord.word.replace(/\s/g, '').toUpperCase();
        if (guess === target) {
          // Correct!
          const wordScore = currentWord.word.replace(/\s/g, '').length;
          const timeBonus = timeLeft;
          const streakBonus = streak >= 2 ? Math.floor(streak * 1.5) : 0;
          const earned = wordScore * timeBonus + streakBonus;
          setScore((s) => s + earned);
          setTotalScore((s) => s + earned);
          setStreak((s) => s + 1);
          setSolved(true);
          if (currentWord.category === 'Twi') setShowMeaning(true);
          gameSounds.win();
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          // Wrong — reset
          gameSounds.error();
          setAnswer(new Array(currentWord.word.replace(/\s/g, '').length).fill(null));
          setTiles(tiles.map((t) => ({ ...t, placed: false })));
        }
      }
    },
    [answer, tiles, solved, failed, currentWord, timeLeft, streak],
  );

  // ── Remove from slot ──────────────────────────────────────────────
  const removeFromSlot = useCallback(
    (slotIdx: number) => {
      if (solved || failed) return;
      const tile = answer[slotIdx];
      if (!tile) return;
      gameSounds.move();
      const newAnswer = [...answer];
      newAnswer[slotIdx] = null;
      setAnswer(newAnswer);
      setTiles(tiles.map((t) => (t.id === tile.id ? { ...t, placed: false } : t)));
    },
    [answer, tiles, solved, failed],
  );

  // ── Next word ─────────────────────────────────────────────────────
  const nextWord = useCallback(() => {
    if (round >= 10) {
      setGameOver(true);
      return;
    }
    setRound((r) => r + 1);
    setupWord();
  }, [round, setupWord]);

  // ── Restart ────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    setScore(0);
    setTotalScore(0);
    setStreak(0);
    setRound(1);
    setGameOver(false);
    setupWord();
  }, [setupWord]);

  // ── Styles ─────────────────────────────────────────────────────────
  const container: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(8px, 2vw, 16px)',
    width: '100%',
    maxWidth: 600,
    padding: 'clamp(8px, 2vw, 16px)',
    color: '#FAF6EE',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const hudRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: 'clamp(11px, 1.6vw, 14px)',
    gap: 8,
    flexWrap: 'wrap',
  };

  const categoryBadge: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: 12,
    background: 'rgba(0,107,63,0.3)',
    border: '1px solid rgba(0,107,63,0.5)',
    color: '#4CAF50',
    fontSize: 'clamp(10px, 1.4vw, 12px)',
    fontWeight: 600,
  };

  const timerBar: React.CSSProperties = {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  };

  const timerFill: React.CSSProperties = {
    height: '100%',
    borderRadius: 3,
    transition: 'width 1s linear, background-color 0.5s',
    width: `${(timeLeft / totalTime) * 100}%`,
    background:
      timeLeft > totalTime * 0.5
        ? '#4CAF50'
        : timeLeft > totalTime * 0.25
          ? '#FFC107'
          : '#F44336',
  };

  const tileSize = 'clamp(36px, 8vw, 56px)';

  const tileStyle = (placed: boolean): React.CSSProperties => ({
    width: tileSize,
    height: tileSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    fontSize: 'clamp(14px, 3vw, 22px)',
    fontWeight: 700,
    cursor: placed ? 'default' : 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease-out',
    background: placed ? 'rgba(255,255,255,0.05)' : 'rgba(252,209,22,0.15)',
    border: placed ? '2px dashed rgba(255,255,255,0.1)' : '2px solid rgba(252,209,22,0.4)',
    color: placed ? 'rgba(255,255,255,0.2)' : '#FCD116',
    opacity: placed ? 0.3 : 1,
  });

  const slotStyle = (tile: TileLetter | null): React.CSSProperties => ({
    width: tileSize,
    height: tileSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    fontSize: 'clamp(14px, 3vw, 22px)',
    fontWeight: 700,
    cursor: tile ? 'pointer' : 'default',
    userSelect: 'none',
    transition: 'all 0.15s ease-out',
    background: tile
      ? solved
        ? 'rgba(76,175,80,0.3)'
        : 'rgba(0,107,63,0.3)'
      : 'rgba(255,255,255,0.05)',
    border: tile
      ? solved
        ? '2px solid #4CAF50'
        : '2px solid rgba(0,107,63,0.5)'
      : '2px dashed rgba(255,255,255,0.15)',
    color: tile ? '#FAF6EE' : 'transparent',
  });

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

  // ── Game Over Screen ──────────────────────────────────────────────
  if (gameOver) {
    return (
      <div style={{ ...container, justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 'clamp(20px, 4vw, 32px)', fontWeight: 700 }}>Game Over!</div>
        <div style={{ fontSize: 'clamp(16px, 3vw, 24px)', color: '#FCD116', fontWeight: 600 }}>
          Total Score: {totalScore.toLocaleString()}
        </div>
        <div style={{ fontSize: 'clamp(12px, 2vw, 16px)', opacity: 0.6 }}>
          {round} words completed
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
      {/* HUD */}
      <div style={hudRow}>
        <span>
          <span style={{ color: 'rgba(250,246,238,0.5)' }}>Score </span>
          <span style={{ fontWeight: 700, color: '#FCD116' }}>{score}</span>
        </span>
        <span>
          <span style={{ color: 'rgba(250,246,238,0.5)' }}>Streak </span>
          <span style={{ fontWeight: 700, color: '#4CAF50' }}>{streak}</span>
        </span>
        <span>
          <span style={{ color: 'rgba(250,246,238,0.5)' }}>Round </span>
          <span style={{ fontWeight: 700 }}>
            {round}
            <span style={{ opacity: 0.4 }}>/10</span>
          </span>
        </span>
        <span>
          <span style={{ color: 'rgba(250,246,238,0.5)' }}>Time </span>
          <span style={{ fontWeight: 700, color: timeLeft < 10 ? '#F44336' : '#FAF6EE' }}>
            {timeLeft}s
          </span>
        </span>
      </div>

      {/* Timer bar */}
      <div style={timerBar}>
        <div style={timerFill} />
      </div>

      {/* Difficulty */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['Easy', 'Hard'] as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => {
              setDifficulty(d);
              setupWord();
            }}
            style={{
              ...btnStyle,
              padding: '4px 12px',
              background: difficulty === d ? 'rgba(252,209,22,0.2)' : 'transparent',
              border:
                difficulty === d
                  ? '1px solid rgba(252,209,22,0.5)'
                  : '1px solid rgba(255,255,255,0.1)',
              color: difficulty === d ? '#FCD116' : 'rgba(250,246,238,0.4)',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Category */}
      <div style={categoryBadge}>{currentWord.category}</div>

      {/* Hint */}
      {currentWord.hint && (
        <div style={{ fontSize: 'clamp(11px, 1.6vw, 14px)', opacity: 0.6, textAlign: 'center' }}>
          Hint: {currentWord.hint}
        </div>
      )}

      {/* Answer slots */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 'clamp(4px, 1vw, 8px)',
        }}
      >
        {answer.map((tile, i) => (
          <div key={i} style={slotStyle(tile)} onClick={() => removeFromSlot(i)}>
            {tile?.char}
          </div>
        ))}
      </div>

      {/* Scrambled tiles */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 'clamp(4px, 1vw, 8px)',
          marginTop: 8,
        }}
      >
        {tiles.map((tile) => (
          <div key={tile.id} style={tileStyle(tile.placed)} onClick={() => placeTile(tile)}>
            {tile.char}
          </div>
        ))}
      </div>

      {/* Twi meaning */}
      {showMeaning && currentWord.meaning && (
        <div
          style={{
            padding: 'clamp(8px, 1.5vw, 12px)',
            borderRadius: 8,
            background: 'rgba(0,107,63,0.2)',
            border: '1px solid rgba(0,107,63,0.4)',
            fontSize: 'clamp(12px, 1.8vw, 16px)',
            textAlign: 'center',
          }}
        >
          <strong>{currentWord.word}</strong> means &ldquo;{currentWord.meaning}&rdquo; in Twi
        </div>
      )}

      {/* Solved / Failed messages */}
      {solved && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: '#4CAF50', fontWeight: 600 }}>
            Correct!
          </div>
          <button onClick={nextWord} style={{ ...btnStyle, marginTop: 8 }}>
            {round >= 10 ? 'See Results' : 'Next Word'}
          </button>
        </div>
      )}

      {failed && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: '#F44336', fontWeight: 600 }}>
            Time&apos;s up! The word was:{' '}
            <span style={{ color: '#FCD116' }}>{currentWord.word.toUpperCase()}</span>
          </div>
          <button onClick={nextWord} style={{ ...btnStyle, marginTop: 8 }}>
            {round >= 10 ? 'See Results' : 'Next Word'}
          </button>
        </div>
      )}
    </div>
  );
};

export default WordScrambleGame;
