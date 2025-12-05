export enum TerrainType {
  Void = 0,
  Wall = 1,
  LightTile = 2, // Walkable for P2 (Black)
  DarkTile = 3,  // Walkable for P1 (White)
}

export interface Position {
  x: number;
  y: number;
}

export enum CharacterType {
  P1_White = 'p1', // Moves on Dark
  P2_Black = 'p2', // Moves on Light
}

export interface LevelData {
  width: number;
  height: number;
  terrain: TerrainType[][];
  p1Start: Position;
  p2Start: Position;
  targets: Position[];
}

export interface GameState {
  p1Pos: Position;
  p2Pos: Position;
  activeChar: CharacterType;
  collectedTargets: number; // Count or IDs
}

export type EditorTool = 'wall' | 'light' | 'dark' | 'p1' | 'p2' | 'target' | 'eraser';

export type Lang = 'en' | 'zh';