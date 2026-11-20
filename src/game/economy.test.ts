import test from 'node:test';
import assert from 'node:assert/strict';
import { canAfford, spendResources } from './balance';
import {
  applyDailyFoodUpkeep,
  computeEnemyGoldDrop,
  computeKingdomStage,
  FOOD_UPKEEP_PER_WORKER,
  getMoraleWorkSpeedMult,
  INITIAL_RESOURCES,
} from './economy';
import { createInitialState, tradeAtSettlement } from './engine';

test('economy handles gold, food, wood, stone, and ember spending cleanly', () => {
  const bag = { ...INITIAL_RESOURCES };
  assert.equal(canAfford(bag, { gold: 20, wood: 30, stone: 10, food: 10, ember: 5 }), true);
  assert.equal(canAfford(bag, { gold: 999, wood: 0, stone: 0, ember: 0 }), false);

  const after = spendResources(bag, { gold: 15, wood: 20, stone: 5, food: 5, ember: 0 });
  assert.equal(after.gold, INITIAL_RESOURCES.gold - 15);
  assert.equal(after.wood, INITIAL_RESOURCES.wood - 20);
  assert.equal(after.food, INITIAL_RESOURCES.food - 5);
});

test('daily food upkeep sustains workers or triggers hungry morale when food runs out', () => {
  const workers = 4;
  const wellFed = applyDailyFoodUpkeep({ gold: 30, wood: 30, stone: 20, food: 30, ember: 5 }, workers);
  assert.equal(wellFed.upkeep, workers * FOOD_UPKEEP_PER_WORKER);
  assert.equal(wellFed.resources.food, 30 - workers * FOOD_UPKEEP_PER_WORKER);
  assert.equal(wellFed.morale, 'prospering');
  assert.ok(getMoraleWorkSpeedMult(wellFed.morale) > 1);

  const starving = applyDailyFoodUpkeep({ gold: 30, wood: 30, stone: 20, food: 2, ember: 5 }, workers);
  assert.equal(starving.resources.food, 0);
  assert.equal(starving.morale, 'hungry');
  assert.ok(getMoraleWorkSpeedMult(starving.morale) < 1);
});

test('enemy gold drops and settlement trading behave deterministically', () => {
  assert.ok(computeEnemyGoldDrop('boss') > computeEnemyGoldDrop('warden'));
  assert.ok(computeEnemyGoldDrop('warden') > computeEnemyGoldDrop('raider'));

  const state = createInitialState(101);
  const goldBefore = state.resources.gold ?? 0;
  const foodBefore = state.resources.food ?? 0;
  const res = tradeAtSettlement(state, 'buy_food');
  assert.equal(res.ok, true);
  assert.equal(state.resources.gold, goldBefore - 12);
  assert.equal(state.resources.food, foodBefore + 16);
});

test('kingdom progression advances smoothly across all 5 stages', () => {
  assert.equal(
    computeKingdomStage({ wallTier: 0, workerCount: 0, buildingsBuilt: 0, claimedOutposts: 0, cavesDestroyed: 0, maxDragonLevel: 1 }).id,
    'survival',
  );
  assert.equal(
    computeKingdomStage({ wallTier: 1, workerCount: 0, buildingsBuilt: 1, claimedOutposts: 0, cavesDestroyed: 0, maxDragonLevel: 1 }).id,
    'settlement',
  );
  assert.equal(
    computeKingdomStage({ wallTier: 1, workerCount: 2, buildingsBuilt: 2, claimedOutposts: 1, cavesDestroyed: 0, maxDragonLevel: 2 }).id,
    'expansion',
  );
  assert.equal(
    computeKingdomStage({ wallTier: 2, workerCount: 5, buildingsBuilt: 5, claimedOutposts: 2, cavesDestroyed: 1, maxDragonLevel: 3 }).id,
    'kingdom',
  );
  assert.equal(
    computeKingdomStage({ wallTier: 3, workerCount: 6, buildingsBuilt: 6, claimedOutposts: 3, cavesDestroyed: 3, maxDragonLevel: 5 }).id,
    'nightmare',
  );
});
