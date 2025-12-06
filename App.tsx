import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { TEXT, INITIAL_LEVEL } from './constants';
import { GameBoard } from './components/GameBoard';
import { LevelData, GameState, CharacterType, TerrainType, Lang, EditorTool, Position } from './types';
import { 
  Gamepad2, RotateCcw, PenTool, Download, Upload, 
  Check, Globe, Trash2
} from 'lucide-react';
import { getEffectiveTerrain } from './terrainUtils';

type DirectionKey = 'up' | 'down' | 'left' | 'right';
type DirectionVector = { key: DirectionKey; dx: number; dy: number };

const KEYBOARD_DIRECTION_MAP: Record<string, DirectionVector> = {
  ArrowUp: { key: 'up', dx: 0, dy: -1 },
  w: { key: 'up', dx: 0, dy: -1 },
  W: { key: 'up', dx: 0, dy: -1 },
  ArrowDown: { key: 'down', dx: 0, dy: 1 },
  s: { key: 'down', dx: 0, dy: 1 },
  S: { key: 'down', dx: 0, dy: 1 },
  ArrowLeft: { key: 'left', dx: -1, dy: 0 },
  a: { key: 'left', dx: -1, dy: 0 },
  A: { key: 'left', dx: -1, dy: 0 },
  ArrowRight: { key: 'right', dx: 1, dy: 0 },
  d: { key: 'right', dx: 1, dy: 0 },
  D: { key: 'right', dx: 1, dy: 0 }
};

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

  useEffect(() => {
    if (prevActiveCharRef.current === null) {
      prevActiveCharRef.current = gameState.activeChar;
      return;
    }
    if (prevActiveCharRef.current !== gameState.activeChar) {
      initAudio();
      playSound('switch');
    }
    prevActiveCharRef.current = gameState.activeChar;
  }, [gameState.activeChar]);

  // --- Editor State ---
  const [editorTool, setEditorTool] = useState<EditorTool>('wall');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // --- Audio (Simple Ref) ---
  const audioCtx = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx.current;
  }, []);

  const unlockAudio = useCallback(() => {
    const ctx = ensureAudioContext();
    if (!ctx) return Promise.resolve();

    if (ctx.state === 'suspended') {
      return ctx.resume().then(() => {
        audioUnlockedRef.current = ctx.state === 'running';
      });
    }

    audioUnlockedRef.current = ctx.state === 'running';
    return Promise.resolve();
  }, [ensureAudioContext]);

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

  // Initialize Audio Context on interaction
  const initAudio = useCallback(() => {
    unlockAudio();
  }, [unlockAudio]);

  const playSound = (type: 'move' | 'switch' | 'win' | 'error' | 'collect') => {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    if (!audioUnlockedRef.current || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    
    if (type === 'move') {
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'switch') {
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1);
      osc.frequency.setValueAtTime(659, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'collect') {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(660, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.02, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  };

  const gamepadButtonStateRef = useRef({ start: false, switch: false, reset: false });
  const lastGamepadMoveTimeRef = useRef(0);
  const suppressGamepadSwitchRef = useRef(false);
  const lastKeyboardMoveTimeRef = useRef(0);
  const lastKeyboardDirectionRef = useRef<DirectionKey | null>(null);
  const keyboardActiveDirectionRef = useRef<DirectionVector | null>(null);
  const keyboardRepeatIntervalRef = useRef<number | null>(null);
  const lastKeyboardSwitchTimeRef = useRef(0);
  const keyboardSwitchHeldRef = useRef(false);
  const MOVE_COOLDOWN_MS = 280;
  const SWITCH_COOLDOWN_MS = 200;
  const lastGamepadDirectionRef = useRef<DirectionKey | null>(null);
 
  const handleMove = useCallback((dx: number, dy: number) => {
    if (isWon || mode === 'edit' || !hasStarted) return;
    initAudio();

    setGameState(prev => {
      const { activeChar, p1Pos, p2Pos } = prev;
      const currentPos = activeChar === CharacterType.P1_White ? p1Pos : p2Pos;
      const targetX = currentPos.x + dx;
      const targetY = currentPos.y + dy;

      // 1. Boundary Check
      if (targetX < 0 || targetX >= currentLevel.width || targetY < 0 || targetY >= currentLevel.height) {
        return prev;
      }

      // 2. Terrain Check
      const targetTerrain = getEffectiveTerrain(currentLevel, prev, targetX, targetY);
      if (targetTerrain === TerrainType.Wall || targetTerrain === TerrainType.Void) {
        return prev;
      }

      // 3. Color Logic & "Be the Path"
      const isP1Active = activeChar === CharacterType.P1_White;
      const otherCharPos = isP1Active ? p2Pos : p1Pos;
      const isOtherCharAtTarget = otherCharPos.x === targetX && otherCharPos.y === targetY;

      let canMove = false;

      if (isP1Active) {
        // P1 (White) needs Dark Tile OR Inactive P2 (Black acts as Dark)
        const isDarkTile = targetTerrain === TerrainType.DarkTile;
        if (isDarkTile || isOtherCharAtTarget) {
          canMove = true;
        }
      } else {
        // P2 (Black) needs Light Tile OR Inactive P1 (White acts as Light)
        const isLightTile = targetTerrain === TerrainType.LightTile;
        if (isLightTile || isOtherCharAtTarget) {
          canMove = true;
        }
      }

      if (canMove) {
        playSound('move');
        setMoveCount(c => c + 1);
        const nextP1 = isP1Active ? { x: targetX, y: targetY } : p1Pos;
        const nextP2 = !isP1Active ? { x: targetX, y: targetY } : p2Pos;
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
          // Avoid overlapping collect + win sounds by only playing collect mid-level
          playSound('collect');
        }
        return {
          ...prev,
          p1Pos: nextP1,
          p2Pos: nextP2,
          collectedTargets: nextCollected,
        };
      } else {
        // Optional: Bump animation or sound?
        return prev;
      }
    });
  }, [currentLevel, hasStarted, initAudio, isWon, mode, playSound]);

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
    }, MOVE_COOLDOWN_MS);
  }, [handleMove, hasStarted, mode, MOVE_COOLDOWN_MS, stopKeyboardRepeat]);

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
 
  const collectedCount = gameState.collectedTargets.filter(Boolean).length;
  useEffect(() => {
    if (collectedCount === currentLevel.targets.length && currentLevel.targets.length > 0) {
      setIsWon(true);
      playSound('win');
    }
  }, [collectedCount, currentLevel.targets.length]);

  const handleSwitch = useCallback(() => {
    if (isWon || mode === 'edit' || !hasStarted) return;
    initAudio();

    const overlapping =
      gameStateRef.current.p1Pos.x === gameStateRef.current.p2Pos.x &&
      gameStateRef.current.p1Pos.y === gameStateRef.current.p2Pos.y;

    if (overlapping) {
      playSound('error');
      return;
    }

    setGameState(prev => {
      const stillOverlapping = prev.p1Pos.x === prev.p2Pos.x && prev.p1Pos.y === prev.p2Pos.y;
      if (stillOverlapping) {
        return prev;
      }
      return {
        ...prev,
        activeChar: prev.activeChar === CharacterType.P1_White
          ? CharacterType.P2_Black
          : CharacterType.P1_White
      };
    });
  }, [hasStarted, initAudio, isWon, mode, playSound]);

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
      switch (e.key) {
        case ' ': case 'Enter': case 'e': case 'E':
          if (!keyboardSwitchHeldRef.current && now - lastKeyboardSwitchTimeRef.current >= SWITCH_COOLDOWN_MS) {
            handleSwitch();
            lastKeyboardSwitchTimeRef.current = now;
            keyboardSwitchHeldRef.current = true;
          }
          break;
        case 'r': case 'R':
          resetGame();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
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
         // Let's say Button 0 or 3 switches.
         const btnSwitch = gp.buttons[0].pressed || gp.buttons[1].pressed || gp.buttons[2].pressed || gp.buttons[3].pressed;
         const btnReset = gp.buttons[8].pressed || gp.buttons[9].pressed; // Select/Start often
 
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
           if (axisY < -0.5 || dpadUp) return { key: 'up', dx: 0, dy: -1 };
           if (axisY > 0.5 || dpadDown) return { key: 'down', dx: 0, dy: 1 };
           if (axisX < -0.5 || dpadLeft) return { key: 'left', dx: -1, dy: 0 };
           if (axisX > 0.5 || dpadRight) return { key: 'right', dx: 1, dy: 0 };
           return null;
         })();
 
         if (activeDirection) {
           const isContinuous = lastGamepadDirectionRef.current === activeDirection.key;
           if (!isContinuous || now - lastGamepadMoveTimeRef.current >= MOVE_COOLDOWN_MS) {
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
   }, [handleMove, handleSwitch, resetGame, mode, hasStarted, startGame, MOVE_COOLDOWN_MS]);


  // --- Editor Logic ---
  const handleEditorClick = (x: number, y: number) => {
    if (mode !== 'edit') return;
    
    // Create deep copy
    const newLevel = { ...currentLevel, terrain: currentLevel.terrain.map(r => [...r]) };
    
    // Tools
    if (editorTool === 'wall') newLevel.terrain[y][x] = TerrainType.Wall;
    else if (editorTool === 'light') newLevel.terrain[y][x] = TerrainType.LightTile;
    else if (editorTool === 'dark') newLevel.terrain[y][x] = TerrainType.DarkTile;
    else if (editorTool === 'eraser') newLevel.terrain[y][x] = TerrainType.Void;
    else if (editorTool === 'p1') {
      if (newLevel.terrain[y][x] !== TerrainType.DarkTile) {
        playSound('error');
        return;
      }
      newLevel.p1Start = { x, y };
    }
    else if (editorTool === 'p2') {
      if (newLevel.terrain[y][x] !== TerrainType.LightTile) {
        playSound('error');
        return;
      }
      newLevel.p2Start = { x, y };
    }
    else if (editorTool === 'target') {
      if (newLevel.terrain[y][x] === TerrainType.Wall) {
        playSound('error');
        return;
      }
      // Toggle target
      const idx = newLevel.targets.findIndex(t => t.x === x && t.y === y);
      if (idx >= 0) newLevel.targets = newLevel.targets.filter((_, i) => i !== idx);
      else newLevel.targets = [...newLevel.targets, { x, y }];
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

  const exportLevel = () => {
    const data = JSON.stringify(currentLevel);
    navigator.clipboard.writeText(data).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const importLevel = () => {
    const data = prompt("Paste level JSON here:");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        // Basic validation
        if (parsed.width && parsed.height && parsed.terrain && parsed.p1Start) {
          setCurrentLevel(parsed);
          resetGame();
        } else {
          alert(t.error);
        }
      } catch (e) {
        alert(t.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#111] text-gray-200 flex flex-col items-stretch font-sans select-none">
      
      {/* Header Area */}
      <div className="w-full px-4 py-4 flex justify-between items-center bg-[#181818] border-b border-[#333]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col leading-tight">
             <h1 className="text-2xl font-black tracking-widest text-white">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row w-full gap-4 p-4 overflow-hidden">
        
        {/* Left Panel: Controls / Info */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
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
             <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333] flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-[#333] pb-2">
                  <span className="text-gray-500 text-sm font-bold tracking-wider">{t.moves}</span>
                  <span className="text-2xl font-mono">{moveCount}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#333] pb-2">
                  <span className="text-gray-500 text-sm font-bold tracking-wider">{t.targets}</span>
                  <span className="text-2xl font-mono text-green-500">{collectedCount} / {currentLevel.targets.length}</span>
                </div>
                
                <div className="space-y-2 mt-2">
                  <div className={`p-2 rounded border flex items-center justify-between transition-all ${gameState.activeChar === CharacterType.P1_White ? 'bg-white text-black border-white' : 'bg-[#222] text-gray-500 border-[#333]'}`}>
                    <span className="text-xs font-bold">{t.p1}</span>
                    {gameState.activeChar === CharacterType.P1_White && <Check size={14} />}
                  </div>
                  <div className={`p-2 rounded border flex items-center justify-between transition-all ${gameState.activeChar === CharacterType.P2_Black ? 'bg-black text-white border-white' : 'bg-[#222] text-gray-500 border-[#333]'}`}>
                    <span className="text-xs font-bold">{t.p2}</span>
                    {gameState.activeChar === CharacterType.P2_Black && <Check size={14} />}
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-2 leading-relaxed space-y-3">
                  <p>{t.instructions}</p>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500">
                    <span>{t.controls}</span>
                    <button onClick={resetGame} className="flex items-center gap-1 text-white bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition-colors">
                      <RotateCcw size={12} /> {t.reset}
                    </button>
                  </div>
                </div>
             </div>
           )}

           {/* Editor Tools (Edit Mode) */}
           {mode === 'edit' && (
             <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333] flex flex-col gap-4 animate-in fade-in slide-in-from-left-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.width} / {t.height}</div>
                <div className="flex gap-2">
                   <div className="flex items-center gap-2 bg-[#222] px-2 rounded">
                      <span className="text-gray-500 text-xs">W</span>
                      <button onClick={() => resizeLevel(currentLevel.width-1, currentLevel.height)} className="p-1 hover:text-white">-</button>
                      <span className="font-mono w-4 text-center">{currentLevel.width}</span>
                      <button onClick={() => resizeLevel(currentLevel.width+1, currentLevel.height)} className="p-1 hover:text-white">+</button>
                   </div>
                   <div className="flex items-center gap-2 bg-[#222] px-2 rounded">
                      <span className="text-gray-500 text-xs">H</span>
                      <button onClick={() => resizeLevel(currentLevel.width, currentLevel.height-1)} className="p-1 hover:text-white">-</button>
                      <span className="font-mono w-4 text-center">{currentLevel.height}</span>
                      <button onClick={() => resizeLevel(currentLevel.width, currentLevel.height+1)} className="p-1 hover:text-white">+</button>
                   </div>
                </div>

                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">{t.tools}</div>
                <div className="grid grid-cols-2 gap-2">
                   {[
                     { id: 'wall', label: 'WALL', color: 'bg-neutral-800' },
                     { id: 'dark', label: 'DARK', color: 'bg-black border border-gray-700' },
                     { id: 'light', label: 'LIGHT', color: 'bg-gray-200 text-black' },
                     { id: 'eraser', label: 'VOID', color: 'bg-neutral-900 border border-red-900/50 text-red-500', icon: Trash2 },
                     { id: 'p1', label: 'START P1', color: 'bg-white text-black border border-gray-400' },
                     { id: 'p2', label: 'START P2', color: 'bg-black text-white border border-gray-600' },
                     { id: 'target', label: 'TARGET', color: 'bg-green-900 text-green-400 border border-green-700' },
                   ].map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setEditorTool(tool.id as EditorTool)}
                        className={`p-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all border-2 ${
                          editorTool === tool.id 
                            ? 'border-yellow-500 scale-105 shadow-lg' 
                            : 'border-transparent opacity-70 hover:opacity-100'
                        } ${tool.color}`}
                      >
                         {tool.icon && <tool.icon size={12} />}
                         {tool.label}
                      </button>
                   ))}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-[#333]">
                   <button onClick={exportLevel} className="flex-1 bg-[#222] hover:bg-[#333] py-2 rounded text-xs flex items-center justify-center gap-1">
                      {copyFeedback ? <Check size={12} className="text-green-500"/> : <Download size={12}/>}
                      {copyFeedback ? t.copied : t.export}
                   </button>
                   <button onClick={importLevel} className="flex-1 bg-[#222] hover:bg-[#333] py-2 rounded text-xs flex items-center justify-center gap-1">
                      <Upload size={12}/> {t.import}
                   </button>
                </div>
             </div>
           )}
        </div>

        {/* Center: Game Board */}
        <div className="flex-1 flex flex-col items-center justify-center relative bg-[#0a0a0a] rounded-xl border border-[#222] shadow-inner p-4 overflow-hidden">
            
            <GameBoard 
              level={currentLevel} 
              gameState={gameState} 
              editorMode={mode === 'edit'}
              collectedTargets={gameState.collectedTargets}
              onBlockClick={handleEditorClick}
              editorP1Start={currentLevel.p1Start}
              editorP2Start={currentLevel.p2Start}
            />

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

           {/* Mobile Controls Overlay (Only visible on touch devices mainly, but helpful visual cue) */}
           <div className="absolute bottom-4 right-4 flex gap-2 md:hidden">
              <button 
                onClick={handleSwitch}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center active:bg-white/30"
              >
                <RotateCcw className="text-white" />
              </button>
           </div>
         </div>

      </div>

      {!hasStarted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1b1b1b] border border-white/10 rounded-2xl px-8 py-10 text-center space-y-6 shadow-2xl">
            <h2 className="text-3xl font-bold text-white tracking-wide">准备好开始了吗？</h2>
            <p className="text-sm text-gray-400">点击按钮或使用键盘 E / 手柄 A 即可开始游戏。</p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-full bg-white text-black font-bold text-lg tracking-wide hover:scale-105 transition"
            >
               开始游戏
             </button>
           </div>
         </div>
       )}
    </div>
  );
};

export default App;
