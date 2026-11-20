import {
  BUILDING_DEFS,
  type BuildingKind,
  DRAGON_ARCHETYPES,
  type DragonElement,
  type EggTier,
  ENEMY_ARCHETYPES,
  type EnemyKind,
  type KingdomResources,
  NIGHT_EVERY,
  type ResourceBundle,
  UPGRADE_CARDS,
  type UpgradeCardDef,
} from './data';
import { DRAGON_ABILITY_CONFIG } from './dragonConfig';
import type { SeededRng } from './rng';

export function getDragonLevelStatMult(level: number): number {
  if (level <= 1) return 0.55; // Dragons start weak at Lv 1 so leveling matters before raiding caves
  if (level === 2) return 0.85;
  if (level === 3) return 1.15;
  if (level === 4) return 1.48;
  return 1.85 + 0.32 * (level - 5);
}

/**
 * Controlled mathematical difficulty budget.
 * Never scales enemy HP up based on dragon count!
 * Destroying Monster Caves permanently REDUCES enemy threat budget.
 */
export function computeWaveBudget(
  wave: number,
  aliveCaves: number,
  claimedOutposts = 0,
): number {
  const safeWave = Math.max(1, wave);
  const baseBudget = 10 + safeWave * 5.0 + Math.pow(safeWave, 1.34) * 1.05;
  // Each destroyed cave removes 15% of external pressure (4 alive = 1.0, 0 alive = 0.4)
  const caveFactor = 0.4 + 0.15 * Math.max(0, Math.min(4, aliveCaves));
  // Controlled territory expansion increases defense pressure (+12% per claimed outpost)
  const territoryFactor = 1 + Math.max(0, claimedOutposts) * 0.12;
  const isNight = safeWave % NIGHT_EVERY === 0;
  const phaseFactor = isNight ? 1.45 : 0.85;
  return Math.round(baseBudget * caveFactor * territoryFactor * phaseFactor);
}

export function selectWaveComposition(
  wave: number,
  aliveCaves: number,
  rng: SeededRng,
  claimedOutposts = 0,
): EnemyKind[] {
  const budget = computeWaveCompositionBudget(wave, aliveCaves, claimedOutposts);
  const unlocked = (Object.values(ENEMY_ARCHETYPES) as (typeof ENEMY_ARCHETYPES)[EnemyKind][])
    .filter((e) => e.kind !== 'boss' && e.unlockWave <= wave);

  const list: EnemyKind[] = [];
  if (wave >= 15) {
    list.push('boss');
  }

  let remaining = budget;
  let guard = 0;
  while (remaining >= 2 && guard < 120) {
    guard++;
    const affordable = unlocked.filter((e) => e.threatCost <= remaining);
    if (affordable.length === 0) break;
    const chosen = rng.pick(affordable);
    list.push(chosen.kind);
    remaining -= chosen.threatCost;
  }

  if (list.length === 0) {
    list.push('raider');
  }
  return list;
}

function computeWaveCompositionBudget(
  wave: number,
  aliveCaves: number,
  claimedOutposts = 0,
): number {
  const total = computeWaveBudget(wave, aliveCaves, claimedOutposts);
  return wave >= 15 ? Math.max(16, total - 18) : total;
}

export function computeEggTierFromDistance(distFromCamp: number): EggTier {
  if (distFromCamp >= 84) return 3; // Solar / Golden reach (Obsidian & Deep Bastion)
  if (distFromCamp >= 52) return 2; // Elite frontier wilds
  if (distFromCamp >= 22) return 1; // Strong outer woods
  return 0; // Common sanctuary edge
}

/**
 * Rarity-weighted wild egg discovery progression:
 * - Common Green (earth): dominant early green-colored dragon eggs
 * - Rare Yellow (electric): rare electric dragon eggs (yellow, stuns and multi-attacks)
 * - Super Rare Blue (ice): very rare ice dragon eggs (blue, freezes enemies)
 * - Legendary Red (fire): rarest legendary dragon eggs (red, burns people)
 */
export function pickWildEggElementByProgress(
  cavesDestroyed: number,
  rng: SeededRng,
): DragonElement {
  const weights: Array<{ element: DragonElement; weight: number }> =
    cavesDestroyed <= 0
      ? [
          { element: 'earth', weight: 85 },
          { element: 'electric', weight: 15 },
        ]
      : cavesDestroyed === 1
        ? [
            { element: 'earth', weight: 65 },
            { element: 'electric', weight: 28 },
            { element: 'ice', weight: 7 },
          ]
        : cavesDestroyed === 2
          ? [
              { element: 'earth', weight: 52 },
              { element: 'electric', weight: 28 },
              { element: 'ice', weight: 15 },
              { element: 'fire', weight: 5 },
            ]
          : [
              { element: 'earth', weight: 45 },
              { element: 'electric', weight: 27 },
              { element: 'ice', weight: 18 },
              { element: 'fire', weight: 10 },
            ];

  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng.range(0, total);
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.element;
  }
  return 'earth';
}

export function canAfford(bag: ResourceBundle, cost: ResourceBundle): boolean {
  return (
    (bag.gold ?? 0) >= (cost.gold ?? 0) &&
    bag.wood >= cost.wood &&
    bag.stone >= cost.stone &&
    (bag.food ?? 0) >= (cost.food ?? 0) &&
    bag.ember >= cost.ember
  );
}

export function spendResources(bag: ResourceBundle, cost: ResourceBundle): KingdomResources {
  return {
    gold: Math.max(0, (bag.gold ?? 0) - (cost.gold ?? 0)),
    wood: Math.max(0, bag.wood - cost.wood),
    stone: Math.max(0, bag.stone - cost.stone),
    food: Math.max(0, (bag.food ?? 0) - (cost.food ?? 0)),
    ember: Math.max(0, bag.ember - cost.ember),
  };
}

export function buildingCost(kind: BuildingKind): ResourceBundle {
  return BUILDING_DEFS[kind].cost;
}

export function computeDragonDpsEstimate(
  element: DragonElement,
  level: number,
  tier: EggTier,
  dmgMult: number,
  rateMult: number,
  wallMult: number = 1.0,
): number {
  const arch = DRAGON_ARCHETYPES[element];
  const cfg = DRAGON_ABILITY_CONFIG.stats[element];
  const tierMult = [1, 1.25, 1.55, 1.95][tier];
  const lvlMult = getDragonLevelStatMult(level);
  const critExpectation = 1 + cfg.critChance * (cfg.critMultiplier - 1);
  const singleTargetDps =
    arch.baseDmg * tierMult * lvlMult * dmgMult * wallMult * critExpectation * (arch.attackSpeed * rateMult);
  let multiFactor = 1.0;
  if (element === 'fire') {
    multiFactor = 1.35 * DRAGON_ABILITY_CONFIG.fire.burnBonusDamageMult;
  } else if (element === 'earth') {
    multiFactor = 1.42; // high single-target combo rotation (swipe/whip/bite)
  } else if (element === 'electric') {
    multiFactor = 1.55;
  }
  return Number((singleTargetDps * multiFactor).toFixed(1));
}

export function getSynergisticUpgrades(
  hasDragons: boolean,
  hasBuildings: boolean,
  rng: SeededRng,
): UpgradeCardDef[] {
  const pool = UPGRADE_CARDS.filter((card) => {
    if (card.tag === 'dragons' && !hasDragons) return false;
    if (card.id === 'watch_optics' && !hasBuildings) return false;
    return true;
  });
  const copy = [...pool];
  const picked: UpgradeCardDef[] = [];
  while (picked.length < 3 && copy.length > 0) {
    const idx = rng.int(0, copy.length - 1);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}
