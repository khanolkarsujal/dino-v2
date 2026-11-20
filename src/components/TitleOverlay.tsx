import React from 'react';
import { BookOpen, Film, Play, Power, RotateCcw, Settings } from 'lucide-react';

interface TitleOverlayProps {
  bestWave: number;
  victories: number;
  savedKingdom?: { wave: number; stageLabel: string } | null;
  onContinueSaved?: () => void;
  onPlayWithStory: () => void;
  onQuickPlay: () => void;
  onOpenStudio: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  bestWave,
  victories,
  savedKingdom,
  onContinueSaved,
  onPlayWithStory,
  onQuickPlay,
  onOpenStudio,
  onOpenSettings,
  onQuit,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      {/* Upper-Left Calm Negative-Space Lockup */}
      <div className="max-w-lg pointer-events-auto">
        <div
          className="inline-block rounded-lg border border-amber-500/25 px-6 py-6 shadow-2xl"
          style={{ backgroundColor: 'rgba(13, 17, 23, 0.88)' }}
        >
          {/* Bespoke Inline SVG Title Emblem */}
          <div className="flex items-center gap-3.5 mb-3">
            <svg
              viewBox="0 0 48 48"
              className="w-12 h-12 shrink-0"
              aria-hidden="true"
            >
              <circle cx="24" cy="24" r="21" fill="#1b1512" stroke="#d9822b" strokeWidth="2" />
              <path
                d="M24 8 C28 16, 35 19, 34 28 C33 34, 29 38, 24 38 C19 38, 15 34, 14 28 C13 21, 19 17, 24 8 Z"
                fill="#e85d2a"
              />
              <path
                d="M24 16 C27 21, 30 24, 29 30 C28 33, 26 35, 24 35 C22 35, 20 33, 19 30 C18 25, 21 22, 24 16 Z"
                fill="#ffd24a"
              />
              <path
                d="M12 36 L36 36"
                stroke="#8c5a32"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wide text-amber-100 leading-tight">
                Dragon Campfire
              </h1>
              <p className="font-display text-sm md:text-base font-semibold tracking-widest text-amber-400">
                Kingdom of Embers
              </p>
            </div>
          </div>

          <p className="text-sm text-stone-300 leading-relaxed mb-5 max-w-md">
            Rebuild a fallen valley from a single dying flame. Gather timber and stone, raise
            watchtowers, hatch elemental drakes, and shatter the four obsidian caves.
          </p>

          {/* Primary & Secondary Menu Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onPlayWithStory}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-md bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-base transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              Play Game
            </button>

            {savedKingdom && onContinueSaved && (
              <button
                type="button"
                data-testid="continue-kingdom-btn"
                onClick={onContinueSaved}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-emerald-500/50 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 text-emerald-300" />
                Continue Kingdom (Day {savedKingdom.wave} · {savedKingdom.stageLabel})
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onQuickPlay}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md border border-stone-600/60 bg-stone-800/90 hover:bg-stone-700 text-stone-100 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                Skip to Battle
              </button>
              <button
                type="button"
                onClick={onOpenStudio}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md border border-stone-600/60 bg-stone-800/90 hover:bg-stone-700 text-stone-100 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <Film className="w-4 h-4 text-amber-400" />
                Story & Media Studio
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-md border border-stone-700/70 bg-stone-900/90 hover:bg-stone-800 text-stone-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <Settings className="w-4 h-4 text-stone-400" />
                Settings
              </button>
              <button
                type="button"
                onClick={onQuit}
                className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-md border border-stone-700/70 bg-stone-900/90 hover:bg-red-950/80 hover:border-red-700/60 text-stone-300 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <Power className="w-4 h-4 text-stone-400" />
                Quit
              </button>
            </div>
          </div>

          {(bestWave > 0 || victories > 0) && (
            <div className="mt-4 pt-3 border-t border-stone-700/60 flex items-center gap-3 text-xs text-stone-400 font-mono-num">
              <span>Best Wave: {bestWave}/15</span>
              <span aria-hidden="true">·</span>
              <span>Victories: {victories}</span>
            </div>
          )}
        </div>
      </div>

      {/* Single Flat Control-Hint Line */}
      <div className="text-center pointer-events-none">
        <span
          className="inline-block px-4 py-1.5 rounded text-xs tracking-wide text-stone-300 font-mono-num"
          style={{ backgroundColor: 'rgba(13, 17, 23, 0.78)' }}
        >
          WASD Move · Space Attack · Shift Dash · E Interact · 1-3/Q/R Orders · B Build · G Map · Esc Pause
        </span>
      </div>
    </div>
  );
};
