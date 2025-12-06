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
    base: '#f4f5f7',
    top: '#ffffff',
    left: '#c1c8da',
    right: '#b7bfd2',
    bottom: '#8e95aa'
  },
  DarkFloor: {
    base: '#1a1a1f',
    top: '#1a1a1f',
    left: '#1a1a1f',
    right: '#1a1a1f',
    bottom: '#1a1a1f'
  },
  DarkWall: {
    base: '#2d3241',
    top: '#939bad',
    left: '#2d3241',
    right: '#191c26',
    bottom: '#11131a'
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
