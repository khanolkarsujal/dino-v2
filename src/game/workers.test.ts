import test from 'node:test';
import assert from 'node:assert/strict';
import { ABANDONED_SETTLEMENTS } from './exploration';
import {
  assignWorkerRole,
  canRecruitSurvivor,
  createWorkerFromSurvivor,
  pickSuggestedWorkerRole,
} from './workers';
import { createInitialState, recruitSurvivorAt, stepSimulation, type GameInput } from './engine';

const IDLE_INPUT: GameInput = {
  moveX: 0,
  moveZ: 0,
  attackJustPressed: false,
  dashJustPressed: false,
  interactJustPressed: false,
  commandJustPressed: null,
};

test('survivor recruitment spends Gold and sends worker walking toward Campfire without teleporting', () => {
  const state = createInitialState(303);
  state.phase = 'playing';
  const target = state.survivors[0];
  assert.ok(target, 'Initial world should spawn waiting survivors at abandoned settlements');
  const startDist = Math.hypot(target.x, target.z);
  assert.ok(startDist > 20, 'Survivor starts out in the wild settlement');

  const goldBefore = state.resources.gold ?? 0;
  const res = recruitSurvivorAt(state, target.id);
  assert.equal(res.ok, true);
  assert.equal(state.resources.gold, goldBefore - target.costGold);
  assert.equal(state.workers.length, 1);

  const worker = state.workers[0];
  assert.equal(worker.x, target.x);
  assert.equal(worker.z, target.z);
  assert.equal(worker.aiState, 'moving');

  // Step 2 seconds and confirm worker physically walks closer to Campfire
  for (let i = 0; i < 40; i++) {
    stepSimulation(state, 0.05, IDLE_INPUT);
  }
  const newDist = Math.hypot(worker.x, worker.z);
  assert.ok(newDist < startDist - 3, 'Recruited survivor must travel smoothly toward camp');
});

test('non-combat workers flee inside perimeter when night falls while guards defend', () => {
  const state = createInitialState(304);
  state.phase = 'playing';

  const wWood = createWorkerFromSurvivor(
    9101,
    0,
    { id: 9001, name: 'Alden', x: 24, z: 0, costGold: 12, sourceId: ABANDONED_SETTLEMENTS[0].id, recruited: true },
    'woodcutter',
  );
  wWood.arrivedAtCamp = true;
  wWood.aiState = 'working';

  const wGuard = createWorkerFromSurvivor(
    9102,
    1,
    { id: 9002, name: 'Bryn', x: 6, z: 6, costGold: 12, sourceId: ABANDONED_SETTLEMENTS[0].id, recruited: true },
    'guard',
  );
  wGuard.arrivedAtCamp = true;
  wGuard.aiState = 'idle';

  state.workers.push(wWood, wGuard);
  state.isNight = true;
  state.waveActive = true;
  state.prepTimer = 0;

  for (let i = 0; i < 20; i++) {
    stepSimulation(state, 0.05, IDLE_INPUT);
  }

  assert.equal(wWood.aiState, 'fleeing', 'Woodcutter must flee toward safety at night');
  assert.ok(Math.hypot(wWood.x, wWood.z) < 24, 'Woodcutter moves inward toward Campfire');
  assert.equal(wGuard.aiState, 'defending', 'Guard must enter defending state at night');
});

test('worker role assignment updates role and suggested role balances workforce', () => {
  const s1 = { id: 1, name: 'A', x: 0, z: 5, costGold: 10, sourceId: 's', recruited: true };
  const w1 = createWorkerFromSurvivor(10, 0, s1, 'woodcutter');
  assert.equal(pickSuggestedWorkerRole([]), 'woodcutter');
  assert.equal(pickSuggestedWorkerRole([w1]), 'farmer');
  assignWorkerRole(w1, 'builder');
  assert.equal(w1.role, 'builder');

  const hungerCheck = canRecruitSurvivor({ gold: 50, wood: 10, stone: 10, food: 0, ember: 0 }, 'hungry', {
    ...s1,
    recruited: false,
  });
  assert.equal(hungerCheck.ok, false);
});
