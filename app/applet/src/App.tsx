import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GameCanvas } from './components/GameCanvas';
import { AICoachModal } from './components/AICoachModal';
import { ChallengeModal } from './components/ChallengeModal';
import { SettingsModal } from './components/SettingsModal';
import { LeaderboardModal } from './components/LeaderboardModal';

export default function App() {
  const [highScore, setHighScore] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [speed, setSpeed] = useState(6);
  const [obstaclesDodged, setObstaclesDodged] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState('cyberpunk');
  const [gameMode, setGameMode] = useState('classic');

  // Modals state
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Leaderboard scores
  const [scores, setScores] = useState<Array<{ score: number; date: string; mode: string }>>([]);

  useEffect(() => {
    const savedHighScore = localStorage.getItem('dino_highscore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));

    const savedScores = localStorage.getItem('dino_scores');
    if (savedScores) {
      try {
        setScores(JSON.parse(savedScores));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleUpdateScore = (score: number, dodged: number) => {
    setCurrentScore(score);
    setObstaclesDodged(dodged);
  };

  const handleGameOver = (finalScore: number, dodged: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('dino_highscore', String(finalScore));
    }

    const newRecord = {
      score: finalScore,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      mode: gameMode
    };

    const updatedScores = [newRecord, ...scores].sort((a, b) => b.score - a.score).slice(0, 10);
    setScores(updatedScores);
    localStorage.setItem('dino_scores', JSON.stringify(updatedScores));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar
        highScore={highScore}
        currentScore={currentScore}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenCoach={() => setIsCoachOpen(true)}
        onOpenChallenge={() => setIsChallengeOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        gameMode={gameMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col items-center justify-center gap-6">
        <div className="w-full text-center space-y-2">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Chrome T-Rex Runner AI Studio Edition
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Experience the legendary offline dinosaur game with advanced visual themes, game modes, and real-time Gemini AI coaching powered by High Thinking Mode.
          </p>
        </div>

        <GameCanvas
          theme={theme}
          gameMode={gameMode}
          soundEnabled={soundEnabled}
          onUpdateScore={handleUpdateScore}
          onGameOver={handleGameOver}
        />
      </main>

      {/* Modals */}
      <AICoachModal
        isOpen={isCoachOpen}
        onClose={() => setIsCoachOpen(false)}
        currentScore={currentScore}
        speed={speed}
        obstaclesDodged={obstaclesDodged}
        gameMode={gameMode}
      />

      <ChallengeModal
        isOpen={isChallengeOpen}
        onClose={() => setIsChallengeOpen(false)}
        onStartChallenge={(target) => {
          setGameMode('hardcore');
          setIsChallengeOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        gameMode={gameMode}
        setGameMode={setGameMode}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        scores={scores}
      />
    </div>
  );
}
