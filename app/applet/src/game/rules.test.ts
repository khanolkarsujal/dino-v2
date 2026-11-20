import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScoreIncrement, checkCollision, calculateSpeed, getDifficultyMultiplier } from './rules.ts';

test('score increment calculation scales with speed', () => {
  const inc1 = calculateScoreIncrement(6, 1);
  assert.equal(inc1, 0); // 6 * 1 * 0.1 = 0.6 -> floor = 0
  const inc2 = calculateScoreIncrement(10, 5);
  assert.equal(inc2, 5); // 10 * 5 * 0.1 = 5
});

test('collision detection triggers correctly on overlap', () => {
  const dino = { x: 50, y: 100, width: 40, height: 45, isDucking: false };
  const obstacle = { x: 60, y: 105, width: 20, height: 30 };
  assert.equal(checkCollision(dino, obstacle), true);
});

test('collision detection ignores non-overlapping objects', () => {
  const dino = { x: 50, y: 100, width: 40, height: 45, isDucking: false };
  const obstacle = { x: 200, y: 100, width: 20, height: 30 };
  assert.equal(checkCollision(dino, obstacle), false);
});

test('speed increases with score progression', () => {
  assert.equal(calculateSpeed(0, 6), 6);
  assert.equal(calculateSpeed(200, 6), 6.8);
  assert.equal(calculateSpeed(1000, 6), 10);
});

test('difficulty multipliers return correct values', () => {
  assert.equal(getDifficultyMultiplier('classic'), 1.0);
  assert.equal(getDifficultyMultiplier('hardcore'), 1.5);
  assert.equal(getDifficultyMultiplier('timeAttack'), 1.2);
});
