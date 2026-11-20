import type { DragonElement, EnemyKind } from './data';

/**
 * Data-driven configuration for all 4 Dragon Colors, Sizes, Abilities,
 * Status Effects, and Pixel-Art Anchors. Tune all numbers here.
 */

export const DRAGON_TEXELS_PER_WORLD_UNIT = 16;
export const BASE_DRAGON_FRAME_PX = 40;

export const HUGE_ENEMY_KINDS: ReadonlySet<EnemyKind> = new Set([
  'brute',
  'siege',
  'warden',
  'boss',
]);

export function isHugeEnemy(kind: EnemyKind): boolean {
  return HUGE_ENEMY_KINDS.has(kind);
}

export type DragonRarity = 'common' | 'rare' | 'super_rare' | 'legendary';

export const DRAGON_RARITY_META: Record<
  DragonRarity,
  { label: string; shortLabel: string; color: string; rank: number; description: string }
> = {
  common: {
    label: 'Common',
    shortLabel: 'Common',
    color: '#73cc58',
    rank: 1,
    description: 'Common Wind/Nature green dragon using basic attacks without crowd control.',
  },
  rare: {
    label: 'Rare',
    shortLabel: 'Rare',
    color: '#ffd24a',
    rank: 2,
    description: 'Rare Electric yellow dragon with chain lightning and stun.',
  },
  super_rare: {
    label: 'Super Rare',
    shortLabel: 'Super Rare',
    color: '#5ec9ff',
    rank: 3,
    description: 'Super Rare Ice blue dragon that freezes and slows enemy groups.',
  },
  legendary: {
    label: 'Legendary',
    shortLabel: 'Legendary',
    color: '#ff6b35',
    rank: 4,
    description: 'Legendary Fire red dragon dealing massive damage and burning over time.',
  },
};

export interface DragonStatsConfig {
  colorName: 'red' | 'blue' | 'green' | 'yellow';
  rarity: DragonRarity;
  elementLabel: string;
  abilityName: string;
  abilityDescription: string;
  /** True for frontline melee tanks (Green Dragon) */
  isFrontliner: boolean;
  /** Multiplier to damage received from Warden / Boss / Siege heavy hitters */
  bossDamageTakenMult: number;
  /** General damage taken multiplier (armor mitigation) */
  generalDamageTakenMult: number;
  /** Preferred combat standoff distance factor behind frontline (0 = vanguard rusher) */
  preferredStandOff: number;
  /** Uniform pixel-density scale multiplier (renders larger/smaller sprites at fixed texels/unit) */
  sizeScale: number;
  /** Physical collision & formation spacing radius (scales with sizeScale) */
  collisionRadius: number;
  /** Effect scale multiplier (e.g. bigger slashes for green, smaller sparks for yellow) */
  effectScale: number;
  baseHp: number;
  baseDmg: number;
  /** Attacks per second */
  attackSpeed: number;
  moveSpeed: number;
  attackRange: number;
  attackCooldown: number;
  /** Critical hit probability (0..1) */
  critChance: number;
  /** Critical hit damage multiplier */
  critMultiplier: number;
  /** Special ability power multiplier (0 = basic attacks only) */
  abilityStrength: number;
  /** Special ability cooldown in seconds (0 = no special ability) */
  abilityCooldown: number;
  anticipationSec: number;
  recoverySec: number;
  tauntRadius: number;
}

export interface FireAbilityConfig {
  /** Forward length of the continuous flame cone/beam */
  beamLength: number;
  /** Half-width of flame beam at max reach */
  beamHalfWidth: number;
  /** Seconds between damage & burn ticks while streaming */
  tickInterval: number;
  /** Fraction of dragon attack damage applied per stream tick */
  tickDamageMult: number;
  /** Continuous flame hold duration per attack cycle (loops while target stays in range) */
  streamHoldSec: number;
  /** Burning DoT duration (refreshed on re-hit, never stacks infinitely) */
  burnDuration: number;
  /** Burning DPS fraction of dragon baseDmg */
  burnDpsFactor: number;
  /** Multiplier applied to ALL damage sources against Burning enemies (e.g. 1.25 = +25%) */
  burnBonusDamageMult: number;
}

export interface IceAbilityConfig {
  projectileSpeed: number;
  /** Freeze duration for normal/small enemies */
  freezeDuration: number;
  /** Cooldown after freeze ends before enemy can be frozen again */
  freezeImmunitySec: number;
  /** Multiplier to freeze duration for Brute/Siege (boss ignores full freeze and receives slow instead) */
  hugeFreezeDurationMult: number;
  /** Slow duration applied to huge enemies / bosses / nearby group on frost impact */
  hugeSlowSec: number;
  /** AoE chill slow radius on Frost Freeze burst */
  chillRadius: number;
  /** Extra damage multiplier on melee hits vs Frozen enemies (set 1.0 to disable) */
  frozenMeleeBonusMult: number;
}

export interface MeleeComboStepConfig {
  id: 'swipe' | 'whip' | 'bite';
  label: string;
  dmgMult: number;
  radius: number;
  isCircleAoe: boolean;
  lungeDist: number;
  anticipationSec: number;
  recoverySec: number;
  hitstopSec: number;
}

export interface GreenMeleeConfig {
  /** Strictly melee range cap — never attacks from afar */
  maxMeleeRange: number;
  comboRotation: readonly [MeleeComboStepConfig, MeleeComboStepConfig, MeleeComboStepConfig];
}

export interface ElectricAbilityConfig {
  /** Number of enemies hit across the chain (1st target + jumps, configurable 3-5) */
  chainTargets: number;
  /** Maximum jump radius between chained enemies */
  maxJumpDist: number;
  /** Damage multiplier compounded per jump (e.g. 0.72 -> 100%, 72%, 52%, 37%...) */
  jumpDamageDecay: number;
  /** Stun probability (0..1) on small/regular enemies */
  stunChanceSmall: number;
  stunDurationSmall: number;
  /** Post-stun immunity so one enemy cannot be permanently stun-locked */
  stunImmunitySec: number;
  /** Reduced damage multiplier against huge enemies (brute/siege/warden/boss) */
  hugeDamageMult: number;
  /** Low stun chance against Brute/Siege (Boss is stun-immune) */
  hugeStunChance: number;
  hugeStunDuration: number;
  /** Target scoring weight favoring clustered groups and avoiding lone huge targets */
  groupNeighborBonus: number;
  hugeTargetPenalty: number;
}

export const DRAGON_ABILITY_CONFIG: {
  stats: Record<DragonElement, DragonStatsConfig>;
  fire: FireAbilityConfig;
  ice: IceAbilityConfig;
  green: GreenMeleeConfig;
  electric: ElectricAbilityConfig;
  pixelVfx: {
    maxParticlesPerPool: number;
    maxLightningSegments: number;
    maxFloatingNumbers: number;
    maxTrauma: number;
  };
} = {
  stats: {
    earth: {
      colorName: 'green',
      rarity: 'common',
      elementLabel: 'Wind / Nature',
      abilityName: 'Basic Attacks',
      abilityDescription: 'Combo claw and tail strikes with no crowd-control effects.',
      isFrontliner: true,
      bossDamageTakenMult: 0.42, // Frontline scales shrug off Cave Warden / Boss strikes
      generalDamageTakenMult: 0.72,
      preferredStandOff: 0,
      sizeScale: 1.4,
      collisionRadius: 0.95 * 1.4,
      effectScale: 1.4,
      baseHp: 100, // Phase 1 Common target
      baseDmg: 10, // Phase 1 Common target (lowest base damage)
      attackSpeed: 1.0, // 1.0 atk/s
      moveSpeed: 8.0, // 100% baseline world movement speed
      attackRange: 3.0, // Close-range basic attacks
      attackCooldown: 1.0,
      critChance: 0.05,
      critMultiplier: 1.5,
      abilityStrength: 0,
      abilityCooldown: 0,
      anticipationSec: 0.1,
      recoverySec: 0.16,
      tauntRadius: 11.5, // Captures aggro of bosses & cave defenders away from backliners
    },
    electric: {
      colorName: 'yellow',
      rarity: 'rare',
      elementLabel: 'Electric',
      abilityName: 'Chain Lightning & Stun',
      abilityDescription: 'Arcs across up to 4 grouped enemies and has a high chance to stun.',
      isFrontliner: false,
      bossDamageTakenMult: 1.4, // Fragile backliner — stay behind Green frontliner
      generalDamageTakenMult: 1.0,
      preferredStandOff: 3.2,
      sizeScale: 0.8,
      collisionRadius: 0.8 * 0.8,
      effectScale: 0.8,
      baseHp: 110, // Phase 1 Rare target
      baseDmg: 16, // Phase 1 Rare target
      attackSpeed: 1.0, // 1.0 atk/s
      moveSpeed: 8.4, // 105% relative move speed (fastest!)
      attackRange: 8.6, // 115% range tier
      attackCooldown: 1.0,
      critChance: 0.1,
      critMultiplier: 1.5,
      abilityStrength: 1.0,
      abilityCooldown: 3.2,
      anticipationSec: 0.12,
      recoverySec: 0.18,
      tauntRadius: 0,
    },
    ice: {
      colorName: 'blue',
      rarity: 'super_rare',
      elementLabel: 'Ice',
      abilityName: 'Frost Freeze & Slow',
      abilityDescription: 'Freezes primary targets solid and slows nearby enemy groups.',
      isFrontliner: false,
      bossDamageTakenMult: 1.32,
      generalDamageTakenMult: 0.92,
      preferredStandOff: 3.0,
      sizeScale: 1.0,
      collisionRadius: 0.85 * 1.0,
      effectScale: 1.0,
      baseHp: 125, // Phase 1 Super Rare target
      baseDmg: 19, // Phase 1 Super Rare target
      attackSpeed: 0.9, // 0.9 atk/s
      moveSpeed: 7.6, // 95% relative move speed
      attackRange: 9.0, // 120% range tier (longest range!)
      attackCooldown: 1 / 0.9,
      critChance: 0.12,
      critMultiplier: 1.5,
      abilityStrength: 1.0,
      abilityCooldown: 4.0,
      anticipationSec: 0.14,
      recoverySec: 0.2,
      tauntRadius: 0,
    },
    fire: {
      colorName: 'red',
      rarity: 'legendary',
      elementLabel: 'Fire',
      abilityName: 'Inferno Flame & Burning',
      abilityDescription: 'Heavy cone fire breath that burns enemies over time (+25% damage taken).',
      isFrontliner: false,
      bossDamageTakenMult: 1.28, // High-damage backliner — still relies on Green tank vs bosses
      generalDamageTakenMult: 0.88,
      preferredStandOff: 2.2,
      sizeScale: 1.15,
      collisionRadius: 0.88 * 1.15,
      effectScale: 1.15,
      baseHp: 145, // Phase 1 Legendary target
      baseDmg: 32, // Phase 1 Legendary target (highest base damage!)
      attackSpeed: 0.8, // 0.8 atk/s
      moveSpeed: 8.0, // 100% baseline world movement speed
      attackRange: 8.2, // 110% range tier
      attackCooldown: 1 / 0.8,
      critChance: 0.18,
      critMultiplier: 1.65,
      abilityStrength: 1.35,
      abilityCooldown: 4.5,
      anticipationSec: 0.14,
      recoverySec: 0.22,
      tauntRadius: 0,
    },
  },
  fire: {
    beamLength: 7.8,
    beamHalfWidth: 1.8,
    tickInterval: 0.2,
    tickDamageMult: 0.34,
    streamHoldSec: 1.0,
    burnDuration: 3.5,
    burnDpsFactor: 0.38,
    burnBonusDamageMult: 1.25,
  },
  ice: {
    projectileSpeed: 16.5,
    freezeDuration: 2.2,
    freezeImmunitySec: 2.1,
    hugeFreezeDurationMult: 0.3,
    hugeSlowSec: 2.6,
    chillRadius: 3.4,
    frozenMeleeBonusMult: 1.25,
  },
  green: {
    maxMeleeRange: 3.0,
    comboRotation: [
      {
        id: 'swipe',
        label: 'Claw Swipe',
        dmgMult: 0.95,
        radius: 2.85,
        isCircleAoe: false,
        lungeDist: 0.35,
        anticipationSec: 0.08,
        recoverySec: 0.13,
        hitstopSec: 0,
      },
      {
        id: 'whip',
        label: 'Tail Whip',
        dmgMult: 1.15,
        radius: 3.7,
        isCircleAoe: true,
        lungeDist: 0,
        anticipationSec: 0.12,
        recoverySec: 0.17,
        hitstopSec: 0.02,
      },
      {
        id: 'bite',
        label: 'Heavy Bite',
        dmgMult: 2.05,
        radius: 3.15,
        isCircleAoe: false,
        lungeDist: 2.2,
        anticipationSec: 0.18,
        recoverySec: 0.25,
        hitstopSec: 0.045,
      },
    ],
  },
  electric: {
    chainTargets: 4, // 1 primary + 3 jumps (configurable 3-5)
    maxJumpDist: 7.2,
    jumpDamageDecay: 0.72,
    stunChanceSmall: 0.88,
    stunDurationSmall: 1.15,
    stunImmunitySec: 1.7,
    hugeDamageMult: 0.5,
    hugeStunChance: 0.15,
    hugeStunDuration: 0.25,
    groupNeighborBonus: 5.5,
    hugeTargetPenalty: 14,
  },
  pixelVfx: {
    maxParticlesPerPool: 128,
    maxLightningSegments: 48,
    maxFloatingNumbers: 48,
    maxTrauma: 0.32,
  },
};

export function getDragonFrameSizePx(element: DragonElement): number {
  return Math.round(BASE_DRAGON_FRAME_PX * DRAGON_ABILITY_CONFIG.stats[element].sizeScale);
}
