import { LevelData, TerrainType } from './types';

export const TEXT = {
  en: {
    title: "DUALITY",
    subtitle: "PARADOX",
    play: "PLAY",
    edit: "EDITOR",
    reset: "RESET (R)",
    switch: "SWITCH (SPACE)",
    moves: "MOVES",
    targets: "TARGETS",
    win: "LEVEL CLEAR!",
    next: "NEXT LEVEL",
    tools: "TOOLS",
    width: "W",
    height: "H",
    export: "COPY DATA",
    import: "PASTE DATA",
    test: "TEST LEVEL",
    back: "BACK TO EDIT",
    copied: "COPIED!",
    error: "INVALID DATA",
    p1: "P1 (WHITE)",
    p2: "P2 (BLACK)",
    instructions: "P1 moves on DARK. P2 moves on LIGHT. Inactive character becomes terrain.",
    controls: "WASD / Arrows to Move. SPACE to Switch.",
  },
  zh: {
    title: "双相",
    subtitle: "悖论",
    play: "开始游戏",
    edit: "关卡编辑",
    reset: "重置 (R)",
    switch: "切换 (空格)",
    moves: "步数",
    targets: "目标",
    win: "过关！",
    next: "下一关",
    tools: "工具",
    width: "宽",
    height: "高",
    export: "复制数据",
    import: "粘贴数据",
    test: "测试关卡",
    back: "返回编辑",
    copied: "已复制!",
    error: "数据无效",
    p1: "P1 (白)",
    p2: "P2 (黑)",
    instructions: "白方块走黑路，黑方块走白路。静止的角色会化为对方的路。",
    controls: "WASD / 方向键移动。空格键 / E 键切换角色。",
  }
};

const T = TerrainType;
const _ = T.Void;
const W = T.Wall;
const L = T.LightTile;
const D = T.DarkTile;

export const INITIAL_LEVEL: LevelData = {
  width: 7,
  height: 7,
  terrain: [
    [W, W, W, W, W, W, W],
    [W, D, D, W, W, D, W],
    [W, L, D, L, L, D, W],
    [W, L, D, W, L, D, W],
    [W, L, D, D, L, D, W],
    [W, L, W, W, L, L, W],
    [W, W, W, W, W, W, W],
  ],
  p1Start: { x: 1, y: 1 },
  p2Start: { x: 5, y: 5 },
  targets: [
    { x: 1, y: 5 },
    { x: 5, y: 1 },
  ]
};

// A slightly more complex second level
export const LEVEL_2: LevelData = {
  width: 9,
  height: 7,
  terrain: [
    [W, W, W, W, W, W, W, W, W],
    [W, D, D, _, _, _, L, L, W],
    [W, D, W, W, _, W, W, L, W],
    [W, D, _, _, _, _, _, L, W],
    [W, D, W, W, _, W, W, L, W],
    [W, D, D, _, _, _, L, L, W],
    [W, W, W, W, W, W, W, W, W],
  ],
  p1Start: { x: 1, y: 1 },
  p2Start: { x: 7, y: 1 },
  targets: [
    { x: 4, y: 3 } // In the middle void, need cooperation
  ]
};