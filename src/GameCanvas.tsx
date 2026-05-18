import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './lib/GameEngine';
import { drawEntity } from './lib/renderer';
import { audio } from './lib/audio';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings, X, Volume2, Vibrate, Pause, Play } from 'lucide-react';

interface Props {
  key?: string | number;
  level: number;
  mode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  multiplier: number;
  theme?: 'default' | 'oled' | 'deep';
  controllerType?: string;
  isPaused: boolean;
  onGameOver: (win: boolean, finalScore: number) => void;
  onGoHome: () => void;
  startInEditMode?: boolean;
  onEditDone?: () => void;
}

export function GameCanvas({ level, mode, difficulty, score, multiplier, theme = 'default', controllerType = 'dpad', isPaused, onGameOver, onGoHome, startInEditMode = false, onEditDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine>(new GameEngine());
  const scoreRef = useRef<HTMLSpanElement>(null);
  const multiplierRef = useRef<HTMLSpanElement>(null);
  const joystickThumbRef = useRef<HTMLDivElement>(null);
  const [dangerMult, setDangerMult] = useState(0);
  const [steps, setSteps] = useState(0);
  const [hasTrap, setHasTrap] = useState(false);
  const hasTrapRef = useRef(false);
  const [isEditingControls, setIsEditingControls] = useState(startInEditMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [volume, setVolume] = useState(audio.volume * 100);
  const [controlPositions, setControlPositions] = useState(() => {
    const defaults = { 
       up: { x: 0, y: 0 }, 
       down: { x: 0, y: 0 }, 
       left: { x: 0, y: 0 }, 
       right: { x: 0, y: 0 },
       trap: { x: 0, y: 0 },
       settings: { x: 0, y: 0 },
       score: { x: 0, y: 0 },
       home: { x: 0, y: 0 },
       joystick: { x: 0, y: 0 }
    };
    try {
      const saved = localStorage.getItem('control_pos_v7');
      if (saved) {
         return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return defaults;
  });

  const saveControlPositions = (key: string, _e: any, info: any) => {
     const newPos = {
        ...controlPositions,
        [key]: { x: controlPositions[key].x + info.offset.x, y: controlPositions[key].y + info.offset.y }
     };
     setControlPositions(newPos);
     localStorage.setItem('control_pos_v7', JSON.stringify(newPos));
  };

  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
     onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  const isPausedRef = useRef(isPaused || isSettingsOpen || isUserPaused || isEditingControls);
  useEffect(() => {
     isPausedRef.current = isPaused || isSettingsOpen || isUserPaused || isEditingControls;
  }, [isPaused, isSettingsOpen, isUserPaused, isEditingControls]);

  const visualPulseRef = useRef({ r: 0, g: 0, b: 0, a: 0, start: 0 });

  useEffect(() => {
    const engine = engineRef.current;
    
    // First interaction unlocks audio
    const unlockAudio = () => audio.init();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    // Start BGM when entering the game
    audio.startBGM();

      audio.onPlay = (type) => {
        if (type === 'nom' || type === 'win') {
          if ('vibrate' in navigator) navigator.vibrate(100);
        }
        else if (type === 'caught' || type === 'lose') {
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        }
        else if (type === 'trap') {
          if ('vibrate' in navigator) navigator.vibrate(50);
        }
    };

    engine.score = score;
    engine.multiplier = multiplier;
    
    // Calculate aspect ratio for maze map
    const rect = canvasRef.current?.parentElement?.getBoundingClientRect() || { width: 400, height: 800 };
    let aspectRatio = 1.0;
    
    if (window.innerWidth < 768) {
       // Mobile sizing: use the entire available viewport height
       aspectRatio = rect.height / rect.width;
    } else {
       aspectRatio = rect.height / rect.width;
    }
    
    engine.initList(level, mode, difficulty, aspectRatio, (win) => {
       setTimeout(()=>onGameOverRef.current(win, engine.score), 100);
    });

    let rafId: number;
    let lastTime = performance.now();
    let accumulatedTime = 0;

    const loop = (time: number) => {
      rafId = requestAnimationFrame(loop);
      let dt = (time - lastTime) / 1000;
      if (typeof dt !== 'number' || isNaN(dt) || dt <= 0 || dt > 0.1) dt = 0.016;
      lastTime = time;
      
      if (isPausedRef.current) return;

      accumulatedTime += dt;
      if (accumulatedTime >= 1) {
         setSteps(s => s + 1);
         accumulatedTime -= 1;
      }
      
      engine.update(dt);

      if (scoreRef.current) scoreRef.current.textContent = engine.score.toString();
      if (multiplierRef.current) multiplierRef.current.textContent = engine.multiplier.toFixed(1);

      const trapPlaced = engine.entities.some(e => String(e.species).startsWith('trap_'));
      if (trapPlaced !== hasTrapRef.current) {
         hasTrapRef.current = trapPlaced;
         setHasTrap(trapPlaced);
      }
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ensure canvas respects size constraints and High DPI (4K quality)
      const rect = canvas.parentElement?.getBoundingClientRect() || { width: 400, height: 400 };
      const dpr = window.devicePixelRatio || 1;
      
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
         canvas.width = rect.width * dpr;
         canvas.height = rect.height * dpr;
         canvas.style.width = `${rect.width}px`;
         canvas.style.height = `${rect.height}px`;
      }

      // Transform logic to fit the grid centrally
      const VIRTUAL_WIDTH = engine.cols * engine.cellSize;
      const VIRTUAL_HEIGHT = engine.rows * engine.cellSize;
      const scale = Math.min(canvas.width / VIRTUAL_WIDTH, canvas.height / VIRTUAL_HEIGHT);
      const offsetX = (canvas.width - VIRTUAL_WIDTH * scale) / 2;
      const offsetY = 0; 

      // Clear Canvas (Container has background)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw metallic plate effect for background
      if (theme !== 'oled') {
        ctx.fillStyle = '#166534';
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < canvas.width; i+= 60 * dpr) {
          for (let j = 0; j < canvas.height; j+= 60 * dpr) {
            ctx.beginPath(); ctx.arc(i + 30 * dpr, j + 30 * dpr, 2 * dpr, 0, Math.PI*2); ctx.fill();
          }
        }
        ctx.strokeStyle = '#022c22';
        ctx.lineWidth = 1 * dpr;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < canvas.width; i+= 60 * dpr) {
           ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for (let j = 0; j < canvas.height; j+= 60 * dpr) {
           ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      } else {
        // Explicitly fill background black for OLED theme
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1 * dpr;
        ctx.globalAlpha = 1.0;
        for (let i = 0; i < canvas.width; i+= 60 * dpr) {
           ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for (let j = 0; j < canvas.height; j+= 60 * dpr) {
           ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw Danger Glow (if player is rat and cat is near)
      let dMult = 0;
      const player = engine.entities.find(e => e.isPlayer);
      if (player && mode.startsWith('survival')) {
         let predType = 'cat';
         if (mode === 'survival_cat') predType = 'dog';
         if (mode === 'survival_deer') predType = 'lion';
         if (mode === 'survival_rabbit') predType = 'wolf';
         if (mode === 'survival_bug') predType = 'frog';
         const pred = engine.entities.find(e => e.species === predType);
         if (pred) {
            const dist = Math.abs(pred.x - player.x) + Math.abs(pred.y - player.y);
            if (dist <= 2) dMult = 1;
            else if (dist <= 4) dMult = 0.5;
         }
      }
      setDangerMult(dMult);

      const draw2DMaze = () => {
         const cs = engine.cellSize;
         ctx.lineCap = 'round';
         ctx.lineJoin = 'round';

         // Original Matte Orange Walls
         ctx.strokeStyle = '#f97316';
         ctx.lineWidth = 4;
         ctx.beginPath();
         for (let y = 0; y < engine.rows; y++) {
            for (let x = 0; x < engine.cols; x++) {
               const c = engine.maze[y][x];
               const px = x * cs;
               const py = y * cs;
               if (c.n) { ctx.moveTo(px, py); ctx.lineTo(px + cs, py); }
               if (c.s) { ctx.moveTo(px, py + cs); ctx.lineTo(px + cs, py + cs); }
               if (c.e) { ctx.moveTo(px + cs, py); ctx.lineTo(px + cs, py + cs); }
               if (c.w) { ctx.moveTo(px, py); ctx.lineTo(px, py + cs); }
            }
         }
         ctx.stroke();
      };

      // Draw grid maze - Sharp 2D
      ctx.lineCap = 'square';
      
      draw2DMaze();

      // Draw Entities
      try {
        const sorted = [...engine.entities].sort((a, b) => {
           let scoreA = 0;
           let scoreB = 0;
           if (['cheese', 'milk', 'water', 'carrot', 'leaf'].includes(a.species)) scoreA -= 2;
           if (a.state === 'caught') scoreA -= 1;
           if (['cheese', 'milk', 'water', 'carrot', 'leaf'].includes(b.species)) scoreB -= 2;
           if (b.state === 'caught') scoreB -= 1;
           return scoreA - scoreB;
        });

        for (const e of sorted) {
           // Skip rendering if cx or cy is corrupted somehow
           if (isNaN(e.cx) || isNaN(e.cy)) continue;
           drawEntity(ctx, e.species, e.cx + engine.cellSize/2, e.cy + engine.cellSize/2, e.dir || 0, time || 0, e.state, e.isTarget);
        }
      } catch (err) {
        console.error("Render loop error", err);
      }

      ctx.restore();
    };
    rafId = requestAnimationFrame(loop);

    const handleKey = (e: KeyboardEvent) => {
       if (['ArrowUp','w','W'].includes(e.key)) engine.playerInput = 'UP';
       if (['ArrowDown','s','S'].includes(e.key)) engine.playerInput = 'DOWN';
       if (['ArrowLeft','a','A'].includes(e.key)) engine.playerInput = 'LEFT';
       if (['ArrowRight','d','D'].includes(e.key)) engine.playerInput = 'RIGHT';
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let hasSwiped = false;
    const handleTouchStart = (e: TouchEvent) => {
       if (isPausedRef.current || controllerType !== 'swipe') return;
       // Skip swipe if target is a button or interactive element
       if ((e.target as HTMLElement).closest('button')) return;
       
       touchStartX = e.changedTouches[0].screenX;
       touchStartY = e.changedTouches[0].screenY;
       hasSwiped = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
       if (isPausedRef.current || controllerType !== 'swipe') return;
       // Skip swipe if target is a button
       if ((e.target as HTMLElement).closest('button')) return;

       // Prevent default behavior (scrolling) when swiping if playing
       if (engineRef.current.active) e.preventDefault();
       const touchEndX = e.changedTouches[0].screenX;
       const touchEndY = e.changedTouches[0].screenY;
       
       const diffX = touchEndX - touchStartX;
       const diffY = touchEndY - touchStartY;
       
       // Higher threshold for more intentional swiping
       if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) return;
       hasSwiped = true;
       
       if (Math.abs(diffX) > Math.abs(diffY)) {
           engine.playerInput = diffX > 0 ? 'RIGHT' : 'LEFT';
       } else {
           engine.playerInput = diffY > 0 ? 'DOWN' : 'UP';
       }
       // Reset start point to allow for quick direction changes without lifting finger
       touchStartX = touchEndX;
       touchStartY = touchEndY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
       if (isPausedRef.current || controllerType !== 'swipe') return;
       // Skip swipe if target is a button
       if ((e.target as HTMLElement).closest('button')) return;

       if (!hasSwiped) {
           // It was a tap!
           const cx = window.innerWidth / 2;
           const cy = window.innerHeight / 2;
           const tapX = e.changedTouches[0].screenX;
           const tapY = e.changedTouches[0].screenY;
           const dx = tapX - cx;
           const dy = tapY - cy;
           
           if (Math.abs(dx) > Math.abs(dy)) {
               engine.playerInput = dx > 0 ? 'RIGHT' : 'LEFT';
           } else {
               engine.playerInput = dy > 0 ? 'DOWN' : 'UP';
           }
           engine.singleStepInput = true;
       }
       // Do not nullify playerInput for swipe. Swipe sets constant direction.
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
       cancelAnimationFrame(rafId);
       window.removeEventListener('keydown', handleKey);
       window.removeEventListener('touchstart', handleTouchStart);
       window.removeEventListener('touchmove', handleTouchMove);
       window.removeEventListener('touchend', handleTouchEnd);
       engine.active = false;
       audio.onPlay = undefined;
       audio.stopBGM();
    };
  }, [level, mode, controllerType]);

  const handleDir = (d: 'UP'|'DOWN'|'LEFT'|'RIGHT'|null) => {
     engineRef.current.playerInput = d;
  };

  const handleTrap = () => {
     engineRef.current.placeTrap();
  };

  const padZero = (n: number) => n < 10 ? `0${n}` : `${n}`;
  const displayTime = `${padZero(Math.floor(steps/60))}:${padZero(steps%60)}`;

  let borderColor = 'border-[#166534]/30';
  let canvasShadow = 'shadow-none';
  if (dangerMult > 0) {
      borderColor = dangerMult === 1 ? 'border-red-500/80' : 'border-yellow-500/80';
      canvasShadow = dangerMult === 1 ? 'shadow-none' : 'shadow-none';
  }

  const handleVolumeChange = (e: any) => {
    const v = parseInt(e.target.value, 10);
    setVolume(v);
    audio.setVolume(v / 100);
  };

  const ctrlBase = isEditingControls 
    ? `bg-[#222]/40 border-[4px] border-[#444] cursor-move text-white`
    : `bg-transparent border-2 ${theme === 'oled' ? 'border-white/20 text-white/50' : 'border-[#166534]/30 text-[#65a30d]/50'} active:scale-95 active:bg-white/5`;

  const trapCtrlBase = isEditingControls
    ? `bg-red-900/40 border-[4px] border-red-500 cursor-move text-white`
    : (hasTrap 
        ? `bg-transparent border-2 border-dashed ${theme === 'oled' ? 'border-red-500/20 text-red-500/20' : 'border-red-500/20 text-red-500/20'} opacity-50` 
        : `bg-transparent border-2 ${theme === 'oled' ? 'border-red-500/30 text-white/80' : 'border-red-500/40 text-white/80'} active:scale-95 active:bg-red-500/10`
      );

  return (
    <div className={`w-full h-[100dvh] fixed inset-0 text-[#65a30d] font-mono flex flex-col overflow-hidden md:p-6 z-0 bg-transparent`}>
      
      {/* Main Gameplay Layout */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-0 md:gap-8 min-h-0 relative items-center md:items-stretch">
        
        {/* Left Sidebar: Level Progress */}
        <aside className="col-span-2 hidden md:flex flex-col gap-2 overflow-y-auto shrink-0 pt-4">
          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Progressive Tiers</div>
          <div className="flex flex-col gap-1">
             <div className={`p-2 border-l-2 text-xs ${level >= 10 ? 'border-green-500 bg-green-500/5 text-green-500' : 'border-white bg-white/10 text-white ring-1 ring-white/20'}`}>L10: APPRENTICE</div>
             <div className={`p-2 border-l-2 text-xs ${level >= 20 ? (level > 20 ? 'border-green-500 bg-green-500/5 text-green-500' : 'border-white bg-white/10 text-white font-bold ring-1 ring-white/20') : 'border-transparent opacity-30'}`}>L20: EXPERT</div>
             <div className={`p-2 border-l-2 text-xs ${level >= 30 ? (level > 30 ? 'border-green-500 bg-green-500/5 text-green-500' : 'border-white bg-white/10 text-white font-bold ring-1 ring-white/20') : 'border-transparent opacity-30'}`}>L30: MASTER</div>
             <div className={`p-2 border-l-2 text-xs ${level >= 40 ? (level > 40 ? 'border-green-500 bg-green-500/5 text-green-500' : 'border-white bg-white/10 text-white font-bold ring-1 ring-white/20') : 'border-transparent opacity-30'}`}>L40: GRANDMASTER</div>
             <div className={`p-2 border-l-2 text-xs ${level >= 50 ? 'border-white bg-white/10 text-white font-bold ring-1 ring-white/20' : 'border-transparent opacity-30'}`}>L50: ENDLESS MAX</div>
          </div>
          
          <div className="mt-auto p-4 rounded-lg bg-[#166534]/10 border border-[#166534]/30 transition-colors">
            <p className="text-[10px] uppercase mb-1 opacity-60">System Alert</p>
            {dangerMult === 1 ? (
              <p className="text-[11px] leading-relaxed text-red-400 font-bold">WARNING: PREDATOR IN CLOSE PROXIMITY.</p>
            ) : mode.startsWith('survival') ? (
              <p className="text-[11px] leading-relaxed">Avoid predators. Locate the exit target.</p>
            ) : (
              <p className="text-[11px] leading-relaxed">Hunt mode activated. Secure target.</p>
            )}
          </div>
        </aside>

        {/* Center: Game Canvas */}
        <main className="w-full md:col-span-12 flex flex-col items-center justify-start relative shrink-0 w-full h-full overflow-hidden mt-0 pt-0 z-10 transition-all duration-500">
          {/* Full screen on mobile */}
          <div 
             className={`relative w-full h-full md:aspect-square md:max-w-[800px] ${theme === 'oled' ? 'bg-[#000]' : theme === 'deep' ? 'bg-[#022c22]' : 'bg-[#022c22]/50 '} md:rounded-xl md:border-2 transition-all ${borderColor} ${canvasShadow} ${dangerMult > 0 ? 'border-y-2 md:border-2' : ''}`}
          >
            <canvas 
               ref={canvasRef} 
               className="absolute top-0 left-0 w-full h-full block"
            />
          </div>
        </main>

        {/* Global Controls */}
        <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden" style={{ touchAction: 'none' }}>
            {/* Top Close Button for quick exit to home */}
            <motion.button 
               whileTap={{ scale: 0.9 }}
               onClick={() => onGoHome()}
               className={`absolute top-4 right-4 z-[100] w-10 h-10 rounded-full border border-white/20 bg-black/40 flex items-center justify-center text-white/50 hover:bg-white/10 transition-all pointer-events-auto`}
            >
               <X size={20} />
            </motion.button>
        </div>

        {/* Right Sidebar: Controls & Legend */}
        <aside className="md:col-span-3 flex flex-col gap-4 shrink-0 w-full px-4 pt-8 md:px-0 md:pt-4 z-40 pb-4 h-auto justify-center flex-1">
          {/* Entity Legend */}
          <div className="hidden md:flex flex-col gap-3">
            <div className="text-[10px] uppercase opacity-40">Entity Status</div>
            {mode.startsWith('survival') && (
               <>
                 <div className="flex items-center gap-3 bg-white/5 p-2 rounded">
                   <span className="text-lg">{mode === 'survival_rat' ? '🐭' : (mode === 'survival_cat' ? '🐱' : mode === 'survival_deer' ? '🦌' : mode === 'survival_rabbit' ? '🐰' : '🐛')}</span>
                   <div className="flex-1">
                     <p className="text-[11px] font-bold uppercase">{mode === 'survival_rat' ? 'RAT' : (mode === 'survival_cat' ? 'CAT' : mode === 'survival_deer' ? 'DEER' : mode === 'survival_rabbit' ? 'RABBIT' : 'BUG')} (Player)</p>
                     <p className="text-[9px] opacity-60">Status: <span className={dangerMult > 0 ? "text-red-500 uppercase" : "text-green-500 uppercase"}>{dangerMult > 0 ? 'DANGER' : 'CLEAR'}</span></p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 bg-white/5 p-2 rounded">
                   <span className="text-lg">{mode === 'survival_rat' ? '🐱' : (mode === 'survival_cat' ? '🐶' : mode === 'survival_deer' ? '🦁' : mode === 'survival_rabbit' ? '🐺' : '🐸')}</span>
                   <div className="flex-1">
                     <p className="text-[11px] font-bold uppercase">{mode === 'survival_rat' ? 'CAT' : (mode === 'survival_cat' ? 'DOG' : mode === 'survival_deer' ? 'LION' : mode === 'survival_rabbit' ? 'WOLF' : 'FROG')} (Hunter)</p>
                     <p className="text-[9px] opacity-60">Targeting: <span className="text-red-400 uppercase">You</span></p>
                   </div>
                 </div>
               </>
            )}
            {mode.startsWith('hunter') && (
               <>
                 <div className="flex items-center gap-3 bg-white/5 p-2 rounded">
                   <span className="text-lg">{mode === 'hunter_cat' ? '🐱' : (mode === 'hunter_dog' ? '🐶' : mode === 'hunter_lion' ? '🦁' : mode === 'hunter_wolf' ? '🐺' : '🐸')}</span>
                   <div className="flex-1">
                     <p className="text-[11px] font-bold uppercase">{mode === 'hunter_cat' ? 'CAT' : (mode === 'hunter_dog' ? 'DOG' : mode === 'hunter_lion' ? 'LION' : mode === 'hunter_wolf' ? 'WOLF' : 'FROG')} (Player)</p>
                     <p className="text-[9px] opacity-60">Status: <span className="text-green-500 uppercase">HUNTING</span></p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 bg-white/5 p-2 rounded">
                   <span className="text-lg">{mode === 'hunter_cat' ? '🐭' : (mode === 'hunter_dog' ? '🐱' : mode === 'hunter_lion' ? '🦌' : mode === 'hunter_wolf' ? '🐰' : '🐛')}</span>
                   <div className="flex-1">
                     <p className="text-[11px] font-bold uppercase">{mode === 'hunter_cat' ? 'RAT' : (mode === 'hunter_dog' ? 'CAT' : mode === 'hunter_lion' ? 'DEER' : mode === 'hunter_wolf' ? 'RABBIT' : 'BUG')} (Prey)</p>
                     <p className="text-[9px] opacity-60">Evasion: <span className="text-yellow-400 uppercase">Active</span></p>
                   </div>
                 </div>
               </>
            )}
          </div>
        </aside>
      </div>

      {/* Global Stats Display (Formerly under canvas) */}
      <motion.div 
         animate={{ x: controlPositions.score.x, y: controlPositions.score.y }}
         drag={isEditingControls}
         dragMomentum={false}
         onDragEnd={(e, info) => saveControlPositions('score', e, info)}
         className={`fixed bottom-20 sm:bottom-6 left-6 z-[70] flex flex-col gap-2 text-[#65a30d] uppercase text-[10px] tracking-widest opacity-90 ${isEditingControls ? 'pointer-events-auto border-2 border-dashed border-[#65a30d] p-2 bg-black/40 rounded-xl rounded-tr-none touch-none' : 'pointer-events-none'}`}
      >
        <div className="flex flex-col gap-0.5 pointer-events-none">
          <span className="opacity-50">Score</span>
          <span ref={scoreRef} className="font-bold text-lg tracking-wider">0</span>
        </div>
      </motion.div>

      {/* Pause Overlay */}
      <AnimatePresence>
        {isUserPaused && !isSettingsOpen && !isPaused && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             onClick={() => setIsUserPaused(false)}
             className="fixed inset-0 z-[65] bg-black/60  flex flex-col items-center justify-center cursor-pointer pointer-events-auto"
           >
             <h2 className="text-4xl font-bold tracking-widest text-[#65a30d] uppercase mb-4">
               Paused
             </h2>
             <span className="text-[#a3e635] opacity-60 text-sm uppercase tracking-widest">Tap to resume</span>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Global Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80  flex items-center justify-center flex-col p-6 pointer-events-auto"
          >
            <div className={`${theme === 'oled' ? 'bg-[#111] border-[#333]' : 'bg-[#064e3b] border-[#047857]/40'} border rounded-2xl p-8 max-w-sm w-full relative text-center max-h-[90vh] overflow-y-auto mt-12 mb-12`}>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[120] text-white hover:text-[#65a30d] transition-colors bg-black/50 p-2 sm:p-3 rounded-full border border-white/20 "
              >
                <X size={28} />
              </button>
              
              <h2 className={`text-2xl font-bold tracking-tighter mb-8 uppercase flex items-center justify-center gap-3 ${theme === 'oled' ? 'text-white' : 'text-[#65a30d]'}`}>
                <Settings size={28} />
                Settings
              </h2>

              <div className="flex flex-col gap-8 text-left">
                {/* High Score */}
                <div className={`${theme === 'oled' ? 'bg-[#000] border-[#333]' : 'bg-[#022c22] border-[#047857]/50'} border p-4 rounded-xl flex items-center justify-between`}>
                  <span className={`flex items-center gap-2 uppercase text-sm tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#65a30d]'}`}>
                    High Score
                  </span>
                  <span className={`text-2xl font-mono font-black tracking-wider ${theme === 'oled' ? 'text-gray-300' : 'text-[#65a30d]'}`}>
                    {Number(localStorage.getItem('maza_high_score') || 0).toLocaleString()}
                  </span>
                </div>

              </div>

              <div className="mt-10 text-[10px] uppercase opacity-40 tracking-widest">
                Maze Runner v6.0
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Absolute Drag-and-drop Controls Overlay */}
      <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden block md:hidden" style={{ touchAction: 'none' }}>
        {isEditingControls && (
           <button 
              onClick={() => {
                  setIsEditingControls(false);
                  if (onEditDone) onEditDone();
              }}
              className={`absolute z-50 px-6 py-3 font-black rounded-xl border border-white top-4 left-1/2 -translate-x-1/2 pointer-events-auto ${theme === 'oled' ? 'bg-[#bbb] hover:bg-white text-black' : 'bg-[#65a30d] text-[#022c22]'}`}
           >
              DONE EDITING
           </button>
        )}
        {isEditingControls && <div className={`absolute top-[85%] left-0 w-full text-center font-bold text-[12px] py-2 pointer-events-none tracking-wider z-50 border-y-2 ${theme === 'oled' ? 'text-white bg-black/80 border-[#555]/50' : 'text-[#65a30d] bg-black/60 border-[#65a30d]/30'}`}>DRAG TO REPOSITION OVERLAY</div>}

        {controllerType === 'dpad' && (
           <>
             <motion.button 
                animate={{ x: controlPositions.up.x, y: controlPositions.up.y }}
                drag={isEditingControls}
                dragMomentum={false}
                onDragEnd={(e, info) => saveControlPositions('up', e, info)}
                onPointerDown={() => !isEditingControls && handleDir('UP')}
                onPointerUp={() => !isEditingControls && handleDir(null)}
                onPointerLeave={() => !isEditingControls && handleDir(null)}
                className={`absolute w-16 h-16 rounded-xl flex items-center justify-center transition-all touch-manipulation pointer-events-auto z-40 ${ctrlBase}`}
                style={{ left: '50%', top: '75%', marginLeft: '-32px', marginTop: '-96px' }}
             >
               <ChevronUp size={36} />
             </motion.button>

        <motion.button 
           animate={{ x: controlPositions.down.x, y: controlPositions.down.y }}
           drag={isEditingControls}
           dragMomentum={false}
           onDragEnd={(e, info) => saveControlPositions('down', e, info)}
           onPointerDown={() => !isEditingControls && handleDir('DOWN')}
           onPointerUp={() => !isEditingControls && handleDir(null)}
           onPointerLeave={() => !isEditingControls && handleDir(null)}
           className={`absolute w-16 h-16 rounded-xl flex items-center justify-center transition-all touch-manipulation pointer-events-auto z-40 ${ctrlBase}`}
           style={{ left: '50%', top: '75%', marginLeft: '-32px', marginTop: '32px' }}
        >
          <ChevronDown size={36} />
        </motion.button>

        <motion.button 
           animate={{ x: controlPositions.left.x, y: controlPositions.left.y }}
           drag={isEditingControls}
           dragMomentum={false}
           onDragEnd={(e, info) => saveControlPositions('left', e, info)}
           onPointerDown={() => !isEditingControls && handleDir('LEFT')}
           onPointerUp={() => !isEditingControls && handleDir(null)}
           onPointerLeave={() => !isEditingControls && handleDir(null)}
           className={`absolute w-16 h-16 rounded-xl flex items-center justify-center transition-all touch-manipulation pointer-events-auto z-40 ${ctrlBase}`}
           style={{ left: '50%', top: '75%', marginLeft: '-96px', marginTop: '-32px' }}
        >
          <ChevronLeft size={36} />
        </motion.button>

             <motion.button 
                animate={{ x: controlPositions.right.x, y: controlPositions.right.y }}
                drag={isEditingControls}
                dragMomentum={false}
                onDragEnd={(e, info) => saveControlPositions('right', e, info)}
                onPointerDown={() => !isEditingControls && handleDir('RIGHT')}
                onPointerUp={() => !isEditingControls && handleDir(null)}
                onPointerLeave={() => !isEditingControls && handleDir(null)}
                className={`absolute w-16 h-16 rounded-xl flex items-center justify-center transition-all touch-manipulation pointer-events-auto z-40 ${ctrlBase}`}
                style={{ left: '50%', top: '75%', marginLeft: '32px', marginTop: '-32px' }}
             >
               <ChevronRight size={36} />
             </motion.button>
           </>
        )}

        {controllerType === 'joystick' && (
           <motion.div 
              animate={{ x: controlPositions.joystick.x, y: controlPositions.joystick.y }}
              drag={isEditingControls}
              dragMomentum={false}
              onDragEnd={(e, info) => saveControlPositions('joystick', e, info)}
              className={`absolute w-full z-30 pointer-events-auto ${isEditingControls ? 'cursor-move' : ''}`} 
              style={{ left: '0', top: '75%', marginTop: '-32px', touchAction: 'none' }}
           >
              <div 
                 className={`w-32 h-32 rounded-full border-4 mx-auto relative flex items-center justify-center ${theme === 'oled' ? 'border-white/20 bg-white/5' : 'border-[#65a30d]/20 bg-[#84cc16]/5'} ${isEditingControls ? 'border-dashed border-white/40 bg-white/10' : ''}`}
                 onPointerDown={(e) => {
                     if (isEditingControls) return;
                     const rect = e.currentTarget.getBoundingClientRect();
                     const centerX = rect.left + rect.width / 2;
                     const centerY = rect.top + rect.height / 2;
                     const updateDir = (clientX: number, clientY: number) => {
                         const dx = clientX - centerX;
                         const dy = clientY - centerY;
                         const dist = Math.sqrt(dx * dx + dy * dy);
                         const maxDist = 32; 
                         let tx = dx;
                         let ty = dy;
                         if (dist > maxDist) {
                            tx = (dx / dist) * maxDist;
                            ty = (dy / dist) * maxDist;
                         }
                         if (joystickThumbRef.current) {
                            joystickThumbRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
                         }
                         if (dist < 15) {
                             handleDir(null);
                             return;
                         }
                         if (Math.abs(dx) > Math.abs(dy)) {
                             handleDir(dx > 0 ? 'RIGHT' : 'LEFT');
                         } else {
                             handleDir(dy > 0 ? 'DOWN' : 'UP');
                         }
                     };
                     updateDir(e.clientX, e.clientY);
                     const onPointerMove = (moveEvent: any) => updateDir(moveEvent.clientX, moveEvent.clientY);
                     const onPointerUp = () => {
                         handleDir(null);
                         if (joystickThumbRef.current) {
                            joystickThumbRef.current.style.transform = `translate(0px, 0px)`;
                         }
                         window.removeEventListener('pointermove', onPointerMove);
                         window.removeEventListener('pointerup', onPointerUp);
                     };
                     window.addEventListener('pointermove', onPointerMove, { passive: false });
                     window.addEventListener('pointerup', onPointerUp);
                 }}
              >
                 <div ref={joystickThumbRef} className={`w-12 h-12 rounded-full pointer-events-none transition-transform duration-75 ${theme === 'oled' ? 'bg-white/20' : 'bg-[#65a30d]/30'}`}></div>
              </div>
              <div className={`text-xs font-bold tracking-widest uppercase mt-4 text-center opacity-50 ${theme === 'oled' ? 'text-white' : 'text-[#65a30d]'}`}>{isEditingControls ? 'Drag to Move Joystick' : 'Drag Joystick'}</div>
           </motion.div>
        )}

        {controllerType === 'swipe' && (
           <div className="hidden"></div>
        )}

        <motion.button 
           animate={{ x: controlPositions.trap.x, y: controlPositions.trap.y }}
           drag={true}
           dragMomentum={false}
           onDragEnd={(e, info) => saveControlPositions('trap', e, info)}
           onTap={() => {
              if (!isEditingControls) handleTrap();
           }}
           className={`absolute w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all touch-manipulation pointer-events-auto z-[80] ${trapCtrlBase} !cursor-grab active:!cursor-grabbing`}
           style={{ left: '50%', top: '75%', marginLeft: '112px', marginTop: '-32px' }}
        >
          <span className="text-xl sm:text-2xl ">
             {mode === 'survival_rat' || mode === 'hunter_dog' ? '🥛' : 
              mode === 'survival_cat' || mode === 'survival_deer' || mode === 'survival_rabbit' ? '🥩' :
              mode === 'survival_bug' ? '🦟' :
              mode === 'hunter_wolf' ? '🥕' :
              mode === 'hunter_cat' ? '🧀' :
              mode === 'hunter_frog' ? '🌿' :
              mode === 'hunter_lion' ? '💧' : '🪤'}
          </span>
        </motion.button>
      </div>

      {/* Footer Bar */}
      <footer className="hidden sm:flex mt-6 flex-col sm:flex-row justify-between sm:items-center text-[10px] uppercase tracking-widest opacity-40 gap-2 flex-shrink-0 border-t border-[#064e3b]/30 pt-4">
        <div>Engine: Custom Braided-Maze Canvas</div>
        <div className="flex gap-4">
          <span>Haptic: {audio.haptics ? 'Enabled' : 'Disabled'}</span>
          <span>Sound: 44.1kHz</span>
          <span>Mode: {mode}</span>
        </div>
        <div>© 2026 OLED AMBIENCE STUDIOS</div>
      </footer>
    </div>
  );
}
