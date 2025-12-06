import React from 'react';
import { TerrainType, CharacterType, Position } from '../types';

interface BlockProps {
  terrain: TerrainType;
  x: number;
  y: number;
  p1Pos?: Position;
  p2Pos?: Position;
  activeChar?: CharacterType;
  isTarget?: boolean;
  connections?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  innerCorners?: { tl: boolean; tr: boolean; bl: boolean; br: boolean };
  onBlockClick?: (x: number, y: number) => void;
  editorMode?: boolean;
  tileSize?: number;
}

export const Block: React.FC<BlockProps> = ({ 
  terrain, 
  x, 
  y, 
  p1Pos, 
  p2Pos, 
  activeChar, 
  isTarget, 
  connections,
  innerCorners,
  onBlockClick,
  editorMode,
  tileSize
}) => {
  
  const isP1Here = p1Pos?.x === x && p1Pos?.y === y;
  const isP2Here = p2Pos?.x === x && p2Pos?.y === y;

  // Determine if this block should be rendered as a "Visual Wall" (High/Raised)
  // Wall is always high.
  // P1 (White) sees LightTile as Obstacle (High), DarkTile as Floor (Low)
  // P2 (Black) sees DarkTile as Obstacle (High), LightTile as Floor (Low)
  let isVisualWall = terrain === TerrainType.Wall;
  if (!editorMode && activeChar) {
    if (activeChar === CharacterType.P1_White && terrain === TerrainType.LightTile) isVisualWall = true;
    if (activeChar === CharacterType.P2_Black && terrain === TerrainType.DarkTile) isVisualWall = true;
  }

  // --- 3D Style Helper ---
  const get3DStyle = (
    baseColor: string, 
    topColor: string, 
    leftColor: string, 
    rightColor: string, 
    bottomColor: string,
    borderWidthPx: number = 4,
    activeConnections?: { top: boolean; bottom: boolean; left: boolean; right: boolean }
  ) => {
    
    // Logic: If connected, border is 0. Else, it's the full slope width.
    const bt = activeConnections?.top ? 0 : borderWidthPx;
    const bb = activeConnections?.bottom ? 0 : borderWidthPx;
    const bl = activeConnections?.left ? 0 : borderWidthPx;
    const br = activeConnections?.right ? 0 : borderWidthPx;

    return {
      backgroundColor: baseColor,
      borderTopColor: topColor,
      borderLeftColor: leftColor,
      borderRightColor: rightColor,
      borderBottomColor: bottomColor,
      borderStyle: 'solid',
      borderTopWidth: `${bt}px`,
      borderBottomWidth: `${bb}px`,
      borderLeftWidth: `${bl}px`,
      borderRightWidth: `${br}px`,
      boxSizing: 'border-box' as const,
      transition: 'all 0.3s ease-out', // Smoother transition for height changes
    };
  };

  let style = {};

  // Colors designed for a symmetric top-down "Retro Bevel" look
  const C = {
    Wall: {
      base: '#757c8d', top: '#e5ebf8', left: '#4b4f5e', right: '#434655', bottom: '#242732'
    },
    // Light Tile Colors (When acts as Floor)
    LightFloor: {
      base: '#f7f7f4', top: '#f7f7f4', left: '#f7f7f4', right: '#f7f7f4', bottom: '#f7f7f4'
    },
    // Light Tile Colors (When acts as Wall) - Slightly darker side slopes to show height
    LightWall: {
      base: '#f4f5f7', top: '#ffffff', left: '#c1c8da', right: '#b7bfd2', bottom: '#8e95aa'
    },
    // Dark Tile Colors (When acts as Floor)
    DarkFloor: {
      base: '#1a1a1f', top: '#1a1a1f', left: '#1a1a1f', right: '#1a1a1f', bottom: '#1a1a1f'
    },
    // Dark Tile Colors (When acts as Wall)
    DarkWall: {
      base: '#2d3241', top: '#939bad', left: '#2d3241', right: '#191c26', bottom: '#11131a'
    },

    Void: { base: '#111', top: '#1a1a1a', left: '#151515', right: '#0a0a0a', bottom: '#050505' },
    
    P1: { base: '#fff', top: '#fff', left: '#e5e5e5', right: '#e5e5e5', bottom: '#a3a3a3' },
    P2: { base: '#171717', top: '#404040', left: '#262626', right: '#262626', bottom: '#000000' },
  };

  const baseTileSize = tileSize ?? (editorMode ? 36 : 48);
  const WALL_BORDER_WIDTH = Math.min(
    Math.max(Math.round(baseTileSize * 0.18), 2),
    Math.floor(baseTileSize / 2)
  );
  const FLOOR_BORDER_WIDTH = 0;
  const LAYERS = { floor: 1, target: 2, active: 5 };

  // Decide colors and thickness
  if (terrain === TerrainType.Wall) {
      style = get3DStyle(
        C.Wall.base, C.Wall.top, C.Wall.left, C.Wall.right, C.Wall.bottom, 
        WALL_BORDER_WIDTH, connections
      );
  } else if (terrain === TerrainType.LightTile) {
      if (isVisualWall) {
          style = get3DStyle(
            C.LightWall.base, C.LightWall.top, C.LightWall.left, C.LightWall.right, C.LightWall.bottom,
            WALL_BORDER_WIDTH, connections
          );
      } else {
          style = get3DStyle(
            C.LightFloor.base, C.LightFloor.top, C.LightFloor.left, C.LightFloor.right, C.LightFloor.bottom,
            FLOOR_BORDER_WIDTH
          );
      }
  } else if (terrain === TerrainType.DarkTile) {
      if (isVisualWall) {
          style = get3DStyle(
            C.DarkWall.base, C.DarkWall.top, C.DarkWall.left, C.DarkWall.right, C.DarkWall.bottom,
            WALL_BORDER_WIDTH, connections
          );
      } else {
          style = get3DStyle(
            C.DarkFloor.base, C.DarkFloor.top, C.DarkFloor.left, C.DarkFloor.right, C.DarkFloor.bottom,
            FLOOR_BORDER_WIDTH
          );
      }
  } else if (terrain === TerrainType.Void) {
      style = editorMode 
        ? { backgroundColor: '#111', border: '1px dashed #333' }
        : { backgroundColor: 'transparent' };
  }

  if (isP1Here && activeChar !== CharacterType.P1_White) {
    style = get3DStyle(
      C.LightFloor.base,
      C.LightFloor.top,
      C.LightFloor.left,
      C.LightFloor.right,
      C.LightFloor.bottom,
      FLOOR_BORDER_WIDTH
    );
  } else if (isP2Here && activeChar !== CharacterType.P2_Black) {
    style = get3DStyle(
      C.DarkFloor.base,
      C.DarkFloor.top,
      C.DarkFloor.left,
      C.DarkFloor.right,
      C.DarkFloor.bottom,
      FLOOR_BORDER_WIDTH
    );
  }

  const tileZIndex = isVisualWall ? 2 : 0;
  style = { ...style, zIndex: tileZIndex };

  // --- Inner Corner Rendering (For Visual Walls) ---
  const renderInnerCorner = (pos: 'tl'|'tr'|'bl'|'br') => {
    if (!isVisualWall || !innerCorners?.[pos]) return null;
    
    const size = WALL_BORDER_WIDTH;
    
    // Determine which color palette to use for the corner patch
    // We strictly use the current block's palette to match its own slopes.
    // NOTE: If neighbors have different colors (e.g. Wall next to LightTile-as-Wall), 
    // the corner might look split. For this style, we use the current block's colors.
    let colors;
    if (terrain === TerrainType.Wall) colors = C.Wall;
    else if (terrain === TerrainType.LightTile) colors = C.LightWall;
    else colors = C.DarkWall;

    let cornerStyle: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      zIndex: 5 
    };

    if (pos === 'tl') {
      cornerStyle = {
        ...cornerStyle,
        top: 0, left: 0,
        borderWidth: `${size}px 0 0 ${size}px`, 
        borderColor: `${colors.left} transparent transparent ${colors.top}`
      };
    } else if (pos === 'tr') {
      cornerStyle = {
        ...cornerStyle,
        top: 0, right: 0,
        borderWidth: `${size}px ${size}px 0 0`,
        borderColor: `${colors.right} ${colors.top} transparent transparent`
      };
    } else if (pos === 'bl') {
      cornerStyle = {
        ...cornerStyle,
        bottom: 0, left: 0,
        borderWidth: `0 0 ${size}px ${size}px`,
        borderColor: `transparent transparent ${colors.left} ${colors.bottom}`
      };
    } else if (pos === 'br') {
      cornerStyle = {
        ...cornerStyle,
        bottom: 0, right: 0,
        borderWidth: `0 ${size}px ${size}px 0`,
        borderColor: `transparent ${colors.bottom} ${colors.right} transparent`
      };
    }

    return <div style={cornerStyle}></div>;
  };

  // --- Character Rendering ---
  const renderCharacter = (type: CharacterType) => {
    const isActive = activeChar === type;
    const palette = type === CharacterType.P1_White ? C.LightWall : C.DarkWall;
    const eyeColorClass = type === CharacterType.P1_White ? 'bg-black' : 'bg-white';
    const layer = isActive ? LAYERS.active : LAYERS.floor;

    const renderEyes = (size: string) => (
      <div className="absolute top-[30%] left-0 right-0 flex justify-center gap-[20%]">
        <div className={`${size} aspect-square rounded-sm ${eyeColorClass}`}></div>
        <div className={`${size} aspect-square rounded-sm ${eyeColorClass}`}></div>
      </div>
    );

    if (!isActive) {
      const floorPalette = type === CharacterType.P1_White ? C.LightFloor : C.DarkFloor;
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: layer }}>
          <div
            className="w-full h-full relative"
            style={get3DStyle(
              floorPalette.base,
              floorPalette.top,
              floorPalette.left,
              floorPalette.right,
              floorPalette.bottom,
              FLOOR_BORDER_WIDTH
            )}
          >
            {renderEyes('w-[14%]')}
          </div>
        </div>
      );
    }

    return (
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ zIndex: layer }}
      >
        <div
          className="w-full h-full shadow-xl relative"
          style={{
            ...get3DStyle(
              palette.base,
              palette.top,
              palette.left,
              palette.right,
              palette.bottom,
              WALL_BORDER_WIDTH
            ),
            boxShadow: isActive
              ? '0 12px 18px rgba(0,0,0,0.55)'
              : '0 4px 10px rgba(0,0,0,0.4)'
          }}
        >
          {renderEyes('w-[16%]')}
        </div>
      </div>
    );
  };

  // --- Target Rendering ---
  const renderTarget = () => (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: LAYERS.target }}
    >
      <div className="w-[60%] h-[60%] bg-emerald-500/20 rounded-full animate-pulse absolute"></div>
      <div
        className="w-[30%] h-[30%] bg-emerald-500 shadow-[0_0_10px_#10b981]"
        style={{
            transform: 'rotate(45deg)',
            border: '2px solid #6ee7b7'
        }}
      ></div>
    </div>
  );

  return (
    <div 
      className="w-full h-full relative"
      style={style}
      onClick={() => onBlockClick?.(x, y)}
      onMouseDown={(e) => {
        if(editorMode) e.preventDefault();
      }}
    >
      {/* Inner Corners for Visual Walls */}
      {renderInnerCorner('tl')}
      {renderInnerCorner('tr')}
      {renderInnerCorner('bl')}
      {renderInnerCorner('br')}

      {isTarget && renderTarget()}
      {isP1Here && renderCharacter(CharacterType.P1_White)}
      {isP2Here && renderCharacter(CharacterType.P2_Black)}
      
      {editorMode && (
        <div className="absolute inset-0 hover:bg-white/10 transition-colors pointer-events-none"></div>
      )}
    </div>
  );
};