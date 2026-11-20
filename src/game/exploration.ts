import type { BiomeId } from './regionMap';
import type { ResourceBundle } from './data';

export type ExplorationSiteCategory =
  | 'settlement'
  | 'shrine'
  | 'grove'
  | 'treasure';

export interface AbandonedSettlementDef {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  supplies: Partial<ResourceBundle>;
  survivorsCount: number;
  recruitCostGold: number;
  lore: string;
}

export interface AncientShrineDef {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  blessingId: 'hearth_blessing' | 'gale_blessing' | 'storm_blessing';
  blessingText: string;
  color: string;
  trialEnemies: number;
}

export interface ResourceGroveDef {
  id: string;
  name: string;
  biome: BiomeId;
  kind: 'forest' | 'farmland' | 'quarry';
  x: number;
  z: number;
  radius: number;
  description: string;
}

export interface TreasureSiteDef {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  reward: Partial<ResourceBundle>;
  lore: string;
}

export interface WildlifeState {
  id: number;
  kind: 'deer' | 'rabbit';
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  wanderTimer: number;
  fleeing: boolean;
}

export interface SettlementState {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  suppliesLooted: boolean;
  claimed: boolean;
  hp: number;
  maxHp: number;
  hasWall: boolean;
  survivorsRemaining: number;
  recruitCostGold: number;
}

export interface ShrineState {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  blessingId: 'hearth_blessing' | 'gale_blessing' | 'storm_blessing';
  blessingText: string;
  color: string;
  activated: boolean;
  trialStarted: boolean;
}

export interface TreasureState {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  opened: boolean;
  reward: Partial<ResourceBundle>;
  lore: string;
}

export const ABANDONED_SETTLEMENTS: ReadonlyArray<AbandonedSettlementDef> = [
  {
    id: 'settle_east_hamlet',
    name: 'Timberwatch Hamlet',
    biome: 'woods',
    x: 46,
    z: 16,
    supplies: { gold: 18, wood: 24, food: 14 },
    survivorsCount: 2,
    recruitCostGold: 12,
    lore: 'An abandoned woodcutter hamlet along King’s Timber Road; smoke still curls from cold ashes.',
  },
  {
    id: 'settle_south_meadow',
    name: 'Sunmeadow Stead',
    biome: 'frost',
    x: -44,
    z: 38,
    supplies: { gold: 20, wood: 16, food: 22 },
    survivorsCount: 2,
    recruitCostGold: 12,
    lore: 'Overgrown farm plots and a broken barn mark the southern valley stead.',
  },
  {
    id: 'settle_west_mill',
    name: 'Old Bastion Mill',
    biome: 'bastion',
    x: -66,
    z: -48,
    supplies: { gold: 26, wood: 22, stone: 18 },
    survivorsCount: 2,
    recruitCostGold: 14,
    lore: 'Shattered flagstones surround a fortified millstone overlooking the northwest causeway.',
  },
  {
    id: 'settle_north_gate',
    name: 'Ashgate Outpost',
    biome: 'obsidian',
    x: 48,
    z: -74,
    supplies: { gold: 32, wood: 20, stone: 20, ember: 10 },
    survivorsCount: 2,
    recruitCostGold: 15,
    lore: 'A forward watchcamp at the foot of Ashfall Ascent holding brave frontier survivors.',
  },
];

export const ANCIENT_SHRINES: ReadonlyArray<AncientShrineDef> = [
  {
    id: 'shrine_hearth',
    name: 'Shrine of Hearthfire',
    biome: 'woods',
    x: 78,
    z: -56,
    blessingId: 'hearth_blessing',
    blessingText: '+100 Campfire Max HP, +1 Ancient Relic & +18 Gold',
    color: '#ffaa44',
    trialEnemies: 3,
  },
  {
    id: 'shrine_rime',
    name: 'Shrine of Glacial Wind',
    biome: 'frost',
    x: -94,
    z: 112,
    blessingId: 'gale_blessing',
    blessingText: '+12% Guardian Speed, +15% Dragon Attack Rate & +1 Relic',
    color: '#66d9ff',
    trialEnemies: 4,
  },
  {
    id: 'shrine_tempest',
    name: 'Shrine of Sky Tempest',
    biome: 'bastion',
    x: -115,
    z: -135,
    blessingId: 'storm_blessing',
    blessingText: '+18% All Dragon Damage, +1 Ancient Relic & +25 Gold',
    color: '#ffd24a',
    trialEnemies: 4,
  },
];

export const RESOURCE_GROVES: ReadonlyArray<ResourceGroveDef> = [
  {
    id: 'grove_timber_east',
    name: 'Whispering Timber Grove',
    biome: 'woods',
    kind: 'forest',
    x: 34,
    z: -18,
    radius: 11,
    description: 'Dense ancient pines ideal for Woodcutters and Lumber Camps.',
  },
  {
    id: 'grove_farmland_south',
    name: 'Golden Wheat Clearing',
    biome: 'sanctuary',
    kind: 'farmland',
    x: -24,
    z: 26,
    radius: 10,
    description: 'Fertile sunlit soil suited for Farms and steady Food harvests.',
  },
  {
    id: 'grove_quarry_west',
    name: 'Slatehorn Ridge',
    biome: 'frost',
    kind: 'quarry',
    x: -54,
    z: 12,
    radius: 10,
    description: 'Exposed basalt shelves rich in stone for ramparts and workshops.',
  },
  {
    id: 'grove_farmland_ne',
    name: 'Greenbrook Meadow',
    biome: 'woods',
    kind: 'farmland',
    x: 56,
    z: 44,
    radius: 11,
    description: 'Broad meadow watered by mountain runoff—ideal for an outpost Farm.',
  },
];

export const TREASURE_SITES: ReadonlyArray<TreasureSiteDef> = [
  {
    id: 'treasure_creek_chest',
    name: 'Sunken Merchant Wagon',
    biome: 'woods',
    x: 68,
    z: 52,
    reward: { gold: 28, wood: 14, food: 10 },
    lore: 'An overturned supply cart wedged beside mossy boulders.',
  },
  {
    id: 'treasure_frost_cache',
    name: 'Miner’s Strongbox',
    biome: 'frost',
    x: -88,
    z: 44,
    reward: { gold: 34, stone: 24, ember: 8 },
    lore: 'A frost-locked iron coffer left by quarrymen fleeing the first winter raid.',
  },
  {
    id: 'treasure_bastion_vault',
    name: 'Royal Paymaster Chest',
    biome: 'bastion',
    x: -98,
    z: -78,
    reward: { gold: 45, ember: 14 },
    lore: 'Stamped with the Sunfire crest, still brimming with campaign coin.',
  },
];

export function createInitialSettlements(): SettlementState[] {
  return ABANDONED_SETTLEMENTS.map((def) => ({
    id: def.id,
    name: def.name,
    biome: def.biome,
    x: def.x,
    z: def.z,
    suppliesLooted: false,
    claimed: false,
    hp: 260,
    maxHp: 260,
    hasWall: false,
    survivorsRemaining: def.survivorsCount,
    recruitCostGold: def.recruitCostGold,
  }));
}

export function createInitialShrines(): ShrineState[] {
  return ANCIENT_SHRINES.map((def) => ({
    id: def.id,
    name: def.name,
    biome: def.biome,
    x: def.x,
    z: def.z,
    blessingId: def.blessingId,
    blessingText: def.blessingText,
    color: def.color,
    activated: false,
    trialStarted: false,
  }));
}

export function createInitialTreasures(): TreasureState[] {
  return TREASURE_SITES.map((def) => ({
    id: def.id,
    name: def.name,
    biome: def.biome,
    x: def.x,
    z: def.z,
    opened: false,
    reward: { ...def.reward },
    lore: def.lore,
  }));
}

export function createInitialWildlife(startId: number): WildlifeState[] {
  const anchors: Array<{ kind: 'deer' | 'rabbit'; x: number; z: number }> = [
    { kind: 'deer', x: 26, z: -12 },
    { kind: 'rabbit', x: 29, z: -15 },
    { kind: 'deer', x: -22, z: 22 },
    { kind: 'rabbit', x: -26, z: 28 },
    { kind: 'rabbit', x: 18, z: 24 },
    { kind: 'deer', x: 42, z: 32 },
    { kind: 'deer', x: -40, z: -18 },
    { kind: 'rabbit', x: -34, z: -26 },
    { kind: 'deer', x: 52, z: -42 },
    { kind: 'rabbit', x: 14, z: -32 },
  ];
  return anchors.map((a, idx) => ({
    id: startId + idx,
    kind: a.kind,
    x: a.x,
    z: a.z,
    homeX: a.x,
    homeZ: a.z,
    vx: 0,
    vz: 0,
    facingX: Math.cos(idx * 1.1),
    facingZ: Math.sin(idx * 1.1),
    wanderTimer: (idx % 4) * 0.8 + 0.5,
    fleeing: false,
  }));
}

export function isNearResourceGrove(
  x: number,
  z: number,
  kind: ResourceGroveDef['kind'],
): ResourceGroveDef | null {
  for (const grove of RESOURCE_GROVES) {
    if (grove.kind !== kind) continue;
    if (Math.hypot(grove.x - x, grove.z - z) <= grove.radius + 4) {
      return grove;
    }
  }
  return null;
}

export function getCaveApproachClues(): Array<{ x: number; z: number; caveIndex: number; kind: 'charred_tree' | 'tracks' }> {
  // Deterministic environmental warning clues placed 14..32m along approaches to the 4 Caves
  const caveCoords = [
    { index: 1, x: 210, z: 75 },
    { index: 2, x: -260, z: 190 },
    { index: 3, x: -275, z: -215 },
    { index: 4, x: 220, z: -310 },
  ];
  const clues: Array<{ x: number; z: number; caveIndex: number; kind: 'charred_tree' | 'tracks' }> = [];
  for (const c of caveCoords) {
    const len = Math.hypot(c.x, c.z) || 1;
    const ux = -c.x / len;
    const uz = -c.z / len;
    const px = -uz;
    const pz = ux;
    clues.push(
      { x: c.x + ux * 16 + px * 5, z: c.z + uz * 16 + pz * 5, caveIndex: c.index, kind: 'charred_tree' },
      { x: c.x + ux * 24 - px * 6, z: c.z + uz * 24 - pz * 6, caveIndex: c.index, kind: 'charred_tree' },
      { x: c.x + ux * 18, z: c.z + uz * 18, caveIndex: c.index, kind: 'tracks' },
      { x: c.x + ux * 28, z: c.z + uz * 28, caveIndex: c.index, kind: 'tracks' },
    );
  }
  return clues;
}
