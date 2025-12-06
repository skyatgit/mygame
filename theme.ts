// 3D 块体颜色主题配置
export const BLOCK_COLORS = {
  Wall: {
    base: '#5a5f6e',
    top: '#8a90a0',
    left: '#3d414d',
    right: '#32363f',
    bottom: '#1e2128'
  },
  LightFloor: {
    base: '#f7f7f4',
    top: '#f7f7f4',
    left: '#f7f7f4',
    right: '#f7f7f4',
    bottom: '#f7f7f4'
  },
  LightWall: {
    base: '#f7f7f4',
    top: '#ffffff',
    left: '#d8d8d5',
    right: '#c0c0bd',
    bottom: '#a0a09d'
  },
  DarkFloor: {
    base: '#1a1a1f',
    top: '#1a1a1f',
    left: '#1a1a1f',
    right: '#1a1a1f',
    bottom: '#1a1a1f'
  },
  DarkWall: {
    base: '#1a1a1f',
    top: '#3a3a3f',
    left: '#1a1a1f',
    right: '#0d0d12',
    bottom: '#000005'
  },
  Void: {
    base: '#111',
    top: '#1a1a1a',
    left: '#151515',
    right: '#0a0a0a',
    bottom: '#050505'
  }
} as const;

export type ColorPalette = typeof BLOCK_COLORS[keyof typeof BLOCK_COLORS];
