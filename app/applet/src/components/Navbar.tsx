import React from 'react';
import { Gamepad2, Sparkles, Trophy, Settings, HelpCircle, Volume2, VolumeX, Flame } from 'lucide-react';

interface NavbarProps {
  highScore: number;
  currentScore: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onOpenCoach: () => void;
  onOpenChallenge: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  gameMode: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  highScore,
  currentScore,
  soundEnabled,
  setSoundEnabled,
  onOpenCoach,
  onOpenChallenge,
  onOpenSettings,
  onOpenLeaderboard,
  gameMode
}) => {
  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Gamepad2 className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Dino Game <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">AI Studio</span>
            </h1>
            <p className="text-xs text-slate-400 capitalize">Mode: {gameMode}</p>
          </div>
        </div>

        {/* Scores Display */}
        <div className="flex items-center gap-6 bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-700/60 shadow-inner">
          <div className="text-center">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">Score</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              {String(currentScore).padStart(5, '0')}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-700"></div>
          <div className="text-center">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">High Score</span>
            <span className="text-xl font-black text-amber-400 font-mono">
              {String(highScore).padStart(5, '0')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCoach}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm shadow-md shadow-indigo-500/20 transition-all transform hover:scale-105 active:scale-95"
            title="Gemini AI Coach & High Thinking Mode"
          >
            <Sparkles className="w-4 h-4 text-purple-200 animate-spin" style={{ animationDuration: '4s' }} />
            <span>AI Coach</span>
          </button>

          <button
            onClick={onOpenChallenge}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all hover:border-emerald-500/50"
            title="Daily Challenges"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Challenges</span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            title="Leaderboard"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            title="Settings & Themes"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
