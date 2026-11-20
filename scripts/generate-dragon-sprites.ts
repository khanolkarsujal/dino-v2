import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  BASE_DRAGON_FRAME_PX,
  DRAGON_ABILITY_CONFIG,
  DRAGON_TEXELS_PER_WORLD_UNIT,
} from '../src/game/dragonConfig';

/**
 * Procedural Voxel-to-Pixel-Art Sprite Atlas Generator
 * Builds an articulated chunky voxel dragon (~17 voxels tall), poses it per
 * animation frame (idle, walk, windup, attack, swipe, whip, bite, recovery, hurt),
 * and renders orthographically at the exact game camera pitch (~45.29 deg)
 * across 4 facing directions (front, right, back, left) with zero AA, flat 2-tone
 * shading, and a 1px dark outline post-step.
 *
 * Exports 4 size-calibrated RGBA PNG atlases (keeping uniform 16 texels/world-unit):
 *   - green (1.4x): 56x56 px/frame
 *   - red   (1.15x): 46x46 px/frame
 *   - blue  (1.0x): 40x40 px/frame
 *   - yellow(0.8x): 32x32 px/frame
 * Along with per-frame pixel-exact mouth & hand/claw anchor coordinates in atlas.json.
 */

// Exact match to game camera in WorldScene.ts:
// camera.position(px, 20.5, pz + 19.5) looking at (px, 0.8, pz)
const GAME_CAMERA_PITCH_RAD = Math.atan2(20.5 - 0.8, 19.5); // ~0.7905 rad (~45.29 deg)

type DirectionName = 'front' | 'right' | 'back' | 'left';
export type AtlasAnimName =
  | 'idle'
  | 'walk'
  | 'windup'
  | 'attack'
  | 'swipe'
  | 'whip'
  | 'bite'
  | 'recovery'
  | 'hurt';
type ColorName = 'green' | 'red' | 'yellow' | 'blue';

const COLOR_TO_SCALE: Record<ColorName, number> = {
  green: DRAGON_ABILITY_CONFIG.stats.earth.sizeScale,
  red: DRAGON_ABILITY_CONFIG.stats.fire.sizeScale,
  blue: DRAGON_ABILITY_CONFIG.stats.ice.sizeScale,
  yellow: DRAGON_ABILITY_CONFIG.stats.electric.sizeScale,
};

const SLOT_EMPTY = 0;
const SLOT_OUTLINE = 1;
const SLOT_BODY = 2;
const SLOT_BODY_DARK = 3;
const SLOT_BELLY = 4;
const SLOT_BELLY_DARK = 5;
const SLOT_SPIKE = 6;
const SLOT_SPIKE_DARK = 7;
const SLOT_EYE_WHITE = 8;
const SLOT_EYE_PUPIL = 9;
const SLOT_NOSTRIL = 10;

type RGBA = readonly [number, number, number, number];

const PALETTES: Record<ColorName, Record<number, RGBA>> = {
  green: {
    [SLOT_EMPTY]: [0, 0, 0, 0],
    [SLOT_OUTLINE]: [32, 36, 18, 255],
    [SLOT_BODY]: [134, 181, 74, 255],
    [SLOT_BODY_DARK]: [94, 134, 48, 255],
    [SLOT_BELLY]: [246, 212, 166, 255],
    [SLOT_BELLY_DARK]: [216, 176, 128, 255],
    [SLOT_SPIKE]: [216, 66, 46, 255],
    [SLOT_SPIKE_DARK]: [166, 42, 28, 255],
    [SLOT_EYE_WHITE]: [252, 252, 248, 255],
    [SLOT_EYE_PUPIL]: [30, 26, 22, 255],
    [SLOT_NOSTRIL]: [32, 36, 18, 255],
  },
  red: {
    [SLOT_EMPTY]: [0, 0, 0, 0],
    [SLOT_OUTLINE]: [48, 20, 20, 255],
    [SLOT_BODY]: [201, 72, 70, 255],
    [SLOT_BODY_DARK]: [148, 46, 45, 255],
    [SLOT_BELLY]: [246, 212, 166, 255],
    [SLOT_BELLY_DARK]: [216, 176, 128, 255],
    [SLOT_SPIKE]: [94, 176, 74, 255],
    [SLOT_SPIKE_DARK]: [62, 128, 48, 255],
    [SLOT_EYE_WHITE]: [252, 252, 248, 255],
    [SLOT_EYE_PUPIL]: [30, 22, 22, 255],
    [SLOT_NOSTRIL]: [48, 20, 20, 255],
  },
  yellow: {
    [SLOT_EMPTY]: [0, 0, 0, 0],
    [SLOT_OUTLINE]: [60, 38, 12, 255],
    [SLOT_BODY]: [242, 188, 76, 255],
    [SLOT_BODY_DARK]: [198, 138, 42, 255],
    [SLOT_BELLY]: [249, 224, 180, 255],
    [SLOT_BELLY_DARK]: [224, 189, 138, 255],
    [SLOT_SPIKE]: [42, 114, 220, 255],
    [SLOT_SPIKE_DARK]: [26, 78, 168, 255],
    [SLOT_EYE_WHITE]: [252, 252, 248, 255],
    [SLOT_EYE_PUPIL]: [32, 26, 16, 255],
    [SLOT_NOSTRIL]: [60, 38, 12, 255],
  },
  blue: {
    [SLOT_EMPTY]: [0, 0, 0, 0],
    [SLOT_OUTLINE]: [20, 34, 52, 255],
    [SLOT_BODY]: [66, 140, 194, 255],
    [SLOT_BODY_DARK]: [44, 98, 144, 255],
    [SLOT_BELLY]: [246, 212, 166, 255],
    [SLOT_BELLY_DARK]: [216, 176, 128, 255],
    [SLOT_SPIKE]: [156, 68, 184, 255],
    [SLOT_SPIKE_DARK]: [112, 44, 138, 255],
    [SLOT_EYE_WHITE]: [252, 252, 248, 255],
    [SLOT_EYE_PUPIL]: [20, 24, 34, 255],
    [SLOT_NOSTRIL]: [20, 34, 52, 255],
  },
};

type PartId = 'torso' | 'head' | 'jaw' | 'armR' | 'legL' | 'legR' | 'tail';

interface Voxel {
  x: number;
  y: number;
  z: number;
  slot: number;
  darkSlot: number;
  part: PartId;
  unshaded?: boolean;
}

interface PartPose {
  dx: number;
  dy: number;
  dz: number;
}

interface FramePose {
  bodyDy: number;
  bodyDz: number;
  yawOffset?: number;
  head: PartPose;
  jaw: PartPose;
  armR: PartPose;
  legL: PartPose;
  legR: PartPose;
  tail: PartPose;
}

function buildVoxelDragon(): Voxel[] {
  const voxels: Voxel[] = [];
  const occupied = new Set<string>();

  const setVoxel = (
    x: number,
    y: number,
    z: number,
    slot: number,
    darkSlot: number,
    part: PartId,
    unshaded = false,
  ) => {
    const key = `${x},${y},${z}`;
    if (occupied.has(key)) {
      const idx = voxels.findIndex((v) => v.x === x && v.y === y && v.z === z);
      if (idx >= 0) voxels.splice(idx, 1);
    }
    occupied.add(key);
    voxels.push({ x, y, z, slot, darkSlot, part, unshaded });
  };

  const fillBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    slot: number,
    darkSlot: number,
    part: PartId,
  ) => {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          setVoxel(x, y, z, slot, darkSlot, part);
        }
      }
    }
  };

  // 1. Chunky Stout Torso
  fillBox(-4, 4, 2, 6, -3, 2, SLOT_BODY, SLOT_BODY_DARK, 'torso');
  fillBox(-3, 3, 2, 7, -3, 2, SLOT_BODY, SLOT_BODY_DARK, 'torso');

  // Cream Belly Patch
  fillBox(-3, 3, 2, 5, 2, 3, SLOT_BELLY, SLOT_BELLY_DARK, 'torso');
  fillBox(-2, 2, 2, 6, 2, 3, SLOT_BELLY, SLOT_BELLY_DARK, 'torso');

  // Left stubby arm + Articulated Right Claw/Arm (for swipe & lunge clarity)
  setVoxel(-5, 4, 1, SLOT_BODY, SLOT_BODY_DARK, 'torso');
  setVoxel(-5, 4, 2, SLOT_BODY, SLOT_BODY_DARK, 'torso');
  setVoxel(5, 4, 1, SLOT_BODY, SLOT_BODY_DARK, 'armR');
  setVoxel(5, 4, 2, SLOT_BODY, SLOT_BODY_DARK, 'armR');
  setVoxel(5, 4, 3, SLOT_BELLY, SLOT_BELLY_DARK, 'armR'); // claw tip

  // Lower spine dorsal spike
  fillBox(-1, 1, 4, 5, -5, -4, SLOT_SPIKE, SLOT_SPIKE_DARK, 'torso');

  // 2. Chunky Boxy Head + Overhanging Snout
  fillBox(-4, 4, 7, 12, -3, 2, SLOT_BODY, SLOT_BODY_DARK, 'head');
  fillBox(-3, 3, 13, 13, -2, 2, SLOT_BODY, SLOT_BODY_DARK, 'head');
  fillBox(-4, 4, 9, 12, 3, 5, SLOT_BODY, SLOT_BODY_DARK, 'head');
  fillBox(-3, 3, 9, 11, 6, 7, SLOT_BODY, SLOT_BODY_DARK, 'head');

  // Articulated lower jaw
  fillBox(-3, 3, 7, 8, 2, 5, SLOT_BODY_DARK, SLOT_BODY_DARK, 'jaw');

  // Back spikes
  fillBox(-1, 1, 11, 12, -5, -4, SLOT_SPIKE, SLOT_SPIKE_DARK, 'head');
  fillBox(-1, 1, 7, 8, -5, -4, SLOT_SPIKE, SLOT_SPIKE_DARK, 'head');

  // Side Eyes
  for (const sx of [-4, 4]) {
    setVoxel(sx, 9, 0, SLOT_EYE_WHITE, SLOT_EYE_WHITE, 'head', true);
    setVoxel(sx, 10, 0, SLOT_EYE_WHITE, SLOT_EYE_WHITE, 'head', true);
    setVoxel(sx, 11, 0, SLOT_EYE_WHITE, SLOT_EYE_WHITE, 'head', true);
    setVoxel(sx, 9, 1, SLOT_EYE_PUPIL, SLOT_EYE_PUPIL, 'head', true);
    setVoxel(sx, 10, 1, SLOT_EYE_PUPIL, SLOT_EYE_PUPIL, 'head', true);
    setVoxel(sx, 11, 1, SLOT_EYE_WHITE, SLOT_EYE_WHITE, 'head', true);
  }
  setVoxel(-4, 11, 5, SLOT_NOSTRIL, SLOT_NOSTRIL, 'head', true);
  setVoxel(4, 11, 5, SLOT_NOSTRIL, SLOT_NOSTRIL, 'head', true);

  // Front Eyes & Nostrils
  for (const fx of [-2, 2]) {
    setVoxel(fx, 10, 7, SLOT_EYE_WHITE, SLOT_EYE_WHITE, 'head', true);
    setVoxel(fx, 11, 7, SLOT_EYE_WHITE, SLOT_EYE_WHITE, 'head', true);
    setVoxel(fx, 9, 7, SLOT_EYE_PUPIL, SLOT_EYE_PUPIL, 'head', true);
  }
  setVoxel(-1, 10, 7, SLOT_NOSTRIL, SLOT_NOSTRIL, 'head', true);
  setVoxel(1, 10, 7, SLOT_NOSTRIL, SLOT_NOSTRIL, 'head', true);

  // 3. Stubby Legs & Feet
  fillBox(-4, -2, 0, 2, -2, 2, SLOT_BODY_DARK, SLOT_BODY_DARK, 'legL');
  fillBox(-4, -2, 0, 0, 2, 3, SLOT_BODY, SLOT_BODY_DARK, 'legL');
  fillBox(2, 4, 0, 2, -2, 2, SLOT_BODY, SLOT_BODY_DARK, 'legR');
  fillBox(2, 4, 0, 0, 2, 3, SLOT_BODY, SLOT_BODY_DARK, 'legR');

  // 4. Chunky Upturned Tail
  fillBox(-2, 2, 2, 4, -5, -4, SLOT_BODY, SLOT_BODY_DARK, 'tail');
  fillBox(-1, 1, 2, 4, -7, -6, SLOT_BODY, SLOT_BODY_DARK, 'tail');
  setVoxel(0, 4, -8, SLOT_BODY_DARK, SLOT_BODY_DARK, 'tail');
  setVoxel(0, 5, -8, SLOT_BODY, SLOT_BODY_DARK, 'tail');

  return voxels;
}

const ZERO_POSE: PartPose = { dx: 0, dy: 0, dz: 0 };

const ANIM_FRAMES: Array<{ anim: AtlasAnimName; frameIdx: number; pose: FramePose }> = [
  // IDLE (3 frames)
  {
    anim: 'idle',
    frameIdx: 0,
    pose: {
      bodyDy: 0,
      bodyDz: 0,
      head: ZERO_POSE,
      jaw: ZERO_POSE,
      armR: ZERO_POSE,
      legL: ZERO_POSE,
      legR: ZERO_POSE,
      tail: ZERO_POSE,
    },
  },
  {
    anim: 'idle',
    frameIdx: 1,
    pose: {
      bodyDy: -1,
      bodyDz: 0,
      head: { dx: 0, dy: -1, dz: 0 },
      jaw: { dx: 0, dy: -1, dz: 0 },
      armR: { dx: 0, dy: -1, dz: 0 },
      legL: ZERO_POSE,
      legR: ZERO_POSE,
      tail: { dx: 1, dy: 0, dz: 0 },
    },
  },
  {
    anim: 'idle',
    frameIdx: 2,
    pose: {
      bodyDy: 0,
      bodyDz: 0,
      head: { dx: 0, dy: 1, dz: 0 },
      jaw: ZERO_POSE,
      armR: ZERO_POSE,
      legL: ZERO_POSE,
      legR: ZERO_POSE,
      tail: { dx: -1, dy: 1, dz: 0 },
    },
  },

  // WALK (4 frames)
  {
    anim: 'walk',
    frameIdx: 0,
    pose: {
      bodyDy: 1,
      bodyDz: 0,
      head: { dx: 0, dy: 1, dz: 1 },
      jaw: { dx: 0, dy: 1, dz: 1 },
      armR: { dx: 0, dy: 1, dz: 1 },
      legL: { dx: 0, dy: 1, dz: 2 },
      legR: { dx: 0, dy: 0, dz: -2 },
      tail: { dx: -1, dy: 1, dz: 0 },
    },
  },
  {
    anim: 'walk',
    frameIdx: 1,
    pose: {
      bodyDy: 0,
      bodyDz: 0,
      head: ZERO_POSE,
      jaw: ZERO_POSE,
      armR: ZERO_POSE,
      legL: { dx: 0, dy: 0, dz: 1 },
      legR: ZERO_POSE,
      tail: ZERO_POSE,
    },
  },
  {
    anim: 'walk',
    frameIdx: 2,
    pose: {
      bodyDy: 1,
      bodyDz: 0,
      head: { dx: 0, dy: 1, dz: 1 },
      jaw: { dx: 0, dy: 1, dz: 1 },
      armR: { dx: 0, dy: 1, dz: -1 },
      legL: { dx: 0, dy: 0, dz: -2 },
      legR: { dx: 0, dy: 1, dz: 2 },
      tail: { dx: 1, dy: 1, dz: 0 },
    },
  },
  {
    anim: 'walk',
    frameIdx: 3,
    pose: {
      bodyDy: 0,
      bodyDz: 0,
      head: ZERO_POSE,
      jaw: ZERO_POSE,
      armR: ZERO_POSE,
      legL: ZERO_POSE,
      legR: { dx: 0, dy: 0, dz: 1 },
      tail: ZERO_POSE,
    },
  },

  // WINDUP / ANTICIPATION (2 frames: crouch back + mouth crack open)
  {
    anim: 'windup',
    frameIdx: 0,
    pose: {
      bodyDy: -1,
      bodyDz: -1,
      head: { dx: 0, dy: 0, dz: -2 },
      jaw: { dx: 0, dy: -1, dz: -2 },
      armR: { dx: 1, dy: 2, dz: -1 },
      legL: { dx: 0, dy: 0, dz: -1 },
      legR: { dx: 0, dy: 0, dz: -1 },
      tail: { dx: 0, dy: 1, dz: -1 },
    },
  },
  {
    anim: 'windup',
    frameIdx: 1,
    pose: {
      bodyDy: -1,
      bodyDz: -2,
      head: { dx: 0, dy: 1, dz: -2 },
      jaw: { dx: 0, dy: -2, dz: -1 },
      armR: { dx: 1, dy: 3, dz: -1 },
      legL: { dx: 0, dy: 0, dz: -1 },
      legR: { dx: 0, dy: 0, dz: -1 },
      tail: { dx: 0, dy: 2, dz: -2 },
    },
  },

  // ATTACK / STREAM & CAST LOOP (2 frames: wide open jaw forward lean)
  {
    anim: 'attack',
    frameIdx: 0,
    pose: {
      bodyDy: 0,
      bodyDz: 2,
      head: { dx: 0, dy: 0, dz: 3 },
      jaw: { dx: 0, dy: -3, dz: 2 },
      armR: { dx: 0, dy: 1, dz: 2 },
      legL: { dx: 0, dy: 0, dz: 1 },
      legR: { dx: 0, dy: 0, dz: 1 },
      tail: { dx: 0, dy: 1, dz: 1 },
    },
  },
  {
    anim: 'attack',
    frameIdx: 1,
    pose: {
      bodyDy: 1,
      bodyDz: 2,
      head: { dx: 0, dy: 1, dz: 3 },
      jaw: { dx: 0, dy: -2, dz: 3 },
      armR: { dx: 0, dy: 1, dz: 2 },
      legL: { dx: 0, dy: 1, dz: 1 },
      legR: { dx: 0, dy: 0, dz: 2 },
      tail: { dx: -1, dy: 2, dz: 1 },
    },
  },

  // SWIPE (2 frames: Green quick claw slash)
  {
    anim: 'swipe',
    frameIdx: 0,
    pose: {
      bodyDy: 0,
      bodyDz: 1,
      yawOffset: -0.25,
      head: { dx: -1, dy: 0, dz: 2 },
      jaw: { dx: -1, dy: -1, dz: 2 },
      armR: { dx: 1, dy: 2, dz: 4 },
      legL: { dx: 0, dy: 0, dz: 1 },
      legR: { dx: 0, dy: 1, dz: 2 },
      tail: { dx: 1, dy: 1, dz: 0 },
    },
  },
  {
    anim: 'swipe',
    frameIdx: 1,
    pose: {
      bodyDy: 0,
      bodyDz: 2,
      yawOffset: 0.3,
      head: { dx: 1, dy: 0, dz: 2 },
      jaw: { dx: 1, dy: -1, dz: 2 },
      armR: { dx: -2, dy: 0, dz: 4 },
      legL: { dx: 0, dy: 0, dz: 2 },
      legR: { dx: 0, dy: 0, dz: 1 },
      tail: { dx: -2, dy: 1, dz: 0 },
    },
  },

  // WHIP (2 frames: Green sweeping tail spin)
  {
    anim: 'whip',
    frameIdx: 0,
    pose: {
      bodyDy: 0,
      bodyDz: 0,
      yawOffset: 1.05,
      head: { dx: 1, dy: 0, dz: 0 },
      jaw: { dx: 1, dy: 0, dz: 0 },
      armR: { dx: 1, dy: 1, dz: 1 },
      legL: { dx: 0, dy: 1, dz: 0 },
      legR: { dx: 0, dy: 0, dz: 1 },
      tail: { dx: 3, dy: 1, dz: 2 },
    },
  },
  {
    anim: 'whip',
    frameIdx: 1,
    pose: {
      bodyDy: 0,
      bodyDz: 0,
      yawOffset: -1.15,
      head: { dx: -1, dy: 0, dz: 0 },
      jaw: { dx: -1, dy: 0, dz: 0 },
      armR: { dx: -1, dy: 1, dz: 1 },
      legL: { dx: 0, dy: 0, dz: 1 },
      legR: { dx: 0, dy: 1, dz: 0 },
      tail: { dx: -3, dy: 1, dz: 2 },
    },
  },

  // BITE (2 frames: Green pounce lunge + giant chomp)
  {
    anim: 'bite',
    frameIdx: 0,
    pose: {
      bodyDy: 2,
      bodyDz: 2,
      head: { dx: 0, dy: 2, dz: 4 },
      jaw: { dx: 0, dy: -3, dz: 3 },
      armR: { dx: 0, dy: 2, dz: 3 },
      legL: { dx: 0, dy: 2, dz: -1 },
      legR: { dx: 0, dy: 2, dz: 1 },
      tail: { dx: 0, dy: 2, dz: -1 },
    },
  },
  {
    anim: 'bite',
    frameIdx: 1,
    pose: {
      bodyDy: 0,
      bodyDz: 3,
      head: { dx: 0, dy: -1, dz: 4 },
      jaw: { dx: 0, dy: -1, dz: 4 },
      armR: { dx: 0, dy: 0, dz: 4 },
      legL: { dx: 0, dy: 0, dz: 2 },
      legR: { dx: 0, dy: 0, dz: 2 },
      tail: { dx: 0, dy: 2, dz: 1 },
    },
  },

  // RECOVERY (2 frames: settle back to stance)
  {
    anim: 'recovery',
    frameIdx: 0,
    pose: {
      bodyDy: 0,
      bodyDz: 1,
      head: { dx: 0, dy: 0, dz: 1 },
      jaw: { dx: 0, dy: -1, dz: 1 },
      armR: { dx: 0, dy: 0, dz: 1 },
      legL: { dx: 0, dy: 0, dz: 1 },
      legR: ZERO_POSE,
      tail: { dx: 0, dy: 1, dz: 0 },
    },
  },
  {
    anim: 'recovery',
    frameIdx: 1,
    pose: {
      bodyDy: -1,
      bodyDz: 0,
      head: { dx: 0, dy: -1, dz: 0 },
      jaw: { dx: 0, dy: -1, dz: 0 },
      armR: ZERO_POSE,
      legL: ZERO_POSE,
      legR: ZERO_POSE,
      tail: ZERO_POSE,
    },
  },

  // HURT (1 frame)
  {
    anim: 'hurt',
    frameIdx: 0,
    pose: {
      bodyDy: 1,
      bodyDz: -1,
      head: { dx: 0, dy: 2, dz: -2 },
      jaw: { dx: 0, dy: 0, dz: -2 },
      armR: { dx: 0, dy: 2, dz: -1 },
      legL: { dx: 0, dy: 1, dz: 1 },
      legR: { dx: 0, dy: 1, dz: -1 },
      tail: { dx: 0, dy: -1, dz: -1 },
    },
  },
];

const DIRECTIONS: Array<{ name: DirectionName; yawRad: number }> = [
  { name: 'front', yawRad: 0 },
  { name: 'right', yawRad: Math.PI / 2 },
  { name: 'back', yawRad: Math.PI },
  { name: 'left', yawRad: -Math.PI / 2 },
];

function projectPoint(
  vx: number,
  vy: number,
  vz: number,
  yawRad: number,
  frameSize: number,
  voxelScale: number,
): { px: number; py: number; camZ: number } {
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);
  const cosP = Math.cos(GAME_CAMERA_PITCH_RAD);
  const sinP = Math.sin(GAME_CAMERA_PITCH_RAD);

  const yPitchComp = 1.04;
  const centerX = frameSize / 2;
  const originY = frameSize - 9.0 * (frameSize / BASE_DRAGON_FRAME_PX);

  const scaledY = vy * yPitchComp;
  const rx = vx * cosY + vz * sinY;
  const rz = -vx * sinY + vz * cosY;
  const ry = scaledY - 5.0;

  const camX = rx;
  const camY = ry * cosP - rz * sinP + 5.0;
  const camZ = ry * sinP + rz * cosP;

  return {
    px: centerX + camX * voxelScale,
    py: originY - camY * voxelScale,
    camZ,
  };
}

export interface FrameAnchorPoint {
  /** Normalized [-0.5 .. +0.5] X relative to sprite center (+right) */
  nx: number;
  /** Normalized [0 .. 1] Y above grounded feet (+up) */
  ny: number;
}

function computeFrameAnchors(
  pose: FramePose,
  yawRad: number,
  frameSize: number,
  voxelScale: number,
): { mouth: FrameAnchorPoint; hand: FrameAnchorPoint } {
  const totalYaw = yawRad + (pose.yawOffset ?? 0);

  // Mouth voxel anchor: snout front opening between upper snout & lower jaw
  const mouthProj = projectPoint(
    0 + pose.head.dx,
    8.6 + pose.head.dy,
    6.8 + pose.head.dz,
    totalYaw,
    frameSize,
    voxelScale,
  );
  // Hand/claw anchor: right claw tip
  const handProj = projectPoint(
    5.2 + pose.armR.dx,
    4.2 + pose.armR.dy,
    3.4 + pose.armR.dz,
    totalYaw,
    frameSize,
    voxelScale,
  );

  // Bottom pad in baseline 40px frame is 6.5px -> scales linearly with frameSize
  const footPixelY = frameSize - (6.5 * frameSize) / BASE_DRAGON_FRAME_PX;

  const toAnchor = (p: { px: number; py: number }): FrameAnchorPoint => ({
    nx: Number(((p.px - frameSize / 2) / frameSize).toFixed(4)),
    ny: Number(((footPixelY - p.py) / frameSize).toFixed(4)),
  });

  return {
    mouth: toAnchor(mouthProj),
    hand: toAnchor(handProj),
  };
}

function renderFrameSlots(
  baseVoxels: Voxel[],
  pose: FramePose,
  yawRad: number,
  frameSize: number,
  voxelScale: number,
): Uint8Array {
  const buf = new Uint8Array(frameSize * frameSize);
  const depthBuf = new Float32Array(frameSize * frameSize).fill(-1e9);

  const totalYaw = yawRad + (pose.yawOffset ?? 0);
  const cosY = Math.cos(totalYaw);
  const sinY = Math.sin(totalYaw);
  const cosP = Math.cos(GAME_CAMERA_PITCH_RAD);
  const sinP = Math.sin(GAME_CAMERA_PITCH_RAD);

  const yPitchComp = 1.04;
  const centerX = frameSize / 2;
  const originY = frameSize - 9.0 * (frameSize / BASE_DRAGON_FRAME_PX);

  for (const v of baseVoxels) {
    let vx = v.x;
    let vy = v.y;
    let vz = v.z;

    if (v.part === 'torso') {
      vy += pose.bodyDy;
      vz += pose.bodyDz;
    } else if (v.part === 'head') {
      vx += pose.head.dx;
      vy += pose.head.dy;
      vz += pose.head.dz;
    } else if (v.part === 'jaw') {
      vx += pose.jaw.dx;
      vy += pose.jaw.dy;
      vz += pose.jaw.dz;
    } else if (v.part === 'armR') {
      vx += pose.armR.dx;
      vy += pose.armR.dy;
      vz += pose.armR.dz;
    } else if (v.part === 'legL') {
      vx += pose.legL.dx;
      vy += pose.legL.dy;
      vz += pose.legL.dz;
    } else if (v.part === 'legR') {
      vx += pose.legR.dx;
      vy += pose.legR.dy;
      vz += pose.legR.dz;
    } else if (v.part === 'tail') {
      vx += pose.tail.dx;
      vy += pose.tail.dy;
      vz += pose.tail.dz;
    }

    vy *= yPitchComp;

    const rx = vx * cosY + vz * sinY;
    const rz = -vx * sinY + vz * cosY;
    const ry = vy - 5.0;

    const camX = rx;
    const camY = ry * cosP - rz * sinP + 5.0;
    const camZ = ry * sinP + rz * cosP;

    const sx0 = Math.round(centerX + (camX - 0.44) * voxelScale);
    const sx1 = Math.round(centerX + (camX + 0.44) * voxelScale);
    const sy0 = Math.round(originY - (camY + 0.44) * voxelScale);
    const sy1 = Math.round(originY - (camY - 0.44) * voxelScale);

    const isLit = v.unshaded || camZ >= -0.3 || vy > 8.5;
    const chosenSlot = isLit ? v.slot : v.darkSlot;

    for (let py = sy0; py <= sy1; py++) {
      if (py < 1 || py >= frameSize - 1) continue;
      for (let px = sx0; px <= sx1; px++) {
        if (px < 1 || px >= frameSize - 1) continue;
        const idx = py * frameSize + px;
        if (camZ > depthBuf[idx]) {
          depthBuf[idx] = camZ;
          buf[idx] = chosenSlot;
        }
      }
    }
  }

  // Crisp 1px dark outline around 4-connected edges
  const out = new Uint8Array(buf);
  for (let py = 1; py < frameSize - 1; py++) {
    for (let px = 1; px < frameSize - 1; px++) {
      const idx = py * frameSize + px;
      if (buf[idx] !== SLOT_EMPTY) continue;
      if (
        buf[idx - 1] !== SLOT_EMPTY ||
        buf[idx + 1] !== SLOT_EMPTY ||
        buf[idx - frameSize] !== SLOT_EMPTY ||
        buf[idx + frameSize] !== SLOT_EMPTY
      ) {
        out[idx] = SLOT_OUTLINE;
      }
    }
  }

  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodeRgbaPng(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    const srcStart = y * width * 4;
    raw.set(rgba.subarray(srcStart, srcStart + width * 4), rowStart + 1);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function main() {
  const baseVoxels = buildVoxelDragon();
  const cols = ANIM_FRAMES.length;
  const rows = DIRECTIONS.length;

  const outDir = path.resolve(process.cwd(), 'public/sprites/dragons');
  fs.mkdirSync(outDir, { recursive: true });

  const sheets: Record<
    ColorName,
    {
      scale: number;
      frameWidth: number;
      frameHeight: number;
      sheetWidth: number;
      sheetHeight: number;
      frames: Record<
        string,
        {
          dir: DirectionName;
          anim: AtlasAnimName;
          frameIndex: number;
          col: number;
          row: number;
          x: number;
          y: number;
          w: number;
          h: number;
          anchors: { mouth: FrameAnchorPoint; hand: FrameAnchorPoint };
        }
      >;
    }
  > = {} as never;

  for (const colorName of ['green', 'red', 'yellow', 'blue'] as ColorName[]) {
    const scaleMult = COLOR_TO_SCALE[colorName];
    const frameSize = Math.round(BASE_DRAGON_FRAME_PX * scaleMult);
    const voxelScale = 1.18 * scaleMult;
    const sheetW = cols * frameSize;
    const sheetH = rows * frameSize;
    const sheetSlots = new Uint8Array(sheetW * sheetH);
    const pal = PALETTES[colorName];

    const frameMap: (typeof sheets)[ColorName]['frames'] = {};

    for (let row = 0; row < DIRECTIONS.length; row++) {
      const dir = DIRECTIONS[row];
      for (let col = 0; col < ANIM_FRAMES.length; col++) {
        const f = ANIM_FRAMES[col];
        const frameSlots = renderFrameSlots(baseVoxels, f.pose, dir.yawRad, frameSize, voxelScale);

        for (let py = 0; py < frameSize; py++) {
          for (let px = 0; px < frameSize; px++) {
            const dstX = col * frameSize + px;
            const dstY = row * frameSize + py;
            sheetSlots[dstY * sheetW + dstX] = frameSlots[py * frameSize + px];
          }
        }

        const key = `${dir.name}/${f.anim}/${f.frameIdx}`;
        frameMap[key] = {
          dir: dir.name,
          anim: f.anim,
          frameIndex: f.frameIdx,
          col,
          row,
          x: col * frameSize,
          y: row * frameSize,
          w: frameSize,
          h: frameSize,
          anchors: computeFrameAnchors(f.pose, dir.yawRad, frameSize, voxelScale),
        };
      }
    }

    const rgba = new Uint8Array(sheetW * sheetH * 4);
    for (let i = 0; i < sheetSlots.length; i++) {
      const c = pal[sheetSlots[i]] ?? pal[SLOT_EMPTY];
      rgba[i * 4] = c[0];
      rgba[i * 4 + 1] = c[1];
      rgba[i * 4 + 2] = c[2];
      rgba[i * 4 + 3] = c[3];
    }
    const pngBuf = encodeRgbaPng(sheetW, sheetH, rgba);
    fs.writeFileSync(path.join(outDir, `dragon_${colorName}.png`), pngBuf);

    sheets[colorName] = {
      scale: scaleMult,
      frameWidth: frameSize,
      frameHeight: frameSize,
      sheetWidth: sheetW,
      sheetHeight: sheetH,
      frames: frameMap,
    };
  }

  const atlasMeta = {
    columns: cols,
    rows,
    texelsPerWorldUnit: DRAGON_TEXELS_PER_WORLD_UNIT,
    cameraPitchRad: Number(GAME_CAMERA_PITCH_RAD.toFixed(5)),
    directions: ['front', 'right', 'back', 'left'] as DirectionName[],
    animations: {
      idle: { frames: 3, fps: 5 },
      walk: { frames: 4, fps: 9 },
      windup: { frames: 2, fps: 14 },
      attack: { frames: 2, fps: 12 },
      swipe: { frames: 2, fps: 15 },
      whip: { frames: 2, fps: 14 },
      bite: { frames: 2, fps: 14 },
      recovery: { frames: 2, fps: 10 },
      hurt: { frames: 1, fps: 4 },
    },
    colors: ['green', 'red', 'yellow', 'blue'] as ColorName[],
    sheets,
  };

  const jsonStr = JSON.stringify(atlasMeta, null, 2);
  fs.writeFileSync(path.join(outDir, 'atlas.json'), jsonStr);
  fs.writeFileSync(path.resolve(process.cwd(), 'src/three/dragonAtlas.json'), jsonStr);

  console.log(
    `Generated 4 size-calibrated dragon atlases (${cols}x${rows} frames, 16 px/unit) -> green:${sheets.green.frameWidth}px red:${sheets.red.frameWidth}px blue:${sheets.blue.frameWidth}px yellow:${sheets.yellow.frameWidth}px`,
  );
}

main();
