import * as THREE from 'three';
import type { EggTier } from '../game/data';
import type { DragonUnit } from '../game/engine';
import atlasMetaJson from './dragonAtlas.json';
import {
  computeBlobShadow,
  computeDragonLightTint,
  computeDragonQuadSize,
  DRAGON_TEXELS_PER_WORLD_UNIT,
  type DragonAnimName,
  type DragonColorName,
  type DragonDirection4,
  ELEMENT_TO_DRAGON_COLOR,
  resolveDragonAnimState,
  selectCameraRelativeDirection,
  snapToPixelGrid,
} from './dragonBillboard';

interface FrameAnchor {
  nx: number;
  ny: number;
}

interface AtlasFrame {
  dir: DragonDirection4;
  anim: DragonAnimName;
  frameIndex: number;
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  anchors: {
    mouth: FrameAnchor;
    hand: FrameAnchor;
  };
}

interface SheetMeta {
  scale: number;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  frames: Record<string, AtlasFrame>;
}

interface AtlasMeta {
  columns: number;
  rows: number;
  texelsPerWorldUnit: number;
  cameraPitchRad: number;
  directions: DragonDirection4[];
  animations: Record<DragonAnimName, { frames: number; fps: number }>;
  colors: DragonColorName[];
  sheets: Record<DragonColorName, SheetMeta>;
}

const ATLAS = atlasMetaJson as unknown as AtlasMeta;

interface ColorMaterialBundle {
  texture: THREE.Texture;
  material: THREE.MeshStandardMaterial;
  depthMaterial: THREE.MeshDepthMaterial;
  sheet: SheetMeta;
  quadWidth: number;
  quadHeight: number;
  quadBottomOffsetY: number;
  uvEpsX: number;
  uvEpsY: number;
}

export interface DragonDebugOverride {
  direction: DragonDirection4;
  anim: DragonAnimName;
}

export const DRAGON_DEBUG_CYCLE: Array<DragonDebugOverride | null> = (() => {
  const list: Array<DragonDebugOverride | null> = [null];
  const dirs: DragonDirection4[] = ['front', 'right', 'back', 'left'];
  const anims: DragonAnimName[] = [
    'idle',
    'walk',
    'windup',
    'attack',
    'swipe',
    'whip',
    'bite',
    'recovery',
    'hurt',
  ];
  for (const direction of dirs) {
    for (const anim of anims) {
      list.push({ direction, anim });
    }
  }
  return list;
})();

export interface DragonSpriteInstance {
  root: THREE.Group;
  billboardPivot: THREE.Group;
  spriteMesh: THREE.Mesh;
  geometry: THREE.PlaneGeometry;
  shadowMesh: THREE.Mesh;
  shadowMaterial: THREE.MeshBasicMaterial;
  colorName: DragonColorName;
  bundle: ColorMaterialBundle;
  sizeScale: number;
  animTime: number;
  lastAnim: DragonAnimName;
  currentFrame: AtlasFrame | null;
  hatchTimer: number;
  landingTimer: number;
  wasDown: boolean;
}

// Preallocated scratch vectors/colors to guarantee zero GC allocations in render loop
const _camForward = new THREE.Vector3();
const _lightRgb: [number, number, number] = [1, 1, 1];

// Tilt the quad slightly back (-X rotation around local horizontal axis)
// so its normal pitches slightly upward toward the ~45 deg isometric camera
// without laying flat on the ground.
const BILLBOARD_TILT_RAD = -0.26;

export class DragonSpriteSystem {
  private bundles: Record<DragonColorName, ColorMaterialBundle>;
  private sharedShadowGeo: THREE.CircleGeometry;
  private shadowTex: THREE.Texture;

  constructor(shadowTex: THREE.Texture) {
    const loader = new THREE.TextureLoader();
    this.shadowTex = shadowTex;
    this.sharedShadowGeo = new THREE.CircleGeometry(1, 20);
    this.sharedShadowGeo.rotateX(-Math.PI / 2);

    const makeBundle = (colorName: DragonColorName): ColorMaterialBundle => {
      const sheet = ATLAS.sheets[colorName];
      const quad = computeDragonQuadSize(
        sheet.frameWidth,
        sheet.frameHeight,
        DRAGON_TEXELS_PER_WORLD_UNIT,
      );
      // Baseline 40px frame puts dragon feet ~6.5px from bottom -> scales cleanly per sizeScale
      const quadBottomOffsetY =
        quad.height * 0.5 - (6.5 * sheet.scale) / DRAGON_TEXELS_PER_WORLD_UNIT;

      const texture = loader.load(`/sprites/dragons/dragon_${colorName}.png`);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      // Single shared MeshStandardMaterial per color:
      // alphaTest + depthWrite ensures exact Z-sorting against trees, rocks, campfire, and player.
      // vertexColors receives scene ambient luminance + campfire proximity glow + hit flash.
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.96,
        metalness: 0.0,
        envMapIntensity: 0.28,
        alphaTest: 0.5,
        depthWrite: true,
        transparent: false,
        side: THREE.DoubleSide,
        vertexColors: true,
      });

      const depthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: texture,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      });

      return {
        texture,
        material,
        depthMaterial,
        sheet,
        quadWidth: quad.width,
        quadHeight: quad.height,
        quadBottomOffsetY,
        uvEpsX: 0.15 / sheet.sheetWidth,
        uvEpsY: 0.15 / sheet.sheetHeight,
      };
    };

    this.bundles = {
      green: makeBundle('green'),
      red: makeBundle('red'),
      yellow: makeBundle('yellow'),
      blue: makeBundle('blue'),
    };
  }

  createInstance(dragon: DragonUnit, isFreshHatch: boolean): DragonSpriteInstance {
    const colorName = ELEMENT_TO_DRAGON_COLOR[dragon.element];
    const bundle = this.bundles[colorName];

    const root = new THREE.Group();

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      color: 0x06080c,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    });
    const shadowMesh = new THREE.Mesh(this.sharedShadowGeo, shadowMaterial);
    shadowMesh.position.y = 0.025;
    shadowMesh.renderOrder = 1;
    root.add(shadowMesh);

    const billboardPivot = new THREE.Group();
    root.add(billboardPivot);

    const geometry = new THREE.PlaneGeometry(bundle.quadWidth, bundle.quadHeight);
    geometry.translate(0, bundle.quadBottomOffsetY, 0);

    // Initialize vertex color attribute (4 vertices * RGB = 12 floats)
    const colors = new Float32Array(4 * 3).fill(1);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const spriteMesh = new THREE.Mesh(geometry, bundle.material);
    spriteMesh.rotation.x = BILLBOARD_TILT_RAD;
    spriteMesh.castShadow = true;
    spriteMesh.receiveShadow = false;
    spriteMesh.customDepthMaterial = bundle.depthMaterial;
    billboardPivot.add(spriteMesh);

    const inst: DragonSpriteInstance = {
      root,
      billboardPivot,
      spriteMesh,
      geometry,
      shadowMesh,
      shadowMaterial,
      colorName,
      bundle,
      sizeScale: bundle.sheet.scale,
      animTime: (dragon.id * 0.37) % 1.5,
      lastAnim: 'idle',
      currentFrame: null,
      hatchTimer: isFreshHatch ? 0.58 : 0,
      landingTimer: isFreshHatch ? 0 : 0.25,
      wasDown: dragon.downTimer > 0,
    };

    this.applyFrameUVs(inst, 'front', 'idle', 0, false);
    return inst;
  }

  updateInstance(
    inst: DragonSpriteInstance,
    dragon: DragonUnit,
    camera: THREE.Camera,
    dt: number,
    dayCycleProgress: number,
    campfireHpRatio: number,
    debugOverride: DragonDebugOverride | null,
  ): void {
    // 1. Track hatch jump & revive/landing squash-stretch
    if (inst.wasDown && dragon.downTimer <= 0) {
      inst.landingTimer = 0.28;
    }
    inst.wasDown = dragon.downTimer > 0;

    let hopY = 0;
    let squashX = 1;
    let squashY = 1;

    if (inst.hatchTimer > 0) {
      inst.hatchTimer = Math.max(0, inst.hatchTimer - dt);
      const p = 1 - inst.hatchTimer / 0.58; // 0 -> 1
      if (p < 0.72) {
        const air = p / 0.72;
        hopY = Math.sin(air * Math.PI) * 1.45;
        squashX = 0.78 + air * 0.16;
        squashY = 1.28 - air * 0.18;
      } else {
        const land = (p - 0.72) / 0.28; // 0 -> 1
        const s = Math.sin(land * Math.PI);
        squashX = 1 + s * 0.24;
        squashY = 1 - s * 0.22;
      }
    } else if (inst.landingTimer > 0) {
      inst.landingTimer = Math.max(0, inst.landingTimer - dt);
      const p = 1 - inst.landingTimer / 0.28;
      const s = Math.sin(p * Math.PI);
      squashX = 1 + s * 0.18;
      squashY = 1 - s * 0.16;
    } else if (dragon.downTimer > 0) {
      squashX = 1.12;
      squashY = 0.72;
    }

    // 2. Snap sprite root position cleanly to pixel grid (consistent texel alignment)
    const snappedX = snapToPixelGrid(dragon.x, DRAGON_TEXELS_PER_WORLD_UNIT);
    const snappedY = snapToPixelGrid(hopY, DRAGON_TEXELS_PER_WORLD_UNIT);
    const snappedZ = snapToPixelGrid(dragon.z, DRAGON_TEXELS_PER_WORLD_UNIT);
    inst.root.position.set(snappedX, 0, snappedZ);
    inst.billboardPivot.position.y = snappedY;

    // 3. Y-axis-only billboard toward camera XZ position (stays upright, never leans)
    const dxCam = camera.position.x - snappedX;
    const dzCam = camera.position.z - snappedZ;
    inst.billboardPivot.rotation.y = Math.atan2(dxCam, dzCam);
    inst.billboardPivot.scale.set(squashX, squashY, 1);

    // 4. Ground elliptical blob shadow (scales with sizeScale & fades with jump height)
    const shadow = computeBlobShadow(hopY, inst.sizeScale, dragon.tier as EggTier);
    inst.shadowMesh.scale.set(shadow.scaleX, 1, shadow.scaleZ);
    inst.shadowMaterial.opacity = dragon.downTimer > 0 ? shadow.opacity * 0.75 : shadow.opacity;

    // 5. Camera-relative direction + multi-phase animation state
    camera.getWorldDirection(_camForward);
    const dirSel = selectCameraRelativeDirection(
      dragon.facingX,
      dragon.facingZ,
      _camForward.x,
      _camForward.z,
      4,
    );

    const isHurt = dragon.hitFlash > 0 || dragon.downTimer > 0;
    const isAttacking = dragon.attackAnim > 0;
    const autoAnim = resolveDragonAnimState(
      isHurt,
      isAttacking,
      dragon.vx,
      dragon.vz,
      dragon.attackPhase,
      dragon.attackKind,
    );

    const activeDir = debugOverride ? debugOverride.direction : dirSel.atlasDir4;
    const activeAnim = debugOverride ? debugOverride.anim : autoAnim;

    if (activeAnim !== inst.lastAnim) {
      inst.animTime = 0;
      inst.lastAnim = activeAnim;
    } else {
      inst.animTime += dt;
    }

    const animMeta = ATLAS.animations[activeAnim] ?? ATLAS.animations.idle;
    const frameIdx = Math.floor(inst.animTime * animMeta.fps) % animMeta.frames;

    // Atlas natively stores distinct left/right rows so mirrorX stays false
    this.applyFrameUVs(inst, activeDir, activeAnim, frameIdx, false);

    // 6. Scene ambient/directional + warm campfire glow lighting tint via vertex colors
    computeDragonLightTint(
      dragon.x,
      dragon.z,
      dayCycleProgress,
      campfireHpRatio,
      dragon.hitFlash,
      _lightRgb,
    );
    const colAttr = inst.geometry.getAttribute('color') as THREE.BufferAttribute;
    const colArr = colAttr.array as Float32Array;
    for (let i = 0; i < 4; i++) {
      colArr[i * 3] = _lightRgb[0];
      colArr[i * 3 + 1] = _lightRgb[1];
      colArr[i * 3 + 2] = _lightRgb[2];
    }
    colAttr.needsUpdate = true;
  }

  /**
   * Computes exact world-space position of the dragon's mouth or hand/claw anchor
   * for the current animation frame & camera-relative facing direction.
   */
  getWorldAnchor(
    inst: DragonSpriteInstance,
    which: 'mouth' | 'hand',
    outVec: THREE.Vector3,
  ): THREE.Vector3 {
    const frame = inst.currentFrame;
    if (!frame) {
      outVec.copy(inst.root.position);
      outVec.y += 1.0 * inst.sizeScale;
      return outVec;
    }
    const anchor = frame.anchors[which];
    inst.spriteMesh.updateWorldMatrix(true, false);
    outVec.set(
      anchor.nx * inst.bundle.quadWidth,
      anchor.ny * inst.bundle.quadHeight,
      0.08,
    );
    outVec.applyMatrix4(inst.spriteMesh.matrixWorld);
    return outVec;
  }

  private applyFrameUVs(
    inst: DragonSpriteInstance,
    dir: DragonDirection4,
    anim: DragonAnimName,
    frameIdx: number,
    mirrorX: boolean,
  ): void {
    const { sheet, uvEpsX, uvEpsY } = inst.bundle;
    const key = `${dir}/${anim}/${frameIdx}`;
    const frame = sheet.frames[key] ?? sheet.frames[`${dir}/idle/0`];
    if (!frame) return;

    inst.currentFrame = frame;

    const uLeft = frame.x / sheet.sheetWidth + uvEpsX;
    const uRight = (frame.x + frame.w) / sheet.sheetWidth - uvEpsX;
    const vTop = 1 - frame.y / sheet.sheetHeight - uvEpsY;
    const vBottom = 1 - (frame.y + frame.h) / sheet.sheetHeight + uvEpsY;

    const u0 = mirrorX ? uRight : uLeft;
    const u1 = mirrorX ? uLeft : uRight;

    const uvAttr = inst.geometry.getAttribute('uv') as THREE.BufferAttribute;
    const arr = uvAttr.array as Float32Array;
    // PlaneGeometry vertex order: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
    arr[0] = u0;
    arr[1] = vTop;
    arr[2] = u1;
    arr[3] = vTop;
    arr[4] = u0;
    arr[5] = vBottom;
    arr[6] = u1;
    arr[7] = vBottom;
    uvAttr.needsUpdate = true;
  }

  disposeInstance(inst: DragonSpriteInstance): void {
    inst.geometry.dispose();
    inst.shadowMaterial.dispose();
  }

  dispose(): void {
    this.sharedShadowGeo.dispose();
    for (const colorName of Object.keys(this.bundles) as DragonColorName[]) {
      const b = this.bundles[colorName];
      b.texture.dispose();
      b.material.dispose();
      b.depthMaterial.dispose();
    }
  }
}
