// ── OwareGame.tsx — Canvas-rendered Oware (Abapa) ─────────────────────────
// Flagship GovPlay game: Ghana's national board game, beautifully rendered.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  type OwareState,
  createInitialState,
  getValidMoves,
  makeMove,
  cloneOwareState,
  PITS_PER_PLAYER,
  TOTAL_SEEDS,
} from './owareLogic';
import { getBestMove } from './owareAI';
import { GameShell } from '../GameShell';
import { useGameStore } from '@/store/gameStore';
import { gameSounds } from '../GameSoundEngine';

// ── Types ────────────────────────────────────────────────────────────────────

interface OwareGameProps {
  containerWidth: number;
  containerHeight: number;
}

type GameMode = 'ai' | 'local';
type Difficulty = 'easy' | 'medium' | 'hard';

interface SeedPosition {
  x: number;
  y: number;
  color: string;
  radius: number;
}

interface Animation {
  type: 'sow' | 'capture';
  seeds: { fromX: number; fromY: number; toX: number; toY: number; color: string }[];
  currentIndex: number;
  startTime: number;
  stepDuration: number;
  onComplete: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const GAME_ID = 'oware';
const SEED_COLORS = [
  '#8B6914', '#A0522D', '#6B4226', '#D2691E', '#8B4513',
  '#A67C52', '#7B5B3A', '#C19A6B', '#704214', '#9C6B30',
];

// ── Seed Layout Helper ───────────────────────────────────────────────────────
// Distribute seeds visually inside a circular pit

function layoutSeeds(
  cx: number,
  cy: number,
  pitRadius: number,
  count: number,
  seedR: number,
): SeedPosition[] {
  const seeds: SeedPosition[] = [];
  if (count === 0) return seeds;

  const maxShow = Math.min(count, 20); // Don't draw more than 20 individual seeds
  const innerR = pitRadius * 0.6;

  if (maxShow === 1) {
    seeds.push({ x: cx, y: cy, color: SEED_COLORS[0], radius: seedR });
  } else if (maxShow <= 4) {
    const angleStep = (Math.PI * 2) / maxShow;
    const r = innerR * 0.35;
    for (let i = 0; i < maxShow; i++) {
      const angle = angleStep * i - Math.PI / 2;
      seeds.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        color: SEED_COLORS[i % SEED_COLORS.length],
        radius: seedR,
      });
    }
  } else {
    // Spiral layout for many seeds
    for (let i = 0; i < maxShow; i++) {
      const t = i / maxShow;
      const angle = t * Math.PI * 4 + (i * 0.5);
      const r = innerR * (0.15 + t * 0.55);
      seeds.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        color: SEED_COLORS[i % SEED_COLORS.length],
        radius: seedR * (0.85 + Math.random() * 0.3),
      });
    }
  }

  return seeds;
}

// ── Component ────────────────────────────────────────────────────────────────

export const OwareGame: React.FC<OwareGameProps> = ({ containerWidth, containerHeight }) => {
  // ── State ──────────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<OwareState>(createInitialState);
  const [history, setHistory] = useState<OwareState[]>([]);
  const [mode, setMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [hoveredPit, setHoveredPit] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [message, setMessage] = useState<string>('');
  const [messageTimer, setMessageTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const rafRef = useRef<number>(0);

  const { incrementStat, addHighScore, addTimePlayed } = useGameStore.getState();

  // ── Board Geometry ─────────────────────────────────────────────────
  // Aspect ratio ~3:1, responsive to container

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // Board fills container with padding
  const padding = Math.max(8, Math.min(containerWidth, containerHeight) * 0.02);
  const maxBoardW = containerWidth - padding * 2;
  const maxBoardH = containerHeight - padding * 2;

  // Target 3:1 aspect ratio, fit within container
  let boardW: number;
  let boardH: number;

  if (maxBoardW / 3 <= maxBoardH) {
    boardW = maxBoardW;
    boardH = boardW / 3;
  } else {
    boardH = maxBoardH;
    boardW = boardH * 3;
  }

  // Minimum playable
  boardW = Math.max(boardW, 300);
  boardH = Math.max(boardH, 100);

  const canvasW = boardW + padding * 2;
  const canvasH = boardH + padding * 2;

  // Pit geometry
  const houseW = boardW * 0.1; // scoring houses width
  const playAreaW = boardW - houseW * 2;
  const pitSpacing = playAreaW / PITS_PER_PLAYER;
  const pitRadius = Math.min(pitSpacing * 0.38, boardH * 0.2);
  const seedRadius = Math.max(pitRadius * 0.12, 2);

  // Board position (centered in canvas)
  const boardX = padding;
  const boardY = padding;

  // Row Y positions
  const topRowY = boardY + boardH * 0.3;
  const bottomRowY = boardY + boardH * 0.7;

  // Scoring house centers
  const leftHouseX = boardX + houseW * 0.5;
  const rightHouseX = boardX + boardW - houseW * 0.5;

  /** Get center position of a pit by index */
  const getPitCenter = useCallback(
    (pitIdx: number): { x: number; y: number } => {
      if (pitIdx < PITS_PER_PLAYER) {
        // Bottom row: 0-5, left to right
        const x = boardX + houseW + pitSpacing * (pitIdx + 0.5);
        return { x, y: bottomRowY };
      } else {
        // Top row: 6-11, right to left (so pit 6 is rightmost, 11 is leftmost)
        const topIdx = pitIdx - PITS_PER_PLAYER;
        const x = boardX + houseW + pitSpacing * (PITS_PER_PLAYER - 1 - topIdx + 0.5);
        return { x, y: topRowY };
      }
    },
    [boardX, houseW, pitSpacing, bottomRowY, topRowY],
  );

  /** Get scoring house center for a player */
  const getHouseCenter = useCallback(
    (player: 0 | 1): { x: number; y: number } => {
      // Player 0's house is on the right, player 1's on the left
      return {
        x: player === 0 ? rightHouseX : leftHouseX,
        y: boardY + boardH * 0.5,
      };
    },
    [rightHouseX, leftHouseX, boardY, boardH],
  );

  // ── Flash Message ──────────────────────────────────────────────────
  const showMessage = useCallback(
    (msg: string, duration = 2000) => {
      if (messageTimer) clearTimeout(messageTimer);
      setMessage(msg);
      const timer = setTimeout(() => setMessage(''), duration);
      setMessageTimer(timer);
    },
    [messageTimer],
  );

  // ── New Game ───────────────────────────────────────────────────────
  const startNewGame = useCallback(() => {
    // Track time from previous game
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    if (elapsed > 5) addTimePlayed(GAME_ID, elapsed);

    setGameState(createInitialState());
    setHistory([]);
    setAnimating(false);
    animationRef.current = null;
    setHoveredPit(null);
    setMessage('');
    setGameStartTime(Date.now());
  }, [gameStartTime, addTimePlayed]);

  // ── Handle Game Over ───────────────────────────────────────────────
  useEffect(() => {
    if (!gameState.gameOver) return;

    incrementStat(GAME_ID, 'played');

    const playerScore = gameState.scores[0];
    addHighScore(GAME_ID, playerScore, 'Player');

    if (gameState.winner === 0) {
      incrementStat(GAME_ID, 'won');
      gameSounds.win();
      showMessage('You win! Ayekoo!', 5000);
    } else if (gameState.winner === 1) {
      incrementStat(GAME_ID, 'lost');
      gameSounds.lose();
      showMessage(mode === 'ai' ? 'Computer wins!' : 'Player 2 wins!', 5000);
    } else {
      gameSounds.score();
      showMessage('Draw game!', 5000);
    }
  }, [gameState.gameOver]);

  // ── Undo ───────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (history.length === 0 || animating) return;
    // In AI mode, undo 2 moves (player + AI)
    const steps = mode === 'ai' ? 2 : 1;
    const target = Math.max(0, history.length - steps);
    const restored = cloneOwareState(history[target]);
    setGameState(restored);
    setHistory(history.slice(0, target));
    gameSounds.move();
  }, [history, animating, mode]);

  // ── Sow Animation ─────────────────────────────────────────────────

  const animateSow = useCallback(
    (
      sowPath: number[],
      fromPit: number,
      onComplete: () => void,
    ) => {
      if (sowPath.length === 0) {
        onComplete();
        return;
      }

      setAnimating(true);
      let step = 0;
      const from = getPitCenter(fromPit);

      const doStep = () => {
        if (step >= sowPath.length) {
          setAnimating(false);
          onComplete();
          return;
        }

        gameSounds.move();
        step++;

        // Force a re-render to show the intermediate state
        setTimeout(doStep, 100);
      };

      doStep();
    },
    [getPitCenter],
  );

  // ── Execute Move (with animation) ─────────────────────────────────

  const executeMove = useCallback(
    (pit: number) => {
      if (animating || gameState.gameOver) return;

      const valid = getValidMoves(gameState);
      if (!valid.includes(pit)) {
        gameSounds.error();
        return;
      }

      // Save history
      setHistory((prev) => [...prev, cloneOwareState(gameState)]);

      try {
        const { newState, captured, sowPath } = makeMove(gameState, pit);

        // Animate sowing
        setAnimating(true);

        // Step through sow path with delays
        let stepIdx = 0;
        const intermediateState = cloneOwareState(gameState);
        const seeds = intermediateState.pits[pit];
        intermediateState.pits[pit] = 0;

        const doSowStep = () => {
          if (stepIdx < sowPath.length) {
            const targetPit = sowPath[stepIdx];
            intermediateState.pits[targetPit]++;
            gameSounds.move();
            stepIdx++;

            // Update display with intermediate state
            setGameState({
              ...intermediateState,
              scores: gameState.scores,
              currentPlayer: gameState.currentPlayer,
              gameOver: false,
              winner: null,
            });

            setTimeout(doSowStep, Math.max(60, 120 - sowPath.length * 3));
          } else {
            // Sowing complete — apply captures
            if (captured > 0) {
              gameSounds.capture();
              showMessage(`Captured ${captured} seeds!`, 1500);
            }

            // Set final state
            setGameState(newState);
            setAnimating(false);

            // AI move in AI mode
            if (mode === 'ai' && !newState.gameOver && newState.currentPlayer === 1) {
              setTimeout(() => triggerAIMove(newState), 400);
            }
          }
        };

        setTimeout(doSowStep, 100);
      } catch {
        gameSounds.error();
        setAnimating(false);
      }
    },
    [gameState, animating, mode, showMessage],
  );

  // ── AI Move ────────────────────────────────────────────────────────

  const triggerAIMove = useCallback(
    (state: OwareState) => {
      if (state.gameOver || state.currentPlayer !== 1) return;

      setAnimating(true);

      // Run AI in a timeout to not block rendering
      setTimeout(() => {
        try {
          const aiPit = getBestMove(state, difficulty);

          // Save history
          setHistory((prev) => [...prev, cloneOwareState(state)]);

          const { newState, captured, sowPath } = makeMove(state, aiPit);

          // Animate AI sowing
          let stepIdx = 0;
          const intermediateState = cloneOwareState(state);
          intermediateState.pits[aiPit] = 0;

          const doSowStep = () => {
            if (stepIdx < sowPath.length) {
              const targetPit = sowPath[stepIdx];
              intermediateState.pits[targetPit]++;
              gameSounds.move();
              stepIdx++;

              setGameState({
                ...intermediateState,
                scores: state.scores,
                currentPlayer: state.currentPlayer,
                gameOver: false,
                winner: null,
              });

              setTimeout(doSowStep, Math.max(60, 120 - sowPath.length * 3));
            } else {
              if (captured > 0) {
                gameSounds.capture();
                showMessage(
                  `${mode === 'ai' ? 'Computer' : 'Player 2'} captured ${captured}!`,
                  1500,
                );
              }

              setGameState(newState);
              setAnimating(false);
            }
          };

          setTimeout(doSowStep, 100);
        } catch {
          setAnimating(false);
        }
      }, 50);
    },
    [difficulty, mode, showMessage],
  );

  // ── Canvas Click Handler ───────────────────────────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (animating || gameState.gameOver || showModeSelect) return;

      // In AI mode, only player 0 can click
      if (mode === 'ai' && gameState.currentPlayer !== 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // Check which pit was clicked
      const valid = getValidMoves(gameState);

      for (const pitIdx of valid) {
        const { x, y } = getPitCenter(pitIdx);
        const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
        if (dist <= pitRadius * 1.2) {
          executeMove(pitIdx);
          return;
        }
      }
    },
    [animating, gameState, showModeSelect, mode, canvasW, canvasH, getPitCenter, pitRadius, executeMove],
  );

  // ── Canvas Hover Handler ───────────────────────────────────────────

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (animating || gameState.gameOver || showModeSelect) {
        setHoveredPit(null);
        return;
      }

      if (mode === 'ai' && gameState.currentPlayer !== 0) {
        setHoveredPit(null);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const valid = getValidMoves(gameState);
      let found: number | null = null;

      for (const pitIdx of valid) {
        const { x, y } = getPitCenter(pitIdx);
        const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
        if (dist <= pitRadius * 1.2) {
          found = pitIdx;
          break;
        }
      }

      setHoveredPit(found);
    },
    [animating, gameState, showModeSelect, mode, canvasW, canvasH, getPitCenter, pitRadius],
  );

  // ── Canvas Rendering ───────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // ── Clear ────────────────────────────────────────────────────
    ctx.clearRect(0, 0, canvasW, canvasH);

    // ── Background gradient ──────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
    bgGrad.addColorStop(0, '#1A1D27');
    bgGrad.addColorStop(1, '#12141C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // ── Board background (wood texture) ──────────────────────────
    const brdRadius = boardH * 0.12;
    drawRoundRect(ctx, boardX, boardY, boardW, boardH, brdRadius);

    // Wood gradient
    const woodGrad = ctx.createLinearGradient(boardX, boardY, boardX, boardY + boardH);
    woodGrad.addColorStop(0, '#5C3A1E');
    woodGrad.addColorStop(0.3, '#7A4F2E');
    woodGrad.addColorStop(0.5, '#8B5E3C');
    woodGrad.addColorStop(0.7, '#7A4F2E');
    woodGrad.addColorStop(1, '#4A2E14');
    ctx.fillStyle = woodGrad;
    ctx.fill();

    // Wood grain (horizontal lines)
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.06;
    for (let y = boardY; y < boardY + boardH; y += 3) {
      ctx.beginPath();
      ctx.moveTo(boardX, y + Math.sin(y * 0.1) * 2);
      for (let x = boardX; x < boardX + boardW; x += 5) {
        ctx.lineTo(x, y + Math.sin((x + y) * 0.08) * 2.5);
      }
      ctx.strokeStyle = '#2A1A0A';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Subtle noise texture
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 600; i++) {
      const nx = boardX + Math.random() * boardW;
      const ny = boardY + Math.random() * boardH;
      ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#FFF';
      ctx.fillRect(nx, ny, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Board border
    drawRoundRect(ctx, boardX, boardY, boardW, boardH, brdRadius);
    ctx.strokeStyle = '#3A2410';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner rim
    drawRoundRect(ctx, boardX + 3, boardY + 3, boardW - 6, boardH - 6, brdRadius - 2);
    ctx.strokeStyle = 'rgba(200,160,100,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Divider line (between rows) ──────────────────────────────
    ctx.beginPath();
    ctx.moveTo(boardX + houseW, boardY + boardH * 0.5);
    ctx.lineTo(boardX + boardW - houseW, boardY + boardH * 0.5);
    ctx.strokeStyle = 'rgba(42,26,10,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Scoring Houses ───────────────────────────────────────────
    const houseRadius = Math.min(houseW * 0.4, boardH * 0.35);

    for (let p = 0; p < 2; p++) {
      const { x: hx, y: hy } = getHouseCenter(p as 0 | 1);

      // House depression
      const houseGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, houseRadius);
      houseGrad.addColorStop(0, '#2A1A0A');
      houseGrad.addColorStop(0.7, '#3A2410');
      houseGrad.addColorStop(1, '#5C3A1E');

      ctx.beginPath();
      ctx.ellipse(hx, hy, houseRadius, houseRadius * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = houseGrad;
      ctx.fill();

      // House inner shadow
      ctx.beginPath();
      ctx.ellipse(hx, hy, houseRadius, houseRadius * 0.9, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Score number
      const scoreFontSize = Math.max(12, boardH * 0.18);
      ctx.font = `bold ${scoreFontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FCD116';
      ctx.fillText(String(gameState.scores[p as 0 | 1]), hx, hy);

      // "P1" / "P2" label
      const labelSize = Math.max(8, boardH * 0.07);
      ctx.font = `${labelSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(250,246,238,0.4)';
      const label =
        mode === 'ai'
          ? p === 0
            ? 'You'
            : 'CPU'
          : p === 0
            ? 'P1'
            : 'P2';
      ctx.fillText(label, hx, hy + houseRadius * 0.7);
    }

    // ── Current Player Indicator (gold glow) ─────────────────────
    if (!gameState.gameOver) {
      const glowY = gameState.currentPlayer === 0 ? bottomRowY : topRowY;
      const glowGrad = ctx.createLinearGradient(
        boardX + houseW,
        glowY - pitRadius * 1.5,
        boardX + houseW,
        glowY + pitRadius * 1.5,
      );
      glowGrad.addColorStop(0, 'rgba(252,209,22,0)');
      glowGrad.addColorStop(0.5, 'rgba(252,209,22,0.06)');
      glowGrad.addColorStop(1, 'rgba(252,209,22,0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(
        boardX + houseW,
        glowY - pitRadius * 1.5,
        playAreaW,
        pitRadius * 3,
      );
    }

    // ── Pits ─────────────────────────────────────────────────────
    const validMoves = getValidMoves(gameState);
    const canInteract =
      !animating &&
      !gameState.gameOver &&
      !showModeSelect &&
      (mode === 'local' || gameState.currentPlayer === 0);

    for (let i = 0; i < 12; i++) {
      const { x, y } = getPitCenter(i);
      const seedCount = gameState.pits[i];
      const isValid = canInteract && validMoves.includes(i);
      const isHovered = hoveredPit === i;

      // Pit depression
      const pitGrad = ctx.createRadialGradient(x, y - pitRadius * 0.1, 0, x, y, pitRadius);
      pitGrad.addColorStop(0, '#1E1008');
      pitGrad.addColorStop(0.6, '#2A1A0A');
      pitGrad.addColorStop(1, '#4A2E14');

      ctx.beginPath();
      ctx.arc(x, y, pitRadius, 0, Math.PI * 2);
      ctx.fillStyle = pitGrad;
      ctx.fill();

      // Inner shadow ring
      ctx.beginPath();
      ctx.arc(x, y, pitRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Highlight ring for valid moves
      if (isValid) {
        ctx.beginPath();
        ctx.arc(x, y, pitRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered
          ? 'rgba(252,209,22,0.7)'
          : 'rgba(252,209,22,0.2)';
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.stroke();

        if (isHovered) {
          // Glow effect
          ctx.save();
          ctx.shadowColor = 'rgba(252,209,22,0.4)';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(x, y, pitRadius + 1, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(252,209,22,0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw seeds
      const seeds = layoutSeeds(x, y, pitRadius, seedCount, seedRadius);
      for (const seed of seeds) {
        // 3D seed with radial gradient
        const sGrad = ctx.createRadialGradient(
          seed.x - seedRadius * 0.3,
          seed.y - seedRadius * 0.3,
          0,
          seed.x,
          seed.y,
          seed.radius,
        );
        sGrad.addColorStop(0, lightenColor(seed.color, 40));
        sGrad.addColorStop(0.7, seed.color);
        sGrad.addColorStop(1, darkenColor(seed.color, 30));

        ctx.beginPath();
        ctx.arc(seed.x, seed.y, seed.radius, 0, Math.PI * 2);
        ctx.fillStyle = sGrad;
        ctx.fill();

        // Tiny highlight
        ctx.beginPath();
        ctx.arc(
          seed.x - seedRadius * 0.2,
          seed.y - seedRadius * 0.2,
          seedRadius * 0.3,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();
      }

      // Seed count label
      if (seedCount > 0) {
        const countSize = Math.max(9, pitRadius * 0.45);
        ctx.font = `bold ${countSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow for readability
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(String(seedCount), x + 0.5, y + pitRadius + countSize * 0.8 + 0.5);
        ctx.fillStyle = '#FAF6EE';
        ctx.fillText(String(seedCount), x, y + pitRadius + countSize * 0.8);
      }
    }

    // ── Player Labels ────────────────────────────────────────────
    const playerLabelSize = Math.max(9, boardH * 0.08);
    ctx.font = `600 ${playerLabelSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';

    // Bottom label
    const bottomLabel = mode === 'ai' ? 'You' : 'Player 1';
    ctx.fillStyle =
      gameState.currentPlayer === 0 && !gameState.gameOver
        ? '#FCD116'
        : 'rgba(250,246,238,0.5)';
    ctx.fillText(bottomLabel, boardX + boardW * 0.5, boardY + boardH - boardH * 0.04);

    // Top label
    const topLabel = mode === 'ai' ? 'Computer' : 'Player 2';
    ctx.fillStyle =
      gameState.currentPlayer === 1 && !gameState.gameOver
        ? '#FCD116'
        : 'rgba(250,246,238,0.5)';
    ctx.fillText(topLabel, boardX + boardW * 0.5, boardY + boardH * 0.08);

    // ── Pit index markers (small, subtle) ────────────────────────
    const markerSize = Math.max(6, boardH * 0.05);
    ctx.font = `${markerSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(250,246,238,0.15)';
    ctx.textAlign = 'center';

    // Bottom row: A-F
    for (let i = 0; i < PITS_PER_PLAYER; i++) {
      const { x } = getPitCenter(i);
      ctx.fillText(String.fromCharCode(65 + i), x, bottomRowY + pitRadius + markerSize * 2.5);
    }

    // Top row: a-f
    for (let i = 0; i < PITS_PER_PLAYER; i++) {
      const { x } = getPitCenter(i + PITS_PER_PLAYER);
      ctx.fillText(String.fromCharCode(97 + (PITS_PER_PLAYER - 1 - i)), x, topRowY - pitRadius - markerSize * 1.2);
    }

    // ── Message overlay ──────────────────────────────────────────
    if (message) {
      const msgFontSize = Math.max(14, boardH * 0.14);
      ctx.font = `bold ${msgFontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const mx = canvasW * 0.5;
      const my = canvasH * 0.5;
      const tw = ctx.measureText(message).width;

      // Background pill
      const px = 16;
      const py = 8;
      drawRoundRect(ctx, mx - tw / 2 - px, my - msgFontSize / 2 - py, tw + px * 2, msgFontSize + py * 2, 8);
      ctx.fillStyle = 'rgba(26,29,39,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(252,209,22,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#FCD116';
      ctx.fillText(message, mx, my);
    }

    // ── Mode Select Overlay ──────────────────────────────────────
    if (showModeSelect) {
      ctx.fillStyle = 'rgba(26,29,39,0.92)';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const titleSize = Math.max(18, boardH * 0.22);
      ctx.font = `bold ${titleSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FCD116';
      ctx.fillText('Oware', canvasW * 0.5, canvasH * 0.2);

      const subSize = Math.max(11, boardH * 0.1);
      ctx.font = `${subSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(250,246,238,0.6)';
      ctx.fillText("Ghana's Royal Game of Strategy", canvasW * 0.5, canvasH * 0.2 + titleSize * 0.8);

      // Mode buttons are drawn but interaction is via overlay div
      const btnW = Math.min(180, boardW * 0.3);
      const btnH = Math.max(36, boardH * 0.25);
      const gap = 16;

      // VS Computer
      const btn1X = canvasW * 0.5 - btnW - gap / 2;
      const btn1Y = canvasH * 0.55;
      drawRoundRect(ctx, btn1X, btn1Y, btnW, btnH, 8);
      ctx.fillStyle = 'rgba(252,209,22,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(252,209,22,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `600 ${Math.max(11, btnH * 0.35)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#FCD116';
      ctx.fillText('vs Computer', btn1X + btnW / 2, btn1Y + btnH / 2);

      // 2 Players
      const btn2X = canvasW * 0.5 + gap / 2;
      drawRoundRect(ctx, btn2X, btn1Y, btnW, btnH, 8);
      ctx.fillStyle = 'rgba(206,17,38,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(206,17,38,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#CE1126';
      ctx.fillText('2 Players', btn2X + btnW / 2, btn1Y + btnH / 2);

      // Instruction
      const instrSize = Math.max(9, boardH * 0.07);
      ctx.font = `${instrSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(250,246,238,0.35)';
      ctx.fillText('Sow seeds counterclockwise, capture 2s and 3s', canvasW * 0.5, canvasH * 0.85);
    }
  }, [
    gameState,
    hoveredPit,
    animating,
    showModeSelect,
    message,
    mode,
    canvasW,
    canvasH,
    dpr,
    boardX,
    boardY,
    boardW,
    boardH,
    houseW,
    playAreaW,
    pitRadius,
    seedRadius,
    pitSpacing,
    topRowY,
    bottomRowY,
    getPitCenter,
    getHouseCenter,
  ]);

  // ── Mode Selection Click Handler ───────────────────────────────────

  const handleModeClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!showModeSelect) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const btnW = Math.min(180, boardW * 0.3);
      const btnH = Math.max(36, boardH * 0.25);
      const gap = 16;
      const btn1X = canvasW * 0.5 - btnW - gap / 2;
      const btn2X = canvasW * 0.5 + gap / 2;
      const btnY = canvasH * 0.55;

      if (mx >= btn1X && mx <= btn1X + btnW && my >= btnY && my <= btnY + btnH) {
        setMode('ai');
        setShowModeSelect(false);
        startNewGame();
        gameSounds.move();
      } else if (mx >= btn2X && mx <= btn2X + btnW && my >= btnY && my <= btnY + btnH) {
        setMode('local');
        setShowModeSelect(false);
        startNewGame();
        gameSounds.move();
      }
    },
    [showModeSelect, canvasW, canvasH, boardW, boardH, startNewGame],
  );

  // ── Combined click handler ─────────────────────────────────────────

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (showModeSelect) {
        handleModeClick(e);
      } else {
        handleCanvasClick(e);
      }
    },
    [showModeSelect, handleModeClick, handleCanvasClick],
  );

  // ── Cursor style ───────────────────────────────────────────────────

  const cursorStyle =
    showModeSelect || hoveredPit !== null ? 'pointer' : 'default';

  // ── Score for GameShell ────────────────────────────────────────────

  const displayScore = gameState.scores[0];

  // ── Handle New Game (with mode select) ─────────────────────────────

  const handleNewGame = useCallback(() => {
    setShowModeSelect(true);
    startNewGame();
  }, [startNewGame]);

  // ── Difficulty change ──────────────────────────────────────────────

  const handleDifficultyChange = useCallback((d: string) => {
    setDifficulty(d as Difficulty);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <GameShell
      gameId={GAME_ID}
      gameName="Oware"
      score={displayScore}
      hasUndo={history.length > 0 && !animating && !gameState.gameOver}
      onUndo={handleUndo}
      onNewGame={handleNewGame}
      hasDifficulty={mode === 'ai'}
      difficulty={difficulty}
      onDifficultyChange={handleDifficultyChange}
      difficulties={['easy', 'medium', 'hard']}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoveredPit(null)}
        style={{
          cursor: cursorStyle,
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          borderRadius: 8,
        }}
      />
    </GameShell>
  );
};

// ── Canvas Helpers ───────────────────────────────────────────────────────────

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

export default OwareGame;
