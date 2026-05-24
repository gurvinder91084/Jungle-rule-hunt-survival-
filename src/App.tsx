/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { GameCanvas } from "./GameCanvas";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Skull,
  Play,
  RotateCcw,
  Home,
  Star,
  Share2,
  Gamepad2,
  Settings,
  X,
  Volume2,
  Vibrate,
  Music,
} from "lucide-react";
import { audio } from "./lib/audio";
import { ModeCard as ExternalModeCard } from "./components/ModeCard";
import {
  connectMultiplayer,
  disconnectMultiplayer,
  joinAsymmetricQueue,
  leaveAsymmetricQueue,
  setCurrentRoomDetails,
} from "./lib/multiplayer";

const HUNTERS_LIST = [
  { mode: "hunter_cat", name: "Cat", icon: "🐱", sound: "meow" },
  { mode: "hunter_dog", name: "Dog", icon: "🐶", sound: "bark" },
  { mode: "hunter_lion", name: "Lion", icon: "🦁", sound: "roar" },
  { mode: "hunter_wolf", name: "Wolf", icon: "🐺", sound: "howl" },
  { mode: "hunter_frog", name: "Frog", icon: "🐸", sound: "croak" },
];

const SURVIVALS_LIST = [
  { mode: "survival_rat", name: "Mouse", icon: "🐭", sound: "squeak" },
  { mode: "survival_cat", name: "Cat", icon: "🐱", sound: "meow" },
  { mode: "survival_deer", name: "Deer", icon: "🦌", sound: "ding" },
  { mode: "survival_rabbit", name: "Rabbit", icon: "🐰", sound: "ding" },
  { mode: "survival_bug", name: "Caterpillar", icon: "🐛", sound: "ding" },
];

export default function App() {
  const [gameState, setGameState] = useState<
    "splash" | "menu" | "playing" | "gameover" | "levelcomplete"
  >("splash");
  const [mode, setMode] = useState<string>("survival_rat");
  const [level, setLevel] = useState<number>(1);
  const [gameKey, setGameKey] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [theme, setTheme] = useState<"default" | "oled" | "deep">("default");
  const [controllerType, setControllerType] = useState<
    "dpad" | "joystick" | "swipe"
  >("dpad");
  const [showPopup, setShowPopup] = useState<"none" | "win" | "lose">("none");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [volume, setVolume] = useState(audio.volume * 100);
  const [haptics, setHaptics] = useState(audio.haptics);
  const [music, setMusic] = useState(audio.music);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem("maza_high_score");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [startInEditMode, setStartInEditMode] = useState(false);

  // Online Multiplayer States
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [onlineRole, setOnlineRole] = useState<"cat" | "rat" | null>(null);
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<
    "closed" | "idle" | "searching" | "matched"
  >("closed");
  const [onlineSearchingRole, setOnlineSearchingRole] = useState<
    "cat" | "rat" | null
  >(null);
  const [matchCountdown, setMatchCountdown] = useState<number>(3);

  useEffect(() => {
    if (onlineStatus !== "searching") return;

    const socket = connectMultiplayer();

    const onMatchFound = (data: {
      roomId: string;
      role: "cat" | "rat";
      opponentId: string;
    }) => {
      console.log("Match Found on Client!", data);
      setOnlineRoomId(data.roomId);
      setOnlineRole(data.role);
      setCurrentRoomDetails(data.roomId, data.role);
      setOnlineStatus("matched");
      setIsOnline(true);
      setMatchCountdown(3);

      // Start a countdown interval
      let timer = 3;
      const interval = setInterval(() => {
        timer--;
        setMatchCountdown(timer);
        if (timer <= 0) {
          clearInterval(interval);
          setMode(data.role === "cat" ? "hunter_cat" : "survival_rat");
          setLevel(1);
          setScore(0);
          setMultiplier(1.0);
          setGameState("playing");
        }
      }, 1000);
    };

    socket.on("matchFound", onMatchFound);

    return () => {
      socket.off("matchFound", onMatchFound);
    };
  }, [onlineStatus]);

  useEffect(() => {
    // We will let the user touch/click to dismiss the splash screen
  }, [gameState]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("maza_high_score", score.toString());
    }
  }, [score, highScore]);

  const handleGameOver = (win: boolean, finalScore: number) => {
    setScore(Math.floor(finalScore));
    if (win) {
      setShowPopup("win");
      setTimeout(() => {
        setShowPopup("none");
        setMultiplier((m) => m + 0.5);
        setLevel((l) => Math.min(50, l + 1));
        setGameKey((k) => k + 1);
        setGameState("playing");
      }, 800);
    } else {
      setShowPopup("lose");
      setTimeout(() => {
        setShowPopup("none");
        setLevel(1);
        setScore(0);
        setMultiplier(1.0);
        setGameKey((k) => k + 1);
        setGameState("playing");
      }, 800);
    }
  };

  const startLevel = () => {
    setGameState("playing");
  };

  const goHome = () => {
    if (isOnline) {
      disconnectMultiplayer();
      setIsOnline(false);
      setOnlineRole(null);
      setOnlineRoomId(null);
    }
    setLevel(1);
    setScore(0);
    setMultiplier(1.0);
    setGameState("menu");
  };

  const ModeCard = ({
    m,
    icon,
    type,
    theme,
  }: {
    m: string;
    icon: string;
    type: "hunter" | "survival";
    theme?: string;
  }) => {
    return (
      <ExternalModeCard
        m={m}
        icon={icon}
        type={type}
        theme={theme}
        setMode={setMode}
        setGameState={setGameState}
        setLevel={setLevel}
        setScore={setScore}
        setMultiplier={setMultiplier}
      />
    );
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const OldModeCard = ({
    m,
    icon,
    type,
    theme,
  }: {
    m: string;
    icon: string;
    type: "hunter" | "survival";
    theme?: string;
  }) => {
    return (
      <button
        onClick={() => {
          setMode(m);
          setGameState("playing");
          setLevel(1);
          setScore(0);
          setMultiplier(1);
        }}
        style={{ transformStyle: "preserve-3d", transform: "translateZ(10px)" }}
        className={`w-full flex object-cover flex-col items-center justify-center border-2 border-b-[5px] sm:border-[3px] sm:border-b-[6px] rounded-xl transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:border-b-2 sm:active:border-b-[3px] active:mt-[3px] active:shadow-none p-2 sm:p-3  ${
          theme === "oled"
            ? "bg-[#111] border-[#333] hover:bg-[#222]"
            : type === "hunter"
              ? "bg-[#022c22]/60 border-[#2d4a22] hover:bg-[#1b3310]"
              : "bg-[#022c22]/60 border-[#8b6f3c] hover:bg-[#433113]"
        }`}
      >
        <div
          className="flex items-center justify-center py-1.5 mb-1"
          style={{ transform: "translateZ(15px)" }}
        >
          <span
            className="text-4xl sm:text-5xl leading-none"
            style={{ filter: "drop-shadow(0 3px 2px rgba(0,0,0,0.5))" }}
          >
            {icon}
          </span>
        </div>
        <div
          className={`w-full py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded ${
            theme === "oled"
              ? "bg-[#333] text-white border-t-2 border-[#555]"
              : type === "hunter"
                ? "bg-[#15803d] text-white border-t-2 border-[#16a34a]"
                : "bg-[#d97706] text-[#fef3c7] border-t-2 border-[#f59e0b]"
          }`}
          style={{ transform: "translateZ(10px)" }}
        >
          SELECT
        </div>
      </button>
    );
  };

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-[#0a0a0d] relative flex items-center justify-center select-none font-sans">
      {/* Ambient soft background on larger screens */}
      <div
        className="absolute inset-0 z-0 opacity-30 pointer-events-none filter blur-2xl"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=1200&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      {/* 9:16 High-Quality 3D Mobile Phone Frame Container */}
      <div
        id="mobile-phone-frame"
        className={`w-full h-full md:max-w-[410px] md:max-h-[820px] md:aspect-[9/16] md:rounded-[44px] md:border-[10px] md:border-stone-800/95 md:shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative flex flex-col overflow-hidden ${theme === "oled" ? "text-white" : "text-[#a3e635]"} selection:bg-emerald-500/30`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Inner Sharp Background - Jungle Forest */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=1200&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter:
              theme === "oled"
                ? "grayscale(100%) brightness(0.15)"
                : "brightness(0.24) contrast(1.15) saturate(0.85)",
          }}
        ></div>
        <div
          className={`absolute inset-0 ${theme === "oled" ? "bg-black/95" : "bg-gradient-to-b from-neutral-950/90 via-emerald-950/85 to-neutral-950/95"} backdrop-blur-[1px] z-0`}
        ></div>

        <AnimatePresence mode="wait">
          {gameState === "splash" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGameState("menu")}
              className="w-full h-full flex flex-col items-center justify-center p-4 relative z-50 cursor-pointer overflow-hidden bg-[#0a1f11]"
            >
              <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30 blur-[2px]"></div>

              <motion.div
                className="relative z-20 flex flex-col items-center justify-center w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full mt-[-80px] sm:mt-[-100px]"
                animate={{ y: [5, -5, 5] }}
                transition={{
                  duration: 4,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              >
                {/* Glowing background behind logo */}
                <div className="absolute inset-0 bg-[#fde047] opacity-[0.15] blur-[40px] scale-125 rounded-full z-0 pointer-events-none"></div>

                {/* Brown circular frame */}
                <div className="absolute inset-4 sm:inset-6 border-[8px] sm:border-[12px] border-[#92400e] rounded-full z-10 shadow-inner overflow-hidden flex items-center justify-center bg-[#0d2a17]">
                  {/* Inner leaves inside circle */}
                  <div
                    className="absolute -top-4 -left-4 text-6xl sm:text-7xl opacity-80"
                    style={{ transform: "rotate(-45deg)" }}
                  >
                    🌿
                  </div>
                  <div
                    className="absolute top-10 -right-8 text-7xl sm:text-8xl opacity-80"
                    style={{ transform: "rotate(45deg)" }}
                  >
                    🌿
                  </div>
                  <div className="absolute bottom-0 left-10 text-5xl sm:text-6xl opacity-90">
                    🍃
                  </div>
                </div>

                {/* Outer leaves overflowing the circle */}
                <div
                  className="absolute -top-6 sm:-top-12 left-4 sm:left-10 text-6xl sm:text-7xl z-20"
                  style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.6))" }}
                >
                  🌿
                </div>
                <div
                  className="absolute top-14 sm:top-20 -left-10 sm:-left-16 text-7xl sm:text-8xl z-30"
                  style={{
                    transform: "rotate(-90deg)",
                    filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.6))",
                  }}
                >
                  🌿
                </div>
                <div
                  className="absolute top-6 sm:top-10 -right-10 sm:-right-16 text-7xl sm:text-8xl z-30"
                  style={{
                    transform: "rotate(90deg) scaleY(-1)",
                    filter: "drop-shadow(-2px 4px 6px rgba(0,0,0,0.6))",
                  }}
                >
                  🌿
                </div>
                <div
                  className="absolute -bottom-6 sm:-bottom-10 left-0 text-6xl sm:text-7xl z-30"
                  style={{
                    transform: "rotate(-135deg)",
                    filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.6))",
                  }}
                >
                  🌿
                </div>
                <div
                  className="absolute -bottom-6 sm:-bottom-10 right-0 text-6xl sm:text-7xl z-30"
                  style={{
                    transform: "rotate(135deg)",
                    filter: "drop-shadow(-2px 4px 6px rgba(0,0,0,0.6))",
                  }}
                >
                  🌿
                </div>

                {/* Palm tree on top */}
                <div
                  className="absolute -top-20 sm:-top-24 left-1/2 -translate-x-1/2 text-6xl sm:text-7xl z-30"
                  style={{ filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.5))" }}
                >
                  🌴
                </div>

                {/* Paw prints */}
                <div
                  className="absolute top-12 sm:top-16 right-8 sm:right-12 text-2xl sm:text-3xl z-40 text-[#92400e]"
                  style={{
                    filter:
                      "drop-shadow(1px 2px 0px #fde047) drop-shadow(0px 2px 2px rgba(0,0,0,0.5))",
                  }}
                >
                  🐾
                </div>
                <div
                  className="absolute bottom-12 sm:bottom-16 left-6 sm:left-8 text-3xl sm:text-4xl z-40 text-[#92400e]"
                  style={{
                    transform: "rotate(-20deg)",
                    filter:
                      "drop-shadow(1px 2px 0px #fde047) drop-shadow(0px 2px 2px rgba(0,0,0,0.5))",
                  }}
                >
                  🐾
                </div>
                <div
                  className="absolute bottom-2 sm:bottom-4 right-12 sm:right-16 text-xl sm:text-2xl z-40 text-[#92400e]"
                  style={{
                    transform: "rotate(30deg)",
                    filter:
                      "drop-shadow(1px 2px 0px #fde047) drop-shadow(0px 2px 2px rgba(0,0,0,0.5))",
                  }}
                >
                  🐾
                </div>
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl z-40 text-[#92400e]"
                  style={{
                    transform: "rotate(10deg)",
                    filter:
                      "drop-shadow(1px 2px 0px #fde047) drop-shadow(0px 2px 2px rgba(0,0,0,0.5))",
                  }}
                >
                  🐾
                </div>

                {/* 3D Typographic Centered Masterpiece: HUNT & LIVE MAZA */}
                <div className="relative z-50 flex flex-col items-center justify-center mt-6 sm:mt-8 w-full gap-1 sm:gap-2 select-none pointer-events-none scale-[0.92] sm:scale-110">
                   
                   {/* 1. HUNT - Forged metallic coppery orange with blade element */}
                   <div className="relative flex items-center justify-center">
                      <h1 className="text-3d-hunt-base text-[54px] sm:text-[72px] leading-[0.9] tracking-normal font-black uppercase text-center relative select-none">
                         HUNT
                         <span className="absolute inset-x-0 top-[2.5px] text-center text-3d-hunt-inner text-[54px] sm:text-[72px] opacity-45 mix-blend-screen pointer-events-none">
                            HUNT
                         </span>
                      </h1>
                      <span className="absolute -left-7 top-1/2 -translate-y-1/2 text-2xl filter drop-shadow-lg scale-x-[-1] tracking-normal">🗡️</span>
                   </div>

                   {/* 2. & LIVE - Burnished bronze layout with a wild leaf accent */}
                   <div className="relative flex items-center justify-center">
                      <h1 className="text-3d-hunt-base text-[38px] sm:text-[48px] leading-[0.9] tracking-wider font-black uppercase text-center relative select-none">
                         & LIVE
                         <span className="absolute inset-x-0 top-[2px] text-center text-3d-hunt-inner text-[38px] sm:text-[48px] opacity-45 mix-blend-screen pointer-events-none">
                            & LIVE
                         </span>
                      </h1>
                      <span className="absolute -right-6 top-1/2 -translate-y-1/2 text-2xl rotate-[20deg] drop-shadow-md">🌿</span>
                   </div>

                   {/* 3. MAZA - Glossy Emerald Crystal and Golden yellow borders with Sparkles */}
                   <div className="relative flex items-center justify-center mt-2 sm:mt-3">
                      {/* Golden ambient glow backing */}
                      <div className="absolute inset-0 bg-yellow-400/25 blur-md rounded-full scale-110 opacity-75 pointer-events-none"></div>
                      
                      <h1 className="text-3d-maza-base text-[48px] sm:text-[62px] leading-[0.9] tracking-widest font-extrabold uppercase text-center relative italic select-none">
                         MAZA
                         <span className="absolute inset-0 text-white opacity-25 filter blur-[0.5px] pointer-events-none" style={{ WebkitTextStroke: '0px' }}>
                            MAZA
                         </span>
                      </h1>
                      {/* Premium star sparkles */}
                      <span className="absolute -top-2 -right-6 text-2xl animate-pulse">✨</span>
                      <span className="absolute -bottom-2 -left-6 text-lg animate-bounce delay-100">✨</span>
                   </div>

                </div>
              </motion.div>

              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute bottom-12 sm:bottom-16 text-xs sm:text-sm font-black text-[#fde047] tracking-[0.2em] uppercase z-50 drop-shadow-md text-center px-4"
                style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
              >
                Touch anywhere to start
              </motion.div>
            </motion.div>
          )}

          {gameState === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-between p-3.5 sm:p-4.5 space-y-3 relative z-10 overflow-hidden"
              style={{ perspective: 1200 }}
            >
              {/* Subtle dark, moody 3D jungle maze SVG wireframe backdrop */}
              <div className="absolute inset-0 z-0 opacity-[0.07] pointer-events-none select-none overflow-hidden mix-blend-color-dodge">
                <svg
                  className="w-full h-full text-emerald-400"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 5 5 H 95 V 20 H 20 V 45 H 80 V 65 H 5 V 82 H 95 V 95"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 15 25 H 35 V 35 H 15 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 65 30 H 85 V 55 H 65 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              {/* Atmospheric elements - Expanded Jungle Ruins Theme with Coins & Artifacts */}
              <div
                className="absolute top-4 left-6 text-xl opacity-30 rotate-45 pointer-events-none"
                style={{ transform: "translateZ(-50px)" }}
              >
                🌿
              </div>
              <div
                className="absolute top-28 right-4 text-2xl opacity-25 -rotate-12 pointer-events-none"
                style={{ transform: "translateZ(-100px)" }}
              >
                🌲
              </div>
              <div
                className="absolute bottom-24 left-4 text-2xl opacity-25 rotate-12 pointer-events-none"
                style={{ transform: "translateZ(-30px)" }}
              >
                🌴
              </div>
              <div
                className="absolute top-1/2 right-12 text-xl opacity-30 rotate-90 pointer-events-none"
                style={{ transform: "translateZ(-80px)" }}
              >
                🌿
              </div>

              {/* Overgrown Vines */}
              <div
                className="absolute top-2 left-16 text-2xl opacity-30 animate-pulse pointer-events-none"
                style={{ transform: "translateZ(-40px)" }}
              >
                🍀
              </div>
              <div
                className="absolute top-64 left-2 text-3xl opacity-20 pointer-events-none"
                style={{ transform: "translateZ(-110px)" }}
              >
                🍃
              </div>
              <div
                className="absolute bottom-4 right-16 text-2xl opacity-25 pointer-events-none"
                style={{ transform: "translateZ(-60px)" }}
              >
                🌱
              </div>
              <div
                className="absolute bottom-36 right-4 text-3xl opacity-15 pointer-events-none"
                style={{ transform: "translateZ(-120px)" }}
              >
                🌿
              </div>

              {/* Sparkling Treasure Coins */}
              <div
                className="absolute top-12 left-1/4 text-sm opacity-60 animate-bounce pointer-events-none shadow-glow"
                style={{
                  transform: "translateZ(-20px)",
                  animationDelay: "0.2s",
                }}
              >
                🪙
              </div>
              <div
                className="absolute bottom-20 left-12 text-md opacity-40 animate-pulse pointer-events-none shadow-glow"
                style={{ transform: "translateZ(-60px)", animationDelay: "1s" }}
              >
                🪙
              </div>
              <div
                className="absolute bottom-12 right-24 text-sm opacity-50 animate-bounce pointer-events-none shadow-glow"
                style={{
                  transform: "translateZ(-10px)",
                  animationDelay: "0.5s",
                }}
              >
                🪙
              </div>
              <div
                className="absolute top-48 right-8 text-md opacity-45 animate-pulse pointer-events-none shadow-glow"
                style={{ transform: "translateZ(-80px)" }}
              >
                🪙
              </div>

              {/* Ancient Mossy Ruins Artifacts */}
              <div
                className="absolute top-20 left-2 text-3xl opacity-35 pointer-events-none"
                style={{ transform: "translateZ(-130px)" }}
              >
                🗿
              </div>
              <div
                className="absolute bottom-6 left-16 text-3xl opacity-30 pointer-events-none"
                style={{ transform: "translateZ(-90px)" }}
              >
                🏺
              </div>
              <div
                className="absolute top-1/3 right-4 text-2xl opacity-20 pointer-events-none"
                style={{ transform: "translateZ(-70px)" }}
              >
                🧱
              </div>
              <div
                className="absolute bottom-48 right-12 text-2xl opacity-25 pointer-events-none font-sans"
                style={{ transform: "translateZ(-100px)" }}
              >
                🏛️
              </div>

              {/* Mini 3D Header Branding Logo */}
              <div
                style={{ transform: "translateZ(30px)" }}
                className="w-full flex flex-col items-center justify-center shrink-0 mt-1 select-none z-30 pointer-events-none"
              >
                <div className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-neutral-950/70 rounded-full border border-emerald-500/20 shadow-[0_4px_12px_rgba(0,0,0,0.5)] scale-90 sm:scale-100">
                  <span className="text-3d-hunt-base text-[12px] sm:text-[13px] leading-none tracking-normal">
                    HUNT & LIVE
                  </span>
                  <span className="text-stone-300 font-sans font-black text-[9px]">
                    &#8226;
                  </span>
                  <span className="text-3d-maza-base text-[12px] sm:text-[13px] leading-none tracking-wide italic">
                    MAZA
                  </span>
                </div>
              </div>

              {/* Interactive UI tabs at the very top: EASY, MEDIUM, and HARD */}
              <div
                style={{ transform: "translateZ(20px)" }}
                className="w-full relative flex justify-center items-center shrink-0 mt-0.5 z-20 px-12"
              >
                <div className="grid grid-cols-3 gap-1.5 w-full max-w-[320px] bg-neutral-900/90 p-1 rounded-xl border-t border-white/10 border-b border-black/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.4)] backdrop-blur-md">
                  {(["easy", "medium", "hard"] as const).map((d) => {
                    const isActive = difficulty === d;
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          audio.vibrate(30);
                          audio.play("ding");
                          setDifficulty(d);
                        }}
                        className={`relative py-1.5 sm:py-2 text-[10px] sm:text-xs font-sans font-black uppercase tracking-[0.16em] rounded-lg transition-all duration-200 select-none ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-stone-950 border-t border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)] translate-y-[0px] scale-[1.03]"
                            : "text-stone-400 hover:text-stone-200 bg-transparent active:scale-95"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                {/* Floating Settings Button in the top right corner */}
                <button
                  onClick={() => {
                    audio.vibrate(45);
                    audio.play("ding");
                    setIsSettingsOpen(true);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8.5 h-8.5 rounded-full border border-white/15 bg-neutral-900/90 hover:bg-neutral-800 flex items-center justify-center text-stone-400 hover:text-cyan-400 transition-all hover:scale-110 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-30 cursor-pointer select-none"
                >
                  <Settings
                    size={18}
                    className="animate-[spin_10s_linear_infinite]"
                  />
                </button>
              </div>

              {/* Main stack holding two vertical character rows */}
              <div className="flex flex-col gap-6 w-full flex-grow justify-center py-2 sm:py-4 z-10">
                {/* Top Split Panel: HUNTERS */}
                <div
                  style={{ transform: "translateZ(15px)" }}
                  className="relative border-[2px] border-emerald-500/25 bg-neutral-950/85 rounded-2.5xl p-2.5 sm:p-3.5 pb-2.5 w-full shadow-[0_12px_28px_rgba(0,0,0,0.7)] backdrop-blur-sm"
                >
                  {/* Header Label: HUNTERS */}
                  <div
                    className="flex justify-center absolute -top-3.5 left-0 right-0 z-10"
                    style={{ transform: "translateZ(25px)" }}
                  >
                    <span
                      className="text-emerald-300 border border-emerald-500/30 px-5 py-0.5 rounded-full font-sans font-black text-[10px] sm:text-[11px] tracking-[0.2em] flex items-center justify-center relative whitespace-nowrap overflow-hidden bg-stone-900 shadow-md"
                      style={{
                        background:
                          "linear-gradient(135deg, #022c22 0%, #064e3b 100%)",
                        textShadow: "0 0 10px rgba(16,185,129,0.75)",
                      }}
                    >
                      <span className="relative z-10">HUNTERS</span>
                    </span>
                  </div>

                  {/* 1 Row of 4 highly-detailed circular animal frames */}
                  {/* Scrollable filmstrip section */}
                  <div className="relative w-full mt-2.5 pt-0.5">
                    {/* Left / Right indicator icons */}
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 bg-neutral-900/90 w-5 h-5 rounded-full flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-bold text-[8px] animate-pulse pointer-events-none z-20 select-none">
                      ◀
                    </div>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-neutral-900/90 w-5 h-5 rounded-full flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-bold text-[8px] animate-pulse pointer-events-none z-20 select-none">
                      ▶
                    </div>

                    {/* 1 Row of 9 highly-detailed circular animal frames */}
                    <div
                      className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-2.5 pt-0.5 px-6.5 scroll-smooth snap-x snap-mandatory scrollbar-none"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    >
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_cat"
                          icon="🐱"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_dog"
                          icon="🐶"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_lion"
                          icon="🦁"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_wolf"
                          icon="🐺"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_cheetah"
                          icon="🐆"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_tiger"
                          icon="🐅"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_panther"
                          icon="🐈‍⬛"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_hawk"
                          icon="🦅"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="hunter_fox"
                          icon="🦊"
                          type="hunter"
                          theme={theme}
                        />
                      </div>
                    </div>

                    {/* Navigation dots */}
                    <div className="flex justify-center items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 shadow-[0_0_6px_#10b981]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>
                    </div>
                  </div>
                </div>

                {/* Bottom Split Panel: SURVIVAL */}
                <div
                  style={{ transform: "translateZ(15px)" }}
                  className="relative border-[2px] border-orange-500/25 bg-neutral-950/85 rounded-2.5xl p-2.5 sm:p-3.5 pb-2.5 w-full shadow-[0_12px_28px_rgba(0,0,0,0.7)] backdrop-blur-sm"
                >
                  {/* Header Label: SURVIVAL */}
                  <div
                    className="flex justify-center absolute -top-3.5 left-0 right-0 z-10"
                    style={{ transform: "translateZ(25px)" }}
                  >
                    <span
                      className="text-orange-300 border border-orange-500/35 px-5 py-0.5 rounded-full font-sans font-black text-[10px] sm:text-[11px] tracking-[0.2em] flex items-center justify-center relative whitespace-nowrap overflow-hidden bg-stone-900 shadow-md"
                      style={{
                        background:
                          "linear-gradient(135deg, #3f1a04 0%, #7c2d12 100%)",
                        textShadow: "0 0 10px rgba(249,115,22,0.75)",
                      }}
                    >
                      <span className="relative z-10">SURVIVAL</span>
                    </span>
                  </div>

                  {/* 1 Row of 4 highly-detailed circular animal frames */}
                  {/* Scrollable filmstrip section */}
                  <div className="relative w-full mt-2.5 pt-0.5">
                    {/* Left / Right indicator icons */}
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 bg-neutral-900/90 w-5 h-5 rounded-full flex items-center justify-center border border-orange-500/20 text-orange-400 font-bold text-[8px] animate-pulse pointer-events-none z-20 select-none">
                      ◀
                    </div>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-neutral-900/90 w-5 h-5 rounded-full flex items-center justify-center border border-orange-500/20 text-orange-400 font-bold text-[8px] animate-pulse pointer-events-none z-20 select-none">
                      ▶
                    </div>

                    {/* 1 Row of 9 highly-detailed circular animal frames */}
                    <div
                      className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-2.5 pt-0.5 px-6.5 scroll-smooth snap-x snap-mandatory scrollbar-none"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    >
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_rat"
                          icon="🐭"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_deer"
                          icon="🦌"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_rabbit"
                          icon="🐰"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_bug"
                          icon="🐛"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_squirrel"
                          icon="🐿️"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_owl"
                          icon="🦉"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_elephant"
                          icon="🐘"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_bear"
                          icon="🐻"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                      <div className="w-[78px] sm:w-[92px] shrink-0 snap-start">
                        <ModeCard
                          m="survival_gecko"
                          icon="🦎"
                          type="survival"
                          theme={theme}
                        />
                      </div>
                    </div>

                    {/* Navigation dots */}
                    <div className="flex justify-center items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400/90 shadow-[0_0_6px_#f97316]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500/40"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500/20"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500/20"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wide glowing Cyan Play Button at the very bottom */}
              <div
                style={{ transform: "translateZ(10px)" }}
                className="w-full flex justify-center pb-4 sm:pb-5 shrink-0 z-20"
              >
                <button
                  onClick={() => {
                    audio.vibrate(50);
                    audio.play("ding");
                    // Open role selection (Cat or Rat) overlay, letting user select their preference
                    setOnlineStatus("idle");
                  }}
                  className="w-full relative overflow-hidden group border border-cyan-400 bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 text-stone-950 font-sans font-black text-[11px] sm:text-[12.5px] uppercase tracking-[0.22em] rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:shadow-[0_0_25px_rgba(6,182,212,0.9)] px-4 py-3 sm:py-3.5 flex items-center justify-center gap-2 border-b-[3.5px] border-b-cyan-700 active:border-b-[1px] active:translate-y-[2.5px] transition-all duration-150"
                  style={{
                    textShadow: "0 0.5px 1px rgba(255,255,255,0.8)",
                  }}
                >
                  <span className="text-stone-950 animate-pulse text-xs sm:text-sm">
                    ⚡
                  </span>
                  <span>PLAY 1V1 ONLINE</span>
                  <span className="text-stone-950 animate-pulse text-xs sm:text-sm">
                    ⚡
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {gameState === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative z-10"
            >
              <GameCanvas
                key={gameKey}
                level={level}
                mode={mode}
                difficulty={difficulty}
                score={score}
                multiplier={multiplier}
                theme={theme}
                controllerType={controllerType}
                isPaused={showPopup !== "none"}
                haptics={haptics}
                music={music}
                setTheme={setTheme}
                setControllerType={setControllerType}
                setHaptics={setHaptics}
                setMusic={setMusic}
                onGameOver={handleGameOver}
                onGoHome={goHome}
                startInEditMode={startInEditMode}
                onEditDone={() => {
                  setStartInEditMode(false);
                  setGameState("menu");
                }}
                isOnline={isOnline}
                onlineRole={onlineRole}
                onlineRoomId={onlineRoomId}
              />

              <AnimatePresence>
                {showPopup === "win" && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    className="pointer-events-none absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 "
                  >
                    <Trophy className="w-16 h-16 text-[#65a30d]" />
                    <h2 className="text-2xl font-bold tracking-tighter text-[#65a30d] mt-2">
                      WIN
                    </h2>
                  </motion.div>
                )}
                {showPopup === "lose" && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    className="pointer-events-none absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 "
                  >
                    <Skull className="w-16 h-16 text-red-500" />
                    <h2 className="text-2xl font-bold tracking-tighter text-red-500 mt-2">
                      LOSE
                    </h2>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Immersive Online Matchmaking Overlays */}
        <AnimatePresence>
          {onlineStatus !== "closed" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[200] p-4 backdrop-blur-sm"
            >
              {onlineStatus === "idle" && (
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className={`w-full max-w-lg p-6 rounded-2xl border-4 ${theme === "oled" ? "bg-[#111] border-white/20" : "bg-[#0b1c1e] border-[#166534]"}`}
                >
                  <h3
                    className={`text-2xl font-black text-center uppercase tracking-widest ${theme === "oled" ? "text-white" : "text-[#a3e635]"}`}
                  >
                    Choose Your Role
                  </h3>
                  <p className="text-center text-[10px] sm:text-xs text-gray-400 mt-2 uppercase tracking-wide">
                    Matchmaking is restricted strictly to asymmetric 1v1
                    conflict.
                  </p>

                  <div className="flex gap-4 mt-6">
                    {/* Cat Hunter */}
                    <button
                      onClick={() => {
                        setOnlineSearchingRole("cat");
                        setOnlineStatus("searching");
                        joinAsymmetricQueue("cat");
                      }}
                      className={`flex-1 p-5 rounded-xl border-4 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 ${theme === "oled" ? "bg-[#222] border-white/10 hover:border-white" : "bg-[#122b10] border-[#223d1d] hover:border-[#65a30d]"}`}
                    >
                      <span className="text-4xl sm:text-5xl mb-2">🐱</span>
                      <span className="font-extrabold text-xs sm:text-sm uppercase tracking-widest text-[#a3e635] text-center">
                        Cat (Hunter)
                      </span>
                      <span className="text-[9px] text-gray-300 text-center mt-2 leading-relaxed lowercase">
                        hunt the prey and trigger traps to restrain them!
                      </span>
                    </button>

                    {/* Rat Survival */}
                    <button
                      onClick={() => {
                        setOnlineSearchingRole("rat");
                        setOnlineStatus("searching");
                        joinAsymmetricQueue("rat");
                      }}
                      className={`flex-1 p-5 rounded-xl border-4 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 ${theme === "oled" ? "bg-[#222] border-white/10 hover:border-white" : "bg-[#4a3f25] border-[#b08d4b] hover:border-amber-400"}`}
                    >
                      <span className="text-4xl sm:text-5xl mb-2">🐭</span>
                      <span className="font-extrabold text-xs sm:text-sm uppercase tracking-widest text-amber-400 text-center">
                        Rat (Survival)
                      </span>
                      <span className="text-[9px] text-gray-300 text-center mt-2 leading-relaxed lowercase">
                        evade the hunter, retrieve cheese and reach the exit!
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => setOnlineStatus("closed")}
                    className="w-full mt-6 py-2.5 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-white text-xs uppercase tracking-widest font-bold"
                  >
                    Cancel Matchmaking
                  </button>
                </motion.div>
              )}

              {onlineStatus === "searching" && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative w-36 h-36 flex items-center justify-center mb-6">
                    <span className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></span>
                    <span className="absolute inset-4 rounded-full border-4 border-indigo-500/20 border-b-indigo-500 animate-spin [animation-duration:3s]"></span>
                    <span className="text-5xl animate-bounce">
                      {onlineSearchingRole === "cat" ? "🐱" : "🐭"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest animate-pulse">
                      Searching for Match...
                    </h3>
                    <p className="text-xs uppercase text-gray-400 tracking-wide">
                      {onlineSearchingRole === "cat"
                        ? "searching for a rat survival player..."
                        : "searching for a cat hunter..."}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      leaveAsymmetricQueue();
                      disconnectMultiplayer();
                      setOnlineStatus("closed");
                      setOnlineSearchingRole(null);
                    }}
                    className="mt-8 px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest active:translate-y-0.5"
                  >
                    Cancel Search
                  </button>
                </motion.div>
              )}

              {onlineStatus === "matched" && (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center text-center space-y-6 bg-[#0c0a09]/90 border border-slate-800 p-8 rounded-3xl"
                >
                  <h2 className="text-3xl sm:text-4xl font-black italic bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 bg-clip-text text-transparent animate-pulse tracking-widest">
                    MATCH FOUND!
                  </h2>

                  <div className="flex items-center gap-6 sm:gap-12 py-4">
                    <div className="flex flex-col items-center">
                      <span className="text-5xl sm:text-6xl filter drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                        🐱
                      </span>
                      <span className="text-[#ef4444] font-black uppercase text-[10px] sm:text-xs tracking-widest mt-2">
                        CAT (HUNTER)
                      </span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-white italic">
                      VS
                    </span>
                    <div className="flex flex-col items-center">
                      <span className="text-5xl sm:text-6xl filter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                        🐭
                      </span>
                      <span className="text-[#f59e0b] font-black uppercase text-[10px] sm:text-xs tracking-widest mt-2">
                        RAT (SURVIVAL)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs uppercase text-emerald-400 tracking-widest font-black animate-pulse">
                      Synchronizing state simulation...
                    </p>
                    <p className="text-4xl sm:text-5xl font-black text-white mt-4">
                      {matchCountdown}
                    </p>
                  </div>
                </motion.div>
              )}
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
              <div
                className={`${theme === "oled" ? "bg-[#111] border-[#333]" : "bg-[#064e3b] border-[#047857]/40"} border rounded-2xl p-8 max-w-sm w-full relative text-center max-h-[90vh] overflow-y-auto mt-12 mb-12`}
              >
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[120] text-white hover:text-[#65a30d] transition-colors bg-black/50 p-2 sm:p-3 rounded-full border border-white/20 "
                >
                  <X size={20} />
                </button>

                <h2
                  className={`text-2xl font-bold tracking-tighter mb-8 uppercase flex items-center justify-center gap-3 ${theme === "oled" ? "text-white" : "text-[#65a30d]"}`}
                >
                  <Settings size={28} />
                  Settings
                </h2>

                <div className="flex flex-col gap-8 text-left">
                  {/* High Score */}
                  <div
                    className={`${theme === "oled" ? "bg-[#111] border-[#333]" : "bg-[#022c22] border-[#047857]/50"} border p-4 rounded-xl flex items-center justify-between`}
                  >
                    <span
                      className={`flex items-center gap-2 uppercase text-sm tracking-widest font-bold ${theme === "oled" ? "text-white" : "text-[#65a30d]"}`}
                    >
                      <Trophy size={18} /> High Score
                    </span>
                    <span
                      className={`text-2xl font-mono font-black tracking-wider ${theme === "oled" ? "text-gray-300" : "text-[#a3e635]"}`}
                    >
                      {highScore.toLocaleString()}
                    </span>
                  </div>

                  {/* Customize Layout - Highlighted */}
                  {(controllerType === "dpad" ||
                    controllerType === "joystick") && (
                    <div
                      className={`${theme === "oled" ? "bg-[#222] border-[#555]" : "bg-[#064e3b] border-[#65a30d]"} border-2 p-4 rounded-xl flex flex-col gap-3`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span
                          className={`flex items-center gap-2 uppercase text-sm tracking-widest font-black ${theme === "oled" ? "text-white" : "text-[#65a30d]"}`}
                        >
                          <Settings size={18} /> Customize Layout
                        </span>
                        <button
                          onClick={() => {
                            setIsSettingsOpen(false);
                            setStartInEditMode(true);
                            setGameState("playing");
                          }}
                          className={`${theme === "oled" ? "bg-[#ddd] hover:bg-white text-black" : "bg-[#65a30d] hover:bg-[#a3e635] text-[#022c22]"} px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 flex items-center gap-2`}
                        >
                          <Settings size={16} /> Edit Now
                        </button>
                      </div>
                      <p
                        className={`text-[10px] sm:text-xs opacity-90 ${theme === "oled" ? "text-gray-400" : "text-[#a3e635]"}`}
                      >
                        Drag and drop to reposition the{" "}
                        {controllerType === "joystick" ? "JOYSTICK" : "D-PAD"}{" "}
                        and buttons according to your playstyle.
                      </p>
                    </div>
                  )}

                  {/* Forest Ambience Control */}
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === "oled" ? "text-white" : "text-[#a3e635]"}`}
                    >
                      <Music size={16} /> Forest Ambience
                    </span>
                    <button
                      onClick={() => {
                        const m = !music;
                        setMusic(m);
                        audio.setMusic(m);
                      }}
                      className={`w-14 h-8 rounded-full p-1 transition-colors relative ${music ? (theme === "oled" ? "bg-white" : "bg-[#65a30d]") : theme === "oled" ? "bg-[#333]" : "bg-[#022c22]"}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full transition-transform ${theme === "oled" ? (music ? "bg-[#222]" : "bg-[#111]") : "bg-[#064e3b]"} ${music ? "translate-x-6" : "translate-x-0"}`}
                      ></div>
                    </button>
                  </div>

                  <div
                    className={`w-full h-px my-[-10px] ${theme === "oled" ? "bg-[#333]" : "bg-[#15803d]/30"}`}
                  ></div>

                  {/* Haptics Control */}
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === "oled" ? "text-white" : "text-[#a3e635]"}`}
                    >
                      <Vibrate size={16} /> Haptic Feedback
                    </span>
                    <button
                      onClick={() => {
                        const h = !haptics;
                        setHaptics(h);
                        audio.setHaptics(h);
                        if (h) audio.vibrate(50);
                      }}
                      className={`w-14 h-8 rounded-full p-1 transition-colors relative ${haptics ? (theme === "oled" ? "bg-white" : "bg-[#65a30d]") : theme === "oled" ? "bg-[#333]" : "bg-[#022c22]"}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full transition-transform ${theme === "oled" ? (haptics ? "bg-[#222]" : "bg-[#111]") : "bg-[#064e3b]"} ${haptics ? "translate-x-6" : "translate-x-0"}`}
                      ></div>
                    </button>
                  </div>

                  <div
                    className={`w-full h-px my-[-10px] ${theme === "oled" ? "bg-[#333]" : "bg-[#15803d]/30"}`}
                  ></div>

                  {/* Theme Settings */}
                  <div className="flex flex-col gap-3">
                    <span
                      className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === "oled" ? "text-white" : "text-[#a3e635]"}`}
                    >
                      Theme
                    </span>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 justify-between">
                        <button
                          onClick={() => setTheme("default")}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors border ${theme === "default" ? "bg-[#65a30d] text-[#022c22] border-[#65a30d]" : theme === "oled" ? "bg-[#222] text-[#ccc] border-[#444] hover:bg-[#333]" : "bg-[#022c22] text-[#65a30d] border-[#15803d]"}`}
                        >
                          Default
                        </button>
                        <button
                          onClick={() => setTheme("oled")}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors border ${theme === "oled" ? "bg-white text-black border-white" : "bg-[#111] border-[#333] hover:bg-[#222]"}`}
                        >
                          OLED
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-px bg-[#15803d]/30 my-[-10px]"></div>

                  {/* Controller Settings */}
                  <div className="flex flex-col gap-3">
                    <span
                      className={`flex items-center gap-2 opacity-80 uppercase text-xs tracking-widest font-bold ${theme === "oled" ? "text-white" : "text-[#a3e635]"}`}
                    >
                      Controller
                    </span>
                    <div className="flex gap-2 justify-between">
                      <button
                        onClick={() => setControllerType("dpad")}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border ${controllerType === "dpad" ? (theme === "oled" ? "bg-white text-black border-white" : "bg-[#65a30d] text-[#022c22] border-[#65a30d]") : theme === "oled" ? "bg-[#222] text-[#ccc] border-[#444] hover:bg-[#333]" : "bg-[#022c22] text-[#65a30d] border-[#15803d]"}`}
                      >
                        D-PAD
                      </button>
                      <button
                        onClick={() => setControllerType("joystick")}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border ${controllerType === "joystick" ? (theme === "oled" ? "bg-white text-black border-white" : "bg-[#65a30d] text-[#022c22] border-[#65a30d]") : theme === "oled" ? "bg-[#222] text-[#ccc] border-[#444] hover:bg-[#333]" : "bg-[#022c22] text-[#65a30d] border-[#15803d]"}`}
                      >
                        Joystick
                      </button>
                      <button
                        onClick={() => setControllerType("swipe")}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border ${controllerType === "swipe" ? (theme === "oled" ? "bg-white text-black border-white" : "bg-[#65a30d] text-[#022c22] border-[#65a30d]") : theme === "oled" ? "bg-[#222] text-[#ccc] border-[#444] hover:bg-[#333]" : "bg-[#022c22] text-[#65a30d] border-[#15803d]"}`}
                      >
                        Swipe
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-10 text-[10px] uppercase opacity-40 tracking-widest ${theme === "oled" ? "text-white" : ""}`}
                >
                  Jungle Rule V1.0
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
