import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Pause, Sparkles, Shield, Zap } from 'lucide-react';
import { calculateSpeed, checkCollision } from '../game/rules';

interface GameCanvasProps {
  theme: string;
  gameMode: string;
  soundEnabled: boolean;
  onUpdateScore: (score: number, dodged: number) => void;
  onGameOver: (score: number, dodged: number) => void;
  targetChallengeScore?: number | null;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  theme,
  gameMode,
  soundEnabled,
  onUpdateScore,
  onGameOver,
  targetChallengeScore
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [obstaclesDodged, setObstaclesDodged] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(6);
  const [aiTip, setAiTip] = useState<string>('');

  // Audio synthesizer using Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playSound = (type: 'jump' | 'score' | 'gameover' | 'powerup') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'jump') {
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'score') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(800, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'gameover') {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'powerup') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      // Ignore audio errors if audio context blocked
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('dino_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Game loop variables
  const gameRef = useRef({
    dino: { x: 60, y: 220, width: 44, height: 48, vy: 0, isJumping: false, isDucking: false },
    obstacles: [] as Array<{ id: number; x: number; y: number; width: number; height: number; type: string; passed: boolean }>,
    clouds: [] as Array<{ x: number; y: number; speed: number; width: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }>,
    score: 0,
    speed: 6,
    obstaclesDodged: 0,
    groundX: 0,
    frame: 0,
    nextObstacleDist: 100,
    shieldActive: false,
    shieldTimer: 0,
    timeRemaining: gameMode === 'timeAttack' ? 60 : 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const state = gameRef.current;

    // Initialize clouds
    if (state.clouds.length === 0) {
      for (let i = 0; i < 4; i++) {
        state.clouds.push({
          x: Math.random() * canvas.width,
          y: 30 + Math.random() * 80,
          speed: 1 + Math.random(),
          width: 60 + Math.random() * 40
        });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'start' || gameState === 'gameover') {
          startGame();
        } else if (gameState === 'playing' && !state.dino.isJumping && !state.dino.isDucking) {
          state.dino.vy = -12.5;
          state.dino.isJumping = true;
          playSound('jump');
        }
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (gameState === 'playing' && !state.dino.isJumping) {
          state.dino.isDucking = true;
        }
      } else if (e.code === 'KeyP') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        state.dino.isDucking = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();

    const updateAndRender = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Theme colors
      const isCyber = theme === 'cyberpunk';
      const isVolcano = theme === 'volcano';
      const isArcade = theme === 'arcade';

      const bgColor = isCyber ? '#090d16' : isVolcano ? '#1c1412' : isArcade ? '#18181b' : '#f8fafc';
      const groundColor = isCyber ? '#00f0ff' : isVolcano ? '#f97316' : isArcade ? '#10b981' : '#cbd5e1';
      const dinoColor = isCyber ? '#00f0ff' : isVolcano ? '#fb923c' : isArcade ? '#34d399' : '#334155';
      const obsColor = isCyber ? '#f43f5e' : isVolcano ? '#ea580c' : isArcade ? '#f59e0b' : '#475569';

      // Clear canvas
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gameState === 'playing') {
        // Speed & Score calculation
        state.speed = calculateSpeed(state.score, gameMode === 'hardcore' ? 8 : 6);
        setCurrentSpeed(state.speed);
        state.score += state.speed * 0.15;
        setScore(Math.floor(state.score));
        onUpdateScore(Math.floor(state.score), state.obstaclesDodged);

        if (gameMode === 'timeAttack') {
          state.timeRemaining -= dt;
          if (state.timeRemaining <= 0) {
            setGameState('gameover');
            onGameOver(Math.floor(state.score), state.obstaclesDodged);
            playSound('gameover');
          }
        }

        // Shield timer
        if (state.shieldActive) {
          state.shieldTimer -= dt;
          if (state.shieldTimer <= 0) state.shieldActive = false;
        }

        // Dino physics
        state.dino.y += state.dino.vy;
        state.dino.vy += 0.65; // gravity

        const floorY = 220;
        if (state.dino.y >= floorY) {
          state.dino.y = floorY;
          state.dino.vy = 0;
          state.dino.isJumping = false;
        }

        // Ground scroll
        state.groundX = (state.groundX + state.speed) % canvas.width;

        // Clouds update
        state.clouds.forEach(c => {
          c.x -= c.speed * (state.speed / 6);
          if (c.x + c.width < 0) c.x = canvas.width + 50;
        });

        // Obstacles spawn
        state.nextObstacleDist -= state.speed;
        if (state.nextObstacleDist <= 0) {
          const typeRand = Math.random();
          let type = 'smallCactus';
          let width = 24;
          let height = 40;
          let y = 228;

          if (typeRand > 0.75) {
            type = 'pterodactyl';
            width = 40;
            height = 30;
            y = 150 + (Math.random() > 0.5 ? 0 : 40);
          } else if (typeRand > 0.4) {
            type = 'largeCactus';
            width = 36;
            height = 54;
            y = 214;
          } else if (typeRand > 0.3 && Math.random() > 0.5) {
            type = 'powerUp';
            width = 28;
            height = 28;
            y = 170;
          }

          state.obstacles.push({
            id: Math.random(),
            x: canvas.width + 50,
            y,
            width,
            height,
            type,
            passed: false
          });

          state.nextObstacleDist = 220 + Math.random() * 250 - (state.speed * 4);
        }

        // Obstacles update & collision
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
          const obs = state.obstacles[i];
          obs.x -= state.speed;

          // Check if passed
          if (!obs.passed && obs.x + obs.width < state.dino.x) {
            obs.passed = true;
            if (obs.type !== 'powerUp') {
              state.obstaclesDodged++;
              setObstaclesDodged(state.obstaclesDodged);
              if (state.obstaclesDodged % 10 === 0) playSound('score');
            }
          }

          // Collision detection
          const actualH = state.dino.isDucking ? state.dino.height / 2 : state.dino.height;
          const actualY = state.dino.isDucking ? state.dino.y + state.dino.height / 2 : state.dino.y;

          if (
            state.dino.x < obs.x + obs.width &&
            state.dino.x + state.dino.width > obs.x &&
            actualY < obs.y + obs.height &&
            actualY + actualH > obs.y
          ) {
            if (obs.type === 'powerUp') {
              state.shieldActive = true;
              state.shieldTimer = 6;
              playSound('powerup');
              state.obstacles.splice(i, 1);
              continue;
            }

            if (state.shieldActive) {
              state.shieldActive = false;
              state.obstacles.splice(i, 1);
              playSound('powerup');
              continue;
            }

            // Game over
            setGameState('gameover');
            onGameOver(Math.floor(state.score), state.obstaclesDodged);
            playSound('gameover');
            if (Math.floor(state.score) > highScore) {
              setHighScore(Math.floor(state.score));
              localStorage.setItem('dino_highscore', String(Math.floor(state.score)));
            }
          }

          // Remove offscreen
          if (obs.x + obs.width < -50) {
            state.obstacles.splice(i, 1);
          }
        }

        // AI Co-Pilot Tip simulation
        if (gameMode === 'aiCopilot' && Math.floor(state.score) % 150 === 0 && Math.floor(state.score) > 0) {
          setAiTip(`🤖 AI Co-Pilot Tip: Next obstacle cluster approaching at speed ${state.speed.toFixed(1)}. Prepare to duck or jump early!`);
        }
      }

      // --- RENDERING ---

      // 1. Draw Clouds
      ctx.fillStyle = isCyber ? '#1e293b' : isVolcano ? '#44403c' : isArcade ? '#27272a' : '#e2e8f0';
      state.clouds.forEach(c => {
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, c.width, 20, 10);
        ctx.fill();
      });

      // 2. Draw Ground Line
      ctx.strokeStyle = groundColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 268);
      ctx.lineTo(canvas.width, 268);
      ctx.stroke();

      // Ground dashes
      ctx.fillStyle = groundColor;
      for (let i = 0; i < canvas.width + 40; i += 40) {
        const dx = (i - (state.groundX % 40));
        ctx.fillRect(dx, 274, 15, 3);
      }

      // 3. Draw Obstacles
      state.obstacles.forEach(obs => {
        ctx.fillStyle = obs.type === 'powerUp' ? '#10b981' : obsColor;
        if (obs.type === 'pterodactyl') {
          // Draw Pterodactyl wings flapping
          const wingUp = Math.floor(currentTime / 150) % 2 === 0;
          ctx.fillRect(obs.x, obs.y + (wingUp ? 0 : 10), obs.width, 14);
          ctx.fillRect(obs.x + 10, obs.y + 10, 20, 16);
        } else if (obs.type === 'powerUp') {
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px sans-serif';
          ctx.fillText('🛡️', obs.x + 4, obs.y + 18);
        } else {
          // Cactus
          ctx.fillRect(obs.x + 8, obs.y, obs.width - 16, obs.height);
          ctx.fillRect(obs.x, obs.y + 10, obs.width, 12);
        }
      });

      // 4. Draw T-Rex Dino
      const dinoH = state.dino.isDucking ? state.dino.height / 2 : state.dino.height;
      const dinoYPos = state.dino.isDucking ? state.dino.y + state.dino.height / 2 : state.dino.y;

      ctx.fillStyle = dinoColor;
      // Body
      ctx.fillRect(state.dino.x + 10, dinoYPos + 12, 26, dinoH - 16);
      // Head
      ctx.fillRect(state.dino.x + 24, dinoYPos, 20, 20);
      // Eye
      ctx.fillStyle = bgColor;
      ctx.fillRect(state.dino.x + 36, dinoYPos + 4, 4, 4);
      ctx.fillStyle = dinoColor;
      // Legs (animated when running)
      const legFrame = Math.floor(currentTime / 100) % 2;
      if (state.dino.isJumping) {
        ctx.fillRect(state.dino.x + 12, dinoYPos + dinoH - 6, 6, 10);
        ctx.fillRect(state.dino.x + 26, dinoYPos + dinoH - 6, 6, 10);
      } else if (legFrame === 0) {
        ctx.fillRect(state.dino.x + 12, dinoYPos + dinoH, 6, 12);
        ctx.fillRect(state.dino.x + 24, dinoYPos + dinoH - 4, 6, 8);
      } else {
        ctx.fillRect(state.dino.x + 12, dinoYPos + dinoH - 4, 6, 8);
        ctx.fillRect(state.dino.x + 24, dinoYPos + dinoH, 6, 12);
      }

      // Shield Aura
      if (state.shieldActive) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.dino.x + 22, dinoYPos + dinoH / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(updateAndRender);
    };

    animationId = requestAnimationFrame(updateAndRender);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, theme, gameMode, soundEnabled]);

  const startGame = () => {
    const state = gameRef.current;
    state.dino = { x: 60, y: 220, width: 44, height: 48, vy: 0, isJumping: false, isDucking: false };
    state.obstacles = [];
    state.score = 0;
    state.speed = 6;
    state.obstaclesDodged = 0;
    state.nextObstacleDist = 200;
    state.shieldActive = false;
    state.timeRemaining = gameMode === 'timeAttack' ? 60 : 0;
    setScore(0);
    setObstaclesDodged(0);
    setGameState('playing');
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
      {/* HUD overlay inside canvas container */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-3 bg-slate-950/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-white">
          <span className="text-xs uppercase tracking-wider text-slate-400">Mode:</span>
          <span className="font-bold text-emerald-400 capitalize">{gameMode}</span>
          {gameMode === 'timeAttack' && (
            <span className="font-mono font-bold text-amber-400 ml-2">
              ⏱️ {Math.ceil(gameRef.current.timeRemaining)}s
            </span>
          )}
        </div>

        {gameRef.current.shieldActive && (
          <div className="flex items-center gap-2 bg-sky-500/20 border border-sky-500/40 px-3 py-1.5 rounded-xl text-sky-300 text-xs font-bold animate-pulse">
            <Shield className="w-4 h-4" />
            <span>Shield Active</span>
          </div>
        )}
      </div>

      {/* AI Co-Pilot Tip Banner */}
      {gameMode === 'aiCopilot' && aiTip && gameState === 'playing' && (
        <div className="absolute top-16 left-4 right-4 bg-purple-950/80 border border-purple-500/50 backdrop-blur-md p-3 rounded-xl text-purple-200 text-xs flex items-center gap-3 z-20 animate-fadeIn">
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0 animate-spin" />
          <span className="flex-1">{aiTip}</span>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={850}
        height={320}
        className="w-full h-auto block cursor-pointer"
        onClick={() => {
          if (gameState === 'start' || gameState === 'gameover') startGame();
        }}
      />

      {/* Start / Pause / Game Over overlays */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-30">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20 animate-bounce">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Chrome T-Rex Runner</h2>
          <p className="text-slate-300 text-sm max-w-md mb-6">
            Press <kbd className="px-2 py-1 bg-slate-800 rounded text-xs text-emerald-400 font-mono">Space</kbd> or <kbd className="px-2 py-1 bg-slate-800 rounded text-xs text-emerald-400 font-mono">Up Arrow</kbd> to jump. Press <kbd className="px-2 py-1 bg-slate-800 rounded text-xs text-emerald-400 font-mono">Down Arrow</kbd> to duck.
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95"
          >
            Start Game
          </button>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-30">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-amber-400">
            <Pause className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Game Paused</h2>
          <button
            onClick={() => setGameState('playing')}
            className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg transition-all"
          >
            Resume Game
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-30 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400">
            <RotateCcw className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-white mb-1">Game Over</h2>
          <p className="text-slate-400 text-sm mb-4">You dodged <span className="text-amber-400 font-bold">{obstaclesDodged}</span> obstacles!</p>
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 w-full max-w-xs flex justify-around">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Final Score</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">{score}</span>
            </div>
            <div className="w-px bg-slate-800"></div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">High Score</span>
              <span className="text-2xl font-mono font-bold text-amber-400">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Again</span>
          </button>
        </div>
      )}
    </div>
  );
};
