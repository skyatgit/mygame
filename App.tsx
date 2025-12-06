import React, { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { TEXT, INITIAL_LEVEL } from './constants';
import { GameBoard } from './components/GameBoard';
import { LevelData, GameState, CharacterType, TerrainType, Lang, EditorTool, Position } from './types';
import {
  Gamepad2, PenTool,
  Check, Globe, Trash2
} from 'lucide-react';
import { getEffectiveTerrain } from './terrainUtils';
import { useAudio } from './hooks/useAudio';
import { KEYBOARD_DIRECTION_MAP, GAME_CONFIG, DirectionKey, DirectionVector, SWITCH_KEYS, RESET_KEYS } from './gameConfig';

const computeCollectedTargets = (level: LevelData, p1: Position, p2: Position) =>
  level.targets.map(t => (t.x === p1.x && t.y === p1.y) || (t.x === p2.x && t.y === p2.y));

const App: React.FC = () => {
  // --- Global State ---
  const [lang, setLang] = useState<Lang>('zh');
  const [mode, setMode] = useState<'play' | 'edit'>('play');
  const t = TEXT[lang];
  
  useLayoutEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // --- Game State ---
  const [currentLevel, setCurrentLevel] = useState<LevelData>(INITIAL_LEVEL);
  const [gameState, setGameState] = useState<GameState>({
    p1Pos: INITIAL_LEVEL.p1Start,
    p2Pos: INITIAL_LEVEL.p2Start,
    activeChar: CharacterType.P1_White,
    collectedTargets: computeCollectedTargets(INITIAL_LEVEL, INITIAL_LEVEL.p1Start, INITIAL_LEVEL.p2Start)
  });
  const [moveCount, setMoveCount] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const gameStateRef = useRef(gameState);
  const prevActiveCharRef = useRef<CharacterType | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // --- Audio ---
  const { unlockAudio, playSound } = useAudio();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (prevActiveCharRef.current === null) {
      prevActiveCharRef.current = gameState.activeChar;
      return;
    }
    if (prevActiveCharRef.current !== gameState.activeChar) {
      playSound('switch');
    }
    prevActiveCharRef.current = gameState.activeChar;
  }, [gameState.activeChar, playSound]);

  // --- Editor State ---
  const [editorTool, setEditorTool] = useState<EditorTool>('wall');

  const startGame = useCallback(() => {
    if (hasStarted) return;
    unlockAudio().finally(() => setHasStarted(true));
  }, [hasStarted, unlockAudio]);

  useEffect(() => {
    if (hasStarted) return;

    const handleStartHotkey = (event: KeyboardEvent) => {
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        startGame();
        keyboardSwitchHeldRef.current = true;
        lastKeyboardSwitchTimeRef.current = performance.now();
      }
    };

    window.addEventListener('keydown', handleStartHotkey);
    return () => window.removeEventListener('keydown', handleStartHotkey);
  }, [hasStarted, startGame]);

  const gamepadButtonStateRef = useRef({ start: false, switch: false, reset: false });
  const lastGamepadMoveTimeRef = useRef(0);
  const suppressGamepadSwitchRef = useRef(false);
  const lastKeyboardMoveTimeRef = useRef(0);
  const lastKeyboardDirectionRef = useRef<DirectionKey | null>(null);
  const keyboardActiveDirectionRef = useRef<DirectionVector | null>(null);
  const keyboardRepeatIntervalRef = useRef<number | null>(null);
  const lastKeyboardSwitchTimeRef = useRef(0);
  const keyboardSwitchHeldRef = useRef(false);
  const lastGamepadDirectionRef = useRef<DirectionKey | null>(null);

  const handleMove = useCallback((dx: number, dy: number) => {
    if (isWon || mode === 'edit' || !hasStarted) return;

    const { activeChar, p1Pos, p2Pos } = gameStateRef.current;
    const currentPos = activeChar === CharacterType.P1_White ? p1Pos : p2Pos;
    const targetX = currentPos.x + dx;
    const targetY = currentPos.y + dy;

    // 1. Boundary Check
    if (targetX < 0 || targetX >= currentLevel.width || targetY < 0 || targetY >= currentLevel.height) {
      return;
    }

    // 2. Terrain Check
    const targetTerrain = getEffectiveTerrain(currentLevel, gameStateRef.current, targetX, targetY);
    if (targetTerrain === TerrainType.Wall || targetTerrain === TerrainType.Void) {
      return;
    }

    // 3. Color Logic & "Be the Path"
    const isP1Active = activeChar === CharacterType.P1_White;
    const otherCharPos = isP1Active ? p2Pos : p1Pos;
    const isOtherCharAtTarget = otherCharPos.x === targetX && otherCharPos.y === targetY;

    let canMove = false;

    if (isP1Active) {
      const isDarkTile = targetTerrain === TerrainType.DarkTile;
      if (isDarkTile || isOtherCharAtTarget) {
        canMove = true;
      }
    } else {
      const isLightTile = targetTerrain === TerrainType.LightTile;
      if (isLightTile || isOtherCharAtTarget) {
        canMove = true;
      }
    }

    if (!canMove) return;

    // 执行移动
    playSound('move');
    setMoveCount(c => c + 1);

    const nextP1 = isP1Active ? { x: targetX, y: targetY } : p1Pos;
    const nextP2 = !isP1Active ? { x: targetX, y: targetY } : p2Pos;

    setGameState(prev => {
      const nextCollected = [...prev.collectedTargets];
      const playerHit = isP1Active ? nextP1 : nextP2;
      const previouslyCollected = nextCollected.filter(Boolean).length;
      let newlyCollected = 0;

      currentLevel.targets.forEach((t, i) => {
        if (!nextCollected[i] && playerHit.x === t.x && playerHit.y === t.y) {
          nextCollected[i] = true;
          newlyCollected++;
        }
      });

      const totalTargets = currentLevel.targets.length;
      const willCompleteLevel = totalTargets > 0 && previouslyCollected + newlyCollected === totalTargets;
      if (newlyCollected > 0 && !willCompleteLevel) {
        playSound('collect');
      }

      return {
        ...prev,
        p1Pos: nextP1,
        p2Pos: nextP2,
        collectedTargets: nextCollected,
      };
    });
  }, [currentLevel, hasStarted, isWon, mode, playSound]);

  const stopKeyboardRepeat = useCallback(() => {
    if (keyboardRepeatIntervalRef.current !== null) {
      clearInterval(keyboardRepeatIntervalRef.current);
      keyboardRepeatIntervalRef.current = null;
    }
  }, []);

  const startKeyboardRepeat = useCallback(() => {
    if (keyboardRepeatIntervalRef.current !== null) return;
    keyboardRepeatIntervalRef.current = window.setInterval(() => {
      const activeDir = keyboardActiveDirectionRef.current;
      if (!activeDir || mode === 'edit' || !hasStarted) {
        stopKeyboardRepeat();
        return;
      }
      handleMove(activeDir.dx, activeDir.dy);
    }, GAME_CONFIG.MOVE_COOLDOWN_MS);
  }, [handleMove, hasStarted, mode, stopKeyboardRepeat]);

  useEffect(() => {
    return () => stopKeyboardRepeat();
  }, [stopKeyboardRepeat]);

  useEffect(() => {
    if (mode === 'edit' || !hasStarted) {
      keyboardActiveDirectionRef.current = null;
      stopKeyboardRepeat();
    }
  }, [mode, hasStarted, stopKeyboardRepeat]);

  // --- Game Logic ---

  const resetGame = useCallback(() => {
    setGameState({
      p1Pos: { ...currentLevel.p1Start },
      p2Pos: { ...currentLevel.p2Start },
      activeChar: CharacterType.P1_White,
      collectedTargets: computeCollectedTargets(currentLevel, currentLevel.p1Start, currentLevel.p2Start)
    });
    setMoveCount(0);
    setIsWon(false);
  }, [currentLevel]);

  const collectedCount = useMemo(
    () => gameState.collectedTargets.filter(Boolean).length,
    [gameState.collectedTargets]
  );

  useEffect(() => {
    if (collectedCount === currentLevel.targets.length && currentLevel.targets.length > 0) {
      setIsWon(true);
      playSound('win');
    }
  }, [collectedCount, currentLevel.targets.length, playSound]);

  const handleSwitch = useCallback(() => {
    if (isWon || mode === 'edit' || !hasStarted) return;

    const { p1Pos, p2Pos, activeChar } = gameStateRef.current;
    const overlapping = p1Pos.x === p2Pos.x && p1Pos.y === p2Pos.y;

    if (overlapping) {
      playSound('error');
      return;
    }

    setGameState({
      ...gameStateRef.current,
      activeChar: activeChar === CharacterType.P1_White
        ? CharacterType.P2_Black
        : CharacterType.P1_White
    });
  }, [hasStarted, isWon, mode, playSound]);

  // --- Input Handlers ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'edit' || !hasStarted) return;
      const now = performance.now();
      const direction = KEYBOARD_DIRECTION_MAP[e.key];
      if (direction) {
        const isNewDirection = keyboardActiveDirectionRef.current?.key !== direction.key;
        if (isNewDirection) {
          keyboardActiveDirectionRef.current = direction;
          handleMove(direction.dx, direction.dy);
          lastKeyboardMoveTimeRef.current = now;
          startKeyboardRepeat();
        } else if (keyboardRepeatIntervalRef.current === null) {
          startKeyboardRepeat();
        }
        lastKeyboardDirectionRef.current = direction.key;
        return;
      }
      if (SWITCH_KEYS.includes(e.key as any)) {
        if (!keyboardSwitchHeldRef.current && now - lastKeyboardSwitchTimeRef.current >= GAME_CONFIG.SWITCH_COOLDOWN_MS) {
          handleSwitch();
          lastKeyboardSwitchTimeRef.current = now;
          keyboardSwitchHeldRef.current = true;
        }
      } else if (RESET_KEYS.includes(e.key as any)) {
        resetGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (SWITCH_KEYS.includes(e.key as any)) {
        keyboardSwitchHeldRef.current = false;
      }
      const releasedDirection = KEYBOARD_DIRECTION_MAP[e.key];
      if (releasedDirection) {
        lastKeyboardDirectionRef.current = null;
        if (keyboardActiveDirectionRef.current?.key === releasedDirection.key) {
          keyboardActiveDirectionRef.current = null;
          stopKeyboardRepeat();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleMove, handleSwitch, resetGame, mode, hasStarted, startKeyboardRepeat, stopKeyboardRepeat]);

  // Gamepad Loop
  useEffect(() => {
    let animationFrameId: number;
 
     const pollGamepad = () => {
       const gamepads = navigator.getGamepads();
       const gp = gamepads[0]; // Assume P1
       if (gp && mode === 'play') {
         const btnStart = gp.buttons[0]?.pressed ?? false;
         const prevButtonState = gamepadButtonStateRef.current;
         if (!hasStarted) {
          if (btnStart && !prevButtonState.start) {
            startGame();
            suppressGamepadSwitchRef.current = true; // 需松开 A 键后才允许切换
          }
          gamepadButtonStateRef.current = { start: btnStart, switch: false, reset: false };
           animationFrameId = requestAnimationFrame(pollGamepad);
           return;
         }
         // Buttons: 0 (A/Cross), 1 (B/Circle), 2 (X/Square), 3 (Y/Triangle)
         // Button 0, 1, 2 for switch, Button 3 (Y) for reset
         const btnSwitch = gp.buttons[0].pressed || gp.buttons[1].pressed || gp.buttons[2].pressed;
         const btnReset = gp.buttons[3].pressed || gp.buttons[8].pressed || gp.buttons[9].pressed; // Y/Select/Start
 
         if (suppressGamepadSwitchRef.current) {
           if (!btnSwitch) suppressGamepadSwitchRef.current = false;
         } else if (btnSwitch && !prevButtonState.switch) {
           handleSwitch();
         }
 
         if (btnReset && !prevButtonState.reset) resetGame();
 
         // D-Pad / Stick
         // Axes: 0 (Left Stick X), 1 (Left Stick Y)
         const axisX = gp.axes[0];
         const axisY = gp.axes[1];
         const dpadUp = gp.buttons[12]?.pressed;
         const dpadDown = gp.buttons[13]?.pressed;
         const dpadLeft = gp.buttons[14]?.pressed;
         const dpadRight = gp.buttons[15]?.pressed;
 
         const now = performance.now();
 
         const activeDirection: DirectionVector | null = (() => {
           const threshold = GAME_CONFIG.GAMEPAD_AXIS_THRESHOLD;
           if (axisY < -threshold || dpadUp) return { key: 'up', dx: 0, dy: -1 };
           if (axisY > threshold || dpadDown) return { key: 'down', dx: 0, dy: 1 };
           if (axisX < -threshold || dpadLeft) return { key: 'left', dx: -1, dy: 0 };
           if (axisX > threshold || dpadRight) return { key: 'right', dx: 1, dy: 0 };
           return null;
         })();
 
         if (activeDirection) {
           const isContinuous = lastGamepadDirectionRef.current === activeDirection.key;
           if (!isContinuous || now - lastGamepadMoveTimeRef.current >= GAME_CONFIG.MOVE_COOLDOWN_MS) {
             handleMove(activeDirection.dx, activeDirection.dy);
             lastGamepadMoveTimeRef.current = now;
           }
           lastGamepadDirectionRef.current = activeDirection.key;
         } else {
           lastGamepadDirectionRef.current = null;
         }
 
         gamepadButtonStateRef.current = { start: btnStart, switch: btnSwitch, reset: btnReset };
        }
       animationFrameId = requestAnimationFrame(pollGamepad);
     };
     animationFrameId = requestAnimationFrame(pollGamepad);
     return () => cancelAnimationFrame(animationFrameId);
   }, [handleMove, handleSwitch, resetGame, mode, hasStarted, startGame]);

  // Touch swipe control
  useEffect(() => {
    const touchStartRef = { x: 0, y: 0 };
    const minSwipeDistance = 30;
    let lastTapTime = 0;
    const doubleTapDelay = 300;

    const handleTouchStart = (e: TouchEvent) => {
      if (mode === 'edit' || !hasStarted) return;
      const touch = e.touches[0];
      touchStartRef.x = touch.clientX;
      touchStartRef.y = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (mode === 'edit' || !hasStarted) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.x;
      const deltaY = touch.clientY - touchStartRef.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check for swipe
      if (absDeltaX >= minSwipeDistance || absDeltaY >= minSwipeDistance) {
        if (absDeltaX > absDeltaY) {
          // Horizontal swipe
          handleMove(deltaX > 0 ? 1 : -1, 0);
        } else {
          // Vertical swipe
          handleMove(0, deltaY > 0 ? 1 : -1);
        }
        return;
      }

      // Check for double tap
      const now = Date.now();
      if (now - lastTapTime < doubleTapDelay) {
        handleSwitch();
        lastTapTime = 0;
      } else {
        lastTapTime = now;
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMove, handleSwitch, mode, hasStarted]);

  // --- Editor Logic ---
  const handleEditorClick = (x: number, y: number) => {
    if (mode !== 'edit') return;

    // Create deep copy
    const newLevel = { ...currentLevel, terrain: currentLevel.terrain.map(r => [...r]) };

    // Handle different editor tools
    switch (editorTool) {
      case 'wall':
        newLevel.terrain[y][x] = TerrainType.Wall;
        break;

      case 'light':
        newLevel.terrain[y][x] = TerrainType.LightTile;
        break;

      case 'dark':
        newLevel.terrain[y][x] = TerrainType.DarkTile;
        break;

      case 'eraser':
        newLevel.terrain[y][x] = TerrainType.Void;
        break;

      case 'p1':
        if (newLevel.terrain[y][x] !== TerrainType.DarkTile) {
          playSound('error');
          return;
        }
        newLevel.p1Start = { x, y };
        break;

      case 'p2':
        if (newLevel.terrain[y][x] !== TerrainType.LightTile) {
          playSound('error');
          return;
        }
        newLevel.p2Start = { x, y };
        break;

      case 'target':
        if (newLevel.terrain[y][x] === TerrainType.Wall) {
          playSound('error');
          return;
        }
        // Toggle target
        const idx = newLevel.targets.findIndex(t => t.x === x && t.y === y);
        if (idx >= 0) {
          newLevel.targets = newLevel.targets.filter((_, i) => i !== idx);
        } else {
          newLevel.targets = [...newLevel.targets, { x, y }];
        }
        break;
    }

    setCurrentLevel(newLevel);
    // Sync Game State for visual feedback
    setGameState(prev => ({
      ...prev,
      p1Pos: newLevel.p1Start,
      p2Pos: newLevel.p2Start,
      collectedTargets: computeCollectedTargets(newLevel, newLevel.p1Start, newLevel.p2Start)
    }));
  };

  const resizeLevel = (w: number, h: number) => {
    // Clamp dimensions 4-20
    const newW = Math.max(4, Math.min(20, w));
    const newH = Math.max(4, Math.min(20, h));
    
    // Create new grid
    const newTerrain: TerrainType[][] = [];
    for (let y = 0; y < newH; y++) {
      const row: TerrainType[] = [];
      for (let x = 0; x < newW; x++) {
        // Copy existing or default to Wall
        if (y < currentLevel.height && x < currentLevel.width) {
          row.push(currentLevel.terrain[y][x]);
        } else {
          row.push(TerrainType.Wall);
        }
      }
      newTerrain.push(row);
    }
    
    setCurrentLevel(prev => ({
      ...prev,
      width: newW,
      height: newH,
      terrain: newTerrain,
      // Clamp spawns/targets
      p1Start: { x: Math.min(prev.p1Start.x, newW-1), y: Math.min(prev.p1Start.y, newH-1) },
      p2Start: { x: Math.min(prev.p2Start.x, newW-1), y: Math.min(prev.p2Start.y, newH-1) },
      targets: prev.targets.filter(t => t.x < newW && t.y < newH)
    }));
  };

  return (
    <div className="min-h-screen bg-[#111] text-gray-200 flex flex-col items-stretch font-sans select-none">
      
      {/* Header Area */}
      <div className="w-full px-4 py-2 flex justify-between items-center bg-[#181818] border-b border-[#333]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col leading-tight">
             <h1 className="text-xl font-black tracking-widest text-white">
               {t.title} <span className="text-neutral-500 font-light">{t.subtitle}</span>
             </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="p-2 text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1">
             <Globe size={14} /> {lang.toUpperCase()}
           </button>
        </div>
      </div>

      {/* Main Content - 左右分栏比例 2:8 */}
      <div className="flex-1 flex flex-col md:flex-row w-full gap-4 p-4 overflow-hidden">
        
        {/* Left Panel: Controls / Info - 占 20% 宽度 */}
        <div className="w-full md:w-[20%] md:min-w-[200px] md:max-w-[560px] flex-shrink-0 flex flex-col gap-4">
           {/* Mode Switcher */}
           <div className="bg-[#1a1a1a] p-1 rounded-lg flex border border-[#333]">
              <button 
                onClick={() => { setMode('play'); resetGame(); }}
                className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-md transition-all ${mode === 'play' ? 'bg-white text-black shadow-lg font-bold' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Gamepad2 size={16} /> {t.play}
              </button>
              <button 
                onClick={() => { setMode('edit'); resetGame(); }}
                className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-md transition-all ${mode === 'edit' ? 'bg-white text-black shadow-lg font-bold' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <PenTool size={16} /> {t.edit}
              </button>
           </div>

           {/* Game Info (Play Mode) */}
           {mode === 'play' && (
             <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333] flex flex-col gap-2">
                <div className="flex items-stretch gap-2 border-b border-[#333] pb-1.5">
                  <div className="flex-1 px-2 py-1 rounded border border-[#333] bg-[#222] flex items-center justify-center gap-1.5">
                    <span className="text-gray-500 text-xs font-bold">{t.moves}</span>
                    <span className="text-white text-sm font-mono">{moveCount}</span>
                  </div>
                  <div className={`flex-1 px-2 py-1 rounded border flex items-center justify-center gap-1 transition-all ${gameState.activeChar === CharacterType.P1_White ? 'bg-white text-black border-white' : 'bg-[#222] text-gray-500 border-[#333]'}`}>
                    <span className="text-xs font-bold">{t.p1}</span>
                    {gameState.activeChar === CharacterType.P1_White && <Check size={10} />}
                  </div>
                  <div className={`flex-1 px-2 py-1 rounded border flex items-center justify-center gap-1 transition-all ${gameState.activeChar === CharacterType.P2_Black ? 'bg-black text-white border-white' : 'bg-[#222] text-gray-500 border-[#333]'}`}>
                    <span className="text-xs font-bold">{t.p2}</span>
                    {gameState.activeChar === CharacterType.P2_Black && <Check size={10} />}
                  </div>
                </div>

                <div className="text-xs text-gray-500 leading-snug">
                  <p className="text-[11px] uppercase tracking-wide">{t.controls}</p>
                </div>
             </div>
           )}

           {/* Editor Tools (Edit Mode) */}
           {mode === 'edit' && (
             <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333] flex flex-col gap-2 animate-in fade-in slide-in-from-left-4">
                <div className="flex items-center justify-between gap-1 w-full">
                   <div className="flex-1 flex items-center justify-center gap-2 bg-[#222] px-3 py-1.5 rounded text-sm">
                      <span className="text-gray-500 text-xs font-bold">W</span>
                      <button onClick={() => resizeLevel(currentLevel.width-1, currentLevel.height)} className="px-1.5 py-0.5 hover:text-white hover:bg-[#333] rounded text-sm font-bold">-</button>
                      <span className="font-mono w-5 text-center text-sm">{currentLevel.width}</span>
                      <button onClick={() => resizeLevel(currentLevel.width+1, currentLevel.height)} className="px-1.5 py-0.5 hover:text-white hover:bg-[#333] rounded text-sm font-bold">+</button>
                   </div>
                   <div className="flex-1 flex items-center justify-center gap-2 bg-[#222] px-3 py-1.5 rounded text-sm">
                      <span className="text-gray-500 text-xs font-bold">H</span>
                      <button onClick={() => resizeLevel(currentLevel.width, currentLevel.height-1)} className="px-1.5 py-0.5 hover:text-white hover:bg-[#333] rounded text-sm font-bold">-</button>
                      <span className="font-mono w-5 text-center text-sm">{currentLevel.height}</span>
                      <button onClick={() => resizeLevel(currentLevel.width, currentLevel.height+1)} className="px-1.5 py-0.5 hover:text-white hover:bg-[#333] rounded text-sm font-bold">+</button>
                   </div>
                </div>

                <div className="grid grid-cols-4 gap-1">
                   <button
                     onClick={() => setEditorTool('wall')}
                     className={`py-2 px-1 rounded text-xs font-bold flex items-center justify-center gap-1 border-2 bg-neutral-800 ${
                       editorTool === 'wall'
                         ? 'border-yellow-500 shadow-lg'
                         : 'border-transparent opacity-70 hover:opacity-100'
                     }`}
                     style={{ transform: 'translateZ(0)' }}
                   >
                     {t.toolLabels.wall}
                   </button>
                   <button
                     onClick={() => setEditorTool('target')}
                     className={`py-2 px-1 rounded text-xs font-bold flex items-center justify-center gap-1 border-2 bg-green-900 text-green-400 border-green-700 ${
                       editorTool === 'target'
                         ? 'border-yellow-500 shadow-lg'
                         : 'opacity-70 hover:opacity-100'
                     }`}
                     style={{ transform: 'translateZ(0)' }}
                   >
                     {t.toolLabels.target}
                   </button>
                   <button
                     onClick={() => setEditorTool('eraser')}
                     className={`py-2 px-1 rounded text-xs font-bold flex items-center justify-center gap-1 border-2 bg-neutral-900 text-red-500 ${
                       editorTool === 'eraser'
                         ? 'border-yellow-500 shadow-lg'
                         : 'border-red-900/50 opacity-70 hover:opacity-100'
                     }`}
                     style={{ transform: 'translateZ(0)' }}
                   >
                     <Trash2 size={14} />
                     {t.toolLabels.eraser}
                   </button>
                   <div></div>
                   <button
                     onClick={() => setEditorTool('light')}
                     className={`py-2 px-1 rounded text-xs font-bold flex items-center justify-center gap-1 border-2 bg-gray-200 text-black ${
                       editorTool === 'light'
                         ? 'border-yellow-500 shadow-lg'
                         : 'border-transparent opacity-70 hover:opacity-100'
                     }`}
                     style={{ transform: 'translateZ(0)' }}
                   >
                     {t.toolLabels.light}
                   </button>
                   <button
                     onClick={() => setEditorTool('dark')}
                     className={`py-2 px-1 rounded text-xs font-bold flex items-center justify-center gap-1 border-2 bg-black border-gray-700 ${
                       editorTool === 'dark'
                         ? 'border-yellow-500 shadow-lg'
                         : 'opacity-70 hover:opacity-100'
                     }`}
                     style={{ transform: 'translateZ(0)' }}
                   >
                     {t.toolLabels.dark}
                   </button>
                   <button
                     onClick={() => setEditorTool('p1')}
                     className={`py-2 px-1 rounded text-xs font-bold flex items-center justify-center gap-1 border-2 bg-white text-black ${
                       editorTool === 'p1'
                         ? 'border-yellow-500 shadow-lg'
                         : 'border-gray-400 opacity-70 hover:opacity-100'
                     }`}
                     style={{ transform: 'translateZ(0)' }}
                   >
                     {t.toolLabels.p1}
                   </button>
                   <button
                     onClick={() => setEditorTool('p2')}
                     className={`py-2 px-1 rounded text-xs font-bold flex items-center justify-center gap-1 border-2 bg-black text-white ${
                       editorTool === 'p2'
                         ? 'border-yellow-500 shadow-lg'
                         : 'border-gray-600 opacity-70 hover:opacity-100'
                     }`}
                     style={{ transform: 'translateZ(0)' }}
                   >
                     {t.toolLabels.p2}
                   </button>
                </div>
             </div>
           )}
        </div>

        {/* Center: Game Board */}
        <div className="flex-1 flex flex-col items-center justify-center relative bg-[#0a0a0a] rounded-xl border border-[#222] shadow-inner p-4 overflow-hidden mb-32 md:mb-0">

            <div className="w-full h-full flex items-center justify-center">
              <GameBoard
                level={currentLevel}
                gameState={gameState}
                editorMode={mode === 'edit'}
                collectedTargets={gameState.collectedTargets}
                onBlockClick={handleEditorClick}
                editorP1Start={currentLevel.p1Start}
                editorP2Start={currentLevel.p2Start}
              />
            </div>

           {/* Win Overlay */}
           {isWon && (
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in duration-700">
                <h1 className="text-5xl md:text-7xl font-black text-white mb-2 tracking-tighter">
                  {t.subtitle}
                </h1>
                <p className="text-green-400 font-mono tracking-widest text-xl mb-8">{t.win}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={resetGame}
                    className="bg-white text-black px-8 py-3 rounded font-bold hover:scale-105 transition-transform"
                  >
                    {t.reset}
                  </button>
                </div>
             </div>
           )}
         </div>

      </div>

      {!hasStarted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1b1b1b] border border-white/10 rounded-2xl px-8 py-10 text-center space-y-6 shadow-2xl">
            <h2 className="text-3xl font-bold text-white tracking-wide">{t.startOverlayTitle}</h2>
            <p className="text-sm text-gray-400">{t.startOverlayHint}</p>
             <button
               onClick={startGame}
               className="px-8 py-3 rounded-full bg-white text-black font-bold text-lg tracking-wide hover:scale-105 transition"
             >
               {t.startOverlayButton}
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default App;
