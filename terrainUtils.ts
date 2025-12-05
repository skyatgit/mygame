import { LevelData, GameState, TerrainType, CharacterType } from './types';

export const getEffectiveTerrain = (
  level: LevelData,
  state: GameState | undefined,
  x: number,
  y: number
): TerrainType => {
  if (y < 0 || y >= level.height || x < 0 || x >= level.width) {
    return TerrainType.Void;
  }

  const base = level.terrain?.[y]?.[x] ?? TerrainType.Void;
  if (!state) return base;

  const p1IsFloor =
    state.activeChar !== CharacterType.P1_White &&
    state.p1Pos.x === x &&
    state.p1Pos.y === y;
  if (p1IsFloor) {
    return TerrainType.LightTile;
  }

  const p2IsFloor =
    state.activeChar !== CharacterType.P2_Black &&
    state.p2Pos.x === x &&
    state.p2Pos.y === y;
  if (p2IsFloor) {
    return TerrainType.DarkTile;
  }

  return base;
};
