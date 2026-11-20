import React from 'react';
import { X, Palette, Gamepad2, Volume2, Shield } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  gameMode: string;
  setGameMode: (mode: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  setTheme,
  gameMode,
  setGameMode,
  soundEnabled,
  setSoundEnabled
}) => {
  if (!isOpen) return null;

  const themes = [
    { id: 'classic', name: 'Chrome Classic', bg: 'bg-white text-slate-800 border-slate-300' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', bg: 'bg-slate-950 text-cyan-400 border-cyan-500/50' },
    { id: 'volcano', name: 'Prehistoric Volcano', bg: 'bg-stone-900 text-amber-500 border-amber-500/50' },
    { id: 'arcade', name: 'Retro Arcade', bg: 'bg-zinc-900 text-emerald-400 border-emerald-500/50' }
  ];

  const modes = [
    { id: 'classic', name: 'Classic Endless', desc: 'Standard Chrome T-Rex endless runner with progressive speed.' },
    { id: 'hardcore', name: 'Hardcore Storm', desc: 'Faster obstacle spawn rate and frequent meteorites.' },
    { id: 'timeAttack', name: 'Time Attack (60s)', desc: 'Score as many points as possible within 60 seconds.' },
    { id: 'aiCopilot', name: 'AI Co-Pilot Mode', desc: 'Gemini AI predicts obstacle patterns and gives real-time assists.' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Game Settings & Themes</h2>
              <p className="text-xs text-slate-400">Customize your Dino Runner experience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Game Modes */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>Select Game Mode</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {modes.map(m => (
                <button
                  key={m.id}
                  onClick={() => setGameMode(m.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                    gameMode === m.id
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm">{m.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                  </div>
                  {gameMode === m.id && (
                    <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse mt-1"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Picker */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Visual Theme</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3.5 rounded-xl border text-center transition-all ${
                    theme === t.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-white font-bold shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 font-medium'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="font-bold text-sm text-white">Synthesized Sound Effects</div>
                <div className="text-xs text-slate-400">Play audio cues for jumps, scores, and collisions</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={e => setSoundEnabled(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
