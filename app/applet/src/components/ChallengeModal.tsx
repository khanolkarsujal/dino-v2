import React, { useState, useEffect } from 'react';
import { X, Flame, Sparkles, Trophy, CheckCircle2 } from 'lucide-react';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChallenge: (targetScore: number) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  onStartChallenge
}) => {
  const [challenge, setChallenge] = useState<{
    title: string;
    description: string;
    targetScore: number;
    rewardTitle: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !challenge) {
      fetchChallenge();
    }
  }, [isOpen]);

  const fetchChallenge = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-challenge', { method: 'POST' });
      const data = await res.json();
      if (data.challenge) {
        setChallenge(data.challenge);
      }
    } catch (err) {
      setChallenge({
        title: "Meteorite Dodge Master",
        description: "Reach score 350 while surviving high-speed obstacle intervals!",
        targetScore: 350,
        rewardTitle: "Golden T-Rex Badge"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/50 via-slate-900 to-orange-900/50 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Daily AI Challenge</h2>
              <p className="text-xs text-slate-400">Generated dynamically by Gemini AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-slate-400 text-sm">Generating epic challenge...</p>
            </div>
          ) : challenge ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
                <span className="text-xs font-mono uppercase tracking-wider text-amber-400">Active Challenge</span>
                <h3 className="text-xl font-bold text-white">{challenge.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{challenge.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Target Score</span>
                    <span className="font-mono font-bold text-white text-lg">{challenge.targetScore} pts</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Reward Badge</span>
                    <span className="font-bold text-emerald-300 text-xs truncate max-w-[120px]">{challenge.rewardTitle}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onStartChallenge(challenge.targetScore);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Accept Challenge & Play!
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
