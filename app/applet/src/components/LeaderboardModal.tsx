import React from 'react';
import { X, Trophy, Medal, Award, Calendar } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: Array<{ score: number; date: string; mode: string }>;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  scores
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Top Run Records</h2>
              <p className="text-xs text-slate-400">Local high score leaderboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {scores.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400" />
              <p className="text-sm">No recorded runs yet. Jump into the game and set a record!</p>
            </div>
          ) : (
            scores.map((s, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between transition-all hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                    idx === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/40' :
                    idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {idx === 0 ? <Medal className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-white text-lg">{s.score} pts</div>
                    <div className="text-[11px] text-slate-400 capitalize flex items-center gap-2">
                      <span>Mode: {s.mode}</span>
                      <span>•</span>
                      <span>{s.date}</span>
                    </div>
                  </div>
                </div>
                {idx === 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    Personal Best
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
