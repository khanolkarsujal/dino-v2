import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEggTierFromDistance,
  computeWaveBudget,
  getDragonLevelStatMult,
  selectWaveComposition,
} from './balance';
import {
  BUILDING_DEFS,
  NIGHT_EVERY,
  PERIMETER_WALL_RADIUS,
  WALL_TIER_DEFS,
} from './data';
import { createRng } from './rng';
import {
  applyUpgradeCard,
  createInitialState,
  ensureDebugDragon,
  getDragonCapacity,
  getDragonWallMultiplier,
  getIntactWallSidesCount,
  getMaxDragonLevel,
  issueDragonCommand,
  placeBuilding,
  repairPerimeterWalls,
  spawnDebugEnemies,
  steerAroundObstacles,
  stepSimulation,
  summonNextWaveNow,
  triggerDebugDragonAbility,
  upgradePerimeterWalls,
  type GameInput,
} from './engine';
import { createInitialStatusState } from './statusEffects';
import { DRAGON_ABILITY_CONFIG, DRAGON_RARITY_META } from './dragonConfig';

const IDLE_INPUT: GameInput = {
  moveX: 0,
  moveZ: 0,
  attackJustPressed: false,
  dashJustPressed: false,
  interactJustPressed: false,
  commandJustPressed: null,
};

test('difficulty budget rewards destroying caves instead of punishing player', () => {
  const budgetAllCaves = computeWaveBudget(6, 4);
  const budgetTwoCaves = computeWaveBudget(6, 2);
  const budgetZeroCaves = computeWaveBudget(6, 0);

  assert.ok(budgetTwoCaves < budgetAllCaves, 'Destroying caves should lower threat budget');
  assert.ok(budgetZeroCaves < budgetTwoCaves, 'Zero caves should produce lowest threat budget');
});

test('egg tier scales deterministically with distance from campfire', () => {
  assert.equal(computeEggTierFromDistance(12), 0);
  assert.equal(computeEggTierFromDistance(26), 1);
  assert.equal(computeEggTierFromDistance(58), 2);
  assert.equal(computeEggTierFromDistance(92), 3);
});

test('wave 15 composition always includes the Nightmare Lord boss', () => {
  const rng = createRng(42);
  const comp = selectWaveComposition(15, 4, rng);
  assert.ok(comp.includes('boss'), 'Final wave must spawn boss');
});

test('simulation survives initial 10 seconds with no player input', () => {
  const state = createInitialState(1234);
  state.phase = 'playing';
  for (let i = 0; i < 300; i++) {
    stepSimulation(state, 1 / 30, IDLE_INPUT);
  }
  assert.equal(state.phase, 'playing');
  assert.ok(state.campfireHp > 0);
  assert.ok(state.player.hp > 0);
});

test('building placement deducts resources and expands dragon capacity', () => {
  const state = createInitialState(99);
  state.phase = 'playing';
  const baseCap = getDragonCapacity(state);
  const woodBefore = state.resources.wood;
  const stoneBefore = state.resources.stone;
  const res = placeBuilding(state, 'nest', 8, 8);
  assert.equal(res.ok, true);
  assert.equal(state.resources.wood, woodBefore - BUILDING_DEFS.nest.cost.wood);
  assert.equal(state.resources.stone, stoneBefore - BUILDING_DEFS.nest.cost.stone);

  // Finish construction timer
  for (let i = 0; i < 90; i++) {
    stepSimulation(state, 1 / 30, IDLE_INPUT);
  }
  assert.equal(getDragonCapacity(state), baseCap + 2);
});

test('player melee slash damages enemies and grants ember on kill', () => {
  const state = createInitialState(7);
  state.phase = 'playing';
  summonNextWaveNow(state);
  stepSimulation(state, 0.05, IDLE_INPUT); // starts wave 1

  // Place a raider directly in front of player facing +Z
  state.enemies.push({
    id: 9999,
    kind: 'raider',
    x: state.player.x,
    z: state.player.z + 1.5,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: -1,
    hp: 20,
    maxHp: 20,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 1,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: 1,
  });
  state.player.facingX = 0;
  state.player.facingZ = 1;

  const emberBefore = state.resources.ember;
  stepSimulation(state, 0.02, { ...IDLE_INPUT, attackJustPressed: true });
  // Advance past windup (0.06s)
  for (let i = 0; i < 6; i++) {
    stepSimulation(state, 0.02, IDLE_INPUT);
  }

  const raider = state.enemies.find((e) => e.id === 9999);
  assert.ok(raider && raider.hp === 0 && raider.koTimer > 0, 'Raider should enter KO topple');
  assert.ok(state.resources.ember > emberBefore, 'Kill should reward Ember');
});

test('dragon squad commands update anchor and tactical mode', () => {
  const state = createInitialState(55);
  state.phase = 'playing';
  state.player.x = 30;
  state.player.z = 10;
  issueDragonCommand(state, 'defend');
  assert.equal(state.squadCommand, 'defend');
  assert.equal(state.defendAnchor.x, 30);
  issueDragonCommand(state, 'attack');
  assert.equal(state.squadCommand, 'attack');
});

test('fire dragon breathes continuous cone stream and applies Burning DoT + damage boost', () => {
  const state = createInitialState(11);
  state.phase = 'playing';
  spawnDebugEnemies(state, 'huge'); // Siege Golem survives multiple ticks
  const siege = state.enemies[0];
  const initialHp = siege.hp;

  triggerDebugDragonAbility(state, 'fire');
  const fireDragon = state.dragons.find((d) => d.element === 'fire')!;
  assert.equal(fireDragon.sizeScale, 1.15);

  let sawFlameStreamEvent = false;
  for (let i = 0; i < 25; i++) {
    stepSimulation(state, 0.04, IDLE_INPUT);
    if (state.events.some((ev) => ev.type === 'dragon_vfx' && ev.kind === 'flame_stream')) {
      sawFlameStreamEvent = true;
    }
  }
  assert.equal(sawFlameStreamEvent, true, 'Fire dragon should emit continuous flame_stream ticks');
  assert.ok(siege.statuses.burning.remaining > 0, 'Enemies in cone should catch Burning');
  assert.ok(siege.hp < initialHp, 'Continuous flame ticks should deal damage');
});

test('ice dragon launches frost ball projectile that freezes small enemies', () => {
  const state = createInitialState(12);
  state.phase = 'playing';
  state.enemies.push({
    id: 8881,
    kind: 'raider',
    x: state.player.x,
    z: state.player.z + 5.5,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: -1,
    hp: 90,
    maxHp: 90,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 2,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: 1,
  });
  triggerDebugDragonAbility(state, 'ice');

  let sawFreeze = false;
  for (let i = 0; i < 30; i++) {
    stepSimulation(state, 0.04, IDLE_INPUT);
    if (state.enemies[0]?.statuses.frozen.remaining > 0) {
      sawFreeze = true;
      break;
    }
  }
  assert.equal(sawFreeze, true, 'Frost ball impact should freeze target enemy');
});

test('common green wind/nature dragon rotates swipe -> whip -> bite combo with basic attacks and no crowd control', () => {
  const state = createInitialState(13);
  state.phase = 'playing';
  const green = ensureDebugDragon(state, 'earth');
  assert.equal(green.sizeScale, 1.4);
  assert.equal(green.rarity, 'common');
  assert.equal(green.abilityStrength, 0);
  assert.equal(green.abilityCooldown, 0);
  assert.ok(
    DRAGON_ABILITY_CONFIG.stats.earth.baseDmg < DRAGON_ABILITY_CONFIG.stats.electric.baseDmg &&
      DRAGON_ABILITY_CONFIG.stats.electric.baseDmg < DRAGON_ABILITY_CONFIG.stats.ice.baseDmg &&
      DRAGON_ABILITY_CONFIG.stats.ice.baseDmg < DRAGON_ABILITY_CONFIG.stats.fire.baseDmg,
    'Base damage must scale strictly Common Green < Rare Yellow < Super Rare Blue < Legendary Red',
  );
  assert.ok(
    DRAGON_ABILITY_CONFIG.stats.electric.moveSpeed > DRAGON_ABILITY_CONFIG.stats.earth.moveSpeed &&
      DRAGON_ABILITY_CONFIG.stats.ice.attackRange > DRAGON_ABILITY_CONFIG.stats.electric.attackRange,
    'Rare Yellow must be fastest and Super Rare Blue must have longest range',
  );

  spawnDebugEnemies(state, 'huge');
  const siege = state.enemies[0];
  const seenKinds: string[] = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    triggerDebugDragonAbility(state, 'earth');
    for (let i = 0; i < 20; i++) {
      stepSimulation(state, 0.04, IDLE_INPUT);
      for (const ev of state.events) {
        if (
          ev.type === 'dragon_vfx' &&
          (ev.kind === 'melee_swipe' || ev.kind === 'melee_whip' || ev.kind === 'melee_bite')
        ) {
          seenKinds.push(ev.kind);
        }
      }
    }
  }
  assert.deepEqual(seenKinds.slice(0, 3), ['melee_swipe', 'melee_whip', 'melee_bite']);
  assert.equal(siege.statuses.frozen.remaining, 0);
  assert.equal(siege.statuses.stunned.remaining, 0);
  assert.equal(siege.statuses.burning.remaining, 0);
});

test('electric dragon prefers groups, chains with exponential falloff, and deals half damage to huge foes', () => {
  const state = createInitialState(14);
  state.phase = 'playing';
  const yellow = ensureDebugDragon(state, 'electric');
  state.dragons = [yellow];
  assert.equal(yellow.sizeScale, 0.8);
  yellow.x = 0;
  yellow.z = 8;

  // Add 1 lone Siege Golem close by, and a tight pack of 3 Raiders slightly farther
  const mkEnemy = (id: number, kind: 'raider' | 'siege', x: number, z: number) => ({
    id,
    kind,
    x,
    z,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: -1,
    hp: 150,
    maxHp: 150,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 2,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: 1,
  });
  state.enemies.push(mkEnemy(7001, 'siege', 0, 12));
  state.enemies.push(mkEnemy(7002, 'raider', 3, 14));
  state.enemies.push(mkEnemy(7003, 'raider', 4.5, 14.5));
  state.enemies.push(mkEnemy(7004, 'raider', 5.8, 13.8));

  for (let i = 0; i < 15; i++) {
    stepSimulation(state, 0.04, IDLE_INPUT);
  }
  const raider1 = state.enemies.find((e) => e.id === 7002)!;
  const raider2 = state.enemies.find((e) => e.id === 7003)!;
  const siege = state.enemies.find((e) => e.id === 7001)!;
  assert.ok(raider1.hp < 150 && raider2.hp < 150, 'Electric chain should prioritize grouped raiders');
  assert.ok(
    150 - raider1.hp > 150 - raider2.hp,
    'Chain lightning damage should drop off per jump',
  );
  assert.ok(
    150 - siege.hp < 150 - raider1.hp,
    'Huge enemy should receive reduced electric damage if hit',
  );
});

test('steerAroundObstacles deflects melee dragon smoothly around the Campfire plinth', () => {
  const state = createInitialState(15);
  // Standing directly south of Campfire (0, -5), heading straight north (+Z) toward (0, +5)
  const steered = steerAroundObstacles(0, -4.5, 0, 1, 1.33, state, null);
  assert.ok(Math.abs(steered.dirX) > 0.25, 'Should steer tangentially around Campfire');
});

test('4-sided perimeter wall shifts dragon strength from -50% unwalled to +50%/+75%/+100% and requires ingredients', () => {
  const state = createInitialState(16);
  state.phase = 'playing';
  assert.equal(state.wallTier, 0);
  assert.equal(getIntactWallSidesCount(state), 0);
  assert.equal(getDragonWallMultiplier(state), 0.5, 'Dragons must be 50% weaker without a wall');

  // Upgrade to Tier 1 Timber Palisade (costs 20W, 10S)
  const woodBefore = state.resources.wood;
  const stoneBefore = state.resources.stone;
  const t1 = upgradePerimeterWalls(state);
  assert.equal(t1.ok, true);
  assert.equal(state.wallTier, 1);
  assert.equal(getIntactWallSidesCount(state), 4);
  assert.equal(getDragonWallMultiplier(state), 1.5, 'Tier 1 wall must make dragons 50% stronger');
  assert.equal(state.resources.wood, woodBefore - WALL_TIER_DEFS[1].cost.wood);
  assert.equal(state.resources.stone, stoneBefore - WALL_TIER_DEFS[1].cost.stone);

  // Without enough ingredients, Tier 2 upgrade is blocked
  const t2Fail = upgradePerimeterWalls(state);
  assert.equal(t2Fail.ok, false);

  // Supply ingredients and upgrade through Tier 2 -> Tier 3
  state.resources = { wood: 100, stone: 120, ember: 50 };
  assert.equal(upgradePerimeterWalls(state).ok, true);
  assert.equal(state.wallTier, 2);
  assert.equal(getDragonWallMultiplier(state), 1.75);
  assert.equal(upgradePerimeterWalls(state).ok, true);
  assert.equal(state.wallTier, 3);
  assert.equal(getDragonWallMultiplier(state), 2.0);

  // Breach one side and verify partial bonus + repair restores all 4 sides
  state.perimeterWalls[0].hp = 0;
  assert.equal(getIntactWallSidesCount(state), 3);
  assert.ok(getDragonWallMultiplier(state) < 2.0 && getDragonWallMultiplier(state) > 1.5);
  assert.equal(repairPerimeterWalls(state).ok, true);
  assert.equal(getIntactWallSidesCount(state), 4);
  assert.equal(getDragonWallMultiplier(state), 2.0);
});

test('intact 4-sided perimeter walls physically block enemies from reaching Campfire until breached', () => {
  const state = createInitialState(17);
  state.phase = 'playing';
  state.dragons = []; // isolate wall defense
  assert.equal(upgradePerimeterWalls(state).ok, true);

  // Place a Brute directly outside the North wall (z = -PERIMETER_WALL_RADIUS - 2)
  state.enemies.push({
    id: 9501,
    kind: 'brute',
    x: 0,
    z: -(PERIMETER_WALL_RADIUS + 2.0),
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: 1,
    hp: 300,
    maxHp: 300,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 0.1,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: 1,
  });

  const northWall = state.perimeterWalls.find((w) => w.side === 'north')!;
  const wallHpBefore = northWall.hp;
  const campHpBefore = state.campfireHp;

  for (let i = 0; i < 60; i++) {
    stepSimulation(state, 0.04, IDLE_INPUT);
  }
  const brute = state.enemies.find((e) => e.id === 9501)!;
  assert.ok(northWall.hp < wallHpBefore, 'Enemy must strike intact North wall');
  assert.ok(brute.z <= -PERIMETER_WALL_RADIUS, 'Intact wall must keep enemy outside perimeter');
  assert.equal(state.campfireHp, campHpBefore, 'Campfire must stay unharmed while wall holds');
});

test('continuous day-night cycle launches huge night wave in every phase (1 cycle = 1 wave)', () => {
  assert.equal(NIGHT_EVERY, 1);
  const state = createInitialState(18);
  state.phase = 'playing';
  assert.equal(state.wave, 1);
  assert.equal(state.isNight, false);
  assert.equal(state.waveActive, false);

  // Advance day prep until dusk -> night wave triggers automatically
  for (let i = 0; i < 700; i++) {
    stepSimulation(state, 0.05, IDLE_INPUT);
    if (state.waveActive) break;
  }
  assert.equal(state.waveActive, true, 'Day prep must transition into Night Wave 1');
  assert.equal(state.isNight, true, 'Wave 1 must be a Night Raid');
  assert.ok(state.waveQueue.length + state.enemies.length >= 8, 'Night 1 must launch a huge enemy wave');

  // Clear Wave 1 attackers -> opens Dawn upgrade decree -> advances to Wave 2 Day Prep -> Night 2
  state.waveQueue = [];
  state.enemies = [];
  stepSimulation(state, 0.03, IDLE_INPUT);
  assert.equal(state.phase, 'choosing', 'Surviving night wave must trigger Dawn decree');
  applyUpgradeCard(state, state.upgradeChoices[0].id);
  assert.equal(state.wave, 2);
  assert.equal(state.isNight, false);
  summonNextWaveNow(state);
  assert.equal(state.waveActive, true);
  assert.equal(state.isNight, true, 'Wave 2 must also be a Night Raid');
});

test('dragons start weak at level 1 and gain XP from combat to unlock Cave 1', () => {
  const state = createInitialState(19);
  state.phase = 'playing';
  const dragon = state.dragons[0];
  assert.equal(dragon.level, 1);
  assert.ok(getDragonLevelStatMult(1) < 0.7, 'Level 1 dragon starts weak');
  assert.equal(getMaxDragonLevel(state), 1);
  assert.equal(state.caves[0].requiredLevel, 2);

  // Spawn a wave enemy right next to player and kill it to earn XP
  state.enemies.push({
    id: 9601,
    kind: 'siege',
    x: state.player.x,
    z: state.player.z + 1.5,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: -1,
    hp: 10,
    maxHp: 240,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 2,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: 1,
  });
  // Second siege enemy so dragon gets >= 40 XP
  state.enemies.push({
    id: 9602,
    kind: 'siege',
    x: state.player.x,
    z: state.player.z + 1.5,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: -1,
    hp: 10,
    maxHp: 240,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 2,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: -1,
  });
  state.player.facingX = 0;
  state.player.facingZ = 1;
  stepSimulation(state, 0.02, { ...IDLE_INPUT, attackJustPressed: true });
  for (let i = 0; i < 6; i++) {
    stepSimulation(state, 0.02, IDLE_INPUT);
  }

  assert.ok(dragon.level >= 2, `Combat kills should level dragon to Lv 2+, got Lv ${dragon.level}`);
  assert.ok(getMaxDragonLevel(state) >= state.caves[0].requiredLevel);
});

test('Phase 1: exactly 4 rarities, starting Common Green Wind/Nature dragon, and full independent stat blocks', () => {
  const rarityKeys = Object.keys(DRAGON_RARITY_META);
  assert.deepEqual(rarityKeys.sort(), ['common', 'legendary', 'rare', 'super_rare']);

  const state = createInitialState(21);
  assert.equal(state.dragons.length, 1);
  const starter = state.dragons[0];
  assert.equal(starter.element, 'earth');
  assert.equal(starter.rarity, 'common');
  assert.equal(starter.maxHp, 100);
  assert.equal(starter.damage, 10);

  const yellow = ensureDebugDragon(state, 'electric');
  const blue = ensureDebugDragon(state, 'ice');
  const red = ensureDebugDragon(state, 'fire');

  assert.equal(yellow.rarity, 'rare');
  assert.equal(blue.rarity, 'super_rare');
  assert.equal(red.rarity, 'legendary');

  for (const d of [starter, yellow, blue, red]) {
    assert.ok(d.maxHp > 0);
    assert.ok(d.damage > 0);
    assert.ok(d.attackSpeed > 0);
    assert.ok(d.moveSpeed > 0);
    assert.ok(d.attackRange > 0);
    assert.ok(d.critChance > 0 && d.critChance < 1);
    assert.equal(typeof d.abilityStrength, 'number');
    assert.equal(typeof d.abilityCooldown, 'number');
    assert.equal(d.level, 1);
    assert.equal(d.xp, 0);
  }
  assert.ok(red.damage > blue.damage && blue.damage > yellow.damage && yellow.damage > starter.damage);
});

test('Phase 1: special ability cooldowns & Super Rare Blue AoE chill slow nearby group', () => {
  const state = createInitialState(22);
  state.phase = 'playing';
  const blue = ensureDebugDragon(state, 'ice');
  state.dragons = [blue];
  blue.x = 0;
  blue.z = 0;

  const mkRaider = (id: number, x: number, z: number) => ({
    id,
    kind: 'raider' as const,
    x,
    z,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: -1,
    hp: 120,
    maxHp: 120,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 5,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: 1,
  });
  // Primary target + nearby ally within chillRadius (3.4m)
  state.enemies.push(mkRaider(9701, 0, 5.0));
  state.enemies.push(mkRaider(9702, 2.0, 5.2));

  triggerDebugDragonAbility(state, 'ice');
  assert.ok(blue.abilityCooldownTimer > 0, 'Ice special ability cast should trigger ability cooldown');

  for (let i = 0; i < 30; i++) {
    stepSimulation(state, 0.04, IDLE_INPUT);
    if (state.enemies[0]?.statuses.frozen.remaining > 0) break;
  }
  assert.ok(state.enemies[0].statuses.frozen.remaining > 0, 'Primary target must be frozen');
  assert.ok(state.enemies[1].slowTimer > 0, 'Nearby enemy within chillRadius must be slowed');

  // Verify Fire dragon triggers ability cooldown on flame stream then fires basic bolt while on cooldown
  const red = ensureDebugDragon(state, 'fire');
  triggerDebugDragonAbility(state, 'fire');
  assert.equal(red.attackKind, 'stream');
  assert.ok(red.abilityCooldownTimer > 0);
  red.attackPhase = 'idle';
  red.attackCooldown = 0;
  for (let i = 0; i < 6; i++) {
    stepSimulation(state, 0.04, IDLE_INPUT);
  }
  assert.equal(red.attackKind, 'bolt', 'Fire dragon should use basic fire bolt while Inferno Flame is on cooldown');
});

