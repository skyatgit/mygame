// 游戏配置常量
export const GAME_CONFIG = {
  MOVE_COOLDOWN_MS: 280,
  SWITCH_COOLDOWN_MS: 200,
  GAMEPAD_AXIS_THRESHOLD: 0.5,
  KEYBOARD_REPEAT_DELAY_MS: 280,
} as const;

// 键盘按键常量
export const SWITCH_KEYS = [' ', 'Enter', 'e', 'E'] as const;
export const RESET_KEYS = ['r', 'R'] as const;

// 键盘方向映射
export type DirectionKey = 'up' | 'down' | 'left' | 'right';
export type DirectionVector = { key: DirectionKey; dx: number; dy: number };

export const KEYBOARD_DIRECTION_MAP: Record<string, DirectionVector> = {
  ArrowUp: { key: 'up', dx: 0, dy: -1 },
  w: { key: 'up', dx: 0, dy: -1 },
  W: { key: 'up', dx: 0, dy: -1 },
  ArrowDown: { key: 'down', dx: 0, dy: 1 },
  s: { key: 'down', dx: 0, dy: 1 },
  S: { key: 'down', dx: 0, dy: 1 },
  ArrowLeft: { key: 'left', dx: -1, dy: 0 },
  a: { key: 'left', dx: -1, dy: 0 },
  A: { key: 'left', dx: -1, dy: 0 },
  ArrowRight: { key: 'right', dx: 1, dy: 0 },
  d: { key: 'right', dx: 1, dy: 0 },
  D: { key: 'right', dx: 1, dy: 0 }
} as const;
