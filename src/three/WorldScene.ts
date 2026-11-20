import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BUILDING_DEFS,
  type BuildingKind,
  CAMP_RADIUS,
  DRAGON_ARCHETYPES,
  type DragonCommand,
  type DragonElement,
  EGG_TIER_INFO,
  PERIMETER_WALL_RADIUS,
  WORLD_RADIUS,
} from '../game/data';
import { DRAGON_ABILITY_CONFIG } from '../game/dragonConfig';
import {
  ensureDebugDragon,
  type GameEvent,
  type GameInput,
  type GameState,
  issueDragonCommand,
  placeBuilding,
  spawnDebugEnemies,
  stepSimulation,
  triggerDebugDragonAbility,
} from '../game/engine';
import { getCaveApproachClues, RESOURCE_GROVES } from '../game/exploration';
import { getActiveTargetCave, isCaveWarded, REGION_ROADS } from '../game/regionMap';
import { WORKER_ROLE_META } from '../game/workers';
import { soundEngine } from './audio';
import {
  DRAGON_DEBUG_CYCLE,
  type DragonSpriteInstance,
  DragonSpriteSystem,
} from './dragonSprites';
import {
  createAbandonedSettlementMesh,
  createAncientShrineMesh,
  createBuildingMesh,
  createCampfireCitadel,
  createCaveClueMesh,
  createCaveMesh,
  createDragonJailMesh,
  createEggMesh,
  createEnemyMesh,
  createGuardianMesh,
  createPerimeterWallMesh,
  createProtectorMesh,
  createResourceNodeMesh,
  createRuinMesh,
  createSurvivorMesh,
  createTreasureSiteMesh,
  createWildlifeMesh,
  createWorkerMesh,
} from './models';
import { FloatingDamageOverlay, PixelVfxSystem } from './pixelVfx';
import {
  createGroundTextures,
  createRadialShadowTexture,
  createStoneTexture,
  GROUND_MESH_RADIUS,
} from './textures';

export interface FloatingPopup {
  id: number;
  text: string;
  color: string;
  screenX: number;
  screenY: number;
  age: number;
  maxAge: number;
}

export interface WorldController {
  setIntroChapter(idx: number): void;
  getState(): GameState;
  resetGame(seed?: number): void;
  setBuildPlacementMode(kind: BuildingKind | null): void;
  debugTriggerAbility(element: DragonElement): void;
  debugSpawnEnemies(preset: 'pack' | 'huge' | 'boss'): void;
  debugEnsureAllDragons(): void;
  dispose(): void;
}

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _color = new THREE.Color();
const _anchorPos = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hitPoint = new THREE.Vector3();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _camLookScratch = new THREE.Vector3();
const _skyDay = new THREE.Color('#3b556e');
const _skyDusk = new THREE.Color('#693932');
const _skyNight = new THREE.Color('#090e1c');
const _skyCurrent = new THREE.Color();
const _sunDay = new THREE.Color('#ffdfba');
const _sunDusk = new THREE.Color('#ff9457');
const _sunNight = new THREE.Color('#5a7cc7');

function detectSoftwareGl(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function mountWorldScene(
  container: HTMLElement,
  stateRef: { current: GameState },
  onSyncHud: () => void,
  onBanner: (title: string, subtitle: string, color: string) => void,
  onPlayResult: (result: { ok: boolean; reason?: string }) => void,
  onToast?: (title: string, subtitle: string, color: string) => void,
): WorldController {
  const isSoftwareGl = detectSoftwareGl();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    preserveDrawingBuffer: isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight,
  );

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = _skyDay.clone();
  scene.fog = new THREE.FogExp2(_skyDay.getHex(), 0.0072);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(
    46,
    (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
    0.5,
    360,
  );
  camera.position.set(0, 22, 24);
  camera.lookAt(0, 0, 0);

  // Warm key directional light + cool sky/ground HemisphereLight + Campfire PointLight + 1 FireBreath flicker PointLight
  const hemiLight = new THREE.HemisphereLight(0x8bb6e8, 0x2c3b22, 0.72);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffdfba, 1.85);
  keyLight.position.set(28, 42, 22);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 5;
  keyLight.shadow.camera.far = 110;
  keyLight.shadow.camera.left = -38;
  keyLight.shadow.camera.right = 38;
  keyLight.shadow.camera.top = 38;
  keyLight.shadow.camera.bottom = -38;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);
  scene.add(keyLight.target);

  const fireLight = new THREE.PointLight(0xff7722, 18, 28, 1.5);
  fireLight.position.set(0, 2.2, 0);
  scene.add(fireLight);

  const fireBreathLight = new THREE.PointLight(0xff6b1a, 0, 11.5, 1.7);
  fireBreathLight.position.set(0, 1.0, 0);
  scene.add(fireBreathLight);

  // Textures & Shared Materials
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const { colorMap: groundColor, bumpMap: groundBump } = createGroundTextures(maxAniso);
  const stoneTex = createStoneTexture(maxAniso);
  const shadowTex = createRadialShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const dragonSprites = new DragonSpriteSystem(shadowTex);
  const pixelVfx = new PixelVfxSystem(scene);
  const floatingNumbers = new FloatingDamageOverlay(container);

  // Ground Plane extending well past playable perimeter into horizon fog
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundColor,
    bumpMap: groundBump,
    bumpScale: 0.14,
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND_MESH_RADIUS, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Subtle Sanctuary Perimeter Ring around the Campfire Citadel
  const campRing = new THREE.Mesh(
    new THREE.RingGeometry(CAMP_RADIUS - 0.18, CAMP_RADIUS + 0.12, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffa84c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    }),
  );
  campRing.rotation.x = -Math.PI / 2;
  campRing.position.y = 0.03;
  scene.add(campRing);

  // Roadside Stone Mileposts + Amber Lantern Caps (InstancedMesh, zero extra PointLights)
  const milepostCoords: Array<{ x: number; z: number; color: string }> = [];
  for (const road of REGION_ROADS) {
    for (let i = 1; i < road.points.length; i++) {
      const [ax, az] = road.points[i - 1];
      const [bx, bz] = road.points[i];
      const mx = (ax + bx) * 0.5;
      const mz = (az + bz) * 0.5;
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      const side = i % 2 === 0 ? 1 : -1;
      milepostCoords.push({
        x: mx + (-dz / len) * 3.8 * side,
        z: mz + (dx / len) * 3.8 * side,
        color: road.color,
      });
    }
  }
  if (milepostCoords.length > 0) {
    const postGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.35, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x4b515c, roughness: 0.85 });
    const capGeo = new THREE.OctahedronGeometry(0.22, 0);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xffcb66,
      emissive: 0xff8c24,
      emissiveIntensity: 1.3,
      roughness: 0.2,
    });
    const postMesh = new THREE.InstancedMesh(postGeo, postMat, milepostCoords.length);
    const capMesh = new THREE.InstancedMesh(capGeo, capMat, milepostCoords.length);
    milepostCoords.forEach((mp, idx) => {
      _pos.set(mp.x, 0.68, mp.z);
      _quat.identity();
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      postMesh.setMatrixAt(idx, _mat4);
      _pos.set(mp.x, 1.52, mp.z);
      _mat4.compose(_pos, _quat, _scale);
      capMesh.setMatrixAt(idx, _mat4);
      _color.set(mp.color);
      capMesh.setColorAt(idx, _color);
    });
    postMesh.computeBoundingSphere();
    capMesh.computeBoundingSphere();
    scene.add(postMesh, capMesh);
  }

  // Natural Forest & Rock Perimeter Ring (InstancedMesh > 140 pines enclosing 140m region)
  const perimeterCount = 144;
  const trunkGeo = new THREE.CylinderGeometry(0.36, 0.54, 3.2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452d1a, roughness: 0.9 });
  const crownGeo = new THREE.ConeGeometry(2.35, 5.4, 7);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x1e4023, roughness: 0.85 });
  const outerTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, perimeterCount);
  const outerCrowns = new THREE.InstancedMesh(crownGeo, crownMat, perimeterCount);
  for (let i = 0; i < perimeterCount; i++) {
    const a = (i / perimeterCount) * Math.PI * 2 + (i % 3) * 0.03;
    const dist = WORLD_RADIUS + 4.0 + (i % 5) * 4.2;
    const sc = 0.9 + (i % 4) * 0.18;
    _pos.set(Math.cos(a) * dist, 1.6 * sc, Math.sin(a) * dist);
    _quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, a);
    _scale.set(sc, sc, sc);
    _mat4.compose(_pos, _quat, _scale);
    outerTrunks.setMatrixAt(i, _mat4);

    _pos.y = 4.2 * sc;
    _mat4.compose(_pos, _quat, _scale);
    outerCrowns.setMatrixAt(i, _mat4);
    _color.setHSL(0.33 + ((i % 5) - 2) * 0.015, 0.38, 0.18 + (i % 3) * 0.03);
    outerCrowns.setColorAt(i, _color);
  }
  outerTrunks.computeBoundingSphere();
  outerCrowns.computeBoundingSphere();
  scene.add(outerTrunks, outerCrowns);

  // Environmental Storytelling: Cave approach scorch clues & Resource Grove clearing rings
  for (const clue of getCaveApproachClues()) {
    const clueMesh = createCaveClueMesh(clue.kind);
    clueMesh.position.set(clue.x, 0, clue.z);
    scene.add(clueMesh);
  }
  for (const grove of RESOURCE_GROVES) {
    const ringCol =
      grove.kind === 'forest' ? 0x58b865 : grove.kind === 'farmland' ? 0xd9c24c : 0x8ea0b5;
    const groveRing = new THREE.Mesh(
      new THREE.RingGeometry(grove.radius - 0.35, grove.radius, 32),
      new THREE.MeshBasicMaterial({
        color: ringCol,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.24,
      }),
    );
    groveRing.rotation.x = -Math.PI / 2;
    groveRing.position.set(grove.x, 0.025, grove.z);
    scene.add(groveRing);
  }

  // Hero Campfire Citadel & Guardian
  const campfireMesh = createCampfireCitadel(stoneTex, shadowMat);
  scene.add(campfireMesh);

  const guardianMesh = createGuardianMesh(shadowMat);
  scene.add(guardianMesh);

  // Slash arc & Build preview hologram
  const slashArc = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 4.3, 18, 1, -Math.PI * 0.45, Math.PI * 0.9),
    new THREE.MeshBasicMaterial({
      color: 0xffb84d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    }),
  );
  slashArc.rotation.x = -Math.PI / 2;
  slashArc.position.y = 0.9;
  scene.add(slashArc);
  let slashTimer = 0;

  const buildPreview = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 2.0, 24),
    new THREE.MeshBasicMaterial({
      color: 0x52e088,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    }),
  );
  buildPreview.rotation.x = -Math.PI / 2;
  buildPreview.position.y = 0.08;
  buildPreview.visible = false;
  scene.add(buildPreview);

  const selectedRing = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.32, 28),
    new THREE.MeshBasicMaterial({
      color: 0xffd24a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  selectedRing.rotation.x = -Math.PI / 2;
  selectedRing.position.y = 0.07;
  selectedRing.visible = false;
  scene.add(selectedRing);

  // Shockwave Rings (capped crisp indicators)
  const ringMeshes: { mesh: THREE.Mesh; life: number; maxLife: number; targetRadius: number }[] = [];
  function spawnRing(x: number, z: number, radius: number, color: string): void {
    if (ringMeshes.length >= 16) return;
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.95, 24),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.08, z);
    scene.add(mesh);
    ringMeshes.push({ mesh, life: 0.36, maxLife: 0.36, targetRadius: radius });
  }

  // Dynamic Entity Mesh Maps
  const dragonInstances = new Map<number, DragonSpriteInstance>();
  const enemyMeshes = new Map<number, THREE.Group>();
  const buildingMeshes = new Map<number, THREE.Group>();
  const perimeterWallMeshes = new Map<string, THREE.Group>();
  const caveMeshes = new Map<number, THREE.Group>();
  const ruinMeshes = new Map<number, THREE.Group>();
  const jailMeshes = new Map<number, THREE.Group>();
  const protectorMeshes = new Map<number, THREE.Group>();
  const survivorMeshes = new Map<number, THREE.Group>();
  const workerMeshes = new Map<number, THREE.Group>();
  const nodeMeshes = new Map<number, THREE.Group>();
  const eggMeshes = new Map<number, THREE.Group>();
  const settlementMeshes = new Map<string, THREE.Group>();
  const shrineMeshes = new Map<string, THREE.Group>();
  const treasureMeshes = new Map<string, THREE.Group>();
  const wildlifeMeshes = new Map<number, THREE.Group>();
  let hasSyncedInitialDragons = false;
  let debugCycleIndex = 0;
  let flameEmitTimer = 0;

  function resolveDragonEffectOrigin(
    dragonId: number | undefined,
    which: 'mouth' | 'hand',
    fallbackX: number,
    fallbackZ: number,
    dirX: number,
    dirZ: number,
    scale: number,
    outVec: THREE.Vector3,
  ): THREE.Vector3 {
    if (dragonId !== undefined) {
      const inst = dragonInstances.get(dragonId);
      if (inst) {
        return dragonSprites.getWorldAnchor(inst, which, outVec);
      }
    }
    outVec.set(
      fallbackX + dirX * 0.7 * scale,
      1.05 * scale,
      fallbackZ + dirZ * 0.7 * scale,
    );
    return outVec;
  }

  function clearEntityMaps(): void {
    for (const inst of dragonInstances.values()) {
      scene.remove(inst.root);
      dragonSprites.disposeInstance(inst);
    }
    for (const m of enemyMeshes.values()) scene.remove(m);
    for (const m of buildingMeshes.values()) scene.remove(m);
    for (const m of perimeterWallMeshes.values()) scene.remove(m);
    for (const m of caveMeshes.values()) scene.remove(m);
    for (const m of ruinMeshes.values()) scene.remove(m);
    for (const m of jailMeshes.values()) scene.remove(m);
    for (const m of protectorMeshes.values()) scene.remove(m);
    for (const m of survivorMeshes.values()) scene.remove(m);
    for (const m of workerMeshes.values()) scene.remove(m);
    for (const m of nodeMeshes.values()) scene.remove(m);
    for (const m of eggMeshes.values()) scene.remove(m);
    for (const m of settlementMeshes.values()) scene.remove(m);
    for (const m of shrineMeshes.values()) scene.remove(m);
    for (const m of treasureMeshes.values()) scene.remove(m);
    for (const m of wildlifeMeshes.values()) scene.remove(m);
    dragonInstances.clear();
    enemyMeshes.clear();
    buildingMeshes.clear();
    perimeterWallMeshes.clear();
    caveMeshes.clear();
    ruinMeshes.clear();
    jailMeshes.clear();
    protectorMeshes.clear();
    survivorMeshes.clear();
    workerMeshes.clear();
    nodeMeshes.clear();
    eggMeshes.clear();
    settlementMeshes.clear();
    shrineMeshes.clear();
    treasureMeshes.clear();
    wildlifeMeshes.clear();
    pixelVfx.clear();
    floatingNumbers.clear();
    selectedRing.visible = false;
    hasSyncedInitialDragons = false;
    debugCycleIndex = 0;
    fireBreathLight.intensity = 0;
    delete document.body.dataset.dragonDebug;
  }

  // Input State (separated held vs edge-triggered)
  const heldKeys = new Set<string>();
  let attackEdge = false;
  let dashEdge = false;
  let interactEdge = false;
  let commandEdge: DragonCommand | null = null;
  let pointerWorldX = 0;
  let pointerWorldZ = 0;
  let hasPointerAim = false;

  const onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    soundEngine.unlock();
    heldKeys.add(k);
    if (!e.repeat) {
      if (k === ' ' || k === 'j') {
        if (stateRef.current.phase === 'playing') {
          e.preventDefault();
          attackEdge = true;
        }
      } else if (k === 'shift' || k === 'k') {
        dashEdge = true;
      } else if (k === 'e') {
        interactEdge = true;
      } else if (k === '1') {
        commandEdge = 'follow';
      } else if (k === '2') {
        commandEdge = 'defend';
      } else if (k === '3') {
        commandEdge = 'attack';
      } else if (k === 'q') {
        commandEdge = 'explore';
      } else if (k === 'r') {
        commandEdge = 'sanctuary';
      } else if (stateRef.current.phase === 'playing') {
        if (k === '4') {
          triggerDebugDragonAbility(stateRef.current, 'fire');
          onBanner('Legendary Red Fire Dragon', 'Inferno Flame breath & Burning DoT (+25% dmg taken)', '#ff6b35');
          onSyncHud();
        } else if (k === '5') {
          triggerDebugDragonAbility(stateRef.current, 'ice');
          onBanner('Super Rare Blue Ice Dragon', 'Frost Freeze projectile & AoE group Chill', '#5ec9ff');
          onSyncHud();
        } else if (k === '6') {
          triggerDebugDragonAbility(stateRef.current, 'earth');
          onBanner('Common Green Wind/Nature Dragon', 'Basic melee combo (Swipe -> Whip -> Bite)', '#73cc58');
          onSyncHud();
        } else if (k === '7') {
          triggerDebugDragonAbility(stateRef.current, 'electric');
          onBanner('Rare Yellow Electric Dragon', 'Chain Lightning across grouped foes & Stun', '#ffd24a');
          onSyncHud();
        } else if (k === '8') {
          spawnDebugEnemies(stateRef.current, 'pack');
          onBanner('Test Wave: Raider Pack', '5 small raiders spawned ahead of Guardian', '#ff9d52');
          onSyncHud();
        } else if (k === '9') {
          spawnDebugEnemies(stateRef.current, 'huge');
          onBanner('Test Threat: Siege Golem', 'Huge armored enemy spawned for status resistance test', '#d87dff');
          onSyncHud();
        } else if (k === '0') {
          spawnDebugEnemies(stateRef.current, 'boss');
          onBanner('Test Threat: Nightmare Lord', 'Boss spawned ahead of Guardian', '#ff5252');
          onSyncHud();
        } else if (k === 'v') {
          debugCycleIndex = (debugCycleIndex + 1) % DRAGON_DEBUG_CYCLE.length;
          const ov = DRAGON_DEBUG_CYCLE[debugCycleIndex];
          if (ov) {
            document.body.dataset.dragonDebug = `${ov.direction}/${ov.anim}`;
            onBanner(
              `Sprite Frame: ${ov.direction.toUpperCase()} · ${ov.anim.toUpperCase()}`,
              'Press V to cycle directions & animations',
              '#9de065',
            );
          } else {
            delete document.body.dataset.dragonDebug;
            onBanner('Sprite Mode: Live AI', 'Dragons follow camera-relative facing', '#ffbe4d');
          }
        }
      }
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    heldKeys.delete(e.key.toLowerCase());
  };

  const clearInputs = () => {
    heldKeys.clear();
    attackEdge = false;
    dashEdge = false;
    interactEdge = false;
    commandEdge = null;
  };

  const updatePointerWorld = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_ndc, camera);
    if (_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
      pointerWorldX = _hitPoint.x;
      pointerWorldZ = _hitPoint.z;
      hasPointerAim = true;
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    updatePointerWorld(e.clientX, e.clientY);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    soundEngine.unlock();
    updatePointerWorld(e.clientX, e.clientY);
    const st = stateRef.current;
    if (st.phase !== 'playing') return;

    if (st.selectedBuild) {
      const res = placeBuilding(st, st.selectedBuild, pointerWorldX, pointerWorldZ);
      onPlayResult(res);
      if (res.ok) {
        soundEngine.playBuild();
        st.selectedBuild = null;
        onSyncHud();
      }
      return;
    }

    // Raycast clickable Workers & Buildings for Contextual Inspector
    const selectables: THREE.Object3D[] = [
      ...workerMeshes.values(),
      ...buildingMeshes.values(),
    ];
    if (selectables.length > 0) {
      _raycaster.setFromCamera(_ndc, camera);
      const hits = _raycaster.intersectObjects(selectables, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData.entityKind) {
          obj = obj.parent;
        }
        if (obj && obj.userData.entityKind && typeof obj.userData.entityId === 'number') {
          st.selectedEntity = {
            kind: obj.userData.entityKind as 'worker' | 'building',
            id: obj.userData.entityId,
          };
          onSyncHud();
          return;
        }
      }
    }

    if (st.selectedEntity) {
      st.selectedEntity = null;
      onSyncHud();
    }
    attackEdge = true;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearInputs);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInputs();
  });
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    floatingNumbers.resize();
    renderer.render(scene, camera);
  };
  window.addEventListener('resize', onResize);

  const onContextLost = (e: Event) => {
    e.preventDefault();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  let introChapter = 0;
  let hudSyncTimer = 0;
  let elapsed = 0;
  let lastTime = performance.now();
  let frameId = 0;
  let disposed = false;

  function processEvents(events: GameEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'slash') {
        soundEngine.playSlash(ev.combo);
        slashTimer = 0.16;
        slashArc.position.set(ev.x, 0.9, ev.z);
        slashArc.rotation.z = -ev.angle;
      } else if (ev.type === 'dash') {
        soundEngine.playDash();
        pixelVfx.spawnPixelBurst('spark', ev.x, 0.6, ev.z, 8, 4.5, ['#ffe082', '#ff9800'], 0.35);
      } else if (ev.type === 'hit') {
        soundEngine.playHit(ev.heavy);
        pixelVfx.spawnPixelBurst(
          'spark',
          ev.x,
          1.0,
          ev.z,
          ev.heavy ? 8 : 4,
          4.8,
          [ev.color, '#ffffff'],
          ev.heavy ? 0.38 : 0.28,
        );
      } else if (ev.type === 'damage_num') {
        const text = ev.label ? ev.label : `${ev.amount}`;
        floatingNumbers.spawn(ev.x, ev.z, text, ev.color, Boolean(ev.crit));
      } else if (ev.type === 'dragon_vfx') {
        const sc = ev.scale ?? 1.0;
        if (ev.kind === 'flame_stream') {
          resolveDragonEffectOrigin(ev.dragonId, 'mouth', ev.x, ev.z, ev.dirX, ev.dirZ, sc, _anchorPos);
          pixelVfx.spawnFlameStream(_anchorPos.x, _anchorPos.y, _anchorPos.z, ev.dirX, ev.dirZ, sc, 4);
        } else if (ev.kind === 'frost_cast') {
          resolveDragonEffectOrigin(ev.dragonId, 'mouth', ev.x, ev.z, ev.dirX, ev.dirZ, sc, _anchorPos);
          pixelVfx.spawnFrostCast(_anchorPos.x, _anchorPos.y, _anchorPos.z, ev.dirX, ev.dirZ, sc);
        } else if (ev.kind === 'freeze_shatter') {
          pixelVfx.spawnIceShatter(ev.x, ev.z, sc);
        } else if (ev.kind === 'melee_swipe') {
          soundEngine.playSlash(0);
          resolveDragonEffectOrigin(ev.dragonId, 'hand', ev.x, ev.z, ev.dirX, ev.dirZ, sc, _anchorPos);
          pixelVfx.spawnMeleeSlash(_anchorPos.x, _anchorPos.y, _anchorPos.z, ev.dirX, ev.dirZ, sc);
        } else if (ev.kind === 'melee_whip') {
          soundEngine.playSlash(1);
          pixelVfx.spawnTailWhip(ev.x, ev.z, ev.radius ?? 3.6, sc);
          spawnRing(ev.x, ev.z, ev.radius ?? 3.6, '#9fe85b');
        } else if (ev.kind === 'melee_bite') {
          soundEngine.playHit(true);
          resolveDragonEffectOrigin(ev.dragonId, 'mouth', ev.x, ev.z, ev.dirX, ev.dirZ, sc, _anchorPos);
          pixelVfx.spawnHeavyBite(_anchorPos.x, _anchorPos.y, _anchorPos.z, ev.dirX, ev.dirZ, sc);
        } else if (ev.kind === 'lightning_arc' && ev.points && ev.points.length > 0) {
          resolveDragonEffectOrigin(ev.dragonId, 'mouth', ev.x, ev.z, ev.dirX, ev.dirZ, sc, _anchorPos);
          pixelVfx.spawnLightningChain(_anchorPos.x, _anchorPos.y, _anchorPos.z, ev.points, sc);
        }
      } else if (ev.type === 'kill') {
        soundEngine.playKill();
        pixelVfx.spawnPixelBurst('spark', ev.x, 1.0, ev.z, 10, 5.5, ['#e2a3ff', '#9c4dff', '#ffffff'], 0.42);
        spawnRing(ev.x, ev.z, 2.2, '#e2a3ff');
      } else if (ev.type === 'ring') {
        spawnRing(ev.x, ev.z, ev.radius, ev.color);
      } else if (ev.type === 'bolt') {
        pixelVfx.spawnLightningSegment(ev.x1, 1.1, ev.z1, ev.x2, 1.1, ev.z2, ev.color, 0.12, 0.14);
      } else if (ev.type === 'harvest') {
        soundEngine.playHarvest();
        const col = ev.kind === 'wood' ? '#6fd175' : ev.kind === 'stone' ? '#b0bec5' : '#ff9436';
        pixelVfx.spawnPixelBurst('spark', ev.x, 1.0, ev.z, 6, 3.6, [col, '#ffffff'], 0.34);
      } else if (ev.type === 'pickup') {
        soundEngine.playPickup();
        pixelVfx.spawnPixelBurst('spark', ev.x, 0.8, ev.z, 8, 4.0, [ev.color, '#ffffff'], 0.36);
      } else if (ev.type === 'hatch') {
        soundEngine.playHatch();
        pixelVfx.spawnPixelBurst('spark', ev.x, 0.9, ev.z, 12, 5.8, [DRAGON_ARCHETYPES[ev.element].color, '#fff3d6'], 0.44);
        spawnRing(ev.x, ev.z, 3.5, EGG_TIER_INFO[ev.tier].color);
      } else if (ev.type === 'build') {
        soundEngine.playBuild();
        pixelVfx.spawnPixelBurst('spark', ev.x, 0.8, ev.z, 10, 4.5, ['#ffd266', '#ffffff'], 0.38);
      } else if (ev.type === 'repair') {
        soundEngine.playBuild();
        pixelVfx.spawnPixelBurst('spark', ev.x, 1.0, ev.z, 8, 4.0, ['#62e685', '#ffffff'], 0.36);
      } else if (ev.type === 'cave_down') {
        pixelVfx.spawnPixelBurst('spark', ev.x, 2.0, ev.z, 18, 7.5, ['#c068ff', '#ffffff'], 0.55);
        spawnRing(ev.x, ev.z, 8.0, '#c068ff');
      } else if (ev.type === 'cave_alarm') {
        soundEngine.playWaveStart(true);
      } else if (ev.type === 'rescue_jail') {
        soundEngine.playHatch();
        pixelVfx.spawnPixelBurst('spark', ev.x, 1.2, ev.z, 14, 5.5, [DRAGON_ARCHETYPES[ev.element].accentColor, '#ffffff'], 0.45);
        spawnRing(ev.x, ev.z, 5.5, DRAGON_ARCHETYPES[ev.element].accentColor);
      } else if (ev.type === 'claim_ruin') {
        soundEngine.playBuild();
        pixelVfx.spawnPixelBurst('spark', ev.x, 1.4, ev.z, 14, 5.2, ['#ffd24a', '#ffffff'], 0.45);
        spawnRing(ev.x, ev.z, 6.0, '#ffd24a');
      } else if (ev.type === 'wave_start') {
        soundEngine.playWaveStart(ev.isNight);
      } else if (ev.type === 'player_hurt') {
        soundEngine.playHurt();
      } else if (ev.type === 'discovery_toast') {
        soundEngine.playPickup();
        if (onToast) {
          onToast(ev.title, ev.subtitle, ev.color);
        } else {
          onBanner(ev.title, ev.subtitle, ev.color);
        }
      } else if (ev.type === 'banner') {
        onBanner(ev.title, ev.subtitle, ev.color);
      } else if (ev.type === 'victory') {
        soundEngine.playVictory();
        onSyncHud();
      } else if (ev.type === 'gameover') {
        soundEngine.playGameOver();
        onSyncHud();
      }
    }
  }

  function syncMeshes(state: GameState, dt: number): void {
    // 1. Campfire Flame Animation & Lighting
    const flames = campfireMesh.userData.flames as THREE.Mesh[] | undefined;
    const hpRatio = Math.max(0.2, state.campfireHp / Math.max(1, state.campfireMaxHp));
    if (flames) {
      flames.forEach((f, idx) => {
        const flicker = 0.88 + Math.sin(elapsed * 9.5 + idx * 2.1) * 0.16;
        f.scale.set(
          hpRatio * flicker,
          hpRatio * (0.9 + Math.cos(elapsed * 11 + idx) * 0.2),
          hpRatio * flicker,
        );
      });
    }
    fireLight.intensity = (state.isNight ? 24 : 14 + Math.sin(elapsed * 12) * 2.5) * hpRatio;

    // Ambient pixel embers rising from Campfire
    if (Math.random() < 0.28) {
      pixelVfx.spawnParticle(
        'spark',
        (Math.random() - 0.5) * 1.4,
        0.8,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 0.7,
        2.1 + Math.random() * 1.4,
        (Math.random() - 0.5) * 0.7,
        0.2,
        0.95,
        0.24,
        Math.random() < 0.5 ? '#ff7b24' : '#ffd24a',
      );
    }

    // 2. Day / Dusk / Night sky, moonlight & environment IBL interpolation
    const dcp = state.dayCycleProgress;
    if (dcp < 0.55) {
      const dtRatio = dcp / 0.55;
      _skyCurrent.copy(_skyDay).lerp(_skyDusk, dtRatio);
      keyLight.color.copy(_sunDay).lerp(_sunDusk, dtRatio);
      keyLight.intensity = THREE.MathUtils.lerp(1.9, 1.2, dtRatio);
      hemiLight.intensity = THREE.MathUtils.lerp(0.76, 0.45, dtRatio);
      scene.environmentIntensity = THREE.MathUtils.lerp(1.0, 0.62, dtRatio);
    } else {
      const nt = Math.min(1, (dcp - 0.55) / 0.25);
      _skyCurrent.copy(_skyDusk).lerp(_skyNight, nt);
      keyLight.color.copy(_sunDusk).lerp(_sunNight, nt);
      keyLight.intensity = THREE.MathUtils.lerp(1.2, 0.34, nt);
      hemiLight.intensity = THREE.MathUtils.lerp(0.45, 0.16, nt);
      scene.environmentIntensity = THREE.MathUtils.lerp(0.62, 0.2, nt);
    }
    (scene.background as THREE.Color).copy(_skyCurrent);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(_skyCurrent);
    }

    // 3. Guardian Sync
    const p = state.player;
    guardianMesh.visible = p.respawnTimer <= 0;
    guardianMesh.position.set(p.x, 0, p.z);
    guardianMesh.rotation.y = Math.atan2(p.facingX, p.facingZ);
    const swordPivot = guardianMesh.userData.swordPivot as THREE.Group;
    if (p.attackPhase === 'windup') {
      swordPivot.rotation.y = -0.9;
    } else if (p.attackPhase === 'active') {
      swordPivot.rotation.y = 1.25;
    } else {
      swordPivot.rotation.y = THREE.MathUtils.damp(swordPivot.rotation.y, 0, 12, dt);
    }
    const legL = guardianMesh.userData.leftLeg as THREE.Mesh;
    const legR = guardianMesh.userData.rightLeg as THREE.Mesh;
    const moving = Math.hypot(p.vx, p.vz) > 0.3;
    const gait = moving ? Math.sin(p.moveDistance * 2.4) * 0.45 : 0;
    legL.rotation.x = gait;
    legR.rotation.x = -gait;
    const carriedEggMesh = guardianMesh.userData.carriedEggMesh as THREE.Mesh;
    if (p.carryingEgg) {
      carriedEggMesh.visible = true;
      (carriedEggMesh.material as THREE.MeshStandardMaterial).color.set(
        EGG_TIER_INFO[p.carryingEgg.tier].color,
      );
    } else {
      carriedEggMesh.visible = false;
    }

    // Slash arc fade
    if (slashTimer > 0) {
      slashTimer = Math.max(0, slashTimer - dt);
      (slashArc.material as THREE.MeshBasicMaterial).opacity = (slashTimer / 0.16) * 0.85;
    } else {
      (slashArc.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // Build preview ring
    if (state.phase === 'playing' && state.selectedBuild && hasPointerAim) {
      const def = BUILDING_DEFS[state.selectedBuild];
      buildPreview.visible = true;
      buildPreview.position.set(pointerWorldX, 0.08, pointerWorldZ);
      buildPreview.scale.setScalar(def.radius * 0.55);
    } else {
      buildPreview.visible = false;
    }

    // 4. Caves (Sequential Void-Ward domes & active conquest beacon)
    const activeTargetCave = getActiveTargetCave(state.caves);
    for (const cave of state.caves) {
      let mesh = caveMeshes.get(cave.id);
      if (!mesh) {
        mesh = createCaveMesh(cave.index, shadowMat);
        mesh.position.set(cave.x, 0, cave.z);
        mesh.lookAt(0, 0, 0);
        scene.add(mesh);
        caveMeshes.set(cave.id, mesh);
      }
      const crystal = mesh.userData.crystal as THREE.Mesh;
      const wardDome = mesh.userData.wardDome as THREE.Mesh;
      const targetBeacon = mesh.userData.targetBeacon as THREE.Mesh;
      if (cave.alive) {
        const warded = isCaveWarded(cave, state.caves);
        const isTarget = activeTargetCave?.id === cave.id;
        mesh.scale.setScalar(1);
        crystal.visible = true;
        crystal.rotation.y += dt * 1.4;
        crystal.position.y = 4.7 + Math.sin(elapsed * 2 + cave.index) * 0.25;
        wardDome.visible = warded;
        targetBeacon.visible = isTarget;
        if (isTarget) {
          const pulse = 1 + Math.sin(elapsed * 4.5) * 0.08;
          targetBeacon.scale.setScalar(pulse);
        }
      } else {
        mesh.scale.set(1, 0.28, 1);
        crystal.visible = false;
        wardDome.visible = false;
        targetBeacon.visible = false;
      }
    }

    // 4b. Lost Ruins
    for (const ruin of state.ruins) {
      let mesh = ruinMeshes.get(ruin.id);
      if (!mesh) {
        mesh = createRuinMesh(stoneTex, shadowMat);
        mesh.position.set(ruin.x, 0, ruin.z);
        scene.add(mesh);
        ruinMeshes.set(ruin.id, mesh);
      }
      const beacon = mesh.userData.beacon as THREE.Mesh;
      const beaconMat = mesh.userData.beaconMat as THREE.MeshStandardMaterial;
      const halo = mesh.userData.halo as THREE.Mesh;
      beacon.rotation.y += dt * (ruin.claimed ? 2.4 : 0.7);
      if (ruin.claimed) {
        beaconMat.color.setHex(0xffe066);
        beaconMat.emissive.setHex(0xffa820);
        beaconMat.emissiveIntensity = 1.8;
        (halo.material as THREE.MeshBasicMaterial).color.setHex(0x62e685);
        (halo.material as THREE.MeshBasicMaterial).opacity = 0.55;
      } else {
        beaconMat.color.setHex(0x9ca3af);
        beaconMat.emissive.setHex(0x525866);
        beaconMat.emissiveIntensity = 0.45;
      }
    }

    // 4c. Shadow Dragon Jails
    for (const jail of state.jails) {
      let mesh = jailMeshes.get(jail.id);
      if (!mesh) {
        mesh = createDragonJailMesh(jail.element, shadowMat);
        mesh.position.set(jail.x, 0, jail.z);
        scene.add(mesh);
        jailMeshes.set(jail.id, mesh);
      }
      const cageGroup = mesh.userData.cageGroup as THREE.Group;
      const spiritOrb = mesh.userData.spiritOrb as THREE.Mesh;
      cageGroup.visible = !jail.opened;
      spiritOrb.visible = !jail.opened;
      if (!jail.opened) {
        spiritOrb.rotation.y += dt * 1.6;
        spiritOrb.position.y = 1.25 + Math.sin(elapsed * 3 + jail.id) * 0.14;
      }
    }

    // 4d. Abandoned Settlements (smoke clue + crates + claimed banner)
    for (const settle of state.settlements) {
      let mesh = settlementMeshes.get(settle.id);
      if (!mesh) {
        mesh = createAbandonedSettlementMesh(stoneTex, shadowMat);
        mesh.position.set(settle.x, 0, settle.z);
        scene.add(mesh);
        settlementMeshes.set(settle.id, mesh);
      }
      const crateGroup = mesh.userData.crateGroup as THREE.Group;
      const bannerGroup = mesh.userData.bannerGroup as THREE.Group;
      const outpostWallGroup = mesh.userData.outpostWallGroup as THREE.Group | undefined;
      const territoryRing = mesh.userData.territoryRing as THREE.Mesh | undefined;
      crateGroup.visible = !settle.suppliesLooted;
      bannerGroup.visible = settle.claimed;
      if (outpostWallGroup) outpostWallGroup.visible = settle.claimed && settle.hasWall;
      if (territoryRing) territoryRing.visible = settle.claimed;
      if (
        !settle.claimed &&
        Math.hypot(settle.x - p.x, settle.z - p.z) < 48 &&
        Math.random() < dt * 2.4
      ) {
        pixelVfx.spawnParticle(
          'spark',
          settle.x + (Math.random() - 0.5) * 0.4,
          0.5,
          settle.z + (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.2,
          1.35,
          (Math.random() - 0.5) * 0.2,
          0,
          1.6,
          0.42,
          '#9ca3af',
        );
      }
    }

    // 4e. Ancient Shrines
    for (const sh of state.shrines) {
      let mesh = shrineMeshes.get(sh.id);
      if (!mesh) {
        mesh = createAncientShrineMesh(sh.color, stoneTex, shadowMat);
        mesh.position.set(sh.x, 0, sh.z);
        scene.add(mesh);
        shrineMeshes.set(sh.id, mesh);
      }
      const crystal = mesh.userData.crystal as THREE.Mesh;
      const crystalMat = mesh.userData.crystalMat as THREE.MeshStandardMaterial;
      const ring = mesh.userData.ring as THREE.Mesh;
      crystal.rotation.y += dt * (sh.activated ? 0.5 : 1.9);
      crystal.position.y = 2.05 + Math.sin(elapsed * 2.6) * 0.16;
      crystalMat.emissiveIntensity = sh.activated ? 0.35 : 1.5;
      ring.visible = !sh.activated;
    }

    // 4f. Treasure Sites
    for (const tr of state.treasures) {
      let mesh = treasureMeshes.get(tr.id);
      if (!mesh) {
        mesh = createTreasureSiteMesh(shadowMat);
        mesh.position.set(tr.x, 0, tr.z);
        scene.add(mesh);
        treasureMeshes.set(tr.id, mesh);
      }
      mesh.visible = !tr.opened;
      const glint = mesh.userData.glint as THREE.Mesh;
      glint.rotation.y += dt * 2.5;
      glint.position.y = 1.2 + Math.sin(elapsed * 3.5) * 0.12;
    }

    // 4g. Ambient Small Wildlife
    for (const w of state.wildlife) {
      let mesh = wildlifeMeshes.get(w.id);
      if (!mesh) {
        mesh = createWildlifeMesh(w.kind, shadowMat);
        scene.add(mesh);
        wildlifeMeshes.set(w.id, mesh);
      }
      const movingW = Math.hypot(w.vx, w.vz) > 0.2;
      const hop = movingW ? Math.abs(Math.sin(elapsed * (w.fleeing ? 16 : 9) + w.id)) * 0.14 : 0;
      mesh.position.set(w.x, hop, w.z);
      mesh.rotation.y = Math.atan2(w.facingX, w.facingZ);
    }

    // 5. Resource Nodes
    for (const node of state.resourceNodes) {
      let mesh = nodeMeshes.get(node.id);
      if (!mesh) {
        mesh = createResourceNodeMesh(node.kind, shadowMat);
        mesh.position.set(node.x, 0, node.z);
        scene.add(mesh);
        nodeMeshes.set(node.id, mesh);
      }
      mesh.visible = node.amount > 0;
    }

    // 6. Wild & Incubating Eggs
    const activeEggIds = new Set<number>();
    for (const egg of state.wildEggs) {
      activeEggIds.add(egg.id);
      let mesh = eggMeshes.get(egg.id);
      if (!mesh) {
        mesh = createEggMesh(egg.element, egg.tier, shadowMat);
        scene.add(mesh);
        eggMeshes.set(egg.id, mesh);
      }
      mesh.position.set(egg.x, 0, egg.z);
      const inner = mesh.userData.egg as THREE.Mesh;
      inner.position.y = 0.48 + Math.sin(elapsed * 3 + egg.id) * 0.08;
    }
    for (const egg of state.incubatingEggs) {
      activeEggIds.add(egg.id);
      let mesh = eggMeshes.get(egg.id);
      if (!mesh) {
        mesh = createEggMesh(egg.element, egg.tier, shadowMat);
        scene.add(mesh);
        eggMeshes.set(egg.id, mesh);
      }
      mesh.position.set(egg.x, 0, egg.z);
      const urgent = Math.max(0, 2.2 - egg.timer);
      const wobble =
        egg.timer < 2.2 ? Math.sin(elapsed * (20 + urgent * 8)) * (0.1 + urgent * 0.1) : 0;
      mesh.rotation.z = wobble;
      const crackScale = egg.timer < 0.7 ? 1 + Math.sin(elapsed * 32) * 0.09 : 1;
      mesh.scale.set(crackScale, 2 - crackScale, crackScale);
      if (egg.timer < 0.75 && Math.random() < 0.25) {
        pixelVfx.spawnParticle(
          'spark',
          egg.x,
          0.6,
          egg.z,
          (Math.random() - 0.5) * 2,
          2.2,
          (Math.random() - 0.5) * 2,
          -8,
          0.28,
          0.25,
          '#fff4dc',
        );
      }
    }
    for (const [id, mesh] of eggMeshes) {
      if (!activeEggIds.has(id)) {
        scene.remove(mesh);
        eggMeshes.delete(id);
      }
    }

    // 7. Buildings
    const activeBuildingIds = new Set<number>();
    for (const b of state.buildings) {
      activeBuildingIds.add(b.id);
      let mesh = buildingMeshes.get(b.id);
      if (!mesh) {
        mesh = createBuildingMesh(b.kind, stoneTex, shadowMat);
        mesh.position.set(b.x, 0, b.z);
        mesh.userData.entityKind = 'building';
        mesh.userData.entityId = b.id;
        scene.add(mesh);
        buildingMeshes.set(b.id, mesh);
      }
      const prog =
        b.buildTimer > 0 ? 1 - b.buildTimer / Math.max(0.1, BUILDING_DEFS[b.kind].buildSec) : 1;
      mesh.scale.set(1, 0.25 + prog * 0.75, 1);
      const beacon = mesh.userData.beacon as THREE.Mesh | undefined;
      if (beacon) beacon.rotation.y += dt * 2.2;
    }
    for (const [id, mesh] of buildingMeshes) {
      if (!activeBuildingIds.has(id)) {
        scene.remove(mesh);
        buildingMeshes.delete(id);
      }
    }

    // 7c. Waiting Survivors & Recruited Kingdom Workers
    const activeSurvivorIds = new Set<number>();
    for (const surv of state.survivors) {
      if (surv.recruited) continue;
      activeSurvivorIds.add(surv.id);
      let mesh = survivorMeshes.get(surv.id);
      if (!mesh) {
        mesh = createSurvivorMesh(shadowMat);
        scene.add(mesh);
        survivorMeshes.set(surv.id, mesh);
      }
      mesh.position.set(surv.x, 0, surv.z);
      const beacon = mesh.userData.beacon as THREE.Mesh | undefined;
      if (beacon) {
        beacon.rotation.y += dt * 2.4;
        beacon.position.y = 1.62 + Math.sin(elapsed * 3.5 + surv.id) * 0.1;
      }
    }
    for (const [id, mesh] of survivorMeshes) {
      if (!activeSurvivorIds.has(id)) {
        scene.remove(mesh);
        survivorMeshes.delete(id);
      }
    }

    const activeWorkerIds = new Set<number>();
    for (const w of state.workers) {
      activeWorkerIds.add(w.id);
      let mesh = workerMeshes.get(w.id);
      if (mesh && mesh.userData.workerRole !== w.role) {
        scene.remove(mesh);
        workerMeshes.delete(w.id);
        mesh = undefined;
      }
      if (!mesh) {
        mesh = createWorkerMesh(w.role, shadowMat);
        mesh.userData.entityKind = 'worker';
        mesh.userData.entityId = w.id;
        scene.add(mesh);
        workerMeshes.set(w.id, mesh);
      }
      mesh.visible = w.downTimer <= 0;
      mesh.position.set(w.x, 0, w.z);
      mesh.rotation.y = Math.atan2(w.facingX, w.facingZ);
      const legL = mesh.userData.leftLeg as THREE.Mesh;
      const legR = mesh.userData.rightLeg as THREE.Mesh;
      const toolPivot = mesh.userData.toolPivot as THREE.Group;
      const carryBox = mesh.userData.carryBox as THREE.Mesh;
      const tunicMat = mesh.userData.tunicMat as THREE.MeshStandardMaterial;
      const wMoving = Math.hypot(w.vx, w.vz) > 0.25;
      const gait = wMoving ? Math.sin(elapsed * 11 + w.id) * 0.48 : 0;
      legL.rotation.x = gait;
      legR.rotation.x = -gait;
      if (w.aiState === 'working') {
        toolPivot.rotation.x = Math.sin(elapsed * 10 + w.id) * 0.55;
      } else if (w.attackAnim > 0) {
        toolPivot.rotation.x = -0.75 * w.attackAnim;
      } else {
        toolPivot.rotation.x = 0;
      }
      carryBox.visible = w.carryAmount > 0;
      if (w.hitFlash > 0) {
        tunicMat.emissive.setHex(0xffffff);
        tunicMat.emissiveIntensity = 0.85;
      } else {
        tunicMat.emissive.setHex(0x000000);
        tunicMat.emissiveIntensity = 0;
      }
    }
    for (const [id, mesh] of workerMeshes) {
      if (!activeWorkerIds.has(id)) {
        scene.remove(mesh);
        workerMeshes.delete(id);
      }
    }

    // Selected Entity Highlight Ring
    if (state.selectedEntity) {
      if (state.selectedEntity.kind === 'worker') {
        const w = state.workers.find((item) => item.id === state.selectedEntity?.id);
        if (w) {
          selectedRing.visible = true;
          selectedRing.position.set(w.x, 0.07, w.z);
          selectedRing.scale.setScalar(0.85);
          (selectedRing.material as THREE.MeshBasicMaterial).color.set(WORKER_ROLE_META[w.role].color);
        } else {
          selectedRing.visible = false;
        }
      } else {
        const b = state.buildings.find((item) => item.id === state.selectedEntity?.id);
        if (b) {
          selectedRing.visible = true;
          selectedRing.position.set(b.x, 0.07, b.z);
          selectedRing.scale.setScalar(BUILDING_DEFS[b.kind].radius * 0.82);
          (selectedRing.material as THREE.MeshBasicMaterial).color.set('#ffd24a');
        } else {
          selectedRing.visible = false;
        }
      }
    } else {
      selectedRing.visible = false;
    }

    // 7b. Auto 4-Sided Kingdom Two Crowns Perimeter Walls
    for (const w of state.perimeterWalls) {
      let mesh = perimeterWallMeshes.get(w.side);
      if (!mesh) {
        const isHorizontal = w.side === 'north' || w.side === 'south';
        mesh = createPerimeterWallMesh(isHorizontal, PERIMETER_WALL_RADIUS * 2, stoneTex);
        mesh.position.set(w.x, 0, w.z);
        scene.add(mesh);
        perimeterWallMeshes.set(w.side, mesh);
      }
      const tier0Group = mesh.userData.tier0Group as THREE.Group;
      const tier1Group = mesh.userData.tier1Group as THREE.Group;
      const tier2Group = mesh.userData.tier2Group as THREE.Group;
      const tier3Group = mesh.userData.tier3Group as THREE.Group;

      const intact = state.wallTier > 0 && w.hp > 0;
      tier0Group.visible = state.wallTier === 0 || !intact;
      tier1Group.visible = intact && state.wallTier === 1;
      tier2Group.visible = intact && state.wallTier >= 2;
      tier3Group.visible = intact && state.wallTier >= 3;

      const rise = intact ? 0.2 + 0.8 * w.buildProgress : 1;
      const hpFrac = intact && w.maxHp > 0 ? Math.max(0.35, 0.55 + 0.45 * (w.hp / w.maxHp)) : 1;
      mesh.scale.set(1, rise * hpFrac, 1);
    }

    // 8. Dragons (2D pixel-art Y-billboard sprites + continuous mouth-anchored Fire breath)
    const activeDragonIds = new Set<number>();
    const activeDebugOverride = DRAGON_DEBUG_CYCLE[debugCycleIndex];
    flameEmitTimer -= dt;
    const shouldEmitFlameStream = flameEmitTimer <= 0;
    if (shouldEmitFlameStream) flameEmitTimer = 0.032;

    let activeFireBreathDragon: { x: number; z: number; fx: number; fz: number } | null = null;

    for (const d of state.dragons) {
      activeDragonIds.add(d.id);
      let inst = dragonInstances.get(d.id);
      if (!inst) {
        inst = dragonSprites.createInstance(d, hasSyncedInitialDragons);
        scene.add(inst.root);
        dragonInstances.set(d.id, inst);
      }
      dragonSprites.updateInstance(
        inst,
        d,
        camera,
        dt,
        state.dayCycleProgress,
        hpRatio,
        activeDebugOverride,
      );

      if (d.element === 'fire' && d.attackPhase === 'active' && d.downTimer <= 0) {
        activeFireBreathDragon = { x: d.x, z: d.z, fx: d.facingX, fz: d.facingZ };
        if (shouldEmitFlameStream) {
          dragonSprites.getWorldAnchor(inst, 'mouth', _anchorPos);
          pixelVfx.spawnFlameStream(
            _anchorPos.x,
            _anchorPos.y,
            _anchorPos.z,
            d.facingX,
            d.facingZ,
            inst.sizeScale,
            2,
          );
        }
      }
    }

    if (activeFireBreathDragon) {
      fireBreathLight.position.set(
        activeFireBreathDragon.x + activeFireBreathDragon.fx * 2.4,
        0.9,
        activeFireBreathDragon.z + activeFireBreathDragon.fz * 2.4,
      );
      fireBreathLight.intensity = 4.6 + Math.sin(elapsed * 36) * 1.5;
    } else {
      fireBreathLight.intensity = 0;
    }

    hasSyncedInitialDragons = true;
    for (const [id, inst] of dragonInstances) {
      if (!activeDragonIds.has(id)) {
        scene.remove(inst.root);
        dragonSprites.disposeInstance(inst);
        dragonInstances.delete(id);
      }
    }

    // 8b. Oathbound Protector Knights
    const activeProtectorIds = new Set<number>();
    for (const pr of state.protectors) {
      activeProtectorIds.add(pr.id);
      let mesh = protectorMeshes.get(pr.id);
      if (!mesh) {
        mesh = createProtectorMesh(shadowMat);
        scene.add(mesh);
        protectorMeshes.set(pr.id, mesh);
      }
      mesh.visible = pr.downTimer <= 0;
      mesh.position.set(pr.x, 0, pr.z);
      mesh.rotation.y = Math.atan2(pr.facingX, pr.facingZ);
      const legL = mesh.userData.leftLeg as THREE.Mesh;
      const legR = mesh.userData.rightLeg as THREE.Mesh;
      const weaponPivot = mesh.userData.weaponPivot as THREE.Group;
      const prMoving = Math.hypot(pr.vx, pr.vz) > 0.3;
      const gait = prMoving ? Math.sin(elapsed * 12 + pr.id) * 0.45 : 0;
      legL.rotation.x = gait;
      legR.rotation.x = -gait;
      weaponPivot.rotation.x = pr.attackAnim > 0 ? -0.55 * pr.attackAnim : 0;
    }
    for (const [id, mesh] of protectorMeshes) {
      if (!activeProtectorIds.has(id)) {
        scene.remove(mesh);
        protectorMeshes.delete(id);
      }
    }

    // 9. Enemies + Status Effect Visuals (Frozen ice block, Stun stars, Burning embers, Hit squash)
    const activeEnemyIds = new Set<number>();
    for (const en of state.enemies) {
      activeEnemyIds.add(en.id);
      let mesh = enemyMeshes.get(en.id);
      if (!mesh) {
        mesh = createEnemyMesh(en.kind, shadowMat);
        scene.add(mesh);
        enemyMeshes.set(en.id, mesh);
      }
      mesh.position.set(en.x, 0, en.z);
      mesh.rotation.y = Math.atan2(en.facingX, en.facingZ);
      const bodyGroup = mesh.userData.bodyGroup as THREE.Group;
      const telegraph = mesh.userData.telegraph as THREE.Mesh;
      const iceBlock = mesh.userData.iceBlock as THREE.Mesh;
      const stunGroup = mesh.userData.stunGroup as THREE.Group;
      const baseScale = (mesh.userData.baseScale as number) || 1;
      const mainMat = mesh.userData.mainMat as THREE.MeshStandardMaterial;
      const baseColor = mesh.userData.baseColor as THREE.Color;

      const isFrozen = en.statuses.frozen.remaining > 0;
      const isStunned = en.statuses.stunned.remaining > 0;
      const isBurning = en.statuses.burning.remaining > 0;

      if (en.koTimer > 0) {
        const t = 1 - en.koTimer / 0.35;
        bodyGroup.rotation.x = t * (Math.PI / 2);
        bodyGroup.position.y = Math.max(0, 0.25 * (1 - t));
        telegraph.visible = false;
        iceBlock.visible = false;
        stunGroup.visible = false;
      } else {
        bodyGroup.rotation.x = 0;
        bodyGroup.position.y =
          isFrozen || isStunned ? 0 : Math.abs(Math.sin(elapsed * 8 + en.id)) * 0.1;
        telegraph.visible = en.windupTimer > 0;
        iceBlock.visible = isFrozen;
        stunGroup.visible = isStunned;
        if (isStunned) {
          stunGroup.rotation.y += dt * 5.2;
        }
      }

      // Short crisp squash on hit
      if (en.hitFlash > 0) {
        bodyGroup.scale.set(baseScale * 1.18, baseScale * 0.84, baseScale * 1.18);
        mainMat.emissive.setHex(0xffffff);
        mainMat.emissiveIntensity = 1.1;
      } else if (en.windupTimer > 0) {
        bodyGroup.scale.setScalar(baseScale);
        mainMat.emissive.setHex(0xff3020);
        mainMat.emissiveIntensity = 0.75;
      } else if (isBurning) {
        bodyGroup.scale.setScalar(baseScale);
        mainMat.color.copy(baseColor);
        mainMat.emissive.setHex(0xff5a1a);
        mainMat.emissiveIntensity = 0.48 + Math.sin(elapsed * 20 + en.id) * 0.16;
        if (Math.random() < dt * 14) {
          pixelVfx.spawnParticle(
            'flame',
            en.x + (Math.random() - 0.5) * 0.65,
            0.85,
            en.z + (Math.random() - 0.5) * 0.65,
            (Math.random() - 0.5) * 0.8,
            1.8,
            (Math.random() - 0.5) * 0.8,
            0.2,
            0.28,
            0.34 * baseScale,
            Math.random() < 0.5 ? '#ff9822' : '#ff4d1a',
          );
        }
      } else if (en.slowTimer > 0 || isFrozen) {
        bodyGroup.scale.setScalar(baseScale);
        mainMat.color.setHex(0x69b8ff);
        mainMat.emissive.setHex(0x000000);
      } else {
        bodyGroup.scale.setScalar(baseScale);
        mainMat.color.copy(baseColor);
        mainMat.emissive.setHex(0x000000);
      }
    }
    for (const [id, mesh] of enemyMeshes) {
      if (!activeEnemyIds.has(id)) {
        scene.remove(mesh);
        enemyMeshes.delete(id);
      }
    }

    // 10. Projectiles rendered into crisp pixel VFX particles
    for (const pr of state.projectiles) {
      if (pr.element === 'ice') {
        pixelVfx.spawnParticle(
          'ice',
          pr.x,
          pr.y,
          pr.z,
          0,
          0,
          0,
          0,
          0.07,
          0.74,
          '#ffffff',
          elapsed * 9,
          4,
        );
        if (Math.random() < 0.65) {
          pixelVfx.spawnFrostBallTrail(pr.x, pr.y, pr.z);
        }
      } else {
        const col =
          pr.element === 'fire'
            ? '#ff7028'
            : pr.element === 'blight'
              ? '#64f06b'
              : '#ffd860';
        pixelVfx.spawnParticle('spark', pr.x, pr.y, pr.z, 0, 0, 0, 0, 0.08, 0.36, col);
      }
    }

    // 11. Update Pixel VFX & Floating Damage Overlay
    pixelVfx.update(dt, camera);
    floatingNumbers.updateAndDraw(dt, camera);

    // 12. Update Shockwave Rings
    for (let i = ringMeshes.length - 1; i >= 0; i--) {
      const r = ringMeshes[i];
      r.life -= dt;
      if (r.life <= 0) {
        scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
        ringMeshes.splice(i, 1);
      } else {
        const t = 1 - r.life / r.maxLife;
        r.mesh.scale.setScalar(0.4 + t * r.targetRadius);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85;
      }
    }
  }

  function updateCamera(state: GameState, dt: number): void {
    const dampK = 7.5;
    const alpha = 1 - Math.exp(-dampK * dt);

    if (state.phase === 'title') {
      const angle = 0.72 + elapsed * 0.14;
      _camDesired.set(Math.cos(angle) * 20, 11.5, Math.sin(angle) * 20);
      const lookPoint = new THREE.Vector3(-2.6, 1.3, 0);
      if (elapsed < 0.08) {
        camera.position.copy(_camDesired);
        _camTarget.copy(lookPoint);
      } else {
        _camTarget.lerp(lookPoint, alpha);
        camera.position.lerp(_camDesired, alpha);
      }
      camera.lookAt(_camTarget);
      return;
    }

    if (state.phase === 'intro') {
      const cave = state.caves[0] || { x: 38, z: 32 };
      const targets = [
        {
          pos: new THREE.Vector3(cave.x * 0.65, 6.2, cave.z * 0.65),
          look: new THREE.Vector3(cave.x, 2.2, cave.z),
        },
        { pos: new THREE.Vector3(11, 6.5, 12), look: new THREE.Vector3(0, 1.4, 0) },
        { pos: new THREE.Vector3(-15, 8.5, 14), look: new THREE.Vector3(0, 0.9, 0) },
        { pos: new THREE.Vector3(0, 17, 21), look: new THREE.Vector3(0, 0.8, 0) },
      ];
      const shot = targets[introChapter % targets.length];
      camera.position.lerp(shot.pos, alpha);
      _camTarget.lerp(shot.look, alpha);
      camera.lookAt(_camTarget);
      return;
    }

    // Playing / Paused / Choosing / End: Smooth isometric tactical follow camera + light trauma shake
    const px = state.player.x;
    const pz = state.player.z;
    const clampedTrauma = Math.min(DRAGON_ABILITY_CONFIG.pixelVfx.maxTrauma, state.trauma);
    const shakeAmt = clampedTrauma * clampedTrauma * 0.42;
    const sx = shakeAmt ? (Math.random() * 2 - 1) * shakeAmt : 0;
    const sz = shakeAmt ? (Math.random() * 2 - 1) * shakeAmt : 0;

    _camDesired.set(px + sx, 20.5, pz + 19.5 + sz);
    camera.position.lerp(_camDesired, alpha);
    _camLookScratch.set(px, 0.8, pz);
    _camTarget.lerp(_camLookScratch, alpha);
    camera.lookAt(_camTarget);

    // Keep shadow camera centered around the active area near Guardian
    keyLight.position.set(px + 24, 38, pz + 18);
    keyLight.target.position.set(px, 0, pz);
    keyLight.target.updateMatrixWorld();
  }

  function afterDraw(cb: () => void): void {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (st === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function tick(): void {
    if (disposed) return;
    const now = performance.now();
    const rawDt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += rawDt;

    const st = stateRef.current;
    if (st.phase === 'playing') {
      const moveX =
        (heldKeys.has('d') || heldKeys.has('arrowright') ? 1 : 0) -
        (heldKeys.has('a') || heldKeys.has('arrowleft') ? 1 : 0);
      const moveZ =
        (heldKeys.has('s') || heldKeys.has('arrowdown') ? 1 : 0) -
        (heldKeys.has('w') || heldKeys.has('arrowup') ? 1 : 0);

      const input: GameInput = {
        moveX,
        moveZ,
        attackJustPressed: attackEdge,
        dashJustPressed: dashEdge,
        interactJustPressed: interactEdge,
        commandJustPressed: commandEdge,
        aimWorldX: hasPointerAim ? pointerWorldX : undefined,
        aimWorldZ: hasPointerAim ? pointerWorldZ : undefined,
      };
      attackEdge = false;
      dashEdge = false;
      interactEdge = false;
      commandEdge = null;

      stepSimulation(st, rawDt, input);
      processEvents(st.events);

      hudSyncTimer += rawDt;
      if (hudSyncTimer >= 0.12) {
        hudSyncTimer = 0;
        onSyncHud();
      }
    }

    syncMeshes(st, rawDt);
    updateCamera(st, rawDt);
    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }
  tick();

  return {
    setIntroChapter(idx: number) {
      introChapter = idx;
    },
    getState() {
      return stateRef.current;
    },
    resetGame(seed?: number) {
      clearEntityMaps();
      clearInputs();
      const prevSpeed = stateRef.current.gameSpeed;
      void seed;
      stateRef.current.gameSpeed = prevSpeed;
    },
    setBuildPlacementMode(kind: BuildingKind | null) {
      stateRef.current.selectedBuild = kind;
      if (kind && stateRef.current.squadCommand === 'attack') {
        issueDragonCommand(stateRef.current, 'follow');
      }
      onSyncHud();
    },
    debugTriggerAbility(element: DragonElement) {
      if (stateRef.current.phase !== 'playing') return;
      triggerDebugDragonAbility(stateRef.current, element);
      onSyncHud();
    },
    debugSpawnEnemies(preset: 'pack' | 'huge' | 'boss') {
      if (stateRef.current.phase !== 'playing') return;
      spawnDebugEnemies(stateRef.current, preset);
      onSyncHud();
    },
    debugEnsureAllDragons() {
      if (stateRef.current.phase !== 'playing') return;
      ensureDebugDragon(stateRef.current, 'earth');
      ensureDebugDragon(stateRef.current, 'fire');
      ensureDebugDragon(stateRef.current, 'ice');
      ensureDebugDragon(stateRef.current, 'electric');
      onSyncHud();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      clearEntityMaps();
      dragonSprites.dispose();
      pixelVfx.dispose();
      floatingNumbers.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    },
  };
}
