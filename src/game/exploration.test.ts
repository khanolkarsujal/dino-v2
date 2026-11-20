import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ABANDONED_SETTLEMENTS,
  ANCIENT_SHRINES,
  createInitialSettlements,
  createInitialShrines,
  createInitialTreasures,
  createInitialWildlife,
  getCaveApproachClues,
  RESOURCE_GROVES,
  TREASURE_SITES,
} from './exploration';
import { CAMP_RADIUS } from './data';

test('exploration locations are placed intentionally outside immediate starting camp', () => {
  for (const s of ABANDONED_SETTLEMENTS) {
    assert.ok(Math.hypot(s.x, s.z) >= CAMP_RADIUS + 18, `${s.name} must not spawn inside starting camp`);
  }
  for (const sh of ANCIENT_SHRINES) {
    assert.ok(Math.hypot(sh.x, sh.z) >= 55, `${sh.name} should reward venturing further out`);
  }
  for (const t of TREASURE_SITES) {
    assert.ok(Math.hypot(t.x, t.z) >= 50, `${t.name} should be placed away from starting camp`);
  }
  assert.ok(RESOURCE_GROVES.length >= 4);
  assert.ok(getCaveApproachClues().length >= 16);
});

test('initial exploration state initializes settlements, shrines, treasures, and wildlife cleanly', () => {
  const settlements = createInitialSettlements();
  const shrines = createInitialShrines();
  const treasures = createInitialTreasures();
  const wildlife = createInitialWildlife(500);

  assert.equal(settlements.length, ABANDONED_SETTLEMENTS.length);
  assert.equal(shrines.length, ANCIENT_SHRINES.length);
  assert.equal(treasures.length, TREASURE_SITES.length);
  assert.ok(wildlife.length >= 8);
  assert.ok(settlements.every((s) => !s.claimed && s.survivorsRemaining > 0));
});
