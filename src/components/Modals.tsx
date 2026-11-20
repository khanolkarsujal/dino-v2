import React from 'react';
import { Award, RotateCcw, Settings, ShieldAlert, Skull, Sparkles } from 'lucide-react';
import type { UpgradeCardDef } from '../game/data';
import type { GameStats } from '../game/engine';

interface UpgradeModalProps {
  choices: UpgradeCardDef[];
  wave: number;
  onSelect: (cardId: string) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ choices, wave, onSelect }) => (
  <div className="fixed inset-0 z-30 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(10, 13, 18, 0.82)' }}>
    <div
      className="max-w-3xl w-full rounded-lg border border-amber-500/40 p-6 shadow-2xl"
      style={{ backgroundColor: 'rgba(17, 22, 29, 0.98)' }}
    >
      <div className="text-center mb-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">
          Night {wave} Survived
        </div>
        <h2 className="font-display text-2xl font-bold text-amber-100">
          Dawn Breaks — Choose a Royal Decree
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {choices.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelect(card.id)}
            className="text-left rounded-md border border-stone-700 hover:border-amber-400 bg-stone-900 hover:bg-stone-800 p-4 transition-colors cursor-pointer flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2 text-amber-300 font-display font-bold text-base mb-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                {card.title}
              </div>
              <p className="text-sm text-stone-300 leading-relaxed">{card.description}</p>
            </div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Adopt Decree
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
  onQuit,
}) => (
  <div className="fixed inset-0 z-30 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(10, 13, 18, 0.80)' }}>
    <div
      className="max-w-sm w-full rounded-lg border border-stone-700 p-6 shadow-2xl text-center"
      style={{ backgroundColor: 'rgba(17, 22, 29, 0.98)' }}
    >
      <h2 className="font-display text-2xl font-bold text-amber-200 mb-5">Kingdom Paused</h2>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onResume}
          className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm cursor-pointer"
        >
          Resume Defense
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Restart Run
        </button>
        <button
          type="button"
          onClick={onMainMenu}
          className="w-full py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium cursor-pointer"
        >
          Main Menu
        </button>
        <button
          type="button"
          onClick={onQuit}
          className="w-full py-2 rounded border border-stone-700 hover:bg-red-950/70 text-stone-400 text-xs font-medium cursor-pointer"
        >
          Quit Game
        </button>
      </div>
    </div>
  </div>
);

interface SettingsModalProps {
  gameSpeed: number;
  muted: boolean;
  playIntroOnStart: boolean;
  onChangeSpeed: (s: number) => void;
  onToggleMute: () => void;
  onToggleIntroOnStart: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  gameSpeed,
  muted,
  playIntroOnStart,
  onChangeSpeed,
  onToggleMute,
  onToggleIntroOnStart,
  onClose,
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(10, 13, 18, 0.85)' }}>
    <div
      className="max-w-md w-full rounded-lg border border-stone-700 p-6 shadow-2xl"
      style={{ backgroundColor: 'rgba(17, 22, 29, 0.98)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-bold text-amber-200">Settings</h2>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 cursor-pointer"
        >
          Done
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <div className="text-stone-300 font-medium mb-2">Simulation Pace</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '0.75x Chill', value: 0.75 },
              { label: '1.0x Normal', value: 1.0 },
              { label: '1.25x Brisk', value: 1.25 },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeSpeed(opt.value)}
                className={`py-2 rounded border text-xs font-medium cursor-pointer ${
                  gameSpeed === opt.value
                    ? 'border-amber-400 bg-amber-600 text-stone-950 font-semibold'
                    : 'border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-800">
          <div>
            <div className="text-stone-200 font-medium">Audio Synthesis</div>
            <div className="text-xs text-stone-400">Combat impacts, dragons, and story chimes</div>
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            className="px-3.5 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-100 cursor-pointer"
          >
            {muted ? 'Muted' : 'Enabled'}
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-800">
          <div>
            <div className="text-stone-200 font-medium">Play Storyline Intro</div>
            <div className="text-xs text-stone-400">Show animated story sequence on Play Game</div>
          </div>
          <button
            type="button"
            onClick={onToggleIntroOnStart}
            className="px-3.5 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-100 cursor-pointer"
          >
            {playIntroOnStart ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface EndModalProps {
  victory: boolean;
  wave: number;
  stats: GameStats;
  explorationPct: number;
  relicsCount: number;
  dragonsCount: number;
  protectorsCount: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onQuit: () => void;
}

export const EndModal: React.FC<EndModalProps> = ({
  victory,
  wave,
  stats,
  explorationPct,
  relicsCount,
  dragonsCount,
  protectorsCount,
  onPlayAgain,
  onMainMenu,
  onQuit,
}) => {
  const mins = Math.floor(stats.elapsedSec / 60);
  const secs = Math.floor(stats.elapsedSec % 60);
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(10, 13, 18, 0.85)' }}>
      <div
        className="max-w-md w-full rounded-lg border border-amber-500/35 p-6 shadow-2xl text-center"
        style={{ backgroundColor: 'rgba(17, 22, 29, 0.98)' }}
      >
        <div className="flex justify-center mb-3">
          {victory ? (
            <Award className="w-11 h-11 text-amber-400" />
          ) : (
            <Skull className="w-11 h-11 text-red-400" />
          )}
        </div>
        <h2 className="font-display text-2xl font-bold text-amber-100 mb-1">
          {victory ? 'Region Liberated!' : 'The Campfire Went Out'}
        </h2>
        <p className="text-sm text-stone-300 mb-5">
          {victory
            ? 'All four Abyssal Caves have collapsed and Elderglen stands eternal.'
            : 'Shadow legions extinguished the hearth. Rally and rebuild stronger.'}
        </p>

        <div className="grid grid-cols-3 gap-2.5 mb-4 text-xs font-mono-num">
          <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
            <div className="text-stone-400">CAVES</div>
            <div className="text-base font-bold text-amber-300">{stats.cavesDestroyed}/4</div>
          </div>
          <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
            <div className="text-stone-400">EXPLORED</div>
            <div className="text-base font-bold text-stone-100">{explorationPct}%</div>
          </div>
          <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
            <div className="text-stone-400">TIME</div>
            <div className="text-base font-bold text-stone-100">{timeStr}</div>
          </div>
        </div>

        <div className="text-xs text-stone-400 font-mono-num mb-5">
          Wave {wave} · Slain: {stats.kills} · Relics: {relicsCount}/4 · Dragons: {dragonsCount} · Knights: {protectorsCount}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm cursor-pointer"
          >
            Play Again
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onMainMenu}
              className="py-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium cursor-pointer"
            >
              Main Menu
            </button>
            <button
              type="button"
              onClick={onQuit}
              className="py-2 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-medium cursor-pointer"
            >
              Quit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuitModalProps {
  onReturnToTitle: () => void;
}

export const QuitModal: React.FC<QuitModalProps> = ({ onReturnToTitle }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(9, 12, 16, 0.96)' }}>
    <div
      className="max-w-sm w-full rounded-lg border border-stone-700 p-7 text-center shadow-2xl"
      style={{ backgroundColor: 'rgba(17, 22, 29, 0.98)' }}
    >
      <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-3" />
      <h2 className="font-display text-2xl font-bold text-amber-100 mb-2">
        Until Next Dawn, Guardian
      </h2>
      <p className="text-sm text-stone-400 mb-6">
        Your campfire rests safely in the valley of Elderglen. Return whenever you are ready to
        command your dragons again.
      </p>
      <button
        type="button"
        onClick={onReturnToTitle}
        className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm cursor-pointer"
      >
        Return to Main Menu
      </button>
    </div>
  </div>
);
