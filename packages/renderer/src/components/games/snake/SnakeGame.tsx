// ── Snake Game — Canvas Renderer ─────────────────────────────────────
import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  createInitialState,
  enqueueDirection,
  tick,
  GRID,
  type SnakeState,
  type Direction,
} from './snakeLogic';
import { gameSounds } from '../GameSoundEngine';

export interface SnakeGameProps {
  containerWidth: number;
  containerHeight: number;
}

// ── Key → Direction mapping ──────────────────────────────────────────
const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  W: 'UP',
  a: 'LEFT',
  A: 'LEFT',
  s: 'DOWN',
  S: 'DOWN',
  d: 'RIGHT',
  D: 'RIGHT',
};

const GHANA_GREEN = '#006B3F';
const GHANA_GREEN_LIGHT = '#00944F';
const BG_DARK = '#1B3A28';
const GRID_LINE = 'rgba(255,255,255,0.04)';

export const SnakeGame: React.FC<SnakeGameProps> = ({ containerWidth, containerHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SnakeState>(createInitialState());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(stateRef.current.speed);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  // Cell size: leave 2-cell padding (22 divisions)
  const cellSize = Math.floor(Math.min(containerWidth, containerHeight) / 22);
  const canvasSize = cellSize * GRID;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // ── Drawing ────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;
    const cs = cellSize;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = BG_DARK;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Grid lines
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cs, 0);
      ctx.lineTo(i * cs, canvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cs);
      ctx.lineTo(canvasSize, i * cs);
      ctx.stroke();
    }

    // Food (apple)
    const fx = s.food.x * cs + cs / 2;
    const fy = s.food.y * cs + cs / 2;
    const fr = cs * 0.38;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fillStyle = '#E53935';
    ctx.fill();
    // Stem
    ctx.strokeStyle = '#4E342E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy - fr);
    ctx.lineTo(fx + 2, fy - fr - cs * 0.18);
    ctx.stroke();
    // Leaf
    ctx.fillStyle = '#43A047';
    ctx.beginPath();
    ctx.ellipse(fx + 3, fy - fr - cs * 0.1, cs * 0.08, cs * 0.04, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Snake body
    s.snake.forEach((seg, i) => {
      const sx = seg.x * cs;
      const sy = seg.y * cs;
      const pad = cs * 0.08;
      const r = cs * 0.18;
      const isHead = i === 0;
      const isLight = i % 3 === 0 && i !== 0;
      const size = isHead ? cs + 2 : cs;
      const offset = isHead ? -1 : 0;

      ctx.fillStyle = isHead ? '#008C50' : isLight ? GHANA_GREEN_LIGHT : GHANA_GREEN;

      // Rounded rect
      const rx = sx + pad + offset;
      const ry = sy + pad + offset;
      const rw = size - pad * 2;
      const rh = size - pad * 2;
      ctx.beginPath();
      ctx.moveTo(rx + r, ry);
      ctx.lineTo(rx + rw - r, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
      ctx.lineTo(rx + rw, ry + rh - r);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
      ctx.lineTo(rx + r, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
      ctx.lineTo(rx, ry + r);
      ctx.quadraticCurveTo(rx, ry, rx + r, ry);
      ctx.closePath();
      ctx.fill();

      // Eyes on head
      if (isHead) {
        ctx.fillStyle = '#FFFFFF';
        const dir = s.direction;
        let ex1 = 0,
          ey1 = 0,
          ex2 = 0,
          ey2 = 0;
        const eo = cs * 0.2;
        const ec = cs * 0.12;
        const cx = sx + cs / 2;
        const cy = sy + cs / 2;
        switch (dir) {
          case 'RIGHT':
            ex1 = cx + eo;
            ey1 = cy - ec;
            ex2 = cx + eo;
            ey2 = cy + ec;
            break;
          case 'LEFT':
            ex1 = cx - eo;
            ey1 = cy - ec;
            ex2 = cx - eo;
            ey2 = cy + ec;
            break;
          case 'UP':
            ex1 = cx - ec;
            ey1 = cy - eo;
            ex2 = cx + ec;
            ey2 = cy - eo;
            break;
          case 'DOWN':
            ex1 = cx - ec;
            ey1 = cy + eo;
            ex2 = cx + ec;
            ey2 = cy + eo;
            break;
        }
        const eyeR = cs * 0.06;
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeR * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeR * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }, [cellSize, canvasSize, dpr]);

  // ── Game Loop ──────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const result = tick(stateRef.current);
    stateRef.current = result.state;
    setScore(result.state.score);
    setSpeed(result.state.speed);

    if (result.ate) gameSounds.score();
    if (result.died) {
      gameSounds.lose();
      setGameOver(true);
      draw();
      return;
    }

    draw();
    timerRef.current = setTimeout(gameLoop, result.state.speed);
  }, [draw]);

  // ── Start / Restart ────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stateRef.current = createInitialState();
    setScore(0);
    setSpeed(stateRef.current.speed);
    setGameOver(false);
    setStarted(false);
    draw();
  }, [draw]);

  // ── Keyboard ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Prevent arrow‑key page scroll
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' || e.key === 'Enter') {
        if (gameOver) {
          startGame();
          return;
        }
      }

      const dir = KEY_MAP[e.key];
      if (!dir) return;

      if (!started && !gameOver) {
        setStarted(true);
        stateRef.current = enqueueDirection({ ...stateRef.current, started: true }, dir);
        draw();
        timerRef.current = setTimeout(gameLoop, stateRef.current.speed);
        return;
      }

      stateRef.current = enqueueDirection(stateRef.current, dir);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, gameOver, gameLoop, startGame, draw]);

  // ── Mount / unmount ────────────────────────────────────────────────
  useEffect(() => {
    draw();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draw]);

  // ── Styles ─────────────────────────────────────────────────────────
  const wrapper: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  };

  const hud: React.CSSProperties = {
    display: 'flex',
    gap: 24,
    fontSize: 'clamp(11px, 1.8vw, 14px)',
    color: '#FAF6EE',
    fontVariantNumeric: 'tabular-nums',
  };

  const hudLabel: React.CSSProperties = {
    color: 'rgba(250,246,238,0.5)',
    fontSize: 'clamp(9px, 1.4vw, 11px)',
  };

  const hudValue: React.CSSProperties = {
    fontWeight: 700,
    color: '#FCD116',
  };

  const overlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    gap: 12,
    color: '#FAF6EE',
  };

  return (
    <div style={wrapper}>
      {/* HUD */}
      <div style={hud}>
        <div>
          <span style={hudLabel}>Score </span>
          <span style={hudValue}>{score}</span>
        </div>
        <div>
          <span style={hudLabel}>Speed </span>
          <span style={hudValue}>{speed}ms</span>
        </div>
        <div>
          <span style={hudLabel}>Length </span>
          <span style={hudValue}>{stateRef.current.snake.length}</span>
        </div>
      </div>

      {/* Canvas wrapper */}
      <div style={{ position: 'relative', lineHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={canvasSize * dpr}
          height={canvasSize * dpr}
          style={{
            width: canvasSize,
            height: canvasSize,
            borderRadius: 8,
            border: '2px solid rgba(252,209,22,0.2)',
          }}
        />

        {/* Start overlay */}
        {!started && !gameOver && (
          <div style={overlay}>
            <div style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 700 }}>Snake</div>
            <div style={{ fontSize: 'clamp(11px, 1.6vw, 14px)', opacity: 0.7 }}>
              Press an arrow key or WASD to start
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div style={overlay}>
            <div style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 700, color: '#CE1126' }}>
              Game Over
            </div>
            <div style={{ fontSize: 'clamp(14px, 2vw, 20px)', fontWeight: 600, color: '#FCD116' }}>
              Score: {score}
            </div>
            <div style={{ fontSize: 'clamp(10px, 1.4vw, 12px)', opacity: 0.6 }}>
              Press Space or Enter to restart
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnakeGame;
