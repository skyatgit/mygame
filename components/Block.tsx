import React, { memo, useState, useEffect } from 'react';
import { TerrainType, CharacterType, Position } from '../types';
import { BLOCK_COLORS } from '../theme';
import PinWhiteSvg from '../assets/pin-white.svg';
import PinBlackSvg from '../assets/pin-black.svg';

interface BlockProps {
  terrain: TerrainType;
  x: number;
  y: number;
  p1Pos?: Position;
  p2Pos?: Position;
  activeChar?: CharacterType;
  isTarget?: boolean;
  onBlockClick?: (x: number, y: number) => void;
  editorMode?: boolean;
  tileSize?: number;
}

const BlockComponent: React.FC<BlockProps> = ({
  terrain,
  x,
  y,
  p1Pos,
  p2Pos,
  activeChar,
  isTarget,
  onBlockClick,
  editorMode,
  tileSize
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  const isP1Here = p1Pos?.x === x && p1Pos?.y === y;
  const isP2Here = p2Pos?.x === x && p2Pos?.y === y;

  // Random blink effect
  useEffect(() => {
    if (!isP1Here && !isP2Here) return;

    let blinkTimer: number;
    let closeTimer: number;

    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 3000; // 2-5秒随机眨眼
      blinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        closeTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150); // 眨眼持续150ms
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(closeTimer);
    };
  }, [isP1Here, isP2Here]);

  // Determine if this block should be rendered as a "Visual Wall" (High/Raised)
  // Wall is always high.
  // P1 (White) sees LightTile as Obstacle (High), DarkTile as Floor (Low)
  // P2 (Black) sees DarkTile as Obstacle (High), LightTile as Floor (Low)
  let isVisualWall = terrain === TerrainType.Wall;
  if (editorMode) {
    isVisualWall = terrain === TerrainType.Wall;
  } else if (activeChar) {
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
    borderWidthPx: number = 4
  ) => {
    return {
      backgroundColor: baseColor,
      borderTopColor: topColor,
      borderLeftColor: leftColor,
      borderRightColor: rightColor,
      borderBottomColor: bottomColor,
      borderStyle: 'solid',
      borderTopWidth: `${borderWidthPx}px`,
      borderBottomWidth: `${borderWidthPx}px`,
      borderLeftWidth: `${borderWidthPx}px`,
      borderRightWidth: `${borderWidthPx}px`,
      boxSizing: 'border-box' as const,
      transition: 'all 0.3s ease-out',
    };
  };

  let style = {};

  const C = BLOCK_COLORS;

  const baseTileSize = tileSize ?? (editorMode ? 36 : 48);
  const WALL_BORDER_WIDTH = Math.min(
    Math.max(Math.round(baseTileSize * 0.18), 2),
    Math.floor(baseTileSize / 2)
  );
  const FLOOR_BORDER_WIDTH = 0;
  const LAYERS = { floor: 1, target: 2, active: 5 };

  const renderPin = (type: CharacterType) => {
    const src = type === CharacterType.P1_White ? PinWhiteSvg : PinBlackSvg;
    return (
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ zIndex: LAYERS.active }}
      >
        <img src={src} alt="pin" className="w-[55%] h-[70%]" draggable={false} />
      </div>
    );
  };
 
   // Decide colors and thickness
   if (terrain === TerrainType.Wall) {
      style = get3DStyle(
        C.Wall.base, C.Wall.top, C.Wall.left, C.Wall.right, C.Wall.bottom,
        WALL_BORDER_WIDTH
      );
  } else if (terrain === TerrainType.LightTile) {
      if (isVisualWall) {
          style = get3DStyle(
            C.LightWall.base, C.LightWall.top, C.LightWall.left, C.LightWall.right, C.LightWall.bottom,
            WALL_BORDER_WIDTH
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
            WALL_BORDER_WIDTH
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

  if (!editorMode && isP1Here && activeChar !== CharacterType.P1_White) {
     style = get3DStyle(
       C.LightFloor.base,
       C.LightFloor.top,
       C.LightFloor.left,
       C.LightFloor.right,
       C.LightFloor.bottom,
       FLOOR_BORDER_WIDTH
     );
  } else if (!editorMode && isP2Here && activeChar !== CharacterType.P2_Black) {
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

  // --- Character Rendering ---
  const renderCharacter = (type: CharacterType) => {
    if (editorMode) {
      return renderPin(type);
    }
     const isActive = activeChar === type;
     const palette = type === CharacterType.P1_White ? C.LightWall : C.DarkWall;
     const eyeColorClass = type === CharacterType.P1_White ? 'bg-black' : 'bg-white';
     const layer = isActive ? LAYERS.active : LAYERS.floor;

    const renderEyes = (size: string) => (
      <div className="absolute top-[30%] left-0 right-0 flex justify-center gap-[20%]">
        {isBlinking ? (
          <>
            <div className={`${size} h-[2px] rounded-sm ${eyeColorClass}`}></div>
            <div className={`${size} h-[2px] rounded-sm ${eyeColorClass}`}></div>
          </>
        ) : (
          <>
            <div className={`${size} aspect-square rounded-sm ${eyeColorClass}`}></div>
            <div className={`${size} aspect-square rounded-sm ${eyeColorClass}`}></div>
          </>
        )}
      </div>
    );

    if (!isActive && !editorMode) {
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
          {renderEyes(isActive ? 'w-[16%]' : 'w-[14%]')}
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
      {isTarget && renderTarget()}
      {isP1Here && renderCharacter(CharacterType.P1_White)}
      {isP2Here && renderCharacter(CharacterType.P2_Black)}
      
      {editorMode && (
        <div className="absolute inset-0 hover:bg-white/10 transition-colors pointer-events-none"></div>
      )}
    </div>
  );
};

// 使用 memo 优化渲染性能
export const Block = memo(BlockComponent);