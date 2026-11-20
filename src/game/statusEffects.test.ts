import assert from 'node:assert/strict';
import test from 'node:test';
import { DRAGON_ABILITY_CONFIG } from './dragonConfig';
import {
  applyBurningStatus,
  applyFrozenStatus,
  applyStunnedStatus,
  createInitialStatusState,
  getIncomingStatusDamageMultiplier,
  isEnemyIncapacitated,
  tickEnemyStatuses,
} from './statusEffects';

test('Burning refreshes duration without stacking infinitely and boosts ALL damage sources', () => {
  const s = createInitialStatusState();
  const firstApply = applyBurningStatus(s, 3.5, 8, 1.25, 101);
  assert.equal(firstApply, true);
  assert.equal(s.burning.remaining, 3.5);

  // Advance 1.5s -> 3 DoT ticks of 4 dmg each (every 0.5s)
  let totalDot = 0;
  tickEnemyStatuses(
    s,
    1.5,
    2.1,
    1.7,
    (dmg) => {
      totalDot += dmg;
    },
    () => {},
  );
  assert.equal(totalDot, 12);
  assert.equal(s.burning.remaining, 2.0);

  // Re-applying Burning refreshes duration back to 3.5s, never doubles dps or multiplier
  const secondApply = applyBurningStatus(s, 3.5, 8, 1.25, 101);
  assert.equal(secondApply, false);
  assert.equal(s.burning.remaining, 3.5);
  assert.equal(s.burning.dps, 8);
  assert.equal(getIncomingStatusDamageMultiplier(s, false, 1.25), 1.25);
});

test('Frozen immobilizes enemy, triggers shatter on end, and enforces immunity cooldown', () => {
  const s = createInitialStatusState();
  const res1 = applyFrozenStatus(s, 'raider', 2.0, 0.3, 2.5);
  assert.equal(res1.appliedFreeze, true);
  assert.equal(isEnemyIncapacitated(s), true);

  // Melee bonus applies while frozen when enabled (> 1)
  assert.equal(getIncomingStatusDamageMultiplier(s, true, 1.25), 1.25);
  // Can be turned off cleanly via config parameter = 1.0
  assert.equal(getIncomingStatusDamageMultiplier(s, true, 1.0), 1.0);
  // Ranged hits do not receive melee frozen bonus
  assert.equal(getIncomingStatusDamageMultiplier(s, false, 1.25), 1.0);

  // Re-hitting while already frozen does NOT chain-extend freeze
  const resWhileFrozen = applyFrozenStatus(s, 'raider', 2.0, 0.3, 2.5);
  assert.equal(resWhileFrozen.appliedFreeze, false);

  // Tick past freeze duration -> shatter callback fires and immunity starts
  let shattered = 0;
  tickEnemyStatuses(
    s,
    2.1,
    DRAGON_ABILITY_CONFIG.ice.freezeImmunitySec,
    1.7,
    () => {},
    () => {
      shattered++;
    },
  );
  assert.equal(shattered, 1);
  assert.equal(isEnemyIncapacitated(s), false);
  assert.ok(s.frozen.immunityRemaining > 1.5);

  // Attempt freeze during immunity window -> blocked, falls back to slow
  const resImmune = applyFrozenStatus(s, 'raider', 2.0, 0.3, 2.5);
  assert.equal(resImmune.appliedFreeze, false);
  assert.ok(resImmune.appliedSlowSec > 0);
});

test('Huge enemies & Boss resist Freeze and Stun appropriately', () => {
  const bossStatus = createInitialStatusState();
  const bossFreeze = applyFrozenStatus(bossStatus, 'boss', 2.2, 0.3, 2.6);
  assert.equal(bossFreeze.appliedFreeze, false);
  assert.equal(bossFreeze.appliedSlowSec, 2.6);

  const bossStun = applyStunnedStatus(bossStatus, 'boss', 1.0, 1.2, () => 0);
  assert.equal(bossStun, false);

  const siegeStatus = createInitialStatusState();
  const siegeFreeze = applyFrozenStatus(siegeStatus, 'siege', 2.0, 0.3, 2.6);
  assert.equal(siegeFreeze.appliedFreeze, true);
  assert.ok(siegeStatus.frozen.remaining < 1.0, 'Huge enemy receives shortened freeze');
});

test('Stun enforces immunity window so electric dragon cannot permastun a single foe', () => {
  const s = createInitialStatusState();
  assert.equal(applyStunnedStatus(s, 'raider', 0.9, 1.0, () => 0.1), true);
  assert.equal(isEnemyIncapacitated(s), true);

  tickEnemyStatuses(s, 1.1, 2.0, 1.7, () => {}, () => {});
  assert.equal(isEnemyIncapacitated(s), false);
  assert.ok(s.stunned.immunityRemaining > 1.5);

  // Blocked even with 0.0 RNG roll during immunity
  assert.equal(applyStunnedStatus(s, 'raider', 0.9, 1.0, () => 0.0), false);
});
