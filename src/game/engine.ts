import {
  buildingCost,
  canAfford,
  computeDragonDpsEstimate,
  computeEggTierFromDistance,
  getDragonLevelStatMult,
  getSynergisticUpgrades,
  pickWildEggElementByProgress,
  selectWaveComposition,
  spendResources,
} from './balance';
import {
  BUILDING_DEFS,
  type BuildingKind,
  CAMP_RADIUS,
  DRAGON_ARCHETYPES,
  type DragonCommand,
  type DragonElement,
  type DragonTrait,
  EGG_TIER_INFO,
  type EggTier,
  ENEMY_ARCHETYPES,
  type EnemyKind,
  FINAL_WAVE,
  getCaveRequiredLevel,
  NIGHT_EVERY,
  PERIMETER_WALL_RADIUS,
  RELIC_DEFS,
  RELIC_FORGE_UPGRADES,
  type RelicForgeDef,
  type ResourceBundle,
  type UpgradeCardDef,
  WALL_TIER_DEFS,
  type WallSide,
  type WallTier,
  WORLD_RADIUS,
} from './data';
import { DRAGON_ABILITY_CONFIG, type DragonRarity, isHugeEnemy } from './dragonConfig';
import {
  CAVE_BLUEPRINTS,
  createFogGrid,
  EGG_CACHE_BLUEPRINTS,
  getActiveTargetCave,
  getCardinalDirectionLabel,
  getCaveGarrisonWave,
  getExplorationPercent,
  isCaveWarded,
  JAIL_BLUEPRINTS,
  revealFogAt,
  RUIN_BLUEPRINTS,
} from './regionMap';
import { createRng, type SeededRng } from './rng';
import {
  applyBurningStatus,
  applyFrozenStatus,
  applyStunnedStatus,
  createInitialStatusState,
  type EnemyStatusState,
  getIncomingStatusDamageMultiplier,
  isEnemyIncapacitated,
  tickEnemyStatuses,
} from './statusEffects';
import {
  ABANDONED_SETTLEMENTS,
  ANCIENT_SHRINES,
  createInitialSettlements,
  createInitialShrines,
  createInitialTreasures,
  createInitialWildlife,
  RESOURCE_GROVES,
  type SettlementState,
  type ShrineState,
  type TreasureState,
  type WildlifeState,
} from './exploration';
import {
  applyDailyFoodUpkeep,
  computeDailyFoodUpkeep,
  computeEnemyGoldDrop,
  computeKingdomStage,
  getMoraleWorkSpeedMult,
  grantResources,
  INITIAL_RESOURCES,
  type KingdomStageInfo,
  MARKET_TRADES,
  type MarketTradeAction,
  type SettlementMorale,
} from './economy';
import {
  canRecruitSurvivor,
  createWorkerFromSurvivor,
  getWorkerMoveSpeed,
  pickSuggestedWorkerRole,
  pickSurvivorName,
  type SurvivorUnit,
  type WorkerUnit,
} from './workers';
import {
  getClaimedOutposts,
  getSafeAnchorForPosition,
  isPointInControlledTerritory,
  OUTPOST_CLAIM_COST,
} from './territory';
import type { DragonAnimAttackKind, DragonAnimAttackPhase } from '../three/dragonBillboard';

export type GamePhase =
  | 'title'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'choosing'
  | 'victory'
  | 'gameover';

export type ResourceNodeKind = 'wood' | 'stone' | 'ember' | 'food';

export interface PerimeterWallSegment {
  side: WallSide;
  x: number;
  z: number;
  width: number;
  depth: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  buildProgress: number;
}

export interface DragonUnit {
  id: number;
  element: DragonElement;
  rarity: DragonRarity;
  trait: DragonTrait;
  tier: EggTier;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackSpeed: number;
  moveSpeed: number;
  attackRange: number;
  critChance: number;
  abilityStrength: number;
  abilityCooldown: number;
  abilityCooldownTimer: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  sizeScale: number;
  downTimer: number;
  hitFlash: number;
  attackAnim: number;
  attackCooldown: number;
  attackPhase: DragonAnimAttackPhase;
  attackKind: DragonAnimAttackKind;
  attackTimer: number;
  streamTickAccum: number;
  comboStep: number;
  targetId: number | null;
}

export interface EnemyUnit {
  id: number;
  kind: EnemyKind;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  hp: number;
  maxHp: number;
  slowTimer: number;
  statuses: EnemyStatusState;
  buffed: boolean;
  windupTimer: number;
  cooldownTimer: number;
  hasAttackToken: boolean;
  hitFlash: number;
  koTimer: number;
  targetId: number | null;
  flankSign: number;
  guardLandmarkId?: string;
  targetOutpostId?: string;
}

export interface BuildingUnit {
  id: number;
  kind: BuildingKind;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  buildTimer: number;
  cooldownTimer: number;
  hitFlash: number;
}

export interface ProtectorUnit {
  id: number;
  name: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  hp: number;
  maxHp: number;
  downTimer: number;
  attackAnim: number;
  attackCooldown: number;
  hitFlash: number;
}

export interface CaveState {
  id: number;
  index: number;
  name: string;
  biome: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  garrisonStage: number;
  hitFlash: number;
  requiredLevel: number;
}

export interface RuinState {
  id: number;
  blueprintId: string;
  name: string;
  biome: string;
  x: number;
  z: number;
  relicId: string;
  protectorsGranted: number;
  claimed: boolean;
  storyQuote: string;
}

export interface JailState {
  id: number;
  blueprintId: string;
  name: string;
  biome: string;
  x: number;
  z: number;
  element: DragonElement;
  tier: EggTier;
  level: number;
  opened: boolean;
  rescueLore: string;
}

export interface WildEgg {
  id: number;
  x: number;
  z: number;
  element: DragonElement;
  tier: EggTier;
  cacheId?: string;
}

export interface IncubatingEgg {
  id: number;
  x: number;
  z: number;
  element: DragonElement;
  tier: EggTier;
  timer: number;
  maxTimer: number;
}

export interface ResourceNode {
  id: number;
  kind: ResourceNodeKind;
  x: number;
  z: number;
  amount: number;
  maxAmount: number;
  regenTimer: number;
}

export interface Projectile {
  id: number;
  fromPlayerSide: boolean;
  element: DragonElement | 'watchtower' | 'blight';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  damage: number;
  radius: number;
  life: number;
  sourceDragonId: number | null;
  targetEnemyId: number | null;
  isAbilityCast?: boolean;
  isCrit?: boolean;
}

export interface ChronicleEntry {
  id: number;
  title: string;
  text: string;
  color: string;
}

export interface ContextHint {
  kind:
    | 'none'
    | 'egg'
    | 'incubate'
    | 'harvest'
    | 'repair'
    | 'wall_upgrade'
    | 'jail'
    | 'ruin'
    | 'settlement'
    | 'claim_outpost'
    | 'survivor'
    | 'shrine'
    | 'treasure';
  label: string;
}

export interface GameStats {
  elapsedSec: number;
  kills: number;
  cavesDestroyed: number;
  dragonsHatched: number;
  buildingsBuilt: number;
}

export type GameEvent =
  | { type: 'slash'; x: number; z: number; angle: number; combo: number }
  | { type: 'dash'; x: number; z: number }
  | { type: 'hit'; x: number; z: number; heavy: boolean; color: string }
  | { type: 'damage_num'; x: number; z: number; amount: number; label?: string; color: string; crit?: boolean }
  | {
      type: 'dragon_vfx';
      kind: 'flame_stream' | 'frost_cast' | 'freeze_shatter' | 'melee_swipe' | 'melee_whip' | 'melee_bite' | 'lightning_arc';
      dragonId?: number;
      x: number;
      z: number;
      dirX: number;
      dirZ: number;
      scale?: number;
      radius?: number;
      points?: Array<{ x: number; z: number }>;
    }
  | { type: 'kill'; x: number; z: number }
  | { type: 'ring'; x: number; z: number; radius: number; color: string }
  | { type: 'bolt'; x1: number; z1: number; x2: number; z2: number; color: string }
  | { type: 'harvest'; x: number; z: number; kind: ResourceNodeKind }
  | { type: 'pickup'; x: number; z: number; color: string }
  | { type: 'hatch'; x: number; z: number; element: DragonElement; tier: EggTier }
  | { type: 'build'; x: number; z: number }
  | { type: 'repair'; x: number; z: number }
  | { type: 'cave_down'; x: number; z: number; index: number }
  | { type: 'cave_alarm'; x: number; z: number; index: number }
  | { type: 'rescue_jail'; x: number; z: number; element: DragonElement }
  | { type: 'claim_ruin'; x: number; z: number; relicId: string }
  | { type: 'discovery_toast'; title: string; subtitle: string; color: string }
  | { type: 'wave_start'; wave: number; isNight: boolean }
  | { type: 'player_hurt'; x: number; z: number }
  | { type: 'banner'; title: string; subtitle: string; color: string }
  | { type: 'victory' }
  | { type: 'gameover' };

export interface GameInput {
  moveX: number;
  moveZ: number;
  attackJustPressed: boolean;
  dashJustPressed: boolean;
  interactJustPressed: boolean;
  commandJustPressed: DragonCommand | null;
  aimWorldX?: number;
  aimWorldZ?: number;
}

export interface PlayerState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  hp: number;
  maxHp: number;
  moveSpeed: number;
  damage: number;
  slashRange: number;
  respawnTimer: number;
  dashCooldown: number;
  dashTimer: number;
  dashDirX: number;
  dashDirZ: number;
  attackCooldown: number;
  attackPhase: 'idle' | 'windup' | 'active' | 'recovery';
  attackTimer: number;
  comboStep: number;
  moveDistance: number;
  carryingEgg: { element: DragonElement; tier: EggTier } | null;
}

export interface PlayerModifiers {
  playerDmgMult: number;
  playerMoveMult: number;
  dashCooldownMult: number;
  slashRangeBonus: number;
  dragonDmgMult: number;
  dragonRateMult: number;
  dragonReviveMult: number;
  harvestMult: number;
  towerRateMult: number;
  towerRangeBonus: number;
  hearthHealRate: number;
}

export interface GameState {
  phase: GamePhase;
  seed: number;
  nextEntityId: number;
  wave: number;
  isNight: boolean;
  dayCycleProgress: number;
  waveActive: boolean;
  prepTimer: number;
  gameSpeed: number;
  campfireHp: number;
  campfireMaxHp: number;
  wallTier: WallTier;
  perimeterWalls: PerimeterWallSegment[];
  resources: ResourceBundle;
  ancientRelics: number;
  morale: SettlementMorale;
  selectedBuild: BuildingKind | null;
  squadCommand: DragonCommand;
  defendAnchor: { x: number; z: number };
  player: PlayerState;
  modifiers: PlayerModifiers;
  dragons: DragonUnit[];
  enemies: EnemyUnit[];
  buildings: BuildingUnit[];
  protectors: ProtectorUnit[];
  survivors: SurvivorUnit[];
  workers: WorkerUnit[];
  selectedEntity: { kind: 'worker'; id: number } | { kind: 'building'; id: number } | null;
  unlockedRelicForges: string[];
  recruitmentSpawnTimer: number;
  caves: CaveState[];
  ruins: RuinState[];
  jails: JailState[];
  settlements: SettlementState[];
  shrines: ShrineState[];
  treasures: TreasureState[];
  wildlife: WildlifeState[];
  discoveredSites: string[];
  wildEggs: WildEgg[];
  incubatingEggs: IncubatingEgg[];
  resourceNodes: ResourceNode[];
  projectiles: Projectile[];
  waveQueue: EnemyKind[];
  waveSpawnTimer: number;
  incomeTimer: number;
  trainingXpTimer: number;
  fogGrid: number[];
  spawnedLandmarks: string[];
  discoveredRelics: string[];
  chronicleLog: ChronicleEntry[];
  upgradeChoices: UpgradeCardDef[];
  contextHint: ContextHint;
  stats: GameStats;
  events: GameEvent[];
  trauma: number;
  hitstopTimer: number;
}

const DAY_PREP_DURATION_SEC = 26;
const TRAITS: DragonTrait[] = ['ferocious', 'swift', 'stalwart', 'arcane'];
const KNIGHT_NAMES = ['Sir Rowan', 'Dame Astrid', 'Ser Thorne', 'Sir Gareth', 'Dame Lyra'];

function allocId(state: GameState): number {
  return state.nextEntityId++;
}

function getRng(state: GameState): SeededRng {
  const rng = createRng(state.seed ^ (state.nextEntityId * 2654435761));
  state.seed = (state.seed + 1013904223) >>> 0;
  return rng;
}

function createPerimeterWalls(): PerimeterWallSegment[] {
  const R = PERIMETER_WALL_RADIUS;
  const span = R * 2;
  return [
    { side: 'north', x: 0, z: -R, width: span, depth: 1.4, hp: 0, maxHp: 0, hitFlash: 0, buildProgress: 1 },
    { side: 'south', x: 0, z: R, width: span, depth: 1.4, hp: 0, maxHp: 0, hitFlash: 0, buildProgress: 1 },
    { side: 'east', x: R, z: 0, width: 1.4, depth: span, hp: 0, maxHp: 0, hitFlash: 0, buildProgress: 1 },
    { side: 'west', x: -R, z: 0, width: 1.4, depth: span, hp: 0, maxHp: 0, hitFlash: 0, buildProgress: 1 },
  ];
}

export function getIntactWallSidesCount(state: GameState): number {
  if (state.wallTier === 0) return 0;
  let intact = 0;
  for (const w of state.perimeterWalls) {
    if (w.hp > 0) intact++;
  }
  return intact;
}

export function getDragonWallMultiplier(state: GameState): number {
  const intact = getIntactWallSidesCount(state);
  if (state.wallTier === 0 || intact === 0) {
    return WALL_TIER_DEFS[0].dragonMult; // 0.50x (-50% weaker without wall)
  }
  const tierMax = WALL_TIER_DEFS[state.wallTier].dragonMult; // 1.50x / 1.75x / 2.00x
  if (intact === 4) return tierMax;
  // Partial breach lowers bonus proportionally, but standing walls still empower dragons
  return Number((1.0 + (tierMax - 1.0) * (intact / 4)).toFixed(3));
}

export function getWallRepairCost(state: GameState): ResourceBundle | null {
  if (state.wallTier === 0) return null;
  let totalHp = 0;
  let totalMax = 0;
  for (const w of state.perimeterWalls) {
    totalHp += Math.max(0, w.hp);
    totalMax += Math.max(0, w.maxHp);
  }
  if (totalMax <= 0 || totalHp >= totalMax - 1) return null;
  const missingRatio = Math.max(0.15, (totalMax - totalHp) / totalMax);
  const tierDef = WALL_TIER_DEFS[state.wallTier];
  return {
    wood: Math.max(4, Math.ceil(tierDef.cost.wood * 0.45 * missingRatio)),
    stone: Math.max(3, Math.ceil(tierDef.cost.stone * 0.45 * missingRatio)),
    ember: 0,
  };
}

export function upgradePerimeterWalls(state: GameState): { ok: boolean; reason?: string } {
  if (state.wallTier >= 3) {
    return { ok: false, reason: '4-sided walls are already at Sunfire Citadel (Max Tier).' };
  }
  const nextTier = (state.wallTier + 1) as WallTier;
  const def = WALL_TIER_DEFS[nextTier];
  if (!canAfford(state.resources, def.cost)) {
    return {
      ok: false,
      reason: `Need ${def.cost.wood}W · ${def.cost.stone}S${def.cost.ember > 0 ? ` · ${def.cost.ember}E` : ''} for ${def.name}.`,
    };
  }
  state.resources = spendResources(state.resources, def.cost);
  state.wallTier = nextTier;
  for (const w of state.perimeterWalls) {
    w.maxHp = def.maxHpPerSide;
    w.hp = def.maxHpPerSide;
    w.buildProgress = 0;
    w.hitFlash = 0;
    state.events.push({ type: 'build', x: w.x * 0.85, z: w.z * 0.85 });
  }
  state.events.push({ type: 'ring', x: 0, z: 0, radius: PERIMETER_WALL_RADIUS, color: '#ffd24a' });
  state.events.push({
    type: 'banner',
    title: `4-Sided ${def.name} Built!`,
    subtitle: `Dragons empowered to ${Math.round(def.dragonMult * 100)}% strength (+${Math.round((def.dragonMult - 1) * 100)}% bonus)!`,
    color: '#73cc58',
  });
  return { ok: true };
}

export function repairPerimeterWalls(state: GameState): { ok: boolean; reason?: string } {
  const cost = getWallRepairCost(state);
  if (!cost) {
    return { ok: false, reason: 'Perimeter walls do not need repairs.' };
  }
  if (!canAfford(state.resources, cost)) {
    return { ok: false, reason: `Need ${cost.wood}W · ${cost.stone}S to repair all 4 walls.` };
  }
  state.resources = spendResources(state.resources, cost);
  for (const w of state.perimeterWalls) {
    w.hp = w.maxHp;
    w.hitFlash = 0;
    state.events.push({ type: 'repair', x: w.x * 0.85, z: w.z * 0.85 });
  }
  state.events.push({
    type: 'banner',
    title: '4-Sided Perimeter Repaired',
    subtitle: 'All defensive walls restored to full strength.',
    color: '#62e685',
  });
  return { ok: true };
}

export function getMaxDragonLevel(state: GameState): number {
  let maxLvl = 0;
  for (const d of state.dragons) {
    if (d.level > maxLvl) maxLvl = d.level;
  }
  return maxLvl;
}

function createDragonEntity(
  state: GameState,
  element: DragonElement,
  tier: EggTier,
  level: number,
  x: number,
  z: number,
): DragonUnit {
  const cfg = DRAGON_ABILITY_CONFIG.stats[element];
  const tierInfo = EGG_TIER_INFO[tier];
  const maxHp = Math.round(cfg.baseHp * tierInfo.hpMult * (1 + 0.14 * (level - 1)));
  return {
    id: allocId(state),
    element,
    rarity: cfg.rarity,
    trait: TRAITS[state.dragons.length % TRAITS.length],
    tier,
    level,
    xp: 0,
    xpToNext: 40 + (level - 1) * 35,
    hp: maxHp,
    maxHp,
    damage: cfg.baseDmg,
    attackSpeed: cfg.attackSpeed,
    moveSpeed: cfg.moveSpeed,
    attackRange: cfg.attackRange,
    critChance: cfg.critChance,
    abilityStrength: cfg.abilityStrength,
    abilityCooldown: cfg.abilityCooldown,
    abilityCooldownTimer: 0,
    x,
    z,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: 1,
    sizeScale: cfg.sizeScale,
    downTimer: 0,
    hitFlash: 0,
    attackAnim: 0,
    attackCooldown: 0,
    attackPhase: 'idle',
    attackKind: element === 'fire' ? 'stream' : element === 'ice' ? 'frostball' : element === 'electric' ? 'bolt' : 'swipe',
    attackTimer: 0,
    streamTickAccum: 0,
    comboStep: 0,
    targetId: null,
  };
}

function createEnemyEntity(
  state: GameState,
  kind: EnemyKind,
  x: number,
  z: number,
  guardLandmarkId?: string,
  hpMult = 1,
): EnemyUnit {
  const arch = ENEMY_ARCHETYPES[kind];
  const waveScale = guardLandmarkId ? 1 : 1 + Math.max(0, state.wave - 1) * 0.06;
  const maxHp = Math.round(arch.hp * waveScale * hpMult);
  const dist = Math.hypot(x, z) || 1;
  return {
    id: allocId(state),
    kind,
    x,
    z,
    vx: 0,
    vz: 0,
    facingX: -x / dist,
    facingZ: -z / dist,
    hp: maxHp,
    maxHp,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 0.4,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: state.nextEntityId % 2 === 0 ? 1 : -1,
    guardLandmarkId,
  };
}

export function createInitialState(seed = 202604): GameState {
  const rng = createRng(seed);
  const state: GameState = {
    phase: 'title',
    seed,
    nextEntityId: 10,
    wave: 1,
    isNight: false,
    dayCycleProgress: 0,
    waveActive: false,
    prepTimer: DAY_PREP_DURATION_SEC,
    gameSpeed: 1.0,
    campfireHp: 450,
    campfireMaxHp: 450,
    wallTier: 0,
    perimeterWalls: createPerimeterWalls(),
    resources: { ...INITIAL_RESOURCES },
    ancientRelics: 0,
    morale: 'steady',
    selectedBuild: null,
    squadCommand: 'follow',
    defendAnchor: { x: 0, z: 0 },
    player: {
      x: 0,
      z: 5.5,
      vx: 0,
      vz: 0,
      facingX: 0,
      facingZ: 1,
      hp: 160,
      maxHp: 160,
      moveSpeed: 9.2,
      damage: 24,
      slashRange: 3.6,
      respawnTimer: 0,
      dashCooldown: 0,
      dashTimer: 0,
      dashDirX: 0,
      dashDirZ: 1,
      attackCooldown: 0,
      attackPhase: 'idle',
      attackTimer: 0,
      comboStep: 0,
      moveDistance: 0,
      carryingEgg: null,
    },
    modifiers: {
      playerDmgMult: 1,
      playerMoveMult: 1,
      dashCooldownMult: 1,
      slashRangeBonus: 0,
      dragonDmgMult: 1,
      dragonRateMult: 1,
      dragonReviveMult: 1,
      harvestMult: 1,
      towerRateMult: 1,
      towerRangeBonus: 0,
      hearthHealRate: 4,
    },
    dragons: [],
    enemies: [],
    buildings: [],
    protectors: [],
    survivors: [],
    workers: [],
    selectedEntity: null,
    unlockedRelicForges: [],
    recruitmentSpawnTimer: 8,
    caves: CAVE_BLUEPRINTS.map((bp) => ({
      id: 100 + bp.index,
      index: bp.index,
      name: bp.name,
      biome: bp.biome,
      x: bp.x,
      z: bp.z,
      hp: bp.maxHp,
      maxHp: bp.maxHp,
      alive: true,
      garrisonStage: 0,
      hitFlash: 0,
      requiredLevel: getCaveRequiredLevel(bp.index),
    })),
    ruins: RUIN_BLUEPRINTS.map((bp, idx) => ({
      id: 200 + idx,
      blueprintId: bp.id,
      name: bp.name,
      biome: bp.biome,
      x: bp.x,
      z: bp.z,
      relicId: bp.relicId,
      protectorsGranted: bp.protectorsGranted,
      claimed: false,
      storyQuote: bp.storyQuote,
    })),
    jails: JAIL_BLUEPRINTS.map((bp, idx) => ({
      id: 300 + idx,
      blueprintId: bp.id,
      name: bp.name,
      biome: bp.biome,
      x: bp.x,
      z: bp.z,
      element: bp.element,
      tier: bp.tier,
      level: bp.level,
      opened: false,
      rescueLore: bp.rescueLore,
    })),
    settlements: createInitialSettlements(),
    shrines: createInitialShrines(),
    treasures: createInitialTreasures(),
    wildlife: createInitialWildlife(800),
    discoveredSites: [],
    wildEggs: [],
    incubatingEggs: [],
    resourceNodes: [],
    projectiles: [],
    waveQueue: [],
    waveSpawnTimer: 0,
    incomeTimer: 0,
    trainingXpTimer: 0,
    fogGrid: createFogGrid(),
    spawnedLandmarks: [],
    discoveredRelics: [],
    chronicleLog: [
      {
        id: 1,
        title: 'Hearth Awakening',
        text: 'You begin with a Common Green Wind/Nature dragon (Lv 1), weak and exposed (-50% without a wall). Build the 4-sided base wall around your Campfire to make your squad +50% stronger, survive nightly waves, and discover Rare Yellow, Super Rare Blue, and Legendary Red dragons.',
        color: '#ffbe4d',
      },
    ],
    upgradeChoices: [],
    contextHint: { kind: 'none', label: '' },
    stats: {
      elapsedSec: 0,
      kills: 0,
      cavesDestroyed: 0,
      dragonsHatched: 0,
      buildingsBuilt: 0,
    },
    events: [],
    trauma: 0,
    hitstopTimer: 0,
  };

  // Starting Common Green (Wind/Nature) Lv 1 Dragon
  state.dragons.push(createDragonEntity(state, 'earth', 0, 1, -2.8, 3.8));

  // Add Egg Caches + outer Sanctuary Wild Eggs
  for (const cache of EGG_CACHE_BLUEPRINTS) {
    state.wildEggs.push({
      id: allocId(state),
      x: cache.x,
      z: cache.z,
      element: cache.element,
      tier: cache.tier,
      cacheId: cache.id,
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.35;
    const r = 24 + (i % 3) * 14;
    state.wildEggs.push({
      id: allocId(state),
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      element: pickWildEggElementByProgress(0, rng),
      tier: computeEggTierFromDistance(r),
    });
  }

  // Scatter Harvestable Wood, Stone, and Ember nodes around Sanctuary & frontier roads
  const nodeSpecs: Array<{ kind: ResourceNodeKind; count: number; minR: number; maxR: number; amt: number }> = [
    { kind: 'wood', count: 22, minR: 16, maxR: 85, amt: 35 },
    { kind: 'stone', count: 18, minR: 17, maxR: 95, amt: 30 },
    { kind: 'food', count: 14, minR: 18, maxR: 85, amt: 24 },
    { kind: 'ember', count: 12, minR: 20, maxR: 110, amt: 18 },
  ];
  for (const spec of nodeSpecs) {
    for (let i = 0; i < spec.count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(spec.minR, spec.maxR);
      state.resourceNodes.push({
        id: allocId(state),
        kind: spec.kind,
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        amount: spec.amt,
        maxAmount: spec.amt,
        regenTimer: 0,
      });
    }
  }

  // Rich Grove Resource Clusters at intentional Resource Forests / Clearings / Ridges
  for (const grove of RESOURCE_GROVES) {
    const nodeKind: ResourceNodeKind =
      grove.kind === 'forest' ? 'wood' : grove.kind === 'farmland' ? 'food' : 'stone';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      state.resourceNodes.push({
        id: allocId(state),
        kind: nodeKind,
        x: grove.x + Math.cos(a) * 4.5,
        z: grove.z + Math.sin(a) * 4.5,
        amount: 42,
        maxAmount: 42,
        regenTimer: 0,
      });
    }
  }

  // Place Waiting Survivors at Abandoned Settlements
  let survIdx = 0;
  for (const settle of state.settlements) {
    for (let k = 0; k < settle.survivorsRemaining; k++) {
      const angle = (k === 0 ? 0.6 : -1.2) + survIdx * 0.4;
      state.survivors.push({
        id: allocId(state),
        name: pickSurvivorName(survIdx),
        x: settle.x + Math.cos(angle) * 3.1,
        z: settle.z + Math.sin(angle) * 3.1,
        costGold: settle.recruitCostGold,
        sourceId: settle.id,
        recruited: false,
      });
      survIdx++;
    }
  }

  return state;
}

export function getDragonCapacity(state: GameState): number {
  let cap = 2;
  for (const b of state.buildings) {
    if (b.buildTimer <= 0 && b.hp > 0) {
      if (b.kind === 'nest') cap += 2;
      else if (b.kind === 'sanctuary') cap += 1;
    }
  }
  return cap;
}

export function getSquadDps(state: GameState): number {
  const wallMult = getDragonWallMultiplier(state);
  let total = 0;
  for (const d of state.dragons) {
    if (d.downTimer > 0) continue;
    total += computeDragonDpsEstimate(
      d.element,
      d.level,
      d.tier,
      state.modifiers.dragonDmgMult,
      state.modifiers.dragonRateMult,
      wallMult,
    );
  }
  return Number(total.toFixed(1));
}

export function getMissionObjective(state: GameState): {
  title: string;
  subtitle: string;
  distanceMeters: number;
  direction: string;
  hasFrontliner: boolean;
  explorationPct: number;
} {
  const explorationPct = getExplorationPercent(state.fogGrid);
  const hasFrontliner = state.dragons.some((d) => DRAGON_ABILITY_CONFIG.stats[d.element].isFrontliner);
  const activeCave = getActiveTargetCave(state.caves);
  const maxLvl = getMaxDragonLevel(state);

  if (state.wallTier === 0) {
    const wallCost = WALL_TIER_DEFS[1].cost;
    return {
      title: 'Fortify Camp: Build 4-Sided Wall',
      subtitle: `Dragons are -50% weaker without a wall! Need ${wallCost.wood}W · ${wallCost.stone}S (Press E near Camp or click Wall Upgrade).`,
      distanceMeters: Math.round(Math.hypot(state.player.x, state.player.z)),
      direction: getCardinalDirectionLabel(-state.player.x, -state.player.z),
      hasFrontliner,
      explorationPct,
    };
  }

  if (!activeCave) {
    return {
      title: 'Defeat Remaining Forces',
      subtitle: 'All 4 Caves collapsed — slay the Nightmare Lord to claim victory!',
      distanceMeters: 0,
      direction: 'HERE',
      hasFrontliner,
      explorationPct,
    };
  }

  const dx = activeCave.x - state.player.x;
  const dz = activeCave.z - state.player.z;
  const dist = Math.round(Math.hypot(dx, dz));
  const dir = getCardinalDirectionLabel(dx, dz);

  if (maxLvl < activeCave.requiredLevel) {
    return {
      title: `Train Dragons to Lv ${activeCave.requiredLevel}+`,
      subtitle: `${activeCave.name} requires Dragon Lv ${activeCave.requiredLevel}+ (Top Lv ${maxLvl}). Fight night waves or build Training Grounds!`,
      distanceMeters: dist,
      direction: dir,
      hasFrontliner,
      explorationPct,
    };
  }

  return {
    title: `Destroy ${activeCave.name} (Lv ${activeCave.requiredLevel}+)`,
    subtitle: hasFrontliner
      ? `Night ${state.wave}/${FINAL_WAVE} · Wall ${WALL_TIER_DEFS[state.wallTier].name} (${Math.round(getDragonWallMultiplier(state) * 100)}% Dragon Power)`
      : `Tip: Rescue Green Tank Drake East along Timber Road before sieging!`,
    distanceMeters: dist,
    direction: dir,
    hasFrontliner,
    explorationPct,
  };
}

export function issueDragonCommand(state: GameState, cmd: DragonCommand): void {
  state.squadCommand = cmd;
  if (cmd === 'defend') {
    state.defendAnchor = { x: state.player.x, z: state.player.z };
  }
}

export function placeBuilding(
  state: GameState,
  kind: BuildingKind,
  x: number,
  z: number,
): { ok: boolean; reason?: string } {
  const cost = buildingCost(kind);
  if (!canAfford(state.resources, cost)) {
    return {
      ok: false,
      reason: `Not enough resources (${(cost.gold ?? 0) > 0 ? `${cost.gold}G · ` : ''}${cost.wood}W · ${cost.stone}S${cost.ember > 0 ? ` · ${cost.ember}E` : ''}).`,
    };
  }
  const distFromCamp = Math.hypot(x, z);
  if (distFromCamp < 4.0) {
    return { ok: false, reason: 'Too close to the Campfire plinth.' };
  }
  const territory = isPointInControlledTerritory(state.settlements, x, z);
  if (!territory.controlled) {
    return { ok: false, reason: 'Build inside Sanctuary or claim an Outpost first.' };
  }
  const def = BUILDING_DEFS[kind];
  for (const b of state.buildings) {
    if (Math.hypot(b.x - x, b.z - z) < def.radius + BUILDING_DEFS[b.kind].radius - 0.6) {
      return { ok: false, reason: 'Space occupied by another structure.' };
    }
  }
  state.resources = spendResources(state.resources, cost);
  state.buildings.push({
    id: allocId(state),
    kind,
    x,
    z,
    hp: def.maxHp,
    maxHp: def.maxHp,
    buildTimer: def.buildSec,
    cooldownTimer: 0,
    hitFlash: 0,
  });
  state.stats.buildingsBuilt++;
  state.events.push({ type: 'build', x, z });
  return { ok: true };
}

export function recruitSurvivorAt(
  state: GameState,
  survivorId: number,
): { ok: boolean; reason?: string } {
  const surv = state.survivors.find((s) => s.id === survivorId);
  if (!surv) return { ok: false, reason: 'Survivor not found.' };
  const check = canRecruitSurvivor(state.resources, state.morale, surv);
  if (!check.ok) return check;

  state.resources = spendResources(state.resources, {
    gold: surv.costGold,
    wood: 0,
    stone: 0,
    ember: 0,
  });
  surv.recruited = true;
  const role = pickSuggestedWorkerRole(state.workers);
  const worker = createWorkerFromSurvivor(allocId(state), state.workers.length, surv, role);
  state.workers.push(worker);
  const settle = state.settlements.find((s) => s.id === surv.sourceId);
  if (settle && settle.survivorsRemaining > 0) {
    settle.survivorsRemaining--;
  }
  state.events.push({ type: 'pickup', x: surv.x, z: surv.z, color: '#6ee7b7' });
  state.events.push({
    type: 'discovery_toast',
    title: `${worker.name} Recruited!`,
    subtitle: `Assigned as ${role.toUpperCase()} — traveling safely to your kingdom.`,
    color: '#6ee7b7',
  });
  return { ok: true };
}

export function claimSettlementOutpost(
  state: GameState,
  settlementId: string,
): { ok: boolean; reason?: string } {
  const settle = state.settlements.find((s) => s.id === settlementId);
  if (!settle) return { ok: false, reason: 'Settlement not found.' };
  if (settle.claimed) return { ok: false, reason: `${settle.name} is already under your banner.` };
  const enemyNearby = state.enemies.some(
    (e) => e.koTimer <= 0 && Math.hypot(e.x - settle.x, e.z - settle.z) <= 14,
  );
  if (enemyNearby) {
    return { ok: false, reason: `Clear enemies near ${settle.name} before claiming!` };
  }
  if (!canAfford(state.resources, OUTPOST_CLAIM_COST)) {
    return {
      ok: false,
      reason: `Need ${OUTPOST_CLAIM_COST.gold}G · ${OUTPOST_CLAIM_COST.wood}W · ${OUTPOST_CLAIM_COST.stone}S to fortify ${settle.name}.`,
    };
  }
  state.resources = spendResources(state.resources, OUTPOST_CLAIM_COST);
  settle.claimed = true;
  settle.hasWall = true;
  settle.hp = 320;
  settle.maxHp = 320;
  revealFogAt(state.fogGrid, settle.x, settle.z, 30);

  // Garrison 1 Outpost Guard cleanly at the settlement
  const guard = createWorkerFromSurvivor(
    allocId(state),
    state.workers.length,
    {
      id: allocId(state),
      name: pickSurvivorName(state.workers.length + 3),
      x: settle.x + 1.5,
      z: settle.z + 1.5,
      costGold: 0,
      sourceId: settle.id,
      recruited: true,
    },
    'guard',
  );
  guard.homeX = settle.x;
  guard.homeZ = settle.z;
  guard.arrivedAtCamp = true;
  guard.aiState = 'idle';
  state.workers.push(guard);

  state.chronicleLog.push({
    id: allocId(state),
    title: `Outpost Claimed: ${settle.name}`,
    text: `${settle.name} fortified! Build zone expanded, and an Outpost Guard now watches the road.`,
    color: '#34d399',
  });
  state.events.push({ type: 'claim_ruin', x: settle.x, z: settle.z, relicId: settle.id });
  state.events.push({
    type: 'banner',
    title: `${settle.name} Claimed!`,
    subtitle: 'Kingdom territory expanded — you can now construct Farms, Lumber Camps & Towers here.',
    color: '#34d399',
  });
  return { ok: true };
}

export function repairBuildingById(
  state: GameState,
  buildingId: number,
): { ok: boolean; reason?: string } {
  const b = state.buildings.find((item) => item.id === buildingId);
  if (!b) return { ok: false, reason: 'Building not found.' };
  if (b.hp >= b.maxHp) return { ok: false, reason: 'Structure is already at full HP.' };
  const cost: ResourceBundle = { gold: 4, wood: 6, stone: 3, ember: 0 };
  if (!canAfford(state.resources, cost)) {
    return { ok: false, reason: 'Need 4G · 6W · 3S to repair structure.' };
  }
  state.resources = spendResources(state.resources, cost);
  b.hp = b.maxHp;
  state.events.push({ type: 'repair', x: b.x, z: b.z });
  return { ok: true };
}

export function demolishBuildingById(state: GameState, buildingId: number): boolean {
  const idx = state.buildings.findIndex((b) => b.id === buildingId);
  if (idx < 0) return false;
  const b = state.buildings[idx];
  const def = BUILDING_DEFS[b.kind];
  state.resources = grantResources(state.resources, {
    wood: Math.round(def.cost.wood * 0.4),
    stone: Math.round(def.cost.stone * 0.4),
  });
  state.buildings.splice(idx, 1);
  if (state.selectedEntity?.kind === 'building' && state.selectedEntity.id === buildingId) {
    state.selectedEntity = null;
  }
  return true;
}

export function forgeRelicUpgrade(
  state: GameState,
  forgeId: RelicForgeDef['id'],
): { ok: boolean; reason?: string } {
  if (state.unlockedRelicForges.includes(forgeId)) {
    return { ok: false, reason: 'Relic blessing already forged.' };
  }
  const def = RELIC_FORGE_UPGRADES.find((u) => u.id === forgeId);
  if (!def) return { ok: false, reason: 'Unknown relic upgrade.' };
  if (state.ancientRelics < def.relicCost) {
    return { ok: false, reason: `Need ${def.relicCost} Ancient Relic (find in Ruins, Shrines, or Caves).` };
  }
  if ((state.resources.gold ?? 0) < def.goldCost) {
    return { ok: false, reason: `Need ${def.goldCost} Gold to forge ${def.title}.` };
  }
  state.ancientRelics -= def.relicCost;
  state.resources = spendResources(state.resources, { gold: def.goldCost, wood: 0, stone: 0, ember: 0 });
  state.unlockedRelicForges.push(forgeId);
  if (forgeId === 'bastion_plates') {
    for (const d of state.dragons) {
      if (d.element === 'earth') {
        d.maxHp = Math.round(d.maxHp * 1.35);
        d.hp = d.maxHp;
      }
    }
  }
  state.events.push({ type: 'ring', x: 0, z: 0, radius: 7, color: '#ffd24a' });
  state.events.push({
    type: 'banner',
    title: `Relic Forged: ${def.title}`,
    subtitle: def.description,
    color: '#ffd24a',
  });
  return { ok: true };
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify({ version: 2, state });
}

export function deserializeGameState(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as { version?: number; state?: GameState };
    if (parsed?.version !== 2 || !parsed.state) return null;
    if (!parsed.state.player || !Array.isArray(parsed.state.dragons)) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export function summonNextWaveNow(state: GameState): void {
  if (state.waveActive) return;
  state.prepTimer = 0;
  startNightWave(state);
}

function startNightWave(state: GameState): void {
  if (state.waveActive) return;
  const aliveCaves = state.caves.filter((c) => c.alive).length;
  const claimedOutposts = getClaimedOutposts(state.settlements).length;
  const rng = getRng(state);
  state.waveActive = true;
  state.isNight = true;
  state.dayCycleProgress = Math.max(0.72, state.dayCycleProgress);
  state.waveQueue = selectWaveComposition(state.wave, aliveCaves, rng, claimedOutposts);
  state.waveSpawnTimer = 0.05;
  state.events.push({ type: 'wave_start', wave: state.wave, isNight: true });
  state.events.push({
    type: 'banner',
    title: `Night ${state.wave} Falls — Huge Raid!`,
    subtitle:
      claimedOutposts > 0
        ? `${state.waveQueue.length} beasts strike your walls and ${claimedOutposts} claimed outpost${claimedOutposts > 1 ? 's' : ''}!`
        : `${state.waveQueue.length} shadow beasts approach all 4 walls!`,
    color: '#ff6b4a',
  });
}

export function applyUpgradeCard(state: GameState, cardId: string): void {
  if (cardId === 'ember_edge') {
    state.modifiers.playerDmgMult *= 1.3;
    state.modifiers.slashRangeBonus += 0.85;
  } else if (cardId === 'fleet_stride') {
    state.modifiers.playerMoveMult *= 1.15;
    state.modifiers.dashCooldownMult *= 0.7;
  } else if (cardId === 'dragon_fury') {
    state.modifiers.dragonDmgMult *= 1.25;
    for (const d of state.dragons) {
      grantDragonXp(state, d, d.xpToNext);
    }
  } else if (cardId === 'sky_swiftness') {
    state.modifiers.dragonRateMult *= 1.2;
    state.modifiers.dragonReviveMult *= 0.65;
  } else if (cardId === 'bastion_masonry') {
    for (const b of state.buildings) {
      b.maxHp = Math.round(b.maxHp * 1.4);
      b.hp = b.maxHp;
    }
    for (const w of state.perimeterWalls) {
      if (w.maxHp > 0) {
        w.maxHp = Math.round(w.maxHp * 1.25);
        w.hp = w.maxHp;
      }
    }
  } else if (cardId === 'hearth_surge') {
    state.campfireMaxHp += 80;
    state.campfireHp = Math.min(state.campfireMaxHp, state.campfireHp + 120);
    state.modifiers.hearthHealRate += 3.5;
  } else if (cardId === 'ember_harvest') {
    state.resources.wood += 20;
    state.resources.stone += 20;
    state.resources.ember += 15;
    state.modifiers.harvestMult *= 1.35;
  } else if (cardId === 'watch_optics') {
    state.modifiers.towerRateMult *= 1.3;
    state.modifiers.towerRangeBonus += 3.0;
  }

  state.upgradeChoices = [];
  if (state.wave < FINAL_WAVE) {
    state.wave += 1;
  }
  const upkeepResult = applyDailyFoodUpkeep(state.resources, state.workers.length);
  state.resources = upkeepResult.resources;
  state.morale = upkeepResult.morale;
  state.isNight = false;
  state.waveActive = false;
  state.dayCycleProgress = 0;
  state.prepTimer = DAY_PREP_DURATION_SEC;
  state.phase = 'playing';
  state.events.push({
    type: 'banner',
    title: `Dawn of Day ${state.wave}`,
    subtitle: 'Gather supplies, recruit workers, reinforce walls, and level your dragons!',
    color: '#ffd24a',
  });
}

export function tradeAtSettlement(
  state: GameState,
  action: MarketTradeAction,
): { ok: boolean; reason?: string } {
  const def = MARKET_TRADES[action];
  if (!canAfford(state.resources, def.cost)) {
    return { ok: false, reason: `Insufficient resources for ${def.label}.` };
  }
  const spent = spendResources(state.resources, def.cost);
  state.resources = grantResources(spent, def.gain);
  state.events.push({ type: 'pickup', x: state.player.x, z: state.player.z, color: '#ffd24a' });
  return { ok: true };
}

function grantDragonXp(state: GameState, dragon: DragonUnit, rawXp: number): void {
  const trainingCount = state.buildings.filter(
    (b) => b.kind === 'training' && b.buildTimer <= 0 && b.hp > 0,
  ).length;
  const mult = 1 + trainingCount * 0.25;
  dragon.xp += rawXp * mult;
  while (dragon.xp >= dragon.xpToNext) {
    dragon.xp -= dragon.xpToNext;
    dragon.level += 1;
    dragon.xpToNext = Math.round(45 + dragon.level * 35);
    const arch = DRAGON_ARCHETYPES[dragon.element];
    const cfg = DRAGON_ABILITY_CONFIG.stats[dragon.element];
    const tierInfo = EGG_TIER_INFO[dragon.tier];
    dragon.maxHp = Math.round(cfg.baseHp * tierInfo.hpMult * (1 + 0.14 * (dragon.level - 1)));
    dragon.hp = dragon.maxHp;
    state.events.push({
      type: 'damage_num',
      x: dragon.x,
      z: dragon.z,
      amount: 0,
      label: `LEVEL ${dragon.level}!`,
      color: '#ffd24a',
      crit: true,
    });
    state.events.push({
      type: 'ring',
      x: dragon.x,
      z: dragon.z,
      radius: 2.8,
      color: arch.accentColor,
    });
  }
}

function grantSquadXp(state: GameState, xp: number): void {
  if (state.dragons.length === 0) return;
  for (const d of state.dragons) {
    grantDragonXp(state, d, xp);
  }
}

export function damageDragon(
  state: GameState,
  dragon: DragonUnit,
  rawDmg: number,
  sourceKind: EnemyKind,
): number {
  const cfg = DRAGON_ABILITY_CONFIG.stats[dragon.element];
  const isHeavySource = sourceKind === 'warden' || sourceKind === 'boss' || sourceKind === 'siege';
  const mult = isHeavySource ? cfg.bossDamageTakenMult : cfg.generalDamageTakenMult;
  const finalDmg = Math.max(1, rawDmg * mult);
  dragon.hp = Math.max(0, dragon.hp - finalDmg);
  dragon.hitFlash = 0.18;
  state.events.push({
    type: 'damage_num',
    x: dragon.x,
    z: dragon.z,
    amount: Math.round(finalDmg),
    color: '#ff6b57',
    crit: isHeavySource && !cfg.isFrontliner,
  });
  if (dragon.hp <= 0 && dragon.downTimer <= 0) {
    dragon.downTimer = 8 * state.modifiers.dragonReviveMult;
  }
  return finalDmg;
}

export function steerAroundObstacles(
  x: number,
  z: number,
  dirX: number,
  dirZ: number,
  radius: number,
  state: GameState,
  ignoreId: number | null,
): { dirX: number; dirZ: number } {
  let ox = dirX;
  let oz = dirZ;
  const len = Math.hypot(ox, oz) || 1;
  ox /= len;
  oz /= len;

  const obstacles: Array<{ x: number; z: number; r: number }> = [
    { x: 0, z: 0, r: 3.1 }, // Campfire plinth
  ];
  for (const b of state.buildings) {
    if (b.id === ignoreId || b.hp <= 0) continue;
    obstacles.push({ x: b.x, z: b.z, r: BUILDING_DEFS[b.kind].radius * 0.75 });
  }

  for (const obs of obstacles) {
    const toObsX = obs.x - x;
    const toObsZ = obs.z - z;
    const dist = Math.hypot(toObsX, toObsZ);
    const avoidR = obs.r + radius + 0.6;
    if (dist < avoidR && dist > 0.01) {
      const nx = toObsX / dist;
      const nz = toObsZ / dist;
      const dot = ox * nx + oz * nz;
      if (dot > 0.05) {
        // Deflect tangentially around obstacle
        const tx = -nz;
        const tz = nx;
        const side = ox * tx + oz * tz >= 0 ? 1 : -1;
        const blend = Math.min(1.5, (avoidR - dist) / avoidR + 0.7);
        ox += tx * side * blend;
        oz += tz * side * blend;
      }
    }
  }

  const outLen = Math.hypot(ox, oz) || 1;
  return { dirX: ox / outLen, dirZ: oz / outLen };
}

export function ensureDebugDragon(state: GameState, element: DragonElement): DragonUnit {
  let dragon = state.dragons.find((d) => d.element === element);
  if (!dragon) {
    const angle = state.dragons.length * 1.4;
    dragon = createDragonEntity(
      state,
      element,
      1,
      Math.max(1, getMaxDragonLevel(state)),
      state.player.x + Math.cos(angle) * 2.5,
      state.player.z + Math.sin(angle) * 2.5,
    );
    state.dragons.push(dragon);
  }
  dragon.downTimer = 0;
  dragon.hp = dragon.maxHp;
  return dragon;
}

export function spawnDebugEnemies(
  state: GameState,
  preset: 'pack' | 'huge' | 'boss',
): void {
  const px = state.player.x;
  const pz = state.player.z;
  // Clear distant non-combatants if needed so enemies[0] in tests is the freshly spawned unit
  if (preset === 'huge') {
    const golem = createEnemyEntity(state, 'siege', px, pz + 5.5);
    state.enemies.unshift(golem);
  } else if (preset === 'boss') {
    const boss = createEnemyEntity(state, 'boss', px, pz + 7.5);
    state.enemies.unshift(boss);
  } else {
    for (let i = 0; i < 5; i++) {
      const en = createEnemyEntity(
        state,
        'raider',
        px + (i - 2) * 1.6,
        pz + 6.0 + (i % 2) * 1.2,
      );
      state.enemies.unshift(en);
    }
  }
}

export function triggerDebugDragonAbility(
  state: GameState,
  element: DragonElement,
): void {
  const dragon = ensureDebugDragon(state, element);
  const nearest = findBestEnemyTarget(state, dragon);
  if (nearest) {
    const dx = nearest.x - dragon.x;
    const dz = nearest.z - dragon.z;
    const dist = Math.hypot(dx, dz) || 1;
    const desiredDist = element === 'earth' ? 1.8 : 4.8;
    if (dist > desiredDist + 1.0) {
      dragon.x = nearest.x - (dx / dist) * desiredDist;
      dragon.z = nearest.z - (dz / dist) * desiredDist;
    }
    dragon.facingX = dx / dist;
    dragon.facingZ = dz / dist;
  }
  dragon.attackCooldown = 0;
  dragon.abilityCooldownTimer = 0;
  dragon.attackPhase = 'idle';
  dragon.attackTimer = 0;
  initiateDragonAttack(state, dragon, nearest);
}

function getDragonEffectiveDamage(state: GameState, dragon: DragonUnit): number {
  const tierMult = [1, 1.25, 1.55, 1.95][dragon.tier];
  const lvlMult = getDragonLevelStatMult(dragon.level);
  const wallMult = getDragonWallMultiplier(state);
  const relicMult =
    (state.discoveredRelics.includes('glacial_waystone') ? 1.18 : 1) *
    (state.discoveredRelics.includes('sunfire_crown') ? 1.25 : 1);
  let forgeMult = 1;
  if (dragon.element === 'fire' && state.unlockedRelicForges.includes('inferno_core')) forgeMult *= 1.35;
  if (dragon.element === 'ice' && state.unlockedRelicForges.includes('permafrost_heart')) forgeMult *= 1.35;
  if (dragon.element === 'earth' && state.unlockedRelicForges.includes('bastion_plates')) forgeMult *= 1.2;
  return dragon.damage * tierMult * lvlMult * wallMult * state.modifiers.dragonDmgMult * relicMult * forgeMult;
}

function applyDragonCrit(
  state: GameState,
  dragon: DragonUnit,
  rawDmg: number,
): { dmg: number; isCrit: boolean } {
  const cfg = DRAGON_ABILITY_CONFIG.stats[dragon.element];
  const rng = getRng(state);
  const isCrit = rng.next() < dragon.critChance;
  return {
    dmg: isCrit ? rawDmg * cfg.critMultiplier : rawDmg,
    isCrit,
  };
}

function getDragonRateMultiplier(state: GameState, dragon?: DragonUnit): number {
  const trainingCount = state.buildings.filter(
    (b) => b.kind === 'training' && b.buildTimer <= 0 && b.hp > 0,
  ).length;
  const hornMult = state.discoveredRelics.includes('bannerman_horn') ? 1.18 : 1;
  const stormForge =
    dragon?.element === 'electric' && state.unlockedRelicForges.includes('storm_capacitor') ? 1.35 : 1;
  return state.modifiers.dragonRateMult * (1 + trainingCount * 0.15) * hornMult * stormForge;
}

function findBestEnemyTarget(state: GameState, dragon: DragonUnit): EnemyUnit | null {
  const alive = state.enemies.filter((e) => e.koTimer <= 0 && e.hp > 0);
  if (alive.length === 0) return null;

  if (dragon.element === 'electric') {
    const cfg = DRAGON_ABILITY_CONFIG.electric;
    let best: EnemyUnit | null = null;
    let bestScore = -Infinity;
    for (const en of alive) {
      const dist = Math.hypot(en.x - dragon.x, en.z - dragon.z);
      if (dist > 34) continue;
      let neighbors = 0;
      for (const other of alive) {
        if (other.id !== en.id && Math.hypot(other.x - en.x, other.z - en.z) <= cfg.maxJumpDist) {
          neighbors++;
        }
      }
      const hugePenalty = isHugeEnemy(en.kind) ? cfg.hugeTargetPenalty : 0;
      const score = neighbors * cfg.groupNeighborBonus - dist * 0.5 - hugePenalty;
      if (score > bestScore) {
        bestScore = score;
        best = en;
      }
    }
    if (best) return best;
  }

  let closest: EnemyUnit | null = null;
  let closestDist = Infinity;
  for (const en of alive) {
    const d = Math.hypot(en.x - dragon.x, en.z - dragon.z);
    if (d < closestDist) {
      closestDist = d;
      closest = en;
    }
  }
  return closest;
}

function applyDamageToEnemy(
  state: GameState,
  enemy: EnemyUnit,
  rawDamage: number,
  isMelee: boolean,
  color: string,
  sourceDragonId: number | null = null,
  forceCrit = false,
): void {
  if (enemy.koTimer > 0) return;
  const mult = getIncomingStatusDamageMultiplier(enemy.statuses, isMelee);
  const dmg = Math.max(1, Math.round(rawDamage * mult));
  enemy.hp = Math.max(0, enemy.hp - dmg);
  enemy.hitFlash = 0.12;

  state.events.push({
    type: 'hit',
    x: enemy.x,
    z: enemy.z,
    heavy: forceCrit || dmg >= 30,
    color,
  });
  state.events.push({
    type: 'damage_num',
    x: enemy.x,
    z: enemy.z,
    amount: dmg,
    color,
    crit: forceCrit || dmg >= 35,
  });

  if (enemy.hp <= 0 && enemy.koTimer <= 0) {
    enemy.koTimer = 0.35;
    const arch = ENEMY_ARCHETYPES[enemy.kind];
    const goldDrop = computeEnemyGoldDrop(enemy.kind);
    state.resources = grantResources(state.resources, {
      ember: arch.rewardEmber,
      gold: goldDrop,
    });
    state.stats.kills++;
    state.events.push({ type: 'kill', x: enemy.x, z: enemy.z });
    const xpGain = Math.max(10, Math.round(arch.threatCost * 3.5));
    if (sourceDragonId !== null) {
      const killer = state.dragons.find((d) => d.id === sourceDragonId);
      if (killer) grantDragonXp(state, killer, xpGain * 0.5);
    }
    grantSquadXp(state, xpGain * 0.75);
  }
}

function damageCave(
  state: GameState,
  cave: CaveState,
  rawDmg: number,
  sourceDragonId: number | null,
): void {
  if (!cave.alive) return;
  if (isCaveWarded(cave, state.caves)) {
    if (cave.hitFlash <= 0) {
      cave.hitFlash = 0.65;
      const active = getActiveTargetCave(state.caves);
      state.events.push({
        type: 'damage_num',
        x: cave.x,
        z: cave.z,
        amount: 0,
        label: 'VOID-WARDED',
        color: '#b95cff',
        crit: true,
      });
      if (active) {
        state.events.push({
          type: 'banner',
          title: `${cave.name} Is Void-Warded`,
          subtitle: `Destroy Cave ${active.index} (${active.name}) first to break the ward!`,
          color: '#b95cff',
        });
      }
    }
    return;
  }

  // Enforce required dragon level to attack cave
  const requiredLevel = cave.requiredLevel;
  const maxDragonLevel = getMaxDragonLevel(state);
  if (state.dragons.length === 0 || maxDragonLevel < requiredLevel) {
    if (cave.hitFlash <= 0) {
      cave.hitFlash = 0.65;
      state.events.push({
        type: 'damage_num',
        x: cave.x,
        z: cave.z,
        amount: 0,
        label: `NEED LEVEL ${requiredLevel}+`,
        color: '#ff6b57',
        crit: true,
      });
      state.events.push({
        type: 'banner',
        title: `Dragons Too Weak for ${cave.name}`,
        subtitle: `Your dragons are level ${maxDragonLevel} (Need Level ${requiredLevel}+). Train and level up your dragons before attacking!`,
        color: '#ff6b57',
      });
    }
    return;
  }

  const dmg = Math.max(1, Math.round(rawDmg));
  cave.hp = Math.max(0, cave.hp - dmg);
  cave.hitFlash = 0.14;
  state.events.push({
    type: 'damage_num',
    x: cave.x,
    z: cave.z,
    amount: dmg,
    color: '#ffbe4d',
  });

  // Trigger multi-stage cave garrison alarms
  const ratio = cave.hp / cave.maxHp;
  const thresholds = [0.98, 0.65, 0.30];
  while (cave.garrisonStage < 3 && ratio <= thresholds[cave.garrisonStage]) {
    const stage = cave.garrisonStage;
    cave.garrisonStage++;
    const waveKinds = getCaveGarrisonWave(cave.index, stage);
    const bp = CAVE_BLUEPRINTS.find((c) => c.index === cave.index);
    const wardenMult = bp?.wardenHpMult ?? 1;
    waveKinds.forEach((kind, idx) => {
      const a = (idx / Math.max(1, waveKinds.length)) * Math.PI * 2;
      const dist = 3.6 + (idx % 3) * 1.1;
      state.enemies.push(
        createEnemyEntity(
          state,
          kind,
          cave.x + Math.cos(a) * dist,
          cave.z + Math.sin(a) * dist,
          undefined,
          kind === 'warden' ? wardenMult : 1,
        ),
      );
    });
    state.events.push({ type: 'cave_alarm', x: cave.x, z: cave.z, index: cave.index });
    state.events.push({
      type: 'banner',
      title: `${cave.name} Garrison Alert!`,
      subtitle:
        stage === 2 && cave.index === 4
          ? 'The Nightmare Lord emerges to defend the Abyssal Maw!'
          : 'A Cave Warden and reinforcements rush from the rift!',
      color: '#ff5a36',
    });
  }

  // Cave 4 stays >= 1 HP while Nightmare Lord lives
  if (cave.index === 4 && state.enemies.some((e) => e.kind === 'boss' && e.koTimer <= 0)) {
    cave.hp = Math.max(1, cave.hp);
  }

  if (cave.hp <= 0 && cave.alive) {
    cave.alive = false;
    state.stats.cavesDestroyed++;
    state.trauma = Math.min(0.32, state.trauma + 0.28);
    state.events.push({ type: 'cave_down', x: cave.x, z: cave.z, index: cave.index });
    state.resources = grantResources(state.resources, {
      gold: 45 + cave.index * 20,
      ember: 35 + cave.index * 15,
      stone: 25,
    });
    state.ancientRelics += 1;
    grantSquadXp(state, 65 + cave.index * 25);
    if (sourceDragonId !== null) {
      const d = state.dragons.find((dr) => dr.id === sourceDragonId);
      if (d) grantDragonXp(state, d, 30);
    }
    state.chronicleLog.push({
      id: allocId(state),
      title: `${cave.name} Collapsed`,
      text: `Cave ${cave.index} shattered! Remaining wave pressure drops and your dragons grow stronger.`,
      color: '#c068ff',
    });
    state.events.push({
      type: 'banner',
      title: `${cave.name} Destroyed!`,
      subtitle: 'Void barrier weakened across Elderglen!',
      color: '#c068ff',
    });
  }
}

function initiateDragonAttack(
  state: GameState,
  dragon: DragonUnit,
  target: EnemyUnit | null,
): void {
  const cfg = DRAGON_ABILITY_CONFIG.stats[dragon.element];
  const rateMult = getDragonRateMultiplier(state, dragon);
  const attackInterval = 1 / Math.max(0.2, dragon.attackSpeed * rateMult);

  if (dragon.element === 'earth') {
    const combo = DRAGON_ABILITY_CONFIG.green.comboRotation[dragon.comboStep % 3];
    dragon.comboStep = (dragon.comboStep + 1) % 3;
    dragon.attackKind = combo.id;
    dragon.attackPhase = 'windup';
    dragon.attackTimer = combo.anticipationSec / rateMult;
    dragon.attackAnim = combo.anticipationSec + 0.2;
    dragon.attackCooldown = attackInterval;
    return;
  }

  if (dragon.element === 'fire') {
    if (dragon.abilityCooldownTimer <= 0) {
      dragon.attackKind = 'stream';
      dragon.attackPhase = 'windup';
      dragon.attackTimer = cfg.anticipationSec / rateMult;
      dragon.streamTickAccum = 0;
      dragon.attackAnim = cfg.anticipationSec + DRAGON_ABILITY_CONFIG.fire.streamHoldSec;
      dragon.attackCooldown = attackInterval;
      dragon.abilityCooldownTimer = dragon.abilityCooldown;
    } else {
      dragon.attackKind = 'bolt';
      dragon.attackPhase = 'windup';
      dragon.attackTimer = cfg.anticipationSec / rateMult;
      dragon.attackAnim = cfg.anticipationSec + 0.22;
      dragon.attackCooldown = attackInterval;
      dragon.targetId = target?.id ?? null;
    }
    return;
  }

  if (dragon.element === 'ice') {
    if (dragon.abilityCooldownTimer <= 0) {
      dragon.attackKind = 'frostball';
      dragon.attackPhase = 'windup';
      dragon.attackTimer = cfg.anticipationSec / rateMult;
      dragon.attackAnim = cfg.anticipationSec + 0.25;
      dragon.attackCooldown = attackInterval;
      dragon.abilityCooldownTimer = dragon.abilityCooldown;
      dragon.targetId = target?.id ?? null;
    } else {
      dragon.attackKind = 'bolt';
      dragon.attackPhase = 'windup';
      dragon.attackTimer = cfg.anticipationSec / rateMult;
      dragon.attackAnim = cfg.anticipationSec + 0.22;
      dragon.attackCooldown = attackInterval;
      dragon.targetId = target?.id ?? null;
    }
    return;
  }

  // Electric
  dragon.attackKind = 'bolt';
  dragon.attackPhase = 'windup';
  dragon.attackTimer = cfg.anticipationSec / rateMult;
  dragon.attackAnim = cfg.anticipationSec + 0.25;
  dragon.attackCooldown = attackInterval;
  dragon.targetId = target?.id ?? null;
}

function executeFireStreamTick(state: GameState, dragon: DragonUnit): void {
  const fcfg = DRAGON_ABILITY_CONFIG.fire;
  const abilityMult = Math.max(1, dragon.abilityStrength);
  const baseDmg = getDragonEffectiveDamage(state, dragon) * fcfg.tickDamageMult * (1 + (abilityMult - 1) * 0.45);
  const burnDps = getDragonEffectiveDamage(state, dragon) * fcfg.burnDpsFactor * abilityMult;

  state.events.push({
    type: 'dragon_vfx',
    kind: 'flame_stream',
    dragonId: dragon.id,
    x: dragon.x,
    z: dragon.z,
    dirX: dragon.facingX,
    dirZ: dragon.facingZ,
    scale: dragon.sizeScale,
  });

  for (const en of state.enemies) {
    if (en.koTimer > 0) continue;
    const rx = en.x - dragon.x;
    const rz = en.z - dragon.z;
    const forward = rx * dragon.facingX + rz * dragon.facingZ;
    if (forward < -0.5 || forward > fcfg.beamLength) continue;
    const perp = Math.abs(-rx * dragon.facingZ + rz * dragon.facingX);
    const maxHalfW = 0.55 + (forward / fcfg.beamLength) * fcfg.beamHalfWidth;
    if (perp <= maxHalfW) {
      applyBurningStatus(
        en.statuses,
        fcfg.burnDuration,
        burnDps,
        fcfg.burnBonusDamageMult,
        dragon.id,
      );
      const hit = applyDragonCrit(state, dragon, baseDmg);
      applyDamageToEnemy(state, en, hit.dmg, false, '#ff8a33', dragon.id, hit.isCrit);
    }
  }
}

function executeFireBolt(state: GameState, dragon: DragonUnit): void {
  const baseDmg = getDragonEffectiveDamage(state, dragon);
  const hit = applyDragonCrit(state, dragon, baseDmg);
  let dx = dragon.facingX;
  let dz = dragon.facingZ;
  const target =
    state.enemies.find((e) => e.id === dragon.targetId && e.koTimer <= 0) ??
    findBestEnemyTarget(state, dragon);
  if (target) {
    const tx = target.x - dragon.x;
    const tz = target.z - dragon.z;
    const len = Math.hypot(tx, tz) || 1;
    dx = tx / len;
    dz = tz / len;
    dragon.facingX = dx;
    dragon.facingZ = dz;
  }
  state.projectiles.push({
    id: allocId(state),
    fromPlayerSide: true,
    element: 'fire',
    x: dragon.x + dx * 0.8,
    y: 1.0,
    z: dragon.z + dz * 0.8,
    vx: dx * 18,
    vy: 0,
    vz: dz * 18,
    speed: 18,
    damage: hit.dmg,
    radius: 0.75,
    life: 1.2,
    sourceDragonId: dragon.id,
    targetEnemyId: target?.id ?? null,
    isAbilityCast: false,
    isCrit: hit.isCrit,
  });
}

function executeIceCast(state: GameState, dragon: DragonUnit, isAbilityCast: boolean): void {
  const icfg = DRAGON_ABILITY_CONFIG.ice;
  const abilityScale = isAbilityCast ? Math.max(1, dragon.abilityStrength) : 0.85;
  const baseDmg = getDragonEffectiveDamage(state, dragon) * abilityScale;
  const hit = applyDragonCrit(state, dragon, baseDmg);
  let dx = dragon.facingX;
  let dz = dragon.facingZ;
  const target =
    state.enemies.find((e) => e.id === dragon.targetId && e.koTimer <= 0) ??
    findBestEnemyTarget(state, dragon);
  if (target) {
    const tx = target.x - dragon.x;
    const tz = target.z - dragon.z;
    const len = Math.hypot(tx, tz) || 1;
    dx = tx / len;
    dz = tz / len;
    dragon.facingX = dx;
    dragon.facingZ = dz;
  }

  state.events.push({
    type: 'dragon_vfx',
    kind: 'frost_cast',
    dragonId: dragon.id,
    x: dragon.x,
    z: dragon.z,
    dirX: dx,
    dirZ: dz,
    scale: dragon.sizeScale,
  });

  state.projectiles.push({
    id: allocId(state),
    fromPlayerSide: true,
    element: 'ice',
    x: dragon.x + dx * 0.8,
    y: 1.0,
    z: dragon.z + dz * 0.8,
    vx: dx * icfg.projectileSpeed,
    vy: 0,
    vz: dz * icfg.projectileSpeed,
    speed: icfg.projectileSpeed,
    damage: hit.dmg,
    radius: isAbilityCast ? 0.9 : 0.7,
    life: 1.4,
    sourceDragonId: dragon.id,
    targetEnemyId: target?.id ?? null,
    isAbilityCast,
    isCrit: hit.isCrit,
  });
}

function executeElectricChain(state: GameState, dragon: DragonUnit, isAbilityChain: boolean): void {
  const ecfg = DRAGON_ABILITY_CONFIG.electric;
  const rng = getRng(state);
  const abilityScale = isAbilityChain ? Math.max(1, dragon.abilityStrength) : 0.9;
  const baseDmg = getDragonEffectiveDamage(state, dragon) * abilityScale;
  const first =
    state.enemies.find((e) => e.id === dragon.targetId && e.koTimer <= 0) ??
    findBestEnemyTarget(state, dragon);
  if (!first) return;

  const hitSet = new Set<number>();
  const chain: EnemyUnit[] = [first];
  hitSet.add(first.id);

  if (isAbilityChain) {
    while (chain.length < ecfg.chainTargets) {
      const tail = chain[chain.length - 1];
      let nextTarget: EnemyUnit | null = null;
      let bestDist = ecfg.maxJumpDist;
      for (const en of state.enemies) {
        if (en.koTimer > 0 || hitSet.has(en.id)) continue;
        const d = Math.hypot(en.x - tail.x, en.z - tail.z);
        if (d <= bestDist) {
          bestDist = d;
          nextTarget = en;
        }
      }
      if (!nextTarget) break;
      hitSet.add(nextTarget.id);
      chain.push(nextTarget);
    }
  }

  const points: Array<{ x: number; z: number }> = [];
  let mult = 1.0;
  for (const en of chain) {
    points.push({ x: en.x, z: en.z });
    const huge = isHugeEnemy(en.kind);
    const rawDmg = baseDmg * mult * (huge ? ecfg.hugeDamageMult : 1);
    const hit = applyDragonCrit(state, dragon, rawDmg);
    if (isAbilityChain) {
      const chance = huge ? ecfg.hugeStunChance : ecfg.stunChanceSmall;
      const stunDur = (huge ? ecfg.hugeStunDuration : ecfg.stunDurationSmall) * abilityScale;
      applyStunnedStatus(en.statuses, en.kind, chance, stunDur, () => rng.next());
    }
    applyDamageToEnemy(state, en, hit.dmg, false, '#ffe64d', dragon.id, hit.isCrit);
    mult *= ecfg.jumpDamageDecay;
  }

  state.events.push({
    type: 'dragon_vfx',
    kind: 'lightning_arc',
    dragonId: dragon.id,
    x: dragon.x,
    z: dragon.z,
    dirX: dragon.facingX,
    dirZ: dragon.facingZ,
    scale: dragon.sizeScale,
    points,
  });
}

function executeGreenMeleeActive(state: GameState, dragon: DragonUnit): void {
  const combo = DRAGON_ABILITY_CONFIG.green.comboRotation.find((c) => c.id === dragon.attackKind)
    ?? DRAGON_ABILITY_CONFIG.green.comboRotation[0];
  const baseDmg = getDragonEffectiveDamage(state, dragon) * combo.dmgMult;

  if (combo.lungeDist > 0) {
    dragon.x += dragon.facingX * Math.min(1.2, combo.lungeDist * 0.45);
    dragon.z += dragon.facingZ * Math.min(1.2, combo.lungeDist * 0.45);
  }

  const vfxKind =
    combo.id === 'swipe'
      ? 'melee_swipe'
      : combo.id === 'whip'
        ? 'melee_whip'
        : 'melee_bite';

  state.events.push({
    type: 'dragon_vfx',
    kind: vfxKind,
    dragonId: dragon.id,
    x: dragon.x,
    z: dragon.z,
    dirX: dragon.facingX,
    dirZ: dragon.facingZ,
    scale: dragon.sizeScale,
    radius: combo.radius,
  });

  if (combo.hitstopSec > 0) {
    state.hitstopTimer = Math.max(state.hitstopTimer, combo.hitstopSec);
  }

  for (const en of state.enemies) {
    if (en.koTimer > 0) continue;
    const rx = en.x - dragon.x;
    const rz = en.z - dragon.z;
    const d = Math.hypot(rx, rz);
    if (d > combo.radius + 0.6) continue;
    if (!combo.isCircleAoe) {
      const dot = (rx * dragon.facingX + rz * dragon.facingZ) / Math.max(0.1, d);
      if (dot < 0.15 && d > 1.2) continue;
    }
    const hit = applyDragonCrit(state, dragon, baseDmg);
    applyDamageToEnemy(state, en, hit.dmg, true, '#9ce659', dragon.id, hit.isCrit);
  }
}

function findNearestUndiscoveredExploreGoal(
  state: GameState,
  x: number,
  z: number,
): { x: number; z: number } | null {
  let best: { x: number; z: number } | null = null;
  let bestDist = Infinity;
  const consider = (id: string, gx: number, gz: number) => {
    if (state.discoveredSites.includes(id)) return;
    const d = Math.hypot(gx - x, gz - z);
    if (d < bestDist) {
      bestDist = d;
      best = { x: gx, z: gz };
    }
  };
  for (const s of state.settlements) consider(s.id, s.x, s.z);
  for (const sh of state.shrines) consider(sh.id, sh.x, sh.z);
  for (const g of RESOURCE_GROVES) consider(g.id, g.x, g.z);
  for (const tr of state.treasures) consider(tr.id, tr.x, tr.z);
  return best;
}

function stepDragons(state: GameState, simDt: number): void {
  const p = state.player;

  for (let idx = 0; idx < state.dragons.length; idx++) {
    const d = state.dragons[idx];
    const cfg = DRAGON_ABILITY_CONFIG.stats[d.element];
    const rateMult = getDragonRateMultiplier(state, d);

    if (d.hitFlash > 0) d.hitFlash = Math.max(0, d.hitFlash - simDt);
    if (d.attackAnim > 0) d.attackAnim = Math.max(0, d.attackAnim - simDt);
    if (d.abilityCooldownTimer > 0) {
      d.abilityCooldownTimer = Math.max(0, d.abilityCooldownTimer - simDt);
    }
    if (d.attackCooldown > 0 && d.attackPhase === 'idle') {
      d.attackCooldown = Math.max(0, d.attackCooldown - simDt);
    }

    if (d.downTimer > 0) {
      d.downTimer = Math.max(0, d.downTimer - simDt);
      d.vx = 0;
      d.vz = 0;
      if (d.downTimer <= 0) {
        d.hp = Math.round(d.maxHp * 0.65);
      }
      continue;
    }

    // Handle active attack state machine
    if (d.attackPhase === 'windup') {
      d.attackTimer -= simDt;
      if (d.attackTimer <= 0) {
        d.attackPhase = 'active';
        if (d.element === 'fire') {
          if (d.attackKind === 'stream') {
            d.attackTimer = DRAGON_ABILITY_CONFIG.fire.streamHoldSec;
            d.streamTickAccum = DRAGON_ABILITY_CONFIG.fire.tickInterval; // fire first tick immediately!
          } else {
            executeFireBolt(state, d);
            d.attackPhase = 'recovery';
            d.attackTimer = cfg.recoverySec / rateMult;
          }
        } else if (d.element === 'ice') {
          executeIceCast(state, d, d.attackKind === 'frostball');
          d.attackPhase = 'recovery';
          d.attackTimer = cfg.recoverySec / rateMult;
        } else if (d.element === 'electric') {
          const useChain = d.abilityCooldownTimer <= 0;
          executeElectricChain(state, d, useChain);
          if (useChain) d.abilityCooldownTimer = d.abilityCooldown;
          d.attackPhase = 'recovery';
          d.attackTimer = cfg.recoverySec / rateMult;
        } else {
          executeGreenMeleeActive(state, d);
          const combo = DRAGON_ABILITY_CONFIG.green.comboRotation.find((c) => c.id === d.attackKind);
          d.attackPhase = 'recovery';
          d.attackTimer = (combo?.recoverySec ?? cfg.recoverySec) / rateMult;
        }
      }
    } else if (d.attackPhase === 'active') {
      d.attackTimer -= simDt;
      if (d.element === 'fire' && d.attackKind === 'stream') {
        d.streamTickAccum += simDt;
        const step = DRAGON_ABILITY_CONFIG.fire.tickInterval;
        while (d.streamTickAccum >= step) {
          d.streamTickAccum -= step;
          executeFireStreamTick(state, d);
        }
      }
      if (d.attackTimer <= 0) {
        d.attackPhase = 'recovery';
        d.attackTimer = cfg.recoverySec / rateMult;
      }
    } else if (d.attackPhase === 'recovery') {
      d.attackTimer -= simDt;
      if (d.attackTimer <= 0) {
        d.attackPhase = 'idle';
      }
    }

    // Movement & Targeting
    const target = findBestEnemyTarget(state, d);
    const activeCave = getActiveTargetCave(state.caves);
    let goalX = p.x;
    let goalZ = p.z;
    let combatMode = false;

    if (state.squadCommand === 'defend') {
      goalX = state.defendAnchor.x;
      goalZ = state.defendAnchor.z;
    } else if (state.squadCommand === 'attack') {
      if (target) {
        goalX = target.x;
        goalZ = target.z;
        combatMode = true;
      } else if (activeCave) {
        goalX = activeCave.x;
        goalZ = activeCave.z;
      }
    } else if (state.squadCommand === 'explore') {
      const siteGoal = findNearestUndiscoveredExploreGoal(state, d.x, d.z);
      if (siteGoal) {
        goalX = siteGoal.x;
        goalZ = siteGoal.z;
      } else {
        const angle = state.stats.elapsedSec * 0.22 + idx * 1.8;
        const radius = 52 + (idx % 2) * 24;
        goalX = Math.cos(angle) * radius;
        goalZ = Math.sin(angle) * radius;
      }
      revealFogAt(state.fogGrid, d.x, d.z, 24);
      if (target && Math.hypot(target.x - d.x, target.z - d.z) <= 16) {
        combatMode = true;
      }
    } else if (state.squadCommand === 'sanctuary') {
      let anchorX = 0;
      let anchorZ = 0;
      let bestSancDist = Infinity;
      for (const b of state.buildings) {
        if (b.kind === 'sanctuary' && b.buildTimer <= 0 && b.hp > 0) {
          const sd = Math.hypot(b.x - d.x, b.z - d.z);
          if (sd < bestSancDist) {
            bestSancDist = sd;
            anchorX = b.x;
            anchorZ = b.z;
          }
        }
      }
      const angle = (idx / Math.max(1, state.dragons.length)) * Math.PI * 2;
      goalX = anchorX + Math.cos(angle) * 3.4;
      goalZ = anchorZ + Math.sin(angle) * 3.4;
      if (Math.hypot(d.x - anchorX, d.z - anchorZ) <= 6.5 && d.hp < d.maxHp) {
        d.hp = Math.min(d.maxHp, d.hp + 12 * simDt);
      }
      if (target && Math.hypot(target.x - anchorX, target.z - anchorZ) <= 14) {
        combatMode = true;
      }
    } else {
      // Follow mode: engage enemies near Guardian or camp
      const angle = (idx / Math.max(1, state.dragons.length)) * Math.PI * 2;
      const offsetR = cfg.isFrontliner ? 2.4 : 3.6;
      goalX = p.x + Math.cos(angle) * offsetR;
      goalZ = p.z + Math.sin(angle) * offsetR;
      if (target && Math.hypot(target.x - d.x, target.z - d.z) <= 18) {
        combatMode = true;
      }
    }

    if (target && (combatMode || Math.hypot(target.x - goalX, target.z - goalZ) <= 14)) {
      const dx = target.x - d.x;
      const dz = target.z - d.z;
      const dist = Math.hypot(dx, dz) || 1;
      const engageRange =
        d.element === 'earth' ? DRAGON_ABILITY_CONFIG.green.maxMeleeRange : d.attackRange;
      const desiredRange = cfg.isFrontliner ? engageRange * 0.72 : Math.max(2.6, engageRange * 0.78);

      d.facingX = dx / dist;
      d.facingZ = dz / dist;

      if (dist <= engageRange && d.attackPhase === 'idle' && d.attackCooldown <= 0) {
        initiateDragonAttack(state, d, target);
      }

      if (d.attackPhase === 'idle') {
        if (dist > desiredRange) {
          const steered = steerAroundObstacles(d.x, d.z, dx / dist, dz / dist, cfg.collisionRadius, state, null);
          d.vx = steered.dirX * d.moveSpeed;
          d.vz = steered.dirZ * d.moveSpeed;
        } else if (!cfg.isFrontliner && dist < desiredRange * 0.55) {
          // Backliners kite slightly behind frontline
          const steered = steerAroundObstacles(d.x, d.z, -dx / dist, -dz / dist, cfg.collisionRadius, state, null);
          d.vx = steered.dirX * d.moveSpeed * 0.65;
          d.vz = steered.dirZ * d.moveSpeed * 0.65;
        } else {
          d.vx = 0;
          d.vz = 0;
        }
      } else {
        d.vx = 0;
        d.vz = 0;
      }
    } else if (state.squadCommand === 'attack' && activeCave && d.attackPhase === 'idle') {
      const dx = activeCave.x - d.x;
      const dz = activeCave.z - d.z;
      const dist = Math.hypot(dx, dz) || 1;
      d.facingX = dx / dist;
      d.facingZ = dz / dist;
      if (dist <= 4.8 && d.attackCooldown <= 0) {
        d.attackCooldown = 1 / Math.max(0.2, d.attackSpeed * rateMult);
        d.attackAnim = 0.25;
        damageCave(state, activeCave, getDragonEffectiveDamage(state, d), d.id);
      } else if (dist > 4.2) {
        const steered = steerAroundObstacles(d.x, d.z, dx / dist, dz / dist, cfg.collisionRadius, state, null);
        d.vx = steered.dirX * d.moveSpeed;
        d.vz = steered.dirZ * d.moveSpeed;
      } else {
        d.vx = 0;
        d.vz = 0;
      }
    } else {
      const dx = goalX - d.x;
      const dz = goalZ - d.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.4 && d.attackPhase === 'idle') {
        const steered = steerAroundObstacles(d.x, d.z, dx / dist, dz / dist, cfg.collisionRadius, state, null);
        d.vx = steered.dirX * d.moveSpeed;
        d.vz = steered.dirZ * d.moveSpeed;
        d.facingX = steered.dirX;
        d.facingZ = steered.dirZ;
      } else {
        d.vx = 0;
        d.vz = 0;
      }
    }

    d.x += d.vx * simDt;
    d.z += d.vz * simDt;
    // Clamp inside world
    const r = Math.hypot(d.x, d.z);
    if (r > WORLD_RADIUS - 2) {
      d.x = (d.x / r) * (WORLD_RADIUS - 2);
      d.z = (d.z / r) * (WORLD_RADIUS - 2);
    }
    // Campfire plinth soft pushout
    const campD = Math.hypot(d.x, d.z);
    if (campD < 3.0 && campD > 0.01) {
      d.x = (d.x / campD) * 3.0;
      d.z = (d.z / campD) * 3.0;
    }
  }
}

function findBlockingWallForEnemy(state: GameState, en: EnemyUnit): PerimeterWallSegment | null {
  if (state.wallTier === 0 || en.guardLandmarkId) return null;
  const R = PERIMETER_WALL_RADIUS;
  const maxCoord = Math.max(Math.abs(en.x), Math.abs(en.z));
  if (maxCoord < R - 0.6) return null; // already inside perimeter
  let side: WallSide;
  if (Math.abs(en.x) >= Math.abs(en.z)) {
    side = en.x >= 0 ? 'east' : 'west';
  } else {
    side = en.z >= 0 ? 'south' : 'north';
  }
  const seg = state.perimeterWalls.find((w) => w.side === side);
  if (seg && seg.hp > 0) return seg;
  return null;
}

function stepEnemies(state: GameState, simDt: number): void {
  const fcfg = DRAGON_ABILITY_CONFIG.fire;
  const icfg = DRAGON_ABILITY_CONFIG.ice;
  const ecfg = DRAGON_ABILITY_CONFIG.electric;
  const thorns = state.wallTier > 0 ? WALL_TIER_DEFS[state.wallTier].thornsDmg : 0;

  let activeTokenCount = 0;
  for (const en of state.enemies) {
    if (en.hasAttackToken && en.koTimer <= 0) activeTokenCount++;
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const en = state.enemies[i];
    if (en.hitFlash > 0) en.hitFlash = Math.max(0, en.hitFlash - simDt);
    if (en.slowTimer > 0) en.slowTimer = Math.max(0, en.slowTimer - simDt);
    if (en.cooldownTimer > 0) en.cooldownTimer = Math.max(0, en.cooldownTimer - simDt);

    if (en.koTimer > 0) {
      en.koTimer -= simDt;
      if (en.koTimer <= 0) {
        state.enemies.splice(i, 1);
      }
      continue;
    }

    // Status effects tick (burn DoT, freeze end shatter, stun immunity)
    tickEnemyStatuses(
      en.statuses,
      simDt,
      icfg.freezeImmunitySec,
      ecfg.stunImmunitySec,
      (burnDmg, sourceDragonId) => {
        applyDamageToEnemy(state, en, burnDmg, false, '#ff8822', sourceDragonId);
      },
      () => {
        state.events.push({
          type: 'dragon_vfx',
          kind: 'freeze_shatter',
          x: en.x,
          z: en.z,
          dirX: 0,
          dirZ: 1,
          scale: isHugeEnemy(en.kind) ? 1.3 : 1.0,
        });
      },
    );
    if (en.koTimer > 0) continue;

    if (isEnemyIncapacitated(en.statuses)) {
      en.vx = 0;
      en.vz = 0;
      en.windupTimer = 0;
      en.hasAttackToken = false;
      continue;
    }

    const arch = ENEMY_ARCHETYPES[en.kind];
    const isHeavy = en.kind === 'warden' || en.kind === 'boss' || en.kind === 'siege';

    // Target priority: Green frontliner taunt -> nearby defenders -> workers/guards -> outpost -> blocking wall -> campfire
    let targetDragon: DragonUnit | null = null;
    let targetProtector: ProtectorUnit | null = null;
    let targetWorker: WorkerUnit | null = null;
    let targetPlayer = false;
    let targetOutpost: SettlementState | null = null;
    let targetBuilding: BuildingUnit | null = null;
    let targetWall: PerimeterWallSegment | null = null;

    // 1. Check Green frontliner taunt radius first
    let taunter: DragonUnit | null = null;
    let taunterDist = Infinity;
    for (const d of state.dragons) {
      if (d.downTimer > 0) continue;
      const dcfg = DRAGON_ABILITY_CONFIG.stats[d.element];
      if (dcfg.tauntRadius <= 0) continue;
      const dist = Math.hypot(d.x - en.x, d.z - en.z);
      if (dist <= dcfg.tauntRadius && dist < taunterDist) {
        taunterDist = dist;
        taunter = d;
      }
    }

    if (taunter) {
      targetDragon = taunter;
    } else {
      // Nearest live defender within aggro range
      let bestDist = isHeavy ? 14 : 11;
      for (const d of state.dragons) {
        if (d.downTimer > 0) continue;
        const dist = Math.hypot(d.x - en.x, d.z - en.z);
        if (dist < bestDist) {
          bestDist = dist;
          targetDragon = d;
        }
      }
      for (const pr of state.protectors) {
        if (pr.downTimer > 0) continue;
        const dist = Math.hypot(pr.x - en.x, pr.z - en.z);
        if (dist < bestDist) {
          bestDist = dist;
          targetDragon = null;
          targetProtector = pr;
        }
      }
      for (const wk of state.workers) {
        if (wk.downTimer > 0 || !wk.arrivedAtCamp) continue;
        const dist = Math.hypot(wk.x - en.x, wk.z - en.z);
        const effDist = wk.role === 'guard' ? dist * 0.85 : dist;
        if (effDist < bestDist) {
          bestDist = effDist;
          targetDragon = null;
          targetProtector = null;
          targetWorker = wk;
        }
      }
      if (state.player.respawnTimer <= 0) {
        const pd = Math.hypot(state.player.x - en.x, state.player.z - en.z);
        if (pd < bestDist) {
          bestDist = pd;
          targetDragon = null;
          targetProtector = null;
          targetWorker = null;
          targetPlayer = true;
        }
      }
    }

    let tx = 0;
    let tz = 0;
    let targetRadius = 2.6;

    if (targetDragon) {
      tx = targetDragon.x;
      tz = targetDragon.z;
      targetRadius = 1.0;
    } else if (targetProtector) {
      tx = targetProtector.x;
      tz = targetProtector.z;
      targetRadius = 0.8;
    } else if (targetWorker) {
      tx = targetWorker.x;
      tz = targetWorker.z;
      targetRadius = 0.7;
    } else if (targetPlayer) {
      tx = state.player.x;
      tz = state.player.z;
      targetRadius = 0.8;
    } else if (en.guardLandmarkId) {
      // Landmark guards stay near their guard post unless provoked
      tx = en.x;
      tz = en.z;
      targetRadius = 0.5;
    } else {
      const assignedOutpost = en.targetOutpostId
        ? state.settlements.find((s) => s.id === en.targetOutpostId && s.claimed && s.hp > 0)
        : undefined;
      if (assignedOutpost) {
        targetOutpost = assignedOutpost;
        tx = assignedOutpost.x;
        tz = assignedOutpost.z;
        targetRadius = 2.4;
      } else {
        // Check blocking 4-sided perimeter wall!
        const wall = findBlockingWallForEnemy(state, en);
        if (wall) {
          targetWall = wall;
          if (wall.side === 'east' || wall.side === 'west') {
            tx = wall.x;
            tz = Math.max(-PERIMETER_WALL_RADIUS + 2, Math.min(PERIMETER_WALL_RADIUS - 2, en.z));
          } else {
            tx = Math.max(-PERIMETER_WALL_RADIUS + 2, Math.min(PERIMETER_WALL_RADIUS - 2, en.x));
            tz = wall.z;
          }
          targetRadius = 1.1;
        } else {
          // Inner building or Campfire
          let nearestB: BuildingUnit | null = null;
          let nearestBDist = 9;
          for (const b of state.buildings) {
            if (b.hp <= 0) continue;
            const bd = Math.hypot(b.x - en.x, b.z - en.z);
            if (bd < nearestBDist) {
              nearestBDist = bd;
              nearestB = b;
            }
          }
          if (nearestB) {
            targetBuilding = nearestB;
            tx = nearestB.x;
            tz = nearestB.z;
            targetRadius = BUILDING_DEFS[nearestB.kind].radius * 0.7;
          } else {
            tx = 0;
            tz = 0;
            targetRadius = 2.8;
          }
        }
      }
    }

    const dx = tx - en.x;
    const dz = tz - en.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      en.facingX = dx / dist;
      en.facingZ = dz / dist;
    }

    const effectiveRange = arch.attackRange + targetRadius;
    const canStartAttack =
      dist <= effectiveRange &&
      en.cooldownTimer <= 0 &&
      en.windupTimer <= 0 &&
      (targetDragon !== null ||
        targetProtector !== null ||
        targetWorker !== null ||
        targetPlayer ||
        targetOutpost !== null ||
        targetWall !== null ||
        targetBuilding !== null ||
        (!en.guardLandmarkId && dist <= effectiveRange));

    if (en.windupTimer > 0) {
      en.vx = 0;
      en.vz = 0;
      en.windupTimer -= simDt;
      if (en.windupTimer <= 0) {
        en.hasAttackToken = false;
        en.cooldownTimer = arch.cooldownSec;
        if (en.kind === 'spitter') {
          const len = Math.max(0.1, dist);
          state.projectiles.push({
            id: allocId(state),
            fromPlayerSide: false,
            element: 'blight',
            x: en.x,
            y: 1.0,
            z: en.z,
            vx: (dx / len) * 12,
            vy: 0,
            vz: (dz / len) * 12,
            speed: 12,
            damage: arch.damage,
            radius: 0.65,
            life: 1.6,
            sourceDragonId: null,
            targetEnemyId: null,
          });
        } else if (dist <= effectiveRange + 0.9) {
          if (targetDragon) {
            damageDragon(state, targetDragon, arch.damage, en.kind);
          } else if (targetProtector) {
            targetProtector.hp = Math.max(0, targetProtector.hp - arch.damage);
            targetProtector.hitFlash = 0.16;
            if (targetProtector.hp <= 0) targetProtector.downTimer = 9;
          } else if (targetWorker) {
            targetWorker.hp = Math.max(0, targetWorker.hp - arch.damage);
            targetWorker.hitFlash = 0.16;
            if (targetWorker.hp <= 0) {
              targetWorker.downTimer = 10;
              targetWorker.activityLabel = 'Recovering from wounds';
            }
          } else if (targetPlayer) {
            state.player.hp = Math.max(0, state.player.hp - arch.damage);
            state.events.push({ type: 'player_hurt', x: state.player.x, z: state.player.z });
            state.trauma = Math.min(0.32, state.trauma + 0.12);
            if (state.player.hp <= 0) {
              state.player.respawnTimer = 6;
            }
          } else if (targetOutpost) {
            const outDmg = Math.round(arch.damage * arch.structureMultiplier);
            targetOutpost.hp = Math.max(0, targetOutpost.hp - outDmg);
            if (targetOutpost.hp <= 0) {
              targetOutpost.hasWall = false;
              en.targetOutpostId = undefined;
              state.events.push({
                type: 'banner',
                title: `${targetOutpost.name} Overrun!`,
                subtitle: 'Outpost palisade shattered — repair or defend it before night deepens!',
                color: '#ff5a36',
              });
            }
          } else if (targetWall) {
            const wallDmg = Math.round(arch.damage * arch.structureMultiplier);
            targetWall.hp = Math.max(0, targetWall.hp - wallDmg);
            targetWall.hitFlash = 0.18;
            if (thorns > 0) {
              applyDamageToEnemy(state, en, thorns, true, '#ff9822', null);
            }
            if (targetWall.hp <= 0) {
              state.events.push({
                type: 'banner',
                title: `${targetWall.side.toUpperCase()} Wall Breached!`,
                subtitle: 'Enemies are breaking into camp — repair your 4-sided walls!',
                color: '#ff5a36',
              });
            }
          } else if (targetBuilding) {
            const bDmg = Math.round(arch.damage * arch.structureMultiplier);
            targetBuilding.hp = Math.max(0, targetBuilding.hp - bDmg);
            targetBuilding.hitFlash = 0.16;
            if (targetBuilding.hp <= 0) {
              state.buildings = state.buildings.filter((b) => b.id !== targetBuilding!.id);
            }
          } else if (!en.guardLandmarkId) {
            const campDmg = Math.round(arch.damage * arch.structureMultiplier);
            state.campfireHp = Math.max(0, state.campfireHp - campDmg);
            state.trauma = Math.min(0.32, state.trauma + 0.15);
          }
        }
      }
      continue;
    }

    if (canStartAttack && (activeTokenCount < 5 || isHeavy || targetWall !== null)) {
      en.windupTimer = arch.windupSec;
      en.hasAttackToken = true;
      activeTokenCount++;
      en.vx = 0;
      en.vz = 0;
      continue;
    }

    // Move toward target unless already at wall/target
    if (dist > Math.max(0.8, effectiveRange * 0.88)) {
      const slowFactor = en.slowTimer > 0 ? 0.52 : 1.0;
      const spd = arch.speed * slowFactor;
      const dirX = dx / dist;
      const dirZ = dz / dist;
      // Runner flanks slightly
      const flank = en.kind === 'runner' ? 0.32 * en.flankSign : 0;
      const mx = dirX - dirZ * flank;
      const mz = dirZ + dirX * flank;
      const mLen = Math.hypot(mx, mz) || 1;
      en.vx = (mx / mLen) * spd;
      en.vz = (mz / mLen) * spd;
      en.x += en.vx * simDt;
      en.z += en.vz * simDt;

      // Hard clamp against intact perimeter wall so enemies can never clip through intact walls
      if (!en.guardLandmarkId && state.wallTier > 0) {
        const R = PERIMETER_WALL_RADIUS + 0.9;
        const nWall = state.perimeterWalls.find((w) => w.side === 'north');
        const sWall = state.perimeterWalls.find((w) => w.side === 'south');
        const eWall = state.perimeterWalls.find((w) => w.side === 'east');
        const wWall = state.perimeterWalls.find((w) => w.side === 'west');
        // If enemy approached across an intact wall boundary, keep outside until wall breaks
        if (targetWall) {
          if (targetWall.side === 'east' && eWall && eWall.hp > 0 && en.x < R) en.x = R;
          if (targetWall.side === 'west' && wWall && wWall.hp > 0 && en.x > -R) en.x = -R;
          if (targetWall.side === 'south' && sWall && sWall.hp > 0 && en.z < R) en.z = R;
          if (targetWall.side === 'north' && nWall && nWall.hp > 0 && en.z > -R) en.z = -R;
        }
      }
    } else {
      en.vx = 0;
      en.vz = 0;
    }
  }
  void fcfg;
}

function stepProjectiles(state: GameState, simDt: number): void {
  const icfg = DRAGON_ABILITY_CONFIG.ice;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const pr = state.projectiles[i];
    pr.life -= simDt;
    pr.x += pr.vx * simDt;
    pr.y += pr.vy * simDt;
    pr.z += pr.vz * simDt;

    if (pr.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (pr.fromPlayerSide) {
      let hit = false;
      for (const en of state.enemies) {
        if (en.koTimer > 0) continue;
        if (Math.hypot(en.x - pr.x, en.z - pr.z) <= pr.radius + 0.75) {
          if (pr.element === 'ice') {
            if (pr.isAbilityCast !== false) {
              const freezeRes = applyFrozenStatus(
                en.statuses,
                en.kind,
                icfg.freezeDuration,
                icfg.hugeFreezeDurationMult,
                icfg.hugeSlowSec,
              );
              if (freezeRes.appliedSlowSec > 0) {
                en.slowTimer = Math.max(en.slowTimer, freezeRes.appliedSlowSec);
              }
              for (const nearby of state.enemies) {
                if (nearby.koTimer > 0 || nearby.id === en.id) continue;
                if (Math.hypot(nearby.x - pr.x, nearby.z - pr.z) <= icfg.chillRadius) {
                  nearby.slowTimer = Math.max(nearby.slowTimer, icfg.hugeSlowSec);
                }
              }
              state.events.push({
                type: 'dragon_vfx',
                kind: 'freeze_shatter',
                x: en.x,
                z: en.z,
                dirX: 0,
                dirZ: 1,
                scale: 1,
              });
            } else {
              en.slowTimer = Math.max(en.slowTimer, 1.2);
            }
          }
          const projColor =
            pr.element === 'ice' ? '#66d9ff' : pr.element === 'fire' ? '#ff8a33' : '#ffd24a';
          applyDamageToEnemy(
            state,
            en,
            pr.damage,
            false,
            projColor,
            pr.sourceDragonId,
            Boolean(pr.isCrit),
          );
          hit = true;
          break;
        }
      }
      if (!hit) {
        const cave = getActiveTargetCave(state.caves);
        if (cave && Math.hypot(cave.x - pr.x, cave.z - pr.z) <= 3.6) {
          damageCave(state, cave, pr.damage, pr.sourceDragonId);
          hit = true;
        }
      }
      if (hit) {
        state.projectiles.splice(i, 1);
      }
    } else {
      // Enemy blight projectile
      let hit = false;
      for (const w of state.perimeterWalls) {
        if (w.hp <= 0) continue;
        const inX = Math.abs(pr.x - w.x) <= w.width * 0.5 + 0.6;
        const inZ = Math.abs(pr.z - w.z) <= w.depth * 0.5 + 0.6;
        if (inX && inZ) {
          w.hp = Math.max(0, w.hp - pr.damage);
          w.hitFlash = 0.14;
          hit = true;
          break;
        }
      }
      if (!hit && state.player.respawnTimer <= 0 && Math.hypot(state.player.x - pr.x, state.player.z - pr.z) <= 0.95) {
        state.player.hp = Math.max(0, state.player.hp - pr.damage);
        state.events.push({ type: 'player_hurt', x: state.player.x, z: state.player.z });
        if (state.player.hp <= 0) state.player.respawnTimer = 6;
        hit = true;
      }
      if (!hit) {
        for (const d of state.dragons) {
          if (d.downTimer > 0) continue;
          if (Math.hypot(d.x - pr.x, d.z - pr.z) <= d.sizeScale + 0.4) {
            damageDragon(state, d, pr.damage, 'spitter');
            hit = true;
            break;
          }
        }
      }
      if (!hit && Math.hypot(pr.x, pr.z) <= 2.4) {
        state.campfireHp = Math.max(0, state.campfireHp - pr.damage);
        hit = true;
      }
      if (hit) {
        state.projectiles.splice(i, 1);
      }
    }
  }
}

function executePlayerSlash(state: GameState): void {
  const p = state.player;
  const range = p.slashRange + state.modifiers.slashRangeBonus;
  const dmg = p.damage * state.modifiers.playerDmgMult * (p.comboStep === 2 ? 1.35 : 1);
  const angle = Math.atan2(p.facingZ, p.facingX);
  state.events.push({ type: 'slash', x: p.x, z: p.z, angle, combo: p.comboStep });

  for (const en of state.enemies) {
    if (en.koTimer > 0) continue;
    const rx = en.x - p.x;
    const rz = en.z - p.z;
    const d = Math.hypot(rx, rz);
    if (d > range + 0.6) continue;
    const dot = (rx * p.facingX + rz * p.facingZ) / Math.max(0.1, d);
    if (dot >= -0.1 || d <= 1.4) {
      applyDamageToEnemy(state, en, dmg, true, '#ffbe4d', null);
    }
  }

  for (const cave of state.caves) {
    if (!cave.alive) continue;
    const d = Math.hypot(cave.x - p.x, cave.z - p.z);
    if (d <= range + 2.8) {
      damageCave(state, cave, dmg, null);
    }
  }
}

function computeContextHintAndInteract(state: GameState, interactJustPressed: boolean): void {
  const p = state.player;

  // 1. Carrying wild egg -> drop at campfire/nest to incubate
  if (p.carryingEgg) {
    const distCamp = Math.hypot(p.x, p.z);
    if (distCamp <= 6.5) {
      state.contextHint = { kind: 'incubate', label: '[E] Incubate Dragon Egg at Campfire' };
      if (interactJustPressed) {
        if (state.dragons.length + state.incubatingEggs.length >= getDragonCapacity(state)) {
          state.events.push({
            type: 'banner',
            title: 'Dragon Nest Full',
            subtitle: 'Build a Dragon Nest [B] to raise dragon capacity (+2 per Nest)!',
            color: '#ff9d52',
          });
        } else {
          const hatchBase = EGG_TIER_INFO[p.carryingEgg.tier].hatchSec;
          const nestCount = state.buildings.filter((b) => b.kind === 'nest' && b.buildTimer <= 0 && b.hp > 0).length;
          const sanctuaryCount = state.buildings.filter((b) => b.kind === 'sanctuary' && b.buildTimer <= 0 && b.hp > 0).length;
          const hatchSec = hatchBase / (1 + nestCount * 0.6 + sanctuaryCount * 0.35);
          state.incubatingEggs.push({
            id: allocId(state),
            x: (Math.random() - 0.5) * 3.5,
            z: (Math.random() - 0.5) * 3.5,
            element: p.carryingEgg.element,
            tier: p.carryingEgg.tier,
            timer: hatchSec,
            maxTimer: hatchSec,
          });
          p.carryingEgg = null;
          state.events.push({ type: 'pickup', x: p.x, z: p.z, color: '#ffd24a' });
        }
      }
      return;
    }
  }

  // 2. Nearby unopened Dragon Jail
  for (const jail of state.jails) {
    if (jail.opened) continue;
    if (Math.hypot(jail.x - p.x, jail.z - p.z) <= 5.0) {
      const guardsAlive = state.enemies.some(
        (e) => e.guardLandmarkId === jail.blueprintId && e.koTimer <= 0,
      );
      state.contextHint = {
        kind: 'jail',
        label: guardsAlive ? `Defeat Jail Guards to free ${jail.name}` : `[E] Free Trapped Dragon (${jail.name})`,
      };
      if (interactJustPressed && !guardsAlive) {
        jail.opened = true;
        state.dragons.push(
          createDragonEntity(state, jail.element, jail.tier, jail.level, jail.x, jail.z),
        );
        state.events.push({ type: 'rescue_jail', x: jail.x, z: jail.z, element: jail.element });
        state.events.push({
          type: 'banner',
          title: `${DRAGON_ARCHETYPES[jail.element].name} Rescued!`,
          subtitle: jail.rescueLore,
          color: DRAGON_ARCHETYPES[jail.element].accentColor,
        });
      }
      return;
    }
  }

  // 3. Nearby unclaimed Lost Ruin
  for (const ruin of state.ruins) {
    if (ruin.claimed) continue;
    if (Math.hypot(ruin.x - p.x, ruin.z - p.z) <= 5.5) {
      const guardsAlive = state.enemies.some(
        (e) => e.guardLandmarkId === ruin.blueprintId && e.koTimer <= 0,
      );
      state.contextHint = {
        kind: 'ruin',
        label: guardsAlive ? `Clear Ruin Guards (${ruin.name})` : `[E] Reclaim ${ruin.name}`,
      };
      if (interactJustPressed && !guardsAlive) {
        ruin.claimed = true;
        if (!state.discoveredRelics.includes(ruin.relicId)) {
          state.discoveredRelics.push(ruin.relicId);
          state.ancientRelics += 1;
        }
        state.resources = grantResources(state.resources, { gold: 25 });
        const relic = RELIC_DEFS[ruin.relicId];
        if (ruin.relicId === 'sentinel_aegis') {
          state.player.maxHp += 40;
          state.player.hp += 40;
        } else if (ruin.relicId === 'glacial_waystone') {
          state.resources.ember += 20;
        } else if (ruin.relicId === 'sunfire_crown') {
          state.campfireMaxHp += 150;
          state.campfireHp += 150;
        }
        for (let k = 0; k < ruin.protectorsGranted; k++) {
          state.protectors.push({
            id: allocId(state),
            name: KNIGHT_NAMES[state.protectors.length % KNIGHT_NAMES.length],
            x: ruin.x + (k - 0.5) * 1.6,
            z: ruin.z + 1.4,
            vx: 0,
            vz: 0,
            facingX: 0,
            facingZ: 1,
            hp: 210,
            maxHp: 210,
            downTimer: 0,
            attackAnim: 0,
            attackCooldown: 0,
            hitFlash: 0,
          });
        }
        state.events.push({ type: 'claim_ruin', x: ruin.x, z: ruin.z, relicId: ruin.relicId });
        if (relic) {
          state.events.push({
            type: 'banner',
            title: `Relic Reclaimed: ${relic.name}`,
            subtitle: relic.effectText,
            color: relic.color,
          });
        }
      }
      return;
    }
  }

  // 3b. Nearby Unrecruited Survivor (hire with Gold)
  for (const surv of state.survivors) {
    if (surv.recruited) continue;
    if (Math.hypot(surv.x - p.x, surv.z - p.z) <= 4.2) {
      state.contextHint = {
        kind: 'survivor',
        label: `[E] Recruit ${surv.name} (${surv.costGold}G)`,
      };
      if (interactJustPressed) {
        const res = recruitSurvivorAt(state, surv.id);
        if (!res.ok && res.reason) {
          state.events.push({ type: 'banner', title: 'Cannot Recruit Survivor', subtitle: res.reason, color: '#ff9d52' });
        }
      }
      return;
    }
  }

  // 3c. Nearby Abandoned Settlement (scavenge supplies, then claim & fortify Outpost)
  for (const s of state.settlements) {
    if (Math.hypot(s.x - p.x, s.z - p.z) <= 5.5) {
      if (!s.suppliesLooted) {
        const def = ABANDONED_SETTLEMENTS.find((d) => d.id === s.id);
        state.contextHint = {
          kind: 'settlement',
          label: `[E] Scavenge Lost Supplies at ${s.name}`,
        };
        if (interactJustPressed && def) {
          s.suppliesLooted = true;
          state.resources = grantResources(state.resources, def.supplies);
          state.events.push({ type: 'pickup', x: s.x, z: s.z, color: '#ffd24a' });
          state.events.push({
            type: 'discovery_toast',
            title: `${s.name} Scavenged`,
            subtitle: def.lore,
            color: '#ffd24a',
          });
        }
        return;
      }
      if (!s.claimed) {
        state.contextHint = {
          kind: 'claim_outpost',
          label: `[E] Claim & Fortify ${s.name} (${OUTPOST_CLAIM_COST.gold}G · ${OUTPOST_CLAIM_COST.wood}W · ${OUTPOST_CLAIM_COST.stone}S)`,
        };
        if (interactJustPressed) {
          const res = claimSettlementOutpost(state, s.id);
          if (!res.ok && res.reason) {
            state.events.push({ type: 'banner', title: `Cannot Claim ${s.name}`, subtitle: res.reason, color: '#ff9d52' });
          }
        }
        return;
      }
    }
  }

  // 3c. Nearby Ancient Shrine (Activate Blessing / Trial)
  for (const shrine of state.shrines) {
    if (shrine.activated) continue;
    if (Math.hypot(shrine.x - p.x, shrine.z - p.z) <= 5.0) {
      const trialAlive = state.enemies.some(
        (e) => e.guardLandmarkId === shrine.id && e.koTimer <= 0,
      );
      if (shrine.trialStarted && trialAlive) {
        state.contextHint = {
          kind: 'shrine',
          label: `Defeat Shrine Guardians to awaken ${shrine.name}`,
        };
        return;
      }
      state.contextHint = {
        kind: 'shrine',
        label: shrine.trialStarted
          ? `[E] Claim Blessing of ${shrine.name}`
          : `[E] Awaken ${shrine.name}`,
      };
      if (interactJustPressed) {
        const def = ANCIENT_SHRINES.find((a) => a.id === shrine.id);
        if (!shrine.trialStarted && def && def.trialEnemies > 0) {
          shrine.trialStarted = true;
          for (let k = 0; k < def.trialEnemies; k++) {
            const a = (k / def.trialEnemies) * Math.PI * 2;
            state.enemies.push(
              createEnemyEntity(
                state,
                k % 2 === 0 ? 'raider' : 'brute',
                shrine.x + Math.cos(a) * 4.5,
                shrine.z + Math.sin(a) * 4.5,
                shrine.id,
              ),
            );
          }
          state.events.push({
            type: 'banner',
            title: `${shrine.name} Trial Begun`,
            subtitle: 'Defeat the shrine guardians to claim your permanent blessing!',
            color: shrine.color,
          });
        } else {
          shrine.activated = true;
          state.ancientRelics += 1;
          if (shrine.blessingId === 'hearth_blessing') {
            state.campfireMaxHp += 100;
            state.campfireHp = Math.min(state.campfireMaxHp, state.campfireHp + 100);
            state.resources = grantResources(state.resources, { gold: 18 });
          } else if (shrine.blessingId === 'gale_blessing') {
            state.modifiers.playerMoveMult *= 1.12;
            state.modifiers.dragonRateMult *= 1.15;
          } else {
            state.modifiers.dragonDmgMult *= 1.18;
            state.resources = grantResources(state.resources, { gold: 25 });
          }
          state.events.push({ type: 'ring', x: shrine.x, z: shrine.z, radius: 5.5, color: shrine.color });
          state.events.push({
            type: 'banner',
            title: `${shrine.name} Awakened`,
            subtitle: shrine.blessingText,
            color: shrine.color,
          });
        }
      }
      return;
    }
  }

  // 3d. Nearby Treasure Site
  for (const tr of state.treasures) {
    if (tr.opened) continue;
    if (Math.hypot(tr.x - p.x, tr.z - p.z) <= 4.2) {
      state.contextHint = {
        kind: 'treasure',
        label: `[E] Open ${tr.name}`,
      };
      if (interactJustPressed) {
        tr.opened = true;
        state.resources = grantResources(state.resources, tr.reward);
        state.events.push({ type: 'pickup', x: tr.x, z: tr.z, color: '#ffd24a' });
        state.events.push({
          type: 'discovery_toast',
          title: `${tr.name} Opened`,
          subtitle: tr.lore,
          color: '#ffd24a',
        });
      }
      return;
    }
  }

  // 4. Nearby Wild Egg
  if (!p.carryingEgg) {
    for (let i = 0; i < state.wildEggs.length; i++) {
      const egg = state.wildEggs[i];
      if (Math.hypot(egg.x - p.x, egg.z - p.z) <= 3.2) {
        state.contextHint = {
          kind: 'egg',
          label: `[E] Pick up ${EGG_TIER_INFO[egg.tier].label} ${DRAGON_ARCHETYPES[egg.element].name} Egg`,
        };
        if (interactJustPressed) {
          p.carryingEgg = { element: egg.element, tier: egg.tier };
          state.wildEggs.splice(i, 1);
          state.events.push({ type: 'pickup', x: egg.x, z: egg.z, color: EGG_TIER_INFO[egg.tier].color });
        }
        return;
      }
    }
  }

  // 5. Nearby Resource Node
  for (const node of state.resourceNodes) {
    if (node.amount <= 0) continue;
    if (Math.hypot(node.x - p.x, node.z - p.z) <= 3.6) {
      state.contextHint = {
        kind: 'harvest',
        label: `[E] Gather ${node.kind.toUpperCase()} (${Math.round(node.amount)} left)`,
      };
      if (interactJustPressed) {
        const gain = Math.min(node.amount, Math.round(8 * state.modifiers.harvestMult));
        node.amount -= gain;
        if (node.amount <= 0) node.regenTimer = 35;
        state.resources = grantResources(state.resources, { [node.kind]: gain });
        state.events.push({ type: 'harvest', x: node.x, z: node.z, kind: node.kind });
        state.events.push({
          type: 'damage_num',
          x: node.x,
          z: node.z,
          amount: gain,
          label: `+${gain} ${node.kind.toUpperCase()}`,
          color:
            node.kind === 'wood'
              ? '#73cc58'
              : node.kind === 'stone'
                ? '#cbd5e1'
                : node.kind === 'food'
                  ? '#86efac'
                  : '#ff9833',
        });
      }
      return;
    }
  }

  // 6. Near Campfire or Perimeter Wall -> Repair or Upgrade 4-Sided Base Wall
  const distOrigin = Math.hypot(p.x, p.z);
  const nearPerimeter =
    Math.abs(Math.abs(p.x) - PERIMETER_WALL_RADIUS) <= 3.2 ||
    Math.abs(Math.abs(p.z) - PERIMETER_WALL_RADIUS) <= 3.2;
  if (distOrigin <= 6.5 || (nearPerimeter && distOrigin <= PERIMETER_WALL_RADIUS + 4)) {
    const repairCost = getWallRepairCost(state);
    if (repairCost) {
      state.contextHint = {
        kind: 'repair',
        label: `[E] Repair 4-Sided Wall (${repairCost.wood}W · ${repairCost.stone}S)`,
      };
      if (interactJustPressed) {
        const res = repairPerimeterWalls(state);
        if (!res.ok && res.reason) {
          state.events.push({ type: 'banner', title: 'Cannot Repair Wall', subtitle: res.reason, color: '#ff6b57' });
        }
      }
      return;
    }
    if (state.wallTier < 3) {
      const next = WALL_TIER_DEFS[(state.wallTier + 1) as WallTier];
      state.contextHint = {
        kind: 'wall_upgrade',
        label: `[E] Build 4-Sided ${next.name} (${next.cost.wood}W · ${next.cost.stone}S${next.cost.ember > 0 ? ` · ${next.cost.ember}E` : ''})`,
      };
      if (interactJustPressed) {
        const res = upgradePerimeterWalls(state);
        if (!res.ok && res.reason) {
          state.events.push({ type: 'banner', title: 'Need Ingredients for Wall', subtitle: res.reason, color: '#ff9d52' });
        }
      }
      return;
    }
  }

  state.contextHint = { kind: 'none', label: '' };
}

function stepLandmarkProximityGuards(state: GameState, interactJustPressed: boolean): void {
  // Spawn guards when player explores near a landmark (5..38m ring so direct unit-test teleports work cleanly)
  if (state.stats.elapsedSec < 0.05 && interactJustPressed) return;
  const px = state.player.x;
  const pz = state.player.z;

  const trySpawn = (id: string, lx: number, lz: number, comp: readonly EnemyKind[]) => {
    if (state.spawnedLandmarks.includes(id)) return;
    const d = Math.hypot(lx - px, lz - pz);
    if (d <= 38 && (d > 5 || !interactJustPressed)) {
      state.spawnedLandmarks.push(id);
      comp.forEach((kind, i) => {
        const a = (i / Math.max(1, comp.length)) * Math.PI * 2;
        state.enemies.push(
          createEnemyEntity(state, kind, lx + Math.cos(a) * 3.2, lz + Math.sin(a) * 3.2, id),
        );
      });
    }
  };

  for (const r of RUIN_BLUEPRINTS) trySpawn(r.id, r.x, r.z, r.guardComposition);
  for (const j of JAIL_BLUEPRINTS) trySpawn(j.id, j.x, j.z, j.guardComposition);
  for (const c of EGG_CACHE_BLUEPRINTS) trySpawn(c.id, c.x, c.z, c.guardComposition);
}

function stepExplorationDiscoveryAndWildlife(state: GameState, simDt: number): void {
  const px = state.player.x;
  const pz = state.player.z;

  const checkDiscover = (
    siteId: string,
    x: number,
    z: number,
    title: string,
    subtitle: string,
    color: string,
  ) => {
    if (state.discoveredSites.includes(siteId)) return;
    let spotted = Math.hypot(x - px, z - pz) <= 15;
    if (!spotted) {
      for (const d of state.dragons) {
        if (Math.hypot(x - d.x, z - d.z) <= 13) {
          spotted = true;
          break;
        }
      }
    }
    if (!spotted) return;
    state.discoveredSites.push(siteId);
    state.resources = grantResources(state.resources, { gold: 5 });
    grantSquadXp(state, 15);
    state.chronicleLog.push({
      id: allocId(state),
      title: `Discovered: ${title}`,
      text: subtitle,
      color,
    });
    state.events.push({
      type: 'discovery_toast',
      title: `Discovered · ${title}`,
      subtitle,
      color,
    });
  };

  for (const s of state.settlements) {
    const def = ABANDONED_SETTLEMENTS.find((d) => d.id === s.id);
    checkDiscover(s.id, s.x, s.z, s.name, def?.lore ?? 'Abandoned frontier settlement.', '#fbbf24');
  }
  for (const sh of state.shrines) {
    checkDiscover(sh.id, sh.x, sh.z, sh.name, sh.blessingText, sh.color);
  }
  for (const g of RESOURCE_GROVES) {
    checkDiscover(g.id, g.x, g.z, g.name, g.description, '#86efac');
  }
  for (const tr of state.treasures) {
    checkDiscover(tr.id, tr.x, tr.z, tr.name, tr.lore, '#ffd24a');
  }

  // Step ambient small wildlife (flee from enemies, combat, or nightfall; otherwise graze near home)
  const rng = getRng(state);
  for (const w of state.wildlife) {
    let threatX = 0;
    let threatZ = 0;
    let hasThreat = false;
    let nearestThreatDist = 11;

    for (const en of state.enemies) {
      if (en.koTimer > 0) continue;
      const d = Math.hypot(en.x - w.x, en.z - w.z);
      if (d < nearestThreatDist) {
        nearestThreatDist = d;
        threatX = en.x;
        threatZ = en.z;
        hasThreat = true;
      }
    }
    const pd = Math.hypot(px - w.x, pz - w.z);
    if (!hasThreat && pd < 5.5) {
      hasThreat = true;
      threatX = px;
      threatZ = pz;
    }

    w.fleeing = hasThreat || state.isNight;
    if (hasThreat) {
      const fx = w.x - threatX;
      const fz = w.z - threatZ;
      const len = Math.hypot(fx, fz) || 1;
      const spd = w.kind === 'rabbit' ? 6.2 : 5.4;
      w.facingX = fx / len;
      w.facingZ = fz / len;
      w.vx = w.facingX * spd;
      w.vz = w.facingZ * spd;
    } else {
      w.wanderTimer -= simDt;
      if (w.wanderTimer <= 0) {
        w.wanderTimer = 1.6 + rng.range(0, 2.4);
        const toHomeX = w.homeX - w.x;
        const toHomeZ = w.homeZ - w.z;
        const homeDist = Math.hypot(toHomeX, toHomeZ);
        if (homeDist > 9) {
          w.facingX = toHomeX / homeDist;
          w.facingZ = toHomeZ / homeDist;
          w.vx = w.facingX * 1.6;
          w.vz = w.facingZ * 1.6;
        } else if (rng.next() < 0.55) {
          const a = rng.range(0, Math.PI * 2);
          w.facingX = Math.cos(a);
          w.facingZ = Math.sin(a);
          const spd = w.kind === 'rabbit' ? 1.8 : 1.3;
          w.vx = w.facingX * spd;
          w.vz = w.facingZ * spd;
        } else {
          w.vx = 0;
          w.vz = 0;
        }
      }
    }

    w.x += w.vx * simDt;
    w.z += w.vz * simDt;
    const distFromHome = Math.hypot(w.x - w.homeX, w.z - w.homeZ);
    if (distFromHome > 24) {
      w.x = w.homeX + ((w.x - w.homeX) / distFromHome) * 24;
      w.z = w.homeZ + ((w.z - w.homeZ) / distFromHome) * 24;
    }
  }
}

export function stepSimulation(
  state: GameState,
  rawDt: number,
  input: GameInput,
): void {
  state.events = [];
  if (state.phase !== 'playing') return;

  const clampedDt = Math.min(0.05, Math.max(0.001, rawDt));
  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - clampedDt);
    return;
  }
  const simDt = clampedDt * state.gameSpeed;
  state.stats.elapsedSec += simDt;
  state.trauma = Math.max(0, state.trauma - simDt * 0.85);

  if (input.commandJustPressed) {
    issueDragonCommand(state, input.commandJustPressed);
  }

  // 1. Player Update
  const p = state.player;
  if (p.dashCooldown > 0) p.dashCooldown = Math.max(0, p.dashCooldown - simDt);
  if (p.attackCooldown > 0) p.attackCooldown = Math.max(0, p.attackCooldown - simDt);

  if (p.respawnTimer > 0) {
    p.respawnTimer = Math.max(0, p.respawnTimer - simDt);
    if (p.respawnTimer <= 0) {
      p.hp = p.maxHp;
      p.x = 0;
      p.z = 5.5;
    }
  } else {
    if (input.dashJustPressed && p.dashCooldown <= 0 && p.dashTimer <= 0) {
      p.dashTimer = 0.18;
      p.dashCooldown = 1.6 * state.modifiers.dashCooldownMult;
      const ml = Math.hypot(input.moveX, input.moveZ);
      if (ml > 0.1) {
        p.dashDirX = input.moveX / ml;
        p.dashDirZ = input.moveZ / ml;
      } else {
        p.dashDirX = p.facingX;
        p.dashDirZ = p.facingZ;
      }
      state.events.push({ type: 'dash', x: p.x, z: p.z });
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= simDt;
      p.vx = p.dashDirX * 22;
      p.vz = p.dashDirZ * 22;
    } else {
      const mLen = Math.hypot(input.moveX, input.moveZ);
      if (mLen > 0.05) {
        const nx = input.moveX / mLen;
        const nz = input.moveZ / mLen;
        const spd = p.moveSpeed * state.modifiers.playerMoveMult;
        p.vx = nx * spd;
        p.vz = nz * spd;
        p.facingX = nx;
        p.facingZ = nz;
      } else {
        p.vx = 0;
        p.vz = 0;
      }
    }

    p.x += p.vx * simDt;
    p.z += p.vz * simDt;
    p.moveDistance += Math.hypot(p.vx, p.vz) * simDt;

    // Keep Guardian inside world & outside campfire hearth core
    const pr = Math.hypot(p.x, p.z);
    if (pr > WORLD_RADIUS - 3) {
      p.x = (p.x / pr) * (WORLD_RADIUS - 3);
      p.z = (p.z / pr) * (WORLD_RADIUS - 3);
    }
    if (pr < 2.8 && pr > 0.01) {
      p.x = (p.x / pr) * 2.8;
      p.z = (p.z / pr) * 2.8;
    }

    // Guardian Attack Curve: windup -> active -> recovery
    if (input.attackJustPressed && p.attackPhase === 'idle' && p.attackCooldown <= 0) {
      if (input.aimWorldX !== undefined && input.aimWorldZ !== undefined) {
        const ax = input.aimWorldX - p.x;
        const az = input.aimWorldZ - p.z;
        const al = Math.hypot(ax, az);
        if (al > 0.2 && Math.hypot(p.vx, p.vz) < 0.5) {
          p.facingX = ax / al;
          p.facingZ = az / al;
        }
      }
      p.attackPhase = 'windup';
      p.attackTimer = 0.05;
      p.attackCooldown = 0.34;
    } else if (p.attackPhase === 'windup') {
      p.attackTimer -= simDt;
      if (p.attackTimer <= 0) {
        p.attackPhase = 'active';
        p.attackTimer = 0.08;
        executePlayerSlash(state);
        p.comboStep = (p.comboStep + 1) % 3;
      }
    } else if (p.attackPhase === 'active') {
      p.attackTimer -= simDt;
      if (p.attackTimer <= 0) {
        p.attackPhase = 'recovery';
        p.attackTimer = 0.08;
      }
    } else if (p.attackPhase === 'recovery') {
      p.attackTimer -= simDt;
      if (p.attackTimer <= 0) {
        p.attackPhase = 'idle';
      }
    }

    // Hearth warm regeneration aura
    if (Math.hypot(p.x, p.z) <= 8.5 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + state.modifiers.hearthHealRate * simDt);
    }
  }

  // Reveal Fog of War around Guardian and Dragons
  revealFogAt(state.fogGrid, p.x, p.z, 26);
  for (const d of state.dragons) {
    revealFogAt(state.fogGrid, d.x, d.z, 18);
  }

  // 2. Proximity Landmark Guards, Exploration Discovery & Ambient Wildlife
  stepLandmarkProximityGuards(state, input.interactJustPressed);
  stepExplorationDiscoveryAndWildlife(state, simDt);
  computeContextHintAndInteract(state, input.interactJustPressed);

  // 3. Incubating Eggs
  for (let i = state.incubatingEggs.length - 1; i >= 0; i--) {
    const egg = state.incubatingEggs[i];
    egg.timer -= simDt;
    if (egg.timer <= 0) {
      state.incubatingEggs.splice(i, 1);
      if (state.dragons.length < getDragonCapacity(state)) {
        const hatched = createDragonEntity(state, egg.element, egg.tier, 1, egg.x, egg.z);
        state.dragons.push(hatched);
        state.stats.dragonsHatched++;
        state.events.push({ type: 'hatch', x: egg.x, z: egg.z, element: egg.element, tier: egg.tier });
      }
    }
  }

  // 4. Buildings (Construction, Resource Income, Watchtowers, Sanctuary, Recruitment, Training XP)
  state.incomeTimer += simDt;
  const doIncomeTick = state.incomeTimer >= 5.0;
  if (doIncomeTick) state.incomeTimer -= 5.0;

  let hasActiveTraining = false;
  let hasActiveRecruitment = false;
  for (const b of state.buildings) {
    if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - simDt);
    if (b.buildTimer > 0) {
      b.buildTimer = Math.max(0, b.buildTimer - simDt);
      continue;
    }
    if (b.kind === 'lumber' && doIncomeTick) {
      state.resources.wood += Math.round(3 * state.modifiers.harvestMult);
    } else if (b.kind === 'quarry' && doIncomeTick) {
      state.resources.stone += Math.round(3 * state.modifiers.harvestMult);
    } else if (b.kind === 'farm' && doIncomeTick) {
      state.resources = grantResources(state.resources, {
        food: Math.round(5 * state.modifiers.harvestMult),
      });
    } else if (b.kind === 'sanctuary') {
      for (const d of state.dragons) {
        if (d.downTimer > 0) continue;
        if (Math.hypot(d.x - b.x, d.z - b.z) <= 10 && d.hp < d.maxHp) {
          d.hp = Math.min(d.maxHp, d.hp + 12 * simDt);
        }
      }
    } else if (b.kind === 'recruitment') {
      hasActiveRecruitment = true;
    } else if (b.kind === 'training') {
      hasActiveTraining = true;
    } else if (b.kind === 'watchtower') {
      if (b.cooldownTimer > 0) {
        b.cooldownTimer -= simDt;
      } else {
        const range = 14 + state.modifiers.towerRangeBonus;
        let target: EnemyUnit | null = null;
        let bestD = range;
        for (const en of state.enemies) {
          if (en.koTimer > 0) continue;
          const d = Math.hypot(en.x - b.x, en.z - b.z);
          if (d <= bestD) {
            bestD = d;
            target = en;
          }
        }
        if (target) {
          const hasGuardNearby = state.workers.some(
            (w) => w.role === 'guard' && w.downTimer <= 0 && w.arrivedAtCamp && Math.hypot(w.x - b.x, w.z - b.z) <= 6.5,
          );
          const guardBoost = hasGuardNearby ? 1.35 : 1.0;
          b.cooldownTimer = 1.15 / (state.modifiers.towerRateMult * guardBoost);
          const dx = target.x - b.x;
          const dz = target.z - b.z;
          const len = Math.hypot(dx, dz) || 1;
          state.projectiles.push({
            id: allocId(state),
            fromPlayerSide: true,
            element: 'watchtower',
            x: b.x,
            y: 3.6,
            z: b.z,
            vx: (dx / len) * 20,
            vy: 0,
            vz: (dz / len) * 20,
            speed: 20,
            damage: 22,
            radius: 0.7,
            life: 1.0,
            sourceDragonId: null,
            targetEnemyId: target.id,
          });
        }
      }
    }
  }

  if (hasActiveRecruitment) {
    state.recruitmentSpawnTimer -= simDt;
    if (state.recruitmentSpawnTimer <= 0) {
      state.recruitmentSpawnTimer = 22;
      const campWaiting = state.survivors.filter((s) => !s.recruited && s.sourceId === 'recruitment_camp').length;
      if (campWaiting < 2) {
        const rng = getRng(state);
        const angle = rng.range(0, Math.PI * 2);
        const dist = rng.range(7.5, 11.5);
        state.survivors.push({
          id: allocId(state),
          name: pickSurvivorName(state.workers.length + state.survivors.length),
          x: Math.cos(angle) * dist,
          z: Math.sin(angle) * dist,
          costGold: 10,
          sourceId: 'recruitment_camp',
          recruited: false,
        });
      }
    }
  }

  if (hasActiveTraining && !state.waveActive) {
    state.trainingXpTimer += simDt;
    if (state.trainingXpTimer >= 1.0) {
      state.trainingXpTimer -= 1.0;
      grantSquadXp(state, 3.5);
    }
  }

  // Resource node regeneration
  for (const node of state.resourceNodes) {
    if (node.amount <= 0 && node.regenTimer > 0) {
      node.regenTimer -= simDt;
      if (node.regenTimer <= 0) {
        node.amount = node.maxAmount;
      }
    }
  }

  // 4-sided Wall animations & hit flashes
  for (const w of state.perimeterWalls) {
    if (w.hitFlash > 0) w.hitFlash = Math.max(0, w.hitFlash - simDt);
    if (w.buildProgress < 1) {
      w.buildProgress = Math.min(1, w.buildProgress + simDt * 0.85);
    }
  }

  // 5. Protectors (Oathbound Knights) & Recruited Kingdom Workers
  for (const pr of state.protectors) {
    if (pr.hitFlash > 0) pr.hitFlash = Math.max(0, pr.hitFlash - simDt);
    if (pr.attackAnim > 0) pr.attackAnim = Math.max(0, pr.attackAnim - simDt);
    if (pr.attackCooldown > 0) pr.attackCooldown = Math.max(0, pr.attackCooldown - simDt);
    if (pr.downTimer > 0) {
      pr.downTimer = Math.max(0, pr.downTimer - simDt);
      if (pr.downTimer <= 0) pr.hp = pr.maxHp;
      continue;
    }
    let nearest: EnemyUnit | null = null;
    let bestD = 16;
    for (const en of state.enemies) {
      if (en.koTimer > 0) continue;
      const d = Math.hypot(en.x - pr.x, en.z - pr.z);
      if (d < bestD) {
        bestD = d;
        nearest = en;
      }
    }
    if (nearest) {
      const dx = nearest.x - pr.x;
      const dz = nearest.z - pr.z;
      const d = Math.hypot(dx, dz) || 1;
      pr.facingX = dx / d;
      pr.facingZ = dz / d;
      if (d <= 2.3 && pr.attackCooldown <= 0) {
        pr.attackCooldown = 0.9;
        pr.attackAnim = 0.3;
        applyDamageToEnemy(state, nearest, 18, true, '#93c5fd', null);
      } else if (d > 1.8) {
        pr.vx = (dx / d) * 6.8;
        pr.vz = (dz / d) * 6.8;
        pr.x += pr.vx * simDt;
        pr.z += pr.vz * simDt;
      } else {
        pr.vx = 0;
        pr.vz = 0;
      }
    } else {
      const dx = p.x - 2 - pr.x;
      const dz = p.z - 2 - pr.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.5) {
        pr.vx = (dx / d) * 6.5;
        pr.vz = (dz / d) * 6.5;
        pr.facingX = dx / d;
        pr.facingZ = dz / d;
        pr.x += pr.vx * simDt;
        pr.z += pr.vz * simDt;
      } else {
        pr.vx = 0;
        pr.vz = 0;
      }
    }
  }

  stepWorkers(state, simDt);

  // 6. Step Dragons, Enemies, Projectiles
  stepDragons(state, simDt);
  stepEnemies(state, simDt);
  stepProjectiles(state, simDt);

  // 7. Continuous Day & Night Cycle = 1 Wave
  if (!state.waveActive) {
    state.isNight = false;
    state.prepTimer = Math.max(0, state.prepTimer - simDt);
    state.dayCycleProgress = 0.55 * (1 - state.prepTimer / DAY_PREP_DURATION_SEC);
    if (state.prepTimer <= 0) {
      startNightWave(state);
    }
  } else {
    state.isNight = true;
    state.dayCycleProgress = Math.min(0.95, state.dayCycleProgress + simDt * 0.045);

    if (state.waveQueue.length > 0) {
      state.waveSpawnTimer -= simDt;
      if (state.waveSpawnTimer <= 0) {
        state.waveSpawnTimer = 0.42;
        const rng = getRng(state);
        const claimedOutposts = getClaimedOutposts(state.settlements);
        const batch = Math.min(3, state.waveQueue.length);
        for (let b = 0; b < batch; b++) {
          const kind = state.waveQueue.shift()!;
          const a = rng.range(0, Math.PI * 2);
          if (claimedOutposts.length > 0 && rng.next() < 0.25) {
            const targetOutpost = claimedOutposts[Math.floor(rng.range(0, claimedOutposts.length)) % claimedOutposts.length];
            const dist = rng.range(22, 28);
            const en = createEnemyEntity(
              state,
              kind,
              targetOutpost.x + Math.cos(a) * dist,
              targetOutpost.z + Math.sin(a) * dist,
            );
            en.targetOutpostId = targetOutpost.id;
            state.enemies.push(en);
          } else {
            const dist = rng.range(PERIMETER_WALL_RADIUS + 8, PERIMETER_WALL_RADIUS + 15);
            state.enemies.push(createEnemyEntity(state, kind, Math.cos(a) * dist, Math.sin(a) * dist));
          }
        }
      }
    } else {
      const waveAttackersLeft = state.enemies.some((e) => e.koTimer <= 0 && !e.guardLandmarkId);
      if (!waveAttackersLeft) {
        // Wave survived -> Dawn breaks!
        state.waveActive = false;
        state.isNight = false;
        state.dayCycleProgress = 0;
        state.prepTimer = DAY_PREP_DURATION_SEC;
        grantSquadXp(state, 25 + state.wave * 10);
        state.campfireHp = Math.min(state.campfireMaxHp, state.campfireHp + 25);
        for (const d of state.dragons) {
          if (d.downTimer <= 0) {
            d.hp = Math.min(d.maxHp, d.hp + Math.round(d.maxHp * 0.35));
          }
        }
        const rng = getRng(state);
        state.upgradeChoices = getSynergisticUpgrades(
          state.dragons.length > 0,
          state.buildings.length > 0,
          rng,
        );
        state.phase = 'choosing';
      }
    }
  }

  // 8. Check Victory & Defeat
  if (state.campfireHp <= 0) {
    state.campfireHp = 0;
    state.phase = 'gameover';
    state.events.push({ type: 'gameover' });
    return;
  }

  const allCavesDead = state.caves.every((c) => !c.alive);
  const bossAlive = state.enemies.some((e) => e.kind === 'boss' && e.koTimer <= 0);
  if (allCavesDead && !bossAlive) {
    state.phase = 'victory';
    state.events.push({ type: 'victory' });
  }
}

function stepWorkers(state: GameState, simDt: number): void {
  const hasWorkshop = state.buildings.some((b) => b.kind === 'workshop' && b.buildTimer <= 0 && b.hp > 0);
  const buildMult = hasWorkshop ? 1.5 : 1.0;

  const moveWorkerToward = (w: WorkerUnit, gx: number, gz: number, speed: number) => {
    const dx = gx - w.x;
    const dz = gz - w.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.15) {
      w.vx = 0;
      w.vz = 0;
      return 0;
    }
    const steered = steerAroundObstacles(w.x, w.z, dx / dist, dz / dist, 0.45, state, null);
    w.vx = steered.dirX * speed;
    w.vz = steered.dirZ * speed;
    w.facingX = steered.dirX;
    w.facingZ = steered.dirZ;
    w.x += w.vx * simDt;
    w.z += w.vz * simDt;
    return dist;
  };

  for (let idx = 0; idx < state.workers.length; idx++) {
    const w = state.workers[idx];
    if (w.hitFlash > 0) w.hitFlash = Math.max(0, w.hitFlash - simDt);
    if (w.attackAnim > 0) w.attackAnim = Math.max(0, w.attackAnim - simDt);
    if (w.attackCooldown > 0) w.attackCooldown = Math.max(0, w.attackCooldown - simDt);

    if (w.downTimer > 0) {
      w.downTimer = Math.max(0, w.downTimer - simDt);
      w.vx = 0;
      w.vz = 0;
      if (w.downTimer <= 0) {
        const anchor = getSafeAnchorForPosition(state.settlements, w.x, w.z);
        w.x = anchor.x + 1.5;
        w.z = anchor.z + 2.5;
        w.hp = w.maxHp;
        w.aiState = 'idle';
        w.activityLabel = 'Back on duty';
      }
      continue;
    }

    // 1. Initial journey from recruitment site to Campfire
    if (!w.arrivedAtCamp) {
      w.aiState = 'moving';
      w.activityLabel = 'Traveling to Sanctuary Campfire';
      const spd = getWorkerMoveSpeed(w.role, state.morale, 'moving');
      const d = moveWorkerToward(w, w.targetX, w.targetZ, spd);
      if (d <= 8.5) {
        w.arrivedAtCamp = true;
        w.aiState = 'idle';
        w.activityLabel = 'Arrived at Sanctuary';
      }
      continue;
    }

    // 2. Night safety: non-combat workers shelter inside safe walls
    if (state.isNight && w.role !== 'guard') {
      const anchor = getSafeAnchorForPosition(state.settlements, w.x, w.z);
      w.aiState = 'fleeing';
      w.activityLabel = `Sheltering inside ${anchor.name}`;
      const spd = getWorkerMoveSpeed(w.role, state.morale, 'fleeing');
      const d = Math.hypot(anchor.x - w.x, anchor.z - w.z);
      if (d > 6.5) {
        moveWorkerToward(w, anchor.x + ((idx % 3) - 1) * 1.4, anchor.z + 2.2, spd);
      } else {
        w.vx = 0;
        w.vz = 0;
      }
      continue;
    }

    const spd = getWorkerMoveSpeed(w.role, state.morale, w.aiState);

    // 3. Role behaviors
    if (w.role === 'guard') {
      let nearest: EnemyUnit | null = null;
      let bestD = state.isNight ? 28 : 22;
      for (const en of state.enemies) {
        if (en.koTimer > 0) continue;
        const d = Math.hypot(en.x - w.x, en.z - w.z);
        if (d < bestD) {
          bestD = d;
          nearest = en;
        }
      }
      if (nearest) {
        w.aiState = 'defending';
        w.activityLabel = `Engaging ${ENEMY_ARCHETYPES[nearest.kind].name}`;
        const dx = nearest.x - w.x;
        const dz = nearest.z - w.z;
        const d = Math.hypot(dx, dz) || 1;
        w.facingX = dx / d;
        w.facingZ = dz / d;
        if (d <= 2.3 && w.attackCooldown <= 0) {
          w.attackCooldown = 0.95;
          w.attackAnim = 0.28;
          w.vx = 0;
          w.vz = 0;
          applyDamageToEnemy(state, nearest, 18, true, '#93c5fd', null);
        } else if (d > 1.8) {
          moveWorkerToward(w, nearest.x, nearest.z, spd);
        } else {
          w.vx = 0;
          w.vz = 0;
        }
      } else {
        w.aiState = state.isNight ? 'defending' : 'idle';
        w.activityLabel = state.isNight ? 'Guarding night perimeter' : 'Patrolling camp walls';
        const patrolAngle = state.stats.elapsedSec * 0.45 + idx * 1.9;
        const px = w.homeX + Math.cos(patrolAngle) * 7.5;
        const pz = w.homeZ + Math.sin(patrolAngle) * 7.5;
        if (Math.hypot(px - w.x, pz - w.z) > 1.2) {
          moveWorkerToward(w, px, pz, spd * 0.72);
        } else {
          w.vx = 0;
          w.vz = 0;
        }
      }
      continue;
    }

    if (w.role === 'builder') {
      const incomplete = state.buildings.find((b) => b.buildTimer > 0 && b.hp > 0);
      const damagedB = state.buildings.find((b) => b.buildTimer <= 0 && b.hp > 0 && b.hp < b.maxHp);
      const damagedWall =
        state.wallTier > 0
          ? state.perimeterWalls.find((wall) => wall.maxHp > 0 && wall.hp < wall.maxHp)
          : undefined;

      if (incomplete) {
        const d = Math.hypot(incomplete.x - w.x, incomplete.z - w.z);
        if (d > 2.8) {
          w.aiState = 'moving';
          w.activityLabel = `Walking to construct ${BUILDING_DEFS[incomplete.kind].name}`;
          moveWorkerToward(w, incomplete.x, incomplete.z, spd);
        } else {
          w.aiState = 'working';
          w.activityLabel = `Constructing ${BUILDING_DEFS[incomplete.kind].name}`;
          w.vx = 0;
          w.vz = 0;
          incomplete.buildTimer = Math.max(0, incomplete.buildTimer - 1.8 * buildMult * simDt);
        }
      } else if (damagedB) {
        const d = Math.hypot(damagedB.x - w.x, damagedB.z - w.z);
        if (d > 2.8) {
          w.aiState = 'moving';
          w.activityLabel = `Heading to repair ${BUILDING_DEFS[damagedB.kind].name}`;
          moveWorkerToward(w, damagedB.x, damagedB.z, spd);
        } else {
          w.aiState = 'working';
          w.activityLabel = `Repairing ${BUILDING_DEFS[damagedB.kind].name}`;
          w.vx = 0;
          w.vz = 0;
          damagedB.hp = Math.min(damagedB.maxHp, damagedB.hp + 18 * buildMult * simDt);
        }
      } else if (damagedWall) {
        const wx = damagedWall.x * 0.88;
        const wz = damagedWall.z * 0.88;
        const d = Math.hypot(wx - w.x, wz - w.z);
        if (d > 3.2) {
          w.aiState = 'moving';
          w.activityLabel = `Moving to ${damagedWall.side} wall`;
          moveWorkerToward(w, wx, wz, spd);
        } else {
          w.aiState = 'working';
          w.activityLabel = `Reinforcing ${damagedWall.side} wall`;
          w.vx = 0;
          w.vz = 0;
          damagedWall.hp = Math.min(damagedWall.maxHp, damagedWall.hp + 20 * buildMult * simDt);
        }
      } else {
        w.aiState = 'idle';
        w.activityLabel = 'Ready for construction orders';
        if (Math.hypot(w.x, w.z) > 8) {
          moveWorkerToward(w, 2.2, 4.2, spd * 0.8);
        } else {
          w.vx = 0;
          w.vz = 0;
        }
      }
      continue;
    }

    if (w.role === 'woodcutter') {
      if (w.carryAmount > 0) {
        const lumber = state.buildings.find((b) => b.kind === 'lumber' && b.buildTimer <= 0 && b.hp > 0);
        const dropX = lumber ? lumber.x : 0;
        const dropZ = lumber ? lumber.z : 4.2;
        w.aiState = 'returning';
        w.activityLabel = `Hauling +${w.carryAmount} Wood to Camp`;
        const d = moveWorkerToward(w, dropX, dropZ, spd);
        if (d <= 3.0) {
          state.resources = grantResources(state.resources, { wood: w.carryAmount });
          state.events.push({
            type: 'damage_num',
            x: dropX,
            z: dropZ,
            amount: w.carryAmount,
            label: `+${w.carryAmount} WOOD`,
            color: '#73cc58',
          });
          w.carryAmount = 0;
          w.carryKind = null;
          w.aiState = 'idle';
        }
        continue;
      }

      let bestNode: ResourceNode | null = null;
      let bestDist = Infinity;
      for (const n of state.resourceNodes) {
        if (n.kind !== 'wood' || n.amount <= 0) continue;
        const d = Math.hypot(n.x - w.x, n.z - w.z);
        if (d < bestDist) {
          bestDist = d;
          bestNode = n;
        }
      }
      if (bestNode) {
        if (bestDist > 2.5) {
          w.aiState = 'moving';
          w.activityLabel = 'Walking to timber grove';
          moveWorkerToward(w, bestNode.x, bestNode.z, spd);
        } else {
          w.aiState = 'working';
          w.activityLabel = 'Chopping timber';
          w.vx = 0;
          w.vz = 0;
          w.workTimer += simDt;
          if (w.workTimer >= 2.0) {
            w.workTimer = 0;
            const gain = Math.min(bestNode.amount, 7);
            bestNode.amount -= gain;
            if (bestNode.amount <= 0) bestNode.regenTimer = 35;
            w.carryKind = 'wood';
            w.carryAmount = gain;
          }
        }
      } else {
        w.aiState = 'idle';
        w.activityLabel = 'Awaiting timber regrowth';
        w.vx = 0;
        w.vz = 0;
      }
      continue;
    }

    if (w.role === 'farmer') {
      if (w.carryAmount > 0) {
        w.aiState = 'returning';
        w.activityLabel = `Delivering +${w.carryAmount} Food to Camp`;
        const d = moveWorkerToward(w, 0, 4.2, spd);
        if (d <= 3.2) {
          state.resources = grantResources(state.resources, { food: w.carryAmount });
          state.events.push({
            type: 'damage_num',
            x: 0,
            z: 4.2,
            amount: w.carryAmount,
            label: `+${w.carryAmount} FOOD`,
            color: '#86efac',
          });
          w.carryAmount = 0;
          w.carryKind = null;
          w.aiState = 'idle';
        }
        continue;
      }

      const farm = state.buildings.find((b) => b.kind === 'farm' && b.buildTimer <= 0 && b.hp > 0);
      if (farm) {
        const d = Math.hypot(farm.x - w.x, farm.z - w.z);
        if (d > 2.6) {
          w.aiState = 'moving';
          w.activityLabel = 'Heading to Farmstead';
          moveWorkerToward(w, farm.x, farm.z, spd);
        } else {
          w.aiState = 'working';
          w.activityLabel = 'Tending crops at Farmstead';
          w.vx = 0;
          w.vz = 0;
          w.workTimer += simDt;
          if (w.workTimer >= 2.1) {
            w.workTimer = 0;
            w.carryKind = 'food';
            w.carryAmount = 8;
          }
        }
      } else {
        let bestFood: ResourceNode | null = null;
        let bestD = Infinity;
        for (const n of state.resourceNodes) {
          if (n.kind !== 'food' || n.amount <= 0) continue;
          const d = Math.hypot(n.x - w.x, n.z - w.z);
          if (d < bestD) {
            bestD = d;
            bestFood = n;
          }
        }
        if (bestFood) {
          if (bestD > 2.5) {
            w.aiState = 'moving';
            w.activityLabel = 'Foraging berry thickets';
            moveWorkerToward(w, bestFood.x, bestFood.z, spd);
          } else {
            w.aiState = 'working';
            w.activityLabel = 'Gathering provisions';
            w.vx = 0;
            w.vz = 0;
            w.workTimer += simDt;
            if (w.workTimer >= 2.0) {
              w.workTimer = 0;
              const gain = Math.min(bestFood.amount, 6);
              bestFood.amount -= gain;
              if (bestFood.amount <= 0) bestFood.regenTimer = 35;
              w.carryKind = 'food';
              w.carryAmount = gain;
            }
          }
        } else {
          w.aiState = 'idle';
          w.activityLabel = 'Waiting for Farmstead or crops';
          w.vx = 0;
          w.vz = 0;
        }
      }
      continue;
    }

    if (w.role === 'scout') {
      if (state.dayCycleProgress >= 0.45 || w.hp < w.maxHp * 0.5) {
        w.aiState = 'returning';
        w.activityLabel = 'Returning before dusk';
        if (Math.hypot(w.x, w.z) > 7) {
          moveWorkerToward(w, 0, 4.5, spd);
        } else {
          w.vx = 0;
          w.vz = 0;
        }
      } else {
        const site = findNearestUndiscoveredExploreGoal(state, w.x, w.z);
        const gx = site ? site.x : Math.cos(w.scoutAngle) * 85;
        const gz = site ? site.z : Math.sin(w.scoutAngle) * 85;
        w.aiState = 'moving';
        w.activityLabel = site ? 'Scouting uncharted frontier' : 'Patrolling distant roads';
        const d = moveWorkerToward(w, gx, gz, spd);
        revealFogAt(state.fogGrid, w.x, w.z, 24);
        if (!site && d <= 5) {
          w.scoutAngle = (w.scoutAngle + 1.3) % (Math.PI * 2);
        }
      }
      continue;
    }

    // Unassigned settler
    w.aiState = 'idle';
    w.activityLabel = 'Awaiting assignment';
    if (Math.hypot(w.x, w.z) > 7.5) {
      moveWorkerToward(w, -2.0, 4.5, spd * 0.8);
    } else {
      w.vx = 0;
      w.vz = 0;
    }
  }
}

export function getKingdomStageSnapshot(state: GameState): KingdomStageInfo {
  return computeKingdomStage({
    wallTier: state.wallTier,
    workerCount: state.workers.length,
    buildingsBuilt: state.buildings.length,
    claimedOutposts: getClaimedOutposts(state.settlements).length,
    cavesDestroyed: state.stats.cavesDestroyed,
    maxDragonLevel: getMaxDragonLevel(state),
  });
}

export function getDailyFoodUpkeepSnapshot(state: GameState): number {
  return computeDailyFoodUpkeep(state.workers.length);
}

void NIGHT_EVERY;