import * as THREE from 'three';
import {
  type BuildingKind,
  DRAGON_ARCHETYPES,
  type DragonElement,
  EGG_TIER_INFO,
  type EggTier,
  ENEMY_ARCHETYPES,
  type EnemyKind,
} from '../game/data';
import type { ResourceNodeKind } from '../game/engine';
import { WORKER_ROLE_META, type WorkerRole } from '../game/workers';

export function addContactShadow(
  group: THREE.Group,
  shadowMat: THREE.MeshBasicMaterial,
  radius: number,
): void {
  const geo = new THREE.CircleGeometry(radius, 18);
  const disc = new THREE.Mesh(geo, shadowMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.025;
  disc.renderOrder = 1;
  group.add(disc);
}

export function createCampfireCitadel(
  stoneTex: THREE.Texture,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 3.6);

  // 1. Stone courtyard plinth (primary silhouette)
  const plinthMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.08,
  });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 0.32, 12), plinthMat);
  plinth.position.y = 0.16;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  g.add(plinth);

  // 2. Ring of 8 hearth stones
  const hearthRockMat = new THREE.MeshStandardMaterial({
    color: 0x4c5259,
    roughness: 0.9,
    metalness: 0.05,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), hearthRockMat);
    stone.position.set(Math.cos(a) * 1.45, 0.42, Math.sin(a) * 1.45);
    stone.scale.set(1.1, 0.7, 0.9);
    stone.rotation.y = a;
    stone.castShadow = true;
    g.add(stone);
  }

  // 3. Charred crossed logs (secondary)
  const logMat = new THREE.MeshStandardMaterial({
    color: 0x3b2616,
    roughness: 0.92,
    metalness: 0.0,
  });
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.0, 7), logMat);
    const a = (i / 3) * Math.PI;
    log.position.set(0, 0.48, 0);
    log.rotation.set(Math.PI / 2 - 0.18, a, 0);
    log.castShadow = true;
    g.add(log);
  }

  // 4. Forged iron brazier pillars (metallic contrast)
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x2a2f36,
    roughness: 0.32,
    metalness: 0.88,
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.35, 6), ironMat);
    post.position.set(Math.cos(a) * 1.85, 0.72, Math.sin(a) * 1.85);
    post.castShadow = true;
    g.add(post);

    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), ironMat);
    finial.position.set(Math.cos(a) * 1.85, 1.48, Math.sin(a) * 1.85);
    g.add(finial);
  }

  // 5. Glowing ember core & animated flame tongues (accent)
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xff5a1f,
    emissive: 0xff4500,
    emissiveIntensity: 2.2,
    roughness: 0.3,
  });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), coreMat);
  core.position.y = 0.62;
  g.add(core);

  const outerFlameMat = new THREE.MeshStandardMaterial({
    color: 0xff7b24,
    emissive: 0xff5a18,
    emissiveIntensity: 1.8,
    roughness: 0.25,
    transparent: true,
    opacity: 0.88,
  });
  const innerFlameMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    emissive: 0xffc633,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });

  const flames: THREE.Mesh[] = [];
  const flameSpecs = [
    { x: 0, z: 0, r: 0.56, h: 1.75, mat: outerFlameMat },
    { x: 0.28, z: 0.18, r: 0.34, h: 1.25, mat: outerFlameMat },
    { x: -0.26, z: -0.14, r: 0.32, h: 1.15, mat: outerFlameMat },
    { x: 0, z: 0, r: 0.28, h: 1.25, mat: innerFlameMat },
  ];
  for (const spec of flameSpecs) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(spec.r, spec.h, 6), spec.mat);
    f.position.set(spec.x, 0.55 + spec.h * 0.45, spec.z);
    g.add(f);
    flames.push(f);
  }

  g.userData.flames = flames;
  g.userData.core = core;
  return g;
}

export function createGuardianMesh(shadowMat: THREE.MeshBasicMaterial): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 0.95);

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x4b5c78,
    roughness: 0.28,
    metalness: 0.82,
  });
  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0xa63429,
    roughness: 0.82,
    metalness: 0.05,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x4f3524,
    roughness: 0.78,
    metalness: 0.08,
  });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xffaa44,
    emissive: 0xff5a1a,
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.85,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xffe29a,
    emissive: 0xffaa33,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  // Legs/Boots
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.26), leatherMat);
  leftLeg.position.set(-0.2, 0.28, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.26), leatherMat);
  rightLeg.position.set(0.2, 0.28, 0);
  rightLeg.castShadow = true;
  g.add(leftLeg, rightLeg);

  // Armored Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.78, 8), armorMat);
  torso.position.y = 0.92;
  torso.castShadow = true;
  g.add(torso);

  // Draped Crimson Cloak
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.05, 6, 1, true, 0, Math.PI * 1.15), cloakMat);
  cloak.position.set(0, 0.82, -0.18);
  cloak.rotation.y = Math.PI * 0.42;
  cloak.rotation.x = 0.18;
  cloak.castShadow = true;
  g.add(cloak);

  // Pauldrons
  const pauldronL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), armorMat);
  pauldronL.position.set(-0.44, 1.24, 0);
  pauldronL.scale.set(1.1, 0.75, 1.0);
  const pauldronR = pauldronL.clone();
  pauldronR.position.x = 0.44;
  g.add(pauldronL, pauldronR);

  // Visored Helm + Crest
  const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.44, 8), armorMat);
  helm.position.y = 1.54;
  helm.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.12), visorMat);
  visor.position.set(0, 1.54, 0.23);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.46), cloakMat);
  crest.position.set(0, 1.78, -0.02);
  g.add(helm, visor, crest);

  // Kite Shield (left arm)
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.52), armorMat);
  shield.position.set(-0.52, 0.92, 0.22);
  shield.rotation.y = 0.35;
  shield.castShadow = true;
  g.add(shield);

  // Sword Pivot (right arm) for slash animation
  const swordPivot = new THREE.Group();
  swordPivot.position.set(0.5, 1.0, 0.1);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 6), leatherMat);
  hilt.rotation.x = Math.PI / 2;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), armorMat);
  guard.position.z = 0.14;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 1.05), bladeMat);
  blade.position.z = 0.7;
  blade.castShadow = true;
  swordPivot.add(hilt, guard, blade);
  g.add(swordPivot);

  // Optional Carried Egg Pivot above helm
  const carryAnchor = new THREE.Group();
  carryAnchor.position.set(0, 2.25, 0);
  const carriedEggMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xff9a1a, emissiveIntensity: 0.6 }),
  );
  carriedEggMesh.scale.set(0.85, 1.2, 0.85);
  carriedEggMesh.visible = false;
  carryAnchor.add(carriedEggMesh);
  g.add(carryAnchor);

  g.userData.swordPivot = swordPivot;
  g.userData.leftLeg = leftLeg;
  g.userData.rightLeg = rightLeg;
  g.userData.carriedEggMesh = carriedEggMesh;
  return g;
}

export function createEnemyMesh(
  kind: EnemyKind,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  const arch = ENEMY_ARCHETYPES[kind];
  const isBoss = kind === 'boss';
  const isWarden = kind === 'warden';
  const scale = isBoss
    ? 2.4
    : isWarden
      ? 1.9
      : kind === 'siege'
        ? 1.55
        : kind === 'brute'
          ? 1.3
          : kind === 'runner'
            ? 0.85
            : 1.0;
  addContactShadow(g, shadowMat, 0.72 * scale);

  const mainMat = new THREE.MeshStandardMaterial({
    color: arch.color,
    roughness: 0.72,
    metalness: isWarden ? 0.35 : 0.12,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: kind === 'commander' ? 0xffbe3b : kind === 'spitter' ? 0x6ff088 : isWarden ? 0x8c2030 : 0x252029,
    roughness: 0.35,
    metalness: 0.65,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: kind === 'spitter' ? 0x9cff57 : isWarden ? 0xff6230 : 0xff3b3b,
    emissive: kind === 'spitter' ? 0x55ee22 : isWarden ? 0xff3818 : 0xff2222,
    emissiveIntensity: 1.8,
  });

  const bodyGroup = new THREE.Group();
  bodyGroup.scale.setScalar(scale);

  // 1. Torso silhouette customized by archetype
  const torso = new THREE.Mesh(
    kind === 'brute' || kind === 'siege' || isWarden
      ? new THREE.DodecahedronGeometry(0.48, 0)
      : new THREE.CylinderGeometry(0.28, 0.36, 0.82, 7),
    mainMat,
  );
  torso.position.y = 0.65;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // 2. Head & Glowing Eyes
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.4), mainMat);
  head.position.set(0, 1.18, 0.08);
  head.castShadow = true;
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.08), eyeMat);
  eyeL.position.set(-0.1, 1.2, 0.28);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  bodyGroup.add(head, eyeL, eyeR);

  // 3. Archetype-specific weapon / crest silhouettes
  if (kind === 'raider' || kind === 'brute' || isBoss || isWarden) {
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 5), trimMat);
    hornL.position.set(-0.22, 1.44, 0.05);
    hornL.rotation.z = 0.35;
    const hornR = hornL.clone();
    hornR.position.x = 0.22;
    hornR.rotation.z = -0.35;
    bodyGroup.add(hornL, hornR);
  }
  if (isWarden) {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), eyeMat);
    core.position.set(0, 0.72, 0.42);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.9, 6), trimMat);
    pole.position.set(0.54, 0.95, 0.18);
    const halberd = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.38), trimMat);
    halberd.position.set(0.54, 1.7, 0.26);
    const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.36), trimMat);
    pauldronL.position.set(-0.48, 1.0, 0);
    const pauldronR = pauldronL.clone();
    pauldronR.position.x = 0.48;
    bodyGroup.add(core, pole, halberd, pauldronL, pauldronR);
  } else if (kind === 'brute' || kind === 'siege') {
    const maul = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.55), trimMat);
    maul.position.set(0.55, 0.75, 0.25);
    bodyGroup.add(maul);
  } else if (kind === 'spitter') {
    const sac = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), eyeMat);
    sac.position.set(0, 0.92, -0.25);
    bodyGroup.add(sac);
  } else if (kind === 'commander') {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), trimMat);
    staff.position.set(0.45, 1.0, 0.1);
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), eyeMat);
    orb.position.set(0.45, 1.95, 0.1);
    bodyGroup.add(staff, orb);
  } else if (isBoss) {
    const wingGeo = new THREE.BoxGeometry(0.95, 0.06, 0.45);
    const wL = new THREE.Mesh(wingGeo, trimMat);
    wL.position.set(-0.7, 1.1, -0.2);
    wL.rotation.z = 0.45;
    const wR = new THREE.Mesh(wingGeo, trimMat);
    wR.position.set(0.7, 1.1, -0.2);
    wR.rotation.z = -0.45;
    bodyGroup.add(wL, wR);
  }

  // Telegraph ring around feet (visible during windup!)
  const telegraph = new THREE.Mesh(
    new THREE.RingGeometry(0.55 * scale, 0.72 * scale, 20),
    new THREE.MeshBasicMaterial({
      color: 0xff3b3b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  telegraph.rotation.x = -Math.PI / 2;
  telegraph.position.y = 0.05;
  telegraph.visible = false;

  // Crisp blocky pixel-style Ice Encasement Block (visible while Frozen)
  const iceBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.92 * scale, 1.45 * scale, 0.92 * scale),
    new THREE.MeshStandardMaterial({
      color: 0x8ae8ff,
      emissive: 0x1e88e5,
      emissiveIntensity: 0.45,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.62,
      flatShading: true,
    }),
  );
  iceBlock.position.y = 0.76 * scale;
  iceBlock.visible = false;

  // Orbiting blocky yellow stun diamonds above head (visible while Stunned)
  const stunGroup = new THREE.Group();
  stunGroup.position.y = 1.62 * scale;
  stunGroup.visible = false;
  const starGeo = new THREE.OctahedronGeometry(0.14 * scale, 0);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffe64d });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(Math.cos(a) * 0.45 * scale, 0, Math.sin(a) * 0.45 * scale);
    stunGroup.add(star);
  }

  g.add(bodyGroup, telegraph, iceBlock, stunGroup);
  g.userData.bodyGroup = bodyGroup;
  g.userData.telegraph = telegraph;
  g.userData.iceBlock = iceBlock;
  g.userData.stunGroup = stunGroup;
  g.userData.baseScale = scale;
  g.userData.mainMat = mainMat;
  g.userData.baseColor = new THREE.Color(arch.color);
  return g;
}

export function createBuildingMesh(
  kind: BuildingKind,
  stoneTex: THREE.Texture,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 2.2);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2d, roughness: 0.85, metalness: 0.05 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xffffff, roughness: 0.88, metalness: 0.08 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x3b424d, roughness: 0.35, metalness: 0.82 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xffa833,
    emissive: 0xff621a,
    emissiveIntensity: 1.7,
    roughness: 0.25,
  });

  if (kind === 'wall') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 1.1), stoneMat);
    base.position.y = 0.75;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);
    for (let i = -1; i <= 1; i++) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 1.15), stoneMat);
      merlon.position.set(i * 1.1, 1.7, 0);
      merlon.castShadow = true;
      g.add(merlon);
    }
    const brace = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.22, 1.2), ironMat);
    brace.position.y = 0.9;
    g.add(brace);
  } else if (kind === 'watchtower') {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, 0.6, 8), stoneMat);
    plinth.position.y = 0.3;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.1, 2.6, 8), woodMat);
    shaft.position.y = 1.85;
    shaft.castShadow = true;
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.0, 0.4, 8), stoneMat);
    deck.position.y = 3.25;
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), emberMat);
    beacon.position.y = 3.95;
    g.add(plinth, shaft, deck, beacon);
    g.userData.beacon = beacon;
  } else if (kind === 'nest') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.05, 0.45, 10), stoneMat);
    base.position.y = 0.22;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.28, 7, 14), woodMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.55;
    const brazier = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), emberMat);
    brazier.position.set(0, 1.2, -1.35);
    g.add(base, rim, brazier);
  } else if (kind === 'lumber') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.26, 2.4), woodMat);
    deck.position.y = 0.13;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), woodMat);
    roof.position.y = 2.05;
    roof.rotation.y = Math.PI / 4;
    for (const sx of [-1, 1]) {
      for (const sz of [-0.8, 0.8]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), woodMat);
        post.position.set(sx * 1.1, 0.9, sz);
        g.add(post);
      }
    }
    const logStack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.3, 7), woodMat);
    logStack.rotation.z = Math.PI / 2;
    logStack.position.set(0.3, 0.48, 0.9);
    g.add(deck, roof, logStack);
  } else if (kind === 'quarry') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.35, 2.6), stoneMat);
    slab.position.y = 0.18;
    const crane = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.4, 0.22), woodMat);
    crane.position.set(-0.9, 1.35, -0.6);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.18), ironMat);
    arm.position.set(0, 2.4, -0.6);
    const block = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), stoneMat);
    block.position.set(0.6, 0.72, 0.4);
    g.add(slab, crane, arm, block);
  } else if (kind === 'farm') {
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x4f3924, roughness: 0.94 });
    const wheatMat = new THREE.MeshStandardMaterial({ color: 0xd4b648, roughness: 0.78 });
    const plot = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 2.8), soilMat);
    plot.position.y = 0.08;
    plot.receiveShadow = true;
    g.add(plot);
    for (let r = -1; r <= 1; r++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 0.45), wheatMat);
      row.position.set(0, 0.34, r * 0.78);
      row.castShadow = true;
      g.add(row);
    }
    for (const sx of [-1.45, 1.45]) {
      for (const sz of [-1.25, 1.25]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 6), woodMat);
        post.position.set(sx, 0.44, sz);
        g.add(post);
      }
    }
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), emberMat);
    lantern.position.set(1.45, 1.0, 1.25);
    g.add(lantern);
  } else if (kind === 'sanctuary') {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.35, 10), stoneMat);
    plinth.position.y = 0.18;
    plinth.receiveShadow = true;
    g.add(plinth);
    for (const sign of [-1, 1]) {
      const archPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.5, 0.45), stoneMat);
      archPillar.position.set(sign * 1.35, 1.4, -0.5);
      archPillar.castShadow = true;
      g.add(archPillar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.42, 0.6), stoneMat);
    lintel.position.set(0, 2.75, -0.5);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.5, 0.45, 8), ironMat);
    bowl.position.set(0, 0.55, 0.25);
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), emberMat);
    flame.position.set(0, 1.08, 0.25);
    g.add(lintel, bowl, flame);
    g.userData.beacon = flame;
  } else if (kind === 'recruitment') {
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x3b76b8, roughness: 0.78 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 2.4), woodMat);
    deck.position.y = 0.1;
    const tent = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.85, 4), clothMat);
    tent.position.set(0, 1.1, 0);
    tent.rotation.y = Math.PI / 4;
    tent.castShadow = true;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.9, 6), woodMat);
    pole.position.set(1.25, 1.45, 0.9);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.58), clothMat);
    banner.position.set(1.25, 2.45, 1.18);
    g.add(deck, tent, pole, banner);
  } else if (kind === 'workshop') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.28, 2.6), stoneMat);
    slab.position.y = 0.14;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 2.2), woodMat);
    roof.position.set(0, 2.05, 0);
    roof.rotation.x = -0.14;
    for (const sx of [-1.15, 1.15]) {
      for (const sz of [-0.9, 0.9]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.8, 6), woodMat);
        post.position.set(sx, 1.0, sz);
        g.add(post);
      }
    }
    const forge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.85), stoneMat);
    forge.position.set(-0.65, 0.7, -0.45);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), emberMat);
    glow.position.set(-0.65, 0.75, 0.0);
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.42), ironMat);
    anvil.position.set(0.55, 0.48, 0.35);
    g.add(slab, roof, forge, glow, anvil);
  } else {
    // training ground
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.22, 10), stoneMat);
    ring.position.y = 0.11;
    const dummyPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.8, 6), woodMat);
    dummyPost.position.set(0, 0.95, 0);
    const dummyArms = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.18), woodMat);
    dummyArms.position.set(0, 1.35, 0);
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), emberMat);
    emblem.position.set(0, 2.1, 0);
    g.add(ring, dummyPost, dummyArms, emblem);
  }

  return g;
}

export function createCaveMesh(index: number, shadowMat: THREE.MeshBasicMaterial): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 4.6);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x2b2633,
    roughness: 0.9,
    metalness: 0.12,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xb95cff,
    emissive: 0x9020e8,
    emissiveIntensity: 1.9,
    roughness: 0.2,
    metalness: 0.4,
  });

  // Flanking spires + Obsidian arch
  const spireL = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.6, 6), rockMat);
  spireL.position.set(-2.1, 2.2, 0);
  spireL.castShadow = true;
  const spireR = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.3, 6), rockMat);
  spireR.position.set(2.1, 2.1, 0);
  spireR.castShadow = true;
  const lintel = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1, 0), rockMat);
  lintel.position.set(0, 3.5, -0.4);
  lintel.scale.set(1.5, 0.8, 1.0);
  lintel.castShadow = true;

  const portal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 0.4, 10),
    new THREE.MeshBasicMaterial({ color: 0x0b0512 }),
  );
  portal.rotation.x = Math.PI / 2;
  portal.position.set(0, 1.6, 0.25);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), crystalMat);
  crystal.position.set(0, 4.7, 0);

  // Translucent Void-Ward Dome (visible while earlier numbered caves remain standing)
  const wardDome = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0x9d4dff,
      transparent: true,
      opacity: 0.22,
      wireframe: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  wardDome.position.y = 0.05;
  wardDome.visible = false;

  // Target Conquest Ground Beacon Ring (visible on the currently active unwarded cave)
  const targetBeacon = new THREE.Mesh(
    new THREE.RingGeometry(4.3, 5.05, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff5a36,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.82,
    }),
  );
  targetBeacon.rotation.x = -Math.PI / 2;
  targetBeacon.position.y = 0.06;
  targetBeacon.visible = false;

  g.add(spireL, spireR, lintel, portal, crystal, wardDome, targetBeacon);
  g.userData.crystal = crystal;
  g.userData.rockMat = rockMat;
  g.userData.wardDome = wardDome;
  g.userData.targetBeacon = targetBeacon;
  g.userData.caveIndex = index;
  return g;
}

export function createResourceNodeMesh(
  kind: ResourceNodeKind,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 1.25);

  if (kind === 'wood') {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x26542d, roughness: 0.82 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.5, 6), trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.8, 7), leafMat);
    c1.position.y = 2.0;
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.5, 7), leafMat);
    c2.position.y = 3.0;
    c2.castShadow = true;
    g.add(trunk, c1, c2);
  } else if (kind === 'stone') {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6f7a85, roughness: 0.85, metalness: 0.12 });
    const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), rockMat);
    r1.position.set(0, 0.52, 0);
    r1.scale.set(1.2, 0.8, 1.0);
    r1.castShadow = true;
    const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), rockMat);
    r2.position.set(0.65, 0.36, 0.35);
    const r3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), rockMat);
    r3.position.set(-0.55, 0.3, -0.35);
    g.add(r1, r2, r3);
  } else if (kind === 'food') {
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x356e35, roughness: 0.85 });
    const berryMat = new THREE.MeshStandardMaterial({
      color: 0xe64a5b,
      emissive: 0x5c1018,
      emissiveIntensity: 0.35,
      roughness: 0.45,
    });
    const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), bushMat);
    b1.position.set(0, 0.55, 0);
    b1.scale.set(1.2, 0.85, 1.15);
    b1.castShadow = true;
    const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), bushMat);
    b2.position.set(0.55, 0.38, 0.28);
    const b3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.44, 0), bushMat);
    b3.position.set(-0.48, 0.36, -0.24);
    g.add(b1, b2, b3);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), berryMat);
      berry.position.set(Math.cos(a) * 0.52, 0.72 + (i % 2) * 0.14, Math.sin(a) * 0.52);
      g.add(berry);
    }
  } else {
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x3b2c2a, roughness: 0.88 });
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xff8c2b,
      emissive: 0xff4f0f,
      emissiveIntensity: 1.7,
      roughness: 0.22,
      metalness: 0.35,
    });
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), baseMat);
    base.position.y = 0.35;
    base.scale.set(1.2, 0.6, 1.2);
    g.add(base);
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), shardMat);
      const a = (i / 3) * Math.PI * 2;
      shard.position.set(Math.cos(a) * 0.26, 0.78 + i * 0.08, Math.sin(a) * 0.26);
      shard.scale.set(0.6, 1.8, 0.6);
      shard.rotation.z = (i - 1) * 0.22;
      g.add(shard);
    }
  }
  return g;
}

export function createEggMesh(
  element: DragonElement,
  tier: EggTier,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  const arch = DRAGON_ARCHETYPES[element];
  const tierInfo = EGG_TIER_INFO[tier];
  addContactShadow(g, shadowMat, 0.72);

  const nestMat = new THREE.MeshStandardMaterial({ color: 0x6b4b2c, roughness: 0.9 });
  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 6, 10), nestMat);
  nest.rotation.x = Math.PI / 2;
  nest.position.y = 0.1;

  const eggMat = new THREE.MeshStandardMaterial({
    color: tier === 3 ? 0xffe066 : 0xf4efe4,
    emissive: arch.color,
    emissiveIntensity: 0.35 + tier * 0.2,
    roughness: 0.3,
    metalness: tier === 3 ? 0.45 : 0.1,
  });
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), eggMat);
  egg.scale.set(0.82, 1.22, 0.82);
  egg.position.y = 0.46;
  egg.castShadow = true;

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 0.62, 16),
    new THREE.MeshBasicMaterial({
      color: tierInfo.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.04;

  g.add(nest, egg, halo);
  g.userData.egg = egg;
  return g;
}

export function createRuinMesh(
  stoneTex: THREE.Texture,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 3.8);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xb7beb2,
    roughness: 0.9,
    metalness: 0.08,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x45633c,
    roughness: 0.92,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x8b95a5,
    emissive: 0x3b4454,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.4,
  });

  const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.5, 0.35, 8), stoneMat);
  dais.position.y = 0.18;
  dais.receiveShadow = true;
  g.add(dais);

  // Broken ancient columns framing the sanctuary stone
  const heights = [2.6, 2.8, 1.4, 1.7];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const h = heights[i];
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, h, 7), stoneMat);
    col.position.set(Math.cos(a) * 2.35, h * 0.5 + 0.3, Math.sin(a) * 2.35);
    col.castShadow = true;
    g.add(col);
  }
  const archLintel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.42, 0.72), mossMat);
  archLintel.position.set(0, 3.15, 2.0);
  archLintel.rotation.z = -0.06;
  g.add(archLintel);

  const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 1.9, 6), stoneMat);
  obelisk.position.y = 1.25;
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), beaconMat);
  beacon.position.y = 2.55;
  g.add(obelisk, beacon);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(3.4, 3.85, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf0c250,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.38,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.05;
  g.add(halo);

  g.userData.beacon = beacon;
  g.userData.beaconMat = beaconMat;
  g.userData.halo = halo;
  return g;
}

export function createDragonJailMesh(
  element: DragonElement,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 2.8);
  const arch = DRAGON_ARCHETYPES[element];

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a3742, roughness: 0.88, metalness: 0.25 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1d2028, roughness: 0.35, metalness: 0.85 });
  const spiritMat = new THREE.MeshStandardMaterial({
    color: arch.color,
    emissive: arch.accentColor,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.3, 8), baseMat);
  plinth.position.y = 0.15;
  g.add(plinth);

  const cageGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6), ironMat);
    bar.position.set(Math.cos(a) * 1.45, 1.35, Math.sin(a) * 1.45);
    bar.castShadow = true;
    cageGroup.add(bar);
  }
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.1, 6, 12), ironMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 2.42;
  const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), spiritMat);
  padlock.position.set(0, 1.2, 1.55);
  cageGroup.add(topRing, padlock);
  g.add(cageGroup);

  const spiritOrb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), spiritMat);
  spiritOrb.position.y = 1.25;
  g.add(spiritOrb);

  g.userData.cageGroup = cageGroup;
  g.userData.spiritOrb = spiritOrb;
  return g;
}

export function createProtectorMesh(shadowMat: THREE.MeshBasicMaterial): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 0.85);

  const steelMat = new THREE.MeshStandardMaterial({ color: 0xa6b7cc, roughness: 0.28, metalness: 0.85 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf4bd49, roughness: 0.3, metalness: 0.8 });
  const azureMat = new THREE.MeshStandardMaterial({ color: 0x265b9c, roughness: 0.78 });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.22), steelMat);
  leftLeg.position.set(-0.18, 0.25, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.22), steelMat);
  rightLeg.position.set(0.18, 0.25, 0);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.72, 8), steelMat);
  torso.position.y = 0.86;
  torso.castShadow = true;
  const surcoat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.5), azureMat);
  surcoat.position.y = 0.78;
  const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.38, 8), steelMat);
  helm.position.y = 1.42;
  const plume = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.36), goldMat);
  plume.position.set(0, 1.66, -0.04);

  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 0.52), azureMat);
  shield.position.set(-0.46, 0.88, 0.2);
  shield.rotation.y = 0.3;

  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.44, 0.95, 0.1);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.55, 6), goldMat);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.45;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 5), steelMat);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 1.32;
  weaponPivot.add(shaft, tip);

  g.add(leftLeg, rightLeg, torso, surcoat, helm, plume, shield, weaponPivot);
  g.userData.leftLeg = leftLeg;
  g.userData.rightLeg = rightLeg;
  g.userData.weaponPivot = weaponPivot;
  return g;
}

export function createPerimeterWallMesh(
  isHorizontal: boolean,
  spanLength: number,
  stoneTex: THREE.Texture,
): THREE.Group {
  const g = new THREE.Group();
  if (!isHorizontal) {
    g.rotation.y = Math.PI / 2;
  }

  const stakeMat = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.92 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x7c502b, roughness: 0.86, metalness: 0.04 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xffffff, roughness: 0.88, metalness: 0.08 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x2c323c, roughness: 0.3, metalness: 0.85 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xffa833,
    emissive: 0xff5a18,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });

  // Tier 0: Low perimeter stake markers along the 4 edges (with central open road)
  const tier0Group = new THREE.Group();
  const halfSpan = spanLength * 0.5;
  for (let x = -halfSpan + 1.5; x <= halfSpan - 1.5; x += 3.0) {
    if (Math.abs(x) < 2.2) continue; // friendly gateway gap
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.65, 5), stakeMat);
    stake.position.set(x, 0.32, 0);
    tier0Group.add(stake);
  }
  g.add(tier0Group);

  // Tier 1: Timber Palisade (left/right wings + twin wooden gate towers + seamless corner posts)
  const tier1Group = new THREE.Group();
  const wingLen = halfSpan - 2.3;
  for (const sign of [-1, 1]) {
    const cx = sign * (2.3 + wingLen * 0.5);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(wingLen, 1.45, 0.72), timberMat);
    beam.position.set(cx, 0.72, 0);
    beam.castShadow = true;
    beam.receiveShadow = true;
    tier1Group.add(beam);

    // Pointed palisade pickets
    for (let px = -wingLen * 0.46; px <= wingLen * 0.46; px += 1.4) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 5), timberMat);
      spike.position.set(cx + px, 1.72, 0);
      tier1Group.add(spike);
    }

    // Gate pillar
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.2, 0.95), timberMat);
    pillar.position.set(sign * 2.3, 1.1, 0);
    pillar.castShadow = true;
    tier1Group.add(pillar);

    // Corner bastion watch-post on horizontal walls welds all 4 corners cleanly
    if (isHorizontal) {
      const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(1.18, 2.35, 1.18), timberMat);
      cornerPost.position.set(sign * halfSpan, 1.18, 0);
      cornerPost.castShadow = true;
      cornerPost.receiveShadow = true;
      const cornerCap = new THREE.Mesh(new THREE.ConeGeometry(0.88, 0.65, 4), timberMat);
      cornerCap.position.set(sign * halfSpan, 2.65, 0);
      cornerCap.rotation.y = Math.PI / 4;
      tier1Group.add(cornerPost, cornerCap);
    }
  }
  g.add(tier1Group);

  // Tier 2: Mortared Stone Rampart (thick stone wall + merlons + stone gatehouse + corner turrets)
  const tier2Group = new THREE.Group();
  for (const sign of [-1, 1]) {
    const cx = sign * (2.3 + wingLen * 0.5);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wingLen, 1.95, 1.05), stoneMat);
    wall.position.set(cx, 0.98, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    tier2Group.add(wall);

    for (let px = -wingLen * 0.44; px <= wingLen * 0.44; px += 1.7) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.5, 1.1), stoneMat);
      merlon.position.set(cx + px, 2.18, 0);
      merlon.castShadow = true;
      tier2Group.add(merlon);
    }

    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.8, 1.25), stoneMat);
    tower.position.set(sign * 2.3, 1.4, 0);
    tower.castShadow = true;
    tier2Group.add(tower);

    if (isHorizontal) {
      const cornerTurret = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.05, 1.6), stoneMat);
      cornerTurret.position.set(sign * halfSpan, 1.52, 0);
      cornerTurret.castShadow = true;
      cornerTurret.receiveShadow = true;
      const cornerCrown = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.42, 1.82), stoneMat);
      cornerCrown.position.set(sign * halfSpan, 3.2, 0);
      tier2Group.add(cornerTurret, cornerCrown);
    }
  }
  g.add(tier2Group);

  // Tier 3: Sunfire Citadel Trim (iron braces + ember braziers on gate & corner towers)
  const tier3Group = new THREE.Group();
  for (const sign of [-1, 1]) {
    const cx = sign * (2.3 + wingLen * 0.5);
    const band = new THREE.Mesh(new THREE.BoxGeometry(wingLen + 0.1, 0.26, 1.18), ironMat);
    band.position.set(cx, 1.35, 0);
    tier3Group.add(band);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 1.4), ironMat);
    cap.position.set(sign * 2.3, 2.95, 0);
    const brazier = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), emberMat);
    brazier.position.set(sign * 2.3, 3.45, 0);
    tier3Group.add(cap, brazier);

    if (isHorizontal) {
      const cornerIron = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.34, 1.75), ironMat);
      cornerIron.position.set(sign * halfSpan, 3.42, 0);
      const cornerBrazier = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), emberMat);
      cornerBrazier.position.set(sign * halfSpan, 3.98, 0);
      tier3Group.add(cornerIron, cornerBrazier);
    }
  }
  g.add(tier3Group);

  g.userData.tier0Group = tier0Group;
  g.userData.tier1Group = tier1Group;
  g.userData.tier2Group = tier2Group;
  g.userData.tier3Group = tier3Group;
  return g;
}

export function createAbandonedSettlementMesh(
  stoneTex: THREE.CanvasTexture,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 3.4);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.92 });
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xffffff,
    roughness: 0.88,
  });

  // Cold hearth ring
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), stoneMat);
    s.position.set(Math.cos(a) * 0.85, 0.2, Math.sin(a) * 0.85);
    g.add(s);
  }
  const ash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.72, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.96 }),
  );
  ash.position.y = 0.06;
  g.add(ash);

  // Broken timber cabin frame + leaned beam
  const postPositions: Array<[number, number, number]> = [
    [-2.1, -1.8, 2.0],
    [2.1, -1.8, 1.5],
    [-2.1, 1.4, 1.2],
    [2.1, 1.4, 1.8],
  ];
  postPositions.forEach(([px, pz, h]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, h, 0.32), woodMat);
    post.position.set(px, h * 0.5, pz);
    post.castShadow = true;
    g.add(post);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.26, 0.28), woodMat);
  beam.position.set(0, 1.72, -1.8);
  beam.rotation.z = -0.1;
  g.add(beam);

  // Supply crate cluster (hidden when looted)
  const crateGroup = new THREE.Group();
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.85), woodMat);
  c1.position.set(1.6, 0.38, 0.1);
  c1.rotation.y = 0.25;
  const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.82, 8), woodMat);
  c2.position.set(2.3, 0.41, 0.7);
  crateGroup.add(c1, c2);
  g.add(crateGroup);

  // Claimed Outpost Banner (visible when claimed in Phase 6)
  const bannerGroup = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6), woodMat);
  pole.position.set(-2.4, 1.8, 0);
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.1, 0.9),
    new THREE.MeshStandardMaterial({
      color: 0xffaa33,
      emissive: 0xd96b14,
      emissiveIntensity: 0.75,
      roughness: 0.4,
    }),
  );
  flag.position.set(-2.4, 3.0, 0.45);
  bannerGroup.add(pole, flag);
  bannerGroup.visible = false;
  g.add(bannerGroup);

  // Claimed Outpost Palisade & Territory Ring (visible when claimed & fortified)
  const outpostWallGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.28) continue; // open approach gateway
    const seg = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.25, 0.38), woodMat);
    seg.position.set(Math.cos(a) * 5.2, 0.62, Math.sin(a) * 5.2);
    seg.rotation.y = -a + Math.PI / 2;
    seg.castShadow = true;
    outpostWallGroup.add(seg);
  }
  outpostWallGroup.visible = false;
  g.add(outpostWallGroup);

  const territoryRing = new THREE.Mesh(
    new THREE.RingGeometry(21.6, 22.0, 48),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    }),
  );
  territoryRing.rotation.x = -Math.PI / 2;
  territoryRing.position.y = 0.04;
  territoryRing.visible = false;
  g.add(territoryRing);

  g.userData.crateGroup = crateGroup;
  g.userData.bannerGroup = bannerGroup;
  g.userData.outpostWallGroup = outpostWallGroup;
  g.userData.territoryRing = territoryRing;
  return g;
}

export function createAncientShrineMesh(
  colorHex: string,
  stoneTex: THREE.CanvasTexture,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 2.5);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xdddddd,
    roughness: 0.82,
  });
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 0.45, 8), stoneMat);
  dais.position.y = 0.22;
  dais.receiveShadow = true;
  g.add(dais);

  for (const sign of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.8, 0.55), stoneMat);
    pillar.position.set(sign * 1.35, 1.6, 0);
    pillar.rotation.z = sign * 0.08;
    pillar.castShadow = true;
    g.add(pillar);
  }

  const crystalMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.25,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), crystalMat);
  crystal.position.y = 2.05;
  crystal.scale.set(0.75, 1.45, 0.75);
  g.add(crystal);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.45, 24),
    new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.48,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  g.add(ring);

  g.userData.crystal = crystal;
  g.userData.crystalMat = crystalMat;
  g.userData.ring = ring;
  return g;
}

export function createTreasureSiteMesh(shadowMat: THREE.MeshBasicMaterial): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 1.35);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4523, roughness: 0.84 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    emissive: 0xc28a12,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.3,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 0.78), woodMat);
  body.position.y = 0.34;
  body.castShadow = true;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 1.15, 8, 1, false, 0, Math.PI), woodMat);
  lid.rotation.z = Math.PI / 2;
  lid.position.y = 0.66;
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.14, 0.82), goldMat);
  band.position.y = 0.56;
  const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
  glint.position.y = 1.25;

  g.add(body, lid, band, glint);
  g.userData.glint = glint;
  return g;
}

export function createWildlifeMesh(
  kind: 'deer' | 'rabbit',
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'deer') {
    addContactShadow(g, shadowMat, 0.65);
    const furMat = new THREE.MeshStandardMaterial({ color: 0x9c6e44, roughness: 0.85 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.75 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.44, 0.95), furMat);
    body.position.y = 0.68;
    body.castShadow = true;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.24), furMat);
    neck.position.set(0, 1.0, 0.36);
    neck.rotation.x = 0.3;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.36), furMat);
    head.position.set(0, 1.22, 0.52);
    const lAntler = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.34, 5), antlerMat);
    lAntler.position.set(-0.1, 1.44, 0.44);
    lAntler.rotation.z = 0.35;
    const rAntler = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.34, 5), antlerMat);
    rAntler.position.set(0.1, 1.44, 0.44);
    rAntler.rotation.z = -0.35;
    g.add(body, neck, head, lAntler, rAntler);
    for (const [lx, lz] of [
      [-0.16, 0.32],
      [0.16, 0.32],
      [-0.16, -0.32],
      [0.16, -0.32],
    ]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.52, 5), furMat);
      leg.position.set(lx, 0.26, lz);
      g.add(leg);
    }
  } else {
    addContactShadow(g, shadowMat, 0.32);
    const furMat = new THREE.MeshStandardMaterial({ color: 0xc9b8a3, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), furMat);
    body.position.y = 0.2;
    body.scale.set(0.85, 0.85, 1.2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), furMat);
    head.position.set(0, 0.34, 0.18);
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 5), furMat);
    earL.position.set(-0.06, 0.5, 0.14);
    earL.rotation.z = 0.18;
    const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 5), furMat);
    earR.position.set(0.06, 0.5, 0.14);
    earR.rotation.z = -0.18;
    g.add(body, head, earL, earR);
  }
  return g;
}

export function createCaveClueMesh(kind: 'charred_tree' | 'tracks'): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'charred_tree') {
    const charMat = new THREE.MeshStandardMaterial({ color: 0x2a2326, roughness: 0.95 });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      emissive: 0xb52b00,
      emissiveIntensity: 0.9,
      roughness: 0.4,
    });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 2.3, 6), charMat);
    trunk.position.y = 1.1;
    trunk.rotation.z = 0.16;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.0, 5), charMat);
    branch.position.set(-0.32, 1.45, 0);
    branch.rotation.z = 0.72;
    const scar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.28), emberMat);
    scar.position.set(0.12, 0.75, 0.16);
    g.add(trunk, branch, scar);
  } else {
    const trackMat = new THREE.MeshBasicMaterial({
      color: 0x1e1326,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    for (let i = -1; i <= 1; i += 2) {
      const print = new THREE.Mesh(new THREE.CircleGeometry(0.32, 8), trackMat);
      print.rotation.x = -Math.PI / 2;
      print.position.set(i * 0.42, 0.025, i * 0.5);
      g.add(print);
    }
  }
  return g;
}

export function createSurvivorMesh(shadowMat: THREE.MeshBasicMaterial): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 0.55);

  const cloakMat = new THREE.MeshStandardMaterial({ color: 0x7c6a56, roughness: 0.88 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6be9a, roughness: 0.72 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    emissive: 0xd99018,
    emissiveIntensity: 1.2,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.82, 7), cloakMat);
  body.position.y = 0.44;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 7), skinMat);
  head.position.y = 1.05;
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), beaconMat);
  beacon.position.y = 1.62;

  g.add(body, head, beacon);
  g.userData.beacon = beacon;
  return g;
}

export function createWorkerMesh(
  role: WorkerRole,
  shadowMat: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowMat, 0.62);

  const meta = WORKER_ROLE_META[role];
  const tunicMat = new THREE.MeshStandardMaterial({ color: meta.hatColor, roughness: 0.78 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3b352f, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8c29e, roughness: 0.72 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x734a28, roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xb8c5d6, roughness: 0.3, metalness: 0.8 });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.16), pantsMat);
  leftLeg.position.set(-0.13, 0.2, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.16), pantsMat);
  rightLeg.position.set(0.13, 0.2, 0);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.64, 8), tunicMat);
  torso.position.y = 0.7;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 7), skinMat);
  head.position.y = 1.18;

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.18, 8), tunicMat);
  hat.position.y = 1.38;

  const toolPivot = new THREE.Group();
  toolPivot.position.set(0.32, 0.76, 0.1);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 5), woodMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 0.24;
  toolPivot.add(handle);

  const headBlade = new THREE.Mesh(
    role === 'guard'
      ? new THREE.ConeGeometry(0.1, 0.28, 5)
      : new THREE.BoxGeometry(0.24, 0.14, 0.14),
    steelMat,
  );
  headBlade.rotation.x = role === 'guard' ? Math.PI / 2 : 0;
  headBlade.position.z = 0.68;
  toolPivot.add(headBlade);

  const carryBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.28, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x8f6234, roughness: 0.8 }),
  );
  carryBox.position.set(0, 0.9, -0.32);
  carryBox.visible = false;

  g.add(leftLeg, rightLeg, torso, head, hat, toolPivot, carryBox);
  g.userData.leftLeg = leftLeg;
  g.userData.rightLeg = rightLeg;
  g.userData.toolPivot = toolPivot;
  g.userData.carryBox = carryBox;
  g.userData.tunicMat = tunicMat;
  g.userData.workerRole = role;
  return g;
}

