import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSettlements } from './exploration';
import { getClaimedOutposts, getSafeAnchorForPosition, isPointInControlledTerritory, OUTPOST_CLAIM_COST } from './territory';
import { claimSettlementOutpost, createInitialState, placeBuilding } from './engine';

test('territory control restricts building outside Sanctuary until an outpost is claimed', () => {
  const settlements = createInitialSettlements();
  assert.equal(isPointInControlledTerritory(settlements, 0, 10).controlled, true);
  assert.equal(isPointInControlledTerritory(settlements, 46, 16).controlled, false);

  const state = createInitialState(601);
  state.phase = 'playing';
  state.resources = { gold: 120, wood: 120, stone: 100, food: 50, ember: 30 };

  const targetOutpost = state.settlements[0];
  // Building at outpost before claiming fails
  const beforeRes = placeBuilding(state, 'lumber', targetOutpost.x + 5, targetOutpost.z);
  assert.equal(beforeRes.ok, false);

  // Claiming outpost deducts Gold+Wood+Stone and unlocks building around outpost
  const goldBefore = state.resources.gold ?? 0;
  const claimRes = claimSettlementOutpost(state, targetOutpost.id);
  assert.equal(claimRes.ok, true);
  assert.equal(targetOutpost.claimed, true);
  assert.equal(state.resources.gold, goldBefore - (OUTPOST_CLAIM_COST.gold ?? 0));
  assert.equal(getClaimedOutposts(state.settlements).length, 1);
  assert.equal(isPointInControlledTerritory(state.settlements, targetOutpost.x + 6, targetOutpost.z).controlled, true);

  const afterRes = placeBuilding(state, 'lumber', targetOutpost.x + 5, targetOutpost.z);
  assert.equal(afterRes.ok, true);

  const safeAnchor = getSafeAnchorForPosition(state.settlements, targetOutpost.x + 2, targetOutpost.z + 2);
  assert.equal(safeAnchor.name, targetOutpost.name);
});
