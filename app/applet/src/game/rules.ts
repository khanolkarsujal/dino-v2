export interface DinoState {
  y: number;
  vy: number;
  isJumping: boolean;
  isDucking: boolean;
  isAlive: boolean;
  score: number;
  highScore: number;
  speed: number;
  obstaclesDodged: number;
  powerUp: 'none' | 'shield' | 'magnet' | 'doubleScore';
  powerUpTimeLeft: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'smallCactus' | 'largeCactus' | 'pterodactyl' | 'meteor' | 'powerUp';
  subtype?: 'shield' | 'magnet' | 'doubleScore';
  passed: boolean;
}

export function calculateScoreIncrement(currentSpeed: number, delta: number): number {
  return Math.floor(currentSpeed * delta * 0.1);
}

export function checkCollision(
  dino: { x: number; y: number; width: number; height: number; isDucking: boolean },
  obstacle: { x: number; y: number; width: number; height: number }
): boolean {
  const dinoH = dino.isDucking ? dino.height / 2 : dino.height;
  const dinoY = dino.isDucking ? dino.y + dino.height / 2 : dino.y;

  // AABB collision detection with small padding for forgiving gameplay
  const padding = 6;
  return (
    dino.x + padding < obstacle.x + obstacle.width - padding &&
    dino.x + dino.width - padding > obstacle.x + padding &&
    dinoY + padding < obstacle.y + obstacle.height - padding &&
    dinoY + dinoH - padding > obstacle.y + padding
  );
}

export function calculateSpeed(score: number, baseSpeed: number = 6): number {
  return Math.min(18, baseSpeed + Math.floor(score / 200) * 0.8);
}

export function getDifficultyMultiplier(mode: string): number {
  switch (mode) {
    case 'hardcore': return 1.5;
    case 'timeAttack': return 1.2;
    case 'aiCopilot': return 1.0;
    default: return 1.0;
  }
}
