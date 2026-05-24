import React from 'react';
import { audio } from '../lib/audio';

interface ModeCardProps {
  m: string;
  icon: string;
  type: 'hunter' | 'survival';
  theme?: string;
  setMode: (mode: string) => void;
  setGameState: (state: 'splash' | 'menu' | 'playing' | 'gameover') => void;
  setLevel: (level: number) => void;
  setScore: (score: number) => void;
  setMultiplier: (multiplier: number) => void;
}

export const ModeCard: React.FC<ModeCardProps> = ({
  m,
  icon,
  type,
  theme,
  setMode,
  setGameState,
  setLevel,
  setScore,
  setMultiplier,
}) => {
  const soundMap: Record<string, string> = {
    hunter_cat: 'meow',
    hunter_dog: 'bark',
    hunter_lion: 'roar',
    hunter_wolf: 'howl',
    hunter_frog: 'croak',
    hunter_cheetah: 'roar',
    hunter_tiger: 'roar',
    hunter_panther: 'roar',
    hunter_hawk: 'howl',
    hunter_fox: 'bark',
    survival_rat: 'squeak',
    survival_cat: 'meow',
    survival_squirrel: 'squeak',
    survival_owl: 'howl',
    survival_elephant: 'roar',
    survival_bear: 'roar',
    survival_gecko: 'croak',
  };

  const animalNameMap: Record<string, string> = {
    hunter_cat: 'CAT',
    hunter_dog: 'DOG',
    hunter_lion: 'LION',
    hunter_wolf: 'WOLF',
    hunter_frog: 'FROG',
    hunter_cheetah: 'CHEETAH',
    hunter_tiger: 'TIGER',
    hunter_panther: 'BLACK PANTHER',
    hunter_hawk: 'HAWK',
    hunter_fox: 'FOX',
    survival_rat: 'MOUSE',
    survival_cat: 'CAT',
    survival_deer: 'DEER',
    survival_rabbit: 'RABBIT',
    survival_bug: 'CATERPILLAR',
    survival_squirrel: 'SQUIRREL',
    survival_owl: 'OWL',
    survival_elephant: 'ELEPHANT',
    survival_bear: 'BEAR',
    survival_gecko: 'GECKO',
  };

  const sound = soundMap[m] || 'ding';
  const name = animalNameMap[m] || 'SELECT';

  const selectCharacter = () => {
    audio.vibrate(40);
    audio.play(sound as any);
    setMode(m);
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setMultiplier(1);
  };

  return (
    <div
      onClick={selectCharacter}
      className={`w-full flex flex-col items-center justify-center p-2.5 sm:p-3.5 bg-neutral-900/80 rounded-2xl border transition-all duration-200 cursor-pointer group select-none relative overflow-hidden aspect-square ${
        type === 'hunter'
          ? 'border-emerald-500/20 hover:border-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/35 shadow-[0_4px_12px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:scale-[1.04]'
          : 'border-orange-500/20 hover:border-orange-400 bg-orange-950/10 hover:bg-orange-950/35 shadow-[0_4px_12px_rgba(249,115,22,0.1)] hover:shadow-[0_0_25px_rgba(249,115,22,0.25)] hover:scale-[1.04]'
      }`}
    >
      {/* Light glow effects */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
          type === 'hunter'
            ? 'bg-gradient-to-b from-emerald-500/15 to-transparent'
            : 'bg-gradient-to-b from-orange-500/15 to-transparent'
        }`}
      />

      {/* 3D Round Medallion Frame - Glowing Green/Orange Circular Frames */}
      <div
        className={`relative w-14 h-14 sm:w-[68px] sm:h-[68px] flex items-center justify-center rounded-full border-[3px] sm:border-[3.5px] transition-all duration-300 group-hover:scale-110 shrink-0 ${
          type === 'hunter'
            ? 'border-emerald-400 bg-gradient-to-b from-emerald-600 to-emerald-950 shadow-[0_0_15px_#10b981,inset_0_2px_4px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_22px_#34d399,inset_0_2px_4px_rgba(0,0,0,0.8)]'
            : 'border-orange-400 bg-gradient-to-b from-orange-600 to-orange-950 shadow-[0_0_15px_#f97316,inset_0_2px_4px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_22px_#fb923c,inset_0_2px_4px_rgba(0,0,0,0.8)]'
        }`}
      >
        <div
          className={`absolute inset-0.5 rounded-full border ${
            type === 'hunter' ? 'border-emerald-300/30' : 'border-orange-300/30'
          }`}
        />
        <span className="text-3xl sm:text-4xl leading-none relative z-10 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] select-none">
          {icon}
        </span>
      </div>

      {/* Character Name display - Clean, bold, glowing green/orange 3D font */}
      <span
        className={`text-[10px] sm:text-[11.5px] mt-2.5 sm:mt-3 font-sans font-black tracking-widest leading-none select-none transition-colors duration-200 uppercase`}
        style={{
          textShadow: type === 'hunter'
            ? '0 1px 0 #065f46, 0 2px 0 #022c22, 0 3px 0 #000000, 0 0 10px rgba(16,185,129,0.85)'
            : '0 1px 0 #9a3412, 0 2px 0 #431407, 0 3px 0 #000000, 0 0 10px rgba(249,115,22,0.85)',
          color: type === 'hunter' ? '#6ee7b7' : '#ffedd5'
        }}
      >
        {name}
      </span>
    </div>
  );
};
