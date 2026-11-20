import {
  DRAGON_ABILITY_CONFIG,
  DRAGON_RARITY_META,
  type DragonRarity,
} from './dragonConfig';
export { DRAGON_RARITY_META, type DragonRarity };

export type DragonElement = 'fire' | 'ice' | 'earth' | 'electric';
export type DragonTrait = 'ferocious' | 'swift' | 'stalwart' | 'arcane';
export type DragonCommand = 'follow' | 'defend' | 'attack' | 'explore' | 'sanctuary';
export type EggTier = 0 | 1 | 2 | 3; // Common, Strong, Elite, Golden

export type EnemyKind =
  | 'raider'
  | 'brute'
  | 'runner'
  | 'spitter'
  | 'siege'
  | 'commander'
  | 'warden'
  | 'boss';

export type BuildingKind =
  | 'nest'
  | 'lumber'
  | 'quarry'
  | 'watchtower'
  | 'training'
  | 'wall'
  | 'farm'
  | 'sanctuary'
  | 'recruitment'
  | 'workshop';

export interface ResourceBundle {
  wood: number;
  stone: number;
  ember: number;
  gold?: number;
  food?: number;
}

export interface KingdomResources {
  gold: number;
  wood: number;
  stone: number;
  food: number;
  ember: number;
}

export interface DragonArchetype {
  element: DragonElement;
  elementLabel: string;
  rarity: DragonRarity;
  name: string;
  abilityName: string;
  role: string;
  advantage: string;
  color: string;
  accentColor: string;
  baseHp: number;
  baseDmg: number;
  attackSpeed: number;
  attackCooldown: number;
  range: number;
  moveSpeed: number;
  critChance: number;
  abilityStrength: number;
  abilityCooldown: number;
  aoeRadius: number;
  slowAmount: number;
  slowDuration: number;
  chainCount: number;
  tauntRadius: number;
}

export const DRAGON_ARCHETYPES: Record<DragonElement, DragonArchetype> = {
  fire: {
    element: 'fire',
    elementLabel: DRAGON_ABILITY_CONFIG.stats.fire.elementLabel,
    rarity: DRAGON_ABILITY_CONFIG.stats.fire.rarity,
    name: 'Ember Drake',
    abilityName: DRAGON_ABILITY_CONFIG.stats.fire.abilityName,
    role: 'Legendary Flame Destroyer',
    advantage: 'Legendary red dragon dealing high fire damage and burning enemies over time.',
    color: '#e85d2a',
    accentColor: '#ffbe4d',
    baseHp: DRAGON_ABILITY_CONFIG.stats.fire.baseHp,
    baseDmg: DRAGON_ABILITY_CONFIG.stats.fire.baseDmg,
    attackSpeed: DRAGON_ABILITY_CONFIG.stats.fire.attackSpeed,
    attackCooldown: DRAGON_ABILITY_CONFIG.stats.fire.attackCooldown,
    range: DRAGON_ABILITY_CONFIG.stats.fire.attackRange,
    moveSpeed: DRAGON_ABILITY_CONFIG.stats.fire.moveSpeed,
    critChance: DRAGON_ABILITY_CONFIG.stats.fire.critChance,
    abilityStrength: DRAGON_ABILITY_CONFIG.stats.fire.abilityStrength,
    abilityCooldown: DRAGON_ABILITY_CONFIG.stats.fire.abilityCooldown,
    aoeRadius: 2.2,
    slowAmount: 0,
    slowDuration: 0,
    chainCount: 0,
    tauntRadius: DRAGON_ABILITY_CONFIG.stats.fire.tauntRadius,
  },
  ice: {
    element: 'ice',
    elementLabel: DRAGON_ABILITY_CONFIG.stats.ice.elementLabel,
    rarity: DRAGON_ABILITY_CONFIG.stats.ice.rarity,
    name: 'Frost Wyvern',
    abilityName: DRAGON_ABILITY_CONFIG.stats.ice.abilityName,
    role: 'Super Rare Cryo Controller',
    advantage: 'Super Rare blue ice dragon that freezes enemies and slows surrounding packs.',
    color: '#4eb8e8',
    accentColor: '#c4f1ff',
    baseHp: DRAGON_ABILITY_CONFIG.stats.ice.baseHp,
    baseDmg: DRAGON_ABILITY_CONFIG.stats.ice.baseDmg,
    attackSpeed: DRAGON_ABILITY_CONFIG.stats.ice.attackSpeed,
    attackCooldown: DRAGON_ABILITY_CONFIG.stats.ice.attackCooldown,
    range: DRAGON_ABILITY_CONFIG.stats.ice.attackRange,
    moveSpeed: DRAGON_ABILITY_CONFIG.stats.ice.moveSpeed,
    critChance: DRAGON_ABILITY_CONFIG.stats.ice.critChance,
    abilityStrength: DRAGON_ABILITY_CONFIG.stats.ice.abilityStrength,
    abilityCooldown: DRAGON_ABILITY_CONFIG.stats.ice.abilityCooldown,
    aoeRadius: DRAGON_ABILITY_CONFIG.ice.chillRadius,
    slowAmount: 0.48,
    slowDuration: DRAGON_ABILITY_CONFIG.ice.hugeSlowSec,
    chainCount: 0,
    tauntRadius: DRAGON_ABILITY_CONFIG.stats.ice.tauntRadius,
  },
  earth: {
    element: 'earth',
    elementLabel: DRAGON_ABILITY_CONFIG.stats.earth.elementLabel,
    rarity: DRAGON_ABILITY_CONFIG.stats.earth.rarity,
    name: 'Bastion Drake',
    abilityName: DRAGON_ABILITY_CONFIG.stats.earth.abilityName,
    role: 'Common Wind/Nature Vanguard',
    advantage: 'Common green Wind/Nature dragon using basic attacks without crowd control.',
    color: '#6ab04c',
    accentColor: '#b8e994',
    baseHp: DRAGON_ABILITY_CONFIG.stats.earth.baseHp,
    baseDmg: DRAGON_ABILITY_CONFIG.stats.earth.baseDmg,
    attackSpeed: DRAGON_ABILITY_CONFIG.stats.earth.attackSpeed,
    attackCooldown: DRAGON_ABILITY_CONFIG.stats.earth.attackCooldown,
    range: DRAGON_ABILITY_CONFIG.stats.earth.attackRange,
    moveSpeed: DRAGON_ABILITY_CONFIG.stats.earth.moveSpeed,
    critChance: DRAGON_ABILITY_CONFIG.stats.earth.critChance,
    abilityStrength: DRAGON_ABILITY_CONFIG.stats.earth.abilityStrength,
    abilityCooldown: DRAGON_ABILITY_CONFIG.stats.earth.abilityCooldown,
    aoeRadius: 2.4,
    slowAmount: 0,
    slowDuration: 0,
    chainCount: 0,
    tauntRadius: DRAGON_ABILITY_CONFIG.stats.earth.tauntRadius,
  },
  electric: {
    element: 'electric',
    elementLabel: DRAGON_ABILITY_CONFIG.stats.electric.elementLabel,
    rarity: DRAGON_ABILITY_CONFIG.stats.electric.rarity,
    name: 'Storm Drake',
    abilityName: DRAGON_ABILITY_CONFIG.stats.electric.abilityName,
    role: 'Rare Electric Striker',
    advantage: 'Rare yellow electric dragon with chain lightning and stun across enemy groups.',
    color: '#e8c838',
    accentColor: '#fff89a',
    baseHp: DRAGON_ABILITY_CONFIG.stats.electric.baseHp,
    baseDmg: DRAGON_ABILITY_CONFIG.stats.electric.baseDmg,
    attackSpeed: DRAGON_ABILITY_CONFIG.stats.electric.attackSpeed,
    attackCooldown: DRAGON_ABILITY_CONFIG.stats.electric.attackCooldown,
    range: DRAGON_ABILITY_CONFIG.stats.electric.attackRange,
    moveSpeed: DRAGON_ABILITY_CONFIG.stats.electric.moveSpeed,
    critChance: DRAGON_ABILITY_CONFIG.stats.electric.critChance,
    abilityStrength: DRAGON_ABILITY_CONFIG.stats.electric.abilityStrength,
    abilityCooldown: DRAGON_ABILITY_CONFIG.stats.electric.abilityCooldown,
    aoeRadius: 0,
    slowAmount: 0,
    slowDuration: 0,
    chainCount: DRAGON_ABILITY_CONFIG.electric.chainTargets,
    tauntRadius: DRAGON_ABILITY_CONFIG.stats.electric.tauntRadius,
  },
};

export const EGG_TIER_INFO: Record<
  EggTier,
  { label: string; color: string; hpMult: number; dmgMult: number; hatchSec: number }
> = {
  0: { label: 'Common', color: '#e8e2d5', hpMult: 1.0, dmgMult: 1.0, hatchSec: 6 },
  1: { label: 'Strong', color: '#58d68d', hpMult: 1.25, dmgMult: 1.25, hatchSec: 9 },
  2: { label: 'Elite', color: '#b56fe8', hpMult: 1.55, dmgMult: 1.55, hatchSec: 12 },
  3: { label: 'Solar', color: '#ffd24a', hpMult: 1.9, dmgMult: 1.95, hatchSec: 15 },
};

export interface EnemyArchetype {
  kind: EnemyKind;
  name: string;
  threatCost: number;
  unlockWave: number;
  hp: number;
  speed: number;
  damage: number;
  structureMultiplier: number;
  attackRange: number;
  windupSec: number;
  cooldownSec: number;
  aoeRadius: number;
  rewardEmber: number;
  tests: string;
  color: string;
}

export const ENEMY_ARCHETYPES: Record<EnemyKind, EnemyArchetype> = {
  raider: {
    kind: 'raider',
    name: 'Ash Raider',
    threatCost: 2,
    unlockWave: 1,
    hp: 42,
    speed: 4.1,
    damage: 10,
    structureMultiplier: 1.0,
    attackRange: 2.0,
    windupSec: 0.55,
    cooldownSec: 1.3,
    aoeRadius: 0,
    rewardEmber: 3,
    tests: 'Basic perimeter defense',
    color: '#8f2c3f',
  },
  brute: {
    kind: 'brute',
    name: 'Ironjaw Brute',
    threatCost: 5,
    unlockWave: 2,
    hp: 135,
    speed: 2.6,
    damage: 18,
    structureMultiplier: 2.4,
    attackRange: 2.4,
    windupSec: 0.78,
    cooldownSec: 1.8,
    aoeRadius: 0,
    rewardEmber: 7,
    tests: 'Wall strength & focus fire',
    color: '#522147',
  },
  runner: {
    kind: 'runner',
    name: 'Shadow Stalker',
    threatCost: 3,
    unlockWave: 3,
    hp: 30,
    speed: 6.9,
    damage: 11,
    structureMultiplier: 0.8,
    attackRange: 1.8,
    windupSec: 0.42,
    cooldownSec: 1.0,
    aoeRadius: 0,
    rewardEmber: 4,
    tests: 'Flank coverage & Ice slow',
    color: '#c45224',
  },
  spitter: {
    kind: 'spitter',
    name: 'Blight Spitter',
    threatCost: 4,
    unlockWave: 4,
    hp: 48,
    speed: 3.4,
    damage: 13,
    structureMultiplier: 1.2,
    attackRange: 10.5,
    windupSec: 0.7,
    cooldownSec: 2.0,
    aoeRadius: 0,
    rewardEmber: 6,
    tests: 'Defensive positioning & Attack order',
    color: '#2e7d47',
  },
  siege: {
    kind: 'siege',
    name: 'Siege Golem',
    threatCost: 8,
    unlockWave: 6,
    hp: 240,
    speed: 2.0,
    damage: 24,
    structureMultiplier: 3.0,
    attackRange: 3.0,
    windupSec: 0.9,
    cooldownSec: 2.4,
    aoeRadius: 3.2,
    rewardEmber: 14,
    tests: 'Structure protection & Earth tank',
    color: '#4e4259',
  },
  commander: {
    kind: 'commander',
    name: 'Dusk Commander',
    threatCost: 7,
    unlockWave: 8,
    hp: 165,
    speed: 3.6,
    damage: 16,
    structureMultiplier: 1.4,
    attackRange: 2.6,
    windupSec: 0.65,
    cooldownSec: 1.5,
    aoeRadius: 0,
    rewardEmber: 12,
    tests: 'Target prioritization (rallies allies)',
    color: '#a32876',
  },
  warden: {
    kind: 'warden',
    name: 'Cave Warden',
    threatCost: 22,
    unlockWave: 99,
    hp: 680,
    speed: 3.1,
    damage: 36,
    structureMultiplier: 2.2,
    attackRange: 3.1,
    windupSec: 0.72,
    cooldownSec: 1.65,
    aoeRadius: 3.4,
    rewardEmber: 45,
    tests: 'Requires Green Frontliner tank to shield Fire/Ice/Electric backliners',
    color: '#6b1839',
  },
  boss: {
    kind: 'boss',
    name: 'Nightmare Lord',
    threatCost: 40,
    unlockWave: 15,
    hp: 2400,
    speed: 2.4,
    damage: 42,
    structureMultiplier: 2.5,
    attackRange: 4.5,
    windupSec: 0.9,
    cooldownSec: 2.0,
    aoeRadius: 6.5,
    rewardEmber: 120,
    tests: 'Combined kingdom defense, frontline Green tank & backline DPS',
    color: '#2b0d18',
  },
};

export interface BuildingDef {
  kind: BuildingKind;
  name: string;
  cost: ResourceBundle;
  maxHp: number;
  buildSec: number;
  role: string;
  shortEffect: string;
  radius: number;
  color: string;
}

export const BUILDING_DEFS: Record<BuildingKind, BuildingDef> = {
  nest: {
    kind: 'nest',
    name: 'Dragon Nest',
    cost: { wood: 30, stone: 15, ember: 0 },
    maxHp: 200,
    buildSec: 2.0,
    role: '+2 Dragon Cap & 2x Hatch',
    shortEffect: 'Expands dragon capacity and accelerates incubation',
    radius: 2.2,
    color: '#d97b3e',
  },
  lumber: {
    kind: 'lumber',
    name: 'Lumber Camp',
    cost: { wood: 25, stone: 5, ember: 0 },
    maxHp: 180,
    buildSec: 2.0,
    role: '+3 Wood / 5s',
    shortEffect: 'Generates steady wood income every 5 seconds',
    radius: 2.1,
    color: '#8c5a32',
  },
  quarry: {
    kind: 'quarry',
    name: 'Stone Quarry',
    cost: { wood: 35, stone: 10, ember: 0 },
    maxHp: 220,
    buildSec: 2.5,
    role: '+3 Stone / 5s',
    shortEffect: 'Extracts building stone every 5 seconds',
    radius: 2.2,
    color: '#76828c',
  },
  watchtower: {
    kind: 'watchtower',
    name: 'Watchtower',
    cost: { wood: 30, stone: 30, ember: 5 },
    maxHp: 240,
    buildSec: 2.5,
    role: 'Auto-Turret (14m)',
    shortEffect: 'Fires ember bolts at approaching threats',
    radius: 1.8,
    color: '#c98e46',
  },
  training: {
    kind: 'training',
    name: 'Training Ground',
    cost: { wood: 40, stone: 25, ember: 15 },
    maxHp: 230,
    buildSec: 3.0,
    role: '+25% XP & +15% Rate',
    shortEffect: 'Empowers dragon attack speed and combat XP',
    radius: 2.4,
    color: '#b84239',
  },
  wall: {
    kind: 'wall',
    name: 'Kingdom Wall',
    cost: { wood: 12, stone: 20, ember: 0 },
    maxHp: 340,
    buildSec: 1.2,
    role: 'Heavy Barricade',
    shortEffect: 'Absorbs brutes and shields inner structures',
    radius: 2.0,
    color: '#636c75',
  },
  farm: {
    kind: 'farm',
    name: 'Farmstead',
    cost: { gold: 14, wood: 22, stone: 8, ember: 0 },
    maxHp: 190,
    buildSec: 2.2,
    role: '+5 Food / 5s · Farmer',
    shortEffect: 'Produces steady Food to sustain workers and morale',
    radius: 2.3,
    color: '#a3be4c',
  },
  sanctuary: {
    kind: 'sanctuary',
    name: 'Dragon Sanctuary',
    cost: { gold: 24, wood: 30, stone: 24, ember: 10 },
    maxHp: 280,
    buildSec: 2.8,
    role: '+1 Cap · Dragon Heal',
    shortEffect: 'Houses dragons, accelerates hatching, and heals resting dragons',
    radius: 2.5,
    color: '#e59246',
  },
  recruitment: {
    kind: 'recruitment',
    name: 'Recruitment Camp',
    cost: { gold: 20, wood: 26, stone: 10, ember: 0 },
    maxHp: 200,
    buildSec: 2.5,
    role: 'Attracts Survivors',
    shortEffect: 'Draws wandering frontier survivors you can hire with Gold',
    radius: 2.2,
    color: '#5ca4d6',
  },
  workshop: {
    kind: 'workshop',
    name: 'Kingdom Workshop',
    cost: { gold: 26, wood: 28, stone: 22, ember: 5 },
    maxHp: 240,
    buildSec: 2.6,
    role: '+50% Build & Relic Forge',
    shortEffect: 'Boosts Builders, repairs structures, and unlocks Tier 3 & Relic upgrades',
    radius: 2.3,
    color: '#c97a40',
  },
};

export interface RelicForgeDef {
  id: 'inferno_core' | 'permafrost_heart' | 'bastion_plates' | 'storm_capacitor';
  title: string;
  element: DragonElement;
  relicCost: number;
  goldCost: number;
  description: string;
}

export const RELIC_FORGE_UPGRADES: ReadonlyArray<RelicForgeDef> = [
  {
    id: 'inferno_core',
    title: 'Inferno Core',
    element: 'fire',
    relicCost: 1,
    goldCost: 22,
    description: 'Ember Drakes gain +35% damage and wider flame scorch.',
  },
  {
    id: 'permafrost_heart',
    title: 'Permafrost Heart',
    element: 'ice',
    relicCost: 1,
    goldCost: 22,
    description: 'Frost Wyverns gain +35% damage and longer freeze.',
  },
  {
    id: 'bastion_plates',
    title: 'Bastion Scales',
    element: 'earth',
    relicCost: 1,
    goldCost: 20,
    description: 'Bastion Drakes gain +35% max HP and heavier melee blows.',
  },
  {
    id: 'storm_capacitor',
    title: 'Storm Spire Coil',
    element: 'electric',
    relicCost: 1,
    goldCost: 22,
    description: 'Storm Drakes strike +35% faster with empowered arcs.',
  },
];

export interface UpgradeCardDef {
  id: string;
  title: string;
  description: string;
  tag: 'player' | 'dragons' | 'kingdom' | 'ember';
}

export const UPGRADE_CARDS: UpgradeCardDef[] = [
  {
    id: 'ember_edge',
    title: 'Tempered Ember Edge',
    description: 'Guardian blade damage +30% and wider slash arc.',
    tag: 'player',
  },
  {
    id: 'fleet_stride',
    title: 'Windwalker Stride',
    description: 'Move 15% faster and Dash cooldown drops by 30%.',
    tag: 'player',
  },
  {
    id: 'dragon_fury',
    title: 'Draconic Ferocity',
    description: 'All dragons deal +25% damage and gain +1 level.',
    tag: 'dragons',
  },
  {
    id: 'sky_swiftness',
    title: 'Gale Wingbeat',
    description: 'Dragon attack speed +20% and revive timer -35%.',
    tag: 'dragons',
  },
  {
    id: 'bastion_masonry',
    title: 'Reinforced Masonry',
    description: 'All Kingdom structures gain +40% max HP and full repair.',
    tag: 'kingdom',
  },
  {
    id: 'hearth_surge',
    title: 'Eternal Hearthfire',
    description: 'Campfire max HP +80, healed +120, and warm aura heals faster.',
    tag: 'kingdom',
  },
  {
    id: 'ember_harvest',
    title: 'Ember Resonance',
    description: 'Gain +20 Wood, +20 Stone, +15 Ember immediately and +35% harvest yield.',
    tag: 'ember',
  },
  {
    id: 'watch_optics',
    title: 'Citadel Ballistics',
    description: 'Watchtowers fire 30% faster with +3m detection range.',
    tag: 'kingdom',
  },
];

export interface RelicDef {
  id: string;
  name: string;
  effectText: string;
  lore: string;
  color: string;
}

export const RELIC_DEFS: Record<string, RelicDef> = {
  sentinel_aegis: {
    id: 'sentinel_aegis',
    name: 'Sentinel Aegis',
    effectText: '+40 Guardian Max HP & +1 Oathbound Protector Knight',
    lore: 'Before the Ashwood rift opened, knights stood watch along the eastern mile-stone.',
    color: '#78d4ff',
  },
  glacial_waystone: {
    id: 'glacial_waystone',
    name: 'Glacial Waystone',
    effectText: '+18% Dragon Damage & +20 Ember',
    lore: 'Carved from frostquarry slate, its runes still sharpen draconic breath.',
    color: '#5ec9ff',
  },
  bannerman_horn: {
    id: 'bannerman_horn',
    name: 'Bannerman Horn',
    effectText: '+18% Dragon Attack Speed & +2 Oathbound Protector Knights',
    lore: 'Sounded across the Shattered Bastion to summon the last loyal spearmen.',
    color: '#ffd24a',
  },
  sunfire_crown: {
    id: 'sunfire_crown',
    name: 'Sunfire Crown Shard',
    effectText: '+150 Campfire Max HP, +25% All Damage & +1 Protector Knight',
    lore: 'A fragment of the First Crown, forged to seal the Abyssal Maw once and for all.',
    color: '#ff9642',
  },
};

export interface StoryChapter {
  act: string;
  title: string;
  narration: string;
  visualCue: 'caves' | 'campfire' | 'eggs' | 'kingdom';
  durationSec: number;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    act: 'Act I',
    title: 'Four Rifts Across Elderglen',
    narration:
      'Four sealed caves split the frontiers of Elderglen—Ashwood Den, Rimefang Hollow, Stormcrag Vault, and the Abyssal Maw. Only breaking them in order will shatter the Void Ward.',
    visualCue: 'caves',
    durationSec: 4.5,
  },
  {
    act: 'Act II',
    title: 'The Last Sunfire Hearth',
    narration:
      'Ancient watchposts fell to shadow garrisons, yet roads still wind outward from your central Campfire through lost ruins and trapped dragon cages.',
    visualCue: 'campfire',
    durationSec: 4.5,
  },
  {
    act: 'Act III',
    title: 'From Steel to Dragonfire',
    narration:
      'You begin with your Guardian blade and a Common green Wind/Nature dragon. Discover Rare yellow electric dragons that stun and chain, Super Rare blue ice dragons that freeze enemies, and Legendary red fire dragons that burn foes.',
    visualCue: 'eggs',
    durationSec: 4.5,
  },
  {
    act: 'Act IV',
    title: 'Reclaim the Valley',
    narration:
      'Explore each frontier, reclaim fallen ruins for ancient relics, prepare a balanced dragon vanguard, and collapse all four caves one by one.',
    visualCue: 'kingdom',
    durationSec: 4.5,
  },
];

export type WallTier = 0 | 1 | 2 | 3;
export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface WallTierDef {
  tier: WallTier;
  name: string;
  cost: ResourceBundle;
  maxHpPerSide: number;
  dragonMult: number;
  thornsDmg: number;
  description: string;
}

export const PERIMETER_WALL_RADIUS = 13.5;

export const WALL_TIER_DEFS: Record<WallTier, WallTierDef> = {
  0: {
    tier: 0,
    name: 'Unwalled Camp',
    cost: { wood: 0, stone: 0, ember: 0 },
    maxHpPerSide: 0,
    dragonMult: 0.5,
    thornsDmg: 0,
    description: 'No perimeter wall — Dragons are 50% weaker!',
  },
  1: {
    tier: 1,
    name: 'Timber Palisade',
    cost: { wood: 20, stone: 10, ember: 0 },
    maxHpPerSide: 220,
    dragonMult: 1.5,
    thornsDmg: 0,
    description: 'Auto 4-sided timber wall — Dragons +50% stronger!',
  },
  2: {
    tier: 2,
    name: 'Stone Rampart',
    cost: { wood: 30, stone: 38, ember: 10 },
    maxHpPerSide: 440,
    dragonMult: 1.75,
    thornsDmg: 4,
    description: '4-sided mortared stone rampart — Dragons +75% stronger!',
  },
  3: {
    tier: 3,
    name: 'Sunfire Citadel',
    cost: { wood: 45, stone: 65, ember: 25 },
    maxHpPerSide: 760,
    dragonMult: 2.0,
    thornsDmg: 12,
    description: '4-sided iron-ember citadel — Dragons +100% stronger & Ember Thorns!',
  },
};

export function getCaveRequiredLevel(caveIndex: number): number {
  return caveIndex + 1; // Cave 1 -> Lv 2+, Cave 2 -> Lv 3+, Cave 3 -> Lv 4+, Cave 4 -> Lv 5+
}

export const WORLD_RADIUS = 400; // Massive 800m diameter exploration region with long winding roads & 4 frontier zones
export const CAMP_RADIUS = 18;
export const FINAL_WAVE = 15;
export const NIGHT_EVERY = 1; // Every wave is 1 full Day -> Night cycle; enemies launch a huge raid every night
