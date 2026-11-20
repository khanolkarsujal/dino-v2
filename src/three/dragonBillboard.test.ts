import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeBlobShadow,
  computeDragonLightTint,
  computeDragonQuadSize,
  DRAGON_TEXELS_PER_WORLD_UNIT,
  ELEMENT_TO_DRAGON_COLOR,
  resolveDragonAnimState,
  selectCameraRelativeDirection,
  snapToPixelGrid,
} from './dragonBillboard';

test('ELEMENT_TO_DRAGON_COLOR maps all 4 dragon elements to exact sprite colors', () => {
  assert.equal(ELEMENT_TO_DRAGON_COLOR.earth, 'green');
  assert.equal(ELEMENT_TO_DRAGON_COLOR.fire, 'red');
  assert.equal(ELEMENT_TO_DRAGON_COLOR.electric, 'yellow');
  assert.equal(ELEMENT_TO_DRAGON_COLOR.ice, 'blue');
});

test('selectCameraRelativeDirection selects 4 directions relative to camera forward', () => {
  // Default tactical camera looks along -Z: camForward = (0, -1)
  assert.equal(selectCameraRelativeDirection(0, 1, 0, -1, 4).direction, 'front');
  assert.equal(selectCameraRelativeDirection(1, 0, 0, -1, 4).direction, 'right');
  assert.equal(selectCameraRelativeDirection(0, -1, 0, -1, 4).direction, 'back');
  assert.equal(selectCameraRelativeDirection(-1, 0, 0, -1, 4).direction, 'left');

  // If camera rotates 90 deg right (looking toward +X), dragon facing -X looks at camera ("front")
  assert.equal(selectCameraRelativeDirection(-1, 0, 1, 0, 4).direction, 'front');
  assert.equal(selectCameraRelativeDirection(0, 1, 1, 0, 4).direction, 'right');
  assert.equal(selectCameraRelativeDirection(1, 0, 1, 0, 4).direction, 'back');
  assert.equal(selectCameraRelativeDirection(0, -1, 1, 0, 4).direction, 'left');
});

test('selectCameraRelativeDirection supports 8 directions for future expansion', () => {
  const diag = selectCameraRelativeDirection(1, 1, 0, -1, 8);
  assert.equal(diag.direction, 'front_right');
  assert.equal(diag.atlasDir4, 'right');

  const backLeft = selectCameraRelativeDirection(-1, -1, 0, -1, 8);
  assert.equal(backLeft.direction, 'back_left');
  assert.equal(backLeft.atlasDir4, 'left');
  assert.equal(backLeft.mirrorX, true);
});

test('snapToPixelGrid locks coordinates cleanly onto uniform texel steps', () => {
  const step = 1 / DRAGON_TEXELS_PER_WORLD_UNIT; // 0.0625
  assert.equal(snapToPixelGrid(1.01, DRAGON_TEXELS_PER_WORLD_UNIT), 1.0);
  assert.equal(snapToPixelGrid(1.04, DRAGON_TEXELS_PER_WORLD_UNIT), 1.0 + step);
  assert.equal(snapToPixelGrid(-0.07, DRAGON_TEXELS_PER_WORLD_UNIT), -step);
});

test('computeDragonQuadSize maintains constant texel density across sprites', () => {
  const quad = computeDragonQuadSize(40, 40, DRAGON_TEXELS_PER_WORLD_UNIT);
  assert.equal(quad.width, 2.5);
  assert.equal(quad.height, 2.5);
});

test('computeBlobShadow shrinks and fades as height increases and scales with sizeScale', () => {
  const grounded = computeBlobShadow(0, 1.0, 0);
  const large = computeBlobShadow(0, 1.4, 0);
  const airborne = computeBlobShadow(1.6, 1.0, 0);
  assert.ok(large.scaleX > grounded.scaleX);
  assert.ok(airborne.scaleX < grounded.scaleX);
  assert.ok(airborne.scaleZ < grounded.scaleZ);
  assert.ok(airborne.opacity < grounded.opacity);
});

test('computeDragonLightTint warms dragons near campfire and darkens them at night', () => {
  const nearCampDay: [number, number, number] = [0, 0, 0];
  const farNight: [number, number, number] = [0, 0, 0];
  const nearNight: [number, number, number] = [0, 0, 0];

  computeDragonLightTint(2, 2, 0.1, 1.0, 0, nearCampDay);
  computeDragonLightTint(35, 35, 0.9, 1.0, 0, farNight);
  computeDragonLightTint(2, 2, 0.9, 1.0, 0, nearNight);

  assert.ok(nearCampDay[0] > nearCampDay[2], 'campfire adds warm red/orange bias');
  assert.ok(farNight[0] < nearCampDay[0], 'night darkens distant dragons');
  assert.ok(nearNight[0] > farNight[0], 'campfire warms nearby dragons even at night');
});

test('resolveDragonAnimState respects priority hurt > phases > walk > idle', () => {
  assert.equal(resolveDragonAnimState(true, true, 5, 0, 'active', 'bite'), 'hurt');
  assert.equal(resolveDragonAnimState(false, false, 0, 0, 'windup', 'stream'), 'windup');
  assert.equal(resolveDragonAnimState(false, false, 0, 0, 'active', 'swipe'), 'swipe');
  assert.equal(resolveDragonAnimState(false, false, 0, 0, 'active', 'whip'), 'whip');
  assert.equal(resolveDragonAnimState(false, false, 0, 0, 'active', 'bite'), 'bite');
  assert.equal(resolveDragonAnimState(false, false, 0, 0, 'recovery', 'bite'), 'recovery');
  assert.equal(resolveDragonAnimState(false, true, 5, 0), 'attack');
  assert.equal(resolveDragonAnimState(false, false, 3, 0), 'walk');
  assert.equal(resolveDragonAnimState(false, false, 0.05, 0.05), 'idle');
});
