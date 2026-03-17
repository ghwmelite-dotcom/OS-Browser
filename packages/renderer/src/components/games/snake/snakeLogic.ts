// ── Snake Game Logic ─────────────────────────────────────────────────
// Pure logic layer — no DOM / React dependencies.

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Coord {
  x: number;
  y: number;
}

export interface SnakeState {
  /** Head‑first list of body segments */
  snake: Coord[];
  food: Coord;
  direction: Direction;
  /** Buffered next directions to prevent 180° reversal */
  directionQueue: Direction[];
  score: number;
  foodEaten: number;
  /** Current tick interval in ms */
  speed: number;
  gameOver: boolean;
  started: boolean;
}

// ── Constants ────────────────────────────────────────────────────────
export const GRID = 20;
export const INITIAL_SPEED = 150;
export const SPEED_DECREASE = 5;
export const MIN_SPEED = 60;
export const SPEED_INCREASE_EVERY = 5;

// ── Helpers ──────────────────────────────────────────────────────────

const opposites: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

function randomFoodPosition(snake: Coord[]): Coord {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  const free: Coord[] = [];
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free.length > 0 ? free[Math.floor(Math.random() * free.length)] : { x: 0, y: 0 };
}

// ── Factory ──────────────────────────────────────────────────────────

export function createInitialState(): SnakeState {
  const center = Math.floor(GRID / 2);
  const snake: Coord[] = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
  return {
    snake,
    food: randomFoodPosition(snake),
    direction: 'RIGHT',
    directionQueue: [],
    score: 0,
    foodEaten: 0,
    speed: INITIAL_SPEED,
    gameOver: false,
    started: false,
  };
}

// ── Input ────────────────────────────────────────────────────────────

export function enqueueDirection(state: SnakeState, dir: Direction): SnakeState {
  if (state.gameOver) return state;

  // Determine effective current direction (last queued or current)
  const effective =
    state.directionQueue.length > 0
      ? state.directionQueue[state.directionQueue.length - 1]
      : state.direction;

  // Ignore if same or opposite
  if (dir === effective || dir === opposites[effective]) return state;

  // Max 2 buffered directions per tick
  if (state.directionQueue.length >= 2) return state;

  return {
    ...state,
    directionQueue: [...state.directionQueue, dir],
    started: true,
  };
}

// ── Tick ─────────────────────────────────────────────────────────────

export interface TickResult {
  state: SnakeState;
  ate: boolean;
  died: boolean;
}

export function tick(prev: SnakeState): TickResult {
  if (prev.gameOver) return { state: prev, ate: false, died: false };

  // Consume one direction from the queue
  let direction = prev.direction;
  let queue = [...prev.directionQueue];
  if (queue.length > 0) {
    direction = queue.shift()!;
  }

  const head = prev.snake[0];
  let nx = head.x;
  let ny = head.y;

  switch (direction) {
    case 'UP':
      ny -= 1;
      break;
    case 'DOWN':
      ny += 1;
      break;
    case 'LEFT':
      nx -= 1;
      break;
    case 'RIGHT':
      nx += 1;
      break;
  }

  // Wall collision
  if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
    return {
      state: { ...prev, direction, directionQueue: queue, gameOver: true },
      ate: false,
      died: true,
    };
  }

  // Self collision (check against all but the tail that will move)
  const willEat = nx === prev.food.x && ny === prev.food.y;
  const bodyToCheck = willEat ? prev.snake : prev.snake.slice(0, -1);
  if (bodyToCheck.some((s) => s.x === nx && s.y === ny)) {
    return {
      state: { ...prev, direction, directionQueue: queue, gameOver: true },
      ate: false,
      died: true,
    };
  }

  const newHead: Coord = { x: nx, y: ny };
  const newSnake = willEat ? [newHead, ...prev.snake] : [newHead, ...prev.snake.slice(0, -1)];

  let foodEaten = prev.foodEaten;
  let speed = prev.speed;
  let score = prev.score;
  let food = prev.food;

  if (willEat) {
    foodEaten += 1;
    score += 10;
    food = randomFoodPosition(newSnake);

    if (foodEaten % SPEED_INCREASE_EVERY === 0) {
      speed = Math.max(MIN_SPEED, speed - SPEED_DECREASE);
    }
  }

  return {
    state: {
      snake: newSnake,
      food,
      direction,
      directionQueue: queue,
      score,
      foodEaten,
      speed,
      gameOver: false,
      started: prev.started,
    },
    ate: willEat,
    died: false,
  };
}
