import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_RADIUS } from './data';
import { DRAGON_ABILITY_CONFIG } from './dragonConfig';
import {
  createInitialState,
  damageDragon,
  ensureDebugDragon,
  getMissionObjective,
  issueDragonCommand,
  stepSimulation,
  type GameInput,
} from './engine';
import {
  CAVE_BLUEPRINTS,
  getActiveTargetCave,
  getExplorationPercent,
  isCaveWarded,
  JAIL_BLUEPRINTS,
  REGION_ROADS,
  revealFogAt,
  RUIN_BLUEPRINTS,
} from './regionMap';
import { createInitialStatusState } from './statusEffects';

const IDLE_INPUT: GameInput = {
  moveX: 0,
  moveZ: 0,
  attackJustPressed: false,
  dashJustPressed: false,
  interactJustPressed: false,
  commandJustPressed: null,
};

test('region map places 4 caves, 4 ruins, 3 jails, and 4 roads within 400m world radius', () => {
  const state = createInitialState(2026);
  assert.equal(WORLD_RADIUS, 400);
  assert.equal(state.caves.length, 4);
  assert.equal(state.ruins.length, 4);
  assert.equal(state.jails.length, 3);
  assert.equal(REGION_ROADS.length, 4);

  for (const c of CAVE_BLUEPRINTS) {
    assert.ok(Math.hypot(c.x, c.z) < WORLD_RADIUS, `Cave ${c.index} must be inside world radius`);
  }
  for (const r of RUIN_BLUEPRINTS) {
    assert.ok(Math.hypot(r.x, r.z) < WORLD_RADIUS, `Ruin ${r.id} must be inside world radius`);
  }
  for (const j of JAIL_BLUEPRINTS) {
    assert.ok(Math.hypot(j.x, j.z) < WORLD_RADIUS, `Jail ${j.id} must be inside world radius`);
  }
});

test('fog of war starts near sanctuary and expands as Guardian explores frontier', () => {
  const state = createInitialState(101);
  const startPct = getExplorationPercent(state.fogGrid);
  assert.ok(startPct >= 0 && startPct < 15, `Initial exploration should be small, got ${startPct}%`);

  revealFogAt(state.fogGrid, 180, 0, 80);
  revealFogAt(state.fogGrid, -180, 180, 80);
  const afterPct = getExplorationPercent(state.fogGrid);
  assert.ok(afterPct > startPct, 'Fog exploration percentage must increase as regions are visited');
});

test('caves are sequentially warded (1 -> 2 -> 3 -> 4) and gated by dragon level', () => {
  const state = createInitialState(202);
  state.phase = 'playing';

  assert.equal(getActiveTargetCave(state.caves)?.index, 1);
  assert.equal(isCaveWarded(state.caves[0], state.caves), false);
  assert.equal(isCaveWarded(state.caves[1], state.caves), true);
  assert.equal(isCaveWarded(state.caves[2], state.caves), true);
  assert.equal(isCaveWarded(state.caves[3], state.caves), true);

  // Starting Lv 1 dragon is too weak to damage Cave 1 (requires Lv 2+)
  const cave1 = state.caves[0];
  const cave1HpBefore = cave1.hp;
  state.player.x = cave1.x - 2.2;
  state.player.z = cave1.z;
  state.player.facingX = 1;
  state.player.facingZ = 0;
  stepSimulation(state, 0.02, { ...IDLE_INPUT, attackJustPressed: true });
  for (let i = 0; i < 6; i++) {
    stepSimulation(state, 0.02, IDLE_INPUT);
  }
  assert.equal(cave1.hp, cave1HpBefore, 'Lv 1 dragon squad must not damage Cave 1 (Req Lv 2+)');

  // Level up dragon to Lv 3 so Caves 1 & 2 level gates are satisfied
  state.dragons[0].level = 3;

  // Move Guardian next to Cave 2 while Cave 1 is alive and slash Cave 2
  const cave2 = state.caves[1];
  const cave2HpBefore = cave2.hp;
  state.player.x = cave2.x - 2.2;
  state.player.z = cave2.z;
  state.player.facingX = 1;
  state.player.facingZ = 0;
  state.player.attackCooldown = 0;
  state.player.attackPhase = 'idle';
  state.player.attackTimer = 0;

  stepSimulation(state, 0.02, { ...IDLE_INPUT, attackJustPressed: true });
  for (let i = 0; i < 6; i++) {
    stepSimulation(state, 0.02, IDLE_INPUT);
  }
  assert.equal(cave2.hp, cave2HpBefore, 'Warded Cave 2 must take 0 damage while Cave 1 stands');

  // Collapse Cave 1 and verify Cave 2 becomes vulnerable
  state.caves[0].hp = 0;
  state.caves[0].alive = false;
  assert.equal(getActiveTargetCave(state.caves)?.index, 2);
  assert.equal(isCaveWarded(state.caves[1], state.caves), false);

  state.player.attackCooldown = 0;
  state.player.attackPhase = 'idle';
  state.player.attackTimer = 0;
  stepSimulation(state, 0.02, { ...IDLE_INPUT, attackJustPressed: true });
  for (let i = 0; i < 6; i++) {
    stepSimulation(state, 0.02, IDLE_INPUT);
  }
  assert.ok(cave2.hp < cave2HpBefore, 'Cave 2 must take damage after Cave 1 collapses with Lv 3+ dragon');
});

test('attacking active cave triggers multi-stage garrison alarm and spawns Cave Warden / Nightmare Lord', () => {
  const state = createInitialState(303);
  state.phase = 'playing';
  state.dragons[0].level = 5; // Satisfy Cave 1..4 level gates
  const cave1 = state.caves[0];
  const initialCount = state.enemies.length;

  // Hit Cave 1 down to 55% HP in one strike simulation
  cave1.hp = cave1.maxHp * 0.55;
  state.player.x = cave1.x - 2.2;
  state.player.z = cave1.z;
  state.player.facingX = 1;
  state.player.facingZ = 0;

  stepSimulation(state, 0.02, { ...IDLE_INPUT, attackJustPressed: true });
  for (let i = 0; i < 6; i++) {
    stepSimulation(state, 0.02, IDLE_INPUT);
  }

  assert.ok(cave1.garrisonStage >= 2, 'Cave 1 should advance through garrison stages 1 and 2');
  assert.ok(state.enemies.length > initialCount + 4, 'Cave alarm must deploy massive defenders');
  assert.ok(
    state.enemies.some((e) => e.kind === 'warden' && e.koTimer <= 0),
    'Cave 1 stage 2 must unleash a Cave Warden mini-boss',
  );

  // Now check Cave 4 triggers Nightmare Lord & stays >= 1 HP while boss lives
  for (let i = 0; i < 3; i++) {
    state.caves[i].hp = 0;
    state.caves[i].alive = false;
  }
  const cave4 = state.caves[3];
  cave4.hp = cave4.maxHp * 0.25;
  state.player.x = cave4.x - 2.2;
  state.player.z = cave4.z;
  state.player.attackCooldown = 0;
  state.player.attackPhase = 'idle';
  state.player.attackTimer = 0;
  stepSimulation(state, 0.02, { ...IDLE_INPUT, attackJustPressed: true });
  for (let i = 0; i < 15; i++) {
    stepSimulation(state, 0.04, IDLE_INPUT);
  }
  assert.ok(
    state.enemies.some((e) => e.kind === 'boss' && e.koTimer <= 0),
    'Cave 4 assault must summon the Nightmare Lord',
  );
  assert.ok(cave4.alive && cave4.hp >= 1, 'Cave 4 must not collapse while Nightmare Lord lives');
});

test('green frontliner absorbs boss damage while unprotected backliners get shredded', () => {
  const state = createInitialState(404);
  state.phase = 'playing';
  const fire = ensureDebugDragon(state, 'fire');
  const green = ensureDebugDragon(state, 'earth');

  assert.equal(DRAGON_ABILITY_CONFIG.stats.earth.isFrontliner, true);
  assert.equal(DRAGON_ABILITY_CONFIG.stats.fire.isFrontliner, false);

  const fireDmg = damageDragon(state, fire, 40, 'warden');
  const greenDmg = damageDragon(state, green, 40, 'warden');

  assert.ok(fireDmg >= 45, `Backliner should take amplified burst from Warden, got ${fireDmg}`);
  assert.ok(greenDmg < 20, `Green frontliner should heavily mitigate Warden strike, got ${greenDmg}`);
  assert.ok(green.hp > 0 && green.downTimer === 0, 'Green tank must survive heavy Warden hits');

  // Verify Green taunt pulls nearby Cave Warden away from Fire backliner standing behind him
  fire.hp = fire.maxHp;
  fire.downTimer = 0;
  fire.x = 7.5;
  fire.z = 7.5;
  green.x = 2;
  green.z = 0;
  state.enemies.push({
    id: 9091,
    kind: 'warden',
    x: 4,
    z: 2,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: 1,
    hp: 680,
    maxHp: 680,
    slowTimer: 0,
    statuses: createInitialStatusState(),
    buffed: false,
    windupTimer: 0,
    cooldownTimer: 0.05,
    hasAttackToken: false,
    hitFlash: 0,
    koTimer: 0,
    targetId: null,
    flankSign: 1,
  });

  for (let i = 0; i < 45; i++) {
    stepSimulation(state, 0.04, IDLE_INPUT);
  }
  assert.ok(green.hp < green.maxHp, 'Warden should lock onto Green frontliner within taunt radius');
  assert.equal(fire.hp, fire.maxHp, 'Fire backliner should stay unharmed while Green holds aggro');
});

test('clearing guards unlocks Dragon Jail rescue and Lost Ruin reclamation', () => {
  const state = createInitialState(505);
  state.phase = 'playing';

  // Move to East Jail (Green Bastion Drake) and clear its guards
  const eastJail = state.jails.find((j) => j.element === 'earth')!;
  state.enemies = state.enemies.filter((e) => e.guardLandmarkId !== eastJail.blueprintId);
  state.player.x = eastJail.x + 1.5;
  state.player.z = eastJail.z;

  const dragonsBefore = state.dragons.length;
  stepSimulation(state, 0.02, { ...IDLE_INPUT, interactJustPressed: true });
  assert.equal(eastJail.opened, true, 'East jail should open when guards are defeated');
  assert.equal(state.dragons.length, dragonsBefore + 1, 'Freeing jail must add trapped dragon');
  assert.ok(state.dragons.some((d) => d.element === 'earth'), 'East jail must grant Green frontliner');

  // Move to first Lost Ruin and clear its guards
  const ruin = state.ruins[0];
  state.enemies = state.enemies.filter((e) => e.guardLandmarkId !== ruin.blueprintId);
  state.player.x = ruin.x + 1.2;
  state.player.z = ruin.z;

  const protectorsBefore = state.protectors.length;
  stepSimulation(state, 0.02, { ...IDLE_INPUT, interactJustPressed: true });
  assert.equal(ruin.claimed, true, 'Lost Ruin should be claimed once guards are defeated');
  assert.ok(state.discoveredRelics.includes(ruin.relicId), 'Reclaiming ruin should unlock its Relic');
  assert.equal(
    state.protectors.length,
    protectorsBefore + ruin.protectorsGranted,
    'Reclaiming ruin should recruit Oathbound Protector Knights',
  );
  assert.ok(getMissionObjective(state).hasFrontliner, 'Objective should confirm frontliner unlocked');
});

test('destroying all 4 caves and defeating Nightmare Lord triggers region victory', () => {
  const state = createInitialState(606);
  state.phase = 'playing';
  issueDragonCommand(state, 'attack');
  state.enemies = state.enemies.filter((e) => e.kind !== 'boss');
  for (const c of state.caves) {
    c.hp = 0;
    c.alive = false;
  }
  stepSimulation(state, 0.03, IDLE_INPUT);
  assert.equal(state.phase, 'victory');
});
