import type { DragonElement, EggTier } from '../game/data';

export type DragonColorName = 'green' | 'red' | 'yellow' | 'blue';
export type DragonDirection4 = 'front' | 'right' | 'back' | 'left';
export type DragonDirection8 =
  | DragonDirection4
  | 'front_right'
  | 'back_right'
  | 'back_left'
  | 'front_left';
export type DragonAnimName =
  | 'idle'
  | 'walk'
  | 'windup'
  | 'attack'
  | 'swipe'
  | 'whip'
  | 'bite'
  | 'recovery'
  | 'hurt';

export type DragonAnimAttackPhase = 'idle' | 'windup' | 'active' | 'recovery';
export type DragonAnimAttackKind = 'stream' | 'frostball' | 'swipe' | 'whip' | 'bite' | 'bolt';

export const ELEMENT_TO_DRAGON_COLOR: Record<DragonElement, DragonColorName> = {
  earth: 'green',
  fire: 'red',
  electric: 'yellow',
  ice: 'blue',
};

// Fixed uniform texel scale for all dragons so every sprite keeps exact 1:1 texel density
export const DRAGON_TEXELS_PER_WORLD_UNIT = 16;

export interface DirectionSelectionResult {
  /** Primary 4-way or 8-way direction relative to the camera */
  direction: DragonDirection8;
  /** Closest 4-way atlas row name */
  atlasDir4: DragonDirection4;
  /** Normalized sector index [0..dirCount-1], clockwise starting from front */
  sectorIndex: number;
  /** True when mirroring a right-facing sprite could represent left-facing */
  mirrorX: boolean;
}

/**
 * Selects sprite facing direction from the dragon's XZ facing vector
 * RELATIVE TO THE CAMERA's XZ forward direction.
 * Supports 4 directions now and 8 directions seamlessly.
 */
export function selectCameraRelativeDirection(
  facingX: number,
  facingZ: number,
  camForwardX: number,
  camForwardZ: number,
  dirCount: 4 | 8 = 4,
): DirectionSelectionResult {
  const fLen = Math.hypot(facingX, facingZ);
  const fx = fLen > 1e-5 ? facingX / fLen : 0;
  const fz = fLen > 1e-5 ? facingZ / fLen : 1;

  const cLen = Math.hypot(camForwardX, camForwardZ);
  const cfx = cLen > 1e-5 ? camForwardX / cLen : 0;
  const cfz = cLen > 1e-5 ? camForwardZ / cLen : -1;

  // Camera right vector on XZ plane: cross(camForward, UP(0,1,0)) = (-cfz, cfx)
  const crx = -cfz;
  const crz = cfx;

  // dot(facing, -camForward) is +1 when facing directly toward the camera ("front")
  const towardCamDot = -(fx * cfx + fz * cfz);
  const rightDot = fx * crx + fz * crz;

  // Clockwise angle from "front" (0 = front, +PI/2 = right, ±PI = back, -PI/2 = left)
  let angle = Math.atan2(rightDot, towardCamDot);
  if (angle < 0) angle += Math.PI * 2;

  const step = (Math.PI * 2) / dirCount;
  const sectorIndex = Math.round(angle / step) % dirCount;

  if (dirCount === 4) {
    const dirs4: DragonDirection4[] = ['front', 'right', 'back', 'left'];
    const dir = dirs4[sectorIndex];
    return {
      direction: dir,
      atlasDir4: dir,
      sectorIndex,
      mirrorX: dir === 'left',
    };
  }

  const dirs8: DragonDirection8[] = [
    'front',
    'front_right',
    'right',
    'back_right',
    'back',
    'back_left',
    'left',
    'front_left',
  ];
  const atlasMap8To4: DragonDirection4[] = [
    'front',
    'right',
    'right',
    'right',
    'back',
    'left',
    'left',
    'left',
  ];
  const dir = dirs8[sectorIndex];
  return {
    direction: dir,
    atlasDir4: atlasMap8To4[sectorIndex],
    sectorIndex,
    mirrorX: dir === 'left' || dir === 'front_left' || dir === 'back_left',
  };
}

/**
 * Snaps a scalar world coordinate to the sprite texel grid so pixel edges
 * stay locked without sub-texel shimmer while moving.
 */
export function snapToPixelGrid(
  value: number,
  texelsPerWorldUnit: number = DRAGON_TEXELS_PER_WORLD_UNIT,
): number {
  return Math.round(value * texelsPerWorldUnit) / texelsPerWorldUnit;
}

/**
 * Computes consistent world-space quad size from frame pixel dimensions and
 * uniform texelsPerWorldUnit. Notice tier does NOT distort texel scale unless
 * explicitly baked into frame size, ensuring zero mixed pixel scales!
 */
export function computeDragonQuadSize(
  frameWidthPx: number,
  frameHeightPx: number,
  texelsPerWorldUnit: number = DRAGON_TEXELS_PER_WORLD_UNIT,
): { width: number; height: number } {
  return {
    width: frameWidthPx / texelsPerWorldUnit,
    height: frameHeightPx / texelsPerWorldUnit,
  };
}

/**
 * Computes scaled elliptical blob shadow size & opacity beneath a dragon,
 * shrinking and fading smoothly when the dragon jumps, hatches, or hovers.
 */
export function computeBlobShadow(
  heightAboveGround: number,
  sizeScale: number = 1.0,
  tier: EggTier = 0,
): { scaleX: number; scaleZ: number; opacity: number } {
  const h = Math.max(0, heightAboveGround);
  const tierFactor = 0.96 + tier * 0.04;
  const heightShrink = Math.max(0.45, 1 - h * 0.24);
  const opacity = Math.max(0.2, 0.78 * (1 - h * 0.34));
  return {
    scaleX: 1.02 * sizeScale * tierFactor * heightShrink,
    scaleZ: 0.76 * sizeScale * tierFactor * heightShrink,
    opacity,
  };
}

/**
 * Computes the sprite's RGB lighting & warm orange campfire glow multiplier
 * calibrated for MeshStandardMaterial + ACESFilmicToneMapping so colors stay
 * true and outlines stay dark without blowing out near the campfire PointLight.
 */
export function computeDragonLightTint(
  worldX: number,
  worldZ: number,
  dayCycleProgress: number,
  campfireHpRatio: number,
  hitFlash: number,
  outRgb: [number, number, number],
): void {
  if (hitFlash > 0) {
    outRgb[0] = 1.65;
    outRgb[1] = 1.55;
    outRgb[2] = 1.45;
    return;
  }

  // Calibrated baseline under keyLight (1.85) + hemiLight (0.72) + RoomEnvironment
  let ambR = 0.76;
  let ambG = 0.74;
  let ambB = 0.73;
  if (dayCycleProgress < 0.55) {
    const t = dayCycleProgress / 0.55;
    ambR = 0.76 - t * 0.02;
    ambG = 0.74 - t * 0.11;
    ambB = 0.73 - t * 0.17;
  } else {
    const t = Math.min(1, (dayCycleProgress - 0.55) / 0.35);
    ambR = 0.74 - t * 0.32;
    ambG = 0.63 - t * 0.26;
    ambB = 0.56 - t * 0.11;
  }

  // Warm orange campfire glow within ~15m (adds warm orange hue shift without clipping highlights)
  const dist = Math.hypot(worldX, worldZ);
  const fireFalloff = Math.max(0, 1 - dist / 15.5);
  const glow = fireFalloff * fireFalloff * Math.max(0.25, campfireHpRatio);

  outRgb[0] = Math.min(0.98, ambR + glow * 0.22);
  outRgb[1] = Math.min(0.88, ambG + glow * 0.08);
  outRgb[2] = Math.max(0.28, ambB - glow * 0.06);
}

/**
 * Selects the current animation state from dragon combat phase, combo move & motion.
 */
export function resolveDragonAnimState(
  isHurt: boolean,
  isAttacking: boolean,
  vx: number,
  vz: number,
  attackPhase: DragonAnimAttackPhase = 'idle',
  attackKind: DragonAnimAttackKind = 'stream',
): DragonAnimName {
  if (isHurt) return 'hurt';
  if (attackPhase === 'windup') return 'windup';
  if (attackPhase === 'active') {
    if (attackKind === 'swipe') return 'swipe';
    if (attackKind === 'whip') return 'whip';
    if (attackKind === 'bite') return 'bite';
    return 'attack';
  }
  if (attackPhase === 'recovery') return 'recovery';
  if (isAttacking) return 'attack';
  if (Math.hypot(vx, vz) > 0.25) return 'walk';
  return 'idle';
}
