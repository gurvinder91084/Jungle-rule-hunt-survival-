/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './GameCanvas';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Skull, Play, RotateCcw, Home, Star, Share2, Gamepad2, Settings, X, Volume2, Vibrate, MessageSquare, Music } from 'lucide-react';
import { audio } from './lib/audio';

export default function App() {
  const [gameState, setGameState] = useState<'splash' | 'menu' | 'playing' | 'gameover' | 'levelcomplete'>('splash');
  const [mode, setMode] = useState<string>('survival_rat');
  const [level, setLevel] = useState<number>(1);
  const [gameKey, setGameKey] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [theme, setTheme] = useState<'default' | 'oled' | 'deep'>('default');
  const [controllerType, setControllerType] = useState<'dpad' | 'joystick' | 'swipe'>('dpad');
   const [showPopup, setShowPopup] = useState<'none' | 'win' | 'lose'>('none');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [volume, setVolume] = useState(audio.volume * 100);
  const [haptics, setHaptics] = useState(audio.haptics);
  const [music, setMusic] = useState(audio.music);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('maza_high_score');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [startInEditMode, setStartInEditMode] = useState(false);

  useEffect(() => {
    // We will let the user touch/click to dismiss the splash screen
  }, [gameState]);

  useEffect(() => {
    if (score > highScore) {
       setHighScore(score);
       localStorage.setItem('maza_high_score', score.toString());
    }
  }, [score, highScore]);

  const handleGameOver = (win: boolean, finalScore: number) => {
    setScore(Math.floor(finalScore));
    if (win) {
       setShowPopup('win');
       setTimeout(() => {
          setShowPopup('none');
          setMultiplier(m => m + 0.5);
          setLevel(l => Math.min(50, l + 1));
          setGameKey(k => k + 1);
          setGameState('playing');
       }, 800);
    } else {
       setShowPopup('lose');
       setTimeout(() => {
          setShowPopup('none');
          setLevel(1);
          setScore(0);
          setMultiplier(1.0);
          setGameKey(k => k + 1);
          setGameState('playing');
       }, 800);
    }
  };

  const startLevel = () => {
    setGameState('playing');
  };

  const goHome = () => {
    setLevel(1);
    setScore(0);
    setMultiplier(1.0);
    setGameState('menu');
  };


  const ModeCard = ({ m, icon, type, theme }: { m: string, icon: string, type: 'hunter' | 'survival', theme?: string }) => {
     return (
     <button 
        onClick={() => {
           setMode(m);
           setGameState('playing');
           setLevel(1);
           setScore(0);
           setMultiplier(1);
        }} 
        style={{ transformStyle: 'preserve-3d', transform: 'translateZ(10px)' }}
        className={`w-full flex object-cover flex-col items-center justify-center border-2 border-b-[5px] sm:border-[3px] sm:border-b-[6px] rounded-xl transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:border-b-2 sm:active:border-b-[3px] active:mt-[3px] active:shadow-none p-2 sm:p-3  ${
          theme === 'oled' ? 'bg-[#111] border-[#333] hover:bg-[#222]' :
          (type === 'hunter' 
            ? 'bg-[#022c22]/60 border-[#2d4a22] hover:bg-[#1b3310]' 
            : 'bg-[#022c22]/60 border-[#8b6f3c] hover:bg-[#433113]')
        }`}
     >
        <div className="flex items-center justify-center py-1.5 mb-1" style={{ transform: 'translateZ(15px)' }}>
           <span className="text-4xl sm:text-5xl leading-none" style={{ filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.5))' }}>{icon}</span>
        </div>
        <div className={`w-full py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded ${
          theme === 'oled' ? 'bg-[#333] text-white border-t-2 border-[#555]' :
          (type === 'hunter'
            ? 'bg-[#15803d] text-white border-t-2 border-[#16a34a]'
            : 'bg-[#d97706] text-[#fef3c7] border-t-2 border-[#f59e0b]')
        }`} style={{ transform: 'translateZ(10px)' }}>
          SELECT
        </div>
     </button>
     );
  };

  return (
    <div 
      className={`w-full h-[100dvh] overflow-hidden ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'} font-mono selection:bg-[#65a30d]/30 relative`}
      style={{
        // Only grayscaling the background using an overlay pseudo-element strategy or specific div
      }}
    >
       <div className="absolute inset-0 z-0" style={{
         backgroundImage: "url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000&auto=format&fit=crop')",
         backgroundSize: "cover",
         backgroundPosition: "center",
         backgroundRepeat: "no-repeat",
         filter: theme === 'oled' ? 'grayscale(100%) brightness(0.3)' : 'none',
       }}></div>
       <div className={`absolute inset-0 ${theme === 'oled' ? 'bg-black/80' : 'bg-[#022c22]/70'} backdrop-blur-[2px] z-0`}></div>
       <AnimatePresence mode="wait">
          {gameState === 'splash' && (
             <motion.div key="splash" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setGameState('menu')} className="w-full h-full flex flex-col items-center justify-center p-4 relative z-50 cursor-pointer overflow-hidden bg-[#0a1f11]">
               <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30 blur-[2px]"></div>
               
               <motion.div 
                   className="relative z-20 flex flex-col items-center justify-center w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full mt-[-80px] sm:mt-[-100px]"
                   animate={{ y: [5, -5, 5] }}
                   transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
               >
                   {/* Glowing background behind logo */}
                   <div className="absolute inset-0 bg-[#fde047] opacity-[0.15] blur-[40px] scale-125 rounded-full z-0 pointer-events-none"></div>
                   
                   {/* Brown circular frame */}
                   <div className="absolute inset-4 sm:inset-6 border-[8px] sm:border-[12px] border-[#92400e] rounded-full z-10 shadow-inner overflow-hidden flex items-center justify-center bg-[#0d2a17]">
                      {/* Inner leaves inside circle */}
                      <div className="absolute -top-4 -left-4 text-6xl sm:text-7xl opacity-80" style={{ transform: 'rotate(-45deg)' }}>🌿</div>
                      <div className="absolute top-10 -right-8 text-7xl sm:text-8xl opacity-80" style={{ transform: 'rotate(45deg)' }}>🌿</div>
                      <div className="absolute bottom-0 left-10 text-5xl sm:text-6xl opacity-90">🍃</div>
                   </div>

                   {/* Outer leaves overflowing the circle */}
                   <div className="absolute -top-6 sm:-top-12 left-4 sm:left-10 text-6xl sm:text-7xl z-20" style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.6))' }}>🌿</div>
                   <div className="absolute top-14 sm:top-20 -left-10 sm:-left-16 text-7xl sm:text-8xl z-30" style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.6))' }}>🌿</div>
                   <div className="absolute top-6 sm:top-10 -right-10 sm:-right-16 text-7xl sm:text-8xl z-30" style={{ transform: 'rotate(90deg) scaleY(-1)', filter: 'drop-shadow(-2px 4px 6px rgba(0,0,0,0.6))' }}>🌿</div>
                   <div className="absolute -bottom-6 sm:-bottom-10 left-0 text-6xl sm:text-7xl z-30" style={{ transform: 'rotate(-135deg)', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.6))' }}>🌿</div>
                   <div className="absolute -bottom-6 sm:-bottom-10 right-0 text-6xl sm:text-7xl z-30" style={{ transform: 'rotate(135deg)', filter: 'drop-shadow(-2px 4px 6px rgba(0,0,0,0.6))' }}>🌿</div>

                   {/* Palm tree on top */}
                   <div className="absolute -top-20 sm:-top-24 left-1/2 -translate-x-1/2 text-6xl sm:text-7xl z-30" style={{ filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))' }}>🌴</div>

                   {/* Paw prints */}
                   <div className="absolute top-12 sm:top-16 right-8 sm:right-12 text-2xl sm:text-3xl z-40 text-[#92400e]" style={{ filter: 'drop-shadow(1px 2px 0px #fde047) drop-shadow(0px 2px 2px rgba(0,0,0,0.5))' }}>🐾</div>
                   <div className="absolute bottom-12 sm:bottom-16 left-6 sm:left-8 text-3xl sm:text-4xl z-40 text-[#92400e]" style={{ transform: 'rotate(-20deg)', filter: 'drop-shadow(1px 2px 0px #fde047) drop-shadow(0px 2px 2px rgba(0,0,0,0.5))' }}>🐾</div>
                   <div className="absolute bottom-2 sm:bottom-4 right-12 sm:right-16 text-xl sm:text-2xl z-40 text-[#92400e]" style={{ transform: 'rotate(30deg)', filter: 'drop-shadow(1px 2px 0px #fde047) drop-shadow(0px 2px 2px rgba(0,0,0,0.5))' }}>🐾</div>
                   <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl z-40 text-[#92400e]" style={{ transform: 'rotate(10deg)', filter: 'drop-shadow(1px 2px 0px #fde047) drop-shadow(0px 2px 2px rgba(0,0,0,0.5))' }}>🐾</div>

                   {/* Text Logo Area */}
                   <div className="relative z-50 flex flex-col items-center justify-center mt-8 sm:mt-12 w-full gap-1 sm:gap-2">
                      <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-[#4ade80] leading-[0.8] z-50 uppercase" 
                          style={{ 
                            fontFamily: '"Arial Black", sans-serif',
                            WebkitTextStroke: '2px #fde047',
                            textShadow: '0 6px 0 #14532d, 0 8px 10px rgba(0,0,0,0.8)'
                          }}>
                        Jungle
                      </h1>
                      <div className="flex items-end justify-center z-50 relative w-full">
                        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-[#4ade80] leading-[0.8] relative z-20 uppercase" 
                            style={{ 
                              fontFamily: '"Arial Black", sans-serif',
                              WebkitTextStroke: '2px #fde047',
                              textShadow: '0 6px 0 #14532d, 0 8px 10px rgba(0,0,0,0.8)'
                            }}>
                          Rule
                        </h1>
                        {/* Lion icon connected to RULE */}
                        <div className="absolute right-8 sm:right-16 -bottom-1 sm:-bottom-2 text-4xl sm:text-5xl z-30" style={{ filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.6))' }}>🦁</div>
                      </div>
                      
                      <div className="mt-6 sm:mt-8 z-50 bg-[#78350f] px-4 sm:px-6 py-1 sm:py-2 rounded-xl border-2 sm:border-4 border-[#fde047] shadow-[0_6px_0_#451a03,0_10px_15px_rgba(0,0,0,0.8)] transform -rotate-2">
                         <h2 className="text-2xl sm:text-3xl font-black italic text-[#fed7aa] whitespace-nowrap" 
                             style={{ textShadow: '0 2px 0 #ea580c, 0 3px 0 #9a3412' }}>
                           <span className="text-[#fde047]">hunt &</span> Survive
                         </h2>
                      </div>
                   </div>
               </motion.div>
               
               <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute bottom-12 sm:bottom-16 text-xs sm:text-sm font-black text-[#fde047] tracking-[0.2em] uppercase z-50 drop-shadow-md text-center px-4"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
               >
                 Touch anywhere to start
               </motion.div>
             </motion.div>
          )}

          {gameState === 'menu' && (
             <motion.div key="menu" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full flex flex-col items-center justify-start px-2 py-0 space-y-1 overflow-y-auto overflow-x-hidden relative z-10 pt-0 sm:pt-2" style={{ perspective: 1200 }}>
                {/* Background Details */}
                <div className="absolute top-10 left-10 text-2xl opacity-20 rotate-45 pointer-events-none" style={{ transform: 'translateZ(-50px)' }}>🌿</div>
                <div className="absolute top-40 right-10 text-3xl opacity-20 -rotate-12 pointer-events-none" style={{ transform: 'translateZ(-100px)' }}>🌲</div>
                <div className="absolute bottom-40 left-10 text-3xl opacity-20 rotate-12 pointer-events-none" style={{ transform: 'translateZ(-30px)' }}>🌴</div>
                <div className="absolute top-1/2 right-20 text-2xl opacity-20 rotate-90 pointer-events-none" style={{ transform: 'translateZ(-80px)' }}>🌿</div>

                {/* Top Left Coins (Removed title so container sits closer to top) */}
                <div 
                   style={{ transformStyle: 'preserve-3d' }}
                   className={`flex flex-col gap-2 sm:gap-4 w-full max-w-4xl pb-4 sm:pb-6 shrink-0 ${theme === 'oled' ? 'bg-[#111111]/90 border-[#333]' : 'bg-[#064e3b]/80 border-[#022c22]'} p-2 sm:p-5 rounded-2xl sm:rounded-[2rem] border-[3px] sm:border-4 relative z-10 px-1 sm:px-4 items-center shadow-2xl drop-shadow-2xl`}
                >
                   
                   {/* Top Row: Share, Settings, Feedback */}
                   <div style={{ transform: 'translateZ(20px)' }} className="flex gap-2 w-full max-w-sm shrink-0 mb-4 px-2">
                       <button 
                           onClick={() => {
                               if (navigator.share) {
                                   navigator.share({
                                       title: 'Jungle Survival Game',
                                       text: 'Check out Jungle Survival Game!',
                                       url: window.location.href,
                                   }).catch(console.error);
                               } else {
                                   alert('Share not supported on this browser');
                               }
                           }}
                           className={`flex-1 ${theme === 'oled' ? 'bg-[#222] border-[#444] text-white hover:bg-[#333]' : 'bg-[#166534] border-[#064e3b] text-white hover:bg-[#15803d]'} border-2 border-b-[4px] rounded-xl py-1.5 flex items-center justify-center gap-1 font-black text-[9px] tracking-widest transition-all active:border-b-2 active:translate-y-[2px] cursor-pointer shadow-lg relative z-50`}>
                           <Share2 size={12} />
                           SHARE
                       </button>
                       <button 
                           onClick={() => setIsSettingsOpen(true)}
                           className={`flex-1 ${theme === 'oled' ? 'bg-[#222] border-[#444] text-white hover:bg-[#333]' : 'bg-[#166534] border-[#064e3b] text-white hover:bg-[#15803d]'} border-2 border-b-[4px] rounded-xl py-1.5 flex items-center justify-center gap-1 font-black text-[9px] tracking-widest transition-all active:border-b-2 active:translate-y-[2px] cursor-pointer shadow-lg relative z-50`}>
                           <Settings size={12} />
                           OPTS
                       </button>
                       <button 
                           onClick={() => {
                             setIsFeedbackOpen(true);
                             setFeedbackSubmitted(false);
                             setFeedbackMessage('');
                             setRating(5);
                           }}
                           className={`flex-1 ${theme === 'oled' ? 'bg-[#222] border-[#444] text-white hover:bg-[#333]' : 'bg-[#166534] border-[#064e3b] text-white hover:bg-[#15803d]'} border-2 border-b-[4px] rounded-xl py-1.5 flex items-center justify-center gap-1 font-black text-[9px] tracking-widest transition-all active:border-b-2 active:translate-y-[2px] cursor-pointer shadow-lg relative z-50`}>
                           <MessageSquare size={12} />
                           FEED
                       </button>
                   </div>

                   {/* Difficulty Selector */}
                   <div style={{ transform: 'translateZ(20px)' }} className={`flex ${theme === 'oled' ? 'bg-[#000]/80 border-[#444]' : 'bg-[#022c22]/50 border-[#022c22]'} border-2 sm:border-4 rounded-full p-1 w-full max-w-sm shrink-0 mt-2 mb-2`}>
                     {(['easy', 'medium', 'hard'] as const).map(d => (
                       <button
                         key={d}
                         onClick={() => setDifficulty(d)}
                         className={`flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-sm font-black uppercase tracking-widest rounded-full transition-all ${difficulty === d ? (theme === 'oled' ? 'bg-white text-black' : 'bg-[#65a30d] text-[#022c22]') : (theme === 'oled' ? 'text-gray-400 hover:bg-[#333]' : 'text-[#a3e635] hover:bg-[#15803d]')}`}
                       >
                         {d}
                       </button>
                     ))}
                   </div>
                   
                   <div className="flex flex-row gap-2 sm:gap-4 w-full">
                   
                   {/* Hunter Column */}
                   <div className={`relative border-[4px] ${theme === 'oled' ? 'border-[#444] bg-[#222]' : 'border-[#223d1d] bg-[#122b10]'} rounded-xl sm:rounded-2xl p-2 sm:p-4 pb-2 w-1/2`}>
                       <div className="flex justify-center absolute -top-4 sm:-top-6 left-0 right-0 z-10" style={{ transform: 'translateZ(25px)' }}>
                           <span className={`${theme === 'oled' ? 'bg-[#333] border-[#555] text-white' : 'bg-[#506e3e] border-[#2d4a22] text-white'} border-[3px] border-b-[6px] px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-black text-[11px] sm:text-sm tracking-wide flex items-center relative whitespace-nowrap overflow-hidden shadow-xl`}>
                             <div className="absolute inset-0 bg-black/10"></div>
                             <span className="relative z-10" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.5)' }}>SELECT HUNTER</span>
                           </span>
                       </div>
                       <div className="flex flex-col gap-0.5 mt-0 sm:mt-2">
                          <ModeCard m="hunter_cat" icon="🐱" type="hunter" theme={theme} />
                          <ModeCard m="hunter_dog" icon="🐶" type="hunter" theme={theme} />
                          <ModeCard m="hunter_lion" icon="🦁" type="hunter" theme={theme} />
                          <ModeCard m="hunter_wolf" icon="🐺" type="hunter" theme={theme} />
                          <ModeCard m="hunter_frog" icon="🐸" type="hunter" theme={theme} />
                       </div>
                       {/* Left decorative vines */}
                       <div className={`absolute -left-2 top-10 bottom-10 w-4 ${theme === 'oled' ? 'bg-[#444]' : 'bg-[#223d1d]'} opacity-50 rounded-full`} style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)' }}></div>
                       {/* Right decorative vines */}
                       <div className={`absolute -right-2 top-10 bottom-10 w-4 ${theme === 'oled' ? 'bg-[#444]' : 'bg-[#223d1d]'} opacity-50 rounded-full`} style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)' }}></div>
                   </div>

                   {/* Survival Column */}
                   <div className={`relative border-[4px] ${theme === 'oled' ? 'border-[#555] bg-[#333]' : 'border-[#b08d4b] bg-[#4a3f25]'} rounded-xl sm:rounded-2xl p-2 sm:p-4 pb-2 w-1/2`}>
                       <div className="flex justify-center absolute -top-4 sm:-top-6 left-0 right-0 z-10" style={{ transform: 'translateZ(25px)' }}>
                           <span className={`${theme === 'oled' ? 'bg-[#444] border-[#666] text-white' : 'bg-[#b46b32] border-[#6b3c10] text-white'} border-[3px] border-b-[6px] px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-black text-[11px] sm:text-sm tracking-wide flex items-center relative whitespace-nowrap overflow-hidden shadow-xl`}>
                             <div className="absolute inset-0 bg-black/10"></div>
                             <span className="relative z-10" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.5)' }}>SELECT SURVIVAL</span>
                           </span>
                       </div>
                       <div className="flex flex-col gap-0.5 mt-0 sm:mt-2">
                          <ModeCard m="survival_rat" icon="🐭" type="survival" theme={theme} />
                          <ModeCard m="survival_cat" icon="🐱" type="survival" theme={theme} />
                          <ModeCard m="survival_deer" icon="🦌" type="survival" theme={theme} />
                          <ModeCard m="survival_rabbit" icon="🐰" type="survival" theme={theme} />
                          <ModeCard m="survival_bug" icon="🐛" type="survival" theme={theme} />
                       </div>
                       
                       {/* Bamboo decorative borders */}
                       <div className="absolute -left-3 top-0 bottom-0 w-6 flex flex-col pt-4 overflow-hidden">
                           {[...Array(8)].map((_, i) => (
                              <div key={`l-${i}`} className={`w-full h-12 border-2 ${theme === 'oled' ? 'border-[#444] bg-[#666]' : 'border-[#8b6f3c] bg-[#c39c50]'} mb-1 rounded-sm`}></div>
                           ))}
                       </div>
                       <div className="absolute -right-3 top-0 bottom-0 w-6 flex flex-col pt-4 overflow-hidden">
                           {[...Array(8)].map((_, i) => (
                              <div key={`r-${i}`} className={`w-full h-12 border-2 ${theme === 'oled' ? 'border-[#444] bg-[#666]' : 'border-[#8b6f3c] bg-[#c39c50]'} mb-1 rounded-sm`}></div>
                           ))}
                       </div>
                       <div className="absolute -top-3 left-0 right-0 h-6 flex overflow-hidden pl-2">
                           {[...Array(12)].map((_, i) => (
                              <div key={`t-${i}`} className={`w-12 h-full border-2 ${theme === 'oled' ? 'border-[#444] bg-[#666]' : 'border-[#8b6f3c] bg-[#c39c50]'} ml-1 rounded-sm`}></div>
                           ))}
                       </div>
                       <div className="absolute -bottom-3 left-0 right-0 h-6 flex overflow-hidden pl-2">
                           {[...Array(12)].map((_, i) => (
                              <div key={`b-${i}`} className={`w-12 h-full border-2 ${theme === 'oled' ? 'border-[#444] bg-[#666]' : 'border-[#8b6f3c] bg-[#c39c50]'} ml-1 rounded-sm`}></div>
                           ))}
                    </div>
                 </div>
                 </div>
                 </div>

                 <div className="mt-4 mb-10 pb-4">
                    <button
                        onClick={() => { window.open('https://ai.google.dev/', '_blank'); }}
                        className={`max-w-[200px] ${theme === 'oled' ? 'bg-[#333] border-[#555] text-white hover:bg-[#444]' : 'bg-[#15803d] border-[#022c22] text-white hover:bg-[#166534]'} border-2 border-b-[4px] rounded-xl py-2 px-6 flex items-center justify-center gap-2 font-black text-[11px] tracking-widest transition-all active:border-b-2 active:translate-y-[2px] cursor-pointer shadow-lg relative z-50`}
                    >
                        <Gamepad2 size={18} />
                        MORE GAMES
                    </button>
                 </div>
             </motion.div>
          )}

          {gameState === 'playing' && (
             <motion.div key="playing" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full relative z-10">
                <GameCanvas key={gameKey} level={level} mode={mode} difficulty={difficulty} score={score} multiplier={multiplier} theme={theme} controllerType={controllerType} isPaused={showPopup !== 'none'} onGameOver={handleGameOver} onGoHome={goHome} startInEditMode={startInEditMode} onEditDone={() => { setStartInEditMode(false); setGameState('menu'); }} />
                
                <AnimatePresence>
                   {showPopup === 'win' && (
                       <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:1.2, opacity:0}} className="pointer-events-none absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 ">
                          <Trophy className="w-16 h-16 text-[#65a30d]" />
                          <h2 className="text-2xl font-bold tracking-tighter text-[#65a30d] mt-2">WIN</h2>
                       </motion.div>
                   )}
                   {showPopup === 'lose' && (
                       <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:1.2, opacity:0}} className="pointer-events-none absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 ">
                          <Skull className="w-16 h-16 text-red-500" />
                          <h2 className="text-2xl font-bold tracking-tighter text-red-500 mt-2">LOSE</h2>
                       </motion.div>
                   )}
                </AnimatePresence>
             </motion.div>
          )}
       </AnimatePresence>
       {/* Global Settings Modal for Home Page */}
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
                 <div className={`${theme === 'oled' ? 'bg-[#111] border-[#333]' : 'bg-[#022c22] border-[#047857]/50'} border p-4 rounded-xl flex items-center justify-between`}>
                   <span className={`flex items-center gap-2 uppercase text-sm tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#65a30d]'}`}>
                     <Trophy size={18} /> High Score
                   </span>
                   <span className={`text-2xl font-mono font-black tracking-wider ${theme === 'oled' ? 'text-gray-300' : 'text-[#a3e635]'}`}>
                     {highScore.toLocaleString()}
                   </span>
                 </div>

                 {/* Customize Layout - Highlighted */}
                 {(controllerType === 'dpad' || controllerType === 'joystick') && (
                   <div className={`${theme === 'oled' ? 'bg-[#222] border-[#555]' : 'bg-[#064e3b] border-[#65a30d]'} border-2 p-4 rounded-xl flex flex-col gap-3`}>
                     <div className="flex items-center justify-between gap-4">
                       <span className={`flex items-center gap-2 uppercase text-sm tracking-widest font-black ${theme === 'oled' ? 'text-white' : 'text-[#65a30d]'}`}>
                         <Settings size={18} /> Customize Layout
                       </span>
                       <button 
                         onClick={() => {
                             setIsSettingsOpen(false);
                             setStartInEditMode(true);
                             setGameState('playing');
                         }}
                         className={`${theme === 'oled' ? 'bg-[#ddd] hover:bg-white text-black' : 'bg-[#65a30d] hover:bg-[#a3e635] text-[#022c22]'} px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 flex items-center gap-2`}
                       >
                         <Settings size={16} /> Edit Now
                       </button>
                     </div>
                     <p className={`text-[10px] sm:text-xs opacity-90 ${theme === 'oled' ? 'text-gray-400' : 'text-[#a3e635]'}`}>
                       Drag and drop to reposition the {controllerType === 'joystick' ? 'JOYSTICK' : 'D-PAD'} and buttons according to your playstyle.
                     </p>
                   </div>
                 )}

                 {/* Forest Ambience Control */}
                 <div className="flex items-center justify-between gap-4">
                   <span className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                     <Music size={16} /> Forest Ambience
                   </span>
                   <button 
                     onClick={() => {
                        const m = !music;
                        setMusic(m);
                        audio.setMusic(m);
                     }}
                     className={`w-14 h-8 rounded-full p-1 transition-colors relative ${music ? (theme === 'oled' ? 'bg-white' : 'bg-[#65a30d]') : (theme === 'oled' ? 'bg-[#333]' : 'bg-[#022c22]')}`}
                   >
                     <div className={`w-6 h-6 rounded-full transition-transform ${theme === 'oled' ? (music ? 'bg-[#222]' : 'bg-[#111]') : 'bg-[#064e3b]'} ${music ? 'translate-x-6' : 'translate-x-0'}`}></div>
                   </button>
                 </div>

                 <div className={`w-full h-px my-[-10px] ${theme === 'oled' ? 'bg-[#333]' : 'bg-[#15803d]/30'}`}></div>

                 {/* Haptics Control */}
                 <div className="flex items-center justify-between gap-4">
                   <span className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                     <Vibrate size={16} /> Haptic Feedback
                   </span>
                   <button 
                     onClick={() => {
                        const h = !haptics;
                        setHaptics(h);
                        audio.setHaptics(h);
                        if (h) audio.vibrate(50);
                     }}
                     className={`w-14 h-8 rounded-full p-1 transition-colors relative ${haptics ? (theme === 'oled' ? 'bg-white' : 'bg-[#65a30d]') : (theme === 'oled' ? 'bg-[#333]' : 'bg-[#022c22]')}`}
                   >
                     <div className={`w-6 h-6 rounded-full transition-transform ${theme === 'oled' ? (haptics ? 'bg-[#222]' : 'bg-[#111]') : 'bg-[#064e3b]'} ${haptics ? 'translate-x-6' : 'translate-x-0'}`}></div>
                   </button>
                 </div>
                 
                 <div className={`w-full h-px my-[-10px] ${theme === 'oled' ? 'bg-[#333]' : 'bg-[#15803d]/30'}`}></div>

                 {/* Theme Settings */}
                 <div className="flex flex-col gap-3">
                   <span className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                     Theme
                   </span>
                   <div className="flex flex-col gap-2">
                     <div className="flex gap-2 justify-between">
                       <button 
                         onClick={() => setTheme('default')}
                         className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors border ${theme === 'default' ? 'bg-[#65a30d] text-[#022c22] border-[#65a30d]' : (theme === 'oled' ? 'bg-[#222] text-[#ccc] border-[#444] hover:bg-[#333]' : 'bg-[#022c22] text-[#65a30d] border-[#15803d]')}`}>
                         Default
                       </button>
                       <button 
                         onClick={() => setTheme('oled')}
                         className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors border ${theme === 'oled' ? 'bg-white text-black border-white' : 'bg-[#111] border-[#333] hover:bg-[#222]'}`}>
                         OLED
                       </button>
                     </div>
                   </div>
                 </div>

                 <div className="w-full h-px bg-[#15803d]/30 my-[-10px]"></div>

                 {/* Controller Settings */}
                 <div className="flex flex-col gap-3">
                   <span className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                     Controller
                   </span>
                   <div className="flex gap-2 justify-between">
                     <button 
                       onClick={() => setControllerType('dpad')}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border ${controllerType === 'dpad' ? (theme === 'oled' ? 'bg-white text-black border-white' : 'bg-[#65a30d] text-[#022c22] border-[#65a30d]') : (theme === 'oled' ? 'bg-[#222] text-[#ccc] border-[#444] hover:bg-[#333]' : 'bg-[#022c22] text-[#65a30d] border-[#15803d]')}`}>
                       D-PAD
                     </button>
                     <button 
                       onClick={() => setControllerType('joystick')}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border ${controllerType === 'joystick' ? (theme === 'oled' ? 'bg-white text-black border-white' : 'bg-[#65a30d] text-[#022c22] border-[#65a30d]') : (theme === 'oled' ? 'bg-[#222] text-[#ccc] border-[#444] hover:bg-[#333]' : 'bg-[#022c22] text-[#65a30d] border-[#15803d]')}`}>
                       Joystick
                     </button>
                     <button 
                       onClick={() => setControllerType('swipe')}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border ${controllerType === 'swipe' ? (theme === 'oled' ? 'bg-white text-black border-white' : 'bg-[#65a30d] text-[#022c22] border-[#65a30d]') : (theme === 'oled' ? 'bg-[#222] text-[#ccc] border-[#444] hover:bg-[#333]' : 'bg-[#022c22] text-[#65a30d] border-[#15803d]')}`}>
                       Swipe
                     </button>
                   </div>
                 </div>

                 {/* Removed */}
                 
                 <div className={`w-full h-px my-[-10px] ${theme === 'oled' ? 'bg-[#333]' : 'bg-[#15803d]/30'}`}></div>

                 <div className="flex items-center justify-between gap-4">
                   <span className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                     Rate Us
                   </span>
                   <button 
                     onClick={() => {
                         alert("Please leave a rating for us!");
                     }}
                     className={`${theme === 'oled' ? 'bg-[#222] hover:bg-[#333] text-[#ccc] border-[#444]' : 'bg-[#166534]/50 hover:bg-[#166534] text-[#65a30d] border-[#15803d]'} border px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2`}
                   >
                     <Star size={14} className={theme === 'oled' ? 'fill-[#ccc]' : 'fill-[#65a30d]'} /> RATE
                   </button>
                 </div>

                 <div className="flex items-center justify-between gap-4">
                   <span className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                     Share Game
                   </span>
                   <button 
                     onClick={() => {
                         if (navigator.share) {
                             navigator.share({ title: 'Maza Map', url: window.location.href }).catch(err => console.log('Share canceled or failed', err));
                         } else {
                             alert("Share Maza Map and give us feedback!");
                         }
                     }}
                     className={`${theme === 'oled' ? 'bg-[#222] hover:bg-[#333] text-[#ccc] border-[#444]' : 'bg-[#166534]/50 hover:bg-[#166534] text-[#65a30d] border-[#15803d]'} border px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2`}
                   >
                     <Share2 size={14} /> SHARE
                   </button>
                 </div>

                 <div className="flex items-center justify-between gap-4">
                   <span className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                     More Games
                   </span>
                   <button 
                     onClick={() => {
                         alert("Upcoming Games will be available soon!");
                     }}
                     className={`${theme === 'oled' ? 'bg-[#222] hover:bg-[#333] text-[#ccc] border-[#444]' : 'bg-[#166534]/50 hover:bg-[#166534] text-[#65a30d] border-[#15803d]'} border px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2`}
                   >
                     <Gamepad2 size={14} className={theme === 'oled' ? 'fill-[#ccc]' : 'fill-[#65a30d]'} /> PLAY
                   </button>
                 </div>
               </div>

               <div className={`mt-10 text-[10px] uppercase opacity-40 tracking-widest ${theme === 'oled' ? 'text-white' : ''}`}>
                 Jungle Rule V1.0
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Feedback Modal */}
       <AnimatePresence>
         {isFeedbackOpen && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center flex-col p-6 pointer-events-auto"
           >
             <div className={`${theme === 'oled' ? 'bg-[#111] border-[#333]' : 'bg-[#064e3b] border-[#047857]/40'} border rounded-2xl p-8 max-w-sm w-full relative text-center max-h-[90vh] overflow-y-auto`}>
               <button 
                 onClick={() => setIsFeedbackOpen(false)}
                 className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[120] text-white hover:text-[#65a30d] transition-colors bg-black/50 p-2 sm:p-3 rounded-full border border-white/20 "
               >
                 <X size={28} />
               </button>
               
               <h2 className={`text-2xl font-bold tracking-tighter mb-4 uppercase flex items-center justify-center gap-3 ${theme === 'oled' ? 'text-white' : 'text-[#65a30d]'}`}>
                 <MessageSquare size={28} />
                 Feedback
               </h2>

               {feedbackSubmitted ? (
                 <div className="flex flex-col items-center justify-center py-10">
                   <div className="w-16 h-16 rounded-full bg-[#15803d] flex items-center justify-center mb-4 text-white">
                     <Star size={32} className="fill-white" />
                   </div>
                   <h3 className={`text-xl font-bold mb-2 ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>Thank You!</h3>
                   <p className={`text-sm opacity-80 ${theme === 'oled' ? 'text-gray-300' : 'text-[#65a30d]'}`}>Your feedback helps us improve the game.</p>
                   <button
                     onClick={() => setIsFeedbackOpen(false)}
                     className={`mt-8 px-6 py-3 rounded-xl font-bold uppercase tracking-widest ${theme === 'oled' ? 'bg-white text-black' : 'bg-[#65a30d] text-[#022c22]'}`}
                   >
                     Close
                   </button>
                 </div>
               ) : (
                 <div className="flex flex-col gap-6 text-left">
                   <div className="flex flex-col gap-3">
                     <label className={`uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                       Rate your experience
                     </label>
                     <div className="flex justify-center gap-2">
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button
                           key={star}
                           onClick={() => setRating(star)}
                           className="transition-transform hover:scale-110 active:scale-95"
                         >
                           <Star size={32} className={`${rating >= star ? (theme === 'oled' ? 'text-white fill-white' : 'text-[#65a30d] fill-[#65a30d]') : (theme === 'oled' ? 'text-[#444]' : 'text-[#022c22]')}`} />
                         </button>
                       ))}
                     </div>
                   </div>

                   <div className="flex flex-col gap-3">
                     <label className={`uppercase text-xs tracking-widest font-bold ${theme === 'oled' ? 'text-white' : 'text-[#a3e635]'}`}>
                       Tell us more
                     </label>
                     <textarea
                       value={feedbackMessage}
                       onChange={(e) => setFeedbackMessage(e.target.value)}
                       placeholder="What do you think of the game?"
                       className={`w-full h-32 p-3 rounded-xl resize-none outline-none font-sans text-sm ${theme === 'oled' ? 'bg-[#222] border-[#444] text-white focus:border-white' : 'bg-[#022c22] border-[#15803d] text-[#a3e635] focus:border-[#65a30d] placeholder:text-[#15803d]'} border transition-colors`}
                     ></textarea>
                   </div>

                   <button
                     onClick={() => {
                        // simulate sending
                        setTimeout(() => {
                          setFeedbackSubmitted(true);
                        }, 500);
                     }}
                     disabled={feedbackMessage.trim() === ''}
                     className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${feedbackMessage.trim() === '' ? 'opacity-50 cursor-not-allowed ' + (theme === 'oled' ? 'bg-[#333] text-[#666]' : 'bg-[#022c22] text-[#15803d]') : (theme === 'oled' ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#65a30d] text-[#022c22] hover:bg-[#a3e635] active:scale-95')}`}
                   >
                     Submit Feedback
                   </button>
                 </div>
               )}
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}

