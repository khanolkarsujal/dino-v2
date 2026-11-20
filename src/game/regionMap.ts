import { type DragonElement, type EggTier, type EnemyKind, WORLD_RADIUS } from './data';

export type BiomeId = 'sanctuary' | 'woods' | 'frost' | 'bastion' | 'obsidian';

export interface RoadPath {
  id: string;
  name: string;
  biome: BiomeId;
  color: string;
  points: ReadonlyArray<readonly [number, number]>;
}

export interface CaveBlueprint {
  index: number;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  maxHp: number;
  wardenHpMult: number;
  guardComposition: readonly EnemyKind[];
}

export interface RuinBlueprint {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  relicId: string;
  protectorsGranted: number;
  guardComposition: readonly EnemyKind[];
  storyQuote: string;
}

export interface JailBlueprint {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  element: DragonElement;
  tier: EggTier;
  level: number;
  guardComposition: readonly EnemyKind[];
  rescueLore: string;
}

export interface EggCacheBlueprint {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  element: DragonElement;
  tier: EggTier;
  guardComposition: readonly EnemyKind[];
}

export const BIOME_META: Record<
  BiomeId,
  { name: string; groundHex: string; accentHex: string; description: string }
> = {
  sanctuary: {
    name: 'Sunfire Sanctuary',
    groundHex: '#35502f',
    accentHex: '#ffaa44',
    description: 'Central hearth valley where your campfire and defenses stand.',
  },
  woods: {
    name: 'Whispering Woods',
    groundHex: '#284527',
    accentHex: '#73cc58',
    description: 'Eastern timberlands holding the first trapped Bastion Drake and Ashwood Den.',
  },
  frost: {
    name: 'Frostquarry Ridge',
    groundHex: '#2f4552',
    accentHex: '#63d0ff',
    description: 'Southwestern slate canyons rich in stone and Ice Wyvern eggs.',
  },
  bastion: {
    name: 'Shattered Bastion',
    groundHex: '#3a3c42',
    accentHex: '#ffd24a',
    description: 'Northwestern ancient keep ruins and Stormspire Prison.',
  },
  obsidian: {
    name: 'Obsidian Rift',
    groundHex: '#2a222b',
    accentHex: '#b95cff',
    description: 'Northern volcanic crags guarding the final Abyssal Maw.',
  },
};

export const REGION_ROADS: ReadonlyArray<RoadPath> = [
  {
    id: 'east_woods_road',
    name: 'King’s Timber Road',
    biome: 'woods',
    color: '#6b533b',
    points: [
      [6, 2],
      [25, 8],
      [55, 12],
      [90, 24],
      [130, 40],
      [170, 58],
      [210, 75],
    ],
  },
  {
    id: 'sw_frost_road',
    name: 'Quarryman’s Trail',
    biome: 'frost',
    color: '#5a5f66',
    points: [
      [-6, 6],
      [-30, 25],
      [-70, 50],
      [-120, 85],
      [-170, 120],
      [-220, 160],
      [-260, 190],
    ],
  },
  {
    id: 'nw_bastion_road',
    name: 'Old Banner Causeway',
    biome: 'bastion',
    color: '#66635e',
    points: [
      [-6, -6],
      [-35, -30],
      [-80, -60],
      [-130, -100],
      [-180, -140],
      [-230, -180],
      [-275, -215],
    ],
  },
  {
    id: 'north_rift_road',
    name: 'Ashfall Ascent',
    biome: 'obsidian',
    color: '#4f434a',
    points: [
      [4, -8],
      [20, -45],
      [50, -100],
      [90, -160],
      [135, -220],
      [180, -270],
      [220, -310],
    ],
  },
];

export const CAVE_BLUEPRINTS: ReadonlyArray<CaveBlueprint> = [
  {
    index: 1,
    name: 'Ashwood Den',
    biome: 'woods',
    x: 210,
    z: 75,
    maxHp: 680,
    wardenHpMult: 0.9,
    guardComposition: ['raider', 'raider', 'runner', 'brute'],
  },
  {
    index: 2,
    name: 'Rimefang Hollow',
    biome: 'frost',
    x: -260,
    z: 190,
    maxHp: 980,
    wardenHpMult: 1.1,
    guardComposition: ['raider', 'brute', 'spitter', 'spitter', 'runner'],
  },
  {
    index: 3,
    name: 'Stormcrag Vault',
    biome: 'bastion',
    x: -275,
    z: -215,
    maxHp: 1380,
    wardenHpMult: 1.3,
    guardComposition: ['brute', 'brute', 'commander', 'spitter', 'siege'],
  },
  {
    index: 4,
    name: 'Abyssal Maw',
    biome: 'obsidian',
    x: 220,
    z: -310,
    maxHp: 1850,
    wardenHpMult: 1.5,
    guardComposition: ['commander', 'siege', 'brute', 'spitter', 'runner', 'runner'],
  },
];

export const RUIN_BLUEPRINTS: ReadonlyArray<RuinBlueprint> = [
  {
    id: 'ruin_sentinel',
    name: 'Old Sentinel Watchpost',
    biome: 'woods',
    x: 90,
    z: -25,
    relicId: 'sentinel_aegis',
    protectorsGranted: 1,
    guardComposition: ['raider', 'raider', 'brute'],
    storyQuote: 'A fallen watchtower on the far eastern frontier—one sworn knight still awaits the call.',
  },
  {
    id: 'ruin_waystone',
    name: 'Frozen Waystone',
    biome: 'frost',
    x: -140,
    z: 60,
    relicId: 'glacial_waystone',
    protectorsGranted: 0,
    guardComposition: ['brute', 'spitter', 'spitter', 'raider'],
    storyQuote: 'Ancient slate runes hum with deep winter fire far across the frozen waste.',
  },
  {
    id: 'ruin_bannermen',
    name: 'Hall of Bannermen',
    biome: 'bastion',
    x: -160,
    z: -110,
    relicId: 'bannerman_horn',
    protectorsGranted: 2,
    guardComposition: ['commander', 'brute', 'brute', 'runner', 'runner'],
    storyQuote: 'Shattered shields line the distant courtyard. Sound the horn to rally veteran knights.',
  },
  {
    id: 'ruin_altar',
    name: 'Sunfire Altar',
    biome: 'obsidian',
    x: 115,
    z: -200,
    relicId: 'sunfire_crown',
    protectorsGranted: 1,
    guardComposition: ['siege', 'commander', 'spitter', 'runner', 'runner'],
    storyQuote: 'At the foot of the Obsidian Rift stands the First Crown altar, untouched by ash.',
  },
];

export const JAIL_BLUEPRINTS: ReadonlyArray<JailBlueprint> = [
  {
    id: 'jail_east_green',
    name: 'Sunken Iron Cage',
    biome: 'woods',
    x: 130,
    z: 40,
    element: 'earth',
    tier: 1,
    level: 2,
    guardComposition: ['raider', 'raider', 'raider', 'runner'],
    rescueLore: 'Common Green Bastion Drake rescued! Its heavy scales anchor the frontline against Cave Wardens.',
  },
  {
    id: 'jail_nw_yellow',
    name: 'Stormspire Jail',
    biome: 'bastion',
    x: -150,
    z: -85,
    element: 'electric',
    tier: 1,
    level: 2,
    guardComposition: ['brute', 'raider', 'spitter', 'spitter'],
    rescueLore: 'Rare Yellow Storm Drake breaks free! Its chain lightning arcs through advancing packs.',
  },
  {
    id: 'jail_sw_blue',
    name: 'Rimebound Cage',
    biome: 'frost',
    x: -200,
    z: 145,
    element: 'ice',
    tier: 2,
    level: 3,
    guardComposition: ['commander', 'brute', 'brute', 'spitter'],
    rescueLore: 'Super Rare Blue Frost Wyvern rises from the frozen cage, ready to freeze cave swarms.',
  },
];

export const EGG_CACHE_BLUEPRINTS: ReadonlyArray<EggCacheBlueprint> = [
  {
    id: 'cache_woods',
    name: 'Mosswood Clutch',
    biome: 'woods',
    x: 160,
    z: -30,
    element: 'earth',
    tier: 1,
    guardComposition: ['raider', 'spitter', 'brute'],
  },
  {
    id: 'cache_bastion',
    name: 'Thunderstone Clutch',
    biome: 'frost',
    x: -100,
    z: 95,
    element: 'electric',
    tier: 1,
    guardComposition: ['brute', 'raider', 'spitter'],
  },
  {
    id: 'cache_frost',
    name: 'Glacier Sanctum Nest',
    biome: 'frost',
    x: -180,
    z: 175,
    element: 'ice',
    tier: 2,
    guardComposition: ['commander', 'brute', 'brute', 'spitter'],
  },
  {
    id: 'cache_obsidian',
    name: 'Obsidian Ember Vault',
    biome: 'obsidian',
    x: 190,
    z: -245,
    element: 'fire',
    tier: 3,
    guardComposition: ['siege', 'commander', 'brute', 'runner'],
  },
];

export function getBiomeAt(x: number, z: number): BiomeId {
  const dist = Math.hypot(x, z);
  if (dist <= 35) return 'sanctuary';
  if (x >= 30 && z >= -50) return 'woods';
  if (x <= -25 && z >= -15) return 'frost';
  if (x <= -20 && z < -15) return 'bastion';
  return 'obsidian';
}

function pointToSegmentDist(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  if (lenSq <= 1e-6) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
  const cx = ax + abx * t;
  const cz = az + abz * t;
  return Math.hypot(px - cx, pz - cz);
}

export function distanceToNearestRoad(x: number, z: number): number {
  let best = Infinity;
  for (const road of REGION_ROADS) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const [ax, az] = road.points[i];
      const [bx, bz] = road.points[i + 1];
      const d = pointToSegmentDist(x, z, ax, az, bx, bz);
      if (d < best) best = d;
    }
  }
  return best;
}

export function isOnRoad(x: number, z: number): boolean {
  return distanceToNearestRoad(x, z) <= 3.6;
}

// =========================================================================
// Fog of War (32x32 deterministic exploration grid over [-WORLD_RADIUS, +WORLD_RADIUS])
// =========================================================================

export const FOG_GRID_SIZE = 32;

export function createFogGrid(): number[] {
  const grid = new Array<number>(FOG_GRID_SIZE * FOG_GRID_SIZE).fill(0);
  // Reveal initial central Sanctuary around Campfire
  revealFogAt(grid, 0, 0, 26);
  return grid;
}

export function worldToFogCell(x: number, z: number): { gx: number; gz: number } {
  const span = WORLD_RADIUS * 2;
  const u = Math.max(0, Math.min(0.9999, (x + WORLD_RADIUS) / span));
  const v = Math.max(0, Math.min(0.9999, (z + WORLD_RADIUS) / span));
  return {
    gx: Math.floor(u * FOG_GRID_SIZE),
    gz: Math.floor(v * FOG_GRID_SIZE),
  };
}

export function revealFogAt(grid: number[], x: number, z: number, radius: number): void {
  const cellSize = (WORLD_RADIUS * 2) / FOG_GRID_SIZE;
  const cellRad = Math.ceil(radius / cellSize) + 1;
  const center = worldToFogCell(x, z);
  const rSq = radius * radius;
  for (let dz = -cellRad; dz <= cellRad; dz++) {
    const gz = center.gz + dz;
    if (gz < 0 || gz >= FOG_GRID_SIZE) continue;
    for (let dx = -cellRad; dx <= cellRad; dx++) {
      const gx = center.gx + dx;
      if (gx < 0 || gx >= FOG_GRID_SIZE) continue;
      const wx = ((gx + 0.5) / FOG_GRID_SIZE) * WORLD_RADIUS * 2 - WORLD_RADIUS;
      const wz = ((gz + 0.5) / FOG_GRID_SIZE) * WORLD_RADIUS * 2 - WORLD_RADIUS;
      if ((wx - x) * (wx - x) + (wz - z) * (wz - z) <= rSq) {
        grid[gz * FOG_GRID_SIZE + gx] = 1;
      }
    }
  }
}

export function isFogExplored(grid: ReadonlyArray<number>, x: number, z: number): boolean {
  const { gx, gz } = worldToFogCell(x, z);
  return (grid[gz * FOG_GRID_SIZE + gx] ?? 0) > 0;
}

export function getExplorationPercent(grid: ReadonlyArray<number>): number {
  let playableCells = 0;
  let exploredCells = 0;
  const maxR2 = (WORLD_RADIUS - 4) * (WORLD_RADIUS - 4);
  for (let gz = 0; gz < FOG_GRID_SIZE; gz++) {
    for (let gx = 0; gx < FOG_GRID_SIZE; gx++) {
      const wx = ((gx + 0.5) / FOG_GRID_SIZE) * WORLD_RADIUS * 2 - WORLD_RADIUS;
      const wz = ((gz + 0.5) / FOG_GRID_SIZE) * WORLD_RADIUS * 2 - WORLD_RADIUS;
      if (wx * wx + wz * wz <= maxR2) {
        playableCells++;
        if (grid[gz * FOG_GRID_SIZE + gx] > 0) exploredCells++;
      }
    }
  }
  if (playableCells === 0) return 100;
  return Math.round((exploredCells / playableCells) * 100);
}

// =========================================================================
// Sequential Cave Conquest & Heavy Garrison Siege Helpers
// =========================================================================

export interface CaveOrderLike {
  index: number;
  alive: boolean;
}

export function getActiveTargetCave<T extends CaveOrderLike>(caves: ReadonlyArray<T>): T | null {
  let best: T | null = null;
  for (const cave of caves) {
    if (!cave.alive) continue;
    if (!best || cave.index < best.index) best = cave;
  }
  return best;
}

export function isCaveWarded(
  cave: CaveOrderLike,
  caves: ReadonlyArray<CaveOrderLike>,
): boolean {
  if (!cave.alive) return false;
  const active = getActiveTargetCave(caves);
  return active !== null && active.index !== cave.index;
}

/**
 * Attacking an active Cave triggers massive multi-stage garrisons + boss-level Cave Wardens!
 * Stage 0: First breach (upon first damage <= 98% HP)
 * Stage 1: Reinforcements (<= 65% HP)
 * Stage 2: Last Stand + Second Warden (or Nightmare Lord on Cave 4!) (<= 30% HP)
 */
export function getCaveGarrisonWave(caveIndex: number, stage: number): EnemyKind[] {
  if (caveIndex === 1) {
    if (stage === 0) {
      return ['warden', 'raider', 'raider', 'raider', 'runner', 'runner', 'brute', 'spitter'];
    }
    if (stage === 1) {
      return ['raider', 'raider', 'raider', 'runner', 'runner', 'brute', 'spitter', 'spitter'];
    }
    return ['warden', 'brute', 'raider', 'raider', 'runner', 'runner', 'spitter', 'commander'];
  }
  if (caveIndex === 2) {
    if (stage === 0) {
      return ['warden', 'brute', 'brute', 'raider', 'raider', 'runner', 'spitter', 'spitter', 'runner'];
    }
    if (stage === 1) {
      return ['brute', 'spitter', 'spitter', 'runner', 'runner', 'runner', 'raider', 'commander'];
    }
    return ['warden', 'siege', 'brute', 'spitter', 'spitter', 'runner', 'runner', 'raider'];
  }
  if (caveIndex === 3) {
    if (stage === 0) {
      return ['warden', 'siege', 'brute', 'brute', 'commander', 'spitter', 'spitter', 'runner', 'runner', 'raider'];
    }
    if (stage === 1) {
      return ['commander', 'brute', 'brute', 'spitter', 'spitter', 'runner', 'runner', 'raider', 'raider'];
    }
    return ['warden', 'siege', 'commander', 'brute', 'spitter', 'spitter', 'runner', 'runner', 'raider'];
  }
  // Cave 4: Abyssal Maw — Final Citadel Siege!
  if (stage === 0) {
    return ['warden', 'siege', 'commander', 'brute', 'brute', 'spitter', 'spitter', 'runner', 'runner', 'raider'];
  }
  if (stage === 1) {
    return ['warden', 'siege', 'commander', 'brute', 'spitter', 'spitter', 'runner', 'runner', 'raider', 'raider'];
  }
  return ['boss', 'warden', 'commander', 'siege', 'brute', 'spitter', 'spitter', 'runner', 'runner'];
}

export function getCardinalDirectionLabel(dx: number, dz: number): string {
  const dist = Math.hypot(dx, dz);
  if (dist < 1) return 'HERE';
  const angle = Math.atan2(dz, dx); // 0 = +X (East), PI/2 = +Z (South)
  const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const idx = ((Math.round((angle / (Math.PI * 2)) * 8) % 8) + 8) % 8;
  return dirs[idx];
}
