import React from 'react';
import { LevelData, GameState, Position, TerrainType, CharacterType } from '../types';
import { Block } from './Block';
import { getEffectiveTerrain } from '../terrainUtils';

interface GameBoardProps {
  level: LevelData;
  gameState?: GameState;
  editorMode?: boolean;
  onBlockClick?: (x: number, y: number) => void;
  editorP1Start?: Position;
  editorP2Start?: Position;
  collectedTargets?: boolean[];
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  level, 
  gameState, 
  editorMode = false,
  onBlockClick,
  editorP1Start,
  editorP2Start,
  collectedTargets = []
}) => {
  
  const p1Pos = gameState ? gameState.p1Pos : editorP1Start;
  const p2Pos = gameState ? gameState.p2Pos : editorP2Start;
  const activeChar = gameState ? gameState.activeChar : undefined;

  // Helper to identify the specific visual type of the wall.
  // Returns a specific string for each wall type, or null if it's not a wall.
  // This allows us to ensure that only walls of the SAME type merge visually.
  const getVisualWallType = (x: number, y: number): string | null => {
    // Out of bounds is never a wall, ensuring outer edges always have slopes
    if (x < 0 || x >= level.width || y < 0 || y >= level.height) return null; 
    
    const t = getEffectiveTerrain(level, gameState, x, y);

    // 1. Static Hard Walls (Gray)
    if (t === TerrainType.Wall) return 'WALL_STATIC';

    // 2. Dynamic Walls based on Active Character
    if (!editorMode && activeChar) {
        // If P1 (White) is active, Light Tiles behave as Walls (White Walls)
        if (activeChar === CharacterType.P1_White && t === TerrainType.LightTile) return 'WALL_LIGHT_RAISED';
        
        // If P2 (Black) is active, Dark Tiles behave as Walls (Black Walls)
        if (activeChar === CharacterType.P2_Black && t === TerrainType.DarkTile) return 'WALL_DARK_RAISED';
    }

    // Otherwise it's a floor or void
    return null;
  };

  return (
    <div 
      className="inline-block bg-[#050505] p-6 rounded-xl shadow-2xl select-none"
      onMouseLeave={() => {}}
    >
      <div 
        className="grid bg-[#050505]"
        style={{
          gridTemplateColumns: `repeat(${level.width}, minmax(0, 1fr))`,
          width: `min(90vw, ${level.width * (editorMode ? 36 : 48)}px)`,
          maxWidth: '800px',
          gap: '0px' // No gap logic handled by visual connection
        }}
      >
        {level.terrain.map((row, y) => (
          row.map((baseTerrain, x) => {
            const terrain = getEffectiveTerrain(level, gameState, x, y);
            const targetIndex = level.targets.findIndex(t => t.x === x && t.y === y);
            const isTarget = targetIndex >= 0;
            const isTargetCollected = isTarget ? collectedTargets[targetIndex] : false;
            
            // Get the exact type of the current block
            const currentWallType = getVisualWallType(x, y);
            const isHereWall = currentWallType !== null;

            // Calculate connections
            // We only connect if the neighbor is the EXACT SAME type of wall.
            let connections = { top: false, bottom: false, left: false, right: false };
            let innerCorners = { tl: false, tr: false, bl: false, br: false };

            if (isHereWall) {
                const topType = getVisualWallType(x, y - 1);
                const bottomType = getVisualWallType(x, y + 1);
                const leftType = getVisualWallType(x - 1, y);
                const rightType = getVisualWallType(x + 1, y);
                
                connections = { 
                  top: topType === currentWallType, 
                  bottom: bottomType === currentWallType, 
                  left: leftType === currentWallType, 
                  right: rightType === currentWallType 
                };

                // Calculate diagonal neighbors for Inner Corners
                // An inner corner exists if two adjacent sides are connected (same wall type),
                // but the diagonal neighbor is NOT that same wall type (forming a concave corner).
                const tlType = getVisualWallType(x - 1, y - 1);
                const trType = getVisualWallType(x + 1, y - 1);
                const blType = getVisualWallType(x - 1, y + 1);
                const brType = getVisualWallType(x + 1, y + 1);

                innerCorners = {
                  tl: connections.top && connections.left && tlType !== currentWallType,
                  tr: connections.top && connections.right && trType !== currentWallType,
                  bl: connections.bottom && connections.left && blType !== currentWallType,
                  br: connections.bottom && connections.right && brType !== currentWallType
                };
            }

            return (
              <div 
                key={`${x}-${y}`} 
                className="aspect-square w-full"
              >
                <Block 
                  x={x} 
                  y={y}
                  terrain={terrain}
                  p1Pos={p1Pos}
                  p2Pos={p2Pos}
                  activeChar={activeChar}
                  isTarget={isTarget && !isTargetCollected}
                  connections={connections}
                  innerCorners={innerCorners}
                  editorMode={editorMode}
                  onBlockClick={onBlockClick}
                />
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};