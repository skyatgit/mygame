import React, { useRef, useState, useLayoutEffect, useMemo } from 'react';
import { LevelData, GameState, Position } from '../types';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
 
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setViewportSize(prev => (
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height }
      ));
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const tileSize = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) return editorMode ? 36 : 48;
    const padding = 48;
    const availableWidth = Math.max(viewportSize.width - padding, 0);
    const availableHeight = Math.max(viewportSize.height - padding, 0);
    const sizeByWidth = availableWidth / level.width;
    const sizeByHeight = availableHeight / level.height;
    return Math.max(Math.min(sizeByWidth, sizeByHeight), 16);
  }, [viewportSize, level.width, level.height, editorMode]);

  const boardWidth = level.width * tileSize;
  const boardHeight = level.height * tileSize;

   return (
    <div 
      ref={containerRef}
      className="flex bg-[#050505] p-6 rounded-xl shadow-2xl select-none w-full h-full"
      style={{ minWidth: 0, minHeight: 0 }}
      onMouseLeave={() => {}}
    >
      <div 
        className="grid bg-[#050505] mx-auto"
        style={{
          gridTemplateColumns: `repeat(${level.width}, minmax(0, 1fr))`,
          width: `${boardWidth}px`,
          height: `${boardHeight}px`,
          gap: '0px'
        }}
      >
        {level.terrain.map((row, y) => (
          row.map((_, x) => {
            const terrain = getEffectiveTerrain(level, editorMode ? undefined : gameState, x, y);
            const targetIndex = level.targets.findIndex(t => t.x === x && t.y === y);
            const isTarget = targetIndex >= 0;
            const isTargetCollected = isTarget ? collectedTargets[targetIndex] : false;

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
                   editorMode={editorMode}
                   onBlockClick={onBlockClick}
                   tileSize={tileSize}
                 />
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};