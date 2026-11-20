import type { EnemyKind, KingdomResources, ResourceBundle } from './data';

export type SettlementMorale = 'prospering' | 'steady' | 'hungry';

export type KingdomStageId =
  | 'survival'
  | 'settlement'
  | 'expansion'
  | 'kingdom'
  | 'nightmare';

export interface KingdomStageInfo {
  id: KingdomStageId;
  index: number;
  label: string;
  summary: string;
}

export const INITIAL_RESOURCES: KingdomResources = {
  gold: 35,
  wood: 40,
  stone: 25,
  food: 25,
  ember: 10,
};

export const FOOD_UPKEEP_PER_WORKER = 2;

export function grantResources(
  bag: ResourceBundle,
  delta: Partial<ResourceBundle>,
): KingdomResources {
  return {
    gold: Math.max(0, (bag.gold ?? 0) + (delta.gold ?? 0)),
    wood: Math.max(0, bag.wood + (delta.wood ?? 0)),
    stone: Math.max(0, bag.stone + (delta.stone ?? 0)),
    food: Math.max(0, (bag.food ?? 0) + (delta.food ?? 0)),
    ember: Math.max(0, bag.ember + (delta.ember ?? 0)),
  };
}

export function computeEnemyGoldDrop(kind: EnemyKind): number {
  switch (kind) {
    case 'raider':
      return 2;
    case 'runner':
      return 3;
    case 'spitter':
      return 4;
    case 'brute':
      return 5;
    case 'commander':
      return 9;
    case 'siege':
      return 10;
    case 'warden':
      return 28;
    case 'boss':
      return 85;
  }
}

export function computeDailyFoodUpkeep(workerCount: number): number {
  return Math.max(0, workerCount) * FOOD_UPKEEP_PER_WORKER;
}

export function applyDailyFoodUpkeep(
  resources: ResourceBundle,
  workerCount: number,
): {
  resources: KingdomResources;
  upkeep: number;
  morale: SettlementMorale;
} {
  const normalized = grantResources(resources, {});
  const upkeep = computeDailyFoodUpkeep(workerCount);
  if (upkeep === 0) {
    return {
      resources: normalized,
      upkeep: 0,
      morale: normalized.food >= 20 ? 'prospering' : 'steady',
    };
  }
  if (normalized.food >= upkeep) {
    const remainingFood = normalized.food - upkeep;
    return {
      resources: { ...normalized, food: remainingFood },
      upkeep,
      morale: remainingFood >= upkeep * 1.5 ? 'prospering' : 'steady',
    };
  }
  return {
    resources: { ...normalized, food: 0 },
    upkeep,
    morale: 'hungry',
  };
}

export function getMoraleWorkSpeedMult(morale: SettlementMorale): number {
  if (morale === 'prospering') return 1.15;
  if (morale === 'hungry') return 0.65;
  return 1.0;
}

export type MarketTradeAction = 'buy_food' | 'buy_wood' | 'sell_wood' | 'sell_stone';

export interface MarketTradeDef {
  id: MarketTradeAction;
  label: string;
  cost: ResourceBundle;
  gain: Partial<ResourceBundle>;
}

export const MARKET_TRADES: Record<MarketTradeAction, MarketTradeDef> = {
  buy_food: {
    id: 'buy_food',
    label: 'Buy Provisions (12G → +16 Food)',
    cost: { gold: 12, wood: 0, stone: 0, ember: 0 },
    gain: { food: 16 },
  },
  buy_wood: {
    id: 'buy_wood',
    label: 'Buy Timber (14G → +20 Wood)',
    cost: { gold: 14, wood: 0, stone: 0, ember: 0 },
    gain: { wood: 20 },
  },
  sell_wood: {
    id: 'sell_wood',
    label: 'Trade Timber (25W → +14 Gold)',
    cost: { wood: 25, stone: 0, ember: 0 },
    gain: { gold: 14 },
  },
  sell_stone: {
    id: 'sell_stone',
    label: 'Trade Quarry Stone (20S → +16 Gold)',
    cost: { wood: 0, stone: 20, ember: 0 },
    gain: { gold: 16 },
  },
};

export function formatResourceCost(cost: ResourceBundle): string {
  const parts: string[] = [];
  if ((cost.gold ?? 0) > 0) parts.push(`${cost.gold}G`);
  if (cost.wood > 0) parts.push(`${cost.wood}W`);
  if (cost.stone > 0) parts.push(`${cost.stone}S`);
  if ((cost.food ?? 0) > 0) parts.push(`${cost.food}F`);
  if (cost.ember > 0) parts.push(`${cost.ember}E`);
  return parts.join(' · ') || 'Free';
}

export function computeKingdomStage(params: {
  wallTier: number;
  workerCount: number;
  buildingsBuilt: number;
  claimedOutposts: number;
  cavesDestroyed: number;
  maxDragonLevel: number;
}): KingdomStageInfo {
  const { wallTier, workerCount, buildingsBuilt, claimedOutposts, cavesDestroyed, maxDragonLevel } = params;

  if (cavesDestroyed >= 3 || (cavesDestroyed >= 2 && maxDragonLevel >= 4)) {
    return {
      id: 'nightmare',
      index: 5,
      label: 'Stage V · The Nightmare Threat',
      summary: 'March upon the final Obsidian strongholds and slay the Nightmare Lord.',
    };
  }
  if (claimedOutposts >= 2 || (wallTier >= 2 && workerCount >= 4 && buildingsBuilt >= 4)) {
    return {
      id: 'kingdom',
      index: 4,
      label: 'Stage IV · Kingdom',
      summary: 'Coordinate fortified outposts, veteran dragons, and relics to collapse the Caves.',
    };
  }
  if (claimedOutposts >= 1 || workerCount >= 2 || maxDragonLevel >= 2) {
    return {
      id: 'expansion',
      index: 3,
      label: 'Stage III · Expansion',
      summary: 'Explore the outer wilds, claim outposts, and hatch elemental dragons.',
    };
  }
  if (wallTier >= 1 || buildingsBuilt >= 1 || workerCount >= 1) {
    return {
      id: 'settlement',
      index: 2,
      label: 'Stage II · Settlement',
      summary: 'Recruit survivors, grow food & timber, and fortify your camp walls.',
    };
  }
  return {
    id: 'survival',
    index: 1,
    label: 'Stage I · Survival',
    summary: 'Protect the lone campfire, gather supplies, and build your first perimeter wall.',
  };
}
