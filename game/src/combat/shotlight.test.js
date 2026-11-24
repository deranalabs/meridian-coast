// The shot's light: how long a muzzle flash and a tracer last, how long the streak is and where it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLASH_LIFE, TRACER_LIFE, muzzleFlash, streakLength, streak } from './shotlight.js';

const FRAME = 1 / 60;

test('the muzzle flash lasts about three frames and the tracer two', () => {
  assert.ok(FLASH_LIFE >= 2 * FRAME && FLASH_LIFE <= 4 * FRAME);
  assert.ok(TRACER_LIFE >= FRAME && TRACER_LIFE <= 2.5 * FRAME);
});

test('the flash is full on the shot frame, smaller after and gone at its life', () => {
  assert.equal(muzzleFlash(0).brightness, 1);
  assert.ok(muzzleFlash(FRAME).brightness < 1 && muzzleFlash(FRAME).brightness > 0);
  assert.ok(muzzleFlash(FRAME).size < muzzleFlash(0).size);
  assert.equal(muzzleFlash(FLASH_LIFE).brightness, 0);
  assert.equal(muzzleFlash(-1).brightness, 0);
});

test('the streak is a short piece of a long shot, never longer than the shot', () => {
  assert.equal(streakLength(1), 1);
  assert.equal(streakLength(10), 4);
  assert.equal(streakLength(80), 12);
  assert.equal(streakLength(0), 0);
});

test('the streak starts at the muzzle and reaches the hit within its life', () => {
  const first = streak(0, 40);
  assert.equal(first.tail, 0);
  assert.ok(Math.abs(first.head - 12 / 40) < 1e-9);
  const last = streak(TRACER_LIFE, 40);
  assert.equal(last.head, 1);
  assert.ok(Math.abs(last.tail - (1 - 12 / 40)) < 1e-9);
  const mid = streak(TRACER_LIFE / 2, 40);
  assert.ok(mid.head > first.head && mid.head < 1);
  assert.ok(mid.head - mid.tail > 0.29 && mid.head - mid.tail < 0.31);
});

test('a point-blank shot is one whole line', () => {
  assert.deepEqual(streak(0, 0.5), { tail: 0, head: 1 });
  assert.deepEqual(streak(0, 0), { tail: 0, head: 1 });
});
