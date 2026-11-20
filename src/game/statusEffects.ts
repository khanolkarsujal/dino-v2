import {
  DRAGON_ABILITY_CONFIG,
  isHugeEnemy,
} from './dragonConfig';
import type { EnemyKind } from './data';

export interface BurningStatus {
  remaining: number;
  dps: number;
  bonusDamageMult: number;
  sourceDragonId: number | null;
  tickAccum: number;
}

export interface TimedImmunityStatus {
  remaining: number;
  immunityRemaining: number;
}

export interface EnemyStatusState {
  burning: BurningStatus;
  frozen: TimedImmunityStatus;
  stunned: TimedImmunityStatus;
}

export function createInitialStatusState(): EnemyStatusState {
  return {
    burning: {
      remaining: 0,
      dps: 0,
      bonusDamageMult: 1,
      sourceDragonId: null,
      tickAccum: 0,
    },
    frozen: {
      remaining: 0,
      immunityRemaining: 0,
    },
    stunned: {
      remaining: 0,
      immunityRemaining: 0,
    },
  };
}

/**
 * Applies or refreshes Burning on an enemy without infinite stacking.
 */
export function applyBurningStatus(
  statuses: EnemyStatusState,
  duration: number,
  dps: number,
  bonusDamageMult: number,
  sourceDragonId: number | null,
): boolean {
  const wasActive = statuses.burning.remaining > 0;
  statuses.burning.remaining = Math.max(statuses.burning.remaining, duration);
  statuses.burning.dps = Math.max(statuses.burning.dps, dps);
  statuses.burning.bonusDamageMult = Math.max(
    statuses.burning.bonusDamageMult,
    bonusDamageMult,
  );
  if (sourceDragonId !== null) {
    statuses.burning.sourceDragonId = sourceDragonId;
  }
  return !wasActive;
}

/**
 * Applies Frozen status through central rules with immunity & huge-enemy limits.
 * Returns { appliedFreeze, appliedSlowSec }.
 */
export function applyFrozenStatus(
  statuses: EnemyStatusState,
  kind: EnemyKind,
  freezeDuration: number = DRAGON_ABILITY_CONFIG.ice.freezeDuration,
  hugeMult: number = DRAGON_ABILITY_CONFIG.ice.hugeFreezeDurationMult,
  hugeSlowSec: number = DRAGON_ABILITY_CONFIG.ice.hugeSlowSec,
): { appliedFreeze: boolean; appliedSlowSec: number } {
  // Bosses are never frozen solid — receive chill slow instead
  if (kind === 'boss') {
    return { appliedFreeze: false, appliedSlowSec: hugeSlowSec };
  }

  // Cannot re-freeze while already frozen or inside immunity window
  if (statuses.frozen.remaining > 0 || statuses.frozen.immunityRemaining > 0) {
    return { appliedFreeze: false, appliedSlowSec: hugeSlowSec * 0.5 };
  }

  const dur = isHugeEnemy(kind) ? freezeDuration * hugeMult : freezeDuration;
  statuses.frozen.remaining = Math.max(0.2, dur);
  return {
    appliedFreeze: true,
    appliedSlowSec: isHugeEnemy(kind) ? hugeSlowSec : 0,
  };
}

/**
 * Attempts to apply Stunned status with immunity cooldown & huge-enemy resistance.
 */
export function applyStunnedStatus(
  statuses: EnemyStatusState,
  kind: EnemyKind,
  chance: number,
  duration: number,
  rngNext: () => number,
): boolean {
  if (kind === 'boss') return false;
  if (statuses.stunned.remaining > 0 || statuses.stunned.immunityRemaining > 0) {
    return false;
  }
  if (rngNext() > chance) return false;
  statuses.stunned.remaining = duration;
  return true;
}

const BURN_TICK_STEP = 0.5;

/**
 * Ticks all active enemy statuses, fires DoT ticks, transitions Freeze/Stun into
 * immunity windows, and fires shatter callback when Frozen ends.
 */
export function tickEnemyStatuses(
  statuses: EnemyStatusState,
  dt: number,
  freezeImmunitySec: number,
  stunImmunitySec: number,
  onBurnTick: (damage: number, sourceDragonId: number | null) => void,
  onFreezeEnd: () => void,
): void {
  // Immunity timers decay
  if (statuses.frozen.immunityRemaining > 0) {
    statuses.frozen.immunityRemaining = Math.max(0, statuses.frozen.immunityRemaining - dt);
  }
  if (statuses.stunned.immunityRemaining > 0) {
    statuses.stunned.immunityRemaining = Math.max(0, statuses.stunned.immunityRemaining - dt);
  }

  // Burning DoT
  if (statuses.burning.remaining > 0) {
    statuses.burning.remaining = Math.max(0, statuses.burning.remaining - dt);
    statuses.burning.tickAccum += dt;
    while (statuses.burning.tickAccum >= BURN_TICK_STEP) {
      statuses.burning.tickAccum -= BURN_TICK_STEP;
      const tickDmg = statuses.burning.dps * BURN_TICK_STEP;
      if (tickDmg > 0) {
        onBurnTick(tickDmg, statuses.burning.sourceDragonId);
      }
    }
    if (statuses.burning.remaining <= 0) {
      statuses.burning.dps = 0;
      statuses.burning.bonusDamageMult = 1;
      statuses.burning.tickAccum = 0;
    }
  }

  // Frozen
  if (statuses.frozen.remaining > 0) {
    statuses.frozen.remaining -= dt;
    if (statuses.frozen.remaining <= 0) {
      statuses.frozen.remaining = 0;
      statuses.frozen.immunityRemaining = freezeImmunitySec;
      onFreezeEnd();
    }
  }

  // Stunned
  if (statuses.stunned.remaining > 0) {
    statuses.stunned.remaining -= dt;
    if (statuses.stunned.remaining <= 0) {
      statuses.stunned.remaining = 0;
      statuses.stunned.immunityRemaining = stunImmunitySec;
    }
  }
}

export function getIncomingStatusDamageMultiplier(
  statuses: EnemyStatusState,
  isMeleeAttack: boolean,
  frozenMeleeBonusMult: number = DRAGON_ABILITY_CONFIG.ice.frozenMeleeBonusMult,
): number {
  let mult = 1.0;
  if (statuses.burning.remaining > 0) {
    mult *= statuses.burning.bonusDamageMult;
  }
  if (isMeleeAttack && statuses.frozen.remaining > 0 && frozenMeleeBonusMult > 1) {
    mult *= frozenMeleeBonusMult;
  }
  return mult;
}

export function isEnemyIncapacitated(statuses: EnemyStatusState): boolean {
  return statuses.frozen.remaining > 0 || statuses.stunned.remaining > 0;
}
